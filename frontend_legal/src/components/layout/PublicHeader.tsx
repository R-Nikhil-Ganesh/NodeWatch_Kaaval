import React, { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { TricolorStrip } from './TricolorStrip';
import { UtilityBar } from './UtilityBar';
import { Emblem } from './Emblem';

export const PublicHeader = ({ rightSlot }: { rightSlot?: ReactNode }) => {
  const navigate = useNavigate();
  return (
    <>
      <TricolorStrip />
      <UtilityBar />
      <header className="bg-white border-b border-line-200">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-6">
          <button onClick={() => navigate('/')} className="flex items-center gap-3 text-left">
            <Emblem size={44} />
            <div>
              <p className="text-[11px] font-medium text-ink-500 uppercase tracking-wide">
                Government of Tamil Nadu &middot; Ministry of Home Affairs Initiative
              </p>
              <p className="font-serif font-bold text-xl leading-tight text-navy-900">Court Management System</p>
            </div>
          </button>
          {rightSlot}
        </div>
      </header>
    </>
  );
};
