-- Create trading_accounts table to support manual accounts and broker-linked accounts
CREATE TABLE IF NOT EXISTS trading_accounts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(120) NOT NULL,
  currency VARCHAR(10) DEFAULT 'USD',
  initial_balance NUMERIC(14,2) DEFAULT 0,
  current_balance NUMERIC(14,2),
  mode VARCHAR(16) NOT NULL DEFAULT 'manual', -- 'manual' | 'broker'
  broker VARCHAR(64),
  platform VARCHAR(16) DEFAULT 'MT5',
  credential_id UUID, -- links to mt5_credentials.id when mode='broker'
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, name)
);

CREATE INDEX IF NOT EXISTS idx_trading_accounts_user ON trading_accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_trading_accounts_active ON trading_accounts(is_active) WHERE is_active = TRUE;

-- Trigger to keep updated_at fresh
CREATE OR REPLACE FUNCTION update_trading_accounts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_trading_accounts_updated
  BEFORE UPDATE ON trading_accounts
  FOR EACH ROW
  EXECUTE FUNCTION update_trading_accounts_updated_at();

