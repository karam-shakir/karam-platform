-- INVESTIGATION SCRIPT
-- 1. Check ALL families, ordered by creation date
SELECT id, family_name, status, is_active, created_at 
FROM host_families 
ORDER BY created_at DESC 
LIMIT 10;

-- 2. Check specific Pending families
SELECT count(*) as pending_count 
FROM host_families 
WHERE status = 'pending';

-- 3. Check RLS policies again to be absolutely sure
SELECT policyname, cmd, roles, qual, with_check 
FROM pg_policies 
WHERE tablename = 'host_families';
