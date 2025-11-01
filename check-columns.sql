-- Check if the trades table has the correct columns
SELECT
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'trades'
    AND table_schema = 'public'
ORDER BY ordinal_position;

-- Check if we can select from the table
SELECT id, symbol, opentime, closetime, pnl
FROM public.trades
LIMIT 5;
