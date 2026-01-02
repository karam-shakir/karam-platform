-- ============================================
-- نظام الباقات والإشعارات - Package System & Notifications
-- CORRECTED VERSION: Available Slots (not Hidden Slots)
-- منصة كرم - Karam Platform
-- ============================================
-- Version: 1.1 (CORRECTED)
-- Date: 2026-01-02
-- Description: Database schema for package-based pricing system,
--              AVAILABLE SLOTS management (corrected logic), and email notifications
-- ============================================

-- ============================================
-- 1. Package Settings Table (إعدادات الباقات)
-- ============================================

CREATE TABLE IF NOT EXISTS package_settings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    package_type TEXT NOT NULL CHECK (package_type IN ('basic', 'premium')),
    package_name_ar TEXT NOT NULL,
    package_name_en TEXT NOT NULL,
    price_per_guest DECIMAL(10, 2) NOT NULL CHECK (price_per_guest >= 0),
    features JSONB NOT NULL DEFAULT '[]', -- مواصفات الباقة
    description_ar TEXT,
    description_en TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT unique_package_type UNIQUE(package_type)
);

COMMENT ON TABLE package_settings IS 'إعدادات الباقات (أساسية ومتميزة) يديرها المشغلون';
COMMENT ON COLUMN package_settings.package_type IS 'نوع الباقة: basic أو premium';
COMMENT ON COLUMN package_settings.features IS 'مواصفات الباقة بصيغة JSON array';
COMMENT ON COLUMN package_settings.price_per_guest IS 'سعر الباقة للضيف الواحد';

-- Insert default packages
INSERT INTO package_settings (
    package_type, 
    package_name_ar, 
    package_name_en,
    price_per_guest, 
    features,
    description_ar,
    description_en
) VALUES
(
    'basic',
    'الباقة الأساسية',
    'Basic Package',
    50.00,
    '["قهوة عربية", "تمر", "ماء"]'::jsonb,
    'باقة ضيافة تقليدية تشمل العناصر الأساسية',
    'Traditional hospitality package with essential items'
),
(
    'premium',
    'الباقة المتميزة',
    'Premium Package',
    100.00,
    '["قهوة عربية فاخرة", "تمر فاخر", "عصائر طازجة", "حلويات", "فواكه موسمية"]'::jsonb,
    'باقة ضيافة فاخرة تشمل مجموعة متنوعة من العناصر المميزة',
    'Premium hospitality package with a variety of exclusive items'
)
ON CONFLICT (package_type) DO NOTHING;

-- ============================================
-- 2. Modify Majlis Table (تعديل جدول المجالس)
-- ============================================

-- Add package-related columns if they don't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'majlis' AND column_name = 'package_type'
    ) THEN
        ALTER TABLE majlis
        ADD COLUMN package_type TEXT CHECK (package_type IN ('basic', 'premium'));
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'majlis' AND column_name = 'package_price'
    ) THEN
        ALTER TABLE majlis
        ADD COLUMN package_price DECIMAL(10, 2);
    END IF;
END $$;

COMMENT ON COLUMN majlis.package_type IS 'نوع الباقة التي تقدمها الأسرة';
COMMENT ON COLUMN majlis.package_price IS 'سعر الباقة (يتم ملؤه تلقائياً من package_settings)';

-- ============================================
-- 3. Available Slots Table (الأوقات المتاحة) ✅ CORRECTED
-- ============================================

-- Drop old table if exists
DROP TABLE IF EXISTS hidden_availability CASCADE;

CREATE TABLE IF NOT EXISTS available_slots (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    majlis_id UUID NOT NULL REFERENCES majlis(id) ON DELETE CASCADE,
    available_date DATE NOT NULL,
    time_slot TEXT NOT NULL CHECK (time_slot IN ('morning', 'afternoon', 'evening', 'night')),
    is_active BOOLEAN DEFAULT true,
    max_capacity INTEGER, -- سعة مخصصة لهذا الوقت (اختياري)
    notes TEXT,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT unique_available_slot UNIQUE(majlis_id, available_date, time_slot)
);

COMMENT ON TABLE available_slots IS 'الأوقات المتاحة - الأسرة تحدد متى تستطيع استقبال الضيوف';
COMMENT ON COLUMN available_slots.time_slot IS 'الفترة الزمنية: morning, afternoon, evening, night';
COMMENT ON COLUMN available_slots.is_active IS 'هل الوقت لا يزال متاحاً (يمكن تعطيله مؤقتاً)';
COMMENT ON COLUMN available_slots.max_capacity IS 'السعة القصوى لهذا الوقت (إذا كانت مختلفة عن سعة المجلس الافتراضية)';

CREATE INDEX IF NOT EXISTS idx_available_slots_majlis ON available_slots(majlis_id);
CREATE INDEX IF NOT EXISTS idx_available_slots_date ON available_slots(available_date);
CREATE INDEX IF NOT EXISTS idx_available_slots_active ON available_slots(is_active) WHERE is_active = true;

-- ============================================
-- 4. Email Notifications Table (الإشعارات البريدية)
-- ============================================

CREATE TABLE IF NOT EXISTS email_notifications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    recipient_email TEXT NOT NULL,
    recipient_type TEXT NOT NULL CHECK (recipient_type IN ('operator', 'family', 'visitor', 'company')),
    recipient_id UUID, -- user_id of the recipient
    subject TEXT NOT NULL,
    body TEXT NOT NULL,
    html_body TEXT, -- HTML version of the email
    event_type TEXT NOT NULL, -- 'family_registered', 'booking_created', 'slots_added', etc.
    related_id UUID, -- booking_id, family_id, majlis_id, etc.
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed')),
    sent_at TIMESTAMPTZ,
    error_message TEXT,
    retry_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE email_notifications IS 'قائمة الإشعارات البريدية المرسلة والمعلقة';
COMMENT ON COLUMN email_notifications.event_type IS 'نوع الحدث الذي أدى لإرسال الإشعار';
COMMENT ON COLUMN email_notifications.status IS 'حالة الإرسال: pending, sent, failed';

CREATE INDEX IF NOT EXISTS idx_email_notifications_status ON email_notifications(status);
CREATE INDEX IF NOT EXISTS idx_email_notifications_created ON email_notifications(created_at);
CREATE INDEX IF NOT EXISTS idx_email_notifications_recipient ON email_notifications(recipient_id);

-- ============================================
-- 5. Functions (الدوال)
-- ============================================

-- Function: Update majlis package price automatically
CREATE OR REPLACE FUNCTION update_majlis_package_price()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.package_type IS NOT NULL THEN
        SELECT price_per_guest INTO NEW.package_price
        FROM package_settings
        WHERE package_type = NEW.package_type 
          AND is_active = true;
        
        IF NEW.package_price IS NULL THEN
            RAISE NOTICE 'Package type % not found or inactive', NEW.package_type;
        END IF;
    ELSE
        NEW.package_price := NULL;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION update_majlis_package_price IS 'يحدث سعر المجلس تلقائياً بناءً على نوع الباقة المختارة';

DROP TRIGGER IF EXISTS trigger_update_majlis_package_price ON majlis;

CREATE TRIGGER trigger_update_majlis_package_price
BEFORE INSERT OR UPDATE OF package_type ON majlis
FOR EACH ROW
EXECUTE FUNCTION update_majlis_package_price();

-- ============================================
-- Function: Check if slot is available for booking ✅ CORRECTED
-- التحقق من توفر الوقت للحجز
CREATE OR REPLACE FUNCTION is_slot_available(
    p_majlis_id UUID,
    p_date DATE,
    p_slot TEXT
) RETURNS BOOLEAN AS $$
DECLARE
    v_slot_exists BOOLEAN;
    v_is_active BOOLEAN;
BEGIN
    -- Check if the slot exists and is active
    SELECT EXISTS (
        SELECT 1 FROM available_slots
        WHERE majlis_id = p_majlis_id
          AND available_date = p_date
          AND time_slot = p_slot
          AND is_active = true
    ) INTO v_slot_exists;
    
    RETURN v_slot_exists;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION is_slot_available IS 'يتحقق من وجود وقت متاح للحجز';

-- ============================================
-- Function: Get available slots for a majlis
-- الحصول على جميع الأوقات المتاحة لمجلس معين
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
        COUNT(b.id) as current_bookings
    FROM available_slots a
    JOIN majlis m ON a.majlis_id = m.id
    LEFT JOIN bookings b ON 
        b.majlis_id = a.majlis_id 
        AND b.booking_date = a.available_date 
        AND b.time_slot = a.time_slot
        AND b.status NOT IN ('cancelled', 'rejected', 'failed')
    WHERE a.majlis_id = p_majlis_id
      AND a.available_date BETWEEN p_start_date AND p_end_date
      AND a.is_active = true
    GROUP BY a.id, a.available_date, a.time_slot, a.max_capacity, m.capacity
    ORDER BY a.available_date, a.time_slot;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_available_slots_for_majlis IS 'يسترجع جميع الأوقات المتاحة لمجلس مع عدد الحجوزات الحالية';

-- ============================================
-- Function: Queue email notification
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
        recipient_email, 
        recipient_type, 
        recipient_id,
        subject, 
        body,
        html_body,
        event_type, 
        related_id
    ) VALUES (
        p_recipient_email, 
        p_recipient_type,
        p_recipient_id,
        p_subject, 
        p_body,
        p_html_body,
        p_event_type, 
        p_related_id
    ) RETURNING id INTO v_notification_id;
    
    RETURN v_notification_id;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION queue_email_notification IS 'إضافة إشعار بريدي جديد إلى قائمة الانتظار';

-- ============================================
-- Function: Notify operators about new family
CREATE OR REPLACE FUNCTION notify_operators_new_family()
RETURNS TRIGGER AS $$
DECLARE
    v_operator_email TEXT;
    v_family_name TEXT;
BEGIN
    SELECT family_name INTO v_family_name
    FROM families
    WHERE id = NEW.id;
    
    FOR v_operator_email IN 
        SELECT email FROM auth.users
        WHERE id IN (
            SELECT user_id FROM user_profiles WHERE user_type = 'operator'
        )
    LOOP
        PERFORM queue_email_notification(
            v_operator_email,
            'operator',
            '🆕 أسرة جديدة تنتظر الموافقة - منصة كرم',
            format('مرحباً،

تم تسجيل أسرة جديدة في منصة كرم:

الأسرة: %s
المدينة: %s

يرجى مراجعة البيانات والموافقة أو الرفض من لوحة التحكم.

--
منصة كرم
https://karam-haji.com', 
                v_family_name, 
                COALESCE(NEW.city, 'غير محدد')
            ),
            'family_registered',
            NULL,
            NEW.id
        );
    END LOOP;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_notify_operators_new_family ON families;

-- Note: WHEN clause removed for compatibility - function will check status internally if needed
CREATE TRIGGER trigger_notify_operators_new_family
AFTER INSERT ON families
FOR EACH ROW
EXECUTE FUNCTION notify_operators_new_family();

-- ============================================
-- Function: Notify family about status change
CREATE OR REPLACE FUNCTION notify_family_status_change()
RETURNS TRIGGER AS $$
DECLARE
    v_family_email TEXT;
    v_user_id UUID;
    v_subject TEXT;
    v_body TEXT;
    v_has_status BOOLEAN;
BEGIN
    -- Check if status columns exist (for compatibility)
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'families' 
        AND column_name = 'status'
    ) INTO v_has_status;
    
    -- Only proceed if status column exists
    IF NOT v_has_status THEN
        RETURN NEW;
    END IF;
    
    -- Get user_id - try different possible column names
    BEGIN
        v_user_id := NEW.user_id;
    EXCEPTION
        WHEN undefined_column THEN
            -- Try alternative column name if exists
            RETURN NEW;
    END;
    
    -- Get family email
    SELECT email INTO v_family_email
    FROM auth.users
    WHERE id = v_user_id;
    
    IF v_family_email IS NULL THEN
        RETURN NEW;
    END IF;
    
    -- Check if status changed (using dynamic approach)
    IF (NEW.status IS DISTINCT FROM OLD.status) THEN
        IF NEW.status = 'approved' AND OLD.status = 'pending' THEN
            v_subject := '✅ مبروك! تم قبول تسجيلكم في منصة كرم';
            v_body := format('مرحباً %s،

يسعدنا إبلاغكم بأنه تم قبول تسجيلكم في منصة كرم!

يمكنكم الآن:
- إضافة مجالسكم
- تحديد الأوقات المتاحة
- استقبال الحجوزات

تسجيل الدخول: https://karam-haji.com/login.html

نتمنى لكم تجربة موفقة.

--
منصة كرم', 
                NEW.family_name
            );
            
            PERFORM queue_email_notification(
                v_family_email,
                'family',
                v_subject,
                v_body,
                'family_approved',
                v_user_id,
                NEW.id
            );
        
        ELSIF NEW.status = 'rejected' AND OLD.status = 'pending' THEN
            v_subject := '❌ بخصوص تسجيلكم في منصة كرم';
            v_body := format('مرحباً %s،

نأسف لإبلاغكم بأنه لم يتم قبول تسجيلكم في منصة كرم في الوقت الحالي.

السبب: %s

يمكنكم التواصل معنا للمزيد من التوضيحات.

--
منصة كرم', 
                NEW.family_name,
                COALESCE(NEW.rejection_reason, 'لم يتم تحديد سبب')
            );
            
            PERFORM queue_email_notification(
                v_family_email,
                'family',
                v_subject,
                v_body,
                'family_rejected',
                v_user_id,
                NEW.id
            );
        END IF;
    END IF;
    
    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        -- Silently ignore errors for compatibility
        RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_notify_family_status_change ON families;

-- Note: Will only fire when status-like columns change
CREATE TRIGGER trigger_notify_family_status_change
AFTER UPDATE ON families
FOR EACH ROW
EXECUTE FUNCTION notify_family_status_change();

-- ============================================
-- Function: Notify about new booking
CREATE OR REPLACE FUNCTION notify_new_booking()
RETURNS TRIGGER AS $$
DECLARE
    v_family_email TEXT;
    v_family_name TEXT;
    v_majlis_name TEXT;
    v_package_name TEXT;
BEGIN
    SELECT 
        u.email,
        f.family_name,
        m.name,
        CASE 
            WHEN m.package_type = 'basic' THEN 'الباقة الأساسية'
            WHEN m.package_type = 'premium' THEN 'الباقة المتميزة'
            ELSE 'غير محدد'
        END
    INTO v_family_email, v_family_name, v_majlis_name, v_package_name
    FROM majlis m
    JOIN families f ON m.family_id = f.id
    JOIN auth.users u ON f.user_id = u.id
    WHERE m.id = NEW.majlis_id;
    
    IF v_family_email IS NOT NULL THEN
        PERFORM queue_email_notification(
            v_family_email,
            'family',
            '🎉 حجز جديد على مجلسكم! - منصة كرم',
            format('مرحباً %s،

لديكم حجز جديد على مجلسكم:

رقم الحجز: %s
المجلس: %s
التاريخ: %s
الوقت: %s
عدد الضيوف: %s
الباقة: %s

عرض التفاصيل: https://karam-haji.com/family-bookings.html

--
منصة كرم', 
                v_family_name,
                NEW.booking_number,
                v_majlis_name,
                NEW.booking_date::TEXT,
                NEW.time_slot,
                NEW.number_of_guests,
                v_package_name
            ),
            'booking_created',
            NULL,
            NEW.id
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_notify_new_booking ON bookings;

-- Note: WHEN clause removed for compatibility - function handles all bookings
CREATE TRIGGER trigger_notify_new_booking
AFTER INSERT ON bookings
FOR EACH ROW
EXECUTE FUNCTION notify_new_booking();

-- ============================================
-- 6. RLS Policies (سياسات الأمان)
-- ============================================

ALTER TABLE package_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE available_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_notifications ENABLE ROW LEVEL SECURITY;

-- Package Settings Policies
CREATE POLICY "Operators can manage package settings"
ON package_settings
FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM user_profiles
        WHERE user_id = auth.uid() AND user_type = 'operator'
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM user_profiles
        WHERE user_id = auth.uid() AND user_type = 'operator'
    )
);

CREATE POLICY "Everyone can view active packages"
ON package_settings
FOR SELECT
TO authenticated
USING (is_active = true);

-- Available Slots Policies ✅ CORRECTED
CREATE POLICY "Families can manage their available slots"
ON available_slots
FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM majlis m
        JOIN families f ON m.family_id = f.id
        WHERE m.id = available_slots.majlis_id
          AND f.user_id = auth.uid()
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM majlis m
        JOIN families f ON m.family_id = f.id
        WHERE m.id = available_slots.majlis_id
          AND f.user_id = auth.uid()
    )
);

CREATE POLICY "Everyone can view active available slots"
ON available_slots
FOR SELECT
TO authenticated
USING (is_active = true);

CREATE POLICY "Operators can view all available slots"
ON available_slots
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM user_profiles
        WHERE user_id = auth.uid() AND user_type = 'operator'
    )
);

-- Email Notifications Policies
CREATE POLICY "Operators can view all notifications"
ON email_notifications
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM user_profiles
        WHERE user_id = auth.uid() AND user_type = 'operator'
    )
);

CREATE POLICY "Users can view their own notifications"
ON email_notifications
FOR SELECT
TO authenticated
USING (recipient_id = auth.uid());

CREATE POLICY "System can insert notifications"
ON email_notifications
FOR INSERT
TO authenticated
WITH CHECK (true);

-- ============================================
-- 7. Views (العروض)
-- ============================================

CREATE OR REPLACE VIEW active_packages AS
SELECT 
    id,
    package_type,
    package_name_ar,
    package_name_en,
    price_per_guest,
    features,
    description_ar,
    description_en
FROM package_settings
WHERE is_active = true;

COMMENT ON VIEW active_packages IS 'الباقات النشطة المتاحة للاختيار';

CREATE OR REPLACE VIEW pending_email_notifications AS
SELECT 
    id,
    recipient_email,
    recipient_type,
    subject,
    event_type,
    retry_count,
    created_at
FROM email_notifications
WHERE status = 'pending'
ORDER BY created_at ASC;

COMMENT ON VIEW pending_email_notifications IS 'الإشعارات البريدية المعلقة والجاهزة للإرسال';

-- ✅ NEW VIEW: Available majalis with their slots
CREATE OR REPLACE VIEW majalis_with_availability AS
SELECT 
    m.id as majlis_id,
    m.name as majlis_name,
    m.family_id,
    f.family_name,
    m.city,
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
GROUP BY m.id, m.name, m.family_id, f.family_name, m.city, m.capacity, m.package_type, m.package_price;

COMMENT ON VIEW majalis_with_availability IS 'المجالس مع معلومات التوفر الخاصة بها';

-- ============================================
-- 8. Sample Queries (استعلامات تجريبية)
-- ============================================

-- Get all active packages
-- SELECT * FROM active_packages;

-- Get available slots for a majlis
-- SELECT * FROM get_available_slots_for_majlis('majlis-uuid');

-- Check if a specific slot is available
-- SELECT is_slot_available('majlis-uuid', '2026-01-15', 'morning');

-- Get all majalis with their availability counts
-- SELECT * FROM majalis_with_availability WHERE available_slots_count > 0;

-- ============================================
-- END OF SCRIPT
-- ============================================

DO $$
BEGIN
    RAISE NOTICE '✅ Package System & Notifications schema created successfully! (CORRECTED VERSION)';
    RAISE NOTICE '📦 Tables created: package_settings, available_slots (CORRECTED), email_notifications';
    RAISE NOTICE '🔧 Functions created: 7 functions including availability check';
    RAISE NOTICE '🔒 RLS Policies: Applied security policies';
    RAISE NOTICE '📊 Views created: active_packages, pending_email_notifications, majalis_with_availability';
    RAISE NOTICE '';
    RAISE NOTICE '✅ CORRECTION: Changed from hidden_availability to available_slots';
    RAISE NOTICE '   Logic: Families now SELECT available times (not hide unavailable times)';
END $$;
