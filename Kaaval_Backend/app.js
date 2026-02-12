require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const multer = require('multer');
const { Gateway, Wallets } = require('fabric-network');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const sqlite3 = require('sqlite3').verbose();

const fsp = fs.promises;
const DATA_DIR = path.join(__dirname, 'data');
const DATA_FILE = path.join(DATA_DIR, 'cases.json');
const FILE_STORAGE_ROOT = path.join(__dirname, 'file_storage');
const AUDIT_DB_PATH = path.join(DATA_DIR, 'audit_trail.db');
// Feature flags for Fabric integration
const FABRIC_DISABLED = process.env.FABRIC_DISABLED === 'true';
const FABRIC_DISCOVERY_ENABLED = process.env.FABRIC_DISCOVERY_ENABLED !== 'false';
const FABRIC_AS_LOCALHOST = process.env.FABRIC_AS_LOCALHOST !== 'false';

const app = express();
app.use(cors());
app.use(bodyParser.json());
app.use('/files', express.static(FILE_STORAGE_ROOT));

// --- HELPERS FOR PERSISTENCE ---
const ensureDataStore = async () => {
    await fsp.mkdir(DATA_DIR, { recursive: true });
    await fsp.mkdir(FILE_STORAGE_ROOT, { recursive: true });
    try {
        await fsp.access(DATA_FILE, fs.constants.F_OK);
    } catch {
        await fsp.writeFile(DATA_FILE, JSON.stringify([]), 'utf8');
    }
};

const sanitizeCaseName = (name) => name.replace(/[^a-z0-9]/gi, '_');
// Allow local dev hosts plus LAN Expo/web hosts; can still override via FRONTEND_ORIGIN
// Allow overriding from .env FRONTEND_ORIGIN. Keep localhost defaults; add your LAN URLs here once.
const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN || 'http://localhost:5173,http://localhost:3000';
const allowedOrigins = FRONTEND_ORIGIN.split(',').map(o => o.trim()).filter(Boolean);

// Helper to build a SHA-256 digest for uploaded files
const calculateFileHash = (filePath) => new Promise((resolve, reject) => {
    const hash = crypto.createHash('sha256');
    const stream = fs.createReadStream(filePath);
    stream.on('error', reject);
    stream.on('data', chunk => hash.update(chunk));
    stream.on('end', () => resolve(hash.digest('hex')));
});

// Deterministic hash for structured metadata objects
const hashMetadata = (payload) => {
    const sortedKeys = Object.keys(payload).sort();
    const ordered = {};
    for (const key of sortedKeys) {
        ordered[key] = payload[key];
    }
    return crypto.createHash('sha256').update(JSON.stringify(ordered)).digest('hex');
};

// Evidence-level metadata hash helper
const calculateEvidenceMetadataHash = (caseId, evidence) => {
    const payload = {
        caseId,
        id: evidence.id,
        name: evidence.name,
        type: evidence.type,
        uri: evidence.uri,
        timestamp: evidence.timestamp,
        location: evidence.location,
        submittedBy: evidence.submittedBy || 'Unknown'
    };
    return hashMetadata(payload);
};

// --- AUDIT TRAIL DATABASE ---
let auditDb;

const ensureAuditColumns = async () => {
    const requiredColumns = [
        { name: 'detailHash', type: 'TEXT' },
        { name: 'detailFileName', type: 'TEXT' },
        { name: 'detailFileType', type: 'TEXT' },
        { name: 'detailFileUri', type: 'TEXT' },
        { name: 'detailLocation', type: 'TEXT' },
        { name: 'detailTitle', type: 'TEXT' },
        { name: 'detailOfficer', type: 'TEXT' },
        { name: 'detailMetadataHash', type: 'TEXT' },
        { name: 'metadataHash', type: 'TEXT' }
    ];

    // Read current columns
    const columns = await new Promise((resolve, reject) => {
        auditDb.all('PRAGMA table_info(audit_logs);', (err, rows) => {
            if (err) reject(err);
            else resolve(rows.map(r => r.name));
        });
    });

    // Add any missing columns
    for (const col of requiredColumns) {
        if (!columns.includes(col.name)) {
            await new Promise((resolve, reject) => {
                auditDb.run(`ALTER TABLE audit_logs ADD COLUMN ${col.name} ${col.type};`, (err) => {
                    if (err) reject(err); else resolve();
                });
            });
        }
    }
};

const migrateDetailsColumn = async () => {
    // If a legacy JSON details column exists or metadataHash is missing, unpack and backfill
    return new Promise((resolve, reject) => {
        auditDb.all('SELECT logId, details, caseId, evidenceId, action, userId, userRole, userOrg, timestamp, result, detailHash, detailFileName, detailFileType, detailFileUri, detailLocation, detailTitle, detailOfficer, metadataHash FROM audit_logs WHERE details IS NOT NULL OR metadataHash IS NULL;', async (err, rows) => {
            if (err) return reject(err);
            if (!rows || rows.length === 0) return resolve();

            const tasks = rows.map(row => new Promise((res, rej) => {
                let parsed = {};
                try {
                    parsed = JSON.parse(row.details || '{}');
                } catch {
                    parsed = {};
                }

                const detailHash = parsed.hash || row.detailHash || null;
                const detailFileName = parsed.fileName || row.detailFileName || null;
                const detailFileType = parsed.fileType || row.detailFileType || null;
                const detailFileUri = parsed.fileUri || row.detailFileUri || null;
                const detailLocation = parsed.location || row.detailLocation || null;
                const detailTitle = parsed.title || row.detailTitle || null;
                const detailOfficer = parsed.officer || row.detailOfficer || null;
                const detailMetadataHash = parsed.metadataHash || row.detailMetadataHash || null;

                const metadataHash = hashMetadata({
                    caseId: row.caseId,
                    evidenceId: row.evidenceId,
                    action: row.action,
                    userId: row.userId,
                    userRole: row.userRole,
                    userOrg: row.userOrg,
                    timestamp: row.timestamp,
                    result: row.result,
                    detailHash,
                    detailFileName,
                    detailFileType,
                    detailFileUri,
                    detailLocation,
                    detailTitle,
                    detailOfficer
                });

                auditDb.run(
                    `UPDATE audit_logs SET 
                        detailHash = COALESCE(detailHash, ?),
                        detailFileName = COALESCE(detailFileName, ?),
                        detailFileType = COALESCE(detailFileType, ?),
                        detailFileUri = COALESCE(detailFileUri, ?),
                        detailLocation = COALESCE(detailLocation, ?),
                        detailTitle = COALESCE(detailTitle, ?),
                        detailOfficer = COALESCE(detailOfficer, ?),
                        detailMetadataHash = COALESCE(detailMetadataHash, ?),
                        metadataHash = COALESCE(metadataHash, ?),
                        details = NULL
                     WHERE logId = ?`,
                    [
                        detailHash,
                        detailFileName,
                        detailFileType,
                        detailFileUri,
                        detailLocation,
                        detailTitle,
                        detailOfficer,
                        detailMetadataHash,
                        metadataHash,
                        row.logId
                    ],
                    (updateErr) => {
                        if (updateErr) rej(updateErr); else res();
                    }
                );
            }));

            try {
                await Promise.all(tasks);
                resolve();
            } catch (e) {
                reject(e);
            }
        });
    });
};

const initAuditDb = async () => {
    await fsp.mkdir(DATA_DIR, { recursive: true });
    
    return new Promise((resolve, reject) => {
        const dbExists = fs.existsSync(AUDIT_DB_PATH);
        
        auditDb = new sqlite3.Database(AUDIT_DB_PATH, (err) => {
            if (err) {
                console.error('Error opening audit database:', err);
                reject(err);
                return;
            }
            
            // Create audit_logs table (only creates if not exists)
            auditDb.run(`
                CREATE TABLE IF NOT EXISTS audit_logs (
                    logId TEXT PRIMARY KEY,
                    caseId TEXT,
                    evidenceId TEXT,
                    action TEXT NOT NULL,
                    userId TEXT,
                    userRole TEXT,
                    userOrg TEXT,
                    timestamp TEXT NOT NULL,
                    result TEXT NOT NULL,
                    detailMetadataHash TEXT,
                    metadataHash TEXT,
                    FOREIGN KEY (caseId) REFERENCES cases(caseId)
                )
            `, async (tableErr) => {
                if (tableErr) {
                    console.error('Error creating audit_logs table:', tableErr);
                    reject(tableErr);
                } else {
                    try {
                        await ensureAuditColumns();
                        await migrateDetailsColumn();
                        if (!dbExists) {
                            console.log('Audit database initialized successfully');
                        }
                        resolve();
                    } catch (e) {
                        reject(e);
                    }
                }
            });
        });
    });
};

// Log audit event
const logAudit = async (auditData) => {
    const {
        caseId,
        evidenceId,
        action,
        performedBy,
        result,
        details
    } = auditData;

    const detailHash = details?.hash || null;
    const detailFileName = details?.fileName || null;
    const detailFileType = details?.fileType || null;
    const detailFileUri = details?.fileUri || null;
    const detailLocation = details?.location || null;
    const detailTitle = details?.title || null;
    const detailOfficer = details?.officer || null;
    const detailMetadataHash = details?.metadataHash || null;

    const logId = `log-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const timestamp = new Date().toISOString();

    const metadataPayload = {
        caseId: caseId || null,
        evidenceId: evidenceId || null,
        action,
        userId: performedBy?.userId || 'system',
        userRole: performedBy?.role || 'SYSTEM',
        userOrg: performedBy?.org || 'INTERNAL',
        timestamp,
        result,
        detailHash,
        detailFileName,
        detailFileType,
        detailFileUri,
        detailLocation,
        detailTitle,
        detailOfficer,
        detailMetadataHash
    };
    const metadataHash = hashMetadata(metadataPayload);

    return new Promise((resolve, reject) => {
        auditDb.run(
            `INSERT INTO audit_logs 
            (logId, caseId, evidenceId, action, userId, userRole, userOrg, timestamp, result, detailHash, detailFileName, detailFileType, detailFileUri, detailLocation, detailTitle, detailOfficer, detailMetadataHash, metadataHash) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                logId,
                caseId || null,
                evidenceId || null,
                action,
                performedBy?.userId || 'system',
                performedBy?.role || 'SYSTEM',
                performedBy?.org || 'INTERNAL',
                timestamp,
                result,
                detailHash,
                detailFileName,
                detailFileType,
                detailFileUri,
                detailLocation,
                detailTitle,
                detailOfficer,
                detailMetadataHash,
                metadataHash
            ],
            function(err) {
                if (err) {
                    console.error('Error logging audit:', err);
                    reject(err);
                } else {
                    resolve({ logId, timestamp });
                }
            }
        );
    });
};

// Query audit logs
const getAuditLogs = (filters = {}) => {
    return new Promise((resolve, reject) => {
        let query = 'SELECT * FROM audit_logs WHERE 1=1';
        const params = [];

        if (filters.caseId) {
            query += ' AND caseId = ?';
            params.push(filters.caseId);
        }
        if (filters.evidenceId) {
            query += ' AND evidenceId = ?';
            params.push(filters.evidenceId);
        }
        if (filters.action) {
            query += ' AND action = ?';
            params.push(filters.action);
        }
        if (filters.userId) {
            query += ' AND userId = ?';
            params.push(filters.userId);
        }

        query += ' ORDER BY timestamp DESC';

        if (filters.limit) {
            query += ' LIMIT ?';
            params.push(filters.limit);
        }

        auditDb.all(query, params, (err, rows) => {
            if (err) {
                reject(err);
            } else {
                const logs = rows.map(row => {
                    const details = {};
                    if (row.detailHash) details.hash = row.detailHash;
                    if (row.detailFileName) details.fileName = row.detailFileName;
                    if (row.detailFileType) details.fileType = row.detailFileType;
                    if (row.detailFileUri) details.fileUri = row.detailFileUri;
                    if (row.detailLocation) details.location = row.detailLocation;
                    if (row.detailTitle) details.title = row.detailTitle;
                    if (row.detailOfficer) details.officer = row.detailOfficer;
                    if (row.detailMetadataHash) details.metadataHash = row.detailMetadataHash;

                    return {
                        logId: row.logId,
                        caseId: row.caseId,
                        evidenceId: row.evidenceId,
                        action: row.action,
                        performedBy: {
                            userId: row.userId,
                            role: row.userRole,
                            org: row.userOrg
                        },
                        timestamp: row.timestamp,
                        result: row.result,
                        details: Object.keys(details).length ? details : null,
                        metadataHash: row.metadataHash || null
                    };
                });
                resolve(logs);
            }
        });
    });
};

const loadCases = async () => {
    await ensureDataStore();
    const raw = await fsp.readFile(DATA_FILE, 'utf8');
    return JSON.parse(raw || '[]');
};

const saveCases = async (cases) => {
    await ensureDataStore();
    await fsp.writeFile(DATA_FILE, JSON.stringify(cases, null, 2), 'utf8');
};

// --- MULTER STORAGE FOR EVIDENCE FILES ---
const storage = multer.diskStorage({
    destination: async (req, file, cb) => {
        try {
            const caseId = req.params.id || req.body.caseId;
            if (!caseId) return cb(new Error('caseId is required'), null);
            const safeCase = sanitizeCaseName(caseId);
            const dir = path.join(FILE_STORAGE_ROOT, safeCase);
            await fsp.mkdir(dir, { recursive: true });
            cb(null, dir);
        } catch (err) {
            cb(err, null);
        }
    },
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname) || '.bin';
        cb(null, `evidence_${Date.now()}${ext}`);
    },
});

const upload = multer({ storage });

// --- FABRIC CONNECTION HELPER ---
async function connectToNetwork() {
    const ccpPath = path.resolve(__dirname, 'connection-org1.json');
    const ccp = JSON.parse(fs.readFileSync(ccpPath, 'utf8'));
    const walletPath = path.join(process.cwd(), 'wallet');
    const wallet = await Wallets.newFileSystemWallet(walletPath);

    const gateway = new Gateway();
    await gateway.connect(ccp, {
        wallet,
        identity: 'appUser', // The user we registered
        discovery: { enabled: FABRIC_DISCOVERY_ENABLED, asLocalhost: FABRIC_AS_LOCALHOST }
    });

    const network = await gateway.getNetwork('mychannel');
    const contract = network.getContract('evidence'); // Name of your chaincode
    return { gateway, contract };
}

// --- ROUTES ---

// CASES: list all
app.get('/cases', async (req, res) => {
    try {
        const cases = await loadCases();
        res.status(200).json(cases);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
});

// CASES: get one
app.get('/cases/:id', async (req, res) => {
    try {
        const cases = await loadCases();
        const found = cases.find(c => c.caseId === req.params.id);
        if (!found) return res.status(404).json({ error: 'Case not found' });
        res.status(200).json(found);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
});

// CASES: create
app.post('/cases', async (req, res) => {
    try {
        const { caseId, title, description, officer, status, location, timestamp } = req.body;
        if (!caseId || !title) {
            return res.status(400).json({ error: 'caseId and title are required' });
        }
        const cases = await loadCases();
        if (cases.some(c => c.caseId === caseId)) {
            return res.status(409).json({ error: 'Case already exists' });
        }
        const newCase = {
            caseId,
            title,
            description: description || '',
            officer: officer || 'Unknown',
            status: status || 'Open',
            location: location || 'Unspecified',
            timestamp: timestamp || new Date().toISOString(),
            evidence: [],
            blockchainHash: req.body.blockchainHash || 'pending'
        };
        cases.unshift(newCase);
        await saveCases(cases);
        
        // Log audit
        try {
            await logAudit({
                caseId,
                action: 'CREATE_CASE',
                performedBy: {
                    userId: req.body.userId || 'unknown',
                    role: req.body.userRole || 'OFFICER',
                    org: req.body.userOrg || 'POLICE'
                },
                result: 'SUCCESS',
                details: { title, officer, location }
            });
        } catch (auditErr) {
            console.error('Audit logging failed:', auditErr);
        }
        
        res.status(201).json(newCase);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
});

// EVIDENCE: upload file + metadata for a case
app.post('/cases/:id/evidence', upload.single('file'), async (req, res) => {
    try {
        const caseId = req.params.id;
        const cases = await loadCases();
        const idx = cases.findIndex(c => c.caseId === caseId);
        if (idx === -1) return res.status(404).json({ error: 'Case not found' });

        if (!req.file) return res.status(400).json({ error: 'file is required' });

        const fileUrl = `${req.protocol}://${req.get('host')}/files/${sanitizeCaseName(caseId)}/${req.file.filename}`;
        const fileHash = await calculateFileHash(req.file.path);
        const evidence = {
            id: `ev-${Date.now()}`,
            name: req.body.name || req.file.originalname || 'evidence',
            type: req.body.type || 'image',
            uri: fileUrl,
            filePath: req.file.path,
            timestamp: req.body.timestamp || new Date().toISOString(),
            location: req.body.location || cases[idx].location,
            submittedBy: req.body.submittedBy || cases[idx].officer || 'Unknown',
            hash: fileHash,
            integrityStatus: 'UNVERIFIED',
            lastVerifiedAt: null
        };
        // Compute metadata hash for this evidence
        evidence.metadataHash = calculateEvidenceMetadataHash(caseId, evidence);

        cases[idx].evidence = cases[idx].evidence || [];
        cases[idx].evidence.unshift(evidence);
        await saveCases(cases);
        
        // Log audit
        try {
            await logAudit({
                caseId,
                evidenceId: evidence.id,
                action: 'UPLOAD',
                performedBy: {
                    userId: req.body.userId || 'unknown',
                    role: req.body.userRole || 'OFFICER',
                    org: req.body.userOrg || 'POLICE'
                },
                result: 'SUCCESS',
                details: {
                    hash: fileHash.substring(0, 12) + '...',
                    fileName: evidence.name,
                    fileType: evidence.type,
                    fileUri: fileUrl,
                    location: evidence.location,
                    metadataHash: evidence.metadataHash
                }
            });
        } catch (auditErr) {
            console.error('Audit logging failed:', auditErr);
        }

        res.status(201).json({ case: cases[idx], evidence });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
});

// Verify an evidence file hash and update integrity status
app.post('/cases/:caseId/evidence/:evidenceId/verify', async (req, res) => {
    try {
        const { caseId, evidenceId } = req.params;
        const cases = await loadCases();
        const caseIdx = cases.findIndex(c => c.caseId === caseId);
        if (caseIdx === -1) return res.status(404).json({ error: 'Case not found' });

        const evIdx = (cases[caseIdx].evidence || []).findIndex(ev => ev.id === evidenceId);
        if (evIdx === -1) return res.status(404).json({ error: 'Evidence not found' });

        const evidence = cases[caseIdx].evidence[evIdx];
        const currentHash = await calculateFileHash(evidence.filePath);
        const storedHash = evidence.hash;
        const matched = storedHash === currentHash;
        const integrityStatus = matched ? 'VERIFIED' : 'COMPROMISED';

        cases[caseIdx].evidence[evIdx] = {
            ...evidence,
            hash: currentHash,
            integrityStatus,
            lastVerifiedAt: new Date().toISOString()
        };

        await saveCases(cases);

        // Log audit
        try {
            await logAudit({
                caseId,
                evidenceId,
                action: 'VERIFY_HASH',
                performedBy: {
                    userId: req.body.userId || 'unknown',
                    role: req.body.userRole || 'OFFICER',
                    org: req.body.userOrg || 'POLICE'
                },
                result: matched ? 'MATCH' : 'MISMATCH',
                details: {
                    hash: currentHash.substring(0, 12) + '...',
                    fileName: evidence.name,
                    fileType: evidence.type,
                    fileUri: evidence.uri,
                    metadataHash: evidence.metadataHash,
                    previousHash: storedHash
                }
            });
        } catch (auditErr) {
            console.error('Audit logging failed:', auditErr);
        }

        res.status(200).json({
            caseId,
            evidenceId,
            matched,
            integrityStatus,
            hash: currentHash,
            previousHash: storedHash
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
});

// 1. UPLOAD EVIDENCE
app.post('/evidence', async (req, res) => {
    try {
        if (FABRIC_DISABLED) {
            return res.status(503).json({ error: 'Fabric integration disabled (set FABRIC_DISABLED=false to enable)' });
        }
        const { evidenceID, caseID, fileHash, metaHash, riskLevel } = req.body;
        const { gateway, contract } = await connectToNetwork();
        
        console.log(`Submitting CreateEvidence: ${evidenceID}`);
        await contract.submitTransaction('CreateEvidence', evidenceID, caseID, fileHash, metaHash, riskLevel);
        
        await gateway.disconnect();
        res.status(200).json({ message: 'Evidence created successfully', evidenceID });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
});

// 2. READ EVIDENCE (WITH AUDIT LOG)
app.get('/evidence/:id', async (req, res) => {
    try {
        if (FABRIC_DISABLED) {
            return res.status(503).json({ error: 'Fabric integration disabled (set FABRIC_DISABLED=false to enable)' });
        }
        const { gateway, contract } = await connectToNetwork();
        
        // NOTE: Using submitTransaction because you have a SetEvent in ReadEvidence!
        // If it was just a read without logging, we would use evaluateTransaction.
        const result = await contract.submitTransaction('ReadEvidence', req.params.id);
        await gateway.disconnect();
        const text = result ? result.toString() : '';
        const payload = text && text.trim().length ? JSON.parse(text) : null;
        res.status(200).json(payload);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 2b. LIST ALL EVIDENCE (QueryAllEvidence)
app.get('/evidence', async (req, res) => {
    try {
        // Allow explicit local source selection regardless of Fabric flag
        if (req.query.source === 'local') {
            const cases = await loadCases();
            const allEvidence = cases.flatMap(c => (c.evidence || []).map(ev => ({ caseId: c.caseId, ...ev })));
            return res.status(200).json(allEvidence);
        }

        if (FABRIC_DISABLED) {
            // Fallback: aggregate evidence from local case store
            const cases = await loadCases();
            const allEvidence = cases.flatMap(c => (c.evidence || []).map(ev => ({ caseId: c.caseId, ...ev })));
            return res.status(200).json(allEvidence);
        }
        const { gateway, contract } = await connectToNetwork();
        const result = await contract.evaluateTransaction('QueryAllEvidence');
        await gateway.disconnect();
        const text = result ? result.toString() : '';
        const payload = text && text.trim().length ? JSON.parse(text) : [];
        // If Fabric returns empty, optionally serve local data when requested via header
        if (Array.isArray(payload) && payload.length === 0 && req.get('X-Source') === 'local') {
            const cases = await loadCases();
            const allEvidence = cases.flatMap(c => (c.evidence || []).map(ev => ({ caseId: c.caseId, ...ev })));
            return res.status(200).json(allEvidence);
        }
        res.status(200).json(payload);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
});

// 3. GET HISTORY (AUDIT TRAIL)
app.get('/evidence/history/:id', async (req, res) => {
    try {
        if (FABRIC_DISABLED) {
            return res.status(503).json({ error: 'Fabric integration disabled (set FABRIC_DISABLED=false to enable)' });
        }
        const { gateway, contract } = await connectToNetwork();
        
        // History is read-only, so we use evaluateTransaction (faster)
        const result = await contract.evaluateTransaction('GetEvidenceHistory', req.params.id);
        await gateway.disconnect();
        const text = result ? result.toString() : '';
        const payload = text && text.trim().length ? JSON.parse(text) : [];
        res.status(200).json(payload);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 4. QUERY BY CASE ID
app.get('/case/:id', async (req, res) => {
    try {
        if (FABRIC_DISABLED) {
            return res.status(503).json({ error: 'Fabric integration disabled (set FABRIC_DISABLED=false to enable)' });
        }
        const { gateway, contract } = await connectToNetwork();
        const result = await contract.evaluateTransaction('QueryByCaseID', req.params.id);
        await gateway.disconnect();
        const text = result ? result.toString() : '';
        const payload = text && text.trim().length ? JSON.parse(text) : [];
        res.status(200).json(payload);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 5. TRANSFER REQUEST (CUSTODY)
app.post('/transfer/request', async (req, res) => {
    try {
        if (FABRIC_DISABLED) {
            return res.status(503).json({ error: 'Fabric integration disabled (set FABRIC_DISABLED=false to enable)' });
        }
        const { evidenceID, targetMSP } = req.body;
        const { gateway, contract } = await connectToNetwork();
        
        await contract.submitTransaction('RequestTransfer', evidenceID, targetMSP);
        
        await gateway.disconnect();
        res.status(200).json({ message: 'Transfer requested successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 6. TRANSFER ACCEPT
app.post('/transfer/accept', async (req, res) => {
    try {
        if (FABRIC_DISABLED) {
            return res.status(503).json({ error: 'Fabric integration disabled (set FABRIC_DISABLED=false to enable)' });
        }
        const { evidenceID } = req.body;
        const { gateway, contract } = await connectToNetwork();
        
        await contract.submitTransaction('AcceptTransfer', evidenceID);
        
        await gateway.disconnect();
        res.status(200).json({ message: 'Transfer accepted successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Health check for Fabric connectivity
app.get('/health/fabric', async (req, res) => {
    if (FABRIC_DISABLED) {
        return res.status(200).json({ connected: false, disabled: true });
    }
    try {
        const { gateway, contract } = await connectToNetwork();
        // Lightweight check: evaluate chaincode name presence by a benign evaluate (will throw if not available)
        await contract.evaluateTransaction('QueryAllEvidence');
        await gateway.disconnect();
        res.status(200).json({ connected: true, discovery: FABRIC_DISCOVERY_ENABLED, asLocalhost: FABRIC_AS_LOCALHOST });
    } catch (error) {
        res.status(200).json({ connected: false, error: error.message, discovery: FABRIC_DISCOVERY_ENABLED, asLocalhost: FABRIC_AS_LOCALHOST });
    }
});

// Audit logs API routes
app.get('/audit/logs', async (req, res) => {
    try {
        const filters = {
            caseId: req.query.caseId,
            evidenceId: req.query.evidenceId,
            action: req.query.action,
            userId: req.query.userId,
            limit: req.query.limit ? parseInt(req.query.limit) : undefined
        };
        const logs = await getAuditLogs(filters);
        res.status(200).json(logs);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
});

app.get('/audit/logs/case/:caseId', async (req, res) => {
    try {
        const logs = await getAuditLogs({ caseId: req.params.caseId });
        res.status(200).json(logs);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
});

app.get('/audit/logs/evidence/:evidenceId', async (req, res) => {
    try {
        const logs = await getAuditLogs({ evidenceId: req.params.evidenceId });
        res.status(200).json(logs);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
});

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
const HOST = process.env.HOST || '0.0.0.0';

// Initialize audit database before starting server
initAuditDb()
    .then(() => {
        app.listen(PORT, HOST, () => {
            console.log(`API running on http://${HOST}:${PORT}`);
        });
    })
    .catch(err => {
        console.error('Failed to initialize audit database:', err);
        process.exit(1);
    });