const now = Date.now();

export const DESIGNATIONS = {
  ADMIN: [
    'System Administrator',
    'IT Director',
    'Database Manager'
  ],
  POLICE: [
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
  FORENSICS: [
    'Director',
    'Joint Director',
    'Deputy Director',
    'Assistant Director',
    'Senior Scientific Officer',
    'Junior Scientific Officer',
    'Scientific Assistant'
  ],
  LEGAL: [
    'High Court Judge',
    'District Judge',
    'Public Prosecutor',
    'Addl. Public Prosecutor',
    'Defense Counsel',
    'Registrar'
  ]
};

export const state = {
  users: [
    {
      id: 'u_admin_1',
      username: 'admin1',
      password: 'password123',
      email: 'rajendran.k@tnpolice.gov.in',
      name: 'K. Rajendran',
      role: 'ADMIN',
      designation: 'IT Director'
    },
    {
      id: 'u_admin_2',
      username: 'admin2',
      password: 'password123',
      email: 'priya.kumar@tnpolice.gov.in',
      name: 'Priya Kumar',
      role: 'ADMIN',
      designation: 'System Administrator'
    },
    {
      id: 'u_police_1',
      username: 'police1',
      password: 'password123',
      email: 'murugan.s@tnpolice.gov.in',
      name: 'S. Murugan',
      role: 'POLICE',
      badgeNumber: 'TN-PD-402',
      designation: 'Inspector of Police'
    },
    {
      id: 'u_police_2',
      username: 'police2',
      password: 'password123',
      email: 'anbu.selvam@tnpolice.gov.in',
      name: 'Anbu Selvam',
      role: 'POLICE',
      badgeNumber: 'TN-PD-551',
      designation: 'Superintendent of Police (SP)'
    },
    {
      id: 'u_forensics_1',
      username: 'forensic1',
      password: 'password123',
      email: 'karthik.venkat@tnfsl.gov.in',
      name: 'Dr. Karthik Venkat',
      role: 'FORENSICS',
      designation: 'Senior Scientific Officer'
    },
    {
      id: 'u_forensics_2',
      username: 'forensic2',
      password: 'password123',
      email: 'lakshmi.raman@tnfsl.gov.in',
      name: 'Lakshmi Raman',
      role: 'FORENSICS',
      designation: 'Scientific Assistant'
    },
    {
      id: 'u_legal_1',
      username: 'legal1',
      password: 'password123',
      email: 'vijay.sundaram@tngovt.in',
      name: 'Vijay Sundaram',
      role: 'LEGAL',
      designation: 'Public Prosecutor'
    },
    {
      id: 'u_legal_2',
      username: 'legal2',
      password: 'password123',
      email: 'meena.krishnan@tnhc.gov.in',
      name: 'Meena Krishnan',
      role: 'LEGAL',
      designation: 'District Judge'
    }
  ],
  cases: [
    {
      caseId: 'CASE-2024-001',
      title: 'Robbery at Central Bank',
      description: 'Armed robbery reported at downtown branch.',
      status: 'UNDER_INVESTIGATION',
      currentCustodian: 'J. Doe',
      createdBy: 'u_police_1',
      createdAt: new Date(now - 86400000 * 5).toISOString(),
      assignedToForensics: 'u_forensics_1'
    },
    {
      caseId: 'CASE-2024-002',
      title: 'Traffic Incident #992',
      description: 'Hit and run on 5th Avenue.',
      status: 'OPEN',
      currentCustodian: 'Police Station 1',
      createdBy: 'u_police_1',
      createdAt: new Date(now - 86400000 * 2).toISOString()
    }
  ],
  evidence: [
    {
      evidenceId: 'EV-001-A',
      caseId: 'CASE-2024-001',
      type: 'IMAGE',
      fileName: 'cctv_frame_01.jpg',
      uploadedBy: 'u_police_1',
      role: 'POLICE',
      timestamp: new Date(now - 86400000 * 4).toISOString(),
      location: 'Central Bank Main Hall',
      fileHash: '0x9a8b7c6d5e4f3a2b1c0d9e8f7a6b5c4d3e2f1',
      metadataHash: '0x123abc...',
      custodian: 'Forensics Lab',
      integrityStatus: 'VERIFIED',
      approvedForLegal: true,
      visibility: {
        isRestricted: false,
        allowedRoles: [],
        allowedDesignations: [],
        allowedUserIds: []
      },
      notes: 'Recovered from damaged server',
      linkedEvidenceIds: ['EV-001-B'],
      classification: 'PRIMARY',
      sourceHash: '0x9a8b7c6d5e4f3a2b1c0d9e8f7a6b5c4d3e2f1',
      liftingVideo: 'video_lifting_cctv.mp4',
      liftingVideoHash: '0x112233...'
    },
    {
      evidenceId: 'EV-001-B',
      caseId: 'CASE-2024-001',
      type: 'PHYSICAL',
      fileName: 'shell_casing.docx',
      uploadedBy: 'u_forensics_1',
      role: 'FORENSICS',
      timestamp: new Date(now - 86400000 * 3).toISOString(),
      location: 'Lab A',
      fileHash: '0xffffeeee...',
      metadataHash: '0xaaabbb...',
      custodian: 'Evidence Locker',
      integrityStatus: 'PENDING',
      approvedForLegal: false,
      visibility: {
        isRestricted: false,
        allowedRoles: [],
        allowedDesignations: [],
        allowedUserIds: []
      },
      notes: 'Ballistics report pending',
      linkedEvidenceIds: ['EV-001-A'],
      classification: 'SECONDARY',
      sourceHash: undefined,
      liftingVideo: undefined
    }
  ],
  documents: [],
  logs: [
    {
      id: 'log_1',
      caseId: 'CASE-2024-001',
      accessedBy: 'u_admin_1',
      role: 'ADMIN',
      action: 'CREATE_CASE',
      timestamp: new Date(now - 86400000 * 5).toISOString(),
      details: 'Case created'
    },
    {
      id: 'log_2',
      evidenceId: 'EV-001-A',
      caseId: 'CASE-2024-001',
      accessedBy: 'u_police_1',
      role: 'POLICE',
      action: 'UPLOAD',
      timestamp: new Date(now - 86400000 * 4).toISOString(),
      details: 'Initial upload of CCTV footage'
    }
  ]
};
