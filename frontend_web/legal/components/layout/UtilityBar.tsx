import React from 'react';

// The accessibility / language strip standard on GIGW-compliant government
// sites (india.gov.in, eCourts, state portals). Controls are decorative for
// this UI-only build except the skip link, which is a real a11y affordance.
export const UtilityBar = () => (
  <div className="bg-navy-950 text-navy-300">
    <div className="max-w-[1400px] mx-auto px-4 sm:px-6 h-8 flex items-center justify-between text-[11px]">
      <div className="flex items-center gap-3">
        <a href="#main-content" className="hover:text-white hover:underline focus:text-white">
          Skip to Main Content
        </a>
        <span className="hidden sm:inline text-navy-700">|</span>
        <button type="button" className="hidden sm:inline hover:text-white hover:underline">
          Screen Reader Access
        </button>
      </div>
      <div className="flex items-center gap-3">
        <div className="hidden sm:flex items-center border border-navy-700 rounded-sm overflow-hidden">
          <button type="button" aria-label="Decrease text size" className="px-1.5 py-0.5 hover:bg-navy-800 hover:text-white">A-</button>
          <button type="button" aria-label="Default text size" className="px-1.5 py-0.5 bg-navy-800 text-white border-x border-navy-700">A</button>
          <button type="button" aria-label="Increase text size" className="px-1.5 py-0.5 hover:bg-navy-800 hover:text-white">A+</button>
        </div>
        <span className="hidden sm:inline text-navy-700">|</span>
        <select
          aria-label="Select language"
          defaultValue="en"
          className="bg-transparent text-navy-300 outline-none cursor-pointer hover:text-white [&>option]:text-ink-900"
        >
          <option value="en">English</option>
          <option value="ta">தமிழ்</option>
          <option value="hi">हिन्दी</option>
        </select>
      </div>
    </div>
  </div>
);
