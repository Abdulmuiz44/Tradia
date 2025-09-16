-- database/migrations/create_trade_plans.sql
-- Minimal trade_plans table for planner counts and features
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS trade_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  symbol TEXT NOT NULL,
  setup_type TEXT,
  planned_entry NUMERIC,
  stop_loss NUMERIC,
  take_profit NUMERIC,
  lot_size NUMERIC,
  risk_reward NUMERIC,
  notes TEXT,
  status TEXT DEFAULT 'planned',

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_trade_plans_user_id ON trade_plans(user_id);
CREATE INDEX IF NOT EXISTS idx_trade_plans_created_at ON trade_plans(created_at DESC);

-- updated_at trigger
CREATE OR REPLACE FUNCTION trg_trade_plans_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_trade_plans_updated_at ON trade_plans;
CREATE TRIGGER trigger_trade_plans_updated_at
  BEFORE UPDATE ON trade_plans
  FOR EACH ROW
  EXECUTE FUNCTION trg_trade_plans_updated_at();

