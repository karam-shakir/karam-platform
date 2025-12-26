# ⚠️ إكمال إعداد قاعدة البيانات - Manual Steps Required

## الوضع الحالي - Current Status

تم إعداد ملفات SQL بنجاح وحاولنا تطبيقها تلقائياًعلى Supabase:

✅ **تم إنشاؤه**:
- `database/complete_schema.sql` - السكريبت الكامل (753 سطر)
- `database/rls_policies.sql` - سياسات الأمان
- `database/README.md` - دليل التطبيق

⚠️ **يحتاج إكمال يدوي**: تطبيق السكريبتات على Supabase

---

## 📋 الخطوات المطلوبة منك - Steps You Need To Complete

### الخطوة 1:تطبيق Database Schema

**الطريقة الموص بها**: نسخ ولصق مباشر في Supabase SQL Editor

1. **افتح Supabase SQL Editor**:
   - URL: https://supabase.com/dashboard/project/mdkhvsvkqlhtikhpkwkf/sql
   - ستجد نافذة محرر SQL Editor مفتوحة بالفعل

2. **نظف البيانات القديمة** (إذا لزم الأمر):
   ```sql
   -- قم بنسخ ولصق هذا أولاً
   DROP TABLE IF EXISTS public.notifications, public.complaints, public.reviews, 
   public.wallet_transactions, public.wallets, public.bookings, public.companies, 
   public.visitors, public.packages, public.family_availability, public.majlis, 
   public.families, public.user_profiles, public.platform_settings CASCADE;
   
   DROP TYPE IF EXISTS user_type, city_type, approval_status, majlis_type, 
   time_slot, package_type, booking_status, payment_status, discount_type, 
   transaction_type،transaction_status, complaint_status, notification_type CASCADE;
   ```
   - اضغط **RUN**
   - انتظر حتى يكتمل التنفيذ

3. **طبق السكريبت الرئيسي**:
   - افتح ملف: `database/complete_schema.sql`
   - **انسخ المحتوى بالكامل** (Ctrl+A ثم Ctrl+C)
   - الصقه في Supabase SQL Editor (Ctrl+V)
   - اضغط **RUN** (أسفل يمين المحرر)
   - **انتظر 10-15 ثانية** - السكريبت كبير
   
4. **تحقق من النجاح**:
   - يجب أن ترى رسائل نجاح في panel النتائج
   - ابحث عن: "✅ Karam Platform Database Schema Created Successfully!"

### الخطوة 2: تطبيق RLS Policies

1. **افتح ملف**: `database/rls_policies.sql`
2. **انسخ المحتوى بالكامل**
3. **الصقه في SQL Editor**
4. **اضغط RUN**
5. **تحقق من النجاح**: يجب أن ترى "✅ Row Level Security Policies Applied Successfully!"

### الخطوة 3: تطبيق Enhanced Features (المحفظة الرئيسية + التقارير)

1. **افتح ملف**: `database/enhanced_features.sql`
2. **انسخ المحتوى بالكامل**
3. **الصقه في SQL Editor**
4. **اضغط RUN**
5. **تحقق من النجاح**: يجب أن ترى:
   - "✅ Enhanced Features Applied Successfully!"
   - "💰 Platform Wallet Created"
   - "📊 Analytics Views Created"
   - "📈 Report Functions Added"

**ملاحظة مهمة**: هذا الملف يضيف:
- ✅ المحفظة الرئيسية للمنصة
- ✅ Views للتحليلات والتقارير
- ✅ Functions لأفضل/أسوأ أسرة
- ✅ تقارير شهرية ومالية

### الخطوة 4: تطبيق Critical Features ⭐ (الميزات الحرجة)

1. **افتح ملف**: `database/critical_features.sql`
2. **انسخ المحتوى بالكامل**
3. **الصقه في SQL Editor**
4. **اضغط RUN**
5. **تحقق من النجاح**: يجب أن ترى:
   - "✅ Critical Features Applied Successfully!"
   - "🔐 KYC/Verification System Ready"
   - "↩️ Cancellation & Refund Policy Implemented"
   - "📁 File Upload Tracking System Ready"
   - "💸 Withdrawal System Implemented"
   - "🎟️ Coupon System Ready"
   - "📱 SMS Management System Implemented"

**ملاحظة مهمة جداً**: هذا الملف يضيف:
- ✅ نظام التحقق من الهوية (KYC)
- ✅ سياسة الإلغاء والاسترجاع
- ✅ تتبع رفع الملفات
- ✅ نظام طلبات السحب المالي
- ✅ نظام الكوبونات والخصومات
- ✅ نظام إدارة الرسائل النصية SMS

### الخطوة 5: إعداد Storage Buckets ⭐ (من Dashboard)

**ملاحظة**: هذه الخطوة تُنفذ من Supabase Dashboard وليس SQL Editor

1. **راجع الدليل**: افتح `database/STORAGE_SETUP_GUIDE.md`
2. **اتبع التعليمات المفصلة** لإنشاء 4 Buckets:
   - `family-documents` (Private)
   - `majlis-photos` (Public)
   - `review-photos` (Public)
   - `company-documents` (Private)

**الوقت المتوقع**: 5-10 دقائق

### الخطوة 6: تطبيق Extended RLS Policies ⭐ (سياسات الأمان الموسعة)

1. **افتح ملف**: `database/rls_policies_extended.sql`
2. **انسخ المحتوى بالكامل**
3. **الصقه في SQL Editor**
4. **اضغط RUN**
5. **تحقق من النجاح**: يجب أن ترى:
   - "✅ Extended RLS Policies Applied Successfully!"
   - "🔐 Security policies enabled for"
   - "🎯 Total Policies: 40+"

**ملاحظة مهمة**: هذا الملف يُؤمّن:
- ✅ الجداول الجديدة (Coupons, Withdrawals, SMS, etc.)
- ✅ Storage Buckets (سياسات الرفع والعرض)
- ✅ 40+ سياسة أمان شاملة

---

## ✅ التحقق - Verification

بعد تطبيق السكريبتات، تأكد من:

### 1. الجداول موجودة (27 جدول ⭐)
```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_type = 'BASE TABLE'
ORDER BY table_name;
```

يجب أن ترى:
**الجداول الأساسية:**
- bookings
- companies
- complaints
- families
- family_availability
- majlis
- notifications
- packages
- platform_settings
- reviews
- user_profiles
- visitors
- wallets
- wallet_transactions

**جداول Enhanced Features:**
- **platform_wallet** ⭐
- **platform_transactions** ⭐

**جداول Critical Features:** ⭐⭐⭐
- **cancellation_policies**
- **coupons**
- **coupon_usage**
- **sms_accounts**
- **sms_balance_history**
- **sms_messages**
- **sms_templates**
- **uploads**
- **verification_codes**
- **withdrawal_requests**

### 1.5 الـ Views موجودة (6 views)
```sql
SELECT table_name 
FROM information_schema.views 
WHERE table_schema = 'public'
ORDER BY table_name;
```

يجب أن ترى:
- **operator_dashboard_stats** - إحصائيات لوحة المشغلين
- **family_performance** - أداء الأسر
- **monthly_booking_trends** - الاتجاهات الشهرية
- **city_performance** - أداء المدن
- **package_performance** - أداء الباقات
- **recent_platform_activity** - النشاط الأخير

### 2. البيانات الافتراضية
```sql
-- تحقق من الباقات
SELECT * FROM public.packages;
```

يجب أن ترى باقتين:
- **basic**: 150 ريال/شخص
- **diamond**: 250 ريال/شخص

```sql
-- تحقق من إعدادات المنصة
SELECT * FROM public.platform_settings;
```

يجب أن ترى 6 إعدادات:
- commission_percentage: 20%
- group_discount: 10% (5+ guests)
- company_discount: 15%
- booking_duration_hours: 2-3 hours
- sms_enabled: true
- email_enabled: true

### 3. Functions & Triggers
```sql
-- عرض ال Functions
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_type = 'FUNCTION'
ORDER BY routine_name;
```

يجب أن ترى على الأقل:
- calculate_booking_amounts
- check_and_update_availability
- create_wallet_on_approval
- generate_booking_number
- generate_complaint_number
- is_operator
- is_family
- is_visitor
- is_company

---

## ❌ إذا حدث خطأ - Troubleshooting

### خطأ: "already exists"
**الحل**: نفذ خطوة التنظيف (الخطوة 1-2) مرة أخرى

### خطأ: "permission denied"
**الحل**: تأكد أنك مسجل دخول كـ Owner في Supabase

### خطأ: "syntax error"
**الحل**: 
1. تأكد أنك نسخت السكريبت بالكامل
2. لا تقم بتعديل النص العربي في النص SQL

### لم يتم إنشاء الجداول
**الحل**:
```sql
-- تحقق من الأخطاء
SELECT * FROM pg_stat_activity WHERE state = 'active';
```

---

## 📞 بعد الانتهاء

عندما تكمل تطبيق كلا السكريبتين بنجاح:

1. ✅ التقط screenshot لنتائج التنفيذ الناجح
2. ✅ أرسل لي رسالة تأكيد: "تم تطبيق Database بنجاح"
3. ✅ سأبدأ فوراً في**Phase 2**: بناء Core JavaScript Modules

---

## 🎯 الخطوات التالية After Database Setup

بعد إكمال قاعدة البيانات، سنبدأ ب:

1. **Core JS Modules**:
   - `js/supabase-client.js` - Enhanced
   - `js/auth.js` - Authentication
   - `js/i18n.js`- Internationalization
   - `js/booking-engine.js` - Smart Booking
   - `js/moyasar-payment.js` - Payment Integration

2. **Landing Page Redesign**:
   - Hero section مذهل
   - How it works
   - Benefits showcase
   - Testimonials
   - SEO optimization

3. **Family Portal**:
   - Registration flow
   - Dashboard
   - Availability management
   - Wallet system

---

## 📝 ملاحظات

- **وقت التنفيذ المتوقع**: 5-10 دقائق
- **لا تغلق نافذة المتصفح** أثناء التنفيذ
- **احتفظ بنسخة احتياطية** من قاعدة البيانات الحالية إذا كانت هناك بيانات مهمة

---

**تم الإعداد بواسطة**: Dr. Shakir Alhuthali  
**التاريخ**: 2025-12-25  
**المشروع**: Karam Platform - منصة كرم للضيافة الأصيلة 🌟
