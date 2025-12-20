-- MINIMAL Supabase Database Schema for Tradia
-- Run this first if you have permission issues

-- Create custom types (optional - can be skipped if issues)
DO $$ BEGIN
    CREATE TYPE user_plan AS ENUM ('starter', 'pro', 'plus', 'elite');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE message_type AS ENUM ('user', 'assistant');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE assistant_mode AS ENUM ('coach', 'mistral');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Basic users table
CREATE TABLE IF NOT EXISTS public.users (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    email TEXT,
    plan TEXT DEFAULT 'starter',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Basic chat messages table
CREATE TABLE IF NOT EXISTS public.chat_messages (
    id TEXT PRIMARY KEY,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    type TEXT DEFAULT 'user',
    content TEXT,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    mode TEXT DEFAULT 'coach'
);

-- Basic file uploads table
CREATE TABLE IF NOT EXISTS public.file_uploads (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    file_name TEXT,
    file_path TEXT,
    file_size BIGINT,
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS (Row Level Security)
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.file_uploads ENABLE ROW LEVEL SECURITY;

-- Basic RLS policies
CREATE POLICY IF NOT EXISTS "users_select" ON public.users FOR SELECT USING (auth.uid() = id);
CREATE POLICY IF NOT EXISTS "users_update" ON public.users FOR UPDATE USING (auth.uid() = id);

CREATE POLICY IF NOT EXISTS "chat_select" ON public.chat_messages FOR SELECT USING (auth.uid()::text = user_id::text);
CREATE POLICY IF NOT EXISTS "chat_insert" ON public.chat_messages FOR INSERT WITH CHECK (auth.uid()::text = user_id::text);
CREATE POLICY IF NOT EXISTS "chat_update" ON public.chat_messages FOR UPDATE USING (auth.uid()::text = user_id::text);
CREATE POLICY IF NOT EXISTS "chat_delete" ON public.chat_messages FOR DELETE USING (auth.uid()::text = user_id::text);

CREATE POLICY IF NOT EXISTS "files_select" ON public.file_uploads FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY IF NOT EXISTS "files_insert" ON public.file_uploads FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Create storage bucket (run this separately if needed)
-- INSERT INTO storage.buckets (id, name, public) VALUES ('chat-uploads', 'chat-uploads', false);
