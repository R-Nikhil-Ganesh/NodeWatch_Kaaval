import React, { useState, useEffect, useCallback } from 'react';
import {
  ArrowLeft, CheckCircle, AlertTriangle, Clock, FileText, Phone,
  Film, Droplets, Shield, ExternalLink, ChevronRight, Users,
  Activity, FlaskConical, Eye, Link2
} from 'lucide-react';
import { Card, Button, Badge, Table, IntegrityBadge } from '../Common';
import { getCaseById } from '../../services/caseService';
import { getEvidenceForCase } from '../../services/evidenceService';
import { getForensicRecordsForCase } from '../../services/forensicService';
import { getAuditEvents } from '../../services/auditService';
import { getCustodyTimeline, getChainIntegrityReport } from '../../services/custodyService';
import type { IOCase } from '../../services/types';
import type { IOEvidence } from '../../services/types';
import type { ForensicRecord } from '../../services/types';
import type { AuditEvent } from '../../services/types';
import type { CustodyEvent } from '../../services/types';
import type { ChainIntegrityReport } from '../../services/custodyService';
import { IntegrityStatus } from '../../types';

// ── helpers ─────────────────────────────────────────────────────────────────

const fmtDate = (s?: string) =>
  s ? new Date(s).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
const fmtTime = (s?: string) =>
  s ? new Date(s).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false }) : '';
const fmtDateTime = (s?: string) => s ? `${fmtDate(s)}, ${fmtTime(s)}` : '—';

const daysSince = (dateStr: string) => {
  const diff = Date.now() - new Date(dateStr).getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
};

// ── Status badges ────────────────────────────────────────────────────────────

const CaseStatusPill: React.FC<{ status: IOCase['status'] }> = ({ status }) => {
  const map: Record<IOCase['status'], string> = {
    'Open': 'bg-navy-50 text-navy-800 border-navy-100',
    'Under Investigation': 'bg-status-pendingBg text-status-pending border-status-pending/20',
    'Awaiting Forensics': 'bg-purple-50 text-purple-700 border-purple-200',
    'Charge Sheet Preparation': 'bg-status-resolvedBg text-status-resolved border-status-resolved/20',
    'Submitted to Court': 'bg-navy-50 text-navy-800 border-navy-100',
    'Closed': 'bg-paper-100 text-ink-500 border-line-300',
    'Frozen': 'bg-status-urgentBg text-status-urgent border-status-urgent/20',
  };
  return (
    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold border ${map[status]}`}>
      {status}
    </span>
  );
};

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

const ForensicStatusPill: React.FC<{ status: ForensicRecord['examinationStatus'] }> = ({ status }) => {
  const map: Record<ForensicRecord['examinationStatus'], string> = {
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

// ── Evidence type icon ───────────────────────────────────────────────────────

const EvidenceTypeIcon: React.FC<{ type: string }> = ({ type }) => {
  const t = type.toLowerCase();
  if (t.includes('mobile') || t.includes('phone')) return <Phone size={14} className="text-navy-700" />;
  if (t.includes('cctv') || t.includes('video') || t.includes('footage')) return <Film size={14} className="text-purple-600" />;
  if (t.includes('bio') || t.includes('blood') || t.includes('sample')) return <Droplets size={14} className="text-red-600" />;
  return <FileText size={14} className="text-ink-500" />;
};

// ── custody event color ──────────────────────────────────────────────────────

const custodyEventColor = (eventType: CustodyEvent['eventType']): string => {
  const map: Record<CustodyEvent['eventType'], string> = {
    'Evidence Collected': 'bg-navy-900',
    'Evidence Sealed': 'bg-saffron-500',
    'Custody Transferred': 'bg-amber-500',
    'Custody Received': 'bg-status-resolved',
    'Transferred to FSL': 'bg-purple-600',
    'Received by FSL': 'bg-purple-800',
    'Forensic Examination Started': 'bg-indigo-600',
    'Forensic Report Filed': 'bg-indigo-800',
    'Evidence Returned': 'bg-teal-600',
  };
  return map[eventType] ?? 'bg-ink-400';
};

// ── Tabs ─────────────────────────────────────────────────────────────────────

type Tab = 'overview' | 'evidence' | 'custody' | 'forensics' | 'documents' | 'audit';
const TABS: { id: Tab; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'evidence', label: 'Evidence' },
  { id: 'custody', label: 'Chain of Custody' },
  { id: 'forensics', label: 'Forensics' },
  { id: 'documents', label: 'Documents' },
  { id: 'audit', label: 'Audit' },
];

// ── Props ────────────────────────────────────────────────────────────────────

interface Props {
  caseId: string;
  onNavigate: (view: string, id?: string) => void;
  onBack: () => void;
}

// ════════════════════════════════════════════════════════════════════════════
// Main component
// ════════════════════════════════════════════════════════════════════════════

const CaseDetailPage: React.FC<Props> = ({ caseId, onNavigate, onBack }) => {
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [caseData, setCaseData] = useState<IOCase | null>(null);
  const [evidence, setEvidence] = useState<IOEvidence[]>([]);
  const [forensics, setForensics] = useState<ForensicRecord[]>([]);
  const [auditEvents, setAuditEvents] = useState<AuditEvent[]>([]);
  const [custodyEvents, setCustodyEvents] = useState<CustodyEvent[]>([]);
  const [chainReport, setChainReport] = useState<ChainIntegrityReport | null>(null);
  const [selectedEvidenceId, setSelectedEvidenceId] = useState<string>('');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [c, ev, fr, au] = await Promise.all([
        getCaseById(caseId),
        getEvidenceForCase(caseId),
        getForensicRecordsForCase(caseId),
        getAuditEvents({ caseId }),
      ]);
      // getCaseById resolves to undefined on a 404 rather than throwing.
      setCaseData(c ?? null);
      setEvidence(ev);
      setForensics(fr);
      setAuditEvents(au);
      if (ev.length > 0) {
        const firstId = ev[0].evidenceId;
        setSelectedEvidenceId(firstId);
        const [ce, cr] = await Promise.all([
          getCustodyTimeline(firstId),
          getChainIntegrityReport(firstId),
        ]);
        setCustodyEvents(ce);
        setChainReport(cr);
      } else {
        setSelectedEvidenceId('');
        setCustodyEvents([]);
        setChainReport(null);
      }
    } catch {
      setCaseData(null);
      setEvidence([]);
      setForensics([]);
      setAuditEvents([]);
      setCustodyEvents([]);
      setChainReport(null);
    } finally {
      setLoading(false);
    }
  }, [caseId]);

  useEffect(() => { load(); }, [load]);

  const handleEvidenceSelect = async (id: string) => {
    setSelectedEvidenceId(id);
    try {
      const [ce, cr] = await Promise.all([
        getCustodyTimeline(id),
        getChainIntegrityReport(id),
      ]);
      setCustodyEvents(ce);
      setChainReport(cr);
    } catch {
      setCustodyEvents([]);
      setChainReport(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-ink-500">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-navy-900 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm">Loading case details…</p>
        </div>
      </div>
    );
  }

  if (!caseData) {
    return (
      <div className="p-8 text-center text-ink-500">
        <p>Case not found: {caseId}</p>
        <Button variant="secondary" onClick={onBack} className="mt-4">← Back</Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-paper-50">
      {/* ── Header ── */}
      <div className="bg-white border-b border-line-200 px-6 py-5">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-sm text-ink-500 hover:text-navy-700 mb-4 transition-colors"
        >
          <ArrowLeft size={16} /> Back to Cases
        </button>
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-2xl font-bold text-navy-900">{caseData.firNumber}</h1>
              <CaseStatusPill status={caseData.status} />
            </div>
            <p className="text-lg text-ink-700 font-medium mb-2">{caseData.title}</p>
            <div className="flex items-center gap-4 text-sm text-ink-500">
              <span>{caseData.policeStation}</span>
              <span className="text-line-300">|</span>
              <span>{fmtDate(caseData.dateRegistered)}</span>
              <span className="text-line-300">|</span>
              <span>{caseData.investigatingOfficer}</span>
            </div>
            <div className="flex gap-2 mt-2">
              {caseData.offences.map(o => (
                <span key={o} className="text-xs bg-navy-50 text-navy-800 border border-navy-100 px-2 py-0.5 rounded">
                  {o}
                </span>
              ))}
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" onClick={() => onNavigate('custody')}>
              <Link2 size={14} /> Chain of Custody
            </Button>
            <Button size="sm" onClick={() => onNavigate('forensics')}>
              <FlaskConical size={14} /> Forensic Reports
            </Button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-0 mt-6 border-b border-line-200 -mb-px">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-5 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors whitespace-nowrap ${
                activeTab === tab.id
                  ? 'border-saffron-500 text-navy-900 font-semibold'
                  : 'border-transparent text-ink-500 hover:text-navy-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Tab Content ── */}
      <div className="p-6">
        {activeTab === 'overview' && (
          <OverviewTab caseData={caseData} evidence={evidence} onNavigate={onNavigate} />
        )}
        {activeTab === 'evidence' && (
          <EvidenceTab evidence={evidence} onNavigate={onNavigate} />
        )}
        {activeTab === 'custody' && (
          <CustodyTab
            evidence={evidence}
            custodyEvents={custodyEvents}
            chainReport={chainReport}
            selectedEvidenceId={selectedEvidenceId}
            onSelectEvidence={handleEvidenceSelect}
            onNavigate={onNavigate}
          />
        )}
        {activeTab === 'forensics' && (
          <ForensicsTab forensics={forensics} evidence={evidence} />
        )}
        {activeTab === 'documents' && (
          <DocumentsTab />
        )}
        {activeTab === 'audit' && (
          <AuditTab auditEvents={auditEvents} onNavigate={onNavigate} />
        )}
      </div>
    </div>
  );
};

// ════════════════════════════════════════════════════════════════════════════
// Tab: Overview
// ════════════════════════════════════════════════════════════════════════════

const OverviewTab: React.FC<{
  caseData: IOCase;
  evidence: IOEvidence[];
  onNavigate: (view: string, id?: string) => void;
}> = ({ caseData, evidence, onNavigate }) => {
  const days = daysSince(caseData.dateRegistered);
  const forensicDone = caseData.forensicProgress.completed;
  const forensicTotal = caseData.forensicProgress.total;
  const forensicPending = forensicTotal - forensicDone;

  const checklist = [
    { label: 'FIR', done: true },
    { label: `Evidence Inventory (${evidence.length} items)`, done: true },
    { label: 'Evidence Chain of Custody', done: caseData.cocStatus === 'Verified' },
    { label: 'Witness Statements', done: caseData.witnessCount > 0 },
    {
      label: `Forensic Reports (${forensicPending > 0 ? `${forensicPending} pending` : 'all done'})`,
      done: forensicPending === 0,
      warning: forensicPending > 0,
    },
    { label: 'Digital Evidence', done: evidence.some(e => e.type.toLowerCase().includes('mobile') || e.type.toLowerCase().includes('cctv')) },
    { label: 'Evidence Integrity Verification', done: evidence.every(e => e.integrityStatus === 'Verified' || e.integrityStatus === 'Pending') },
  ];

  return (
    <div className="grid grid-cols-3 gap-6">
      {/* Left: Case Summary + Stats */}
      <div className="col-span-2 space-y-5">
        <Card title="Case Summary">
          <p className="text-sm text-ink-700 leading-relaxed mb-4">{caseData.description}</p>
          <div>
            <p className="text-xs font-semibold text-ink-500 uppercase tracking-wide mb-2">Offences Registered</p>
            <div className="flex flex-wrap gap-2">
              {caseData.offences.map(o => (
                <span key={o} className="text-xs bg-navy-50 text-navy-800 border border-navy-100 px-2.5 py-1 rounded font-medium">
                  {o}
                </span>
              ))}
            </div>
          </div>
        </Card>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-4">
          {[
            { label: 'Evidence Items', value: caseData.evidenceCount, icon: <Shield size={18} className="text-navy-700" /> },
            { label: 'Witnesses', value: caseData.witnessCount, icon: <Users size={18} className="text-ink-500" /> },
            { label: 'Forensic Reports Done', value: `${forensicDone}/${forensicTotal}`, icon: <FlaskConical size={18} className="text-purple-600" /> },
            { label: 'Days Active', value: days, icon: <Activity size={18} className="text-saffron-500" /> },
          ].map(stat => (
            <div key={stat.label} className="bg-white border border-line-200 rounded-sm p-4 shadow-card">
              <div className="flex items-center justify-between mb-2">
                {stat.icon}
              </div>
              <p className="text-2xl font-bold text-navy-900">{stat.value}</p>
              <p className="text-xs text-ink-500 mt-0.5">{stat.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Right: Charge Sheet Readiness + Quick Actions */}
      <div className="space-y-5">
        {/* Charge Sheet Readiness */}
        <Card title="Case Documentation / Charge Sheet Preparation">
          <div className="space-y-2.5 mb-5">
            {checklist.map((item, i) => (
              <div key={i} className="flex items-start gap-2.5">
                {item.done && !item.warning ? (
                  <CheckCircle size={16} className="text-status-resolved mt-0.5 flex-shrink-0" />
                ) : item.warning ? (
                  <AlertTriangle size={16} className="text-status-pending mt-0.5 flex-shrink-0" />
                ) : (
                  <AlertTriangle size={16} className="text-status-urgent mt-0.5 flex-shrink-0" />
                )}
                <span className={`text-sm ${item.done && !item.warning ? 'text-ink-700' : item.warning ? 'text-status-pending font-medium' : 'text-status-urgent font-medium'}`}>
                  {item.label}
                </span>
              </div>
            ))}
          </div>

          <div className="border-t border-line-200 pt-4 mb-4">
            <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
              <span className="text-ink-500">Evidence Items Total</span>
              <span className="font-semibold text-navy-900 text-right">{evidence.length}</span>
              <span className="text-ink-500">Complete Chain of Custody</span>
              <span className="font-semibold text-status-resolved text-right">
                {evidence.filter(e => e.integrityStatus === 'Verified').length}
              </span>
              <span className="text-ink-500">Forensic Reports Available</span>
              <span className="font-semibold text-status-resolved text-right">{forensicDone}</span>
              {forensicPending > 0 && (
                <>
                  <span className="text-ink-500">Forensic Reports Pending</span>
                  <span className="font-semibold text-status-urgent text-right">{forensicPending}</span>
                </>
              )}
            </div>
          </div>

          <Button variant="secondary" size="sm" className="w-full mb-3" onClick={() => onNavigate('forensics')}>
            View Missing Documentation
          </Button>
          <p className="text-xs text-ink-400 italic leading-snug">
            This checklist is for reference only. Filing a charge sheet requires legal review and authorization.
          </p>
        </Card>

        {/* Quick Actions */}
        <Card title="Quick Actions">
          <div className="space-y-2">
            <Button variant="secondary" size="sm" className="w-full justify-start" onClick={() => onNavigate('custody')}>
              <Link2 size={14} /> View Chain of Custody
            </Button>
            <Button variant="secondary" size="sm" className="w-full justify-start" onClick={() => onNavigate('evidence_detail', evidence[0]?.evidenceId)}>
              <Shield size={14} /> Verify Evidence Integrity
            </Button>
            <Button variant="secondary" size="sm" className="w-full justify-start" onClick={() => onNavigate('forensics')}>
              <FlaskConical size={14} /> View Forensic Reports
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
};

// ════════════════════════════════════════════════════════════════════════════
// Tab: Evidence
// ════════════════════════════════════════════════════════════════════════════

const EvidenceTab: React.FC<{
  evidence: IOEvidence[];
  onNavigate: (view: string, id?: string) => void;
}> = ({ evidence, onNavigate }) => (
  <Table headers={['ID', 'Type', 'Description', 'Collected', 'Collected By', 'Location', 'Custodian', 'Status', 'Integrity', 'Forensic', 'Actions']}>
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
        <td className="px-5 py-3 max-w-[200px]">
          <span className="text-xs text-ink-700" title={ev.description}>
            {ev.description.length > 40 ? ev.description.slice(0, 40) + '…' : ev.description}
          </span>
        </td>
        <td className="px-5 py-3 whitespace-nowrap text-xs text-ink-500">
          <div>{fmtDate(ev.collectedAt)}</div>
          <div className="text-ink-400">{fmtTime(ev.collectedAt)}</div>
        </td>
        <td className="px-5 py-3 whitespace-nowrap text-xs text-ink-700">{ev.collectedBy}</td>
        <td className="px-5 py-3 text-xs text-ink-500">{ev.currentLocation}</td>
        <td className="px-5 py-3 text-xs text-ink-700">{ev.currentCustodian}</td>
        <td className="px-5 py-3 whitespace-nowrap"><EvidenceStatusPill status={ev.status} /></td>
        <td className="px-5 py-3 whitespace-nowrap"><IntegrityPill status={ev.integrityStatus} /></td>
        <td className="px-5 py-3 whitespace-nowrap"><ForensicPill status={ev.forensicStatus} /></td>
        <td className="px-5 py-3 whitespace-nowrap">
          <div className="flex gap-1.5">
            <Button size="sm" variant="ghost" onClick={() => onNavigate('evidence_detail', ev.evidenceId)}>
              <Eye size={13} /> View
            </Button>
            <Button size="sm" variant="ghost" onClick={() => onNavigate('custody')}>
              <Link2 size={13} />
            </Button>
          </div>
        </td>
      </tr>
    ))}
    {evidence.length === 0 && (
      <tr>
        <td colSpan={11} className="px-5 py-12 text-center text-sm text-ink-400">
          No evidence items are registered against this case.
        </td>
      </tr>
    )}
  </Table>
);

// ════════════════════════════════════════════════════════════════════════════
// Tab: Chain of Custody
// ════════════════════════════════════════════════════════════════════════════

const CustodyTab: React.FC<{
  evidence: IOEvidence[];
  custodyEvents: CustodyEvent[];
  chainReport: ChainIntegrityReport | null;
  selectedEvidenceId: string;
  onSelectEvidence: (id: string) => void;
  onNavigate: (view: string, id?: string) => void;
}> = ({ evidence, custodyEvents, chainReport, selectedEvidenceId, onSelectEvidence, onNavigate }) => (
  <div className="space-y-5">
    {/* Evidence Selector */}
    <Card title="Select Evidence Item">
      {evidence.length === 0 ? (
        <p className="text-sm text-ink-400">
          No evidence items are registered against this case, so there is no custody history.
        </p>
      ) : (
        <select
          value={selectedEvidenceId}
          onChange={e => onSelectEvidence(e.target.value)}
          className="w-full max-w-lg px-3.5 py-2.5 border border-line-300 rounded-sm bg-white text-ink-900 text-sm outline-none focus:border-navy-500 focus:ring-1 focus:ring-navy-500"
        >
          {evidence.map(ev => (
            <option key={ev.evidenceId} value={ev.evidenceId}>
              {ev.evidenceId} — {ev.type} — {ev.description.slice(0, 40)}
            </option>
          ))}
        </select>
      )}
    </Card>

    {/* Integrity Banner */}
    {chainReport && (
      <div className="bg-white border border-line-200 rounded-sm px-5 py-4 shadow-card">
        <p className="text-xs font-semibold text-ink-500 uppercase tracking-wide mb-3">
          Chain of Custody — {selectedEvidenceId}
        </p>
        <div className="flex flex-wrap gap-3">
          {[
            { label: 'Integrity Verified', ok: chainReport.verified },
            { label: 'No Missing Events', ok: chainReport.noMissingEvents },
            { label: 'All Transfers Acknowledged', ok: chainReport.allTransfersAcknowledged },
          ].map(check => (
            <span
              key={check.label}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border ${
                check.ok
                  ? 'bg-status-resolvedBg text-status-resolved border-status-resolved/20'
                  : 'bg-status-urgentBg text-status-urgent border-status-urgent/20'
              }`}
            >
              {check.ok ? <CheckCircle size={12} /> : <AlertTriangle size={12} />}
              {check.label}
            </span>
          ))}
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border bg-navy-50 text-navy-800 border-navy-100">
            {chainReport.totalEvents} events recorded on ledger
          </span>
        </div>

        {!chainReport.verified && (
          <div className="mt-4 border border-status-urgent/20 bg-status-urgentBg rounded-sm px-4 py-3">
            <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-status-urgent mb-2">
              <AlertTriangle size={14} />
              Chain of custody could not be verified
            </p>
            {chainReport.issues.length > 0 ? (
              <ul className="list-disc pl-5 space-y-1">
                {chainReport.issues.map((issue, i) => (
                  <li key={i} className="text-xs text-status-urgent leading-relaxed">
                    {issue}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-status-urgent">
                No specific discrepancy was reported by the ledger check.
              </p>
            )}
          </div>
        )}
      </div>
    )}

    {/* Mini Timeline */}
    <Card
      title="Custody Timeline (Summary)"
      action={
        <Button size="sm" variant="secondary" onClick={() => onNavigate('custody')}>
          View Full Timeline <ChevronRight size={14} />
        </Button>
      }
    >
      {custodyEvents.length === 0 && (
        <p className="text-sm text-ink-400 py-4">No custody events recorded on the ledger.</p>
      )}
      <div className="relative pl-6">
        <div className="absolute left-2 top-2 bottom-2 w-px bg-line-200" />
        {custodyEvents.map((ev, i) => (
          <div key={ev.id} className={`relative flex gap-3 ${i < custodyEvents.length - 1 ? 'pb-5' : ''}`}>
            <div className={`absolute -left-[18px] w-3.5 h-3.5 rounded-full mt-1 ${custodyEventColor(ev.eventType)}`} />
            <div className="flex-1 bg-paper-50 border border-line-200 rounded-sm px-4 py-3">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-semibold text-navy-900">{ev.eventType}</span>
                <span className="text-xs text-ink-400">{fmtDateTime(ev.timestamp)}</span>
              </div>
              <div className="flex items-center gap-3 text-xs text-ink-500">
                <span>{ev.actor}</span>
                <span>·</span>
                <span className="font-mono">{ev.txId}</span>
                {ev.blockchainVerified && (
                  <span className="text-status-resolved flex items-center gap-0.5">
                    <CheckCircle size={10} /> Verified
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </Card>
  </div>
);

// ════════════════════════════════════════════════════════════════════════════
// Tab: Forensics
// ════════════════════════════════════════════════════════════════════════════

const ForensicsTab: React.FC<{
  forensics: ForensicRecord[];
  evidence: IOEvidence[];
}> = ({ forensics, evidence }) => {
  const done = forensics.filter(f =>
    f.examinationStatus === 'Examination Complete' || f.examinationStatus === 'Report Available'
  ).length;

  const truncHash = (h?: string) => h ? `${h.slice(0, 8)}…${h.slice(-8)}` : '—';

  return (
    <div className="space-y-5">
      {/* Progress Bar */}
      <div className="bg-white border border-line-200 rounded-sm px-5 py-4 shadow-card">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-semibold text-navy-900">Forensic Examination Progress</span>
          <span className="text-sm font-bold text-navy-900">{done} / {forensics.length} items complete</span>
        </div>
        <div className="h-2 bg-paper-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-status-resolved rounded-full transition-all"
            style={{ width: `${forensics.length > 0 ? (done / forensics.length) * 100 : 0}%` }}
          />
        </div>
      </div>

      <Table headers={['Evidence ID', 'FSL Reference', 'Submitted', 'Received', 'Status', 'Report', 'Examiner']}>
        {forensics.map(fr => {
          const ev = evidence.find(e => e.evidenceId === fr.evidenceId);
          return (
            <tr key={fr.evidenceId} className="hover:bg-paper-50 transition-colors">
              <td className="px-5 py-3 whitespace-nowrap">
                <div className="font-mono text-xs font-semibold text-navy-700">{fr.evidenceId}</div>
                {ev && <div className="text-xs text-ink-400">{ev.type}</div>}
              </td>
              <td className="px-5 py-3 whitespace-nowrap font-mono text-xs text-ink-700">{fr.fslRef}</td>
              <td className="px-5 py-3 whitespace-nowrap text-xs text-ink-500">{fmtDate(fr.submittedDate)}</td>
              <td className="px-5 py-3 whitespace-nowrap text-xs text-ink-500">{fr.receivedDate ? fmtDate(fr.receivedDate) : '—'}</td>
              <td className="px-5 py-3 whitespace-nowrap"><ForensicStatusPill status={fr.examinationStatus} /></td>
              <td className="px-5 py-3">
                {fr.reportHash ? (
                  <div>
                    <span className="font-mono text-xs text-ink-700">{truncHash(fr.reportHash)}</span>
                    {fr.reportBlockchainVerified && (
                      <div className="flex items-center gap-1 text-xs text-status-resolved mt-0.5">
                        <CheckCircle size={10} /> Verified on Ledger
                      </div>
                    )}
                  </div>
                ) : (
                  <span className="text-xs text-ink-400">Not available</span>
                )}
              </td>
              <td className="px-5 py-3 text-xs text-ink-700">{fr.examiner ?? '—'}</td>
            </tr>
          );
        })}
        {forensics.length === 0 && (
          <tr>
            <td colSpan={7} className="px-5 py-12 text-center text-sm text-ink-400">
              No forensic records have been raised for this case.
            </td>
          </tr>
        )}
      </Table>
    </div>
  );
};

// ════════════════════════════════════════════════════════════════════════════
// Tab: Documents
// ════════════════════════════════════════════════════════════════════════════

// There is no documents API in the investigating-officer domain, so nothing is
// listed here rather than showing placeholder filings.
const DocumentsTab: React.FC = () => (
  <Card title="Case Documents">
    <div className="flex flex-col items-center justify-center py-14 text-ink-400">
      <FileText size={36} className="mb-3 opacity-30" />
      <p className="text-sm font-medium">No documents recorded for this case.</p>
    </div>
  </Card>
);

// ════════════════════════════════════════════════════════════════════════════
// Tab: Audit
// ════════════════════════════════════════════════════════════════════════════

const AuditTab: React.FC<{
  auditEvents: AuditEvent[];
  onNavigate: (view: string, id?: string) => void;
}> = ({ auditEvents, onNavigate }) => (
  <div className="space-y-4">
    <div className="flex justify-end">
      <Button size="sm" variant="secondary" onClick={() => onNavigate('audit_log')}>
        View Full Audit Log <ChevronRight size={14} />
      </Button>
    </div>
    <Table headers={['Timestamp', 'Actor', 'Action', 'Details', 'Evidence', 'IP Address']}>
      {auditEvents.map(ev => (
        <tr key={ev.id} className="hover:bg-paper-50 transition-colors">
          <td className="px-5 py-3 whitespace-nowrap text-xs text-ink-500">{fmtDateTime(ev.timestamp)}</td>
          <td className="px-5 py-3 whitespace-nowrap text-xs font-medium text-navy-900">{ev.actor}</td>
          <td className="px-5 py-3 whitespace-nowrap">
            <span className="text-xs bg-navy-50 text-navy-700 border border-navy-100 px-2 py-0.5 rounded font-medium">
              {ev.action}
            </span>
          </td>
          <td className="px-5 py-3 text-xs text-ink-700">{ev.details}</td>
          <td className="px-5 py-3 whitespace-nowrap text-xs font-mono text-ink-500">{ev.evidenceId ?? '—'}</td>
          {/* The ledger does not record a client IP, so this stays blank. */}
          <td className="px-5 py-3 whitespace-nowrap text-xs font-mono text-ink-400">{ev.ipAddress ?? '—'}</td>
        </tr>
      ))}
      {auditEvents.length === 0 && (
        <tr>
          <td colSpan={6} className="px-5 py-12 text-center text-sm text-ink-400">
            No audit events have been recorded for this case.
          </td>
        </tr>
      )}
    </Table>
  </div>
);

export default CaseDetailPage;

