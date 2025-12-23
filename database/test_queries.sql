-- ===================================
-- استعلامات اختبار قاعدة البيانات
-- Database Test Queries
-- ===================================

-- ═══════════════════════════════════
-- 1. اختبار إنشاء كود خصم
-- Test: Create Discount Code
-- ═══════════════════════════════════

INSERT INTO discount_codes (
    code, 
    description,
    discount_type, 
    discount_value, 
    valid_until, 
    usage_limit
)
VALUES (
    'WELCOME20',           -- كود الخصم
    'خصم ترحيبي 20%',     -- الوصف
    'percentage',          -- نوع الخصم: نسبة مئوية
    20,                    -- القيمة: 20%
    '2025-12-31',         -- صالح حتى نهاية 2025
    100                    -- حد الاستخدام: 100 مرة
);

-- كود خصم آخر: مبلغ ثابت
INSERT INTO discount_codes (
    code, 
    description,
    discount_type, 
    discount_value, 
    valid_until
)
VALUES (
    'RAMADAN50',
    'خصم رمضان 50 ريال',
    'fixed',              -- نوع الخصم: مبلغ ثابت
    50,                   -- القيمة: 50 ريال
    '2025-04-30'         -- صالح حتى نهاية رمضان
);

-- ═══════════════════════════════════
-- 2. عرض جميع أكواد الخصم
-- Test: View All Discount Codes
-- ═══════════════════════════════════

SELECT 
    code,
    description,
    discount_type,
    discount_value,
    TO_CHAR(valid_until, 'YYYY-MM-DD') as expires_on,
    usage_limit,
    times_used,
    is_active
FROM discount_codes
ORDER BY created_at DESC;

-- ═══════════════════════════════════
-- 3. اختبار التحقق من كود الخصم
-- Test: Validate Discount Code
-- ═══════════════════════════════════

-- أولاً: احصل على UUID لأسرة موجودة
-- نستخدم هذا الاستعلام للحصول على UUID حقيقي
SELECT id, family_name FROM host_families LIMIT 1;

-- بعد الحصول على UUID من الاستعلام أعلاه، استخدمه هنا:
-- (استبدل 'PASTE_FAMILY_UUID_HERE' بالـ UUID الفعلي)

-- مثال على الاختبار (استخدم UUID حقيقي من الاستعلام السابق):
WITH test_family AS (
    SELECT id FROM host_families LIMIT 1
)
SELECT * FROM validate_discount_code(
    'WELCOME20',                    -- كود الخصم
    (SELECT id FROM test_family),   -- UUID الأسرة
    500.00                          -- مبلغ الحجز
);

-- ═══════════════════════════════════
-- 4. اختبار الحجوزات المتزامنة
-- Test: Concurrent Bookings
-- ═══════════════════════════════════

-- الأسر المتاحة لتاريخ ووقت معين
SELECT 
    family_name,
    city,
    available_capacity,
    total_capacity,
    current_bookings,
    CONCAT(available_capacity, '/', total_capacity) as capacity_ratio
FROM get_available_families(
    '2025-12-15'::DATE,     -- التاريخ
    '14:00'::TIME,          -- وقت البداية
    '18:00'::TIME,          -- وقت النهاية
    5                       -- عدد الضيوف المطلوب
)
ORDER BY available_capacity DESC;

-- ═══════════════════════════════════
-- 5. فحص سعة أسرة معينة
-- Test: Check Specific Family Capacity
-- ═══════════════════════════════════

WITH test_family AS (
    SELECT id FROM host_families WHERE is_active = true LIMIT 1
)
SELECT * FROM check_concurrent_capacity(
    (SELECT id FROM test_family),  -- UUID الأسرة
    '2025-12-15'::DATE,           -- التاريخ
    '14:00'::TIME,                -- وقت البداية
    '18:00'::TIME,                -- وقت النهاية
    5                             -- عدد الضيوف
);

-- ═══════════════════════════════════
-- 6. التحقق من الأعمدة الجديدة
-- Test: Verify New Columns
-- ═══════════════════════════════════

-- التحقق من أعمدة جدول bookings
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'bookings'
AND column_name IN (
    'visitor_names',
    'discount_code_id',
    'discount_amount',
    'emergency_contact',
    'special_requests'
)
ORDER BY column_name;

-- التحقق من عمود is_active في host_families
SELECT 
    column_name,
    data_type,
    column_default
FROM information_schema.columns
WHERE table_name = 'host_families'
AND column_name = 'is_active';

-- ═══════════════════════════════════
-- 7. إحصائيات سريعة
-- Test: Quick Statistics
-- ═══════════════════════════════════

-- عدد أكواد الخصم النشطة
SELECT 
    'Active Discount Codes' as metric,
    COUNT(*) as count
FROM discount_codes
WHERE is_active = true
AND (valid_until IS NULL OR valid_until > NOW());

-- عدد الأسر النشطة
SELECT 
    'Active Families' as metric,
    COUNT(*) as count
FROM host_families
WHERE is_active = true AND status = 'approved';

-- الحجوزات التي استخدمت أكواد خصم
SELECT 
    'Bookings with Discounts' as metric,
    COUNT(*) as count
FROM bookings
WHERE discount_code_id IS NOT NULL;

-- ═══════════════════════════════════
-- 8. اختبار شامل: حجز كامل
-- Test: Complete Booking Scenario
-- ═══════════════════════════════════

-- محاكاة حجز كامل (للاختبار فقط - لا تنفذه على بيانات حقيقية)
-- هذا مثال على كيفية إنشاء حجز مع جميع البيانات الجديدة

/*
WITH test_data AS (
    SELECT 
        (SELECT id FROM host_families LIMIT 1) as family_id,
        (SELECT id FROM user_profiles WHERE user_type = 'visitor' LIMIT 1) as visitor_id,
        (SELECT id FROM discount_codes WHERE code = 'WELCOME20') as discount_id
)
INSERT INTO bookings (
    booking_number,
    visitor_id,
    family_id,
    booking_date,
    total_amount,
    discount_code_id,
    discount_amount,
    visitor_names,
    emergency_contact,
    special_requests,
    status
)
SELECT 
    'TEST-' || gen_random_uuid()::text,
    visitor_id,
    family_id,
    CURRENT_DATE + INTERVAL '7 days',
    500.00,
    discount_id,
    100.00,
    '["محمد أحمد علي السعيد", "فاطمة حسن محمد"]'::jsonb,
    '0501234567',
    'نباتي - حساسية من المكسرات',
    'pending'
FROM test_data;
*/

-- ═══════════════════════════════════
-- 9. تنظيف بيانات الاختبار (اختياري)
-- Cleanup Test Data (Optional)
-- ═══════════════════════════════════

-- حذف أكواد الخصم التجريبية (استخدم بحذر!)
/*
DELETE FROM discount_codes 
WHERE code IN ('WELCOME20', 'RAMADAN50');
*/

-- ═══════════════════════════════════
-- انتهى ملف الاختبار
-- End of Test Queries
-- ═══════════════════════════════════

-- ملاحظة: لتنفيذ هذه الاستعلامات:
-- 1. انسخ الاستعلام المطلوب
-- 2. الصقه في Supabase SQL Editor
-- 3. اضغط Run (F5)
