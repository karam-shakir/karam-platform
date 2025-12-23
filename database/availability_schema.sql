-- ===================================
-- نظام التوفر والحجوزات المتقدم
-- إضافة لـ Karam Platform Database
-- ===================================

-- ===================================
-- 1. Family Availability - توفر الأسر
-- ===================================

CREATE TABLE IF NOT EXISTS public.family_availability (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    family_id UUID REFERENCES public.host_families ON DELETE CASCADE NOT NULL,
    
    -- يمكن تحديد يوم الأسبوع أو تاريخ محدد
    day_of_week INTEGER CHECK (day_of_week BETWEEN 0 AND 6), -- 0 = Sunday, 6 = Saturday
    specific_date DATE, -- للأيام المحددة (تجاوز day_of_week)
    
    -- الوقت
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    
    -- السعة
    max_capacity INTEGER DEFAULT 10 CHECK (max_capacity > 0),
    
    -- الحالة
    is_available BOOLEAN DEFAULT true,
    notes TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- منع التضارب
    CONSTRAINT no_overlap_check CHECK (start_time < end_time),
    CONSTRAINT one_type_only CHECK (
        (day_of_week IS NOT NULL AND specific_date IS NULL) OR 
        (day_of_week IS NULL AND specific_date IS NOT NULL)
    )
);

-- Indexes
CREATE INDEX idx_family_availability_family ON public.family_availability(family_id);
CREATE INDEX idx_family_availability_dow ON public.family_availability(day_of_week);
CREATE INDEX idx_family_availability_date ON public.family_availability(specific_date);

-- ===================================
-- 2. Booking Time Slots - فترات الحجز التفصيلية
-- ===================================

CREATE TABLE IF NOT EXISTS public.booking_time_slots (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    booking_id UUID REFERENCES public.bookings ON DELETE CASCADE NOT NULL,
    
    -- التاريخ والوقت
    booking_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    
    -- عدد الضيوف
    guest_count INTEGER NOT NULL CHECK (guest_count > 0),
    
    -- الحالة
    status VARCHAR(20) DEFAULT 'confirmed' CHECK (status IN ('confirmed', 'cancelled', 'completed')),
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_booking_slots_booking ON public.booking_time_slots(booking_id);
CREATE INDEX idx_booking_slots_date ON public.booking_time_slots(booking_date);

-- ===================================
-- 3. Family Earnings - أرباح الأسر
-- ===================================

CREATE TABLE IF NOT EXISTS public.family_earnings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    family_id UUID REFERENCES public.host_families ON DELETE CASCADE NOT NULL,
    booking_id UUID REFERENCES public.bookings ON DELETE CASCADE NOT NULL,
    
    -- المبالغ
    total_amount DECIMAL(10,2) NOT NULL CHECK (total_amount >= 0),
    platform_commission DECIMAL(10,2) DEFAULT 0 CHECK (platform_commission >= 0),
    net_amount DECIMAL(10,2) NOT NULL CHECK (net_amount >= 0),
    
    -- الحالة
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'paid', 'cancelled')),
    
    -- الدفع
    paid_at TIMESTAMPTZ,
    payment_method VARCHAR(50),
    transaction_reference TEXT,
    
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_family_earnings_family ON public.family_earnings(family_id);
CREATE INDEX idx_family_earnings_status ON public.family_earnings(status);
CREATE INDEX idx_family_earnings_date ON public.family_earnings(created_at);

-- ===================================
-- 4. Dynamic Pricing - التسعير الديناميكي
-- ===================================

CREATE TABLE IF NOT EXISTS public.dynamic_pricing (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    package_id UUID REFERENCES public.packages ON DELETE CASCADE NOT NULL,
    
    -- نوع القاعدة
    rule_type VARCHAR(50) NOT NULL CHECK (rule_type IN ('weekend', 'holiday', 'peak_hours', 'last_minute', 'early_bird')),
    
    -- التعديل على السعر
    adjustment_type VARCHAR(20) NOT NULL CHECK (adjustment_type IN ('percentage', 'fixed')),
    adjustment_value DECIMAL(10,2) NOT NULL,
    
    -- الشروط
    conditions JSONB DEFAULT '{}',
    
    -- التواريخ
    valid_from DATE,
    valid_until DATE,
    
    -- الأيام والأوقات
    apply_on_days INTEGER[], -- [0,6] for weekend
    apply_time_start TIME,
    apply_time_end TIME,
    
    is_active BOOLEAN DEFAULT true,
    priority INTEGER DEFAULT 0, -- للترتيب عند التطبيق
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_dynamic_pricing_package ON public.dynamic_pricing(package_id);
CREATE INDEX idx_dynamic_pricing_active ON public.dynamic_pricing(is_active);

-- ===================================
-- 5. Platform Settings - إعدادات المنصة
-- ===================================

CREATE TABLE IF NOT EXISTS public.platform_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    setting_key VARCHAR(100) UNIQUE NOT NULL,
    setting_value JSONB NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- إدراج الإعدادات الافتراضية
INSERT INTO public.platform_settings (setting_key, setting_value, description) VALUES
('commission_rate', '{"percentage": 15}', 'نسبة عمولة المنصة من كل حجز'),
('booking_advance_days', '{"min": 1, "max": 90}', 'الحد الأدنى والأقصى للحجز المسبق (بالأيام)'),
('cancellation_policy', '{"hours_before": 24, "refund_percentage": 80}', 'سياسة الإلغاء'),
('time_slots', '{"morning": "08:00-12:00", "afternoon": "12:00-16:00", "evening": "16:00-20:00", "night": "20:00-00:00"}', 'الفترات الزمنية المتاحة')
ON CONFLICT (setting_key) DO NOTHING;

-- ===================================
-- TRIGGERS
-- ===================================

-- Auto-update timestamps
CREATE TRIGGER update_family_availability_timestamp 
    BEFORE UPDATE ON public.family_availability 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_family_earnings_timestamp 
    BEFORE UPDATE ON public.family_earnings 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_dynamic_pricing_timestamp 
    BEFORE UPDATE ON public.dynamic_pricing 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_platform_settings_timestamp 
    BEFORE UPDATE ON public.platform_settings 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ===================================
-- FUNCTIONS
-- ===================================

-- دالة للحصول على الأسر المتاحة في تاريخ ووقت محدد
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
    rating DECIMAL(3,2)
) AS $$
BEGIN
    RETURN QUERY
    SELECT DISTINCT
        hf.id,
        hf.family_name,
        hf.city,
        fa.max_capacity,
        hf.rating
    FROM public.host_families hf
    INNER JOIN public.family_availability fa ON hf.id = fa.family_id
    WHERE 
        -- الأسرة نشطة ومعتمدة
        hf.status = 'approved'
        AND hf.is_featured = true
        
        -- التوفر متاح
        AND fa.is_available = true
        
        -- التحقق من اليوم
        AND (
            (fa.specific_date = p_date) OR
            (fa.day_of_week = EXTRACT(DOW FROM p_date) AND fa.specific_date IS NULL)
        )
        
        -- التحقق من الوقت
        AND fa.start_time <= p_start_time
        AND fa.end_time >= p_end_time
        
        -- التحقق من السعة
        AND fa.max_capacity >= p_guest_count
        
        -- التحقق من عدم وجود حجز متضارب
        AND NOT EXISTS (
            SELECT 1 FROM public.bookings b
            INNER JOIN public.booking_time_slots bts ON b.id = bts.booking_id
            WHERE 
                b.family_id = hf.id
                AND bts.booking_date = p_date
                AND bts.status != 'cancelled'
                AND (
                    (bts.start_time <= p_start_time AND bts.end_time > p_start_time) OR
                    (bts.start_time < p_end_time AND bts.end_time >= p_end_time) OR
                    (bts.start_time >= p_start_time AND bts.end_time <= p_end_time)
                )
        )
    ORDER BY hf.rating DESC, hf.total_bookings DESC;
END;
$$ LANGUAGE plpgsql;

-- دالة لحساب السعر الديناميكي
CREATE OR REPLACE FUNCTION calculate_dynamic_price(
    p_package_id UUID,
    p_date DATE,
    p_time TIME
)
RETURNS DECIMAL(10,2) AS $$
DECLARE
    base_price DECIMAL(10,2);
    final_price DECIMAL(10,2);
    pricing_rule RECORD;
BEGIN
    -- الحصول على السعر الأساسي
    SELECT price INTO base_price
    FROM public.packages
    WHERE id = p_package_id;
    
    IF base_price IS NULL THEN
        RETURN 0;
    END IF;
    
    final_price := base_price;
    
    -- تطبيق قواعد التسعير الديناميكي
    FOR pricing_rule IN 
        SELECT * FROM public.dynamic_pricing
        WHERE package_id = p_package_id
        AND is_active = true
        AND (valid_from IS NULL OR valid_from <= p_date)
        AND (valid_until IS NULL OR valid_until >= p_date)
        AND (
            apply_on_days IS NULL OR 
            EXTRACT(DOW FROM p_date)::INTEGER = ANY(apply_on_days)
        )
        AND (
            apply_time_start IS NULL OR 
            (apply_time_start <= p_time AND apply_time_end >= p_time)
        )
        ORDER BY priority DESC
    LOOP
        IF pricing_rule.adjustment_type = 'percentage' THEN
            final_price := final_price * (1 + pricing_rule.adjustment_value / 100);
        ELSE
            final_price := final_price + pricing_rule.adjustment_value;
        END IF;
    END LOOP;
    
    RETURN ROUND(final_price, 2);
END;
$$ LANGUAGE plpgsql;

-- ===================================
-- ROW LEVEL SECURITY
-- ===================================

ALTER TABLE public.family_availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.booking_time_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.family_earnings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dynamic_pricing ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;

-- Family Availability Policies
CREATE POLICY "Families can manage own availability" 
    ON public.family_availability FOR ALL 
    USING (
        EXISTS (
            SELECT 1 FROM public.host_families 
            WHERE id = family_availability.family_id 
            AND user_id = auth.uid()
        )
    );

CREATE POLICY "Anyone can view approved family availability" 
    ON public.family_availability FOR SELECT 
    USING (
        EXISTS (
            SELECT 1 FROM public.host_families 
            WHERE id = family_availability.family_id 
            AND status = 'approved'
        )
    );

-- Booking Time Slots Policies
CREATE POLICY "Users can view own booking slots" 
    ON public.booking_time_slots FOR SELECT 
    USING (
        EXISTS (
            SELECT 1 FROM public.bookings 
            WHERE id = booking_time_slots.booking_id 
            AND visitor_id = auth.uid()
        )
    );

CREATE POLICY "Families can view their booking slots" 
    ON public.booking_time_slots FOR SELECT 
    USING (
        EXISTS (
            SELECT 1 FROM public.bookings b
            INNER JOIN public.host_families hf ON b.family_id = hf.id
            WHERE b.id = booking_time_slots.booking_id 
            AND hf.user_id = auth.uid()
        )
    );

-- Family Earnings Policies
CREATE POLICY "Families can view own earnings" 
    ON public.family_earnings FOR SELECT 
    USING (
        EXISTS (
            SELECT 1 FROM public.host_families 
            WHERE id = family_earnings.family_id 
            AND user_id = auth.uid()
        )
    );

-- Platform Settings (read-only للجميع، write للـ admin فقط)
CREATE POLICY "Anyone can view platform settings" 
    ON public.platform_settings FOR SELECT 
    USING (true);

-- ===================================
-- SUCCESS MESSAGE
-- ===================================

DO $$ 
BEGIN 
    RAISE NOTICE '✅ Availability & Booking System Schema created successfully!';
    RAISE NOTICE '📊 New tables: 5 (family_availability, booking_time_slots, family_earnings, dynamic_pricing, platform_settings)';
    RAISE NOTICE '🔐 RLS enabled on all tables';
    RAISE NOTICE '⚡ Functions: get_available_families(), calculate_dynamic_price()';
    RAISE NOTICE '🎉 Ready for advanced booking features!';
END $$;
