import express from 'express';
import { query, getClient } from '../../db/index.js';
import { auditService } from '../../services/auditService.js';

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const { rows } = await query(
      `SELECT c.*,
              c.case_id AS "caseId",
              cu.name AS created_by_name,
              cc.name AS custodian_name,
              fa.name AS forensics_name
       FROM cases c
       LEFT JOIN users cu ON c.created_by_user_id = cu.user_id
       LEFT JOIN users cc ON c.current_custodian_id = cc.user_id
       LEFT JOIN users fa ON c.assigned_forensics_id = fa.user_id
       WHERE c.is_deleted = FALSE
       ORDER BY c.created_at DESC`
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/:caseId', async (req, res) => {
  try {
    const { rows } = await query(
      `SELECT c.*,
              c.case_id AS "caseId",
              cu.name AS created_by_name,
              cc.name AS custodian_name,
              fa.name AS forensics_name
       FROM cases c
       LEFT JOIN users cu ON c.created_by_user_id = cu.user_id
       LEFT JOIN users cc ON c.current_custodian_id = cc.user_id
       LEFT JOIN users fa ON c.assigned_forensics_id = fa.user_id
       WHERE c.case_id = $1 AND c.is_deleted = FALSE`,
      [req.params.caseId]
    );
    if (!rows.length) return res.status(404).json({ message: 'Case not found' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/', async (req, res) => {
  try {
    const {
      caseId, title, description, status, currentCustodian, createdBy,
      assignedToForensics, location, incidentTimestamp, actorId, actorRole,
    } = req.body || {};

    const id = caseId || `CASE-${new Date().getFullYear()}-${Date.now().toString().slice(-6)}`;
    const custodianId = currentCustodian || createdBy || actorId || null;

    let custodianName = null;
    if (custodianId) {
      const { rows: uRows } = await query('SELECT name FROM users WHERE user_id = $1', [custodianId]);
      if (uRows.length) custodianName = uRows[0].name;
    }

    const { rows } = await query(
      `INSERT INTO cases
         (case_id, title, description, status, location, incident_timestamp,
          created_by_user_id, current_custodian_id, current_custodian_name,
          assigned_forensics_id, blockchain_hash, version, is_deleted, created_at, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'pending',1,FALSE,NOW(),NOW())
       RETURNING *, case_id AS "caseId"`,
      [
        id,
        title || 'Untitled Case',
        description || '',
        status || 'OPEN',
        location || 'Unspecified',
        incidentTimestamp ? new Date(incidentTimestamp) : null,
        createdBy || actorId || null,
        custodianId,
        custodianName,
        assignedToForensics || null,
      ]
    );

    await auditService.log({
      caseId: id,
      userId: actorId || createdBy,
      userRole: actorRole,
      action: 'CREATE_CASE',
      source: 'WEB',
      details: { title: rows[0].title, location: rows[0].location },
    });

    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.patch('/:caseId/status', async (req, res) => {
  try {
    const { caseId } = req.params;
    const { status, actorId, actorRole } = req.body || {};
    // Onboard the case into the court/legal domain the first time it's
    // submitted to court. legalCaseRoutes.js only surfaces cases where
    // court_stage IS NOT NULL, so without this the legal (CMS) frontend
    // would never see cases coming from the web/mobile side even though
    // they live in the same `cases` row — it just never gets a stage.
    // Only stamps it once (WHEN court_stage IS NULL) so it never clobbers
    // stage progress the court side may have already recorded.
    const { rows } = await query(
      `UPDATE cases SET
         status = $1::case_status,
         court_stage = CASE
           WHEN $1::case_status = 'SUBMITTED_TO_COURT'::case_status AND court_stage IS NULL
           THEN 'CHARGESHEET_FILED'
           ELSE court_stage
         END,
         updated_at = NOW(), version = version + 1
       WHERE case_id = $2 AND is_deleted = FALSE
       RETURNING *, case_id AS "caseId"`,
      [status, caseId]
    );
    if (!rows.length) return res.status(404).json({ message: 'Case not found' });

    await auditService.log({
      caseId,
      userId: actorId,
      userRole: actorRole,
      action: 'STATUS_UPDATE',
      source: 'WEB',
      details: { title: `Status → ${status}` },
    });

    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/:caseId/transfer-custody', async (req, res) => {
  try {
    const { caseId } = req.params;
    const { newCustodianId, newCustodianRole, notes, actorId, actorRole, overrideReason } = req.body || {};

    const { rows: caseRows } = await query(
      `SELECT current_custodian_id FROM cases WHERE case_id = $1 AND is_deleted = FALSE`,
      [caseId]
    );
    if (!caseRows.length) return res.status(404).json({ message: 'Case not found' });

    // Server-side enforcement: only the current custodian (POLICE) may transfer,
    // or an ADMIN performing an explicit, reasoned override.
    const isHoldingCustodian = actorRole === 'POLICE' && !!actorId && caseRows[0].current_custodian_id === actorId;
    const isAdminOverride = actorRole === 'ADMIN' && !!overrideReason;
    if (!isHoldingCustodian && !isAdminOverride) {
      return res.status(403).json({
        message: 'Only the officer currently holding custody may transfer it, or an ADMIN with an override reason.',
      });
    }

    let custodianName = newCustodianId;
    const { rows: uRows } = await query(`SELECT name FROM users WHERE user_id = $1`, [newCustodianId]);
    if (uRows.length) custodianName = uRows[0].name;

    const dbClient = await getClient();
    try {
      await dbClient.query('BEGIN');
      await dbClient.query(
        `UPDATE cases SET current_custodian_id = $1, current_custodian_name = $2,
                         updated_at = NOW(), version = version + 1
         WHERE case_id = $3`,
        [newCustodianId, custodianName, caseId]
      );

      await dbClient.query(
        `INSERT INTO case_custody_transfers
           (case_id, from_user_id, to_user_id, to_custodian_name, to_role, notes, override_reason)
         VALUES ($1,$2,$3,$4,$5,$6,$7)`,
        [caseId, actorId || null, newCustodianId, custodianName, newCustodianRole || null, notes || null, isAdminOverride ? overrideReason : null]
      );

      // Also enqueue case custody event into Blockchain Outbox
      await dbClient.query(
        `INSERT INTO blockchain_outbox
           (event_type, entity_id, case_id, payload, status)
         VALUES ($1, $2, $3, $4, 'PENDING')`,
        [
          'TRANSFER_INITIATE',
          caseId,
          caseId,
          JSON.stringify({
            evidenceId: caseId,
            targetMSP: newCustodianRole === 'FORENSICS' ? 'FSLMSP' : 'PoliceMSP',
            actorId: actorId || 'SYSTEM',
            actorRole: actorRole || 'POLICE',
            notes: notes || `Case custody transferred to ${custodianName}`,
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
      caseId,
      userId: actorId,
      userRole: actorRole,
      action: 'TRANSFER_CUSTODY',
      source: 'WEB',
      details: {
        officer: custodianName,
        title: isAdminOverride ? `${notes || ''} [ADMIN OVERRIDE: ${overrideReason}]` : (notes || ''),
      },
    });

    const { rows } = await query(`SELECT *, case_id AS "caseId" FROM cases WHERE case_id = $1`, [caseId]);
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.patch('/:caseId/assignment', async (req, res) => {
  try {
    const { caseId } = req.params;
    const { assigned_forensics_id, current_custodian_id, actorId, actorRole } = req.body || {};

    if (!assigned_forensics_id && !current_custodian_id) {
      return res.status(400).json({ message: 'Provide assigned_forensics_id and/or current_custodian_id' });
    }

    let forensicsName = null;
    if (assigned_forensics_id) {
      const { rows } = await query('SELECT name, role FROM users WHERE user_id = $1', [assigned_forensics_id]);
      if (!rows.length) return res.status(400).json({ message: 'assigned_forensics_id does not reference an existing user' });
      if (rows[0].role !== 'FORENSICS') return res.status(400).json({ message: 'assigned_forensics_id must reference a user with role FORENSICS' });
      forensicsName = rows[0].name;
    }

    let custodianName = null;
    if (current_custodian_id) {
      const { rows } = await query('SELECT name, role FROM users WHERE user_id = $1', [current_custodian_id]);
      if (!rows.length) return res.status(400).json({ message: 'current_custodian_id does not reference an existing user' });
      if (rows[0].role !== 'POLICE') return res.status(400).json({ message: 'current_custodian_id must reference a user with role POLICE' });
      custodianName = rows[0].name;
    }

    const { rows } = await query(
      `UPDATE cases SET
         assigned_forensics_id = COALESCE($1, assigned_forensics_id),
         current_custodian_id = COALESCE($2, current_custodian_id),
         current_custodian_name = COALESCE($3, current_custodian_name),
         updated_at = NOW(), version = version + 1
       WHERE case_id = $4 AND is_deleted = FALSE
       RETURNING *, case_id AS "caseId"`,
      [assigned_forensics_id || null, current_custodian_id || null, custodianName, caseId]
    );
    if (!rows.length) return res.status(404).json({ message: 'Case not found' });

    await auditService.log({
      caseId,
      userId: actorId,
      userRole: actorRole,
      action: 'REASSIGN_CASE',
      source: 'WEB',
      details: {
        title: [
          assigned_forensics_id ? `Forensics lead → ${forensicsName || assigned_forensics_id}` : null,
          current_custodian_id ? `Custodian → ${custodianName || current_custodian_id}` : null,
        ].filter(Boolean).join('; '),
      },
    });

    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;
