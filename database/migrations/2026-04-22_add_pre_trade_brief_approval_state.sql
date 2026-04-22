ALTER TABLE pre_trade_briefs
  ADD COLUMN IF NOT EXISTS approval_state TEXT NOT NULL DEFAULT 'blocked';

ALTER TABLE pre_trade_briefs
  DROP CONSTRAINT IF EXISTS pre_trade_briefs_approval_state_check;

ALTER TABLE pre_trade_briefs
  ADD CONSTRAINT pre_trade_briefs_approval_state_check
  CHECK (approval_state IN ('ready', 'blocked', 'manual_override'));
