-- ===================================
-- Family Availability System
-- Add time-slot based availability for families
-- ===================================

-- Create family_availability table
CREATE TABLE IF NOT EXISTS public.family_availability (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    family_id UUID REFERENCES public.host_families(id) ON DELETE CASCADE NOT NULL,
    date DATE NOT NULL,
    time_slot VARCHAR(20) NOT NULL CHECK (time_slot IN ('morning', 'afternoon', 'evening', 'night')),
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    capacity INTEGER NOT NULL DEFAULT 10 CHECK (capacity > 0),
    available BOOLEAN DEFAULT true,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Prevent duplicate entries for same family, date, and time slot
    UNIQUE(family_id, date, time_slot)
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_family_availability_lookup 
ON public.family_availability(family_id, date, available);

CREATE INDEX IF NOT EXISTS idx_family_availability_date 
ON public.family_availability(date, available);

-- Add updated_at trigger
DROP TRIGGER IF EXISTS update_family_availability_updated_at ON public.family_availability;
CREATE TRIGGER update_family_availability_updated_at
    BEFORE UPDATE ON public.family_availability
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ===================================
-- Row Level Security (RLS)
-- ===================================

ALTER TABLE public.family_availability ENABLE ROW LEVEL SECURITY;

-- Policy: Families can manage their own availability
CREATE POLICY family_availability_family_all ON public.family_availability
    FOR ALL
    USING (
        family_id IN (
            SELECT id FROM public.host_families 
            WHERE user_id = auth.uid()
        )
    );

-- Policy: Anyone can view available slots
CREATE POLICY family_availability_public_read ON public.family_availability
    FOR SELECT
    USING (available = true AND date >= CURRENT_DATE);

-- Policy: Admins can view all
CREATE POLICY family_availability_admin_all ON public.family_availability
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.user_profiles
            WHERE id = auth.uid() AND user_type = 'admin'
        )
    );

-- ===================================
-- Helper Functions
-- ===================================

-- Function: Get available families for a specific date and time
CREATE OR REPLACE FUNCTION get_available_families(
    p_date DATE,
    p_time_slot VARCHAR(20),
    p_guest_count INTEGER DEFAULT 1
)
RETURNS TABLE (
    family_id UUID,
    family_name TEXT,
    city VARCHAR(50),
    available_capacity INTEGER,
    total_capacity INTEGER
) AS $$
BEGIN
    RETURN QUERY
    WITH family_bookings AS (
        -- Count existing bookings for this date/time
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
        GREATEST(0, COALESCE(fa.capacity, hf.capacity) - COALESCE(fb.booked_guests, 0))::INTEGER as available_capacity,
        COALESCE(fa.capacity, hf.capacity) as total_capacity
    FROM public.host_families hf
    LEFT JOIN public.family_availability fa 
        ON fa.family_id = hf.id 
        AND fa.date = p_date 
        AND fa.time_slot = p_time_slot
        AND fa.available = true
    LEFT JOIN family_bookings fb 
        ON fb.family_id = hf.id
    WHERE hf.status = 'approved'
      -- Either has specific availability OR uses default capacity
      AND (
          (fa.id IS NOT NULL AND fa.available = true) 
          OR 
          (fa.id IS NULL AND hf.capacity > 0)
      )
      -- Has enough capacity
      AND (COALESCE(fa.capacity, hf.capacity) - COALESCE(fb.booked_guests, 0)) >= p_guest_count
    ORDER BY available_capacity DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Check if a family is available
CREATE OR REPLACE FUNCTION check_family_availability(
    p_family_id UUID,
    p_date DATE,
    p_time_slot VARCHAR(20),
    p_guest_count INTEGER DEFAULT 1
)
RETURNS BOOLEAN AS $$
DECLARE
    v_capacity INTEGER;
    v_booked INTEGER;
BEGIN
    -- Get capacity for this specific date/time or use default
    SELECT COALESCE(fa.capacity, hf.capacity)
    INTO v_capacity
    FROM public.host_families hf
    LEFT JOIN public.family_availability fa 
        ON fa.family_id = hf.id 
        AND fa.date = p_date 
        AND fa.time_slot = p_time_slot
    WHERE hf.id = p_family_id;
    
    -- Get number of guests already booked
    SELECT COALESCE(SUM(number_of_guests), 0)
    INTO v_booked
    FROM public.bookings
    WHERE family_id = p_family_id
      AND booking_date = p_date
      AND time_slot = p_time_slot
      AND status IN ('pending', 'confirmed');
    
    -- Return true if there's enough capacity
    RETURN (v_capacity - v_booked) >= p_guest_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Set weekly recurring availability
CREATE OR REPLACE FUNCTION set_weekly_availability(
    p_family_id UUID,
    p_day_of_week INTEGER, -- 0=Sunday, 6=Saturday
    p_time_slots TEXT[], -- Array of time slots
    p_capacity INTEGER,
    p_weeks_ahead INTEGER DEFAULT 12
)
RETURNS INTEGER AS $$
DECLARE
    v_date DATE;
    v_slot TEXT;
    v_count INTEGER := 0;
    v_start_time TIME;
    v_end_time TIME;
BEGIN
    -- Loop through weeks
    FOR i IN 0..p_weeks_ahead LOOP
        -- Calculate the date for this day of week
        v_date := CURRENT_DATE + (i * 7 + p_day_of_week - EXTRACT(DOW FROM CURRENT_DATE))::INTEGER;
        
        -- Skip if date is in the past
        IF v_date >= CURRENT_DATE THEN
            -- Loop through time slots
            FOREACH v_slot IN ARRAY p_time_slots LOOP
                -- Determine start and end times
                CASE v_slot
                    WHEN 'morning' THEN
                        v_start_time := '08:00';
                        v_end_time := '12:00';
                    WHEN 'afternoon' THEN
                        v_start_time := '12:00';
                        v_end_time := '16:00';
                    WHEN 'evening' THEN
                        v_start_time := '16:00';
                        v_end_time := '20:00';
                    WHEN 'night' THEN
                        v_start_time := '20:00';
                        v_end_time := '00:00';
                END CASE;
                
                -- Insert or update availability
                INSERT INTO public.family_availability (
                    family_id, date, time_slot, start_time, end_time, capacity, available
                )
                VALUES (
                    p_family_id, v_date, v_slot, v_start_time, v_end_time, p_capacity, true
                )
                ON CONFLICT (family_id, date, time_slot)
                DO UPDATE SET
                    capacity = EXCLUDED.capacity,
                    available = EXCLUDED.available,
                    updated_at = NOW();
                
                v_count := v_count + 1;
            END LOOP;
        END IF;
    END LOOP;
    
    RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ===================================
-- Sample Data (Optional - for testing)
-- ===================================

-- Add sample availability (uncomment to use)
/*
INSERT INTO public.family_availability (family_id, date, time_slot, start_time, end_time, capacity)
SELECT 
    hf.id,
    CURRENT_DATE + i,
    'morning',
    '08:00',
    '12:00',
    15
FROM public.host_families hf
CROSS JOIN generate_series(0, 30) as i
WHERE hf.status = 'approved'
LIMIT 10;
*/

-- Grant permissions
GRANT SELECT ON public.family_availability TO anon, authenticated;
GRANT ALL ON public.family_availability TO authenticated;

-- Comments
COMMENT ON TABLE public.family_availability IS 'Stores time-slot based availability for host families';
COMMENT ON FUNCTION get_available_families IS 'Returns families with available capacity for a specific date and time';
COMMENT ON FUNCTION check_family_availability IS 'Checks if a specific family has availability';
COMMENT ON FUNCTION set_weekly_availability IS 'Sets recurring weekly availability for a family';
