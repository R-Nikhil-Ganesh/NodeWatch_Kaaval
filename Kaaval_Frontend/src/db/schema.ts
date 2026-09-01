/**
 * src/db/schema.ts
 *
 * DDL statements for all local SQLite tables on the mobile device.
 * Tables mirror the central PostgreSQL schema but are simplified
 * for field use and include sync_status tracking columns.
 *
 * Encryption: sensitive text fields are encrypted at the application
 * layer (see encryption.ts) before being written and decrypted after
 * being read.
 */

export const CREATE_LOCAL_CASES = `
  CREATE TABLE IF NOT EXISTS local_cases (
    case_id              TEXT    PRIMARY KEY,
    title                TEXT    NOT NULL,
    description          TEXT    NOT NULL DEFAULT '',
    status               TEXT    NOT NULL DEFAULT 'OPEN',
    location             TEXT    NOT NULL DEFAULT '',
    officer_name         TEXT,
    blockchain_hash      TEXT    NOT NULL DEFAULT 'pending',
    version              INTEGER NOT NULL DEFAULT 1,
    -- sync_status tracks whether this row needs to be pushed to the central server
    -- Values: 'SYNCED' | 'PENDING_CREATE' | 'PENDING_UPDATE'
    sync_status          TEXT    NOT NULL DEFAULT 'SYNCED',
    created_at           TEXT    NOT NULL,
    updated_at           TEXT    NOT NULL
  );
`;

export const CREATE_LOCAL_EVIDENCE = `
  CREATE TABLE IF NOT EXISTS local_evidence (
    evidence_id          TEXT    PRIMARY KEY,
    case_id              TEXT    NOT NULL,
    name                 TEXT    NOT NULL,
    file_name            TEXT    NOT NULL DEFAULT '',
    type                 TEXT    NOT NULL DEFAULT 'IMAGE',
    -- local_file_uri: expo-file-system path to the raw media file on this device
    local_file_uri       TEXT    NOT NULL,
    -- remote_file_url: filled once the file has been successfully uploaded
    remote_file_url      TEXT,
    -- Hashes — encrypted at rest, decrypted on read
    file_hash            TEXT    NOT NULL DEFAULT '',
    metadata_hash        TEXT    NOT NULL DEFAULT '',
    classification       TEXT    NOT NULL DEFAULT 'SECONDARY',
    integrity_status     TEXT    NOT NULL DEFAULT 'UNVERIFIED',
    risk_level           TEXT    NOT NULL DEFAULT 'LOW',
    collected_location   TEXT,
    collected_timestamp  TEXT,
    -- sync_status tracks upload progress
    -- Values: 'PENDING_UPLOAD' | 'UPLOADING' | 'SYNCED' | 'FAILED'
    sync_status          TEXT    NOT NULL DEFAULT 'PENDING_UPLOAD',
    sync_retry_count     INTEGER NOT NULL DEFAULT 0,
    created_at           TEXT    NOT NULL,
    updated_at           TEXT    NOT NULL,
    FOREIGN KEY (case_id) REFERENCES local_cases(case_id)
  );
`;

// Minimal user profile stored locally so the app can show user info offline.
// No password stored — the JWT in expo-secure-store is the credential.
export const CREATE_LOCAL_USERS = `
  CREATE TABLE IF NOT EXISTS local_users (
    user_id              TEXT PRIMARY KEY,
    username             TEXT NOT NULL,
    name                 TEXT NOT NULL,
    role                 TEXT NOT NULL,
    designation          TEXT NOT NULL DEFAULT '',
    badge_number         TEXT,
    profile_image_url    TEXT,
    org_msp              TEXT NOT NULL DEFAULT 'Org1MSP'
  );
`;

// Outbox for offline mutations — every write to local DB adds a row here.
// The sync worker reads PENDING rows and flushes them to Kaaval_Backend.
export const CREATE_SYNC_QUEUE = `
  CREATE TABLE IF NOT EXISTS sync_queue (
    queue_id      INTEGER PRIMARY KEY AUTOINCREMENT,
    entity_type   TEXT    NOT NULL,   -- 'CASE' | 'EVIDENCE' | 'AUDIT'
    entity_id     TEXT    NOT NULL,
    action_type   TEXT    NOT NULL,   -- 'CREATE' | 'UPDATE' | 'VERIFY'
    payload_json  TEXT    NOT NULL,
    status        TEXT    NOT NULL DEFAULT 'PENDING',  -- 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED'
    error_message TEXT,
    attempt_count INTEGER NOT NULL DEFAULT 0,
    created_at    TEXT    NOT NULL
  );
`;

export const CREATE_LOCAL_AUDIT = `
  CREATE TABLE IF NOT EXISTS local_audit_logs (
    log_id        TEXT    PRIMARY KEY,
    case_id       TEXT,
    evidence_id   TEXT,
    action        TEXT    NOT NULL,
    user_id       TEXT    NOT NULL,
    user_role     TEXT    NOT NULL,
    timestamp     TEXT    NOT NULL,
    result        TEXT    NOT NULL DEFAULT 'SUCCESS',
    metadata_hash TEXT    NOT NULL DEFAULT '',
    -- sync_status: 'PENDING_SYNC' | 'SYNCED'
    sync_status   TEXT    NOT NULL DEFAULT 'PENDING_SYNC'
  );
`;

// All DDL statements in creation order (respects foreign keys)
export const ALL_SCHEMAS = [
  CREATE_LOCAL_USERS,
  CREATE_LOCAL_CASES,
  CREATE_LOCAL_EVIDENCE,
  CREATE_SYNC_QUEUE,
  CREATE_LOCAL_AUDIT,
];
