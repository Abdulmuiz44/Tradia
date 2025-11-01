-- Add encrypted secret blob and enable RLS across user data tables
-- This migration introduces a jsonb `secret` column for storing
-- AES-GCM encrypted user-provided content, and enables RLS on tables
-- to ensure per-user access only.

-- Ensure pgcrypto for gen_random_uuid (if not present elsewhere)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Trades: add secret column and RLS
ALTER TABLE IF EXISTS trades
  ADD COLUMN IF NOT EXISTS secret JSONB;

ALTER TABLE IF EXISTS trades ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist to avoid duplicates
DROP POLICY IF EXISTS "trades_select_own" ON trades;
DROP POLICY IF EXISTS "trades_insert_own" ON trades;
DROP POLICY IF EXISTS "trades_update_own" ON trades;
DROP POLICY IF EXISTS "trades_delete_own" ON trades;

-- Policies: users can manage only their own rows
CREATE POLICY "trades_select_own" ON trades
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "trades_insert_own" ON trades
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "trades_update_own" ON trades
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "trades_delete_own" ON trades
  FOR DELETE USING (user_id = auth.uid());

-- Trade plans: add secret column and RLS
ALTER TABLE IF EXISTS trade_plans
  ADD COLUMN IF NOT EXISTS secret JSONB;

ALTER TABLE IF EXISTS trade_plans ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "trade_plans_select_own" ON trade_plans;
DROP POLICY IF EXISTS "trade_plans_insert_own" ON trade_plans;
DROP POLICY IF EXISTS "trade_plans_update_own" ON trade_plans;
DROP POLICY IF EXISTS "trade_plans_delete_own" ON trade_plans;

CREATE POLICY "trade_plans_select_own" ON trade_plans
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "trade_plans_insert_own" ON trade_plans
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "trade_plans_update_own" ON trade_plans
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "trade_plans_delete_own" ON trade_plans
  FOR DELETE USING (user_id = auth.uid());

-- Optional: AI chat sessions RLS (metadata only)
ALTER TABLE IF EXISTS ai_chat_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ai_chat_sessions_select_own" ON ai_chat_sessions;
DROP POLICY IF EXISTS "ai_chat_sessions_insert_own" ON ai_chat_sessions;

CREATE POLICY "ai_chat_sessions_select_own" ON ai_chat_sessions
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "ai_chat_sessions_insert_own" ON ai_chat_sessions
  FOR INSERT WITH CHECK (user_id = auth.uid());

