-- ===================================
-- Complete Sample Data with User Profiles
-- بيانات كاملة مع ملفات المستخدمين
-- ===================================

-- ═══════════════════════════════════
-- Step 1: Create User Profiles First
-- إنشاء ملفات المستخدمين أولاً
-- ═══════════════════════════════════

-- Create 8 family host user profiles
INSERT INTO user_profiles (id, user_type, full_name, phone, email, created_at)
VALUES
    (gen_random_uuid(), 'family', 'أحمد محمد الكرم', '0501111111', 'family1@test.com', NOW()),
    (gen_random_uuid(), 'family', 'خالد عبدالله البركة', '0501111112', 'family2@test.com', NOW()),
    (gen_random_uuid(), 'family', 'محمد سعيد الإخلاص', '0501111113', 'family3@test.com', NOW()),
    (gen_random_uuid(), 'family', 'فاطمة أحمد الهدى', '0501111114', 'family4@test.com', NOW()),
    (gen_random_uuid(), 'family', 'عبدالرحمن علي الرحمة', '0501111115', 'family5@test.com', NOW()),
    (gen_random_uuid(), 'family', 'سعد محمد الضياء', '0501111116', 'family6@test.com', NOW()),
    (gen_random_uuid(), 'family', 'ماجد حسن الأمل', '0501111117', 'family7@test.com', NOW()),
    (gen_random_uuid(), 'family', 'فهد خالد السعادة', '0501111118', 'family8@test.com', NOW())
ON CONFLICT (email) DO NOTHING;

-- ═══════════════════════════════════
-- Step 2: Insert Host Families using created user_ids
-- إضافة الأسر باستخدام user_ids المنشأة
-- ═══════════════════════════════════

WITH family_users AS (
    SELECT id, ROW_NUMBER() OVER (ORDER BY created_at DESC) as rn
    FROM user_profiles
    WHERE user_type = 'family'
    ORDER BY created_at DESC
    LIMIT 8
)
INSERT INTO host_families (
    user_id,
    family_name,
    city,
    address,
    capacity,
    description,
    features,
    amenities,
    rating,
    total_reviews,
    status,
    is_active
)
SELECT 
    u.id,
    f.family_name,
    f.city,
    f.address,
    f.capacity,
    f.description,
    f.features,
    f.amenities,
    f.rating,
    f.total_reviews,
    f.status,
    f.is_active
FROM (VALUES
    ('أسرة الكرم', 'makkah', 'العزيزية، مكة المكرمة', 10, 'أسرة كريمة تستقبل ضيوف الرحمن', '["وجبات يومية", "قريب من الحرم"]', '["واي فاي", "مكيفات"]', 4.8, 45, 'approved', true, 1),
    ('أسرة البركة', 'makkah', 'الشوقية، مكة المكرمة', 8, 'نقدم ضيافة أصيلة', '["وجبات منزلية", "غرف واسعة"]', '["واي فاي", "مكيفات"]', 4.9, 62, 'approved', true, 2),
    ('أسرة الإخلاص', 'madinah', 'قباء، المدينة المنورة', 12, 'أسرة ترحب بضيوف الرحمن', '["3 وجبات", "حافلة للحرم"]', '["واي فاي", "موقف سيارات"]', 4.7, 38, 'approved', true, 3),
    ('أسرة الهدى', 'madinah', 'العوالي، المدينة المنورة', 6, 'ضيافة نسائية خاصة', '["نساء فقط", "طعام منزلي"]', '["واي فاي", "مكيفات"]', 5.0, 28, 'approved', true, 4),
    ('أسرة الرحمة', 'makkah', 'النسيم، مكة المكرمة', 15, 'أسرة كبيرة', '["قاعات كبيرة", "وجبات جماعية"]', '["موقف سيارات"]', 4.6, 51, 'approved', true, 5),
    ('أسرة الضياء', 'makkah', 'الزاهر، مكة المكرمة', 7, 'ضيافة راقية', '["خدمة راقية", "وجبات فاخرة"]', '["واي فاي", "تلفزيون"]', 4.8, 34, 'approved', true, 6),
    ('أسرة الأمل', 'madinah', 'المبعوث، المدينة المنورة', 9, 'نستقبل الزوار بحفاوة', '["ضيافة أصيلة"]', '["واي فاي", "مطبخ"]', 4.7, 29, 'approved', true, 7),
    ('أسرة السعادة', 'makkah', 'المسفلة، مكة المكرمة', 11, 'تجربة لا تُنسى', '["جو عائلي", "طعام لذيذ"]', '["واي فاي"]', 4.9, 56, 'approved', true, 8)
) AS f(family_name, city, address, capacity, description, features, amenities, rating, total_reviews, status, is_active, rn)
JOIN family_users u ON u.rn = f.rn;

-- ═══════════════════════════════════
-- Step 3: Discount Codes
-- ═══════════════════════════════════

DELETE FROM discount_codes WHERE code IN ('WELCOME20', 'RAMADAN25', 'SPECIAL50');

INSERT INTO discount_codes (code, description, discount_type, discount_value, valid_until, is_active)
VALUES
('WELCOME20', 'خصم 20% ترحيبي', 'percentage', 20, '2025-12-31', true),
('RAMADAN25', 'خصم رمضان 25%', 'percentage', 25, '2025-04-30', true),
('SPECIAL50', 'خصم 50 ريال', 'fixed', 50, '2025-12-31', true);

-- ═══════════════════════════════════
-- Verification
-- ═══════════════════════════════════

SELECT COUNT(*) as total_families FROM host_families WHERE status = 'approved' AND is_active = true;

SELECT family_name, city, capacity, rating
FROM host_families
WHERE status = 'approved' AND is_active = true
ORDER BY city, family_name;

SELECT city, COUNT(*) as count, SUM(capacity) as total_capacity
FROM host_families
WHERE status = 'approved' AND is_active = true
GROUP BY city;
