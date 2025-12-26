# 🎯 خطة التنفيذ المحدثة - Phase 1.5
## إضافة المتطلبات الحرجة المفقودة

---

## 📋 الأولوية: المتطلبات الحرجة (🔴)

### ملف SQL إضافي: `critical_features.sql`

يجب تطبيقه **بعد** `enhanced_features.sql`

---

## 🔴 **Feature 1: التحقق من الهوية (KYC)**

```sql
-- إضافة حقول التحقق للعوائل
ALTER TABLE public.families ADD COLUMN IF NOT EXISTS
    id_document_url TEXT,
    id_verified BOOLEAN DEFAULT false,
    id_verified_at TIMESTAMP WITH TIME ZONE,
    id_verified_by UUID REFERENCES auth.users(id),
    phone_verified BOOLEAN DEFAULT false,
    phone_verified_at TIMESTAMP WITH TIME ZONE,
    email_verified BOOLEAN DEFAULT false,
    email_verified_at TIMESTAMP WITH TIME ZONE;

-- إضافة حقول التحقق للشركات
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS
    commercial_license_url TEXT,
    license_verified BOOLEAN DEFAULT false,
    license_verified_at TIMESTAMP WITH TIME ZONE,
    license_verified_by UUID REFERENCES auth.users(id),
    phone_verified BOOLEAN DEFAULT false,
    email_verified BOOLEAN DEFAULT false;

COMMENT ON COLUMN public.families.id_document_url IS 'URL to national ID document in storage';
COMMENT ON COLUMN public.companies.commercial_license_url IS 'URL to CR document in storage';
```

---

## 🔴 **Feature 2: سياسة الإلغاء والاسترجاع**

```sql
CREATE TABLE IF NOT EXISTS public.cancellation_policies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    hours_before_booking INTEGER NOT NULL,
    refund_percentage DECIMAL(5,2) NOT NULL CHECK (refund_percentage >= 0 AND refund_percentage <= 100),
    cancellation_fee DECIMAL(10,2) DEFAULT 0,
    description_ar TEXT NOT NULL,
    description_en TEXT NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- سياسات افتراضية
INSERT INTO public.cancellation_policies (hours_before_booking, refund_percentage, cancellation_fee, description_ar, description_en) VALUES
    (168, 100, 0, 'إلغاء مجاني قبل أسبوع من الموعد', 'Free cancellation 1 week before'),
    (72, 75, 0, 'استرداد 75% قبل 3 أيام', '75% refund 3 days before'),
    (48, 50, 0, 'استرداد 50% قبل يومين', '50% refund 2 days before'),
    (24, 25, 0, 'استرداد 25% قبل يوم واحد', '25% refund 1 day before'),
    (0, 0, 0, 'لا يوجد استرداد في نفس اليوم', 'No refund on same day')
ON CONFLICT DO NOTHING;

-- إضافة حقول للحجوزات
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS
    cancelled_by UUID REFERENCES auth.users(id),
    cancellation_reason TEXT,
    refund_amount DECIMAL(10,2) DEFAULT 0,
    cancellation_fee DECIMAL(10,2) DEFAULT 0,
    refund_processed BOOLEAN DEFAULT false,
    refund_processed_at TIMESTAMP WITH TIME ZONE;

-- Function لحساب سياسة الإلغاء
CREATE OR REPLACE FUNCTION calculate_cancellation_refund(
    p_booking_id UUID
)
RETURNS TABLE (
    refund_amount DECIMAL,
    cancellation_fee DECIMAL,
    refund_percentage DECIMAL
) AS $$
DECLARE
    v_booking RECORD;
    v_hours_until_booking INTEGER;
    v_policy RECORD;
BEGIN
    SELECT * INTO v_booking FROM public.bookings WHERE id = p_booking_id;
    
    v_hours_until_booking := EXTRACT(EPOCH FROM (v_booking.booking_date - NOW())) / 3600;
    
    SELECT * INTO v_policy 
    FROM public.cancellation_policies 
    WHERE hours_before_booking <= v_hours_until_booking 
    AND is_active = true
    ORDER BY hours_before_booking DESC 
    LIMIT 1;
    
    IF v_policy IS NULL THEN
        SELECT * INTO v_policy 
        FROM public.cancellation_policies 
        WHERE hours_before_booking = 0;
    END IF;
    
    RETURN QUERY SELECT 
        (v_booking.total_amount * v_policy.refund_percentage / 100)::DECIMAL as refund_amount,
        v_policy.cancellation_fee,
        v_policy.refund_percentage;
END;
$$ LANGUAGE plpgsql;
```

---

## 🔴 **Feature 3: نظام رفع الملفات (Storage Buckets)**

```sql
-- جدول لتتبع الملفات المرفوعة
CREATE TABLE IF NOT EXISTS public.uploads (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    file_name TEXT NOT NULL,
    file_path TEXT NOT NULL,
    file_size BIGINT,
    file_type TEXT,
    bucket_name TEXT NOT NULL,
    upload_purpose TEXT, -- 'id_document', 'majlis_photo', 'review_photo', etc.
    related_id UUID,  -- ID of family, majlis, review, etc.
    is_verified BOOLEAN DEFAULT false,
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_uploads_user_id ON public.uploads(user_id);
CREATE INDEX idx_uploads_related_id ON public.uploads(related_id);
CREATE INDEX idx_uploads_purpose ON public.uploads(upload_purpose);

COMMENT ON TABLE public.uploads IS 'Track all uploaded files to Supabase Storage';
```

**Supabase Storage Buckets (يدوي من Dashboard)**:
- `family-documents` - private
- `majlis-photos` - public
- `review-photos` - public
- `company-documents` - private

---

## 🔴 **Feature 4: نظام السحب المالي**

```sql
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
    transaction_reference TEXT,  -- لرقم التحويل البنكي
    notes TEXT
);

CREATE INDEX idx_withdrawals_wallet ON public.withdrawal_requests(wallet_id);
CREATE INDEX idx_withdrawals_status ON public.withdrawal_requests(status);
CREATE INDEX idx_withdrawals_created ON public.withdrawal_requests(requested_at DESC);

-- Function للموافقة على طلب السحب
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
    SELECT * INTO v_withdrawal FROM public.withdrawal_requests WHERE id = p_withdrawal_id AND status = 'pending';
    
    IF NOT FOUND THEN
        RETURN QUERY SELECT false, 'Withdrawal request not found or already processed';
        RETURN;
    END IF;
    
    SELECT balance INTO v_wallet_balance FROM public.wallets WHERE id = v_withdrawal.wallet_id;
    
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

-- Function لإكمال السحب (بعد التحويل البنكي الفعلي)
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
    SELECT * INTO v_withdrawal FROM public.withdrawal_requests WHERE id = p_withdrawal_id AND status = 'approved';
    
    IF NOT FOUND THEN
        RETURN QUERY SELECT false, 'Withdrawal not found or not in approved status';
        RETURN;
    END IF;
    
    -- خصم من المحفظة
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
        'Withdrawal request #' || v_withdrawal.id,
        'completed',
        NOW()
    );
    
    -- تحديث حالة الطلب
    UPDATE public.withdrawal_requests
    SET status = 'completed',
        completed_at = NOW(),
        transaction_reference = p_transaction_reference
    WHERE id = p_withdrawal_id;
    
    RETURN QUERY SELECT true, 'Withdrawal completed successfully';
END;
$$ LANGUAGE plpgsql;

-- View لطلبات السحب المعلقة
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
    END as has_sufficient_balance
FROM public.withdrawal_requests wr
JOIN public.wallets w ON w.id = wr.wallet_id
JOIN public.families f ON f.id = w.family_id
WHERE wr.status = 'pending'
ORDER BY wr.requested_at ASC;
```

---

## 🔴 **Feature 5: نظام الكوبونات**

```sql
CREATE TYPE coupon_type AS ENUM ('percentage', 'fixed_amount');

CREATE TABLE IF NOT EXISTS public.coupons (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code TEXT UNIQUE NOT NULL,
    discount_type coupon_type NOT NULL,
    discount_value DECIMAL(10,2) NOT NULL CHECK (discount_value > 0),
    min_booking_amount DECIMAL(10,2) DEFAULT 0,
    max_discount_amount DECIMAL(10,2),
    usage_limit_total INTEGER,  -- إجمالي الاستخدامات المسموحة
    usage_limit_per_user INTEGER DEFAULT 1,
    used_count INTEGER DEFAULT 0,
    valid_from TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    valid_until TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT true,
    applicable_cities city_type[],  -- NULL = جميع المدن
    applicable_package_types package_type[],  -- NULL = جميع الباقات
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

CREATE INDEX idx_coupons_code ON public.coupons(code);
CREATE INDEX idx_coupons_active ON public.coupons(is_active);
CREATE INDEX idx_coupon_usage_coupon ON public.coupon_usage(coupon_id);
CREATE INDEX idx_coupon_usage_user ON public.coupon_usage(user_id);

-- Function للتحقق من الكوبون
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
    message TEXT
) AS $$
DECLARE
    v_coupon RECORD;
    v_user_usage_count INTEGER;
    v_discount DECIMAL;
BEGIN
    SELECT * INTO v_coupon FROM public.coupons WHERE code = UPPER(p_code) AND is_active = true;
    
    IF NOT FOUND THEN
        RETURN QUERY SELECT false, 0::DECIMAL, 'Coupon code not found or inactive';
        RETURN;
    END IF;
    
    IF v_coupon.valid_until IS NOT NULL AND v_coupon.valid_until < NOW() THEN
        RETURN QUERY SELECT false, 0::DECIMAL, 'Coupon has expired';
        RETURN;
    END IF;
    
    IF v_coupon.valid_from > NOW() THEN
        RETURN QUERY SELECT false, 0::DECIMAL, 'Coupon is not yet valid';
        RETURN;
    END IF;
    
    IF v_coupon.usage_limit_total IS NOT NULL AND v_coupon.used_count >= v_coupon.usage_limit_total THEN
        RETURN QUERY SELECT false, 0::DECIMAL, 'Coupon usage limit reached';
        RETURN;
    END IF;
    
    SELECT COUNT(*) INTO v_user_usage_count 
    FROM public.coupon_usage 
    WHERE coupon_id = v_coupon.id AND user_id = p_user_id;
    
    IF v_user_usage_count >= v_coupon.usage_limit_per_user THEN
        RETURN QUERY SELECT false, 0::DECIMAL, 'You have already used this coupon';
        RETURN;
    END IF;
    
    IF p_booking_amount < v_coupon.min_booking_amount THEN
        RETURN QUERY SELECT false, 0::DECIMAL, 'Minimum booking amount not met';
        RETURN;
    END IF;
    
    IF v_coupon.applicable_cities IS NOT NULL AND NOT (p_city = ANY(v_coupon.applicable_cities)) THEN
        RETURN QUERY SELECT false, 0::DECIMAL, 'Coupon not valid for this city';
        RETURN;
    END IF;
    
    IF v_coupon.applicable_package_types IS NOT NULL AND NOT (p_package_type = ANY(v_coupon.applicable_package_types)) THEN
        RETURN QUERY SELECT false, 0::DECIMAL, 'Coupon not valid for this package';
        RETURN;
    END IF;
    
    IF v_coupon.discount_type = 'percentage' THEN
        v_discount := p_booking_amount * (v_coupon.discount_value / 100);
        IF v_coupon.max_discount_amount IS NOT NULL AND v_discount > v_coupon.max_discount_amount THEN
            v_discount := v_coupon.max_discount_amount;
        END IF;
    ELSE
        v_discount := v_coupon.discount_value;
    END IF;
    
    RETURN QUERY SELECT true, v_discount, 'Coupon valid';
END;
$$ LANGUAGE plpgsql;

-- إضافة حقول للحجوزات
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS
    coupon_id UUID REFERENCES public.coupons(id),
    coupon_discount_amount DECIMAL(10,2) DEFAULT 0;
```

---

## ✅ Success Message

```sql
DO $$
BEGIN
    RAISE NOTICE '✅ Critical Features Applied Successfully!';
    RAISE NOTICE '🔐 KYC/Verification columns added';
    RAISE NOTICE '↩️ Cancellation policy system created';
    RAISE NOTICE '📁 File uploads tracking ready';
    RAISE NOTICE '💸 Withdrawal system implemented';
    RAISE NOTICE '🎟️ Coupon system ready';
END $$;
```

---

## 📋 ترتيب التطبيق

```
1. complete_schema.sql          ← الأساس
2. rls_policies.sql             ← الأمان الأساسي
3. enhanced_features.sql        ← المحفظة + التقارير + النظام الهجين
4. critical_features.sql        ← الميزات الحرجة ⭐ جديد
5. rls_policies_extended.sql   ← الأمان للميزات الجديدة (سيتم إنشاؤه)
```

---

**هل تريد أن أقوم بإنشاء ملف `critical_features.sql` الكامل الآن؟** 🚀

---

**تم الإعداد بواسطة**: Dr. Shakir Alhuthali  
**التاريخ**: 2025-12-25  
**المشروع**: Karam Platform 🌟
