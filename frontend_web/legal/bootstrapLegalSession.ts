import { mapUser } from './services/api';

// Must match the keys read by context/AuthContext.tsx's restoreSession() and
// services/api.ts's TOKEN_KEY — this seeds the exact same localStorage
// session the standalone Legal app would have written after its own
// email/password + MFA login, so AuthProvider picks it up unchanged on mount.
const USER_KEY = 'cms_session_user';
const TOKEN_KEY = 'cms_session_token';

/**
 * Called by the unified login flow (components/Login.tsx) once a LEGAL-role
 * user has cleared credentials + PIN. The raw DB user row already carries the
 * judicial/bar fields (bar_judicial_id, court, jurisdiction, phone) because
 * /api/auth/login and /api/legal/auth/login are the same backend handler —
 * so no second network round-trip is needed to enter the Legal app.
 */
export function bootstrapLegalSession(rawUser: any, token: string): void {
  localStorage.setItem(USER_KEY, JSON.stringify(mapUser(rawUser)));
  if (token) localStorage.setItem(TOKEN_KEY, token);
}
