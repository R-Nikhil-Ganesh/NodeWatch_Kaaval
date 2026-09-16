import React from 'react';

// The thin tricolour band that tops every Indian government portal.
export const TricolorStrip = () => (
  <div className="h-[3px] w-full flex" aria-hidden="true">
    <div className="flex-1 bg-saffron-500" />
    <div className="flex-1 bg-white" />
    <div className="flex-1 bg-ashoka-600" />
  </div>
);
