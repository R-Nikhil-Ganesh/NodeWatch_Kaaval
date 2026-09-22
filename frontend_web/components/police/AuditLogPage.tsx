import React, { useState, useEffect, useMemo } from 'react';
import { ShieldCheck, ShieldX, Download, X, Search } from 'lucide-react';
import { Card, Badge, Button, Table } from '../Common';
import { getAuditEvents } from '../../services/auditService';
import type { AuditEvent } from '../../services/types';

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

const CSV_COLUMNS: { header: string; value: (e: AuditEvent) => string }[] = [
  { header: 'Timestamp', value: e => e.timestamp },
  { header: 'User', value: e => e.user },
  { header: 'Role', value: e => e.role ?? '' },
  { header: 'Action', value: e => e.action },
  { header: 'Details', value: e => e.details ?? '' },
  { header: 'Evidence ID', value: e => e.evidenceId ?? '' },
  { header: 'Case ID', value: e => e.caseId ?? '' },
  { header: 'FIR Number', value: e => e.caseFirNumber ?? '' },
  { header: 'Transaction ID', value: e => e.txId },
  { header: 'Verification', value: e => e.verificationStatus },
];

/** RFC-4180 escaping: wrap in quotes and double any embedded quote. */
const csvCell = (raw: string) => `"${String(raw ?? '').replace(/"/g, '""')}"`;

export const AuditLogPage: React.FC<NavProps> = ({ onNavigate: _onNavigate }) => {
  const [query, setQuery] = useState('');
  const [filterCaseId, setFilterCaseId] = useState('');
  const [filterEvidenceId, setFilterEvidenceId] = useState('');
  const [filterAction, setFilterAction] = useState('');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');

  const [allEvents, setAllEvents] = useState<AuditEvent[]>([]);
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Unfiltered pull, used only to populate the Case / Action dropdowns.
  useEffect(() => {
    let cancelled = false;
    getAuditEvents()
      .then(rows => {
        if (!cancelled) setAllEvents(rows);
      })
      .catch(() => {
        if (!cancelled) setAllEvents([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Case dropdown: the value is the real caseId, the label is the FIR number.
  const caseOptions = useMemo(() => {
    const byId = new Map<string, string>();
    allEvents.forEach(e => {
      if (e.caseId && !byId.has(e.caseId)) byId.set(e.caseId, e.caseFirNumber ?? e.caseId);
    });
    return [...byId.entries()].map(([id, label]) => ({ id, label }));
  }, [allEvents]);

  const uniqueActions = useMemo(
    () => [...new Set(allEvents.map(e => e.action))],
    [allEvents],
  );

  // Filtered pull — debounced on the free-text box, immediate for the rest.
  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    const timer = setTimeout(() => {
      getAuditEvents({
        query: query.trim() || undefined,
        caseId: filterCaseId || undefined,
        evidenceId: filterEvidenceId.trim() || undefined,
        actionType: filterAction || undefined,
        dateFrom: filterDateFrom || undefined,
        dateTo: filterDateTo || undefined,
      })
        .then(rows => {
          if (cancelled) return;
          setEvents(rows);
          setError(null);
        })
        .catch((err: any) => {
          if (cancelled) return;
          setEvents([]);
          setError(err?.message || 'Unable to load the audit log.');
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    }, query.trim() || filterEvidenceId.trim() ? 300 : 0);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query, filterCaseId, filterEvidenceId, filterAction, filterDateFrom, filterDateTo]);

  const handleClear = () => {
    setQuery('');
    setFilterCaseId('');
    setFilterEvidenceId('');
    setFilterAction('');
    setFilterDateFrom('');
    setFilterDateTo('');
  };

  // Builds the CSV from the rows currently loaded and hands it to the browser
  // as a Blob download — no server round-trip needed.
  const handleExportCSV = () => {
    if (events.length === 0) return;

    const lines = [
      CSV_COLUMNS.map(c => csvCell(c.header)).join(','),
      ...events.map(e => CSV_COLUMNS.map(c => csvCell(c.value(e))).join(',')),
    ];
    // BOM keeps Excel from mangling non-ASCII names.
    const blob = new Blob(['﻿' + lines.join('\r\n')], {
      type: 'text/csv;charset=utf-8;',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `audit-log-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
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
            {caseOptions.map(opt => (
              <option key={opt.id} value={opt.id}>
                {opt.label}
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
          <Button
            variant="secondary"
            size="sm"
            onClick={handleExportCSV}
            disabled={loading || events.length === 0}
          >
            <Download size={14} /> Export CSV
          </Button>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 border border-status-urgent/20 bg-status-urgentBg text-status-urgent rounded-sm px-4 py-3">
          <ShieldX size={16} className="shrink-0" />
          <span className="text-sm font-medium">{error}</span>
        </div>
      )}

      {/* ── Results count ──────────────────────────────────────────────── */}
      <p className="text-xs text-ink-400">
        {loading ? (
          <>Loading audit events…</>
        ) : (
          <>
            Showing{' '}
            <span className="font-semibold text-ink-700">{events.length}</span> audit event
            {events.length !== 1 ? 's' : ''}
          </>
        )}
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
          {!loading && events.map(event => {
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

                {/* Case — the FIR number is the human reference */}
                <td className="px-5 py-3">
                  {event.caseFirNumber || event.caseId ? (
                    <span className="font-mono text-xs text-ink-700">
                      {event.caseFirNumber ?? event.caseId}
                    </span>
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
          {!loading && events.length === 0 && (
            <tr>
              <td colSpan={8} className="px-5 py-12 text-center text-sm text-ink-400">
                {hasActiveFilters
                  ? 'No audit events match the current filters.'
                  : 'No audit events have been recorded yet.'}
              </td>
            </tr>
          )}
          {loading && (
            <tr>
              <td colSpan={8} className="px-5 py-12 text-center text-sm text-ink-400">
                <span className="inline-flex items-center gap-3">
                  <span className="w-5 h-5 border-2 border-navy-900 border-t-transparent rounded-full animate-spin" />
                  Loading audit events…
                </span>
              </td>
            </tr>
          )}
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
