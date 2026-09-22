import React, { useState, useMemo, useEffect } from 'react';
import { useStore } from '../store';
import { Card, Button, Input, Badge } from './Common';
import { LegalDocument, UserRole, Evidence, IntegrityStatus, CaseStatus } from '../types';
import {
  Gavel,
  Scale,
  FileText,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ExternalLink,
  Download,
  AlertCircle,
  X,
  ChevronRight,
  Printer,
  Package,
  ShieldCheck,
  CheckSquare,
  File as FileIcon
} from 'lucide-react';
export const ChargeSheetView = () => {
  const { documents, cases, evidence, currentUser, addDocument, updateCaseStatus } = useStore();

  // Active view tab: 'checklist' (Preparation) | 'archive' (Filed Charge Sheets)
  const [activeTab, setActiveTab] = useState<'checklist' | 'archive'>('checklist');

  // Modal States
  const [chargeSheetModalOpen, setChargeSheetModalOpen] = useState(false);
  const [missingDocsModalOpen, setMissingDocsModalOpen] = useState(false);
  const [magistratePacketOpen, setMagistratePacketOpen] = useState(false);

  // Form State for New Charge Sheet Filing
  const [chargeData, setChargeData] = useState({ accused: '', charges: '', details: '' });
  const [chargeEvidenceIds, setChargeEvidenceIds] = useState<string[]>([]);

  const chargeSheets = documents.filter(d => d.type === 'CHARGE_SHEET');

  // Cases eligible for charge-sheet preparation. Filing is the act of sending
  // a case to court, so anything not already there is a candidate.
  const activeCases = useMemo(
    () => cases.filter(c => c.status !== CaseStatus.SUBMITTED_TO_COURT && c.status !== CaseStatus.CLOSED),
    [cases]
  );

  // Selected case — defaults to the first real case rather than a fixed FIR.
  const [selectedCaseId, setSelectedCaseId] = useState<string>('');
  useEffect(() => {
    if (!selectedCaseId && activeCases.length) setSelectedCaseId(activeCases[0].caseId);
  }, [activeCases, selectedCaseId]);

  // Clears any evidence picked for a previous case — otherwise switching the
  // target FIR after selecting exhibits could silently attach evidence from
  // the wrong case to the charge sheet.
  useEffect(() => {
    setChargeEvidenceIds([]);
  }, [selectedCaseId]);

  const activeCase = useMemo(
    () => cases.find(c => c.caseId === selectedCaseId),
    [cases, selectedCaseId]
  );

  const caseEvidence = useMemo(
    () => evidence.filter(e => e.caseId === selectedCaseId),
    [evidence, selectedCaseId]
  );

  const verifiedEvidenceForCase = useMemo(
    () => caseEvidence.filter(e => e.integrityStatus === IntegrityStatus.VERIFIED),
    [caseEvidence]
  );

  // Evidentiary readiness is derived from the case's own exhibits, so the
  // score reflects the record rather than a fixed figure.
  const readiness = useMemo(() => {
    const total = caseEvidence.length;
    const verified = verifiedEvidenceForCase.length;
    return {
      total,
      verified,
      outstanding: total - verified,
      percent: total > 0 ? Math.round((verified / total) * 100) : 0,
      pendingItems: caseEvidence.filter(e => e.integrityStatus !== IntegrityStatus.VERIFIED),
    };
  }, [caseEvidence, verifiedEvidenceForCase]);

  const caseDocuments = useMemo(
    () => documents.filter(d => d.caseId === selectedCaseId),
    [documents, selectedCaseId]
  );

  // Statutory Section 173 CrPC checklist, derived from the case's own
  // records rather than a fixed "all satisfied" list with fabricated ledger
  // anchor codes — those codes didn't correspond to any real blockchain
  // event, and the "satisfied" status never reflected the actual case.
  const checklist = useMemo(() => {
    const firDoc = caseDocuments.find(d => d.type === 'FIR');
    const compromisedCount = caseEvidence.filter(e => e.integrityStatus === IntegrityStatus.COMPROMISED).length;
    const secondaryUncertified = caseEvidence.filter(
      e => e.classification === 'SECONDARY' && !e.section63Certificate
    );
    const certifiedEvidence = caseEvidence.find(e => e.section63Certificate);
    const chargeSheetDoc = caseDocuments.find(d => d.type === 'CHARGE_SHEET');

    return [
      {
        id: 'item-1',
        title: '1. First Information Report (FIR) & Certified Extracts',
        desc: firDoc
          ? `FIR on file: "${firDoc.title}", filed ${new Date(firDoc.timestamp).toLocaleDateString('en-IN')}.`
          : 'No FIR document has been recorded for this case yet.',
        status: firDoc ? 'satisfied' as const : 'warning' as const,
        anchor: null,
      },
      {
        id: 'item-2',
        title: '2. Seizure Memo & Comprehensive Evidence Registry',
        desc: caseEvidence.length > 0
          ? `${caseEvidence.length} item${caseEvidence.length === 1 ? '' : 's'} sealed and logged into the evidence vault.`
          : 'No evidence items have been registered for this case yet.',
        status: caseEvidence.length > 0 ? 'satisfied' as const : 'warning' as const,
        anchor: null,
      },
      {
        id: 'item-3',
        title: '3. Cryptographic Chain of Custody Attestation',
        desc: compromisedCount > 0
          ? `${compromisedCount} exhibit${compromisedCount === 1 ? '' : 's'} flagged COMPROMISED — custody chain is not intact.`
          : caseEvidence.length > 0
            ? 'No integrity exceptions recorded across the custodial timeline.'
            : 'No exhibits to attest — register evidence first.',
        status: compromisedCount === 0 && caseEvidence.length > 0 ? 'satisfied' as const : 'warning' as const,
        anchor: null,
      },
      {
        id: 'item-4',
        title: '4. Witness Statements under Section 161 CrPC',
        desc: 'Witness statement tracking is not yet available in this portal — verify against the physical case file before filing.',
        status: 'warning' as const,
        anchor: null,
      },
      {
        id: 'item-5',
        title: '5. Forensic Science Laboratory (FSL) Reports',
        desc: readiness.outstanding === 0
          ? `All ${readiness.total} laboratory reports received and verified on the ledger.`
          : `${readiness.verified} of ${readiness.total} reports verified. ${readiness.outstanding} pending${
              readiness.pendingItems.length
                ? ` (${readiness.pendingItems.slice(0, 3).map(e => e.evidenceId).join(', ')})`
                : ''
            }.`,
        status: readiness.outstanding === 0 && readiness.total > 0 ? 'satisfied' as const : 'warning' as const,
        anchor: null,
      },
      {
        id: 'item-6',
        title: '6. Section 65B IEA / 63 BSA Electronic Evidence Certificate',
        desc: secondaryUncertified.length === 0
          ? 'All secondary evidence items carry a Section 63 certificate.'
          : `${secondaryUncertified.length} secondary item${secondaryUncertified.length === 1 ? '' : 's'} missing a Section 63 certificate (${secondaryUncertified.slice(0, 3).map(e => e.evidenceId).join(', ')}).`,
        status: secondaryUncertified.length === 0 ? 'satisfied' as const : 'warning' as const,
        anchor: certifiedEvidence?.blockchainTxId ? `${certifiedEvidence.blockchainTxId} · Ledger Hash Anchored` : null,
      },
      {
        id: 'item-7',
        title: '7. Final Investigative Report & Memo of Evidence',
        desc: chargeSheetDoc
          ? `Charge sheet already filed: "${chargeSheetDoc.title}".`
          : 'Charge sheet not yet filed for this case.',
        status: chargeSheetDoc ? 'satisfied' as const : 'warning' as const,
        anchor: null,
      },
    ];
  }, [caseDocuments, caseEvidence, readiness]);

  const caseLabel = activeCase
    ? `FIR ${(activeCase as any).firNumber || activeCase.caseId}`
    : selectedCaseId || '—';

  const handleToggleChargeEvidence = (id: string) => {
    setChargeEvidenceIds(prev =>
      prev.includes(id) ? prev.filter(lid => lid !== id) : [...prev, id]
    );
  };

  const handleSubmitChargeSheet = () => {
    if (!chargeData.accused || !chargeData.charges || !selectedCaseId) return;

    const newDoc: LegalDocument = {
      docId: `CS-${Date.now().toString().slice(-6)}`,
      caseId: selectedCaseId,
      title: `Charge Sheet (Sec 173 CrPC): State vs. ${chargeData.accused}`,
      type: 'CHARGE_SHEET',
      description: `Accused: ${chargeData.accused}\nSections: ${chargeData.charges}\nSummary: ${chargeData.details}\nSupporting Ledger Evidence Items: ${chargeEvidenceIds.length}`,
      uploadedBy: currentUser!.name || currentUser!.id,
      timestamp: new Date().toISOString(),
      linkedEvidenceIds: chargeEvidenceIds
    };

    addDocument(newDoc);

    const currentCase = cases.find(c => c.caseId === selectedCaseId);
    if (currentCase && currentCase.status !== CaseStatus.SUBMITTED_TO_COURT) {
      updateCaseStatus(selectedCaseId, CaseStatus.SUBMITTED_TO_COURT);
    }

    setChargeSheetModalOpen(false);
    setActiveTab('archive');
  };

  return (
    <div className="space-y-6">
      {/* ── Top Header & Tab Navigation ─────────────────────────────────────── */}
      <div className="bg-white border border-line-200 rounded-md p-5 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-navy-900 text-white rounded">
              <Scale size={20} className="text-saffron-400" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-navy-900">
                Charge Sheet Management (Section 173 CrPC / BNSS)
              </h1>
              <p className="text-xs text-ink-500 mt-0.5">
                Statutory evidentiary readiness checklist, missing document audits, and magistrate filing
              </p>
            </div>
          </div>
        </div>

        {/* View Switcher Tabs */}
        <div className="flex items-center gap-2">
          <div className="bg-paper-100 p-1 rounded border border-line-200 flex gap-1 text-xs">
            <button
              onClick={() => setActiveTab('checklist')}
              className={`px-3 py-1.5 rounded font-semibold transition-colors ${
                activeTab === 'checklist'
                  ? 'bg-navy-900 text-white shadow-sm'
                  : 'text-ink-600 hover:text-navy-900 hover:bg-paper-200'
              }`}
            >
              Readiness Checklist
            </button>
            <button
              onClick={() => setActiveTab('archive')}
              className={`px-3 py-1.5 rounded font-semibold transition-colors ${
                activeTab === 'archive'
                  ? 'bg-navy-900 text-white shadow-sm'
                  : 'text-ink-600 hover:text-navy-900 hover:bg-paper-200'
              }`}
            >
              Filed Charge Sheets ({chargeSheets.length})
            </button>
          </div>

          {currentUser?.role === UserRole.POLICE && (
            <Button size="sm" onClick={() => setChargeSheetModalOpen(true)}>
              <Gavel size={14} /> File Charge Sheet
            </Button>
          )}
        </div>
      </div>

      {/* ── TAB 1: SECTION 173 CrPC READINESS CHECKLIST ─────────────────────── */}
      {activeTab === 'checklist' && (
        <div className="space-y-6">
          {/* Active Case Selector Strip & Readiness Meter */}
          <div className="bg-white border border-line-200 rounded-md p-5 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <label className="text-xs font-bold uppercase tracking-wider text-ink-500 shrink-0">
                  Target Case:
                </label>
                <select
                  value={selectedCaseId}
                  onChange={e => setSelectedCaseId(e.target.value)}
                  className="px-3 py-1.5 text-xs font-semibold bg-paper-50 border border-line-300 rounded text-navy-900 focus:outline-none focus:ring-1 focus:ring-navy-500"
                >
                  {activeCases.length === 0 && <option value="">No cases available</option>}
                  {activeCases.map(c => (
                    <option key={c.caseId} value={c.caseId}>
                      {(c as any).firNumber ? `FIR ${(c as any).firNumber}` : c.caseId} — {c.title}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setMissingDocsModalOpen(true)}
                  className="px-3 py-1.5 text-xs font-semibold rounded bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100 transition-colors inline-flex items-center gap-1.5"
                >
                  <AlertTriangle size={13} className="text-amber-600" />
                  View Missing Documents ({readiness.outstanding})
                </button>
                <button
                  onClick={() => setMagistratePacketOpen(true)}
                  className="px-3 py-1.5 text-xs font-semibold rounded bg-white text-navy-900 border border-line-300 hover:bg-paper-100 transition-colors inline-flex items-center gap-1.5 shadow-sm"
                >
                  <Printer size={13} className="text-ink-500" />
                  Export Magistrate Packet
                </button>
              </div>
            </div>

            {/* Evidentiary Readiness Scorecard */}
            <div className="bg-paper-50 border border-line-200 rounded p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-navy-900">Evidentiary Readiness Score:</span>
                  <span className="text-xs font-mono font-bold text-status-resolved bg-status-resolvedBg px-2 py-0.5 rounded border border-status-resolved/20">
                    {readiness.verified} of {readiness.total} ({readiness.percent}%) Prerequisites Satisfied
                  </span>
                </div>
                <p className="text-xs text-ink-500">
                  Case is currently under charge sheet compilation. 2 forensic examination reports are pending from FSL Bengaluru.
                </p>
              </div>

              {/* Progress Bar */}
              <div className="w-full md:w-64 space-y-1">
                <div className="flex justify-between text-[11px] font-semibold text-ink-600">
                  <span>Compilation Progress</span>
                  <span>{readiness.percent}%</span>
                </div>
                <div className="w-full h-2.5 bg-paper-200 rounded-full overflow-hidden">
                  <div className="h-full bg-navy-900 rounded-full" style={{ width: `${readiness.percent}%` }} />
                </div>
              </div>
            </div>
          </div>

          {/* Statutory Section 173 CrPC / BNSS Checklist */}
          <div className="bg-white border border-line-200 rounded-md shadow-sm overflow-hidden">
            <div className="px-5 py-3.5 border-b border-line-200 bg-paper-50 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold uppercase tracking-wider text-navy-900">
                  Statutory Evidentiary Checklist (Sec 173 CrPC)
                </h3>
                <p className="text-xs text-ink-500">
                  Mandatory documentation and chain-of-custody proofs required before submission to Judicial Magistrate
                </p>
              </div>
              <span className="text-xs font-mono font-semibold text-ink-500">
                Case: {caseLabel}
              </span>
            </div>

            <div className="divide-y divide-line-200">
              {checklist.map(item => (
                <div key={item.id} className="p-4 flex items-start justify-between gap-4 hover:bg-paper-50/50 transition-colors">
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 shrink-0">
                      {item.status === 'satisfied' ? (
                        <CheckCircle2 size={18} className="text-status-resolved" />
                      ) : (
                        <AlertTriangle size={18} className="text-amber-500" />
                      )}
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-navy-900">{item.title}</h4>
                      <p className="text-xs text-ink-600 mt-0.5">{item.desc}</p>
                      {item.anchor && (
                        <div className="text-[11px] font-mono text-ink-400 mt-1 flex items-center gap-2">
                          <span>Ledger Anchor:</span>
                          <code className="text-navy-800 bg-paper-100 px-1.5 py-0.5 rounded border border-line-200">
                            {item.anchor}
                          </code>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="shrink-0">
                    {item.status === 'satisfied' ? (
                      <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-status-resolvedBg text-status-resolved border border-status-resolved/20">
                        Satisfied
                      </span>
                    ) : (
                      <button
                        onClick={() => setMissingDocsModalOpen(true)}
                        className="text-[11px] font-semibold px-2 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-200 hover:bg-amber-200 transition-colors"
                      >
                        Action Required
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Bottom Filing Action Strip */}
            <div className="p-4 bg-paper-50 border-t border-line-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <span className="text-xs text-ink-600">
                Once the remaining FSL reports are received, the charge sheet packet can be finalized and sealed on the ledger.
              </span>
              <div className="flex items-center gap-2">
                <Button variant="secondary" size="sm" onClick={() => setMagistratePacketOpen(true)}>
                  <Download size={13} /> Download Dossier
                </Button>
                <Button size="sm" onClick={() => setChargeSheetModalOpen(true)}>
                  <Gavel size={13} /> Proceed to File Charge Sheet
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── TAB 2: FILED CHARGE SHEETS ARCHIVE ───────────────────────────────── */}
      {activeTab === 'archive' && (
        <div className="space-y-4">
          {chargeSheets.length === 0 ? (
            <div className="p-12 text-center bg-white rounded-md border border-line-200 shadow-sm">
              <Scale className="w-12 h-12 text-ink-300 mx-auto mb-2" />
              <h3 className="text-base font-bold text-navy-900">No Filed Charge Sheets Found</h3>
              <p className="text-xs text-ink-500 mt-1 max-w-sm mx-auto">
                No statutory Section 173 CrPC charge sheets have been recorded in the system yet.
              </p>
              <Button size="sm" className="mt-4" onClick={() => setChargeSheetModalOpen(true)}>
                <Gavel size={14} /> File First Charge Sheet
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {chargeSheets.map(doc => (
                <div key={doc.docId} className="bg-white border border-line-200 rounded-md p-5 shadow-sm hover:shadow-card transition-shadow">
                  <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-mono font-bold text-navy-800 bg-navy-50 px-2 py-0.5 rounded border border-navy-100">
                          {doc.docId}
                        </span>
                        <h3 className="font-bold text-base text-navy-900">{doc.title}</h3>
                        <Badge color="green">FILED TO COURT</Badge>
                        <Badge color="blue">{doc.caseId}</Badge>
                      </div>

                      <p className="text-xs text-ink-500 font-mono">
                        Submitted by: <strong className="text-navy-900">{doc.uploadedBy}</strong> · Timestamp: {new Date(doc.timestamp).toLocaleString('en-IN')}
                      </p>

                      <div className="bg-paper-50 p-3 rounded border border-line-200 text-xs text-navy-950 font-sans whitespace-pre-line leading-relaxed">
                        {doc.description}
                      </div>

                      {doc.linkedEvidenceIds && doc.linkedEvidenceIds.length > 0 && (
                        <div>
                          <p className="text-[11px] font-bold uppercase tracking-wider text-ink-500 mb-1.5">
                            Attached Verified Evidence Items ({doc.linkedEvidenceIds.length})
                          </p>
                          <div className="flex flex-wrap gap-1.5">
                            {doc.linkedEvidenceIds.map(eid => {
                              const ev = evidence.find(e => e.evidenceId === eid);
                              return (
                                <span
                                  key={eid}
                                  className="inline-flex items-center gap-1 px-2 py-0.5 bg-white text-navy-900 text-xs rounded border border-line-200 font-mono shadow-2xs"
                                >
                                  <ShieldCheck size={11} className="text-status-resolved" />
                                  {ev ? `${eid}: ${ev.fileName}` : eid}
                                </span>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="shrink-0 flex md:flex-col items-end gap-2">
                      <button
                        onClick={() => {
                          // Reports the REAL, currently-stored integrity status
                          // of every exhibit linked to this charge sheet,
                          // rather than an unconditional "verified" claim.
                          const linked = (doc.linkedEvidenceIds || [])
                            .map(eid => evidence.find(e => e.evidenceId === eid))
                            .filter((e): e is Evidence => !!e);
                          if (linked.length === 0) {
                            alert(`Charge sheet ${doc.docId} has no linked evidence to attest.`);
                            return;
                          }
                          const compromised = linked.filter(e => e.integrityStatus === IntegrityStatus.COMPROMISED);
                          const verified = linked.filter(e => e.integrityStatus === IntegrityStatus.VERIFIED);
                          alert(
                            compromised.length > 0
                              ? `INTEGRITY WARNING: ${compromised.length} of ${linked.length} linked exhibit(s) are flagged COMPROMISED (${compromised.map(e => e.evidenceId).join(', ')}).`
                              : `${verified.length} of ${linked.length} linked exhibit(s) are ledger-verified. ${linked.length - verified.length > 0 ? `${linked.length - verified.length} still pending verification.` : 'All exhibits verified.'}`
                          );
                        }}
                        className="px-3 py-1.5 text-xs font-semibold rounded bg-paper-100 hover:bg-paper-200 text-navy-900 border border-line-200 transition-colors"
                      >
                        Check Linked Evidence Integrity
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── MODAL: MISSING DOCUMENTATION DETAILS ─────────────────────────────── */}
      {missingDocsModalOpen && (
        <div className="fixed inset-0 bg-navy-950/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white border border-line-300 shadow-2xl rounded-md max-w-xl w-full overflow-hidden">
            <div className="bg-amber-500 text-white px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle size={20} />
                <div>
                  <h3 className="text-base font-bold">Pending Statutory Documentation</h3>
                  <p className="text-xs text-amber-100">Prerequisites required before filing Section 173 CrPC report</p>
                </div>
              </div>
              <button onClick={() => setMissingDocsModalOpen(false)} className="text-white hover:opacity-80">
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <p className="text-xs text-ink-600">
                The following {readiness.outstanding} item{readiness.outstanding === 1 ? ' is' : 's are'} currently outstanding for <strong>{caseLabel}</strong>. The public prosecutor requires all laboratory reports to be attached prior to court registry.
              </p>

              <div className="space-y-3">
                {readiness.pendingItems.length === 0 && (
                  <div className="p-4 rounded border border-status-resolved/30 bg-status-resolvedBg/40 text-center">
                    <p className="text-xs font-medium text-navy-900">
                      All exhibits for this case are verified. No outstanding prerequisites.
                    </p>
                  </div>
                )}
                {readiness.pendingItems.map(item => (
                  <div key={item.evidenceId} className="p-3.5 rounded border border-amber-200 bg-amber-50/50 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-mono font-bold text-amber-900 bg-amber-100 px-2 py-0.5 rounded">
                        {item.evidenceId}{item.name ? ` (${item.name})` : ''}
                      </span>
                      <span className="text-[11px] font-semibold text-amber-800">{item.integrityStatus}</span>
                    </div>
                    <p className="text-xs font-medium text-navy-900">{item.fileName}</p>
                    <p className="text-xs text-ink-500">
                      {item.notes || 'Awaiting integrity verification before it can be attached to the charge sheet.'}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-paper-50 px-6 py-3 border-t border-line-200 flex justify-end gap-2">
              <Button variant="secondary" size="sm" onClick={() => setMissingDocsModalOpen(false)}>
                Close
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: MAGISTRATE PACKET EXPORT ─────────────────────────────────── */}
      {magistratePacketOpen && (
        <div className="fixed inset-0 bg-navy-950/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white border border-line-300 shadow-2xl rounded-md max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden">
            <div className="bg-navy-900 text-white px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Printer size={18} className="text-saffron-400" />
                <div>
                  <h3 className="text-base font-bold">Magistrate Evidentiary Dossier</h3>
                  <p className="text-xs text-navy-200">Court Submission Compilation under Sec 173 CrPC / BNSS</p>
                </div>
              </div>
              <button onClick={() => setMagistratePacketOpen(false)} className="text-navy-300 hover:text-white">
                <X size={20} />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4 text-xs font-sans">
              <div className="border border-line-300 p-4 rounded bg-paper-50 space-y-2">
                <div className="text-center pb-2 border-b border-line-200">
                  <h4 className="font-serif font-bold text-sm text-navy-900 uppercase">
                    In the Court of Judicial Magistrate · First Class
                  </h4>
                  <p className="text-[11px] text-ink-500">Government of Tamil Nadu · Police Department</p>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs py-1">
                  <div><strong>FIR Number:</strong> {caseLabel}</div>
                  <div><strong>Police Station:</strong> {activeCase?.policeStation || 'Not recorded'}</div>
                  <div><strong>Investigating Officer:</strong> {activeCase?.currentCustodian || currentUser?.name || 'Unassigned'}</div>
                  <div><strong>Date of Registration:</strong> {activeCase?.createdAt ? new Date(activeCase.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Not recorded'}</div>
                </div>
              </div>

              <div>
                <h5 className="font-bold text-navy-900 uppercase tracking-wider mb-2">
                  Attached Ledger-Anchored Exhibits ({verifiedEvidenceForCase.length}):
                </h5>
                <div className="space-y-1.5 font-mono text-[11px]">
                  {verifiedEvidenceForCase.length === 0 && (
                    <p className="text-ink-400 italic">No verified exhibits available for this case.</p>
                  )}
                  {verifiedEvidenceForCase.map(ev => (
                    <div key={ev.evidenceId} className="p-2 bg-white rounded border border-line-200 flex justify-between gap-2">
                      <span className="truncate">{ev.name || ev.fileName} ({ev.evidenceId})</span>
                      <span className="text-status-resolved font-bold shrink-0">
                        SHA-256 Verified{ev.blockchainTxId ? ` · ${ev.blockchainTxId}` : ''}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="bg-paper-50 px-6 py-3 border-t border-line-200 flex justify-end gap-2">
              <Button variant="secondary" size="sm" onClick={() => setMagistratePacketOpen(false)}>
                Close
              </Button>
              <Button size="sm" onClick={() => window.print()}>
                <Printer size={14} /> Print Formal Docket
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: FILE NEW CHARGE SHEET ────────────────────────────────────── */}
      {chargeSheetModalOpen && (
        <div className="fixed inset-0 bg-navy-950/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
          <Card className="w-full max-w-3xl max-h-[90vh] overflow-y-auto shadow-2xl border-2 border-line-300" title="File New Charge Sheet">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-ink-600 mb-1">
                    Select Target FIR
                  </label>
                  <select
                    value={selectedCaseId}
                    onChange={e => setSelectedCaseId(e.target.value)}
                    className="w-full px-3 py-2 border border-line-300 rounded bg-white text-xs font-semibold text-navy-900 focus:outline-none focus:border-navy-500"
                  >
                    {activeCases.length === 0 && <option value="">No cases available</option>}
                    {activeCases.map(c => (
                      <option key={c.caseId} value={c.caseId}>
                        {(c as any).firNumber ? `FIR ${(c as any).firNumber}` : c.caseId}: {c.title}
                      </option>
                    ))}
                  </select>
                </div>

                <Input
                  label="Accused Name(s)"
                  value={chargeData.accused}
                  onChange={e => setChargeData({ ...chargeData, accused: e.target.value })}
                  placeholder="Full name of suspect(s)"
                />

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-ink-600 mb-1">
                    Statutory Sections (IPC / BNS)
                  </label>
                  <textarea
                    className="w-full px-3 py-2 border border-line-300 rounded bg-white text-xs text-navy-900 focus:outline-none focus:ring-1 focus:ring-navy-500"
                    rows={2}
                    value={chargeData.charges}
                    onChange={e => setChargeData({ ...chargeData, charges: e.target.value })}
                    placeholder="e.g. IPC 302, IPC 201, IPC 120B..."
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-ink-600 mb-1">
                    Investigative Summary & Findings
                  </label>
                  <textarea
                    className="w-full px-3 py-2 border border-line-300 rounded bg-white text-xs text-navy-900 focus:outline-none focus:ring-1 focus:ring-navy-500"
                    rows={3}
                    value={chargeData.details}
                    onChange={e => setChargeData({ ...chargeData, details: e.target.value })}
                    placeholder="Concise overview of evidentiary findings..."
                  />
                </div>
              </div>

              <div className="border-l border-line-200 pl-6 space-y-3">
                <label className="block text-xs font-bold uppercase tracking-wider text-ink-600">
                  Attach Verified Ledger Evidence
                </label>
                <p className="text-xs text-ink-500">
                  Select artifacts verified on the Hyperledger Fabric ledger to bind into this charge sheet.
                </p>

                <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                  {verifiedEvidenceForCase.length === 0 && (
                    <p className="text-xs text-ink-400 italic py-2">
                      No verified evidence is available for this case yet.
                    </p>
                  )}
                  {verifiedEvidenceForCase.map(ev => (
                    <div
                      key={ev.evidenceId}
                      onClick={() => handleToggleChargeEvidence(ev.evidenceId)}
                      className={`p-2.5 rounded border cursor-pointer transition-colors ${
                        chargeEvidenceIds.includes(ev.evidenceId)
                          ? 'bg-navy-50 border-navy-400'
                          : 'bg-white border-line-200 hover:border-line-300'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <div
                          className={`w-4 h-4 rounded border flex items-center justify-center ${
                            chargeEvidenceIds.includes(ev.evidenceId)
                              ? 'bg-navy-900 border-navy-900 text-white'
                              : 'border-line-300'
                          }`}
                        >
                          {chargeEvidenceIds.includes(ev.evidenceId) && <CheckSquare size={12} />}
                        </div>
                        <span className="text-xs font-semibold text-navy-900 font-mono">{ev.evidenceId}</span>
                        <span className="text-[11px] text-ink-500 truncate">{ev.name || ev.fileName}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-2 pt-4 border-t border-line-200">
              <Button variant="secondary" onClick={() => setChargeSheetModalOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSubmitChargeSheet} disabled={!chargeData.accused || !chargeData.charges}>
                Sign & Submit to Magistrate
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};