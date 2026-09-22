import React, { useState, useMemo } from 'react';
import {
  ShieldCheck,
  ShieldAlert,
  AlertOctagon,
  AlertTriangle,
  Info,
  CheckCircle2,
  Clock,
  ExternalLink,
  ArrowRightLeft,
  Package,
  FileText,
  Loader2,
  Copy,
  Check,
  X,
  FileBadge,
  Eye,
  Lock,
  ChevronRight,
  Scale
} from 'lucide-react';
import { Button, Badge } from '../Common';
import { useStore } from '../../store';
import {
  MOCK_CASES,
  MOCK_EVIDENCE,
  MOCK_ALERTS,
  IOCase,
  IOEvidence,
  IOAlert
} from '../../services/mockData';

interface PoliceDashboardProps {
  onNavigate: (view: string, id?: string) => void;
}

// ─── Verification Modal ──────────────────────────────────────────────────────
interface VerificationModalProps {
  evidence: IOEvidence;
  isOpen: boolean;
  onClose: () => void;
}

const VerificationModal: React.FC<VerificationModalProps> = ({ evidence, isOpen, onClose }) => {
  const [stage, setStage] = useState<'idle' | 'retrieving' | 'hashing' | 'comparing' | 'complete'>('idle');
  const [simulateTamper, setSimulateTamper] = useState(evidence.integrityStatus === 'Compromised');
  const [copiedHash, setCopiedHash] = useState(false);

  if (!isOpen) return null;

  const handleStartVerify = () => {
    setStage('retrieving');
    setTimeout(() => {
      setStage('hashing');
      setTimeout(() => {
        setStage('comparing');
        setTimeout(() => {
          setStage('complete');
        }, 800);
      }, 900);
    }, 800);
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedHash(true);
    setTimeout(() => setCopiedHash(false), 2000);
  };

  const isVerified = !simulateTamper && evidence.integrityStatus !== 'Compromised';
  const computedHash = simulateTamper
    ? evidence.sha256Hash.slice(0, -6) + '99AAFF'
    : evidence.sha256Hash;

  return (
    <div className="fixed inset-0 bg-navy-950/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
      <div className="bg-white border border-line-300 shadow-2xl rounded-md max-w-2xl w-full overflow-hidden">
        {/* Header */}
        <div className="bg-navy-900 text-white px-6 py-4 flex items-center justify-between border-b border-navy-800">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 bg-navy-800 rounded">
              <ShieldCheck size={20} className="text-saffron-500" />
            </div>
            <div>
              <h3 className="text-base font-bold tracking-tight">Cryptographic Evidence Integrity Verification</h3>
              <p className="text-xs text-navy-200">Hyperledger Fabric Immutable Ledger Audit</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-navy-300 hover:text-white p-1 rounded transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-6 space-y-5">
          {/* Item Banner */}
          <div className="bg-paper-50 border border-line-200 rounded p-4 flex items-center justify-between">
            <div>
              <span className="text-xs font-mono font-bold text-navy-800 bg-navy-50 px-2 py-0.5 rounded border border-navy-100 mr-2">
                {evidence.evidenceId}
              </span>
              <span className="text-sm font-semibold text-navy-900">{evidence.type}</span>
              <p className="text-xs text-ink-500 mt-1">{evidence.description}</p>
            </div>
            <div className="text-right">
              <span className="text-xs font-medium text-ink-500 block">Case FIR</span>
              <span className="text-xs font-mono font-semibold text-navy-900">{evidence.caseId}</span>
            </div>
          </div>

          {/* Test simulation toggle */}
          <div className="flex items-center justify-between px-3 py-2 bg-paper-100 rounded border border-line-200 text-xs text-ink-700">
            <span className="font-medium">Verification Mode:</span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => { setSimulateTamper(false); setStage('idle'); }}
                className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                  !simulateTamper ? 'bg-navy-900 text-white' : 'bg-white text-ink-700 hover:bg-paper-200'
                }`}
              >
                Standard (Match)
              </button>
              <button
                type="button"
                onClick={() => { setSimulateTamper(true); setStage('idle'); }}
                className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                  simulateTamper ? 'bg-status-urgent text-white' : 'bg-white text-ink-700 hover:bg-paper-200'
                }`}
              >
                Simulate Tamper / Mismatch
              </button>
            </div>
          </div>

          {/* Stepper Display */}
          <div className="grid grid-cols-4 gap-2 pt-2">
            {[
              { id: 'retrieving', title: '1. Object Storage', desc: 'Fetch stored binary' },
              { id: 'hashing', title: '2. Cryptographic Hash', desc: 'Compute SHA-256' },
              { id: 'comparing', title: '3. Ledger Query', desc: 'Compare Fabric block' },
              { id: 'complete', title: '4. Integrity Result', desc: 'Final attestation' }
            ].map((st, idx) => {
              const stages = ['idle', 'retrieving', 'hashing', 'comparing', 'complete'];
              const currentIdx = stages.indexOf(stage);
              const targetIdx = idx + 1;
              const isPast = currentIdx > targetIdx;
              const isActive = currentIdx === targetIdx;

              return (
                <div
                  key={st.id}
                  className={`p-2.5 rounded border text-xs transition-colors ${
                    isActive
                      ? 'border-navy-700 bg-navy-50 text-navy-900 font-medium ring-1 ring-navy-700'
                      : isPast
                      ? 'border-status-resolved/30 bg-status-resolvedBg text-status-resolved'
                      : 'border-line-200 bg-paper-50 text-ink-400'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-semibold">{st.title}</span>
                    {isActive && <Loader2 size={12} className="animate-spin text-navy-700" />}
                    {isPast && <CheckCircle2 size={12} className="text-status-resolved" />}
                  </div>
                  <p className="text-[11px] leading-tight text-ink-500">{st.desc}</p>
                </div>
              );
            })}
          </div>

          {/* Results Area */}
          {stage === 'idle' && (
            <div className="border border-line-200 bg-white p-5 rounded text-center space-y-3">
              <p className="text-xs text-ink-600 max-w-lg mx-auto">
                Clicking verify will retrieve the current digital artifact from secure object storage, independently compute its 256-bit hash, and evaluate it against the immutable record recorded in block <code className="font-mono text-navy-800 font-semibold">{evidence.blockchainTxId}</code>.
              </p>
              <Button onClick={handleStartVerify} className="mx-auto">
                <ShieldCheck size={16} /> Execute Verification Workflow
              </Button>
            </div>
          )}

          {stage !== 'idle' && stage !== 'complete' && (
            <div className="border border-navy-200 bg-navy-50/50 p-6 rounded text-center space-y-2">
              <Loader2 size={28} className="animate-spin text-navy-700 mx-auto" />
              <p className="text-sm font-semibold text-navy-900">
                {stage === 'retrieving' && 'Retrieving byte stream from secure evidence storage...'}
                {stage === 'hashing' && 'Calculating SHA-256 checksum over byte payload...'}
                {stage === 'comparing' && 'Querying Hyperledger Fabric peer endorsement & ledger state...'}
              </p>
              <p className="text-xs text-ink-500">Communicating with NodeWatch peer node over mTLS</p>
            </div>
          )}

          {stage === 'complete' && (
            <div
              className={`p-5 rounded border ${
                isVerified
                  ? 'bg-status-resolvedBg/40 border-status-resolved/30'
                  : 'bg-status-urgentBg/40 border-status-urgent/30'
              } space-y-4`}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                    isVerified ? 'bg-status-resolved text-white' : 'bg-status-urgent text-white'
                  }`}
                >
                  {isVerified ? <ShieldCheck size={22} /> : <AlertOctagon size={22} />}
                </div>
                <div>
                  <h4 className="text-base font-bold text-navy-900">
                    {isVerified ? 'Cryptographic Integrity Attested' : 'INTEGRITY MISMATCH DETECTED'}
                  </h4>
                  <p className="text-xs text-ink-600">
                    {isVerified
                      ? 'The binary hash matches the initial immutable ledger block registration with zero discrepancies.'
                      : 'Calculated SHA-256 digest deviates from the immutable ledger registration record. Potential tampering or file corruption detected.'}
                  </p>
                </div>
              </div>

              {/* Hash Comparison Table */}
              <div className="bg-white rounded border border-line-200 p-3 space-y-2 text-xs font-mono">
                <div>
                  <span className="text-[11px] font-sans font-medium text-ink-500 uppercase tracking-wide block">
                    Fabric Ledger Anchor Hash (Registered):
                  </span>
                  <div className="flex items-center justify-between text-navy-900 bg-paper-50 p-1.5 rounded mt-0.5">
                    <span className="truncate mr-2">{evidence.sha256Hash}</span>
                    <button
                      onClick={() => handleCopy(evidence.sha256Hash)}
                      className="text-ink-400 hover:text-navy-900 shrink-0"
                    >
                      {copiedHash ? <Check size={14} className="text-status-resolved" /> : <Copy size={14} />}
                    </button>
                  </div>
                </div>

                <div>
                  <span className="text-[11px] font-sans font-medium text-ink-500 uppercase tracking-wide block">
                    Calculated Object Storage Hash (Current):
                  </span>
                  <div
                    className={`flex items-center justify-between p-1.5 rounded mt-0.5 ${
                      isVerified ? 'bg-paper-50 text-navy-900' : 'bg-status-urgentBg text-status-urgent font-bold'
                    }`}
                  >
                    <span className="truncate mr-2">{computedHash}</span>
                    <span className="text-[10px] font-sans font-bold uppercase px-1.5 py-0.5 rounded bg-white shrink-0 border border-line-200">
                      {isVerified ? 'Exact Match' : 'Mismatch'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-paper-50 px-6 py-3 border-t border-line-200 flex justify-end gap-2">
          <Button variant="secondary" size="sm" onClick={onClose}>
            Close
          </Button>
          {stage === 'complete' && (
            <Button size="sm" onClick={() => setStage('idle')}>
              Verify Again
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

// ─── Alerts Drawer ───────────────────────────────────────────────────────────
interface AlertsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  alerts: IOAlert[];
  onInspect: (evidenceId: string) => void;
  onNavigateCase: (caseId: string) => void;
}

const AlertsDrawer: React.FC<AlertsDrawerProps> = ({
  isOpen,
  onClose,
  alerts,
  onInspect,
  onNavigateCase
}) => {
  const [filter, setFilter] = useState<'all' | 'critical' | 'warning' | 'info'>('all');
  const [acknowledgedIds, setAcknowledgedIds] = useState<string[]>([]);

  if (!isOpen) return null;

  const filteredAlerts = alerts.filter(a => {
    if (filter === 'critical') return a.severity === 'critical';
    if (filter === 'warning') return a.severity === 'warning';
    if (filter === 'info') return a.severity === 'info' || a.status === 'Resolved';
    return true;
  });

  const handleAcknowledge = (id: string) => {
    setAcknowledgedIds(prev => [...prev, id]);
  };

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
          {filteredAlerts.map(alert => {
            const isAck = acknowledgedIds.includes(alert.id) || alert.status === 'Acknowledged';
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
                        <span className="font-mono font-medium">{alert.evidenceId || alert.caseId}</span>
                        <span>·</span>
                        <span>{new Date(alert.timestamp).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex justify-end gap-2 pt-1">
                  {!isAck && !isResolved && (
                    <button
                      onClick={() => handleAcknowledge(alert.id)}
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

  // Modal / Drawer state
  const [selectedInspectEvidence, setSelectedInspectEvidence] = useState<IOEvidence | null>(null);
  const [isVerificationModalOpen, setIsVerificationModalOpen] = useState(false);
  const [isAlertsDrawerOpen, setIsAlertsDrawerOpen] = useState(false);

  // Time-based greeting helper
  const getGreeting = () => {
    const hr = new Date().getHours();
    if (hr < 12) return 'Good morning';
    if (hr < 17) return 'Good afternoon';
    return 'Good evening';
  };

  // Date formatting
  const todayFormatted = useMemo(() => {
    return new Date().toLocaleDateString('en-IN', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  }, []);

  // Focused Case for "Continue Working"
  const focusedCase: IOCase = useMemo(() => {
    return (
      MOCK_CASES.find(c => c.firNumber === 'FIR 201/2026') ||
      MOCK_CASES[0] || {
        firNumber: 'FIR 201/2026',
        title: 'State vs. Multiple Accused',
        policeStation: 'Central Police Station',
        dateRegistered: '2026-09-08T11:45:00.000Z',
        investigatingOfficer: 'SI Vikram Nair',
        evidenceCount: 23,
        witnessCount: 7,
        offences: ['IPC 420', 'IPC 467', 'IT Act 66C'],
        forensicProgress: { completed: 10, total: 23 },
        cocStatus: 'Pending',
        status: 'Awaiting Forensics',
        lastUpdated: '2026-09-15T17:55:00.000Z',
        description:
          'Large-scale financial fraud and identity theft involving multiple accused persons. Digital forensics ongoing on 13 seized electronic devices.',
        district: 'Bengaluru Urban'
      }
    );
  }, []);

  // Actionable Alerts (top 4 critical & warning alerts requiring IO intervention)
  const actionableAlerts = [
    {
      id: 'ALT-001',
      severity: 'critical' as const,
      title: 'Integrity mismatch detected',
      evidenceId: 'EV-0215',
      caseId: 'FIR 215/2026',
      timeAgo: '13 minutes ago',
      actionLabel: 'Inspect Evidence',
      actionType: 'inspect' as const
    },
    {
      id: 'ALT-003',
      severity: 'warning' as const,
      title: 'Transfer awaiting acknowledgement',
      evidenceId: 'EV-0144',
      caseId: 'FIR 142/2026',
      timeAgo: '11 days',
      actionLabel: 'Inspect',
      actionType: 'inspect' as const
    },
    {
      id: 'ALT-004',
      severity: 'warning' as const,
      title: 'Forensic report overdue',
      caseId: 'FIR 201/2026',
      timeAgo: '2 days',
      actionLabel: 'View Case',
      actionType: 'view_case' as const
    },
    {
      id: 'ALT-002',
      severity: 'critical' as const,
      title: 'Unauthorized evidence access attempt',
      caseId: 'FIR 178/2026',
      timeAgo: '8 hours ago',
      actionLabel: 'View Case',
      actionType: 'view_case' as const
    }
  ];

  // Quiet Non-Actionable Recent Activity
  const recentActivities = [
    {
      id: 'act-1',
      icon: <ArrowRightLeft size={13} className="text-ink-500" />,
      title: 'Evidence successfully transferred',
      subtitle: 'EV-0201 · FIR 089/2026',
      timeAgo: '4 days ago'
    },
    {
      id: 'act-2',
      icon: <FileText size={13} className="text-ink-500" />,
      title: 'Forensic report available',
      subtitle: 'EV-0142 · FIR 142/2026',
      timeAgo: '6 days ago'
    },
    {
      id: 'act-3',
      icon: <CheckCircle2 size={13} className="text-ink-500" />,
      title: 'Custody acknowledged',
      subtitle: 'EV-0144 · FSL Bengaluru',
      timeAgo: '12 days ago'
    },
    {
      id: 'act-4',
      icon: <Package size={13} className="text-ink-500" />,
      title: 'Evidence uploaded',
      subtitle: 'EV-0143 · Central PS',
      timeAgo: '14 days ago'
    }
  ];

  // Trigger Evidence Verification modal
  const handleInspect = (evidenceId: string) => {
    const found = MOCK_EVIDENCE.find(e => e.evidenceId === evidenceId);
    if (found) {
      setSelectedInspectEvidence(found);
    } else {
      // Default fallback for simulated EV-0215 with mismatch
      setSelectedInspectEvidence({
        evidenceId: 'EV-0215',
        caseId: 'FIR 215/2026',
        type: 'Corporate Server Log Archive',
        description: 'Seized server log file from target financial system. Discrepancy noted during periodic ledger audit.',
        collectedAt: '2026-09-10T16:30:00.000Z',
        collectedLocation: 'Electronic City PS Evidence Room',
        collectedBy: 'SI Mohan Das',
        currentCustodian: 'Evidence Store Officer',
        currentLocation: 'Secure Digital Storage #3',
        status: 'Secure Storage',
        integrityStatus: 'Compromised',
        forensicStatus: 'Under Examination',
        sha256Hash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
        blockchainTxId: 'TX-9B101C88',
        blockchainVerified: false,
        sealId: 'SEAL-4491'
      });
    }
    setIsVerificationModalOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* ── 1. HEADER / GREETING ────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-2 pb-1 border-b border-line-200/60">
        <div>
          <h1 className="text-2xl font-bold text-navy-900 tracking-tight">
            {getGreeting()}, {currentUser?.name || 'S. Murugan'}
          </h1>
          <p className="text-xs text-ink-500 mt-0.5">
            Central Police Station · Crime Investigation Division
          </p>
        </div>
        <div className="text-xs text-ink-500 font-medium">
          {todayFormatted}
        </div>
      </div>

      {/* ── 2. KPI OVERVIEW ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Active Cases */}
        <div
          onClick={() => onNavigate('cases')}
          className="bg-white border border-line-200 rounded-md p-4 shadow-sm hover:border-navy-400 hover:shadow-card cursor-pointer transition-all"
        >
          <div className="text-xs font-semibold uppercase tracking-wider text-ink-500 flex items-center justify-between">
            <span>Active Cases</span>
            <ChevronRight size={13} className="text-ink-300" />
          </div>
          <div className="text-3xl font-bold text-navy-900 mt-1">24</div>
          <div className="text-xs text-ink-500 mt-1">3 awaiting forensics</div>
        </div>

        {/* Total Evidence */}
        <div
          onClick={() => onNavigate('evidence_vault')}
          className="bg-white border border-line-200 rounded-md p-4 shadow-sm hover:border-navy-400 hover:shadow-card cursor-pointer transition-all"
        >
          <div className="text-xs font-semibold uppercase tracking-wider text-ink-500 flex items-center justify-between">
            <span>Total Evidence</span>
            <ChevronRight size={13} className="text-ink-300" />
          </div>
          <div className="text-3xl font-bold text-navy-900 mt-1">187</div>
          <div className="text-xs text-ink-500 mt-1">100% on ledger</div>
        </div>

        {/* At Forensic Lab */}
        <div
          onClick={() => onNavigate('forensics')}
          className="bg-white border border-line-200 rounded-md p-4 shadow-sm hover:border-navy-400 hover:shadow-card cursor-pointer transition-all"
        >
          <div className="text-xs font-semibold uppercase tracking-wider text-ink-500 flex items-center justify-between">
            <span>At Forensic Lab</span>
            <ChevronRight size={13} className="text-ink-300" />
          </div>
          <div className="text-3xl font-bold text-navy-900 mt-1">31</div>
          <div className="text-xs text-ink-500 mt-1">15 reports ready</div>
        </div>

        {/* Attention Required (Stronger warning styling) */}
        <div
          onClick={() => setIsAlertsDrawerOpen(true)}
          className="bg-amber-50/50 border border-amber-300/80 rounded-md p-4 shadow-sm hover:border-amber-400 hover:shadow-card cursor-pointer transition-all"
        >
          <div className="text-xs font-semibold uppercase tracking-wider text-amber-900 flex items-center justify-between">
            <span>Attention Required</span>
            <ChevronRight size={13} className="text-amber-500" />
          </div>
          <div className="text-3xl font-bold text-amber-800 mt-1">4</div>
          <div className="text-xs text-amber-900/80 font-medium mt-1">2 critical · 2 warning</div>
        </div>
      </div>

      {/* ── 3. PRIMARY CONTENT AREA: TWO-COLUMN LAYOUT ──────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT / LARGER COLUMN: Needs Attention (7 Cols) */}
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
            {actionableAlerts.map(alert => (
              <div
                key={alert.id}
                className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-paper-50/60 transition-colors"
              >
                <div className="flex items-start gap-3 min-w-0">
                  {/* Small semantic severity indicator */}
                  <span
                    className={`w-2.5 h-2.5 rounded-full mt-1.5 shrink-0 ${
                      alert.severity === 'critical' ? 'bg-status-urgent' : 'bg-status-pending'
                    }`}
                  />
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-navy-900">
                      {alert.title}
                    </div>
                    <div className="text-xs text-ink-500 mt-0.5 flex items-center gap-2">
                      <span className="font-mono font-medium">{alert.evidenceId || alert.caseId}</span>
                      <span>·</span>
                      <span>{alert.timeAgo}</span>
                    </div>
                  </div>
                </div>

                {/* One Primary Action */}
                <div className="shrink-0 self-end sm:self-auto">
                  {alert.actionType === 'inspect' ? (
                    <button
                      onClick={() => handleInspect(alert.evidenceId!)}
                      className="px-3 py-1.5 text-xs font-semibold rounded bg-white border border-line-300 text-navy-900 hover:bg-paper-100 hover:border-navy-400 shadow-sm transition-colors"
                    >
                      {alert.actionLabel}
                    </button>
                  ) : (
                    <button
                      onClick={() => onNavigate('case_detail', alert.caseId)}
                      className="px-3 py-1.5 text-xs font-semibold rounded bg-white border border-line-300 text-navy-900 hover:bg-paper-100 hover:border-navy-400 shadow-sm transition-colors"
                    >
                      {alert.actionLabel}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* View all alerts link */}
          <div className="pt-1 text-right">
            <button
              onClick={() => setIsAlertsDrawerOpen(true)}
              className="text-xs font-semibold text-navy-800 hover:text-navy-950 inline-flex items-center gap-1 hover:underline"
            >
              View all alerts →
            </button>
          </div>
        </div>

        {/* RIGHT / SMALLER COLUMN: Continue Working & Recent Activity (5 Cols) */}
        <div className="lg:col-span-5 flex flex-col space-y-6">
          {/* Continue Working Card */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-bold uppercase tracking-wider text-navy-900">Continue Working</h2>
              <span className="text-xs text-ink-400">Current Focus</span>
            </div>
            <div className="bg-white border border-line-200 rounded-md p-4 shadow-sm space-y-3">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-bold text-navy-700 bg-navy-50 px-2 py-0.5 rounded border border-navy-100">
                    {focusedCase.firNumber}
                  </span>
                  <span className="text-xs font-medium text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                    {focusedCase.status}
                  </span>
                </div>
                <h3 className="text-base font-bold text-navy-900 mt-2">
                  {focusedCase.title}
                </h3>
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
                  <span>Sec 173 CrPC Readiness (88%) →</span>
                </button>
                <button
                  onClick={() => onNavigate('case_detail', focusedCase.firNumber)}
                  className="px-3.5 py-1.5 text-xs font-semibold rounded bg-navy-900 text-white hover:bg-navy-800 shadow-sm transition-colors inline-flex items-center gap-1 shrink-0 self-end sm:self-auto"
                >
                  Open Case →
                </button>
              </div>
            </div>
          </div>

          {/* 4. Recent Activity (Quieter list) */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-xs font-bold uppercase tracking-wider text-ink-500">Recent Activity</h2>
              <span className="text-[11px] text-ink-400">Non-Actionable Updates</span>
            </div>
            <div className="bg-white border border-line-200 rounded-md shadow-sm divide-y divide-line-100">
              {recentActivities.map(item => (
                <div key={item.id} className="p-3 flex items-start gap-3">
                  <div className="p-1 rounded bg-paper-100 text-ink-500 shrink-0 mt-0.5">
                    {item.icon}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-medium text-navy-900 truncate">
                      {item.title}
                    </div>
                    <div className="text-[11px] text-ink-500 mt-0.5">
                      {item.subtitle} · {item.timeAgo}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Verification Modal for Inspect Evidence */}
      {selectedInspectEvidence && (
        <VerificationModal
          evidence={selectedInspectEvidence}
          isOpen={isVerificationModalOpen}
          onClose={() => {
            setIsVerificationModalOpen(false);
            setSelectedInspectEvidence(null);
          }}
        />
      )}

      {/* All Alerts Drawer */}
      <AlertsDrawer
        isOpen={isAlertsDrawerOpen}
        onClose={() => setIsAlertsDrawerOpen(false)}
        alerts={MOCK_ALERTS}
        onInspect={handleInspect}
        onNavigateCase={caseId => onNavigate('case_detail', caseId)}
      />
    </div>
  );
};

export default PoliceDashboard;
