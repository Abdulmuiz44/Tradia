-- Add Row Level Security Policies for trades table
-- This ensures users can only access their own trades

-- Enable RLS on trades table
ALTER TABLE public.trades ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "trades_select_policy" ON public.trades;
DROP POLICY IF EXISTS "trades_insert_policy" ON public.trades;
DROP POLICY IF EXISTS "trades_update_policy" ON public.trades;
DROP POLICY IF EXISTS "trades_delete_policy" ON public.trades;

-- SELECT: Users can only see their own trades
CREATE POLICY "trades_select_policy" ON public.trades
    FOR SELECT USING (auth.uid() = user_id);

-- INSERT: Users can only insert trades for themselves
CREATE POLICY "trades_insert_policy" ON public.trades
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- UPDATE: Users can only update their own trades
CREATE POLICY "trades_update_policy" ON public.trades
    FOR UPDATE USING (auth.uid() = user_id);

-- DELETE: Users can only delete their own trades
CREATE POLICY "trades_delete_policy" ON public.trades
    FOR DELETE USING (auth.uid() = user_id);
