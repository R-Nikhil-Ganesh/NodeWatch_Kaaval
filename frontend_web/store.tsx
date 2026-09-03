
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Case, Evidence, AccessLog, User, UserRole, LegalDocument, CaseStatus, IntegrityStatus, EvidenceVisibility, EvidenceClassification } from './types';
import { INITIAL_CASES, INITIAL_EVIDENCE, INITIAL_LOGS } from './constants';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000';

interface AppState {
  isAuthenticated: boolean;
  currentUser: User | null;
  cases: Case[];
  evidence: Evidence[];
  logs: AccessLog[];
  documents: LegalDocument[];
  users: User[];
  theme: 'light' | 'dark';
  toggleTheme: () => void;
  login: (user: User) => void;
  logout: () => void;
  updateUser: (updatedUser: User) => void;
  addCase: (newCase: Case) => void;
  addEvidence: (newEvidence: Evidence) => void;
  addLog: (log: Omit<AccessLog, 'id' | 'timestamp'>) => void;
  addDocument: (doc: LegalDocument) => void;
  updateCaseStatus: (caseId: string, status: CaseStatus) => void;
  verifyEvidence: (evidenceId: string) => void;
  approveEvidence: (evidenceId: string) => void;
  toggleIntegrityHack: (evidenceId: string) => void;
  updateEvidenceVisibility: (evidenceId: string, visibility: EvidenceVisibility) => void;
  transferCaseCustody: (caseId: string, newCustodianId: string, newCustodianRole: string, notes?: string) => void;
  issueSection63Certificate: (evidenceId: string, certificateRef: string) => void;
}

const StoreContext = createContext<AppState | undefined>(undefined);

const mapDbUserToUser = (u: any): User => ({
  id: u.user_id || u.id,
  username: u.username || u.email,
  email: u.email,
  name: u.name,
  role: (u.role || 'POLICE') as UserRole,
  designation: u.designation || '',
  badgeNumber: u.badge_number || u.badgeNumber || undefined,
  profileImage: u.profile_image_url || u.profileImage || undefined,
});

const mapDbCaseToCase = (row: any): Case => {
  const rawStatus = (row.status || 'OPEN').toString().toUpperCase().replace(/\s+/g, '_');
  return {
    caseId: row.case_id || row.caseId,
    title: row.title,
    description: row.description || '',
    status: (Object.values(CaseStatus).includes(rawStatus as CaseStatus) ? rawStatus : CaseStatus.OPEN) as CaseStatus,
    currentCustodian: row.custodian_name || row.current_custodian_name || row.current_custodian_id || row.currentCustodian || 'Unassigned',
    createdBy: row.created_by_name || row.created_by_user_id || row.createdBy || 'Unknown',
    createdAt: row.created_at || row.createdAt || new Date().toISOString(),
    assignedToForensics: row.forensics_name || row.assigned_forensics_id || row.assignedToForensics || undefined,
  };
};

const mapDbEvidenceToEvidence = (row: any): Evidence => ({
  evidenceId: row.evidence_id || row.evidenceId || row.id,
  caseId: row.case_id || row.caseId,
  name: row.name || row.file_name || row.fileName || 'Evidence Item',
  type: row.type || 'IMAGE',
  fileName: row.file_name || row.fileName || row.name || 'evidence.jpg',
  mimeType: row.mime_type || row.mimeType || undefined,
  fileSizeBytes: row.file_size_bytes ? Number(row.file_size_bytes) : undefined,
  uploadedBy: row.uploaded_by_name || row.uploaded_by || row.uploadedBy || 'Unknown',
  role: row.uploaded_by_role || 'POLICE',
  timestamp: row.created_at || row.timestamp || new Date().toISOString(),
  uploadedAt: row.created_at || row.uploadedAt || new Date().toISOString(),
  location: row.collected_location || row.location || 'Crime Scene',
  fileHash: row.file_hash || row.fileHash || row.hash || '',
  metadataHash: row.metadata_hash || row.metadataHash || '',
  custodian: row.custodian_display_name || row.current_custodian_name || row.current_custodian_id || row.custodian || 'Unassigned',
  currentCustodianName: row.current_custodian_name || row.custodian_display_name || undefined,
  ownerMsp: row.owner_msp || row.ownerMsp || 'PoliceMSP',
  transferTargetMsp: row.transfer_target_msp || row.transferTargetMsp || undefined,
  integrityStatus: (row.integrity_status || row.integrityStatus || 'UNVERIFIED') as IntegrityStatus,
  lastVerifiedAt: row.last_verified_at || row.lastVerifiedAt || undefined,
  approvedForLegal: row.approved_for_legal || row.approvedForLegal || false,
  classification: (row.classification || 'SECONDARY') as EvidenceClassification,
  riskLevel: (row.risk_level || row.riskLevel || 'LOW') as 'LOW' | 'MEDIUM' | 'HIGH',
  sourceHash: row.source_hash || row.sourceHash || undefined,
  liftingVideo: row.lifting_video_url || row.liftingVideo || undefined,
  liftingVideoHash: row.lifting_video_hash || row.liftingVideoHash || undefined,
  section63Certificate: row.section63Certificate || row.section63_cert_ref || undefined,
  section63CertId: row.section63_cert_id || row.section63CertId || undefined,
  fileUrl: row.uri || row.file_url || row.fileUrl || undefined,
  blockchainTxId: row.blockchain_tx_id || row.blockchainTxId || undefined,
  onChainStatus: row.on_chain_status || row.onChainStatus || 'PENDING',
  collectedTimestamp: row.collected_timestamp || row.collectedTimestamp || undefined,
  linkedEvidenceIds: row.linked_evidence_ids 
    ? (Array.isArray(row.linked_evidence_ids) ? row.linked_evidence_ids : (() => { try { return JSON.parse(row.linked_evidence_ids); } catch { return []; } })())
    : [],
  visibility: row.visibility || {
    isRestricted: row.is_restricted || false,
    allowedRoles: row.allowed_roles || [],
    allowedDesignations: row.allowed_designations || [],
    allowedUserIds: row.allowed_user_ids || [],
  },
  notes: row.notes || undefined,
});

const mapDbDocumentToDocument = (row: any): LegalDocument => ({
  id: row.document_id || row.id,
  caseId: row.case_id || row.caseId,
  title: row.title,
  type: row.type,
  description: row.description || '',
  fileUrl: row.file_url || '',
  fileHash: row.file_hash || '',
  uploadedBy: row.uploaded_by || 'Unknown',
  uploadedAt: row.created_at || new Date().toISOString(),
  linkedEvidenceIds: row.linked_evidence_ids || [],
});

const mapDbLogToLog = (row: any): AccessLog => ({
  id: row.log_id || row.id,
  caseId: row.case_id || row.caseId,
  evidenceId: row.evidence_id || row.evidenceId,
  accessedBy: row.user_name || row.user_id || row.accessedBy || 'Unknown',
  role: row.user_role || row.role || 'POLICE',
  timestamp: row.timestamp || new Date().toISOString(),
  action: row.action,
  details: row.detail_title || row.details || row.action,
  ipAddress: row.ip_address || row.source || '127.0.0.1',
});

export const StoreProvider = ({ children }: { children?: ReactNode }) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    return !!localStorage.getItem('kaaval_user');
  });
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    try {
      const saved = localStorage.getItem('kaaval_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [cases, setCases] = useState<Case[]>(INITIAL_CASES);
  const [evidence, setEvidence] = useState<Evidence[]>(INITIAL_EVIDENCE);
  const [logs, setLogs] = useState<AccessLog[]>(INITIAL_LOGS);
  const [documents, setDocuments] = useState<LegalDocument[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  // Initialize Theme
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') as 'light' | 'dark';
    if (savedTheme) {
      setTheme(savedTheme);
      document.documentElement.classList.toggle('dark', savedTheme === 'dark');
    } else if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
      setTheme('dark');
      document.documentElement.classList.add('dark');
    }
  }, []);

  const loadData = async () => {
    try {
      const [usersRes, casesRes, evidenceRes, docsRes, logsRes] = await Promise.allSettled([
        fetch(`${API_BASE}/api/users`),
        fetch(`${API_BASE}/api/cases`),
        fetch(`${API_BASE}/api/evidence`),
        fetch(`${API_BASE}/api/documents`),
        fetch(`${API_BASE}/api/logs`),
      ]);

      if (usersRes.status === 'fulfilled' && usersRes.value.ok) {
        const payload = await usersRes.value.json();
        if (Array.isArray(payload)) {
          setUsers(payload.map(mapDbUserToUser));
        }
      }

      if (casesRes.status === 'fulfilled' && casesRes.value.ok) {
        const payload = await casesRes.value.json();
        if (Array.isArray(payload)) {
          setCases(payload.map(mapDbCaseToCase));
        }
      }

      if (evidenceRes.status === 'fulfilled' && evidenceRes.value.ok) {
        const payload = await evidenceRes.value.json();
        if (Array.isArray(payload)) {
          setEvidence(payload.map(mapDbEvidenceToEvidence));
        }
      }

      if (docsRes.status === 'fulfilled' && docsRes.value.ok) {
        const payload = await docsRes.value.json();
        if (Array.isArray(payload)) {
          setDocuments(payload.map(mapDbDocumentToDocument));
        }
      }

      if (logsRes.status === 'fulfilled' && logsRes.value.ok) {
        const payload = await logsRes.value.json();
        if (Array.isArray(payload)) {
          setLogs(payload.map(mapDbLogToLog));
        }
      }
    } catch (error) {
      console.error('Failed to load data from unified backend', error);
    }
  };

  useEffect(() => {
    loadData();

    // Auto-sync polling every 5 seconds so live changes from mobile/backend appear automatically
    const interval = setInterval(() => {
      loadData();
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const toggleTheme = () => {
    setTheme(prev => {
      const newTheme = prev === 'light' ? 'dark' : 'light';
      localStorage.setItem('theme', newTheme);
      document.documentElement.classList.toggle('dark', newTheme === 'dark');
      return newTheme;
    });
  };

  const addLog = (logData: Omit<AccessLog, 'id' | 'timestamp'>) => {
    const newLog: AccessLog = {
      ...logData,
      id: `log_${Date.now()}`,
      timestamp: new Date().toISOString()
    };
    setLogs(prev => [newLog, ...prev]);

    // Persist audit log to PostgreSQL backend
    fetch(`${API_BASE}/api/logs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        caseId: logData.caseId,
        evidenceId: logData.evidenceId,
        action: logData.action,
        accessedBy: logData.accessedBy,
        role: logData.role,
        details: logData.details,
        result: 'SUCCESS',
      }),
    }).catch(err => {
      console.error('Failed to persist audit log to backend', err);
    });
  };

  const login = (user: User) => {
    setCurrentUser(user);
    setIsAuthenticated(true);
    localStorage.setItem('kaaval_user', JSON.stringify(user));
    
    addLog({
        accessedBy: user.id,
        role: user.role,
        action: 'LOGIN',
        details: 'User logged in'
    });

    // Refresh state from backend
    loadData();
  };

  const logout = () => {
    if (currentUser) {
        addLog({
            accessedBy: currentUser.id,
            role: currentUser.role,
            action: 'LOGOUT',
            details: 'User logged out'
        });

        fetch(`${API_BASE}/api/auth/logout`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: currentUser.id }),
        }).catch(() => {});
    }
    
    localStorage.removeItem('kaaval_user');
    setCurrentUser(null);
    setIsAuthenticated(false);
  };

  const updateUser = (updatedUser: User) => {
    setUsers(prev => prev.map(u => u.id === updatedUser.id ? updatedUser : u));
    if (currentUser && currentUser.id === updatedUser.id) {
        setCurrentUser(updatedUser);
    }
    if (currentUser) {
        addLog({
            accessedBy: currentUser.id,
            role: currentUser.role,
            action: 'UPDATE_USER',
            details: `Updated profile for ${updatedUser.name} (${updatedUser.role})`
        });
    }

    fetch(`${API_BASE}/api/users/${updatedUser.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...updatedUser,
        actorId: currentUser?.id,
        actorRole: currentUser?.role
      })
    }).catch((error) => {
      console.error('Failed to update user', error);
    });
  };

  const addCase = (newCase: Case) => {
    const rawStatus = (newCase.status || 'OPEN').toString().toUpperCase().replace(/\s+/g, '_');
    const normalizedStatus = (Object.values(CaseStatus).includes(rawStatus as CaseStatus) ? rawStatus : CaseStatus.OPEN) as CaseStatus;
    const caseToSave = { ...newCase, status: normalizedStatus };

    setCases(prev => [caseToSave, ...prev]);
    if (currentUser) {
        addLog({
            caseId: newCase.caseId,
            accessedBy: currentUser.id,
            role: currentUser.role,
            action: 'CREATE_CASE',
            details: `Created case ${newCase.caseId}`
        });
    }

    fetch(`${API_BASE}/api/cases`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        caseId: caseToSave.caseId,
        title: caseToSave.title,
        description: caseToSave.description,
        status: normalizedStatus,
        currentCustodian: caseToSave.currentCustodian,
        createdBy: caseToSave.createdBy || currentUser?.id,
        assignedToForensics: caseToSave.assignedToForensics,
        actorId: currentUser?.id,
        actorRole: currentUser?.role,
      }),
    }).then(async (res) => {
      if (res.ok) {
        const saved = await res.json();
        setCases(prev => prev.map(c => c.caseId === newCase.caseId ? mapDbCaseToCase(saved) : c));
      }
    }).catch(err => {
      console.error('Failed to create case in unified backend', err);
    });
  };

  const addEvidence = (newEvidence: Evidence) => {
    // Determine classification based on presence of sourceHash and liftingVideo
    const classification = (newEvidence.sourceHash && newEvidence.liftingVideo) 
        ? EvidenceClassification.PRIMARY 
        : (newEvidence.classification || EvidenceClassification.SECONDARY);
    
    const processedEvidence: Evidence = { 
      ...newEvidence, 
      classification,
      riskLevel: newEvidence.riskLevel || 'LOW',
      integrityStatus: newEvidence.integrityStatus || IntegrityStatus.NOT_CHECKED,
      onChainStatus: newEvidence.onChainStatus || 'BLOCKCHAIN_PENDING',
      ownerMsp: newEvidence.ownerMsp || 'PoliceMSP',
      custodian: newEvidence.custodian || currentUser?.name || currentUser?.id || 'Unassigned',
      currentCustodianName: newEvidence.currentCustodianName || currentUser?.name || 'Unassigned',
      uploadedBy: newEvidence.uploadedBy || currentUser?.name || currentUser?.id || 'Unknown',
      role: newEvidence.role || currentUser?.role || UserRole.POLICE,
    };

    setEvidence(prev => [processedEvidence, ...prev]);
    if (currentUser) {
        addLog({
            evidenceId: newEvidence.evidenceId,
            caseId: newEvidence.caseId,
            accessedBy: currentUser.id,
            role: currentUser.role,
            action: 'UPLOAD',
            details: `Uploaded ${newEvidence.fileName} (${newEvidence.type}) as ${classification} [Risk: ${processedEvidence.riskLevel}]`
        });
    }

    fetch(`${API_BASE}/api/evidence`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        evidenceId: newEvidence.evidenceId,
        caseId: newEvidence.caseId,
        name: newEvidence.name || newEvidence.fileName,
        fileName: newEvidence.fileName,
        type: newEvidence.type,
        mimeType: newEvidence.mimeType,
        fileSizeBytes: newEvidence.fileSizeBytes,
        fileUrl: newEvidence.fileUrl,
        fileHash: newEvidence.fileHash,
        metadataHash: newEvidence.metadataHash,
        sourceHash: newEvidence.sourceHash || newEvidence.fileHash,
        liftingVideo: newEvidence.liftingVideo,
        liftingVideoHash: newEvidence.liftingVideoHash,
        classification,
        riskLevel: processedEvidence.riskLevel,
        integrityStatus: processedEvidence.integrityStatus,
        location: newEvidence.location,
        timestamp: newEvidence.timestamp,
        notes: newEvidence.notes,
        linkedEvidenceIds: newEvidence.linkedEvidenceIds || [],
        visibility: newEvidence.visibility,
        custodian: currentUser?.id,
        currentCustodianName: currentUser?.name,
        uploadedBy: currentUser?.id,
        role: currentUser?.role,
        actorId: currentUser?.id,
        actorRole: currentUser?.role,
      }),
    }).then(async (res) => {
      if (res.ok) {
        const saved = await res.json();
        setEvidence(prev => prev.map(e => e.evidenceId === newEvidence.evidenceId ? mapDbEvidenceToEvidence(saved) : e));
      }
    }).catch(err => console.error('Failed to save evidence to unified backend', err));
  };

  const addDocument = (doc: LegalDocument) => {
    setDocuments(prev => [doc, ...prev]);
    if (currentUser) {
        addLog({
            caseId: doc.caseId,
            accessedBy: currentUser.id,
            role: currentUser.role,
            action: 'CREATE_DOC',
            details: `Created ${doc.type}: ${doc.title}`
        });
    }

    fetch(`${API_BASE}/api/documents`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        caseId: doc.caseId,
        title: doc.title,
        type: doc.type,
        description: doc.description,
        uploadedBy: currentUser?.id,
        linkedEvidenceIds: doc.linkedEvidenceIds,
        actorId: currentUser?.id,
        actorRole: currentUser?.role,
      }),
    }).catch(err => console.error('Failed to create document in unified backend', err));
  };

  const updateCaseStatus = (caseId: string, status: CaseStatus) => {
    const rawStatus = (status || 'OPEN').toString().toUpperCase().replace(/\s+/g, '_');
    const normalizedStatus = (Object.values(CaseStatus).includes(rawStatus as CaseStatus) ? rawStatus : CaseStatus.OPEN) as CaseStatus;

    setCases(prev => prev.map(c => c.caseId === caseId ? { ...c, status: normalizedStatus } : c));
    if (currentUser) {
        addLog({
            caseId,
            accessedBy: currentUser.id,
            role: currentUser.role,
            action: 'APPROVE',
            details: `Status changed to ${normalizedStatus}`
        });
    }

    fetch(`${API_BASE}/api/cases/${caseId}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        status: normalizedStatus,
        actorId: currentUser?.id,
        actorRole: currentUser?.role,
      }),
    }).catch(err => {
      console.error('Failed to update case status in unified backend', err);
    });
  };

  const verifyEvidence = (evidenceId: string) => {
    const target = evidence.find(e => e.evidenceId === evidenceId);
    const isCompromised = target?.integrityStatus === IntegrityStatus.COMPROMISED;
    const newStatus = isCompromised ? IntegrityStatus.COMPROMISED : IntegrityStatus.VERIFIED;

    setEvidence(prev => prev.map(e => e.evidenceId === evidenceId ? { ...e, integrityStatus: newStatus } : e));
    if (currentUser) {
        addLog({
            evidenceId,
            accessedBy: currentUser.id,
            role: currentUser.role,
            action: 'VERIFY',
            details: 'Run integrity verification check'
        });
    }

    fetch(`${API_BASE}/api/forensics/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        evidenceId,
        verifiedHash: target?.fileHash,
        actorId: currentUser?.id,
        actorRole: currentUser?.role,
        notes: `Forensic verification performed by ${currentUser?.name || 'Analyst'}`,
      }),
    }).catch(err => console.error('Failed to submit forensic verification to unified backend', err));
  };

  const approveEvidence = (evidenceId: string) => {
    const target = evidence.find(e => e.evidenceId === evidenceId);
    const canBeApproved = target?.classification === EvidenceClassification.PRIMARY || !!target?.section63Certificate;
    
    if (!canBeApproved) {
        alert("Cannot approve Secondary evidence without a Section 63 Certificate.");
        return;
    }

    setEvidence(prev => prev.map(e => e.evidenceId === evidenceId ? { ...e, approvedForLegal: true } : e));
    if (currentUser) {
         addLog({
            evidenceId,
            accessedBy: currentUser.id,
            role: currentUser.role,
            action: 'APPROVE',
            details: 'Evidence approved for legal proceedings'
        });
    }

    fetch(`${API_BASE}/api/evidence/${evidenceId}/approve`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        actorId: currentUser?.id,
        actorRole: currentUser?.role,
      }),
    }).catch(err => console.error('Failed to approve evidence in unified backend', err));
  };

  const toggleIntegrityHack = (evidenceId: string) => {
    setEvidence(prev => prev.map(e => {
      if (e.evidenceId === evidenceId) {
        const newStatus = e.integrityStatus === IntegrityStatus.COMPROMISED ? IntegrityStatus.VERIFIED : IntegrityStatus.COMPROMISED;
        return { ...e, integrityStatus: newStatus };
      }
      return e;
    }));
  };

  const updateEvidenceVisibility = (evidenceId: string, visibility: EvidenceVisibility) => {
    setEvidence(prev => prev.map(e => {
        if (e.evidenceId === evidenceId) {
            return { ...e, visibility };
        }
        return e;
    }));
    
    if (currentUser) {
        addLog({
            evidenceId,
            accessedBy: currentUser.id,
            role: currentUser.role,
            action: 'VISIBILITY_UPDATE',
            details: `Access controls updated${visibility.isRestricted ? ' (Restricted)' : ' (Public)'}`
        });
    }

    fetch(`${API_BASE}/api/evidence/${evidenceId}/visibility`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        visibility,
        actorId: currentUser?.id,
        actorRole: currentUser?.role,
      }),
    }).catch(err => console.error('Failed to update visibility in unified backend', err));
  };

  const transferCaseCustody = (caseId: string, newCustodianId: string, newCustodianRole: string, notes?: string) => {
      // Find user name if possible
      const targetUser = users.find(u => u.id === newCustodianId);
      const custodianName = targetUser ? targetUser.name : newCustodianId;

      setCases(prev => prev.map(c => {
          if (c.caseId === caseId) {
              return { ...c, currentCustodian: custodianName };
          }
          return c;
      }));

      if (currentUser) {
          addLog({
              caseId,
              accessedBy: currentUser.id,
              role: currentUser.role,
              action: 'TRANSFER_CUSTODY',
              details: `Case custody transferred to ${custodianName} (${newCustodianRole}). ${notes || ''}`
          });
      }

      fetch(`${API_BASE}/api/cases/${caseId}/transfer-custody`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          newCustodianId,
          newCustodianRole,
          notes,
          actorId: currentUser?.id,
          actorRole: currentUser?.role,
        }),
      }).catch(err => {
        console.error('Failed to transfer case custody in unified backend', err);
      });
  };

  const issueSection63Certificate = (evidenceId: string, certificateRef: string) => {
      setEvidence(prev => prev.map(e => {
          if (e.evidenceId === evidenceId) {
              return { ...e, section63Certificate: certificateRef };
          }
          return e;
      }));

      if (currentUser) {
          addLog({
              evidenceId,
              accessedBy: currentUser.id,
              role: currentUser.role,
              action: 'ISSUE_CERT',
              details: 'Section 63 Certificate issued for Secondary Evidence'
          });
      }

      fetch(`${API_BASE}/api/evidence/${evidenceId}/section63`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          certificateRef,
          actorId: currentUser?.id,
          actorRole: currentUser?.role,
        }),
      }).catch(err => console.error('Failed to issue Section 63 Certificate in unified backend', err));
  };

  return (
    <StoreContext.Provider value={{
      isAuthenticated,
      currentUser,
      cases,
      evidence,
      logs,
      documents,
      users,
      theme,
      toggleTheme,
      login,
      logout,
      updateUser,
      addCase,
      addEvidence,
      addLog,
      addDocument,
      updateCaseStatus,
      verifyEvidence,
      approveEvidence,
      toggleIntegrityHack,
      updateEvidenceVisibility,
      transferCaseCustody,
      issueSection63Certificate
    }}>
      {children}
    </StoreContext.Provider>
  );
};

export const useStore = () => {
  const context = useContext(StoreContext);
  if (!context) throw new Error("useStore must be used within StoreProvider");
  return context;
};
