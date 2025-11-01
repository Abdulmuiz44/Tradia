-- Create table to store each user's favorite broker and platform
CREATE TABLE IF NOT EXISTS user_broker_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  broker TEXT NOT NULL,
  platform TEXT NOT NULL,
  is_favorite BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id)
);

CREATE INDEX IF NOT EXISTS idx_user_broker_preferences_user ON user_broker_preferences(user_id);

-- Trigger to auto-update updated_at
CREATE OR REPLACE FUNCTION update_user_broker_preferences_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_user_broker_preferences_updated ON user_broker_preferences;
CREATE TRIGGER trg_user_broker_preferences_updated
  BEFORE UPDATE ON user_broker_preferences
  FOR EACH ROW EXECUTE FUNCTION update_user_broker_preferences_updated_at();

