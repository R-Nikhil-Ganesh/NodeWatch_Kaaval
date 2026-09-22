import React, { useState, useEffect, useCallback } from 'react';
import {
  ArrowLeft, CheckCircle, AlertTriangle, Clock, Copy,
  Shield, ExternalLink, FlaskConical, Link2, Phone, Film, Droplets, FileText
} from 'lucide-react';
import { Card, Button } from '../Common';
import { getEvidenceById } from '../../services/evidenceService';
import { getCustodyTimeline, getChainIntegrityReport } from '../../services/custodyService';
import { getForensicStatus } from '../../services/forensicService';
import type { IOEvidence } from '../../services/types';
import type { ForensicRecord } from '../../services/types';
import type { ChainIntegrityReport } from '../../services/custodyService';
import VerificationModal from './VerificationModal';

// ── Helpers ──────────────────────────────────────────────────────────────────

const fmtDate = (s?: string) =>
  s ? new Date(s).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
const fmtTime = (s?: string) =>
  s ? new Date(s).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false }) : '';
const fmtDateTime = (s?: string) => s ? `${fmtDate(s)}, ${fmtTime(s)}` : '—';

const truncHash = (h: string, front = 16, back = 16) =>
  h.length > front + back + 3 ? `${h.slice(0, front)}…${h.slice(-back)}` : h;

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
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${map[status]}`}>
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
    'Verified': <CheckCircle size={12} />,
    'Compromised': <AlertTriangle size={12} />,
    'Pending': <Clock size={12} />,
    'Not Checked': <Clock size={12} />,
  };
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${map[status]}`}>
      {icons[status]} {status}
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
  };
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${map[status]}`}>
      {status}
    </span>
  );
};

// ── Metadata row ──────────────────────────────────────────────────────────────

const MetaRow: React.FC<{ label: string; value: React.ReactNode }> = ({ label, value }) => (
  <div>
    <p className="text-xs font-medium text-ink-500 uppercase tracking-wide mb-1">{label}</p>
    <p className="text-sm font-medium text-navy-900">{value}</p>
  </div>
);

// ── Props ─────────────────────────────────────────────────────────────────────

interface Props {
  evidenceId: string;
  onNavigate: (view: string, id?: string) => void;
  onBack: () => void;
}

// ════════════════════════════════════════════════════════════════════════════
// Main component
// ════════════════════════════════════════════════════════════════════════════

const EvidenceDetailPage: React.FC<Props> = ({ evidenceId, onNavigate, onBack }) => {
  const [ev, setEv] = useState<IOEvidence | null>(null);
  const [forensicRecord, setForensicRecord] = useState<ForensicRecord | null>(null);
  const [chainReport, setChainReport] = useState<ChainIntegrityReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [copySuccess, setCopySuccess] = useState(false);
  const [isVerifyOpen, setIsVerifyOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const [evidence, fr, cr] = await Promise.all([
      getEvidenceById(evidenceId),
      getForensicStatus(evidenceId),
      getChainIntegrityReport(evidenceId),
    ]);
    setEv(evidence ?? null);
    setForensicRecord(fr ?? null);
    setChainReport(cr);
    setLoading(false);
  }, [evidenceId]);

  useEffect(() => { load(); }, [load]);

  const handleCopyHash = () => {
    if (ev?.sha256Hash) {
      navigator.clipboard.writeText(ev.sha256Hash).then(() => {
        setCopySuccess(true);
        setTimeout(() => setCopySuccess(false), 2000);
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-ink-500">
        <div className="w-8 h-8 border-2 border-navy-900 border-t-transparent rounded-full animate-spin mx-auto mr-3" />
        Loading evidence details…
      </div>
    );
  }

  if (!ev) {
    return (
      <div className="p-8 text-center text-ink-500">
        <p>Evidence item not found: {evidenceId}</p>
        <Button variant="secondary" onClick={onBack} className="mt-4">← Back</Button>
      </div>
    );
  }

  const EvidenceTypeIcon = () => {
    const t = ev.type.toLowerCase();
    if (t.includes('mobile') || t.includes('phone')) return <Phone size={14} className="text-navy-700" />;
    if (t.includes('cctv') || t.includes('video')) return <Film size={14} className="text-purple-600" />;
    if (t.includes('bio') || t.includes('blood')) return <Droplets size={14} className="text-red-600" />;
    return <FileText size={14} className="text-ink-500" />;
  };

  return (
    <div className="min-h-screen bg-paper-50">
      {/* Header */}
      <div className="bg-white border-b border-line-200 px-6 py-5">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-sm text-ink-500 hover:text-navy-700 mb-4 transition-colors"
        >
          <ArrowLeft size={16} /> Back to Evidence
        </button>
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-2xl font-bold text-navy-900">{ev.evidenceId}</h1>
              <EvidenceStatusPill status={ev.status} />
              <IntegrityPill status={ev.integrityStatus} />
            </div>
            <div className="flex items-center gap-2 text-sm text-ink-600">
              <EvidenceTypeIcon />
              <span className="font-medium">{ev.type}</span>
              <span className="text-line-300">|</span>
              <span className="text-navy-700 font-medium">{ev.caseId}</span>
            </div>
          </div>
          <Button onClick={() => setIsVerifyOpen(true)}>
            <Shield size={16} /> Verify Evidence Integrity
          </Button>
        </div>
      </div>

      {/* Two-column layout */}
      <div className="p-6 grid grid-cols-3 gap-6">
        {/* Left: 2/3 */}
        <div className="col-span-2 space-y-5">

          {/* Evidence Metadata */}
          <Card title="Evidence Metadata">
            <div className="grid grid-cols-2 gap-x-8 gap-y-5">
              <MetaRow label="Evidence ID" value={<span className="font-mono">{ev.evidenceId}</span>} />
              <MetaRow label="Type" value={
                <span className="flex items-center gap-1.5"><EvidenceTypeIcon />{ev.type}</span>
              } />
              <MetaRow label="Case" value={ev.caseId} />
              <MetaRow label="Status" value={<EvidenceStatusPill status={ev.status} />} />
              <MetaRow label="Description" value={ev.description} />
              <MetaRow label="Collected" value={fmtDateTime(ev.collectedAt)} />
              <MetaRow label="Collected By" value={ev.collectedBy} />
              <MetaRow label="Collection Location" value={ev.collectedLocation} />
              <MetaRow label="Current Custodian" value={ev.currentCustodian} />
              <MetaRow label="Current Location" value={ev.currentLocation} />
              {ev.sealId && <MetaRow label="Seal ID" value={<span className="font-mono">{ev.sealId}</span>} />}
              {ev.notes && (
                <div className="col-span-2">
                  <MetaRow label="Notes" value={ev.notes} />
                </div>
              )}
            </div>
          </Card>

          {/* Cryptographic Information */}
          <Card title="Cryptographic Record">
            <p className="text-xs text-ink-500 mb-5 leading-relaxed">
              The SHA-256 hash below represents the evidence file at the moment it was registered.
              Any subsequent modification to the file would produce a different hash — detectable
              by comparing against the record on the Hyperledger Fabric ledger.
            </p>

            <div className="space-y-5">
              {/* SHA-256 Hash */}
              <div>
                <p className="text-xs font-medium text-ink-500 uppercase tracking-wide mb-2">SHA-256 Hash</p>
                <div className="flex items-center gap-3 bg-paper-50 border border-line-200 rounded-sm px-4 py-3">
                  <span className="font-mono text-sm text-navy-900 flex-1 break-all">
                    {truncHash(ev.sha256Hash)}
                  </span>
                  <button
                    onClick={handleCopyHash}
                    className="flex items-center gap-1.5 text-xs text-ink-500 hover:text-navy-700 transition-colors px-2 py-1 border border-line-200 rounded hover:border-navy-300 bg-white"
                    title="Copy full hash"
                  >
                    <Copy size={13} />
                    {copySuccess ? 'Copied!' : 'Copy'}
                  </button>
                </div>
              </div>

              {/* Blockchain TX */}
              <div className="grid grid-cols-2 gap-5">
                <div>
                  <p className="text-xs font-medium text-ink-500 uppercase tracking-wide mb-2">Blockchain Transaction ID</p>
                  <p className="font-mono text-sm text-navy-900 bg-paper-50 border border-line-200 rounded-sm px-3 py-2.5 break-all">
                    {ev.blockchainTxId}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium text-ink-500 uppercase tracking-wide mb-2">Blockchain Record</p>
                  {ev.blockchainVerified ? (
                    <div className="flex items-center gap-2 bg-status-resolvedBg border border-status-resolved/20 rounded-sm px-3 py-2.5">
                      <CheckCircle size={16} className="text-status-resolved flex-shrink-0" />
                      <span className="text-sm font-semibold text-status-resolved">
                        Verified on Hyperledger Fabric
                      </span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 bg-status-pendingBg border border-status-pending/20 rounded-sm px-3 py-2.5">
                      <Clock size={16} className="text-status-pending flex-shrink-0" />
                      <span className="text-sm font-semibold text-status-pending">
                        Verification Pending
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Evidence Integrity */}
              <div>
                <p className="text-xs font-medium text-ink-500 uppercase tracking-wide mb-2">Evidence Integrity</p>
                <div className="flex items-center gap-3">
                  <IntegrityPill status={ev.integrityStatus} />
                  <span className="text-sm text-ink-600">
                    {ev.integrityStatus === 'Verified'
                      ? 'File hash matches the blockchain record — no tampering detected.'
                      : ev.integrityStatus === 'Compromised'
                      ? 'File hash DOES NOT match the blockchain record — integrity compromised.'
                      : ev.integrityStatus === 'Pending'
                      ? 'Integrity verification is pending — hash comparison not yet performed.'
                      : 'Integrity has not been checked for this evidence item.'}
                  </span>
                </div>
              </div>
            </div>

            <p className="text-xs text-ink-400 italic mt-5 pt-4 border-t border-line-200 leading-snug">
              Evidence files are stored in secure object storage. Only cryptographic hashes and metadata
              are recorded on the blockchain ledger.
            </p>
          </Card>

          {/* Verify button */}
          <button
            onClick={() => setIsVerifyOpen(true)}
            className="w-full flex items-center justify-center gap-3 py-4 bg-navy-900 hover:bg-navy-800 text-white font-semibold rounded-sm transition-colors shadow-card"
          >
            <Shield size={20} /> Verify Evidence Integrity
          </button>

          {/* Chain of Custody Summary */}
          <Card
            title="Chain of Custody"
            action={
              <Button size="sm" variant="secondary" onClick={() => onNavigate('custody')}>
                View Full Timeline <ExternalLink size={13} />
              </Button>
            }
          >
            {chainReport ? (
              <div className="space-y-3">
                <div className="flex flex-wrap gap-3">
                  {[
                    { label: 'Chain Integrity Verified', ok: chainReport.verified },
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
                </div>
                <p className="text-xs text-ink-500">
                  {chainReport.totalEvents} custody events recorded on the blockchain ledger.
                </p>
              </div>
            ) : (
              <p className="text-sm text-ink-400">No chain of custody data available.</p>
            )}
          </Card>
        </div>

        {/* Right: 1/3 */}
        <div className="space-y-5">
          {/* Forensic Status */}
          <Card title="Forensic Status">
            {forensicRecord ? (
              <div className="space-y-4">
                <div>
                  <p className="text-xs font-medium text-ink-500 uppercase tracking-wide mb-1">Laboratory</p>
                  <p className="text-sm font-semibold text-navy-900">{forensicRecord.fslName}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-ink-500 uppercase tracking-wide mb-1">FSL Reference</p>
                  <p className="text-sm font-mono font-medium text-navy-900">{forensicRecord.fslRef}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-ink-500 uppercase tracking-wide mb-1">Submitted</p>
                  <p className="text-sm text-ink-700">{fmtDate(forensicRecord.submittedDate)}</p>
                </div>
                {forensicRecord.examiner && (
                  <div>
                    <p className="text-xs font-medium text-ink-500 uppercase tracking-wide mb-1">Examiner</p>
                    <p className="text-sm text-ink-700">{forensicRecord.examiner}</p>
                  </div>
                )}
                <div>
                  <p className="text-xs font-medium text-ink-500 uppercase tracking-wide mb-1">Examination Status</p>
                  <ForensicStatusPill status={forensicRecord.examinationStatus} />
                </div>
                {forensicRecord.reportHash && (
                  <div>
                    <p className="text-xs font-medium text-ink-500 uppercase tracking-wide mb-2">Report Hash</p>
                    <p className="font-mono text-xs text-navy-900 bg-paper-50 border border-line-200 rounded px-3 py-2 break-all">
                      {truncHash(forensicRecord.reportHash, 8, 8)}
                    </p>
                    {forensicRecord.reportBlockchainVerified && (
                      <div className="flex items-center gap-1.5 text-xs text-status-resolved mt-2 font-semibold">
                        <CheckCircle size={12} /> Report Verified on Ledger
                      </div>
                    )}
                  </div>
                )}
                {forensicRecord.findings && (
                  <div>
                    <p className="text-xs font-medium text-ink-500 uppercase tracking-wide mb-1">Findings</p>
                    <p className="text-xs text-ink-700 leading-relaxed">{forensicRecord.findings}</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="py-4 text-center">
                <FlaskConical size={24} className="text-ink-300 mx-auto mb-2" />
                <p className="text-sm text-ink-400">No forensic record found for this evidence.</p>
              </div>
            )}
          </Card>

          {/* Related Evidence */}
          <Card title="Related Evidence">
            <div className="text-center py-3">
              <p className="text-sm text-ink-600 mb-1">Part of</p>
              <p className="text-base font-bold text-navy-900 mb-1">{ev.caseId}</p>
              <p className="text-xs text-ink-400 mb-4">Multiple evidence items registered in this case</p>
              <Button variant="secondary" size="sm" className="w-full" onClick={() => onNavigate('evidence')}>
                <Link2 size={13} /> View All Evidence
              </Button>
            </div>
          </Card>

          {/* Quick actions */}
          <Card title="Quick Actions">
            <div className="space-y-2">
              <Button variant="secondary" size="sm" className="w-full justify-start" onClick={() => setIsVerifyOpen(true)}>
                <Shield size={14} /> Verify Integrity
              </Button>
              <Button variant="secondary" size="sm" className="w-full justify-start" onClick={() => onNavigate('custody')}>
                <Link2 size={14} /> View Custody Timeline
              </Button>
              <Button variant="secondary" size="sm" className="w-full justify-start" onClick={() => onNavigate('forensics')}>
                <FlaskConical size={14} /> View Forensic Records
              </Button>
            </div>
          </Card>
        </div>
      </div>

      {/* Verification Modal */}
      <VerificationModal
        evidenceId={ev.evidenceId}
        isOpen={isVerifyOpen}
        onClose={() => setIsVerifyOpen(false)}
      />
    </div>
  );
};

export default EvidenceDetailPage;

