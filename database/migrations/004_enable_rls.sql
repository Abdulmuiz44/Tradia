-- Enable Row Level Security for trades table
-- Run this AFTER confirming basic CRUD operations work

-- Enable RLS
ALTER TABLE public.trades ENABLE ROW LEVEL SECURITY;

-- Create policy for authenticated users to access only their own trades
CREATE POLICY "Users can access their own trades"
ON public.trades
FOR ALL
TO authenticated
USING (auth.uid()::text = user_id::text)
WITH CHECK (auth.uid()::text = user_id::text);

-- Add service role policy for backend operations (if needed)
-- This allows the service role to bypass RLS for admin operations
CREATE POLICY "Service role can access all trades"
ON public.trades
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);
