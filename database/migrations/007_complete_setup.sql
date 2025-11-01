-- COMPLETE TRADES SYSTEM SETUP
-- This migration sets up everything needed for the trading system to work

-- Step 1: Recreate trades table with all columns and proper setup
DROP TABLE IF EXISTS public.trades CASCADE;

CREATE TABLE public.trades (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  symbol text NOT NULL,
  direction text NULL,
  ordertype text NULL,
  opentime timestamptz NULL,
  closetime timestamptz NULL,
  session text NULL,
  lotsize numeric NOT NULL DEFAULT 0.01,
  entryprice numeric NOT NULL DEFAULT 0,
  exitprice numeric NULL,
  stoplossprice numeric NULL,
  takeprofitprice numeric NULL,
  pnl numeric NOT NULL DEFAULT 0,
  profitloss text NULL,
  resultrr numeric NULL,
  rr text NULL,
  outcome text NULL,
  duration text NULL,
  beforescreenshoturl text NULL,
  afterscreenshoturl text NULL,
  commission numeric NULL,
  swap numeric NULL,
  pinned boolean NULL DEFAULT false,
  tags text[] NULL,
  reviewed boolean NULL DEFAULT false,
  strategy text NULL,
  emotion text NULL,
  reasonfortrade text NULL,
  journalnotes text NULL,
  notes text NULL,
  raw jsonb NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT trades_pkey PRIMARY KEY (id)
);

-- Step 2: Create indexes for performance
CREATE INDEX IF NOT EXISTS trades_user_idx ON trades(user_id);
CREATE INDEX IF NOT EXISTS trades_symbol_idx ON trades(symbol);
CREATE INDEX IF NOT EXISTS trades_opentime_idx ON trades(opentime);

-- Step 3: Add comments for documentation
COMMENT ON TABLE public.trades IS 'Trading journal entries with complete trade data';
COMMENT ON COLUMN public.trades.ordertype IS 'Type of order (Market Execution, Limit, etc.)';
COMMENT ON COLUMN public.trades.opentime IS 'Time when the trade was opened';
COMMENT ON COLUMN public.trades.closetime IS 'Time when the trade was closed';
COMMENT ON COLUMN public.trades.takeprofitprice IS 'Take profit price level';
COMMENT ON COLUMN public.trades.resultrr IS 'Result risk-reward ratio achieved';
COMMENT ON COLUMN public.trades.beforescreenshoturl IS 'Screenshot URL before trade execution';
COMMENT ON COLUMN public.trades.afterscreenshoturl IS 'Screenshot URL after trade execution';
COMMENT ON COLUMN public.trades.strategy IS 'Trading strategy used';
COMMENT ON COLUMN public.trades.emotion IS 'Emotional state during trade';
COMMENT ON COLUMN public.trades.reasonfortrade IS 'Reason for entering trade';
COMMENT ON COLUMN public.trades.journalnotes IS 'Detailed journal notes';
COMMENT ON COLUMN public.trades.notes IS 'Additional notes';

-- Step 4: Enable RLS and create policies
ALTER TABLE public.trades ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "authenticated_users_full_access" ON public.trades;

CREATE POLICY "authenticated_users_full_access"
ON public.trades
FOR ALL
TO authenticated
USING (auth.uid()::text = user_id::text)
WITH CHECK (auth.uid()::text = user_id::text);

-- Step 5: Test the setup by inserting a sample trade
-- (This will be removed after testing)
-- INSERT INTO public.trades (user_id, symbol, direction, lotsize, entryprice, pnl, outcome)
-- SELECT
--   auth.uid(),
--   'TEST_SYMBOL',
--   'Buy',
--   0.01,
--   100.0,
--   10.0,
--   'Win'
-- WHERE auth.uid() IS NOT NULL
-- LIMIT 1;
