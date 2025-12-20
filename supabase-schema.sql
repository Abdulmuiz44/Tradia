-- Supabase Database Schema for Tradia Trading App
-- Run this in your Supabase SQL editor

-- Enable Row Level Security
-- Note: System-level database settings are managed by Supabase automatically

-- Create custom types
CREATE TYPE user_plan AS ENUM ('starter', 'pro', 'plus', 'elite');
CREATE TYPE message_type AS ENUM ('user', 'assistant');
CREATE TYPE assistant_mode AS ENUM ('coach', 'mistral');

-- Users table (extends Supabase auth.users)
CREATE TABLE public.users (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    plan user_plan DEFAULT 'starter' NOT NULL,
    is_active BOOLEAN DEFAULT true NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    stripe_customer_id TEXT,
    subscription_status TEXT DEFAULT 'inactive',
    subscription_end_date TIMESTAMP WITH TIME ZONE,
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Conversations table
CREATE TABLE public.conversations (
    id TEXT PRIMARY KEY,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    title TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    pinned BOOLEAN DEFAULT false,
    archived BOOLEAN DEFAULT false,
    model TEXT DEFAULT 'gpt-4o-mini',
    message_count INTEGER DEFAULT 0,
    last_message_at TIMESTAMP WITH TIME ZONE,
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Chat messages table (now linked to conversations)
CREATE TABLE public.chat_messages (
    id TEXT PRIMARY KEY,
    conversation_id TEXT REFERENCES public.conversations(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    type message_type NOT NULL,
    content TEXT NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    mode assistant_mode DEFAULT 'coach',
    variant TEXT DEFAULT 'default' CHECK (variant IN ('default', 'upgrade', 'system')),
    attached_trade_ids TEXT[] DEFAULT '{}',
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- File uploads table
CREATE TABLE public.file_uploads (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    file_name TEXT NOT NULL,
    file_path TEXT NOT NULL,
    file_size BIGINT NOT NULL,
    mime_type TEXT,
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Usage tracking table
CREATE TABLE public.usage_stats (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    date DATE NOT NULL,
    messages_count INTEGER DEFAULT 0 NOT NULL,
    uploads_count INTEGER DEFAULT 0 NOT NULL,
    api_calls_count INTEGER DEFAULT 0 NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    UNIQUE(user_id, date)
);

-- User sessions/trades table (for context)
CREATE TABLE public.trades (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    symbol TEXT NOT NULL,
    side TEXT NOT NULL CHECK (side IN ('buy', 'sell')),
    quantity DECIMAL NOT NULL,
    price DECIMAL NOT NULL,
    pnl DECIMAL,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    status TEXT DEFAULT 'closed' CHECK (status IN ('open', 'closed', 'cancelled')),
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Create indexes for performance
CREATE INDEX idx_conversations_user_id ON public.conversations(user_id);
CREATE INDEX idx_conversations_updated_at ON public.conversations(updated_at DESC);
CREATE INDEX idx_conversations_pinned ON public.conversations(pinned) WHERE pinned = true;
CREATE INDEX idx_chat_messages_conversation_id ON public.chat_messages(conversation_id);
CREATE INDEX idx_chat_messages_user_id ON public.chat_messages(user_id);
CREATE INDEX idx_chat_messages_timestamp ON public.chat_messages(timestamp DESC);
CREATE INDEX idx_file_uploads_user_id ON public.file_uploads(user_id);
CREATE INDEX idx_usage_stats_user_date ON public.usage_stats(user_id, date);
CREATE INDEX idx_trades_user_id ON public.trades(user_id);
CREATE INDEX idx_trades_timestamp ON public.trades(timestamp DESC);

-- Enable Row Level Security
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.file_uploads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usage_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trades ENABLE ROW LEVEL SECURITY;

-- RLS Policies for users table
DROP POLICY IF EXISTS "Users can view own profile" ON public.users;
CREATE POLICY "Users can view own profile" ON public.users
    FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
CREATE POLICY "Users can update own profile" ON public.users
FOR UPDATE USING (auth.uid() = id);

-- RLS Policies for conversations table
DROP POLICY IF EXISTS "Users can view own conversations" ON public.conversations;
CREATE POLICY "Users can view own conversations" ON public.conversations
    FOR SELECT USING (auth.uid()::text = user_id::text);

DROP POLICY IF EXISTS "Users can insert own conversations" ON public.conversations;
CREATE POLICY "Users can insert own conversations" ON public.conversations
    FOR INSERT WITH CHECK (auth.uid()::text = user_id::text);

DROP POLICY IF EXISTS "Users can update own conversations" ON public.conversations;
CREATE POLICY "Users can update own conversations" ON public.conversations
    FOR UPDATE USING (auth.uid()::text = user_id::text);

DROP POLICY IF EXISTS "Users can delete own conversations" ON public.conversations;
CREATE POLICY "Users can delete own conversations" ON public.conversations
    FOR DELETE USING (auth.uid()::text = user_id::text);

-- RLS Policies for chat_messages table
DROP POLICY IF EXISTS "Users can view own messages" ON public.chat_messages;
CREATE POLICY "Users can view own messages" ON public.chat_messages
    FOR SELECT USING (auth.uid()::text = user_id::text);

DROP POLICY IF EXISTS "Users can insert own messages" ON public.chat_messages;
CREATE POLICY "Users can insert own messages" ON public.chat_messages
    FOR INSERT WITH CHECK (auth.uid()::text = user_id::text);

DROP POLICY IF EXISTS "Users can update own messages" ON public.chat_messages;
CREATE POLICY "Users can update own messages" ON public.chat_messages
    FOR UPDATE USING (auth.uid()::text = user_id::text);

DROP POLICY IF EXISTS "Users can delete own messages" ON public.chat_messages;
CREATE POLICY "Users can delete own messages" ON public.chat_messages
    FOR DELETE USING (auth.uid()::text = user_id::text);

-- RLS Policies for file_uploads table
DROP POLICY IF EXISTS "Users can view own uploads" ON public.file_uploads;
CREATE POLICY "Users can view own uploads" ON public.file_uploads
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own uploads" ON public.file_uploads;
CREATE POLICY "Users can insert own uploads" ON public.file_uploads
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- RLS Policies for usage_stats table
DROP POLICY IF EXISTS "Users can view own usage" ON public.usage_stats;
CREATE POLICY "Users can view own usage" ON public.usage_stats
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own usage" ON public.usage_stats;
CREATE POLICY "Users can insert own usage" ON public.usage_stats
    FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own usage" ON public.usage_stats;
CREATE POLICY "Users can update own usage" ON public.usage_stats
    FOR UPDATE USING (auth.uid() = user_id);

-- RLS Policies for trades table
DROP POLICY IF EXISTS "Users can view own trades" ON public.trades;
CREATE POLICY "Users can view own trades" ON public.trades
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own trades" ON public.trades;
CREATE POLICY "Users can insert own trades" ON public.trades
    FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own trades" ON public.trades;
CREATE POLICY "Users can update own trades" ON public.trades
    FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own trades" ON public.trades;
CREATE POLICY "Users can delete own trades" ON public.trades
    FOR DELETE USING (auth.uid() = user_id);

-- Functions for usage tracking
CREATE OR REPLACE FUNCTION increment_usage(user_id UUID, usage_type TEXT, increment_by INTEGER DEFAULT 1)
RETURNS void AS $$
DECLARE
    today DATE := CURRENT_DATE;
BEGIN
    INSERT INTO public.usage_stats (user_id, date, messages_count, uploads_count, api_calls_count)
    VALUES (user_id, today,
        CASE WHEN usage_type = 'messages' THEN increment_by ELSE 0 END,
        CASE WHEN usage_type = 'uploads' THEN increment_by ELSE 0 END,
        CASE WHEN usage_type = 'api_calls' THEN increment_by ELSE 0 END
    )
    ON CONFLICT (user_id, date)
    DO UPDATE SET
        messages_count = CASE WHEN usage_type = 'messages' THEN usage_stats.messages_count + increment_by ELSE usage_stats.messages_count END,
        uploads_count = CASE WHEN usage_type = 'uploads' THEN usage_stats.uploads_count + increment_by ELSE usage_stats.uploads_count END,
        api_calls_count = CASE WHEN usage_type = 'api_calls' THEN usage_stats.api_calls_count + increment_by ELSE usage_stats.api_calls_count END,
        updated_at = TIMEZONE('utc'::text, NOW());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user plan limits
CREATE OR REPLACE FUNCTION get_user_plan_limits(user_id UUID)
RETURNS TABLE (
    plan user_plan,
    ai_chats_per_day INTEGER,
    trade_storage_days INTEGER,
    max_trades INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        u.plan,
        CASE u.plan
            WHEN 'starter' THEN 5
            WHEN 'pro' THEN 50
            WHEN 'plus' THEN 200
            WHEN 'elite' THEN -1
            ELSE 5
        END as ai_chats_per_day,
        CASE u.plan
            WHEN 'starter' THEN 30
            WHEN 'pro' THEN 182
            WHEN 'plus' THEN 365
            WHEN 'elite' THEN -1
            ELSE 30
        END as trade_storage_days,
        CASE u.plan
            WHEN 'starter' THEN 50
            WHEN 'pro' THEN 500
            WHEN 'plus' THEN 2000
            WHEN 'elite' THEN -1
            ELSE 50
        END as max_trades
    FROM public.users u
    WHERE u.id = user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user has exceeded daily limits
CREATE OR REPLACE FUNCTION check_daily_limit(user_id UUID, limit_type TEXT)
RETURNS BOOLEAN AS $$
DECLARE
    today DATE := CURRENT_DATE;
    current_count INTEGER;
    plan_limit INTEGER;
BEGIN
    -- Get current usage
    SELECT
        CASE limit_type
            WHEN 'messages' THEN messages_count
            WHEN 'uploads' THEN uploads_count
            WHEN 'api_calls' THEN api_calls_count
            ELSE 0
        END INTO current_count
    FROM public.usage_stats
    WHERE usage_stats.user_id = check_daily_limit.user_id
    AND usage_stats.date = today;

    -- Get plan limits
    SELECT
        CASE limit_type
            WHEN 'messages' THEN ai_chats_per_day
            WHEN 'uploads' THEN 10 -- Default upload limit
            WHEN 'api_calls' THEN 1000 -- Default API limit
            ELSE 0
        END INTO plan_limit
    FROM get_user_plan_limits(check_daily_limit.user_id);

    -- Return true if under limit, false if at/exceeded limit
    RETURN COALESCE(current_count, 0) < plan_limit OR plan_limit = -1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create storage bucket for chat uploads
INSERT INTO storage.buckets (id, name, public)
VALUES ('chat-uploads', 'chat-uploads', false);

-- Storage policies for chat-uploads bucket
DROP POLICY IF EXISTS "Users can upload their own files" ON storage.objects;
CREATE POLICY "Users can upload their own files" ON storage.objects
    FOR INSERT WITH CHECK (bucket_id = 'chat-uploads' AND auth.uid()::text = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS "Users can view their own files" ON storage.objects;
CREATE POLICY "Users can view their own files" ON storage.objects
    FOR SELECT USING (bucket_id = 'chat-uploads' AND auth.uid()::text = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS "Users can update their own files" ON storage.objects;
CREATE POLICY "Users can update their own files" ON storage.objects
    FOR UPDATE USING (bucket_id = 'chat-uploads' AND auth.uid()::text = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS "Users can delete their own files" ON storage.objects;
CREATE POLICY "Users can delete their own files" ON storage.objects
    FOR DELETE USING (bucket_id = 'chat-uploads' AND auth.uid()::text = (storage.foldername(name))[1]);
