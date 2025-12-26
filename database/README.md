# Karam Platform - Database Setup Guide
## دليل إعداد قاعدة بيانات منصة كرم

---

## ⚠️ تنبيه هام - IMPORTANT WARNING

> [!CAUTION]
> **تحذير**: هذه السكريبتات ستقوم بحذف وإعادة إنشاء جداول قاعدة البيانات بالكامل!
> 
> **Warning**: These scripts will DROP and recreate all database tables!

---

## 📋 خطوات التطبيق - Installation Steps

### الطريقة 1: من خلال Supabase Dashboard (موصى بها)

1. **افتح Supabase Dashboard**
   - اذهب إلى: https://supabase.com/dashboard/project/mdkhvsvkqlhtikhpkwkf
   - Login to your project

2. **افتح SQL Editor**
   - من القائمة الجانبية، اختر "SQL Editor"
   - أو اذهب مباشرة إلى: https://supabase.com/dashboard/project/mdkhvsvkqlhtikhpkwkf/sql

3. **نفذ السكريبتات بالترتيب التالي:**

   **المرحلة 1: Schema الأساسي**
   ```
   1. افتح ملف: database/complete_schema.sql
   2. انسخ المحتوى كاملاً
   3. الصقه في SQL Editor
   4. اضغط RUN
   5. تأكد من ظهور رسالة النجاح
   ```

   **المرحلة 2: Row Level Security**
   ```
   1. افتح ملف: database/rls_policies.sql
   2. انسخ المحتوى كاملاً
   3. الصقه في SQL Editor
   4. اضغط RUN
   5. تأكد من ظهور رسالة النجاح
   ```

4. **تحقق من النتائج**
   - اذهب إلى: Table Editor
   - يجب أن ترى 14 جدول جديد:
     - user_profiles
     - families
     - majlis
     - family_availability
     - packages
     - visitors
     - companies
     - bookings
     - wallets
     - wallet_transactions
     - reviews
     - complaints
     - notifications
     - platform_settings

---

### الطريقة 2: من خلال Supabase CLI (للمطورين)

إذا كان لديك Supabase CLI مثبت:

```bash
# Navigate to project directory
cd c:/Users/Shakir/.gemini/antigravity/scratch/karam-platform

# Link to your Supabase project (if not already linked)
supabase link --project-ref mdkhvsvkqlhtikhpkwkf

# Apply schema
supabase db push database/complete_schema.sql

# Apply RLS policies
supabase db push database/rls_policies.sql
```

---

## ✅ التحقق من التطبيق الناجح - Verification

بعد تطبيق السكريبتات، تأكد من:

### 1. الجداول - Tables
```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;
```

يجب أن ترى 14 جدول.

### 2. Functions
```sql
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_type = 'FUNCTION'
ORDER BY routine_name;
```

يجب أن ترى functions مثل:
- is_operator()
- is_family()
- is_visitor()
- is_company()
- generate_booking_number()
- calculate_booking_amounts()
- check_and_update_availability()

### 3. Triggers
```sql
SELECT trigger_name, event_object_table
FROM information_schema.triggers
WHERE trigger_schema = 'public'
ORDER BY event_object_table, trigger_name;
```

### 4. RLS Policies
```sql
SELECT schemaname, tablename, policyname
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
```

### 5. Default Data
تحقق من وجود البيانات الافتراضية:

```sql
-- Check packages
SELECT * FROM public.packages;

-- Check platform settings
SELECT * FROM public.platform_settings;
```

---

## 🔄 في حالة حدوث خطأ - Troubleshooting

### خطأ: Permission denied
**الحل**: تأكد أنك مسجل دخول كـ Owner للمشروع في Supabase Dashboard

### خطأ: Table already exists
**الحل**: إذا كنت تريد إعادة التطبيق، احذف الجداول القديمة أولاً:

```sql
-- ⚠️ احذر: هذا سيحذف جميع البيانات!
DROP SCHEMA public CASCADE;
CREATE SCHEMA public;
GRANT ALL ON SCHEMA public TO postgres;
GRANT ALL ON SCHEMA public TO public;

-- ثم أعد تطبيق السكريبتات
```

### خطأ: Function already exists
```sql
-- احذف ال functions القديمة
DROP FUNCTION IF EXISTS is_operator();
DROP FUNCTION IF EXISTS is_family();
-- ... وهكذا
```

---

## 📊 البيانات الافتراضية - Default Data

### Packages (الباقات)
- **Basic Package**: 150 SAR/person
  - شاي وقهوة سعودية
  - تمر ومعمول
  - ضيافة شعبية
  - تصوير بالزي الشعبي

- **Diamond Package**: 250 SAR/person
  - كل ما في الباقة الأساسية
  - وجبة شعبية مكية أو مدنية

### Platform Settings
- **Commission**: 20%
- **Group Discount**: 10% (for 5+ guests)
- **Company Discount**: 15%
- **Booking Duration**: 2-3 hours
- **SMS Enabled**: Yes
- **Email Enabled**: Yes

---

## 🔐 Row Level Security Status

جميع الجداول محمية بـ RLS:

- ✅ **Visitors**: يمكنهم رؤية حجوزاتهم فقط
- ✅ **Families**: يمكنهم رؤية مجالسهم وحجوزاتهم فقط
- ✅ **Companies**: يمكنهم رؤية حجوزاتهم فقط
- ✅ **Operators**: لديهم صلاحية كاملة على جميع البيانات
- ✅ **Public**: يمكنهم تصفح العوائل المفعلة فقط

---

## 📝 ملاحظات إضافية - Additional Notes

1. **Bank Account Encryption**: حقل `bank_account_number` جاهز للتشفير - يمكن تطبيق encryption لاحقاً

2. **Auto-generated Numbers**: 
   - Booking Number: KRMYYYYMMDDxxxx
   - Complaint Number: CMPYYYYMMDDxxx

3. **Automatic Triggers**: 
   - Wallet يتم إنشاؤه تلقائياً عند موافقة الأسرة
   - Notifications تُرسل تلقائياً عند الحجز
   - Review requests ترسل تلقائياً عند إكمال الحجز

4. **JSONB Fields**:
   - `guest_details` in bookings: لتخزين معلومات الضيوف
   - `photos` in reviews: لتخزين روابط الصور
   - `setting_value` in platform_settings: للإعدادات المرنة

---

## 🚀 الخطوات التالية - Next Steps

بعد إعداد قاعدة البيانات بنجاح:

1. ✅ إنشاء Core JavaScript Modules
2. ✅ بناء صفحات واجهة المستخدم
3. ✅ تكامل Moyasar للدفع
4. ✅ إعداد نظام الإشعارات
5. ✅ اختبار النظام بالكامل

---

## 💡 تلميحات - Tips

- استخدم Supabase Dashboard للاستعلامات السريعة
- راجع logs في حالة حدوث أي مشكلة
- اختبر RLS policies قبل Development
- احتفظ بنسخة احتياطية قبل أي تغييرات كبيرة

---

**تم الإعداد بواسطة**: Dr. Shakir Alhuthali  
**التاريخ**: 2025-12-25  
**المشروع**: Karam Platform - منصة كرم للضيافة الأصيلة
