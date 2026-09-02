-- =============================================================
-- Kaaval / NodeWatch Chain of Custody — PostgreSQL Schema
-- Run once against an empty database.
-- To re-run cleanly: DROP SCHEMA public CASCADE; CREATE SCHEMA public;
-- =============================================================

-- ----- ENUMs -----

CREATE TYPE user_role AS ENUM ('ADMIN', 'POLICE', 'FORENSICS', 'LEGAL');

CREATE TYPE case_status AS ENUM (
  'OPEN',
  'UNDER_INVESTIGATION',
  'SUBMITTED_TO_COURT',
  'CLOSED',
  'FROZEN'
);

CREATE TYPE evidence_type AS ENUM (
  'IMAGE',
  'VIDEO',
  'AUDIO',
  'PDF',
  'WORD',
  'PHYSICAL',
  'DISK_IMAGE'
);

CREATE TYPE evidence_classification AS ENUM ('PRIMARY', 'SECONDARY');

CREATE TYPE integrity_status AS ENUM (
  'NOT_CHECKED',
  'UNVERIFIED',
  'VERIFIED',
  'COMPROMISED',
  'PENDING'
);

CREATE TYPE risk_level AS ENUM ('LOW', 'MEDIUM', 'HIGH');

CREATE TYPE transfer_status AS ENUM (
  'REQUESTED',
  'ACCEPTED',
  'REJECTED',
  'CANCELLED'
);

CREATE TYPE document_type AS ENUM (
  'FIR',
  'WARRANT',
  'COURT_ORDER',
  'CHARGE_SHEET',
  'LAB_REPORT'
);

CREATE TYPE outbox_status AS ENUM (
  'PENDING',
  'PROCESSING',
  'CONFIRMED',
  'FAILED'
);

-- ----- USERS -----
-- Merged from backend_web/src/data.js and Kaaval_Frontend/src/data/mockData.ts.
-- Passwords stored as bcrypt hashes only — never plaintext.

CREATE TABLE users (
  user_id           VARCHAR(50)  PRIMARY KEY,
  username          VARCHAR(50)  UNIQUE NOT NULL,
  email             VARCHAR(100) UNIQUE NOT NULL,
  password_hash     VARCHAR(255) NOT NULL,
  name              VARCHAR(100) NOT NULL,
  role              user_role    NOT NULL,
  designation       VARCHAR(100) NOT NULL DEFAULT '',
  badge_number      VARCHAR(50),
  org_msp           VARCHAR(50)  NOT NULL DEFAULT 'Org1MSP',
  profile_image_url TEXT,
  is_active         BOOLEAN      NOT NULL DEFAULT TRUE,
  created_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- ----- CASES -----

CREATE TABLE cases (
  case_id                VARCHAR(50)  PRIMARY KEY,
  title                  VARCHAR(255) NOT NULL,
  description            TEXT         NOT NULL DEFAULT '',
  status                 case_status  NOT NULL DEFAULT 'OPEN',
  location               VARCHAR(255) NOT NULL DEFAULT 'Unspecified',
  incident_timestamp     TIMESTAMPTZ,
  created_by_user_id     VARCHAR(50)  REFERENCES users(user_id),
  current_custodian_id   VARCHAR(50)  REFERENCES users(user_id),
  -- Denormalised custodian name kept for display when user is deleted / external
  current_custodian_name VARCHAR(100),
  assigned_forensics_id  VARCHAR(50)  REFERENCES users(user_id),
  blockchain_hash        VARCHAR(128) NOT NULL DEFAULT 'pending',
  blockchain_tx_id       VARCHAR(128),
  version                INTEGER      NOT NULL DEFAULT 1,
  is_deleted             BOOLEAN      NOT NULL DEFAULT FALSE,
  created_at             TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at             TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_cases_status     ON cases(status);
CREATE INDEX idx_cases_created_by ON cases(created_by_user_id);

-- ----- EVIDENCE -----

CREATE TABLE evidence (
  evidence_id            VARCHAR(50)               PRIMARY KEY,
  case_id                VARCHAR(50)               NOT NULL REFERENCES cases(case_id) ON DELETE CASCADE,
  name                   VARCHAR(255)              NOT NULL,
  file_name              VARCHAR(255)              NOT NULL,
  type                   evidence_type             NOT NULL DEFAULT 'IMAGE',
  mime_type              VARCHAR(100),
  file_size_bytes        BIGINT,
  file_url               TEXT                      NOT NULL DEFAULT '',
  -- Cryptographic proofs
  file_hash              VARCHAR(64)               NOT NULL DEFAULT '',
  metadata_hash          VARCHAR(64)               NOT NULL DEFAULT '',
  source_hash            VARCHAR(64),
  lifting_video_url      TEXT,
  lifting_video_hash     VARCHAR(64),
  -- Legal classification and state
  classification         evidence_classification   NOT NULL DEFAULT 'SECONDARY',
  risk_level             risk_level                NOT NULL DEFAULT 'LOW',
  integrity_status       integrity_status          NOT NULL DEFAULT 'UNVERIFIED',
  last_verified_at       TIMESTAMPTZ,
  approved_for_legal     BOOLEAN                   NOT NULL DEFAULT FALSE,
  section63_cert_id      UUID,                     -- FK added after section63_certificates table
  notes                  TEXT,
  -- Ownership
  uploaded_by            VARCHAR(50)               REFERENCES users(user_id),
  current_custodian_id   VARCHAR(50)               REFERENCES users(user_id),
  current_custodian_name VARCHAR(100),             -- Denormalised for display
  owner_msp              VARCHAR(50)               NOT NULL DEFAULT 'Org1MSP',
  transfer_target_msp    VARCHAR(50),
  -- Collection metadata
  collected_location     VARCHAR(255),
  collected_timestamp    TIMESTAMPTZ               NOT NULL DEFAULT NOW(),
  -- Links to other evidence items
  linked_evidence_ids    JSONB                     NOT NULL DEFAULT '[]',
  -- Blockchain anchoring
  blockchain_tx_id       VARCHAR(128),
  on_chain_status        VARCHAR(50)               NOT NULL DEFAULT 'PENDING',
  -- Sync tracking
  version                INTEGER                   NOT NULL DEFAULT 1,
  is_deleted             BOOLEAN                   NOT NULL DEFAULT FALSE,
  created_at             TIMESTAMPTZ               NOT NULL DEFAULT NOW(),
  updated_at             TIMESTAMPTZ               NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_evidence_case_id   ON evidence(case_id);
CREATE INDEX idx_evidence_file_hash ON evidence(file_hash);
CREATE INDEX idx_evidence_status    ON evidence(integrity_status);

-- ----- EVIDENCE VISIBILITY -----
-- Granular per-evidence access controls used by the web dashboard.

CREATE TABLE evidence_visibility (
  evidence_id          VARCHAR(50) PRIMARY KEY REFERENCES evidence(evidence_id) ON DELETE CASCADE,
  is_restricted        BOOLEAN     NOT NULL DEFAULT FALSE,
  allowed_roles        JSONB       NOT NULL DEFAULT '[]',       -- e.g. ["POLICE","LEGAL"]
  allowed_designations JSONB       NOT NULL DEFAULT '[]',       -- e.g. ["District Judge"]
  allowed_user_ids     JSONB       NOT NULL DEFAULT '[]',
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ----- EVIDENCE-LEVEL CUSTODY TRANSFERS (Fabric 2-step) -----

CREATE TABLE custody_transfers (
  transfer_id      UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
  evidence_id      VARCHAR(50)    NOT NULL REFERENCES evidence(evidence_id),
  case_id          VARCHAR(50)    NOT NULL REFERENCES cases(case_id),
  from_user_id     VARCHAR(50)    REFERENCES users(user_id),
  from_msp         VARCHAR(50)    NOT NULL,
  to_user_id       VARCHAR(50)    REFERENCES users(user_id),
  to_msp           VARCHAR(50)    NOT NULL,
  status           transfer_status NOT NULL DEFAULT 'REQUESTED',
  notes            TEXT,
  requested_at     TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
  accepted_at      TIMESTAMPTZ,
  blockchain_tx_id VARCHAR(128)
);

-- ----- CASE-LEVEL CUSTODY TRANSFERS (web app officer handoffs) -----

CREATE TABLE case_custody_transfers (
  transfer_id       UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id           VARCHAR(50) NOT NULL REFERENCES cases(case_id),
  from_user_id      VARCHAR(50) REFERENCES users(user_id),
  to_user_id        VARCHAR(50) REFERENCES users(user_id),
  to_custodian_name VARCHAR(100),
  to_role           VARCHAR(50),
  notes             TEXT,
  transferred_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ----- BSA SECTION 63 CERTIFICATES -----

CREATE TABLE section63_certificates (
  certificate_id         UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  certificate_ref        VARCHAR(100) UNIQUE NOT NULL,
  evidence_id            VARCHAR(50)  NOT NULL REFERENCES evidence(evidence_id),
  case_id                VARCHAR(50)  NOT NULL REFERENCES cases(case_id),
  issued_by_user_id      VARCHAR(50)  NOT NULL REFERENCES users(user_id),
  certifying_designation VARCHAR(100) NOT NULL DEFAULT '',
  device_specification   TEXT,
  hash_algorithm         VARCHAR(20)  NOT NULL DEFAULT 'SHA-256',
  verified_hash          VARCHAR(64)  NOT NULL,
  certificate_pdf_url    TEXT,
  issued_at              TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- Now that section63_certificates exists, add the FK on evidence
ALTER TABLE evidence
  ADD CONSTRAINT fk_evidence_section63
  FOREIGN KEY (section63_cert_id) REFERENCES section63_certificates(certificate_id);

-- ----- CASE DOCUMENTS -----

CREATE TABLE case_documents (
  document_id         UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id             VARCHAR(50)   NOT NULL REFERENCES cases(case_id) ON DELETE CASCADE,
  title               VARCHAR(255)  NOT NULL,
  type                document_type NOT NULL,
  description         TEXT,
  file_url            TEXT,
  file_hash           VARCHAR(64),
  uploaded_by         VARCHAR(50)   REFERENCES users(user_id),
  linked_evidence_ids JSONB         NOT NULL DEFAULT '[]',
  created_at          TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_case_documents_case_id ON case_documents(case_id);

-- ----- UNIFIED AUDIT LOGS -----
-- Merges Kaaval_Backend SQLite audit_trail.db and backend_web in-memory state.logs.
-- 'source' column distinguishes mobile-originated vs web-originated events.

CREATE TABLE audit_logs (
  log_id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id              VARCHAR(50) REFERENCES cases(case_id),
  evidence_id          VARCHAR(50) REFERENCES evidence(evidence_id),
  action               VARCHAR(50) NOT NULL,
  user_id              VARCHAR(50) REFERENCES users(user_id),
  user_role            VARCHAR(50),
  user_org             VARCHAR(50),
  timestamp            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  result               VARCHAR(50) NOT NULL DEFAULT 'SUCCESS',
  detail_hash          VARCHAR(64),
  detail_file_name     VARCHAR(255),
  detail_file_type     VARCHAR(50),
  detail_file_uri      TEXT,
  detail_location      VARCHAR(255),
  detail_title         VARCHAR(255),
  detail_officer       VARCHAR(100),
  detail_metadata_hash VARCHAR(64),
  -- Deterministic tamper-evident digest of the entire row (computed on insert)
  metadata_hash        VARCHAR(64) NOT NULL DEFAULT '',
  blockchain_tx_id     VARCHAR(128),
  source               VARCHAR(10) NOT NULL DEFAULT 'WEB'  -- 'WEB' | 'MOBILE'
);

CREATE INDEX idx_audit_logs_timestamp   ON audit_logs(timestamp DESC);
CREATE INDEX idx_audit_logs_case        ON audit_logs(case_id);
CREATE INDEX idx_audit_logs_evidence    ON audit_logs(evidence_id);
CREATE INDEX idx_audit_logs_user        ON audit_logs(user_id);

-- ----- BLOCKCHAIN TRANSACTIONAL OUTBOX -----
-- Guarantees reliable, asynchronous delivery of evidence lifecycle events to Hyperledger Fabric.

CREATE TABLE blockchain_outbox (
  outbox_id        UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type       VARCHAR(50)    NOT NULL, -- 'CREATE_EVIDENCE', 'TRANSFER_INITIATE', 'TRANSFER_ACCEPT', 'FORENSIC_VERIFY', 'INTEGRITY_FLAG', 'COURT_SUBMIT'
  entity_id        VARCHAR(100)   NOT NULL, -- evidence_id or case_id
  case_id          VARCHAR(50),
  payload          JSONB          NOT NULL,
  status           outbox_status  NOT NULL DEFAULT 'PENDING',
  attempt_count    INTEGER        NOT NULL DEFAULT 0,
  last_error       TEXT,
  blockchain_tx_id VARCHAR(128),
  created_at       TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
  processed_at     TIMESTAMPTZ
);

CREATE INDEX idx_outbox_status_created ON blockchain_outbox(status, created_at ASC);
CREATE INDEX idx_outbox_entity         ON blockchain_outbox(entity_id);
