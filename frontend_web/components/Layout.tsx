
import React from 'react';
import { useStore } from '../store';
import { Shield, LayoutDashboard, FileText, Database, Users, LogOut, Sun, Moon, Link as LinkIcon, UserCircle, Box, Gavel, FileBadge } from 'lucide-react';
import { UserRole } from '../types';

export const Layout = ({ children, setView, onOpenProfile }: { children?: React.ReactNode, setView: (v: string) => void, onOpenProfile: () => void }) => {
  const { currentUser, logout, theme, toggleTheme } = useStore();

  if (!currentUser) return null;

  const navItems = [
    { label: 'Dashboard', id: 'dashboard', icon: LayoutDashboard },
    { label: 'Cases', id: 'cases', icon: FileText },
    { label: 'Evidence Vault', id: 'evidence_vault', icon: Box },
    { label: 'Chain of Custody', id: 'custody', icon: LinkIcon },
    // Police specific items
    ...(currentUser.role === UserRole.POLICE ? [
        { label: 'Charge Sheets', id: 'charge_sheets', icon: Gavel },
    ] : []),
    // Forensics specific items
    ...(currentUser.role === UserRole.FORENSICS ? [
        { label: 'Certificate Manager', id: 'certificates', icon: FileBadge },
    ] : []),
    // Admin specific items
    ...(currentUser.role === UserRole.ADMIN ? [
        { label: 'Users', id: 'users', icon: Users },
        { label: 'Audit Logs', id: 'logs', icon: Database }
    ] : []),
  ];

  return (
    <div className="flex h-screen bg-gov-50 dark:bg-gov-950">
      {/* Sidebar */}
      <aside className="w-64 bg-gov-900 text-white flex flex-col fixed h-full z-10 border-r border-gov-800">
        <div className="h-16 flex items-center px-6 border-b border-gov-800">
          <Shield className="w-8 h-8 text-blue-400 mr-3" />
          <div>
            <h1 className="font-bold text-lg tracking-tight">ChainGuard</h1>
            <p className="text-xs text-gov-400">Gov. Evidence System</p>
          </div>
        </div>

        <nav className="flex-1 px-4 py-6 space-y-1">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setView(item.id)}
              className="w-full flex items-center px-4 py-3 text-sm font-medium rounded-md hover:bg-gov-800 transition-colors text-gov-300 hover:text-white"
            >
              <item.icon className="w-5 h-5 mr-3 text-gov-400" />
              {item.label}
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-gov-800 space-y-4">
          <div className="flex items-center justify-between">
              <div className="flex items-center cursor-pointer" onClick={onOpenProfile} title="View Profile">
                {currentUser.profileImage ? (
                   <img src={currentUser.profileImage} alt="Profile" className="w-8 h-8 rounded-full mr-3 object-cover border border-gov-600" />
                ) : (
                   <div className="w-8 h-8 rounded-full bg-gov-700 flex items-center justify-center mr-3 font-bold text-sm">
                    {currentUser.name[0]}
                   </div>
                )}
                <div className="overflow-hidden">
                    <p className="text-sm font-medium truncate">{currentUser.name}</p>
                    <p className="text-[10px] text-gov-400 truncate uppercase tracking-wider">{currentUser.designation || currentUser.role}</p>
                </div>
              </div>
              <button 
                onClick={toggleTheme} 
                className="p-1.5 rounded-md hover:bg-gov-800 text-gov-400 hover:text-white transition-colors"
                title={`Switch to ${theme === 'light' ? 'Dark' : 'Light'} Mode`}
              >
                {theme === 'light' ? <Moon size={16} /> : <Sun size={16} />}
              </button>
          </div>
          
          <button 
            onClick={onOpenProfile}
            className="w-full flex items-center justify-center px-4 py-2 text-xs font-medium bg-gov-800 hover:bg-gov-700 text-white rounded transition-colors"
          >
            <UserCircle size={14} className="mr-2" />
            My Profile
          </button>
          
          <button 
            onClick={logout}
            className="w-full flex items-center justify-center px-4 py-2 text-xs font-medium bg-gov-800 hover:bg-gov-700 text-white rounded transition-colors"
          >
            <LogOut size={14} className="mr-2" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 ml-64 p-8 overflow-y-auto h-full text-gov-900 dark:text-gov-100">
        {children}
      </main>
    </div>
  );
};
