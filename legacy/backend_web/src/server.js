import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { query, getClient } from '../db/index.js';

// ---------------------------------------------------------------------------
// DESIGNATIONS constant (kept from data.js — no DB needed for a static list)
// ---------------------------------------------------------------------------
const DESIGNATIONS = {
  ADMIN:     ['System Administrator', 'IT Director', 'Database Manager'],
  POLICE:    ['Director General of Police (DGP)', 'Addl. Director General (ADGP)',
               'Inspector General (IGP)', 'Superintendent of Police (SP)',
               'Dy. Superintendent (DSP)', 'Inspector of Police',
               'Sub-Inspector (SI)', 'Head Constable', 'Grade I Constable'],
  FORENSICS: ['Director', 'Joint Director', 'Deputy Director', 'Assistant Director',
               'Senior Scientific Officer', 'Junior Scientific Officer', 'Scientific Assistant'],
  LEGAL:     ['High Court Judge', 'District Judge', 'Public Prosecutor',
               'Addl. Public Prosecutor', 'Defense Counsel', 'Registrar'],
};

const app  = express();
const PORT = process.env.PORT || 4000;
const JWT_SECRET = process.env.JWT_SECRET || 'kaaval-dev-secret-change-in-prod';
const JWT_EXPIRY = process.env.JWT_EXPIRY || '7d';

const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN || 'http://localhost:5173';
const EXTRA_ORIGINS   = (process.env.CORS_EXTRA_ORIGINS || '').split(',').map(s => s.trim()).filter(Boolean);
const ALLOWED_ORIGINS = new Set([FRONTEND_ORIGIN, 'http://localhost:3000', ...EXTRA_ORIGINS]);

app.use(cors({
  origin: (origin, cb) => (!origin || ALLOWED_ORIGINS.has(origin)) ? cb(null, true) : cb(new Error(`CORS: ${origin} not allowed`)),
}));
app.use(express.json({ limit: '5mb' }));

// ---------------------------------------------------------------------------
// HELPERS
// ---------------------------------------------------------------------------

/** Strip password_hash before sending user to client */
const sanitizeUser = ({ password_hash, ...rest }) => rest;

/** Deterministic SHA-256 of a sorted-key object — used for audit log integrity */
const hashMetadata = (payload) => {
  const ordered = Object.fromEntries(Object.entries(payload).sort());
  return crypto.createHash('sha256').update(JSON.stringify(ordered)).digest('hex');
};

/** Insert an audit log row */
const logAudit = async ({
  caseId = null, evidenceId = null, action, userId = null,
  userRole = null, userOrg = null, result = 'SUCCESS', source = 'WEB', details = {},
}) => {
  const metadataHash = hashMetadata({
    caseId, evidenceId, action, userId, userRole, userOrg, result, ...details,
  });
  await query(
    `INSERT INTO audit_logs
       (case_id, evidence_id, action, user_id, user_role, user_org, result, source,
        detail_hash, detail_file_name, detail_file_type, detail_file_uri,
        detail_location, detail_title, detail_officer, detail_metadata_hash, metadata_hash)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)`,
    [
      caseId, evidenceId, action, userId, userRole, userOrg, result, source,
      details.hash || null, details.fileName || null, details.fileType || null,
      details.fileUri || null, details.location || null, details.title || null,
      details.officer || null, details.metadataHash || null, metadataHash,
    ]
  );
};

/** Middleware: verify JWT and attach req.user */
const requireAuth = (req, res, next) => {
  const header = req.headers.authorization || '';
  const token  = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ message: 'No token provided' });
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ message: 'Invalid or expired token' });
  }
};

// ---------------------------------------------------------------------------
// HEALTH
// ---------------------------------------------------------------------------
app.get('/health', (req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));

// ---------------------------------------------------------------------------
// AUTH
// ---------------------------------------------------------------------------
app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, email, password } = req.body || {};
    const identifier = (email || username || '').toLowerCase().trim();
    if (!identifier || !password) return res.status(400).json({ message: 'username/email and password required' });

    const { rows } = await query(
      `SELECT * FROM users WHERE (LOWER(username) = $1 OR LOWER(email) = $1) AND is_active = TRUE`,
      [identifier]
    );
    const user = rows[0];
    if (!user) return res.status(401).json({ message: 'Invalid credentials' });

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) return res.status(401).json({ message: 'Invalid credentials' });

    const token = jwt.sign(
      { userId: user.user_id, role: user.role, org: user.org_msp },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRY }
    );

    await logAudit({ userId: user.user_id, userRole: user.role, userOrg: user.org_msp, action: 'LOGIN' });

    res.json({ user: sanitizeUser(user), token });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

app.post('/api/auth/logout', async (req, res) => {
  try {
    const { userId } = req.body || {};
    if (userId) {
      const { rows } = await query(`SELECT role, org_msp FROM users WHERE user_id = $1`, [userId]);
      const u = rows[0];
      if (u) await logAudit({ userId, userRole: u.role, userOrg: u.org_msp, action: 'LOGOUT' });
    }
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// ---------------------------------------------------------------------------
// USERS
// ---------------------------------------------------------------------------
app.get('/api/users', async (req, res) => {
  try {
    const { rows } = await query(
      `SELECT user_id, username, email, name, role, designation, badge_number, org_msp, profile_image_url, is_active, created_at
       FROM users ORDER BY name`
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

app.patch('/api/users/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, designation, role, profileImage, actorId, actorRole } = req.body || {};

    const { rows } = await query(
      `UPDATE users
       SET name = COALESCE($1, name),
           designation = COALESCE($2, designation),
           role = COALESCE($3::user_role, role),
           profile_image_url = COALESCE($4, profile_image_url),
           updated_at = NOW()
       WHERE user_id = $5
       RETURNING user_id, username, email, name, role, designation, badge_number, profile_image_url`,
      [name || null, designation || null, role || null, profileImage || null, id]
    );
    if (!rows.length) return res.status(404).json({ message: 'User not found' });

    await logAudit({
      userId: actorId || id, userRole: actorRole, action: 'UPDATE_USER',
      details: { title: `Updated profile for ${rows[0].name}` },
    });
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// ---------------------------------------------------------------------------
// CASES
// ---------------------------------------------------------------------------
app.get('/api/cases', async (req, res) => {
  try {
    const { rows } = await query(
      `SELECT c.*,
              cu.name  AS created_by_name,
              cc.name  AS custodian_name,
              fa.name  AS forensics_name
       FROM cases c
       LEFT JOIN users cu ON c.created_by_user_id = cu.user_id
       LEFT JOIN users cc ON c.current_custodian_id = cc.user_id
       LEFT JOIN users fa ON c.assigned_forensics_id = fa.user_id
       WHERE c.is_deleted = FALSE
       ORDER BY c.created_at DESC`
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

app.get('/api/cases/:caseId', async (req, res) => {
  try {
    const { rows } = await query(
      `SELECT c.*,
              cu.name AS created_by_name,
              cc.name AS custodian_name
       FROM cases c
       LEFT JOIN users cu ON c.created_by_user_id = cu.user_id
       LEFT JOIN users cc ON c.current_custodian_id = cc.user_id
       WHERE c.case_id = $1 AND c.is_deleted = FALSE`,
      [req.params.caseId]
    );
    if (!rows.length) return res.status(404).json({ message: 'Case not found' });
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

app.post('/api/cases', async (req, res) => {
  try {
    const {
      caseId, title, description, status, currentCustodian, createdBy,
      assignedToForensics, actorId, actorRole,
    } = req.body || {};

    const id = caseId || `CASE-${new Date().getFullYear()}-${Date.now().toString().slice(-6)}`;
    const { rows } = await query(
      `INSERT INTO cases
         (case_id, title, description, status, created_by_user_id,
          current_custodian_id, current_custodian_name, assigned_forensics_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
       RETURNING *`,
      [
        id, title || 'Untitled Case', description || '', status || 'OPEN',
        createdBy || actorId || null,
        currentCustodian || createdBy || actorId || null,
        null, /* name resolved via join on read */
        assignedToForensics || null,
      ]
    );

    await logAudit({
      caseId: id, userId: actorId || createdBy, userRole: actorRole,
      action: 'CREATE_CASE',
      details: { title: rows[0].title },
    });
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

app.patch('/api/cases/:caseId/status', async (req, res) => {
  try {
    const { caseId } = req.params;
    const { status, actorId, actorRole } = req.body || {};
    const { rows } = await query(
      `UPDATE cases SET status = $1::case_status, updated_at = NOW(), version = version + 1
       WHERE case_id = $2 AND is_deleted = FALSE RETURNING *`,
      [status, caseId]
    );
    if (!rows.length) return res.status(404).json({ message: 'Case not found' });
    await logAudit({ caseId, userId: actorId, userRole: actorRole, action: 'APPROVE', details: { title: `Status → ${status}` } });
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

app.post('/api/cases/:caseId/transfer-custody', async (req, res) => {
  try {
    const { caseId } = req.params;
    const { newCustodianId, newCustodianRole, notes, actorId, actorRole } = req.body || {};

    // Resolve custodian name
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
      await dbClient.query('COMMIT');
    } catch (e) {
      await dbClient.query('ROLLBACK');
      throw e;
    } finally {
      dbClient.release();
    }

    await logAudit({
      caseId, userId: actorId, userRole: actorRole, action: 'TRANSFER_CUSTODY',
      details: { officer: custodianName, title: notes || '' },
    });
    const { rows } = await query(`SELECT * FROM cases WHERE case_id = $1`, [caseId]);
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// ---------------------------------------------------------------------------
// EVIDENCE
// ---------------------------------------------------------------------------
app.get('/api/evidence', async (req, res) => {
  try {
    const { caseId } = req.query;
    const caseFilter = caseId ? 'AND e.case_id = $1' : '';
    const params = caseId ? [caseId] : [];

    const { rows } = await query(
      `SELECT e.*,
              ev.is_restricted, ev.allowed_roles, ev.allowed_designations, ev.allowed_user_ids,
              u.name AS uploaded_by_name,
              c.name AS custodian_display_name
       FROM evidence e
       LEFT JOIN evidence_visibility ev ON e.evidence_id = ev.evidence_id
       LEFT JOIN users u ON e.uploaded_by = u.user_id
       LEFT JOIN users c ON e.current_custodian_id = c.user_id
       WHERE e.is_deleted = FALSE ${caseFilter}
       ORDER BY e.created_at DESC`,
      params
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

app.post('/api/evidence', async (req, res) => {
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

    // Deterministic metadata hash
    let computedMetaHash = metadataHash;
    if (!computedMetaHash) {
      const metaPayload = {
        caseId,
        evidenceId: id,
        name: name || fileName || id,
        type: resolvedType,
        location: location || 'Crime Scene',
        submittedBy: uploadedBy || actorId || 'Unknown',
        fileHash: fileHash || '',
        sourceHash: sourceHash || fileHash || '',
      };
      const ordered = Object.fromEntries(
        Object.entries(metaPayload)
          .filter(([_, v]) => v !== undefined && v !== null)
          .sort(([a], [b]) => a.localeCompare(b))
      );
      computedMetaHash = crypto.createHash('sha256').update(JSON.stringify(ordered)).digest('hex');
    }

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
          ownerMsp || 'Org1MSP',
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

      // Insert default or provided visibility
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

      await logAudit({
        caseId,
        evidenceId: id,
        userId: actorId || uploadedBy,
        userRole: actorRole || role,
        action: 'UPLOAD',
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
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

app.patch('/api/evidence/:id/verify', async (req, res) => {
  try {
    const { id } = req.params;
    const { actorId, actorRole } = req.body || {};
    const { rows: existing } = await query(`SELECT * FROM evidence WHERE evidence_id = $1`, [id]);
    if (!existing.length) return res.status(404).json({ message: 'Evidence not found' });

    const current = existing[0];
    const newStatus = current.integrity_status === 'COMPROMISED' ? 'COMPROMISED' : 'VERIFIED';

    const { rows } = await query(
      `UPDATE evidence SET integrity_status = $1::integrity_status, last_verified_at = NOW(), updated_at = NOW()
       WHERE evidence_id = $2 RETURNING *`,
      [newStatus, id]
    );
    await logAudit({ caseId: current.case_id, evidenceId: id, userId: actorId, userRole: actorRole, action: 'VERIFY', result: newStatus });
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

app.patch('/api/evidence/:id/approve', async (req, res) => {
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
    await logAudit({ caseId: ev.case_id, evidenceId: id, userId: actorId, userRole: actorRole, action: 'APPROVE' });
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

app.patch('/api/evidence/:id/visibility', async (req, res) => {
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
    await logAudit({
      caseId: ev[0]?.case_id, evidenceId: id, userId: actorId, userRole: actorRole,
      action: 'VISIBILITY_UPDATE',
      details: { title: visibility?.isRestricted ? 'Restricted' : 'Public' },
    });
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

app.post('/api/evidence/:id/section63', async (req, res) => {
  try {
    const { id } = req.params;
    const { certificateRef, actorId, actorRole } = req.body || {};

    const { rows: evRows } = await query(`SELECT * FROM evidence WHERE evidence_id = $1`, [id]);
    if (!evRows.length) return res.status(404).json({ message: 'Evidence not found' });
    const ev = evRows[0];

    // Get issuing user's designation
    const { rows: uRows } = await query(`SELECT designation FROM users WHERE user_id = $1`, [actorId]);
    const designation = uRows[0]?.designation || '';

    const dbClient = await getClient();
    let cert;
    try {
      await dbClient.query('BEGIN');
      const { rows: certRows } = await dbClient.query(
        `INSERT INTO section63_certificates
           (certificate_ref, evidence_id, case_id, issued_by_user_id, certifying_designation,
            hash_algorithm, verified_hash)
         VALUES ($1,$2,$3,$4,$5,'SHA-256',$6)
         ON CONFLICT (certificate_ref) DO UPDATE SET issued_at = NOW()
         RETURNING *`,
        [certificateRef, id, ev.case_id, actorId, designation, ev.file_hash]
      );
      cert = certRows[0];

      await dbClient.query(
        `UPDATE evidence SET section63_cert_id = $1, updated_at = NOW() WHERE evidence_id = $2`,
        [cert.certificate_id, id]
      );
      await dbClient.query('COMMIT');
    } catch (e) {
      await dbClient.query('ROLLBACK');
      throw e;
    } finally {
      dbClient.release();
    }

    await logAudit({
      caseId: ev.case_id, evidenceId: id, userId: actorId, userRole: actorRole,
      action: 'ISSUE_CERT', details: { title: certificateRef },
    });
    res.json(cert);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// ---------------------------------------------------------------------------
// DOCUMENTS
// ---------------------------------------------------------------------------
app.get('/api/documents', async (req, res) => {
  try {
    const { caseId } = req.query;
    const { rows } = caseId
      ? await query(`SELECT * FROM case_documents WHERE case_id = $1 ORDER BY created_at DESC`, [caseId])
      : await query(`SELECT * FROM case_documents ORDER BY created_at DESC`);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

app.post('/api/documents', async (req, res) => {
  try {
    const { caseId, title, type, description, uploadedBy, linkedEvidenceIds, actorId, actorRole } = req.body || {};
    const { rows } = await query(
      `INSERT INTO case_documents (case_id, title, type, description, uploaded_by, linked_evidence_ids)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [caseId, title || 'Untitled', type || 'FIR', description || null,
       uploadedBy || actorId || null, JSON.stringify(linkedEvidenceIds || [])]
    );
    await logAudit({ caseId, userId: actorId || uploadedBy, userRole: actorRole, action: 'CREATE_DOC', details: { title } });
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// ---------------------------------------------------------------------------
// AUDIT LOGS
// ---------------------------------------------------------------------------
app.get('/api/logs', async (req, res) => {
  try {
    const limit  = Math.min(parseInt(req.query.limit) || 200, 1000);
    const caseId = req.query.caseId;
    const evidenceId = req.query.evidenceId;

    let sql = `SELECT l.*, u.name AS user_name FROM audit_logs l LEFT JOIN users u ON l.user_id = u.user_id WHERE 1=1`;
    const params = [];
    if (caseId)     { params.push(caseId);     sql += ` AND l.case_id = $${params.length}`; }
    if (evidenceId) { params.push(evidenceId);  sql += ` AND l.evidence_id = $${params.length}`; }
    params.push(limit);
    sql += ` ORDER BY l.timestamp DESC LIMIT $${params.length}`;

    const { rows } = await query(sql, params);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

app.post('/api/logs', async (req, res) => {
  try {
    const { caseId, evidenceId, action, accessedBy, role, details, result } = req.body || {};
    await logAudit({ caseId, evidenceId, action, userId: accessedBy, userRole: role, result, details: { title: details } });
    res.status(201).json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// ---------------------------------------------------------------------------
// DESIGNATIONS (static constant — no DB query needed)
// ---------------------------------------------------------------------------
app.get('/api/designations', (req, res) => res.json(DESIGNATIONS));

// ---------------------------------------------------------------------------
// ERROR HANDLER
// ---------------------------------------------------------------------------
app.use((err, req, res, _next) => {
  console.error(err);
  res.status(500).json({ message: 'Unexpected server error' });
});

// ---------------------------------------------------------------------------
// START
// ---------------------------------------------------------------------------
app.listen(PORT, () => console.log(`backend_web listening on port ${PORT}`));
