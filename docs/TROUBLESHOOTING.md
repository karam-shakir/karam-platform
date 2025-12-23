# 🔧 دليل حل المشاكل - Troubleshooting Guide

## ❌ المشكلة: لا تظهر أسر عند التصفح

### الأسباب المحتملة:

#### 1️⃣ لا توجد أسر في قاعدة البيانات

**التحقق:**
```sql
SELECT COUNT(*) FROM host_families;
```

**الحل:**
```sql
-- شغّل: database/sample_data.sql
-- لإضافة بيانات تجريبية
```

---

#### 2️⃣ الأسر غير موافقة أو غير نشطة

**التحقق:**
```sql
SELECT 
    family_name,
    status,
    is_active
FROM host_families;
```

**الحل:**
```sql
-- فعّل جميع الأسر
UPDATE host_families
SET status = 'approved', is_active = true;
```

---

#### 3️⃣ ملف config.js غير موجود

**التحقق:**
- افتح المتصفح Console (F12)
- ابحث عن أخطاء مثل: `supabase is not defined`

**الحل:**
```javascript
// أنشئ ملف: js/config.js

const supabaseUrl = 'YOUR_SUPABASE_URL';
const supabaseAnonKey = 'YOUR_SUPABASE_ANON_KEY';

const supabase = supabase.createClient(supabaseUrl, supabaseAnonKey);
```

---

#### 4️⃣ أخطاء JavaScript

**التحقق:**
- افتح Console (F12)
- ابحث عن أخطاء حمراء

**الحل الشائع:**
```html
<!-- تأكد من ترتيب السكربتات في HTML -->
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
<script src="js/config.js"></script> <!-- قبل أي سكربت آخر! -->
<script src="js/main.js"></script>
<script src="js/browse.js"></script>
```

---

## ❌ المشكلة: زر إتمام الحجز لا يعمل

### الأسباب:

#### 1️⃣ showToast غير معرّفة

**الخطأ في Console:**
```
ReferenceError: showToast is not defined
```

**الحل:**
```html
<!-- تأكد من تحميل main.js قبل browse-calendar.js -->
<script src="js/main.js"></script>
<script src="js/browse-calendar.js"></script>
```

---

#### 2️⃣ onclick غير موجود

**التحقق:**
```html
<!-- يجب أن يكون الزر: -->
<button onclick="checkout()">إتمام الحجز</button>
```

---

## ❌ المشكلة: Header/Footer لا يظهران

### السبب: CORS عند فتح file://

**الحل:**
```powershell
# شغّل خادم محلي:
python -m http.server 8000

# ثم افتح:
http://localhost:8000/index.html
```

---

## ❌ المشكلة: أخطاء قاعدة البيانات

### خطأ: booking_time_slots does not exist

**الحل:**
```sql
-- شغّل: database/karam_update_CLEAN.sql
```

---

### خطأ: get_available_families does not exist

**الحل:**
```sql
-- شغّل: database/karam_update_CLEAN.sql
-- يحتوي على جميع الدوال المطلوبة
```

---

## ✅ Checklist التشخيص السريع

قبل البدء بحل المشاكل، تحقق من:

- [ ] الخادم المحلي يعمل (`http://localhost:8000`)
- [ ] ملف `config.js` موجود بمعلومات Supabase صحيحة
- [ ] Console لا يظهر أخطاء (F12)
- [ ] توجد أسر في قاعدة البيانات
- [ ] الأسر `status='approved'` و `is_active=true`
- [ ] جدول `booking_time_slots` موجود
- [ ] دالة `get_available_families` موجودة

---

## 🔍 استعلامات تشخيصية

### 1. التحقق من الأسر:
```sql
SELECT 
    family_name,
    city,
    capacity,
    status,
    is_active,
    rating
FROM host_families
WHERE status = 'approved' AND is_active = true;
```

### 2. التحقق من الجداول:
```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public'
AND table_name IN ('host_families', 'bookings', 'booking_time_slots', 'discount_codes');
```

### 3. التحقق من الدوال:
```sql
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_schema = 'public'
AND routine_name IN ('get_available_families', 'check_concurrent_capacity', 'validate_discount_code');
```

### 4. اختبار دالة get_available_families:
```sql
SELECT * FROM get_available_families(
    CURRENT_DATE + 7,
    '14:00'::TIME,
    '18:00'::TIME,
    5
);
```

---

## 💡 نصائح عامة

1. **استخدم Console دائماً:** اضغط F12 لرؤية الأخطاء
2. **تحقق من Network Tab:** لرؤية طلبات Supabase
3. **اقرأ رسائل الأخطاء:** غالباً تحتوي على الحل
4. **حدّث الصفحة بقوة:** `Ctrl+Shift+R` لمسح الـ cache

---

## 📞 الدعم

إذا استمرت المشكلة:
1. التقط صورة للـ Console (F12)
2. اكتب الخطوات التي قمت بها
3. شارك رسالة الخطأ كاملة
