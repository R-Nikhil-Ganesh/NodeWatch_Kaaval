import React from 'react';
import { Navigate, Route, HashRouter as Router, Routes } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ProtectedRoute } from './components/layout/ProtectedRoute';
import { CaseLayout } from './components/layout/CaseLayout';

import { OnboardingPage } from './pages/OnboardingPage';
import { LoginPage } from './pages/LoginPage';
import { ForgotPasswordPage } from './pages/ForgotPasswordPage';
import { HomePage } from './pages/HomePage';
import { ProfilePage } from './pages/ProfilePage';
import { CaseHomePage } from './pages/case/CaseHomePage';
import { CaseFilesPage } from './pages/case/CaseFilesPage';
import { EvidencePage } from './pages/case/EvidencePage';
import { AuditLogsPage } from './pages/case/AuditLogsPage';

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/" element={<OnboardingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />

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

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}
