import express from 'express';
import { query } from '../../db/index.js';
import { auditService } from '../../services/auditService.js';

const router = express.Router();

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
          // If evidence metadata synced
          await query(
            `INSERT INTO evidence
               (evidence_id, case_id, name, file_name, type, file_hash, metadata_hash,
                source_hash, owner_msp, collected_location, on_chain_status, created_at, updated_at)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'PoliceMSP',$9,'BLOCKCHAIN_PENDING',NOW(),NOW())
             ON CONFLICT (evidence_id) DO UPDATE SET updated_at = NOW()`,
            [
              entityId,
              payload.case_id || payload.caseId,
              payload.name || 'Evidence',
              payload.file_name || 'evidence.jpg',
              (payload.type || 'IMAGE').toUpperCase(),
              payload.file_hash || payload.hash || '',
              payload.metadata_hash || '',
              payload.file_hash || payload.hash || '',
              payload.location || 'Crime Scene',
            ]
          );

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
