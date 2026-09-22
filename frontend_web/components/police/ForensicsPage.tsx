import React, { useState, useEffect } from 'react';
import {
  Search, CheckCircle, Clock, FlaskConical, Truck, PackageCheck,
  Microscope, FileCheck, Eye
} from 'lucide-react';
import { Card, Button, Table } from '../Common';
import { getAllForensicRecords, getForensicSummary } from '../../services/forensicService';
import { getEvidenceById } from '../../services/evidenceService';
import type { ForensicRecord } from '../../services/types';

// ── Helpers ──────────────────────────────────────────────────────────────────

const fmtDate = (s?: string) =>
  s ? new Date(s).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

const truncHash = (h?: string) =>
  h ? `${h.slice(0, 8)}…${h.slice(-8)}` : '—';

// ── Status badge ──────────────────────────────────────────────────────────────

const StatusPill: React.FC<{ status: ForensicRecord['examinationStatus'] }> = ({ status }) => {
  const map: Record<ForensicRecord['examinationStatus'], { cls: string; icon: React.ReactNode }> = {
    'Pending Submission': {
      cls: 'bg-paper-100 text-ink-500 border-line-300',
      icon: <Clock size={11} />,
    },
    'In Transit': {
      cls: 'bg-navy-50 text-navy-800 border-navy-100',
      icon: <Truck size={11} />,
    },
    'Received by FSL': {
      cls: 'bg-indigo-50 text-indigo-700 border-indigo-200',
      icon: <PackageCheck size={11} />,
    },
    'Under Examination': {
      cls: 'bg-status-pendingBg text-status-pending border-status-pending/20',
      icon: <Microscope size={11} />,
    },
    'Examination Complete': {
      cls: 'bg-teal-50 text-teal-700 border-teal-200',
      icon: <CheckCircle size={11} />,
    },
    'Report Available': {
      cls: 'bg-status-resolvedBg text-status-resolved border-status-resolved/20',
      icon: <FileCheck size={11} />,
    },
  };
  const { cls, icon } = map[status];
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${cls}`}>
      {icon} {status}
    </span>
  );
};

// ── Summary stat card ────────────────────────────────────────────────────────

const SummaryCard: React.FC<{
  label: string;
  count: number;
  icon: React.ReactNode;
  color: string;
}> = ({ label, count, icon, color }) => (
  <div className={`bg-white border border-line-200 rounded-sm px-4 py-4 shadow-card`}>
    <div className="flex items-center justify-between mb-2">
      <div className={`${color}`}>{icon}</div>
    </div>
    <p className={`text-2xl font-bold text-navy-900`}>{count}</p>
    <p className="text-xs text-ink-500 mt-0.5 leading-tight">{label}</p>
  </div>
);

// ── Case progress bar ────────────────────────────────────────────────────────

const CaseProgressBar: React.FC<{
  caseId: string;
  completed: number;
  total: number;
}> = ({ caseId, completed, total }) => {
  const pct = total > 0 ? (completed / total) * 100 : 0;
  return (
    <div className="py-3">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-sm font-semibold text-navy-900">{caseId}</span>
        <span className="text-xs font-medium text-ink-500">{completed}/{total} items examined</span>
      </div>
      <div className="h-2 bg-paper-100 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all"
          style={{
            width: `${pct}%`,
            background: pct === 100 ? 'var(--color-status-resolved, #16a34a)' : '#3b82f6'
          }}
        />
      </div>
    </div>
  );
};

// ── Props ─────────────────────────────────────────────────────────────────────

interface Props {
  onNavigate: (view: string, id?: string) => void;
}

// ── Evidence type lookup cache (minimal) ──────────────────────────────────────

async function fetchEvidenceType(evidenceId: string): Promise<string> {
  const ev = await getEvidenceById(evidenceId);
  return ev?.type ?? 'Unknown';
}

// ════════════════════════════════════════════════════════════════════════════
// Main component
// ════════════════════════════════════════════════════════════════════════════

const ForensicsPage: React.FC<Props> = ({ onNavigate }) => {
  const [records, setRecords] = useState<ForensicRecord[]>([]);
  const [summary, setSummary] = useState<any>({});
  const [evidenceTypes, setEvidenceTypes] = useState<Record<string, string>>({});
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const [recs, sum] = await Promise.all([getAllForensicRecords(), getForensicSummary()]);
      setRecords(recs);
      setSummary(sum);

      // Fetch evidence types in parallel
      const typeMap: Record<string, string> = {};
      await Promise.all(
        recs.map(async r => {
          typeMap[r.evidenceId] = await fetchEvidenceType(r.evidenceId);
        })
      );
      setEvidenceTypes(typeMap);
      setLoading(false);
    };
    load();
  }, []);

  const filtered = records.filter(r => {
    if (statusFilter !== 'all' && r.examinationStatus !== statusFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        r.evidenceId.toLowerCase().includes(q) ||
        r.fslRef.toLowerCase().includes(q) ||
        r.fslName.toLowerCase().includes(q) ||
        (r.examiner?.toLowerCase().includes(q) ?? false)
      );
    }
    return true;
  });

  // Group by case for progress bars
  const caseGroups: Record<string, { completed: number; total: number }> = {};
  for (const r of records) {
    if (!caseGroups[r.caseId]) caseGroups[r.caseId] = { completed: 0, total: 0 };
    caseGroups[r.caseId].total++;
    if (r.examinationStatus === 'Examination Complete' || r.examinationStatus === 'Report Available') {
      caseGroups[r.caseId].completed++;
    }
  }
  const topCases = Object.entries(caseGroups).slice(0, 3);

  const statusOrders: ForensicRecord['examinationStatus'][] = [
    'Pending Submission', 'In Transit', 'Received by FSL',
    'Under Examination', 'Examination Complete', 'Report Available'
  ];

  const summaryDefs = [
    { key: 'Pending Submission', label: 'Pending Submission', icon: <Clock size={18} />, color: 'text-ink-400' },
    { key: 'In Transit', label: 'In Transit', icon: <Truck size={18} />, color: 'text-navy-700' },
    { key: 'Received by FSL', label: 'Received by FSL', icon: <PackageCheck size={18} />, color: 'text-indigo-600' },
    { key: 'Under Examination', label: 'Under Examination', icon: <Microscope size={18} />, color: 'text-status-pending' },
    { key: 'Examination Complete', label: 'Examination Complete', icon: <CheckCircle size={18} />, color: 'text-teal-600' },
    { key: 'Report Available', label: 'Report Available', icon: <FileCheck size={18} />, color: 'text-status-resolved' },
  ];

  const selectClass = "px-3 py-2 border border-line-300 rounded-sm bg-white text-ink-900 text-sm outline-none focus:border-navy-500 focus:ring-1 focus:ring-navy-500 transition-colors";

  return (
    <div className="min-h-screen bg-paper-50">
      {/* Header */}
      <div className="bg-white border-b border-line-200 px-6 py-5">
        <h1 className="text-2xl font-bold text-navy-900">Forensic Laboratory Tracking</h1>
        <p className="text-sm text-ink-500 mt-1">
          Track the examination status of evidence items submitted to the Forensic Science Laboratory.
        </p>
      </div>

      <div className="p-6 space-y-5">
        {/* Summary Stats */}
        <div className="grid grid-cols-6 gap-3">
          {summaryDefs.map(def => (
            <SummaryCard
              key={def.key}
              label={def.label}
              count={summary[def.key] ?? 0}
              icon={def.icon}
              color={def.color}
            />
          ))}
        </div>

        {/* Case Progress Bars */}
        {topCases.length > 0 && (
          <Card title="Forensic Progress by Case">
            <div className="divide-y divide-line-200">
              {topCases.map(([caseId, data]) => (
                <CaseProgressBar
                  key={caseId}
                  caseId={caseId}
                  completed={data.completed}
                  total={data.total}
                />
              ))}
            </div>
          </Card>
        )}

        {/* Filters */}
        <div className="bg-white border border-line-200 rounded-sm shadow-card p-4">
          <div className="flex flex-wrap gap-3 items-center">
            <div className="relative flex-1 min-w-[200px]">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
              <input
                type="text"
                placeholder="Search evidence ID, FSL reference, examiner…"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 border border-line-300 rounded-sm bg-white text-ink-900 placeholder:text-ink-300 text-sm outline-none focus:border-navy-500 focus:ring-1 focus:ring-navy-500 transition-colors"
              />
            </div>
            <select className={selectClass} value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
              <option value="all">All Statuses</option>
              {statusOrders.map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
            {(statusFilter !== 'all' || searchQuery) && (
              <button
                onClick={() => { setStatusFilter('all'); setSearchQuery(''); }}
                className="text-xs text-ink-400 hover:text-status-urgent underline"
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {/* Records Table */}
        {loading ? (
          <div className="flex items-center justify-center h-48 text-ink-500">
            <div className="w-6 h-6 border-2 border-navy-900 border-t-transparent rounded-full animate-spin mr-3" />
            Loading forensic records…
          </div>
        ) : (
          <div>
            <div className="text-xs text-ink-500 mb-2 px-1">
              {filtered.length} record{filtered.length !== 1 ? 's' : ''} found
            </div>
            <Table headers={[
              'Evidence ID', 'Evidence Type', 'Case', 'FSL Reference', 'FSL Name',
              'Submitted', 'Received', 'Examination Status', 'Report Status', 'Examiner', 'Actions'
            ]}>
              {filtered.map(fr => (
                <tr key={fr.evidenceId} className="hover:bg-paper-50 transition-colors">
                  <td className="px-5 py-3 whitespace-nowrap">
                    <button
                      onClick={() => onNavigate('evidence_detail', fr.evidenceId)}
                      className="font-mono text-xs font-semibold text-navy-700 hover:text-navy-900 hover:underline"
                    >
                      {fr.evidenceId}
                    </button>
                  </td>
                  <td className="px-5 py-3 whitespace-nowrap text-xs text-ink-600">
                    {evidenceTypes[fr.evidenceId] ?? '—'}
                  </td>
                  <td className="px-5 py-3 whitespace-nowrap text-xs font-medium text-navy-700">{fr.caseId}</td>
                  <td className="px-5 py-3 whitespace-nowrap font-mono text-xs text-ink-700">{fr.fslRef}</td>
                  <td className="px-5 py-3 whitespace-nowrap text-xs text-ink-700">{fr.fslName}</td>
                  <td className="px-5 py-3 whitespace-nowrap text-xs text-ink-500">{fmtDate(fr.submittedDate)}</td>
                  <td className="px-5 py-3 whitespace-nowrap text-xs text-ink-500">{fmtDate(fr.receivedDate)}</td>
                  <td className="px-5 py-3 whitespace-nowrap">
                    <StatusPill status={fr.examinationStatus} />
                  </td>
                  <td className="px-5 py-3">
                    {fr.reportHash ? (
                      <div>
                        <div className="flex items-center gap-1.5 text-xs text-status-resolved font-semibold mb-0.5">
                          <CheckCircle size={11} /> Available
                        </div>
                        <span className="font-mono text-xs text-ink-500">{truncHash(fr.reportHash)}</span>
                        {fr.reportBlockchainVerified && (
                          <div className="text-xs text-status-resolved mt-0.5">✓ Verified on Ledger</div>
                        )}
                      </div>
                    ) : (
                      <span className="text-xs text-ink-400">Not available</span>
                    )}
                  </td>
                  <td className="px-5 py-3 whitespace-nowrap text-xs text-ink-700">{fr.examiner ?? '—'}</td>
                  <td className="px-5 py-3 whitespace-nowrap">
                    <Button size="sm" variant="ghost" onClick={() => onNavigate('evidence_detail', fr.evidenceId)}>
                      <Eye size={13} /> View
                    </Button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={11} className="px-5 py-12 text-center text-sm text-ink-400">
                    No forensic records match the current filters.
                  </td>
                </tr>
              )}
            </Table>
          </div>
        )}
      </div>
    </div>
  );
};

export default ForensicsPage;

