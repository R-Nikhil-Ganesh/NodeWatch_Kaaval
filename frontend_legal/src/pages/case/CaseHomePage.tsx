import React, { useEffect, useState } from 'react';
import { AlertTriangle, CalendarCheck, CalendarClock, CalendarPlus, CheckCircle2, Gavel, Loader2, User2, XCircle } from 'lucide-react';
import { useCaseContext } from '../../components/layout/CaseLayout';
import { Badge, Card, DescriptionRow, EmptyState, Select } from '../../components/ui/Primitives';
import { CaseStageStepper } from '../../components/case/CaseStageStepper';
import { fetchHearings } from '../../services/api';
import { useAsync } from '../../hooks/useAsync';
import { CASE_STAGE_LABEL, CaseStage } from '../../types';
import { formatDate, formatDateTime } from '../../utils/format';
import { outcomeLabel, outcomeTone, stageTone } from '../../utils/caseMeta';

const AttendanceChip = ({ present, label }: { present: boolean; label: string }) => (
  <span className={`inline-flex items-center gap-1 text-[11px] font-medium ${present ? 'text-ashoka-700' : 'text-ink-300'}`}>
    {present ? <CheckCircle2 size={12} /> : <XCircle size={12} />} {label}
  </span>
);

export const CaseHomePage = () => {
  const { courtCase } = useCaseContext();
  const { data: hearings, loading, error } = useAsync(() => fetchHearings(courtCase.caseId), [courtCase.caseId]);
  const [selectedHearingId, setSelectedHearingId] = useState('');

  useEffect(() => {
    if (hearings && hearings.length) {
      setSelectedHearingId(hearings[hearings.length - 1].hearingId);
    }
  }, [hearings]);

  const selectedHearing = (hearings || []).find((h) => h.hearingId === selectedHearingId) ?? (hearings || [])[hearings ? hearings.length - 1 : 0];
  const isDisposed = courtCase.stage === CaseStage.DISPOSED;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-navy-900">{courtCase.title}</h1>
          <p className="text-sm text-ink-500 mt-1">{courtCase.caseId} · CNR {courtCase.cnrNumber} · {courtCase.caseType}</p>
        </div>
        <div className="flex items-center gap-2">
          {isDisposed && <Badge tone={outcomeTone(courtCase.outcome)}>{outcomeLabel(courtCase.outcome)}</Badge>}
          <Badge tone={stageTone(courtCase.stage)}>{CASE_STAGE_LABEL[courtCase.stage]}</Badge>
        </div>
      </div>

      <Card title="Case Progress">
        <CaseStageStepper currentStage={courtCase.stage} />
      </Card>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card title="Case Details">
            <dl>
              <DescriptionRow label="FIR Number" value={`${courtCase.firNumber} (${formatDate(courtCase.firDate)})`} />
              <DescriptionRow label="Police Station" value={courtCase.policeStation} />
              <DescriptionRow label="District / State" value={`${courtCase.district}, ${courtCase.state}`} />
              <DescriptionRow label="Sections Invoked" value={
                <div className="flex flex-wrap gap-1.5">
                  {courtCase.sections.map((s) => <Badge key={s} tone="navy">{s}</Badge>)}
                </div>
              } />
              <DescriptionRow label="Court" value={courtCase.court} />
              <DescriptionRow label="Presiding Judge" value={courtCase.presidingJudge} />
              <DescriptionRow label="Public Prosecutor" value={courtCase.publicProsecutor} />
              <DescriptionRow label="Defense Counsel" value={courtCase.defenseCounsel} />
              <DescriptionRow label="Investigating Officer" value={`${courtCase.investigatingOfficer} — ${courtCase.investigatingOfficerDesignation}`} />
              <DescriptionRow label="Current Custodian" value={courtCase.currentCustodian} />
              <DescriptionRow label="Case Summary" value={courtCase.description} />
            </dl>
          </Card>

          <Card title="Parties" padded={false}>
            <div className="divide-y divide-line-200">
              {courtCase.parties.map((p, i) => (
                <div key={i} className="flex items-start gap-3 px-5 py-3.5">
                  <div className="w-8 h-8 rounded-full bg-navy-50 text-navy-700 flex items-center justify-center shrink-0">
                    <User2 size={15} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-medium text-navy-900">{p.name}</p>
                      <Badge tone="neutral">{p.role}</Badge>
                      {p.custodyStatus && p.custodyStatus !== 'N/A' && <Badge tone={p.custodyStatus === 'On Bail' ? 'pending' : 'urgent'}>{p.custodyStatus}</Badge>}
                    </div>
                    <p className="text-xs text-ink-500 mt-0.5">
                      {[p.age ? `Age ${p.age}` : null, p.address].filter(Boolean).join(' · ')}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>

        <div className="space-y-6">
          <Card title="Hearing Timeline">
            <div className="space-y-3">
              <div className="flex items-center gap-2.5">
                <CalendarPlus size={15} className="text-ink-500 shrink-0" />
                <div>
                  <p className="text-[11px] text-ink-500">First Hearing</p>
                  <p className="text-sm font-medium text-navy-900">{formatDate(courtCase.firstHearingDate)}</p>
                </div>
              </div>
              <div className="flex items-center gap-2.5">
                <CalendarCheck size={15} className="text-ink-500 shrink-0" />
                <div>
                  <p className="text-[11px] text-ink-500">Last Hearing</p>
                  <p className="text-sm font-medium text-navy-900">{formatDate(courtCase.lastHearingDate)}</p>
                </div>
              </div>
              {!isDisposed && courtCase.upcomingHearingDate && (
                <div className="flex items-center gap-2.5">
                  <CalendarClock size={15} className="text-saffron-600 shrink-0" />
                  <div>
                    <p className="text-[11px] text-saffron-600">Upcoming Hearing</p>
                    <p className="text-sm font-semibold text-saffron-700">{formatDate(courtCase.upcomingHearingDate)}</p>
                  </div>
                </div>
              )}
              {isDisposed && courtCase.disposedAt && (
                <div className="flex items-center gap-2.5">
                  <Gavel size={15} className="text-ashoka-600 shrink-0" />
                  <div>
                    <p className="text-[11px] text-ashoka-600">Disposed On</p>
                    <p className="text-sm font-semibold text-ashoka-700">{formatDate(courtCase.disposedAt)}</p>
                  </div>
                </div>
              )}
            </div>
          </Card>

          <Card title="Hearing History">
            {loading ? (
              <div className="flex items-center justify-center py-8 text-ink-500 gap-2 text-sm">
                <Loader2 size={16} className="animate-spin" /> Loading hearing history…
              </div>
            ) : error ? (
              <EmptyState icon={<AlertTriangle size={32} />} title="Could not load hearings" description={error} />
            ) : !hearings || hearings.length === 0 ? (
              <EmptyState title="No hearings recorded yet" />
            ) : (
              <>
                <Select label="Select a hearing date" value={selectedHearingId} onChange={(e) => setSelectedHearingId(e.target.value)}>
                  {hearings.slice().reverse().map((h) => (
                    <option key={h.hearingId} value={h.hearingId}>
                      {formatDate(h.date)} — {h.purpose}
                    </option>
                  ))}
                </Select>

                {selectedHearing && (
                  <div className="mt-4 pt-4 border-t border-line-200 space-y-3">
                    <div className="flex items-center justify-between">
                      <Badge tone="saffron">{selectedHearing.purpose}</Badge>
                      <p className="text-xs text-ink-500">{formatDateTime(selectedHearing.date)}</p>
                    </div>
                    <p className="text-sm text-ink-900 leading-relaxed">{selectedHearing.statement}</p>
                    <div className="flex flex-wrap gap-3 pt-1">
                      <AttendanceChip present={selectedHearing.attendance.prosecutor} label="Prosecutor" />
                      <AttendanceChip present={selectedHearing.attendance.defenseCounsel} label="Defense Counsel" />
                      <AttendanceChip present={selectedHearing.attendance.accusedPresent} label="Accused" />
                    </div>
                    <p className="text-xs text-ink-500 pt-2 border-t border-line-200">
                      Presided by <span className="font-medium text-ink-700">{selectedHearing.judge}</span>
                      {selectedHearing.nextHearingDate && (
                        <> · Next hearing fixed for <span className="font-medium text-ink-700">{formatDate(selectedHearing.nextHearingDate)}</span></>
                      )}
                    </p>
                  </div>
                )}
              </>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
};
