import { Case, User } from '../types';

// MOCK_LEDGER is kept as the absolute last-resort fallback displayed during first launch
// if both the network and local SQLite are empty. Once the user logs in online even once,
// this is replaced by real data from PostgreSQL cached in local SQLite.
export const MOCK_LEDGER: Case[] = [
  {
    caseId:         'CASE-2026-001',
    title:          'Theft at Anna Nagar',
    status:         'OPEN',
    officer:        'Nikhil Ganesh',
    timestamp:      '2026-01-15T10:00:00Z',
    location:       '13.0827° N, 80.2707° E',
    blockchainHash: '0x7f83b1657ff1fc53b92dc18148a1d65dfc2d4b1fa3d677284addd200126d9069',
    evidence: [
      {
        type:      'image',
        hash:      'QmXoypizjW3WknFiJnKLwHCnL72vedxjQkDDP1mXWo6uco',
        uri:       'https://via.placeholder.com/150',
        name:      'scene_photo.jpg',
        timestamp: '2026-01-15T10:05:00Z',
      },
    ],
  },
];

// Fallback USERS array for offline display and stats fallback
export const USERS: User[] = [
  {
    id: 'u1',
    name: 'Nikhil Ganesh',
    email: 'nikhil@police.tn.gov',
    role: 'investigator',
    designation: 'Inspector of Police',
    badgeNumber: 'TN-KK-001',
  },
  {
    id: 'u2',
    name: 'Dr. Kavitha',
    email: 'kavitha@lab.tn.gov',
    role: 'forensics',
    designation: 'Senior Scientific Officer',
  },
  {
    id: 'admin1',
    name: 'Superintendent (Admin)',
    email: 'admin@police.tn.gov',
    role: 'admin',
    designation: 'System Administrator',
  },
];