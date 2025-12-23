# 🧪 دليل اختبار قاعدة البيانات - Database Testing Guide

## 📋 نظرة عامة

هذا الدليل يشرح كيفية اختبار التحديثات الجديدة على قاعدة بيانات منصة كرم.

---

## ✅ الخطوة 1: تطبيق السكربت الرئيسي

### في Supabase SQL Editor:

1. افتح `database/karam_complete_update.sql`
2. انسخ **جميع** المحتويات
3. الصق في SQL Editor
4. اضغط **Run** (F5)
5. انتظر رسالة: `Database schema updated successfully!`

---

## 🧪 الخطوة 2: الاختبارات الأساسية

### اختبار 1: إنشاء كود خصم

```sql
INSERT INTO discount_codes (
    code, 
    description,
    discount_type, 
    discount_value, 
    valid_until, 
    usage_limit
)
VALUES (
    'WELCOME20',
    'خصم ترحيبي 20%',
    'percentage',
    20,
    '2025-12-31',
    100
);
```

**النتيجة المتوقعة:** ✅ تم إنشاء الصف بنجاح

---

### اختبار 2: عرض أكواد الخصم

```sql
SELECT 
    code,
    discount_type,
    discount_value,
    times_used,
    usage_limit,
    is_active
FROM discount_codes;
```

**النتيجة المتوقعة:** ✅ يظهر كود `WELCOME20`

---

### اختبار 3: التحقق من كود الخصم

**⚠️ مهم:** يجب استخدام UUID حقيقي!

**الطريقة الصحيحة:**

```sql
-- 1. احصل على UUID لأسرة موجودة:
SELECT id, family_name FROM host_families LIMIT 1;

-- 2. استخدم UUID الفعلي في الاختبار:
WITH test_family AS (
    SELECT id FROM host_families LIMIT 1
)
SELECT * FROM validate_discount_code(
    'WELCOME20',
    (SELECT id FROM test_family),
    500.00
);
```

**النتيجة المتوقعة:**
```
is_valid | discount_id | discount_type | discount_value | discount_amount | message
---------|-------------|---------------|----------------|-----------------|------------------
true     | [UUID]      | percentage    | 20.00          | 100.00          | تم تطبيق الخصم بنجاح
```

---

### اختبار 4: الحجوزات المتزامنة

```sql
SELECT 
    family_name,
    city,
    available_capacity,
    total_capacity,
    current_bookings
FROM get_available_families(
    CURRENT_DATE + 7,    -- بعد أسبوع
    '14:00'::TIME,
    '18:00'::TIME,
    5
);
```

**النتيجة المتوقعة:** ✅ قائمة بالأسر المتاحة مع السعة

---

### اختبار 5: فحص الأعمدة الجديدة

```sql
-- في جدول bookings
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'bookings'
AND column_name IN (
    'visitor_names',
    'discount_code_id',
    'discount_amount',
    'emergency_contact',
    'special_requests'
);
```

**النتيجة المتوقعة:** ✅ 5 صفوف (الأعمدة الجديدة)

---

## 📁 ملف الاختبارات الجاهز

استخدم: **`database/test_queries.sql`**

هذا الملف يحتوي على:
- ✅ جميع الاستعلامات الجاهزة
- ✅ أمثلة صحيحة مع UUIDs
- ✅ تعليقات توضيحية
- ✅ استعلامات تنظيف

---

## ❌ الأخطاء الشائعة وحلولها

### خطأ 1: Invalid UUID syntax

**الخطأ:**
```
ERROR: invalid input syntax for type uuid: "أي UUID من جدول host_families"
```

**الحل:**
استخدم UUID حقيقي:
```sql
-- خطأ ❌
SELECT * FROM validate_discount_code('CODE', 'نص عربي', 100);

-- صحيح ✅
WITH test_family AS (SELECT id FROM host_families LIMIT 1)
SELECT * FROM validate_discount_code(
    'CODE', 
    (SELECT id FROM test_family), 
    100
);
```

---

### خطأ 2: Table does not exist

**الخطأ:**
```
ERROR: relation "discount_codes" does not exist
```

**الحل:**
لم يتم تشغيل `karam_complete_update.sql` بعد

---

### خطأ 3: Permission denied

**الخطأ:**
```
ERROR: permission denied for table discount_codes
```

**الحل:**
تأكد من تسجيل الدخول كـ admin أو service_role

---

## 🎯 سيناريو اختبار كامل

### خطوة بخطوة:

```sql
-- 1. إنشاء كود خصم
INSERT INTO discount_codes (code, discount_type, discount_value, valid_until, usage_limit)
VALUES ('TEST20', 'percentage', 20, '2025-12-31', 100);

-- 2. التحقق من الإنشاء
SELECT * FROM discount_codes WHERE code = 'TEST20';

-- 3. اختبار التحقق من الكود
WITH first_family AS (SELECT id FROM host_families LIMIT 1)
SELECT * FROM validate_discount_code('TEST20', (SELECT id FROM first_family), 500);

-- 4. عرض الأسر المتاحة
SELECT family_name, available_capacity, total_capacity
FROM get_available_families(CURRENT_DATE + 7, '14:00', '18:00', 5)
LIMIT 5;

-- 5. تنظيف (اختياري)
DELETE FROM discount_codes WHERE code = 'TEST20';
```

---

## 📊 التحقق من نجاح التحديثات

### Checklist:

- [ ] جدول `discount_codes` موجود
- [ ] أعمدة `bookings` الجديدة موجودة (5 أعمدة)
- [ ] عمود `is_active` في `host_families` موجود
- [ ] دالة `validate_discount_code` تعمل
- [ ] دالة `get_available_families` محدثة
- [ ] دالة `check_concurrent_capacity` تعمل
- [ ] أكواد الخصم يمكن إنشاؤها
- [ ] التحقق من الكود يعمل صحيحاً

---

## 🚀 الخطوات التالية

بعد نجاح جميع الاختبارات:

1. ✅ أنشئ بعض أكواد الخصم الحقيقية
2. ✅ اختبر Frontend (test-components.html)
3. ✅ اختبر صفحة checkout
4. ✅ جرب حجز كامل مع كود خصم

---

## 📞 المساعدة

إذا واجهت مشاكل:
1. تحقق من تطبيق `karam_complete_update.sql`
2. راجع رسائل الأخطاء
3. تأكد من استخدام UUIDs حقيقية
4. تحقق من الصلاحيات

---

**✅ جاهز للاختبار!**
