import {
  Case,
  CaseStatus,
  Evidence,
  EvidenceClassification,
  EvidenceType,
  IntegrityStatus,
  UserRole,
  AccessLog,
  LegalDocument,
  User
} from './types';

// Initial Cases
export const INITIAL_CASES: Case[] = [
  {
    caseId: 'FIR 142/2026',
    title: 'State vs. Unknown',
    description: 'Homicide case registered at Central PS, Bengaluru. Victim found at Koramangala residential area. Multiple digital and physical evidence items collected.',
    status: CaseStatus.UNDER_INVESTIGATION,
    currentCustodian: 'SI Arun Kumar',
    createdBy: 'SI Arun Kumar',
    createdAt: '2026-09-02T10:00:00.000Z',
    assignedToForensics: 'Dr. Karthik Venkat'
  },
  {
    caseId: 'FIR 089/2026',
    title: 'State vs. Ramesh Babu',
    description: 'Theft and receiving stolen property case. All forensic examinations completed; charge sheet under preparation.',
    status: CaseStatus.UNDER_INVESTIGATION,
    currentCustodian: 'DSP Priya Menon',
    createdBy: 'DSP Priya Menon',
    createdAt: '2026-07-15T08:30:00.000Z',
    assignedToForensics: 'Dr. Karthik Venkat'
  },
  {
    caseId: 'FIR 201/2026',
    title: 'State vs. Multiple Accused',
    description: 'Cyber fraud and forgery case under IPC 420 and IT Act 66C.',
    status: CaseStatus.OPEN,
    currentCustodian: 'SI Vikram Nair',
    createdBy: 'SI Vikram Nair',
    createdAt: '2026-09-08T11:45:00.000Z'
  },
  {
    caseId: 'FIR 056/2026',
    title: 'State vs. Unknown',
    description: 'Forensic examination complete; charge sheet ready.',
    status: CaseStatus.SUBMITTED_TO_COURT,
    currentCustodian: 'Inspector Deepa Srinivas',
    createdBy: 'Inspector Deepa Srinivas',
    createdAt: '2026-08-20T14:15:00.000Z'
  }
];

// Initial Evidence
export const INITIAL_EVIDENCE: Evidence[] = [
  {
    evidenceId: 'EV-0142',
    caseId: 'FIR 142/2026',
    name: 'Samsung Galaxy Smartphone',
    type: EvidenceType.DISK_IMAGE,
    fileName: 'samsung_galaxy_s22.bin',
    uploadedBy: 'SI Arun Kumar',
    role: UserRole.POLICE,
    timestamp: '2026-09-02T18:32:00.000Z',
    location: 'Crime Scene A, Koramangala',
    fileHash: 'a83f91bc4e72d1509f43ab8c0f3e7d21b19845fc2a0e7b5d3c1f92ab8e4d5071',
    metadataHash: '0x142meta...',
    custodian: 'Evidence Store Officer',
    currentCustodianName: 'Evidence Store Officer',
    integrityStatus: IntegrityStatus.VERIFIED,
    approvedForLegal: true,
    visibility: {
      isRestricted: false,
      allowedRoles: [],
      allowedDesignations: [],
      allowedUserIds: []
    },
    notes: 'Black Samsung Galaxy smartphone recovered from crime scene nightstand. Physical seal SEAL-9821 intact.',
    linkedEvidenceIds: ['EV-0143', 'EV-0144'],
    classification: EvidenceClassification.PRIMARY,
    sourceHash: 'a83f91bc4e72d1509f43ab8c0f3e7d21b19845fc2a0e7b5d3c1f92ab8e4d5071',
    liftingVideo: 'lifting_video_ev0142.mp4',
    liftingVideoHash: '0xvidhash142',
    blockchainTxId: 'TX-8F21A4B9',
    onChainStatus: 'CONFIRMED'
  },
  {
    evidenceId: 'EV-0143',
    caseId: 'FIR 142/2026',
    name: 'ATM Surveillance Footage',
    type: EvidenceType.VIDEO,
    fileName: 'atm_cctv_koramangala.mp4',
    uploadedBy: 'SI Arun Kumar',
    role: UserRole.POLICE,
    timestamp: '2026-09-02T19:15:00.000Z',
    location: 'ATM Branch, Koramangala',
    fileHash: 'b72e80cd5f91a2604e34bc7a1g4f8e32c20956gd3b1f8c6e4d2a01bc9f5e6182',
    metadataHash: '0x143meta...',
    custodian: 'Evidence Store Officer',
    currentCustodianName: 'Evidence Store Officer',
    integrityStatus: IntegrityStatus.VERIFIED,
    approvedForLegal: true,
    visibility: {
      isRestricted: false,
      allowedRoles: [],
      allowedDesignations: [],
      allowedUserIds: []
    },
    notes: 'Digital video footage from ATM surveillance camera, 720p, 2 hours duration.',
    linkedEvidenceIds: ['EV-0142'],
    classification: EvidenceClassification.PRIMARY,
    sourceHash: 'b72e80cd5f91a2604e34bc7a1g4f8e32c20956gd3b1f8c6e4d2a01bc9f5e6182',
    blockchainTxId: 'TX-8F21A4C2',
    onChainStatus: 'CONFIRMED'
  },
  {
    evidenceId: 'EV-0144',
    caseId: 'FIR 142/2026',
    name: 'Latent Fingerprint Lift',
    type: EvidenceType.IMAGE,
    fileName: 'fingerprint_lift_phone.jpg',
    uploadedBy: 'Constable Ravi',
    role: UserRole.POLICE,
    timestamp: '2026-09-02T20:30:00.000Z',
    location: 'Crime Scene A',
    fileHash: 'c91f72de6a02b3715f45cd8b2h5g9f43d31067he4c2g9d7f5e3b12cd0g6f7293',
    metadataHash: '0x144meta...',
    custodian: 'FSL Officer Subramaniam',
    currentCustodianName: 'FSL Officer Subramaniam',
    integrityStatus: IntegrityStatus.PENDING,
    approvedForLegal: false,
    visibility: {
      isRestricted: false,
      allowedRoles: [],
      allowedDesignations: [],
      allowedUserIds: []
    },
    notes: 'Latent fingerprint lifted from victim phone case. Under analysis at FSL Bengaluru.',
    linkedEvidenceIds: ['EV-0142'],
    classification: EvidenceClassification.SECONDARY,
    blockchainTxId: 'TX-8F21A4D5',
    onChainStatus: 'CONFIRMED'
  },
  {
    evidenceId: 'EV-0145',
    caseId: 'FIR 142/2026',
    name: 'Blood Sample Swab',
    type: EvidenceType.PHYSICAL,
    fileName: 'blood_sample_swab.pdf',
    uploadedBy: 'SI Arun Kumar',
    role: UserRole.POLICE,
    timestamp: '2026-09-02T19:45:00.000Z',
    location: 'Crime Scene A',
    fileHash: 'd02g83ef7b13c4826g56de9c3i6h0g54e42178if5d3h0e8g6f4c23de1h7g8304',
    metadataHash: '0x145meta...',
    custodian: 'FSL Bengaluru Lab 3',
    currentCustodianName: 'FSL Bengaluru Lab 3',
    integrityStatus: IntegrityStatus.VERIFIED,
    approvedForLegal: true,
    visibility: {
      isRestricted: false,
      allowedRoles: [],
      allowedDesignations: [],
      allowedUserIds: []
    },
    notes: 'Biological swab collected from crime scene floor. DNA profile verified.',
    linkedEvidenceIds: ['EV-0142'],
    classification: EvidenceClassification.PRIMARY,
    blockchainTxId: 'TX-8F21A4E8',
    onChainStatus: 'CONFIRMED'
  },
  {
    evidenceId: 'EV-0146',
    caseId: 'FIR 142/2026',
    name: 'Eyewitness Statement',
    type: EvidenceType.PDF,
    fileName: 'witness_statement_knair.pdf',
    uploadedBy: 'SI Arun Kumar',
    role: UserRole.POLICE,
    timestamp: '2026-09-03T10:00:00.000Z',
    location: 'Central Police Station',
    fileHash: 'e13h94fg8c24d5937h67ef0d4j7i1h65f53289jg6e4i1f9h7g5d34ef2i8h9415',
    metadataHash: '0x146meta...',
    custodian: 'Evidence Store Officer',
    currentCustodianName: 'Evidence Store Officer',
    integrityStatus: IntegrityStatus.VERIFIED,
    approvedForLegal: true,
    visibility: {
      isRestricted: false,
      allowedRoles: [],
      allowedDesignations: [],
      allowedUserIds: []
    },
    notes: 'Handwritten statement by eyewitness K. Nair recorded under Section 161 CrPC / BNSS.',
    linkedEvidenceIds: [],
    classification: EvidenceClassification.PRIMARY,
    blockchainTxId: 'TX-8F21A4F1',
    onChainStatus: 'CONFIRMED'
  },
  {
    evidenceId: 'EV-0147',
    caseId: 'FIR 142/2026',
    name: 'Building Entrance CCTV',
    type: EvidenceType.VIDEO,
    fileName: 'building_cctv_dvr.mp4',
    uploadedBy: 'Constable Ravi',
    role: UserRole.POLICE,
    timestamp: '2026-09-03T14:20:00.000Z',
    location: 'Apartment Complex Lobby',
    fileHash: 'f24i05gh9d35e6048i78fg1e5k8j2i76g64390kh7f5j2g0i8h6e45fg3j9i0526',
    metadataHash: '0x147meta...',
    custodian: 'Evidence Store Officer',
    currentCustodianName: 'Evidence Store Officer',
    integrityStatus: IntegrityStatus.PENDING,
    approvedForLegal: false,
    visibility: {
      isRestricted: false,
      allowedRoles: [],
      allowedDesignations: [],
      allowedUserIds: []
    },
    notes: 'Surveillance DVR extraction from apartment lobby. Awaiting Section 63 BSA certificate.',
    linkedEvidenceIds: ['EV-0142'],
    classification: EvidenceClassification.SECONDARY,
    blockchainTxId: 'TX-8F21A4G3',
    onChainStatus: 'CONFIRMED'
  }
];

// Initial Logs
export const INITIAL_LOGS: AccessLog[] = [
  {
    id: 'log_01',
    caseId: 'FIR 142/2026',
    evidenceId: 'EV-0142',
    accessedBy: 'SI Arun Kumar',
    role: UserRole.POLICE,
    action: 'UPLOAD',
    timestamp: '2026-09-02T18:32:00.000Z',
    details: 'Evidence registered on blockchain with initial SHA-256 hash'
  },
  {
    id: 'log_02',
    caseId: 'FIR 142/2026',
    evidenceId: 'EV-0142',
    accessedBy: 'SI Arun Kumar',
    role: UserRole.POLICE,
    action: 'VIEW',
    timestamp: '2026-09-02T18:45:00.000Z',
    details: 'Evidence sealed with tamper-evident seal SEAL-9821'
  },
  {
    id: 'log_03',
    caseId: 'FIR 142/2026',
    evidenceId: 'EV-0142',
    accessedBy: 'SI Arun Kumar',
    role: UserRole.POLICE,
    action: 'TRANSFER_CUSTODY',
    timestamp: '2026-09-02T19:20:00.000Z',
    details: 'Custody dispatched to Constable Ravi for transport to station'
  },
  {
    id: 'log_04',
    caseId: 'FIR 142/2026',
    evidenceId: 'EV-0142',
    accessedBy: 'Constable Ravi',
    role: UserRole.POLICE,
    action: 'TRANSFER_CUSTODY',
    timestamp: '2026-09-02T20:05:00.000Z',
    details: 'Custody received and acknowledged at Koramangala PS'
  },
  {
    id: 'log_05',
    caseId: 'FIR 142/2026',
    evidenceId: 'EV-0142',
    accessedBy: 'Constable Ravi',
    role: UserRole.POLICE,
    action: 'TRANSFER_CUSTODY',
    timestamp: '2026-09-03T09:15:00.000Z',
    details: 'Dispatched from Central PS Evidence Store to FSL Bengaluru'
  },
  {
    id: 'log_06',
    caseId: 'FIR 142/2026',
    evidenceId: 'EV-0142',
    accessedBy: 'FSL Officer Subramaniam',
    role: UserRole.FORENSICS,
    action: 'TRANSFER_CUSTODY',
    timestamp: '2026-09-03T11:42:00.000Z',
    details: 'Received and registered at FSL Bengaluru Intake Lab 3'
  },
  {
    id: 'log_07',
    caseId: 'FIR 142/2026',
    evidenceId: 'EV-0142',
    accessedBy: 'Dr. Anitha Krishnan',
    role: UserRole.FORENSICS,
    action: 'VERIFY',
    timestamp: '2026-09-04T14:30:00.000Z',
    details: 'Forensic examination commenced. Checksum integrity verified.'
  },
  {
    id: 'log_08',
    caseId: 'FIR 142/2026',
    evidenceId: 'EV-0142',
    accessedBy: 'Dr. Anitha Krishnan',
    role: UserRole.FORENSICS,
    action: 'APPROVE',
    timestamp: '2026-09-10T16:00:00.000Z',
    details: 'Forensic Report filed. Report Hash 9fa2c841e739... committed on-chain'
  }
];

// Initial Legal Documents
export const INITIAL_DOCUMENTS: LegalDocument[] = [
  {
    docId: 'DOC-142-01',
    caseId: 'FIR 142/2026',
    title: 'First Information Report (FIR 142/2026)',
    type: 'FIR',
    description: 'Statutory FIR registered under IPC 302, 201, 120B at Central Police Station.',
    uploadedBy: 'SI Arun Kumar',
    timestamp: '2026-09-02T10:00:00.000Z',
    linkedEvidenceIds: ['EV-0142', 'EV-0143']
  },
  {
    docId: 'DOC-142-02',
    caseId: 'FIR 142/2026',
    title: 'Crime Scene Inspection & Panchanama',
    type: 'WARRANT',
    description: 'Spot mahazar and seizure memo executed in the presence of panchas.',
    uploadedBy: 'SI Arun Kumar',
    timestamp: '2026-09-02T14:30:00.000Z',
    linkedEvidenceIds: ['EV-0142', 'EV-0144', 'EV-0145']
  },
  {
    docId: 'DOC-142-03',
    caseId: 'FIR 142/2026',
    title: 'Police Report / Draft Charge Sheet',
    type: 'CHARGE_SHEET',
    description: 'Final evidentiary compilation under Section 173 CrPC / BNSS.',
    uploadedBy: 'SI Arun Kumar',
    timestamp: '2026-09-12T11:00:00.000Z',
    linkedEvidenceIds: ['EV-0142', 'EV-0143', 'EV-0145', 'EV-0146']
  }
];

export const MOCK_USERS: User[] = [
  {
    id: 'u_police_1',
    username: 'arun.kumar',
    email: 'arun.kumar@tnpolice.gov.in',
    name: 'SI Arun Kumar',
    role: UserRole.POLICE,
    badgeNumber: 'TN-CPS-04',
    designation: 'Sub-Inspector (SI)'
  },
  {
    id: 'u_police_2',
    username: 'murugan.s',
    email: 'murugan.s@tnpolice.gov.in',
    name: 'S. Murugan',
    role: UserRole.POLICE,
    badgeNumber: 'TN-PD-402',
    designation: 'Inspector of Police'
  },
  {
    id: 'u_forensics_1',
    username: 'anitha.krishnan',
    email: 'anitha.krishnan@tnfsl.gov.in',
    name: 'Dr. Anitha Krishnan',
    role: UserRole.FORENSICS,
    designation: 'Senior Scientific Officer'
  },
  {
    id: 'u_admin_1',
    username: 'rajendran.k',
    email: 'rajendran.k@tnpolice.gov.in',
    name: 'K. Rajendran',
    role: UserRole.ADMIN,
    designation: 'IT Director'
  }
];
