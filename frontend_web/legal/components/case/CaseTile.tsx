import React from 'react';
import { useNavigate } from 'react-router-dom';
import { CalendarDays } from 'lucide-react';
import { CASE_STAGE_LABEL, CourtCase } from '../../types';
import { Badge } from '../ui/Primitives';
import { formatDate } from '../../utils/format';
import { CASE_TYPE_COLORS, outcomeLabel, outcomeTone, stageTone } from '../../utils/caseMeta';

export const CaseTile = ({ courtCase }: { courtCase: CourtCase }) => {
  const navigate = useNavigate();
  const isDisposed = courtCase.stage === 'DISPOSED';

  return (
    <button
      onClick={() => navigate(`/case/${courtCase.caseId}/home`)}
      className="text-left w-full bg-white border border-line-200 rounded-sm p-4 hover:border-navy-500 transition-colors flex flex-col gap-2.5"
    >
      <div className="flex items-start justify-between gap-2">
        <span className={`text-[11px] font-medium px-2 py-1 rounded-sm ${CASE_TYPE_COLORS[courtCase.caseType]}`}>{courtCase.caseType}</span>
        {isDisposed ? (
          <Badge tone={outcomeTone(courtCase.outcome)}>{outcomeLabel(courtCase.outcome)}</Badge>
        ) : (
          <Badge tone={stageTone(courtCase.stage)}>{CASE_STAGE_LABEL[courtCase.stage]}</Badge>
        )}
      </div>

      <div>
        <h3 className="text-sm font-semibold text-navy-900 leading-snug">{courtCase.title}</h3>
        <p className="text-xs text-ink-500 mt-0.5">{courtCase.caseId}</p>
      </div>

      <div className="flex items-center gap-1.5 text-xs text-ink-500 pt-2 border-t border-line-200">
        <CalendarDays size={13} className="shrink-0" />
        <span>Registered {formatDate(courtCase.registeredAt)}</span>
      </div>
    </button>
  );
};
