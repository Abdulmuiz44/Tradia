-- Non-destructive compatibility fix for trades column naming and metadata.
-- This migration intentionally avoids dropping/recreating public.trades.

DO $$
BEGIN
  IF to_regclass('public.trades') IS NULL THEN
    RAISE NOTICE 'public.trades does not exist; skipping 003_fix_column_names.sql';
    RETURN;
  END IF;

  ALTER TABLE public.trades
    ADD COLUMN IF NOT EXISTS ordertype text,
    ADD COLUMN IF NOT EXISTS opentime timestamptz,
    ADD COLUMN IF NOT EXISTS closetime timestamptz,
    ADD COLUMN IF NOT EXISTS lotsize numeric DEFAULT 0.01,
    ADD COLUMN IF NOT EXISTS entryprice numeric DEFAULT 0,
    ADD COLUMN IF NOT EXISTS exitprice numeric,
    ADD COLUMN IF NOT EXISTS stoplossprice numeric,
    ADD COLUMN IF NOT EXISTS takeprofitprice numeric,
    ADD COLUMN IF NOT EXISTS profitloss text,
    ADD COLUMN IF NOT EXISTS resultrr numeric,
    ADD COLUMN IF NOT EXISTS rr text,
    ADD COLUMN IF NOT EXISTS beforescreenshoturl text,
    ADD COLUMN IF NOT EXISTS afterscreenshoturl text,
    ADD COLUMN IF NOT EXISTS reasonfortrade text,
    ADD COLUMN IF NOT EXISTS journalnotes text,
    ADD COLUMN IF NOT EXISTS raw jsonb;
END $$;

CREATE INDEX IF NOT EXISTS trades_user_idx ON public.trades(user_id);
CREATE INDEX IF NOT EXISTS trades_symbol_idx ON public.trades(symbol);
CREATE INDEX IF NOT EXISTS trades_opentime_idx ON public.trades(opentime);

COMMENT ON TABLE public.trades IS 'Trading journal entries with complete trade data';
