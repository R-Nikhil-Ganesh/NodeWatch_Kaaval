
export enum UserRole {
  ADMIN = 'ADMIN',
  POLICE = 'POLICE',
  FORENSICS = 'FORENSICS',
  LEGAL = 'LEGAL'
}

export enum CaseStatus {
  OPEN = 'OPEN',
  UNDER_INVESTIGATION = 'UNDER_INVESTIGATION',
  SUBMITTED_TO_COURT = 'SUBMITTED_TO_COURT',
  CLOSED = 'CLOSED',
  FROZEN = 'FROZEN'
}

export enum EvidenceType {
  IMAGE = 'IMAGE',
  PDF = 'PDF',
  WORD = 'WORD',
  PHYSICAL = 'PHYSICAL'
}

export enum IntegrityStatus {
  VERIFIED = 'VERIFIED',
  COMPROMISED = 'COMPROMISED',
  NOT_CHECKED = 'NOT_CHECKED',
  PENDING = 'PENDING'
}

export enum EvidenceClassification {
  PRIMARY = 'PRIMARY',
  SECONDARY = 'SECONDARY'
}

export interface User {
  id: string;
  username: string;
  password?: string; 
  email: string;
  name: string;
  role: UserRole;
  designation: string; // Added designation
  profileImage?: string; // Added profile image
  badgeNumber?: string;
}

export interface AccessLog {
  id: string;
  evidenceId?: string;
  caseId?: string;
  accessedBy: string; // User ID
  role: UserRole;
  action: 'VIEW' | 'DOWNLOAD' | 'VERIFY' | 'UPLOAD' | 'TRANSFER' | 'APPROVE' | 'FREEZE' | 'CREATE_CASE' | 'LOGIN' | 'LOGOUT' | 'UPDATE_USER' | 'COMPROMISED' | 'VISIBILITY_UPDATE' | 'CREATE_DOC' | 'TRANSFER_CUSTODY' | 'ISSUE_CERT';
  timestamp: string;
  details?: string;
}

export interface EvidenceVisibility {
  isRestricted: boolean;
  allowedRoles: UserRole[];
  allowedDesignations: string[];
  allowedUserIds: string[];
}

export interface Evidence {
  evidenceId: string;
  caseId: string;
  type: EvidenceType;
  fileName: string;
  uploadedBy: string; // User ID
  role: UserRole;
  timestamp: string;
  location: string;
  fileHash: string; // System generated hash on upload
  metadataHash: string;
  custodian: string; // Current holder (User ID or Dept)
  integrityStatus: IntegrityStatus;
  approvedForLegal: boolean;
  visibility: EvidenceVisibility;
  notes?: string;
  linkedEvidenceIds?: string[]; // New field for pinboard connections
  
  // New Fields for Section 63 Compliance
  classification: EvidenceClassification;
  sourceHash?: string; // Hash taken at scene
  liftingVideo?: string; // URL/Ref to video of lifting
  liftingVideoHash?: string; // Hash of the lifting video
  section63Certificate?: string; // URL/Ref to certificate issued by forensics
}

export interface LegalDocument {
  docId: string;
  caseId: string;
  title: string;
  type: 'FIR' | 'WARRANT' | 'COURT_ORDER' | 'CHARGE_SHEET';
  description?: string; // Added for content/details
  uploadedBy: string;
  timestamp: string;
  linkedEvidenceIds: string[];
}

export interface Case {
  caseId: string;
  title: string;
  description: string;
  status: CaseStatus;
  currentCustodian: string; // Added to track who has physical/legal custody of the case file
  createdBy: string; // User ID
  createdAt: string;
  assignedToForensics?: string; // User ID
}

// TN Specific Ranks for Dropdowns
export const DESIGNATIONS = {
  [UserRole.POLICE]: [
    'Director General of Police (DGP)',
    'Addl. Director General (ADGP)',
    'Inspector General (IGP)',
    'Superintendent of Police (SP)',
    'Dy. Superintendent (DSP)',
    'Inspector of Police',
    'Sub-Inspector (SI)',
    'Head Constable',
    'Grade I Constable'
  ],
  [UserRole.FORENSICS]: [
    'Director',
    'Joint Director',
    'Deputy Director',
    'Assistant Director',
    'Senior Scientific Officer',
    'Junior Scientific Officer',
    'Scientific Assistant'
  ],
  [UserRole.LEGAL]: [
    'High Court Judge',
    'District Judge',
    'Public Prosecutor',
    'Addl. Public Prosecutor',
    'Defense Counsel',
    'Registrar'
  ],
  [UserRole.ADMIN]: [
    'System Administrator',
    'IT Director',
    'Database Manager'
  ]
};
