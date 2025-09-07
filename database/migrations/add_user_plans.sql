-- Add plan field to users table for subscription management
ALTER TABLE users ADD COLUMN IF NOT EXISTS plan VARCHAR(20) DEFAULT 'free'
    CHECK (plan IN ('free', 'pro', 'plus', 'elite'));

-- Update existing users to have 'free' plan if not set
UPDATE users SET plan = 'free' WHERE plan IS NULL;

-- Create index for plan queries
CREATE INDEX IF NOT EXISTS idx_users_plan ON users(plan);

-- Optional: Create subscriptions table for more detailed subscription management
CREATE TABLE IF NOT EXISTS user_subscriptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  plan VARCHAR(20) NOT NULL DEFAULT 'free'
    CHECK (plan IN ('free', 'pro', 'plus', 'elite')),
  status VARCHAR(20) NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'inactive', 'cancelled', 'past_due')),
  stripe_subscription_id VARCHAR(255),
  current_period_start TIMESTAMP WITH TIME ZONE,
  current_period_end TIMESTAMP WITH TIME ZONE,
  cancel_at_period_end BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Index for subscriptions
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_user_id ON user_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_status ON user_subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_stripe_id ON user_subscriptions(stripe_subscription_id);

-- Function to sync users.plan with user_subscriptions.plan
CREATE OR REPLACE FUNCTION sync_user_plan()
RETURNS TRIGGER AS $$
BEGIN
  -- Update users.plan when subscription changes
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    UPDATE users SET plan = NEW.plan WHERE id = NEW.user_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE users SET plan = 'free' WHERE id = OLD.user_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Trigger to keep users.plan in sync
DROP TRIGGER IF EXISTS trigger_sync_user_plan ON user_subscriptions;
CREATE TRIGGER trigger_sync_user_plan
  AFTER INSERT OR UPDATE OR DELETE ON user_subscriptions
  FOR EACH ROW EXECUTE FUNCTION sync_user_plan();

-- Insert default subscriptions for existing users
INSERT INTO user_subscriptions (user_id, plan, status)
SELECT id, COALESCE(plan, 'free'), 'active'
FROM users
WHERE id NOT IN (SELECT user_id FROM user_subscriptions)
ON CONFLICT (user_id) DO NOTHING;