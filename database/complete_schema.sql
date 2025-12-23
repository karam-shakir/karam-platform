-- ===================================
-- Karam Platform Database Schema
-- Complete SQL Setup for Supabase
-- ===================================

-- Enable Required Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis"; -- للمواقع الجغرافية

-- ===================================
-- 1. User Profiles (Extended from auth.users)
-- ===================================

CREATE TABLE public.user_profiles (
    id UUID REFERENCES auth.users PRIMARY KEY,
    full_name TEXT NOT NULL,
    phone VARCHAR(15),
    user_type VARCHAR(20) NOT NULL CHECK (user_type IN ('visitor', 'family', 'company', 'admin')),
    avatar_url TEXT,
    address TEXT,
    city VARCHAR(50),
    is_active BOOLEAN DEFAULT true,
    email_verified BOOLEAN DEFAULT false,
    phone_verified BOOLEAN DEFAULT false,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ===================================
-- 2. Host Families
-- ===================================

CREATE TABLE public.host_families (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.user_profiles NOT NULL UNIQUE,
    family_name TEXT NOT NULL,
    city VARCHAR(50) NOT NULL CHECK (city IN ('makkah', 'madinah')),
    address TEXT NOT NULL,
    location GEOGRAPHY(POINT, 4326), -- للإحداثيات
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    capacity INTEGER NOT NULL DEFAULT 10,
    description TEXT,
    features JSONB DEFAULT '[]', -- ['قهوة عربية', 'مجلس أرضي', ...]
    amenities JSONB DEFAULT '{}', -- {wifi: true, parking: true, ...}
    rating DECIMAL(3,2) DEFAULT 0 CHECK (rating >= 0 AND rating <= 5),
    total_reviews INTEGER DEFAULT 0,
    total_bookings INTEGER DEFAULT 0,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'suspended')),
    verification_documents JSONB,
    is_featured BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ===================================
-- 3. Family Images
-- ===================================

CREATE TABLE public.family_images (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    family_id UUID REFERENCES public.host_families ON DELETE CASCADE NOT NULL,
    image_url TEXT NOT NULL,
    is_primary BOOLEAN DEFAULT false,
    caption TEXT,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ===================================
-- 4. Packages
-- ===================================

CREATE TABLE public.packages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    family_id UUID REFERENCES public.host_families ON DELETE CASCADE NOT NULL,
    package_type VARCHAR(20) NOT NULL CHECK (package_type IN ('simple', 'meal', 'premium')),
    name TEXT NOT NULL,
    name_en TEXT,
    description TEXT,
    description_en TEXT,
    price DECIMAL(10,2) NOT NULL CHECK (price >= 0),
    discount_price DECIMAL(10,2),
    b2b_price DECIMAL(10,2), -- سعر الشركات
    duration_hours INTEGER DEFAULT 2,
    max_guests INTEGER NOT NULL DEFAULT 10,
    min_guests INTEGER DEFAULT 1,
    features JSONB DEFAULT '[]',
    includes JSONB DEFAULT '[]',
    excludes JSONB DEFAULT '[]',
    is_active BOOLEAN DEFAULT true,
    available_days INTEGER[] DEFAULT ARRAY[0,1,2,3,4,5,6], -- أيام الأسبوع
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ===================================
-- 5. Bookings
-- ===================================

CREATE TABLE public.bookings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    booking_number VARCHAR(20) UNIQUE NOT NULL,
    visitor_id UUID REFERENCES public.user_profiles NOT NULL,
    family_id UUID REFERENCES public.host_families NOT NULL,
    package_id UUID REFERENCES public.packages NOT NULL,
    booking_type VARCHAR(20) DEFAULT 'individual' CHECK (booking_type IN ('individual', 'group', 'b2b')),
    booking_date DATE NOT NULL,
    booking_time TIME NOT NULL,
    number_of_guests INTEGER NOT NULL CHECK (number_of_guests > 0),
    guest_details JSONB, -- معلومات الضيوف
    total_price DECIMAL(10,2) NOT NULL CHECK (total_price >= 0),
    discount_amount DECIMAL(10,2) DEFAULT 0,
    final_price DECIMAL(10,2) NOT NULL,
    commission DECIMAL(10,2), -- عمولة المنصة
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'cancelled', 'completed', 'no_show')),
    cancellation_reason TEXT,
    cancelled_at TIMESTAMPTZ,
    notes TEXT,
    special_requests TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- منع الحجز المزدوج
    CONSTRAINT unique_family_datetime UNIQUE (family_id, booking_date, booking_time)
);

-- ===================================
-- 6. Payments
-- ===================================

CREATE TABLE public.payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    booking_id UUID REFERENCES public.bookings ON DELETE CASCADE NOT NULL,
    amount DECIMAL(10,2) NOT NULL CHECK (amount >= 0),
    currency VARCHAR(3) DEFAULT 'SAR',
    payment_method VARCHAR(50), -- 'credit_card', 'mada', 'stc_pay', etc.
    payment_gateway VARCHAR(50) DEFAULT 'moyasar',
    transaction_id TEXT UNIQUE,
    gateway_response JSONB,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'refunded', 'cancelled')),
    paid_at TIMESTAMPTZ,
    refunded_at TIMESTAMPTZ,
    refund_amount DECIMAL(10,2),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ===================================
-- 7. Reviews
-- ===================================

CREATE TABLE public.reviews (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    booking_id UUID REFERENCES public.bookings ON DELETE CASCADE NOT NULL UNIQUE,
    visitor_id UUID REFERENCES public.user_profiles NOT NULL,
    family_id UUID REFERENCES public.host_families NOT NULL,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    images TEXT[], -- صور من التجربة
    response TEXT, -- رد الأسرة
    response_at TIMESTAMPTZ,
    is_verified BOOLEAN DEFAULT false,
    is_featured BOOLEAN DEFAULT false,
    helpful_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ===================================
-- 8. Souvenirs/Products
-- ===================================

CREATE TABLE public.souvenirs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    family_id UUID REFERENCES public.host_families,
    name TEXT NOT NULL,
    name_en TEXT,
    description TEXT,
    category VARCHAR(50) CHECK (category IN ('crafts', 'food', 'clothing', 'gifts', 'accessories', 'other')),
    price DECIMAL(10,2) NOT NULL CHECK (price >= 0),
    cost_price DECIMAL(10,2), -- سعر التكلفة
    stock INTEGER DEFAULT 0 CHECK (stock >= 0),
    sku VARCHAR(50) UNIQUE,
    images TEXT[],
    weight_kg DECIMAL(6,2),
    dimensions JSONB, -- {length, width, height}
    is_active BOOLEAN DEFAULT true,
    is_featured BOOLEAN DEFAULT false,
    sold_count INTEGER DEFAULT 0,
    commission_rate DECIMAL(5,2) DEFAULT 15.00,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ===================================
-- 9. Orders (للهدايا)
-- ===================================

CREATE TABLE public.orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_number VARCHAR(20) UNIQUE NOT NULL,
    user_id UUID REFERENCES public.user_profiles NOT NULL,
    total_amount DECIMAL(10,2) NOT NULL,
    shipping_address JSONB NOT NULL,
    shipping_cost DECIMAL(10,2) DEFAULT 0,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'shipped', 'delivered', 'cancelled')),
    payment_id UUID REFERENCES public.payments,
    tracking_number TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.order_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID REFERENCES public.orders ON DELETE CASCADE NOT NULL,
    souvenir_id UUID REFERENCES public.souvenirs NOT NULL,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    unit_price DECIMAL(10,2) NOT NULL,
    total_price DECIMAL(10,2) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ===================================
-- 10. Companies (B2B)
-- ===================================

CREATE TABLE public.companies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.user_profiles NOT NULL UNIQUE,
    company_name TEXT NOT NULL,
    commercial_registration TEXT NOT NULL,
    license_number TEXT,
    company_type VARCHAR(50) CHECK (company_type IN ('umrah', 'hajj', 'both', 'tourism')),
    address TEXT,
    website TEXT,
    expected_visitors_monthly INTEGER,
    discount_rate DECIMAL(5,2) DEFAULT 15.00,
    credit_limit DECIMAL(12,2),
    documents JSONB,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'suspended')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ===================================
-- 11. Notifications
-- ===================================

CREATE TABLE public.notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.user_profiles NOT NULL,
    type VARCHAR(50) NOT NULL, -- 'booking_confirmed', 'payment_received', etc.
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    link TEXT,
    is_read BOOLEAN DEFAULT false,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ===================================
-- 12. Chat Messages
-- ===================================

CREATE TABLE public.chat_rooms (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.user_profiles NOT NULL,
    family_id UUID REFERENCES public.host_families,
    last_message TEXT,
    last_message_at TIMESTAMPTZ,
    unread_count INTEGER DEFAULT 0,
    status VARCHAR(20) DEFAULT 'open' CHECK (status IN ('open', 'closed')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.chat_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    room_id UUID REFERENCES public.chat_rooms ON DELETE CASCADE NOT NULL,
    sender_id UUID REFERENCES public.user_profiles NOT NULL,
    message TEXT NOT NULL,
    attachment_url TEXT,
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ===================================
-- 13. Coupons
-- ===================================

CREATE TABLE public.coupons (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(50) UNIQUE NOT NULL,
    discount_type VARCHAR(20) CHECK (discount_type IN ('percentage', 'fixed')),
    discount_value DECIMAL(10,2) NOT NULL,
    min_purchase DECIMAL(10,2),
    max_discount DECIMAL(10,2),
    usage_limit INTEGER,
    used_count INTEGER DEFAULT 0,
    valid_from TIMESTAMPTZ,
    valid_until TIMESTAMPTZ,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ===================================
-- INDEXES للأداء
-- ===================================

-- Bookings
CREATE INDEX idx_bookings_visitor ON public.bookings(visitor_id);
CREATE INDEX idx_bookings_family ON public.bookings(family_id);
CREATE INDEX idx_bookings_date ON public.bookings(booking_date);
CREATE INDEX idx_bookings_status ON public.bookings(status);

-- Reviews
CREATE INDEX idx_reviews_family ON public.reviews(family_id);
CREATE INDEX idx_reviews_visitor ON public.reviews(visitor_id);
CREATE INDEX idx_reviews_rating ON public.reviews(rating);

-- Families
CREATE INDEX idx_families_city ON public.host_families(city);
CREATE INDEX idx_families_status ON public.host_families(status);
CREATE INDEX idx_families_rating ON public.host_families(rating);

-- Payments
CREATE INDEX idx_payments_booking ON public.payments(booking_id);
CREATE INDEX idx_payments_status ON public.payments(status);

-- Orders
CREATE INDEX idx_orders_user ON public.orders(user_id);
CREATE INDEX idx_orders_status ON public.orders(status);

-- Notifications
CREATE INDEX idx_notifications_user ON public.notifications(user_id);
CREATE INDEX idx_notifications_read ON public.notifications(is_read);

-- ===================================
-- TRIGGERS
-- ===================================

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply to all tables
CREATE TRIGGER update_user_profiles_updated_at BEFORE UPDATE ON public.user_profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_host_families_updated_at BEFORE UPDATE ON public.host_families FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_packages_updated_at BEFORE UPDATE ON public.packages FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_bookings_updated_at BEFORE UPDATE ON public.bookings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Auto-generate booking number
CREATE OR REPLACE FUNCTION generate_booking_number()
RETURNS TRIGGER AS $$
BEGIN
    NEW.booking_number = 'BK-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(nextval('booking_seq')::TEXT, 6, '0');
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE SEQUENCE IF NOT EXISTS booking_seq;
CREATE TRIGGER set_booking_number BEFORE INSERT ON public.bookings FOR EACH ROW EXECUTE FUNCTION generate_booking_number();

-- Auto-generate order number
CREATE OR REPLACE FUNCTION generate_order_number()
RETURNS TRIGGER AS $$
BEGIN
    NEW.order_number = 'OR-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(nextval('order_seq')::TEXT, 6, '0');
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE SEQUENCE IF NOT EXISTS order_seq;
CREATE TRIGGER set_order_number BEFORE INSERT ON public.orders FOR EACH ROW EXECUTE FUNCTION generate_order_number();

-- Update family rating when review is added
CREATE OR REPLACE FUNCTION update_family_rating()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE public.host_families
    SET 
        rating = (SELECT AVG(rating)::DECIMAL(3,2) FROM public.reviews WHERE family_id = NEW.family_id),
        total_reviews = (SELECT COUNT(*) FROM public.reviews WHERE family_id = NEW.family_id)
    WHERE id = NEW.family_id;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_rating_on_review AFTER INSERT ON public.reviews FOR EACH ROW EXECUTE FUNCTION update_family_rating();

-- ===================================
-- ROW LEVEL SECURITY (RLS)
-- ===================================

-- Enable RLS on all tables
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.host_families ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.family_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.souvenirs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;

-- User Profiles
CREATE POLICY "Users can view own profile" ON public.user_profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.user_profiles FOR UPDATE USING (auth.uid() = id);

-- Host Families (Everyone can view approved)
CREATE POLICY "Anyone can view approved families" ON public.host_families FOR SELECT USING (status = 'approved');
CREATE POLICY "Families can manage own data" ON public.host_families FOR ALL USING (user_id = auth.uid());

-- Family Images
CREATE POLICY "Anyone can view family images" ON public.family_images FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.host_families WHERE id = family_images.family_id AND status = 'approved')
);
CREATE POLICY "Families can manage own images" ON public.family_images FOR ALL USING (
    EXISTS (SELECT 1 FROM public.host_families WHERE id = family_images.family_id AND user_id = auth.uid())
);

-- Packages
CREATE POLICY "Anyone can view active packages" ON public.packages FOR SELECT USING (is_active = true);
CREATE POLICY "Families can manage own packages" ON public.packages FOR ALL USING (
    EXISTS (SELECT 1 FROM public.host_families WHERE id = packages.family_id AND user_id = auth.uid())
);

-- Bookings
CREATE POLICY "Users can view own bookings" ON public.bookings FOR SELECT USING (visitor_id = auth.uid());
CREATE POLICY "Families can view their bookings" ON public.bookings FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.host_families WHERE id = bookings.family_id AND user_id = auth.uid())
);
CREATE POLICY "Users can create bookings" ON public.bookings FOR INSERT WITH CHECK (visitor_id = auth.uid());
CREATE POLICY "Users can update own bookings" ON public.bookings FOR UPDATE USING (visitor_id = auth.uid());

-- Reviews
CREATE POLICY "Anyone can view reviews" ON public.reviews FOR SELECT USING (true);
CREATE POLICY "Users can create reviews" ON public.reviews FOR INSERT WITH CHECK (visitor_id = auth.uid());

-- Notifications
CREATE POLICY "Users can view own notifications" ON public.notifications FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can update own notifications" ON public.notifications FOR UPDATE USING (user_id = auth.uid());

-- Souvenirs
CREATE POLICY "Anyone can view active souvenirs" ON public.souvenirs FOR SELECT USING (is_active = true);

-- ===================================
-- SAMPLE DATA (للاختبار)
-- ===================================

-- Insert sample packages (Global)
INSERT INTO public.packages (family_id, package_type, name, name_en, description, price, b2b_price, duration_hours, max_guests, features, includes) 
SELECT 
    f.id,
    'simple',
    'باقة الضيافة البسيطة',
    'Simple Hospitality',
    'استقبال تراثي مع ضيافة وتصوير',
    150.00,
    120.00,
    2,
    15,
    '["قهوة عربية", "مجلس تقليدي", "تصوير"]'::jsonb,
    '["قهوة وتمر", "حلويات", "جلسة تراثية", "تصوير بالزي", "صور تذكارية"]'::jsonb
FROM public.host_families f
WHERE f.status = 'approved'
LIMIT 1;

-- Success message
DO $$ 
BEGIN 
    RAISE NOTICE '✅ Database schema created successfully!';
    RAISE NOTICE '📊 Total tables: 18';
    RAISE NOTICE '🔐 RLS enabled on all tables';
    RAISE NOTICE '⚡ Triggers configured';
    RAISE NOTICE '🎉 Ready for testing!';
END $$;
