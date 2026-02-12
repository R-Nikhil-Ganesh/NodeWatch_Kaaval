const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const hashMetadata = (payload) => {
    const ordered = {};
    Object.keys(payload).sort().forEach(k => { ordered[k] = payload[k]; });
    return crypto.createHash('sha256').update(JSON.stringify(ordered)).digest('hex');
};

const DATA_DIR = path.join(__dirname, '..', 'data');
const AUDIT_DB_PATH = path.join(DATA_DIR, 'audit_trail.db');
const CASES_FILE = path.join(DATA_DIR, 'cases.json');

// Read cases.json
const cases = JSON.parse(fs.readFileSync(CASES_FILE, 'utf8'));

// Open database
const db = new sqlite3.Database(AUDIT_DB_PATH, (err) => {
    if (err) {
        console.error('Error opening database:', err);
        process.exit(1);
    }
    console.log('Connected to audit database');
});

const ensureAuditColumns = () => {
    const required = [
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

    return new Promise((resolve, reject) => {
        db.all('PRAGMA table_info(audit_logs);', (err, rows) => {
            if (err) return reject(err);
            const cols = rows.map(r => r.name);

            const tasks = required
                .filter(col => !cols.includes(col.name))
                .map(col => new Promise((res, rej) => {
                    db.run(`ALTER TABLE audit_logs ADD COLUMN ${col.name} ${col.type};`, (alterErr) => {
                        if (alterErr) rej(alterErr); else res();
                    });
                }));

            Promise.all(tasks).then(() => resolve()).catch(reject);
        });
    });
};

// Generate audit logs
const auditLogs = [];

cases.forEach(caseData => {
    // Generate case creation log
    const caseLogId = `log-${new Date(caseData.timestamp).getTime()}-${caseData.caseId.toLowerCase().replace(/-/g, '')}`;
    auditLogs.push({
        logId: caseLogId,
        caseId: caseData.caseId,
        evidenceId: null,
        action: 'CREATE_CASE',
        userId: caseData.officer.toLowerCase().replace(/\s+/g, '-'),
        userRole: 'OFFICER',
        userOrg: 'POLICE',
        timestamp: caseData.timestamp,
        result: 'SUCCESS',
        detailHash: null,
        detailFileName: null,
        detailFileType: null,
        detailFileUri: null,
        detailLocation: caseData.location,
        detailTitle: caseData.title,
                detailOfficer: caseData.officer,
                detailMetadataHash: null
    });

    // Generate evidence upload logs
    if (caseData.evidence && caseData.evidence.length > 0) {
        caseData.evidence.forEach(evidence => {
            const evidenceLogId = `log-${new Date(evidence.timestamp).getTime()}-${evidence.id.replace('ev-', '')}`;
            auditLogs.push({
                logId: evidenceLogId,
                caseId: caseData.caseId,
                evidenceId: evidence.id,
                action: 'UPLOAD',
                userId: evidence.submittedBy ? evidence.submittedBy.toLowerCase().replace(/\s+/g, '-') : caseData.officer.toLowerCase().replace(/\s+/g, '-'),
                userRole: 'OFFICER',
                userOrg: 'POLICE',
                timestamp: evidence.timestamp,
                result: 'SUCCESS',
                detailHash: evidence.hash,
                detailFileName: evidence.name,
                detailFileType: evidence.type,
                detailFileUri: evidence.uri,
                detailLocation: evidence.location,
                detailTitle: null,
                detailOfficer: evidence.submittedBy || caseData.officer,
                detailMetadataHash: hashMetadata({
                    caseId: caseData.caseId,
                    id: evidence.id,
                    name: evidence.name,
                    type: evidence.type,
                    uri: evidence.uri,
                    timestamp: evidence.timestamp,
                    location: evidence.location,
                    submittedBy: evidence.submittedBy || caseData.officer
                })
            });
        });
    }
});

// Compute metadataHash for each log entry
auditLogs.forEach(log => {
    log.metadataHash = hashMetadata({
        caseId: log.caseId,
        evidenceId: log.evidenceId,
        action: log.action,
        userId: log.userId,
        userRole: log.userRole,
        userOrg: log.userOrg,
        timestamp: log.timestamp,
        result: log.result,
        detailHash: log.detailHash,
        detailFileName: log.detailFileName,
        detailFileType: log.detailFileType,
        detailFileUri: log.detailFileUri,
        detailLocation: log.detailLocation,
        detailTitle: log.detailTitle,
        detailOfficer: log.detailOfficer,
        detailMetadataHash: log.detailMetadataHash
    });
});

// Sort by timestamp
auditLogs.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

const seed = async () => {
    try {
        await ensureAuditColumns();

        console.log(`Seeding ${auditLogs.length} audit log entries...`);

        const insertStmt = db.prepare(`
            INSERT OR REPLACE INTO audit_logs 
            (logId, caseId, evidenceId, action, userId, userRole, userOrg, timestamp, result, detailHash, detailFileName, detailFileType, detailFileUri, detailLocation, detailTitle, detailOfficer, detailMetadataHash, metadataHash) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);

        let completed = 0;
        auditLogs.forEach((log) => {
            insertStmt.run(
                log.logId,
                log.caseId,
                log.evidenceId,
                log.action,
                log.userId,
                log.userRole,
                log.userOrg,
                log.timestamp,
                log.result,
                log.detailHash,
                log.detailFileName,
                log.detailFileType,
                log.detailFileUri,
                log.detailLocation,
                log.detailTitle,
                log.detailOfficer,
                log.detailMetadataHash,
                log.metadataHash,
                (err) => {
                    if (err) {
                        console.error(`Error inserting log ${log.logId}:`, err);
                    } else {
                        completed++;
                        if (completed === auditLogs.length) {
                            insertStmt.finalize();
                            console.log(`✓ Successfully seeded ${completed} audit log entries`);
                            
                            // Verify
                            db.get('SELECT COUNT(*) as count FROM audit_logs', (countErr, row) => {
                                if (countErr) {
                                    console.error('Error counting logs:', countErr);
                                } else {
                                    console.log(`Total audit logs in database: ${row.count}`);
                                }
                                db.close();
                            });
                        }
                    }
                }
            );
        });
    } catch (e) {
        console.error('Seeding failed:', e);
        db.close();
    }
};

seed();
