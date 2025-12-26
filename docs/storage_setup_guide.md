# 📦 دليل إعداد Storage Buckets - منصة كرم
## Supabase Storage Setup Guide

**التاريخ:** 26 ديسمبر 2025  
**الأولوية:** 🔴 حرجة  
**الوقت المقدر:** 15 دقيقة

---

## 📋 نظرة عامة

منصة كرم تحتاج **4 Storage Buckets** لإدارة الملفات والصور:

| Bucket | النوع | الاستخدام | الحجم الأقصى |
|--------|------|----------|-------------|
| `family-documents` | Private | وثائق التحقق للعوائل | 10MB |
| `majlis-photos` | Public | صور المجالس | 5MB |
| `review-photos` | Public | صور التقييمات | 3MB |
| `company-documents` | Private | وثائق الشركات | 10MB |

---

## 🚀 خطوات الإعداد

### الخطوة 1: فتح Supabase Dashboard
```
1. اذهب إلى: https://app.supabase.com
2. اختر مشروعك
3. من القائمة الجانبية: Storage
```

### الخطوة 2: إنشاء Bucket 1 - family-documents

```
اسم الـBucket: family-documents

الإعدادات:
✅ Public bucket: ❌ OFF
✅ Allowed MIME types: 
   - image/jpeg
   - image/png
   - application/pdf
✅ File size limit: 10 MB
```

**الخطوات في Dashboard:**
1. Click "New bucket"
2. Name: `family-documents`
3. Public: **Uncheck** (Private)
4. Click "Create bucket"

### الخطوة 3: إنشاء Bucket 2 - majlis-photos

```
اسم الـBucket: majlis-photos

الإعدادات:
✅ Public bucket: ✅ ON
✅ Allowed MIME types:
   - image/jpeg
   - image/png
   - image/webp
✅ File size limit: 5 MB
```

**الخطوات في Dashboard:**
1. Click "New bucket"
2. Name: `majlis-photos`
3. Public: **Check** (Public)
4. Click "Create bucket"

### الخطوة 4: إنشاء Bucket 3 - review-photos

```
اسم الـBucket: review-photos

الإعدادات:
✅ Public bucket: ✅ ON
✅ Allowed MIME types:
   - image/jpeg
   - image/png
   - image/webp
✅ File size limit: 3 MB
```

**الخطوات في Dashboard:**
1. Click "New bucket"
2. Name: `review-photos`
3. Public: **Check** (Public)
4. Click "Create bucket"

### الخطوة 5: إنشاء Bucket 4 - company-documents

```
اسم الـBucket: company-documents

الإعدادات:
✅ Public bucket: ❌ OFF
✅ Allowed MIME types:
   - image/jpeg
   - image/png
   - application/pdf
✅ File size limit: 10 MB
```

**الخطوات في Dashboard:**
1. Click "New bucket"
2. Name: `company-documents`
3. Public: **Uncheck** (Private)
4. Click "Create bucket"

---

## 🔒 الخطوة 6: تطبيق RLS Policies

### افتح SQL Editor في Supabase:
```
Dashboard > SQL Editor > New query
```

### نفّذ الـScript التالي:
```sql
-- انسخ محتوى ملف: database/storage_rls_policies.sql
-- والصقه هنا ثم اضغط Run
```

**أو:**
1. افتح: `database/storage_rls_policies.sql`
2. انسخ المحتوى كاملاً
3. الصقه في SQL Editor
4. اضغط "Run"

---

## ✅ الخطوة 7: التحقق من الإعداد

### تحقق من الـBuckets:
```
Dashboard > Storage

يجب أن ترى 4 buckets:
✅ family-documents (🔒 Private)
✅ majlis-photos (🌐 Public)
✅ review-photos (🌐 Public)
✅ company-documents (🔒 Private)
```

### تحقق من RLS Policies:

نفّذ هذا الـQuery في SQL Editor:
```sql
SELECT 
    schemaname,
    tablename, 
    policyname,
    cmd as operation,
    permissive
FROM pg_policies
WHERE schemaname = 'storage'
AND tablename = 'objects'
ORDER BY policyname;
```

**يجب أن ترى 16 policy تقريباً** (4 لكل bucket)

---

## 📂 هيكل المجلدات المقترح

### family-documents/
```
family-documents/
├── {user_id}/
│   ├── id_card.pdf
│   ├── family_card.pdf
│   └── address_proof.pdf
```

### majlis-photos/
```
majlis-photos/
├── {majlis_id}/
│   ├── photo_1.jpg
│   ├── photo_2.jpg
│   └── photo_3.jpg
```

### review-photos/
```
review-photos/
├── {review_id}/
│   ├── photo_1.jpg
│   └── photo_2.jpg
```

### company-documents/
```
company-documents/
├── {user_id}/
│   ├── commercial_registration.pdf
│   ├── tax_certificate.pdf
│   └── license.pdf
```

---

## 💻 الاستخدام في الكود

### مثال: رفع صورة لمجلس

```javascript
// في family-majlis.js
async function uploadMajlisPhoto(majlisId, file) {
    const fileName = `${majlisId}/${Date.now()}_${file.name}`;
    
    const { data, error } = await supabase.storage
        .from('majlis-photos')
        .upload(fileName, file, {
            cacheControl: '3600',
            upsert: false
        });
    
    if (error) {
        console.error('Upload error:', error);
        return null;
    }
    
    // Get public URL
    const { data: { publicUrl } } = supabase.storage
        .from('majlis-photos')
        .getPublicUrl(fileName);
    
    return publicUrl;
}
```

### مثال: رفع وثيقة عائلة

```javascript
// في family-register.js
async function uploadFamilyDocument(file, documentType) {
    const userId = supabase.auth.user().id;
    const fileName = `${userId}/${documentType}_${Date.now()}.pdf`;
    
    const { data, error } = await supabase.storage
        .from('family-documents')
        .upload(fileName, file);
    
    if (error) {
        console.error('Upload error:', error);
        return null;
    }
    
    // Get signed URL (for private buckets)
    const { data: { signedUrl } } = await supabase.storage
        .from('family-documents')
        .createSignedUrl(fileName, 3600); // 1 hour
    
    return { path: fileName, url: signedUrl };
}
```

### مثال: عرض صور المجلس

```javascript
// في browse-families.js
async function loadMajlisPhotos(majlisId) {
    const { data, error } = await supabase.storage
        .from('majlis-photos')
        .list(`${majlisId}/`);
    
    if (error) {
        console.error('List error:', error);
        return [];
    }
    
    return data.map(file => {
        const { data: { publicUrl } } = supabase.storage
            .from('majlis-photos')
            .getPublicUrl(`${majlisId}/${file.name}`);
        return publicUrl;
    });
}
```

---

## 🐛 استكشاف الأخطاء

### خطأ: "Bucket not found"
```
الحل:
1. تأكد من اسم الـBucket صحيح
2. تحقق من أنك أنشأت الـBucket في Dashboard
```

### خطأ: "Permission denied"
```
الحل:
1. تأكد من تنفيذ RLS Policies
2. تحقق من أن المستخدم مسجل دخول
3. تحقق من نوع المستخدم (family/visitor/etc)
```

### خطأ: "File too large"
```
الحل:
1. تحقق من حجم الملف
2. قم بضغط الصورة قبل الرفع
3. للصور استخدم: compression library
```

### خطأ: "Invalid MIME type"
```
الحل:
1. تحقق من نوع الملف المسموح
2. للـPDF: application/pdf
3. للصور: image/jpeg, image/png, image/webp
```

---

## 📊 الحدود والقيود

### Supabase Free Tier:
- ✅ 1 GB storage مجاني
- ✅ 2 GB bandwidth شهرياً
- ✅ Unlimited requests

### الترقية للـPro Plan:
- 💰 $25/month
- ✅ 100 GB storage
- ✅ 200 GB bandwidth
- ✅ Advanced features

---

## ✅ Checklist - للتأكد

- [ ] تم إنشاء 4 Buckets
- [ ] تم ضبط Public/Private بشكل صحيح
- [ ] تم تنفيذ RLS Policies
- [ ] تم اختبار رفع ملف في كل bucket
- [ ] تم اختبار عرض الملفات
- [ ] تم التحقق من الـPermissions

---

## 🎉 الخلاصة

بعد إتمام هذه الخطوات:
✅ Storage Buckets جاهزة  
✅ RLS Policies مطبقة  
✅ يمكن رفع/عرض الملفات بأمان  
✅ الصور العامة accessible للجميع  
✅ الوثائق الخاصة محمية

**الوقت الفعلي:** 10-15 دقيقة  
**الأولوية:** 🔴 حرجة - يجب إتمامها قبل الإطلاق

---

**التالي:** [config.js Setup Guide](config_setup.md)
