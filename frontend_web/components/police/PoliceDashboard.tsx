import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  ShieldAlert,
  CheckCircle2,
  ArrowRightLeft,
  Package,
  FileText,
  X,
  ChevronRight,
  Scale,
  Loader2
} from 'lucide-react';
import { Button } from '../Common';
import { useStore } from '../../store';
import { VerificationModal } from './VerificationModal';
import { getCases, getCaseStats } from '../../services/caseService';
import type { CaseStats } from '../../services/caseService';
import { getEvidenceStats } from '../../services/evidenceService';
import type { EvidenceStats } from '../../services/evidenceService';
import { getAlerts, getAuditEvents, updateAlertStatus } from '../../services/auditService';
import type { IOCase, IOAlert, AuditEvent } from '../../services/types';

interface PoliceDashboardProps {
  onNavigate: (view: string, id?: string) => void;
}

// Relative time for the activity feed, e.g. "4 days ago".
const timeAgo = (iso?: string): string => {
  if (!iso) return '';
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return '';
  const mins = Math.round((Date.now() - then) / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} minute${mins === 1 ? '' : 's'} ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs} hour${hrs === 1 ? '' : 's'} ago`;
  const days = Math.round(hrs / 24);
  if (days < 30) return `${days} day${days === 1 ? '' : 's'} ago`;
  const months = Math.round(days / 30);
  return `${months} month${months === 1 ? '' : 's'} ago`;
};

const ACTIVITY_ICONS: Record<string, React.ReactNode> = {
  'Custody Transfer Initiated': <ArrowRightLeft size={13} className="text-ink-500" />,
  'Custody Receipt Acknowledged': <CheckCircle2 size={13} className="text-ink-500" />,
  'FSL Transfer Initiated': <ArrowRightLeft size={13} className="text-ink-500" />,
  'FSL Receipt Confirmed': <CheckCircle2 size={13} className="text-ink-500" />,
  'Forensic Report Viewed': <FileText size={13} className="text-ink-500" />,
  'Evidence Registered': <Package size={13} className="text-ink-500" />,
};

// ─── Alerts Drawer ───────────────────────────────────────────────────────────
interface AlertsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  alerts: IOAlert[];
  onInspect: (evidenceId: string) => void;
  onNavigateCase: (caseId: string) => void;
  onAcknowledge: (alertId: string) => void;
}

const AlertsDrawer: React.FC<AlertsDrawerProps> = ({
  isOpen,
  onClose,
  alerts,
  onInspect,
  onNavigateCase,
  onAcknowledge
}) => {
  const [filter, setFilter] = useState<'all' | 'critical' | 'warning' | 'info'>('all');

  if (!isOpen) return null;

  const filteredAlerts = alerts.filter(a => {
    if (filter === 'critical') return a.severity === 'critical';
    if (filter === 'warning') return a.severity === 'warning';
    if (filter === 'info') return a.severity === 'info' || a.status === 'Resolved';
    return true;
  });

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-navy-950/40 backdrop-blur-sm animate-fade-in flex justify-end">
      <div className="bg-white w-full max-w-xl h-full shadow-2xl flex flex-col border-l border-line-300">
        {/* Header */}
        <div className="px-6 py-4 border-b border-line-200 flex items-center justify-between bg-paper-50">
          <div>
            <h3 className="text-base font-bold text-navy-900">All Investigative Alerts</h3>
            <p className="text-xs text-ink-500 mt-0.5">Audited warnings, discrepancies, and task reminders</p>
          </div>
          <button onClick={onClose} className="p-1 rounded text-ink-400 hover:text-navy-900">
            <X size={20} />
          </button>
        </div>

        {/* Filter Pills */}
        <div className="px-6 py-3 border-b border-line-200 flex gap-2 bg-white text-xs">
          {[
            { id: 'all', label: `All (${alerts.length})` },
            { id: 'critical', label: `Critical (${alerts.filter(a => a.severity === 'critical').length})` },
            { id: 'warning', label: `Warning (${alerts.filter(a => a.severity === 'warning').length})` },
            { id: 'info', label: `Info / Resolved (${alerts.filter(a => a.severity === 'info' || a.status === 'Resolved').length})` }
          ].map(f => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id as any)}
              className={`px-3 py-1 rounded font-medium transition-colors ${
                filter === f.id
                  ? 'bg-navy-900 text-white'
                  : 'bg-paper-100 text-ink-600 hover:bg-paper-200'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto p-6 space-y-3 divide-y divide-line-100">
          {filteredAlerts.length === 0 && (
            <p className="text-sm text-ink-500 text-center py-8">No alerts in this category.</p>
          )}
          {filteredAlerts.map(alert => {
            const isAck = alert.status === 'Acknowledged';
            const isResolved = alert.status === 'Resolved';

            return (
              <div key={alert.id} className="pt-3 first:pt-0 space-y-2">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-2.5">
                    <span
                      className={`w-2.5 h-2.5 rounded-full mt-1.5 shrink-0 ${
                        isResolved
                          ? 'bg-status-resolved'
                          : alert.severity === 'critical'
                          ? 'bg-status-urgent'
                          : 'bg-status-pending'
                      }`}
                    />
                    <div>
                      <div className="text-sm font-semibold text-navy-900 flex items-center gap-2">
                        <span>{alert.title}</span>
                        {isAck && (
                          <span className="text-[10px] font-medium bg-paper-200 text-ink-600 px-1.5 py-0.5 rounded">
                            Acknowledged
                          </span>
                        )}
                        {isResolved && (
                          <span className="text-[10px] font-medium bg-status-resolvedBg text-status-resolved px-1.5 py-0.5 rounded">
                            Resolved
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-ink-600 mt-1 leading-relaxed">{alert.description}</p>
                      <div className="text-[11px] text-ink-400 mt-1.5 flex items-center gap-2">
                        <span className="font-mono font-medium">
                          {alert.evidenceId || `FIR ${alert.caseFirNumber || alert.caseId}`}
                        </span>
                        <span>·</span>
                        <span>
                          {new Date(alert.timestamp).toLocaleDateString('en-IN', {
                            day: '2-digit', month: 'short', year: 'numeric',
                            hour: '2-digit', minute: '2-digit'
                          })}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex justify-end gap-2 pt-1">
                  {!isAck && !isResolved && (
                    <button
                      onClick={() => onAcknowledge(alert.id)}
                      className="px-2.5 py-1 text-xs text-ink-600 hover:text-navy-900 border border-line-200 rounded hover:bg-paper-100"
                    >
                      Acknowledge
                    </button>
                  )}
                  {alert.evidenceId && (
                    <button
                      onClick={() => {
                        onClose();
                        onInspect(alert.evidenceId!);
                      }}
                      className="px-2.5 py-1 text-xs font-medium text-navy-900 bg-paper-100 hover:bg-paper-200 rounded border border-line-200"
                    >
                      Inspect Evidence
                    </button>
                  )}
                  {alert.caseId && (
                    <button
                      onClick={() => {
                        onClose();
                        onNavigateCase(alert.caseId);
                      }}
                      className="px-2.5 py-1 text-xs font-medium text-navy-900 bg-white border border-line-300 hover:border-navy-400 rounded"
                    >
                      View Case
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-line-200 bg-paper-50 flex justify-end">
          <Button variant="secondary" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </div>
  );
};

// ─── Main Police Dashboard Component ─────────────────────────────────────────
export const PoliceDashboard: React.FC<PoliceDashboardProps> = ({ onNavigate }) => {
  const { currentUser } = useStore();

  // Server-backed state
  const [cases, setCases] = useState<IOCase[]>([]);
  const [caseStats, setCaseStats] = useState<CaseStats | null>(null);
  const [evidenceStats, setEvidenceStats] = useState<EvidenceStats | null>(null);
  const [alerts, setAlerts] = useState<IOAlert[]>([]);
  const [activity, setActivity] = useState<AuditEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Modal / Drawer state
  const [inspectEvidenceId, setInspectEvidenceId] = useState<string | null>(null);
  const [isAlertsDrawerOpen, setIsAlertsDrawerOpen] = useState(false);

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const [caseRows, cStats, eStats, alertRows, auditRows] = await Promise.all([
        getCases(),
        getCaseStats(),
        getEvidenceStats(),
        getAlerts(),
        getAuditEvents({ limit: 8 }),
      ]);
      setCases(caseRows);
      setCaseStats(cStats);
      setEvidenceStats(eStats);
      setAlerts(alertRows);
      setActivity(auditRows);
    } catch (err: any) {
      setLoadError(err?.message || 'Unable to reach the case management service.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const getGreeting = () => {
    const hr = new Date().getHours();
    if (hr < 12) return 'Good morning';
    if (hr < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const todayFormatted = useMemo(
    () =>
      new Date().toLocaleDateString('en-IN', {
        weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
      }),
    []
  );

  // "Continue Working": the most recently updated case still open, preferring
  // priority cases — previously pinned to a hardcoded FIR number.
  const focusedCase: IOCase | undefined = useMemo(() => {
    const open = cases.filter(c => c.status !== 'Closed');
    const priority = open.filter(c => c.isPriority);
    return (priority.length ? priority : open)[0] || cases[0];
  }, [cases]);

  // Alerts needing IO intervention.
  const actionableAlerts = useMemo(
    () => alerts.filter(a => a.status !== 'Resolved' && a.severity !== 'info').slice(0, 4),
    [alerts]
  );

  const openAlertCounts = useMemo(() => {
    const open = alerts.filter(a => a.status !== 'Resolved');
    return {
      total: open.length,
      critical: open.filter(a => a.severity === 'critical').length,
      warning: open.filter(a => a.severity === 'warning').length,
    };
  }, [alerts]);

  const handleAcknowledge = async (alertId: string) => {
    // Optimistic update, then persist; reload to reflect the stored state.
    setAlerts(prev => prev.map(a => (a.id === alertId ? { ...a, status: 'Acknowledged' } : a)));
    try {
      await updateAlertStatus(alertId, 'Acknowledged', {
        actorId: currentUser?.id,
        actorRole: currentUser?.role,
      });
    } catch {
      loadDashboard();
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-ink-500">
        <Loader2 size={28} className="animate-spin text-navy-700 mb-3" />
        <p className="text-sm">Loading case data…</p>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="bg-status-urgentBg border border-status-urgent/30 rounded-md p-6 text-center space-y-3">
        <ShieldAlert size={28} className="text-status-urgent mx-auto" />
        <div>
          <h3 className="text-base font-bold text-navy-900">Unable to load dashboard</h3>
          <p className="text-xs text-ink-600 mt-1">{loadError}</p>
        </div>
        <Button size="sm" onClick={loadDashboard}>Retry</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ── 1. HEADER / GREETING ────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-2 pb-1 border-b border-line-200/60">
        <div>
          <h1 className="text-2xl font-bold text-navy-900 tracking-tight">
            {getGreeting()}{currentUser?.name ? `, ${currentUser.name}` : ''}
          </h1>
          <p className="text-xs text-ink-500 mt-0.5">
            {currentUser?.designation || 'Investigating Officer'} · Crime Investigation Division
          </p>
        </div>
        <div className="text-xs text-ink-500 font-medium">{todayFormatted}</div>
      </div>

      {/* ── 2. KPI OVERVIEW ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div
          onClick={() => onNavigate('cases')}
          className="bg-white border border-line-200 rounded-md p-4 shadow-sm hover:border-navy-400 hover:shadow-card cursor-pointer transition-all"
        >
          <div className="text-xs font-semibold uppercase tracking-wider text-ink-500 flex items-center justify-between">
            <span>Active Cases</span>
            <ChevronRight size={13} className="text-ink-300" />
          </div>
          <div className="text-3xl font-bold text-navy-900 mt-1">{caseStats?.activeCases ?? 0}</div>
          <div className="text-xs text-ink-500 mt-1">{caseStats?.awaitingForensics ?? 0} awaiting forensics</div>
        </div>

        <div
          onClick={() => onNavigate('evidence_vault')}
          className="bg-white border border-line-200 rounded-md p-4 shadow-sm hover:border-navy-400 hover:shadow-card cursor-pointer transition-all"
        >
          <div className="text-xs font-semibold uppercase tracking-wider text-ink-500 flex items-center justify-between">
            <span>Total Evidence</span>
            <ChevronRight size={13} className="text-ink-300" />
          </div>
          <div className="text-3xl font-bold text-navy-900 mt-1">{evidenceStats?.totalItems ?? 0}</div>
          <div className="text-xs text-ink-500 mt-1">
            {evidenceStats?.integrityExceptions ?? 0} integrity exception
            {(evidenceStats?.integrityExceptions ?? 0) === 1 ? '' : 's'}
          </div>
        </div>

        <div
          onClick={() => onNavigate('forensics')}
          className="bg-white border border-line-200 rounded-md p-4 shadow-sm hover:border-navy-400 hover:shadow-card cursor-pointer transition-all"
        >
          <div className="text-xs font-semibold uppercase tracking-wider text-ink-500 flex items-center justify-between">
            <span>At Forensic Lab</span>
            <ChevronRight size={13} className="text-ink-300" />
          </div>
          <div className="text-3xl font-bold text-navy-900 mt-1">{evidenceStats?.atFSL ?? 0}</div>
          <div className="text-xs text-ink-500 mt-1">{evidenceStats?.pendingForensics ?? 0} awaiting report</div>
        </div>

        <div
          onClick={() => setIsAlertsDrawerOpen(true)}
          className="bg-amber-50/50 border border-amber-300/80 rounded-md p-4 shadow-sm hover:border-amber-400 hover:shadow-card cursor-pointer transition-all"
        >
          <div className="text-xs font-semibold uppercase tracking-wider text-amber-900 flex items-center justify-between">
            <span>Attention Required</span>
            <ChevronRight size={13} className="text-amber-500" />
          </div>
          <div className="text-3xl font-bold text-amber-800 mt-1">{openAlertCounts.total}</div>
          <div className="text-xs text-amber-900/80 font-medium mt-1">
            {openAlertCounts.critical} critical · {openAlertCounts.warning} warning
          </div>
        </div>
      </div>

      {/* ── 3. PRIMARY CONTENT AREA ─────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT: Needs Attention */}
        <div className="lg:col-span-7 flex flex-col space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold uppercase tracking-wider text-navy-900">Needs Attention</h2>
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200">
                {actionableAlerts.length}
              </span>
            </div>
            <span className="text-xs text-ink-400">Actionable investigative alerts</span>
          </div>

          <div className="bg-white border border-line-200 rounded-md shadow-sm divide-y divide-line-200">
            {actionableAlerts.length === 0 && (
              <div className="p-6 text-center text-sm text-ink-500 flex flex-col items-center gap-2">
                <CheckCircle2 size={24} className="text-status-resolved" />
                No alerts require your attention.
              </div>
            )}
            {actionableAlerts.map(alert => (
              <div
                key={alert.id}
                className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-paper-50/60 transition-colors"
              >
                <div className="flex items-start gap-3 min-w-0">
                  <span
                    className={`w-2.5 h-2.5 rounded-full mt-1.5 shrink-0 ${
                      alert.severity === 'critical' ? 'bg-status-urgent' : 'bg-status-pending'
                    }`}
                  />
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-navy-900">{alert.title}</div>
                    <div className="text-xs text-ink-500 mt-0.5 flex items-center gap-2">
                      <span className="font-mono font-medium">
                        {alert.evidenceId || `FIR ${alert.caseFirNumber || alert.caseId}`}
                      </span>
                      <span>·</span>
                      <span>{timeAgo(alert.timestamp)}</span>
                    </div>
                  </div>
                </div>

                <div className="shrink-0 self-end sm:self-auto">
                  {alert.evidenceId ? (
                    <button
                      onClick={() => setInspectEvidenceId(alert.evidenceId!)}
                      className="px-3 py-1.5 text-xs font-semibold rounded bg-white border border-line-300 text-navy-900 hover:bg-paper-100 hover:border-navy-400 shadow-sm transition-colors"
                    >
                      Inspect Evidence
                    </button>
                  ) : (
                    <button
                      onClick={() => onNavigate('case_detail', alert.caseId)}
                      className="px-3 py-1.5 text-xs font-semibold rounded bg-white border border-line-300 text-navy-900 hover:bg-paper-100 hover:border-navy-400 shadow-sm transition-colors"
                    >
                      View Case
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="pt-1 text-right">
            <button
              onClick={() => setIsAlertsDrawerOpen(true)}
              className="text-xs font-semibold text-navy-800 hover:text-navy-950 inline-flex items-center gap-1 hover:underline"
            >
              View all alerts →
            </button>
          </div>
        </div>

        {/* RIGHT: Continue Working & Recent Activity */}
        <div className="lg:col-span-5 flex flex-col space-y-6">
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-bold uppercase tracking-wider text-navy-900">Continue Working</h2>
              <span className="text-xs text-ink-400">Current Focus</span>
            </div>
            <div className="bg-white border border-line-200 rounded-md p-4 shadow-sm space-y-3">
              {!focusedCase ? (
                <p className="text-sm text-ink-500 text-center py-4">No open cases assigned.</p>
              ) : (
                <>
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-mono font-bold text-navy-700 bg-navy-50 px-2 py-0.5 rounded border border-navy-100">
                        FIR {focusedCase.firNumber}
                      </span>
                      <span className="text-xs font-medium text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                        {focusedCase.status}
                      </span>
                    </div>
                    <h3 className="text-base font-bold text-navy-900 mt-2">{focusedCase.title}</h3>
                    <p className="text-xs text-ink-500 mt-1 line-clamp-2 leading-relaxed">
                      {focusedCase.description}
                    </p>
                  </div>

                  <div className="pt-3 border-t border-line-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                    <button
                      onClick={() => onNavigate('charge_sheets')}
                      className="text-navy-700 hover:text-navy-950 font-semibold inline-flex items-center gap-1.5 hover:underline"
                    >
                      <Scale size={13} className="text-saffron-600" />
                      <span>
                        Sec 173 CrPC Readiness (
                        {focusedCase.forensicProgress.total > 0
                          ? Math.round(
                              (focusedCase.forensicProgress.completed / focusedCase.forensicProgress.total) * 100
                            )
                          : 0}
                        %) →
                      </span>
                    </button>
                    <button
                      onClick={() => onNavigate('case_detail', focusedCase.caseId)}
                      className="px-3.5 py-1.5 text-xs font-semibold rounded bg-navy-900 text-white hover:bg-navy-800 shadow-sm transition-colors inline-flex items-center gap-1 shrink-0 self-end sm:self-auto"
                    >
                      Open Case →
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Recent Activity */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-xs font-bold uppercase tracking-wider text-ink-500">Recent Activity</h2>
              <span className="text-[11px] text-ink-400">Non-Actionable Updates</span>
            </div>
            <div className="bg-white border border-line-200 rounded-md shadow-sm divide-y divide-line-100">
              {activity.length === 0 && (
                <div className="p-4 text-xs text-ink-500 text-center">No recent activity recorded.</div>
              )}
              {activity.map(item => (
                <div key={item.id} className="p-3 flex items-start gap-3">
                  <div className="p-1 rounded bg-paper-100 text-ink-500 shrink-0 mt-0.5">
                    {ACTIVITY_ICONS[item.action] || <FileText size={13} className="text-ink-500" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-medium text-navy-900 truncate">{item.action}</div>
                    <div className="text-[11px] text-ink-500 mt-0.5">
                      {[item.evidenceId, item.caseFirNumber ? `FIR ${item.caseFirNumber}` : null]
                        .filter(Boolean)
                        .join(' · ')}
                      {' · '}
                      {timeAgo(item.timestamp)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Verification Modal */}
      {inspectEvidenceId && (
        <VerificationModal
          evidenceId={inspectEvidenceId}
          isOpen={!!inspectEvidenceId}
          onClose={() => {
            setInspectEvidenceId(null);
            // Integrity status may have changed — refresh the derived tiles.
            loadDashboard();
          }}
        />
      )}

      {/* All Alerts Drawer */}
      <AlertsDrawer
        isOpen={isAlertsDrawerOpen}
        onClose={() => setIsAlertsDrawerOpen(false)}
        alerts={alerts}
        onInspect={(evidenceId) => setInspectEvidenceId(evidenceId)}
        onNavigateCase={caseId => onNavigate('case_detail', caseId)}
        onAcknowledge={handleAcknowledge}
      />
    </div>
  );
};

export default PoliceDashboard;
