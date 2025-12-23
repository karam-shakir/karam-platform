-- ===================================
-- Simple Direct Insert - One at a time
-- إدراج مباشر بسيط - واحدة تلو الأخرى
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
    -- Create user profiles
    INSERT INTO user_profiles (id, user_type, full_name, phone, email)
    VALUES
        (user1_id, 'family', 'أحمد الكرم', '0501111111', 'test1@karam.sa'),
        (user2_id, 'family', 'خالد البركة', '0501111112', 'test2@karam.sa'),
        (user3_id, 'family', 'محمد الإخلاص', '0501111113', 'test3@karam.sa'),
        (user4_id, 'family', 'فاطمة الهدى', '0501111114', 'test4@karam.sa'),
        (user5_id, 'family', 'عبدالرحمن الرحمة', '0501111115', 'test5@karam.sa'),
        (user6_id, 'family', 'سعد الضياء', '0501111116', 'test6@karam.sa'),
        (user7_id, 'family', 'ماجد الأمل', '0501111117', 'test7@karam.sa'),
        (user8_id, 'family', 'فهد السعادة', '0501111118', 'test8@karam.sa')
    ON CONFLICT (email) DO NOTHING;

    -- Create host families
    INSERT INTO host_families (user_id, family_name, city, address, capacity, description, features, amenities, rating, total_reviews, status, is_active)
    VALUES
        (user1_id, 'أسرة الكرم', 'makkah', 'العزيزية', 10, 'أسرة كريمة', '["وجبات يومية"]', '["واي فاي"]', 4.8, 45, 'approved', true),
        (user2_id, 'أسرة البركة', 'makkah', 'الشوقية', 8, 'ضيافة أصيلة', '["وجبات منزلية"]', '["واي فاي"]', 4.9, 62, 'approved', true),
        (user3_id, 'أسرة الإخلاص', 'madinah', 'قباء', 12, 'ترحب بضيوف الرحمن', '["3 وجبات"]', '["واي فاي"]', 4.7, 38, 'approved', true),
        (user4_id, 'أسرة الهدى', 'madinah', 'العوالي', 6, 'ضيافة نسائية', '["نساء فقط"]', '["واي فاي"]', 5.0, 28, 'approved', true),
        (user5_id, 'أسرة الرحمة', 'makkah', 'النسيم', 15, 'أسرة كبيرة', '["قاعات كبيرة"]', '["موقف سيارات"]', 4.6, 51, 'approved', true),
        (user6_id, 'أسرة الضياء', 'makkah', 'الزاهر', 7, 'ضيافة راقية', '["خدمة راقية"]', '["تلفزيون"]', 4.8, 34, 'approved', true),
        (user7_id, 'أسرة الأمل', 'madinah', 'المبعوث', 9, 'حفاوة وكرم', '["ضيافة أصيلة"]', '["مطبخ"]', 4.7, 29, 'approved', true),
        (user8_id, 'أسرة السعادة', 'makkah', 'المسفلة', 11, 'تجربة لا تُنسى', '["جو عائلي"]', '["غرف نظيفة"]', 4.9, 56, 'approved', true);
END $$;

-- Discount codes
DELETE FROM discount_codes WHERE code IN ('WELCOME20', 'RAMADAN25', 'SPECIAL50');

INSERT INTO discount_codes (code, description, discount_type, discount_value, valid_until, is_active)
VALUES
('WELCOME20', 'خصم 20%', 'percentage', 20, '2025-12-31', true),
('RAMADAN25', 'خصم رمضان', 'percentage', 25, '2025-04-30', true),
('SPECIAL50', 'خصم 50 ريال', 'fixed', 50, '2025-12-31', true);

-- Verification
SELECT COUNT(*) as total FROM host_families WHERE status = 'approved' AND is_active = true;

SELECT family_name, city, capacity FROM host_families 
WHERE status = 'approved' AND is_active = true
ORDER BY city, family_name;
