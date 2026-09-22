import React, { useEffect, useState } from 'react';
import {
  Briefcase,
  Package,
  FlaskConical,
  ArrowRightLeft,
  ShieldAlert,
  AlertOctagon,
  AlertTriangle,
  Info,
  ChevronRight,
} from 'lucide-react';
import { Card, Button, Badge, Table } from '../Common';
import { useStore } from '../../store';
import { getCases, getCaseStats } from '../../services/caseService';
import type { CaseStats } from '../../services/caseService';
import { getEvidenceStats } from '../../services/evidenceService';
import type { EvidenceStats } from '../../services/evidenceService';
import { getAlerts, getOpenAlertsCount } from '../../services/auditService';
import type { IOCase, IOAlert } from '../../services/types';

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

const CocBadge = ({ status }: { status: IOCase['cocStatus'] }) => {
  const map: Record<IOCase['cocStatus'], 'green' | 'yellow' | 'red'> = {
    Verified: 'green',
    Pending: 'yellow',
    Exception: 'red',
  };
  return <Badge color={map[status]}>{status}</Badge>;
};

const StatusBadge = ({ status }: { status: IOCase['status'] }) => {
  const map: Record<IOCase['status'], 'gray' | 'blue' | 'yellow' | 'green' | 'red'> = {
    Open: 'gray',
    'Under Investigation': 'blue',
    'Awaiting Forensics': 'yellow',
    'Charge Sheet Preparation': 'green',
    'Submitted to Court': 'blue',
    Closed: 'gray',
    Frozen: 'red',
  };
  return <Badge color={map[status]}>{status}</Badge>;
};

// ─── KPI Card ────────────────────────────────────────────────────────────────

interface KpiCardProps {
  label: string;
  value: number | string;
  icon: React.ReactNode;
  borderColor: string;
  valueColor?: string;
}

const KpiCard = ({ label, value, icon, borderColor, valueColor = 'text-navy-900' }: KpiCardProps) => (
  <div
    className={`bg-white border border-line-200 shadow-card rounded-sm overflow-hidden border-l-4 ${borderColor} flex items-start justify-between p-5`}
  >
    <div>
      <p className="text-xs font-semibold text-ink-500 uppercase tracking-wide mb-2">{label}</p>
      <p className={`text-3xl font-bold ${valueColor} leading-none`}>{value}</p>
    </div>
    <div className="text-ink-300 mt-0.5">{icon}</div>
  </div>
);

// ─── Main Component ──────────────────────────────────────────────────────────

const EMPTY_CASE_STATS: CaseStats = {
  activeCases: 0,
  underInvestigation: 0,
  awaitingForensics: 0,
  chargeSheetPrep: 0,
  closed: 0,
  total: 0,
};

const EMPTY_EVIDENCE_STATS: EvidenceStats = {
  totalItems: 0,
  total: 0,
  atFSL: 0,
  atFsl: 0,
  inTransit: 0,
  integrityExceptions: 0,
  pendingForensics: 0,
};

export const PoliceDashboardHome: React.FC<NavProps> = ({ onNavigate }) => {
  const { currentUser } = useStore();

  const [caseStats, setCaseStats] = useState<CaseStats>(EMPTY_CASE_STATS);
  const [evidenceStats, setEvidenceStats] = useState<EvidenceStats>(EMPTY_EVIDENCE_STATS);
  const [openAlertCount, setOpenAlertCount] = useState(0);
  const [activeCases, setActiveCases] = useState<IOCase[]>([]);
  const [topAlerts, setTopAlerts] = useState<IOAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      try {
        const [cs, es, alertCount, cases, alerts] = await Promise.all([
          getCaseStats(),
          getEvidenceStats(),
          getOpenAlertsCount(),
          getCases(),
          getAlerts(),
        ]);
        if (cancelled) return;
        setCaseStats(cs);
        setEvidenceStats(es);
        setOpenAlertCount(alertCount);
        setActiveCases(cases.filter(c => c.status !== 'Closed').slice(0, 6));
        setTopAlerts(alerts.filter(a => a.status === 'Open').slice(0, 4));
        setError(null);
      } catch (err: any) {
        if (cancelled) return;
        setError(err?.message || 'Unable to load dashboard data.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const today = new Date().toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-ink-500">
        <div className="w-6 h-6 border-2 border-navy-900 border-t-transparent rounded-full animate-spin mr-3" />
        <span className="text-sm">Loading dashboard…</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ── Page Header ────────────────────────────────────────────────── */}
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-bold text-navy-900 tracking-tight">Dashboard</h1>
          <p className="text-sm text-ink-500 mt-0.5">
            Welcome,{' '}
            <span className="font-semibold text-ink-700">
              {currentUser?.name ?? 'SI Arun Kumar'}
            </span>
          </p>
        </div>
        <span className="text-xs font-medium text-ink-500 bg-paper-100 border border-line-200 px-3 py-1.5 rounded-sm">
          Today: {today}
        </span>
      </div>

      {error && (
        <div className="flex items-center gap-2 border border-status-urgent/20 bg-status-urgentBg text-status-urgent rounded-sm px-4 py-3">
          <AlertTriangle size={16} className="shrink-0" />
          <span className="text-sm font-medium">{error}</span>
        </div>
      )}

      {/* ── KPI Cards ──────────────────────────────────────────────────── */}
      <div className="grid grid-cols-5 gap-4">
        <KpiCard
          label="Active Cases"
          value={caseStats.activeCases}
          icon={<Briefcase size={22} />}
          borderColor="border-navy-700"
          valueColor="text-navy-900"
        />
        <KpiCard
          label="Evidence Items"
          value={evidenceStats.totalItems}
          icon={<Package size={22} />}
          borderColor="border-line-300"
          valueColor="text-ink-900"
        />
        <KpiCard
          label="At FSL"
          value={evidenceStats.atFSL}
          icon={<FlaskConical size={22} />}
          borderColor="border-status-pending"
          valueColor="text-status-pending"
        />
        <KpiCard
          label="Pending Transfers"
          value={evidenceStats.inTransit}
          icon={<ArrowRightLeft size={22} />}
          borderColor="border-amber-500"
          valueColor="text-amber-700"
        />
        <KpiCard
          label="Integrity Exceptions"
          value={evidenceStats.integrityExceptions}
          icon={<ShieldAlert size={22} />}
          borderColor="border-status-urgent"
          valueColor="text-status-urgent"
        />
      </div>

      {/* ── Active Cases Table ─────────────────────────────────────────── */}
      <Card
        padded={false}
        title="Active Cases"
        action={
          <Button variant="ghost" size="sm" onClick={() => onNavigate('cases')}>
            View All Cases <ChevronRight size={14} />
          </Button>
        }
      >
        <Table
          headers={[
            'FIR No.',
            'Case Title',
            'Investigating Officer',
            'Evidence',
            'Forensic Progress',
            'CoC Status',
            'Status',
            'Last Updated',
          ]}
        >
          {activeCases.map(c => {
            const pct = c.forensicProgress.total > 0
              ? Math.round((c.forensicProgress.completed / c.forensicProgress.total) * 100)
              : 0;
            return (
              <tr key={c.caseId} className="hover:bg-paper-50 transition-colors">
                {/* FIR No */}
                <td className="px-5 py-3 whitespace-nowrap">
                  <button
                    className="font-mono text-sm text-navy-700 hover:text-navy-900 hover:underline font-semibold"
                    onClick={() => onNavigate('case_detail', c.caseId)}
                  >
                    {c.firNumber}
                  </button>
                </td>
                {/* Title */}
                <td className="px-5 py-3">
                  <span className="text-sm text-ink-900 font-medium line-clamp-1 max-w-[200px] block">
                    {c.title}
                  </span>
                  <span className="text-xs text-ink-500">{c.policeStation}</span>
                </td>
                {/* Officer */}
                <td className="px-5 py-3 text-sm text-ink-700 whitespace-nowrap">
                  {c.investigatingOfficer}
                </td>
                {/* Evidence */}
                <td className="px-5 py-3 text-sm text-ink-700 text-center">
                  {c.evidenceCount}
                </td>
                {/* Forensic Progress */}
                <td className="px-5 py-3 min-w-[110px]">
                  <span className="text-xs font-mono text-ink-700">
                    {c.forensicProgress.completed}/{c.forensicProgress.total}
                  </span>
                  <div className="mt-1 h-1.5 bg-line-200 rounded-full overflow-hidden w-24">
                    <div
                      className={`h-full rounded-full ${pct === 100 ? 'bg-status-resolved' : pct >= 60 ? 'bg-status-pending' : 'bg-status-urgent'}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </td>
                {/* CoC Status */}
                <td className="px-5 py-3">
                  <CocBadge status={c.cocStatus} />
                </td>
                {/* Status */}
                <td className="px-5 py-3">
                  <StatusBadge status={c.status} />
                </td>
                {/* Last Updated */}
                <td className="px-5 py-3 text-xs text-ink-500 whitespace-nowrap">
                  {relativeTime(c.lastUpdated)}
                </td>
              </tr>
            );
          })}
          {activeCases.length === 0 && (
            <tr>
              <td colSpan={8} className="px-5 py-12 text-center text-sm text-ink-400">
                No active cases are assigned to your station.
              </td>
            </tr>
          )}
        </Table>
      </Card>

      {/* ── Alerts Feed ────────────────────────────────────────────────── */}
      <Card
        padded={false}
        title={
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-navy-900 tracking-wide uppercase">
              Active Alerts
            </span>
            <span className="inline-flex items-center justify-center h-5 min-w-[20px] px-1.5 rounded-full bg-status-urgent text-white text-xs font-bold">
              {openAlertCount}
            </span>
          </div>
        }
        action={
          <Button variant="ghost" size="sm" onClick={() => onNavigate('alerts')}>
            View All <ChevronRight size={14} />
          </Button>
        }
      >
        <div className="divide-y divide-line-200">
          {topAlerts.length === 0 && (
            <div className="px-5 py-10 text-center text-sm text-ink-400">
              No open alerts.
            </div>
          )}
          {topAlerts.map(alert => {
            const isCritical = alert.severity === 'critical';
            const isWarning = alert.severity === 'warning';

            const SeverityIcon =
              isCritical ? AlertOctagon : isWarning ? AlertTriangle : Info;
            const iconColor = isCritical
              ? 'text-status-urgent'
              : isWarning
              ? 'text-amber-600'
              : 'text-blue-600';
            const borderColor = isCritical
              ? 'border-l-status-urgent'
              : isWarning
              ? 'border-l-amber-500'
              : 'border-l-blue-500';
            const bgColor = isCritical ? 'bg-status-urgentBg' : 'bg-white';

            return (
              <div
                key={alert.id}
                className={`flex items-start gap-4 px-5 py-4 border-l-4 ${borderColor} ${bgColor}`}
              >
                <SeverityIcon size={18} className={`mt-0.5 shrink-0 ${iconColor}`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-0.5">
                    <span className="text-sm font-semibold text-ink-900">{alert.title}</span>
                    <span className="text-xs text-ink-400 whitespace-nowrap shrink-0">
                      {relativeTime(alert.timestamp)}
                    </span>
                  </div>
                  <p className="text-xs text-ink-500 mb-1">
                    {alert.caseFirNumber && <>FIR {alert.caseFirNumber}</>}
                    {alert.evidenceId && (
                      <> &nbsp;·&nbsp; Evidence {alert.evidenceId}</>
                    )}
                  </p>
                  <p className="text-xs text-ink-700 line-clamp-2 mb-2">{alert.description}</p>
                  <div className="flex gap-2">
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
                </div>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
};

export default PoliceDashboardHome;
