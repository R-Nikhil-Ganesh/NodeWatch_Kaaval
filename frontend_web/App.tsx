import React, { useState } from 'react';
import { StoreProvider, useStore } from './store';
import { Layout } from './components/Layout';
import { AdminDashboard, ForensicsDashboard, PoliceDashboard, AdminUsersView, SystemLogsView } from './components/Dashboards';
import { CaseDetail } from './components/CaseViews';
import { ChainOfCustodyView } from './components/ChainOfCustody';
import { EvidenceVault } from './components/EvidenceVault';
import { Login } from './components/Login';
import { UserRole, User, DESIGNATIONS } from './types';
import { Table, Card, Button, Input } from './components/Common';
import { Upload, X } from 'lucide-react';
import { ChargeSheetView } from './components/ChargeSheetView';
import { CertificateManager } from './components/CertificateManager';
import { LegalApp } from './legal/LegalApp';
import { PoliceCasesPage } from './components/police/PoliceCasesPage';
import ForensicsPage from './components/police/ForensicsPage';
import { AuditLogPage } from './components/police/AuditLogPage';
import EvidenceDetailPage from './components/police/EvidenceDetailPage';
import { AlertsPage } from './components/police/AlertsPage';

const UserProfileModal = ({ 
  user, 
  currentUser, 
  isOpen, 
  onClose, 
  onSave 
}: { 
  user: User; 
  currentUser: User; 
  isOpen: boolean; 
  onClose: () => void; 
  onSave: (u: User) => void;
}) => {
  const [formData, setFormData] = useState<User>(user);
  const [isUploadingPfp, setIsUploadingPfp] = useState(false);
  const isAdmin = currentUser.role === UserRole.ADMIN;
  const isSelf = currentUser.id === user.id;

  // Reset form when user changes
  React.useEffect(() => {
    setFormData(user);
  }, [user]);

  if (!isOpen) return null;

  // Uploads the real file to the backend (stored in MinIO) and uses the
  // returned pre-signed URL. The previous `URL.createObjectURL(...)` blob:
  // URL only existed in this browser tab and broke on refresh or for anyone
  // else viewing the profile.
  const handlePfpUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingPfp(true);
    try {
      const apiBase = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000';
      const form = new FormData();
      form.append('avatar', file);
      const res = await fetch(`${apiBase}/api/users/${user.id}/avatar`, { method: 'POST', body: form });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        alert(body.message || 'Failed to upload profile picture.');
        return;
      }
      const saved = await res.json();
      setFormData({ ...formData, profileImage: saved.profileImageUri || saved.profile_image_url });
    } catch (err) {
      console.error('Avatar upload failed:', err);
      alert('Failed to upload profile picture. Please try again.');
    } finally {
      setIsUploadingPfp(false);
    }
  };

  const handleRoleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
      const newRole = e.target.value as UserRole;
      // Reset designation when role changes to avoid mismatch
      setFormData({ ...formData, role: newRole, designation: DESIGNATIONS[newRole][0] });
  };

  return (
    <div className="fixed inset-0 bg-navy-950/40 backdrop-blur-[1px] flex items-center justify-center z-50 p-4">
        <Card className="w-full max-w-lg relative" title={isSelf ? "My Profile" : "Edit User"}>
            <button onClick={onClose} className="absolute top-4 right-4 text-ink-300 hover:text-ink-900">
                <X size={20} />
            </button>

            <div className="space-y-6 mt-2">
                {/* Profile Picture */}
                <div className="flex flex-col items-center">
                    <div className="w-24 h-24 rounded-full bg-paper-100 overflow-hidden mb-2 border-2 border-line-300">
                        {formData.profileImage ? (
                            <img src={formData.profileImage} alt="Profile" className="w-full h-full object-cover" />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center text-2xl font-bold text-navy-700">
                                {formData.name[0]}
                            </div>
                        )}
                    </div>
                    {/* Only allow PFP upload if it's the user themselves or Admin */}
                    <div className="relative">
                        <input type="file" id="pfp-upload" className="hidden" accept="image/*" onChange={handlePfpUpload} disabled={isUploadingPfp} />
                        <label htmlFor="pfp-upload" className={`text-xs flex items-center gap-1 text-navy-700 hover:text-navy-900 ${isUploadingPfp ? 'opacity-50 cursor-wait' : 'cursor-pointer'}`}>
                            <Upload size={12} /> {isUploadingPfp ? 'Uploading…' : 'Change Photo'}
                        </label>
                    </div>
                </div>

                <div className="grid gap-4">
                    <div>
                        <label className="block text-sm font-medium text-ink-700 mb-1">Full Name</label>
                        <Input
                            label=""
                            value={formData.name}
                            disabled={!isAdmin && !isSelf} // Only admin or self can edit name
                            onChange={e => setFormData({...formData, name: e.target.value})}
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-ink-700 mb-1">Email Address</label>
                        <Input
                            label=""
                            value={formData.email}
                            disabled={true} // Email is usually immutable identifier
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-ink-700 mb-1">Role</label>
                            {isAdmin ? (
                                <select
                                    className="w-full px-3.5 py-2.5 border border-line-300 rounded-sm bg-white text-ink-900 text-sm outline-none focus:border-navy-500 focus:ring-1 focus:ring-navy-500"
                                    value={formData.role}
                                    onChange={handleRoleChange}
                                >
                                    {Object.values(UserRole).map(r => (
                                        <option key={r} value={r}>{r}</option>
                                    ))}
                                </select>
                            ) : (
                                <Input label="" value={formData.role} disabled />
                            )}
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-ink-700 mb-1">Designation</label>
                            {isAdmin ? (
                                <select
                                    className="w-full px-3.5 py-2.5 border border-line-300 rounded-sm bg-white text-ink-900 text-sm outline-none focus:border-navy-500 focus:ring-1 focus:ring-navy-500"
                                    value={formData.designation}
                                    onChange={e => setFormData({...formData, designation: e.target.value})}
                                >
                                    {DESIGNATIONS[formData.role].map(d => (
                                        <option key={d} value={d}>{d}</option>
                                    ))}
                                </select>
                            ) : (
                                <Input label="" value={formData.designation} disabled />
                            )}
                        </div>
                    </div>
                </div>

                <div className="flex justify-end pt-4 border-t border-line-200">
                    <Button onClick={() => onSave(formData)}>Save Changes</Button>
                </div>
            </div>
        </Card>
    </div>
  );
};

interface ErrorBoundaryProps {
  children: React.ReactNode;
  onReset: () => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

// Declared at module scope (not inside Main) so its class identity is stable
// across renders — nesting it inside a component previously forced React to
// remount this boundary's whole subtree (losing all local state, e.g. any
// open modal) on every re-render of Main, since each render produced a "new"
// ErrorBoundary type.
class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error("View render error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-8 text-center max-w-lg mx-auto my-12 bg-white border border-line-300 rounded shadow-card">
          <div className="w-12 h-12 bg-status-urgentBg text-status-urgent rounded-full flex items-center justify-center mx-auto mb-3">
            <X size={24} />
          </div>
          <h3 className="text-lg font-bold text-navy-900 mb-1">View Rendering Notice</h3>
          <p className="text-xs text-ink-500 mb-4">{this.state.error?.message || "An unexpected error occurred while rendering this page."}</p>
          <Button
            onClick={() => {
              this.setState({ hasError: false, error: null });
              this.props.onReset();
            }}
          >
            Return to Dashboard
          </Button>
        </div>
      );
    }
    return this.props.children;
  }
}

const Main = () => {
  const { currentUser, logs, cases, isAuthenticated, updateUser, logout } = useStore();
  const [view, setView] = useState('dashboard');
  const [selectedCaseId, setSelectedCaseId] = useState<string | undefined>(undefined);
  const [selectedEvidenceId, setSelectedEvidenceId] = useState<string | undefined>(undefined);
  
  // Profile Modal State
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);

  // `id` is an evidenceId for evidence/custody destinations and a real
  // caseId (e.g. "CASE-2026-142") everywhere else. Keeping the two in
  // separate slots stops a case id from overwriting the selected exhibit.
  const handleNavigate = (destination: string, id?: string) => {
    setView(destination);
    if (!id) return;
    if (destination === 'evidence_detail' || destination === 'custody') {
      setSelectedEvidenceId(id);
    } else {
      setSelectedCaseId(id);
    }
  };

  const handleOpenProfile = () => {
      if (currentUser) {
          setEditingUser(currentUser);
          setIsProfileModalOpen(true);
      }
  };

  const handleEditUser = (user: User) => {
      setEditingUser(user);
      setIsProfileModalOpen(true);
  };

  const handleSaveUser = (updatedUser: User) => {
      updateUser(updatedUser);
      setIsProfileModalOpen(false);
      setEditingUser(null);
  };

  // If not authenticated, show Login page
  if (!isAuthenticated || !currentUser) {
      return <Login />;
  }

  // LEGAL users get the dedicated Court Management System pages ported from
  // the standalone Legal app (its own layout/theme, kept as-is for now) —
  // bypass this app's sidebar Layout and dashboards entirely for that role.
  if (currentUser.role === UserRole.LEGAL) {
      return <LegalApp onLogout={logout} />;
  }

  // Router Switch
  const renderContent = () => {
    if (view === 'case_detail') {
        const id = selectedCaseId || cases[0]?.caseId;
        if (!id) {
            return (
                <div className="p-12 text-center text-ink-500">
                    No case selected, and no cases are available yet.
                </div>
            );
        }
        return <CaseDetail caseId={id} onBack={() => setView('cases')} />;
    }

    if (view === 'evidence_detail') {
        if (!selectedEvidenceId) {
            return <div className="p-12 text-center text-ink-500">No evidence item selected.</div>;
        }
        return (
            <EvidenceDetailPage
                evidenceId={selectedEvidenceId}
                onNavigate={handleNavigate}
                onBack={() => setView('evidence_vault')}
            />
        );
    }

    if (view === 'alerts') {
        return <AlertsPage onNavigate={handleNavigate} />;
    }

    if (view === 'cases') {
        return <PoliceCasesPage onNavigate={handleNavigate} />;
    }

    if (view === 'custody') {
        return <ChainOfCustodyView />;
    }

    if (view === 'evidence_vault') {
        return <EvidenceVault />;
    }
    
    if (view === 'forensics') {
        return <ForensicsPage onNavigate={handleNavigate} />;
    }

    if (view === 'charge_sheets') {
        return <ChargeSheetView />;
    }

    if (view === 'audit_log') {
        return <AuditLogPage onNavigate={handleNavigate} />;
    }

    if (view === 'certificates' && currentUser.role === UserRole.FORENSICS) {
        return <CertificateManager />;
    }

    if (view === 'users' && currentUser.role === UserRole.ADMIN) {
        return <AdminUsersView onEditUser={handleEditUser} />;
    }

    if (view === 'logs') {
        return <SystemLogsView />;
    }
    
    // Default: Dashboard based on role
    switch (currentUser.role) {
      case UserRole.POLICE:
        return <PoliceDashboard onNavigate={handleNavigate} />;
      case UserRole.FORENSICS:
        return <ForensicsDashboard onNavigate={handleNavigate} />;
      case UserRole.ADMIN:
        return <AdminDashboard onNavigate={handleNavigate} />;
      default:
        return <div>Access Denied</div>;
    }
  };

  return (
    <>
        <Layout setView={setView} onOpenProfile={handleOpenProfile} currentView={view}>
            <ErrorBoundary onReset={() => setView('dashboard')}>
              {renderContent()}
            </ErrorBoundary>
        </Layout>
        
        {editingUser && (
            <UserProfileModal 
                isOpen={isProfileModalOpen}
                onClose={() => setIsProfileModalOpen(false)}
                user={editingUser}
                currentUser={currentUser}
                onSave={handleSaveUser}
            />
        )}
    </>
  );
};

export default function App() {
  return (
    <StoreProvider>
      <Main />
    </StoreProvider>
  );
}
