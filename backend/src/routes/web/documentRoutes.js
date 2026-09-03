import express from 'express';
import { query } from '../../db/index.js';
import { auditService } from '../../services/auditService.js';

const router = express.Router();

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
    res.json(rows);
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

    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;
