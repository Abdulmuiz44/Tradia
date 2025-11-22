-- Migration to update trades table with missing columns
-- Run this in your Supabase SQL Editor

-- Add missing columns if they don't exist
DO $$
BEGIN
    -- Add session column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'trades' AND column_name = 'session') THEN
        ALTER TABLE public.trades ADD COLUMN session TEXT;
    END IF;

    -- Add open_time column (alias for timestamp in some contexts, but explicit here)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'trades' AND column_name = 'opentime') THEN
        ALTER TABLE public.trades ADD COLUMN opentime TIMESTAMP WITH TIME ZONE;
    END IF;

    -- Add close_time column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'trades' AND column_name = 'closetime') THEN
        ALTER TABLE public.trades ADD COLUMN closetime TIMESTAMP WITH TIME ZONE;
    END IF;

    -- Add entry_price column (alias for price, but explicit)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'trades' AND column_name = 'entryprice') THEN
        ALTER TABLE public.trades ADD COLUMN entryprice DECIMAL;
    END IF;

    -- Add exit_price column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'trades' AND column_name = 'exitprice') THEN
        ALTER TABLE public.trades ADD COLUMN exitprice DECIMAL;
    END IF;

    -- Add stop_loss_price column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'trades' AND column_name = 'stoplossprice') THEN
        ALTER TABLE public.trades ADD COLUMN stoplossprice DECIMAL;
    END IF;

    -- Add take_profit_price column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'trades' AND column_name = 'takeprofitprice') THEN
        ALTER TABLE public.trades ADD COLUMN takeprofitprice DECIMAL;
    END IF;

    -- Add lot_size column (alias for quantity)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'trades' AND column_name = 'lotsize') THEN
        ALTER TABLE public.trades ADD COLUMN lotsize DECIMAL;
    END IF;

    -- Add outcome column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'trades' AND column_name = 'outcome') THEN
        ALTER TABLE public.trades ADD COLUMN outcome TEXT;
    END IF;

    -- Add commission column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'trades' AND column_name = 'commission') THEN
        ALTER TABLE public.trades ADD COLUMN commission DECIMAL DEFAULT 0;
    END IF;

    -- Add swap column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'trades' AND column_name = 'swap') THEN
        ALTER TABLE public.trades ADD COLUMN swap DECIMAL DEFAULT 0;
    END IF;

    -- Add strategy column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'trades' AND column_name = 'strategy') THEN
        ALTER TABLE public.trades ADD COLUMN strategy TEXT;
    END IF;

    -- Add reason_for_trade column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'trades' AND column_name = 'reasonfortrade') THEN
        ALTER TABLE public.trades ADD COLUMN reasonfortrade TEXT;
    END IF;

    -- Add emotion column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'trades' AND column_name = 'emotion') THEN
        ALTER TABLE public.trades ADD COLUMN emotion TEXT;
    END IF;

    -- Add journal_notes column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'trades' AND column_name = 'journalnotes') THEN
        ALTER TABLE public.trades ADD COLUMN journalnotes TEXT;
    END IF;

    -- Add notes column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'trades' AND column_name = 'notes') THEN
        ALTER TABLE public.trades ADD COLUMN notes TEXT;
    END IF;

    -- Add before_screenshot_url column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'trades' AND column_name = 'beforescreenshoturl') THEN
        ALTER TABLE public.trades ADD COLUMN beforescreenshoturl TEXT;
    END IF;

    -- Add after_screenshot_url column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'trades' AND column_name = 'afterscreenshoturl') THEN
        ALTER TABLE public.trades ADD COLUMN afterscreenshoturl TEXT;
    END IF;

    -- Add tags column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'trades' AND column_name = 'tags') THEN
        ALTER TABLE public.trades ADD COLUMN tags TEXT[];
    END IF;

    -- Add reviewed column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'trades' AND column_name = 'reviewed') THEN
        ALTER TABLE public.trades ADD COLUMN reviewed BOOLEAN DEFAULT false;
    END IF;

    -- Add pinned column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'trades' AND column_name = 'pinned') THEN
        ALTER TABLE public.trades ADD COLUMN pinned BOOLEAN DEFAULT false;
    END IF;
    
    -- Add resultRR column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'trades' AND column_name = 'resultrr') THEN
        ALTER TABLE public.trades ADD COLUMN resultrr DECIMAL;
    END IF;

    -- Add duration column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'trades' AND column_name = 'duration') THEN
        ALTER TABLE public.trades ADD COLUMN duration TEXT;
    END IF;

    -- Add profit_loss column (string representation if needed, or alias)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'trades' AND column_name = 'profitloss') THEN
        ALTER TABLE public.trades ADD COLUMN profitloss TEXT;
    END IF;
    
    -- Add ordertype column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'trades' AND column_name = 'ordertype') THEN
        ALTER TABLE public.trades ADD COLUMN ordertype TEXT DEFAULT 'Market Execution';
    END IF;
    
    -- Add direction column (alias for side)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'trades' AND column_name = 'direction') THEN
        ALTER TABLE public.trades ADD COLUMN direction TEXT;
    END IF;

END $$;
