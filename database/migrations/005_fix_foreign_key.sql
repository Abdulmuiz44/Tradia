-- Fix foreign key constraint to reference auth.users table properly
-- This ensures user_id in trades table matches the Supabase auth user ID

-- Drop the constraint if it exists (to avoid the "already exists" error)
ALTER TABLE public.trades DROP CONSTRAINT IF EXISTS trades_user_id_fkey;

-- Add the foreign key constraint (it should work now that we're using correct user IDs)
ALTER TABLE public.trades
ADD CONSTRAINT trades_user_id_fkey
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- Clean up any orphaned records that might violate the constraint
DELETE FROM public.trades
WHERE user_id NOT IN (SELECT id FROM auth.users);

-- Optional: Add an index on user_id for better performance
CREATE INDEX IF NOT EXISTS trades_user_id_idx ON public.trades(user_id);
