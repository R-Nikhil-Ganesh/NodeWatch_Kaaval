// DESIGNATIONS — static reference list for rank/designation dropdowns.
// The in-memory `state` object has been removed — all data now lives in PostgreSQL.
// Served via GET /api/designations from server.js.

export const DESIGNATIONS = {
  ADMIN: [
    'System Administrator',
    'IT Director',
    'Database Manager'
  ],
  POLICE: [
    'Director General of Police (DGP)',
    'Addl. Director General (ADGP)',
    'Inspector General (IGP)',
    'Superintendent of Police (SP)',
    'Dy. Superintendent (DSP)',
    'Inspector of Police',
    'Sub-Inspector (SI)',
    'Head Constable',
    'Grade I Constable'
  ],
  FORENSICS: [
    'Director',
    'Joint Director',
    'Deputy Director',
    'Assistant Director',
    'Senior Scientific Officer',
    'Junior Scientific Officer',
    'Scientific Assistant'
  ],
  LEGAL: [
    'High Court Judge',
    'District Judge',
    'Public Prosecutor',
    'Addl. Public Prosecutor',
    'Defense Counsel',
    'Registrar'
  ]
};
