-- Add account_size and trade_count to trading_accounts table if not exists
-- This migration enhances the trading_accounts table to support multi-account trading

-- Add account_size column if not exists (replaces or supplements current_balance)
ALTER TABLE trading_accounts 
ADD COLUMN IF NOT EXISTS account_size NUMERIC(14,2) DEFAULT 0;

-- Add a constraint to ensure account_size is not negative
ALTER TABLE trading_accounts
ADD CONSTRAINT check_account_size_positive CHECK (account_size >= 0);

-- Create an index on user_id and is_active for faster queries
CREATE INDEX IF NOT EXISTS idx_trading_accounts_user_active ON trading_accounts(user_id, is_active);

-- Add comment to account_size field for clarity
COMMENT ON COLUMN trading_accounts.account_size IS 'Current account balance/size in the specified currency';

-- Update trades table to include account_id if not exists
ALTER TABLE trades
ADD COLUMN IF NOT EXISTS account_id UUID REFERENCES trading_accounts(id) ON DELETE CASCADE;

-- Create index on account_id for faster filtering
CREATE INDEX IF NOT EXISTS idx_trades_account_id ON trades(account_id);

-- Create index for querying trades by user and account
CREATE INDEX IF NOT EXISTS idx_trades_user_account ON trades(user_id, account_id);

-- Add view for account statistics
CREATE OR REPLACE VIEW account_statistics AS
SELECT 
  ta.id,
  ta.user_id,
  ta.name,
  ta.account_size,
  ta.platform,
  COUNT(DISTINCT t.id) as trade_count,
  COALESCE(SUM(t.pnl), 0) as total_pnl,
  MAX(t.closetime) as last_trade_date
FROM trading_accounts ta
LEFT JOIN trades t ON ta.id = t.account_id
WHERE ta.is_active = TRUE
GROUP BY ta.id, ta.user_id, ta.name, ta.account_size, ta.platform;

-- Grant permissions (adjust user_role as needed)
GRANT SELECT ON account_statistics TO authenticated;
