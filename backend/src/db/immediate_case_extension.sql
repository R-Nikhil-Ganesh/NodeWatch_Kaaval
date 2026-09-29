-- =============================================================
-- Immediate case registration — additive schema extension.
-- Idempotent (IF NOT EXISTS) so it can be re-run safely on every
-- server start, same pattern as legal_extension.sql / priority_extension.sql.
-- =============================================================

-- Marks a case created via the "Immediate" registrar flow, where most
-- details/evidence/files were ported over from other cases instead of
-- entered by hand.
ALTER TABLE cases ADD COLUMN IF NOT EXISTS is_immediate BOOLEAN NOT NULL DEFAULT FALSE;

-- Records which existing case(s) an immediate case's details/evidence/files
-- were copied from. sort_order = 0 is the "primary" source, whose field
-- values take precedence when merging.
CREATE TABLE IF NOT EXISTS case_merge_sources (
  case_id        VARCHAR(50) NOT NULL REFERENCES cases(case_id) ON DELETE CASCADE,
  source_case_id VARCHAR(50) NOT NULL REFERENCES cases(case_id),
  sort_order     INTEGER     NOT NULL DEFAULT 0,
  PRIMARY KEY (case_id, source_case_id)
);
