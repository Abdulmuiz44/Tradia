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


/* Users Table */

CREATE TABLE users (
    id  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	name TEXT,
	email TEXT UNIQUE,
	email_verified TIMESTAMP,
	image TEXT,
	password TEXT,
	verification_token TEXT,
	created_at TIMESTAMP DEFAULT NOW(),
	updated_at TIMESTAMP
);

/* Accounts Table */

CREATE TABLE accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	user_id UUID REFERENCES users(id) ON DELETE CASCADE,
	type TEXT NOT NULL,
	provider TEXT NOT NULL,
	provider_account_id TEXT NOT NULL,
	refresh_token TEXT,
	access_token TEXT,
	expires_at INT,
    token_type TEXT,
	scope TEXT,
	id_token TEXT,
	session_state TEXT,
	UNIQUE (provider, provider_account_id)
);

/* Sessions Table */

CREATE TABLE sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	session_token TEXT UNIQUE NOT NULL,
	user_id UUID REFERENCES users(id) ON DELETE CASCADE,
	expires TIMESTAMP NOT NULL
);


/* Verification Tokens Table */

CREATE TABLE verification_tokens (
    identifier TEXT NOT NULL,
	token TEXT UNIQUE NOT NULL,
	expires TIMESTAMP NOT NULL,
	UNIQUE(identifier, token)
);


/* Password Reset Tokens Table */

CREATE TABLE password_reset_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	token TEXT UNIQUE NOT NULL,
	user_id UUID REFERENCES users(id) ON DELETE CASCADE,
	expires_at TIMESTAMP NOT NULL,
	created_at TIMESTAMP DEFAULT NOW()
	
);






