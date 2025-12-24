-- Migration: Add LemonSqueezy support columns
-- This migration adds LemonSqueezy payment tracking to the user_plans table

-- 1. Create lemonsqueezy_products table if it doesn't exist
CREATE TABLE IF NOT EXISTS lemonsqueezy_products (
  id BIGSERIAL PRIMARY KEY,
  plan_key TEXT NOT NULL UNIQUE,
  variant_id TEXT NOT NULL,
  amount NUMERIC(10, 2) NOT NULL,
  billing_cycle TEXT NOT NULL CHECK (billing_cycle IN ('monthly', 'yearly')),
  currency TEXT DEFAULT 'USD',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Add LemonSqueezy columns to user_plans if they don't exist
DO $$
BEGIN
  -- Add checkout_id column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_plans' AND column_name = 'checkout_id'
  ) THEN
    ALTER TABLE user_plans ADD COLUMN checkout_id TEXT;
  END IF;

  -- Add lemonsqueezy_variant_id column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_plans' AND column_name = 'lemonsqueezy_variant_id'
  ) THEN
    ALTER TABLE user_plans ADD COLUMN lemonsqueezy_variant_id TEXT;
  END IF;

  -- Add lemonsqueezy_order_id column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_plans' AND column_name = 'lemonsqueezy_order_id'
  ) THEN
    ALTER TABLE user_plans ADD COLUMN lemonsqueezy_order_id TEXT;
  END IF;

  -- Add lemonsqueezy_subscription_id column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_plans' AND column_name = 'lemonsqueezy_subscription_id'
  ) THEN
    ALTER TABLE user_plans ADD COLUMN lemonsqueezy_subscription_id TEXT;
  END IF;

  -- Add lemonsqueezy_transaction column (for storing full webhook payload)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_plans' AND column_name = 'lemonsqueezy_transaction'
  ) THEN
    ALTER TABLE user_plans ADD COLUMN lemonsqueezy_transaction JSONB;
  END IF;
END $$;

-- 3. Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_plans_lemonsqueezy_order_id 
  ON user_plans(lemonsqueezy_order_id);

CREATE INDEX IF NOT EXISTS idx_user_plans_lemonsqueezy_subscription_id 
  ON user_plans(lemonsqueezy_subscription_id);

CREATE INDEX IF NOT EXISTS idx_user_plans_checkout_id 
  ON user_plans(checkout_id);

-- 4. Create indexes on lemonsqueezy_products
CREATE INDEX IF NOT EXISTS idx_lemonsqueezy_products_plan_key 
  ON lemonsqueezy_products(plan_key);

CREATE INDEX IF NOT EXISTS idx_lemonsqueezy_products_variant_id 
  ON lemonsqueezy_products(variant_id);

-- 5. Add comment for documentation
COMMENT ON TABLE lemonsqueezy_products IS 'Stores mapping of plan keys to LemonSqueezy variant IDs for checkout processing';
COMMENT ON TABLE user_plans IS 'User subscription and billing plan records, supports both legacy Flutterwave and LemonSqueezy payments';
