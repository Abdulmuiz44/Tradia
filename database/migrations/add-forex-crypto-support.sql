-- Migration: Add Forex & Crypto market support
-- Date: 2025-11-17
-- Description: Add market preference to users and market type to trades

-- Add market preference enum type
DO $$ BEGIN
    CREATE TYPE market_preference AS ENUM ('forex', 'crypto', 'both');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Add market type enum for trades
DO $$ BEGIN
    CREATE TYPE market_type AS ENUM ('forex', 'crypto');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Update users table to add market preference to metadata
-- The metadata column already exists as JSONB, so we don't need to alter the schema
-- Just document that market_preference should be stored in metadata as:
-- { "market_preference": "forex" | "crypto" | "both" }

COMMENT ON COLUMN public.users.metadata IS 
'User metadata stored as JSON. 
Expected fields:
- market_preference: (string) "forex" | "crypto" | "both" - Trading market preference
- other custom fields as needed';

-- Add market column to trades table
ALTER TABLE public.trades 
ADD COLUMN IF NOT EXISTS market market_type;

-- Add comment to trades.market column
COMMENT ON COLUMN public.trades.market IS 
'Market type for this trade: forex or crypto. 
Helps categorize and filter trades by market.';

-- Add index on trades.market for faster filtering
CREATE INDEX IF NOT EXISTS idx_trades_market 
ON public.trades(market);

-- Add composite index for user_id and market
CREATE INDEX IF NOT EXISTS idx_trades_user_market 
ON public.trades(user_id, market);

-- Update existing trades to infer market type from symbol
-- This is a best-effort migration based on common naming patterns
UPDATE public.trades
SET market = CASE
    -- Forex pairs (common patterns)
    WHEN symbol ~* '(EUR|GBP|USD|JPY|AUD|CAD|CHF|NZD)/(EUR|GBP|USD|JPY|AUD|CAD|CHF|NZD)' THEN 'forex'::market_type
    WHEN symbol ~* '^(EUR|GBP|USD|JPY|AUD|CAD|CHF|NZD){6}$' THEN 'forex'::market_type
    
    -- Crypto pairs (common patterns)
    WHEN symbol ~* '(BTC|ETH|USDT|USDC|BNB|XRP|ADA|SOL|DOGE|DOT|MATIC|LTC|AVAX|LINK|UNI|ATOM)' THEN 'crypto'::market_type
    
    -- Default to NULL if uncertain
    ELSE NULL
END
WHERE market IS NULL;

-- Add lot_size column for Forex trades (if not exists)
ALTER TABLE public.trades 
ADD COLUMN IF NOT EXISTS lot_size DECIMAL;

COMMENT ON COLUMN public.trades.lot_size IS 
'Lot size for Forex trades (e.g., 0.01, 0.1, 1.0).
Used specifically for FX position sizing. For crypto, use quantity field.';

-- Add entry_time and exit_time as explicit timestamp columns (optional, can use metadata)
ALTER TABLE public.trades 
ADD COLUMN IF NOT EXISTS entry_time TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS exit_time TIMESTAMP WITH TIME ZONE;

COMMENT ON COLUMN public.trades.entry_time IS 'Explicit entry timestamp for the trade';
COMMENT ON COLUMN public.trades.exit_time IS 'Explicit exit timestamp for the trade';

-- Backfill entry_time and exit_time from existing timestamp columns if needed
UPDATE public.trades
SET 
    entry_time = COALESCE(entry_time, timestamp),
    exit_time = COALESCE(exit_time, exit_timestamp)
WHERE entry_time IS NULL OR exit_time IS NULL;

-- Add comment column for trade notes (if not exists)
ALTER TABLE public.trades 
ADD COLUMN IF NOT EXISTS comment TEXT;

COMMENT ON COLUMN public.trades.comment IS 'User notes or comments about this trade';

-- Create a function to auto-detect market from symbol
CREATE OR REPLACE FUNCTION detect_market_from_symbol(trade_symbol TEXT)
RETURNS market_type AS $$
BEGIN
    -- Check for Forex patterns
    IF trade_symbol ~* '(EUR|GBP|USD|JPY|AUD|CAD|CHF|NZD)/(EUR|GBP|USD|JPY|AUD|CAD|CHF|NZD)' OR
       trade_symbol ~* '^(EUR|GBP|USD|JPY|AUD|CAD|CHF|NZD){6}$' THEN
        RETURN 'forex'::market_type;
    END IF;
    
    -- Check for Crypto patterns
    IF trade_symbol ~* '(BTC|ETH|USDT|USDC|BNB|XRP|ADA|SOL|DOGE|DOT|MATIC|LTC|AVAX|LINK|UNI|ATOM)' THEN
        RETURN 'crypto'::market_type;
    END IF;
    
    -- Default to NULL if uncertain
    RETURN NULL;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Create trigger to auto-set market on insert if not provided
CREATE OR REPLACE FUNCTION set_trade_market()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.market IS NULL AND NEW.symbol IS NOT NULL THEN
        NEW.market := detect_market_from_symbol(NEW.symbol);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_set_trade_market ON public.trades;
CREATE TRIGGER trigger_set_trade_market
    BEFORE INSERT OR UPDATE ON public.trades
    FOR EACH ROW
    EXECUTE FUNCTION set_trade_market();

-- Summary of changes:
-- 1. Added market_preference support in users.metadata (JSONB field)
-- 2. Added market column to trades table with enum type
-- 3. Added lot_size column for Forex-specific data
-- 4. Added entry_time, exit_time, and comment columns
-- 5. Created indexes for better query performance
-- 6. Auto-detect market type from symbol patterns
-- 7. Set up trigger to auto-populate market field

COMMENT ON TABLE public.trades IS 
'Trading history table with support for both Forex and Crypto markets.
New fields:
- market: "forex" or "crypto" to categorize trades
- lot_size: Forex-specific position sizing
- entry_time/exit_time: Explicit timestamps
- comment: User notes on the trade';
