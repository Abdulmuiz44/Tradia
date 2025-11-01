-- Create RLS Policies SQL Script
-- Run this AFTER running the minimal schema
-- This creates all necessary Row Level Security policies

-- Enable RLS on tables (if not already enabled)
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.file_uploads ENABLE ROW LEVEL SECURITY;

-- Users table policies
DROP POLICY IF EXISTS "users_select_policy" ON public.users;
CREATE POLICY "users_select_policy" ON public.users
    FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "users_update_policy" ON public.users;
CREATE POLICY "users_update_policy" ON public.users
    FOR UPDATE USING (auth.uid() = id);

-- Chat messages table policies
DROP POLICY IF EXISTS "chat_select_policy" ON public.chat_messages;
CREATE POLICY "chat_select_policy" ON public.chat_messages
    FOR SELECT USING (auth.uid()::text = user_id::text);

DROP POLICY IF EXISTS "chat_insert_policy" ON public.chat_messages;
CREATE POLICY "chat_insert_policy" ON public.chat_messages
    FOR INSERT WITH CHECK (auth.uid()::text = user_id::text);

DROP POLICY IF EXISTS "chat_update_policy" ON public.chat_messages;
CREATE POLICY "chat_update_policy" ON public.chat_messages
    FOR UPDATE USING (auth.uid()::text = user_id::text);

DROP POLICY IF EXISTS "chat_delete_policy" ON public.chat_messages;
CREATE POLICY "chat_delete_policy" ON public.chat_messages
    FOR DELETE USING (auth.uid()::text = user_id::text);

-- File uploads table policies
DROP POLICY IF EXISTS "files_select_policy" ON public.file_uploads;
CREATE POLICY "files_select_policy" ON public.file_uploads
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "files_insert_policy" ON public.file_uploads;
CREATE POLICY "files_insert_policy" ON public.file_uploads
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Storage bucket policies for file uploads
DROP POLICY IF EXISTS "storage_select_policy" ON storage.objects;
CREATE POLICY "storage_select_policy" ON storage.objects
    FOR SELECT USING (bucket_id = 'chat-uploads' AND auth.uid()::text = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS "storage_insert_policy" ON storage.objects;
CREATE POLICY "storage_insert_policy" ON storage.objects
    FOR INSERT WITH CHECK (bucket_id = 'chat-uploads' AND auth.uid()::text = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS "storage_update_policy" ON storage.objects;
CREATE POLICY "storage_update_policy" ON storage.objects
    FOR UPDATE USING (bucket_id = 'chat-uploads' AND auth.uid()::text = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS "storage_delete_policy" ON storage.objects;
CREATE POLICY "storage_delete_policy" ON storage.objects
    FOR DELETE USING (bucket_id = 'chat-uploads' AND auth.uid()::text = (storage.foldername(name))[1]);
