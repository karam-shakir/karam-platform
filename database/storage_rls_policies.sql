-- ============================================
-- Karam Platform - Extended RLS Policies for Storage
-- سياسات الأمان الموسعة لـStorage Buckets
-- ============================================
-- Run this in Supabase SQL Editor AFTER creating buckets
-- ============================================

-- ============================================
-- CLEANUP: Drop existing policies if any
-- ============================================

-- Drop family-documents policies
DROP POLICY IF EXISTS "Families can upload their documents" ON storage.objects;
DROP POLICY IF EXISTS "Families can view their documents" ON storage.objects;
DROP POLICY IF EXISTS "Families can update their documents" ON storage.objects;
DROP POLICY IF EXISTS "Families can delete their documents" ON storage.objects;

-- Drop majlis-photos policies
DROP POLICY IF EXISTS "Families can upload majlis photos" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view majlis photos" ON storage.objects;
DROP POLICY IF EXISTS "Families can update majlis photos" ON storage.objects;
DROP POLICY IF EXISTS "Families can delete majlis photos" ON storage.objects;

-- Drop review-photos policies
DROP POLICY IF EXISTS "Visitors can upload review photos" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view review photos" ON storage.objects;
DROP POLICY IF EXISTS "Visitors can delete review photos" ON storage.objects;

-- Drop company-documents policies
DROP POLICY IF EXISTS "Companies can upload their documents" ON storage.objects;
DROP POLICY IF EXISTS "Companies and operators can view company documents" ON storage.objects;
DROP POLICY IF EXISTS "Companies can update their documents" ON storage.objects;
DROP POLICY IF EXISTS "Companies can delete their documents" ON storage.objects;

-- ============================================
-- 1. FAMILY DOCUMENTS BUCKET
-- ============================================

-- Policy 1: Families can upload their own documents
CREATE POLICY "Families can upload their documents"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'family-documents'
    AND (storage.foldername(name))[1] = auth.uid()::text
    AND EXISTS (
        SELECT 1 FROM public.user_profiles
        WHERE id = auth.uid()
        AND user_type = 'family'
    )
);

-- Policy 2: Families can view their own documents
CREATE POLICY "Families can view their documents"
ON storage.objects
FOR SELECT
TO authenticated
USING (
    bucket_id = 'family-documents'
    AND (
        (storage.foldername(name))[1] = auth.uid()::text
        OR EXISTS (
            SELECT 1 FROM public.user_profiles
            WHERE id = auth.uid()
            AND user_type = 'operator'
        )
    )
);

-- Policy 3: Families can update their documents
CREATE POLICY "Families can update their documents"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
    bucket_id = 'family-documents'
    AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy 4: Families can delete their documents
CREATE POLICY "Families can delete their documents"
ON storage.objects
FOR DELETE
TO authenticated
USING (
    bucket_id = 'family-documents'
    AND (storage.foldername(name))[1] = auth.uid()::text
);

-- ============================================
-- 2. MAJLIS PHOTOS BUCKET (Public)
-- ============================================

-- Policy 1: Families can upload majlis photos
CREATE POLICY "Families can upload majlis photos"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'majlis-photos'
    AND EXISTS (
        SELECT 1 FROM public.user_profiles
        WHERE id = auth.uid()
        AND user_type = 'family'
    )
);

-- Policy 2: Anyone can view majlis photos (public bucket)
CREATE POLICY "Anyone can view majlis photos"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'majlis-photos');

-- Policy 3: Families can update their majlis photos
CREATE POLICY "Families can update majlis photos"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
    bucket_id = 'majlis-photos'
    AND EXISTS (
        SELECT 1 FROM public.user_profiles
        WHERE id = auth.uid()
        AND user_type = 'family'
    )
);

-- Policy 4: Families can delete their majlis photos
CREATE POLICY "Families can delete majlis photos"
ON storage.objects
FOR DELETE
TO authenticated
USING (
    bucket_id = 'majlis-photos'
    AND EXISTS (
        SELECT 1 FROM public.user_profiles
        WHERE id = auth.uid()
        AND user_type = 'family'
    )
);

-- ============================================
-- 3. REVIEW PHOTOS BUCKET (Public)
-- ============================================

-- Policy 1: Visitors can upload review photos
CREATE POLICY "Visitors can upload review photos"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'review-photos'
    AND EXISTS (
        SELECT 1 FROM public.user_profiles
        WHERE id = auth.uid()
        AND user_type = 'visitor'
    )
);

-- Policy 2: Anyone can view review photos (public bucket)
CREATE POLICY "Anyone can view review photos"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'review-photos');

-- Policy 3: Visitors can delete their review photos
CREATE POLICY "Visitors can delete review photos"
ON storage.objects
FOR DELETE
TO authenticated
USING (
    bucket_id = 'review-photos'
    AND EXISTS (
        SELECT 1 FROM public.user_profiles
        WHERE id = auth.uid()
        AND user_type = 'visitor'
    )
);

-- ============================================
-- 4. COMPANY DOCUMENTS BUCKET (Private)
-- ============================================

-- Policy 1: Companies can upload their documents
CREATE POLICY "Companies can upload their documents"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'company-documents'
    AND (storage.foldername(name))[1] = auth.uid()::text
    AND EXISTS (
        SELECT 1 FROM public.user_profiles
        WHERE id = auth.uid()
        AND user_type = 'company'
    )
);

-- Policy 2: Companies and operators can view documents
CREATE POLICY "Companies and operators can view company documents"
ON storage.objects
FOR SELECT
TO authenticated
USING (
    bucket_id = 'company-documents'
    AND (
        (storage.foldername(name))[1] = auth.uid()::text
        OR EXISTS (
            SELECT 1 FROM public.user_profiles
            WHERE id = auth.uid()
            AND user_type = 'operator'
        )
    )
);

-- Policy 3: Companies can update their documents
CREATE POLICY "Companies can update their documents"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
    bucket_id = 'company-documents'
    AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy 4: Companies can delete their documents
CREATE POLICY "Companies can delete their documents"
ON storage.objects
FOR DELETE
TO authenticated
USING (
    bucket_id = 'company-documents'
    AND (storage.foldername(name))[1] = auth.uid()::text
);

-- ============================================
-- Verification Queries
-- ============================================

-- Check all storage policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE schemaname = 'storage'
ORDER BY tablename, policyname;

-- ============================================
-- Notes:
-- ============================================
-- 1. Make sure buckets are created first in Supabase Dashboard
-- 2. Set bucket to Public for majlis-photos and review-photos
-- 3. Set bucket to Private for family-documents and company-documents
-- 4. Test upload/download functionality after applying policies
-- ============================================
