import React from 'react';
import { ArrowRight } from 'lucide-react';
import { CustodyEvent } from '../../types';
import { formatDateTime } from '../../utils/format';

export const CustodyTrail = ({ events }: { events: CustodyEvent[] }) => (
  <ol className="relative border-l border-line-300 ml-1.5 space-y-5">
    {events.map((e, i) => (
      <li key={e.eventId} className="ml-4">
        <span className="absolute -left-[5px] w-2.5 h-2.5 rounded-full bg-navy-700 border-2 border-white" style={{ marginTop: 4 }} />
        <p className="text-xs text-ink-500">{formatDateTime(e.timestamp)}</p>
        <p className="text-sm text-ink-900 font-medium mt-0.5">{e.action}</p>
        <p className="text-xs text-ink-500 mt-0.5 flex items-center gap-1.5 flex-wrap">
          <span>{e.fromCustodian} <span className="text-ink-300">({e.fromRole})</span></span>
          <ArrowRight size={12} className="text-ink-300" />
          <span>{e.toCustodian} <span className="text-ink-300">({e.toRole})</span></span>
        </p>
        {e.notes && <p className="text-xs text-ink-500 mt-1 italic">&ldquo;{e.notes}&rdquo;</p>}
      </li>
    ))}
  </ol>
);
