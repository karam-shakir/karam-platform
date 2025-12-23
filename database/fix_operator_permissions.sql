-- =============================================
-- FIX OPERATOR PERMISSIONS (For Testing)
-- إصلاح صلاحيات المشغل للاختبار
-- =============================================

-- IMPORTANT: This relaxes security for testing purposes.
-- It allows the 'anon' role (used by our simulated operator dashboard) 
-- to VIEW and UPDATE pending families.

-- 1. Ensure RLS is enabled
ALTER TABLE public.host_families ENABLE ROW LEVEL SECURITY;

-- 2. Grant permissions to anon and authenticated roles
GRANT SELECT, INSERT, UPDATE, DELETE ON public.host_families TO anon, authenticated, service_role;

-- 3. Create permissive policies for SELECT (Viewing)
-- Allow viewing ALL families regardless of status
DROP POLICY IF EXISTS "Allow public view all families" ON public.host_families;
CREATE POLICY "Allow public view all families"
    ON public.host_families FOR SELECT
    USING (true);

-- 4. Create permissive policies for UPDATE (Approving/Rejecting)
-- Allow updating any family
DROP POLICY IF EXISTS "Allow public update families" ON public.host_families;
CREATE POLICY "Allow public update families"
    ON public.host_families FOR UPDATE
    USING (true)
    WITH CHECK (true);

-- 5. Verification
SELECT count(*) as total_families, 
       count(*) filter (where status = 'pending') as pending_count 
FROM public.host_families;
