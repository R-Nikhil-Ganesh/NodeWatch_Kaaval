import React, { useEffect, useRef, useState } from 'react';
import { useStore } from '../store';
import {
  LayoutDashboard,
  FileText,
  Database,
  Users,
  LogOut,
  Link as LinkIcon,
  UserCircle,
  Box,
  Gavel,
  FileBadge,
  ChevronDown,
  Briefcase,
  FlaskConical,
  Scale,
  History,
  ShieldCheck,
  Check
} from 'lucide-react';
import { UserRole } from '../types';
import { TricolorStrip } from './layout/TricolorStrip';
import { Emblem } from './layout/Emblem';

interface NavItem {
  id: string;
  label: string;
  desc?: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
}

interface NavGroup {
  id: string;
  label: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  items?: NavItem[];
}

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
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);

  const profileRef = useRef<HTMLDivElement>(null);
  const navRef = useRef<HTMLDivElement>(null);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setShowProfile(false);
      }
      if (navRef.current && !navRef.current.contains(e.target as Node)) {
        setOpenDropdown(null);
      }
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  if (!currentUser) return null;

  // Navigation Groups with Accessible Dropdowns
  const navGroups: NavGroup[] = [
    {
      id: 'cases_group',
      label: 'Cases',
      icon: Briefcase,
      items: [
        {
          id: 'cases',
          label: 'Active Investigations',
          desc: 'Searchable registry of all registered FIR cases',
          icon: Briefcase
        },
        {
          id: 'case_detail',
          label: 'Case Dossier & Evidence',
          desc: 'Selected investigation workspace & evidence chains',
          icon: FileText
        }
      ]
    },
    {
      id: 'evidence_group',
      label: 'Evidence & Custody',
      icon: Box,
      items: [
        {
          id: 'evidence_vault',
          label: 'Evidence Vault',
          desc: 'Secure digital & physical asset repository',
          icon: Box
        },
        {
          id: 'custody',
          label: 'Chain of Custody',
          desc: 'Cryptographic ledger timeline & transfer records',
          icon: LinkIcon
        }
      ]
    },
    {
      id: 'forensics_court_group',
      label: 'Forensics & Court',
      icon: Scale,
      items: [
        {
          id: 'forensics',
          label: 'Forensic Lab (FSL) Tracker',
          desc: 'Laboratory requisitions & verified report digests',
          icon: FlaskConical
        },
        {
          id: 'charge_sheets',
          label: 'Charge Sheet Prep & Filing',
          desc: 'Section 173 CrPC readiness checklist & filings',
          icon: Gavel
        },
        ...(currentUser.role === UserRole.FORENSICS ? [
          {
            id: 'certificates',
            label: 'Certificate Manager',
            desc: 'Section 65B electronic attestation certificates',
            icon: FileBadge
          }
        ] : [])
      ]
    },
    {
      id: 'audit_group',
      label: 'Audit & Records',
      icon: Database,
      items: [
        {
          id: 'audit_log',
          label: 'Immutable Audit Ledger',
          desc: 'Hyperledger Fabric peer transactions & blocks',
          icon: History
        },
        {
          id: 'logs',
          label: 'System Access Logs',
          desc: 'Terminal access logs & security authorization trail',
          icon: Database
        },
        ...(currentUser.role === UserRole.ADMIN ? [
          {
            id: 'users',
            label: 'User Clearance & Roles',
            desc: 'Manage investigator, analyst, and admin access',
            icon: Users
          }
        ] : [])
      ]
    }
  ];

  return (
    <div className="min-h-screen bg-[#F8F9FA] flex flex-col font-sans">
      <div className="sticky top-0 z-40 bg-white shadow-sm border-b border-line-200">
        <TricolorStrip />
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:px-3 focus:py-1.5 focus:bg-navy-900 focus:text-white focus:text-xs focus:rounded shadow"
        >
          Skip to Main Content
        </a>
        <header>
          <div className="max-w-[1440px] mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
            {/* Brand */}
            <button
              onClick={() => {
                setView('dashboard');
                setOpenDropdown(null);
              }}
              className="flex items-center gap-3 text-left shrink-0 hover:opacity-90 transition-opacity"
            >
              <Emblem size={34} />
              <div>
                <span className="font-serif font-bold text-lg text-navy-900 leading-none tracking-tight block">
                  NodeWatch
                </span>
                <span className="text-[10px] font-medium text-ink-500 uppercase tracking-wider block mt-0.5">
                  TN Police · Digital Evidence
                </span>
              </div>
            </button>

            {/* Navigation Bar with Accessible Dropdowns */}
            <nav ref={navRef} className="flex items-center gap-1 md:gap-1.5 overflow-visible py-1">
              {/* Direct Dashboard Link */}
              <button
                onClick={() => {
                  setView('dashboard');
                  setOpenDropdown(null);
                }}
                className={`flex items-center gap-2 px-3 py-2 text-xs md:text-sm font-medium rounded transition-colors whitespace-nowrap ${
                  currentView === 'dashboard'
                    ? 'bg-navy-900 text-white shadow-sm font-semibold'
                    : 'text-ink-600 hover:text-navy-900 hover:bg-paper-100'
                }`}
              >
                <LayoutDashboard
                  size={15}
                  className={currentView === 'dashboard' ? 'text-saffron-400' : 'text-ink-400'}
                />
                <span>Dashboard</span>
              </button>

              {/* Dropdown Groups */}
              {navGroups.map(group => {
                const isGroupActive = group.items?.some(i => i.id === currentView);
                const isOpen = openDropdown === group.id;
                const GroupIcon = group.icon;

                return (
                  <div key={group.id} className="relative">
                    <button
                      onClick={() => setOpenDropdown(isOpen ? null : group.id)}
                      className={`flex items-center gap-1.5 px-3 py-2 text-xs md:text-sm font-medium rounded transition-colors whitespace-nowrap ${
                        isGroupActive
                          ? 'bg-navy-900 text-white shadow-sm font-semibold'
                          : isOpen
                          ? 'bg-paper-100 text-navy-900'
                          : 'text-ink-600 hover:text-navy-900 hover:bg-paper-100'
                      }`}
                      aria-expanded={isOpen}
                    >
                      <GroupIcon
                        size={14}
                        className={isGroupActive ? 'text-saffron-400' : 'text-ink-400'}
                      />
                      <span>{group.label}</span>
                      <ChevronDown
                        size={13}
                        className={`transition-transform duration-150 ${
                          isOpen ? 'rotate-180 text-navy-900' : isGroupActive ? 'text-white' : 'text-ink-400'
                        }`}
                      />
                    </button>

                    {/* Dropdown Menu */}
                    {isOpen && (
                      <div className="absolute left-0 mt-1.5 w-72 bg-white rounded-md shadow-xl border border-line-200 py-1.5 z-50 animate-fade-in divide-y divide-line-100">
                        {group.items?.map(item => {
                          const ItemIcon = item.icon;
                          const isItemActive = currentView === item.id;

                          return (
                            <button
                              key={item.id}
                              onClick={() => {
                                setView(item.id);
                                setOpenDropdown(null);
                              }}
                              className={`w-full text-left px-3.5 py-2.5 flex items-start gap-3 transition-colors ${
                                isItemActive
                                  ? 'bg-navy-50/80 text-navy-900 font-semibold'
                                  : 'hover:bg-paper-50 text-ink-800'
                              }`}
                            >
                              <div
                                className={`mt-0.5 p-1 rounded shrink-0 ${
                                  isItemActive ? 'bg-navy-900 text-white' : 'bg-paper-100 text-ink-500'
                                }`}
                              >
                                <ItemIcon size={14} />
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="text-xs font-bold text-navy-900 flex items-center justify-between">
                                  <span>{item.label}</span>
                                  {isItemActive && (
                                    <span className="w-1.5 h-1.5 rounded-full bg-saffron-500 shrink-0" />
                                  )}
                                </div>
                                {item.desc && (
                                  <p className="text-[11px] font-normal text-ink-500 leading-tight mt-0.5">
                                    {item.desc}
                                  </p>
                                )}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </nav>

            {/* User Profile */}
            <div className="flex items-center gap-3 shrink-0">
              <div ref={profileRef} className="relative">
                <button
                  onClick={() => setShowProfile(s => !s)}
                  className="flex items-center gap-2.5 p-1 rounded-sm hover:bg-paper-100 transition-colors"
                  aria-expanded={showProfile}
                >
                  {currentUser.profileImage ? (
                    <img
                      src={currentUser.profileImage}
                      alt="Profile"
                      className="w-8 h-8 rounded-full object-cover border border-line-300"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-navy-900 text-white flex items-center justify-center font-semibold text-xs shrink-0">
                      {currentUser.name[0]}
                    </div>
                  )}
                  <div className="text-left hidden lg:block">
                    <div className="text-xs font-semibold leading-tight text-navy-900">{currentUser.name}</div>
                    <div className="text-[10px] text-ink-500 leading-tight">
                      {currentUser.designation || currentUser.role}
                    </div>
                  </div>
                  <ChevronDown size={14} className="text-ink-300" />
                </button>

                {showProfile && (
                  <div className="absolute right-0 mt-2 w-60 bg-white rounded-sm shadow-lg border border-line-200 text-ink-900 overflow-hidden animate-fade-in z-50">
                    <div className="px-4 py-3 border-b border-line-200 bg-paper-50">
                      <p className="text-xs font-bold text-navy-900">{currentUser.name}</p>
                      <p className="text-[11px] text-ink-500">{currentUser.designation || currentUser.role}</p>
                    </div>
                    <button
                      onClick={() => {
                        setShowProfile(false);
                        onOpenProfile();
                      }}
                      className="w-full flex items-center gap-2.5 px-4 py-2.5 text-xs text-ink-700 hover:bg-paper-50"
                    >
                      <UserCircle size={15} /> My Profile
                    </button>
                    <button
                      onClick={() => {
                        setShowProfile(false);
                        logout();
                      }}
                      className="w-full flex items-center gap-2.5 px-4 py-2.5 text-xs text-status-urgent hover:bg-status-urgentBg border-t border-line-200"
                    >
                      <LogOut size={15} /> Sign Out
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </header>
      </div>

      <main id="main-content" className="max-w-[1440px] w-full mx-auto px-4 sm:px-6 py-6 flex-1 text-ink-900">
        {children}
      </main>
    </div>
  );
};
