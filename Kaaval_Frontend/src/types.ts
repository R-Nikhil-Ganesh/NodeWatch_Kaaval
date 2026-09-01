// src/types.ts

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'investigator' | 'forensics' | 'admin' | 'police' | 'legal' | 'ADMIN' | 'POLICE' | 'FORENSICS' | 'LEGAL';
  designation?: string;
  badgeNumber?: string;
  org_msp?: string;
  username?: string;
  password?: string;
}

export interface Evidence {
  type: 'image' | 'document' | 'IMAGE' | 'VIDEO' | 'AUDIO' | 'PDF' | 'WORD' | 'PHYSICAL' | 'DISK_IMAGE';
  uri: string;
  hash: string;
  timestamp: string;
  name?: string;
  location?: string;
  mimeType?: string;
  file_url?: string;
  evidenceId?: string;
}

export type CaseStatus =
  | 'OPEN'
  | 'UNDER_INVESTIGATION'
  | 'SUBMITTED_TO_COURT'
  | 'CLOSED'
  | 'FROZEN';

export const VALID_CASE_STATUSES: CaseStatus[] = [
  'OPEN',
  'UNDER_INVESTIGATION',
  'SUBMITTED_TO_COURT',
  'CLOSED',
  'FROZEN',
];

export function normalizeCaseStatus(status?: string | null): CaseStatus {
  if (!status) return 'OPEN';
  const clean = status.trim().toUpperCase().replace(/\s+/g, '_');
  if (clean === 'UNDER_INVESTIGATION') return 'UNDER_INVESTIGATION';
  if (clean === 'SUBMITTED_TO_COURT') return 'SUBMITTED_TO_COURT';
  if (clean === 'CLOSED' || clean === 'VERIFIED') return 'CLOSED';
  if (clean === 'FROZEN') return 'FROZEN';
  return 'OPEN';
}

export interface Case {
  caseId: string;
  title: string;
  description?: string;
  status: CaseStatus;
  officer: string;
  timestamp: string;
  location: string;
  blockchainHash: string;
  evidence: Evidence[];
}

export type RootStackParamList = {
  Auth: undefined;
  Dashboard: undefined;
  CreateCase: undefined;
  Evidence: { caseId: string };
};