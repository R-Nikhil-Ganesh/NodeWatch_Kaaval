import React from 'react';
import { useNavigate } from 'react-router-dom';
import { FileStack, Gavel, Megaphone, ScrollText, ShieldCheck } from 'lucide-react';
import { PublicHeader } from '../components/layout/PublicHeader';
import { Footer } from '../components/layout/Footer';

const QUICK_ACCESS = [
  {
    icon: Gavel,
    title: 'Case Management',
    description: 'Track case status, court hearings, purpose of hearing and judicial statements for every matter assigned to you.',
  },
  {
    icon: FileStack,
    title: 'Case Files & Documentation',
    description: 'FIRs, consent forms, Section 63 BSA certificates, warrants and chargesheets, each tracked by chain of custody.',
  },
  {
    icon: ShieldCheck,
    title: 'Evidence Repository',
    description: 'Physical exhibits with Malkhana location, and digital evidence hashed and anchored on Hyperledger Fabric.',
  },
  {
    icon: ScrollText,
    title: 'Audit & Compliance',
    description: 'A complete, timestamped record of every user who created, viewed, uploaded or downloaded a case record.',
  },
];

const UPDATES = [
  { date: '28-08-2026', text: 'Circular No. 14/2026 — Revised procedure for issuance of Section 63 BSA Certificates for digital evidence.' },
  { date: '19-08-2026', text: 'Advisory — Mandatory use of CNR number for all case references w.e.f. 01-09-2026.' },
  { date: '05-08-2026', text: 'Notice — Scheduled portal maintenance on 10-09-2026, 11:00 PM to 2:00 AM IST.' },
  { date: '22-07-2026', text: 'Guideline — Standard operating procedure for Malkhana custody transfer updated per BNSS, 2023.' },
];

export const OnboardingPage = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-paper-50 flex flex-col">
      <PublicHeader
        rightSlot={
          <button
            onClick={() => navigate('/login')}
            className="shrink-0 px-5 py-2 rounded-sm bg-saffron-500 text-white text-sm font-medium hover:bg-saffron-600 transition-colors"
          >
            Login to Portal
          </button>
        }
      />

      <div className="bg-saffron-50 border-b border-saffron-200 overflow-hidden">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 h-9 flex items-center gap-3">
          <span className="shrink-0 flex items-center gap-1.5 text-[11px] font-semibold text-saffron-700 uppercase tracking-wide bg-saffron-100 px-2 py-1 rounded-sm">
            <Megaphone size={12} /> Notice
          </span>
          <div className="overflow-hidden flex-1 whitespace-nowrap">
            <span className="inline-block animate-marquee text-xs text-ink-700">
              {UPDATES.map((u) => `${u.text} (${u.date})`).join('    •    ')}
            </span>
          </div>
        </div>
      </div>

      <main id="main-content" className="flex-1">
        <section className="border-b border-line-200 bg-white">
          <div className="max-w-[1400px] mx-auto px-4 sm:px-6 py-10">
            <p className="text-xs font-medium text-saffron-700 uppercase tracking-wide mb-2">SIH26190 &middot; Ministry of Home Affairs</p>
            <h1 className="text-2xl sm:text-3xl font-serif font-bold text-navy-900 leading-snug max-w-3xl">
              Secure Digital Document Management System for Legal and Investigation Documents
            </h1>
            <p className="mt-3 text-sm text-ink-700 leading-relaxed max-w-3xl">
              The Court Management System is the judicial-side portal of an integrated case &amp; evidence platform,
              providing Judges, Public Prosecutors, Defense Counsel and Registrars with secure, role-based access to
              case records, court documentation and digital evidence, with every access logged for accountability and
              every digital exhibit verified by cryptographic hash.
            </p>
          </div>
        </section>

        <section className="border-b border-line-200 bg-white">
          <div className="max-w-[1400px] mx-auto px-4 sm:px-6 py-6 grid grid-cols-2 sm:grid-cols-4 divide-x divide-line-200">
            {[
              ['12,480', 'Cases on Record'],
              ['38', 'Courts Onboarded'],
              ['96,200+', 'Documents Digitised'],
              ['100%', 'Digital Evidence Hash-Verified'],
            ].map(([value, label]) => (
              <div key={label} className="px-4 first:pl-0 text-center sm:text-left">
                <p className="text-2xl font-bold text-navy-900">{value}</p>
                <p className="text-xs text-ink-500 mt-0.5">{label}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="max-w-[1400px] mx-auto px-4 sm:px-6 py-10">
          <h2 className="text-sm font-semibold text-navy-900 uppercase tracking-wide mb-4">Quick Access</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {QUICK_ACCESS.map(({ icon: Icon, title, description }) => (
              <div key={title} className="border border-line-200 bg-white rounded-sm p-5">
                <Icon size={22} className="text-navy-700 mb-3" strokeWidth={1.75} />
                <h3 className="text-sm font-semibold text-navy-900">{title}</h3>
                <p className="text-xs text-ink-500 mt-1.5 leading-relaxed">{description}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="max-w-[1400px] mx-auto px-4 sm:px-6 pb-12">
          <h2 className="text-sm font-semibold text-navy-900 uppercase tracking-wide mb-4">Latest Updates &amp; Circulars</h2>
          <div className="border border-line-200 bg-white rounded-sm divide-y divide-line-200">
            {UPDATES.map((u) => (
              <div key={u.text} className="flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-4 px-5 py-3.5 border-l-4 border-navy-100">
                <span className="text-xs font-medium text-ink-500 shrink-0 w-24">{u.date}</span>
                <span className="text-sm text-ink-900">{u.text}</span>
              </div>
            ))}
          </div>
        </section>
      </main>

      <Footer variant="full" />
    </div>
  );
};
