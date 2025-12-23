-- Check actual structure of host_families table
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'host_families'
ORDER BY ordinal_position;
