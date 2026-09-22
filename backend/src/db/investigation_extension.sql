-- =============================================================
-- Investigation / Police-portal domain — additive schema extension.
-- Backs the Investigating Officer (IO) views: case triage, evidence
-- storage + forensic tracking, chain-of-custody timeline, and alerts.
--
-- Every statement is idempotent (IF NOT EXISTS) so this file is applied
-- on every server start alongside legal_extension.sql and
-- priority_extension.sql without disturbing existing domains.
-- =============================================================

-- ----- CASE STATUS: IO workflow sub-states -----
-- The police workflow distinguishes two stages that the court-side
-- pipeline collapses into UNDER_INVESTIGATION: waiting on the FSL, and
-- compiling the Sec 173 CrPC charge sheet. Added as first-class enum
-- values so a single `status` column stays the source of truth for
-- every portal rather than each one keeping its own copy.
ALTER TYPE case_status ADD VALUE IF NOT EXISTS 'AWAITING_FORENSICS';
ALTER TYPE case_status ADD VALUE IF NOT EXISTS 'CHARGE_SHEET_PREPARATION';

-- ----- CASES: IO triage fields -----
-- evidence_count / forensic progress are deliberately NOT stored — they
-- are derived at query time from evidence + forensic_records so they can
-- never drift out of sync with the rows they summarise.
ALTER TABLE cases ADD COLUMN IF NOT EXISTS witness_count INTEGER     NOT NULL DEFAULT 0;
ALTER TABLE cases ADD COLUMN IF NOT EXISTS coc_status    VARCHAR(20) NOT NULL DEFAULT 'Pending';

-- ----- EVIDENCE: physical-custody + forensic display fields -----
-- `type` (enum) stays the machine file-type; `category` carries the
-- IO-facing descriptive kind ("Mobile Device", "Blood Sample", ...).
ALTER TABLE evidence ADD COLUMN IF NOT EXISTS description         TEXT;
ALTER TABLE evidence ADD COLUMN IF NOT EXISTS collected_by_name   VARCHAR(150);
ALTER TABLE evidence ADD COLUMN IF NOT EXISTS current_location    VARCHAR(255);
ALTER TABLE evidence ADD COLUMN IF NOT EXISTS storage_status      VARCHAR(40) NOT NULL DEFAULT 'Secure Storage';
ALTER TABLE evidence ADD COLUMN IF NOT EXISTS forensic_status     VARCHAR(40) NOT NULL DEFAULT 'Not Required';
ALTER TABLE evidence ADD COLUMN IF NOT EXISTS blockchain_verified BOOLEAN     NOT NULL DEFAULT FALSE;

-- ----- AUDIT LOGS: human-readable actor + narrative detail -----
-- user_name is denormalised so a log line still renders after the user
-- row is deactivated; `details` holds the free-text narrative that the
-- existing detail_* columns have no slot for.
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS user_name           VARCHAR(150);
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS verification_status VARCHAR(20) NOT NULL DEFAULT 'Verified';
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS details             TEXT;

-- ----- FORENSIC RECORDS (FSL examination lifecycle per evidence item) -----
CREATE TABLE IF NOT EXISTS forensic_records (
  record_id                  VARCHAR(80)  PRIMARY KEY,
  evidence_id                VARCHAR(50)  NOT NULL REFERENCES evidence(evidence_id) ON DELETE CASCADE,
  case_id                    VARCHAR(50)  NOT NULL REFERENCES cases(case_id) ON DELETE CASCADE,
  fsl_ref                    VARCHAR(100) NOT NULL DEFAULT '',
  fsl_name                   VARCHAR(150) NOT NULL DEFAULT '',
  submitted_date             TIMESTAMPTZ,
  received_date              TIMESTAMPTZ,
  examination_start_date     TIMESTAMPTZ,
  expected_completion_date   TIMESTAMPTZ,
  completion_date            TIMESTAMPTZ,
  -- Pending Submission | In Transit | Received by FSL | Under Examination
  -- | Examination Complete | Report Available
  examination_status         VARCHAR(40)  NOT NULL DEFAULT 'Pending Submission',
  report_hash                VARCHAR(64),
  report_blockchain_tx_id    VARCHAR(128),
  report_blockchain_verified BOOLEAN      NOT NULL DEFAULT FALSE,
  examiner                   VARCHAR(150),
  findings                   TEXT,
  created_at                 TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at                 TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_forensic_records_evidence ON forensic_records(evidence_id);
CREATE INDEX IF NOT EXISTS idx_forensic_records_case            ON forensic_records(case_id);
CREATE INDEX IF NOT EXISTS idx_forensic_records_status          ON forensic_records(examination_status);

-- ----- CUSTODY EVENTS (append-only chain-of-custody timeline) -----
-- Distinct from custody_transfers (the Fabric 2-step request/accept
-- handshake): this is the flat, human-readable event ledger the IO
-- timeline renders, including non-transfer events such as sealing and
-- forensic examination milestones.
CREATE TABLE IF NOT EXISTS custody_events (
  event_id            VARCHAR(80)  PRIMARY KEY,
  evidence_id         VARCHAR(50)  NOT NULL REFERENCES evidence(evidence_id) ON DELETE CASCADE,
  case_id             VARCHAR(50)  REFERENCES cases(case_id) ON DELETE CASCADE,
  -- Evidence Collected | Evidence Sealed | Custody Transferred | Custody
  -- Received | Transferred to FSL | Received by FSL | Forensic
  -- Examination Started | Forensic Report Filed | Evidence Returned
  event_type          VARCHAR(60)  NOT NULL,
  actor               VARCHAR(150) NOT NULL,
  from_custodian      VARCHAR(150),
  to_custodian        VARCHAR(150),
  location            VARCHAR(255) NOT NULL DEFAULT '',
  tx_id               VARCHAR(128),
  blockchain_verified BOOLEAN      NOT NULL DEFAULT FALSE,
  seal_id             VARCHAR(80),
  notes               TEXT,
  occurred_at         TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  created_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_custody_events_evidence ON custody_events(evidence_id, occurred_at);
CREATE INDEX IF NOT EXISTS idx_custody_events_case     ON custody_events(case_id);

-- ----- ALERTS (integrity / custody / forensic exceptions raised to the IO) -----
-- evidence_id is intentionally NOT a foreign key: an alert may reference
-- an exhibit that was never successfully registered (e.g. a receipt
-- logged with no matching dispatch), which is precisely the anomaly the
-- alert exists to report.
CREATE TABLE IF NOT EXISTS alerts (
  alert_id        VARCHAR(80)  PRIMARY KEY,
  severity        VARCHAR(20)  NOT NULL DEFAULT 'info',   -- critical | warning | info
  type            VARCHAR(80)  NOT NULL DEFAULT '',
  case_id         VARCHAR(50),
  evidence_id     VARCHAR(50),
  title           VARCHAR(255) NOT NULL,
  description     TEXT         NOT NULL DEFAULT '',
  status          VARCHAR(20)  NOT NULL DEFAULT 'Open',   -- Open | Acknowledged | Resolved
  raised_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  acknowledged_at TIMESTAMPTZ,
  acknowledged_by VARCHAR(50),
  resolved_at     TIMESTAMPTZ,
  created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_alerts_status   ON alerts(status, raised_at DESC);
CREATE INDEX IF NOT EXISTS idx_alerts_case     ON alerts(case_id);
CREATE INDEX IF NOT EXISTS idx_alerts_evidence ON alerts(evidence_id);
