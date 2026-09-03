import React, { useMemo, useState } from 'react';
import { AlertTriangle, Download, Loader2, ScrollText, Search } from 'lucide-react';
import { useCaseContext } from '../../components/layout/CaseLayout';
import { Avatar, Badge, Card, EmptyState, Input, Select, Table } from '../../components/ui/Primitives';
import { fetchAuditLogs } from '../../services/api';
import { useAsync } from '../../hooks/useAsync';
import { AuditAction } from '../../types';
import { formatDateTime, initials } from '../../utils/format';

const ACTION_TONE: Record<AuditAction, 'navy' | 'saffron' | 'resolved' | 'pending' | 'neutral'> = {
  CASE_CREATED: 'navy',
  CASE_VIEWED: 'neutral',
  FILE_UPLOADED: 'saffron',
  FILE_VIEWED: 'neutral',
  FILE_DOWNLOADED: 'pending',
  EVIDENCE_UPLOADED: 'saffron',
  EVIDENCE_VIEWED: 'neutral',
  EVIDENCE_VERIFIED: 'resolved',
  HEARING_RECORDED: 'navy',
  CUSTODY_TRANSFERRED: 'pending',
  LOGIN: 'neutral',
  LOGOUT: 'neutral',
};

const ACTION_LABEL: Record<AuditAction, string> = {
  CASE_CREATED: 'Case Created',
  CASE_VIEWED: 'Case Viewed',
  FILE_UPLOADED: 'File Uploaded',
  FILE_VIEWED: 'File Viewed',
  FILE_DOWNLOADED: 'File Downloaded',
  EVIDENCE_UPLOADED: 'Evidence Uploaded',
  EVIDENCE_VIEWED: 'Evidence Viewed',
  EVIDENCE_VERIFIED: 'Evidence Verified',
  HEARING_RECORDED: 'Hearing Recorded',
  CUSTODY_TRANSFERRED: 'Custody Transferred',
  LOGIN: 'Login',
  LOGOUT: 'Logout',
};

export const AuditLogsPage = () => {
  const { courtCase } = useCaseContext();
  const { data: logs, loading, error } = useAsync(() => fetchAuditLogs(courtCase.caseId), [courtCase.caseId]);
  const [query, setQuery] = useState('');
  const [actionFilter, setActionFilter] = useState('ALL');

  const actions = Array.from(new Set((logs || []).map((l) => l.action)));

  const visible = useMemo(() => {
    return (logs || []).filter((l) => {
      const matchesQuery = query.trim() === '' ||
        l.actorName.toLowerCase().includes(query.toLowerCase()) ||
        l.targetLabel.toLowerCase().includes(query.toLowerCase());
      const matchesAction = actionFilter === 'ALL' || l.action === actionFilter;
      return matchesQuery && matchesAction;
    });
  }, [logs, query, actionFilter]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-navy-900">Audit Logs</h1>
          <p className="text-sm text-ink-500 mt-1">Every access to this case — who viewed, uploaded or downloaded what, and when.</p>
        </div>
        <button
          onClick={() => alert('This is a UI-only preview build — CSV export will be wired up once the audit service is connected.')}
          className="flex items-center gap-2 px-4 py-2 rounded-sm bg-white border border-line-300 text-navy-900 text-sm font-medium hover:bg-paper-100 transition-colors"
        >
          <Download size={14} /> Export CSV
        </button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-300" />
          <Input placeholder="Search by person or target…" value={query} onChange={(e) => setQuery(e.target.value)} className="pl-10" />
        </div>
        <Select value={actionFilter} onChange={(e) => setActionFilter(e.target.value)} className="sm:w-56">
          <option value="ALL">All Actions</option>
          {actions.map((a) => (
            <option key={a} value={a}>{ACTION_LABEL[a]}</option>
          ))}
        </Select>
      </div>

      <Card padded={false}>
        {loading ? (
          <div className="flex items-center justify-center py-16 text-ink-500 gap-2">
            <Loader2 size={18} className="animate-spin" /> Loading audit logs…
          </div>
        ) : error ? (
          <EmptyState icon={<AlertTriangle size={40} />} title="Could not load audit logs" description={error} />
        ) : visible.length === 0 ? (
          <EmptyState icon={<ScrollText size={40} />} title="No matching audit entries" />
        ) : (
          <Table headers={['Timestamp', 'Actor', 'Action', 'Target', 'Device / IP']}>
            {visible.map((l) => (
              <tr key={l.logId} className="hover:bg-paper-50">
                <td className="px-5 py-3.5 text-xs text-ink-500 whitespace-nowrap">{formatDateTime(l.timestamp)}</td>
                <td className="px-5 py-3.5">
                  <div className="flex items-center gap-2.5">
                    <Avatar initials={initials(l.actorName)} size={26} />
                    <div>
                      <p className="text-sm font-medium text-navy-900 leading-tight">{l.actorName}</p>
                      <p className="text-[11px] text-ink-500 leading-tight">{l.actorDesignation}</p>
                    </div>
                  </div>
                </td>
                <td className="px-5 py-3.5"><Badge tone={ACTION_TONE[l.action]}>{ACTION_LABEL[l.action]}</Badge></td>
                <td className="px-5 py-3.5 text-sm text-ink-700 max-w-xs truncate">{l.targetLabel}</td>
                <td className="px-5 py-3.5 text-xs text-ink-500 whitespace-nowrap">{l.ipAddress}<br /><span className="text-ink-300">{l.device}</span></td>
              </tr>
            ))}
          </Table>
        )}
      </Card>
    </div>
  );
};
