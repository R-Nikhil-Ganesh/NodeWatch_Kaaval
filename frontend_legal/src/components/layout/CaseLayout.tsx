import React, { useEffect } from 'react';
import { Outlet, useOutletContext, useParams } from 'react-router-dom';
import { FileQuestion, Loader2 } from 'lucide-react';
import { Header } from './Header';
import { CaseSidebar } from './CaseSidebar';
import { Footer } from './Footer';
import { EmptyState } from '../ui/Primitives';
import { CourtCase } from '../../types';
import { useAsync } from '../../hooks/useAsync';
import { fetchCase, recordCaseView } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

const ShellWithMessage = ({ children }: { children: React.ReactNode }) => (
  <div className="min-h-screen bg-paper-50 flex flex-col">
    <Header />
    <div id="main-content" className="max-w-[1400px] mx-auto px-6 py-8 flex-1 w-full">{children}</div>
    <Footer variant="slim" />
  </div>
);

export const CaseLayout = () => {
  const { caseId } = useParams<{ caseId: string }>();
  const { user } = useAuth();
  const { data: courtCase, loading, error } = useAsync(() => fetchCase(caseId!), [caseId]);

  useEffect(() => {
    if (courtCase && user) {
      recordCaseView(courtCase.caseId, user.id, 'LEGAL');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courtCase?.caseId]);

  if (loading) {
    return (
      <ShellWithMessage>
        <div className="flex items-center justify-center py-20 text-ink-500 gap-2">
          <Loader2 size={18} className="animate-spin" /> Loading case…
        </div>
      </ShellWithMessage>
    );
  }

  if (error || !courtCase) {
    return (
      <ShellWithMessage>
        <EmptyState
          icon={<FileQuestion size={40} />}
          title="Case not found"
          description={error || `No case exists with id "${caseId}".`}
        />
      </ShellWithMessage>
    );
  }

  return (
    <div className="min-h-screen bg-paper-50 flex flex-col">
      <Header />
      <div className="max-w-[1400px] mx-auto flex flex-1 w-full">
        <CaseSidebar courtCase={courtCase} />
        <div id="main-content" className="flex-1 min-w-0 p-6 md:p-8">
          <Outlet context={{ courtCase }} />
        </div>
      </div>
      <Footer variant="slim" />
    </div>
  );
};

export const useCaseContext = () => useOutletContext<{ courtCase: CourtCase }>();
