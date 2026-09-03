import React, { ReactNode, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronDown, LogOut, User as UserIcon } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { Avatar } from '../ui/Primitives';
import { initials, formatDateTime } from '../../utils/format';
import { TricolorStrip } from './TricolorStrip';
import { UtilityBar } from './UtilityBar';
import { Emblem } from './Emblem';

const LAST_LOGIN = '2026-08-31T18:42:00+05:30';

export const Header = ({ subNav }: { subNav?: ReactNode }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [showProfile, setShowProfile] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) setShowProfile(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  if (!user) return null;

  return (
    <div className="sticky top-0 z-40">
      <TricolorStrip />
      <UtilityBar />
      <header className="bg-white border-b border-line-200">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 py-2.5 flex items-center justify-between gap-6">
          <button onClick={() => navigate('/home')} className="flex items-center gap-3 text-left shrink-0">
            <Emblem size={40} />
            <div className="hidden sm:block">
              <p className="text-[10px] font-medium text-ink-500 uppercase tracking-wide">Government of Tamil Nadu</p>
              <p className="font-serif font-bold text-lg leading-tight text-navy-900">Court Management System</p>
            </div>
          </button>

          <div className="flex items-center gap-4 ml-auto">
            <div className="hidden md:block text-right text-[11px] text-ink-500 leading-tight border-r border-line-300 pr-4">
              <p>Last Login</p>
              <p className="font-medium text-ink-700">{formatDateTime(LAST_LOGIN)}</p>
            </div>

            <div ref={profileRef} className="relative">
              <button onClick={() => setShowProfile((s) => !s)} className="flex items-center gap-2.5 pl-1 pr-2 py-1 rounded-sm hover:bg-paper-100 transition-colors">
                <Avatar initials={initials(user.name)} size={34} />
                <div className="text-left hidden sm:block">
                  <div className="text-sm font-medium leading-tight text-navy-900">{user.name}</div>
                  <div className="text-[11px] text-ink-500 leading-tight">{user.designation}</div>
                </div>
                <ChevronDown size={14} className="text-ink-400" />
              </button>
              {showProfile && (
                <div className="absolute right-0 mt-2 w-64 bg-white rounded-sm shadow-lg border border-line-200 text-ink-900 overflow-hidden animate-fade-in">
                  <div className="px-4 py-3 border-b border-line-200 bg-paper-50">
                    <p className="text-sm font-semibold text-navy-900">{user.name}</p>
                    <p className="text-xs text-ink-500">{user.designation}</p>
                    <p className="text-xs text-ink-500 mt-0.5">{user.court}</p>
                  </div>
                  <button
                    onClick={() => { setShowProfile(false); navigate('/profile'); }}
                    className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-ink-700 hover:bg-paper-50"
                  >
                    <UserIcon size={15} /> My Profile
                  </button>
                  <button
                    onClick={() => { logout(); navigate('/login'); }}
                    className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-status-urgent hover:bg-status-urgentBg border-t border-line-200"
                  >
                    <LogOut size={15} /> Log Out
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
        {subNav && (
          <div className="border-t border-line-200 bg-paper-50">
            <div className="max-w-[1400px] mx-auto px-4 sm:px-6 py-2.5">{subNav}</div>
          </div>
        )}
      </header>
    </div>
  );
};
