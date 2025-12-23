-- ===================================
-- Updated Functions for Simple Booking Structure
-- دوال محدثة تتوافق مع هيكل جدول bookings البسيط
-- ===================================

-- هذا السكربت يفترض أن جدول bookings يحتوي على:
-- - booking_date (DATE)
-- - time_slot (VARCHAR) أو start_time/end_time
-- - number_of_guests أو guest_count
-- - status

-- ═══════════════════════════════════
-- الخيار 1: إذا كان لديك time_slot و number_of_guests
-- Option 1: If you have time_slot and number_of_guests
-- ═══════════════════════════════════

DROP FUNCTION IF EXISTS get_available_families(DATE, TIME, TIME, INTEGER);
DROP FUNCTION IF EXISTS check_concurrent_capacity(UUID, DATE, TIME, TIME, INTEGER);

-- دالة مبسطة باستخدام time_slot
CREATE OR REPLACE FUNCTION get_available_families_simple(
    p_date DATE,
    p_time_slot VARCHAR(20),
    p_guest_count INTEGER DEFAULT 1
)
RETURNS TABLE (
    family_id UUID,
    family_name TEXT,
    city VARCHAR(50),
    available_capacity INTEGER,
    total_capacity INTEGER,
    current_bookings INTEGER
) AS $$
BEGIN
    RETURN QUERY
    WITH family_bookings AS (
        SELECT 
            b.family_id,
            COALESCE(SUM(b.number_of_guests), 0) as booked_guests
        FROM public.bookings b
        WHERE b.booking_date = p_date
          AND b.time_slot = p_time_slot
          AND b.status IN ('pending', 'confirmed')
        GROUP BY b.family_id
    )
    SELECT 
        hf.id as family_id,
        hf.family_name,
        hf.city,
        GREATEST(0, hf.capacity - COALESCE(fb.booked_guests, 0))::INTEGER as available_capacity,
        hf.capacity as total_capacity,
        COALESCE(fb.booked_guests, 0)::INTEGER as current_bookings
    FROM public.host_families hf
    LEFT JOIN family_bookings fb ON fb.family_id = hf.id
    WHERE hf.status = 'approved'
      AND hf.is_active = true
      AND (hf.capacity - COALESCE(fb.booked_guests, 0)) >= p_guest_count
    ORDER BY available_capacity DESC, hf.rating DESC NULLS LAST;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ═══════════════════════════════════
-- الخيار 2: إذا كان لديك start_time و end_time
-- Option 2: If you have start_time and end_time
-- ═══════════════════════════════════

CREATE OR REPLACE FUNCTION get_available_families_with_times(
    p_date DATE,
    p_start_time TIME,
    p_end_time TIME,
    p_guest_count INTEGER DEFAULT 1
)
RETURNS TABLE (
    family_id UUID,
    family_name TEXT,
    city VARCHAR(50),
    available_capacity INTEGER,
    total_capacity INTEGER,
    current_bookings INTEGER
) AS $$
BEGIN
    RETURN QUERY
    WITH family_bookings AS (
        SELECT 
            b.family_id,
            COALESCE(SUM(b.number_of_guests), 0) as booked_guests
        FROM public.bookings b
        WHERE b.booking_date = p_date
          AND b.status IN ('pending', 'confirmed')
          -- تحقق من تداخل الأوقات
          AND (b.start_time, b.end_time) OVERLAPS (p_start_time, p_end_time)
        GROUP BY b.family_id
    )
    SELECT 
        hf.id as family_id,
        hf.family_name,
        hf.city,
        GREATEST(0, hf.capacity - COALESCE(fb.booked_guests, 0))::INTEGER as available_capacity,
        hf.capacity as total_capacity,
        COALESCE(fb.booked_guests, 0)::INTEGER as current_bookings
    FROM public.host_families hf
    LEFT JOIN family_bookings fb ON fb.family_id = hf.id
    WHERE hf.status = 'approved'
      AND hf.is_active = true
      AND (hf.capacity - COALESCE(fb.booked_guests, 0)) >= p_guest_count
    ORDER BY available_capacity DESC, hf.rating DESC NULLS LAST;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ═══════════════════════════════════
-- دالة فحص السعة المبسطة
-- Simple Capacity Check
-- ═══════════════════════════════════

CREATE OR REPLACE FUNCTION check_capacity_simple(
    p_family_id UUID,
    p_date DATE,
    p_time_slot VARCHAR(20),
    p_guest_count INTEGER DEFAULT 1
)
RETURNS TABLE (
    has_capacity BOOLEAN,
    total_capacity INTEGER,
    booked_capacity INTEGER,
    available_capacity INTEGER,
    message TEXT
) AS $$
DECLARE
    v_total_capacity INTEGER;
    v_booked_capacity INTEGER;
    v_available_capacity INTEGER;
BEGIN
    SELECT hf.capacity INTO v_total_capacity
    FROM public.host_families hf
    WHERE hf.id = p_family_id 
      AND hf.status = 'approved' 
      AND hf.is_active = true;

    IF v_total_capacity IS NULL THEN
        RETURN QUERY SELECT FALSE, 0, 0, 0, 'الأسرة غير متاحة';
        RETURN;
    END IF;

    SELECT COALESCE(SUM(number_of_guests), 0) INTO v_booked_capacity
    FROM public.bookings
    WHERE family_id = p_family_id
      AND booking_date = p_date
      AND time_slot = p_time_slot
      AND status IN ('pending', 'confirmed');

    v_available_capacity := v_total_capacity - v_booked_capacity;

    IF v_available_capacity >= p_guest_count THEN
        RETURN QUERY SELECT 
            TRUE, v_total_capacity, v_booked_capacity, v_available_capacity,
            format('متوفر: %s مكان من أصل %s', v_available_capacity, v_total_capacity);
    ELSE
        RETURN QUERY SELECT 
            FALSE, v_total_capacity, v_booked_capacity, v_available_capacity,
            format('غير كافي: متوفر %s فقط من %s مطلوب', v_available_capacity, p_guest_count);
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ═══════════════════════════════════
-- الصلاحيات
-- Permissions
-- ═══════════════════════════════════

GRANT EXECUTE ON FUNCTION get_available_families_simple TO authenticated, anon;
GRANT EXECUTE ON FUNCTION get_available_families_with_times TO authenticated, anon;
GRANT EXECUTE ON FUNCTION check_capacity_simple TO authenticated, anon;

-- ═══════════════════════════════════
-- اختبارات
-- Tests
-- ═══════════════════════════════════

-- اختبار الدالة المبسطة (time_slot)
/*
SELECT * FROM get_available_families_simple(
    CURRENT_DATE + 7,
    'afternoon',
    5
);
*/

-- اختبار الدالة مع الأوقات
/*
SELECT * FROM get_available_families_with_times(
    CURRENT_DATE + 7,
    '14:00'::TIME,
    '18:00'::TIME,
    5
);
*/

-- اختبار فحص السعة
/*
WITH test_family AS (SELECT id FROM host_families LIMIT 1)
SELECT * FROM check_capacity_simple(
    (SELECT id FROM test_family),
    CURRENT_DATE + 7,
    'afternoon',
    5
);
*/

COMMENT ON FUNCTION get_available_families_simple IS 'Returns available families using time_slot field';
COMMENT ON FUNCTION get_available_families_with_times IS 'Returns available families using start_time and end_time';
COMMENT ON FUNCTION check_capacity_simple IS 'Checks capacity for a specific family and time slot';
