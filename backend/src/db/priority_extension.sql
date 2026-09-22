-- =============================================================
-- Case priority triage — additive schema extension.
-- Idempotent (IF NOT EXISTS) so it can be re-run safely on every
-- server start, same pattern as legal_extension.sql.
-- =============================================================

-- Manual admin override: when TRUE, a case is always treated as the
-- highest priority tier regardless of what its description contains.
ALTER TABLE cases ADD COLUMN IF NOT EXISTS is_priority BOOLEAN NOT NULL DEFAULT FALSE;
CREATE INDEX IF NOT EXISTS idx_cases_is_priority ON cases(is_priority);
