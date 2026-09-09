import React from 'react';
import { Check } from 'lucide-react';
import { CASE_STAGE_LABEL, CASE_STAGE_ORDER, CaseStage } from '../../types';

export const CaseStageStepper = ({ currentStage }: { currentStage: CaseStage }) => {
  const currentIndex = CASE_STAGE_ORDER.indexOf(currentStage);

  return (
    <div className="flex items-start overflow-x-auto pb-2">
      {CASE_STAGE_ORDER.map((stage, i) => {
        const done = i < currentIndex;
        const active = i === currentIndex;
        return (
          <div key={stage} className="flex items-start shrink-0">
            <div className="flex flex-col items-center w-28">
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-semibold border-2 shrink-0 ${
                  done
                    ? 'bg-ashoka-600 border-ashoka-600 text-white'
                    : active
                    ? 'bg-saffron-500 border-saffron-500 text-white'
                    : 'bg-white border-line-300 text-ink-300'
                }`}
              >
                {done ? <Check size={13} /> : i + 1}
              </div>
              <p className={`text-[11px] text-center mt-1.5 leading-tight ${active ? 'text-navy-900 font-semibold' : done ? 'text-ink-700' : 'text-ink-300'}`}>
                {CASE_STAGE_LABEL[stage]}
              </p>
            </div>
            {i < CASE_STAGE_ORDER.length - 1 && (
              <div className={`h-0.5 w-8 mt-3.5 ${done ? 'bg-ashoka-600' : 'bg-line-300'}`} />
            )}
          </div>
        );
      })}
    </div>
  );
};
