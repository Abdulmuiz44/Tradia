-- Inspect the users table structure
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'users'
ORDER BY ordinal_position;

-- Alternative: Get all table info
SELECT * FROM information_schema.tables WHERE table_name = 'users';

-- Get all rows in users table
SELECT * FROM public.users LIMIT 10;

-- Count users
SELECT COUNT(*) as user_count FROM public.users;
