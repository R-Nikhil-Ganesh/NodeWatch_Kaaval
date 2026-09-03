# PostgreSQL Database Schema Specification

> **Database Engine:** PostgreSQL 16 (Alpine)  
> **Schema File:** [`backend/src/db/schema.sql`](file:///d:/chain_of_custody/backend/src/db/schema.sql)  
> **Docker Port:** `5433` (Host) $\rightarrow$ `5432` (Container)  
> **Database Name:** `kaaval_db`

---

## 1. Custom PostgreSQL ENUM Types

```sql
CREATE TYPE user_role AS ENUM (
    'ADMIN', 'POLICE', 'FORENSICS', 'LEGAL'
);

CREATE TYPE case_status AS ENUM (
    'OPEN', 'UNDER_INVESTIGATION', 'SUBMITTED_TO_COURT', 'CLOSED', 'FROZEN'
);

CREATE TYPE evidence_type AS ENUM (
    'IMAGE', 'PDF', 'WORD', 'PHYSICAL', 'VIDEO', 'AUDIO', 'OTHER'
);

CREATE TYPE evidence_classification AS ENUM (
    'PRIMARY', 'SECONDARY'
);

CREATE TYPE integrity_status AS ENUM (
    'VERIFIED', 'COMPROMISED', 'NOT_CHECKED', 'PENDING'
);

CREATE TYPE risk_level AS ENUM (
    'LOW', 'MEDIUM', 'HIGH', 'CRITICAL'
);

CREATE TYPE transfer_status AS ENUM (
    'INITIATED', 'ACCEPTED', 'REJECTED'
);

CREATE TYPE document_type AS ENUM (
    'FIR', 'CHARGE_SHEET', 'FORENSIC_REPORT', 'COURT_ORDER', 'SEIZURE_MEMO', 'OTHER'
);

CREATE TYPE outbox_status AS ENUM (
    'PENDING', 'PROCESSING', 'CONFIRMED', 'FAILED'
);
```

---

## 2. Table Definitions

### 1. `users`
Manages officer, analyst, and judicial identities with organizational MSP bindings.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `user_id` | `VARCHAR(64)` | `PRIMARY KEY` | User identifier (e.g. `u_police_1`) |
| `username` | `VARCHAR(128)` | `UNIQUE NOT NULL` | Login username |
| `email` | `VARCHAR(255)` | `UNIQUE NOT NULL` | Official email |
| `password_hash` | `VARCHAR(255)` | `NOT NULL` | bcrypt hashed password |
| `name` | `VARCHAR(255)` | `NOT NULL` | Full legal name |
| `role` | `user_role` | `NOT NULL` | Application role (`POLICE`, `FORENSICS`, etc.) |
| `designation` | `VARCHAR(255)` | — | Official title (e.g. *Inspector of Police*) |
| `badge_number` | `VARCHAR(64)` | — | Police badge number (e.g. *TN-PD-402*) |
| `org_msp` | `VARCHAR(64)` | `NOT NULL DEFAULT 'Org1MSP'` | Mapped Hyperledger Fabric MSP identity |
| `profile_image_url`| `TEXT` | — | Profile picture URL |
| `is_active` | `BOOLEAN` | `DEFAULT TRUE` | Account status flag |
| `created_at` | `TIMESTAMPTZ` | `DEFAULT NOW()` | Record creation timestamp |
| `updated_at` | `TIMESTAMPTZ` | `DEFAULT NOW()` | Last update timestamp |

---

### 2. `cases`
Master case registry.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `case_id` | `VARCHAR(64)` | `PRIMARY KEY` | Case number (e.g. `CASE-2024-001`) |
| `title` | `VARCHAR(255)` | `NOT NULL` | Case title |
| `description` | `TEXT` | — | Detailed narrative |
| `status` | `case_status` | `DEFAULT 'OPEN'` | Workflow state |
| `location` | `VARCHAR(255)` | — | Incident location |
| `incident_timestamp`| `TIMESTAMPTZ` | — | Incident timestamp |
| `created_by_user_id`| `VARCHAR(64)` | `REFERENCES users` | First responding officer |
| `current_custodian_id`| `VARCHAR(64)` | `REFERENCES users` | Current custodian user ID |
| `current_custodian_name`| `VARCHAR(255)` | — | Denormalized custodian name |
| `assigned_forensics_id`| `VARCHAR(64)` | `REFERENCES users` | Assigned FSL analyst |
| `blockchain_hash` | `VARCHAR(255)` | — | Summary hash reference |
| `blockchain_tx_id` | `VARCHAR(255)` | — | Fabric transaction anchor ID |
| `version` | `INT` | `DEFAULT 1` | Optimistic locking version counter |
| `is_deleted` | `BOOLEAN` | `DEFAULT FALSE` | Soft delete flag |

---

### 3. `evidence`
Primary digital and physical evidence records.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `evidence_id` | `VARCHAR(64)` | `PRIMARY KEY` | Evidence identifier |
| `case_id` | `VARCHAR(64)` | `REFERENCES cases` | Parent case ID |
| `name` | `VARCHAR(255)` | `NOT NULL` | Evidence title |
| `file_name` | `VARCHAR(255)` | `NOT NULL` | File name on disk / MinIO |
| `type` | `evidence_type` | `DEFAULT 'IMAGE'` | Evidence medium |
| `mime_type` | `VARCHAR(128)` | — | MIME content type |
| `file_size_bytes` | `BIGINT` | — | Size in bytes |
| `file_url` | `TEXT` | — | Object storage URI (`minio://...`) |
| `file_hash` | `VARCHAR(255)` | `NOT NULL` | SHA-256 binary hash |
| `metadata_hash` | `VARCHAR(255)` | — | SHA-256 metadata digest |
| `source_hash` | `VARCHAR(255)` | — | At-capture mobile hash |
| `lifting_video_url` | `TEXT` | — | Seizure process video URL |
| `lifting_video_hash`| `VARCHAR(255)` | — | Seizure video SHA-256 hash |
| `classification` | `evidence_classification` | `DEFAULT 'SECONDARY'` | Primary vs Secondary (BSA 2023) |
| `risk_level` | `risk_level` | `DEFAULT 'LOW'` | Evidence security risk |
| `integrity_status` | `integrity_status` | `DEFAULT 'NOT_CHECKED'` | Verification status |
| `last_verified_at` | `TIMESTAMPTZ` | — | Last scientific check |
| `approved_for_legal`| `BOOLEAN` | `DEFAULT FALSE` | Trial admissibility approval flag |
| `section63_cert_id` | `UUID` | `REFERENCES section63_certificates` | Attached BSA Section 63 Certificate |
| `on_chain_status` | `VARCHAR(64)` | `DEFAULT 'NOT_REGISTERED'` | State on Hyperledger Fabric |
| `blockchain_tx_id` | `VARCHAR(255)` | — | Ledger transaction ID |

---

### 4. `blockchain_outbox`
Guarantees transactional consistency between PostgreSQL mutations and Hyperledger Fabric transactions.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `outbox_id` | `UUID` | `PRIMARY KEY DEFAULT gen_random_uuid()` | Unique outbox event UUID |
| `event_type` | `VARCHAR(64)` | `NOT NULL` | `CREATE_EVIDENCE`, `TRANSFER_INITIATE`, `FORENSIC_VERIFY`, `COURT_SUBMIT`, etc. |
| `entity_id` | `VARCHAR(64)` | `NOT NULL` | Target evidence or case ID |
| `case_id` | `VARCHAR(64)` | — | Associated case ID |
| `payload` | `JSONB` | `NOT NULL` | Arguments serialized for smart contract |
| `status` | `outbox_status` | `DEFAULT 'PENDING'` | `PENDING`, `PROCESSING`, `CONFIRMED`, `FAILED` |
| `attempt_count` | `INT` | `DEFAULT 0` | Retry counter |
| `last_error` | `TEXT` | — | Diagnostic failure reason |
| `blockchain_tx_id` | `VARCHAR(255)` | — | Committed transaction ID |
| `created_at` | `TIMESTAMPTZ` | `DEFAULT NOW()` | Enqueue timestamp |
| `processed_at` | `TIMESTAMPTZ` | — | Ledger confirmation timestamp |

---

### 5. `audit_logs`
Immutable tamper-evident system audit trail.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `log_id` | `UUID` | `PRIMARY KEY DEFAULT gen_random_uuid()` | Audit log UUID |
| `case_id` | `VARCHAR(64)` | `REFERENCES cases ON DELETE SET NULL` | Linked case (nullable for global actions) |
| `evidence_id` | `VARCHAR(64)` | `REFERENCES evidence ON DELETE SET NULL`| Linked evidence |
| `action` | `VARCHAR(64)` | `NOT NULL` | `LOGIN`, `UPLOAD`, `VERIFY`, `APPROVE`, `TRANSFER_CUSTODY`, `ISSUE_CERT` |
| `user_id` | `VARCHAR(64)` | `REFERENCES users ON DELETE SET NULL` | Performing user ID |
| `user_role` | `user_role` | — | Actor role |
| `user_org` | `VARCHAR(64)` | `DEFAULT 'PoliceMSP'` | Actor MSP |
| `result` | `VARCHAR(32)` | `DEFAULT 'SUCCESS'` | `SUCCESS`, `MATCH`, `MISMATCH`, `FLAGGED` |
| `source` | `VARCHAR(16)` | `DEFAULT 'WEB'` | `WEB` or `MOBILE` |
| `metadata_hash` | `VARCHAR(255)` | — | Deterministic SHA-256 digest of log details |
| `timestamp` | `TIMESTAMPTZ` | `DEFAULT NOW()` | Timestamp |

---

## 3. Database Indexes

```sql
CREATE INDEX idx_cases_status ON cases(status);
CREATE INDEX idx_cases_created_by ON cases(created_by_user_id);
CREATE INDEX idx_evidence_case_id ON evidence(case_id);
CREATE INDEX idx_evidence_file_hash ON evidence(file_hash);
CREATE INDEX idx_evidence_status ON evidence(integrity_status);
CREATE INDEX idx_outbox_status_created ON blockchain_outbox(status, created_at);
CREATE INDEX idx_outbox_entity ON blockchain_outbox(entity_id);
CREATE INDEX idx_audit_logs_timestamp ON audit_logs(timestamp DESC);
CREATE INDEX idx_audit_logs_case ON audit_logs(case_id);
```
