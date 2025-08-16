-- Database: tradia

-- DROP DATABASE IF EXISTS tradia;

CREATE DATABASE tradia
    WITH
    OWNER = postgres
    ENCODING = 'UTF8'
    LC_COLLATE = 'English_United States.1252'
    LC_CTYPE = 'English_United States.1252'
    LOCALE_PROVIDER = 'libc'
    TABLESPACE = pg_default
    CONNECTION LIMIT = -1
    IS_TEMPLATE = False;

	-- mt5_accounts
CREATE TABLE IF NOT EXISTS mt5_accounts (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(128) NOT NULL,
  login VARCHAR(64) NOT NULL,
  server VARCHAR(128) NOT NULL,
  metaapi_account_id VARCHAR(64) UNIQUE NOT NULL,
  name VARCHAR(255),
  currency VARCHAR(16),
  balance NUMERIC,
  state VARCHAR(32),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- trades
CREATE TABLE IF NOT EXISTS trades (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(128) NOT NULL,
  metaapi_account_id VARCHAR(64) NOT NULL,
  deal_id VARCHAR(64) UNIQUE NOT NULL,
  order_id VARCHAR(64),
  symbol VARCHAR(64),
  type VARCHAR(32),
  volume NUMERIC,
  open_time TIMESTAMP,      -- optional if you add it later
  close_time TIMESTAMP,
  open_price NUMERIC,       -- optional if you add it later
  close_price NUMERIC,
  profit NUMERIC,
  commission NUMERIC,
  swap NUMERIC,
  magic INTEGER,
  comment TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
