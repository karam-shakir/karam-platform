-- ===================================
-- Ultra Simple - Minimal Columns
-- بسيط جداً - أقل الأعمدة
-- ===================================

DO $$
DECLARE
    user1_id UUID := gen_random_uuid();
    user2_id UUID := gen_random_uuid();
    user3_id UUID := gen_random_uuid();
    user4_id UUID := gen_random_uuid();
    user5_id UUID := gen_random_uuid();
    user6_id UUID := gen_random_uuid();
    user7_id UUID := gen_random_uuid();
    user8_id UUID := gen_random_uuid();
BEGIN
    -- Create user profiles (only id and user_type - minimal)
    INSERT INTO user_profiles (id, user_type)
    VALUES
        (user1_id, 'family'),
        (user2_id, 'family'),
        (user3_id, 'family'),
        (user4_id, 'family'),
        (user5_id, 'family'),
        (user6_id, 'family'),
        (user7_id, 'family'),
        (user8_id, 'family');

    -- Create host families
    INSERT INTO host_families (
        user_id,
        family_name,
        city,
        capacity,
        status,
        is_active
    ) VALUES
        (user1_id, 'أسرة الكرم', 'makkah', 10, 'approved', true),
        (user2_id, 'أسرة البركة', 'makkah', 8, 'approved', true),
        (user3_id, 'أسرة الإخلاص', 'madinah', 12, 'approved', true),
        (user4_id, 'أسرة الهدى', 'madinah', 6, 'approved', true),
        (user5_id, 'أسرة الرحمة', 'makkah', 15, 'approved', true),
        (user6_id, 'أسرة الضياء', 'makkah', 7, 'approved', true),
        (user7_id, 'أسرة الأمل', 'madinah', 9, 'approved', true),
        (user8_id, 'أسرة السعادة', 'makkah', 11, 'approved', true);
END $$;

-- Delete existing discount codes to avoid duplicates
DELETE FROM discount_codes WHERE code IN ('WELCOME20', 'RAMADAN25', 'SPECIAL50');

-- Add discount codes
INSERT INTO discount_codes (code, discount_type, discount_value, valid_until, is_active)
VALUES
('WELCOME20', 'percentage', 20, '2025-12-31', true),
('RAMADAN25', 'percentage', 25, '2025-04-30', true),
('SPECIAL50', 'fixed', 50, '2025-12-31', true);

-- Verification
SELECT COUNT(*) as total FROM host_families WHERE status = 'approved' AND is_active = true;

SELECT family_name, city, capacity FROM host_families 
WHERE status = 'approved' AND is_active = true
ORDER BY city, family_name;

SELECT city, COUNT(*) as count, SUM(capacity) as total_capacity
FROM host_families
WHERE status = 'approved' AND is_active = true
GROUP BY city;
