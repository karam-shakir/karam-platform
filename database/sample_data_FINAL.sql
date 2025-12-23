-- ===================================
-- Correct Sample Data for Karam Platform
-- بيانات تجريبية صحيحة لمنصة كرم
-- Based on actual table structure
-- ===================================

-- ═══════════════════════════════════
-- Sample Host Families
-- أسر مستضيفة تجريبية
-- ═══════════════════════════════════

INSERT INTO host_families (
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
    'أسرة الكرم',
    'makkah',
    'العزيزية، مكة المكرمة',
    10,
    'أسرة كريمة تستقبل ضيوف الرحمن بكل حب وترحاب. نوفر وجبات طازجة وإقامة مريحة بالقرب من الحرم الشريف.',
    '["وجبات يومية", "قريب من الحرم", "غرف مفروشة"]',
    '["واي فاي", "مكيفات", "مواصلات"]',
    4.8,
    45,
    'approved',
    true
),
(
    'أسرة البركة',
    'makkah',
    'الشوقية، مكة المكرمة',
    8,
    'نقدم ضيافة أصيلة في قلب مكة المكرمة مع وجبات منزلية شهية.',
    '["وجبات منزلية", "غرف واسعة", "قريب من الحرم"]',
    '["واي فاي", "مكيفات", "ثلاجة"]',
    4.9,
    62,
    'approved',
    true
),
(
    'أسرة الإخلاص',
    'madinah',
    'قباء، المدينة المنورة',
    12,
    'أسرة في المدينة المنورة ترحب بضيوف الرحمن بكل حفاوة. قريبون من المسجد النبوي.',
    '["3 وجبات يومية", "حافلة للحرم", "مكتبة دينية"]',
    '["واي فاي", "مكيفات", "موقف سيارات"]',
    4.7,
    38,
    'approved',
    true
),
(
    'أسرة الهدى',
    'madinah',
    'العوالي، المدينة المنورة',
    6,
    'ضيافة نسائية خاصة في المدينة المنورة مع جو عائلي دافئ.',
    '["نساء فقط", "طعام منزلي", "جلسات دينية"]',
    '["واي فاي", "مكيفات", "غسالة"]',
    5.0,
    28,
    'approved',
    true
),
(
    'أسرة الرحمة',
    'makkah',
    'النسيم، مكة المكرمة',
    15,
    'أسرة كبيرة تستوعب مجموعات ضيوف الرحمن. خبرة طويلة في الاستضافة.',
    '["قاعات كبيرة", "وجبات جماعية", "مصلى"]',
    '["واي فاي", "مكيفات", "موقف سيارات", "حديقة"]',
    4.6,
    51,
    'approved',
    true
),
(
    'أسرة الضياء',
    'makkah',
    'الزاهر، مكة المكرمة',
    7,
    'ضيافة راقية مع خدمات مميزة للمعتمرين والزوار.',
    '["خدمة راقية", "وجبات فاخرة", "غرف مجهزة"]',
    '["واي فاي", "تلفزيون", "مكيفات", "ثلاجة"]',
    4.8,
    34,
    'approved',
    true
),
(
    'أسرة الأمل',
    'madinah',
    'المبعوث، المدينة المنورة',
    9,
    'نستقبل الزوار بحفاوة وكرم في المدينة المنورة.',
    '["ضيافة أصيلة", "وجبات طازجة", "قرب المسجد النبوي"]',
    '["واي فاي", "مكيفات", "مطبخ مجهز"]',
    4.7,
    29,
    'approved',
    true
),
(
    'أسرة السعادة',
    'makkah',
    'المسفلة، مكة المكرمة',
    11,
    'تجربة ضيافة لا تُنسى في مكة المكرمة.',
    '["جو عائلي", "طعام لذيذ", "استقبال حار"]',
    '["واي فاي", "مكيفات", "غرف نظيفة"]',
    4.9,
    56,
    'approved',
    true
);

-- ═══════════════════════════════════
-- Discount Codes
-- ═══════════════════════════════════

INSERT INTO discount_codes (
    code,
    description,
    discount_type,
    discount_value,
    valid_until,
    usage_limit,
    is_active
) VALUES
(
    'FIRST10',
    'خصم 10% للحجز الأول',
    'percentage',
    10,
    '2025-12-31',
    100,
    true
),
(
    'RAMADAN25',
    'خصم رمضان 25%',
    'percentage',
    25,
    '2025-04-30',
    200,
    true
),
(
    'SPECIAL50',
    'خصم 50 ريال',
    'fixed',
    50,
    '2025-12-31',
    NULL,
    true
);

-- ═══════════════════════════════════
-- Verification Queries
-- ═══════════════════════════════════

-- Count families
SELECT 
    COUNT(*) as total_families,
    SUM(CASE WHEN status = 'approved' AND is_active = true THEN 1 ELSE 0 END) as active_families
FROM host_families;

-- View families
SELECT 
    id,
    family_name,
    city,
    capacity,
    rating,
    status,
    is_active
FROM host_families
ORDER BY created_at DESC;

-- Count by city
SELECT 
    city,
    COUNT(*) as count,
    SUM(capacity) as total_capacity,
    AVG(rating) as avg_rating
FROM host_families
WHERE status = 'approved' AND is_active = true
GROUP BY city;
