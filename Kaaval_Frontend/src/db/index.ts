/**
 * src/db/index.ts
 *
 * Opens the local SQLite database, runs all CREATE TABLE IF NOT EXISTS
 * statements on startup, and exports typed CRUD helper functions used
 * by AppContext and the sync engine.
 *
 * Sensitive fields are transparently encrypted/decrypted via encryption.ts.
 */

import * as SQLite from 'expo-sqlite';
import { ALL_SCHEMAS } from './schema';
import { encryptEvidenceFields, decryptEvidenceFields } from './encryption';

const DB_NAME = 'kaaval_local.db';

let _db: SQLite.SQLiteDatabase | null = null;

/** Open (or reuse) the database and run schema migrations */
export async function openDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (_db) return _db;
  _db = await SQLite.openDatabaseAsync(DB_NAME);
  try {
    // Enable WAL mode for better concurrent read performance
    await _db.execAsync('PRAGMA journal_mode = WAL;');
  } catch (e) {
    console.warn('[SQLite] WAL pragma skipped:', e);
  }
  // Run all CREATE TABLE IF NOT EXISTS statements
  for (const ddl of ALL_SCHEMAS) {
    await _db.execAsync(ddl);
  }
  return _db;
}

// ─── LOCAL CASES ─────────────────────────────────────────────────────────────

export async function getAllLocalCases(): Promise<any[]> {
  const db = await openDatabase();
  return db.getAllAsync(`SELECT * FROM local_cases ORDER BY updated_at DESC`);
}

export async function upsertLocalCase(c: {
  case_id: string;
  title: string;
  description?: string;
  status?: string;
  location?: string;
  officer_name?: string;
  blockchain_hash?: string;
  sync_status?: string;
  version?: number;
  created_at: string;
  updated_at: string;
}): Promise<void> {
  const db = await openDatabase();
  await db.runAsync(
    `INSERT INTO local_cases
       (case_id, title, description, status, location, officer_name,
        blockchain_hash, sync_status, version, created_at, updated_at)
     VALUES (?,?,?,?,?,?,?,?,?,?,?)
     ON CONFLICT(case_id) DO UPDATE SET
       title         = excluded.title,
       description   = excluded.description,
       status        = excluded.status,
       location      = excluded.location,
       officer_name  = excluded.officer_name,
       blockchain_hash = excluded.blockchain_hash,
       sync_status   = excluded.sync_status,
       version       = excluded.version,
       updated_at    = excluded.updated_at`,
    [
      c.case_id, c.title, c.description || '', c.status || 'OPEN',
      c.location || '', c.officer_name || null, c.blockchain_hash || 'pending',
      c.sync_status || 'SYNCED', c.version ?? 1, c.created_at, c.updated_at,
    ]
  );
}

// ─── LOCAL EVIDENCE ───────────────────────────────────────────────────────────

export async function getEvidenceForCase(caseId: string): Promise<any[]> {
  const db = await openDatabase();
  const rows = await db.getAllAsync<any>(
    `SELECT * FROM local_evidence WHERE case_id = ? ORDER BY created_at ASC`,
    [caseId]
  );
  // Decrypt sensitive fields on the way out
  return Promise.all(rows.map((row: any) => decryptEvidenceFields(row)));
}

export async function upsertLocalEvidence(ev: {
  evidence_id: string;
  case_id: string;
  name: string;
  file_name?: string;
  type?: string;
  local_file_uri: string;
  remote_file_url?: string;
  file_hash: string;
  metadata_hash: string;
  classification?: string;
  integrity_status?: string;
  risk_level?: string;
  collected_location?: string;
  collected_timestamp?: string;
  sync_status?: string;
  created_at: string;
  updated_at: string;
}): Promise<void> {
  const db   = await openDatabase();
  const safe = await encryptEvidenceFields(ev);   // encrypt sensitive fields
  await db.runAsync(
    `INSERT INTO local_evidence
       (evidence_id, case_id, name, file_name, type, local_file_uri, remote_file_url,
        file_hash, metadata_hash, classification, integrity_status, risk_level,
        collected_location, collected_timestamp, sync_status, created_at, updated_at)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
     ON CONFLICT(evidence_id) DO UPDATE SET
       remote_file_url    = excluded.remote_file_url,
       integrity_status   = excluded.integrity_status,
       sync_status        = excluded.sync_status,
       updated_at         = excluded.updated_at`,
    [
      safe.evidence_id, safe.case_id, safe.name, safe.file_name || '',
      safe.type || 'IMAGE', safe.local_file_uri, safe.remote_file_url || null,
      safe.file_hash, safe.metadata_hash,
      safe.classification || 'SECONDARY', safe.integrity_status || 'UNVERIFIED',
      safe.risk_level || 'LOW',
      safe.collected_location || null, safe.collected_timestamp || null,
      safe.sync_status || 'PENDING_UPLOAD',
      safe.created_at, safe.updated_at,
    ]
  );
}

// ─── LOCAL USERS ─────────────────────────────────────────────────────────────

export async function upsertLocalUser(u: {
  user_id: string;
  username: string;
  name: string;
  role: string;
  designation?: string;
  badge_number?: string;
  profile_image_url?: string;
  org_msp?: string;
}): Promise<void> {
  const db = await openDatabase();
  await db.runAsync(
    `INSERT INTO local_users
       (user_id, username, name, role, designation, badge_number, profile_image_url, org_msp)
     VALUES (?,?,?,?,?,?,?,?)
     ON CONFLICT(user_id) DO UPDATE SET
       name = excluded.name, role = excluded.role,
       designation = excluded.designation, profile_image_url = excluded.profile_image_url`,
    [
      u.user_id, u.username, u.name, u.role,
      u.designation || '', u.badge_number || null,
      u.profile_image_url || null, u.org_msp || 'Org1MSP',
    ]
  );
}

export async function getLocalUser(userId: string): Promise<any | null> {
  const db = await openDatabase();
  return db.getFirstAsync(`SELECT * FROM local_users WHERE user_id = ?`, [userId]);
}

// ─── SYNC QUEUE ───────────────────────────────────────────────────────────────

export async function enqueue(item: {
  entityType: string;
  entityId: string;
  actionType: string;
  payload: object;
}): Promise<void> {
  const db = await openDatabase();
  await db.runAsync(
    `INSERT INTO sync_queue (entity_type, entity_id, action_type, payload_json, created_at)
     VALUES (?,?,?,?,?)`,
    [item.entityType, item.entityId, item.actionType,
     JSON.stringify(item.payload), new Date().toISOString()]
  );
}

export async function getPendingQueueItems(): Promise<any[]> {
  const db = await openDatabase();
  return db.getAllAsync(
    `SELECT * FROM sync_queue WHERE status = 'PENDING' ORDER BY queue_id ASC`
  );
}

export async function markQueueItemStatus(
  queueId: number, status: 'COMPLETED' | 'FAILED', error?: string
): Promise<void> {
  const db = await openDatabase();
  await db.runAsync(
    `UPDATE sync_queue
     SET status = ?, error_message = ?, attempt_count = attempt_count + 1
     WHERE queue_id = ?`,
    [status, error || null, queueId]
  );
}

// ─── LOCAL AUDIT LOGS ─────────────────────────────────────────────────────────

export async function insertLocalAudit(log: {
  log_id: string;
  case_id?: string;
  evidence_id?: string;
  action: string;
  user_id: string;
  user_role: string;
  result?: string;
  metadata_hash: string;
}): Promise<void> {
  const db = await openDatabase();
  await db.runAsync(
    `INSERT INTO local_audit_logs
       (log_id, case_id, evidence_id, action, user_id, user_role, timestamp, result, metadata_hash)
     VALUES (?,?,?,?,?,?,?,?,?)
     ON CONFLICT(log_id) DO NOTHING`,
    [
      log.log_id, log.case_id || null, log.evidence_id || null,
      log.action, log.user_id, log.user_role,
      new Date().toISOString(), log.result || 'SUCCESS', log.metadata_hash,
    ]
  );
}
