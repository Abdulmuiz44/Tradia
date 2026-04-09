-- Create minimal Forex pre-trade brief slice
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Forex pairs reference table
CREATE TABLE IF NOT EXISTS forex_pairs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  symbol TEXT NOT NULL UNIQUE,
  base_currency TEXT NOT NULL,
  quote_currency TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'major',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_forex_pairs_symbol ON forex_pairs(symbol);
CREATE INDEX IF NOT EXISTS idx_forex_pairs_active ON forex_pairs(is_active) WHERE is_active = true;

-- Seed initial active pairs
INSERT INTO forex_pairs (symbol, base_currency, quote_currency, category, is_active)
VALUES
  ('EURUSD', 'EUR', 'USD', 'major', true),
  ('GBPUSD', 'GBP', 'USD', 'major', true),
  ('USDJPY', 'USD', 'JPY', 'major', true),
  ('AUDUSD', 'AUD', 'USD', 'major', true),
  ('USDCAD', 'USD', 'CAD', 'major', true),
  ('USDCHF', 'USD', 'CHF', 'major', true),
  ('NZDUSD', 'NZD', 'USD', 'major', true),
  ('EURJPY', 'EUR', 'JPY', 'cross', true),
  ('GBPJPY', 'GBP', 'JPY', 'cross', true)
ON CONFLICT (symbol) DO NOTHING;

-- Pre-trade brief records
CREATE TABLE IF NOT EXISTS pre_trade_briefs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  forex_pair_id UUID NOT NULL REFERENCES forex_pairs(id) ON DELETE RESTRICT,
  pair_symbol_snapshot TEXT NOT NULL,
  timeframe TEXT NOT NULL,
  market_session TEXT NOT NULL,
  directional_bias_input TEXT NOT NULL,
  setup_notes TEXT,
  planned_entry NUMERIC,
  planned_stop_loss NUMERIC,
  planned_take_profit NUMERIC,
  risk_reward_ratio NUMERIC,
  ai_summary TEXT,
  ai_bias TEXT,
  ai_confluence TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ai_risks TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ai_invalidators TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ai_checklist TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  raw_ai_response JSONB,
  status TEXT NOT NULL DEFAULT 'generated',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT pre_trade_briefs_status_check CHECK (status IN ('generated', 'draft', 'failed')),
  CONSTRAINT pre_trade_briefs_price_check CHECK (
    (planned_entry IS NULL AND planned_stop_loss IS NULL AND planned_take_profit IS NULL)
    OR (planned_entry IS NOT NULL AND planned_stop_loss IS NOT NULL AND planned_take_profit IS NOT NULL)
  )
);

CREATE INDEX IF NOT EXISTS idx_pre_trade_briefs_user_id_created_at ON pre_trade_briefs(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_pre_trade_briefs_forex_pair_id ON pre_trade_briefs(forex_pair_id);
CREATE INDEX IF NOT EXISTS idx_pre_trade_briefs_status ON pre_trade_briefs(status);

-- Updated timestamp trigger
CREATE OR REPLACE FUNCTION trg_pre_trade_briefs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_pre_trade_briefs_updated_at ON pre_trade_briefs;
CREATE TRIGGER trigger_pre_trade_briefs_updated_at
  BEFORE UPDATE ON pre_trade_briefs
  FOR EACH ROW
  EXECUTE FUNCTION trg_pre_trade_briefs_updated_at();

-- RLS setup
ALTER TABLE forex_pairs ENABLE ROW LEVEL SECURITY;
ALTER TABLE pre_trade_briefs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS forex_pairs_read_all ON forex_pairs;
CREATE POLICY forex_pairs_read_all
ON forex_pairs
FOR SELECT
TO authenticated, anon
USING (true);

DROP POLICY IF EXISTS pre_trade_briefs_select_own ON pre_trade_briefs;
CREATE POLICY pre_trade_briefs_select_own
ON pre_trade_briefs
FOR SELECT
TO authenticated
USING (auth.uid()::text = user_id::text);

DROP POLICY IF EXISTS pre_trade_briefs_insert_own ON pre_trade_briefs;
CREATE POLICY pre_trade_briefs_insert_own
ON pre_trade_briefs
FOR INSERT
TO authenticated
WITH CHECK (auth.uid()::text = user_id::text);

DROP POLICY IF EXISTS pre_trade_briefs_update_own ON pre_trade_briefs;
CREATE POLICY pre_trade_briefs_update_own
ON pre_trade_briefs
FOR UPDATE
TO authenticated
USING (auth.uid()::text = user_id::text)
WITH CHECK (auth.uid()::text = user_id::text);

DROP POLICY IF EXISTS pre_trade_briefs_delete_own ON pre_trade_briefs;
CREATE POLICY pre_trade_briefs_delete_own
ON pre_trade_briefs
FOR DELETE
TO authenticated
USING (auth.uid()::text = user_id::text);
