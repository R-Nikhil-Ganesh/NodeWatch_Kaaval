
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Case, Evidence, AccessLog, User, UserRole, LegalDocument, CaseStatus, IntegrityStatus, EvidenceVisibility, EvidenceClassification } from './types';
import { INITIAL_CASES, INITIAL_EVIDENCE, INITIAL_LOGS, MOCK_USERS } from './constants';

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
  const [users, setUsers] = useState<User[]>(MOCK_USERS);
  
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
  };

  const addCase = (newCase: Case) => {
    setCases(prev => [newCase, ...prev]);
    if (currentUser) {
        addLog({
            caseId: newCase.caseId,
            accessedBy: currentUser.id,
            role: currentUser.role,
            action: 'CREATE_CASE',
            details: `Created case ${newCase.caseId}`
        });
    }
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
    setCases(prev => prev.map(c => c.caseId === caseId ? { ...c, status } : c));
    if (currentUser) {
        addLog({
            caseId,
            accessedBy: currentUser.id,
            role: currentUser.role,
            action: 'APPROVE',
            details: `Status changed to ${status}`
        });
    }
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
