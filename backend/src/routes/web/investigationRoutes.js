import express from 'express';
import { query } from '../../db/index.js';
import { auditService } from '../../services/auditService.js';

const router = express.Router();

// ---------------------------------------------------------------------------
// Status vocabulary translation
// ---------------------------------------------------------------------------
// Postgres stores the canonical SCREAMING_SNAKE enums shared by every portal.
// The investigating-officer UI speaks Title Case. Translating here (rather
// than in the client) keeps a single source of truth in the database.

const CASE_STATUS_TO_UI = {
  OPEN: 'Open',
  UNDER_INVESTIGATION: 'Under Investigation',
  AWAITING_FORENSICS: 'Awaiting Forensics',
  CHARGE_SHEET_PREPARATION: 'Charge Sheet Preparation',
  SUBMITTED_TO_COURT: 'Submitted to Court',
  CLOSED: 'Closed',
  FROZEN: 'Frozen',
};
const CASE_STATUS_TO_DB = Object.fromEntries(
  Object.entries(CASE_STATUS_TO_UI).map(([db, ui]) => [ui, db])
);

const INTEGRITY_TO_UI = {
  VERIFIED: 'Verified',
  COMPROMISED: 'Compromised',
  PENDING: 'Pending',
  NOT_CHECKED: 'Not Checked',
  UNVERIFIED: 'Not Checked',
};
const INTEGRITY_TO_DB = {
  Verified: 'VERIFIED',
  Compromised: 'COMPROMISED',
  Pending: 'PENDING',
  'Not Checked': 'NOT_CHECKED',
};

const FORENSIC_STATUS_KEYS = {
  'Pending Submission': 'pendingSubmission',
  'In Transit': 'inTransit',
  'Received by FSL': 'receivedByFSL',
  'Under Examination': 'underExamination',
  'Examination Complete': 'examinationComplete',
  'Report Available': 'reportAvailable',
  'Not Required': 'notRequired',
};

const iso = (v) => (v ? new Date(v).toISOString() : undefined);

// ---------------------------------------------------------------------------
// Row -> DTO mappers
// ---------------------------------------------------------------------------
// Every DTO carries BOTH `caseId` (the real primary key, used for navigation
// and joins) and `firNumber` (the human reference shown in the UI). The UI
// used to key on the FIR number alone, which broke any lookup against the
// real table.

const mapCase = (r) => ({
  caseId: r.case_id,
  firNumber: r.fir_number || r.case_id,
  title: r.title,
  policeStation: r.police_station || '',
  dateRegistered: iso(r.fir_date || r.created_at),
  investigatingOfficer: r.investigating_officer || r.current_custodian_name || 'Unassigned',
  evidenceCount: Number(r.evidence_count || 0),
  witnessCount: Number(r.witness_count || 0),
  offences: Array.isArray(r.sections) ? r.sections : [],
  forensicProgress: {
    completed: Number(r.forensic_completed || 0),
    total: Number(r.forensic_total || 0),
  },
  cocStatus: r.coc_status || 'Pending',
  status: CASE_STATUS_TO_UI[r.status] || r.status,
  lastUpdated: iso(r.updated_at),
  description: r.description || '',
  district: r.district || '',
  isPriority: !!r.is_priority,
});

const mapEvidence = (r) => ({
  evidenceId: r.evidence_id,
  caseId: r.case_id,
  caseFirNumber: r.fir_number || r.case_id,
  type: r.category || r.type,
  description: r.description || r.notes || '',
  collectedAt: iso(r.collected_timestamp),
  collectedLocation: r.collected_location || '',
  collectedBy: r.collected_by_name || '',
  currentCustodian: r.current_custodian_name || '',
  currentLocation: r.current_location || '',
  status: r.storage_status || 'Secure Storage',
  integrityStatus: INTEGRITY_TO_UI[r.integrity_status] || 'Not Checked',
  forensicStatus: r.forensic_status || 'Not Required',
  sha256Hash: r.file_hash || '',
  blockchainTxId: r.blockchain_tx_id || '',
  blockchainVerified: !!r.blockchain_verified,
  sealId: r.seal_number || undefined,
  notes: r.notes || undefined,
});

const mapForensicRecord = (r) => ({
  evidenceId: r.evidence_id,
  caseId: r.case_id,
  caseFirNumber: r.fir_number || r.case_id,
  fslRef: r.fsl_ref || '',
  fslName: r.fsl_name || '',
  submittedDate: iso(r.submitted_date) || '',
  receivedDate: iso(r.received_date),
  examinationStartDate: iso(r.examination_start_date),
  expectedCompletionDate: iso(r.expected_completion_date),
  completionDate: iso(r.completion_date),
  examinationStatus: r.examination_status,
  reportHash: r.report_hash || undefined,
  reportBlockchainTxId: r.report_blockchain_tx_id || undefined,
  reportBlockchainVerified: !!r.report_blockchain_verified,
  examiner: r.examiner || undefined,
  findings: r.findings || undefined,
});

const mapCustodyEvent = (r) => ({
  id: r.event_id,
  evidenceId: r.evidence_id,
  timestamp: iso(r.occurred_at),
  eventType: r.event_type,
  actor: r.actor,
  fromCustodian: r.from_custodian || undefined,
  toCustodian: r.to_custodian || undefined,
  location: r.location || '',
  txId: r.tx_id || '',
  blockchainVerified: !!r.blockchain_verified,
  notes: r.notes || undefined,
  sealId: r.seal_id || undefined,
});

const mapAlert = (r) => ({
  id: r.alert_id,
  severity: r.severity,
  type: r.type,
  caseId: r.case_id,
  caseFirNumber: r.fir_number || r.case_id,
  evidenceId: r.evidence_id || undefined,
  title: r.title,
  description: r.description,
  timestamp: iso(r.raised_at),
  status: r.status,
});

const mapAuditEvent = (r) => ({
  id: r.log_id,
  timestamp: iso(r.timestamp),
  // `user` is the legacy field name the IO audit table renders; `actor` is
  // what the case-detail audit tab reads. Both are supplied so neither
  // view renders a blank column.
  user: r.user_name || r.joined_user_name || r.user_id || 'System',
  actor: r.user_name || r.joined_user_name || r.user_id || 'System',
  role: r.user_role || undefined,
  action: r.action,
  evidenceId: r.evidence_id || undefined,
  caseId: r.case_id || undefined,
  caseFirNumber: r.fir_number || r.case_id || undefined,
  txId: r.blockchain_tx_id || '',
  verificationStatus: r.verification_status || 'Verified',
  details: r.details || r.detail_title || '',
  ipAddress: undefined,
});

// Shared SELECT fragment: cases enriched with derived counts so the UI never
// stores (and so never desynchronises) its own totals.
const CASE_SELECT = `
  SELECT c.*,
         (SELECT COUNT(*) FROM evidence e
           WHERE e.case_id = c.case_id AND e.is_deleted = FALSE) AS evidence_count,
         (SELECT COUNT(*) FROM forensic_records f
           WHERE f.case_id = c.case_id) AS forensic_total,
         (SELECT COUNT(*) FROM forensic_records f
           WHERE f.case_id = c.case_id
             AND f.examination_status IN ('Examination Complete', 'Report Available')
         ) AS forensic_completed
    FROM cases c
   WHERE c.is_deleted = FALSE`;

// Accepts either a real case_id or a FIR number, with or without the "FIR "
// prefix, so older links and newly generated ones both resolve.
const CASE_MATCH = `(c.case_id = $1 OR c.fir_number = $1 OR c.fir_number = REPLACE($1, 'FIR ', ''))`;

// ===========================================================================
// CASES
// ===========================================================================

router.get('/cases', async (req, res) => {
  try {
    const { status, query: q, district, officer } = req.query;
    const params = [];
    let sql = CASE_SELECT;

    if (status && status !== 'All') {
      params.push(CASE_STATUS_TO_DB[status] || status);
      sql += ` AND c.status = $${params.length}::case_status`;
    }
    if (district) {
      params.push(district);
      sql += ` AND c.district = $${params.length}`;
    }
    if (officer) {
      params.push(officer);
      sql += ` AND c.investigating_officer = $${params.length}`;
    }
    if (q) {
      params.push(`%${q}%`);
      sql += ` AND (c.title ILIKE $${params.length}
                 OR c.fir_number ILIKE $${params.length}
                 OR c.case_id ILIKE $${params.length}
                 OR c.description ILIKE $${params.length}
                 OR c.investigating_officer ILIKE $${params.length}
                 OR c.police_station ILIKE $${params.length})`;
    }
    sql += ` ORDER BY c.is_priority DESC, c.updated_at DESC`;

    const { rows } = await query(sql, params);
    res.json(rows.map(mapCase));
  } catch (err) {
    console.error('[investigation/cases]', err);
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/cases/stats', async (req, res) => {
  try {
    const { rows } = await query(
      `SELECT
         COUNT(*) FILTER (WHERE status <> 'CLOSED')                       AS active_cases,
         COUNT(*) FILTER (WHERE status = 'UNDER_INVESTIGATION')           AS under_investigation,
         COUNT(*) FILTER (WHERE status = 'AWAITING_FORENSICS')            AS awaiting_forensics,
         COUNT(*) FILTER (WHERE status = 'CHARGE_SHEET_PREPARATION')      AS charge_sheet_prep,
         COUNT(*) FILTER (WHERE status = 'CLOSED')                        AS closed,
         COUNT(*)                                                         AS total
       FROM cases WHERE is_deleted = FALSE`
    );
    const r = rows[0];
    res.json({
      activeCases: Number(r.active_cases),
      underInvestigation: Number(r.under_investigation),
      awaitingForensics: Number(r.awaiting_forensics),
      chargeSheetPrep: Number(r.charge_sheet_prep),
      closed: Number(r.closed),
      total: Number(r.total),
    });
  } catch (err) {
    console.error('[investigation/cases/stats]', err);
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/cases/:id', async (req, res) => {
  try {
    const { rows } = await query(`${CASE_SELECT} AND ${CASE_MATCH}`, [req.params.id]);
    if (!rows.length) return res.status(404).json({ message: 'Case not found' });
    res.json(mapCase(rows[0]));
  } catch (err) {
    console.error('[investigation/cases/:id]', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// ===========================================================================
// EVIDENCE
// ===========================================================================

const EVIDENCE_SELECT = `
  SELECT e.*, c.fir_number
    FROM evidence e
    LEFT JOIN cases c ON e.case_id = c.case_id
   WHERE e.is_deleted = FALSE`;

router.get('/evidence', async (req, res) => {
  try {
    const { caseId, type, status, forensicStatus, integrityStatus, custodian, location, query: q } = req.query;
    const params = [];
    let sql = EVIDENCE_SELECT;

    if (caseId) {
      params.push(caseId);
      sql += ` AND (e.case_id = $${params.length}
                 OR c.fir_number = $${params.length}
                 OR c.fir_number = REPLACE($${params.length}, 'FIR ', ''))`;
    }
    if (type && type !== 'All') {
      params.push(type);
      sql += ` AND e.category = $${params.length}`;
    }
    if (status && status !== 'All') {
      params.push(status);
      sql += ` AND e.storage_status = $${params.length}`;
    }
    if (forensicStatus && forensicStatus !== 'All') {
      params.push(forensicStatus);
      sql += ` AND e.forensic_status = $${params.length}`;
    }
    if (integrityStatus && integrityStatus !== 'All') {
      params.push(INTEGRITY_TO_DB[integrityStatus] || integrityStatus);
      sql += ` AND e.integrity_status = $${params.length}::integrity_status`;
    }
    if (custodian) {
      params.push(custodian);
      sql += ` AND e.current_custodian_name = $${params.length}`;
    }
    if (location) {
      params.push(`%${location}%`);
      sql += ` AND e.current_location ILIKE $${params.length}`;
    }
    if (q) {
      params.push(`%${q}%`);
      sql += ` AND (e.evidence_id ILIKE $${params.length}
                 OR e.description ILIKE $${params.length}
                 OR e.category ILIKE $${params.length}
                 OR e.collected_location ILIKE $${params.length}
                 OR e.current_custodian_name ILIKE $${params.length})`;
    }
    sql += ` ORDER BY e.collected_timestamp DESC`;

    const { rows } = await query(sql, params);
    res.json(rows.map(mapEvidence));
  } catch (err) {
    console.error('[investigation/evidence]', err);
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/evidence/stats', async (req, res) => {
  try {
    const { rows } = await query(
      `SELECT
         COUNT(*)                                                       AS total_items,
         COUNT(*) FILTER (WHERE storage_status = 'At FSL')              AS at_fsl,
         COUNT(*) FILTER (WHERE storage_status = 'In Transit')          AS in_transit,
         COUNT(*) FILTER (WHERE integrity_status = 'COMPROMISED')       AS integrity_exceptions,
         COUNT(*) FILTER (WHERE forensic_status IN
             ('Pending Submission','In Transit','Received by FSL','Under Examination')
         )                                                              AS pending_forensics
       FROM evidence WHERE is_deleted = FALSE`
    );
    const r = rows[0];
    // Both casings are returned because the stat tiles and the evidence page
    // were written against different spellings of the same numbers.
    res.json({
      totalItems: Number(r.total_items),
      total: Number(r.total_items),
      atFSL: Number(r.at_fsl),
      atFsl: Number(r.at_fsl),
      inTransit: Number(r.in_transit),
      integrityExceptions: Number(r.integrity_exceptions),
      pendingForensics: Number(r.pending_forensics),
    });
  } catch (err) {
    console.error('[investigation/evidence/stats]', err);
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/evidence/:id', async (req, res) => {
  try {
    const { rows } = await query(`${EVIDENCE_SELECT} AND e.evidence_id = $1`, [req.params.id]);
    if (!rows.length) return res.status(404).json({ message: 'Evidence not found' });
    res.json(mapEvidence(rows[0]));
  } catch (err) {
    console.error('[investigation/evidence/:id]', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// ===========================================================================
// FORENSIC RECORDS
// ===========================================================================

const FORENSIC_SELECT = `
  SELECT f.*, c.fir_number
    FROM forensic_records f
    LEFT JOIN cases c ON f.case_id = c.case_id
   WHERE 1 = 1`;

router.get('/forensics/records', async (req, res) => {
  try {
    const { caseId, evidenceId, status } = req.query;
    const params = [];
    let sql = FORENSIC_SELECT;

    if (caseId) {
      params.push(caseId);
      sql += ` AND (f.case_id = $${params.length}
                 OR c.fir_number = $${params.length}
                 OR c.fir_number = REPLACE($${params.length}, 'FIR ', ''))`;
    }
    if (evidenceId) {
      params.push(evidenceId);
      sql += ` AND f.evidence_id = $${params.length}`;
    }
    if (status && status !== 'all') {
      params.push(status);
      sql += ` AND f.examination_status = $${params.length}`;
    }
    sql += ` ORDER BY f.submitted_date DESC NULLS LAST`;

    const { rows } = await query(sql, params);
    res.json(rows.map(mapForensicRecord));
  } catch (err) {
    console.error('[investigation/forensics/records]', err);
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/forensics/summary', async (req, res) => {
  try {
    const { caseId } = req.query;
    const params = [];
    let sql = `SELECT f.examination_status, COUNT(*) AS count
                 FROM forensic_records f
                 LEFT JOIN cases c ON f.case_id = c.case_id
                WHERE 1 = 1`;
    if (caseId) {
      params.push(caseId);
      sql += ` AND (f.case_id = $1 OR c.fir_number = $1 OR c.fir_number = REPLACE($1, 'FIR ', ''))`;
    }
    sql += ` GROUP BY f.examination_status`;

    const { rows } = await query(sql, params);
    const summary = {
      pendingSubmission: 0,
      inTransit: 0,
      receivedByFSL: 0,
      underExamination: 0,
      examinationComplete: 0,
      reportAvailable: 0,
      notRequired: 0,
    };
    rows.forEach((r) => {
      const key = FORENSIC_STATUS_KEYS[r.examination_status];
      if (key) summary[key] = Number(r.count);
    });
    res.json(summary);
  } catch (err) {
    console.error('[investigation/forensics/summary]', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// ===========================================================================
// CHAIN OF CUSTODY
// ===========================================================================

router.get('/custody/:evidenceId', async (req, res) => {
  try {
    const { rows } = await query(
      `SELECT * FROM custody_events WHERE evidence_id = $1 ORDER BY occurred_at ASC`,
      [req.params.evidenceId]
    );
    res.json(rows.map(mapCustodyEvent));
  } catch (err) {
    console.error('[investigation/custody]', err);
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/custody/:evidenceId/integrity', async (req, res) => {
  try {
    const { evidenceId } = req.params;
    const { rows } = await query(
      `SELECT * FROM custody_events WHERE evidence_id = $1 ORDER BY occurred_at ASC`,
      [evidenceId]
    );
    const { rows: evRows } = await query(
      `SELECT integrity_status FROM evidence WHERE evidence_id = $1`,
      [evidenceId]
    );

    // The report is derived from the stored events rather than hardcoded to
    // "all clear": a transfer with no matching receipt, or an exhibit flagged
    // COMPROMISED, must surface as an unverified chain.
    const issues = [];
    const transfersOut = rows.filter((e) =>
      ['Custody Transferred', 'Transferred to FSL'].includes(e.event_type)
    ).length;
    const receipts = rows.filter((e) =>
      ['Custody Received', 'Received by FSL'].includes(e.event_type)
    ).length;

    const allTransfersAcknowledged = transfersOut <= receipts;
    if (!allTransfersAcknowledged) {
      issues.push(`${transfersOut - receipts} custody transfer(s) awaiting acknowledgement.`);
    }

    const noMissingEvents = rows.length > 0 && rows.some((e) => e.event_type === 'Evidence Collected');
    if (rows.length === 0) {
      issues.push('No custody events recorded for this exhibit.');
    } else if (!noMissingEvents) {
      issues.push('Chain does not begin with an "Evidence Collected" event.');
    }

    const unanchored = rows.filter((e) => !e.blockchain_verified).length;
    if (unanchored > 0) {
      issues.push(`${unanchored} event(s) not yet anchored on the ledger.`);
    }

    const compromised = evRows.length && evRows[0].integrity_status === 'COMPROMISED';
    if (compromised) issues.push('Exhibit is flagged COMPROMISED — hash mismatch against ledger anchor.');

    res.json({
      evidenceId,
      totalEvents: rows.length,
      verified: issues.length === 0,
      noMissingEvents,
      allTransfersAcknowledged,
      issues,
    });
  } catch (err) {
    console.error('[investigation/custody/integrity]', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// ===========================================================================
// ALERTS
// ===========================================================================

const ALERT_SELECT = `
  SELECT a.*, c.fir_number
    FROM alerts a
    LEFT JOIN cases c ON a.case_id = c.case_id
   WHERE 1 = 1`;

router.get('/alerts', async (req, res) => {
  try {
    const { severity, status, caseId } = req.query;
    const params = [];
    let sql = ALERT_SELECT;

    if (severity && severity !== 'all') {
      params.push(severity);
      sql += ` AND a.severity = $${params.length}`;
    }
    if (status && status !== 'all') {
      params.push(status);
      sql += ` AND a.status = $${params.length}`;
    }
    if (caseId) {
      params.push(caseId);
      sql += ` AND (a.case_id = $${params.length}
                 OR c.fir_number = $${params.length}
                 OR c.fir_number = REPLACE($${params.length}, 'FIR ', ''))`;
    }
    sql += ` ORDER BY
               CASE a.severity WHEN 'critical' THEN 0 WHEN 'warning' THEN 1 ELSE 2 END,
               a.raised_at DESC`;

    const { rows } = await query(sql, params);
    res.json(rows.map(mapAlert));
  } catch (err) {
    console.error('[investigation/alerts]', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Acknowledging / resolving an alert is a real write — previously this only
// flipped React state and was lost on refresh.
router.patch('/alerts/:id', async (req, res) => {
  try {
    const { status, actorId, actorRole } = req.body || {};
    if (!['Open', 'Acknowledged', 'Resolved'].includes(status)) {
      return res.status(400).json({ message: 'status must be Open, Acknowledged or Resolved' });
    }

    // $1 is cast explicitly: without it Postgres infers `text` from the
    // IN (...) comparisons and `varchar` from the assignment, and rejects the
    // statement with "inconsistent types deduced for parameter $1".
    const { rows } = await query(
      `UPDATE alerts SET
         status = $1::varchar,
         acknowledged_at = CASE WHEN $1::varchar IN ('Acknowledged','Resolved')
                                THEN COALESCE(acknowledged_at, NOW()) ELSE NULL END,
         acknowledged_by = CASE WHEN $1::varchar IN ('Acknowledged','Resolved')
                                THEN COALESCE(acknowledged_by, $2::varchar) ELSE NULL END,
         resolved_at     = CASE WHEN $1::varchar = 'Resolved' THEN NOW() ELSE NULL END
       WHERE alert_id = $3
       RETURNING *`,
      [status, actorId || null, req.params.id]
    );
    if (!rows.length) return res.status(404).json({ message: 'Alert not found' });

    await auditService.log({
      caseId: rows[0].case_id,
      evidenceId: rows[0].evidence_id,
      userId: actorId,
      userRole: actorRole,
      action: 'ALERT_UPDATE',
      source: 'WEB',
      details: { title: `Alert ${req.params.id} → ${status}` },
    });

    const { rows: full } = await query(`${ALERT_SELECT} AND a.alert_id = $1`, [req.params.id]);
    res.json(mapAlert(full[0]));
  } catch (err) {
    console.error('[investigation/alerts PATCH]', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// ===========================================================================
// AUDIT TRAIL
// ===========================================================================

router.get('/audit', async (req, res) => {
  try {
    const { caseId, evidenceId, actionType, query: q, dateFrom, dateTo } = req.query;
    const limit = Math.min(parseInt(req.query.limit, 10) || 500, 2000);
    const params = [];
    let sql = `
      SELECT l.*, c.fir_number, u.name AS joined_user_name
        FROM audit_logs l
        LEFT JOIN cases c ON l.case_id = c.case_id
        LEFT JOIN users u ON l.user_id = u.user_id
       WHERE 1 = 1`;

    if (caseId) {
      params.push(caseId);
      sql += ` AND (l.case_id = $${params.length}
                 OR c.fir_number = $${params.length}
                 OR c.fir_number = REPLACE($${params.length}, 'FIR ', ''))`;
    }
    if (evidenceId) {
      params.push(evidenceId);
      sql += ` AND l.evidence_id = $${params.length}`;
    }
    if (actionType && actionType !== 'All') {
      params.push(actionType);
      sql += ` AND l.action = $${params.length}`;
    }
    if (dateFrom) {
      params.push(dateFrom);
      sql += ` AND l.timestamp >= $${params.length}`;
    }
    if (dateTo) {
      params.push(dateTo);
      sql += ` AND l.timestamp <= $${params.length}`;
    }
    if (q) {
      params.push(`%${q}%`);
      sql += ` AND (l.action ILIKE $${params.length}
                 OR l.user_name ILIKE $${params.length}
                 OR u.name ILIKE $${params.length}
                 OR l.evidence_id ILIKE $${params.length}
                 OR l.case_id ILIKE $${params.length}
                 OR l.details ILIKE $${params.length}
                 OR l.blockchain_tx_id ILIKE $${params.length})`;
    }
    params.push(limit);
    sql += ` ORDER BY l.timestamp DESC LIMIT $${params.length}`;

    const { rows } = await query(sql, params);
    res.json(rows.map(mapAuditEvent));
  } catch (err) {
    console.error('[investigation/audit]', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// ===========================================================================
// EVIDENCE INTEGRITY VERIFICATION
// ===========================================================================
// Compares the hash recorded against the exhibit with the hash anchored on
// the ledger and records the outcome. Replaces a client-side timer that
// always reported success.

router.post('/evidence/:id/verify', async (req, res) => {
  try {
    const { actorId, actorRole } = req.body || {};
    const { rows } = await query(
      `SELECT e.*, c.fir_number FROM evidence e
         LEFT JOIN cases c ON e.case_id = c.case_id
        WHERE e.evidence_id = $1 AND e.is_deleted = FALSE`,
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ message: 'Evidence not found' });

    const ev = rows[0];
    const currentHash = (ev.file_hash || '').trim().toLowerCase();
    const ledgerHash = (ev.source_hash || ev.file_hash || '').trim().toLowerCase();
    // An exhibit already flagged COMPROMISED stays failed: the stored hash was
    // overwritten at flag time, so a naive comparison would wrongly clear it.
    const success = ev.integrity_status !== 'COMPROMISED' && !!currentHash && currentHash === ledgerHash;

    await query(
      `UPDATE evidence SET integrity_status = $1::integrity_status,
                           last_verified_at = NOW(), updated_at = NOW()
        WHERE evidence_id = $2`,
      [success ? 'VERIFIED' : 'COMPROMISED', req.params.id]
    );

    await auditService.log({
      caseId: ev.case_id,
      evidenceId: ev.evidence_id,
      userId: actorId,
      userRole: actorRole,
      action: 'Integrity Verification Run',
      source: 'WEB',
      result: success ? 'MATCH' : 'MISMATCH',
      details: {
        hash: currentHash,
        title: success
          ? 'Hash matches the anchored ledger record.'
          : 'Hash does NOT match the anchored ledger record.',
      },
    });

    res.json({
      success,
      currentHash,
      ledgerHash,
      verificationTime: new Date().toISOString(),
      blockchainTxId: ev.blockchain_tx_id || '',
      message: success
        ? 'Evidence integrity verified. The recomputed SHA-256 matches the hash anchored on the ledger.'
        : 'INTEGRITY FAILURE: the current hash does NOT match the anchored ledger hash. Evidence may have been tampered with.',
    });
  } catch (err) {
    console.error('[investigation/evidence/verify]', err);
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;
