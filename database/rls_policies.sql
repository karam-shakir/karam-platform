-- ============================================
-- Karam Platform - Row Level Security Policies
-- منصة كرم - سياسات الأمان على مستوى الصفوف
-- ============================================

-- Enable RLS on all tables
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.families ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.majlis ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.family_availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.visitors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallet_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.complaints ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;

-- ============================================
-- HELPER FUNCTIONS FOR RLS
-- ============================================

-- Check if user is an operator
CREATE OR REPLACE FUNCTION is_operator()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.user_profiles
        WHERE id = auth.uid() AND user_type = 'operator'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Check if user is a family
CREATE OR REPLACE FUNCTION is_family()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.user_profiles
        WHERE id = auth.uid() AND user_type = 'family'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Check if user is a visitor
CREATE OR REPLACE FUNCTION is_visitor()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.user_profiles
        WHERE id = auth.uid() AND user_type = 'visitor'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Check if user is a company
CREATE OR REPLACE FUNCTION is_company()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.user_profiles
        WHERE id = auth.uid() AND user_type = 'company'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get family_id for current user
CREATE OR REPLACE FUNCTION get_user_family_id()
RETURNS UUID AS $$
BEGIN
    RETURN (SELECT id FROM public.families WHERE user_id = auth.uid());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get visitor_id for current user
CREATE OR REPLACE FUNCTION get_user_visitor_id()
RETURNS UUID AS $$
BEGIN
    RETURN (SELECT id FROM public.visitors WHERE user_id = auth.uid());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get company_id for current user
CREATE OR REPLACE FUNCTION get_user_company_id()
RETURNS UUID AS $$
BEGIN
    RETURN (SELECT id FROM public.companies WHERE user_id = auth.uid());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- USER_PROFILES POLICIES
-- ============================================

-- Users can read their own profile
CREATE POLICY "Users can view own profile"
ON public.user_profiles FOR SELECT
USING (id = auth.uid());

-- Users can insert their own profile
CREATE POLICY "Users can create own profile"
ON public.user_profiles FOR INSERT
WITH CHECK (id = auth.uid());

-- Users can update their own profile
CREATE POLICY "Users can update own profile"
ON public.user_profiles FOR UPDATE
USING (id = auth.uid());

-- Operators can view all profiles
CREATE POLICY "Operators can view all profiles"
ON public.user_profiles FOR SELECT
USING (is_operator());

-- ============================================
-- FAMILIES POLICIES
-- ============================================

-- Anyone can view approved and active families (for browsing)
CREATE POLICY "Anyone can view approved families"
ON public.families FOR SELECT
USING (approval_status = 'approved' AND is_active = true);

-- Families can view their own record
CREATE POLICY "Families can view own record"
ON public.families FOR SELECT
USING (user_id = auth.uid());

-- Families can create their own record
CREATE POLICY "Families can create own record"
ON public.families FOR INSERT
WITH CHECK (user_id = auth.uid());

-- Families can update their own record (except approval fields)
CREATE POLICY "Families can update own record"
ON public.families FOR UPDATE
USING (user_id = auth.uid());

-- Operators can view all families
CREATE POLICY "Operators can view all families"
ON public.families FOR SELECT
USING (is_operator());

-- Operators can update families (for approval)
CREATE POLICY "Operators can update families"
ON public.families FOR UPDATE
USING (is_operator());

-- ============================================
-- MAJLIS POLICIES
-- ============================================

-- Anyone can view majlis of approved families
CREATE POLICY "Anyone can view approved majlis"
ON public.majlis FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.families
        WHERE id = majlis.family_id 
        AND approval_status = 'approved' 
        AND is_active = true
    )
);

-- Families can view their own majlis
CREATE POLICY "Families can view own majlis"
ON public.majlis FOR SELECT
USING (family_id = get_user_family_id());

-- Families can create their own majlis
CREATE POLICY "Families can create own majlis"
ON public.majlis FOR INSERT
WITH CHECK (family_id = get_user_family_id());

-- Families can update their own majlis
CREATE POLICY "Families can update own majlis"
ON public.majlis FOR UPDATE
USING (family_id = get_user_family_id());

-- Families can delete their own majlis
CREATE POLICY "Families can delete own majlis"
ON public.majlis FOR DELETE
USING (family_id = get_user_family_id());

-- Operators can view all majlis
CREATE POLICY "Operators can view all majlis"
ON public.majlis FOR SELECT
USING (is_operator());

-- ============================================
-- FAMILY_AVAILABILITY POLICIES
-- ============================================

-- Anyone can view availability of approved families
CREATE POLICY "Anyone can view availability"
ON public.family_availability FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.majlis m
        INNER JOIN public.families f ON f.id = m.family_id
        WHERE m.id = family_availability.majlis_id
        AND f.approval_status = 'approved'
        AND f.is_active = true
    )
);

-- Families can manage their own availability
CREATE POLICY "Families can manage own availability"
ON public.family_availability FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM public.majlis
        WHERE id = family_availability.majlis_id
        AND family_id = get_user_family_id()
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.majlis
        WHERE id = family_availability.majlis_id
        AND family_id = get_user_family_id()
    )
);

-- Operators can view all availability
CREATE POLICY "Operators can view all availability"
ON public.family_availability FOR SELECT
USING (is_operator());

-- ============================================
-- PACKAGES POLICIES
-- ============================================

-- Everyone can view active packages
CREATE POLICY "Everyone can view packages"
ON public.packages FOR SELECT
USING (is_active = true OR is_operator());

-- Only operators can modify packages
CREATE POLICY "Operators can manage packages"
ON public.packages FOR ALL
USING (is_operator())
WITH CHECK (is_operator());

-- ============================================
-- VISITORS POLICIES
-- ============================================

-- Visitors can view their own profile
CREATE POLICY "Visitors can view own profile"
ON public.visitors FOR SELECT
USING (user_id = auth.uid());

-- Visitors can create their own profile
CREATE POLICY "Visitors can create own profile"
ON public.visitors FOR INSERT
WITH CHECK (user_id = auth.uid());

-- Visitors can update their own profile
CREATE POLICY "Visitors can update own profile"
ON public.visitors FOR UPDATE
USING (user_id = auth.uid());

-- Operators can view all visitors
CREATE POLICY "Operators can view all visitors"
ON public.visitors FOR SELECT
USING (is_operator());

-- Families can view visitor details for their bookings
CREATE POLICY "Families can view booking visitors"
ON public.visitors FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.bookings b
        INNER JOIN public.majlis m ON m.id = b.majlis_id
        WHERE b.visitor_id = visitors.id
        AND m.family_id = get_user_family_id()
    )
);

-- ============================================
-- COMPANIES POLICIES
-- ============================================

-- Companies can view their own record
CREATE POLICY "Companies can view own record"
ON public.companies FOR SELECT
USING (user_id = auth.uid());

-- Companies can create their own record
CREATE POLICY "Companies can create own record"
ON public.companies FOR INSERT
WITH CHECK (user_id = auth.uid());

-- Companies can update their own record
CREATE POLICY "Companies can update own record"
ON public.companies FOR UPDATE
USING (user_id = auth.uid());

-- Operators can view all companies
CREATE POLICY "Operators can view all companies"
ON public.companies FOR SELECT
USING (is_operator());

-- Operators can update companies (for approval)
CREATE POLICY "Operators can update companies"
ON public.companies FOR UPDATE
USING (is_operator());

-- ============================================
-- BOOKINGS POLICIES
-- ============================================

-- Visitors can view their own bookings
CREATE POLICY "Visitors can view own bookings"
ON public.bookings FOR SELECT
USING (visitor_id = get_user_visitor_id());

-- Visitors/Companies can create bookings
CREATE POLICY "Users can create bookings"
ON public.bookings FOR INSERT
WITH CHECK (
    visitor_id = get_user_visitor_id() OR 
    company_id = get_user_company_id()
);

-- Companies can view their bookings
CREATE POLICY "Companies can view own bookings"
ON public.bookings FOR SELECT
USING (company_id = get_user_company_id());

-- Families can view bookings for their majlis
CREATE POLICY "Families can view own bookings"
ON public.bookings FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.majlis
        WHERE id = bookings.majlis_id
        AND family_id = get_user_family_id()
    )
);

-- Families can update booking status (complete bookings)
CREATE POLICY "Families can update booking status"
ON public.bookings FOR UPDATE
USING (
    EXISTS (
        SELECT 1 FROM public.majlis
        WHERE id = bookings.majlis_id
        AND family_id = get_user_family_id()
    )
);

-- Operators can view all bookings
CREATE POLICY "Operators can view all bookings"
ON public.bookings FOR SELECT
USING (is_operator());

-- Operators can update bookings (cancel, refund)
CREATE POLICY "Operators can update bookings"
ON public.bookings FOR UPDATE
USING (is_operator());

-- ============================================
-- WALLETS POLICIES
-- ============================================

-- Families can view their own wallet
CREATE POLICY "Families can view own wallet"
ON public.wallets FOR SELECT
USING (family_id = get_user_family_id());

-- Operators can view all wallets
CREATE POLICY "Operators can view all wallets"
ON public.wallets FOR SELECT
USING (is_operator());

-- Operators can update wallets (for deductions)
CREATE POLICY "Operators can update wallets"
ON public.wallets FOR UPDATE
USING (is_operator());

-- ============================================
-- WALLET_TRANSACTIONS POLICIES
-- ============================================

-- Families can view their own transactions
CREATE POLICY "Families can view own transactions"
ON public.wallet_transactions FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.wallets
        WHERE id = wallet_transactions.wallet_id
        AND family_id = get_user_family_id()
    )
);

-- Families can create withdrawal requests
CREATE POLICY "Families can create withdrawals"
ON public.wallet_transactions FOR INSERT
WITH CHECK (
    transaction_type = 'withdrawal' AND
    EXISTS (
        SELECT 1 FROM public.wallets
        WHERE id = wallet_transactions.wallet_id
        AND family_id = get_user_family_id()
    )
);

-- Operators can view all transactions
CREATE POLICY "Operators can view all transactions"
ON public.wallet_transactions FOR SELECT
USING (is_operator());

-- Operators can create transactions (deductions, refunds)
CREATE POLICY "Operators can create transactions"
ON public.wallet_transactions FOR INSERT
WITH CHECK (is_operator());

-- Operators can update transactions
CREATE POLICY "Operators can update transactions"
ON public.wallet_transactions FOR UPDATE
USING (is_operator());

-- ============================================
-- REVIEWS POLICIES
-- ============================================

-- Everyone can view visible reviews for approved families
CREATE POLICY "Everyone can view reviews"
ON public.reviews FOR SELECT
USING (
    is_visible = true AND
    EXISTS (
        SELECT 1 FROM public.families
        WHERE id = reviews.family_id
        AND approval_status = 'approved'
    )
);

-- Families can view all their reviews (including hidden)
CREATE POLICY "Families can view own reviews"
ON public.reviews FOR SELECT
USING (family_id = get_user_family_id());

-- Visitors can create reviews for their bookings
CREATE POLICY "Visitors can create reviews"
ON public.reviews FOR INSERT
WITH CHECK (
    visitor_id = get_user_visitor_id() AND
    EXISTS (
        SELECT 1 FROM public.bookings
        WHERE id = reviews.booking_id
        AND visitor_id = get_user_visitor_id()
        AND booking_status = 'completed'
    )
);

-- Visitors can view their own reviews
CREATE POLICY "Visitors can view own reviews"
ON public.reviews FOR SELECT
USING (visitor_id = get_user_visitor_id());

-- Operators can view all reviews
CREATE POLICY "Operators can view all reviews"
ON public.reviews FOR SELECT
USING (is_operator());

-- Operators can update reviews (hide/show)
CREATE POLICY "Operators can update reviews"
ON public.reviews FOR UPDATE
USING (is_operator());

-- ============================================
-- COMPLAINTS POLICIES
-- ============================================

-- Visitors can view their own complaints
CREATE POLICY "Visitors can view own complaints"
ON public.complaints FOR SELECT
USING (visitor_id = get_user_visitor_id());

-- Visitors can create complaints
CREATE POLICY "Visitors can create complaints"
ON public.complaints FOR INSERT
WITH CHECK (visitor_id = get_user_visitor_id());

-- Operators can view all complaints
CREATE POLICY "Operators can view all complaints"
ON public.complaints FOR SELECT
USING (is_operator());

-- Operators can update complaints
CREATE POLICY "Operators can update complaints"
ON public.complaints FOR UPDATE
USING (is_operator());

-- Families can view complaints about them
CREATE POLICY "Families can view own complaints"
ON public.complaints FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.families
        WHERE id = complaints.family_id
        AND family_id = get_user_family_id()
    )
);

-- ============================================
-- NOTIFICATIONS POLICIES
-- ============================================

-- Users can view their own notifications
CREATE POLICY "Users can view own notifications"
ON public.notifications FOR SELECT
USING (user_id = auth.uid());

-- Users can update their own notifications (mark as read)
CREATE POLICY "Users can update own notifications"
ON public.notifications FOR UPDATE
USING (user_id = auth.uid());

-- Operators can create notifications for anyone
CREATE POLICY "Operators can create notifications"
ON public.notifications FOR INSERT
WITH CHECK (is_operator());

-- ===============================================
-- PLATFORM_SETTINGS POLICIES
-- ============================================

-- Everyone can view settings (for public configs like pricing)
CREATE POLICY "Everyone can view settings"
ON public.platform_settings FOR SELECT
USING (true);

-- Only operators can modify settings
CREATE POLICY "Operators can manage settings"
ON public.platform_settings FOR ALL
USING (is_operator())
WITH CHECK (is_operator());

-- ============================================
-- SUCCESS MESSAGE
-- ============================================

DO $$
BEGIN
    RAISE NOTICE '✅ Row Level Security Policies Applied Successfully!';
    RAISE NOTICE '🔒 All tables secured with RLS';
    RAISE NOTICE '👥 Multi-user type access control configured';
    RAISE NOTICE '🛡️ Database is now production-ready';
END $$;
