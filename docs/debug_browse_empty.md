# 🔍 Debug: لا تظهر مجالس في Browse

## الخطوة 1: فحص Console في المتصفح

**افتح Console (F12)** واضغط "بحث" مرة أخرى.

**ابحث عن:**
- أي errors حمراء؟
- رسالة "Search error"?
- "0 مجلس متاح"?

---

## الخطوة 2: فحص Database

**في Supabase SQL Editor، نفذ:**

### 2.1 هل توجد مجالس؟
```sql
SELECT count(*) as total FROM majlis;
SELECT count(*) as active FROM majlis WHERE is_active = true;
```

### 2.2 عرض المجالس الموجودة:
```sql
SELECT 
    m.id,
    m.majlis_name,
    m.majlis_type,
    m.is_active,
    f.family_name,
    f.city
FROM majlis m
LEFT JOIN families f ON m.family_id = f.id
LIMIT 5;
```

---

## الخطوة 3: إنشاء Test Majlis (إذا لم توجد)

**إذا كانت النتيجة 0 مجالس:**

### 3.1 احصل على family ID:
```sql
SELECT id, family_name, user_id 
FROM families 
WHERE user_id = auth.uid()
LIMIT 1;
```

### 3.2 أنشئ test majlis:
```sql
-- استبدل 'YOUR_FAMILY_ID' بـ ID الفعلي من الخطوة 3.1
INSERT INTO majlis (
    family_id,
    majlis_name,
    majlis_type,
    capacity,
    base_price,
    is_active,
    description_ar
) VALUES (
    'YOUR_FAMILY_ID',  -- <-- استبدل هنا
    'مجلس الضيافة الرئيسي',
    'men',
    20,
    150.00,
    true,
    'مجلس فاخر لاستقبال الضيوف'
);
```

---

## الخطوة 4: اختبر مرة أخرى

**بعد إنشاء majlis:**
1. Reload browse page
2. اضغط "بحث"
3. يجب أن يظهر المجلس الآن!

---

## الخطوة 5: البديل السريع - نعرض من family-majlis

**إذا لم ينجح Browse:**
- استخدم family-majlis.html لإضافة مجالس ✅
- ثم ارجع لbrowse وابحث
