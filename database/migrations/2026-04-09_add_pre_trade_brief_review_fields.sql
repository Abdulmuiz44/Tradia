-- Add review/edit support fields for pre_trade_briefs
ALTER TABLE pre_trade_briefs
  ADD COLUMN IF NOT EXISTS trader_notes TEXT,
  ADD COLUMN IF NOT EXISTS checklist_state JSONB,
  ADD COLUMN IF NOT EXISTS last_reviewed_at TIMESTAMPTZ;

-- Expand status values for light workflow updates
ALTER TABLE pre_trade_briefs
  DROP CONSTRAINT IF EXISTS pre_trade_briefs_status_check;

ALTER TABLE pre_trade_briefs
  ADD CONSTRAINT pre_trade_briefs_status_check
  CHECK (status IN ('generated', 'draft', 'ready', 'invalidated', 'executed', 'skipped', 'failed'));
