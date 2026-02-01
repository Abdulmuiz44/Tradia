-- Enable pgcrypto for encryption
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Create table for MT5 connections (linked to users)
CREATE TABLE IF NOT EXISTS public.mt5_accounts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    account_login BIGINT NOT NULL,
    server_url TEXT NOT NULL,
    api_key_encrypted TEXT NOT NULL,
    balance DECIMAL(15, 2),
    equity DECIMAL(15, 2),
    margin DECIMAL(15, 2),
    profit_target_pct DECIMAL(5, 2),
    daily_dd DECIMAL(5, 2),
    total_dd DECIMAL(5, 2),
    win_rate DECIMAL(5, 2),
    last_sync TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, account_login)
);

-- Ensure trades table has necessary columns for MT5 data mapping
-- (Assumes public.trades exists based on project context, adding if missing)
CREATE TABLE IF NOT EXISTS public.trades (
    id BIGINT PRIMARY KEY, -- MT5 Ticket
    user_id UUID REFERENCES auth.users(id),
    symbol TEXT,
    type TEXT, -- 'buy' or 'sell'
    volume DECIMAL,
    entry_price DECIMAL,
    exit_price DECIMAL,
    profit DECIMAL,
    open_time TIMESTAMPTZ,
    close_time TIMESTAMPTZ,
    mt5_account_id UUID REFERENCES public.mt5_accounts(id)
);

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_mt5_accounts_user_id ON public.mt5_accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_trades_user_id ON public.trades(user_id);
CREATE INDEX IF NOT EXISTS idx_trades_mt5_account ON public.trades(mt5_account_id);
