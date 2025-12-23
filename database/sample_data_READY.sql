-- ===================================
-- FINAL WORKING Sample Data
-- بيانات جاهزة للعمل
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
    -- Create user profiles with full_name (required)
    INSERT INTO user_profiles (id, user_type, full_name)
    VALUES
        (user1_id, 'family', 'أحمد محمد الكرم'),
        (user2_id, 'family', 'خالد عبدالله البركة'),
        (user3_id, 'family', 'محمد سعيد الإخلاص'),
        (user4_id, 'family', 'فاطمة أحمد الهدى'),
        (user5_id, 'family', 'عبدالرحمن علي الرحمة'),
        (user6_id, 'family', 'سعد محمد الضياء'),
        (user7_id, 'family', 'ماجد حسن الأمل'),
        (user8_id, 'family', 'فهد خالد السعادة');

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
    
    RAISE NOTICE 'Successfully created 8 families!';
END $$;

-- Discount codes
DELETE FROM discount_codes WHERE code IN ('WELCOME20', 'RAMADAN25', 'SPECIAL50');

INSERT INTO discount_codes (code, discount_type, discount_value, valid_until, is_active)
VALUES
('WELCOME20', 'percentage', 20, '2025-12-31', true),
('RAMADAN25', 'percentage', 25, '2025-04-30', true),
('SPECIAL50', 'fixed', 50, '2025-12-31', true);

-- Verification
SELECT COUNT(*) as "عدد الأسر" FROM host_families WHERE status = 'approved' AND is_active = true;

SELECT 
    family_name as "اسم الأسرة",
    city as "المدينة",
    capacity as "السعة"
FROM host_families 
WHERE status = 'approved' AND is_active = true
ORDER BY city, family_name;

SELECT 
    city as "المدينة",
    COUNT(*) as "عدد الأسر",
    SUM(capacity) as "السعة الإجمالية"
FROM host_families
WHERE status = 'approved' AND is_active = true
GROUP BY city;
