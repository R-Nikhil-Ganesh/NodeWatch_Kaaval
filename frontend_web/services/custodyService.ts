import { apiGet } from './apiClient';
import type { CustodyEvent, ChainIntegrityReport } from './types';

export type { CustodyEvent, ChainIntegrityReport };

export const getCustodyTimeline = (evidenceId: string): Promise<CustodyEvent[]> =>
  apiGet<CustodyEvent[]>(`/custody/${encodeURIComponent(evidenceId)}`);

/**
 * The report is computed server-side from the stored custody events — an
 * unacknowledged transfer, a missing collection event, an unanchored event or
 * a COMPROMISED exhibit each fail the chain. It previously always returned
 * "verified: true" regardless of the data.
 */
export const getChainIntegrityReport = (evidenceId: string): Promise<ChainIntegrityReport> =>
  apiGet<ChainIntegrityReport>(`/custody/${encodeURIComponent(evidenceId)}/integrity`);
