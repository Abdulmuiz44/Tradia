// src/lib/database-schema.ts
/**
 * Database schema definitions for MT5 integration
 * These should be applied to your Supabase database
 */

export const MT5_SCHEMA = {
  // MT5 Credentials Table
  mt5_credentials: `
    CREATE TABLE IF NOT EXISTS mt5_credentials (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name VARCHAR(255) NOT NULL,
      server VARCHAR(255) NOT NULL,
      login VARCHAR(50) NOT NULL,
      encrypted_password JSONB NOT NULL,
      is_active BOOLEAN DEFAULT true,
      last_used_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW(),
      rotation_required BOOLEAN DEFAULT false,
      security_level VARCHAR(20) DEFAULT 'medium' CHECK (security_level IN ('high', 'medium', 'low')),

      -- Ensure unique active credentials per user/server/login combination
      UNIQUE(user_id, server, login, is_active)
    );

    -- Indexes for performance
    CREATE INDEX IF NOT EXISTS idx_mt5_credentials_user_id ON mt5_credentials(user_id);
    CREATE INDEX IF NOT EXISTS idx_mt5_credentials_active ON mt5_credentials(is_active) WHERE is_active = true;
    CREATE INDEX IF NOT EXISTS idx_mt5_credentials_rotation ON mt5_credentials(rotation_required) WHERE rotation_required = true;

    -- Updated timestamp trigger
    CREATE OR REPLACE FUNCTION update_mt5_credentials_updated_at()
    RETURNS TRIGGER AS $$
    BEGIN
      NEW.updated_at = NOW();
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;

    CREATE TRIGGER trigger_mt5_credentials_updated_at
      BEFORE UPDATE ON mt5_credentials
      FOR EACH ROW
      EXECUTE FUNCTION update_mt5_credentials_updated_at();
  `,

  // Connection History Table
  mt5_connection_history: `
    CREATE TABLE IF NOT EXISTS mt5_connection_history (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      credential_id UUID REFERENCES mt5_credentials(id) ON DELETE SET NULL,
      server VARCHAR(255) NOT NULL,
      login VARCHAR(50) NOT NULL,
      action VARCHAR(50) NOT NULL, -- 'connect', 'disconnect', 'sync', 'validate', 'error'
      status VARCHAR(50) NOT NULL, -- 'success', 'failed', 'timeout', 'cancelled'
      started_at TIMESTAMPTZ NOT NULL,
      completed_at TIMESTAMPTZ,
      duration_ms INTEGER,
      error_type VARCHAR(100),
      error_message TEXT,
      ip_address INET,
      user_agent TEXT,
      metadata JSONB, -- Additional context (trades synced, account info, etc.)
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    -- Indexes for performance
    CREATE INDEX IF NOT EXISTS idx_mt5_connection_history_user_id ON mt5_connection_history(user_id);
    CREATE INDEX IF NOT EXISTS idx_mt5_connection_history_credential_id ON mt5_connection_history(credential_id);
    CREATE INDEX IF NOT EXISTS idx_mt5_connection_history_action ON mt5_connection_history(action);
    CREATE INDEX IF NOT EXISTS idx_mt5_connection_history_status ON mt5_connection_history(status);
    CREATE INDEX IF NOT EXISTS idx_mt5_connection_history_started_at ON mt5_connection_history(started_at DESC);
  `,

  // Sync Sessions Table
  mt5_sync_sessions: `
    CREATE TABLE IF NOT EXISTS mt5_sync_sessions (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      credential_id UUID NOT NULL REFERENCES mt5_credentials(id) ON DELETE CASCADE,
      status VARCHAR(50) NOT NULL DEFAULT 'running', -- 'running', 'completed', 'failed', 'cancelled'
      started_at TIMESTAMPTZ DEFAULT NOW(),
      completed_at TIMESTAMPTZ,
      total_trades INTEGER DEFAULT 0,
      new_trades INTEGER DEFAULT 0,
      updated_trades INTEGER DEFAULT 0,
      from_date DATE,
      to_date DATE,
      progress_percentage INTEGER DEFAULT 0 CHECK (progress_percentage >= 0 AND progress_percentage <= 100),
      error_message TEXT,
      metadata JSONB,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );

    -- Indexes for performance
    CREATE INDEX IF NOT EXISTS idx_mt5_sync_sessions_user_id ON mt5_sync_sessions(user_id);
    CREATE INDEX IF NOT EXISTS idx_mt5_sync_sessions_credential_id ON mt5_sync_sessions(credential_id);
    CREATE INDEX IF NOT EXISTS idx_mt5_sync_sessions_status ON mt5_sync_sessions(status);
    CREATE INDEX IF NOT EXISTS idx_mt5_sync_sessions_started_at ON mt5_sync_sessions(started_at DESC);

    -- Updated timestamp trigger
    CREATE OR REPLACE FUNCTION update_mt5_sync_sessions_updated_at()
    RETURNS TRIGGER AS $$
    BEGIN
      NEW.updated_at = NOW();
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;

    CREATE TRIGGER trigger_mt5_sync_sessions_updated_at
      BEFORE UPDATE ON mt5_sync_sessions
      FOR EACH ROW
      EXECUTE FUNCTION update_mt5_sync_sessions_updated_at();
  `,

  // Connection Monitoring Table
  mt5_connection_monitoring: `
    CREATE TABLE IF NOT EXISTS mt5_connection_monitoring (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      credential_id UUID NOT NULL REFERENCES mt5_credentials(id) ON DELETE CASCADE,
      status VARCHAR(50) NOT NULL, -- 'online', 'offline', 'degraded', 'unknown'
      response_time_ms INTEGER,
      last_check_at TIMESTAMPTZ DEFAULT NOW(),
      consecutive_failures INTEGER DEFAULT 0,
      total_checks INTEGER DEFAULT 0,
      uptime_percentage DECIMAL(5,2) DEFAULT 100.00,
      error_message TEXT,
      metadata JSONB,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW(),

      -- Ensure one monitoring record per credential
      UNIQUE(user_id, credential_id)
    );

    -- Indexes for performance
    CREATE INDEX IF NOT EXISTS idx_mt5_connection_monitoring_status ON mt5_connection_monitoring(status);
    CREATE INDEX IF NOT EXISTS idx_mt5_connection_monitoring_last_check ON mt5_connection_monitoring(last_check_at DESC);

    -- Updated timestamp trigger
    CREATE OR REPLACE FUNCTION update_mt5_connection_monitoring_updated_at()
    RETURNS TRIGGER AS $$
    BEGIN
      NEW.updated_at = NOW();
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;

    CREATE TRIGGER trigger_mt5_connection_monitoring_updated_at
      BEFORE UPDATE ON mt5_connection_monitoring
      FOR EACH ROW
      EXECUTE FUNCTION update_mt5_connection_monitoring_updated_at();
  `,

  // Security Audit Table
  mt5_security_audit: `
    CREATE TABLE IF NOT EXISTS mt5_security_audit (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      credential_id UUID REFERENCES mt5_credentials(id) ON DELETE SET NULL,
      action VARCHAR(100) NOT NULL, -- 'credential_created', 'credential_updated', 'credential_deleted', 'key_rotated', etc.
      severity VARCHAR(20) DEFAULT 'info', -- 'critical', 'high', 'medium', 'low', 'info'
      ip_address INET,
      user_agent TEXT,
      old_values JSONB,
      new_values JSONB,
      metadata JSONB,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    -- Indexes for performance
    CREATE INDEX IF NOT EXISTS idx_mt5_security_audit_user_id ON mt5_security_audit(user_id);
    CREATE INDEX IF NOT EXISTS idx_mt5_security_audit_action ON mt5_security_audit(action);
    CREATE INDEX IF NOT EXISTS idx_mt5_security_audit_severity ON mt5_security_audit(severity);
    CREATE INDEX IF NOT EXISTS idx_mt5_security_audit_created_at ON mt5_security_audit(created_at DESC);
  `,

  // Trading Rules & Risk Settings
  trading_rules: `
    CREATE TABLE IF NOT EXISTS trading_rules (
      user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      daily_drawdown_limit_pct DECIMAL(5,2) DEFAULT 1.00,
      max_drawdown_limit_pct DECIMAL(5,2) DEFAULT 5.00,
      profit_target_pct DECIMAL(5,2) DEFAULT 10.00,
      max_trades_per_day INTEGER DEFAULT 5,
      enforce_halt BOOLEAN DEFAULT false,
      starting_equity DECIMAL(15,2) DEFAULT 0.00,
      prop_firm_preset VARCHAR(50), -- 'ftmo', 'apex', 'topstep'
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_trading_rules_updated_at ON trading_rules(updated_at DESC);

    -- Updated timestamp trigger
    CREATE OR REPLACE FUNCTION update_trading_rules_updated_at()
    RETURNS TRIGGER AS $$
    BEGIN
      NEW.updated_at = NOW();
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;

    CREATE TRIGGER trigger_trading_rules_updated_at
      BEFORE UPDATE ON trading_rules
      FOR EACH ROW
      EXECUTE FUNCTION update_trading_rules_updated_at();
  `
};

/**
 * SQL to create all MT5-related tables
 */
export const CREATE_ALL_MT5_TABLES = Object.values(MT5_SCHEMA).join('\n\n');

/**
 * SQL to drop all MT5-related tables (for cleanup/testing)
 */
export const DROP_ALL_MT5_TABLES = `
  DROP TABLE IF EXISTS mt5_security_audit;
  DROP TABLE IF EXISTS mt5_connection_monitoring;
  DROP TABLE IF EXISTS mt5_sync_sessions;
  DROP TABLE IF EXISTS mt5_connection_history;
  DROP TABLE IF EXISTS mt5_credentials;

  -- Drop triggers
  DROP TRIGGER IF EXISTS trigger_mt5_credentials_updated_at ON mt5_credentials;
  DROP TRIGGER IF EXISTS trigger_mt5_sync_sessions_updated_at ON mt5_sync_sessions;
  DROP TRIGGER IF EXISTS trigger_mt5_connection_monitoring_updated_at ON mt5_connection_monitoring;

  -- Drop functions
  DROP FUNCTION IF EXISTS update_mt5_credentials_updated_at();
  DROP FUNCTION IF EXISTS update_mt5_sync_sessions_updated_at();
  DROP FUNCTION IF EXISTS update_mt5_connection_monitoring_updated_at();
`;

/**
 * Migration helpers
 */
export const MIGRATIONS = {
  // Add new columns or tables as needed
  add_encryption_metadata: `
    ALTER TABLE mt5_credentials
    ADD COLUMN IF NOT EXISTS encryption_version VARCHAR(20) DEFAULT 'v1',
    ADD COLUMN IF NOT EXISTS key_rotation_date TIMESTAMPTZ;
  `,

  add_connection_limits: `
    ALTER TABLE mt5_credentials
    ADD COLUMN IF NOT EXISTS max_connections INTEGER DEFAULT 1,
    ADD COLUMN IF NOT EXISTS rate_limit_per_hour INTEGER DEFAULT 60;
  `,

  add_backup_credentials: `
  ALTER TABLE mt5_credentials
  ADD COLUMN IF NOT EXISTS backup_password JSONB,
  ADD COLUMN IF NOT EXISTS backup_enabled BOOLEAN DEFAULT false;
  `,

  // User Feedback Table for Growth Pulse Analytics
  user_feedback: `
    CREATE TABLE IF NOT EXISTS user_feedback (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      focus VARCHAR(50), -- 'confidence', 'profits', 'automation'
      rating INTEGER CHECK (rating >= 1 AND rating <= 10),
      comment TEXT,
      user_agent TEXT, -- browser/device info
      page_url TEXT, -- where feedback was given
      session_duration INTEGER, -- seconds spent on platform
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW(),

      -- Ensure meaningful feedback
      CONSTRAINT meaningful_feedback CHECK (
        focus IS NOT NULL OR
        rating IS NOT NULL OR
        comment IS NOT NULL
      )
    );

    -- Indexes for analytics
    CREATE INDEX IF NOT EXISTS idx_user_feedback_user_id ON user_feedback(user_id);
    CREATE INDEX IF NOT EXISTS idx_user_feedback_focus ON user_feedback(focus);
    CREATE INDEX IF NOT EXISTS idx_user_feedback_rating ON user_feedback(rating);
    CREATE INDEX IF NOT EXISTS idx_user_feedback_created_at ON user_feedback(created_at DESC);

    -- Updated timestamp trigger
    CREATE OR REPLACE FUNCTION update_user_feedback_updated_at()
    RETURNS TRIGGER AS $$
    BEGIN
      NEW.updated_at = NOW();
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;

    CREATE TRIGGER trigger_user_feedback_updated_at
      BEFORE UPDATE ON user_feedback
      FOR EACH ROW
      EXECUTE FUNCTION update_user_feedback_updated_at();
  `
};