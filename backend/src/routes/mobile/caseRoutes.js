import express from 'express';
import { query } from '../../db/index.js';
import { auditService } from '../../services/auditService.js';
import { storageService } from '../../services/storageService.js';
import { config } from '../../config/index.js';

const router = express.Router();

// List all active cases with embedded evidence (for mobile SQLite caching)
router.get('/', async (req, res) => {
  try {
    const { rows: cases } = await query(
      `SELECT c.*,
              cu.name AS created_by_name,
              cc.name AS custodian_name
       FROM cases c
       LEFT JOIN users cu ON c.created_by_user_id = cu.user_id
       LEFT JOIN users cc ON c.current_custodian_id = cc.user_id
       WHERE c.is_deleted = FALSE
       ORDER BY c.created_at DESC`
    );

    const { rows: allEvidence } = await query(
      `SELECT * FROM evidence WHERE is_deleted = FALSE ORDER BY created_at ASC`
    );

    // Attach pre-signed URLs to evidence items
    const evidenceWithUrls = await Promise.all(
      allEvidence.map(async (ev) => {
        let presignedUrl = ev.file_url;
        if (ev.file_url && ev.file_url.startsWith('minio://')) {
          const key = ev.file_url.replace('minio://', '');
          presignedUrl = await storageService.getPresignedUrl(key).catch(() => ev.file_url);
        }
        return {
          ...ev,
          id: ev.evidence_id,
          hash: ev.file_hash,
          uri: presignedUrl,
        };
      })
    );

    const evidenceByCase = {};
    for (const ev of evidenceWithUrls) {
      if (!evidenceByCase[ev.case_id]) evidenceByCase[ev.case_id] = [];
      evidenceByCase[ev.case_id].push(ev);
    }

    const result = cases.map(c => ({
      ...c,
      id: c.case_id,
      caseId: c.case_id,
      evidence: evidenceByCase[c.case_id] || [],
    }));

    res.json(result);
  } catch (err) {
    console.error('[MobileCases Error]', err);
    res.status(500).json({ error: err.message });
  }
});

// Get single case
router.get('/:id', async (req, res) => {
  try {
    const { rows } = await query(
      `SELECT * FROM cases WHERE case_id = $1 AND is_deleted = FALSE`,
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Case not found' });

    const { rows: evidence } = await query(
      `SELECT * FROM evidence WHERE case_id = $1 AND is_deleted = FALSE ORDER BY created_at ASC`,
      [req.params.id]
    );

    const evidenceWithUrls = await Promise.all(
      evidence.map(async (ev) => {
        let presignedUrl = ev.file_url;
        if (ev.file_url && ev.file_url.startsWith('minio://')) {
          const key = ev.file_url.replace('minio://', '');
          presignedUrl = await storageService.getPresignedUrl(key).catch(() => ev.file_url);
        }
        return { ...ev, id: ev.evidence_id, hash: ev.file_hash, uri: presignedUrl };
      })
    );

    res.json({
      ...rows[0],
      id: rows[0].case_id,
      caseId: rows[0].case_id,
      evidence: evidenceWithUrls,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create case in the field
router.post('/', async (req, res) => {
  try {
    const caseId = req.body.caseId || req.body.case_id || req.body.id;
    const title = req.body.title;
    const description = req.body.description || '';
    const officer = req.body.officer || req.body.current_custodian_name || 'Field Officer';
    const status = req.body.status || 'OPEN';
    const location = req.body.location || 'Crime Scene';
    const timestamp = req.body.timestamp || req.body.created_at;
    const userId = req.body.userId || req.body.created_by_user_id || null;
    const blockchainHash = req.body.blockchainHash || req.body.blockchain_hash || 'pending';

    if (!caseId || !title) {
      return res.status(400).json({ error: 'caseId and title are required' });
    }

    const { rows: existing } = await query(`SELECT case_id FROM cases WHERE case_id = $1`, [caseId]);
    if (existing.length) {
      return res.status(409).json({ error: 'Case already exists' });
    }

    // Resolve the reporting officer's role/org from the verified user record
    // rather than trusting client-supplied strings (the mobile client sends
    // userOrg:'POLICE', which isn't a real MSP ID). Also validates the session
    // up front so a stale/invalid cached login fails clearly instead of
    // crashing on a foreign key constraint further down.
    let userRole = 'POLICE';
    let userOrg = config.fabric.orgs.police.mspId;
    if (userId) {
      const { rows: userRows } = await query('SELECT role, org_msp FROM users WHERE user_id = $1', [userId]);
      if (!userRows.length) {
        return res.status(401).json({ error: 'Unrecognized user session — please sign out and log in again.' });
      }
      userRole = userRows[0].role;
      userOrg = userRows[0].org_msp || userOrg;
    }

    const { rows } = await query(
      `INSERT INTO cases
         (case_id, title, description, status, location, incident_timestamp,
          created_by_user_id, current_custodian_id, current_custodian_name,
          blockchain_hash, created_at, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$7,$8,$9,$10,$10)
       RETURNING *`,
      [
        caseId,
        title,
        description,
        status,
        location,
        timestamp ? new Date(timestamp) : null,
        userId,
        officer,
        blockchainHash,
        timestamp ? new Date(timestamp) : new Date(),
      ]
    );

    await auditService.log({
      caseId,
      userId,
      userRole,
      userOrg,
      action: 'CREATE_CASE',
      source: 'MOBILE',
      details: { title, officer, location },
    });

    res.status(201).json({ ...rows[0], id: rows[0].case_id, evidence: [] });
  } catch (err) {
    console.error('[MobileCreateCase Error]', err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
