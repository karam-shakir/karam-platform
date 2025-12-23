-- ===================================
-- Create Operator User for Testing
-- إنشاء مستخدم مشغل للاختبار
-- ===================================

-- This creates an operator user that can access operator-dashboard.html
-- You'll use these credentials to login

DO $$
DECLARE
    operator_user_id UUID := gen_random_uuid();
BEGIN
    -- Create user profile for operator (using 'admin' type since 'operator' is not allowed)
    INSERT INTO user_profiles (id, user_type, full_name)
    VALUES (
        operator_user_id,
        'admin',  -- Use 'admin' instead of 'operator'
        'مشغل المنصة - اختبار'
    );
    
    RAISE NOTICE 'Admin/Operator user created with ID: %', operator_user_id;
    RAISE NOTICE 'To login, you need to create an auth user in Supabase Auth';
END $$;

-- ===================================
-- Alternative: Quick Login Bypass
-- بديل: تجاوز سريع لتسجيل الدخول
-- ===================================

-- For testing purposes, you can manually set localStorage
-- Open browser console (F12) on operator-dashboard.html and run:

/*
localStorage.setItem('user', JSON.stringify({
    id: 'test-operator-id',
    email: 'operator@karam.sa',
    role: 'operator',
    full_name: 'مشغل المنصة'
}));
location.reload();
*/

-- ===================================
-- Verification
-- ===================================

-- Check operator users
SELECT id, user_type, full_name, created_at
FROM user_profiles
WHERE user_type = 'operator';
