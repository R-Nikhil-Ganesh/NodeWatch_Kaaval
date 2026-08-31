
import { Case, CaseStatus, Evidence, EvidenceClassification, EvidenceType, IntegrityStatus, UserRole, AccessLog } from './types';

// Initial Cases
export const INITIAL_CASES: Case[] = [
  {
    caseId: 'CASE-2024-001',
    title: 'Robbery at Central Bank',
    description: 'Armed robbery reported at downtown branch.',
    status: CaseStatus.UNDER_INVESTIGATION,
    currentCustodian: 'S. Murugan', 
    createdBy: 'u_police_1',
    createdAt: new Date(Date.now() - 86400000 * 5).toISOString(),
    assignedToForensics: 'u_forensics_1'
  },
  {
    caseId: 'CASE-2024-002',
    title: 'Traffic Incident #992',
    description: 'Hit and run on 5th Avenue.',
    status: CaseStatus.OPEN,
    currentCustodian: 'Police Station 1', 
    createdBy: 'u_police_1',
    createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
  }
];

// Initial Evidence
export const INITIAL_EVIDENCE: Evidence[] = [
  {
    evidenceId: 'EV-001-A',
    caseId: 'CASE-2024-001',
    type: EvidenceType.IMAGE,
    fileName: 'cctv_frame_01.jpg',
    uploadedBy: 'u_police_1',
    role: UserRole.POLICE,
    timestamp: new Date(Date.now() - 86400000 * 4).toISOString(),
    location: 'Central Bank Main Hall',
    fileHash: '0x9a8b7c6d5e4f3a2b1c0d9e8f7a6b5c4d3e2f1',
    metadataHash: '0x123abc...',
    custodian: 'Forensics Lab',
    integrityStatus: IntegrityStatus.VERIFIED,
    approvedForLegal: true,
    visibility: {
        isRestricted: false,
        allowedRoles: [],
        allowedDesignations: [],
        allowedUserIds: []
    },
    notes: 'Recovered from damaged server',
    linkedEvidenceIds: ['EV-001-B'],
    classification: EvidenceClassification.PRIMARY,
    sourceHash: '0x9a8b7c6d5e4f3a2b1c0d9e8f7a6b5c4d3e2f1',
    liftingVideo: 'video_lifting_cctv.mp4',
    liftingVideoHash: '0x112233...'
  },
  {
    evidenceId: 'EV-001-B',
    caseId: 'CASE-2024-001',
    type: EvidenceType.PHYSICAL,
    fileName: 'shell_casing.docx', // Representation of physical item
    uploadedBy: 'u_forensics_1',
    role: UserRole.FORENSICS,
    timestamp: new Date(Date.now() - 86400000 * 3).toISOString(),
    location: 'Lab A',
    fileHash: '0xffffeeee...',
    metadataHash: '0xaaabbb...',
    custodian: 'Evidence Locker',
    integrityStatus: IntegrityStatus.PENDING,
    approvedForLegal: false,
    visibility: {
        isRestricted: false,
        allowedRoles: [],
        allowedDesignations: [],
        allowedUserIds: []
    },
    notes: 'Ballistics report pending',
    linkedEvidenceIds: ['EV-001-A'],
    classification: EvidenceClassification.SECONDARY, // Missing video/source hash
    sourceHash: undefined,
    liftingVideo: undefined
  }
];

// Initial Logs
export const INITIAL_LOGS: AccessLog[] = [
  {
    id: 'log_1',
    caseId: 'CASE-2024-001',
    accessedBy: 'u_admin_1', 
    role: UserRole.ADMIN,
    action: 'CREATE_CASE',
    timestamp: new Date(Date.now() - 86400000 * 5).toISOString(),
    details: 'Case created'
  },
  {
    id: 'log_2',
    evidenceId: 'EV-001-A',
    caseId: 'CASE-2024-001',
    accessedBy: 'u_police_1',
    role: UserRole.POLICE,
    action: 'UPLOAD',
    timestamp: new Date(Date.now() - 86400000 * 4).toISOString(),
    details: 'Initial upload of CCTV footage'
  }
];
