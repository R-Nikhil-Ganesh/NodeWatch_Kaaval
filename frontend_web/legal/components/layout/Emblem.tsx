import React from 'react';
import { Scale } from 'lucide-react';

// A generic state-seal mark — a ringed roundel rather than an app logo tile,
// standing in for the state emblem without reproducing any protected mark.
export const Emblem = ({ size = 44, dark = false }: { size?: number; dark?: boolean }) => (
  <div
    className={`shrink-0 rounded-full flex items-center justify-center border-2 ${
      dark ? 'border-white bg-navy-900' : 'border-navy-900 bg-white'
    }`}
    style={{ width: size, height: size }}
  >
    <div className={`rounded-full border ${dark ? 'border-navy-700' : 'border-line-300'}`} style={{ width: size - 8, height: size - 8 }}>
      <div className="w-full h-full rounded-full flex items-center justify-center">
        <Scale size={Math.round(size * 0.42)} className={dark ? 'text-white' : 'text-navy-900'} strokeWidth={2} />
      </div>
    </div>
  </div>
);
