export interface IOCase {
  firNumber: string;
  title: string;
  policeStation: string;
  dateRegistered: string;
  investigatingOfficer: string;
  evidenceCount: number;
  witnessCount: number;
  offences: string[];
  forensicProgress: { completed: number; total: number };
  cocStatus: 'Verified' | 'Pending' | 'Exception';
  status: 'Open' | 'Under Investigation' | 'Awaiting Forensics' | 'Charge Sheet Preparation' | 'Closed';
  lastUpdated: string;
  description: string;
  district: string;
}

export interface IOEvidence {
  evidenceId: string;
  caseId: string;
  type: string;
  description: string;
  collectedAt: string;
  collectedLocation: string;
  collectedBy: string;
  currentCustodian: string;
  currentLocation: string;
  status: 'Secure Storage' | 'At FSL' | 'In Transit' | 'Returned' | 'Disposed';
  integrityStatus: 'Verified' | 'Compromised' | 'Pending' | 'Not Checked';
  forensicStatus: 'Pending Submission' | 'In Transit' | 'Received by FSL' | 'Under Examination' | 'Examination Complete' | 'Report Available' | 'Not Required';
  sha256Hash: string;
  blockchainTxId: string;
  blockchainVerified: boolean;
  sealId?: string;
  notes?: string;
}

export interface CustodyEvent {
  id: string;
  evidenceId: string;
  timestamp: string;
  eventType: 'Evidence Collected' | 'Evidence Sealed' | 'Custody Transferred' | 'Custody Received' | 'Transferred to FSL' | 'Received by FSL' | 'Forensic Examination Started' | 'Forensic Report Filed' | 'Evidence Returned';
  actor: string;
  fromCustodian?: string;
  toCustodian?: string;
  location: string;
  txId: string;
  blockchainVerified: boolean;
  notes?: string;
  sealId?: string;
}

export interface ForensicRecord {
  evidenceId: string;
  caseId: string;
  fslRef: string;
  fslName: string;
  submittedDate: string;
  receivedDate?: string;
  examinationStartDate?: string;
  expectedCompletionDate?: string;
  completionDate?: string;
  examinationStatus: 'Pending Submission' | 'In Transit' | 'Received by FSL' | 'Under Examination' | 'Examination Complete' | 'Report Available';
  reportHash?: string;
  reportBlockchainTxId?: string;
  reportBlockchainVerified?: boolean;
  examiner?: string;
  findings?: string;
}

export interface AuditEvent {
  id: string;
  caseId?: string;
  evidenceId?: string;
  timestamp: string;
  actor: string;
  action: string;
  details: string;
  ipAddress?: string;
}

export type VerificationStage = 'idle' | 'retrieving' | 'hashing' | 'comparing' | 'success' | 'failure';

export interface VerificationResult {
  success: boolean;
  currentHash: string;
  ledgerHash: string;
  verificationTime: string;
  blockchainTxId: string;
  message: string;
}
