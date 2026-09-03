/**
 * src/context/AppContext.tsx
 *
 * Application state and data layer.
 *
 * Offline-first strategy:
 * 1. On boot, read immediately from local SQLite (zero network dependency).
 * 2. Attempt a background sync from the central API to pull fresh data.
 * 3. All writes go to SQLite first, then enqueue a sync task.
 * 4. Register sync listeners (foreground + network reconnect) so the queue
 *    drains automatically when connectivity is available.
 */

import React, { useState, createContext, useContext, ReactNode, useEffect, useRef } from 'react';
import * as SecureStore from 'expo-secure-store';
import * as FileSystem from 'expo-file-system/legacy';
import { User, Case, normalizeCaseStatus } from '../types';
import { MOCK_LEDGER } from '../data/mockData';
import { apiService } from '../services/api';
import * as DB from '../db/index';
import { enqueue } from '../db/index';
import { registerSyncListeners, flushSyncQueue, flushPendingEvidenceUploads } from '../db/sync';

const JWT_STORE_KEY = 'kaaval_jwt_v1';

interface AppContextType {
  user: User | null;
  users: User[];
  token: string | null;
  setUser: (user: User | null) => void;
  registerUser: (newUser: User) => void;
  logout: () => Promise<void>;
  cases: Case[];
  addCase: (newCase: Case) => void;
  updateCaseEvidence: (caseId: string, evidence: any) => void;
  loading: boolean;
  error: string | null;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUserState]   = useState<User | null>(null);
  const [token, setToken]      = useState<string | null>(null);
  const [cases, setCases]      = useState<Case[]>([]);
  const [users, setUsers]      = useState<User[]>([]);
  const [loading, setLoading]  = useState(false);
  const [error, setError]      = useState<string | null>(null);
  const tokenRef               = useRef<string | null>(null);   // stable ref for sync listeners

  const setUser = (u: User | null) => setUserState(u);

  // ─── LOGOUT ───────────────────────────────────────────────────────────────
  // Clears the persisted JWT and in-memory session so a stale/invalid cached
  // login (e.g. from an old backend or a user no longer in the DB) can't
  // silently resurrect itself via the offline session-restore path on the
  // Auth screen the next time it mounts.
  const logout = async () => {
    try {
      await SecureStore.deleteItemAsync(JWT_STORE_KEY);
    } catch (e) {
      console.log('[AppProvider] Failed clearing stored session:', (e as Error).message);
    }
    tokenRef.current = null;
    setToken(null);
    setUserState(null);
  };

  // ─── BOOT: SQLite-first load ────────────────────────────────────────────

  useEffect(() => {
    const boot = async () => {
      try {
        // 1. Open local DB and run schema (fast — no network)
        await DB.openDatabase();

        // 2. Check for stored JWT (offline session restore)
        const storedToken = await SecureStore.getItemAsync(JWT_STORE_KEY);
        if (storedToken) {
          setToken(storedToken);
          tokenRef.current = storedToken;
        }

        // 3. Load cases from SQLite immediately (zero latency)
        const localCases = await DB.getAllLocalCases();
        if (localCases.length > 0) {
          // Map local_cases rows to the Case type expected by screens
          setCases(localCases.map(mapLocalCaseToCase));
        } else {
          // Absolute first-launch fallback — show mock ledger until sync completes
          setCases(MOCK_LEDGER);
        }

        // 4. Attempt background pull from central API (non-blocking)
        pullRemoteCases(storedToken);

      } catch (e) {
        console.error('[AppProvider] Boot error:', e);
      }
    };
    boot();
  }, []);

  // ─── SYNC LISTENERS (foreground + network reconnect) ────────────────────

  useEffect(() => {
    const cleanup = registerSyncListeners(() => tokenRef.current);
    return cleanup;
  }, []);

  // ─── BACKGROUND PULL ─────────────────────────────────────────────────────

  const pullRemoteCases = async (authToken?: string | null) => {
    try {
      const remoteCases = await apiService.listCases();
      if (!remoteCases || !remoteCases.length) return;

      // Persist to SQLite
      for (const c of remoteCases) {
        await DB.upsertLocalCase(mapCaseToLocal(c));
      }

      // Update React state — must go through the same mapper used for the
      // SQLite-loaded path (line ~88), since the raw server response is
      // snake_case-ish (officer_name, created_at, blockchain_hash) while
      // screens read the camelCase Case shape (officer, timestamp,
      // blockchainHash). Setting raw rows here made those fields render as
      // "Unassigned"/"Recent" right after every live sync.
      setCases(remoteCases.map(mapLocalCaseToCase));

      // Flush any queued local mutations now that we're online
      await flushSyncQueue(authToken ?? tokenRef.current ?? undefined);
      await flushPendingEvidenceUploads();
    } catch (e) {
      // Network unreachable — SQLite data already loaded, nothing to do
      console.log('[AppProvider] Remote pull skipped (offline):', (e as Error).message);
    }
  };

  // ─── REGISTER NEW USER ────────────────────────────────────────────────────

  const registerUser = async (newUser: User) => {
    setUsers(prev => [...prev, newUser]);
    await DB.upsertLocalUser({
      user_id:    newUser.id,
      username:   (newUser as any).username || newUser.email,
      name:       newUser.name,
      role:       newUser.role,
      designation: newUser.designation,
    });
  };

  // ─── ADD CASE ─────────────────────────────────────────────────────────────

  const addCase = async (newCase: Case) => {
    setLoading(true);
    setError(null);
    try {
      const normalizedStatus = normalizeCaseStatus(newCase.status);
      const payload: Case = {
        ...newCase,
        status:          normalizedStatus,
        timestamp:       newCase.timestamp || new Date().toISOString(),
        blockchainHash:  newCase.blockchainHash || 'pending',
      };

      // 1. Write to local SQLite immediately (offline-safe)
      await DB.upsertLocalCase(mapCaseToLocal({ ...payload, sync_status: 'PENDING_CREATE' }));
      setCases(prev => [payload, ...prev]);

      // 2. Enqueue for remote sync
      await enqueue({ entityType: 'CASE', entityId: payload.caseId, actionType: 'CREATE', payload });

      // 3. Try to push immediately if online
      const created = await apiService.createCase(payload, {
        userId:   user?.id,
        userRole: user?.role?.toUpperCase(),
        userOrg:  'POLICE',
      });
      if (created) {
        // Mark as synced once confirmed
        await DB.upsertLocalCase(mapCaseToLocal({ ...created, sync_status: 'SYNCED' }));
      }
    } catch (err: any) {
      if (err?.status) {
        // The server actually responded and rejected the request (e.g. a stale
        // session) — the case still exists locally as PENDING_CREATE and will
        // retry via the sync queue, but this specific attempt genuinely failed,
        // so the caller must not report success.
        console.log('[addCase] Server rejected create:', err.status, err.message);
        throw err;
      }
      // No response at all — genuine offline/network failure; stays queued for later sync
      console.log('[addCase] Offline, queued for sync:', err.message);
    } finally {
      setLoading(false);
    }
  };

  // ─── UPDATE CASE EVIDENCE ─────────────────────────────────────────────────

  const updateCaseEvidence = async (caseId: string, newEvidence: any) => {
    setLoading(true);
    setError(null);
    try {
      const hash       = newEvidence.hash || '0x' + Date.now().toString(16);
      const evidenceId = `ev-${Date.now()}`;
      const now        = new Date().toISOString();

      // 1. Write evidence to local SQLite immediately
      await DB.upsertLocalEvidence({
        evidence_id:        evidenceId,
        case_id:            caseId,
        name:               newEvidence.name || 'Evidence',
        file_name:          newEvidence.name || 'evidence',
        type:               (newEvidence.type || 'IMAGE').toUpperCase(),
        local_file_uri:     newEvidence.uri || '',
        file_hash:          hash,
        metadata_hash:      '',
        collected_location: newEvidence.location || '',
        collected_timestamp: now,
        uploaded_by_user_id: user?.id,
        sync_status:        'PENDING_UPLOAD',
        created_at:         now,
        updated_at:         now,
      });

      // Update local cases state
      const savedEvidence = { ...newEvidence, hash, evidenceId };
      setCases(prev => prev.map(c => {
        if (c.caseId !== caseId) return c;
        return { ...c, evidence: [savedEvidence, ...(c.evidence || [])] };
      }));

      // 2. Try to upload to backend immediately
      const uploadResp = await apiService.uploadCaseEvidence(caseId, newEvidence.uri, {
        name:      newEvidence.name,
        location:  newEvidence.location,
        // `type` must be the evidence category (IMAGE/VIDEO/PDF/...) the backend's
        // evidence_type enum accepts — NOT the raw MIME type (e.g. "image/jpeg"),
        // which the server already derives itself from the uploaded file.
        type:      (newEvidence.type || 'IMAGE').toUpperCase(),
        timestamp: newEvidence.timestamp,
        hash,
        userId:    user?.id,
        userRole:  user?.role?.toUpperCase(),
        userOrg:   'POLICE',
      });

      if (uploadResp?.evidence) {
        // Update local record with remote URL
        await DB.upsertLocalEvidence({
          evidence_id:    evidenceId,
          case_id:        caseId,
          name:           newEvidence.name || 'Evidence',
          file_name:      newEvidence.name || 'evidence',
          type:           (newEvidence.type || 'IMAGE').toUpperCase(),
          local_file_uri: newEvidence.uri || '',
          remote_file_url: uploadResp.evidence.file_url || uploadResp.evidence.uri,
          file_hash:      hash,
          metadata_hash:  '',
          sync_status:    'SYNCED',
          created_at:     now,
          updated_at:     new Date().toISOString(),
        });
      }
    } catch (err: any) {
      if (err?.status) {
        // Server responded and rejected the upload (e.g. bad evidence type,
        // stale session) — not a connectivity issue, so the caller must know
        // this attempt failed rather than showing a false "Success".
        console.log('[updateCaseEvidence] Server rejected upload:', err.status, err.message);
        throw err;
      }
      // No response at all — genuine offline/network failure; stays queued for the sync worker
      console.log('[updateCaseEvidence] Offline, queued:', err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppContext.Provider value={{
      user, setUser, users, token, registerUser, logout,
      cases, addCase, updateCaseEvidence, loading, error,
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within an AppProvider');
  return context;
};

// ─── SHAPE MAPPERS ────────────────────────────────────────────────────────────

function mapLocalCaseToCase(row: any): Case {
  return {
    caseId:          row.caseId || row.case_id,
    title:           row.title,
    description:     row.description || '',
    status:          normalizeCaseStatus(row.status),
    officer:         row.officer || row.officer_name || row.current_custodian_name || row.custodian_name || '',
    timestamp:       row.timestamp || row.created_at || row.incident_timestamp || new Date().toISOString(),
    location:        row.location || '',
    blockchainHash:  row.blockchainHash || row.blockchain_hash || 'pending',
    evidence:        Array.isArray(row.evidence) ? row.evidence : [],
  };
}

function mapCaseToLocal(c: any) {
  return {
    case_id:        c.caseId || c.case_id,
    title:          c.title,
    description:    c.description || '',
    status:         normalizeCaseStatus(c.status),
    location:       c.location || '',
    officer_name:   c.officer || c.officer_name || c.current_custodian_name || c.custodian_name || null,
    blockchain_hash: c.blockchainHash || c.blockchain_hash || 'pending',
    sync_status:    c.sync_status || 'SYNCED',
    version:        c.version || 1,
    created_at:     c.timestamp || c.created_at || new Date().toISOString(),
    updated_at:     c.updated_at || new Date().toISOString(),
  };
}