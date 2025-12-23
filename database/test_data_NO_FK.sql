-- ===================================
-- TEMPORARY: Remove FK constraint for testing
-- مؤقت: إزالة قيد FK للاختبار
-- WARNING: This is for testing only!
-- ===================================

-- Step 1: Drop the FK constraint
ALTER TABLE user_profiles DROP CONSTRAINT IF EXISTS user_profiles_id_fkey;

-- Step 2: Insert test data
DO $$
DECLARE
    user1_id UUID := gen_random_uuid();
    user2_id UUID := gen_random_uuid();
    user3_id UUID := gen_random_uuid();
    user4_id UUID := gen_random_uuid();
    user5_id UUID := gen_random_uuid();
BEGIN
    -- Create user profiles
    INSERT INTO user_profiles (id, user_type, full_name)
    VALUES
        (user1_id, 'family', 'أحمد محمد'),
        (user2_id, 'family', 'خالد عبدالله'),
        (user3_id, 'family', 'محمد سعيد'),
        (user4_id, 'family', 'فاطمة أحمد'),
        (user5_id, 'family', 'عبدالرحمن علي');

    -- Create host families
    INSERT INTO host_families (user_id, family_name, city, capacity, status, is_active)
    VALUES
        (user1_id, 'أسرة الكرم', 'makkah', 10, 'approved', true),
        (user2_id, 'أسرة البركة', 'makkah', 8, 'approved', true),
        (user3_id, 'أسرة الإخلاص', 'madinah', 12, 'approved', true),
        (user4_id, 'أسرة الهدى', 'madinah', 6, 'approved', true),
        (user5_id, 'أسرة الرحمة', 'makkah', 15, 'approved', true);
END $$;

-- Step 3: Discount codes
DELETE FROM discount_codes WHERE code IN ('WELCOME20', 'SPECIAL50');
INSERT INTO discount_codes (code, discount_type, discount_value, valid_until, is_active)
VALUES
('WELCOME20', 'percentage', 20, '2025-12-31', true),
('SPECIAL50', 'fixed', 50, '2025-12-31', true);

-- Verification
SELECT COUNT(*) as total FROM host_families WHERE status = 'approved' AND is_active = true;
SELECT family_name, city, capacity FROM host_families WHERE status = 'approved' AND is_active = true;

-- IMPORTANT: To restore the FK constraint later, run:
-- ALTER TABLE user_profiles ADD CONSTRAINT user_profiles_id_fkey 
-- FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;
