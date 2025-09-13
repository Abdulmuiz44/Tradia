-- Add coach_points to public.users (idempotent + robust)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'users'
      AND column_name = 'coach_points'
  ) THEN
    ALTER TABLE public.users
      ADD COLUMN coach_points INTEGER NOT NULL DEFAULT 0;
  END IF;
END
$$;

-- Helpful index for sorting/filtering (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE c.relname = 'idx_users_coach_points'
      AND n.nspname = 'public'
  ) THEN
    CREATE INDEX idx_users_coach_points ON public.users(coach_points);
  END IF;
END
$$;
