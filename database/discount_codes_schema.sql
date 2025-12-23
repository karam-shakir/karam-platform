-- Discount Codes Table
-- جدول أكواد الخصم
CREATE TABLE IF NOT EXISTS public.discount_codes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    code VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    discount_type VARCHAR(20) NOT NULL CHECK (discount_type IN ('percentage', 'fixed')),
    discount_value DECIMAL(10, 2) NOT NULL CHECK (discount_value > 0),
    valid_from TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    valid_until TIMESTAMP WITH TIME ZONE,
    usage_limit INTEGER DEFAULT NULL, -- NULL means unlimited
    times_used INTEGER DEFAULT 0,
    applicable_families JSONB DEFAULT '[]'::jsonb, -- Array of family IDs, empty array means all families
    min_booking_amount DECIMAL(10, 2) DEFAULT 0, -- Minimum booking amount to apply discount
    is_active BOOLEAN DEFAULT TRUE,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT valid_dates CHECK (valid_until IS NULL OR valid_until > valid_from),
    CONSTRAINT valid_usage CHECK (usage_limit IS NULL OR usage_limit > 0)
);

-- Index for faster code lookups
CREATE INDEX idx_discount_codes_code ON public.discount_codes(code) WHERE is_active = TRUE;
CREATE INDEX idx_discount_codes_active ON public.discount_codes(is_active, valid_from, valid_until);

-- RLS Policies
ALTER TABLE public.discount_codes ENABLE ROW LEVEL SECURITY;

-- Public can view active codes (for validation)
CREATE POLICY "Anyone can view active discount codes" 
    ON public.discount_codes FOR SELECT
    USING (is_active = TRUE AND (valid_until IS NULL OR valid_until > NOW()));

-- Only admins can insert/update/delete
CREATE POLICY "Only admins can manage discount codes"
    ON public.discount_codes FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.user_profiles
            WHERE user_profiles.id = auth.uid()
            AND user_profiles.user_type = 'admin'
        )
    );

-- Update bookings table with new columns
DO $$ 
BEGIN
    -- Add visitor_names column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'bookings' AND column_name = 'visitor_names') THEN
        ALTER TABLE public.bookings 
        ADD COLUMN visitor_names JSONB DEFAULT '[]'::jsonb;
    END IF;

    -- Add discount_code_id column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'bookings' AND column_name = 'discount_code_id') THEN
        ALTER TABLE public.bookings 
        ADD COLUMN discount_code_id UUID REFERENCES public.discount_codes(id) ON DELETE SET NULL;
    END IF;

    -- Add discount_amount column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'bookings' AND column_name = 'discount_amount') THEN
        ALTER TABLE public.bookings 
        ADD COLUMN discount_amount DECIMAL(10, 2) DEFAULT 0;
    END IF;

    -- Add emergency_contact column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'bookings' AND column_name = 'emergency_contact') THEN
        ALTER TABLE public.bookings 
        ADD COLUMN emergency_contact VARCHAR(20);
    END IF;

    -- Add special_requests column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'bookings' AND column_name = 'special_requests') THEN
        ALTER TABLE public.bookings 
        ADD COLUMN special_requests TEXT;
    END IF;
END $$;

-- Add index for discount code lookups
CREATE INDEX IF NOT EXISTS idx_bookings_discount_code ON public.bookings(discount_code_id) WHERE discount_code_id IS NOT NULL;

-- Function to validate and apply discount code
CREATE OR REPLACE FUNCTION public.validate_discount_code(
    p_code VARCHAR(50),
    p_family_id UUID,
    p_booking_amount DECIMAL(10, 2)
)
RETURNS TABLE (
    is_valid BOOLEAN,
    discount_id UUID,
    discount_type VARCHAR(20),
    discount_value DECIMAL(10, 2),
    discount_amount DECIMAL(10, 2),
    message TEXT
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_discount_record RECORD;
    v_calculated_discount DECIMAL(10, 2);
BEGIN
    -- Get discount code
    SELECT * INTO v_discount_record
    FROM public.discount_codes
    WHERE code = p_code AND is_active = TRUE;

    -- Check if code exists
    IF v_discount_record IS NULL THEN
        RETURN QUERY SELECT FALSE, NULL::UUID, NULL::VARCHAR, NULL::DECIMAL, 
                     0::DECIMAL, 'كود الخصم غير صحيح أو منتهي الصلاحية';
        RETURN;
    END IF;

    -- Check if code is still valid (date range)
    IF v_discount_record.valid_from > NOW() THEN
        RETURN QUERY SELECT FALSE, NULL::UUID, NULL::VARCHAR, NULL::DECIMAL,
                     0::DECIMAL, 'كود الخصم غير صالح بعد';
        RETURN;
    END IF;

    IF v_discount_record.valid_until IS NOT NULL AND v_discount_record.valid_until < NOW() THEN
        RETURN QUERY SELECT FALSE, NULL::UUID, NULL::VARCHAR, NULL::DECIMAL,
                     0::DECIMAL, 'كود الخصم منتهي الصلاحية';
        RETURN;
    END IF;

    -- Check usage limit
    IF v_discount_record.usage_limit IS NOT NULL AND 
       v_discount_record.times_used >= v_discount_record.usage_limit THEN
        RETURN QUERY SELECT FALSE, NULL::UUID, NULL::VARCHAR, NULL::DECIMAL,
                     0::DECIMAL, 'تم استخدام الكود بالحد الأقصى';
        RETURN;
    END IF;

    -- Check minimum booking amount
    IF p_booking_amount < v_discount_record.min_booking_amount THEN
        RETURN QUERY SELECT FALSE, NULL::UUID, NULL::VARCHAR, NULL::DECIMAL,
                     0::DECIMAL, 'المبلغ أقل من الحد الأدنى للخصم';
        RETURN;
    END IF;

    -- Check if applicable to this family
    IF jsonb_array_length(v_discount_record.applicable_families) > 0 AND
       NOT (v_discount_record.applicable_families @> jsonb_build_array(p_family_id::text)) THEN
        RETURN QUERY SELECT FALSE, NULL::UUID, NULL::VARCHAR, NULL::DECIMAL,
                     0::DECIMAL, 'هذا الكود غير مطبق على هذه الأسرة';
        RETURN;
    END IF;

    -- Calculate discount amount
    IF v_discount_record.discount_type = 'percentage' THEN
        v_calculated_discount := ROUND(p_booking_amount * (v_discount_record.discount_value / 100), 2);
    ELSE
        v_calculated_discount := v_discount_record.discount_value;
    END IF;

    -- Discount cannot exceed booking amount
    IF v_calculated_discount > p_booking_amount THEN
        v_calculated_discount := p_booking_amount;
    END IF;

    -- Return success
    RETURN QUERY SELECT 
        TRUE,
        v_discount_record.id,
        v_discount_record.discount_type,
        v_discount_record.discount_value,
        v_calculated_discount,
        'تم تطبيق الخصم بنجاح';
END;
$$;

-- Function to increment discount code usage
CREATE OR REPLACE FUNCTION public.increment_discount_usage()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    IF NEW.discount_code_id IS NOT NULL THEN
        UPDATE public.discount_codes
        SET times_used = times_used + 1,
            updated_at = NOW()
        WHERE id = NEW.discount_code_id;
    END IF;
    RETURN NEW;
END;
$$;

-- Trigger to increment usage when booking is confirmed
DROP TRIGGER IF EXISTS trigger_increment_discount_usage ON public.bookings;
CREATE TRIGGER trigger_increment_discount_usage
    AFTER INSERT ON public.bookings
    FOR EACH ROW
    WHEN (NEW.discount_code_id IS NOT NULL)
    EXECUTE FUNCTION public.increment_discount_usage();

-- Grant necessary permissions
GRANT SELECT ON public.discount_codes TO authenticated;
GRANT ALL ON public.discount_codes TO service_role;
GRANT EXECUTE ON FUNCTION public.validate_discount_code TO authenticated;
GRANT EXECUTE ON FUNCTION public.increment_discount_usage TO authenticated;

COMMENT ON TABLE public.discount_codes IS 'Stores discount codes for bookings';
COMMENT ON COLUMN public.discount_codes.applicable_families IS 'Empty array means applicable to all families, otherwise specific family IDs';
COMMENT ON FUNCTION public.validate_discount_code IS 'Validates a discount code and calculates the discount amount';
