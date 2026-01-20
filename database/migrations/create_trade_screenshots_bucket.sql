-- Migration: Create trade-screenshots storage bucket
-- This bucket stores before/after trade screenshots uploaded by users

-- Create the storage bucket for trade screenshots
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
DROP POLICY IF EXISTS "Allow public uploads to trade-screenshots" ON storage.objects;
DROP POLICY IF EXISTS "Allow public access to trade-screenshots" ON storage.objects;

-- Policy: Allow uploads to trade-screenshots bucket
-- Since we use NextAuth (not Supabase Auth), we use service role for uploads
-- The bucket is public but uploads are done via authenticated API routes
CREATE POLICY "Allow public uploads to trade-screenshots" ON storage.objects
  FOR INSERT 
  WITH CHECK (bucket_id = 'trade-screenshots');

-- Policy: Allow public read access to screenshots
CREATE POLICY "Allow public access to trade-screenshots" ON storage.objects
  FOR SELECT 
  USING (bucket_id = 'trade-screenshots');

-- Policy: Allow updates to trade-screenshots bucket
CREATE POLICY "Users can update their trade screenshots" ON storage.objects
  FOR UPDATE 
  USING (bucket_id = 'trade-screenshots');

-- Policy: Allow deletes from trade-screenshots bucket
CREATE POLICY "Users can delete their trade screenshots" ON storage.objects
  FOR DELETE 
  USING (bucket_id = 'trade-screenshots');

-- Migration complete: trade-screenshots bucket created with permissive policies
-- Note: Authorization is handled at the application layer via NextAuth
