import { apiPost } from './apiClient';
import type { VerificationResult, VerificationStage } from './types';

export type { VerificationResult, VerificationStage };

/**
 * Runs a real integrity check: the server compares the exhibit's stored hash
 * against the hash anchored on the ledger, updates `integrity_status` and
 * writes an audit row. The previous implementation was a timer that always
 * reported success.
 *
 * `onStageChange` still drives the stepper UI, but the outcome now comes from
 * the server rather than being assumed.
 */
export async function verifyEvidenceIntegrity(
  evidenceId: string,
  onStageChange: (stage: VerificationStage) => void,
  actor?: { actorId?: string; actorRole?: string }
): Promise<VerificationResult> {
  onStageChange('retrieving');

  try {
    onStageChange('hashing');
    const result = await apiPost<VerificationResult>(
      `/evidence/${encodeURIComponent(evidenceId)}/verify`,
      actor ?? {}
    );

    onStageChange('comparing');
    onStageChange(result.success ? 'success' : 'failure');
    return result;
  } catch (err: any) {
    onStageChange('failure');
    return {
      success: false,
      currentHash: '',
      ledgerHash: '',
      verificationTime: new Date().toISOString(),
      blockchainTxId: '',
      message: err?.message || 'Verification could not be completed — the service is unreachable.',
    };
  }
}
