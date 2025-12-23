# ✅ الحل النهائي - إنشاء جدول booking_time_slots

## 📋 المشكلة
جدول `bookings` لا يحتوي على:
- `time_slot`
- `start_time` / `end_time`

وجدول `booking_time_slots` غير موجود.

---

## ✅ الحل

تم إنشاء سكربت كامل يحل جميع المشاكل!

---

## 🚀 خطوات التطبيق

### الطريقة 1: السكربت الموحد المحدث (مُوصى بها) ⭐

 استخدم السكربت المحدث: **`database/karam_complete_update.sql`**

تم تحديثه ليتضمن:
- ✅ جدول `booking_time_slots`
- ✅ جميع الفهارس
- ✅ سياسات RLS
- ✅ الدوال المحدثة

```sql
-- في Supabase SQL Editor:
-- 1. افتح database/karam_complete_update.sql
-- 2. انسخ كل المحتوى
-- 3. الصق في SQL Editor
-- 4. Run (F5)
```

### الطريقة 2: سكربت منفصل

إذا كنت قد شغلت السكربت الأول بالفعل، استخدم:

```sql
-- شغّل: database/create_booking_time_slots.sql
```

---

## 📊 بنية جدول booking_time_slots

```sql
CREATE TABLE booking_time_slots (
    id UUID PRIMARY KEY,
    booking_id UUID → references bookings(id),
    booking_date DATE,
    start_time TIME,
    end_time TIME,
    guest_count INTEGER,
    status VARCHAR(20), -- 'confirmed' or 'cancelled'
    created_at TIMESTAMP,
    updated_at TIMESTAMP
);
```

---

## 🧪 اختبار بعد التطبيق

### 1. التحقق من إنشاء الجدول:
```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_name = 'booking_time_slots';
```

**المتوقع:** صف واحد يحتوي على `booking_time_slots`

### 2. اختبار الدوال:
```sql
-- الأسر المتاحة
SELECT family_name, available_capacity, total_capacity
FROM get_available_families(
    CURRENT_DATE + 7,
    '14:00'::TIME,
    '18:00'::TIME,
    5
)
LIMIT 5;
```

**المتوقع:** قائمة بالأسر المتاحة (أو فارغ إذا لم يكن هناك حجوزات)

### 3. إضافة time slot تجريبي:
```sql
-- أولاً: احصل على booking_id من جدول bookings
SELECT id FROM bookings LIMIT 1;

-- ثم أضف time slot (استبدل BOOKING_UUID):
INSERT INTO booking_time_slots (
    booking_id,
    booking_date,
    start_time,
    end_time,
    guest_count,
    status
)
VALUES (
    'BOOKING_UUID_HERE',
    CURRENT_DATE + 7,
    '14:00',
    '18:00',
    4,
    'confirmed'
);
```

---

## 📋 العلاقة بين الجداول

```
bookings (الحجز الأساسي)
    ├─ id (UUID)
    ├─ visitor_id
    ├─ family_id
    ├─ total_amount
    ├─ visitor_names (JSONB) ✓ جديد
    ├─ discount_code_id ✓ جديد
    └─ ...

booking_time_slots (تفاصيل الوقت) ✓ جدول جديد
    ├─ id (UUID)
    ├─ booking_id → bookings.id
    ├─ booking_date
    ├─ start_time
    ├─ end_time
    ├─ guest_count
    └─ status
```

---

## ✅ ما تم إصلاحه

1. ✅ إنشاء جدول `booking_time_slots`
2. ✅ تحديث دالة `get_available_families()`
3. ✅ تحديث دالة `check_concurrent_capacity()`
4. ✅ إضافة فهارس للأداء
5. ✅ إضافة سياسات RLS
6. ✅ تحديث السكربت الرئيسي `karam_complete_update.sql`

---

## 🎯 الخطوة التالية

بعد تطبيق السكربت:

1. ✅ تأكد من وجود جدول `booking_time_slots`
2. ✅ اختبر دالة `get_available_families()`
3. ✅ حدّث Frontend لإضافة time slots عند الحجز

---

## 📝 تحديث Frontend (checkout.js)

عند إنشاء حجز، يجب إضافة:

```javascript
// في دالة createBookings()
// بعد إنشاء الحجز:

const { error: slotError } = await supabase
    .from('booking_time_slots')
    .insert({
        booking_id: booking.id,
        booking_date: cartItem.date,
        start_time: cartItem.startTime,
        end_time: cartItem.endTime,
        guest_count: cartItem.guestCount,
        status: 'confirmed'
    });
```

---

**✅ جاهز الآن!** شغّل السكربت المحدث وستعمل جميع الدوال بشكل صحيح.
