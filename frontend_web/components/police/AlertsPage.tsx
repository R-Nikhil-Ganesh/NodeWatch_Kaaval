import React, { useMemo } from 'react';
import { AlertOctagon, AlertTriangle, Info, CheckCircle } from 'lucide-react';
import { Badge } from '../Common';
import { Button } from '../Common';
import { getAlerts } from '../../services/auditService';
import type { IOAlert } from '../../services/auditService';

interface NavProps {
  onNavigate: (view: string, id?: string) => void;
}

// ─── helpers ────────────────────────────────────────────────────────────────

const relativeTime = (iso: string): string => {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} hr${hrs !== 1 ? 's' : ''} ago`;
  const days = Math.floor(hrs / 24);
  return `${days} day${days !== 1 ? 's' : ''} ago`;
};

const SeverityIcon = ({
  severity,
  size = 18,
}: {
  severity: IOAlert['severity'];
  size?: number;
}) => {
  if (severity === 'critical') return <AlertOctagon size={size} />;
  if (severity === 'warning') return <AlertTriangle size={size} />;
  return <Info size={size} />;
};

const StatusBadge = ({ status }: { status: IOAlert['status'] }) => {
  const map: Record<IOAlert['status'], 'red' | 'yellow' | 'green'> = {
    Open: 'red',
    Acknowledged: 'yellow',
    Resolved: 'green',
  };
  return <Badge color={map[status]}>{status}</Badge>;
};

// ─── Alert Card ──────────────────────────────────────────────────────────────

const AlertCard = ({
  alert,
  onNavigate,
}: {
  alert: IOAlert;
  onNavigate: (view: string, id?: string) => void;
}) => {
  const isCritical = alert.severity === 'critical';
  const isWarning = alert.severity === 'warning';
  const isResolved = alert.status === 'Resolved';

  const iconColor = isCritical
    ? 'text-status-urgent'
    : isWarning
    ? 'text-amber-600'
    : 'text-blue-600';

  const cardClass = isCritical
    ? 'border-l-4 border-l-status-urgent bg-status-urgentBg'
    : isWarning
    ? 'border-l-4 border-l-amber-500 bg-amber-50'
    : 'border-l-4 border-l-blue-500 bg-blue-50';

  return (
    <div
      className={`rounded-sm p-4 ${cardClass} ${isResolved ? 'opacity-60' : ''}`}
    >
      <div className="flex items-start gap-3">
        <span className={`mt-0.5 shrink-0 ${iconColor}`}>
          <SeverityIcon severity={alert.severity} size={18} />
        </span>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-3 mb-0.5">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-bold uppercase tracking-wide text-ink-900">
                {alert.title}
              </span>
              <StatusBadge status={alert.status} />
            </div>
            <span className="text-xs text-ink-400 whitespace-nowrap shrink-0 mt-0.5">
              {relativeTime(alert.timestamp)}
            </span>
          </div>

          <p className="text-xs text-ink-500 mb-1.5">
            {alert.caseId && <>FIR {alert.caseId}</>}
            {alert.evidenceId && (
              <> &nbsp;·&nbsp; Evidence {alert.evidenceId}</>
            )}
          </p>

          <p className="text-sm text-ink-700 mb-3 leading-relaxed">
            {alert.description}
          </p>

          {!isResolved && (
            <div className="flex gap-2 flex-wrap">
              {alert.evidenceId && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => onNavigate('evidence_detail', alert.evidenceId)}
                >
                  View Evidence
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onNavigate('audit_log')}
              >
                View Audit Trail
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ─── Section ─────────────────────────────────────────────────────────────────

const AlertSection = ({
  title,
  alerts,
  headerClass,
  emptyLabel,
  onNavigate,
}: {
  title: string;
  alerts: IOAlert[];
  headerClass: string;
  emptyLabel: string;
  onNavigate: (view: string, id?: string) => void;
}) => (
  <div className="border border-line-200 rounded-sm overflow-hidden shadow-card">
    <div className={`px-5 py-3 ${headerClass}`}>
      <span className="text-sm font-bold uppercase tracking-wide text-white">{title}</span>
      <span className="ml-2 inline-flex items-center justify-center h-5 min-w-[20px] px-1.5 bg-white/25 rounded-full text-white text-xs font-bold">
        {alerts.length}
      </span>
    </div>
    <div className="bg-white p-4 space-y-3">
      {alerts.length === 0 ? (
        <div className="flex items-center gap-2 text-status-resolved py-2">
          <CheckCircle size={16} />
          <span className="text-sm font-medium">{emptyLabel}</span>
        </div>
      ) : (
        alerts.map(alert => (
          <AlertCard key={alert.id} alert={alert} onNavigate={onNavigate} />
        ))
      )}
    </div>
  </div>
);

// ─── Main Component ──────────────────────────────────────────────────────────

export const AlertsPage: React.FC<NavProps> = ({ onNavigate }) => {
  const alerts = useMemo(() => getAlerts(), []);

  const criticalAlerts = useMemo(
    () => alerts.filter(a => a.severity === 'critical'),
    [alerts],
  );
  const warningAlerts = useMemo(
    () => alerts.filter(a => a.severity === 'warning'),
    [alerts],
  );
  const infoAlerts = useMemo(
    () => alerts.filter(a => a.severity === 'info'),
    [alerts],
  );
  const resolvedCount = useMemo(
    () => alerts.filter(a => a.status === 'Resolved').length,
    [alerts],
  );
  const criticalOpen = criticalAlerts.filter(a => a.status === 'Open').length;
  const warningOpen = warningAlerts.filter(a => a.status === 'Open').length;
  const infoOpen = infoAlerts.filter(a => a.status === 'Open').length;

  return (
    <div className="space-y-6">
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div>
        <h1 className="text-2xl font-bold text-navy-900 tracking-tight">
          Alerts &amp; Notifications
        </h1>
        <p className="text-sm text-ink-500 mt-0.5">
          System-generated alerts requiring attention
        </p>
      </div>

      {/* ── Summary Stats Bar ──────────────────────────────────────────── */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white border border-line-200 border-l-4 border-l-status-urgent rounded-sm shadow-card px-4 py-3">
          <p className="text-xs font-semibold text-ink-500 uppercase tracking-wide">Critical</p>
          <p className="text-2xl font-bold text-status-urgent mt-1">{criticalOpen}</p>
          <p className="text-xs text-ink-400">open</p>
        </div>
        <div className="bg-white border border-line-200 border-l-4 border-l-amber-500 rounded-sm shadow-card px-4 py-3">
          <p className="text-xs font-semibold text-ink-500 uppercase tracking-wide">Warning</p>
          <p className="text-2xl font-bold text-amber-600 mt-1">{warningOpen}</p>
          <p className="text-xs text-ink-400">open</p>
        </div>
        <div className="bg-white border border-line-200 border-l-4 border-l-blue-500 rounded-sm shadow-card px-4 py-3">
          <p className="text-xs font-semibold text-ink-500 uppercase tracking-wide">Information</p>
          <p className="text-2xl font-bold text-blue-600 mt-1">{infoOpen}</p>
          <p className="text-xs text-ink-400">open</p>
        </div>
        <div className="bg-white border border-line-200 border-l-4 border-l-status-resolved rounded-sm shadow-card px-4 py-3">
          <p className="text-xs font-semibold text-ink-500 uppercase tracking-wide">Resolved</p>
          <p className="text-2xl font-bold text-status-resolved mt-1">{resolvedCount}</p>
          <p className="text-xs text-ink-400">total</p>
        </div>
      </div>

      {/* ── Critical ──────────────────────────────────────────────────── */}
      <AlertSection
        title="Critical"
        alerts={criticalAlerts}
        headerClass="bg-status-urgent"
        emptyLabel="No critical alerts — all clear"
        onNavigate={onNavigate}
      />

      {/* ── Warning ──────────────────────────────────────────────────── */}
      <AlertSection
        title="Warning"
        alerts={warningAlerts}
        headerClass="bg-amber-500"
        emptyLabel="No warning alerts"
        onNavigate={onNavigate}
      />

      {/* ── Information ───────────────────────────────────────────────── */}
      <AlertSection
        title="Information"
        alerts={infoAlerts}
        headerClass="bg-blue-600"
        emptyLabel="No informational alerts"
        onNavigate={onNavigate}
      />
    </div>
  );
};

export default AlertsPage;
