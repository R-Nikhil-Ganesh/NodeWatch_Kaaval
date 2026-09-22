import React, { useState, useEffect } from 'react';
import { Search, Filter, Phone, Film, Droplets, FileText, Eye, ChevronDown, X } from 'lucide-react';
import { Card, Button, Table } from '../Common';
import { searchEvidence, getEvidenceStats } from '../../services/evidenceService';
import type { EvidenceStats } from '../../services/evidenceService';
import type {
  IOEvidence,
  StorageStatus,
  EvidenceIntegrityStatus,
  ForensicExaminationStatus,
} from '../../services/types';

// ── Helpers ──────────────────────────────────────────────────────────────────

const fmtDate = (s: string) =>
  new Date(s).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
const fmtTime = (s: string) =>
  new Date(s).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false });

// ── Status badges ─────────────────────────────────────────────────────────────

const EvidenceStatusPill: React.FC<{ status: IOEvidence['status'] }> = ({ status }) => {
  const map: Record<IOEvidence['status'], string> = {
    'Secure Storage': 'bg-status-resolvedBg text-status-resolved border-status-resolved/20',
    'At FSL': 'bg-purple-50 text-purple-700 border-purple-200',
    'In Transit': 'bg-status-pendingBg text-status-pending border-status-pending/20',
    'Returned': 'bg-navy-50 text-navy-800 border-navy-100',
    'Disposed': 'bg-paper-100 text-ink-500 border-line-300',
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${map[status]}`}>
      {status}
    </span>
  );
};

import { CheckCircle, AlertTriangle, Clock } from 'lucide-react';

const IntegrityPill: React.FC<{ status: IOEvidence['integrityStatus'] }> = ({ status }) => {
  const map: Record<IOEvidence['integrityStatus'], string> = {
    'Verified': 'bg-status-resolvedBg text-status-resolved border-status-resolved/20',
    'Compromised': 'bg-status-urgentBg text-status-urgent border-status-urgent/20',
    'Pending': 'bg-status-pendingBg text-status-pending border-status-pending/20',
    'Not Checked': 'bg-paper-100 text-ink-500 border-line-300',
  };
  const icons: Record<IOEvidence['integrityStatus'], React.ReactNode> = {
    'Verified': <CheckCircle size={11} />,
    'Compromised': <AlertTriangle size={11} />,
    'Pending': <Clock size={11} />,
    'Not Checked': <Clock size={11} />,
  };
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${map[status]}`}>
      {icons[status]} {status}
    </span>
  );
};

const ForensicPill: React.FC<{ status: IOEvidence['forensicStatus'] }> = ({ status }) => {
  const map: Record<IOEvidence['forensicStatus'], string> = {
    'Pending Submission': 'bg-paper-100 text-ink-500 border-line-300',
    'In Transit': 'bg-navy-50 text-navy-800 border-navy-100',
    'Received by FSL': 'bg-indigo-50 text-indigo-700 border-indigo-200',
    'Under Examination': 'bg-status-pendingBg text-status-pending border-status-pending/20',
    'Examination Complete': 'bg-teal-50 text-teal-700 border-teal-200',
    'Report Available': 'bg-status-resolvedBg text-status-resolved border-status-resolved/20',
    'Not Required': 'bg-paper-100 text-ink-400 border-line-200',
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${map[status]}`}>
      {status}
    </span>
  );
};

const EvidenceTypeIcon: React.FC<{ type: string }> = ({ type }) => {
  const t = type.toLowerCase();
  if (t.includes('mobile') || t.includes('phone')) return <Phone size={14} className="text-navy-700" />;
  if (t.includes('cctv') || t.includes('video') || t.includes('footage')) return <Film size={14} className="text-purple-600" />;
  if (t.includes('bio') || t.includes('blood') || t.includes('sample')) return <Droplets size={14} className="text-red-600" />;
  return <FileText size={14} className="text-ink-500" />;
};

// ── Filter chip ───────────────────────────────────────────────────────────────

const FilterChip: React.FC<{ label: string; onRemove: () => void }> = ({ label, onRemove }) => (
  <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-navy-50 text-navy-800 border border-navy-100 rounded-full text-xs font-medium">
    {label}
    <button onClick={onRemove} className="text-navy-400 hover:text-navy-900 ml-0.5">
      <X size={11} />
    </button>
  </span>
);

// ── Props ─────────────────────────────────────────────────────────────────────

interface Props {
  onNavigate: (view: string, id?: string) => void;
}

// ── Stat card ─────────────────────────────────────────────────────────────────

const StatCard: React.FC<{ label: string; value: number; color?: string }> = ({ label, value, color = 'text-navy-900' }) => (
  <div className="bg-white border border-line-200 rounded-sm px-5 py-4 shadow-card">
    <p className={`text-2xl font-bold ${color}`}>{value}</p>
    <p className="text-xs text-ink-500 mt-0.5">{label}</p>
  </div>
);

// ════════════════════════════════════════════════════════════════════════════
// Main component
// ════════════════════════════════════════════════════════════════════════════

// The real evidence categories present in the database. Keeping this list in
// one place stops the dropdown drifting away from the data again.
const EVIDENCE_TYPES = [
  'Mobile Device',
  'CCTV Footage',
  'Fingerprint Lift',
  'Blood Sample',
  'Written Statement',
  'Weapon',
  'Physical Sample',
  'Stolen Goods',
  'Accused Clothing',
  'Laptop Computer',
  'Bank Documents',
  'Corporate Server Log Archive',
];

const EMPTY_STATS: EvidenceStats = {
  totalItems: 0,
  total: 0,
  atFSL: 0,
  atFsl: 0,
  inTransit: 0,
  integrityExceptions: 0,
  pendingForensics: 0,
};

const EvidencePage: React.FC<Props> = ({ onNavigate }) => {
  const [evidence, setEvidence] = useState<IOEvidence[]>([]);
  const [stats, setStats] = useState<EvidenceStats>(EMPTY_STATS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [forensicFilter, setForensicFilter] = useState('all');
  const [integrityFilter, setIntegrityFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  const activeFilters: { label: string; clear: () => void }[] = [
    ...(typeFilter !== 'all' ? [{ label: `Type: ${typeFilter}`, clear: () => setTypeFilter('all') }] : []),
    ...(statusFilter !== 'all' ? [{ label: `Status: ${statusFilter}`, clear: () => setStatusFilter('all') }] : []),
    ...(forensicFilter !== 'all' ? [{ label: `Forensic: ${forensicFilter}`, clear: () => setForensicFilter('all') }] : []),
    ...(integrityFilter !== 'all' ? [{ label: `Integrity: ${integrityFilter}`, clear: () => setIntegrityFilter('all') }] : []),
    ...(searchQuery ? [{ label: `"${searchQuery}"`, clear: () => setSearchQuery('') }] : []),
  ];

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    const timer = setTimeout(() => {
      Promise.all([
        // Single options object — the server does the filtering.
        searchEvidence({
          type: typeFilter !== 'all' ? typeFilter : undefined,
          status: statusFilter !== 'all' ? (statusFilter as StorageStatus) : undefined,
          forensicStatus:
            forensicFilter !== 'all' ? (forensicFilter as ForensicExaminationStatus) : undefined,
          integrityStatus:
            integrityFilter !== 'all' ? (integrityFilter as EvidenceIntegrityStatus) : undefined,
          query: searchQuery.trim() || undefined,
        }),
        getEvidenceStats(),
      ])
        .then(([ev, st]) => {
          if (cancelled) return;
          setEvidence(ev);
          setStats(st);
          setError(null);
        })
        .catch((err: any) => {
          if (cancelled) return;
          setEvidence([]);
          setStats(EMPTY_STATS);
          setError(err?.message || 'Unable to load evidence.');
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    }, searchQuery.trim() ? 300 : 0);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [typeFilter, statusFilter, forensicFilter, integrityFilter, searchQuery]);

  const selectClass = "px-3 py-2 border border-line-300 rounded-sm bg-white text-ink-900 text-sm outline-none focus:border-navy-500 focus:ring-1 focus:ring-navy-500 transition-colors";

  return (
    <div className="min-h-screen bg-paper-50">
      {/* Header */}
      <div className="bg-white border-b border-line-200 px-6 py-5">
        <h1 className="text-2xl font-bold text-navy-900">Evidence</h1>
        <p className="text-sm text-ink-500 mt-1">All evidence items registered in the system</p>
      </div>

      <div className="p-6 space-y-5">
        {error && (
          <div className="flex items-center gap-2 border border-status-urgent/20 bg-status-urgentBg text-status-urgent rounded-sm px-4 py-3">
            <AlertTriangle size={16} className="shrink-0" />
            <span className="text-sm font-medium">{error}</span>
          </div>
        )}

        {/* Stats Bar */}
        <div className="grid grid-cols-4 gap-4">
          <StatCard label="Total Items" value={stats.total} />
          <StatCard label="At FSL" value={stats.atFsl} color="text-purple-700" />
          <StatCard label="In Transit" value={stats.inTransit} color="text-status-pending" />
          <StatCard label="Integrity Exceptions" value={stats.integrityExceptions} color="text-status-urgent" />
        </div>

        {/* Filter Panel */}
        <div className="bg-white border border-line-200 rounded-sm shadow-card p-4 space-y-3">
          <div className="flex flex-wrap gap-3 items-center">
            {/* Search */}
            <div className="relative flex-1 min-w-[200px]">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
              <input
                type="text"
                placeholder="Search evidence ID, type, description…"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 border border-line-300 rounded-sm bg-white text-ink-900 placeholder:text-ink-300 text-sm outline-none focus:border-navy-500 focus:ring-1 focus:ring-navy-500 transition-colors"
              />
            </div>

            {/* Filter dropdowns */}
            <div className="flex items-center gap-2 flex-wrap">
              <Filter size={14} className="text-ink-400" />

              <div className="relative">
                <select className={selectClass} value={typeFilter} onChange={e => setTypeFilter(e.target.value)}>
                  <option value="all">All Types</option>
                  {EVIDENCE_TYPES.map(t => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>

              <div className="relative">
                <select className={selectClass} value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
                  <option value="all">All Statuses</option>
                  <option value="Secure Storage">Secure Storage</option>
                  <option value="At FSL">At FSL</option>
                  <option value="In Transit">In Transit</option>
                  <option value="Returned">Returned</option>
                  <option value="Disposed">Disposed</option>
                </select>
              </div>

              <div className="relative">
                <select className={selectClass} value={forensicFilter} onChange={e => setForensicFilter(e.target.value)}>
                  <option value="all">All Forensic Statuses</option>
                  <option value="Pending Submission">Pending Submission</option>
                  <option value="In Transit">In Transit</option>
                  <option value="Received by FSL">Received by FSL</option>
                  <option value="Under Examination">Under Examination</option>
                  <option value="Examination Complete">Examination Complete</option>
                  <option value="Report Available">Report Available</option>
                  <option value="Not Required">Not Required</option>
                </select>
              </div>

              <div className="relative">
                <select className={selectClass} value={integrityFilter} onChange={e => setIntegrityFilter(e.target.value)}>
                  <option value="all">All Integrity</option>
                  <option value="Verified">Verified</option>
                  <option value="Compromised">Compromised</option>
                  <option value="Pending">Pending</option>
                  <option value="Not Checked">Not Checked</option>
                </select>
              </div>

              {activeFilters.length > 0 && (
                <button
                  onClick={() => {
                    setTypeFilter('all');
                    setStatusFilter('all');
                    setForensicFilter('all');
                    setIntegrityFilter('all');
                    setSearchQuery('');
                  }}
                  className="text-xs text-ink-400 hover:text-status-urgent underline"
                >
                  Clear all
                </button>
              )}
            </div>
          </div>

          {/* Active filter chips */}
          {activeFilters.length > 0 && (
            <div className="flex flex-wrap gap-2 pt-1">
              {activeFilters.map((f, i) => (
                <FilterChip key={i} label={f.label} onRemove={f.clear} />
              ))}
            </div>
          )}
        </div>

        {/* Evidence Table */}
        {loading ? (
          <div className="flex items-center justify-center h-48 text-ink-500">
            <div className="w-6 h-6 border-2 border-navy-900 border-t-transparent rounded-full animate-spin mr-3" />
            Loading evidence…
          </div>
        ) : (
          <div>
            <div className="text-xs text-ink-500 mb-2 px-1">{evidence.length} item{evidence.length !== 1 ? 's' : ''} found</div>
            <Table headers={[
              'Evidence ID', 'Type', 'Case', 'Description', 'Collected',
              'Current Location', 'Custodian', 'Status', 'Integrity', 'Forensic', 'Actions'
            ]}>
              {evidence.map(ev => (
                <tr key={ev.evidenceId} className="hover:bg-paper-50 transition-colors">
                  <td className="px-5 py-3 whitespace-nowrap">
                    <button
                      onClick={() => onNavigate('evidence_detail', ev.evidenceId)}
                      className="font-mono text-xs font-semibold text-navy-700 hover:text-navy-900 hover:underline"
                    >
                      {ev.evidenceId}
                    </button>
                  </td>
                  <td className="px-5 py-3 whitespace-nowrap">
                    <div className="flex items-center gap-1.5 text-xs text-ink-700">
                      <EvidenceTypeIcon type={ev.type} />
                      {ev.type}
                    </div>
                  </td>
                  <td className="px-5 py-3 whitespace-nowrap text-xs font-medium text-navy-700">
                    <button
                      onClick={() => onNavigate('case_detail', ev.caseId)}
                      className="hover:text-navy-900 hover:underline"
                    >
                      {ev.caseFirNumber ?? ev.caseId}
                    </button>
                  </td>
                  <td className="px-5 py-3 max-w-[200px]">
                    <span className="text-xs text-ink-700" title={ev.description}>
                      {ev.description.length > 40 ? ev.description.slice(0, 40) + '…' : ev.description}
                    </span>
                  </td>
                  <td className="px-5 py-3 whitespace-nowrap text-xs text-ink-500">
                    <div>{fmtDate(ev.collectedAt)}</div>
                    <div className="text-ink-400">{fmtTime(ev.collectedAt)}</div>
                  </td>
                  <td className="px-5 py-3 text-xs text-ink-500">{ev.currentLocation}</td>
                  <td className="px-5 py-3 text-xs text-ink-700">{ev.currentCustodian}</td>
                  <td className="px-5 py-3 whitespace-nowrap"><EvidenceStatusPill status={ev.status} /></td>
                  <td className="px-5 py-3 whitespace-nowrap"><IntegrityPill status={ev.integrityStatus} /></td>
                  <td className="px-5 py-3 whitespace-nowrap"><ForensicPill status={ev.forensicStatus} /></td>
                  <td className="px-5 py-3 whitespace-nowrap">
                    <Button size="sm" variant="ghost" onClick={() => onNavigate('evidence_detail', ev.evidenceId)}>
                      <Eye size={13} /> View
                    </Button>
                  </td>
                </tr>
              ))}
              {evidence.length === 0 && (
                <tr>
                  <td colSpan={11} className="px-5 py-12 text-center text-sm text-ink-400">
                    No evidence items match the current filters.
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

export default EvidencePage;

