-- =============================================================
-- Legal / Court Management System — additive schema extension.
-- Every statement is idempotent (IF NOT EXISTS) so this file can be
-- re-run safely on every server start without affecting the mobile
-- or web domains, which are untouched by anything here.
-- =============================================================

-- ----- USERS: judicial/bar identity fields -----
ALTER TABLE users ADD COLUMN IF NOT EXISTS bar_judicial_id VARCHAR(100);
ALTER TABLE users ADD COLUMN IF NOT EXISTS court           VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS jurisdiction    VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS phone           VARCHAR(30);

-- ----- CASES: judicial case metadata -----
-- NOTE: court_stage is a free-form string (not the existing case_status enum)
-- because the court-side pipeline (Investigation -> ... -> Disposed) is far
-- more granular than the police-side OPEN/UNDER_INVESTIGATION/... status.
ALTER TABLE cases ADD COLUMN IF NOT EXISTS cnr_number                         VARCHAR(50);
ALTER TABLE cases ADD COLUMN IF NOT EXISTS fir_number                         VARCHAR(50);
ALTER TABLE cases ADD COLUMN IF NOT EXISTS fir_date                           TIMESTAMPTZ;
ALTER TABLE cases ADD COLUMN IF NOT EXISTS police_station                     VARCHAR(255);
ALTER TABLE cases ADD COLUMN IF NOT EXISTS district                          VARCHAR(100);
ALTER TABLE cases ADD COLUMN IF NOT EXISTS state                             VARCHAR(100);
ALTER TABLE cases ADD COLUMN IF NOT EXISTS case_type                         VARCHAR(100);
ALTER TABLE cases ADD COLUMN IF NOT EXISTS sections                          JSONB NOT NULL DEFAULT '[]';
ALTER TABLE cases ADD COLUMN IF NOT EXISTS court                             VARCHAR(255);
ALTER TABLE cases ADD COLUMN IF NOT EXISTS presiding_judge                   VARCHAR(150);
ALTER TABLE cases ADD COLUMN IF NOT EXISTS public_prosecutor                 VARCHAR(150);
ALTER TABLE cases ADD COLUMN IF NOT EXISTS defense_counsel                   VARCHAR(150);
ALTER TABLE cases ADD COLUMN IF NOT EXISTS investigating_officer             VARCHAR(150);
ALTER TABLE cases ADD COLUMN IF NOT EXISTS investigating_officer_designation VARCHAR(150);
ALTER TABLE cases ADD COLUMN IF NOT EXISTS court_stage                       VARCHAR(30);
ALTER TABLE cases ADD COLUMN IF NOT EXISTS outcome                           VARCHAR(20) NOT NULL DEFAULT 'NONE';
ALTER TABLE cases ADD COLUMN IF NOT EXISTS first_hearing_date                TIMESTAMPTZ;
ALTER TABLE cases ADD COLUMN IF NOT EXISTS last_hearing_date                 TIMESTAMPTZ;
ALTER TABLE cases ADD COLUMN IF NOT EXISTS upcoming_hearing_date             TIMESTAMPTZ;
ALTER TABLE cases ADD COLUMN IF NOT EXISTS disposed_at                       TIMESTAMPTZ;

-- ----- CASE PARTIES (accused / complainant / victim / witness) -----
CREATE TABLE IF NOT EXISTS case_parties (
  party_id       UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id        VARCHAR(50) NOT NULL REFERENCES cases(case_id) ON DELETE CASCADE,
  role           VARCHAR(20) NOT NULL, -- Complainant | Accused | Victim | Witness
  name           VARCHAR(255) NOT NULL,
  age            INTEGER,
  address        VARCHAR(255),
  custody_status VARCHAR(30), -- In Judicial Custody | On Bail | Absconding | N/A
  sort_order     INTEGER     NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_case_parties_case_id ON case_parties(case_id);

-- ----- CASE HEARINGS (court hearing history) -----
CREATE TABLE IF NOT EXISTS case_hearings (
  hearing_id              VARCHAR(50) PRIMARY KEY,
  case_id                 VARCHAR(50) NOT NULL REFERENCES cases(case_id) ON DELETE CASCADE,
  hearing_date            TIMESTAMPTZ NOT NULL,
  court                   VARCHAR(255),
  judge                   VARCHAR(150),
  purpose                 VARCHAR(50) NOT NULL,
  statement               TEXT,
  next_hearing_date       TIMESTAMPTZ,
  prosecutor_present      BOOLEAN     NOT NULL DEFAULT FALSE,
  defense_counsel_present BOOLEAN     NOT NULL DEFAULT FALSE,
  accused_present         BOOLEAN     NOT NULL DEFAULT FALSE,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_case_hearings_case_id ON case_hearings(case_id, hearing_date);

-- ----- EVIDENCE: physical-exhibit + ledger display fields -----
ALTER TABLE evidence ADD COLUMN IF NOT EXISTS category         VARCHAR(50);
ALTER TABLE evidence ADD COLUMN IF NOT EXISTS seal_number       VARCHAR(100);
ALTER TABLE evidence ADD COLUMN IF NOT EXISTS ledger_block_ref  VARCHAR(100);

-- ----- CASE DOCUMENTS: richer legal file-type label + format/size -----
-- doc_type_label carries the granular legal document type (FIR, Consent
-- Form / Panchnama, Section 63 BSA Certificate, Arrest/Search/Production
-- Warrant, Request Form, Chargesheet, Court Order, Bail Order, Medical
-- Report...) because the existing `type` enum only has 5 generic values.
ALTER TABLE case_documents ADD COLUMN IF NOT EXISTS doc_type_label   VARCHAR(50);
ALTER TABLE case_documents ADD COLUMN IF NOT EXISTS uploaded_by_role VARCHAR(150);
ALTER TABLE case_documents ADD COLUMN IF NOT EXISTS file_format      VARCHAR(10);
ALTER TABLE case_documents ADD COLUMN IF NOT EXISTS file_size_kb     INTEGER;
ALTER TABLE case_documents ADD COLUMN IF NOT EXISTS related_sections JSONB NOT NULL DEFAULT '[]';

-- ----- CASE CUSTODY TRANSFERS: admin-forced override tracking -----
-- Records the justification when an ADMIN forces a custody transfer
-- without the current custodian's participation (see caseRoutes.js).
ALTER TABLE case_custody_transfers ADD COLUMN IF NOT EXISTS override_reason TEXT;
