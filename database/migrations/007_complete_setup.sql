-- COMPLETE TRADES SYSTEM SETUP (non-destructive replay-safe variant)
-- This migration keeps existing data and only ensures expected columns, indexes, comments, and policy exist.

DO $$
BEGIN
  IF to_regclass('public.trades') IS NULL THEN
    RAISE NOTICE 'public.trades missing, skipping 007_complete_setup.sql';
    RETURN;
  END IF;

  ALTER TABLE public.trades
    ADD COLUMN IF NOT EXISTS direction text,
    ADD COLUMN IF NOT EXISTS ordertype text,
    ADD COLUMN IF NOT EXISTS opentime timestamptz,
    ADD COLUMN IF NOT EXISTS closetime timestamptz,
    ADD COLUMN IF NOT EXISTS session text,
    ADD COLUMN IF NOT EXISTS lotsize numeric NOT NULL DEFAULT 0.01,
    ADD COLUMN IF NOT EXISTS entryprice numeric NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS exitprice numeric,
    ADD COLUMN IF NOT EXISTS stoplossprice numeric,
    ADD COLUMN IF NOT EXISTS takeprofitprice numeric,
    ADD COLUMN IF NOT EXISTS pnl numeric NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS profitloss text,
    ADD COLUMN IF NOT EXISTS resultrr numeric,
    ADD COLUMN IF NOT EXISTS rr text,
    ADD COLUMN IF NOT EXISTS outcome text,
    ADD COLUMN IF NOT EXISTS duration text,
    ADD COLUMN IF NOT EXISTS beforescreenshoturl text,
    ADD COLUMN IF NOT EXISTS afterscreenshoturl text,
    ADD COLUMN IF NOT EXISTS commission numeric,
    ADD COLUMN IF NOT EXISTS swap numeric,
    ADD COLUMN IF NOT EXISTS pinned boolean DEFAULT false,
    ADD COLUMN IF NOT EXISTS tags text[],
    ADD COLUMN IF NOT EXISTS reviewed boolean DEFAULT false,
    ADD COLUMN IF NOT EXISTS strategy text,
    ADD COLUMN IF NOT EXISTS emotion text,
    ADD COLUMN IF NOT EXISTS reasonfortrade text,
    ADD COLUMN IF NOT EXISTS journalnotes text,
    ADD COLUMN IF NOT EXISTS notes text,
    ADD COLUMN IF NOT EXISTS raw jsonb,
    ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now(),
    ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();
END $$;

CREATE INDEX IF NOT EXISTS trades_user_idx ON trades(user_id);
CREATE INDEX IF NOT EXISTS trades_symbol_idx ON trades(symbol);
CREATE INDEX IF NOT EXISTS trades_opentime_idx ON trades(opentime);

COMMENT ON TABLE public.trades IS 'Trading journal entries with complete trade data';

ALTER TABLE public.trades ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "authenticated_users_full_access" ON public.trades;
CREATE POLICY "authenticated_users_full_access"
ON public.trades
FOR ALL
TO authenticated
USING (auth.uid()::text = user_id::text)
WITH CHECK (auth.uid()::text = user_id::text);
