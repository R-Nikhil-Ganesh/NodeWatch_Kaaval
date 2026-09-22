import { apiGet } from './apiClient';
import type { ForensicRecord } from './types';

export type { ForensicRecord };

export interface ForensicSummary {
  pendingSubmission: number;
  inTransit: number;
  receivedByFSL: number;
  underExamination: number;
  examinationComplete: number;
  reportAvailable: number;
  notRequired: number;
}

export const getForensicStatus = (evidenceId: string): Promise<ForensicRecord | undefined> =>
  apiGet<ForensicRecord[]>('/forensics/records', { evidenceId }).then((rows) => rows[0]);

/** `caseRef` accepts either a real caseId or a FIR number. */
export const getForensicRecordsForCase = (caseRef: string): Promise<ForensicRecord[]> =>
  apiGet<ForensicRecord[]>('/forensics/records', { caseId: caseRef });

export const getAllForensicRecords = (): Promise<ForensicRecord[]> =>
  apiGet<ForensicRecord[]>('/forensics/records');

/** Counts are aggregated in Postgres, so they always match the record rows. */
export const getForensicSummary = (caseRef?: string): Promise<ForensicSummary> =>
  apiGet<ForensicSummary>('/forensics/summary', { caseId: caseRef });
