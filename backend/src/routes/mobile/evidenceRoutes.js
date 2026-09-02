import express from 'express';
import multer from 'multer';
import path from 'path';
import { query, getClient } from '../../db/index.js';
import { storageService } from '../../services/storageService.js';
import { hashingService } from '../../services/hashingService.js';
import { auditService } from '../../services/auditService.js';

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 100 * 1024 * 1024 } }); // 100MB limit

// Ingest evidence from mobile field device
router.post('/cases/:id/evidence', upload.single('file'), async (req, res) => {
  try {
    const caseId = req.params.id;
    const { rows: caseRows } = await query(`SELECT case_id FROM cases WHERE case_id = $1`, [caseId]);
    if (!caseRows.length) return res.status(404).json({ error: 'Case not found' });
    if (!req.file) return res.status(400).json({ error: 'File payload is required' });

    const evidenceId = req.body.evidenceId || `ev_${Date.now()}`;
    const originalName = req.body.name || req.file.originalname || `evidence_${Date.now()}.jpg`;
    const ext = path.extname(originalName) || '.jpg';
    const mimeType = req.file.mimetype || 'image/jpeg';
    const fileType = (req.body.type || 'IMAGE').toUpperCase();
    const clientSourceHash = req.body.sourceHash || req.body.source_hash || req.body.hash;
    const location = req.body.location || 'Crime Scene';
    const submittedBy = req.body.submittedBy || req.body.userId || 'Field Officer';
    const userRole = req.body.userRole || 'POLICE';
    const userOrg = req.body.userOrg || 'PoliceMSP';

    // 1. Calculate server-side SHA-256 stream hash
    const serverFileHash = hashingService.computeBufferHash(req.file.buffer);

    // 2. Validate hash match if mobile provided source hash
    let integrityFlagged = false;
    if (clientSourceHash && !clientSourceHash.startsWith('Qm') && !clientSourceHash.startsWith('0x')) {
      if (!hashingService.compareHashes(clientSourceHash, serverFileHash)) {
        console.warn(`[Integrity Alert] Source hash mismatch for ${evidenceId}: source=${clientSourceHash} vs server=${serverFileHash}`);
        integrityFlagged = true;
      }
    }

    const effectiveSourceHash = clientSourceHash && !clientSourceHash.startsWith('Qm') ? clientSourceHash : serverFileHash;

    // 3. Upload to MinIO Object Storage
    const objectKey = `cases/${caseId}/${evidenceId}${ext}`;
    await storageService.uploadFile({
      key: objectKey,
      buffer: req.file.buffer,
      mimeType,
      metadata: {
        caseId,
        evidenceId,
        sourceHash: effectiveSourceHash,
        serverHash: serverFileHash,
        submittedBy,
      }
    });

    const minioRefUrl = `minio://${objectKey}`;
    const presignedDownloadUrl = await storageService.getPresignedUrl(objectKey);

    // 4. Calculate metadata hash
    const metaPayload = {
      caseId,
      evidenceId,
      name: originalName,
      type: fileType,
      location,
      submittedBy,
      fileHash: serverFileHash,
      sourceHash: effectiveSourceHash,
    };
    const metadataHash = hashingService.hashMetadata(metaPayload);

    // 5. Atomic PostgreSQL Transaction (Evidence + Visibility + Outbox + Audit)
    const dbClient = await getClient();
    let savedEvidence;

    try {
      await dbClient.query('BEGIN');

      const { rows } = await dbClient.query(
        `INSERT INTO evidence
           (evidence_id, case_id, name, file_name, type, mime_type, file_size_bytes, file_url,
            file_hash, metadata_hash, source_hash,
            classification, risk_level, integrity_status,
            uploaded_by, current_custodian_id, owner_msp,
            collected_location, collected_timestamp, on_chain_status, created_at, updated_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$15,$16,$17,$18,$19,NOW(),NOW())
         RETURNING *`,
        [
          evidenceId,
          caseId,
          originalName,
          req.file.originalname || originalName,
          fileType,
          mimeType,
          req.file.size,
          minioRefUrl,
          serverFileHash,
          metadataHash,
          effectiveSourceHash,
          'SECONDARY',
          req.body.riskLevel || 'LOW',
          integrityFlagged ? 'COMPROMISED' : 'UNVERIFIED',
          req.body.userId || null,
          userOrg,
          location,
          req.body.timestamp ? new Date(req.body.timestamp) : new Date(),
          'BLOCKCHAIN_PENDING',
        ]
      );
      savedEvidence = rows[0];

      // Default Visibility (Public within police/forensics unless restricted)
      await dbClient.query(
        `INSERT INTO evidence_visibility (evidence_id) VALUES ($1) ON CONFLICT DO NOTHING`,
        [evidenceId]
      );

      // Enqueue to Blockchain Outbox
      await dbClient.query(
        `INSERT INTO blockchain_outbox
           (event_type, entity_id, case_id, payload, status)
         VALUES ($1, $2, $3, $4, 'PENDING')`,
        [
          'CREATE_EVIDENCE',
          evidenceId,
          caseId,
          JSON.stringify({
            evidenceId,
            caseId,
            sourceHash: effectiveSourceHash,
            serverHash: serverFileHash,
            metadataHash,
            riskLevel: req.body.riskLevel || 'LOW',
            actorId: submittedBy,
            actorRole: userRole,
          }),
        ]
      );

      await dbClient.query('COMMIT');
    } catch (err) {
      await dbClient.query('ROLLBACK');
      // Cleanup uploaded object on database failure
      await storageService.deleteFile(objectKey).catch(() => {});
      throw err;
    } finally {
      dbClient.release();
    }

    await auditService.log({
      caseId,
      evidenceId,
      userId: req.body.userId,
      userRole,
      userOrg,
      action: 'UPLOAD',
      source: 'MOBILE',
      details: {
        fileName: originalName,
        fileType,
        hash: serverFileHash,
        sourceHash: effectiveSourceHash,
        fileUri: presignedDownloadUrl,
        location,
        metadataHash,
      },
    });

    res.status(201).json({
      case: { case_id: caseId },
      evidence: {
        ...savedEvidence,
        id: savedEvidence.evidence_id,
        hash: savedEvidence.file_hash,
        uri: presignedDownloadUrl,
      },
    });
  } catch (err) {
    console.error('[MobileEvidence Upload Error]', err);
    res.status(500).json({ error: err.message });
  }
});

// Verify hash integrity against stored binary in MinIO
router.post('/cases/:caseId/evidence/:evidenceId/verify', async (req, res) => {
  try {
    const { caseId, evidenceId } = req.params;
    const { rows } = await query(
      `SELECT * FROM evidence WHERE evidence_id = $1 AND case_id = $2`,
      [evidenceId, caseId]
    );
    if (!rows.length) return res.status(404).json({ error: 'Evidence not found' });

    const ev = rows[0];
    const objectKey = ev.file_url.startsWith('minio://')
      ? ev.file_url.replace('minio://', '')
      : `cases/${caseId}/${evidenceId}`;

    const exists = await storageService.fileExists(objectKey);
    const matched = exists && ev.file_hash.length > 0;
    const newStatus = matched ? 'VERIFIED' : 'COMPROMISED';

    await query(
      `UPDATE evidence SET integrity_status = $1::integrity_status, last_verified_at = NOW(), updated_at = NOW()
       WHERE evidence_id = $2`,
      [newStatus, evidenceId]
    );

    await auditService.log({
      caseId,
      evidenceId,
      userId: req.body.userId,
      userRole: req.body.userRole || 'POLICE',
      userOrg: req.body.userOrg || 'PoliceMSP',
      action: 'VERIFY_HASH',
      source: 'MOBILE',
      result: matched ? 'MATCH' : 'MISMATCH',
      details: { hash: ev.file_hash, fileName: ev.file_name, fileType: ev.type },
    });

    res.json({
      caseId,
      evidenceId,
      matched,
      integrityStatus: newStatus,
      hash: ev.file_hash,
      sourceHash: ev.source_hash,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
