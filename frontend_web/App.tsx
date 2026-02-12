
import React, { useState } from 'react';
import { StoreProvider, useStore } from './store';
import { Layout } from './components/Layout';
import { AdminDashboard, ForensicsDashboard, LegalDashboard, PoliceDashboard, AdminUsersView, SystemLogsView } from './components/Dashboards';
import { CaseDetail } from './components/CaseViews';
import { ChainOfCustodyView } from './components/ChainOfCustody';
import { EvidenceVault } from './components/EvidenceVault';
import { Login } from './components/Login';
import { UserRole, User, DESIGNATIONS } from './types';
import { Table, Card, Button, Input } from './components/Common';
import { Upload, X } from 'lucide-react';
import { ChargeSheetView } from './components/ChargeSheetView';
import { CertificateManager } from './components/CertificateManager';

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
  const isAdmin = currentUser.role === UserRole.ADMIN;
  const isSelf = currentUser.id === user.id;

  // Reset form when user changes
  React.useEffect(() => {
    setFormData(user);
  }, [user]);

  if (!isOpen) return null;

  const handlePfpUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
        // Mock upload - create object URL
        const url = URL.createObjectURL(e.target.files[0]);
        setFormData({ ...formData, profileImage: url });
    }
  };

  const handleRoleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
      const newRole = e.target.value as UserRole;
      // Reset designation when role changes to avoid mismatch
      setFormData({ ...formData, role: newRole, designation: DESIGNATIONS[newRole][0] });
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <Card className="w-full max-w-lg relative" title={isSelf ? "My Profile" : "Edit User"}>
            <button onClick={onClose} className="absolute top-4 right-4 text-gov-400 hover:text-gov-600 dark:hover:text-white">
                <X size={20} />
            </button>
            
            <div className="space-y-6 mt-2">
                {/* Profile Picture */}
                <div className="flex flex-col items-center">
                    <div className="w-24 h-24 rounded-full bg-gov-200 dark:bg-gov-700 overflow-hidden mb-2 border-2 border-gov-300 dark:border-gov-600">
                        {formData.profileImage ? (
                            <img src={formData.profileImage} alt="Profile" className="w-full h-full object-cover" />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center text-2xl font-bold text-gov-500 dark:text-gov-300">
                                {formData.name[0]}
                            </div>
                        )}
                    </div>
                    {/* Only allow PFP upload if it's the user themselves or Admin */}
                    <div className="relative">
                        <input type="file" id="pfp-upload" className="hidden" accept="image/*" onChange={handlePfpUpload} />
                        <label htmlFor="pfp-upload" className="cursor-pointer text-xs flex items-center gap-1 text-blue-600 hover:text-blue-500 dark:text-blue-400">
                            <Upload size={12} /> Change Photo
                        </label>
                    </div>
                </div>

                <div className="grid gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gov-700 dark:text-gov-300 mb-1">Full Name</label>
                        <Input 
                            label="" 
                            value={formData.name} 
                            disabled={!isAdmin && !isSelf} // Only admin or self can edit name
                            onChange={e => setFormData({...formData, name: e.target.value})}
                        />
                    </div>
                    
                    <div>
                        <label className="block text-sm font-medium text-gov-700 dark:text-gov-300 mb-1">Email Address</label>
                        <Input 
                            label="" 
                            value={formData.email} 
                            disabled={true} // Email is usually immutable identifier
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gov-700 dark:text-gov-300 mb-1">Role</label>
                            {isAdmin ? (
                                <select 
                                    className="w-full px-3 py-2 border border-gov-300 rounded-md bg-white dark:bg-gov-900 dark:border-gov-600 dark:text-white text-sm"
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
                            <label className="block text-sm font-medium text-gov-700 dark:text-gov-300 mb-1">Designation</label>
                            {isAdmin ? (
                                <select 
                                    className="w-full px-3 py-2 border border-gov-300 rounded-md bg-white dark:bg-gov-900 dark:border-gov-600 dark:text-white text-sm"
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

                <div className="flex justify-end pt-4 border-t border-gov-200 dark:border-gov-700">
                    <Button onClick={() => onSave(formData)}>Save Changes</Button>
                </div>
            </div>
        </Card>
    </div>
  );
};

const Main = () => {
  const { currentUser, logs, isAuthenticated, updateUser } = useStore();
  const [view, setView] = useState('dashboard');
  const [selectedCaseId, setSelectedCaseId] = useState<string | undefined>(undefined);
  
  // Profile Modal State
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);

  const handleNavigate = (destination: string, id?: string) => {
    setView(destination);
    if (id) setSelectedCaseId(id);
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

  // Router Switch
  const renderContent = () => {
    if (view === 'case_detail' && selectedCaseId) {
        return <CaseDetail caseId={selectedCaseId} onBack={() => setView('cases')} />;
    }

    if (view === 'cases') {
        return <PoliceDashboard onNavigate={handleNavigate} /> // Reuse for general case list view
    }

    if (view === 'custody') {
        return <ChainOfCustodyView />;
    }

    if (view === 'evidence_vault') {
        return <EvidenceVault />;
    }
    
    if (view === 'charge_sheets' && currentUser.role === UserRole.POLICE) {
        return <ChargeSheetView />;
    }

    if (view === 'certificates' && currentUser.role === UserRole.FORENSICS) {
        return <CertificateManager />;
    }

    if (view === 'users' && currentUser.role === UserRole.ADMIN) {
        return <AdminUsersView onEditUser={handleEditUser} />;
    }

    if (view === 'logs' && currentUser.role === UserRole.ADMIN) {
        return <SystemLogsView />;
    }
    
    // Default: Dashboard based on role
    switch (currentUser.role) {
      case UserRole.POLICE:
        return <PoliceDashboard onNavigate={handleNavigate} />;
      case UserRole.FORENSICS:
        return <ForensicsDashboard onNavigate={handleNavigate} />;
      case UserRole.LEGAL:
        return <LegalDashboard onNavigate={handleNavigate} />;
      case UserRole.ADMIN:
        return <AdminDashboard onNavigate={handleNavigate} />;
      default:
        return <div>Access Denied</div>;
    }
  };

  return (
    <>
        <Layout setView={setView} onOpenProfile={handleOpenProfile}>
            {renderContent()}
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
