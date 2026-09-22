import { apiGet } from './apiClient';
import type { IOCase, CaseWorkflowStatus } from './types';

export type { IOCase };

export interface CaseStats {
  activeCases: number;
  underInvestigation: number;
  awaitingForensics: number;
  chargeSheetPrep: number;
  closed: number;
  total: number;
}

export interface CaseSearchFilters {
  status?: CaseWorkflowStatus | 'All';
  query?: string;
  district?: string;
  officer?: string;
}

export const getCases = (): Promise<IOCase[]> => apiGet<IOCase[]>('/cases');

/** Accepts either a real caseId ("CASE-2026-142") or a FIR number. */
export const getCaseById = (caseRef: string): Promise<IOCase | undefined> =>
  apiGet<IOCase>(`/cases/${encodeURIComponent(caseRef)}`).catch((err) => {
    if (err?.status === 404) return undefined;
    throw err;
  });

export const getCaseStats = (): Promise<CaseStats> => apiGet<CaseStats>('/cases/stats');

/**
 * Filtering runs in Postgres rather than in the browser, so the result set
 * stays correct as the case list grows beyond what the client holds.
 */
export const searchCases = (filters: CaseSearchFilters = {}): Promise<IOCase[]> =>
  apiGet<IOCase[]>('/cases', {
    status: filters.status,
    query: filters.query,
    district: filters.district,
    officer: filters.officer,
  });
