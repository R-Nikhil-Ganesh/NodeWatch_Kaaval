import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { ArrowLeft, FileStack, Gavel, ScrollText, ShieldCheck } from 'lucide-react';
import { CourtCase, CASE_STAGE_LABEL } from '../../types';
import { Badge } from '../ui/Primitives';
import { stageTone } from '../../utils/caseMeta';

const TABS = [
  { to: 'home', label: 'Case Home', icon: Gavel },
  { to: 'files', label: 'Case Files', icon: FileStack },
  { to: 'evidence', label: 'Evidence', icon: ShieldCheck },
  { to: 'audit-logs', label: 'Audit Logs', icon: ScrollText },
];

export const CaseSidebar = ({ courtCase }: { courtCase: CourtCase }) => {
  const navigate = useNavigate();

  return (
    <aside className="w-72 shrink-0 border-r border-line-200 bg-white flex flex-col">
      <div className="p-5 border-b border-line-200">
        <button onClick={() => navigate('/home')} className="flex items-center gap-1.5 text-xs font-medium text-ink-500 hover:text-navy-700 mb-4">
          <ArrowLeft size={14} /> Back to My Cases
        </button>
        <p className="text-[11px] font-medium text-ink-500 uppercase tracking-wide">{courtCase.caseId}</p>
        <h2 className="text-sm font-semibold text-navy-900 mt-0.5 leading-snug">{courtCase.title}</h2>
        <p className="text-xs text-ink-500 mt-1">{courtCase.cnrNumber}</p>
        <div className="mt-3">
          <Badge tone={stageTone(courtCase.stage)}>{CASE_STAGE_LABEL[courtCase.stage]}</Badge>
        </div>
      </div>

      <nav className="flex flex-col">
        {TABS.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex items-center gap-3 pl-4 pr-3.5 py-3 text-sm font-medium border-l-4 transition-colors ${
                isActive
                  ? 'border-saffron-500 bg-navy-50 text-navy-900'
                  : 'border-transparent text-ink-700 hover:bg-paper-100'
              }`
            }
          >
            <Icon size={16} /> {label}
          </NavLink>
        ))}
      </nav>

      <div className="mt-auto p-5 border-t border-line-200 text-xs text-ink-500 space-y-1.5">
        <p><span className="font-medium text-ink-700">Court:</span> {courtCase.court}</p>
        <p><span className="font-medium text-ink-700">Custodian:</span> {courtCase.currentCustodian}</p>
      </div>
    </aside>
  );
};
