import { AuditEvent, IOAlert, MOCK_AUDIT_EVENTS, MOCK_ALERTS } from './mockData';

export interface AuditFilters {
  user?: string;
  action?: string;
  actionType?: string;
  query?: string;
  caseId?: string;
  evidenceId?: string;
  dateFrom?: string;
  dateTo?: string;
}

export const getAuditEvents = (filters?: AuditFilters): AuditEvent[] => {
  let events = [...MOCK_AUDIT_EVENTS].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );
  if (!filters) return events;
  if (filters.query) {
    const q = filters.query.toLowerCase();
    events = events.filter(e =>
      e.action.toLowerCase().includes(q) ||
      e.user.toLowerCase().includes(q) ||
      (e.txId && e.txId.toLowerCase().includes(q)) ||
      (e.caseId && e.caseId.toLowerCase().includes(q))
    );
  }
  if (filters.user) events = events.filter(e => e.user.toLowerCase().includes(filters.user!.toLowerCase()));
  if (filters.action || filters.actionType) {
    const act = (filters.action || filters.actionType)!.toLowerCase();
    events = events.filter(e => e.action.toLowerCase().includes(act));
  }
  if (filters.caseId) events = events.filter(e => e.caseId === filters.caseId);
  if (filters.evidenceId) events = events.filter(e => e.evidenceId === filters.evidenceId);
  if (filters.dateFrom) events = events.filter(e => new Date(e.timestamp) >= new Date(filters.dateFrom!));
  if (filters.dateTo) events = events.filter(e => new Date(e.timestamp) <= new Date(filters.dateTo!));
  return events;
};

export const getAlerts = (): IOAlert[] => MOCK_ALERTS;

export const getAlertsBySeverity = (severity: 'critical' | 'warning' | 'info'): IOAlert[] =>
  MOCK_ALERTS.filter(a => a.severity === severity);

export const getOpenAlertsCount = (): number =>
  MOCK_ALERTS.filter(a => a.status === 'Open').length;
