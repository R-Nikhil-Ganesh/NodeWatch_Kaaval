import React, { useState, useMemo } from 'react';
import { ShieldCheck, ShieldX, Download, X, Search } from 'lucide-react';
import { Card, Badge, Button, Table } from '../Common';
import { getAuditEvents } from '../../services/auditService';
import type { AuditFilters } from '../../services/auditService';

interface NavProps {
  onNavigate: (view: string, id?: string) => void;
}

// ─── helpers ────────────────────────────────────────────────────────────────

const formatTimestamp = (iso: string): { time: string; date: string } => {
  const d = new Date(iso);
  const time = d.toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
  const date = d.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
  return { time, date };
};

// ─── Verification Badge ──────────────────────────────────────────────────────

const VerificationBadge = ({
  status,
}: {
  status: 'Verified' | 'Pending' | 'Failed';
}) => {
  if (status === 'Verified')
    return (
      <Badge color="green">
        <ShieldCheck size={11} />
        Verified
      </Badge>
    );
  if (status === 'Failed')
    return (
      <Badge color="red">
        <ShieldX size={11} />
        Failed
      </Badge>
    );
  return <Badge color="yellow">Pending</Badge>;
};

// ─── Main Component ──────────────────────────────────────────────────────────

export const AuditLogPage: React.FC<NavProps> = ({ onNavigate: _onNavigate }) => {
  const [filters, setFilters] = useState<AuditFilters>({});
  const [query, setQuery] = useState('');
  const [filterCaseId, setFilterCaseId] = useState('');
  const [filterEvidenceId, setFilterEvidenceId] = useState('');
  const [filterAction, setFilterAction] = useState('');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');

  // Derive all events unfiltered for building select options
  const allEvents = useMemo(() => getAuditEvents(), []);

  const uniqueCaseIds = useMemo(
    () => [...new Set(allEvents.map(e => e.caseId).filter(Boolean))] as string[],
    [allEvents],
  );

  const uniqueActions = useMemo(
    () => [...new Set(allEvents.map(e => e.action))],
    [allEvents],
  );

  const events = useMemo(() => {
    return getAuditEvents({
      query: query.trim() || undefined,
      caseId: filterCaseId || undefined,
      evidenceId: filterEvidenceId.trim() || undefined,
      actionType: filterAction || undefined,
      dateFrom: filterDateFrom || undefined,
      dateTo: filterDateTo || undefined,
    });
  }, [query, filterCaseId, filterEvidenceId, filterAction, filterDateFrom, filterDateTo]);

  const handleClear = () => {
    setQuery('');
    setFilterCaseId('');
    setFilterEvidenceId('');
    setFilterAction('');
    setFilterDateFrom('');
    setFilterDateTo('');
    setFilters({});
  };

  const handleExportCSV = () => {
    alert('CSV export initiated. The audit log will be downloaded shortly.');
  };

  const hasActiveFilters =
    query || filterCaseId || filterEvidenceId || filterAction || filterDateFrom || filterDateTo;

  return (
    <div className="space-y-5">
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div>
        <h1 className="text-2xl font-bold text-navy-900 tracking-tight">Audit Log</h1>
        <p className="text-sm text-ink-500 mt-0.5 max-w-2xl">
          Immutable record of all system events. All entries are verified against the blockchain
          ledger.
        </p>
      </div>

      {/* ── Controls Bar ──────────────────────────────────────────────── */}
      <div className="bg-white border border-line-200 rounded-sm shadow-card p-4 flex flex-wrap items-end gap-3">
        {/* Search */}
        <div className="relative min-w-[200px] flex-1">
          <Search
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-300 pointer-events-none"
          />
          <input
            type="text"
            placeholder="Search user, action, event ID…"
            value={query}
            onChange={e => setQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm border border-line-300 rounded-sm bg-white text-ink-900 placeholder:text-ink-300 outline-none focus:border-navy-500 focus:ring-1 focus:ring-navy-500"
          />
        </div>

        {/* Case filter */}
        <div className="min-w-[150px]">
          <label className="block text-xs font-medium text-ink-500 mb-1">Case</label>
          <select
            value={filterCaseId}
            onChange={e => setFilterCaseId(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-line-300 rounded-sm bg-white text-ink-900 outline-none focus:border-navy-500"
          >
            <option value="">All Cases</option>
            {uniqueCaseIds.map(id => (
              <option key={id} value={id}>
                {id}
              </option>
            ))}
          </select>
        </div>

        {/* Evidence ID */}
        <div className="min-w-[130px]">
          <label className="block text-xs font-medium text-ink-500 mb-1">Evidence ID</label>
          <input
            type="text"
            placeholder="e.g. EV-0215"
            value={filterEvidenceId}
            onChange={e => setFilterEvidenceId(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-line-300 rounded-sm bg-white text-ink-900 placeholder:text-ink-300 outline-none focus:border-navy-500"
          />
        </div>

        {/* Action Type */}
        <div className="min-w-[170px]">
          <label className="block text-xs font-medium text-ink-500 mb-1">Action Type</label>
          <select
            value={filterAction}
            onChange={e => setFilterAction(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-line-300 rounded-sm bg-white text-ink-900 outline-none focus:border-navy-500"
          >
            <option value="">All Actions</option>
            {uniqueActions.map(a => (
              <option key={a} value={a}>
                {a.replace(/_/g, ' ')}
              </option>
            ))}
          </select>
        </div>

        {/* Date From */}
        <div>
          <label className="block text-xs font-medium text-ink-500 mb-1">Date From</label>
          <input
            type="date"
            value={filterDateFrom}
            onChange={e => setFilterDateFrom(e.target.value)}
            className="px-3 py-2 text-sm border border-line-300 rounded-sm bg-white text-ink-900 outline-none focus:border-navy-500"
          />
        </div>

        {/* Date To */}
        <div>
          <label className="block text-xs font-medium text-ink-500 mb-1">Date To</label>
          <input
            type="date"
            value={filterDateTo}
            onChange={e => setFilterDateTo(e.target.value)}
            className="px-3 py-2 text-sm border border-line-300 rounded-sm bg-white text-ink-900 outline-none focus:border-navy-500"
          />
        </div>

        {/* Actions */}
        <div className="flex items-end gap-2 ml-auto">
          {hasActiveFilters && (
            <Button variant="ghost" size="sm" onClick={handleClear}>
              <X size={14} /> Clear Filters
            </Button>
          )}
          <Button variant="secondary" size="sm" onClick={handleExportCSV}>
            <Download size={14} /> Export CSV
          </Button>
        </div>
      </div>

      {/* ── Results count ──────────────────────────────────────────────── */}
      <p className="text-xs text-ink-400">
        Showing{' '}
        <span className="font-semibold text-ink-700">{events.length}</span> audit event
        {events.length !== 1 ? 's' : ''}
      </p>

      {/* ── Audit Table ────────────────────────────────────────────────── */}
      <Card padded={false}>
        <Table
          headers={[
            'Timestamp',
            'User',
            'Role',
            'Action',
            'Evidence ID',
            'Case',
            'Event ID',
            'Verification',
          ]}
        >
          {events.map(event => {
            const { time, date } = formatTimestamp(event.timestamp);
            return (
              <tr key={event.id} className="hover:bg-paper-50 transition-colors">
                {/* Timestamp */}
                <td className="px-5 py-3 whitespace-nowrap">
                  <span className="block font-mono text-xs text-ink-900 font-semibold">
                    {time}
                  </span>
                  <span className="block font-mono text-xs text-ink-400">{date}</span>
                </td>

                {/* User */}
                <td className="px-5 py-3 text-sm font-medium text-navy-900 whitespace-nowrap">
                  {event.user}
                </td>

                {/* Role */}
                <td className="px-5 py-3">
                  {event.role ? (
                    <Badge color="blue">{event.role}</Badge>
                  ) : (
                    <span className="text-xs text-ink-400">—</span>
                  )}
                </td>

                {/* Action */}
                <td className="px-5 py-3">
                  <span className="font-mono text-xs bg-paper-100 text-ink-900 px-2 py-0.5 rounded whitespace-nowrap">
                    {event.action.replace(/_/g, ' ')}
                  </span>
                </td>

                {/* Evidence ID */}
                <td className="px-5 py-3">
                  {event.evidenceId ? (
                    <span className="font-mono text-xs bg-navy-50 text-navy-800 px-2 py-0.5 rounded">
                      {event.evidenceId}
                    </span>
                  ) : (
                    <span className="text-xs text-ink-300">—</span>
                  )}
                </td>

                {/* Case */}
                <td className="px-5 py-3">
                  {event.caseId ? (
                    <span className="font-mono text-xs text-ink-700">{event.caseId}</span>
                  ) : (
                    <span className="text-xs text-ink-300">—</span>
                  )}
                </td>

                {/* Event ID / Tx */}
                <td className="px-5 py-3">
                  <span className="font-mono text-xs text-ink-500">{event.txId}</span>
                </td>

                {/* Verification */}
                <td className="px-5 py-3">
                  <VerificationBadge status={event.verificationStatus} />
                </td>
              </tr>
            );
          })}
        </Table>
      </Card>

      {/* ── Footer ─────────────────────────────────────────────────────── */}
      <p className="text-xs text-ink-400 text-center pb-4">
        All audit entries are cryptographically signed and stored on the Hyperledger Fabric ledger.
        Entries cannot be modified or deleted.
      </p>
    </div>
  );
};

export default AuditLogPage;
