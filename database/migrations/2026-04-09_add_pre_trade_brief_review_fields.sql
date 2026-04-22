-- Add review/edit support fields for pre_trade_briefs
DO $$
BEGIN
  IF to_regclass('public.pre_trade_briefs') IS NULL THEN
    RAISE NOTICE 'pre_trade_briefs missing, skipping add review fields migration';
    RETURN;
  END IF;

  ALTER TABLE pre_trade_briefs
    ADD COLUMN IF NOT EXISTS trader_notes TEXT,
    ADD COLUMN IF NOT EXISTS checklist_state JSONB,
    ADD COLUMN IF NOT EXISTS last_reviewed_at TIMESTAMPTZ;
END $$;

-- Expand status values for light workflow updates
DO $$
BEGIN
  IF to_regclass('public.pre_trade_briefs') IS NULL THEN
    RETURN;
  END IF;

  ALTER TABLE pre_trade_briefs
    DROP CONSTRAINT IF EXISTS pre_trade_briefs_status_check;

  ALTER TABLE pre_trade_briefs
    ADD CONSTRAINT pre_trade_briefs_status_check
    CHECK (status IN ('generated', 'draft', 'ready', 'invalidated', 'executed', 'skipped', 'failed'));
END $$;
