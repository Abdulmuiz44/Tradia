-- database/migrations/create_trades.sql
-- Minimal trades table used by analytics and features
-- Requires pgcrypto for gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS trades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Common trade fields
  symbol TEXT,
  outcome TEXT, -- e.g., 'Win', 'Loss', 'BreakEven'
  pnl NUMERIC,  -- primary P&L column used by most of the app
  profit NUMERIC, -- optional legacy P&L column (kept for compatibility)
  source TEXT DEFAULT 'manual', -- 'manual' | 'import' | 'mt5' | 'mt5-import'
  deal_id TEXT,  -- when imported from MT5 or brokers

  open_time TIMESTAMPTZ,
  close_time TIMESTAMPTZ,

  -- Optional analytics/journal fields (used by AI/analysis but not required)
  strategy TEXT,
  reasonForTrade TEXT,
  emotion TEXT,
  journalNotes TEXT,
  notes TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indices for performance
CREATE INDEX IF NOT EXISTS idx_trades_user_id ON trades(user_id);
CREATE INDEX IF NOT EXISTS idx_trades_open_time ON trades(open_time DESC);
CREATE INDEX IF NOT EXISTS idx_trades_deal_id ON trades(deal_id);

-- updated_at trigger
CREATE OR REPLACE FUNCTION trg_trades_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_trades_updated_at ON trades;
CREATE TRIGGER trigger_trades_updated_at
  BEFORE UPDATE ON trades
  FOR EACH ROW
  EXECUTE FUNCTION trg_trades_updated_at();

