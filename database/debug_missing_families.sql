-- Check the most recent host_families
SELECT id, family_name, status, is_active, created_at, user_id 
FROM host_families 
ORDER BY created_at DESC 
LIMIT 5;

-- Check RLS policies on host_families
SELECT * FROM pg_policies WHERE tablename = 'host_families';
