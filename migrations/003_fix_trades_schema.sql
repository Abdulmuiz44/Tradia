-- Fix trades schema - ensure all required columns exist
-- This can be safely run multiple times as it uses IF NOT EXISTS

DO $$
BEGIN
    -- Remove timestamp column if it exists (use opentime instead)
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'trades' AND column_name = 'timestamp') THEN
        ALTER TABLE public.trades DROP COLUMN timestamp;
    END IF;

    -- Add opentime column if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'trades' AND column_name = 'opentime') THEN
        ALTER TABLE public.trades ADD COLUMN opentime TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW());
    END IF;

    -- Add closetime column if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'trades' AND column_name = 'closetime') THEN
        ALTER TABLE public.trades ADD COLUMN closetime TIMESTAMP WITH TIME ZONE;
    END IF;

    -- Add other required columns
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'trades' AND column_name = 'direction') THEN
        ALTER TABLE public.trades ADD COLUMN direction TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'trades' AND column_name = 'ordertype') THEN
        ALTER TABLE public.trades ADD COLUMN ordertype TEXT DEFAULT 'Market Execution';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'trades' AND column_name = 'entryprice') THEN
        ALTER TABLE public.trades ADD COLUMN entryprice DECIMAL;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'trades' AND column_name = 'exitprice') THEN
        ALTER TABLE public.trades ADD COLUMN exitprice DECIMAL;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'trades' AND column_name = 'stoplossprice') THEN
        ALTER TABLE public.trades ADD COLUMN stoplossprice DECIMAL;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'trades' AND column_name = 'takeprofitprice') THEN
        ALTER TABLE public.trades ADD COLUMN takeprofitprice DECIMAL;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'trades' AND column_name = 'session') THEN
        ALTER TABLE public.trades ADD COLUMN session TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'trades' AND column_name = 'outcome') THEN
        ALTER TABLE public.trades ADD COLUMN outcome TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'trades' AND column_name = 'resultrr') THEN
        ALTER TABLE public.trades ADD COLUMN resultrr DECIMAL;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'trades' AND column_name = 'duration') THEN
        ALTER TABLE public.trades ADD COLUMN duration TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'trades' AND column_name = 'reasonfortrade') THEN
        ALTER TABLE public.trades ADD COLUMN reasonfortrade TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'trades' AND column_name = 'strategy') THEN
        ALTER TABLE public.trades ADD COLUMN strategy TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'trades' AND column_name = 'emotion') THEN
        ALTER TABLE public.trades ADD COLUMN emotion TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'trades' AND column_name = 'journalnotes') THEN
        ALTER TABLE public.trades ADD COLUMN journalnotes TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'trades' AND column_name = 'notes') THEN
        ALTER TABLE public.trades ADD COLUMN notes TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'trades' AND column_name = 'beforescreenshoturl') THEN
        ALTER TABLE public.trades ADD COLUMN beforescreenshoturl TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'trades' AND column_name = 'afterscreenshoturl') THEN
        ALTER TABLE public.trades ADD COLUMN afterscreenshoturl TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'trades' AND column_name = 'commission') THEN
        ALTER TABLE public.trades ADD COLUMN commission DECIMAL DEFAULT 0;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'trades' AND column_name = 'swap') THEN
        ALTER TABLE public.trades ADD COLUMN swap DECIMAL DEFAULT 0;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'trades' AND column_name = 'pinned') THEN
        ALTER TABLE public.trades ADD COLUMN pinned BOOLEAN DEFAULT false;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'trades' AND column_name = 'tags') THEN
        ALTER TABLE public.trades ADD COLUMN tags TEXT[];
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'trades' AND column_name = 'reviewed') THEN
        ALTER TABLE public.trades ADD COLUMN reviewed BOOLEAN DEFAULT false;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'trades' AND column_name = 'profitloss') THEN
        ALTER TABLE public.trades ADD COLUMN profitloss TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'trades' AND column_name = 'rr') THEN
        ALTER TABLE public.trades ADD COLUMN rr DECIMAL;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'trades' AND column_name = 'lotsize') THEN
        ALTER TABLE public.trades ADD COLUMN lotsize DECIMAL;
    END IF;

END $$;
