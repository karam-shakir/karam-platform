# 🔧 إصلاح مشكلة booking_time_slots

## ❌ المشكلة

```
ERROR: relation "public.booking_time_slots" does not exist
```

هذا يعني أن **جدول `booking_time_slots` غير موجود** في قاعدة بياناتك.

---

## 🔍 الخطوة 1: تشخيص البنية

### شغّل هذا الاستعلام في Supabase:

```sql
-- افتح ملف: database/check_structure.sql
-- أو انسخ هذا الاستعلام:

SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'bookings'
ORDER BY ordinal_position;
```

### ما نبحث عنه:

هل جدول `bookings` يحتوي على أحد هذه التركيبات؟

**السيناريو A:** أعمدة بسيطة
```
- booking_date (DATE)
- time_slot (VARCHAR) مثل: 'morning', 'afternoon', 'evening'
- number_of_guests (INTEGER)
- status (VARCHAR)
```

**السيناريو B:** أعمدة زمنية
```
- booking_date (DATE)  
- start_time (TIME)
- end_time (TIME)
- number_of_guests (INTEGER)
- status (VARCHAR)
```

---

## ✅ الحل

حسب بنية جدولك، استخدم الحل المناسب:

### حل A: إذا كان لديك `time_slot`

شغّل: `database/fix_concurrent_bookings.sql`

ثم استخدم:
```sql
SELECT * FROM get_available_families_simple(
    '2025-12-15'::DATE,
    'afternoon',
    5
);
```

### حل B: إذا كان لديك `start_time` و `end_time`

شغّل: `database/fix_concurrent_bookings.sql`

ثم استخدم:
```sql
SELECT * FROM get_available_families_with_times(
    '2025-12-15'::DATE,
    '14:00'::TIME,
    '18:00'::TIME,
    5
);
```

---

## 🚀 خطوات التطبيق

### 1. تحقق من البنية:
```sql
-- في Supabase SQL Editor
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'bookings';
```

### 2. شغّل السكربت المناسب:
```sql
-- افتح في Supabase:
database/fix_concurrent_bookings.sql

-- نفذ كل المحتوى
```

### 3. اختبر:
```sql
-- للسيناريو A (time_slot):
SELECT * FROM get_available_families_simple(
    CURRENT_DATE + 7,
    'afternoon',
    5
);

-- للسيناريو B (start_time/end_time):
SELECT * FROM get_available_families_with_times(
    CURRENT_DATE + 7,
    '14:00'::TIME,
    '18:00'::TIME,
    5
);
```

---

## 📋 الدوال الجديدة

| الدالة | الاستخدام |
|-------|----------|
| `get_available_families_simple()` | للبنية البسيطة (time_slot) |
| `get_available_families_with_times()` | للبنية المتقدمة (start/end time) |
| `check_capacity_simple()` | فحص سعة أسرة معينة |

---

## 🐛 إذا استمرت المشاكل

### أرسل لي نتيجة هذا الاستعلام:

```sql
-- 1. أعمدة جدول bookings
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'bookings';

-- 2. أول 3 صفوف من جدول bookings
SELECT * FROM bookings LIMIT 3;

-- 3. أعمدة جدول host_families
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'host_families';
```

بناءً على النتيجة سأعدل الدوال تماماً.

---

## ✅ تحديث السكربت الرئيسي

بعد معرفة البنية الصحيحة، سأقوم بتحديث:
- `database/karam_complete_update.sql`

ليستخدم الدوال الصحيحة حسب بنية قاعدة بياناتك.

---

**📌 الخطوة التالية:**

1. شغّل `check_structure.sql` 
2. أخبرني بالنتيجة
3. سأعطيك السكربت النهائي المناسب تماماً
