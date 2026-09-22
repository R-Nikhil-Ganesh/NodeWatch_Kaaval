import {
  Case,
  Evidence,
  AccessLog,
  LegalDocument,
  User
} from './types';

// ---------------------------------------------------------------------------
// Initial store state.
//
// These are deliberately EMPTY. Every record the app displays is loaded from
// Postgres through the API in `store.tsx`'s loadData().
//
// They previously held a fabricated dataset (invented cases, evidence with
// made-up SHA-256 hashes, fake users). Because loadData() only overwrites
// state when a request succeeds, that dataset was rendered as if it were live
// whenever the backend was unreachable — every dashboard, in every portal,
// silently showed fiction. Keeping these empty means a backend outage shows an
// empty app, which is honest and obvious, instead of a plausible lie.
//
// To load development data, run:  node "DB scripts/02_seed_mock_data.cjs"
// ---------------------------------------------------------------------------

export const INITIAL_CASES: Case[] = [];

export const INITIAL_EVIDENCE: Evidence[] = [];

export const INITIAL_LOGS: AccessLog[] = [];

export const INITIAL_DOCUMENTS: LegalDocument[] = [];

export const MOCK_USERS: User[] = [];
