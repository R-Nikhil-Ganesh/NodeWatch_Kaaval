import express from 'express';
import { query, getClient } from '../../db/index.js';
import { auditService } from '../../services/auditService.js';
import { requireAuth, requireRegistrar } from '../../middleware/auth.js';

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
  c.current_custodian_name AS "currentCustodian",
  c.is_immediate AS "isImmediate"
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

// Detail fields that can either come straight from the request body or, for
// an Immediate case, be inherited from the selected source case(s). A body
// value always wins; otherwise the first source case (in the caller's
// selection order) that has a non-empty value for that field wins.
const MERGEABLE_FIELDS = [
  ['description', 'description'],
  ['firNumber', 'firNumber'],
  ['firDate', 'firDate'],
  ['policeStation', 'policeStation'],
  ['district', 'district'],
  ['state', 'state'],
  ['caseType', 'caseType'],
  ['sections', 'sections'],
  ['court', 'court'],
  ['presidingJudge', 'presidingJudge'],
  ['publicProsecutor', 'publicProsecutor'],
  ['defenseCounsel', 'defenseCounsel'],
  ['investigatingOfficer', 'investigatingOfficer'],
  ['investigatingOfficerDesignation', 'investigatingOfficerDesignation'],
];

function isEmptyValue(v) {
  return v === undefined || v === null || v === '' || (Array.isArray(v) && v.length === 0);
}

// POST /api/legal/cases — registers a new case with the court (Registrar only).
// When isImmediate + sourceCaseIds are given, only title/cnrNumber are entered
// by hand — the rest of the case details, plus its evidence and case files,
// are ported over from the selected source case(s).
router.post('/', requireAuth, requireRegistrar, async (req, res) => {
  try {
    const body = req.body || {};
    const { title, cnrNumber, parties, isImmediate, sourceCaseIds } = body;

    if (!title || !cnrNumber) {
      return res.status(400).json({ message: 'title and cnrNumber are required' });
    }

    const immediate = !!isImmediate && Array.isArray(sourceCaseIds) && sourceCaseIds.length > 0;

    let sourceCases = [];
    const merged = {};
    for (const [field] of MERGEABLE_FIELDS) merged[field] = body[field];

    if (immediate) {
      const { rows: sourceRows } = await query(
        `SELECT ${CASE_COLUMNS} FROM cases c
         WHERE c.case_id = ANY($1::varchar[]) AND c.is_deleted = FALSE`,
        [sourceCaseIds]
      );
      sourceCases = sourceCaseIds
        .map((id) => sourceRows.find((r) => r.caseId === id))
        .filter(Boolean);

      if (!sourceCases.length) {
        return res.status(400).json({ message: 'No valid source cases found for immediate case' });
      }

      for (const [field, sourceField] of MERGEABLE_FIELDS) {
        if (!isEmptyValue(merged[field])) continue;
        for (const sc of sourceCases) {
          const v = sc[sourceField];
          if (!isEmptyValue(v)) {
            merged[field] = v;
            break;
          }
        }
      }
    }

    const caseId = `CASE-${new Date().getFullYear()}-${Date.now().toString().slice(-6)}`;

    const dbClient = await getClient();
    let created;
    const auditQueue = [];
    try {
      await dbClient.query('BEGIN');

      const { rows } = await dbClient.query(
        `INSERT INTO cases AS c
           (case_id, title, description, status, cnr_number, fir_number, fir_date,
            police_station, district, state, case_type, sections, court,
            presiding_judge, public_prosecutor, defense_counsel,
            investigating_officer, investigating_officer_designation,
            court_stage, outcome, is_immediate, blockchain_hash, version, is_deleted, created_at, updated_at)
         VALUES ($1,$2,$3,'SUBMITTED_TO_COURT',$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,
                 'INVESTIGATION','NONE',$18,'pending',1,FALSE,NOW(),NOW())
         RETURNING ${CASE_COLUMNS}`,
        [
          caseId, title, merged.description || '', cnrNumber, merged.firNumber || null,
          merged.firDate ? new Date(merged.firDate) : null, merged.policeStation || null, merged.district || null,
          merged.state || null, merged.caseType || null, JSON.stringify(merged.sections || []), merged.court || null,
          merged.presidingJudge || null, merged.publicProsecutor || null, merged.defenseCounsel || null,
          merged.investigatingOfficer || null, merged.investigatingOfficerDesignation || null,
          immediate,
        ]
      );
      created = rows[0];

      if (Array.isArray(parties) && parties.length) {
        for (const [i, p] of parties.entries()) {
          await dbClient.query(
            `INSERT INTO case_parties (case_id, role, name, age, address, custody_status, sort_order)
             VALUES ($1,$2,$3,$4,$5,$6,$7)`,
            [caseId, p.role, p.name, p.age || null, p.address || null, p.custodyStatus || null, i]
          );
        }
      }

      if (immediate) {
        for (const [i, sc] of sourceCases.entries()) {
          await dbClient.query(
            `INSERT INTO case_merge_sources (case_id, source_case_id, sort_order) VALUES ($1,$2,$3)`,
            [caseId, sc.caseId, i]
          );
        }

        let custodianName = null;
        const { rows: uRows } = await dbClient.query('SELECT name FROM users WHERE user_id = $1', [req.auth.userId]);
        if (uRows.length) custodianName = uRows[0].name;

        // Pass 1: assign new evidence ids up front so linked_evidence_ids can
        // be remapped to the copies (not the originals) across all sources.
        const evidenceIdMap = new Map();
        const evidenceToCopy = [];
        for (const sc of sourceCases) {
          const { rows: evRows } = await dbClient.query(
            `SELECT * FROM evidence WHERE case_id = $1 AND is_deleted = FALSE`,
            [sc.caseId]
          );
          for (const ev of evRows) {
            const newEvidenceId = `EV-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
            evidenceIdMap.set(ev.evidence_id, newEvidenceId);
            evidenceToCopy.push({ sourceCaseId: sc.caseId, ev, newEvidenceId });
          }
        }

        for (const { sourceCaseId, ev, newEvidenceId } of evidenceToCopy) {
          const remappedLinks = Array.isArray(ev.linked_evidence_ids)
            ? ev.linked_evidence_ids.map((id) => evidenceIdMap.get(id)).filter(Boolean)
            : [];

          await dbClient.query(
            `INSERT INTO evidence
               (evidence_id, case_id, name, file_name, type, mime_type, file_size_bytes, file_url,
                file_hash, metadata_hash, source_hash, lifting_video_url, lifting_video_hash,
                classification, risk_level, integrity_status, last_verified_at, approved_for_legal,
                section63_cert_id, notes, uploaded_by, current_custodian_id, current_custodian_name,
                owner_msp, transfer_target_msp, collected_location, collected_timestamp,
                linked_evidence_ids, blockchain_tx_id, on_chain_status, version, is_deleted,
                created_at, updated_at)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,
                     $22,$23,$24,$25,$26,$27,$28,NULL,'PENDING',1,FALSE,NOW(),NOW())`,
            [
              newEvidenceId, caseId, ev.name, ev.file_name, ev.type, ev.mime_type, ev.file_size_bytes, ev.file_url,
              ev.file_hash, ev.metadata_hash, ev.source_hash, ev.lifting_video_url, ev.lifting_video_hash,
              ev.classification, ev.risk_level, ev.integrity_status, ev.last_verified_at, ev.approved_for_legal,
              ev.section63_cert_id, ev.notes, req.auth.userId, req.auth.userId, custodianName,
              ev.owner_msp, ev.transfer_target_msp, ev.collected_location, ev.collected_timestamp,
              JSON.stringify(remappedLinks),
            ]
          );

          const { rows: visRows } = await dbClient.query(
            `SELECT * FROM evidence_visibility WHERE evidence_id = $1`,
            [ev.evidence_id]
          );
          if (visRows.length) {
            const vis = visRows[0];
            await dbClient.query(
              `INSERT INTO evidence_visibility (evidence_id, is_restricted, allowed_roles, allowed_designations, allowed_user_ids)
               VALUES ($1,$2,$3,$4,$5)`,
              [newEvidenceId, vis.is_restricted, JSON.stringify(vis.allowed_roles), JSON.stringify(vis.allowed_designations), JSON.stringify(vis.allowed_user_ids)]
            );
          }

          auditQueue.push({
            caseId, evidenceId: newEvidenceId, action: 'COPIED_EVIDENCE',
            details: { title: `Ported evidence "${ev.name}" from ${sourceCaseId}` },
          });
        }

        for (const sc of sourceCases) {
          const { rows: docRows } = await dbClient.query(
            `SELECT * FROM case_documents WHERE case_id = $1`,
            [sc.caseId]
          );
          for (const doc of docRows) {
            const remappedLinks = Array.isArray(doc.linked_evidence_ids)
              ? doc.linked_evidence_ids.map((id) => evidenceIdMap.get(id)).filter(Boolean)
              : [];
            await dbClient.query(
              `INSERT INTO case_documents
                 (case_id, title, type, description, file_url, file_hash, uploaded_by,
                  uploaded_by_role, doc_type_label, file_format, file_size_kb,
                  related_sections, linked_evidence_ids, content_text, created_at)
               VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,NOW())`,
              [
                caseId, doc.title, doc.type, doc.description, doc.file_url, doc.file_hash, req.auth.userId,
                doc.uploaded_by_role, doc.doc_type_label, doc.file_format, doc.file_size_kb,
                JSON.stringify(doc.related_sections || []), JSON.stringify(remappedLinks), doc.content_text,
              ]
            );
            auditQueue.push({
              caseId, action: 'COPIED_DOC',
              details: { title: `Ported case file "${doc.title}" from ${sc.caseId}`, fileName: doc.title },
            });
          }
        }
      }

      await dbClient.query('COMMIT');
    } catch (err) {
      await dbClient.query('ROLLBACK');
      throw err;
    } finally {
      dbClient.release();
    }

    await auditService.log({
      caseId,
      userId: req.auth.userId,
      userRole: req.auth.role,
      action: 'CREATE_CASE',
      source: 'WEB',
      details: { title },
    });

    if (immediate) {
      await auditService.log({
        caseId,
        userId: req.auth.userId,
        userRole: req.auth.role,
        action: 'CASE_LINKED',
        source: 'WEB',
        details: { title: `Linked as immediate case from ${sourceCases.map((sc) => sc.caseId).join(', ')}` },
      });
      for (const entry of auditQueue) {
        await auditService.log({
          caseId: entry.caseId,
          evidenceId: entry.evidenceId,
          userId: req.auth.userId,
          userRole: req.auth.role,
          action: entry.action,
          source: 'WEB',
          details: entry.details,
        });
      }
    }

    res.status(201).json({ ...created, parties: parties || [] });
  } catch (err) {
    console.error('[Legal Case Create Error]', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// PATCH /api/legal/cases/:caseId — updates court-side case details / stage / outcome
// (Registrar only). Hearing dates are derived from case_hearings, not edited here.
router.patch('/:caseId', requireAuth, requireRegistrar, async (req, res) => {
  try {
    const { caseId } = req.params;
    const {
      stage, outcome, court, presidingJudge, publicProsecutor, defenseCounsel,
      investigatingOfficer, investigatingOfficerDesignation, description,
    } = req.body || {};

    const { rows: existing } = await query(
      `SELECT court_stage, disposed_at FROM cases WHERE case_id = $1 AND is_deleted = FALSE`,
      [caseId]
    );
    if (!existing.length) return res.status(404).json({ message: 'Case not found' });

    const nextStage = stage || existing[0].court_stage;
    const disposedAt = nextStage === 'DISPOSED' ? (existing[0].disposed_at || new Date()) : existing[0].disposed_at;

    const { rows } = await query(
      `UPDATE cases AS c SET
         court_stage = $2,
         outcome = COALESCE($3, outcome),
         court = COALESCE($4, court),
         presiding_judge = COALESCE($5, presiding_judge),
         public_prosecutor = COALESCE($6, public_prosecutor),
         defense_counsel = COALESCE($7, defense_counsel),
         investigating_officer = COALESCE($8, investigating_officer),
         investigating_officer_designation = COALESCE($9, investigating_officer_designation),
         description = COALESCE($10, description),
         disposed_at = $11,
         version = version + 1,
         updated_at = NOW()
       WHERE case_id = $1 AND is_deleted = FALSE
       RETURNING ${CASE_COLUMNS}`,
      [
        caseId, nextStage, outcome || null, court || null, presidingJudge || null,
        publicProsecutor || null, defenseCounsel || null, investigatingOfficer || null,
        investigatingOfficerDesignation || null, description || null, disposedAt,
      ]
    );

    await auditService.log({
      caseId,
      userId: req.auth.userId,
      userRole: req.auth.role,
      action: 'STATUS_UPDATE',
      source: 'WEB',
      details: { title: `Case updated to stage ${nextStage}` },
    });

    res.json(rows[0]);
  } catch (err) {
    console.error('[Legal Case Update Error]', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Recomputes the case's derived hearing-date summary fields from its full
// case_hearings history, so first/last/upcoming stay correct after any add or edit.
async function recomputeHearingSummary(caseId) {
  await query(
    `UPDATE cases c SET
       first_hearing_date = (SELECT MIN(hearing_date) FROM case_hearings WHERE case_id = c.case_id),
       last_hearing_date  = (SELECT MAX(hearing_date) FROM case_hearings WHERE case_id = c.case_id),
       upcoming_hearing_date = (
         SELECT next_hearing_date FROM case_hearings
         WHERE case_id = c.case_id ORDER BY hearing_date DESC LIMIT 1
       ),
       updated_at = NOW()
     WHERE case_id = $1`,
    [caseId]
  );
}

// POST /api/legal/cases/:caseId/hearings — records a new hearing (Registrar only).
router.post('/:caseId/hearings', requireAuth, requireRegistrar, async (req, res) => {
  try {
    const { caseId } = req.params;
    const { date, court, judge, purpose, statement, nextHearingDate, attendance } = req.body || {};

    if (!date || !purpose) return res.status(400).json({ message: 'date and purpose are required' });

    const hearingId = `HRG-${caseId}-${Date.now().toString().slice(-6)}`;

    await query(
      `INSERT INTO case_hearings
         (hearing_id, case_id, hearing_date, court, judge, purpose, statement,
          next_hearing_date, prosecutor_present, defense_counsel_present, accused_present)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
      [
        hearingId, caseId, new Date(date), court || null, judge || null, purpose,
        statement || null, nextHearingDate ? new Date(nextHearingDate) : null,
        !!attendance?.prosecutor, !!attendance?.defenseCounsel, !!attendance?.accusedPresent,
      ]
    );

    await recomputeHearingSummary(caseId);

    await auditService.log({
      caseId,
      userId: req.auth.userId,
      userRole: req.auth.role,
      action: 'STATUS_UPDATE',
      source: 'WEB',
      details: { title: `Hearing recorded: ${purpose}` },
    });

    res.status(201).json({ hearingId });
  } catch (err) {
    console.error('[Legal Hearing Create Error]', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// PATCH /api/legal/cases/:caseId/hearings/:hearingId — edits an existing hearing record.
router.patch('/:caseId/hearings/:hearingId', requireAuth, requireRegistrar, async (req, res) => {
  try {
    const { caseId, hearingId } = req.params;
    const { date, court, judge, purpose, statement, nextHearingDate, attendance } = req.body || {};

    const { rows } = await query(
      `UPDATE case_hearings SET
         hearing_date = COALESCE($3, hearing_date),
         court = COALESCE($4, court),
         judge = COALESCE($5, judge),
         purpose = COALESCE($6, purpose),
         statement = COALESCE($7, statement),
         next_hearing_date = $8,
         prosecutor_present = COALESCE($9, prosecutor_present),
         defense_counsel_present = COALESCE($10, defense_counsel_present),
         accused_present = COALESCE($11, accused_present)
       WHERE hearing_id = $1 AND case_id = $2
       RETURNING hearing_id`,
      [
        hearingId, caseId, date ? new Date(date) : null, court || null, judge || null,
        purpose || null, statement || null, nextHearingDate ? new Date(nextHearingDate) : null,
        attendance?.prosecutor ?? null, attendance?.defenseCounsel ?? null, attendance?.accusedPresent ?? null,
      ]
    );
    if (!rows.length) return res.status(404).json({ message: 'Hearing not found' });

    await recomputeHearingSummary(caseId);

    await auditService.log({
      caseId,
      userId: req.auth.userId,
      userRole: req.auth.role,
      action: 'STATUS_UPDATE',
      source: 'WEB',
      details: { title: 'Hearing record updated' },
    });

    res.json({ hearingId });
  } catch (err) {
    console.error('[Legal Hearing Update Error]', err);
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
