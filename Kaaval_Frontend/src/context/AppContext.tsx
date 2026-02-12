import React, { useState, createContext, useContext, ReactNode, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { User, Case } from '../types';
import { MOCK_LEDGER, USERS as INITIAL_USERS } from '../data/mockData';
import { apiService } from '../services/api';

interface AppContextType {
  user: User | null;
  users: User[];
  setUser: (user: User | null) => void;
  registerUser: (newUser: User) => void;
  cases: Case[];
  addCase: (newCase: Case) => void;
  updateCaseEvidence: (caseId: string, evidence: any) => void;
  loading: boolean;
  error: string | null;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [cases, setCases] = useState<Case[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 1. Load Data on Startup
  useEffect(() => {
    const loadData = async () => {
      try {
        // Load Cases from backend; fallback to local mocks
        const remoteCases = await apiService.listCases();
        if (remoteCases) {
          setCases(remoteCases);
          await AsyncStorage.setItem('cases', JSON.stringify(remoteCases));
        } else {
          setCases(MOCK_LEDGER);
        }

        // Load Users (local only for now)
        const storedUsers = await AsyncStorage.getItem('users');
        if (storedUsers) {
          setUsers(JSON.parse(storedUsers));
        } else {
          setUsers(INITIAL_USERS);
          await AsyncStorage.setItem('users', JSON.stringify(INITIAL_USERS));
        }
      } catch (e) {
        console.error("Failed to load persistence", e);
      }
    };
    loadData();
  }, []);

  // 2. Register New User (Persisted)
  const registerUser = async (newUser: User) => {
    const updatedUsers = [...users, newUser];
    setUsers(updatedUsers);
    await AsyncStorage.setItem('users', JSON.stringify(updatedUsers));
  };

  // 3. Add New Case (Persisted + API)
  const addCase = async (newCase: Case) => {
    setLoading(true);
    setError(null);
    try {
      const payload: Case = {
        ...newCase,
        timestamp: newCase.timestamp || new Date().toISOString(),
        blockchainHash: newCase.blockchainHash || 'pending',
      };

      const created = await apiService.createCase(payload, {
        userId: user?.id,
        userRole: user?.role?.toUpperCase(),
        userOrg: 'POLICE',
      });
      const updatedCases = created ? [created, ...cases] : [payload, ...cases];
      setCases(updatedCases);
      await AsyncStorage.setItem('cases', JSON.stringify(updatedCases));
    } catch (err: any) {
      setError(err.message);
      console.error('Failed to add case', err);
    } finally {
      setLoading(false);
    }
  };

  // 4. Update Evidence (Persisted + API)
  const updateCaseEvidence = async (caseId: string, newEvidence: any) => {
    setLoading(true);
    setError(null);
    try {
      const hash = newEvidence.hash || '0x' + Math.random().toString(16).substr(2, 64);
      console.log('updateCaseEvidence -> upload', { caseId, uri: newEvidence.uri, hash });
      const uploadResp = await apiService.uploadCaseEvidence(caseId, newEvidence.uri, {
        name: newEvidence.name,
        location: newEvidence.location,
        type: newEvidence.mimeType || newEvidence.type,
        timestamp: newEvidence.timestamp,
        hash,
        userId: user?.id,
        userRole: user?.role?.toUpperCase(),
        userOrg: 'POLICE',
      });

      const savedEvidence = uploadResp?.evidence || { ...newEvidence, hash };
      const updatedCases = cases.map(c => {
        if (c.caseId === caseId) {
          const existingEvidence = c.evidence || [];
          return { ...c, evidence: [savedEvidence, ...existingEvidence] };
        }
        return c;
      });

      setCases(updatedCases);
      await AsyncStorage.setItem('cases', JSON.stringify(updatedCases));
    } catch (err: any) {
      setError(err.message);
      console.error('Failed to update case evidence', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppContext.Provider value={{ user, setUser, users, registerUser, cases, addCase, updateCaseEvidence, loading, error }}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within an AppProvider');
  return context;
};