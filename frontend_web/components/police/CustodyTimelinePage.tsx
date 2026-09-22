import React, { useState, useEffect, useCallback } from 'react';
import { CheckCircle, AlertTriangle } from 'lucide-react';
import { Card } from '../Common';
import { getCustodyTimeline, getChainIntegrityReport } from '../../services/custodyService';
import { getAllEvidence } from '../../services/evidenceService';
import type { CustodyEvent } from '../../services/types';
import type { IOEvidence } from '../../services/types';
import type { ChainIntegrityReport } from '../../services/custodyService';

// ── Helpers ──────────────────────────────────────────────────────────────────

const fmtDate = (s: string) =>
  new Date(s).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
const fmtTime = (s: string) =>
  new Date(s).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false });

// ── Event type color ──────────────────────────────────────────────────────────

const eventDotColor = (eventType: CustodyEvent['eventType']): string => {
  const map: Record<CustodyEvent['eventType'], string> = {
    'Evidence Collected': 'bg-navy-900',
    'Evidence Sealed': 'bg-saffron-500',
    'Custody Transferred': 'bg-amber-500',
    'Custody Received': 'bg-teal-600',
    'Transferred to FSL': 'bg-purple-600',
    'Received by FSL': 'bg-purple-800',
    'Forensic Examination Started': 'bg-indigo-600',
    'Forensic Report Filed': 'bg-indigo-800',
    'Evidence Returned': 'bg-status-resolved',
  };
  return map[eventType] ?? 'bg-ink-400';
};

const eventBadgeColor = (eventType: CustodyEvent['eventType']): string => {
  const map: Record<CustodyEvent['eventType'], string> = {
    'Evidence Collected': 'bg-navy-50 text-navy-900 border-navy-200',
    'Evidence Sealed': 'bg-amber-50 text-amber-800 border-amber-200',
    'Custody Transferred': 'bg-orange-50 text-orange-800 border-orange-200',
    'Custody Received': 'bg-teal-50 text-teal-800 border-teal-200',
    'Transferred to FSL': 'bg-purple-50 text-purple-800 border-purple-200',
    'Received by FSL': 'bg-purple-100 text-purple-900 border-purple-300',
    'Forensic Examination Started': 'bg-indigo-50 text-indigo-800 border-indigo-200',
    'Forensic Report Filed': 'bg-indigo-100 text-indigo-900 border-indigo-300',
    'Evidence Returned': 'bg-status-resolvedBg text-status-resolved border-status-resolved/20',
  };
  return map[eventType] ?? 'bg-paper-100 text-ink-700 border-line-300';
};

// ── Props ─────────────────────────────────────────────────────────────────────

interface Props {
  onNavigate: (view: string, id?: string) => void;
  initialEvidenceId?: string;
}

// ════════════════════════════════════════════════════════════════════════════
// Main component
// ════════════════════════════════════════════════════════════════════════════

const CustodyTimelinePage: React.FC<Props> = ({ onNavigate, initialEvidenceId }) => {
  const [allEvidence, setAllEvidence] = useState<IOEvidence[]>([]);
  const [selectedId, setSelectedId] = useState<string>(initialEvidenceId ?? '');
  const [events, setEvents] = useState<CustodyEvent[]>([]);
  const [chainReport, setChainReport] = useState<ChainIntegrityReport | null>(null);
  const [loadingEvidence, setLoadingEvidence] = useState(true);
  const [loadingTimeline, setLoadingTimeline] = useState(false);

  // Load all evidence for the selector
  useEffect(() => {
    const load = async () => {
      setLoadingEvidence(true);
      const ev = await getAllEvidence();
      setAllEvidence(ev);
      const defaultId = initialEvidenceId ?? (ev.length > 0 ? ev[0].evidenceId : '');
      setSelectedId(defaultId);
      setLoadingEvidence(false);
    };
    load();
  }, [initialEvidenceId]);

  // Load timeline when selectedId changes
  const loadTimeline = useCallback(async (id: string) => {
    if (!id) return;
    setLoadingTimeline(true);
    const [evts, cr] = await Promise.all([
      getCustodyTimeline(id),
      getChainIntegrityReport(id),
    ]);
    setEvents(evts);
    setChainReport(cr);
    setLoadingTimeline(false);
  }, []);

  useEffect(() => {
    if (selectedId) loadTimeline(selectedId);
  }, [selectedId, loadTimeline]);

  const handleSelect = (id: string) => {
    setSelectedId(id);
  };

  const selectedEvidence = allEvidence.find(e => e.evidenceId === selectedId);

  return (
    <div className="min-h-screen bg-paper-50">
      {/* Header */}
      <div className="bg-white border-b border-line-200 px-6 py-5">
        <h1 className="text-2xl font-bold text-navy-900">Chain of Custody</h1>
        <p className="text-sm text-ink-500 mt-1">
          Select an evidence item to view its complete, immutable custody history as recorded on the blockchain ledger.
        </p>
      </div>

      <div className="p-6 space-y-5">
        {/* Evidence Selector */}
        <Card title="Select Evidence Item">
          {loadingEvidence ? (
            <div className="text-sm text-ink-400">Loading evidence…</div>
          ) : (
            <div className="flex items-center gap-4">
              <select
                value={selectedId}
                onChange={e => handleSelect(e.target.value)}
                className="flex-1 max-w-2xl px-3.5 py-2.5 border border-line-300 rounded-sm bg-white text-ink-900 text-sm outline-none focus:border-navy-500 focus:ring-1 focus:ring-navy-500 transition-colors"
              >
                {allEvidence.map(ev => (
                  <option key={ev.evidenceId} value={ev.evidenceId}>
                    {ev.evidenceId} — {ev.type} — {ev.description.length > 50 ? ev.description.slice(0, 50) + '…' : ev.description} (Case: {ev.caseId})
                  </option>
                ))}
              </select>
              {selectedEvidence && (
                <div className="flex items-center gap-2 text-sm text-ink-500">
                  <span className="text-ink-300">|</span>
                  <span className="font-medium text-ink-700">{selectedEvidence.type}</span>
                  <span className="text-ink-300">·</span>
                  <span>{selectedEvidence.caseId}</span>
                </div>
              )}
            </div>
          )}
        </Card>

        {/* Integrity Banner */}
        {chainReport && (
          <div className="bg-navy-900 text-white rounded-sm px-6 py-5 shadow-card">
            <p className="text-xs font-semibold uppercase tracking-widest text-navy-200 mb-4">
              Chain of Custody — {selectedId}
            </p>
            <div className="flex flex-wrap gap-3">
              {[
                { label: 'Integrity Verified', ok: chainReport.verified },
                { label: 'No Missing Events', ok: chainReport.noMissingEvents },
                { label: 'All Transfers Acknowledged', ok: chainReport.allTransfersAcknowledged },
              ].map(check => (
                <span
                  key={check.label}
                  className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold border ${
                    check.ok
                      ? 'bg-status-resolvedBg/20 text-emerald-300 border-emerald-700'
                      : 'bg-status-urgentBg/20 text-red-300 border-red-700'
                  }`}
                >
                  {check.ok
                    ? <CheckCircle size={13} />
                    : <AlertTriangle size={13} />
                  }
                  {check.label}
                </span>
              ))}
              <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold border bg-white/10 text-white border-white/20">
                {chainReport.totalEvents} events on ledger
              </span>
            </div>
          </div>
        )}

        {/* Timeline */}
        {loadingTimeline ? (
          <div className="flex items-center justify-center h-48 text-ink-500">
            <div className="w-6 h-6 border-2 border-navy-900 border-t-transparent rounded-full animate-spin mr-3" />
            Loading custody timeline…
          </div>
        ) : events.length === 0 ? (
          <Card>
            <div className="text-center py-12 text-ink-400">
              <p className="text-sm">No custody events found for this evidence item.</p>
            </div>
          </Card>
        ) : (
          <div className="bg-white border border-line-200 rounded-sm shadow-card px-6 pt-6 pb-2">
            <h3 className="text-xs font-semibold text-ink-500 uppercase tracking-wide mb-6">
              Custody History — {events.length} events
            </h3>

            {/* Vertical timeline */}
            <div className="relative pl-8">
              {/* Continuous vertical line */}
              <div className="absolute left-3.5 top-2 bottom-8 w-px bg-line-200" />

              {events.map((ev, idx) => {
                const isLast = idx === events.length - 1;
                return (
                  <div
                    key={ev.id}
                    className={`relative flex gap-5 ${isLast ? 'pb-6' : 'pb-8'}`}
                  >
                    {/* Dot indicator */}
                    <div
                      className={`absolute -left-[1px] w-4 h-4 rounded-full border-2 border-white shadow-sm mt-1 flex-shrink-0 ${eventDotColor(ev.eventType)}`}
                      style={{ left: '-1px' }}
                    />

                    {/* Event card */}
                    <div className="flex-1 ml-3">
                      {/* Date + time row */}
                      <div className="flex items-center gap-3 mb-2">
                        <span className="text-xs font-semibold text-ink-400 tracking-wide">
                          {fmtDate(ev.timestamp)} — {fmtTime(ev.timestamp)}
                        </span>
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${eventBadgeColor(ev.eventType)}`}
                        >
                          {ev.eventType}
                        </span>
                      </div>

                      {/* Card body */}
                      <div className="bg-paper-50 border border-line-200 rounded-sm px-5 py-4">
                        <div className="grid grid-cols-2 gap-x-8 gap-y-3">
                          {/* Actor */}
                          <div>
                            <p className="text-xs text-ink-400 mb-0.5">Actor</p>
                            <p className="text-sm font-semibold text-navy-900">{ev.actor}</p>
                          </div>

                          {/* Location */}
                          <div>
                            <p className="text-xs text-ink-400 mb-0.5">Location</p>
                            <p className="text-sm text-ink-700">{ev.location}</p>
                          </div>

                          {/* Transfer arrow (if applicable) */}
                          {(ev.fromCustodian || ev.toCustodian) && (
                            <div className="col-span-2">
                              <p className="text-xs text-ink-400 mb-0.5">Custody Transfer</p>
                              <div className="flex items-center gap-2 text-sm">
                                {ev.fromCustodian && (
                                  <span className="text-ink-600 font-medium">{ev.fromCustodian}</span>
                                )}
                                {ev.fromCustodian && ev.toCustodian && (
                                  <span className="text-ink-300 font-bold">→</span>
                                )}
                                {ev.toCustodian && (
                                  <span className="text-navy-900 font-semibold">{ev.toCustodian}</span>
                                )}
                              </div>
                            </div>
                          )}

                          {/* Seal ID */}
                          {ev.sealId && (
                            <div>
                              <p className="text-xs text-ink-400 mb-0.5">Seal ID</p>
                              <p className="text-sm font-mono text-ink-700">{ev.sealId}</p>
                            </div>
                          )}

                          {/* Notes */}
                          {ev.notes && (
                            <div className={ev.sealId ? '' : 'col-span-2'}>
                              <p className="text-xs text-ink-400 mb-0.5">Notes</p>
                              <p className="text-sm text-ink-600 italic">{ev.notes}</p>
                            </div>
                          )}
                        </div>

                        {/* TX row */}
                        <div className="flex items-center justify-between mt-4 pt-3 border-t border-line-100">
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-ink-400">TX:</span>
                            <span className="font-mono text-xs text-navy-700 font-semibold">{ev.txId}</span>
                          </div>
                          {ev.blockchainVerified ? (
                            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-status-resolved">
                              <CheckCircle size={12} /> Verified on Ledger
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-status-urgent">
                              <AlertTriangle size={12} /> Unverified
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CustodyTimelinePage;

