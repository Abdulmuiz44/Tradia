-- Create core tables for Tradia (users, accounts, sessions, verification_tokens, password_reset_tokens)
-- IDs are TEXT with a random default (md5(random()||clock_timestamp())) so inserts that omit id will succeed.

-- ----------------------------
-- Trigger helper: update updated_at on row update
-- ----------------------------
CREATE OR REPLACE FUNCTION trigger_set_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;


-- ----------------------------
-- Users table
-- ----------------------------
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY DEFAULT md5(random()::text || clock_timestamp()::text),
  name TEXT,
  email TEXT UNIQUE,
  email_verified TIMESTAMP WITH TIME ZONE,   -- NULL until verified
  image TEXT,
  password TEXT,                             -- hashed password
  verification_token TEXT,                   -- token for email verification (nullable once verified)
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);


-- attach trigger to update updated_at on row changes
DROP TRIGGER IF EXISTS trg_users_set_timestamp ON users;
CREATE TRIGGER trg_users_set_timestamp
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE PROCEDURE trigger_set_timestamp();


-- ----------------------------
-- Accounts table (OAuth / provider accounts)
-- Mirrors typical NextAuth account model
-- ----------------------------
CREATE TABLE IF NOT EXISTS accounts (
  id TEXT PRIMARY KEY DEFAULT md5(random()::text || clock_timestamp()::text),
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  provider TEXT NOT NULL,
  provider_account_id TEXT NOT NULL,
  refresh_token TEXT,
  access_token TEXT,
  expires_at INTEGER,           -- numeric epoch (nullable)
  token_type TEXT,
  scope TEXT,
  id_token TEXT,
  session_state TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  -- Prevent duplicate provider/providerAccountId pairs
  UNIQUE (provider, provider_account_id)
);

CREATE INDEX IF NOT EXISTS idx_accounts_user_id ON accounts(user_id);

DROP TRIGGER IF EXISTS trg_accounts_set_timestamp ON accounts;
CREATE TRIGGER trg_accounts_set_timestamp
  BEFORE UPDATE ON accounts
  FOR EACH ROW
  EXECUTE PROCEDURE trigger_set_timestamp();


-- ----------------------------
-- Sessions table (for session tokens)
-- ----------------------------
CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY DEFAULT md5(random()::text || clock_timestamp()::text),
  session_token TEXT UNIQUE NOT NULL,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);

DROP TRIGGER IF EXISTS trg_sessions_set_timestamp ON sessions;
CREATE TRIGGER trg_sessions_set_timestamp
  BEFORE UPDATE ON sessions
  FOR EACH ROW
  EXECUTE PROCEDURE trigger_set_timestamp();


-- ----------------------------
-- Verification tokens (for email verification flows)
-- We keep token as primary key (short lookup) and also add a compound unique index
-- ----------------------------
CREATE TABLE IF NOT EXISTS verification_tokens (
  identifier TEXT NOT NULL,
  token TEXT PRIMARY KEY,
  expires TIMESTAMP WITH TIME ZONE NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_verification_identifier_token ON verification_tokens (identifier, token);


-- ----------------------------
-- Password reset tokens (you already had this; include again to ensure complete schema)
-- Use token as PK (so token strings are guaranteed unique)
-- ----------------------------
CREATE TABLE IF NOT EXISTS password_reset_tokens (
  token TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_user_id ON password_reset_tokens(user_id);


-- ----------------------------
-- Optional housekeeping / sample constraints
-- ----------------------------
-- Ensure emails are lowercased by application code (DB can't easily force lowercase on variable inserts)
-- If you want a minimum of cross-table integrity checks, they already exist via foreign keys above.

-- End of schema file
