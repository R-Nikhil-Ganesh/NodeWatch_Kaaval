import type { VerificationResult, VerificationStage } from './types';
export type { VerificationResult, VerificationStage };

const MOCK_EVIDENCE_HASHES: Record<string, string> = {
  'EV-0142': 'a83f91bc4e72d1509f43ab8c0f3e7d21b19845fc2a0e7b5d3c1f92ab8e4d5071',
  'EV-0143': 'b72e80cd5f91a2604e34bc7a1g4f8e32c20956gd3b1f8c6e4d2a01bc9f5e6182',
  'EV-0144': 'c91f72de6a02b3715f45cd8b2h5g9f43d31067he4c2g9d7f5e3b12cd0g6f7293',
  'EV-0145': 'd02g83ef7b13c4826g56de9c3i6h0g54e42178if5d3h0e8g6f4c23de1h7g8304',
  'EV-0146': 'e13h94fg8c24d5937h67ef0d4j7i1h65f53289jg6e4i1f9h7g5d34ef2i8h9415',
  'EV-0147': 'f24i05gh9d35e6048i78fg1e5k8j2i76g64390kh7f5j2g0i8h6e45fg3j9i0526'
};

async function delay(ms: number) {
  return new Promise(r => setTimeout(r, ms));
}

export async function verifyEvidenceIntegrity(
  evidenceId: string,
  onStageChange: (stage: VerificationStage) => void
): Promise<VerificationResult> {
  const ledgerHash = MOCK_EVIDENCE_HASHES[evidenceId] || 'unknown';

  onStageChange('retrieving');
  await delay(1200);

  onStageChange('hashing');
  await delay(1000);

  onStageChange('comparing');
  await delay(800);

  // Simulate success — hashes match
  const currentHash = ledgerHash;
  const success = true;

  onStageChange(success ? 'success' : 'failure');

  return {
    success,
    currentHash,
    ledgerHash,
    verificationTime: new Date().toISOString(),
    blockchainTxId: `TX-VERIFY-${Date.now().toString(16).toUpperCase()}`,
    message: success
      ? 'Evidence integrity verified. Current file hash matches the hash recorded on the Hyperledger Fabric ledger.'
      : 'INTEGRITY FAILURE: Current file hash does NOT match the recorded ledger hash. Evidence may have been tampered with.'
  };
}
