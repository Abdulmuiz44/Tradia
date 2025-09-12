-- Simple table to persist payment-related logs for debugging and analytics
CREATE TABLE IF NOT EXISTS payment_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NULL,
  source TEXT NOT NULL,                -- e.g., 'checkout', 'webhook', 'subscriptions_api'
  level TEXT NOT NULL DEFAULT 'info',  -- 'info' | 'warn' | 'error'
  message TEXT NOT NULL,
  context JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payment_logs_user_id ON payment_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_logs_source ON payment_logs(source);
CREATE INDEX IF NOT EXISTS idx_payment_logs_level ON payment_logs(level);
CREATE INDEX IF NOT EXISTS idx_payment_logs_created_at ON payment_logs(created_at DESC);

