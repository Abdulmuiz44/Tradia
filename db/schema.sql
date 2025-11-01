-- PostgreSQL schema for MT5 sync

CREATE TABLE IF NOT EXISTS mt5_accounts (
  id SERIAL PRIMARY KEY,
  user_id TEXT NOT NULL,
  server TEXT NOT NULL,
  login BIGINT NOT NULL,
  password_enc BYTEA NOT NULL,
  password_nonce BYTEA NOT NULL,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_sync TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS trades (
  id BIGINT PRIMARY KEY,
  user_id TEXT NOT NULL,
  account_login BIGINT,
  symbol TEXT NOT NULL,
  type TEXT,
  volume DOUBLE PRECISION,
  open_time TIMESTAMPTZ,
  close_time TIMESTAMPTZ,
  profit DOUBLE PRECISION,
  comment TEXT,
  raw JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS trades_user_idx ON trades(user_id);
CREATE INDEX IF NOT EXISTS trades_login_idx ON trades(account_login);

