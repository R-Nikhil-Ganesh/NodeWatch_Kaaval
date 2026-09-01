
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

export const StoreProvider = ({ children }: { children?: ReactNode }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [cases, setCases] = useState<Case[]>(INITIAL_CASES);
  
  // Initialize Evidence with defaults if needed
  const [evidence, setEvidence] = useState<Evidence[]>(INITIAL_EVIDENCE.map(e => ({
      ...e,
      visibility: e.visibility || {
          isRestricted: false,
          allowedRoles: [],
          allowedDesignations: [],
          allowedUserIds: []
      }
  })));
  
  const [logs, setLogs] = useState<AccessLog[]>(INITIAL_LOGS);
  const [documents, setDocuments] = useState<LegalDocument[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  
  // Theme State
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

  useEffect(() => {
    let isMounted = true;

    const loadInitialData = async () => {
      try {
        const [usersRes, casesRes] = await Promise.allSettled([
          fetch(`${API_BASE}/api/users`),
          fetch(`${API_BASE}/api/cases`),
        ]);

        if (usersRes.status === 'fulfilled' && usersRes.value.ok) {
          const payload = await usersRes.value.json();
          if (isMounted && Array.isArray(payload)) {
            setUsers(payload.map(mapDbUserToUser));
          }
        }

        if (casesRes.status === 'fulfilled' && casesRes.value.ok) {
          const payload = await casesRes.value.json();
          if (isMounted && Array.isArray(payload) && payload.length > 0) {
            setCases(payload.map(mapDbCaseToCase));
          }
        }
      } catch (error) {
        console.error('Failed to load initial data from backend_web', error);
      }
    };

    loadInitialData();

    return () => {
      isMounted = false;
    };
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
  };

  const login = (user: User) => {
    setCurrentUser(user);
    setIsAuthenticated(true);
    addLog({
        accessedBy: user.id,
        role: user.role,
        action: 'LOGIN',
        details: 'User logged in'
    });
  };

  const logout = () => {
    if (currentUser) {
        addLog({
            accessedBy: currentUser.id,
            role: currentUser.role,
            action: 'LOGOUT',
            details: 'User logged out'
        });
    }
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
      console.error('Failed to create case in backend_web', err);
    });
  };

  const addEvidence = (newEvidence: Evidence) => {
    // Determine classification based on presence of sourceHash and liftingVideo
    const classification = (newEvidence.sourceHash && newEvidence.liftingVideo) 
        ? EvidenceClassification.PRIMARY 
        : EvidenceClassification.SECONDARY;
    
    const processedEvidence = { ...newEvidence, classification };

    setEvidence(prev => [...prev, processedEvidence]);
    if (currentUser) {
        addLog({
            evidenceId: newEvidence.evidenceId,
            caseId: newEvidence.caseId,
            accessedBy: currentUser.id,
            role: currentUser.role,
            action: 'UPLOAD',
            details: `Uploaded ${newEvidence.fileName} (${newEvidence.type}) as ${classification}`
        });
    }
  };

  const addDocument = (doc: LegalDocument) => {
    setDocuments(prev => [...prev, doc]);
    if (currentUser) {
        addLog({
            caseId: doc.caseId,
            accessedBy: currentUser.id,
            role: currentUser.role,
            action: 'CREATE_DOC',
            details: `Created ${doc.type}: ${doc.title}`
        });
    }
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
      console.error('Failed to update case status in backend_web', err);
    });
  };

  const verifyEvidence = (evidenceId: string) => {
    setEvidence(prev => prev.map(e => {
      if (e.evidenceId === evidenceId) {
        const isCompromised = e.integrityStatus === IntegrityStatus.COMPROMISED;
        return { ...e, integrityStatus: isCompromised ? IntegrityStatus.COMPROMISED : IntegrityStatus.VERIFIED };
      }
      return e;
    }));
    if (currentUser) {
        addLog({
            evidenceId,
            accessedBy: currentUser.id,
            role: currentUser.role,
            action: 'VERIFY',
            details: 'Run integrity verification check'
        });
    }
  };

  const approveEvidence = (evidenceId: string) => {
    // Only allow approval if Primary OR has Section 63 Certificate
    setEvidence(prev => prev.map(e => {
        if (e.evidenceId !== evidenceId) return e;
        
        // Validation check
        const canBeApproved = e.classification === EvidenceClassification.PRIMARY || !!e.section63Certificate;
        
        if (!canBeApproved) {
            alert("Cannot approve Secondary evidence without a Section 63 Certificate.");
            return e;
        }

        return { ...e, approvedForLegal: true };
    }));

    // Log logic happens outside map to avoid duplication or requires finding the item first. 
    // Simplified here for the store structure
    const target = evidence.find(e => e.evidenceId === evidenceId);
    if (target && currentUser && (target.classification === EvidenceClassification.PRIMARY || target.section63Certificate)) {
         addLog({
            evidenceId,
            accessedBy: currentUser.id,
            role: currentUser.role,
            action: 'APPROVE',
            details: 'Evidence approved for legal proceedings'
        });
    }
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
        console.error('Failed to transfer case custody in backend_web', err);
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
