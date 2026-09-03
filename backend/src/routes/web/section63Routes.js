import express from 'express';
import { query, getClient } from '../../db/index.js';
import { auditService } from '../../services/auditService.js';

const router = express.Router();

router.post('/:id/section63', async (req, res) => {
  try {
    const { id } = req.params;
    const { certificateRef, actorId, actorRole, deviceSpecification, certificatePdfUrl } = req.body || {};

    const { rows: evRows } = await query(`SELECT * FROM evidence WHERE evidence_id = $1`, [id]);
    if (!evRows.length) return res.status(404).json({ message: 'Evidence not found' });
    const ev = evRows[0];

    const { rows: uRows } = await query(`SELECT designation FROM users WHERE user_id = $1`, [actorId]);
    const designation = uRows[0]?.designation || 'Authorised Certifier';

    const dbClient = await getClient();
    let cert;
    try {
      await dbClient.query('BEGIN');
      const { rows: certRows } = await dbClient.query(
        `INSERT INTO section63_certificates
           (certificate_ref, evidence_id, case_id, issued_by_user_id, certifying_designation,
            device_specification, hash_algorithm, verified_hash, certificate_pdf_url)
         VALUES ($1,$2,$3,$4,$5,$6,'SHA-256',$7,$8)
         ON CONFLICT (certificate_ref) DO UPDATE SET issued_at = NOW()
         RETURNING *`,
        [certificateRef, id, ev.case_id, actorId, designation, deviceSpecification || null, ev.file_hash, certificatePdfUrl || null]
      );
      cert = certRows[0];

      await dbClient.query(
        `UPDATE evidence SET section63_cert_id = $1, updated_at = NOW() WHERE evidence_id = $2`,
        [cert.certificate_id, id]
      );

      // Enqueue Court/Section 63 Anchor Event to Outbox
      await dbClient.query(
        `INSERT INTO blockchain_outbox
           (event_type, entity_id, case_id, payload, status)
         VALUES ($1, $2, $3, $4, 'PENDING')`,
        [
          'COURT_SUBMIT',
          id,
          ev.case_id,
          JSON.stringify({
            evidenceId: id,
            courtMSP: 'CourtMSP',
            section63Ref: certificateRef,
            actorId: actorId || 'SYSTEM',
            actorRole: actorRole || 'LEGAL',
            notes: `BSA Section 63 Certificate ${certificateRef} attached by ${designation}`,
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
      evidenceId: id,
      userId: actorId,
      userRole: actorRole,
      action: 'ISSUE_CERT',
      source: 'WEB',
      details: { title: certificateRef },
    });

    res.json(cert);
  } catch (err) {
    console.error('[Section63 Error]', err);
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;
