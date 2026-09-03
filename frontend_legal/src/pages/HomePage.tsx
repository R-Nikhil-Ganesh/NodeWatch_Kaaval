import React, { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ChevronRight, FolderSearch, Search } from 'lucide-react';
import { AppLayout } from '../components/layout/AppLayout';
import { CaseTile } from '../components/case/CaseTile';
import { Input, EmptyState } from '../components/ui/Primitives';
import { CASES } from '../data/mockData';
import { CaseStage } from '../types';
import { useAuth } from '../context/AuthContext';

export const HomePage = () => {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = searchParams.get('tab') === 'history' ? 'history' : 'ongoing';
  const [query, setQuery] = useState('');

  const ongoingCases = CASES.filter((c) => c.stage !== CaseStage.DISPOSED);
  const historyCases = CASES.filter((c) => c.stage === CaseStage.DISPOSED);
  const activeCases = tab === 'ongoing' ? ongoingCases : historyCases;

  const visibleCases = useMemo(() => {
    return activeCases.filter((c) => {
      return query.trim() === '' ||
        c.title.toLowerCase().includes(query.toLowerCase()) ||
        c.caseId.toLowerCase().includes(query.toLowerCase()) ||
        c.cnrNumber.toLowerCase().includes(query.toLowerCase());
    });
  }, [activeCases, query]);

  const headerTabs = (
    <div className="inline-flex border border-navy-900 rounded-sm overflow-hidden w-fit" role="tablist" aria-label="Case listing">
      {(['ongoing', 'history'] as const).map((t) => (
        <button
          key={t}
          role="tab"
          aria-selected={tab === t}
          onClick={() => setSearchParams(t === 'ongoing' ? {} : { tab: t })}
          className={`px-5 py-2 text-sm font-medium transition-colors ${
            tab === t ? 'bg-navy-900 text-white' : 'bg-white text-navy-900 hover:bg-paper-100'
          } ${t === 'history' ? 'border-l border-navy-900' : ''}`}
        >
          {t === 'ongoing' ? `Ongoing Cases (${ongoingCases.length})` : `Case History (${historyCases.length})`}
        </button>
      ))}
    </div>
  );

  return (
    <AppLayout headerExtra={headerTabs}>
      <nav className="flex items-center gap-1.5 text-xs text-ink-500 mb-4" aria-label="Breadcrumb">
        <span>Home</span>
        <ChevronRight size={12} />
        <span className="text-navy-900 font-medium">My Cases</span>
      </nav>

      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6 pb-5 border-b border-line-200">
        <div>
          <h1 className="text-xl font-bold text-navy-900">My Cases</h1>
          <p className="text-sm text-ink-500 mt-1">
            Signed in as {user?.name} &middot; {user?.designation}, {user?.court}
          </p>
        </div>

        <div className="relative w-full sm:w-80">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-300" />
          <Input
            placeholder="Search by case name, case ID or CNR"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-9 rounded-sm"
          />
        </div>
      </div>

      {visibleCases.length === 0 ? (
        <EmptyState
          icon={<FolderSearch size={40} />}
          title="No cases found"
          description="Try clearing the search, or check the other tab."
        />
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {visibleCases.map((c) => (
            <CaseTile key={c.caseId} courtCase={c} />
          ))}
        </div>
      )}
    </AppLayout>
  );
};
