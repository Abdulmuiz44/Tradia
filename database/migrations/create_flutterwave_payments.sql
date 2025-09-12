-- Create tables required for Flutterwave-based subscriptions

-- Stores mapping between our logical plans (e.g. pro_monthly) and Flutterwave plan IDs
CREATE TABLE IF NOT EXISTS flutterwave_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_key TEXT UNIQUE NOT NULL,            -- e.g. 'pro_monthly'
  flutterwave_plan_id TEXT NOT NULL,        -- plan id returned by Flutterwave
  amount NUMERIC(12,2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USD',
  billing_cycle TEXT NOT NULL CHECK (billing_cycle IN ('monthly','yearly')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Stores individual user plan purchases/subscriptions
CREATE TABLE IF NOT EXISTS user_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  plan_type TEXT NOT NULL CHECK (plan_type IN ('free','pro','plus','elite')),
  billing_cycle TEXT NOT NULL DEFAULT 'monthly' CHECK (billing_cycle IN ('monthly','yearly')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','active','cancelled','expired','past_due')),

  -- Payment/Subscription identifiers
  tx_ref TEXT UNIQUE,                       -- our generated reference to correlate
  flutterwave_plan_id TEXT,                 -- reference to flutterwave_plans.flutterwave_plan_id
  flutterwave_payment_id TEXT,              -- payment/transaction id from Flutterwave
  flutterwave_subscription_id TEXT,         -- subscription id if available

  -- Amount/currency info (duplicated for reporting)
  amount NUMERIC(12,2),
  currency TEXT,

  -- Period tracking (optional, for analytics)
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,

  -- Raw payload for diagnostics
  flutterwave_transaction JSONB,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Useful indexes
CREATE INDEX IF NOT EXISTS idx_user_plans_user_id ON user_plans(user_id);
CREATE INDEX IF NOT EXISTS idx_user_plans_status ON user_plans(status);
CREATE INDEX IF NOT EXISTS idx_user_plans_tx_ref ON user_plans(tx_ref);

-- Simple trigger to keep updated_at fresh
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_user_plans_updated_at ON user_plans;
CREATE TRIGGER trg_user_plans_updated_at
BEFORE UPDATE ON user_plans
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

