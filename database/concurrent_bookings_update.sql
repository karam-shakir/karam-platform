--_Updated get_available_families function to support concurrent bookings
-- This replaces the existing function in availability_system.sql

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
        -- Count existing guests for overlapping time slots on this date
        SELECT 
            b.family_id,
            COALESCE(SUM(bts.guest_count), 0) as booked_guests
        FROM public.bookings b
        INNER JOIN public.booking_time_slots bts ON bts.booking_id = b.id
        WHERE bts.booking_date = p_date
          AND bts.status = 'confirmed'
          AND b.status IN ('pending', 'confirmed')
          -- Check for time overlap
          AND (
              (bts.start_time, bts.end_time) OVERLAPS (p_start_time, p_end_time)
          )
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
      -- Has enough remaining capacity for this booking
      AND (hf.capacity - COALESCE(fb.booked_guests, 0)) >= p_guest_count
    ORDER BY available_capacity DESC, hf.rating DESC NULLS LAST;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check remaining capacity for concurrent bookings
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
    -- Get family's total capacity
    SELECT hf.capacity INTO v_total_capacity
    FROM public.host_families hf
    WHERE hf.id = p_family_id AND hf.status = 'approved' AND hf.is_active = true;

    IF v_total_capacity IS NULL THEN
        RETURN QUERY SELECT 
            FALSE,
            0,
            0,
            0,
            'الأسرة غير متاحة';
        RETURN;
    END IF;

    -- Get currently booked capacity for overlapping time
    SELECT COALESCE(SUM(bts.guest_count), 0) INTO v_booked_capacity
    FROM public.bookings b
    INNER JOIN public.booking_time_slots bts ON bts.booking_id = b.id
    WHERE b.family_id = p_family_id
      AND bts.booking_date = p_date
      AND bts.status = 'confirmed'
      AND b.status IN ('pending', 'confirmed')
      AND (bts.start_time, bts.end_time) OVERLAPS (p_start_time, p_end_time);

    v_available_capacity := v_total_capacity - v_booked_capacity;

    -- Check if there's enough capacity
    IF v_available_capacity >= p_guest_count THEN
        RETURN QUERY SELECT 
            TRUE,
            v_total_capacity,
            v_booked_capacity,
            v_available_capacity,
            format('متوفر: %s مكان من أصل %s', v_available_capacity, v_total_capacity);
    ELSE
        RETURN QUERY SELECT 
            FALSE,
            v_total_capacity,
            v_booked_capacity,
            v_available_capacity,
            format('غير كافي: متوفر %s فقط من %s مطلوب', v_available_capacity, p_guest_count);
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add is_active column to host_families if it doesn't exist
DO $$  
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'host_families' AND column_name = 'is_active') THEN
        ALTER TABLE public.host_families 
        ADD COLUMN is_active BOOLEAN DEFAULT TRUE;
        
        -- Set all existing families to active
        UPDATE public.host_families SET is_active = TRUE WHERE is_active IS NULL;
    END IF;
END $$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_available_families TO authenticated, anon;
GRANT EXECUTE ON FUNCTION check_concurrent_capacity TO authenticated, anon;

COMMENT ON FUNCTION get_available_families IS 'Returns families with remaining capacity, allowing concurrent bookings';
COMMENT ON FUNCTION check_concurrent_capacity IS 'Checks remaining capacity for a family at a specific date/time, enabling multiple simultaneous bookings';
