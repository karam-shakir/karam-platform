-- ============================================
-- Karam Platform - Complete Database Schema
-- منصة كرم - قاعدة البيانات الكاملة
-- ============================================
-- Created: 2025-12-25
-- Author: Dr. Shakir Alhuthali
-- ============================================

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================
-- ENUMS (Custom Types)
-- ============================================

CREATE TYPE user_type AS ENUM ('visitor', 'family', 'company', 'operator');
CREATE TYPE city_type AS ENUM ('mecca', 'medina');
CREATE TYPE approval_status AS ENUM ('pending', 'approved', 'rejected');
CREATE TYPE majlis_type AS ENUM ('men', 'women', 'family');
CREATE TYPE time_slot AS ENUM ('morning', 'afternoon', 'evening');
CREATE TYPE package_type AS ENUM ('basic', 'diamond');
CREATE TYPE booking_status AS ENUM ('pending', 'confirmed', 'completed', 'cancelled');
CREATE TYPE payment_status AS ENUM ('pending', 'paid', 'refunded');
CREATE TYPE discount_type AS ENUM ('group', 'company');
CREATE TYPE transaction_type AS ENUM ('earning', 'withdrawal', 'deduction', 'refund');
CREATE TYPE transaction_status AS ENUM ('pending', 'completed', 'failed');
CREATE TYPE complaint_status AS ENUM ('open', 'in_progress', 'resolved', 'closed');
CREATE TYPE notification_type AS ENUM ('booking', 'review_request', 'complaint', 'payment', 'system');

-- ============================================
-- TABLE 1: User Profiles Extension
-- ============================================
-- Note: auth.users is managed by Supabase Auth
-- This table extends user information

CREATE TABLE IF NOT EXISTS public.user_profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    user_type user_type NOT NULL,
    phone TEXT,
    full_name TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- TABLE 2: Families
-- ============================================

CREATE TABLE IF NOT EXISTS public.families (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
    family_name TEXT NOT NULL,
    city city_type NOT NULL,
    address TEXT NOT NULL,
    google_maps_link TEXT,
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    contact_phone TEXT NOT NULL,
    house_entrance_photo_url TEXT,
    access_instructions TEXT,
    approval_status approval_status DEFAULT 'pending',
    is_active BOOLEAN DEFAULT false,
    bank_account_number TEXT, -- Will be encrypted
    bank_name TEXT,
    iban TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    approved_at TIMESTAMP WITH TIME ZONE,
    approved_by UUID REFERENCES auth.users(id),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_families_user_id ON public.families(user_id);
CREATE INDEX idx_families_approval_status ON public.families(approval_status);
CREATE INDEX idx_families_city ON public.families(city);
CREATE INDEX idx_families_is_active ON public.families(is_active);

-- ============================================
-- TABLE 3: Majlis (Sitting Areas)
-- ============================================

CREATE TABLE IF NOT EXISTS public.majlis (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    family_id UUID NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
    majlis_type majlis_type NOT NULL,
    capacity INTEGER NOT NULL CHECK (capacity > 0),
    photo_url TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_majlis_family_id ON public.majlis(family_id);
CREATE INDEX idx_majlis_type ON public.majlis(majlis_type);
CREATE INDEX idx_majlis_is_active ON public.majlis(is_active);

-- ============================================
-- TABLE 4: Family Availability
-- ============================================

CREATE TABLE IF NOT EXISTS public.family_availability (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    majlis_id UUID NOT NULL REFERENCES public.majlis(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    time_slot time_slot NOT NULL,
    available_capacity INTEGER NOT NULL CHECK (available_capacity >= 0),
    is_available BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(majlis_id, date, time_slot)
);

CREATE INDEX idx_availability_majlis_id ON public.family_availability(majlis_id);
CREATE INDEX idx_availability_date ON public.family_availability(date);
CREATE INDEX idx_availability_time_slot ON public.family_availability(time_slot);
CREATE INDEX idx_availability_is_available ON public.family_availability(is_available);

-- ============================================
-- TABLE 5: Packages
-- ============================================

CREATE TABLE IF NOT EXISTS public.packages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    package_type package_type NOT NULL UNIQUE,
    price_per_person DECIMAL(10, 2) NOT NULL CHECK (price_per_person > 0),
    description_ar TEXT NOT NULL,
    description_en TEXT NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default packages
INSERT INTO public.packages (package_type, price_per_person, description_ar, description_en) VALUES
('basic', 150.00, 
 'الباقة الأساسية: شاي وقهوة سعودية، تمر ومعمول، ضيافة شعبية، تصوير بالزي الشعبي',
 'Basic Package: Saudi tea and coffee, dates and maamoul, traditional hospitality, photo in traditional dress'),
('diamond', 250.00,
 'الباقة الماسية: كل ما في الباقة الأساسية + وجبة شعبية من الموروث المكي أو المدني',
 'Diamond Package: Everything in Basic Package + traditional Makki or Madani meal')
ON CONFLICT (package_type) DO NOTHING;

-- ============================================
-- TABLE 6: Visitors
-- ============================================

CREATE TABLE IF NOT EXISTS public.visitors (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
    full_name TEXT NOT NULL,
    nationality TEXT,
    phone TEXT NOT NULL,
    email TEXT,
    emergency_contact TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_visitors_user_id ON public.visitors(user_id);

-- ============================================
-- TABLE 7: Companies
-- ============================================

CREATE TABLE IF NOT EXISTS public.companies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
    company_name TEXT NOT NULL,
    registration_number TEXT NOT NULL UNIQUE,
    license_url TEXT,
    responsible_person_name TEXT NOT NULL,
    responsible_person_phone TEXT NOT NULL,
    office_address TEXT NOT NULL,
    city city_type,
    approval_status approval_status DEFAULT 'pending',
    is_active BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    approved_at TIMESTAMP WITH TIME ZONE,
    approved_by UUID REFERENCES auth.users(id),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_companies_user_id ON public.companies(user_id);
CREATE INDEX idx_companies_approval_status ON public.companies(approval_status);
CREATE INDEX idx_companies_registration_number ON public.companies(registration_number);

-- ============================================
-- TABLE 8: Bookings
-- ============================================

CREATE TABLE IF NOT EXISTS public.bookings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    booking_number TEXT NOT NULL UNIQUE,
    visitor_id UUID REFERENCES public.visitors(id) ON DELETE SET NULL,
    company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL,
    majlis_id UUID NOT NULL REFERENCES public.majlis(id) ON DELETE RESTRICT,
    package_id UUID NOT NULL REFERENCES public.packages(id) ON DELETE RESTRICT,
    booking_date DATE NOT NULL,
    time_slot time_slot NOT NULL,
    guest_count INTEGER NOT NULL CHECK (guest_count > 0),
    guest_details JSONB, -- Array of {name, nationality, phone, emergency_contact}
    subtotal DECIMAL(10, 2) NOT NULL CHECK (subtotal >= 0),
    discount_amount DECIMAL(10, 2) DEFAULT 0 CHECK (discount_amount >= 0),
    discount_type discount_type,
    total_amount DECIMAL(10, 2) NOT NULL CHECK (total_amount >= 0),
    commission_amount DECIMAL(10, 2) NOT NULL CHECK (commission_amount >= 0),
    family_amount DECIMAL(10, 2) NOT NULL CHECK (family_amount >= 0),
    booking_status booking_status DEFAULT 'pending',
    payment_status payment_status DEFAULT 'pending',
    payment_id TEXT, -- Moyasar payment ID
    payment_method TEXT, -- 'mada' or 'visa'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    confirmed_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    cancelled_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CHECK ((visitor_id IS NOT NULL AND company_id IS NULL) OR (visitor_id IS NULL AND company_id IS NOT NULL))
);

CREATE INDEX idx_bookings_booking_number ON public.bookings(booking_number);
CREATE INDEX idx_bookings_visitor_id ON public.bookings(visitor_id);
CREATE INDEX idx_bookings_company_id ON public.bookings(company_id);
CREATE INDEX idx_bookings_majlis_id ON public.bookings(majlis_id);
CREATE INDEX idx_bookings_booking_date ON public.bookings(booking_date);
CREATE INDEX idx_bookings_status ON public.bookings(booking_status);
CREATE INDEX idx_bookings_payment_status ON public.bookings(payment_status);

-- ============================================
-- TABLE 9: Wallets
-- ============================================

CREATE TABLE IF NOT EXISTS public.wallets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    family_id UUID NOT NULL REFERENCES public.families(id) ON DELETE CASCADE UNIQUE,
    balance DECIMAL(10, 2) DEFAULT 0 CHECK (balance >= 0),
    total_earned DECIMAL(10, 2) DEFAULT 0 CHECK (total_earned >= 0),
    total_withdrawn DECIMAL(10, 2) DEFAULT 0 CHECK (total_withdrawn >= 0),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_wallets_family_id ON public.wallets(family_id);

-- ============================================
-- TABLE 10: Wallet Transactions
-- ============================================

CREATE TABLE IF NOT EXISTS public.wallet_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    wallet_id UUID NOT NULL REFERENCES public.wallets(id) ON DELETE CASCADE,
    transaction_type transaction_type NOT NULL,
    amount DECIMAL(10, 2) NOT NULL CHECK (amount > 0),
    booking_id UUID REFERENCES public.bookings(id) ON DELETE SET NULL,
    description TEXT,
    status transaction_status DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_wallet_transactions_wallet_id ON public.wallet_transactions(wallet_id);
CREATE INDEX idx_wallet_transactions_booking_id ON public.wallet_transactions(booking_id);
CREATE INDEX idx_wallet_transactions_type ON public.wallet_transactions(transaction_type);
CREATE INDEX idx_wallet_transactions_status ON public.wallet_transactions(status);

-- ============================================
-- TABLE 11: Reviews
-- ============================================

CREATE TABLE IF NOT EXISTS public.reviews (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE UNIQUE,
    visitor_id UUID NOT NULL REFERENCES public.visitors(id) ON DELETE CASCADE,
    family_id UUID NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    photos JSONB, -- Array of photo URLs
    is_visible BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_reviews_booking_id ON public.reviews(booking_id);
CREATE INDEX idx_reviews_visitor_id ON public.reviews(visitor_id);
CREATE INDEX idx_reviews_family_id ON public.reviews(family_id);
CREATE INDEX idx_reviews_rating ON public.reviews(rating);
CREATE INDEX idx_reviews_is_visible ON public.reviews(is_visible);

-- ============================================
-- TABLE 12: Complaints
-- ============================================

CREATE TABLE IF NOT EXISTS public.complaints (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    complaint_number TEXT NOT NULL UNIQUE,
    visitor_id UUID NOT NULL REFERENCES public.visitors(id) ON DELETE CASCADE,
    booking_id UUID REFERENCES public.bookings(id) ON DELETE SET NULL,
    family_id UUID REFERENCES public.families(id) ON DELETE SET NULL,
    complaint_text TEXT NOT NULL,
    status complaint_status DEFAULT 'open',
    assigned_to UUID REFERENCES auth.users(id),
    resolution_notes TEXT,
    compensation_amount DECIMAL(10, 2) DEFAULT 0 CHECK (compensation_amount >= 0),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    resolved_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_complaints_complaint_number ON public.complaints(complaint_number);
CREATE INDEX idx_complaints_visitor_id ON public.complaints(visitor_id);
CREATE INDEX idx_complaints_booking_id ON public.complaints(booking_id);
CREATE INDEX idx_complaints_family_id ON public.complaints(family_id);
CREATE INDEX idx_complaints_status ON public.complaints(status);
CREATE INDEX idx_complaints_assigned_to ON public.complaints(assigned_to);

-- ============================================
-- TABLE 13: Notifications
-- ============================================

CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    notification_type notification_type NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT false,
    related_id UUID, -- Booking ID, Complaint ID, etc.
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX idx_notifications_type ON public.notifications(notification_type);
CREATE INDEX idx_notifications_is_read ON public.notifications(is_read);
CREATE INDEX idx_notifications_created_at ON public.notifications(created_at DESC);

-- ============================================
-- TABLE 14: Platform Settings
-- ============================================

CREATE TABLE IF NOT EXISTS public.platform_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    setting_key TEXT NOT NULL UNIQUE,
    setting_value JSONB NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_by UUID REFERENCES auth.users(id)
);

-- Insert default platform settings
INSERT INTO public.platform_settings (setting_key, setting_value) VALUES
('commission_percentage', '{"value": 20, "description": "Platform commission percentage"}'),
('group_discount', '{"threshold": 5, "percentage": 10, "description": "Group discount: 10% for 5+ guests"}'),
('company_discount', '{"percentage": 15, "description": "Company discount: 15% for all company bookings"}'),
('booking_duration_hours', '{"value": 2, "max_value": 3, "description": "Standard booking duration in hours"}'),
('sms_enabled', '{"value": true, "provider": "unifonic", "description": "SMS notifications enabled"}'),
('email_enabled', '{"value": true, "description": "Email notifications enabled"}')
ON CONFLICT (setting_key) DO NOTHING;

-- ============================================
-- HELPER FUNCTIONS
-- ============================================

-- Function to generate unique booking number
CREATE OR REPLACE FUNCTION generate_booking_number()
RETURNS TEXT AS $$
DECLARE
    new_number TEXT;
    exists BOOLEAN;
BEGIN
    LOOP
        new_number := 'KRM' || TO_CHAR(NOW(), 'YYYYMMDD') || LPAD(FLOOR(RANDOM() * 10000)::TEXT, 4, '0');
        SELECT EXISTS(SELECT 1 FROM public.bookings WHERE booking_number = new_number) INTO exists;
        EXIT WHEN NOT exists;
    END LOOP;
    RETURN new_number;
END;
$$ LANGUAGE plpgsql;

-- Function to generate unique complaint number
CREATE OR REPLACE FUNCTION generate_complaint_number()
RETURNS TEXT AS $$
DECLARE
    new_number TEXT;
    exists BOOLEAN;
BEGIN
    LOOP
        new_number := 'CMP' || TO_CHAR(NOW(), 'YYYYMMDD') || LPAD(FLOOR(RANDOM() * 1000)::TEXT, 3, '0');
        SELECT EXISTS(SELECT 1 FROM public.complaints WHERE complaint_number = new_number) INTO exists;
        EXIT WHEN NOT exists;
    END LOOP;
    RETURN new_number;
END;
$$ LANGUAGE plpgsql;

-- Function to calculate booking amounts
CREATE OR REPLACE FUNCTION calculate_booking_amounts(
    p_package_price DECIMAL,
    p_guest_count INTEGER,
    p_discount_type discount_type DEFAULT NULL
)
RETURNS TABLE (
    subtotal DECIMAL,
    discount_amount DECIMAL,
    total_amount DECIMAL,
    commission_amount DECIMAL,
    family_amount DECIMAL
) AS $$
DECLARE
    v_subtotal DECIMAL;
    v_discount_percentage DECIMAL := 0;
    v_discount_amount DECIMAL := 0;
    v_total DECIMAL;
    v_commission_percentage DECIMAL;
    v_commission_amount DECIMAL;
    v_family_amount DECIMAL;
BEGIN
    -- Calculate subtotal
    v_subtotal := p_package_price * p_guest_count;
    
    -- Get commission percentage from settings
    SELECT (setting_value->>'value')::DECIMAL INTO v_commission_percentage
    FROM public.platform_settings
    WHERE setting_key = 'commission_percentage';
    
    -- Apply discount if applicable
    IF p_discount_type = 'group' THEN
        SELECT (setting_value->'group_discount'->>'percentage')::DECIMAL INTO v_discount_percentage
        FROM public.platform_settings
        WHERE setting_key = 'group_discount';
    ELSIF p_discount_type = 'company' THEN
        SELECT (setting_value->'company_discount'->>'percentage')::DECIMAL INTO v_discount_percentage
        FROM public.platform_settings
        WHERE setting_key = 'company_discount';
    END IF;
    
    v_discount_amount := v_subtotal * (v_discount_percentage / 100);
    v_total := v_subtotal - v_discount_amount;
    
    -- Calculate commission and family amount
    v_commission_amount := v_total * (v_commission_percentage / 100);
    v_family_amount := v_total - v_commission_amount;
    
    RETURN QUERY SELECT v_subtotal, v_discount_amount, v_total, v_commission_amount, v_family_amount;
END;
$$ LANGUAGE plpgsql;

-- Function to check and update availability
CREATE OR REPLACE FUNCTION check_and_update_availability(
    p_majlis_id UUID,
    p_date DATE,
    p_time_slot time_slot,
    p_guest_count INTEGER
)
RETURNS BOOLEAN AS $$
DECLARE
    v_available_capacity INTEGER;
    v_is_available BOOLEAN;
BEGIN
    -- Get current availability
    SELECT available_capacity, is_available INTO v_available_capacity, v_is_available
    FROM public.family_availability
    WHERE majlis_id = p_majlis_id 
      AND date = p_date 
      AND time_slot = p_time_slot
    FOR UPDATE;
    
    -- Check if enough capacity
    IF v_is_available AND v_available_capacity >= p_guest_count THEN
        -- Update availability
        UPDATE public.family_availability
        SET available_capacity = available_capacity - p_guest_count,
            is_available = CASE WHEN (available_capacity - p_guest_count) <= 0 THEN false ELSE true END,
            updated_at = NOW()
        WHERE majlis_id = p_majlis_id 
          AND date = p_date 
          AND time_slot = p_time_slot;
        
        RETURN true;
    ELSE
        RETURN false;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- TRIGGERS
-- ============================================

-- Trigger: Auto-create wallet when family is approved
CREATE OR REPLACE FUNCTION create_wallet_on_approval()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.approval_status = 'approved' AND OLD.approval_status != 'approved' THEN
        INSERT INTO public.wallets (family_id)
        VALUES (NEW.id)
        ON CONFLICT (family_id) DO NOTHING;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_create_wallet_on_approval
AFTER UPDATE ON public.families
FOR EACH ROW
EXECUTE FUNCTION create_wallet_on_approval();

-- Trigger: Update wallet balance on transaction completion
CREATE OR REPLACE FUNCTION update_wallet_on_transaction()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
        IF NEW.transaction_type = 'earning' THEN
            UPDATE public.wallets
            SET balance = balance + NEW.amount,
                total_earned = total_earned + NEW.amount,
                updated_at = NOW()
            WHERE id = NEW.wallet_id;
        ELSIF NEW.transaction_type = 'withdrawal' THEN
            UPDATE public.wallets
            SET balance = balance - NEW.amount,
                total_withdrawn = total_withdrawn + NEW.amount,
                updated_at = NOW()
            WHERE id = NEW.wallet_id;
        ELSIF NEW.transaction_type = 'deduction' THEN
            UPDATE public.wallets
            SET balance = balance - NEW.amount,
                updated_at = NOW()
            WHERE id = NEW.wallet_id;
        ELSIF NEW.transaction_type = 'refund' THEN
            UPDATE public.wallets
            SET balance = balance - NEW.amount,
                updated_at = NOW()
            WHERE id = NEW.wallet_id;
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_wallet_on_transaction
AFTER UPDATE ON public.wallet_transactions
FOR EACH ROW
EXECUTE FUNCTION update_wallet_on_transaction();

-- Trigger: Create earning transaction when booking is completed
CREATE OR REPLACE FUNCTION create_earning_on_booking_completion()
RETURNS TRIGGER AS $$
DECLARE
    v_family_id UUID;
    v_wallet_id UUID;
BEGIN
    IF NEW.booking_status = 'completed' AND OLD.booking_status != 'completed' THEN
        -- Get family_id from majlis
        SELECT f.id INTO v_family_id
        FROM public.families f
        INNER JOIN public.majlis m ON m.family_id = f.id
        WHERE m.id = NEW.majlis_id;
        
        -- Get wallet_id
        SELECT id INTO v_wallet_id
        FROM public.wallets
        WHERE family_id = v_family_id;
        
        -- Create earning transaction
        INSERT INTO public.wallet_transactions (
            wallet_id, 
            transaction_type, 
            amount, 
            booking_id, 
            description, 
            status,
            completed_at
        ) VALUES (
            v_wallet_id,
            'earning',
            NEW.family_amount,
            NEW.id,
            'Earning from booking ' || NEW.booking_number,
            'completed',
            NOW()
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_create_earning_on_booking_completion
AFTER UPDATE ON public.bookings
FOR EACH ROW
EXECUTE FUNCTION create_earning_on_booking_completion();

-- Trigger: Send notification on new booking
CREATE OR REPLACE FUNCTION notify_on_new_booking()
RETURNS TRIGGER AS $$
DECLARE
    v_family_user_id UUID;
    v_family_name TEXT;
BEGIN
    -- Get family user_id and name
    SELECT f.user_id, f.family_name INTO v_family_user_id, v_family_name
    FROM public.families f
    INNER JOIN public.majlis m ON m.family_id = f.id
    WHERE m.id = NEW.majlis_id;
    
    -- Create notification for family
    INSERT INTO public.notifications (
        user_id,
        notification_type,
        title,
        message,
        related_id
    ) VALUES (
        v_family_user_id,
        'booking',
        'حجز جديد',
        'لديك حجز جديد برقم ' || NEW.booking_number || ' بتاريخ ' || TO_CHAR(NEW.booking_date, 'YYYY-MM-DD'),
        NEW.id
    );
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_notify_on_new_booking
AFTER INSERT ON public.bookings
FOR EACH ROW
EXECUTE FUNCTION notify_on_new_booking();

-- Trigger: Request review after booking completion
CREATE OR REPLACE FUNCTION request_review_on_completion()
RETURNS TRIGGER AS $$
DECLARE
    v_visitor_user_id UUID;
BEGIN
    IF NEW.booking_status = 'completed' AND OLD.booking_status != 'completed' AND NEW.visitor_id IS NOT NULL THEN
        -- Get visitor user_id
        SELECT user_id INTO v_visitor_user_id
        FROM public.visitors
        WHERE id = NEW.visitor_id;
        
        -- Create review request notification
        INSERT INTO public.notifications (
            user_id,
            notification_type,
            title,
            message,
            related_id
        ) VALUES (
            v_visitor_user_id,
            'review_request',
            'قيّم تجربتك',
            'نأمل أن تكون قد استمتعت بزيارتك. يرجى تقييم تجربتك مع الأسرة المضيفة.',
            NEW.id
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_request_review_on_completion
AFTER UPDATE ON public.bookings
FOR EACH ROW
EXECUTE FUNCTION request_review_on_completion();

-- Trigger: Auto-generate booking number
CREATE OR REPLACE FUNCTION set_booking_number()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.booking_number IS NULL OR NEW.booking_number = '' THEN
        NEW.booking_number := generate_booking_number();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_set_booking_number
BEFORE INSERT ON public.bookings
FOR EACH ROW
EXECUTE FUNCTION set_booking_number();

-- Trigger: Auto-generate complaint number
CREATE OR REPLACE FUNCTION set_complaint_number()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.complaint_number IS NULL OR NEW.complaint_number = '' THEN
        NEW.complaint_number := generate_complaint_number();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_set_complaint_number
BEFORE INSERT ON public.complaints
FOR EACH ROW
EXECUTE FUNCTION set_complaint_number();

-- ============================================
-- UPDATED_AT TRIGGERS for all tables
-- ============================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_user_profiles_updated_at BEFORE UPDATE ON public.user_profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_families_updated_at BEFORE UPDATE ON public.families FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_majlis_updated_at BEFORE UPDATE ON public.majlis FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_availability_updated_at BEFORE UPDATE ON public.family_availability FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_packages_updated_at BEFORE UPDATE ON public.packages FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_visitors_updated_at BEFORE UPDATE ON public.visitors FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_companies_updated_at BEFORE UPDATE ON public.companies FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_bookings_updated_at BEFORE UPDATE ON public.bookings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_wallets_updated_at BEFORE UPDATE ON public.wallets FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_transactions_updated_at BEFORE UPDATE ON public.wallet_transactions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_reviews_updated_at BEFORE UPDATE ON public.reviews FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_complaints_updated_at BEFORE UPDATE ON public.complaints FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_settings_updated_at BEFORE UPDATE ON public.platform_settings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- COMMENTS ON TABLES (Documentation)
-- ============================================

COMMENT ON TABLE public.user_profiles IS 'Extended user profile information for all user types';
COMMENT ON TABLE public.families IS 'Family host information and registration details';
COMMENT ON TABLE public.majlis IS 'Sitting areas/majlis for each family';
COMMENT ON TABLE public.family_availability IS 'Family availability schedule by date and time slot';
COMMENT ON TABLE public.packages IS 'Service packages (Basic and Diamond)';
COMMENT ON TABLE public.visitors IS 'Visitor/Pilgrim profiles';
COMMENT ON TABLE public.companies IS 'Hajj/Umrah company profiles';
COMMENT ON TABLE public.bookings IS 'All bookings from visitors and companies';
COMMENT ON TABLE public.wallets IS 'Digital wallets for families';
COMMENT ON TABLE public.wallet_transactions IS 'All wallet transactions (earnings, withdrawals, deductions)';
COMMENT ON TABLE public.reviews IS 'Visitor reviews and ratings for families';
COMMENT ON TABLE public.complaints IS 'Customer complaints and support tickets';
COMMENT ON TABLE public.notifications IS 'In-app notifications for all users';
COMMENT ON TABLE public.platform_settings IS 'Platform-wide configuration settings';

-- ============================================
-- SUCCESS MESSAGE
-- ============================================

DO $$
BEGIN
    RAISE NOTICE '✅ Karam Platform Database Schema Created Successfully!';
    RAISE NOTICE '📊 14 Tables Created';
    RAISE NOTICE '🔧 Multiple Helper Functions Added';
    RAISE NOTICE '⚡ Triggers Configured';
    RAISE NOTICE '🎯 Ready for RLS Policies';
END $$;
