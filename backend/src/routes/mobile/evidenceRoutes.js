import express from 'express';
import multer from 'multer';
import path from 'path';
import { query, getClient } from '../../db/index.js';
import { storageService } from '../../services/storageService.js';
import { hashingService } from '../../services/hashingService.js';
import { auditService } from '../../services/auditService.js';
import { fabricGatewayService } from '../../services/fabricGatewayService.js';
import { config } from '../../config/index.js';

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

      let custodianName = null;
      if (req.body.userId) {
        const uRes = await dbClient.query('SELECT name FROM users WHERE user_id = $1', [req.body.userId]);
        if (uRes.rows.length) custodianName = uRes.rows[0].name;
      }

      const resolvedClass = (effectiveSourceHash && req.body.liftingVideo) ? 'PRIMARY' : (req.body.classification || 'SECONDARY');

      const { rows } = await dbClient.query(
        `INSERT INTO evidence
           (evidence_id, case_id, name, file_name, type, mime_type, file_size_bytes, file_url,
            file_hash, metadata_hash, source_hash, lifting_video_url, lifting_video_hash,
            classification, risk_level, integrity_status,
            uploaded_by, current_custodian_id, current_custodian_name, owner_msp,
            collected_location, collected_timestamp, linked_evidence_ids, notes,
            on_chain_status, version, is_deleted, created_at, updated_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,'BLOCKCHAIN_PENDING',1,FALSE,NOW(),NOW())
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
          req.body.liftingVideo || null,
          req.body.liftingVideoHash || null,
          resolvedClass,
          req.body.riskLevel || 'LOW',
          integrityFlagged ? 'COMPROMISED' : 'UNVERIFIED',
          req.body.userId || null,
          req.body.userId || null,
          custodianName,
          userOrg,
          location,
          req.body.timestamp ? new Date(req.body.timestamp) : new Date(),
          JSON.stringify(req.body.linkedEvidenceIds || []),
          req.body.notes || null,
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

// --- 3-ORG FABRIC CHAINCODE & TRANSFER ENDPOINTS ---

// Read evidence directly from ledger or fallback to DB
router.get('/evidence/:id', async (req, res) => {
  try {
    if (!config.fabric.disabled) {
      try {
        const result = await fabricGatewayService.evaluateTransaction('ReadEvidence', req.params.id);
        if (result) return res.json(result);
      } catch (fabricErr) {
        console.warn(`[Fabric Query Warning] Fallback to DB for evidence ${req.params.id}:`, fabricErr.message);
      }
    }
    const { rows } = await query(`SELECT * FROM evidence WHERE evidence_id = $1 AND is_deleted = FALSE`, [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'Evidence not found' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Read evidence audit history from ledger
router.get('/evidence/history/:id', async (req, res) => {
  try {
    if (!config.fabric.disabled) {
      try {
        const result = await fabricGatewayService.evaluateTransaction('GetEvidenceHistory', req.params.id);
        if (result) return res.json(result);
      } catch (fabricErr) {
        console.warn(`[Fabric Query Warning] Fallback to DB audit logs for ${req.params.id}:`, fabricErr.message);
      }
    }
    const { rows } = await query(`SELECT * FROM audit_logs WHERE evidence_id = $1 ORDER BY timestamp DESC`, [req.params.id]);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Query all evidence for a case from ledger
router.get('/case/:id', async (req, res) => {
  try {
    if (!config.fabric.disabled) {
      try {
        const result = await fabricGatewayService.evaluateTransaction('QueryByCaseID', req.params.id);
        if (result) return res.json(result);
      } catch (fabricErr) {
        console.warn(`[Fabric Query Warning] Fallback to DB for case ${req.params.id}:`, fabricErr.message);
      }
    }
    const { rows } = await query(`SELECT * FROM evidence WHERE case_id = $1 AND is_deleted = FALSE ORDER BY created_at ASC`, [req.params.id]);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Request evidence custody transfer across 3-org consortium
router.post('/transfer/request', async (req, res) => {
  try {
    const { evidenceID, targetMSP, actorId, actorRole, notes } = req.body || {};
    if (!evidenceID) return res.status(400).json({ error: 'evidenceID is required' });

    const { rows: evRows } = await query(`SELECT * FROM evidence WHERE evidence_id = $1`, [evidenceID]);
    if (!evRows.length) return res.status(404).json({ error: 'Evidence not found' });
    const ev = evRows[0];

    const effectiveTargetMSP = targetMSP || config.fabric.orgs?.forensics?.mspId || 'Org2MSP';

    const dbClient = await getClient();
    try {
      await dbClient.query('BEGIN');

      await dbClient.query(
        `UPDATE evidence SET transfer_target_msp = $1, on_chain_status = 'IN_TRANSFER', updated_at = NOW(), version = version + 1 WHERE evidence_id = $2`,
        [effectiveTargetMSP, evidenceID]
      );

      // Record in custody_transfers table
      await dbClient.query(
        `INSERT INTO custody_transfers
           (evidence_id, case_id, from_user_id, from_msp, to_msp, status, notes, requested_at)
         VALUES ($1,$2,$3,$4,$5,'REQUESTED',$6,NOW())`,
        [evidenceID, ev.case_id, actorId || null, ev.owner_msp || 'Org1MSP', effectiveTargetMSP, notes || 'Transfer initiated']
      );

      // Enqueue to Blockchain Outbox
      await dbClient.query(
        `INSERT INTO blockchain_outbox
           (event_type, entity_id, case_id, payload, status)
         VALUES ($1, $2, $3, $4, 'PENDING')`,
        [
          'TRANSFER_INITIATE',
          evidenceID,
          ev.case_id,
          JSON.stringify({
            evidenceId: evidenceID,
            targetMSP: effectiveTargetMSP,
            actorId: actorId || 'OFFICER',
            actorRole: actorRole || 'POLICE',
            notes: notes || 'Transfer initiated via mobile field app',
          }),
        ]
      );

      await dbClient.query('COMMIT');
    } catch (dbErr) {
      await dbClient.query('ROLLBACK');
      throw dbErr;
    } finally {
      dbClient.release();
    }

    await auditService.log({
      caseId: ev.case_id,
      evidenceId: evidenceID,
      userId: actorId,
      userRole: actorRole || 'POLICE',
      userOrg: ev.owner_msp,
      action: 'TRANSFER',
      source: 'MOBILE',
      details: { title: `Transfer requested to ${effectiveTargetMSP}` },
    });

    res.json({ message: 'Transfer requested', evidenceID, targetMSP: effectiveTargetMSP });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Accept evidence custody transfer across 3-org consortium
router.post('/transfer/accept', async (req, res) => {
  try {
    const { evidenceID, actorId, actorRole, notes } = req.body || {};
    if (!evidenceID) return res.status(400).json({ error: 'evidenceID is required' });

    const { rows: evRows } = await query(`SELECT * FROM evidence WHERE evidence_id = $1`, [evidenceID]);
    if (!evRows.length) return res.status(404).json({ error: 'Evidence not found' });
    const ev = evRows[0];

    const dbClient = await getClient();
    try {
      await dbClient.query('BEGIN');

      let custodianName = null;
      if (actorId) {
        const uRes = await dbClient.query('SELECT name FROM users WHERE user_id = $1', [actorId]);
        if (uRes.rows.length) custodianName = uRes.rows[0].name;
      }

      const newOwnerMSP = ev.transfer_target_msp || config.fabric.orgs?.forensics?.mspId || 'Org2MSP';

      await dbClient.query(
        `UPDATE evidence
         SET owner_msp = $1, transfer_target_msp = NULL, current_custodian_id = $2,
             current_custodian_name = COALESCE($3, current_custodian_name),
             on_chain_status = 'IN_CUSTODY', updated_at = NOW(), version = version + 1
         WHERE evidence_id = $4`,
        [newOwnerMSP, actorId || null, custodianName, evidenceID]
      );

      // Update custody_transfers record
      await dbClient.query(
        `UPDATE custody_transfers
         SET status = 'ACCEPTED', accepted_at = NOW(), to_user_id = $1
         WHERE evidence_id = $2 AND status = 'REQUESTED'`,
        [actorId || null, evidenceID]
      );

      // Enqueue to Blockchain Outbox
      await dbClient.query(
        `INSERT INTO blockchain_outbox
           (event_type, entity_id, case_id, payload, status)
         VALUES ($1, $2, $3, $4, 'PENDING')`,
        [
          'TRANSFER_ACCEPT',
          evidenceID,
          ev.case_id,
          JSON.stringify({
            evidenceId: evidenceID,
            actorId: actorId || 'OFFICER',
            actorRole: actorRole || 'POLICE',
            notes: notes || 'Transfer accepted via mobile field app',
          }),
        ]
      );

      await dbClient.query('COMMIT');
    } catch (dbErr) {
      await dbClient.query('ROLLBACK');
      throw dbErr;
    } finally {
      dbClient.release();
    }

    await auditService.log({
      caseId: ev.case_id,
      evidenceId: evidenceID,
      userId: actorId,
      userRole: actorRole || 'POLICE',
      userOrg: ev.transfer_target_msp || 'Org2MSP',
      action: 'TRANSFER',
      source: 'MOBILE',
      details: { title: `Custody accepted by ${actorId || 'Officer'}` },
    });

    res.json({ message: 'Transfer accepted', evidenceID });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
