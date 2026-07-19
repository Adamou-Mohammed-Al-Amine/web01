-- =========================================================
-- Outreach Studio v1.1 migration
-- Safe to run on a live database with existing data.
-- Additive only — no DROP, no TABLE recreation.
-- Idempotent — safe to run more than once.
-- =========================================================

ALTER TABLE creators
  ADD COLUMN IF NOT EXISTS need_reedit boolean NOT NULL DEFAULT false;

-- Note: the `subject` and `custom_first_email` columns are intentionally
-- left in place (not dropped) to preserve existing data. The Research
-- Session form no longer collects them as of v1.1, but any values already
-- saved on existing creators are untouched.
