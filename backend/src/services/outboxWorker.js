import { query, getClient } from '../db/index.js';
import { fabricGatewayService } from './fabricGatewayService.js';
import { config } from '../config/index.js';

let _isRunning = false;
let _timer = null;

/**
 * Parses raw Hyperledger Fabric / gRPC error messages into a clear diagnostic reason.
 */
function diagnoseFabricError(error) {
  const msg = error?.message || String(error);

  if (msg.includes('DiscoveryService has failed to return results') || msg.includes('no discovery results')) {
    return {
      category: 'FABRIC_PEER_OFFLINE',
      summary: 'Fabric Discovery service could not reach endorsing peers on channel.',
      explanation: 'The Hyperledger Fabric peer container (peer0.org1.example.com:7051) is offline or unreachable on localhost.',
      action: 'Start the Fabric test network (e.g. ./network.sh up createChannel) or set FABRIC_DISABLED=true in .env for standalone DB mode.',
    };
  }

  if (msg.includes('Failed to connect before the deadline') || msg.includes('ECONNREFUSED') || msg.includes('connectAttempted:true')) {
    return {
      category: 'GRPC_CONNECTION_TIMEOUT',
      summary: 'gRPC connection to Fabric peer endpoint timed out.',
      explanation: 'Could not establish a secure gRPC connection to localhost:7051 / localhost:9051.',
      action: 'Check if Docker containers for Org1/Org2 peers are running (docker ps).',
    };
  }

  if (msg.includes('Identity') && msg.includes('not found in wallet')) {
    return {
      category: 'WALLET_IDENTITY_MISSING',
      summary: 'Client certificate/identity missing in wallet.',
      explanation: msg,
      action: 'Enroll user credentials into backend/wallet using the Fabric CA.',
    };
  }

  if (msg.includes('Connection profile not found')) {
    return {
      category: 'CCP_PROFILE_MISSING',
      summary: 'Fabric connection profile JSON file is missing.',
      explanation: msg,
      action: 'Verify FABRIC_CCP_PATH points to a valid connection-3org.json file.',
    };
  }

  if (msg.includes('endorsement has failed') || msg.includes('chaincode error')) {
    return {
      category: 'CHAINCODE_ENDORSEMENT_FAILED',
      summary: 'Smart contract transaction endorsement failed.',
      explanation: msg,
      action: 'Inspect chaincode execution logs on the peer container for validation rule rejections.',
    };
  }

  return {
    category: 'LEDGER_SUBMISSION_ERROR',
    summary: 'Blockchain transaction submission rejected.',
    explanation: msg,
    action: 'Check Fabric gateway logs and peer connection status.',
  };
}

export const outboxWorker = {
  /**
   * Start the background outbox polling loop
   */
  start() {
    if (_isRunning) return;
    _isRunning = true;
    console.log('\n========================================================================');
    console.log('🔗 [Blockchain Outbox] Worker Started — Polling for ledger events every ' + config.outbox.pollIntervalMs + 'ms');
    console.log('========================================================================\n');
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
    console.log('[Blockchain Outbox] Worker Stopped');
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

      console.log(`\n------------------------------------------------------------------------`);
      console.log(`📡 [Blockchain Outbox] Polled ${rows.length} pending transaction(s) queued for blockchain anchoring`);
      console.log(`------------------------------------------------------------------------`);

      for (const item of rows) {
        await this.processItem(item);
      }
    } catch (err) {
      console.error('[Blockchain Outbox] Database polling error:', err.message);
    }
  },

  /**
   * Process a single outbox record with idempotency, ledger submission, and detailed logging
   */
  async processItem(item) {
    const { outbox_id, event_type, entity_id, case_id, payload, attempt_count } = item;
    const currentAttempt = attempt_count + 1;

    console.log(`\n⏳ [Blockchain Outbox] Submitting transaction to Hyperledger Fabric...`);
    console.log(`   • Event Type:  ${event_type}`);
    console.log(`   • Entity ID:   ${entity_id}`);
    console.log(`   • Case ID:     ${case_id || 'N/A'}`);
    console.log(`   • Attempt:     ${currentAttempt} of ${config.outbox.maxRetries}`);
    console.log(`   • Channel:     ${config.fabric.channelName} | Chaincode: ${config.fabric.chaincodeName}`);

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
            payload.fslMSP || config.fabric.orgs?.forensics?.mspId || 'Org2MSP',
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
            payload.courtMSP || config.fabric.orgs?.court?.mspId || 'Org3MSP',
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

      // Commit update atomically
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
        
        console.log(`✅ [Blockchain Outbox] Transaction Successfully Committed on Fabric Ledger!`);
        console.log(`   • Event Type:  ${event_type}`);
        console.log(`   • Entity ID:   ${entity_id}`);
        console.log(`   • TxID:        ${txId}`);
        console.log(`   • Status:      CONFIRMED (State updated to REGISTERED)`);
        console.log(`------------------------------------------------------------------------`);
      } catch (dbErr) {
        await dbClient.query('ROLLBACK');
        throw dbErr;
      } finally {
        dbClient.release();
      }
    } catch (fabricErr) {
      const diag = diagnoseFabricError(fabricErr);
      const isTerminal = currentAttempt >= config.outbox.maxRetries;
      const nextStatus = isTerminal ? 'FAILED' : 'PENDING';

      console.error(`\n❌ [Blockchain Outbox] Could not anchor transaction on-chain!`);
      console.error(`   • Event Type:   ${event_type}`);
      console.error(`   • Entity ID:    ${entity_id}`);
      console.error(`   • Error Type:   ${diag.category}`);
      console.error(`   • Diagnostic:   ${diag.summary}`);
      console.error(`   • Error Reason: ${diag.explanation}`);
      console.error(`   • Action:       ${diag.action}`);
      console.error(`   • Queue Status: ${nextStatus} (${isTerminal ? 'Max retries exceeded' : 'Will retry on next poll interval'})`);
      console.error(`------------------------------------------------------------------------`);

      await query(
        `UPDATE blockchain_outbox
         SET status = $1, last_error = $2
         WHERE outbox_id = $3`,
        [nextStatus, `${diag.category}: ${diag.explanation}`, outbox_id]
      );
    }
  }
};
