import { Case, Evidence, AccessLog, User } from './types';

// Clean initial states (Loaded dynamically from the PostgreSQL/Fabric backend)
export const INITIAL_CASES: Case[] = [];
export const INITIAL_EVIDENCE: Evidence[] = [];
export const INITIAL_LOGS: AccessLog[] = [];
export const MOCK_USERS: User[] = [];
