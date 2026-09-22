// ---------------------------------------------------------------------------
// Investigating-officer domain types.
//
// These mirror the DTOs served by /api/investigation/* (see
// backend/src/routes/web/investigationRoutes.js). Every record carries both
// `caseId` — the real Postgres primary key, used for navigation and lookups —
// and `caseFirNumber`/`firNumber`, the human reference shown in the UI.
// ---------------------------------------------------------------------------

export type CocStatus = 'Verified' | 'Pending' | 'Exception';

export type CaseWorkflowStatus =
  | 'Open'
  | 'Under Investigation'
  | 'Awaiting Forensics'
  | 'Charge Sheet Preparation'
  | 'Submitted to Court'
  | 'Closed'
  | 'Frozen';

export type StorageStatus =
  | 'Secure Storage'
  | 'At FSL'
  | 'In Transit'
  | 'Returned'
  | 'Disposed';

export type EvidenceIntegrityStatus = 'Verified' | 'Compromised' | 'Pending' | 'Not Checked';

export type ForensicExaminationStatus =
  | 'Pending Submission'
  | 'In Transit'
  | 'Received by FSL'
  | 'Under Examination'
  | 'Examination Complete'
  | 'Report Available'
  | 'Not Required';

export type CustodyEventType =
  | 'Evidence Collected'
  | 'Evidence Sealed'
  | 'Custody Transferred'
  | 'Custody Received'
  | 'Transferred to FSL'
  | 'Received by FSL'
  | 'Forensic Examination Started'
  | 'Forensic Report Filed'
  | 'Evidence Returned';

export interface IOCase {
  /** Real database primary key, e.g. "CASE-2026-142". Use this for lookups. */
  caseId: string;
  /** Human case reference, e.g. "142/2026". Display only. */
  firNumber: string;
  title: string;
  policeStation: string;
  dateRegistered: string;
  investigatingOfficer: string;
  /** Derived server-side from the evidence table. */
  evidenceCount: number;
  witnessCount: number;
  offences: string[];
  /** Derived server-side from the forensic_records table. */
  forensicProgress: { completed: number; total: number };
  cocStatus: CocStatus;
  status: CaseWorkflowStatus;
  lastUpdated: string;
  description: string;
  district: string;
  isPriority?: boolean;
}

export interface IOEvidence {
  evidenceId: string;
  /** Real database case key. */
  caseId: string;
  /** Human case reference for display. */
  caseFirNumber?: string;
  type: string;
  description: string;
  collectedAt: string;
  collectedLocation: string;
  collectedBy: string;
  currentCustodian: string;
  currentLocation: string;
  status: StorageStatus;
  integrityStatus: EvidenceIntegrityStatus;
  forensicStatus: ForensicExaminationStatus;
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
  eventType: CustodyEventType;
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
  caseFirNumber?: string;
  fslRef: string;
  fslName: string;
  submittedDate: string;
  receivedDate?: string;
  examinationStartDate?: string;
  expectedCompletionDate?: string;
  completionDate?: string;
  examinationStatus: ForensicExaminationStatus;
  reportHash?: string;
  reportBlockchainTxId?: string;
  reportBlockchainVerified?: boolean;
  examiner?: string;
  findings?: string;
}

export interface IOAlert {
  id: string;
  severity: 'critical' | 'warning' | 'info';
  type: string;
  caseId: string;
  caseFirNumber?: string;
  evidenceId?: string;
  title: string;
  description: string;
  timestamp: string;
  status: 'Open' | 'Acknowledged' | 'Resolved';
}

export interface AuditEvent {
  id: string;
  caseId?: string;
  caseFirNumber?: string;
  evidenceId?: string;
  timestamp: string;
  /** Actor display name. `user` and `actor` are the same value — both names
   *  exist because the audit table and the case-detail audit tab were written
   *  against different field names. */
  user: string;
  actor: string;
  role?: string;
  action: string;
  details: string;
  txId: string;
  verificationStatus: 'Verified' | 'Pending' | 'Failed';
  ipAddress?: string;
}

export interface ChainIntegrityReport {
  evidenceId: string;
  totalEvents: number;
  verified: boolean;
  noMissingEvents: boolean;
  allTransfersAcknowledged: boolean;
  issues: string[];
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
