-- ============================================
-- Booking System - Clean Installation
-- Drops everything first then recreates
-- ============================================

-- Drop everything first
DROP TABLE IF EXISTS majlis_availability CASCADE;
DROP TABLE IF EXISTS bookings CASCADE;
DROP INDEX IF EXISTS idx_bookings_user;
DROP INDEX IF EXISTS idx_bookings_majlis;
DROP INDEX IF EXISTS idx_bookings_date;
DROP INDEX IF EXISTS idx_bookings_status;
DROP INDEX IF EXISTS idx_availability_majlis;
DROP INDEX IF EXISTS idx_availability_date;
DROP FUNCTION IF EXISTS update_booking_timestamp CASCADE;

-- ============================================
-- 1. BOOKINGS TABLE
-- ============================================

CREATE TABLE bookings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    majlis_id UUID REFERENCES majlis(id) ON DELETE CASCADE,
    booking_date DATE NOT NULL,
    time_slot TEXT NOT NULL CHECK (time_slot IN ('morning', 'afternoon', 'evening')),
    guests_count INTEGER NOT NULL CHECK (guests_count > 0),
    total_price DECIMAL(10,2) NOT NULL CHECK (total_price > 0),
    booking_status TEXT DEFAULT 'pending' CHECK (booking_status IN ('pending', 'confirmed', 'cancelled', 'completed')),
    payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'failed', 'refunded')),
    payment_method TEXT CHECK (payment_method IN ('moyasar', 'wallet', 'cash')),
    transaction_id TEXT,
    customer_name TEXT,
    customer_phone TEXT,
    customer_email TEXT,
    notes TEXT,
    cancellation_reason TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    confirmed_at TIMESTAMPTZ,
    cancelled_at TIMESTAMPTZ,
    UNIQUE(majlis_id, booking_date, time_slot)
);

CREATE INDEX idx_bookings_user ON bookings(user_id);
CREATE INDEX idx_bookings_majlis ON bookings(majlis_id);
CREATE INDEX idx_bookings_date ON bookings(booking_date);
CREATE INDEX idx_bookings_status ON bookings(booking_status);

-- ============================================
-- 2. AVAILABILITY TABLE
-- ============================================

CREATE TABLE majlis_availability (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    majlis_id UUID REFERENCES majlis(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    time_slot TEXT NOT NULL CHECK (time_slot IN ('morning', 'afternoon', 'evening')),
    is_available BOOLEAN DEFAULT true,
    price_override DECIMAL(10,2),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(majlis_id, date, time_slot)
);

CREATE INDEX idx_availability_majlis ON majlis_availability(majlis_id);
CREATE INDEX idx_availability_date ON majlis_availability(date);

-- ============================================
-- 3. RLS
-- ============================================

ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE majlis_availability ENABLE ROW LEVEL SECURITY;

CREATE POLICY "bookings_all" ON bookings FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "availability_all" ON majlis_availability FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ============================================
-- 4. TRIGGER
-- ============================================

CREATE FUNCTION update_booking_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    IF NEW.booking_status = 'confirmed' AND (OLD.booking_status IS NULL OR OLD.booking_status != 'confirmed') THEN
        NEW.confirmed_at = NOW();
    END IF;
    IF NEW.booking_status = 'cancelled' AND (OLD.booking_status IS NULL OR OLD.booking_status != 'cancelled') THEN
        NEW.cancelled_at = NOW();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_booking_timestamp
    BEFORE UPDATE ON bookings
    FOR EACH ROW
    EXECUTE FUNCTION update_booking_timestamp();

-- ============================================
-- SUCCESS
-- ============================================

SELECT '✅ Booking system created!' as message;
