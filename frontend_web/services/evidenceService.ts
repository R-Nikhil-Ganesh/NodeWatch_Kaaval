import { apiGet } from './apiClient';
import type { IOEvidence, StorageStatus, EvidenceIntegrityStatus, ForensicExaminationStatus } from './types';

export type { IOEvidence };

export interface EvidenceStats {
  totalItems: number;
  /** Alias of totalItems — the evidence page renders `total`. */
  total: number;
  atFSL: number;
  /** Alias of atFSL — the evidence page renders `atFsl`. */
  atFsl: number;
  inTransit: number;
  integrityExceptions: number;
  pendingForensics: number;
}

export interface EvidenceSearchFilters {
  caseId?: string;
  type?: string;
  status?: StorageStatus | 'All';
  forensicStatus?: ForensicExaminationStatus | 'All';
  integrityStatus?: EvidenceIntegrityStatus | 'All';
  custodian?: string;
  location?: string;
  query?: string;
}

export const getAllEvidence = (): Promise<IOEvidence[]> => apiGet<IOEvidence[]>('/evidence');

/** `caseRef` accepts either a real caseId or a FIR number. */
export const getEvidenceForCase = (caseRef: string): Promise<IOEvidence[]> =>
  apiGet<IOEvidence[]>('/evidence', { caseId: caseRef });

export const getEvidenceById = (evidenceId: string): Promise<IOEvidence | undefined> =>
  apiGet<IOEvidence>(`/evidence/${encodeURIComponent(evidenceId)}`).catch((err) => {
    if (err?.status === 404) return undefined;
    throw err;
  });

export const getEvidenceStats = (): Promise<EvidenceStats> => apiGet<EvidenceStats>('/evidence/stats');

/**
 * Single options-object signature. The previous two-argument form
 * (query, filters) was already being called with one object by the evidence
 * page, which silently broke filtering.
 */
export const searchEvidence = (filters: EvidenceSearchFilters = {}): Promise<IOEvidence[]> =>
  apiGet<IOEvidence[]>('/evidence', {
    caseId: filters.caseId,
    type: filters.type,
    status: filters.status,
    forensicStatus: filters.forensicStatus,
    integrityStatus: filters.integrityStatus,
    custodian: filters.custodian,
    location: filters.location,
    query: filters.query,
  });
