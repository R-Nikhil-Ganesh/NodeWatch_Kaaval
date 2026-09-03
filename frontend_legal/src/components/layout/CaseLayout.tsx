import React from 'react';
import { Outlet, useOutletContext, useParams } from 'react-router-dom';
import { FileQuestion } from 'lucide-react';
import { Header } from './Header';
import { CaseSidebar } from './CaseSidebar';
import { Footer } from './Footer';
import { getCaseById } from '../../data/mockData';
import { EmptyState } from '../ui/Primitives';
import { CourtCase } from '../../types';

export const CaseLayout = () => {
  const { caseId } = useParams<{ caseId: string }>();
  const courtCase = caseId ? getCaseById(caseId) : undefined;

  if (!courtCase) {
    return (
      <div className="min-h-screen bg-paper-50 flex flex-col">
        <Header />
        <div id="main-content" className="max-w-[1400px] mx-auto px-6 py-8 flex-1 w-full">
          <EmptyState icon={<FileQuestion size={40} />} title="Case not found" description={`No case exists with id "${caseId}".`} />
        </div>
        <Footer variant="slim" />
      </div>
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
