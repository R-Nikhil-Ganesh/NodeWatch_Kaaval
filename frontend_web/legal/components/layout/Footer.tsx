import React from 'react';
import { Emblem } from './Emblem';

const IMPORTANT_LINKS = [
  'National Portal of India',
  'Digital India',
  'eCourts Services',
  'Tamil Nadu Police',
  'Ministry of Home Affairs',
];

const POLICY_LINKS = [
  'Terms of Use',
  'Privacy Policy',
  'Hyperlinking Policy',
  'Accessibility Statement',
  'Copyright Policy',
];

export const Footer = ({ variant = 'full' }: { variant?: 'full' | 'slim' }) => {
  if (variant === 'slim') {
    return (
      <footer className="border-t border-line-200 bg-white">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-2 text-[11px] text-ink-500">
          <p>&copy; 2026 Government of Tamil Nadu. All Rights Reserved. Content owned and maintained by the Home Department.</p>
          <p>This is a restricted access system. All activity is logged and monitored.</p>
        </div>
      </footer>
    );
  }

  return (
    <footer className="bg-navy-900 text-navy-200 mt-auto">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 py-10 grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
        <div>
          <div className="flex items-center gap-2.5 mb-3">
            <Emblem size={32} dark />
            <span className="font-serif font-semibold text-white text-sm leading-tight">Court Management<br />System</span>
          </div>
          <p className="text-xs text-navy-300 leading-relaxed">
            An initiative under the Ministry of Home Affairs, Government of India, developed in partnership with the
            Government of Tamil Nadu for secure digital management of legal and investigation documents.
          </p>
        </div>

        <div>
          <h3 className="text-xs font-semibold text-white uppercase tracking-wide mb-3">Important Links</h3>
          <ul className="space-y-2 text-xs">
            {IMPORTANT_LINKS.map((l) => (
              <li key={l}><a href="#" className="hover:text-white hover:underline">{l}</a></li>
            ))}
          </ul>
        </div>

        <div>
          <h3 className="text-xs font-semibold text-white uppercase tracking-wide mb-3">Policies</h3>
          <ul className="space-y-2 text-xs">
            {POLICY_LINKS.map((l) => (
              <li key={l}><a href="#" className="hover:text-white hover:underline">{l}</a></li>
            ))}
          </ul>
        </div>

        <div>
          <h3 className="text-xs font-semibold text-white uppercase tracking-wide mb-3">Contact</h3>
          <ul className="space-y-1.5 text-xs text-navy-300">
            <li>Court Registry Helpdesk</li>
            <li>helpdesk-cms&#64;tn.gov.in</li>
            <li>1800-XXX-XXXX (Toll Free)</li>
            <li>Mon&ndash;Sat, 9:30 AM&ndash;6:00 PM</li>
          </ul>
        </div>
      </div>

      <div className="border-t border-navy-800">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 py-3 flex flex-col sm:flex-row items-center justify-between gap-2 text-[11px] text-navy-400">
          <p>&copy; 2026 Government of Tamil Nadu. All Rights Reserved.</p>
          <p>Site last updated: 02-09-2026 &middot; Visitors: 4,28,193 &middot; Best viewed in Chrome, Firefox, Edge</p>
          <p>Designed, Developed &amp; Hosted by National Informatics Centre (NIC)</p>
        </div>
      </div>
    </footer>
  );
};
