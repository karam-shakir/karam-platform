-- ===================================
-- Sample Data - Multiple Random Users
-- بيانات تجريبية بمستخدمين متعددين
-- Each family gets a unique random user_id
-- ===================================

-- ═══════════════════════════════════
-- Insert Host Families (Each with unique user_id)
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
    gen_random_uuid(), -- Unique user for each family
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
    gen_random_uuid(),
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
    gen_random_uuid(),
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
    gen_random_uuid(),
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
    gen_random_uuid(),
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
    gen_random_uuid(),
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
    gen_random_uuid(),
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
    gen_random_uuid(),
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
-- Discount Codes
-- ═══════════════════════════════════

-- Delete existing test codes to avoid duplicates
DELETE FROM discount_codes WHERE code IN ('WELCOME20', 'RAMADAN25', 'SPECIAL50');

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

-- Count total families
SELECT 
    COUNT(*) as total_families,
    COUNT(*) FILTER (WHERE status = 'approved' AND is_active = true) as active_approved
FROM host_families;

-- View all active families
SELECT 
    family_name,
    city,
    capacity,
    rating,
    total_reviews,
    status,
    is_active
FROM host_families
WHERE status = 'approved' AND is_active = true
ORDER BY city, family_name;

-- Count by city
SELECT 
    city,
    COUNT(*) as family_count,
    SUM(capacity) as total_capacity,
    ROUND(AVG(rating)::numeric, 2) as avg_rating
FROM host_families
WHERE status = 'approved' AND is_active = true
GROUP BY city
ORDER BY city;

-- View discount codes
SELECT code, discount_type, discount_value, is_active
FROM discount_codes
WHERE is_active = true;
