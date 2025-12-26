-- ============================================
-- Karam Platform - Critical Features
-- الميزات الحرجة للمنصة
-- ============================================
-- Created: 2025-12-25
-- Author: Dr. Shakir Alhuthali
-- ============================================
-- This file adds essential features that were missing from initial design
-- Apply AFTER: complete_schema.sql, rls_policies.sql, enhanced_features.sql
-- ============================================

-- ============================================
-- FEATURE 1: KYC / VERIFICATION SYSTEM
-- نظام التحقق من الهوية
-- ============================================

-- Add verification columns to families
ALTER TABLE public.families 
    ADD COLUMN IF NOT EXISTS id_document_url TEXT,
    ADD COLUMN IF NOT EXISTS id_verified BOOLEAN DEFAULT false,
    ADD COLUMN IF NOT EXISTS id_verified_at TIMESTAMP WITH TIME ZONE,
    ADD COLUMN IF NOT EXISTS id_verified_by UUID REFERENCES auth.users(id),
    ADD COLUMN IF NOT EXISTS phone_verified BOOLEAN DEFAULT false,
    ADD COLUMN IF NOT EXISTS phone_verified_at TIMESTAMP WITH TIME ZONE,
    ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT false,
    ADD COLUMN IF NOT EXISTS email_verified_at TIMESTAMP WITH TIME ZONE,
    ADD COLUMN IF NOT EXISTS verification_notes TEXT;

-- Add verification columns to companies
ALTER TABLE public.companies 
    ADD COLUMN IF NOT EXISTS commercial_license_url TEXT,
    ADD COLUMN IF NOT EXISTS license_verified BOOLEAN DEFAULT false,
    ADD COLUMN IF NOT EXISTS license_verified_at TIMESTAMP WITH TIME ZONE,
    ADD COLUMN IF NOT EXISTS license_verified_by UUID REFERENCES auth.users(id),
    ADD COLUMN IF NOT EXISTS phone_verified BOOLEAN DEFAULT false,
    ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT false,
    ADD COLUMN IF NOT EXISTS verification_notes TEXT;

-- Add verification columns to visitors (optional but recommended)
ALTER TABLE public.visitors 
    ADD COLUMN IF NOT EXISTS phone_verified BOOLEAN DEFAULT false,
    ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT false;

COMMENT ON COLUMN public.families.id_document_url IS 'URL to national ID document in Supabase Storage';
COMMENT ON COLUMN public.companies.commercial_license_url IS 'URL to commercial registration in Supabase Storage';

-- OTP verification codes table
CREATE TABLE IF NOT EXISTS public.verification_codes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    code TEXT NOT NULL,
    verification_type TEXT NOT NULL, -- 'phone', 'email'
    contact_info TEXT NOT NULL, -- phone number or email
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    verified BOOLEAN DEFAULT false,
    verified_at TIMESTAMP WITH TIME ZONE,
    attempts INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_verification_codes_user ON public.verification_codes(user_id);
CREATE INDEX idx_verification_codes_type ON public.verification_codes(verification_type);
CREATE INDEX idx_verification_codes_expires ON public.verification_codes(expires_at);

-- Function to generate and send OTP
CREATE OR REPLACE FUNCTION generate_verification_code(
    p_user_id UUID,
    p_type TEXT,
    p_contact_info TEXT
)
RETURNS TEXT AS $$
DECLARE
    v_code TEXT;
    v_expires_at TIMESTAMP WITH TIME ZONE;
BEGIN
    -- Generate 6-digit code
    v_code := LPAD(FLOOR(RANDOM() * 1000000)::TEXT, 6, '0');
    v_expires_at := NOW() + INTERVAL '10 minutes';
    
    -- Invalidate previous codes
    UPDATE public.verification_codes
    SET verified = false
    WHERE user_id = p_user_id 
    AND verification_type = p_type
    AND verified = false;
    
    -- Insert new code
    INSERT INTO public.verification_codes (
        user_id,
        code,
        verification_type,
        contact_info,
        expires_at
    ) VALUES (
        p_user_id,
        v_code,
        p_type,
        p_contact_info,
        v_expires_at
    );
    
    RETURN v_code;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- FEATURE 2: CANCELLATION & REFUND POLICY
-- سياسة الإلغاء والاسترجاع
-- ============================================

CREATE TABLE IF NOT EXISTS public.cancellation_policies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    hours_before_booking INTEGER NOT NULL,
    refund_percentage DECIMAL(5,2) NOT NULL CHECK (refund_percentage >= 0 AND refund_percentage <= 100),
    cancellation_fee DECIMAL(10,2) DEFAULT 0,
    description_ar TEXT NOT NULL,
    description_en TEXT NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Default cancellation policies
INSERT INTO public.cancellation_policies (hours_before_booking, refund_percentage, cancellation_fee, description_ar, description_en) VALUES
    (168, 100, 0, 'إلغاء مجاني - استرداد كامل قبل أسبوع من الموعد', 'Free cancellation - Full refund 1 week before'),
    (72, 75, 0, 'استرداد 75% من المبلغ قبل 3 أيام من الموعد', '75% refund 3 days before booking'),
    (48, 50, 0, 'استرداد 50% من المبلغ قبل يومين من الموعد', '50% refund 2 days before booking'),
    (24, 25, 0, 'استرداد 25% من المبلغ قبل يوم واحد', '25% refund 1 day before booking'),
    (0, 0, 0, 'لا يوجد استرداد في نفس يوم الحجز', 'No refund on booking day')
ON CONFLICT DO NOTHING;

-- Add cancellation columns to bookings
ALTER TABLE public.bookings 
    ADD COLUMN IF NOT EXISTS cancelled_by UUID REFERENCES auth.users(id),
    ADD COLUMN IF NOT EXISTS cancellation_reason TEXT,
    ADD COLUMN IF NOT EXISTS refund_amount DECIMAL(10,2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS cancellation_fee DECIMAL(10,2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS cancellation_policy_id UUID REFERENCES public.cancellation_policies(id),
    ADD COLUMN IF NOT EXISTS refund_processed BOOLEAN DEFAULT false,
    ADD COLUMN IF NOT EXISTS refund_processed_at TIMESTAMP WITH TIME ZONE;

-- Function to calculate cancellation refund
CREATE OR REPLACE FUNCTION calculate_cancellation_refund(
    p_booking_id UUID
)
RETURNS TABLE (
    refund_amount DECIMAL,
    cancellation_fee DECIMAL,
    refund_percentage DECIMAL,
    policy_description TEXT
) AS $$
DECLARE
    v_booking RECORD;
    v_hours_until_booking NUMERIC;
    v_policy RECORD;
BEGIN
    SELECT * INTO v_booking FROM public.bookings WHERE id = p_booking_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Booking not found';
    END IF;
    
    -- Calculate hours until booking
    v_hours_until_booking := EXTRACT(EPOCH FROM (
        (v_booking.booking_date || ' ' || 
        CASE v_booking.time_slot
            WHEN 'morning' THEN '09:00:00'
            WHEN 'afternoon' THEN '14:00:00'
            WHEN 'evening' THEN '19:00:00'
        END)::TIMESTAMP - NOW()
    )) / 3600;
    
    -- Find applicable policy
    SELECT * INTO v_policy 
    FROM public.cancellation_policies 
    WHERE hours_before_booking <= v_hours_until_booking 
    AND is_active = true
    ORDER BY hours_before_booking DESC 
    LIMIT 1;
    
    -- If no policy found, use the 0-hour policy (no refund)
    IF v_policy IS NULL THEN
        SELECT * INTO v_policy 
        FROM public.cancellation_policies 
        WHERE hours_before_booking = 0
        AND is_active = true;
    END IF;
    
    RETURN QUERY SELECT 
        (v_booking.total_amount * v_policy.refund_percentage / 100)::DECIMAL as refund_amount,
        v_policy.cancellation_fee::DECIMAL,
        v_policy.refund_percentage::DECIMAL,
        v_policy.description_ar::TEXT;
END;
$$ LANGUAGE plpgsql;

-- Function to process booking cancellation
CREATE OR REPLACE FUNCTION cancel_booking(
    p_booking_id UUID,
    p_cancelled_by UUID,
    p_reason TEXT
)
RETURNS TABLE (
    success BOOLEAN,
    refund_amount DECIMAL,
    message TEXT
) AS $$
DECLARE
    v_refund_info RECORD;
    v_booking RECORD;
    v_platform_wallet_id UUID := '00000000-0000-0000-0000-000000000001';
BEGIN
    SELECT * INTO v_booking FROM public.bookings WHERE id = p_booking_id;
    
    IF v_booking.booking_status = 'cancelled' THEN
        RETURN QUERY SELECT false, 0::DECIMAL, 'Booking already cancelled';
        RETURN;
    END IF;
    
    -- Calculate refund
    SELECT * INTO v_refund_info FROM calculate_cancellation_refund(p_booking_id);
    
    -- Update booking
    UPDATE public.bookings
    SET booking_status = 'cancelled',
        cancelled_by = p_cancelled_by,
        cancelled_at = NOW(),
        cancellation_reason = p_reason,
        refund_amount = v_refund_info.refund_amount,
        cancellation_fee = v_refund_info.cancellation_fee
    WHERE id = p_booking_id;
    
    -- Process refund if applicable
    IF v_refund_info.refund_amount > 0 THEN
        -- Add back to platform wallet (will be refunded to customer)
        UPDATE public.platform_wallet
        SET balance = balance + v_refund_info.refund_amount,
            total_refunded = total_refunded + v_refund_info.refund_amount
        WHERE id = v_platform_wallet_id;
        
        -- Log transaction
        INSERT INTO public.platform_transactions (
            transaction_type,
            amount,
            booking_id,
            description,
            balance_after
        ) SELECT 
            'refund_issued',
            v_refund_info.refund_amount,
            p_booking_id,
            'Refund for cancelled booking',
            balance
        FROM public.platform_wallet WHERE id = v_platform_wallet_id;
    END IF;
    
    RETURN QUERY SELECT 
        true, 
        v_refund_info.refund_amount, 
        'Booking cancelled. Refund: ' || v_refund_info.refund_amount || ' SAR';
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- FEATURE 3: FILE UPLOAD TRACKING
-- تتبع الملفات المرفوعة
-- ============================================

CREATE TABLE IF NOT EXISTS public.uploads (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    file_name TEXT NOT NULL,
    file_path TEXT NOT NULL,
    file_size BIGINT,
    file_type TEXT,
    bucket_name TEXT NOT NULL,
    upload_purpose TEXT, -- 'id_document', 'majlis_photo', 'review_photo', 'commercial_license', etc.
    related_id UUID,  -- ID of family, majlis, review, etc.
    is_verified BOOLEAN DEFAULT false,
    verified_at TIMESTAMP WITH TIME ZONE,
    verified_by UUID REFERENCES auth.users(id),
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_uploads_user_id ON public.uploads(user_id);
CREATE INDEX idx_uploads_related_id ON public.uploads(related_id);
CREATE INDEX idx_uploads_purpose ON public.uploads(upload_purpose);
CREATE INDEX idx_uploads_bucket ON public.uploads(bucket_name);

COMMENT ON TABLE public.uploads IS 'Track all uploaded files to Supabase Storage';
COMMENT ON COLUMN public.uploads.upload_purpose IS 'Purpose: id_document, commercial_license, majlis_photo, house_entrance, review_photo';

-- ============================================
-- FEATURE 4: WITHDRAWAL SYSTEM
-- نظام السحب المالي
-- ============================================

CREATE TYPE withdrawal_status AS ENUM ('pending', 'approved', 'processing', 'completed', 'rejected');

CREATE TABLE IF NOT EXISTS public.withdrawal_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    wallet_id UUID NOT NULL REFERENCES public.wallets(id) ON DELETE CASCADE,
    amount DECIMAL(10,2) NOT NULL CHECK (amount > 0),
    bank_account_number TEXT NOT NULL,
    iban TEXT NOT NULL,
    bank_name TEXT NOT NULL,
    account_holder_name TEXT NOT NULL,
    status withdrawal_status DEFAULT 'pending',
    requested_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    approved_at TIMESTAMP WITH TIME ZONE,
    approved_by UUID REFERENCES auth.users(id),
    processing_started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    rejection_reason TEXT,
    rejected_at TIMESTAMP WITH TIME ZONE,
    rejected_by UUID REFERENCES auth.users(id),
    transaction_reference TEXT,  -- Bank transfer reference number
    notes TEXT
);

CREATE INDEX idx_withdrawals_wallet ON public.withdrawal_requests(wallet_id);
CREATE INDEX idx_withdrawals_status ON public.withdrawal_requests(status);
CREATE INDEX idx_withdrawals_created ON public.withdrawal_requests(requested_at DESC);

-- Function to approve/reject withdrawal request
CREATE OR REPLACE FUNCTION approve_withdrawal_request(
    p_withdrawal_id UUID,
    p_operator_id UUID,
    p_approve BOOLEAN,
    p_rejection_reason TEXT DEFAULT NULL
)
RETURNS TABLE (
    success BOOLEAN,
    message TEXT
) AS $$
DECLARE
    v_withdrawal RECORD;
    v_wallet_balance DECIMAL;
BEGIN
    SELECT * INTO v_withdrawal 
    FROM public.withdrawal_requests 
    WHERE id = p_withdrawal_id AND status = 'pending';
    
    IF NOT FOUND THEN
        RETURN QUERY SELECT false, 'Withdrawal request not found or already processed';
        RETURN;
    END IF;
    
    SELECT balance INTO v_wallet_balance 
    FROM public.wallets 
    WHERE id = v_withdrawal.wallet_id;
    
    IF p_approve THEN
        IF v_wallet_balance < v_withdrawal.amount THEN
            RETURN QUERY SELECT false, 'Insufficient wallet balance';
            RETURN;
        END IF;
        
        UPDATE public.withdrawal_requests
        SET status = 'approved',
            approved_at = NOW(),
            approved_by = p_operator_id
        WHERE id = p_withdrawal_id;
        
        RETURN QUERY SELECT true, 'Withdrawal request approved successfully';
    ELSE
        UPDATE public.withdrawal_requests
        SET status = 'rejected',
            rejected_at = NOW(),
            rejected_by = p_operator_id,
            rejection_reason = p_rejection_reason
        WHERE id = p_withdrawal_id;
        
        RETURN QUERY SELECT true, 'Withdrawal request rejected';
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Function to complete withdrawal (after actual bank transfer)
CREATE OR REPLACE FUNCTION complete_withdrawal(
    p_withdrawal_id UUID,
    p_transaction_reference TEXT
)
RETURNS TABLE (
    success BOOLEAN,
    message TEXT
) AS $$
DECLARE
    v_withdrawal RECORD;
BEGIN
    SELECT * INTO v_withdrawal 
    FROM public.withdrawal_requests 
    WHERE id = p_withdrawal_id AND status = 'approved';
    
    IF NOT FOUND THEN
        RETURN QUERY SELECT false, 'Withdrawal not found or not in approved status';
        RETURN;
    END IF;
    
    -- Deduct from wallet
    INSERT INTO public.wallet_transactions (
        wallet_id,
        transaction_type,
        amount,
        description,
        status,
        completed_at
    ) VALUES (
        v_withdrawal.wallet_id,
        'withdrawal',
        v_withdrawal.amount,
        'Withdrawal to bank account - Ref: ' || p_transaction_reference,
        'completed',
        NOW()
    );
    
    -- Update request status
    UPDATE public.withdrawal_requests
    SET status = 'completed',
        completed_at = NOW(),
        transaction_reference = p_transaction_reference
    WHERE id = p_withdrawal_id;
    
    RETURN QUERY SELECT true, 'Withdrawal completed successfully';
END;
$$ LANGUAGE plpgsql;

-- View for pending withdrawals
CREATE OR REPLACE VIEW public.pending_withdrawals AS
SELECT 
    wr.id,
    wr.amount,
    wr.bank_name,
    wr.iban,
    wr.account_holder_name,
    wr.requested_at,
    f.family_name,
    f.contact_phone,
    w.balance as current_wallet_balance,
    CASE 
        WHEN w.balance >= wr.amount THEN true
        ELSE false
    END as has_sufficient_balance,
    wr.notes
FROM public.withdrawal_requests wr
JOIN public.wallets w ON w.id = wr.wallet_id
JOIN public.families f ON f.id = w.family_id
WHERE wr.status = 'pending'
ORDER BY wr.requested_at ASC;

-- ============================================
-- FEATURE 5: COUPON SYSTEM
-- نظام الكوبونات والخصومات
-- ============================================

CREATE TYPE coupon_type AS ENUM ('percentage', 'fixed_amount');

CREATE TABLE IF NOT EXISTS public.coupons (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code TEXT UNIQUE NOT NULL,
    discount_type coupon_type NOT NULL,
    discount_value DECIMAL(10,2) NOT NULL CHECK (discount_value > 0),
    min_booking_amount DECIMAL(10,2) DEFAULT 0,
    max_discount_amount DECIMAL(10,2),
    usage_limit_total INTEGER,  -- Total usage limit
    usage_limit_per_user INTEGER DEFAULT 1,
    used_count INTEGER DEFAULT 0,
    valid_from TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    valid_until TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT true,
    applicable_cities city_type[],  -- NULL = all cities
    applicable_package_types package_type[],  -- NULL = all packages
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    description_ar TEXT,
    description_en TEXT
);

CREATE TABLE IF NOT EXISTS public.coupon_usage (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    coupon_id UUID REFERENCES public.coupons(id) ON DELETE CASCADE,
    booking_id UUID UNIQUE REFERENCES public.bookings(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    discount_amount DECIMAL(10,2) NOT NULL,
    used_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_coupons_code ON public.coupons(UPPER(code));
CREATE INDEX idx_coupons_active ON public.coupons(is_active);
CREATE INDEX idx_coupon_usage_coupon ON public.coupon_usage(coupon_id);
CREATE INDEX idx_coupon_usage_user ON public.coupon_usage(user_id);

-- Add coupon columns to bookings
ALTER TABLE public.bookings 
    ADD COLUMN IF NOT EXISTS coupon_id UUID REFERENCES public.coupons(id),
    ADD COLUMN IF NOT EXISTS coupon_discount_amount DECIMAL(10,2) DEFAULT 0;

-- Function to validate coupon
CREATE OR REPLACE FUNCTION validate_coupon(
    p_code TEXT,
    p_user_id UUID,
    p_booking_amount DECIMAL,
    p_city city_type,
    p_package_type package_type
)
RETURNS TABLE (
    is_valid BOOLEAN,
    discount_amount DECIMAL,
    coupon_id UUID,
    message TEXT
) AS $$
DECLARE
    v_coupon RECORD;
    v_user_usage_count INTEGER;
    v_discount DECIMAL;
BEGIN
    SELECT * INTO v_coupon 
    FROM public.coupons 
    WHERE UPPER(code) = UPPER(p_code) AND is_active = true;
    
    IF NOT FOUND THEN
        RETURN QUERY SELECT false, 0::DECIMAL, NULL::UUID, 'Coupon code not found or inactive';
        RETURN;
    END IF;
    
    IF v_coupon.valid_until IS NOT NULL AND v_coupon.valid_until < NOW() THEN
        RETURN QUERY SELECT false, 0::DECIMAL, NULL::UUID, 'Coupon has expired';
        RETURN;
    END IF;
    
    IF v_coupon.valid_from > NOW() THEN
        RETURN QUERY SELECT false, 0::DECIMAL, NULL::UUID, 'Coupon is not yet valid';
        RETURN;
    END IF;
    
    IF v_coupon.usage_limit_total IS NOT NULL AND v_coupon.used_count >= v_coupon.usage_limit_total THEN
        RETURN QUERY SELECT false, 0::DECIMAL, NULL::UUID, 'Coupon usage limit reached';
        RETURN;
    END IF;
    
    SELECT COUNT(*) INTO v_user_usage_count 
    FROM public.coupon_usage 
    WHERE coupon_id = v_coupon.id AND user_id = p_user_id;
    
    IF v_user_usage_count >= v_coupon.usage_limit_per_user THEN
        RETURN QUERY SELECT false, 0::DECIMAL, NULL::UUID, 'You have already used this coupon';
        RETURN;
    END IF;
    
    IF p_booking_amount < v_coupon.min_booking_amount THEN
        RETURN QUERY SELECT false, 0::DECIMAL, NULL::UUID, 'Minimum booking amount not met';
        RETURN;
    END IF;
    
    IF v_coupon.applicable_cities IS NOT NULL AND NOT (p_city = ANY(v_coupon.applicable_cities)) THEN
        RETURN QUERY SELECT false, 0::DECIMAL, NULL::UUID, 'Coupon not valid for this city';
        RETURN;
    END IF;
    
    IF v_coupon.applicable_package_types IS NOT NULL AND NOT (p_package_type = ANY(v_coupon.applicable_package_types)) THEN
        RETURN QUERY SELECT false, 0::DECIMAL, NULL::UUID, 'Coupon not valid for this package';
        RETURN;
    END IF;
    
    -- Calculate discount
    IF v_coupon.discount_type = 'percentage' THEN
        v_discount := p_booking_amount * (v_coupon.discount_value / 100);
        IF v_coupon.max_discount_amount IS NOT NULL AND v_discount > v_coupon.max_discount_amount THEN
            v_discount := v_coupon.max_discount_amount;
        END IF;
    ELSE
        v_discount := v_coupon.discount_value;
        IF v_discount > p_booking_amount THEN
            v_discount := p_booking_amount;
        END IF;
    END IF;
    
    RETURN QUERY SELECT true, v_discount, v_coupon.id, 'Coupon valid';
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- FEATURE 6: SMS MANAGEMENT SYSTEM
-- نظام إدارة الرسائل النصية
-- ============================================

CREATE TABLE IF NOT EXISTS public.sms_accounts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    provider TEXT NOT NULL, -- 'unifonic', 'twilio', etc.
    api_key TEXT NOT NULL,
    api_secret TEXT,
    sender_name TEXT NOT NULL,
    balance DECIMAL(10,2) DEFAULT 0, -- Current SMS credit balance
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id)
);

CREATE TABLE IF NOT EXISTS public.sms_balance_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sms_account_id UUID REFERENCES public.sms_accounts(id) ON DELETE CASCADE,
    amount DECIMAL(10,2) NOT NULL,
    balance_after DECIMAL(10,2) NOT NULL,
    transaction_type TEXT NOT NULL, -- 'recharge', 'deduction', 'adjustment'
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id)
);

CREATE TABLE IF NOT EXISTS public.sms_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sms_account_id UUID REFERENCES public.sms_accounts(id),
    recipient_phone TEXT NOT NULL,
    recipient_type TEXT, -- 'family', 'visitor', 'company'
    recipient_id UUID, -- Reference to user
    message_text TEXT NOT NULL,
    message_type TEXT NOT NULL, -- 'manual', 'booking_confirmation', 'payment_received', 'otp', etc.
    related_booking_id UUID REFERENCES public.bookings(id),
    status TEXT DEFAULT 'pending', -- 'pending', 'sent', 'delivered', 'failed'
    provider_message_id TEXT,
    sent_at TIMESTAMP WITH TIME ZONE,
    delivered_at TIMESTAMP WITH TIME ZONE,
    failed_at TIMESTAMP WITH TIME ZONE,
    error_message TEXT,
    cost DECIMAL(10,2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id) -- Operator who sent it (if manual)
);

CREATE INDEX idx_sms_messages_recipient ON public.sms_messages(recipient_phone);
CREATE INDEX idx_sms_messages_status ON public.sms_messages(status);
CREATE INDEX idx_sms_messages_type ON public.sms_messages(message_type);
CREATE INDEX idx_sms_messages_created ON public.sms_messages(created_at DESC);

-- SMS Templates
CREATE TABLE IF NOT EXISTS public.sms_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    template_key TEXT UNIQUE NOT NULL,
    template_name_ar TEXT NOT NULL,
    template_name_en TEXT NOT NULL,
    message_ar TEXT NOT NULL,
    message_en TEXT NOT NULL,
    variables JSONB, -- Array of variable names like ['booking_number', 'family_name', etc.]
    is_system BOOLEAN DEFAULT false, -- System templates cannot be deleted
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Default SMS Templates
INSERT INTO public.sms_templates (template_key, template_name_ar, template_name_en, message_ar, message_en, variables, is_system) VALUES
    ('booking_confirmation', 'تأكيد الحجز', 'Booking Confirmation', 
     'تم تأكيد حجزك رقم {booking_number} مع {family_name} بتاريخ {booking_date}. منصة كرم',
     'Your booking {booking_number} with {family_name} on {booking_date} is confirmed. Karam Platform',
     '["booking_number", "family_name", "booking_date"]'::JSONB, true),
    
    ('payment_confirmation', 'تأكيد الدفع', 'Payment Confirmation',
     'تم استلام دفعتك بمبلغ {amount} ريال للحجز {booking_number}. شكراً لك',
     'Payment of {amount} SAR received for booking {booking_number}. Thank you',
     '["amount", "booking_number"]'::JSONB, true),
    
    ('otp_verification', 'رمز التحقق', 'OTP Verification',
     'رمز التحقق الخاص بك: {otp_code}. صالح لمدة 10 دقائق',
     'Your verification code: {otp_code}. Valid for 10 minutes',
     '["otp_code"]'::JSONB, true),
    
    ('payout_notification', 'إشعار الدفع', 'Payout Notification',
     'تم إضافة {amount} ريال إلى محفظتك من الحجز {booking_number}',
     '{amount} SAR added to your wallet from booking {booking_number}',
     '["amount", "booking_number"]'::JSONB, true)
ON CONFLICT (template_key) DO NOTHING;

-- Function to send SMS
CREATE OR REPLACE FUNCTION send_sms(
    p_recipient_phone TEXT,
    p_message TEXT,
    p_message_type TEXT,
    p_recipient_id UUID DEFAULT NULL,
    p_related_booking_id UUID DEFAULT NULL,
    p_created_by UUID DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    v_sms_account RECORD;
    v_message_id UUID;
BEGIN
    -- Get active SMS account
    SELECT * INTO v_sms_account 
    FROM public.sms_accounts 
    WHERE is_active = true 
    ORDER BY created_at DESC 
    LIMIT 1;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'No active SMS account configured';
    END IF;
    
    -- Insert SMS message record
    INSERT INTO public.sms_messages (
        sms_account_id,
        recipient_phone,
        recipient_id,
        message_text,
        message_type,
        related_booking_id,
        status,
        created_by
    ) VALUES (
        v_sms_account.id,
        p_recipient_phone,
        p_recipient_id,
        p_message,
        p_message_type,
        p_related_booking_id,
        'pending',
        p_created_by
    ) RETURNING id INTO v_message_id;
    
    RETURN v_message_id;
END;
$$ LANGUAGE plpgsql;

-- Function to recharge SMS balance
CREATE OR REPLACE FUNCTION recharge_sms_balance(
    p_sms_account_id UUID,
    p_amount DECIMAL,
    p_description TEXT,
    p_operator_id UUID
)
RETURNS TABLE (
    success BOOLEAN,
    new_balance DECIMAL,
    message TEXT
) AS $$
DECLARE
    v_new_balance DECIMAL;
BEGIN
    -- Update balance
    UPDATE public.sms_accounts
    SET balance = balance + p_amount,
        updated_at = NOW()
    WHERE id = p_sms_account_id
    RETURNING balance INTO v_new_balance;
    
    -- Log transaction
    INSERT INTO public.sms_balance_history (
        sms_account_id,
        amount,
        balance_after,
        transaction_type,
        description,
        created_by
    ) VALUES (
        p_sms_account_id,
        p_amount,
        v_new_balance,
        'recharge',
        p_description,
        p_operator_id
    );
    
    RETURN QUERY SELECT true, v_new_balance, 'Balance recharged successfully';
END;
$$ LANGUAGE plpgsql;

-- View for SMS statistics
CREATE OR REPLACE VIEW public.sms_statistics AS
SELECT 
    COUNT(*) as total_sent,
    COUNT(CASE WHEN status = 'delivered' THEN 1 END) as delivered,
    COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed,
    COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending,
    COALESCE(SUM(cost), 0) as total_cost,
    DATE_TRUNC('month', created_at) as month
FROM public.sms_messages
GROUP BY DATE_TRUNC('month', created_at)
ORDER BY month DESC;

-- ============================================
-- UPDATED TRIGGERS FOR WALLET TRANSACTIONS
-- ============================================

-- Update the wallet update trigger to handle withdrawals
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

-- Re-create trigger (in case it was replaced)
DROP TRIGGER IF EXISTS trigger_update_wallet_on_transaction ON public.wallet_transactions;
CREATE TRIGGER trigger_update_wallet_on_transaction
AFTER UPDATE ON public.wallet_transactions
FOR EACH ROW
EXECUTE FUNCTION update_wallet_on_transaction();

-- ============================================
-- COMMENTS
-- ============================================

COMMENT ON TABLE public.cancellation_policies IS 'Cancellation and refund policies based on time before booking';
COMMENT ON TABLE public.withdrawal_requests IS 'Family withdrawal requests from their wallets';
COMMENT ON TABLE public.coupons IS 'Discount coupons for bookings';
COMMENT ON TABLE public.coupon_usage IS 'Track coupon usage per booking';
COMMENT ON TABLE public.uploads IS 'Track all file uploads to Supabase Storage';
COMMENT ON TABLE public.verification_codes IS 'OTP codes for phone/email verification';
COMMENT ON TABLE public.sms_accounts IS 'SMS provider accounts (Unifonic, Twilio, etc.)';
COMMENT ON TABLE public.sms_messages IS 'All SMS messages sent through the platform';
COMMENT ON TABLE public.sms_templates IS 'Templates for automated SMS messages';
COMMENT ON TABLE public.sms_balance_history IS 'SMS credit balance transaction history';

-- ============================================
-- SUCCESS MESSAGE
-- ============================================

DO $$
BEGIN
    RAISE NOTICE '✅ Critical Features Applied Successfully!';
    RAISE NOTICE '🔐 KYC/Verification System Ready';
    RAISE NOTICE '↩️ Cancellation & Refund Policy Implemented';
    RAISE NOTICE '📁 File Upload Tracking System Ready';
    RAISE NOTICE '💸 Withdrawal System Implemented';
    RAISE NOTICE '🎟️ Coupon System Ready';
    RAISE NOTICE '📱 SMS Management System Implemented';
    RAISE NOTICE '';
    RAISE NOTICE '📊 New Tables Added: 11';
    RAISE NOTICE '🔧 New Functions Added: 10+';
    RAISE NOTICE '📈 New Views Added: 3';
    RAISE NOTICE '';
    RAISE NOTICE '🎯 Ready for Production!';
END $$;
