import { apiGet, apiPatch } from './apiClient';
import type { AuditEvent, IOAlert } from './types';

export type { AuditEvent, IOAlert };

export interface AuditFilters {
  query?: string;
  caseId?: string;
  evidenceId?: string;
  actionType?: string;
  dateFrom?: string;
  dateTo?: string;
  limit?: number;
}

export const getAuditEvents = (filters: AuditFilters = {}): Promise<AuditEvent[]> =>
  apiGet<AuditEvent[]>('/audit', {
    query: filters.query,
    caseId: filters.caseId,
    evidenceId: filters.evidenceId,
    actionType: filters.actionType,
    dateFrom: filters.dateFrom,
    dateTo: filters.dateTo,
    limit: filters.limit,
  });

export const getAlerts = (): Promise<IOAlert[]> => apiGet<IOAlert[]>('/alerts');

export const getAlertsBySeverity = (
  severity: 'critical' | 'warning' | 'info'
): Promise<IOAlert[]> => apiGet<IOAlert[]>('/alerts', { severity });

export const getOpenAlertsCount = (): Promise<number> =>
  apiGet<IOAlert[]>('/alerts', { status: 'Open' }).then((rows) => rows.length);

/** Persists the acknowledgement — this used to live only in React state. */
export const updateAlertStatus = (
  alertId: string,
  status: 'Open' | 'Acknowledged' | 'Resolved',
  actor?: { actorId?: string; actorRole?: string }
): Promise<IOAlert> =>
  apiPatch<IOAlert>(`/alerts/${encodeURIComponent(alertId)}`, { status, ...actor });
