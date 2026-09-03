import React, { createContext, ReactNode, useContext, useState } from 'react';
import { LegalUser } from '../types';
import { loginRequest, logoutRequest, setAuthToken } from '../services/api';

const USER_KEY = 'cms_session_user';
const TOKEN_KEY = 'cms_session_token';

// Restored synchronously (not in a useEffect) so `user` is already populated
// on the very first render — otherwise ProtectedRoute's isAuthenticated check
// runs before the effect fires and bounces every hard reload to /login.
const restoreSession = (): LegalUser | null => {
  try {
    const savedUser = localStorage.getItem(USER_KEY);
    const savedToken = localStorage.getItem(TOKEN_KEY);
    if (savedUser && savedToken) return JSON.parse(savedUser);
  } catch {
    localStorage.removeItem(USER_KEY);
    localStorage.removeItem(TOKEN_KEY);
  }
  return null;
};

interface PendingSession {
  user: LegalUser;
  token: string;
}

interface AuthContextValue {
  user: LegalUser | null;
  isAuthenticated: boolean;
  /** Stage 1: verifies email/password against the backend. Does NOT mark the
   *  session authenticated — that only happens once MFA is confirmed, so a
   *  user who abandons the MFA step is never left signed in. */
  verifyCredentials: (email: string, password: string) => Promise<LegalUser>;
  /** Stage 2: promotes the credential-verified session to fully authenticated. */
  confirmMfa: () => LegalUser | null;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<LegalUser | null>(restoreSession);
  const [pending, setPending] = useState<PendingSession | null>(null);

  const verifyCredentials = async (email: string, password: string): Promise<LegalUser> => {
    const { user: verifiedUser, token } = await loginRequest(email, password);
    setPending({ user: verifiedUser, token });
    return verifiedUser;
  };

  const confirmMfa = (): LegalUser | null => {
    if (!pending) return null;
    setAuthToken(pending.token);
    localStorage.setItem(USER_KEY, JSON.stringify(pending.user));
    setUser(pending.user);
    setPending(null);
    return pending.user;
  };

  const logout = () => {
    if (user) logoutRequest(user.id);
    setUser(null);
    setPending(null);
    setAuthToken(null);
    localStorage.removeItem(USER_KEY);
  };

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, verifyCredentials, confirmMfa, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
