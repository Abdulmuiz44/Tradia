-- database/migrations/seed_sample_analytics.sql
-- Optional seed to verify the admin analytics dashboard shows non-zero data.
-- It will pick the most recently created user (if present) to attach data to.

DO $$
DECLARE
  v_user UUID;
  has_source BOOLEAN;
  has_open_time BOOLEAN;
  has_close_time BOOLEAN;
  has_reason_for_trade BOOLEAN;
  has_journal_notes BOOLEAN;
BEGIN
  SELECT u.id
  INTO v_user
  FROM users u
  WHERE EXISTS (SELECT 1 FROM auth.users au WHERE au.id = u.id)
  ORDER BY u.created_at DESC NULLS LAST
  LIMIT 1;

  IF v_user IS NULL THEN
    SELECT au.id
    INTO v_user
    FROM auth.users au
    WHERE EXISTS (SELECT 1 FROM users u WHERE u.id = au.id)
    ORDER BY au.created_at DESC NULLS LAST
    LIMIT 1;
  END IF;

  IF v_user IS NULL THEN
    RAISE NOTICE 'No shared users/auth.users id found; skipping seed.';
    RETURN;
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'trades' AND column_name = 'source'
  ) INTO has_source;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'trades' AND column_name = 'open_time'
  ) INTO has_open_time;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'trades' AND column_name = 'close_time'
  ) INTO has_close_time;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'trades' AND column_name = 'reasonfortrade'
  ) INTO has_reason_for_trade;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'trades' AND column_name = 'journalnotes'
  ) INTO has_journal_notes;

  -- Insert a handful of trades across different times and outcomes
  IF has_source AND has_open_time AND has_close_time AND has_reason_for_trade AND has_journal_notes THEN
    INSERT INTO trades(user_id, symbol, outcome, pnl, source, open_time, close_time, deal_id, strategy, reasonForTrade, emotion, journalNotes)
    VALUES
      (v_user, 'EURUSD', 'Win', 120.50, 'manual', NOW() - INTERVAL '10 days', NOW() - INTERVAL '10 days' + INTERVAL '2 hours', NULL, 'Breakout', 'Momentum entry', 'confident', 'Good timing on breakout'),
      (v_user, 'GBPUSD', 'Loss', -75.25, 'manual', NOW() - INTERVAL '8 days', NOW() - INTERVAL '8 days' + INTERVAL '1 hour', NULL, 'Pullback', 'Late entry', 'frustrated', 'Chased pullback late'),
      (v_user, 'XAUUSD', 'Win', 245.10, 'import', NOW() - INTERVAL '6 days', NOW() - INTERVAL '6 days' + INTERVAL '3 hours', 'MT5-12345', 'Trend', 'Higher timeframe confluence', 'focused', 'Strong trend continuation'),
      (v_user, 'BTCUSD', 'Loss', -130.00, 'mt5', NOW() - INTERVAL '3 days', NOW() - INTERVAL '3 days' + INTERVAL '45 minutes', 'MT5-67890', 'Counter-trend', 'Overextended move', 'anxious', 'Counter-trend too early'),
      (v_user, 'EURJPY', 'Win', 62.75, 'manual', NOW() - INTERVAL '1 days', NOW() - INTERVAL '1 days' + INTERVAL '30 minutes', NULL, 'Scalp', 'Session momentum', 'calm', 'Quick scalp in London');
  ELSE
    INSERT INTO trades(user_id, symbol, outcome, pnl, strategy, emotion, notes)
    VALUES
      (v_user, 'EURUSD', 'Win', 120.50, 'Breakout', 'confident', 'Good timing on breakout'),
      (v_user, 'GBPUSD', 'Loss', -75.25, 'Pullback', 'frustrated', 'Chased pullback late'),
      (v_user, 'XAUUSD', 'Win', 245.10, 'Trend', 'focused', 'Strong trend continuation'),
      (v_user, 'BTCUSD', 'Loss', -130.00, 'Counter-trend', 'anxious', 'Counter-trend too early'),
      (v_user, 'EURJPY', 'Win', 62.75, 'Scalp', 'calm', 'Quick scalp in London');
  END IF;

  -- Insert a couple of trade plans
  IF to_regclass('public.trade_plans') IS NOT NULL THEN
    INSERT INTO trade_plans(user_id, symbol, setup_type, planned_entry, stop_loss, take_profit, lot_size, risk_reward, notes, status)
    VALUES
      (v_user, 'EURUSD', 'Breakout', 1.0900, 1.0875, 1.0950, 1, 2.0, 'London breakout setup', 'planned'),
      (v_user, 'XAUUSD', 'Pullback', 2350.00, 2340.00, 2375.00, 0.5, 2.5, 'H4 pullback into demand', 'planned');
  END IF;

  -- Insert AI chat session summary rows
  IF to_regclass('public.ai_chat_sessions') IS NOT NULL THEN
    INSERT INTO ai_chat_sessions(user_id, started_at, ended_at, last_message_at, message_count, metadata)
    VALUES
      (v_user, NOW() - INTERVAL '2 days', NOW() - INTERVAL '2 days' + INTERVAL '10 minutes', NOW() - INTERVAL '2 days' + INTERVAL '10 minutes', 6, '{"topic":"performance"}'::jsonb),
      (v_user, NOW() - INTERVAL '12 hours', NULL, NOW() - INTERVAL '11 hours', 3, '{"topic":"risk"}'::jsonb);
  END IF;
END $$;

