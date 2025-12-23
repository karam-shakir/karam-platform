-- ===================================
-- إنشاء جدول booking_time_slots والدوال المحدثة
-- Creating booking_time_slots Table and Updated Functions
-- لتطبيقه مع karam_complete_update.sql
-- ===================================

-- ═══════════════════════════════════
-- الجزء 1: إنشاء جدول booking_time_slots
-- Part 1: Create booking_time_slots Table
-- ═══════════════════════════════════

CREATE TABLE IF NOT EXISTS public.booking_time_slots (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
    booking_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    guest_count INTEGER NOT NULL DEFAULT 1,
    status VARCHAR(20) DEFAULT 'confirmed' CHECK (status IN ('confirmed', 'cancelled')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_booking_time_slots_booking_id ON public.booking_time_slots(booking_id);
CREATE INDEX IF NOT EXISTS idx_booking_time_slots_date ON public.booking_time_slots(booking_date);
CREATE INDEX IF NOT EXISTS idx_booking_time_slots_status ON public.booking_time_slots(status);
CREATE INDEX IF NOT EXISTS idx_booking_time_slots_date_status ON public.booking_time_slots(booking_date, status);

-- RLS Policies
ALTER TABLE public.booking_time_slots ENABLE ROW LEVEL SECURITY;

-- Users can view their own booking time slots
CREATE POLICY "Users can view their booking time slots"
    ON public.booking_time_slots FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.bookings
            WHERE bookings.id = booking_time_slots.booking_id
            AND bookings.visitor_id = auth.uid()
        )
    );

-- Families can view time slots for their bookings
CREATE POLICY "Families can view their booking time slots"
    ON public.booking_time_slots FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.bookings
            WHERE bookings.id = booking_time_slots.booking_id
            AND bookings.family_id IN (
                SELECT id FROM public.host_families
                WHERE host_id = auth.uid()
            )
        )
    );

-- Admins can manage all time slots
CREATE POLICY "Admins can manage booking time slots"
    ON public.booking_time_slots FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.user_profiles
            WHERE user_profiles.id = auth.uid()
            AND user_profiles.user_type = 'admin'
        )
    );

-- ═══════════════════════════════════
-- الجزء 2: دوال الحجوزات المتزامنة (تم تحديثها)
-- Part 2: Concurrent Booking Functions (Updated)
-- ═══════════════════════════════════

-- حذف النسخ القديمة
DROP FUNCTION IF EXISTS get_available_families(DATE, VARCHAR, INTEGER);
DROP FUNCTION IF EXISTS get_available_families(DATE, TIME, TIME, INTEGER);
DROP FUNCTION IF EXISTS check_concurrent_capacity(UUID, DATE, TIME, TIME, INTEGER);
DROP FUNCTION IF EXISTS get_available_families_simple(DATE, VARCHAR, INTEGER);
DROP FUNCTION IF EXISTS get_available_families_with_times(DATE, TIME, TIME, INTEGER);

-- الدالة الرئيسية للحصول على الأسر المتاحة
CREATE OR REPLACE FUNCTION get_available_families(
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
            COALESCE(SUM(bts.guest_count), 0) as booked_guests
        FROM public.bookings b
        INNER JOIN public.booking_time_slots bts ON bts.booking_id = b.id
        WHERE bts.booking_date = p_date
          AND bts.status = 'confirmed'
          AND b.status IN ('pending', 'confirmed')
          AND (bts.start_time, bts.end_time) OVERLAPS (p_start_time, p_end_time)
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

-- دالة فحص السعة
CREATE OR REPLACE FUNCTION check_concurrent_capacity(
    p_family_id UUID,
    p_date DATE,
    p_start_time TIME,
    p_end_time TIME,
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
    WHERE hf.id = p_family_id AND hf.status = 'approved' AND hf.is_active = true;

    IF v_total_capacity IS NULL THEN
        RETURN QUERY SELECT FALSE, 0, 0, 0, 'الأسرة غير متاحة';
        RETURN;
    END IF;

    SELECT COALESCE(SUM(bts.guest_count), 0) INTO v_booked_capacity
    FROM public.bookings b
    INNER JOIN public.booking_time_slots bts ON bts.booking_id = b.id
    WHERE b.family_id = p_family_id
      AND bts.booking_date = p_date
      AND bts.status = 'confirmed'
      AND b.status IN ('pending', 'confirmed')
      AND (bts.start_time, bts.end_time) OVERLAPS (p_start_time, p_end_time);

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
-- الجزء 3: الصلاحيات
-- Part 3: Permissions
-- ═══════════════════════════════════

GRANT SELECT, INSERT, UPDATE ON public.booking_time_slots TO authenticated;
GRANT ALL ON public.booking_time_slots TO service_role;
GRANT EXECUTE ON FUNCTION get_available_families TO authenticated, anon;
GRANT EXECUTE ON FUNCTION check_concurrent_capacity TO authenticated, anon;

-- ═══════════════════════════════════
-- الجزء 4: التعليقات
-- Part 4: Comments
-- ═══════════════════════════════════

COMMENT ON TABLE public.booking_time_slots IS 'Stores time slot information for each booking';
COMMENT ON COLUMN public.booking_time_slots.guest_count IS 'Number of guests for this specific time slot';
COMMENT ON FUNCTION get_available_families IS 'Returns families with remaining capacity for concurrent bookings';
COMMENT ON FUNCTION check_concurrent_capacity IS 'Checks remaining capacity for a specific family and time';

-- ═══════════════════════════════════
-- النجاح / Success
-- ═══════════════════════════════════

SELECT 'booking_time_slots table and functions created successfully!' AS status;
