-- Migration: Create trade-screenshots storage bucket
-- This bucket stores before/after trade screenshots uploaded by users

-- Create the storage bucket for trade screenshots
-- Note: Run this in the Supabase Dashboard SQL Editor or via Supabase CLI

-- Create the bucket (if not exists check needs to be done via application code)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'trade-screenshots',
  'trade-screenshots',
  true,  -- Public so images can be displayed without authentication
  5242880,  -- 5MB max file size
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 5242880,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp']::text[];

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can upload their trade screenshots" ON storage.objects;
DROP POLICY IF EXISTS "Users can view their trade screenshots" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their trade screenshots" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their trade screenshots" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view trade screenshots" ON storage.objects;

-- Policy: Users can upload their own screenshots
-- Files are stored in format: {user_id}/{timestamp}_{random}_before.png
CREATE POLICY "Users can upload their trade screenshots" ON storage.objects
  FOR INSERT 
  WITH CHECK (
    bucket_id = 'trade-screenshots' 
    AND auth.uid()::text = (string_to_array(name, '/'))[1]
  );

-- Policy: Anyone can view trade screenshots (they need to be visible in the trade history)
-- The URLs are stored in the trades table which is protected by RLS
CREATE POLICY "Anyone can view trade screenshots" ON storage.objects
  FOR SELECT 
  USING (bucket_id = 'trade-screenshots');

-- Policy: Users can update their own screenshots
CREATE POLICY "Users can update their trade screenshots" ON storage.objects
  FOR UPDATE 
  USING (
    bucket_id = 'trade-screenshots' 
    AND auth.uid()::text = (string_to_array(name, '/'))[1]
  );

-- Policy: Users can delete their own screenshots
CREATE POLICY "Users can delete their trade screenshots" ON storage.objects
  FOR DELETE 
  USING (
    bucket_id = 'trade-screenshots' 
    AND auth.uid()::text = (string_to_array(name, '/'))[1]
  );

-- Migration complete: trade-screenshots bucket created with RLS policies
