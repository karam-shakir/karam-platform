-- ===================================
-- Complete Sample Data with Users
-- بيانات تجريبية كاملة مع المستخدمين
-- ===================================

-- ═══════════════════════════════════
-- Step 1: Get or Create User
-- احصل على user_id أو أنشئ مستخدم
-- ═══════════════════════════════════

-- Option A: Use existing user (RECOMMENDED)
-- Check if you have any users in auth.users table first
-- If yes, get one user_id and use it below

-- Option B: Use a static UUID for testing
-- We'll create a profile entry that references an auth user

DO $$
DECLARE
    test_user_id UUID;
BEGIN
    -- Try to get an existing user
    SELECT id INTO test_user_id
    FROM auth.users
    LIMIT 1;
    
    -- If no user exists, we'll use a random UUID
    -- Note: This won't work for auth-related features but will allow data insertion
    IF test_user_id IS NULL THEN
        test_user_id := gen_random_uuid();
    END IF;
    
    -- Store it in a temp variable we can use
    PERFORM set_config('my.test_user_id', test_user_id::text, false);
END $$;

-- ═══════════════════════════════════
-- Step 2: Insert Host Families
-- أدخل الأسر المستضيفة
-- ═══════════════════════════════════

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
) VALUES
(
    current_setting('my.test_user_id')::uuid,
    'أسرة الكرم',
    'makkah',
    'العزيزية، مكة المكرمة',
    10,
    'أسرة كريمة تستقبل ضيوف الرحمن بكل حب وترحاب',
    '["وجبات يومية", "قريب من الحرم"]',
    '["واي فاي", "مكيفات"]',
    4.8,
    45,
    'approved',
    true
),
(
    current_setting('my.test_user_id')::uuid,
    'أسرة البركة',
    'makkah',
    'الشوقية، مكة المكرمة',
    8,
    'نقدم ضيافة أصيلة في قلب مكة المكرمة',
    '["وجبات منزلية", "غرف واسعة"]',
    '["واي فاي", "مكيفات"]',
    4.9,
    62,
    'approved',
    true
),
(
    current_setting('my.test_user_id')::uuid,
    'أسرة الإخلاص',
    'madinah',
    'قباء، المدينة المنورة',
    12,
    'أسرة في المدينة المنورة ترحب بضيوف الرحمن',
    '["3 وجبات يومية", "حافلة للحرم"]',
    '["واي فاي", "موقف سيارات"]',
    4.7,
    38,
    'approved',
    true
),
(
    current_setting('my.test_user_id')::uuid,
    'أسرة الهدى',
    'madinah',
    'العوالي، المدينة المنورة',
    6,
    'ضيافة نسائية خاصة في المدينة المنورة',
    '["نساء فقط", "طعام منزلي"]',
    '["واي فاي", "مكيفات"]',
    5.0,
    28,
    'approved',
    true
),
(
    current_setting('my.test_user_id')::uuid,
    'أسرة الرحمة',
    'makkah',
    'النسيم، مكة المكرمة',
    15,
    'أسرة كبيرة تستوعب مجموعات ضيوف الرحمن',
    '["قاعات كبيرة", "وجبات جماعية"]',
    '["موقف سيارات", "حديقة"]',
    4.6,
    51,
    'approved',
    true
),
(
    current_setting('my.test_user_id')::uuid,
    'أسرة الضياء',
    'makkah',
    'الزاهر، مكة المكرمة',
    7,
    'ضيافة راقية مع خدمات مميزة للمعتمرين',
    '["خدمة راقية", "وجبات فاخرة"]',
    '["واي فاي", "تلفزيون"]',
    4.8,
    34,
    'approved',
    true
),
(
    current_setting('my.test_user_id')::uuid,
    'أسرة الأمل',
    'madinah',
    'المبعوث، المدينة المنورة',
    9,
    'نستقبل الزوار بحفاوة وكرم في المدينة المنورة',
    '["ضيافة أصيلة", "قرب المسجد النبوي"]',
    '["واي فاي", "مطبخ مجهز"]',
    4.7,
    29,
    'approved',
    true
),
(
    current_setting('my.test_user_id')::uuid,
    'أسرة السعادة',
    'makkah',
    'المسفلة، مكة المكرمة',
    11,
    'تجربة ضيافة لا تُنسى في مكة المكرمة',
    '["جو عائلي", "طعام لذيذ"]',
    '["واي فاي", "غرف نظيفة"]',
    4.9,
    56,
    'approved',
    true
);

-- ═══════════════════════════════════
-- Step 3: Discount Codes
-- ═══════════════════════════════════

INSERT INTO discount_codes (
    code,
    description,
    discount_type,
    discount_value,
    valid_until,
    is_active
) VALUES
('WELCOME20', 'خصم 20% ترحيبي', 'percentage', 20, '2025-12-31', true),
('RAMADAN25', 'خصم رمضان 25%', 'percentage', 25, '2025-04-30', true),
('SPECIAL50', 'خصم 50 ريال', 'fixed', 50, '2025-12-31', true);

-- ═══════════════════════════════════
-- Verification
-- ═══════════════════════════════════

SELECT 
    family_name,
    city,
    capacity,
    rating,
    status,
    is_active
FROM host_families
WHERE status = 'approved' AND is_active = true
ORDER BY created_at DESC;

SELECT 
    city,
    COUNT(*) as count,
    SUM(capacity) as total_capacity
FROM host_families
WHERE status = 'approved' AND is_active = true
GROUP BY city;
