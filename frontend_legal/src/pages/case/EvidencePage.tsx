import React, { useMemo, useState } from 'react';
import { Box, FileText, HardDrive, Loader2, MapPin, Mic, ShieldAlert, ShieldCheck, ShieldQuestion, Video } from 'lucide-react';
import { useCaseContext } from '../../components/layout/CaseLayout';
import { Badge, Card, Drawer, EmptyState } from '../../components/ui/Primitives';
import { CustodyTrail } from '../../components/case/CustodyTrail';
import { getEvidenceForCase, getFilesForCase } from '../../data/mockData';
import { EvidenceItem, IntegrityStatus } from '../../types';
import { formatDate, formatDateTime, shortHash } from '../../utils/format';
import { integrityTone } from '../../utils/caseMeta';

type Filter = 'ALL' | 'PHYSICAL' | 'DIGITAL';

const DIGITAL_ICON = { IMAGE: FileText, VIDEO: Video, AUDIO: Mic, DOCUMENT: FileText, DISK_IMAGE: HardDrive, CALL_DETAIL_RECORD: FileText };

const IntegrityBadge = ({ status }: { status: IntegrityStatus }) => {
  const iconMap = { VERIFIED: ShieldCheck, COMPROMISED: ShieldAlert, PENDING: ShieldQuestion };
  const Icon = iconMap[status];
  const labelMap = { VERIFIED: 'Verified', COMPROMISED: 'Tamper Detected', PENDING: 'Pending Verification' };
  return (
    <Badge tone={integrityTone(status)}>
      <Icon size={12} /> {labelMap[status]}
    </Badge>
  );
};

export const EvidencePage = () => {
  const { courtCase } = useCaseContext();
  const evidence = getEvidenceForCase(courtCase.caseId);
  const files = getFilesForCase(courtCase.caseId);
  const [filter, setFilter] = useState<Filter>('ALL');
  const [selected, setSelected] = useState<EvidenceItem | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [verifyResult, setVerifyResult] = useState<string | null>(null);

  const visible = useMemo(
    () => (filter === 'ALL' ? evidence : evidence.filter((e) => e.kind === filter)),
    [evidence, filter]
  );

  const openEvidence = (e: EvidenceItem) => {
    setSelected(e);
    setVerifyResult(null);
  };

  const runVerification = (e: Extract<EvidenceItem, { kind: 'DIGITAL' }>) => {
    setVerifying(true);
    setVerifyResult(null);
    setTimeout(() => {
      setVerifying(false);
      setVerifyResult(
        e.integrityStatus === 'COMPROMISED'
          ? 'MISMATCH — recomputed hash does not match the ledger record. Escalate immediately.'
          : `Match confirmed — recomputed SHA-256 equals the hash anchored at ${e.ledgerBlockRef} on Hyperledger Fabric.`
      );
    }, 1400);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-navy-900">Evidence</h1>
        <p className="text-sm text-ink-500 mt-1">Physical exhibits held in police custody and digital evidence anchored on the blockchain ledger.</p>
      </div>

      <div className="flex items-center gap-1 border-b border-line-200">
        {(['ALL', 'PHYSICAL', 'DIGITAL'] as Filter[]).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
              filter === f ? 'border-saffron-500 text-navy-900' : 'border-transparent text-ink-500 hover:text-navy-700'
            }`}
          >
            {f === 'ALL' ? `All (${evidence.length})` : f === 'PHYSICAL' ? `Physical (${evidence.filter((e) => e.kind === 'PHYSICAL').length})` : `Digital (${evidence.filter((e) => e.kind === 'DIGITAL').length})`}
          </button>
        ))}
      </div>

      {visible.length === 0 ? (
        <Card><EmptyState icon={<Box size={40} />} title="No evidence in this category" /></Card>
      ) : (
        <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {visible.map((e) => {
            if (e.kind === 'PHYSICAL') {
              return (
                <button key={e.evidenceId} onClick={() => openEvidence(e)} className="text-left bg-white border border-line-200 rounded-sm p-4 hover:border-navy-500 transition-colors flex flex-col gap-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="w-9 h-9 rounded-sm bg-navy-50 text-navy-700 flex items-center justify-center shrink-0">
                      <Box size={17} />
                    </div>
                    <Badge tone="neutral">Physical</Badge>
                  </div>
                  <div>
                    <p className="text-[11px] font-medium text-saffron-700 uppercase tracking-wide">{e.category}</p>
                    <h3 className="text-sm font-semibold text-navy-900 mt-0.5 leading-snug">{e.name}</h3>
                  </div>
                  <p className="text-xs text-ink-500 line-clamp-2">{e.description}</p>
                  <div className="flex items-start gap-1.5 text-xs text-ink-500 pt-2 border-t border-line-200">
                    <MapPin size={13} className="shrink-0 mt-0.5" />
                    <span className="line-clamp-2">{e.storageLocation}</span>
                  </div>
                </button>
              );
            }
            const Icon = DIGITAL_ICON[e.fileType] ?? FileText;
            return (
              <button key={e.evidenceId} onClick={() => openEvidence(e)} className="text-left bg-white border border-line-200 rounded-sm p-4 hover:border-navy-500 transition-colors flex flex-col gap-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="w-9 h-9 rounded-sm bg-navy-50 text-navy-700 flex items-center justify-center shrink-0">
                    <Icon size={17} />
                  </div>
                  <Badge tone={e.classification === 'PRIMARY' ? 'saffron' : 'neutral'}>{e.classification}</Badge>
                </div>
                <div>
                  <p className="text-[11px] font-medium text-ink-500 uppercase tracking-wide">{e.fileType.replace('_', ' ')}</p>
                  <h3 className="text-sm font-semibold text-navy-900 mt-0.5 leading-snug break-all">{e.fileName}</h3>
                </div>
                <p className="text-xs text-ink-500 font-mono">{shortHash(e.sha256Hash)}</p>
                <div className="pt-2 border-t border-line-200">
                  <IntegrityBadge status={e.integrityStatus} />
                </div>
              </button>
            );
          })}
        </div>
      )}

      <Drawer
        open={!!selected}
        onClose={() => setSelected(null)}
        title={selected?.kind === 'PHYSICAL' ? selected.name : selected?.fileName}
        subtitle={selected ? `${selected.evidenceId} · ${courtCase.caseId}` : ''}
      >
        {selected?.kind === 'PHYSICAL' && (
          <div className="space-y-6">
            <div className="flex items-center gap-2">
              <Badge tone="navy">{selected.category}</Badge>
              <Badge tone="neutral">Seal No. {selected.sealNumber}</Badge>
            </div>
            <p className="text-sm text-ink-900 leading-relaxed">{selected.description}</p>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-xs text-ink-500">Collected By</p>
                <p className="text-ink-900 font-medium mt-0.5">{selected.collectedBy}</p>
                <p className="text-xs text-ink-500">{selected.collectedByDesignation}</p>
              </div>
              <div>
                <p className="text-xs text-ink-500">Collected On</p>
                <p className="text-ink-900 font-medium mt-0.5">{formatDate(selected.collectedAt)}</p>
              </div>
            </div>
            <div className="bg-paper-50 border border-line-200 rounded-sm p-3.5">
              <p className="text-xs text-ink-500 flex items-center gap-1.5"><MapPin size={13} /> Storage Location</p>
              <p className="text-sm font-medium text-navy-900 mt-1">{selected.storageLocation}</p>
              <p className="text-xs text-ink-500 mt-1">Current Custodian: {selected.currentCustodian}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-ink-500 uppercase tracking-wide mb-3">Chain of Custody</p>
              <CustodyTrail events={selected.custodyTrail} />
            </div>
          </div>
        )}

        {selected?.kind === 'DIGITAL' && (
          <div className="space-y-6">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge tone={selected.classification === 'PRIMARY' ? 'saffron' : 'neutral'}>{selected.classification}</Badge>
              <IntegrityBadge status={selected.integrityStatus} />
              <Badge tone="neutral">{selected.fileSizeMb} MB</Badge>
            </div>
            <p className="text-sm text-ink-900 leading-relaxed">{selected.description}</p>

            <div className="bg-navy-900 text-navy-100 rounded-sm p-4 space-y-2.5 font-mono text-xs">
              <div>
                <p className="text-navy-400">SHA-256 Hash</p>
                <p className="break-all mt-0.5">{selected.sha256Hash}</p>
              </div>
              <div className="grid grid-cols-2 gap-3 pt-2 border-t border-navy-700">
                <div>
                  <p className="text-navy-400">Ledger Tx ID</p>
                  <p className="break-all mt-0.5">{shortHash(selected.ledgerTxId, 14)}</p>
                </div>
                <div>
                  <p className="text-navy-400">Block Reference</p>
                  <p className="mt-0.5">{selected.ledgerBlockRef}</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-xs text-ink-500">Collected By</p>
                <p className="text-ink-900 font-medium mt-0.5">{selected.collectedBy}</p>
                <p className="text-xs text-ink-500">{selected.collectedByDesignation}</p>
              </div>
              <div>
                <p className="text-xs text-ink-500">Hashed On (Primary)</p>
                <p className="text-ink-900 font-medium mt-0.5">{formatDate(selected.collectedAt)}</p>
              </div>
            </div>

            {selected.section63CertificateId && (
              <div className="bg-ashoka-50 border border-ashoka-100 rounded-sm p-3.5 text-sm text-ashoka-800">
                Linked to <span className="font-medium">{files.find((f) => f.fileId === selected.section63CertificateId)?.title ?? 'Section 63 BSA Certificate'}</span> in Case Files.
              </div>
            )}

            <div>
              <button
                disabled={verifying}
                onClick={() => runVerification(selected)}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-sm bg-navy-900 text-white text-sm font-medium hover:bg-navy-800 transition-colors disabled:opacity-60"
              >
                {verifying ? <Loader2 size={15} className="animate-spin" /> : <ShieldCheck size={15} />}
                {verifying ? 'Recomputing hash…' : 'Verify Integrity Against Ledger'}
              </button>
              {verifyResult && (
                <p className={`text-xs mt-2.5 leading-relaxed ${selected.integrityStatus === 'COMPROMISED' ? 'text-status-urgent' : 'text-ashoka-700'}`}>
                  {verifyResult}
                </p>
              )}
              {selected.lastVerifiedAt && !verifyResult && (
                <p className="text-xs text-ink-500 mt-2.5">Last verified {formatDateTime(selected.lastVerifiedAt)}</p>
              )}
            </div>

            <div>
              <p className="text-xs font-medium text-ink-500 uppercase tracking-wide mb-3">Chain of Custody</p>
              <CustodyTrail events={selected.custodyTrail} />
            </div>
          </div>
        )}
      </Drawer>
    </div>
  );
};
