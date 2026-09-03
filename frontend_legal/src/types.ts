// ---------------------------------------------------------------------------
// Court Management System — Judicial Case & Evidence Portal
// Domain types. Standalone from the Kaaval police/forensics apps — this app
// only models what a court-side user (Judge / Prosecutor / Defense / Registrar)
// needs to see. Backend + Hyperledger wiring comes later; today every value
// is served from src/data/mockData.ts.
// ---------------------------------------------------------------------------

export enum LegalDesignation {
  JUDGE = 'High Court Judge',
  DISTRICT_JUDGE = 'District Judge',
  PUBLIC_PROSECUTOR = 'Public Prosecutor',
  ADDL_PUBLIC_PROSECUTOR = 'Addl. Public Prosecutor',
  DEFENSE_COUNSEL = 'Defense Counsel',
  REGISTRAR = 'Registrar',
}

export interface LegalUser {
  id: string;
  name: string;
  email: string;
  designation: LegalDesignation;
  barOrJudicialId: string; // Bar Council enrolment no. OR Judicial officer code
  court: string;
  jurisdiction: string; // e.g. "Chennai District, Tamil Nadu"
  profileImage?: string;
  phone: string;
}

// ---------------------------------------------------------------------------
// Case
// ---------------------------------------------------------------------------

export enum CaseStage {
  INVESTIGATION = 'INVESTIGATION',
  CHARGESHEET_FILED = 'CHARGESHEET_FILED',
  COGNIZANCE_TAKEN = 'COGNIZANCE_TAKEN',
  CHARGES_FRAMED = 'CHARGES_FRAMED',
  PROSECUTION_EVIDENCE = 'PROSECUTION_EVIDENCE',
  DEFENCE_EVIDENCE = 'DEFENCE_EVIDENCE',
  FINAL_ARGUMENTS = 'FINAL_ARGUMENTS',
  JUDGMENT_RESERVED = 'JUDGMENT_RESERVED',
  DISPOSED = 'DISPOSED',
}

export const CASE_STAGE_LABEL: Record<CaseStage, string> = {
  [CaseStage.INVESTIGATION]: 'Investigation',
  [CaseStage.CHARGESHEET_FILED]: 'Chargesheet Filed',
  [CaseStage.COGNIZANCE_TAKEN]: 'Cognizance Taken',
  [CaseStage.CHARGES_FRAMED]: 'Charges Framed',
  [CaseStage.PROSECUTION_EVIDENCE]: 'Prosecution Evidence',
  [CaseStage.DEFENCE_EVIDENCE]: 'Defence Evidence',
  [CaseStage.FINAL_ARGUMENTS]: 'Final Arguments',
  [CaseStage.JUDGMENT_RESERVED]: 'Judgment Reserved',
  [CaseStage.DISPOSED]: 'Disposed',
};

// Ordered pipeline used to render the case-stage stepper
export const CASE_STAGE_ORDER: CaseStage[] = [
  CaseStage.INVESTIGATION,
  CaseStage.CHARGESHEET_FILED,
  CaseStage.COGNIZANCE_TAKEN,
  CaseStage.CHARGES_FRAMED,
  CaseStage.PROSECUTION_EVIDENCE,
  CaseStage.DEFENCE_EVIDENCE,
  CaseStage.FINAL_ARGUMENTS,
  CaseStage.JUDGMENT_RESERVED,
  CaseStage.DISPOSED,
];

export enum CaseOutcome {
  NONE = 'NONE',
  CONVICTED = 'CONVICTED',
  ACQUITTED = 'ACQUITTED',
  SETTLED = 'SETTLED',
}

export type CaseType =
  | 'Theft'
  | 'Robbery'
  | 'Murder'
  | 'Cyber Crime'
  | 'Narcotics (NDPS)'
  | 'Cheating & Criminal Breach of Trust'
  | 'Assault & Hurt'
  | 'Kidnapping'
  | 'Counterfeit Currency'
  | 'Sexual Assault (POCSO)';

export interface CaseParty {
  role: 'Complainant' | 'Accused' | 'Victim' | 'Witness';
  name: string;
  age?: number;
  address?: string;
  custodyStatus?: 'In Judicial Custody' | 'On Bail' | 'Absconding' | 'N/A';
}

export interface Hearing {
  hearingId: string;
  caseId: string;
  date: string; // ISO
  court: string;
  judge: string;
  purpose:
    | 'Appearance'
    | 'Framing of Charge'
    | 'Prosecution Evidence'
    | 'Defence Evidence'
    | 'Cross-Examination'
    | 'Final Arguments'
    | 'For Orders'
    | 'Judgment'
    | 'Bail Hearing'
    | 'Remand';
  statement: string; // Judge's order / statement recorded for this hearing
  nextHearingDate?: string; // ISO, if fixed
  attendance: {
    prosecutor: boolean;
    defenseCounsel: boolean;
    accusedPresent: boolean;
  };
}

export interface CourtCase {
  caseId: string; // internal id, e.g. CASE-2024-001
  cnrNumber: string; // eCourts-style CNR: TNCH01-000123-2024
  firNumber: string;
  firDate: string; // ISO
  policeStation: string;
  district: string;
  state: string;
  title: string; // "State vs. Arun Kumar"
  caseType: CaseType;
  sections: string[]; // e.g. ["BNS 303(2)", "BNS 331(3)"]
  description: string;
  court: string;
  presidingJudge: string;
  publicProsecutor: string;
  defenseCounsel: string;
  investigatingOfficer: string;
  investigatingOfficerDesignation: string;
  parties: CaseParty[];
  stage: CaseStage;
  outcome: CaseOutcome;
  registeredAt: string; // ISO — used for "date case got registered"
  firstHearingDate?: string;
  lastHearingDate?: string;
  upcomingHearingDate?: string;
  disposedAt?: string;
  currentCustodian: string; // who currently holds the physical case file
}

// ---------------------------------------------------------------------------
// Case Files (paperwork — tracked by chain of custody)
// ---------------------------------------------------------------------------

export type CaseFileType =
  | 'FIR'
  | 'Consent Form / Panchnama'
  | 'Section 63 BSA Certificate'
  | 'Arrest Warrant'
  | 'Search Warrant'
  | 'Production Warrant'
  | 'Request Form'
  | 'Chargesheet'
  | 'Court Order'
  | 'Bail Order'
  | 'Medical / Post-mortem Report';

export interface CustodyEvent {
  eventId: string;
  timestamp: string; // ISO
  fromCustodian: string;
  toCustodian: string;
  fromRole: string;
  toRole: string;
  action: 'Collected' | 'Uploaded' | 'Transferred' | 'Reviewed' | 'Filed in Court' | 'Returned to Malkhana';
  notes?: string;
}

export interface CaseFile {
  fileId: string;
  caseId: string;
  type: CaseFileType;
  title: string;
  fileFormat: 'PDF' | 'DOCX' | 'JPEG';
  fileSizeKb: number;
  uploadedBy: string;
  uploadedByRole: string;
  uploadedAt: string; // ISO
  relatedSections?: string[];
  linkedEvidenceIds?: string[];
  custodyTrail: CustodyEvent[];
  summary: string;
}

// ---------------------------------------------------------------------------
// Evidence
// ---------------------------------------------------------------------------

export type IntegrityStatus = 'VERIFIED' | 'COMPROMISED' | 'PENDING';
export type EvidenceClassification = 'PRIMARY' | 'SECONDARY';

export interface PhysicalEvidence {
  kind: 'PHYSICAL';
  evidenceId: string;
  caseId: string;
  name: string;
  category: 'Weapon' | 'Document' | 'Biological Sample' | 'Contraband' | 'Currency' | 'Electronic Device' | 'Clothing / Fibre' | 'Other';
  description: string;
  collectedBy: string;
  collectedByDesignation: string;
  collectedAt: string; // ISO
  storageLocation: string; // Malkhana location, e.g. "Malkhana, T. Nagar PS — Rack 4, Box 12"
  currentCustodian: string;
  sealNumber: string;
  custodyTrail: CustodyEvent[];
}

export interface DigitalEvidence {
  kind: 'DIGITAL';
  evidenceId: string;
  caseId: string;
  fileName: string;
  fileType: 'IMAGE' | 'VIDEO' | 'AUDIO' | 'DOCUMENT' | 'DISK_IMAGE' | 'CALL_DETAIL_RECORD';
  description: string;
  collectedBy: string;
  collectedByDesignation: string;
  collectedAt: string; // ISO — when it first became PRIMARY evidence and was hashed
  classification: EvidenceClassification;
  sha256Hash: string;
  ledgerTxId: string; // Hyperledger Fabric transaction id (mock)
  ledgerBlockRef: string;
  integrityStatus: IntegrityStatus;
  lastVerifiedAt?: string;
  section63CertificateId?: string; // links to a CaseFile of type 'Section 63 BSA Certificate'
  fileSizeMb: number;
  custodyTrail: CustodyEvent[];
}

export type EvidenceItem = PhysicalEvidence | DigitalEvidence;

// ---------------------------------------------------------------------------
// Audit Logs
// ---------------------------------------------------------------------------

export type AuditAction =
  | 'CASE_CREATED'
  | 'CASE_VIEWED'
  | 'FILE_UPLOADED'
  | 'FILE_VIEWED'
  | 'FILE_DOWNLOADED'
  | 'EVIDENCE_UPLOADED'
  | 'EVIDENCE_VIEWED'
  | 'EVIDENCE_VERIFIED'
  | 'HEARING_RECORDED'
  | 'CUSTODY_TRANSFERRED'
  | 'LOGIN'
  | 'LOGOUT';

export interface AuditLogEntry {
  logId: string;
  caseId: string;
  timestamp: string; // ISO
  actorName: string;
  actorDesignation: string;
  action: AuditAction;
  targetLabel: string; // human readable target, e.g. "EV-2024-014-A (CCTV Footage)"
  ipAddress: string;
  device: string;
}
