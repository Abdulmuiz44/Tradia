-- Verification Query: Trade Count Baseline (Run BEFORE and AFTER MT5 removal)
-- Simple query that should work regardless of missing columns
-- This verifies no trade data is deleted during MT5 table removal

-- ===== SECTION 1: Basic Trade Count =====
SELECT 
  'TOTAL TRADES' as metric,
  COUNT(*)::text as value
FROM trades;

-- ===== SECTION 2: Trades by User =====
SELECT 
  'DISTINCT users with trades' as metric,
  COUNT(DISTINCT user_id)::text as value
FROM trades;

-- ===== SECTION 3: Basic Summary (BEFORE/AFTER COMPARISON) =====
-- Run this before and after the migration
-- The total_trades count should remain the same after MT5 tables are deleted
SELECT 
  'BASELINE_CHECK' as check_point,
  COUNT(*)::int as total_trades,
  COUNT(DISTINCT user_id)::int as distinct_users,
  COUNT(DISTINCT symbol)::int as distinct_symbols,
  MIN(created_at)::text as oldest_trade,
  MAX(created_at)::text as newest_trade
FROM trades;
