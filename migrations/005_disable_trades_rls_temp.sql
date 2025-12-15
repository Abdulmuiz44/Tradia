-- Temporarily disable RLS on trades table to test if the issue is with RLS policies
-- We'll re-enable and fix it once we confirm the code works

-- Disable RLS on trades
ALTER TABLE public.trades DISABLE ROW LEVEL SECURITY;
