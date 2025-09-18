-- Trial enforcement: 30-day free trial for non-grandfathered users
-- Adds trial columns to users and initializes values

-- 1) Add columns if missing
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS signup_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS is_grandfathered BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS trial_expiry_email_sent_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS closed_at TIMESTAMP WITH TIME ZONE;

-- 2) Backfill signup_at from created_at if available
UPDATE users
SET signup_at = COALESCE(signup_at, created_at, NOW())
WHERE signup_at IS NULL;

-- 3) Grandfather the first 100 existing users by earliest signup/created date
WITH ranked AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY COALESCE(signup_at, created_at, NOW())) AS rn
  FROM users
)
UPDATE users u
SET is_grandfathered = TRUE
FROM ranked r
WHERE u.id = r.id AND r.rn <= 100;

-- 4) Set trial end for non-grandfathered users (if not paid)
-- Note: this only initializes trial_ends_at; ongoing plan changes are handled in app logic.
UPDATE users
SET trial_ends_at = COALESCE(trial_ends_at, signup_at + INTERVAL '30 days')
WHERE COALESCE(is_grandfathered, FALSE) = FALSE;

-- 5) Helpful indexes
CREATE INDEX IF NOT EXISTS idx_users_signup_at ON users(signup_at);
CREATE INDEX IF NOT EXISTS idx_users_trial_ends_at ON users(trial_ends_at);
CREATE INDEX IF NOT EXISTS idx_users_is_grandfathered ON users(is_grandfathered);

