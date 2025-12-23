-- ===================================
-- Final Combined SQL Script for Supabase
-- Karam Platform Database Enhancements
-- نسخة موحدة لجميع التحديثات
-- ===================================

-- ═══════════════════════════════════
-- الجزء 1: نظام أكواد الخصم
-- Part 1: Discount Codes System
-- ═══════════════════════════════════

-- Create discount_codes table
CREATE TABLE IF NOT EXISTS public.discount_codes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    code VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    discount_type VARCHAR(20) NOT NULL CHECK (discount_type IN ('percentage', 'fixed')),
    discount_value DECIMAL(10, 2) NOT NULL CHECK (discount_value > 0),
    valid_from TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    valid_until TIMESTAMP WITH TIME ZONE,
    usage_limit INTEGER DEFAULT NULL,
    times_used INTEGER DEFAULT 0,
    applicable_families JSONB DEFAULT '[]'::jsonb,
    min_booking_amount DECIMAL(10, 2) DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT valid_dates CHECK (valid_until IS NULL OR valid_until > valid_from),
    CONSTRAINT valid_usage CHECK (usage_limit IS NULL OR usage_limit > 0)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_discount_codes_code ON public.discount_codes(code) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_discount_codes_active ON public.discount_codes(is_active, valid_from, valid_until);

-- RLS Policies
ALTER TABLE public.discount_codes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view active discount codes" ON public.discount_codes;
CREATE POLICY "Anyone can view active discount codes" 
    ON public.discount_codes FOR SELECT
    USING (is_active = TRUE AND (valid_until IS NULL OR valid_until > NOW()));

DROP POLICY IF EXISTS "Only admins can manage discount codes" ON public.discount_codes;
CREATE POLICY "Only admins can manage discount codes"
    ON public.discount_codes FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.user_profiles
            WHERE user_profiles.id = auth.uid()
            AND user_profiles.user_type = 'admin'
        )
    );

-- ═══════════════════════════════════
-- الجزء 2: تحديثات جدول الحجوزات
-- Part 2: Bookings Table Updates
-- ═══════════════════════════════════

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'bookings' AND column_name = 'visitor_names') THEN
        ALTER TABLE public.bookings ADD COLUMN visitor_names JSONB DEFAULT '[]'::jsonb;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'bookings' AND column_name = 'discount_code_id') THEN
        ALTER TABLE public.bookings 
        ADD COLUMN discount_code_id UUID REFERENCES public.discount_codes(id) ON DELETE SET NULL;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'bookings' AND column_name = 'discount_amount') THEN
        ALTER TABLE public.bookings ADD COLUMN discount_amount DECIMAL(10, 2) DEFAULT 0;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'bookings' AND column_name = 'emergency_contact') THEN
        ALTER TABLE public.bookings ADD COLUMN emergency_contact VARCHAR(20);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'bookings' AND column_name = 'special_requests') THEN
        ALTER TABLE public.bookings ADD COLUMN special_requests TEXT;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_bookings_discount_code ON public.bookings(discount_code_id) WHERE discount_code_id IS NOT NULL;

-- ═══════════════════════════════════
-- الجزء 3: دوال التحقق من أكواد الخصم
-- Part 3: Discount Code Validation Functions
-- ═══════════════════════════════════

CREATE OR REPLACE FUNCTION public.validate_discount_code(
    p_code VARCHAR(50),
    p_family_id UUID,
    p_booking_amount DECIMAL(10, 2)
)
RETURNS TABLE (
    is_valid BOOLEAN,
    discount_id UUID,
    discount_type VARCHAR(20),
    discount_value DECIMAL(10, 2),
    discount_amount DECIMAL(10, 2),
    message TEXT
) 
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
    v_discount_record RECORD;
    v_calculated_discount DECIMAL(10, 2);
BEGIN
    SELECT * INTO v_discount_record
    FROM public.discount_codes
    WHERE code = p_code AND is_active = TRUE;

    IF v_discount_record IS NULL THEN
        RETURN QUERY SELECT FALSE, NULL::UUID, NULL::VARCHAR, NULL::DECIMAL, 
                     0::DECIMAL, 'كود الخصم غير صحيح أو منتهي الصلاحية';
        RETURN;
    END IF;

    IF v_discount_record.valid_from > NOW() THEN
        RETURN QUERY SELECT FALSE, NULL::UUID, NULL::VARCHAR, NULL::DECIMAL,
                     0::DECIMAL, 'كود الخصم غير صالح بعد';
        RETURN;
    END IF;

    IF v_discount_record.valid_until IS NOT NULL AND v_discount_record.valid_until < NOW() THEN
        RETURN QUERY SELECT FALSE, NULL::UUID, NULL::VARCHAR, NULL::DECIMAL,
                     0::DECIMAL, 'كود الخصم منتهي الصلاحية';
        RETURN;
    END IF;

    IF v_discount_record.usage_limit IS NOT NULL AND 
       v_discount_record.times_used >= v_discount_record.usage_limit THEN
        RETURN QUERY SELECT FALSE, NULL::UUID, NULL::VARCHAR, NULL::DECIMAL,
                     0::DECIMAL, 'تم استخدام الكود بالحد الأقصى';
        RETURN;
    END IF;

    IF p_booking_amount < v_discount_record.min_booking_amount THEN
        RETURN QUERY SELECT FALSE, NULL::UUID, NULL::VARCHAR, NULL::DECIMAL,
                     0::DECIMAL, 'المبلغ أقل من الحد الأدنى للخصم';
        RETURN;
    END IF;

    IF jsonb_array_length(v_discount_record.applicable_families) > 0 AND
       NOT (v_discount_record.applicable_families @> jsonb_build_array(p_family_id::text)) THEN
        RETURN QUERY SELECT FALSE, NULL::UUID, NULL::VARCHAR, NULL::DECIMAL,
                     0::DECIMAL, 'هذا الكود غير مطبق على هذه الأسرة';
        RETURN;
    END IF;

    IF v_discount_record.discount_type = 'percentage' THEN
        v_calculated_discount := ROUND(p_booking_amount * (v_discount_record.discount_value / 100), 2);
    ELSE
        v_calculated_discount := v_discount_record.discount_value;
    END IF;

    IF v_calculated_discount > p_booking_amount THEN
        v_calculated_discount := p_booking_amount;
    END IF;

    RETURN QUERY SELECT 
        TRUE,
        v_discount_record.id,
        v_discount_record.discount_type,
        v_discount_record.discount_value,
        v_calculated_discount,
        'تم تطبيق الخصم بنجاح';
END;
$$;

-- Trigger function
CREATE OR REPLACE FUNCTION public.increment_discount_usage()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
    IF NEW.discount_code_id IS NOT NULL THEN
        UPDATE public.discount_codes
        SET times_used = times_used + 1, updated_at = NOW()
        WHERE id = NEW.discount_code_id;
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_increment_discount_usage ON public.bookings;
CREATE TRIGGER trigger_increment_discount_usage
    AFTER INSERT ON public.bookings
    FOR EACH ROW WHEN (NEW.discount_code_id IS NOT NULL)
    EXECUTE FUNCTION public.increment_discount_usage();

-- ═══════════════════════════════════
-- الجزء 3.5: جدول booking_time_slots
-- Part 3.5: booking_time_slots Table
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

CREATE INDEX IF NOT EXISTS idx_booking_time_slots_booking_id ON public.booking_time_slots(booking_id);
CREATE INDEX IF NOT EXISTS idx_booking_time_slots_date ON public.booking_time_slots(booking_date);
CREATE INDEX IF NOT EXISTS idx_booking_time_slots_date_status ON public.booking_time_slots(booking_date, status);

ALTER TABLE public.booking_time_slots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their booking time slots"
    ON public.booking_time_slots FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.bookings
            WHERE bookings.id = booking_time_slots.booking_id
            AND bookings.visitor_id = auth.uid()
        )
    );

CREATE POLICY "Admins can manage booking time slots"
    ON public.booking_time_slots FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.user_profiles
            WHERE user_profiles.id = auth.uid()
            AND user_profiles.user_type = 'admin'
        )
    );

COMMENT ON TABLE public.booking_time_slots IS 'Stores time slot information for each booking';

-- ═══════════════════════════════════
-- الجزء 4: الحجوزات المتزامنة
-- Part 4: Concurrent Bookings Support
-- ═══════════════════════════════════

-- Delete old versions
DROP FUNCTION IF EXISTS get_available_families(DATE, VARCHAR, INTEGER);
DROP FUNCTION IF EXISTS get_available_families(DATE, TIME, TIME, INTEGER);
DROP FUNCTION IF EXISTS check_concurrent_capacity(UUID, DATE, TIME, TIME, INTEGER);

-- Updated function for concurrent bookings
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

-- Capacity check function
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

-- Add is_active column
DO $$  
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'host_families' AND column_name = 'is_active') THEN
        ALTER TABLE public.host_families ADD COLUMN is_active BOOLEAN DEFAULT TRUE;
        UPDATE public.host_families SET is_active = TRUE WHERE is_active IS NULL;
    END IF;
END $$;

-- ═══════════════════════════════════
-- الجزء 5: الصلاحيات
-- Part 5: Permissions
-- ═══════════════════════════════════

GRANT SELECT ON public.discount_codes TO authenticated;
GRANT ALL ON public.discount_codes TO service_role;
GRANT SELECT, INSERT, UPDATE ON public.booking_time_slots TO authenticated;
GRANT ALL ON public.booking_time_slots TO service_role;
GRANT EXECUTE ON FUNCTION public.validate_discount_code TO authenticated;
GRANT EXECUTE ON FUNCTION public.increment_discount_usage TO authenticated;
GRANT EXECUTE ON FUNCTION get_available_families TO authenticated, anon;
GRANT EXECUTE ON FUNCTION check_concurrent_capacity TO authenticated, anon;

-- ═══════════════════════════════════
-- التعليقات / Comments
-- ═══════════════════════════════════

COMMENT ON TABLE public.discount_codes IS 'Stores discount codes for bookings';
COMMENT ON FUNCTION public.validate_discount_code IS 'Validates discount code and calculates amount';
COMMENT ON FUNCTION get_available_families IS 'Returns families with capacity for concurrent bookings';
COMMENT ON FUNCTION check_concurrent_capacity IS 'Checks remaining capacity for concurrent bookings';

-- ═══════════════════════════════════
-- انتهى السكربت / Script Complete
-- ═══════════════════════════════════

-- للتحقق من نجاح التنفيذ:
SELECT 'Database schema updated successfully!' AS status;
