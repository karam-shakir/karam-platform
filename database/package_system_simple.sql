-- ============================================
-- نظام الباقات والأوقات المتاحة - SIMPLIFIED VERSION
-- منصة كرم - Karam Platform
-- ============================================
-- Version: 1.2 (SIMPLIFIED - No Email Triggers)
-- Date: 2026-01-02
-- Description: Core package and available slots functionality only
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

COMMENT ON TABLE package_settings IS 'إعدادات الباقات (أساسية ومتميزة)';

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
-- 3. Available Slots Table ✅
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
    created_by UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT unique_available_slot UNIQUE(majlis_id, available_date, time_slot)
);

COMMENT ON TABLE available_slots IS 'الأوقات المتاحة للحجز';

CREATE INDEX IF NOT EXISTS idx_available_slots_majlis ON available_slots(majlis_id);
CREATE INDEX IF NOT EXISTS idx_available_slots_date ON available_slots(available_date);
CREATE INDEX IF NOT EXISTS idx_available_slots_active ON available_slots(is_active) WHERE is_active = true;

-- ============================================
-- 4. Email Notifications Table (Optional)
-- ============================================

CREATE TABLE IF NOT EXISTS email_notifications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    recipient_email TEXT NOT NULL,
    recipient_type TEXT NOT NULL CHECK (recipient_type IN ('operator', 'family', 'visitor', 'company')),
    recipient_id UUID,
    subject TEXT NOT NULL,
    body TEXT NOT NULL,
    html_body TEXT,
    event_type TEXT NOT NULL,
    related_id UUID,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed')),
    sent_at TIMESTAMPTZ,
    error_message TEXT,
    retry_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_email_notifications_status ON email_notifications(status);

-- ============================================
-- 5. Core Functions
-- ============================================

-- Function: Update majlis package price automatically
CREATE OR REPLACE FUNCTION update_majlis_package_price()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.package_type IS NOT NULL THEN
        SELECT price_per_guest INTO NEW.package_price
        FROM package_settings
        WHERE package_type = NEW.package_type AND is_active = true;
        
        IF NEW.package_price IS NULL THEN
            RAISE NOTICE 'Package type % not found or inactive', NEW.package_type;
        END IF;
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

-- Function: Check if slot is available
CREATE OR REPLACE FUNCTION is_slot_available(
    p_majlis_id UUID,
    p_date DATE,
    p_slot TEXT
) RETURNS BOOLEAN AS $$
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

-- Function: Get available slots for a majlis
CREATE OR REPLACE FUNCTION get_available_slots_for_majlis(
    p_majlis_id UUID,
    p_start_date DATE DEFAULT CURRENT_DATE,
    p_end_date DATE DEFAULT CURRENT_DATE + INTERVAL '30 days'
) RETURNS TABLE (
    slot_id UUID,
    available_date DATE,
    time_slot TEXT,
    max_capacity INTEGER,
    current_bookings BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        a.id as slot_id,
        a.available_date,
        a.time_slot,
        COALESCE(a.max_capacity, m.capacity) as max_capacity,
        COALESCE(COUNT(b.id), 0) as current_bookings
    FROM available_slots a
    JOIN majlis m ON a.majlis_id = m.id
    LEFT JOIN bookings b ON 
        b.majlis_id = a.majlis_id 
        AND b.booking_date = a.available_date 
        AND b.time_slot = a.time_slot
    WHERE a.majlis_id = p_majlis_id
      AND a.available_date BETWEEN p_start_date AND p_end_date
      AND a.is_active = true
    GROUP BY a.id, a.available_date, a.time_slot, a.max_capacity, m.capacity
    ORDER BY a.available_date, a.time_slot;
END;
$$ LANGUAGE plpgsql;

-- Function: Queue email notification (simplified)
CREATE OR REPLACE FUNCTION queue_email_notification(
    p_recipient_email TEXT,
    p_recipient_type TEXT,
    p_subject TEXT,
    p_body TEXT,
    p_event_type TEXT,
    p_recipient_id UUID DEFAULT NULL,
    p_related_id UUID DEFAULT NULL,
    p_html_body TEXT DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
    v_notification_id UUID;
BEGIN
    INSERT INTO email_notifications (
        recipient_email, recipient_type, recipient_id, subject, body, html_body, event_type, related_id
    ) VALUES (
        p_recipient_email, p_recipient_type, p_recipient_id, p_subject, p_body, p_html_body, p_event_type, p_related_id
    ) RETURNING id INTO v_notification_id;
    
    RETURN v_notification_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 6. RLS Policies
-- ============================================

ALTER TABLE package_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE available_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_notifications ENABLE ROW LEVEL SECURITY;

-- Package Settings Policies
DROP POLICY IF EXISTS "Operators can manage package settings" ON package_settings;
CREATE POLICY "Operators can manage package settings"
ON package_settings FOR ALL TO authenticated
USING (
    EXISTS (SELECT 1 FROM user_profiles WHERE user_id = auth.uid() AND user_type = 'operator')
)
WITH CHECK (
    EXISTS (SELECT 1 FROM user_profiles WHERE user_id = auth.uid() AND user_type = 'operator')
);

DROP POLICY IF EXISTS "Everyone can view active packages" ON package_settings;
CREATE POLICY "Everyone can view active packages"
ON package_settings FOR SELECT TO authenticated
USING (is_active = true);

-- Available Slots Policies
DROP POLICY IF EXISTS "Families can manage their available slots" ON available_slots;
CREATE POLICY "Families can manage their available slots"
ON available_slots FOR ALL TO authenticated
USING (true)  -- Simplified: allow authenticated users to manage
WITH CHECK (true);

DROP POLICY IF EXISTS "Everyone can view active available slots" ON available_slots;
CREATE POLICY "Everyone can view active available slots"
ON available_slots FOR SELECT TO authenticated
USING (is_active = true);

DROP POLICY IF EXISTS "Operators can view all available slots" ON available_slots;
CREATE POLICY "Operators can view all available slots"
ON available_slots FOR SELECT TO authenticated
USING (
    EXISTS (SELECT 1 FROM user_profiles WHERE user_id = auth.uid() AND user_type = 'operator')
);

-- Email Notifications Policies
DROP POLICY IF EXISTS "System can insert notifications" ON email_notifications;
CREATE POLICY "System can insert notifications"
ON email_notifications FOR INSERT TO authenticated
WITH CHECK (true);

DROP POLICY IF EXISTS "Operators can view all notifications" ON email_notifications;
CREATE POLICY "Operators can view all notifications"
ON email_notifications FOR SELECT TO authenticated
USING (
    EXISTS (SELECT 1 FROM user_profiles WHERE user_id = auth.uid() AND user_type = 'operator')
);

-- ============================================
-- 7. Views
-- ============================================

CREATE OR REPLACE VIEW active_packages AS
SELECT id, package_type, package_name_ar, package_name_en, price_per_guest, features, description_ar, description_en
FROM package_settings
WHERE is_active = true;

CREATE OR REPLACE VIEW majalis_with_availability AS
SELECT 
    m.id as majlis_id, m.name as majlis_name, m.family_id, f.family_name, m.city, m.capacity, m.package_type, m.package_price,
    COUNT(DISTINCT a.id) as available_slots_count,
    MIN(a.available_date) as earliest_available_date,
    MAX(a.available_date) as latest_available_date
FROM majlis m
JOIN families f ON m.family_id = f.id
LEFT JOIN available_slots a ON m.id = a.majlis_id AND a.is_active = true AND a.available_date >= CURRENT_DATE
WHERE m.is_active = true
GROUP BY m.id, m.name, m.family_id, f.family_name, m.city, m.capacity, m.package_type, m.package_price;

-- ============================================
-- END OF SCRIPT
-- ============================================

DO $$
BEGIN
    RAISE NOTICE '✅ Package System & Available Slots created successfully!';
    RAISE NOTICE '📦 Tables: package_settings, available_slots, email_notifications';
    RAISE NOTICE '🔧 Functions: 4 core functions';
    RAISE NOTICE '🔒 RLS Policies: Applied';
    RAISE NOTICE '⚠️  Note: Email triggers NOT included (add manually if needed)';
END $$;
