-- ============================================
-- نظام الباقات والأوقات المتاحة - FINAL CLEAN VERSION
-- منصة كرم - Karam Platform
-- ============================================
-- Version: 1.3 (FINAL - Clean Install)
-- ============================================

-- ============================================
-- 1. Package Settings Table
-- ============================================

CREATE TABLE IF NOT EXISTS package_settings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    package_type TEXT NOT NULL CHECK (package_type IN ('basic', 'premium')),
    package_name_ar TEXT NOT NULL,
    package_name_en TEXT NOT NULL,
    price_per_guest DECIMAL(10, 2) NOT NULL CHECK (price_per_guest >= 0),
    features JSONB NOT NULL DEFAULT '[]',
    description_ar TEXT,
    description_en TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT unique_package_type UNIQUE(package_type)
);

-- Insert default packages
INSERT INTO package_settings (
    package_type, package_name_ar, package_name_en, price_per_guest, features, description_ar, description_en
) VALUES
(
    'basic', 'الباقة الأساسية', 'Basic Package', 50.00,
    '["قهوة عربية", "تمر", "ماء"]'::jsonb,
    'باقة ضيافة تقليدية', 'Traditional hospitality package'
),
(
    'premium', 'الباقة المتميزة', 'Premium Package', 100.00,
    '["قهوة عربية فاخرة", "تمر فاخر", "عصائر طازجة", "حلويات", "فواكه موسمية"]'::jsonb,
    'باقة ضيافة فاخرة', 'Premium hospitality package'
)
ON CONFLICT (package_type) DO NOTHING;

-- ============================================
-- 2. Modify Majlis Table
-- ============================================

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'majlis' AND column_name = 'package_type'
    ) THEN
        ALTER TABLE majlis ADD COLUMN package_type TEXT CHECK (package_type IN ('basic', 'premium'));
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'majlis' AND column_name = 'package_price'
    ) THEN
        ALTER TABLE majlis ADD COLUMN package_price DECIMAL(10, 2);
    END IF;
END $$;

-- ============================================
-- 3. Available Slots Table
-- ============================================

DROP TABLE IF EXISTS hidden_availability CASCADE;

CREATE TABLE IF NOT EXISTS available_slots (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    majlis_id UUID NOT NULL REFERENCES majlis(id) ON DELETE CASCADE,
    available_date DATE NOT NULL,
    time_slot TEXT NOT NULL CHECK (time_slot IN ('morning', 'afternoon', 'evening', 'night')),
    is_active BOOLEAN DEFAULT true,
    max_capacity INTEGER,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT unique_available_slot UNIQUE(majlis_id, available_date, time_slot)
);

CREATE INDEX IF NOT EXISTS idx_available_slots_majlis ON available_slots(majlis_id);
CREATE INDEX IF NOT EXISTS idx_available_slots_date ON available_slots(available_date);
CREATE INDEX IF NOT EXISTS idx_available_slots_active ON available_slots(is_active) WHERE is_active = true;

-- ============================================
-- 4. Email Notifications Table
-- ============================================

CREATE TABLE IF NOT EXISTS email_notifications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    recipient_email TEXT NOT NULL,
    recipient_type TEXT NOT NULL,
    subject TEXT NOT NULL,
    body TEXT NOT NULL,
    html_body TEXT,
    event_type TEXT NOT NULL,
    related_id UUID,
    status TEXT DEFAULT 'pending',
    sent_at TIMESTAMPTZ,
    error_message TEXT,
    retry_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_email_notifications_status ON email_notifications(status);

-- ============================================
-- 5. Functions
-- ============================================

-- Update package price automatically
CREATE OR REPLACE FUNCTION update_majlis_package_price()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.package_type IS NOT NULL THEN
        SELECT price_per_guest INTO NEW.package_price
        FROM package_settings
        WHERE package_type = NEW.package_type AND is_active = true;
    ELSE
        NEW.package_price := NULL;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_majlis_package_price ON majlis;
CREATE TRIGGER trigger_update_majlis_package_price
BEFORE INSERT OR UPDATE OF package_type ON majlis
FOR EACH ROW
EXECUTE FUNCTION update_majlis_package_price();

-- Check if slot is available
CREATE OR REPLACE FUNCTION is_slot_available(p_majlis_id UUID, p_date DATE, p_slot TEXT)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM available_slots
        WHERE majlis_id = p_majlis_id
          AND available_date = p_date
          AND time_slot = p_slot
          AND is_active = true
    );
END;
$$ LANGUAGE plpgsql;

-- Get available slots
CREATE OR REPLACE FUNCTION get_available_slots_for_majlis(
    p_majlis_id UUID,
    p_start_date DATE DEFAULT CURRENT_DATE,
    p_end_date DATE DEFAULT CURRENT_DATE + INTERVAL '30 days'
)
RETURNS TABLE (slot_id UUID, available_date DATE, time_slot TEXT, max_capacity INTEGER, current_bookings BIGINT)
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        a.id, a.available_date, a.time_slot,
        COALESCE(a.max_capacity, m.capacity) as max_capacity,
        COALESCE(COUNT(b.id), 0) as current_bookings
    FROM available_slots a
    JOIN majlis m ON a.majlis_id = m.id
    LEFT JOIN bookings b ON b.majlis_id = a.majlis_id 
        AND b.booking_date = a.available_date 
        AND b.time_slot = a.time_slot
    WHERE a.majlis_id = p_majlis_id
      AND a.available_date BETWEEN p_start_date AND p_end_date
      AND a.is_active = true
    GROUP BY a.id, a.available_date, a.time_slot, a.max_capacity, m.capacity
    ORDER BY a.available_date, a.time_slot;
END;
$$ LANGUAGE plpgsql;

-- Queue email notification
CREATE OR REPLACE FUNCTION queue_email_notification(
    p_recipient_email TEXT, p_recipient_type TEXT, p_subject TEXT, p_body TEXT,
    p_event_type TEXT, p_recipient_id UUID DEFAULT NULL, p_related_id UUID DEFAULT NULL,
    p_html_body TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE v_id UUID;
BEGIN
    INSERT INTO email_notifications (recipient_email, recipient_type, subject, body, html_body, event_type, related_id)
    VALUES (p_recipient_email, p_recipient_type, p_subject, p_body, p_html_body, p_event_type, p_related_id)
    RETURNING id INTO v_id;
    RETURN v_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 6. RLS Policies - CLEAN SLATE
-- ============================================

-- Drop ALL existing policies first
DO $$ 
DECLARE r RECORD;
BEGIN
    FOR r IN (SELECT schemaname, tablename, policyname FROM pg_policies 
              WHERE tablename IN ('package_settings', 'available_slots', 'email_notifications'))
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', r.policyname, r.schemaname, r.tablename);
    END LOOP;
END $$;

-- Enable RLS
ALTER TABLE package_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE available_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_notifications ENABLE ROW LEVEL SECURITY;

-- Package Settings: View only
CREATE POLICY "allow_read_packages" ON package_settings FOR SELECT TO authenticated USING (is_active = true);
CREATE POLICY "allow_all_packages" ON package_settings FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Available Slots: Full access
CREATE POLICY "allow_read_slots" ON available_slots FOR SELECT TO authenticated USING (true);
CREATE POLICY "allow_insert_slots" ON available_slots FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "allow_update_slots" ON available_slots FOR UPDATE TO authenticated USING (true);
CREATE POLICY "allow_delete_slots" ON available_slots FOR DELETE TO authenticated USING (true);

-- Email Notifications: Insert only
CREATE POLICY "allow_insert_notifications" ON email_notifications FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "allow_read_notifications" ON email_notifications FOR SELECT TO authenticated USING (true);

-- ============================================
-- 7. Views
-- ============================================

CREATE OR REPLACE VIEW active_packages AS
SELECT id, package_type, package_name_ar, package_name_en, price_per_guest, features, description_ar, description_en
FROM package_settings WHERE is_active = true;

CREATE OR REPLACE VIEW majalis_with_availability AS
SELECT 
    m.id as majlis_id, 
    m.majlis_name, 
    m.family_id, 
    f.family_name,
    f.city,
    m.capacity, 
    m.package_type, 
    m.package_price,
    COUNT(DISTINCT a.id) as available_slots_count,
    MIN(a.available_date) as earliest_available_date,
    MAX(a.available_date) as latest_available_date
FROM majlis m
JOIN families f ON m.family_id = f.id
LEFT JOIN available_slots a ON m.id = a.majlis_id AND a.is_active = true AND a.available_date >= CURRENT_DATE
WHERE m.is_active = true
GROUP BY m.id, m.majlis_name, m.family_id, f.family_name, f.city, m.capacity, m.package_type, m.package_price;

-- ============================================
-- SUCCESS MESSAGE
-- ============================================

DO $$
BEGIN
    RAISE NOTICE '✅ Package System installed successfully!';
    RAISE NOTICE '📦 3 tables created/updated';
    RAISE NOTICE '🔧 4 functions created';
    RAISE NOTICE '🔒 RLS policies applied (open for authenticated users)';
    RAISE NOTICE '👉 You can now test operator-packages.html and family-majlis.html';
END $$;
