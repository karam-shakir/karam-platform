-- ===================================
-- Sample Data for Karam Platform (Fixed)
-- بيانات تجريبية لمنصة كرم (محدثة)
-- ===================================

-- Note: Insert only columns that exist in your host_families table
-- Adjust this INSERT based on your actual table structure

-- First, let's try a minimal INSERT with only essential columns
INSERT INTO host_families (
    family_name,
    city,
    capacity,
    price_per_guest,
    status,
    is_active
) VALUES
(
    'أسرة الكرم',
    'makkah',
    10,
    150.00,
    'approved',
    true
),
(
    'أسرة البركة',
    'makkah',
    8,
    120.00,
    'approved',
    true
),
(
    'أسرة الإخلاص',
    'madinah',
    12,
    140.00,
    'approved',
    true
),
(
    'أسرة الهدى',
    'madinah',
    6,
    130.00,
    'approved',
    true
),
(
    'أسرة الرحمة',
    'makkah',
    15,
    100.00,
    'approved',
    true
);

-- ═══════════════════════════════════
-- Discount Codes (these should work)
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
);

-- ═══════════════════════════════════
-- Verification
-- ═══════════════════════════════════

SELECT 
    id,
    family_name,
    city,
    capacity,
    price_per_guest,
    status,
    is_active
FROM host_families
ORDER BY created_at DESC;

SELECT 
    code,
    discount_type,
    discount_value,
    is_active
FROM discount_codes
ORDER BY created_at DESC;
