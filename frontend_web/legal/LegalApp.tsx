import React, { ReactNode, useEffect } from 'react';
import { HashRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ProtectedRoute } from './components/layout/ProtectedRoute';
import { CaseLayout } from './components/layout/CaseLayout';
import { HomePage } from './pages/HomePage';
import { ProfilePage } from './pages/ProfilePage';
import { CaseHomePage } from './pages/case/CaseHomePage';
import { CaseFilesPage } from './pages/case/CaseFilesPage';
import { EvidencePage } from './pages/case/EvidencePage';
import { AuditLogsPage } from './pages/case/AuditLogsPage';
import './legal.css';

// The embedded Legal app has no /login page of its own (the unified shell's
// Login screen owns that). If the Legal session ever ends — logout, or the
// seeded localStorage session is missing/corrupt — fall back to `onLogout`
// instead of letting react-router try to navigate to a route that doesn't
// exist here.
const SessionGate = ({ onLogout, children }: { onLogout: () => void; children: ReactNode }) => {
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    if (!isAuthenticated) onLogout();
  }, [isAuthenticated, onLogout]);

  if (!isAuthenticated) return null;
  return <>{children}</>;
};

export const LegalApp = ({ onLogout }: { onLogout: () => void }) => (
  <div className="legal-app">
    <AuthProvider onLogout={onLogout}>
      <SessionGate onLogout={onLogout}>
        <HashRouter>
          <Routes>
            <Route path="/home" element={<ProtectedRoute><HomePage /></ProtectedRoute>} />
            <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />

            <Route
              path="/case/:caseId"
              element={<ProtectedRoute><CaseLayout /></ProtectedRoute>}
            >
              <Route index element={<Navigate to="home" replace />} />
              <Route path="home" element={<CaseHomePage />} />
              <Route path="files" element={<CaseFilesPage />} />
              <Route path="evidence" element={<EvidencePage />} />
              <Route path="audit-logs" element={<AuditLogsPage />} />
            </Route>

            <Route path="*" element={<Navigate to="/home" replace />} />
          </Routes>
        </HashRouter>
      </SessionGate>
    </AuthProvider>
  </div>
);
