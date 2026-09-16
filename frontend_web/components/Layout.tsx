import React, { useEffect, useRef, useState } from 'react';
import { useStore } from '../store';
import { LayoutDashboard, FileText, Database, Users, LogOut, Link as LinkIcon, UserCircle, Box, Gavel, FileBadge, ChevronDown } from 'lucide-react';
import { UserRole } from '../types';
import { TricolorStrip } from './layout/TricolorStrip';
import { UtilityBar } from './layout/UtilityBar';
import { Emblem } from './layout/Emblem';

export const Layout = ({
  children,
  setView,
  onOpenProfile,
  currentView = 'dashboard',
}: {
  children?: React.ReactNode;
  setView: (v: string) => void;
  onOpenProfile: () => void;
  currentView?: string;
}) => {
  const { currentUser, logout } = useStore();
  const [showProfile, setShowProfile] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) setShowProfile(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

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
    <div className="min-h-screen bg-paper-50 flex flex-col">
      <div className="sticky top-0 z-40">
        <TricolorStrip />
        <UtilityBar />
        <header className="bg-white border-b border-line-200">
          <div className="max-w-[1400px] mx-auto px-4 sm:px-6 py-2.5 flex items-center justify-between gap-6">
            <button onClick={() => setView('dashboard')} className="flex items-center gap-3 text-left shrink-0">
              <Emblem size={40} />
              <div className="hidden sm:block">
                <p className="text-[10px] font-medium text-ink-500 uppercase tracking-wide">Government of Tamil Nadu</p>
                <p className="font-serif font-bold text-lg leading-tight text-navy-900">NodeWatch</p>
              </div>
            </button>

            <div className="flex items-center gap-4 ml-auto">
              <div ref={profileRef} className="relative">
                <button onClick={() => setShowProfile((s) => !s)} className="flex items-center gap-2.5 pl-1 pr-2 py-1 rounded-sm hover:bg-paper-100 transition-colors">
                  {currentUser.profileImage ? (
                    <img src={currentUser.profileImage} alt="Profile" className="w-8 h-8 rounded-full object-cover border border-line-300" />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-navy-900 text-white flex items-center justify-center font-semibold text-sm shrink-0">
                      {currentUser.name[0]}
                    </div>
                  )}
                  <div className="text-left hidden sm:block">
                    <div className="text-sm font-medium leading-tight text-navy-900">{currentUser.name}</div>
                    <div className="text-[11px] text-ink-500 leading-tight">{currentUser.designation || currentUser.role}</div>
                  </div>
                  <ChevronDown size={14} className="text-ink-300" />
                </button>
                {showProfile && (
                  <div className="absolute right-0 mt-2 w-64 bg-white rounded-sm shadow-lg border border-line-200 text-ink-900 overflow-hidden animate-fade-in">
                    <div className="px-4 py-3 border-b border-line-200 bg-paper-50">
                      <p className="text-sm font-semibold text-navy-900">{currentUser.name}</p>
                      <p className="text-xs text-ink-500">{currentUser.designation || currentUser.role}</p>
                    </div>
                    <button
                      onClick={() => { setShowProfile(false); onOpenProfile(); }}
                      className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-ink-700 hover:bg-paper-50"
                    >
                      <UserCircle size={15} /> My Profile
                    </button>
                    <button
                      onClick={() => { setShowProfile(false); logout(); }}
                      className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-status-urgent hover:bg-status-urgentBg border-t border-line-200"
                    >
                      <LogOut size={15} /> Sign Out
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="border-t border-line-200 bg-paper-50">
            <nav className="max-w-[1400px] mx-auto px-4 sm:px-6 flex gap-1 overflow-x-auto">
              {navItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => setView(item.id)}
                  className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
                    currentView === item.id
                      ? 'border-saffron-500 text-navy-900'
                      : 'border-transparent text-ink-500 hover:text-navy-700 hover:border-line-300'
                  }`}
                >
                  <item.icon size={15} /> {item.label}
                </button>
              ))}
            </nav>
          </div>
        </header>
      </div>

      <main id="main-content" className="max-w-[1400px] w-full mx-auto px-4 sm:px-6 py-6 flex-1 text-ink-900">
        {children}
      </main>
    </div>
  );
};
