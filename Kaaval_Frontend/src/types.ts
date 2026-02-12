// src/types.ts

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'investigator' | 'forensics' | 'admin';
  password?: string;
}

export interface Evidence {
  type: 'image' | 'document';
  uri: string;
  hash: string;
  timestamp: string;
  name?: string;
  location?: string; // <--- THIS MUST BE HERE
}

export interface Case {
  caseId: string;
  title: string;
  status: 'Open' | 'Evidence Collected' | 'Verified';
  officer: string;
  timestamp: string;
  location: string;
  blockchainHash: string;
  evidence: Evidence[];
}

export type RootStackParamList = {
  Auth: undefined;
  Dashboard: undefined;
  CreateCase: undefined;
  Evidence: { caseId: string };
};