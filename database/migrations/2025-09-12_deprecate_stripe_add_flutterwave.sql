-- Deprecate Stripe artifacts; add Flutterwave columns for legacy table

-- If user_subscriptions exists, replace stripe_subscription_id with flutterwave_subscription_id
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_name = 'user_subscriptions'
  ) THEN
    -- Add flutterwave_subscription_id if missing
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'user_subscriptions' AND column_name = 'flutterwave_subscription_id'
    ) THEN
      ALTER TABLE user_subscriptions ADD COLUMN flutterwave_subscription_id TEXT;
    END IF;

    -- Drop stripe_subscription_id if present
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'user_subscriptions' AND column_name = 'stripe_subscription_id'
    ) THEN
      ALTER TABLE user_subscriptions DROP COLUMN stripe_subscription_id;
    END IF;
  END IF;
END $$;

