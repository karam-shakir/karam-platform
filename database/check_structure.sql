-- ===================================
-- استعلام للتحقق من هيكل قاعدة البيانات
-- Database Structure Check
-- ===================================

-- 1. التحقق من جدول bookings وأعمدته
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'bookings'
ORDER BY ordinal_position;

-- 2. التحقق من وجود جدول booking_time_slots
SELECT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'booking_time_slots'
) AS table_exists;

-- 3. عرض بنية جدول host_families
SELECT 
    column_name,
    data_type
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'host_families'
ORDER BY ordinal_position;

-- 4. عرض جميع الجداول في قاعدة البيانات
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public'
ORDER BY table_name;
