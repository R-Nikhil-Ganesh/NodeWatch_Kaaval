import express from 'express';
import { query, getClient } from '../../db/index.js';
import { storageService } from '../../services/storageService.js';
import { auditService } from '../../services/auditService.js';
import { hashingService } from '../../services/hashingService.js';

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const { caseId } = req.query;
    const caseFilter = caseId ? 'AND e.case_id = $1' : '';
    const params = caseId ? [caseId] : [];

    const { rows } = await query(
      `SELECT e.*,
              e.evidence_id AS "evidenceId",
              e.case_id AS "caseId",
              e.file_name AS "fileName",
              e.file_hash AS "fileHash",
              e.source_hash AS "sourceHash",
              e.integrity_status AS "integrityStatus",
              e.approved_for_legal AS "approvedForLegal",
              e.on_chain_status AS "onChainStatus",
              e.blockchain_tx_id AS "blockchainTxId",
              ev.is_restricted, ev.allowed_roles, ev.allowed_designations, ev.allowed_user_ids,
              u.name AS uploaded_by_name,
              u.designation AS uploaded_by_designation,
              c.name AS custodian_display_name,
              s.certificate_ref AS "section63Certificate"
       FROM evidence e
       LEFT JOIN evidence_visibility ev ON e.evidence_id = ev.evidence_id
       LEFT JOIN users u ON e.uploaded_by = u.user_id
       LEFT JOIN users c ON e.current_custodian_id = c.user_id
       LEFT JOIN section63_certificates s ON e.section63_cert_id = s.certificate_id
       WHERE e.is_deleted = FALSE ${caseFilter}
       ORDER BY e.created_at DESC`,
      params
    );

    // Attach pre-signed URLs
    const formatted = await Promise.all(
      rows.map(async (ev) => {
        let presignedUrl = ev.file_url;
        if (ev.file_url && ev.file_url.startsWith('minio://')) {
          const key = ev.file_url.replace('minio://', '');
          presignedUrl = await storageService.getPresignedUrl(key).catch(() => ev.file_url);
        }
        return {
          ...ev,
          uri: presignedUrl,
          visibility: {
            isRestricted: ev.is_restricted || false,
            allowedRoles: ev.allowed_roles || [],
            allowedDesignations: ev.allowed_designations || [],
            allowedUserIds: ev.allowed_user_ids || [],
          },
        };
      })
    );

    res.json(formatted);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/', async (req, res) => {
  try {
    const {
      evidenceId, caseId, name, type, fileName, mimeType, fileSizeBytes, fileUrl,
      uploadedBy, role, location, timestamp, fileHash, metadataHash,
      custodian, currentCustodianName, ownerMsp, transferTargetMsp,
      integrityStatus, lastVerifiedAt, approvedForLegal, section63CertId,
      notes, linkedEvidenceIds, classification, riskLevel,
      sourceHash, liftingVideo, liftingVideoHash, visibility,
      blockchainTxId, onChainStatus,
      actorId, actorRole,
    } = req.body || {};

    const id = evidenceId || `EV-${Date.now().toString(36).toUpperCase()}`;
    const resolvedClass = (sourceHash && (liftingVideo || liftingVideoHash)) ? 'PRIMARY' : (classification || 'SECONDARY');
    const resolvedRisk = (riskLevel || 'LOW').toUpperCase();
    const resolvedType = (type || 'IMAGE').toUpperCase();

    const computedMetaHash = metadataHash || hashingService.hashMetadata({
      caseId,
      evidenceId: id,
      name: name || fileName || id,
      type: resolvedType,
      location: location || 'Crime Scene',
      submittedBy: uploadedBy || actorId || 'Unknown',
      fileHash: fileHash || '',
      sourceHash: sourceHash || fileHash || '',
    });

    const dbClient = await getClient();
    try {
      await dbClient.query('BEGIN');

      let custodianName = currentCustodianName;
      if (!custodianName && (uploadedBy || actorId)) {
        const userRes = await dbClient.query('SELECT name FROM users WHERE user_id = $1', [uploadedBy || actorId]);
        if (userRes.rows.length > 0) {
          custodianName = userRes.rows[0].name;
        }
      }

      const { rows } = await dbClient.query(
        `INSERT INTO evidence
           (evidence_id, case_id, name, file_name, type, mime_type, file_size_bytes, file_url,
            file_hash, metadata_hash, source_hash, lifting_video_url, lifting_video_hash,
            classification, risk_level, integrity_status, last_verified_at, approved_for_legal,
            section63_cert_id, notes, uploaded_by, current_custodian_id, current_custodian_name,
            owner_msp, transfer_target_msp, collected_location, collected_timestamp,
            linked_evidence_ids, blockchain_tx_id, on_chain_status, version, is_deleted,
            created_at, updated_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27,$28,$29,$30,$31,$32,NOW(),NOW())
         RETURNING *`,
        [
          id,
          caseId,
          name || fileName || id,
          fileName || id,
          resolvedType,
          mimeType || null,
          fileSizeBytes ? parseInt(fileSizeBytes, 10) : null,
          fileUrl || '',
          fileHash || '',
          computedMetaHash,
          sourceHash || fileHash || null,
          liftingVideo || null,
          liftingVideoHash || null,
          resolvedClass,
          resolvedRisk,
          integrityStatus || 'NOT_CHECKED',
          lastVerifiedAt ? new Date(lastVerifiedAt) : null,
          approvedForLegal === true,
          section63CertId || null,
          notes || null,
          uploadedBy || actorId || null,
          custodian || uploadedBy || actorId || null,
          custodianName || null,
          ownerMsp || 'PoliceMSP',
          transferTargetMsp || null,
          location || 'Crime Scene',
          timestamp ? new Date(timestamp) : new Date(),
          JSON.stringify(linkedEvidenceIds || []),
          blockchainTxId || null,
          onChainStatus || 'BLOCKCHAIN_PENDING',
          1,
          false,
        ]
      );

      const v = visibility || {};
      await dbClient.query(
        `INSERT INTO evidence_visibility
           (evidence_id, is_restricted, allowed_roles, allowed_designations, allowed_user_ids)
         VALUES ($1,$2,$3,$4,$5)
         ON CONFLICT (evidence_id) DO UPDATE SET
           is_restricted = EXCLUDED.is_restricted,
           allowed_roles = EXCLUDED.allowed_roles,
           allowed_designations = EXCLUDED.allowed_designations,
           allowed_user_ids = EXCLUDED.allowed_user_ids,
           updated_at = NOW()`,
        [
          id,
          v.isRestricted || false,
          JSON.stringify(v.allowedRoles || []),
          JSON.stringify(v.allowedDesignations || []),
          JSON.stringify(v.allowedUserIds || []),
        ]
      );

      // Enqueue to Blockchain Outbox (matching Fabric CreateEvidence smart contract)
      await dbClient.query(
        `INSERT INTO blockchain_outbox
           (event_type, entity_id, case_id, payload, status)
         VALUES ($1, $2, $3, $4, 'PENDING')`,
        [
          'CREATE_EVIDENCE',
          id,
          caseId,
          JSON.stringify({
            evidenceId: id,
            caseId,
            sourceHash: sourceHash || fileHash || '',
            serverHash: fileHash || '',
            metadataHash: computedMetaHash,
            riskLevel: resolvedRisk,
            actorId: actorId || uploadedBy || 'SYSTEM',
            actorRole: actorRole || role || 'POLICE',
          }),
        ]
      );

      await dbClient.query('COMMIT');

      await auditService.log({
        caseId,
        evidenceId: id,
        userId: actorId || uploadedBy,
        userRole: actorRole || role,
        action: 'UPLOAD',
        source: 'WEB',
        details: { fileName, fileType: resolvedType, hash: fileHash, location, metadataHash: computedMetaHash, classification: resolvedClass, riskLevel: resolvedRisk },
      });

      res.status(201).json({
        ...rows[0],
        evidenceId: rows[0].evidence_id,
        caseId: rows[0].case_id,
        visibility: v,
      });
    } catch (e) {
      await dbClient.query('ROLLBACK');
      throw e;
    } finally {
      dbClient.release();
    }
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.patch('/:id/visibility', async (req, res) => {
  try {
    const { id } = req.params;
    const { visibility, actorId, actorRole } = req.body || {};

    const { rows } = await query(
      `INSERT INTO evidence_visibility
         (evidence_id, is_restricted, allowed_roles, allowed_designations, allowed_user_ids, updated_at)
       VALUES ($1,$2,$3,$4,$5,NOW())
       ON CONFLICT (evidence_id) DO UPDATE SET
         is_restricted = EXCLUDED.is_restricted,
         allowed_roles = EXCLUDED.allowed_roles,
         allowed_designations = EXCLUDED.allowed_designations,
         allowed_user_ids = EXCLUDED.allowed_user_ids,
         updated_at = NOW()
       RETURNING *`,
      [
        id,
        visibility?.isRestricted || false,
        JSON.stringify(visibility?.allowedRoles || []),
        JSON.stringify(visibility?.allowedDesignations || []),
        JSON.stringify(visibility?.allowedUserIds || []),
      ]
    );

    const { rows: ev } = await query(`SELECT case_id FROM evidence WHERE evidence_id = $1`, [id]);
    await auditService.log({
      caseId: ev[0]?.case_id,
      evidenceId: id,
      userId: actorId,
      userRole: actorRole,
      action: 'VISIBILITY_UPDATE',
      source: 'WEB',
      details: { title: visibility?.isRestricted ? 'Restricted' : 'Public' },
    });

    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.patch('/:id/approve', async (req, res) => {
  try {
    const { id } = req.params;
    const { actorId, actorRole } = req.body || {};
    const { rows: existing } = await query(
      `SELECT e.*, s.certificate_id FROM evidence e
       LEFT JOIN section63_certificates s ON e.section63_cert_id = s.certificate_id
       WHERE e.evidence_id = $1`,
      [id]
    );
    if (!existing.length) return res.status(404).json({ message: 'Evidence not found' });

    const ev = existing[0];
    const canApprove = ev.classification === 'PRIMARY' || ev.section63_cert_id != null;
    if (!canApprove) {
      return res.status(400).json({ message: 'Cannot approve Secondary evidence without a Section 63 Certificate.' });
    }

    const { rows } = await query(
      `UPDATE evidence SET approved_for_legal = TRUE, updated_at = NOW() WHERE evidence_id = $1 RETURNING *`,
      [id]
    );

    await auditService.log({
      caseId: ev.case_id,
      evidenceId: id,
      userId: actorId,
      userRole: actorRole,
      action: 'APPROVE',
      source: 'WEB',
    });

    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;
