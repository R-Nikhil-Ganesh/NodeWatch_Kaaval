'use strict';

require('dotenv').config();

const express  = require('express');
const cors     = require('cors');
const multer   = require('multer');
const { Gateway, Wallets } = require('fabric-network');
const path     = require('path');
const fs       = require('fs');
const crypto   = require('crypto');
const bcrypt   = require('bcryptjs');
const jwt      = require('jsonwebtoken');
const db       = require('./db/index');

const fsp = fs.promises;
const FILE_STORAGE_ROOT = path.join(__dirname, 'file_storage');
const JWT_SECRET = process.env.JWT_SECRET || 'kaaval-dev-secret-replace-in-production';

// Feature flags for Fabric integration
const FABRIC_DISABLED          = process.env.FABRIC_DISABLED === 'true';
const FABRIC_DISCOVERY_ENABLED = process.env.FABRIC_DISCOVERY_ENABLED !== 'false';
const FABRIC_AS_LOCALHOST      = process.env.FABRIC_AS_LOCALHOST !== 'false';

const app = express();

const FRONTEND_ORIGIN  = process.env.FRONTEND_ORIGIN || 'http://localhost:5173,http://localhost:3000';
const allowedOrigins   = FRONTEND_ORIGIN.split(',').map(o => o.trim()).filter(Boolean);

app.use(cors({
  origin: (origin, cb) =>
    (!origin || allowedOrigins.includes(origin)) ? cb(null, true) : cb(new Error(`CORS: ${origin} blocked`)),
}));
app.use(express.json());
app.use('/files', express.static(FILE_STORAGE_ROOT));

// ─── FILE STORAGE ────────────────────────────────────────────────────────────

const sanitizeCaseName = (name) => name.replace(/[^a-z0-9]/gi, '_');

const ensureStorageDir = async () => {
  await fsp.mkdir(FILE_STORAGE_ROOT, { recursive: true });
};

// SHA-256 stream hash of a file on disk
const calculateFileHash = (filePath) => new Promise((resolve, reject) => {
  const hash   = crypto.createHash('sha256');
  const stream = fs.createReadStream(filePath);
  stream.on('error', reject);
  stream.on('data', chunk => hash.update(chunk));
  stream.on('end',  () => resolve(hash.digest('hex')));
});

// Deterministic SHA-256 of a sorted-key object (for metadata + audit hashes)
const hashMetadata = (payload) => {
  const ordered = Object.fromEntries(Object.entries(payload).sort());
  return crypto.createHash('sha256').update(JSON.stringify(ordered)).digest('hex');
};

// ─── AUDIT LOGGER (writes to shared PostgreSQL audit_logs table) ──────────────

const logAudit = async ({
  caseId = null, evidenceId = null, action, userId = null,
  userRole = null, userOrg = null, result = 'SUCCESS', source = 'MOBILE', details = {},
}) => {
  const metadataHash = hashMetadata({
    caseId, evidenceId, action, userId, userRole, userOrg, result, ...details,
  });
  try {
    await db.query(
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
  } catch (e) {
    console.error('[audit] Failed to log:', e.message);
  }
};

// ─── MULTER FILE STORAGE ──────────────────────────────────────────────────────

const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    try {
      const caseId  = req.params.id || req.body.caseId;
      if (!caseId) return cb(new Error('caseId is required'), null);
      const dir = path.join(FILE_STORAGE_ROOT, sanitizeCaseName(caseId));
      await fsp.mkdir(dir, { recursive: true });
      cb(null, dir);
    } catch (err) { cb(err, null); }
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || '.bin';
    cb(null, `evidence_${Date.now()}${ext}`);
  },
});
const upload = multer({ storage });

// ─── FABRIC CONNECTION ────────────────────────────────────────────────────────

async function connectToNetwork() {
  const ccpPath    = path.resolve(__dirname, 'connection-org1-with-org2.json');
  const ccp        = JSON.parse(fs.readFileSync(ccpPath, 'utf8'));
  const walletPath = path.join(process.cwd(), 'wallet');
  const wallet     = await Wallets.newFileSystemWallet(walletPath);
  const gateway    = new Gateway();
  await gateway.connect(ccp, {
    wallet,
    identity: 'appUser',
    discovery: { enabled: FABRIC_DISCOVERY_ENABLED, asLocalhost: FABRIC_AS_LOCALHOST },
  });
  const network  = await gateway.getNetwork('mychannel');
  const contract = network.getContract('evidence');
  return { gateway, contract };
}

const JWT_EXPIRY = process.env.JWT_EXPIRY || '7d';

/** Strip password_hash before sending user to client */
const sanitizeUser = ({ password_hash, ...rest }) => rest;

// ─── AUTH MIDDLEWARE ──────────────────────────────────────────────────────────

const requireAuth = (req, res, next) => {
  const header = req.headers.authorization || '';
  const token  = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'No token provided' });
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
};

// ─── ROUTES: AUTH ─────────────────────────────────────────────────────────────

app.post(['/api/auth/login', '/auth/login'], async (req, res) => {
  try {
    const { username, email, password } = req.body || {};
    const identifier = (email || username || '').toLowerCase().trim();
    if (!identifier || !password) {
      return res.status(400).json({ message: 'username/email and password required', error: 'username/email and password required' });
    }

    const { rows } = await db.query(
      `SELECT * FROM users WHERE (LOWER(username) = $1 OR LOWER(email) = $1) AND is_active = TRUE`,
      [identifier]
    );
    const user = rows[0];
    if (!user) return res.status(401).json({ message: 'Invalid credentials', error: 'Invalid credentials' });

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) return res.status(401).json({ message: 'Invalid credentials', error: 'Invalid credentials' });

    const token = jwt.sign(
      { userId: user.user_id, role: user.role, org: user.org_msp },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRY }
    );

    await logAudit({ userId: user.user_id, userRole: user.role, userOrg: user.org_msp, action: 'LOGIN', source: 'MOBILE' });

    res.json({ user: sanitizeUser(user), token });
  } catch (err) {
    console.error('[Auth Error]', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

app.post(['/api/auth/logout', '/auth/logout'], async (req, res) => {
  try {
    const { userId } = req.body || {};
    if (userId) {
      const { rows } = await db.query(`SELECT role, org_msp FROM users WHERE user_id = $1`, [userId]);
      const u = rows[0];
      if (u) await logAudit({ userId, userRole: u.role, userOrg: u.org_msp, action: 'LOGOUT', source: 'MOBILE' });
    }
    res.json({ ok: true });
  } catch (err) {
    console.error('[Logout Error]', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// List users (for mobile selection/display)
app.get(['/api/users', '/users'], async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT user_id, username, email, name, role, designation, badge_number, org_msp, profile_image_url, is_active, created_at
       FROM users ORDER BY name`
    );
    res.json(rows);
  } catch (err) {
    console.error('[Users Error]', err);
    res.status(500).json({ error: err.message });
  }
});

// ─── ROUTES: CASES ────────────────────────────────────────────────────────────

// List all cases (with embedded evidence array for mobile compatibility)
app.get('/cases', async (req, res) => {
  try {
    const { rows: cases } = await db.query(
      `SELECT c.*,
              cu.name AS created_by_name,
              cc.name AS custodian_name
       FROM cases c
       LEFT JOIN users cu ON c.created_by_user_id = cu.user_id
       LEFT JOIN users cc ON c.current_custodian_id = cc.user_id
       WHERE c.is_deleted = FALSE
       ORDER BY c.created_at DESC`
    );

    // Attach evidence[] to each case (mobile app expects embedded array)
    const { rows: allEvidence } = await db.query(
      `SELECT * FROM evidence WHERE is_deleted = FALSE ORDER BY created_at ASC`
    );
    const evidenceByCase = {};
    for (const ev of allEvidence) {
      if (!evidenceByCase[ev.case_id]) evidenceByCase[ev.case_id] = [];
      evidenceByCase[ev.case_id].push(ev);
    }

    const result = cases.map(c => ({ ...c, evidence: evidenceByCase[c.case_id] || [] }));
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// Get single case
app.get('/cases/:id', async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT * FROM cases WHERE case_id = $1 AND is_deleted = FALSE`,
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Case not found' });

    const { rows: evidence } = await db.query(
      `SELECT * FROM evidence WHERE case_id = $1 AND is_deleted = FALSE ORDER BY created_at ASC`,
      [req.params.id]
    );
    res.json({ ...rows[0], evidence });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// Create case
app.post('/cases', async (req, res) => {
  try {
    const caseId = req.body.caseId || req.body.case_id;
    const title  = req.body.title;
    const description = req.body.description || '';
    const officer = req.body.officer || req.body.current_custodian_name || req.body.custodian_name || null;
    const status = req.body.status || 'OPEN';
    const location = req.body.location || 'Unspecified';
    const timestamp = req.body.timestamp || req.body.incident_timestamp || req.body.created_at;
    const userId = req.body.userId || req.body.created_by_user_id || null;
    const userRole = req.body.userRole || null;
    const userOrg = req.body.userOrg || null;
    const blockchainHash = req.body.blockchainHash || req.body.blockchain_hash || 'pending';

    if (!caseId || !title) return res.status(400).json({ error: 'caseId and title are required' });

    const { rows: existing } = await db.query(`SELECT case_id FROM cases WHERE case_id = $1`, [caseId]);
    if (existing.length) return res.status(409).json({ error: 'Case already exists' });

    const { rows } = await db.query(
      `INSERT INTO cases
         (case_id, title, description, status, location, incident_timestamp,
          created_by_user_id, current_custodian_id, current_custodian_name,
          blockchain_hash, created_at, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$7,$8,$9,$10,$10)
       RETURNING *`,
      [
        caseId, title, description, status,
        location,
        timestamp ? new Date(timestamp) : null,
        userId,
        officer,
        blockchainHash,
        timestamp ? new Date(timestamp) : new Date(),
      ]
    );

    await logAudit({ caseId, userId, userRole, userOrg, action: 'CREATE_CASE', details: { title, officer, location } });
    res.status(201).json({ ...rows[0], evidence: [] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// ─── ROUTES: EVIDENCE (mobile file upload) ────────────────────────────────────

// Upload a file + evidence metadata for a case
app.post('/cases/:id/evidence', upload.single('file'), async (req, res) => {
  try {
    const caseId = req.params.id;
    const { rows: caseRows } = await db.query(`SELECT case_id FROM cases WHERE case_id = $1`, [caseId]);
    if (!caseRows.length) return res.status(404).json({ error: 'Case not found' });
    if (!req.file)        return res.status(400).json({ error: 'file is required' });

    const fileUrl  = `${req.protocol}://${req.get('host')}/files/${sanitizeCaseName(caseId)}/${req.file.filename}`;
    const fileHash = await calculateFileHash(req.file.path);

    const evidenceId = `ev-${Date.now()}`;
    const metaPayload = {
      caseId, id: evidenceId,
      name:      req.body.name || req.file.originalname || 'evidence',
      type:      (req.body.type || 'image').toUpperCase(),
      uri:       fileUrl,
      timestamp: req.body.timestamp || new Date().toISOString(),
      location:  req.body.location || '',
      submittedBy: req.body.submittedBy || req.body.userId || 'Unknown',
    };
    const metadataHash = hashMetadata(metaPayload);

    const { rows } = await db.query(
      `INSERT INTO evidence
         (evidence_id, case_id, name, file_name, type, file_url, file_hash, metadata_hash,
          uploaded_by, current_custodian_id, owner_msp,
          collected_location, collected_timestamp, created_at, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$9,$10,$11,$12,$13,$13)
       RETURNING *`,
      [
        evidenceId, caseId,
        metaPayload.name, req.file.filename,
        metaPayload.type, fileUrl, fileHash, metadataHash,
        req.body.userId || null,
        'Org1MSP',
        metaPayload.location,
        metaPayload.timestamp ? new Date(metaPayload.timestamp) : new Date(),
        new Date(),
      ]
    );

    // Default open visibility
    await db.query(
      `INSERT INTO evidence_visibility (evidence_id) VALUES ($1) ON CONFLICT DO NOTHING`,
      [evidenceId]
    );

    await logAudit({
      caseId, evidenceId, userId: req.body.userId, userRole: req.body.userRole, userOrg: req.body.userOrg,
      action: 'UPLOAD',
      details: {
        hash: fileHash.substring(0, 12) + '...',
        fileName: metaPayload.name, fileType: metaPayload.type,
        fileUri: fileUrl, location: metaPayload.location, metadataHash,
      },
    });

    res.status(201).json({ case: { case_id: caseId }, evidence: rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// Verify a stored evidence file's hash against its on-disk bytes
app.post('/cases/:caseId/evidence/:evidenceId/verify', async (req, res) => {
  try {
    const { caseId, evidenceId } = req.params;
    const { rows } = await db.query(
      `SELECT * FROM evidence WHERE evidence_id = $1 AND case_id = $2`,
      [evidenceId, caseId]
    );
    if (!rows.length) return res.status(404).json({ error: 'Evidence not found' });

    const ev          = rows[0];
    // Reconstruct local file path from stored URL
    const urlParts    = ev.file_url.split('/files/');
    const relPath     = urlParts[1] || '';
    const filePath    = path.join(FILE_STORAGE_ROOT, relPath);
    const currentHash = await calculateFileHash(filePath);
    const matched     = ev.file_hash === currentHash;
    const newStatus   = matched ? 'VERIFIED' : 'COMPROMISED';

    await db.query(
      `UPDATE evidence SET integrity_status = $1::integrity_status, last_verified_at = NOW(), updated_at = NOW()
       WHERE evidence_id = $2`,
      [newStatus, evidenceId]
    );

    await logAudit({
      caseId, evidenceId, userId: req.body.userId, userRole: req.body.userRole, userOrg: req.body.userOrg,
      action: 'VERIFY_HASH', result: matched ? 'MATCH' : 'MISMATCH',
      details: { hash: currentHash.substring(0, 12) + '...', fileName: ev.file_name, fileType: ev.type },
    });

    res.json({ caseId, evidenceId, matched, integrityStatus: newStatus, hash: currentHash, previousHash: ev.file_hash });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// ─── ROUTES: FABRIC CHAINCODE ENDPOINTS ──────────────────────────────────────

app.post('/evidence', async (req, res) => {
  try {
    if (FABRIC_DISABLED) return res.status(503).json({ error: 'Fabric disabled' });
    const { evidenceID, caseID, fileHash, metaHash, riskLevel } = req.body;
    const { gateway, contract } = await connectToNetwork();
    await contract.submitTransaction('CreateEvidence', evidenceID, caseID, fileHash, metaHash, riskLevel);
    await gateway.disconnect();
    res.json({ message: 'Evidence created on chain', evidenceID });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/evidence/:id', async (req, res) => {
  try {
    if (FABRIC_DISABLED) return res.status(503).json({ error: 'Fabric disabled' });
    const { gateway, contract } = await connectToNetwork();
    const result = await contract.submitTransaction('ReadEvidence', req.params.id);
    await gateway.disconnect();
    res.json(result ? JSON.parse(result.toString()) : null);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/evidence', async (req, res) => {
  try {
    if (FABRIC_DISABLED || req.query.source === 'local') {
      const { rows } = await db.query(`SELECT * FROM evidence WHERE is_deleted = FALSE ORDER BY created_at DESC`);
      return res.json(rows);
    }
    const { gateway, contract } = await connectToNetwork();
    const result = await contract.evaluateTransaction('QueryAllEvidence');
    await gateway.disconnect();
    const payload = result ? JSON.parse(result.toString()) : [];
    if (!payload.length && req.get('X-Source') === 'local') {
      const { rows } = await db.query(`SELECT * FROM evidence WHERE is_deleted = FALSE`);
      return res.json(rows);
    }
    res.json(payload);
  } catch (err) { console.error(err); res.status(500).json({ error: err.message }); }
});

app.get('/evidence/history/:id', async (req, res) => {
  try {
    if (FABRIC_DISABLED) return res.status(503).json({ error: 'Fabric disabled' });
    const { gateway, contract } = await connectToNetwork();
    const result = await contract.evaluateTransaction('GetEvidenceHistory', req.params.id);
    await gateway.disconnect();
    res.json(result ? JSON.parse(result.toString()) : []);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/case/:id', async (req, res) => {
  try {
    if (FABRIC_DISABLED) return res.status(503).json({ error: 'Fabric disabled' });
    const { gateway, contract } = await connectToNetwork();
    const result = await contract.evaluateTransaction('QueryByCaseID', req.params.id);
    await gateway.disconnect();
    res.json(result ? JSON.parse(result.toString()) : []);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/transfer/request', async (req, res) => {
  try {
    if (FABRIC_DISABLED) return res.status(503).json({ error: 'Fabric disabled' });
    const { evidenceID, targetMSP } = req.body;
    const { gateway, contract } = await connectToNetwork();
    await contract.submitTransaction('RequestTransfer', evidenceID, targetMSP);
    await gateway.disconnect();
    res.json({ message: 'Transfer requested' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/transfer/accept', async (req, res) => {
  try {
    if (FABRIC_DISABLED) return res.status(503).json({ error: 'Fabric disabled' });
    const { evidenceID } = req.body;
    const { gateway, contract } = await connectToNetwork();
    await contract.submitTransaction('AcceptTransfer', evidenceID);
    await gateway.disconnect();
    res.json({ message: 'Transfer accepted' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─── ROUTES: AUDIT LOGS ───────────────────────────────────────────────────────

app.get('/audit/logs', async (req, res) => {
  try {
    const { caseId, evidenceId, action, userId, limit } = req.query;
    let sql = `SELECT * FROM audit_logs WHERE 1=1`;
    const params = [];
    if (caseId)     { params.push(caseId);     sql += ` AND case_id = $${params.length}`; }
    if (evidenceId) { params.push(evidenceId);  sql += ` AND evidence_id = $${params.length}`; }
    if (action)     { params.push(action);      sql += ` AND action = $${params.length}`; }
    if (userId)     { params.push(userId);      sql += ` AND user_id = $${params.length}`; }
    params.push(parseInt(limit) || 200);
    sql += ` ORDER BY timestamp DESC LIMIT $${params.length}`;
    const { rows } = await db.query(sql, params);
    res.json(rows);
  } catch (err) { console.error(err); res.status(500).json({ error: err.message }); }
});

app.get('/audit/logs/case/:caseId',      async (req, res) => {
  try {
    const { rows } = await db.query(`SELECT * FROM audit_logs WHERE case_id = $1 ORDER BY timestamp DESC`, [req.params.caseId]);
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/audit/logs/evidence/:evidenceId', async (req, res) => {
  try {
    const { rows } = await db.query(`SELECT * FROM audit_logs WHERE evidence_id = $1 ORDER BY timestamp DESC`, [req.params.evidenceId]);
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─── ROUTES: HEALTH ───────────────────────────────────────────────────────────

app.get('/health', async (req, res) => {
  try {
    await db.query('SELECT 1');
    res.json({ status: 'ok', db: 'connected', timestamp: new Date().toISOString() });
  } catch (err) {
    res.status(500).json({ status: 'error', db: 'disconnected', error: err.message });
  }
});

app.get('/health/fabric', async (req, res) => {
  if (FABRIC_DISABLED) return res.json({ connected: false, disabled: true });
  try {
    const { gateway, contract } = await connectToNetwork();
    await contract.evaluateTransaction('QueryAllEvidence');
    await gateway.disconnect();
    res.json({ connected: true, discovery: FABRIC_DISCOVERY_ENABLED, asLocalhost: FABRIC_AS_LOCALHOST });
  } catch (err) {
    res.json({ connected: false, error: err.message });
  }
});

app.get('/network/endorsement-policy', (req, res) => {
  try {
    const ccpPath = path.resolve(__dirname, 'connection-org1-with-org2.json');
    const ccp     = JSON.parse(fs.readFileSync(ccpPath, 'utf8'));
    res.json({
      message: 'Dual-org endorsement enabled',
      endorsementMode: 'BOTH_ORG1_AND_ORG2_REQUIRED',
      organizations: Object.keys(ccp.organizations || {}),
      configuredPeers: Object.keys(ccp.peers || {}),
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─── ROUTES: MOBILE SYNC ─────────────────────────────────────────────────────

/**
 * GET /api/sync/pull?since=<ISO8601>
 * Returns all cases + evidence updated after `since` for the calling officer.
 * Mobile uses this for delta sync on reconnect.
 */
app.get('/api/sync/pull', async (req, res) => {
  try {
    const since = req.query.since ? new Date(req.query.since) : new Date(0);
    const { rows: cases } = await db.query(
      `SELECT * FROM cases WHERE updated_at > $1 AND is_deleted = FALSE ORDER BY updated_at ASC`,
      [since]
    );
    const { rows: evidence } = await db.query(
      `SELECT * FROM evidence WHERE updated_at > $1 AND is_deleted = FALSE ORDER BY updated_at ASC`,
      [since]
    );
    res.json({ cases, evidence, syncedAt: new Date().toISOString() });
  } catch (err) { console.error(err); res.status(500).json({ error: err.message }); }
});

/**
 * POST /api/sync/push
 * Accepts batched mutations from the mobile offline queue.
 * Body: { mutations: [{ entityType, entityId, actionType, payload }] }
 */
app.post('/api/sync/push', async (req, res) => {
  const { mutations = [] } = req.body || {};
  const results = [];

  for (const m of mutations) {
    try {
      if (m.entityType === 'CASE' && m.actionType === 'CREATE') {
        const p = m.payload || {};
        const caseId = p.case_id || p.caseId || m.entityId;
        const title = p.title || 'Untitled Case';
        const description = p.description || '';
        const status = p.status || 'OPEN';
        const location = p.location || '';
        const userId = p.created_by_user_id || p.userId || null;
        const hash = p.blockchain_hash || p.blockchainHash || 'pending';

        await db.query(
          `INSERT INTO cases (case_id, title, description, status, location, created_by_user_id, blockchain_hash)
           VALUES ($1,$2,$3,$4,$5,$6,$7) ON CONFLICT (case_id) DO UPDATE SET
             title = EXCLUDED.title,
             description = EXCLUDED.description,
             status = EXCLUDED.status,
             location = EXCLUDED.location,
             blockchain_hash = EXCLUDED.blockchain_hash,
             updated_at = NOW()`,
          [caseId, title, description, status, location, userId, hash]
        );
      }
      if (m.entityType === 'AUDIT' && m.actionType === 'CREATE') {
        await logAudit({ ...m.payload, source: 'MOBILE' });
      }
      results.push({ entityId: m.entityId, status: 'ok' });
    } catch (err) {
      results.push({ entityId: m.entityId, status: 'error', error: err.message });
    }
  }

  res.json({ results });
});

// ─── START ────────────────────────────────────────────────────────────────────

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
const HOST = process.env.HOST || '0.0.0.0';

ensureStorageDir().then(() => {
  app.listen(PORT, HOST, () => {
    console.log(`Kaaval_Backend API running on http://${HOST}:${PORT}`);
    if (FABRIC_DISABLED) console.log('[FABRIC] Integration disabled (FABRIC_DISABLED=true)');
  });
}).catch(err => {
  console.error('Startup failed:', err);
  process.exit(1);
});