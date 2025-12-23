-- ===================================
-- Sample Data for Karam Platform
-- بيانات تجريبية لمنصة كرم
-- ===================================

-- ═══════════════════════════════════
-- Sample Host Families
-- أسر مستضيفة تجريبية
-- ═══════════════════════════════════

INSERT INTO host_families (
    family_name,
    host_name,
    city,
    neighborhood,
    capacity,
    description,
    amenities,
    house_rules,
    price_per_guest,
    package_type,
    status,
    is_active,
    rating,
    total_reviews
) VALUES
(
    'أسرة الكرم',
    'أحمد محمد الكرم',
    'makkah',
    'العزيزية',
    10,
    'أسرة كريمة تستقبل ضيوف الرحمن بكل حب وترحاب. نوفر وجبات طازجة وإقامة مريحة بالقرب من الحرم الشريف.',
    '["غرف مفروشة", "وجبات يومية", "مواصلات للحرم", "واي فاي"]',
    '["عدم التدخين", "الهدوء بعد 11 مساء", "احترام خصوصية الأسرة"]',
    150.00,
    'meal',
    'approved',
    true,
    4.8,
    45
),
(
    'أسرة البركة',
    'خالد عبدالله',
    'makkah',
    'الشوقية',
    8,
    'نقدم ضيافة أصيلة في قلب مكة المكرمة مع وجبات منزلية شهية.',
    '["غرف واسعة", "إفطار وعشاء", "قريب من الحرم", "مكيفات"]',
    '["التزام بأوقات الوجبات", "عدم إزعاج الجيران"]',
    120.00,
    'meal',
    'approved',
    true,
    4.9,
    62
),
(
    'أسرة الإخلاص',
    'محمد سعيد',
    'madinah',
    'قباء',
    12,
    'أسرة في المدينة المنورة ترحب بضيوف الرحمن بكل حفاوة. قريبون من المسجد النبوي.',
    '["غرف مريحة", "3 وجبات يومية", "حافلة للحرم", "مكتبة دينية"]',
    '["الالتزام بالمواعيد", "المحافظة على النظافة"]',
    140.00,
    'meal',
    'approved',
    true,
    4.7,
    38
),
(
    'أسرة الهدى',
    'فاطمة الأحمد',
    'madinah',
    'العوالي',
    6,
    'ضيافة نسائية خاصة في المدينة المنورة مع جو عائلي دافئ.',
    '["غرف نساء فقط", "طعام منزلي", "جلسات دينية", "واي فاي"]',
    '["نساء فقط", "الهدوء والاحترام"]',
    130.00,
    'meal',
    'approved',
    true,
    5.0,
    28
),
(
    'أسرة الرحمة',
    'عبدالرحمن علي',
    'makkah',
    'النسيم',
    15,
    'أسرة كبيرة تستوعب مجموعات ضيوف الرحمن. خبرة طويلة في الاستضافة.',
    '["قاعات كبيرة", "وجبات جماعية", "مصلى", "موقف سيارات"]',
    '["حجز مسبق", "الالتزام بالأعداد"]',
    100.00,
    'simple',
    'approved',
    true,
    4.6,
    51
);

-- ═══════════════════════════════════
-- Sample Discount Codes
-- أكواد خصم تجريبية
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
    'خصم 50 ريال على الحجوزات الجماعية',
    'fixed',
    50,
    '2025-12-31',
    NULL,
    true
);

-- ═══════════════════════════════════
-- Verification Queries
-- استعلامات التحقق
-- ═══════════════════════════════════

-- Check inserted families
SELECT 
    id,
    family_name,
    city,
    capacity,
    price_per_guest,
    status,
    is_active,
    rating
FROM host_families
ORDER BY created_at DESC;

-- Check discount codes
SELECT 
    code,
    discount_type,
    discount_value,
    usage_limit,
    times_used,
    is_active
FROM discount_codes
ORDER BY created_at DESC;

-- Count active approved families by city
SELECT 
    city,
    COUNT(*) as family_count,
    AVG(price_per_guest) as avg_price,
    SUM(capacity) as total_capacity
FROM host_families
WHERE status = 'approved' AND is_active = true
GROUP BY city;
