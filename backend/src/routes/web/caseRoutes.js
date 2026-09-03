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
    const { rows } = await query(
      `UPDATE cases SET status = $1::case_status, updated_at = NOW(), version = version + 1
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
    const { newCustodianId, newCustodianRole, notes, actorId, actorRole } = req.body || {};

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
           (case_id, from_user_id, to_user_id, to_custodian_name, to_role, notes)
         VALUES ($1,$2,$3,$4,$5,$6)`,
        [caseId, actorId || null, newCustodianId, custodianName, newCustodianRole || null, notes || null]
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
      details: { officer: custodianName, title: notes || '' },
    });

    const { rows } = await query(`SELECT *, case_id AS "caseId" FROM cases WHERE case_id = $1`, [caseId]);
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;
