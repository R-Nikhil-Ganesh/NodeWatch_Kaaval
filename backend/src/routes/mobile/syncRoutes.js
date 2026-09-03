import express from 'express';
import { query, getClient } from '../../db/index.js';
import { auditService } from '../../services/auditService.js';

const router = express.Router();

// Delta sync: fetch cases and evidence modified since specified timestamp
router.get('/pull', async (req, res) => {
  try {
    const since = req.query.since ? new Date(req.query.since) : new Date(0);
    const { rows: cases } = await query(
      `SELECT * FROM cases WHERE updated_at > $1 AND is_deleted = FALSE ORDER BY updated_at ASC`,
      [since]
    );
    const { rows: evidence } = await query(
      `SELECT * FROM evidence WHERE updated_at > $1 AND is_deleted = FALSE ORDER BY updated_at ASC`,
      [since]
    );
    res.json({ cases, evidence, syncedAt: new Date().toISOString() });
  } catch (err) {
    console.error('[SyncPull Error]', err);
    res.status(500).json({ error: err.message });
  }
});

// Batch synchronization endpoint for offline SQLite / SQLCipher queue
router.post('/push', async (req, res) => {
  try {
    const { mutations } = req.body || {};
    if (!Array.isArray(mutations) || !mutations.length) {
      return res.json({ results: [] });
    }

    const results = [];

    for (const m of mutations) {
      const { entityType, entityId, actionType, payload } = m;

      try {
        if (entityType === 'CASE' && actionType === 'CREATE') {
          await query(
            `INSERT INTO cases
               (case_id, title, description, status, location, incident_timestamp,
                created_by_user_id, current_custodian_name, blockchain_hash, created_at, updated_at)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$10)
             ON CONFLICT (case_id) DO UPDATE SET updated_at = NOW()`,
            [
              entityId,
              payload.title || 'Offline Case',
              payload.description || '',
              payload.status || 'OPEN',
              payload.location || 'Crime Scene',
              payload.timestamp ? new Date(payload.timestamp) : new Date(),
              payload.userId || null,
              payload.officer_name || 'Field Officer',
              payload.blockchain_hash || 'pending',
              payload.created_at ? new Date(payload.created_at) : new Date(),
            ]
          );

          await auditService.log({
            caseId: entityId,
            userId: payload.userId,
            action: 'OFFLINE_SYNC_CASE',
            source: 'MOBILE',
            details: { title: payload.title },
          });

          results.push({ entityId, status: 'ok' });
        } else if (entityType === 'EVIDENCE' && actionType === 'CREATE') {
          const dbClient = await getClient();
          try {
            await dbClient.query('BEGIN');

            let custodianName = null;
            if (payload.userId) {
              const uRes = await dbClient.query('SELECT name FROM users WHERE user_id = $1', [payload.userId]);
              if (uRes.rows.length) custodianName = uRes.rows[0].name;
            }

            const targetCaseId = payload.case_id || payload.caseId;
            const fileHash = payload.file_hash || payload.hash || '';
            const sourceHash = payload.source_hash || fileHash;
            const metaHash = payload.metadata_hash || '';

            await dbClient.query(
              `INSERT INTO evidence
                 (evidence_id, case_id, name, file_name, type, mime_type, file_size_bytes, file_url,
                  file_hash, metadata_hash, source_hash, lifting_video_url, lifting_video_hash,
                  classification, risk_level, integrity_status,
                  uploaded_by, current_custodian_id, current_custodian_name, owner_msp,
                  collected_location, collected_timestamp, linked_evidence_ids, notes,
                  on_chain_status, version, is_deleted, created_at, updated_at)
               VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,'UNVERIFIED',$16,$17,$18,'Org1MSP',$19,$20,$21,$22,'BLOCKCHAIN_PENDING',1,FALSE,NOW(),NOW())
               ON CONFLICT (evidence_id) DO UPDATE SET updated_at = NOW()`,
              [
                entityId,
                targetCaseId,
                payload.name || 'Evidence',
                payload.file_name || 'evidence.jpg',
                (payload.type || 'IMAGE').toUpperCase(),
                payload.mime_type || 'image/jpeg',
                payload.file_size_bytes ? parseInt(payload.file_size_bytes, 10) : null,
                payload.file_url || '',
                fileHash,
                metaHash,
                sourceHash,
                payload.lifting_video_url || null,
                payload.lifting_video_hash || null,
                (sourceHash && payload.lifting_video_url) ? 'PRIMARY' : (payload.classification || 'SECONDARY'),
                (payload.risk_level || 'LOW').toUpperCase(),
                payload.userId || null,
                payload.userId || null,
                custodianName,
                payload.location || 'Crime Scene',
                payload.timestamp ? new Date(payload.timestamp) : new Date(),
                JSON.stringify(payload.linked_evidence_ids || []),
                payload.notes || null,
              ]
            );

            // Default visibility
            await dbClient.query(
              `INSERT INTO evidence_visibility (evidence_id) VALUES ($1) ON CONFLICT DO NOTHING`,
              [entityId]
            );

            // Outbox event
            await dbClient.query(
              `INSERT INTO blockchain_outbox
                 (event_type, entity_id, case_id, payload, status)
               VALUES ($1, $2, $3, $4, 'PENDING')`,
              [
                'CREATE_EVIDENCE',
                entityId,
                targetCaseId,
                JSON.stringify({
                  evidenceId: entityId,
                  caseId: targetCaseId,
                  sourceHash,
                  serverHash: fileHash,
                  metadataHash: metaHash,
                  riskLevel: payload.risk_level || 'LOW',
                  actorId: payload.userId || 'SYSTEM',
                  actorRole: 'POLICE',
                }),
              ]
            );

            await dbClient.query('COMMIT');
          } catch (itemErr) {
            await dbClient.query('ROLLBACK');
            throw itemErr;
          } finally {
            dbClient.release();
          }

          await auditService.log({
            caseId: payload.case_id || payload.caseId,
            evidenceId: entityId,
            userId: payload.userId,
            action: 'OFFLINE_SYNC_EVIDENCE',
            source: 'MOBILE',
            details: { title: payload.name, hash: payload.file_hash },
          });

          results.push({ entityId, status: 'ok' });
        } else {
          results.push({ entityId, status: 'ok' });
        }
      } catch (itemErr) {
        console.error(`[SyncPush Error] Failed for ${entityId}:`, itemErr.message);
        results.push({ entityId, status: 'error', error: itemErr.message });
      }
    }

    res.json({ results });
  } catch (err) {
    console.error('[SyncPush Fatal Error]', err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
