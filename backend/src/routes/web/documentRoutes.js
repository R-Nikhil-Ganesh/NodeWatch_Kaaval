import express from 'express';
import { query } from '../../db/index.js';
import { auditService } from '../../services/auditService.js';

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const { caseId } = req.query;
    const { rows } = caseId
      ? await query(`SELECT * FROM case_documents WHERE case_id = $1 ORDER BY created_at DESC`, [caseId])
      : await query(`SELECT * FROM case_documents ORDER BY created_at DESC`);
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
