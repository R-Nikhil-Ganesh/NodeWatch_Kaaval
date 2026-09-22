import React, { useEffect, useState } from 'react';
import {
  ShieldCheck,
  AlertOctagon,
  Loader2,
  CheckCircle2,
  Copy,
  Check,
  X,
} from 'lucide-react';
import { Button } from '../Common';
import { verifyEvidenceIntegrity } from '../../services/verificationService';
import type { VerificationResult, VerificationStage } from '../../services/types';
import { useStore } from '../../store';

// ─── Props ───────────────────────────────────────────────────────────────────

export interface VerificationModalProps {
  evidenceId: string;
  isOpen: boolean;
  onClose: () => void;
}

// ─── Stepper definition ──────────────────────────────────────────────────────

const STEPS: { title: string; desc: string }[] = [
  { title: '1. Object Storage', desc: 'Fetch stored binary' },
  { title: '2. Cryptographic Hash', desc: 'Compute SHA-256' },
  { title: '3. Ledger Query', desc: 'Compare Fabric block' },
  { title: '4. Integrity Result', desc: 'Final attestation' },
];

/** Linear progression used to decide which stepper cells are done / active. */
const STAGE_ORDER: VerificationStage[] = ['idle', 'retrieving', 'hashing', 'comparing'];

const fmtTime = (iso?: string) => {
  if (!iso) return '—';
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? '—'
    : `${d.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      })}, ${d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false })}`;
};

// ─── Hash row ────────────────────────────────────────────────────────────────

const HashRow: React.FC<{
  label: string;
  value: string;
  tone: 'neutral' | 'match' | 'mismatch';
  badge?: string;
}> = ({ label, value, tone, badge }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    if (!value) return;
    navigator.clipboard?.writeText(value).then(
      () => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      },
      () => {
        /* clipboard unavailable — nothing to do */
      },
    );
  };

  const toneClass =
    tone === 'mismatch'
      ? 'bg-status-urgentBg text-status-urgent font-bold'
      : 'bg-paper-50 text-navy-900';

  return (
    <div>
      <span className="text-[11px] font-sans font-medium text-ink-500 uppercase tracking-wide block">
        {label}
      </span>
      <div className={`flex items-center justify-between p-1.5 rounded mt-0.5 ${toneClass}`}>
        <span className="truncate mr-2">{value || '—'}</span>
        <span className="flex items-center gap-2 shrink-0">
          {badge && (
            <span className="text-[10px] font-sans font-bold uppercase px-1.5 py-0.5 rounded bg-white border border-line-200">
              {badge}
            </span>
          )}
          {value && (
            <button
              onClick={handleCopy}
              className="text-ink-400 hover:text-navy-900"
              title="Copy hash"
            >
              {copied ? <Check size={14} className="text-status-resolved" /> : <Copy size={14} />}
            </button>
          )}
        </span>
      </div>
    </div>
  );
};

// ════════════════════════════════════════════════════════════════════════════
// Main component
// ════════════════════════════════════════════════════════════════════════════

export const VerificationModal: React.FC<VerificationModalProps> = ({
  evidenceId,
  isOpen,
  onClose,
}) => {
  const { currentUser } = useStore();
  const [stage, setStage] = useState<VerificationStage>('idle');
  const [result, setResult] = useState<VerificationResult | null>(null);
  const [running, setRunning] = useState(false);

  // Reset whenever the modal is reopened or points at a different exhibit, so
  // a previous run's outcome is never shown against the wrong item.
  useEffect(() => {
    if (!isOpen) return;
    setStage('idle');
    setResult(null);
    setRunning(false);
  }, [isOpen, evidenceId]);

  if (!isOpen) return null;

  const handleStartVerify = async () => {
    setRunning(true);
    setResult(null);
    // The server performs the real hash comparison; onStageChange only drives
    // the stepper, it does not decide the outcome.
    const res = await verifyEvidenceIntegrity(evidenceId, setStage, {
      actorId: currentUser?.id,
      actorRole: currentUser?.role,
    });
    setResult(res);
    setRunning(false);
  };

  const isComplete = stage === 'success' || stage === 'failure';
  const isVerified = isComplete && result?.success === true;
  const currentIdx = STAGE_ORDER.indexOf(stage);

  return (
    <div className="fixed inset-0 bg-navy-950/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
      <div className="bg-white border border-line-300 shadow-2xl rounded-md max-w-2xl w-full overflow-hidden">
        {/* ── Header ── */}
        <div className="bg-navy-900 text-white px-6 py-4 flex items-center justify-between border-b border-navy-800">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 bg-navy-800 rounded">
              <ShieldCheck size={20} className="text-saffron-500" />
            </div>
            <div>
              <h3 className="text-base font-bold tracking-tight">
                Cryptographic Evidence Integrity Verification
              </h3>
              <p className="text-xs text-navy-200">Hyperledger Fabric Immutable Ledger Audit</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-navy-300 hover:text-white p-1 rounded transition-colors"
            aria-label="Close verification dialog"
          >
            <X size={20} />
          </button>
        </div>

        {/* ── Body ── */}
        <div className="p-6 space-y-5">
          {/* Item banner */}
          <div className="bg-paper-50 border border-line-200 rounded p-4 flex items-center justify-between">
            <div>
              <span className="text-xs font-mono font-bold text-navy-800 bg-navy-50 px-2 py-0.5 rounded border border-navy-100 mr-2">
                {evidenceId}
              </span>
              <span className="text-sm font-semibold text-navy-900">Evidence Exhibit</span>
            </div>
            {isComplete && (
              <div className="text-right">
                <span className="text-xs font-medium text-ink-500 block">Verified At</span>
                <span className="text-xs font-mono font-semibold text-navy-900">
                  {fmtTime(result?.verificationTime)}
                </span>
              </div>
            )}
          </div>

          {/* Stepper */}
          <div className="grid grid-cols-4 gap-2 pt-2">
            {STEPS.map((step, idx) => {
              const isResultCell = idx === STEPS.length - 1;
              const targetIdx = idx + 1;

              const isActive = isResultCell
                ? false
                : running && currentIdx === targetIdx;
              const isPast = isResultCell
                ? isComplete
                : isComplete || (currentIdx > targetIdx && currentIdx !== -1);
              const failed = isResultCell && stage === 'failure';

              return (
                <div
                  key={step.title}
                  className={`p-2.5 rounded border text-xs transition-colors ${
                    failed
                      ? 'border-status-urgent/30 bg-status-urgentBg text-status-urgent'
                      : isActive
                      ? 'border-navy-700 bg-navy-50 text-navy-900 font-medium ring-1 ring-navy-700'
                      : isPast
                      ? 'border-status-resolved/30 bg-status-resolvedBg text-status-resolved'
                      : 'border-line-200 bg-paper-50 text-ink-400'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-semibold">{step.title}</span>
                    {isActive && <Loader2 size={12} className="animate-spin text-navy-700" />}
                    {!isActive && failed && <AlertOctagon size={12} className="text-status-urgent" />}
                    {!isActive && !failed && isPast && (
                      <CheckCircle2 size={12} className="text-status-resolved" />
                    )}
                  </div>
                  <p className="text-[11px] leading-tight text-ink-500">{step.desc}</p>
                </div>
              );
            })}
          </div>

          {/* Idle */}
          {stage === 'idle' && !running && (
            <div className="border border-line-200 bg-white p-5 rounded text-center space-y-3">
              <p className="text-xs text-ink-600 max-w-lg mx-auto">
                Running the verification retrieves the current digital artifact from secure object
                storage, independently computes its 256-bit hash, and evaluates it against the
                immutable record anchored on the Hyperledger Fabric ledger.
              </p>
              <Button onClick={handleStartVerify} className="mx-auto">
                <ShieldCheck size={16} /> Execute Verification Workflow
              </Button>
            </div>
          )}

          {/* In progress */}
          {running && !isComplete && (
            <div className="border border-navy-200 bg-navy-50/50 p-6 rounded text-center space-y-2">
              <Loader2 size={28} className="animate-spin text-navy-700 mx-auto" />
              <p className="text-sm font-semibold text-navy-900">
                {stage === 'retrieving' &&
                  'Retrieving byte stream from secure evidence storage…'}
                {stage === 'hashing' && 'Calculating SHA-256 checksum over byte payload…'}
                {stage === 'comparing' &&
                  'Querying Hyperledger Fabric peer endorsement & ledger state…'}
              </p>
              <p className="text-xs text-ink-500">Communicating with the peer node over mTLS</p>
            </div>
          )}

          {/* Result */}
          {isComplete && result && (
            <div
              className={`p-5 rounded border ${
                isVerified
                  ? 'bg-status-resolvedBg/40 border-status-resolved/30'
                  : 'bg-status-urgentBg/40 border-status-urgent/30'
              } space-y-4`}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 text-white ${
                    isVerified ? 'bg-status-resolved' : 'bg-status-urgent'
                  }`}
                >
                  {isVerified ? <ShieldCheck size={22} /> : <AlertOctagon size={22} />}
                </div>
                <div>
                  <h4 className="text-base font-bold text-navy-900">
                    {isVerified
                      ? 'Cryptographic Integrity Attested'
                      : 'INTEGRITY VERIFICATION FAILED'}
                  </h4>
                  <p className="text-xs text-ink-600">{result.message}</p>
                </div>
              </div>

              {/* Hash comparison */}
              <div className="bg-white rounded border border-line-200 p-3 space-y-2 text-xs font-mono">
                <HashRow
                  label="Fabric Ledger Anchor Hash (Registered)"
                  value={result.ledgerHash}
                  tone="neutral"
                />
                <HashRow
                  label="Calculated Object Storage Hash (Current)"
                  value={result.currentHash}
                  tone={isVerified ? 'match' : 'mismatch'}
                  badge={isVerified ? 'Exact Match' : 'Mismatch'}
                />
                {result.blockchainTxId && (
                  <div>
                    <span className="text-[11px] font-sans font-medium text-ink-500 uppercase tracking-wide block">
                      Ledger Transaction
                    </span>
                    <div className="bg-paper-50 text-navy-900 p-1.5 rounded mt-0.5 truncate">
                      {result.blockchainTxId}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* ── Footer ── */}
        <div className="bg-paper-50 px-6 py-3 border-t border-line-200 flex justify-end gap-2">
          <Button variant="secondary" size="sm" onClick={onClose}>
            Close
          </Button>
          {isComplete && (
            <Button
              size="sm"
              onClick={() => {
                setStage('idle');
                setResult(null);
              }}
            >
              Verify Again
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default VerificationModal;
