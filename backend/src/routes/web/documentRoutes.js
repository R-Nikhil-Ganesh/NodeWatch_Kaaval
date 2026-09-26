import express from 'express';
import multer from 'multer';
import path from 'path';
import crypto from 'crypto';
import { query } from '../../db/index.js';
import { storageService } from '../../services/storageService.js';
import { hashingService } from '../../services/hashingService.js';
import { auditService } from '../../services/auditService.js';
import { textExtractionService } from '../../services/textExtractionService.js';
import { requireAuth, requireRegistrar } from '../../middleware/auth.js';

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 200 * 1024 * 1024 } });

// Maps the legal portal's granular CaseFileType label to the coarser
// document_type enum the base schema still uses for the CHARGE_SHEET
// auto-status-update side effect below.
const DOC_TYPE_ENUM_MAP = {
  'FIR': 'FIR',
  'Chargesheet': 'CHARGE_SHEET',
  'Court Order': 'COURT_ORDER',
  'Bail Order': 'COURT_ORDER',
  'Arrest Warrant': 'WARRANT',
  'Search Warrant': 'WARRANT',
  'Production Warrant': 'WARRANT',
  'Medical / Post-mortem Report': 'LAB_REPORT',
};

// content_text can run up to ~200KB of extracted PDF/DOCX text; it exists
// purely to feed the Postgres full-text index (searchRoutes.js) and should
// never round-trip to the client.
const omitContentText = ({ content_text, ...rest }) => rest;

// Cases created from the police/mobile side never collect police_station or
// court (those are legal-portal-only fields — see legal/NewCaseModal.tsx), so
// a case that reaches the court system purely by having its chargesheet filed
// used to land with both blank (the legal portal's "Court details not yet
// recorded" banner on CaseHomePage.tsx). There's no per-station/per-court
// assignment feature yet, so these stand in as a single fixed default until
// one exists — COALESCE below only fills the gap, never overwrites a real
// value a case already has (e.g. one entered through NewCaseModal).
const DEFAULT_POLICE_STATION = 'T. Nagar Police Station';
const DEFAULT_COURT = 'IX Additional City Civil & Sessions Court, Chennai';

router.get('/', async (req, res) => {
  try {
    const { caseId } = req.query;
    const selectSql = `
      SELECT d.*, u.name AS uploaded_by_name
      FROM case_documents d
      LEFT JOIN users u ON d.uploaded_by = u.user_id
      ${caseId ? 'WHERE d.case_id = $1' : ''}
      ORDER BY d.created_at DESC`;
    const { rows } = caseId ? await query(selectSql, [caseId]) : await query(selectSql);

    // Resolve minio:// file_url values to a short-lived presigned URL so the
    // legal portal can preview/download the real bytes, same as evidenceRoutes.js.
    const formatted = await Promise.all(
      rows.map(async (d) => {
        let uri = d.file_url;
        if (d.file_url && d.file_url.startsWith('minio://')) {
          const key = d.file_url.replace('minio://', '');
          uri = await storageService.getPresignedUrl(key).catch(() => d.file_url);
        }
        return omitContentText({ ...d, uri });
      })
    );

    res.json(formatted);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/', async (req, res) => {
  try {
    const { caseId, title, type, description, uploadedBy, linkedEvidenceIds, fileUrl, fileHash, actorId, actorRole } = req.body || {};
    const { rows } = await query(
      `INSERT INTO case_documents (case_id, title, type, description, file_url, file_hash, uploaded_by, linked_evidence_ids)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [
        caseId,
        title || 'Untitled',
        type || 'FIR',
        description || null,
        fileUrl || null,
        fileHash || null,
        uploadedBy || actorId || null,
        JSON.stringify(linkedEvidenceIds || []),
      ]
    );

    await auditService.log({
      caseId,
      userId: actorId || uploadedBy,
      userRole: actorRole,
      action: 'CREATE_DOC',
      source: 'WEB',
      details: { title, hash: fileHash },
    });

    if (type === 'CHARGE_SHEET') {
      await query(
        `UPDATE cases SET
           status = 'SUBMITTED_TO_COURT'::case_status,
           court_stage = COALESCE(court_stage, 'CHARGESHEET_FILED'),
           police_station = COALESCE(police_station, $2),
           court = COALESCE(court, $3),
           updated_at = NOW(),
           version = version + 1
         WHERE case_id = $1 AND is_deleted = FALSE`,
        [caseId, DEFAULT_POLICE_STATION, DEFAULT_COURT]
      );
    }

    res.status(201).json(omitContentText(rows[0]));
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/legal/documents/upload — files a real document (PDF/image/etc.)
// against a case, storing the bytes in MinIO like the evidence upload flow
// does, rather than the metadata-only POST '/' above (Registrar only).
router.post('/upload', requireAuth, requireRegistrar, upload.single('file'), async (req, res) => {
  try {
    const file = req.file;
    if (!file) return res.status(400).json({ message: 'A file is required' });

    const { caseId, title, docTypeLabel, description, relatedSections, linkedEvidenceIds } = req.body || {};
    if (!caseId) return res.status(400).json({ message: 'caseId is required' });

    const { rows: caseRows } = await query(
      `SELECT case_id FROM cases WHERE case_id = $1 AND is_deleted = FALSE`,
      [caseId]
    );
    if (!caseRows.length) return res.status(404).json({ message: 'Case not found' });

    const documentType = DOC_TYPE_ENUM_MAP[docTypeLabel] || 'FIR';
    const ext = path.extname(file.originalname) || '';
    const documentId = crypto.randomUUID();
    const objectKey = `cases/${caseId}/documents/${documentId}${ext}`;
    const fileHash = hashingService.computeBufferHash(file.buffer);
    const contentText = await textExtractionService.extractText(file.buffer, ext);

    try {
      await storageService.uploadFile({
        key: objectKey,
        buffer: file.buffer,
        mimeType: file.mimetype,
        metadata: { caseId, documentId },
      });
    } catch (uploadErr) {
      console.error('[Document Upload Storage Error]', uploadErr);
      return res.status(500).json({ message: 'Could not store the file. Please try again.' });
    }

    let rows;
    try {
      ({ rows } = await query(
        `INSERT INTO case_documents
           (document_id, case_id, title, type, description, file_url, file_hash,
            uploaded_by, uploaded_by_role, doc_type_label, file_format, file_size_kb,
            related_sections, linked_evidence_ids, content_text)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
         RETURNING *`,
        [
          documentId, caseId, title || file.originalname, documentType, description || null,
          `minio://${objectKey}`, fileHash, req.auth.userId, req.auth.designation,
          docTypeLabel || null, (ext.replace('.', '').toUpperCase() || 'PDF').slice(0, 10),
          Math.round(file.size / 1024), JSON.stringify(relatedSections ? JSON.parse(relatedSections) : []),
          JSON.stringify(linkedEvidenceIds ? JSON.parse(linkedEvidenceIds) : []), contentText,
        ]
      ));
    } catch (dbErr) {
      await storageService.deleteFile(objectKey).catch(() => {});
      throw dbErr;
    }

    await auditService.log({
      caseId,
      userId: req.auth.userId,
      userRole: req.auth.role,
      action: 'CREATE_DOC',
      source: 'WEB',
      details: { title: rows[0].title, hash: fileHash },
    });

    if (documentType === 'CHARGE_SHEET') {
      await query(
        `UPDATE cases SET
           status = 'SUBMITTED_TO_COURT'::case_status,
           court_stage = COALESCE(court_stage, 'CHARGESHEET_FILED'),
           police_station = COALESCE(police_station, $2),
           court = COALESCE(court, $3),
           updated_at = NOW(),
           version = version + 1
         WHERE case_id = $1 AND is_deleted = FALSE`,
        [caseId, DEFAULT_POLICE_STATION, DEFAULT_COURT]
      );
    }

    const { rows: uRows } = await query('SELECT name FROM users WHERE user_id = $1', [req.auth.userId]);

    const presignedUrl = await storageService.getPresignedUrl(objectKey).catch(() => null);
    res.status(201).json(omitContentText({
      ...rows[0],
      uploaded_by_name: uRows[0]?.name || null,
      uri: presignedUrl || `minio://${objectKey}`,
    }));
  } catch (err) {
    console.error('[Document Upload Error]', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// PATCH /api/legal/documents/:documentId — edits an existing filing's
// metadata (Registrar only). New endpoint: the shared POST above stays
// unauthenticated since police/forensics flows also file through it, but
// editing a filed document's record is a legal-portal-only capability.
router.patch('/:documentId', requireAuth, requireRegistrar, async (req, res) => {
  try {
    const { documentId } = req.params;
    const { title, docTypeLabel, description, relatedSections } = req.body || {};

    const { rows } = await query(
      `UPDATE case_documents d SET
         title = COALESCE($2, d.title),
         doc_type_label = COALESCE($3, d.doc_type_label),
         description = COALESCE($4, d.description),
         related_sections = COALESCE($5, d.related_sections)
       WHERE document_id = $1
       RETURNING d.*, (SELECT name FROM users WHERE user_id = d.uploaded_by) AS uploaded_by_name`,
      [
        documentId, title || null, docTypeLabel || null, description || null,
        relatedSections ? JSON.stringify(relatedSections) : null,
      ]
    );
    if (!rows.length) return res.status(404).json({ message: 'Document not found' });

    await auditService.log({
      caseId: rows[0].case_id,
      userId: req.auth.userId,
      userRole: req.auth.role,
      action: 'UPDATE_DOC',
      source: 'WEB',
      details: { title: rows[0].title },
    });

    let uri = rows[0].file_url;
    if (uri && uri.startsWith('minio://')) {
      uri = await storageService.getPresignedUrl(uri.replace('minio://', '')).catch(() => uri);
    }
    res.json(omitContentText({ ...rows[0], uri }));
  } catch (err) {
    console.error('[Document Update Error]', err);
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;
