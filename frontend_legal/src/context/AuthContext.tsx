import React, { createContext, ReactNode, useContext, useEffect, useState } from 'react';
import { LegalUser } from '../types';
import { DEMO_ACCOUNTS } from '../data/mockData';

const STORAGE_KEY = 'cms_session_user_id';

interface AuthContextValue {
  user: LegalUser | null;
  isAuthenticated: boolean;
  login: (email: string) => LegalUser | null;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<LegalUser | null>(null);

  useEffect(() => {
    const savedId = localStorage.getItem(STORAGE_KEY);
    if (savedId) {
      const found = DEMO_ACCOUNTS.find((u) => u.id === savedId);
      if (found) setUser(found);
    }
  }, []);

  const login = (email: string): LegalUser | null => {
    const found = DEMO_ACCOUNTS.find((u) => u.email.toLowerCase() === email.trim().toLowerCase());
    if (found) {
      setUser(found);
      localStorage.setItem(STORAGE_KEY, found.id);
      return found;
    }
    return null;
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem(STORAGE_KEY);
  };

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
