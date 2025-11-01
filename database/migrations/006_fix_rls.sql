-- Fix Row Level Security policies for trades table
-- This ensures authenticated users can perform all operations on their own trades

-- First, ensure RLS is enabled
ALTER TABLE public.trades ENABLE ROW LEVEL SECURITY;

-- Drop any existing policies that might be causing issues
DROP POLICY IF EXISTS "Users can access their own trades" ON public.trades;
DROP POLICY IF EXISTS "Allow all operations for authenticated users" ON public.trades;
DROP POLICY IF EXISTS "Allow all access for authenticated users" ON public.trades;
DROP POLICY IF EXISTS "Allow inserts for authenticated users" ON public.trades;

-- Create a comprehensive policy that allows authenticated users to do everything with their own trades
CREATE POLICY "authenticated_users_full_access"
ON public.trades
FOR ALL
TO authenticated
USING (auth.uid()::text = user_id::text)
WITH CHECK (auth.uid()::text = user_id::text);

-- Alternative: If you want to be more permissive during development, use this instead:
-- CREATE POLICY "allow_all_authenticated"
-- ON public.trades
-- FOR ALL
-- TO authenticated
-- USING (true)
-- WITH CHECK (true);

-- Note: The first policy ensures users can only access their own trades
-- The second policy (commented out) allows all authenticated users to access all trades
-- Use the second one only for testing, then switch to the first for production
