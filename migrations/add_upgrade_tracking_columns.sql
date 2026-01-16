-- Migration: Add upgrade modal and first login tracking columns
-- Run this in your Supabase SQL editor

-- Add column to track when upgrade modal was last shown
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS upgrade_modal_shown_at TIMESTAMPTZ;

-- Add column to track if user has completed first login (for signup redirect)
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS first_login_complete BOOLEAN DEFAULT FALSE;

-- Create index for efficient queries
CREATE INDEX IF NOT EXISTS idx_users_upgrade_modal_shown_at ON users(upgrade_modal_shown_at);
CREATE INDEX IF NOT EXISTS idx_users_first_login_complete ON users(first_login_complete);

-- Comment for documentation
COMMENT ON COLUMN users.upgrade_modal_shown_at IS 'Timestamp when upgrade modal was last shown to user (for session-based tracking)';
COMMENT ON COLUMN users.first_login_complete IS 'Whether user has completed first login flow (for upgrade redirect)';
