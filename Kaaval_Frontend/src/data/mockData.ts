import { Case, User } from '../types';

export const USERS: User[] = [
  { 
    id: 'u1', 
    name: 'Nikhil Ganesh', 
    role: 'investigator', 
    email: 'nikhil@police.tn.gov',
    password: 'password123'
  },
  { 
    id: 'u2', 
    name: 'Dr. Kavitha', 
    role: 'forensics', 
    email: 'kavitha@lab.tn.gov',
    password: 'password123'
  },
  { 
    id: 'admin1', 
    name: 'Superintendent (Admin)', 
    role: 'admin', 
    email: 'admin@police.tn.gov',
    password: 'adminpassword'
  }
];

export const MOCK_LEDGER: Case[] = [
  {
    caseId: 'CASE-2026-001',
    title: 'Theft at Anna Nagar',
    status: 'Evidence Collected',
    officer: 'Nikhil Ganesh',
    timestamp: '2026-01-15T10:00:00Z',
    location: '13.0827° N, 80.2707° E',
    blockchainHash: '0x7f83b1657ff1fc53b92dc18148a1d65dfc2d4b1fa3d677284addd200126d9069',
    evidence: [
      { type: 'image', hash: 'QmXoypizjW3WknFiJnKLwHCnL72vedxjQkDDP1mXWo6uco', uri: 'https://via.placeholder.com/150', name: 'scene_photo.jpg', timestamp: '2026-01-15T10:05:00Z' }
    ]
  }
];