import React, { useState, useMemo } from 'react';
import { Search, Package, Users, ChevronRight } from 'lucide-react';
import { Card, Button, Badge, Table } from '../Common';
import { searchCases } from '../../services/caseService';

interface NavProps {
  onNavigate: (view: string, id?: string) => void;
}

type CaseFilerStatus =
  | 'All'
  | 'Open'
  | 'Under Investigation'
  | 'Awaiting Forensics'
  | 'Charge Sheet Preparation'
  | 'Closed';

const STATUS_TABS: CaseFilerStatus[] = [
  'All',
  'Open',
  'Under Investigation',
  'Awaiting Forensics',
  'Charge Sheet Preparation',
  'Closed',
];

type CocStatus = 'Verified' | 'Pending' | 'Exception';
type IOCaseStatus =
  | 'Open'
  | 'Under Investigation'
  | 'Awaiting Forensics'
  | 'Charge Sheet Preparation'
  | 'Closed';

const CocBadge = ({ status }: { status: CocStatus }) => {
  const map: Record<CocStatus, 'green' | 'yellow' | 'red'> = {
    Verified: 'green',
    Pending: 'yellow',
    Exception: 'red',
  };
  return <Badge color={map[status]}>{status}</Badge>;
};

const StatusBadge = ({ status }: { status: IOCaseStatus }) => {
  const map: Record<IOCaseStatus, 'gray' | 'blue' | 'yellow' | 'green' | 'red'> = {
    Open: 'gray',
    'Under Investigation': 'blue',
    'Awaiting Forensics': 'yellow',
    'Charge Sheet Preparation': 'green',
    Closed: 'gray',
  };
  return <Badge color={map[status]}>{status}</Badge>;
};

const ForensicBadge = ({ completed, total }: { completed: number; total: number }) => {
  if (total === 0) return <Badge color="gray">N/A</Badge>;
  const pct = Math.round((completed / total) * 100);
  const color: 'green' | 'yellow' | 'red' =
    pct === 100 ? 'green' : pct >= 50 ? 'yellow' : 'red';
  return (
    <Badge color={color}>
      {completed}/{total}
    </Badge>
  );
};

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

export const PoliceCasesPage: React.FC<NavProps> = ({ onNavigate }) => {
  const [activeStatus, setActiveStatus] = useState<CaseFilerStatus>('All');
  const [query, setQuery] = useState('');

  const cases = useMemo(
    () =>
      searchCases({
        status: activeStatus === 'All' ? undefined : activeStatus,
        query: query.trim() || undefined,
      }),
    [activeStatus, query],
  );

  return (
    <div className="space-y-5">
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div>
        <h1 className="text-2xl font-bold text-navy-900 tracking-tight">Cases</h1>
        <p className="text-sm text-ink-500 mt-0.5">
          All FIR cases assigned to your station
        </p>
      </div>

      {/* ── Filter + Search bar ─────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Status pills */}
        <div className="flex flex-wrap gap-1.5">
          {STATUS_TABS.map(tab => (
            <button
              key={tab}
              onClick={() => setActiveStatus(tab)}
              className={`px-3 py-1.5 text-xs font-medium rounded-full transition-colors whitespace-nowrap ${
                activeStatus === tab
                  ? 'bg-navy-900 text-white'
                  : 'bg-white border border-line-300 text-ink-700 hover:bg-paper-50'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Search input */}
        <div className="ml-auto relative min-w-[240px]">
          <Search
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-300 pointer-events-none"
          />
          <input
            type="text"
            placeholder="Search FIR, title, officer…"
            value={query}
            onChange={e => setQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm border border-line-300 rounded-sm bg-white text-ink-900 placeholder:text-ink-300 outline-none focus:border-navy-500 focus:ring-1 focus:ring-navy-500"
          />
        </div>
      </div>

      {/* ── Results count ──────────────────────────────────────────────── */}
      <p className="text-xs text-ink-400">
        Showing <span className="font-semibold text-ink-700">{cases.length}</span> case
        {cases.length !== 1 ? 's' : ''}
        {activeStatus !== 'All' && (
          <>
            {' '}
            · filtered by <span className="font-semibold text-ink-700">{activeStatus}</span>
          </>
        )}
      </p>

      {/* ── Table / Empty state ─────────────────────────────────────────── */}
      <Card padded={false}>
        {cases.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-ink-400">
            <Search size={36} className="mb-3 opacity-30" />
            <p className="text-sm font-medium">No cases match your search</p>
            <p className="text-xs mt-1">Try adjusting the filters or search term</p>
          </div>
        ) : (
          <Table
            headers={[
              'FIR No.',
              'Case Title',
              'Date Registered',
              'Police Station',
              'Investigating Officer',
              'Evidence',
              'Witnesses',
              'Forensic Status',
              'CoC Status',
              'Status',
              'Actions',
            ]}
          >
            {cases.map(c => (
              <tr
                key={c.firNumber}
                className="hover:bg-paper-50 transition-colors cursor-pointer"
                onClick={() => onNavigate('case_detail', c.firNumber)}
              >
                {/* FIR No */}
                <td className="px-5 py-3 whitespace-nowrap">
                  <span className="font-mono text-sm font-semibold text-navy-900">
                    {c.firNumber}
                  </span>
                </td>
                {/* Title */}
                <td className="px-5 py-3 max-w-[200px]">
                  <span className="text-sm font-medium text-ink-900 block truncate">
                    {c.title}
                  </span>
                  <span className="text-xs text-ink-400">{c.district}</span>
                </td>
                {/* Date Registered */}
                <td className="px-5 py-3 text-sm text-ink-600 whitespace-nowrap">
                  {formatDate(c.dateRegistered)}
                </td>
                {/* Police Station */}
                <td className="px-5 py-3 text-sm text-ink-600 whitespace-nowrap">
                  {c.policeStation}
                </td>
                {/* Officer */}
                <td className="px-5 py-3 text-sm text-ink-700 whitespace-nowrap">
                  {c.investigatingOfficer}
                </td>
                {/* Evidence */}
                <td className="px-5 py-3 text-sm text-ink-700">
                  <span className="flex items-center gap-1">
                    <Package size={13} className="text-ink-400" />
                    {c.evidenceCount}
                  </span>
                </td>
                {/* Witnesses */}
                <td className="px-5 py-3 text-sm text-ink-700">
                  <span className="flex items-center gap-1">
                    <Users size={13} className="text-ink-400" />
                    {c.witnessCount}
                  </span>
                </td>
                {/* Forensic Status */}
                <td className="px-5 py-3">
                  <ForensicBadge
                    completed={c.forensicProgress.completed}
                    total={c.forensicProgress.total}
                  />
                </td>
                {/* CoC Status */}
                <td className="px-5 py-3">
                  <CocBadge status={c.cocStatus} />
                </td>
                {/* Status */}
                <td className="px-5 py-3">
                  <StatusBadge status={c.status} />
                </td>
                {/* Actions */}
                <td
                  className="px-5 py-3"
                  onClick={e => e.stopPropagation()}
                >
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => onNavigate('case_detail', c.firNumber)}
                  >
                    View Details <ChevronRight size={13} />
                  </Button>
                </td>
              </tr>
            ))}
          </Table>
        )}
      </Card>
    </div>
  );
};

export default PoliceCasesPage;
