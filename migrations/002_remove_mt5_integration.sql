-- Migration: Remove MT5 Integration
-- Description: Drops all MT5-related tables, triggers, and functions
-- Date: 2025-12-05
-- Status: MT5 integration being removed from the project

-- Drop dependent tables first (they have foreign keys to mt5_credentials)
DROP TABLE IF EXISTS mt5_connection_history CASCADE;
DROP TABLE IF EXISTS mt5_connection_monitoring CASCADE;
DROP TABLE IF EXISTS mt5_security_audit CASCADE;

-- Drop triggers (they depend on the tables)
DROP TRIGGER IF EXISTS trigger_mt5_sync_sessions_updated_at ON mt5_sync_sessions;

-- Drop functions
DROP FUNCTION IF EXISTS update_mt5_sync_sessions_updated_at();

-- Drop main MT5 tables
DROP TABLE IF EXISTS mt5_sync_sessions CASCADE;
DROP TABLE IF EXISTS mt5_accounts CASCADE;
DROP TABLE IF EXISTS mt5_credentials CASCADE;

-- Verify deletion
DO $$
BEGIN
  RAISE NOTICE 'MT5 integration successfully removed from the database.';
  RAISE NOTICE 'Dropped tables: mt5_accounts, mt5_sync_sessions, mt5_credentials, mt5_connection_history, mt5_connection_monitoring, mt5_security_audit';
  RAISE NOTICE 'Dropped functions: update_mt5_sync_sessions_updated_at()';
END $$;
