-- Adds a "mode" column to the conversations table so Tradia AI can persist per-thread assistant mode.
ALTER TABLE public.conversations
ADD COLUMN IF NOT EXISTS mode TEXT DEFAULT 'coach';

-- Backfill existing rows that may have NULL and enforce presence going forward.
UPDATE public.conversations
SET mode = 'coach'
WHERE mode IS NULL;

ALTER TABLE public.conversations
ALTER COLUMN mode SET NOT NULL;
