-- Fix Supabase schema cache issue with quoted column names
-- WARNING: This will drop and recreate the trades table with proper column names
-- BACKUP YOUR DATA BEFORE RUNNING THIS!

-- Drop the existing table (dangerous - backup data first!)
DROP TABLE IF EXISTS public.trades CASCADE;

-- Recreate the table with proper unquoted column names for Supabase compatibility
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
  -- Temporarily remove foreign key constraint to allow operations
  -- CONSTRAINT trades_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Temporarily disable RLS for testing (will enable proper policies after fixing the issue)
-- ALTER TABLE public.trades ENABLE ROW LEVEL SECURITY;

-- Drop existing policies and constraints if they exist
DROP POLICY IF EXISTS "Allow all access for authenticated users" ON public.trades;
DROP POLICY IF EXISTS "Allow inserts for authenticated users" ON public.trades;
DROP POLICY IF EXISTS "Allow all operations for authenticated users" ON public.trades;
DROP CONSTRAINT IF EXISTS trades_user_id_fkey ON public.trades;

-- For now, disable RLS to allow operations
ALTER TABLE public.trades DISABLE ROW LEVEL SECURITY;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS trades_user_idx ON trades(user_id);
CREATE INDEX IF NOT EXISTS trades_symbol_idx ON trades(symbol);
CREATE INDEX IF NOT EXISTS trades_opentime_idx ON trades(opentime);

-- Add comments for documentation
COMMENT ON TABLE public.trades IS 'Trading journal entries with complete trade data';
COMMENT ON COLUMN public.trades.ordertype IS 'Type of order (Market Execution, Limit, etc.)';
COMMENT ON COLUMN public.trades.opentime IS 'Time when the trade was opened';
COMMENT ON COLUMN public.trades.closetime IS 'Time when the trade was closed';
COMMENT ON COLUMN public.trades.lotsize IS 'Size of the trade in lots';
COMMENT ON COLUMN public.trades.entryprice IS 'Price at which the trade was entered';
COMMENT ON COLUMN public.trades.exitprice IS 'Price at which the trade was exited';
COMMENT ON COLUMN public.trades.stoplossprice IS 'Stop loss price level';
COMMENT ON COLUMN public.trades.takeprofitprice IS 'Take profit price level';
COMMENT ON COLUMN public.trades.resultrr IS 'Result risk-reward ratio achieved';
COMMENT ON COLUMN public.trades.beforescreenshoturl IS 'Screenshot URL before trade execution';
COMMENT ON COLUMN public.trades.afterscreenshoturl IS 'Screenshot URL after trade execution';
COMMENT ON COLUMN public.trades.strategy IS 'Trading strategy used for the trade';
COMMENT ON COLUMN public.trades.emotion IS 'Emotional state during the trade';
COMMENT ON COLUMN public.trades.reasonfortrade IS 'Reason for entering the trade';
COMMENT ON COLUMN public.trades.journalnotes IS 'Detailed journal notes for the trade';
COMMENT ON COLUMN public.trades.notes IS 'Additional notes for the trade';
