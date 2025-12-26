-- ============================================
-- Karam Platform - Database Cleanup
-- تنظيف قاعدة البيانات
-- ============================================
-- Use this to reset the database before applying schemas
-- استخدم هذا لإعادة تعيين قاعدة البيانات قبل تطبيق السكريبتات
-- ============================================

-- Drop all custom indexes first
DO $$ 
DECLARE 
    r RECORD;
BEGIN
    FOR r IN (
        SELECT indexname 
        FROM pg_indexes 
        WHERE schemaname = 'public'
        AND indexname LIKE 'idx_%'
    ) LOOP
        EXECUTE 'DROP INDEX IF EXISTS public.' || r.indexname || ' CASCADE;';
    END LOOP;
END $$;

-- Drop all tables (in correct order to avoid foreign key conflicts)
DROP TABLE IF EXISTS public.coupon_usage CASCADE;
DROP TABLE IF EXISTS public.coupons CASCADE;
DROP TABLE IF EXISTS public.sms_messages CASCADE;
DROP TABLE IF EXISTS public.sms_balance_history CASCADE;
DROP TABLE IF EXISTS public.sms_templates CASCADE;
DROP TABLE IF EXISTS public.sms_accounts CASCADE;
DROP TABLE IF EXISTS public.uploads CASCADE;
DROP TABLE IF EXISTS public.verification_codes CASCADE;
DROP TABLE IF EXISTS public.withdrawal_requests CASCADE;
DROP TABLE IF EXISTS public.cancellation_policies CASCADE;
DROP TABLE IF EXISTS public.platform_transactions CASCADE;
DROP TABLE IF EXISTS public.platform_wallet CASCADE;
DROP TABLE IF EXISTS public.notifications CASCADE;
DROP TABLE IF EXISTS public.complaints CASCADE;
DROP TABLE IF EXISTS public.reviews CASCADE;
DROP TABLE IF EXISTS public.wallet_transactions CASCADE;
DROP TABLE IF EXISTS public.wallets CASCADE;
DROP TABLE IF EXISTS public.bookings CASCADE;
DROP TABLE IF EXISTS public.companies CASCADE;
DROP TABLE IF EXISTS public.visitors CASCADE;
DROP TABLE IF EXISTS public.packages CASCADE;
DROP TABLE IF EXISTS public.family_availability CASCADE;
DROP TABLE IF EXISTS public.majlis CASCADE;
DROP TABLE IF EXISTS public.families CASCADE;
DROP TABLE IF EXISTS public.user_profiles CASCADE;
DROP TABLE IF EXISTS public.platform_settings CASCADE;

-- Drop all custom types
DROP TYPE IF EXISTS withdrawal_status CASCADE;
DROP TYPE IF EXISTS coupon_type CASCADE;
DROP TYPE IF EXISTS user_type CASCADE;
DROP TYPE IF EXISTS city_type CASCADE;
DROP TYPE IF EXISTS approval_status CASCADE;
DROP TYPE IF EXISTS majlis_type CASCADE;
DROP TYPE IF EXISTS time_slot CASCADE;
DROP TYPE IF EXISTS package_type CASCADE;
DROP TYPE IF EXISTS booking_status CASCADE;
DROP TYPE IF EXISTS payment_status CASCADE;
DROP TYPE IF EXISTS discount_type CASCADE;
DROP TYPE IF EXISTS transaction_type CASCADE;
DROP TYPE IF EXISTS transaction_status CASCADE;
DROP TYPE IF EXISTS complaint_status CASCADE;
DROP TYPE IF EXISTS notification_type CASCADE;

-- Drop all views
DROP VIEW IF EXISTS public.pending_payouts CASCADE;
DROP VIEW IF EXISTS public.pending_withdrawals CASCADE;
DROP VIEW IF EXISTS public.sms_statistics CASCADE;
DROP VIEW IF EXISTS public.operator_dashboard_stats CASCADE;
DROP VIEW IF EXISTS public.family_performance CASCADE;
DROP VIEW IF EXISTS public.monthly_booking_trends CASCADE;
DROP VIEW IF EXISTS public.city_performance CASCADE;
DROP VIEW IF EXISTS public.package_performance CASCADE;
DROP VIEW IF EXISTS public.recent_platform_activity CASCADE;

-- Drop all functions (using CASCADE and schema-wide approach)
DO $$ 
DECLARE 
    r RECORD;
BEGIN
    FOR r IN (
        SELECT 'DROP FUNCTION IF EXISTS ' || ns.nspname || '.' || proname || '(' || oidvectortypes(proargtypes) || ') CASCADE;' as drop_command
        FROM pg_proc 
        INNER JOIN pg_namespace ns ON (pg_proc.pronamespace = ns.oid)
        WHERE ns.nspname = 'public'
        AND proname IN (
            'is_operator', 'is_family', 'is_visitor', 'is_company',
            'generate_booking_number', 'generate_complaint_number',
            'calculate_booking_amounts', 'check_and_update_availability',
            'create_wallet_on_approval', 'update_wallet_on_transaction',
            'handle_payment_flow', 'get_top_families', 'get_worst_families',
            'get_busiest_month', 'get_slowest_month', 'generate_financial_report',
            'approve_family_payout', 'process_automatic_payouts',
            'generate_verification_code', 'calculate_cancellation_refund',
            'cancel_booking', 'approve_withdrawal_request', 'complete_withdrawal',
            'validate_coupon', 'send_sms', 'recharge_sms_balance'
        )
    ) LOOP
        EXECUTE r.drop_command;
    END LOOP;
END $$;

-- Drop all triggers (safely handle missing tables)
DO $$ 
BEGIN
    DROP TRIGGER IF EXISTS trigger_create_wallet_on_approval ON public.families CASCADE;
    DROP TRIGGER IF EXISTS trigger_update_wallet_on_transaction ON public.wallet_transactions CASCADE;
    DROP TRIGGER IF EXISTS trigger_calculate_amounts ON public.bookings CASCADE;
    DROP TRIGGER IF EXISTS trigger_check_availability ON public.bookings CASCADE;
    DROP TRIGGER IF EXISTS trigger_handle_payment_flow ON public.bookings CASCADE;
EXCEPTION
    WHEN undefined_table THEN NULL;
END $$;

-- Success message
DO $$
BEGIN
    RAISE NOTICE '✅ Database cleaned successfully!';
    RAISE NOTICE '🗑️ All tables, types, views, functions, and triggers dropped';
    RAISE NOTICE '';
    RAISE NOTICE '📝 Next steps:';
    RAISE NOTICE '1. Apply complete_schema.sql';
    RAISE NOTICE '2. Apply rls_policies.sql';
    RAISE NOTICE '3. Apply enhanced_features.sql';
    RAISE NOTICE '4. Apply critical_features.sql';
END $$;
