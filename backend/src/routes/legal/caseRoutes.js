import express from 'express';
import { query } from '../../db/index.js';
import { auditService } from '../../services/auditService.js';

const router = express.Router();

const CASE_COLUMNS = `
  c.case_id AS "caseId",
  c.cnr_number AS "cnrNumber",
  c.fir_number AS "firNumber",
  c.fir_date AS "firDate",
  c.police_station AS "policeStation",
  c.district,
  c.state,
  c.title,
  c.case_type AS "caseType",
  c.sections,
  c.description,
  c.court,
  c.presiding_judge AS "presidingJudge",
  c.public_prosecutor AS "publicProsecutor",
  c.defense_counsel AS "defenseCounsel",
  c.investigating_officer AS "investigatingOfficer",
  c.investigating_officer_designation AS "investigatingOfficerDesignation",
  c.court_stage AS "stage",
  c.outcome,
  c.created_at AS "registeredAt",
  c.first_hearing_date AS "firstHearingDate",
  c.last_hearing_date AS "lastHearingDate",
  c.upcoming_hearing_date AS "upcomingHearingDate",
  c.disposed_at AS "disposedAt",
  c.current_custodian_name AS "currentCustodian"
`;

// GET /api/legal/cases — list every case that has been onboarded to the
// court/legal domain (identified by a non-null court_stage).
router.get('/', async (req, res) => {
  try {
    const { rows } = await query(
      `SELECT ${CASE_COLUMNS}
       FROM cases c
       WHERE c.is_deleted = FALSE AND c.court_stage IS NOT NULL
       ORDER BY c.created_at DESC`
    );
    res.json(rows);
  } catch (err) {
    console.error('[Legal Cases Error]', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/legal/cases/:caseId — single case with nested parties.
router.get('/:caseId', async (req, res) => {
  try {
    const { caseId } = req.params;
    const { rows } = await query(
      `SELECT ${CASE_COLUMNS}
       FROM cases c
       WHERE c.case_id = $1 AND c.is_deleted = FALSE AND c.court_stage IS NOT NULL`,
      [caseId]
    );
    if (!rows.length) return res.status(404).json({ message: 'Case not found' });

    const { rows: partyRows } = await query(
      `SELECT role, name, age, address, custody_status AS "custodyStatus"
       FROM case_parties WHERE case_id = $1 ORDER BY sort_order, name`,
      [caseId]
    );

    res.json({ ...rows[0], parties: partyRows });
  } catch (err) {
    console.error('[Legal Case Detail Error]', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/legal/cases/:caseId/hearings — full hearing history, oldest first.
router.get('/:caseId/hearings', async (req, res) => {
  try {
    const { caseId } = req.params;
    const { rows } = await query(
      `SELECT
         hearing_id AS "hearingId",
         case_id AS "caseId",
         hearing_date AS "date",
         court,
         judge,
         purpose,
         statement,
         next_hearing_date AS "nextHearingDate",
         prosecutor_present AS "prosecutorPresent",
         defense_counsel_present AS "defenseCounselPresent",
         accused_present AS "accusedPresent"
       FROM case_hearings
       WHERE case_id = $1
       ORDER BY hearing_date ASC`,
      [caseId]
    );

    const formatted = rows.map((h) => ({
      hearingId: h.hearingId,
      caseId: h.caseId,
      date: h.date,
      court: h.court,
      judge: h.judge,
      purpose: h.purpose,
      statement: h.statement,
      nextHearingDate: h.nextHearingDate,
      attendance: {
        prosecutor: h.prosecutorPresent,
        defenseCounsel: h.defenseCounselPresent,
        accusedPresent: h.accusedPresent,
      },
    }));

    res.json(formatted);
  } catch (err) {
    console.error('[Legal Hearings Error]', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/legal/cases/:caseId/view — records a CASE_VIEWED audit entry.
// Best-effort: the frontend fires this once per case open; failures here
// must never block the page from rendering, so it's a separate endpoint
// the client calls without awaiting its result.
router.post('/:caseId/view', async (req, res) => {
  try {
    const { caseId } = req.params;
    const { actorId, actorRole } = req.body || {};
    await auditService.log({
      caseId,
      userId: actorId,
      userRole: actorRole,
      action: 'CASE_VIEWED',
      source: 'WEB',
      details: { title: 'Opened case for review' },
    });
    res.status(201).json({ ok: true });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;
