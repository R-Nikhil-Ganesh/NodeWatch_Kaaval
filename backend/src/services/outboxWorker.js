import { query, getClient } from '../db/index.js';
import { fabricGatewayService } from './fabricGatewayService.js';
import { config } from '../config/index.js';

let _isRunning = false;
let _timer = null;

export const outboxWorker = {
  /**
   * Start the background outbox polling loop
   */
  start() {
    if (_isRunning) return;
    _isRunning = true;
    console.log('[OutboxWorker] Started background blockchain transaction worker');
    this.scheduleNext();
  },

  /**
   * Stop the worker loop
   */
  stop() {
    _isRunning = false;
    if (_timer) {
      clearTimeout(_timer);
      _timer = null;
    }
    console.log('[OutboxWorker] Stopped background blockchain worker');
  },

  scheduleNext() {
    if (!_isRunning) return;
    _timer = setTimeout(async () => {
      await this.processBatch();
      this.scheduleNext();
    }, config.outbox.pollIntervalMs);
  },

  /**
   * Process a batch of pending outbox records
   */
  async processBatch() {
    if (config.fabric.disabled) return;

    try {
      // Fetch batch of pending outbox events
      const { rows } = await query(
        `SELECT * FROM blockchain_outbox
         WHERE status = 'PENDING' AND attempt_count < $1
         ORDER BY created_at ASC
         LIMIT $2`,
        [config.outbox.maxRetries, config.outbox.batchSize]
      );

      if (!rows.length) return;

      for (const item of rows) {
        await this.processItem(item);
      }
    } catch (err) {
      console.error('[OutboxWorker] Error during batch processing:', err.message);
    }
  },

  /**
   * Process a single outbox record with idempotency and state update
   */
  async processItem(item) {
    const { outbox_id, event_type, entity_id, payload } = item;

    // Mark as PROCESSING
    await query(
      `UPDATE blockchain_outbox SET status = 'PROCESSING', attempt_count = attempt_count + 1 WHERE outbox_id = $1`,
      [outbox_id]
    );

    try {
      let txId = null;

      switch (event_type) {
        case 'CREATE_EVIDENCE': {
          await fabricGatewayService.submitTransaction(
            'CreateEvidence',
            payload.evidenceId,
            payload.caseId,
            payload.sourceHash,
            payload.serverHash,
            payload.metadataHash || '',
            payload.riskLevel || 'LOW',
            payload.actorId || 'SYSTEM',
            payload.actorRole || 'POLICE'
          );
          txId = `tx_${Date.now()}_${payload.evidenceId}`;
          break;
        }

        case 'TRANSFER_INITIATE': {
          await fabricGatewayService.submitTransaction(
            'InitiateTransfer',
            payload.evidenceId,
            payload.targetMSP,
            payload.actorId || 'OFFICER',
            payload.actorRole || 'POLICE',
            payload.notes || ''
          );
          txId = `tx_${Date.now()}_transfer_init`;
          break;
        }

        case 'TRANSFER_ACCEPT': {
          await fabricGatewayService.submitTransaction(
            'AcceptTransfer',
            payload.evidenceId,
            payload.actorId || 'OFFICER',
            payload.actorRole || 'POLICE',
            payload.notes || ''
          );
          txId = `tx_${Date.now()}_transfer_accept`;
          break;
        }

        case 'FORENSIC_SUBMIT': {
          await fabricGatewayService.submitTransaction(
            'SubmitForForensics',
            payload.evidenceId,
            payload.fslMSP || 'FSLMSP',
            payload.actorId || 'OFFICER',
            payload.actorRole || 'POLICE',
            payload.notes || ''
          );
          txId = `tx_${Date.now()}_fsl_submit`;
          break;
        }

        case 'FORENSIC_VERIFY': {
          await fabricGatewayService.submitTransaction(
            'RecordForensicVerification',
            payload.evidenceId,
            payload.verifiedHash,
            payload.resultStatus || 'MATCH',
            payload.actorId || 'ANALYST',
            payload.actorRole || 'FORENSICS',
            payload.notes || ''
          );
          txId = `tx_${Date.now()}_fsl_verify`;
          break;
        }

        case 'INTEGRITY_FLAG': {
          await fabricGatewayService.submitTransaction(
            'FlagIntegrityBreach',
            payload.evidenceId,
            payload.detectedHash,
            payload.reason || 'Hash mismatch detected',
            payload.actorId || 'ANALYST',
            payload.actorRole || 'FORENSICS'
          );
          txId = `tx_${Date.now()}_tamper_alert`;
          break;
        }

        case 'COURT_SUBMIT': {
          await fabricGatewayService.submitTransaction(
            'SubmitToCourt',
            payload.evidenceId,
            payload.courtMSP || 'CourtMSP',
            payload.section63Ref || '',
            payload.actorId || 'OFFICER',
            payload.actorRole || 'LEGAL',
            payload.notes || ''
          );
          txId = `tx_${Date.now()}_court_submit`;
          break;
        }

        default:
          throw new Error(`Unknown outbox event type: ${event_type}`);
      }

      // Update both outbox and evidence table atomically
      const dbClient = await getClient();
      try {
        await dbClient.query('BEGIN');
        await dbClient.query(
          `UPDATE blockchain_outbox
           SET status = 'CONFIRMED', blockchain_tx_id = $1, processed_at = NOW()
           WHERE outbox_id = $2`,
          [txId, outbox_id]
        );

        if (event_type === 'CREATE_EVIDENCE') {
          await dbClient.query(
            `UPDATE evidence
             SET on_chain_status = 'REGISTERED', blockchain_tx_id = $1, updated_at = NOW()
             WHERE evidence_id = $2`,
            [txId, entity_id]
          );
        } else if (event_type === 'FORENSIC_VERIFY') {
          await dbClient.query(
            `UPDATE evidence
             SET on_chain_status = 'FORENSICALLY_VERIFIED', blockchain_tx_id = $1, updated_at = NOW()
             WHERE evidence_id = $2`,
            [txId, entity_id]
          );
        } else if (event_type === 'INTEGRITY_FLAG') {
          await dbClient.query(
            `UPDATE evidence
             SET on_chain_status = 'INTEGRITY_FLAGGED', integrity_status = 'COMPROMISED', blockchain_tx_id = $1, updated_at = NOW()
             WHERE evidence_id = $2`,
            [txId, entity_id]
          );
        }

        await dbClient.query('COMMIT');
        console.log(`[OutboxWorker] Successfully confirmed ${event_type} for entity ${entity_id}`);
      } catch (dbErr) {
        await dbClient.query('ROLLBACK');
        throw dbErr;
      } finally {
        dbClient.release();
      }
    } catch (fabricErr) {
      console.error(`[OutboxWorker] Failed to submit ${event_type} for ${entity_id}:`, fabricErr.message);

      const isTerminal = item.attempt_count + 1 >= config.outbox.maxRetries;
      const nextStatus = isTerminal ? 'FAILED' : 'PENDING';

      await query(
        `UPDATE blockchain_outbox
         SET status = $1, last_error = $2
         WHERE outbox_id = $3`,
        [nextStatus, fabricErr.message, outbox_id]
      );
    }
  }
};
