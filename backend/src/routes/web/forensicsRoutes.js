import express from 'express';
import { query, getClient } from '../../db/index.js';
import { auditService } from '../../services/auditService.js';
import { hashingService } from '../../services/hashingService.js';

const router = express.Router();

router.post('/verify', async (req, res) => {
  try {
    const { evidenceId, verifiedHash, notes, actorId, actorRole } = req.body || {};

    const { rows } = await query(`SELECT * FROM evidence WHERE evidence_id = $1`, [evidenceId]);
    if (!rows.length) return res.status(404).json({ message: 'Evidence not found' });
    const ev = rows[0];

    const hashToVerify = (verifiedHash || ev.file_hash).trim().toLowerCase();
    const registeredHash = (ev.source_hash || ev.file_hash).trim().toLowerCase();
    const isMatch = hashingService.compareHashes(hashToVerify, registeredHash);
    const newStatus = isMatch ? 'VERIFIED' : 'COMPROMISED';
    const onChainEvent = isMatch ? 'FORENSIC_VERIFY' : 'INTEGRITY_FLAG';

    const dbClient = await getClient();
    try {
      await dbClient.query('BEGIN');

      await dbClient.query(
        `UPDATE evidence
         SET integrity_status = $1::integrity_status,
             last_verified_at = NOW(),
             updated_at = NOW()
         WHERE evidence_id = $2`,
        [newStatus, evidenceId]
      );

      // Enqueue Forensic Verification Event to Outbox
      await dbClient.query(
        `INSERT INTO blockchain_outbox
           (event_type, entity_id, case_id, payload, status)
         VALUES ($1, $2, $3, $4, 'PENDING')`,
        [
          onChainEvent,
          evidenceId,
          ev.case_id,
          JSON.stringify({
            evidenceId,
            verifiedHash: hashToVerify,
            resultStatus: isMatch ? 'MATCH' : 'MISMATCH',
            detectedHash: hashToVerify,
            reason: isMatch ? 'Forensic laboratory hash match' : 'Forensic hash mismatch detected',
            actorId: actorId || 'FORENSIC_ANALYST',
            actorRole: actorRole || 'FORENSICS',
            notes: notes || (isMatch ? 'Verified by FSL Laboratory' : 'Integrity compromised'),
          }),
        ]
      );

      await dbClient.query('COMMIT');
    } catch (e) {
      await dbClient.query('ROLLBACK');
      throw e;
    } finally {
      dbClient.release();
    }

    await auditService.log({
      caseId: ev.case_id,
      evidenceId,
      userId: actorId,
      userRole: actorRole || 'FORENSICS',
      userOrg: 'FSLMSP',
      action: 'FORENSIC_VERIFY',
      source: 'WEB',
      result: isMatch ? 'MATCH' : 'MISMATCH',
      details: {
        hash: hashToVerify,
        title: notes || (isMatch ? 'Hash verified by FSL' : 'Integrity compromise alert'),
      },
    });

    const { rows: updated } = await query(`SELECT * FROM evidence WHERE evidence_id = $1`, [evidenceId]);
    res.json({
      evidence: updated[0],
      isMatch,
      integrityStatus: newStatus,
    });
  } catch (err) {
    console.error('[ForensicsVerify Error]', err);
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/flag', async (req, res) => {
  try {
    const { evidenceId, reason, detectedHash, actorId, actorRole } = req.body || {};

    const { rows } = await query(`SELECT * FROM evidence WHERE evidence_id = $1`, [evidenceId]);
    if (!rows.length) return res.status(404).json({ message: 'Evidence not found' });
    const ev = rows[0];

    const dbClient = await getClient();
    try {
      await dbClient.query('BEGIN');

      await dbClient.query(
        `UPDATE evidence
         SET integrity_status = 'COMPROMISED',
             last_verified_at = NOW(),
             updated_at = NOW()
         WHERE evidence_id = $1`,
        [evidenceId]
      );

      await dbClient.query(
        `INSERT INTO blockchain_outbox
           (event_type, entity_id, case_id, payload, status)
         VALUES ($1, $2, $3, $4, 'PENDING')`,
        [
          'INTEGRITY_FLAG',
          evidenceId,
          ev.case_id,
          JSON.stringify({
            evidenceId,
            detectedHash: detectedHash || 'UNKNOWN_OR_TAMPERED',
            reason: reason || 'Manual security flag triggered',
            actorId: actorId || 'SYSTEM',
            actorRole: actorRole || 'FORENSICS',
          }),
        ]
      );

      await dbClient.query('COMMIT');
    } catch (e) {
      await dbClient.query('ROLLBACK');
      throw e;
    } finally {
      dbClient.release();
    }

    await auditService.log({
      caseId: ev.case_id,
      evidenceId,
      userId: actorId,
      userRole: actorRole || 'FORENSICS',
      action: 'SECURITY_ALERT',
      source: 'WEB',
      result: 'FLAGGED',
      details: { title: reason || 'Integrity alert manually flagged' },
    });

    res.json({ success: true, evidenceId, status: 'COMPROMISED' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;
