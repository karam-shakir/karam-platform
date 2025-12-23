-- ===================================
-- Ultra Minimal Sample Data
-- بيانات تجريبية بسيطة جداً
-- ===================================

-- This uses ONLY the most basic columns that MUST exist
-- If this fails, we need to see your actual table structure

INSERT INTO host_families (
    family_name,
    city,
    capacity,
    status,
    is_active
) VALUES
(
    'أسرة الكرم',
    'makkah',
    10,
    'approved',
    true
),
(
    'أسرة البركة',
    'makkah',
    8,
    'approved',
    true
),
(
    'أسرة الإخلاص',
    'madinah',
    12,
    'approved',
    true
),
(
    'أسرة الهدى',
    'madinah',
    6,
    'approved',
    true
),
(
    'أسرة الرحمة',
    'makkah',
    15,
    'approved',
    true
);

-- Verify
SELECT * FROM host_families ORDER BY created_at DESC LIMIT 5;
