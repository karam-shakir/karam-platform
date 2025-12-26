# 📁 Supabase Storage Setup Guide
## إعداد مخازن الملفات

---

## 🎯 الهدف

إعداد 4 مخازن (Buckets) لرفع وتخزين الملفات:
1. **family-documents** - مستندات العوائل (خاص)
2. **majlis-photos** - صور المجالس (عام)
3. **review-photos** - صور التقييمات (عام)
4. **company-documents** - مستندات الشركات (خاص)

---

## 📋 الخطوات التفصيلية

### الخطوة 1: الانتقال لقسم Storage

1. افتح **Supabase Dashboard**
2. اختر مشروعك: **karam-platform**
3. من القائمة الجانبية، اضغط على **Storage**

---

### الخطوة 2: إنشاء Bucket الأول - family-documents

#### إعدادات Bucket:

```
Name: family-documents
Public: ❌ NO (Private)
File size limit: 10485760 (10MB)
Allowed MIME types: image/jpeg,image/png,application/pdf
```

#### خطوات الإنشاء:

1. اضغط **"New bucket"**
2. **Bucket name**: `family-documents`
3. **Public bucket**: اتركه **غير مفعّل** (Private)
4. **File size limit**: `10485760` bytes (10MB)
5. **Allowed MIME types**: 
   ```
   image/jpeg
   image/png
   application/pdf
   ```
6. اضغط **"Create bucket"**

---

### الخطوة 3: إنشاء Bucket الثاني - majlis-photos

#### إعدادات Bucket:

```
Name: majlis-photos
Public: ✅ YES (Public)
File size limit: 5242880 (5MB)
Allowed MIME types: image/jpeg,image/png,image/webp
```

#### خطوات الإنشاء:

1. اضغط **"New bucket"**
2. **Bucket name**: `majlis-photos`
3. **Public bucket**: **فعّله** ✅ (Public)
4. **File size limit**: `5242880` bytes (5MB)
5. **Allowed MIME types**:
   ```
   image/jpeg
   image/png
   image/webp
   ```
6. اضغط **"Create bucket"**

---

### الخطوة 4: إنشاء Bucket الثالث - review-photos

#### إعدادات Bucket:

```
Name: review-photos
Public: ✅ YES (Public)
File size limit: 3145728 (3MB)
Allowed MIME types: image/jpeg,image/png,image/webp
```

#### خطوات الإنشاء:

1. اضغط **"New bucket"**
2. **Bucket name**: `review-photos`
3. **Public bucket**: **فعّله** ✅ (Public)
4. **File size limit**: `3145728` bytes (3MB)
5. **Allowed MIME types**:
   ```
   image/jpeg
   image/png
   image/webp
   ```
6. اضغط **"Create bucket"**

---

### الخطوة 5: إنشاء Bucket الرابع - company-documents

#### إعدادات Bucket:

```
Name: company-documents
Public: ❌ NO (Private)
File size limit: 10485760 (10MB)
Allowed MIME types: image/jpeg,image/png,application/pdf
```

#### خطوات الإنشاء:

1. اضغط **"New bucket"**
2. **Bucket name**: `company-documents`
3. **Public bucket**: اتركه **غير مفعّل** (Private)
4. **File size limit**: `10485760` bytes (10MB)
5. **Allowed MIME types**:
   ```
   image/jpeg
   image/png
   application/pdf
   ```
6. اضغط **"Create bucket"**

---

## ✅ التحقق

بعد الإنشاء، يجب أن ترى 4 buckets في قائمة Storage:

- ✅ `family-documents` 🔒
- ✅ `majlis-photos` 🌐
- ✅ `review-photos` 🌐
- ✅ `company-documents` 🔒

---

## 🔐 الخطوة التالية

بعد إنشاء الـ Buckets، يجب تطبيق **RLS Policies** لكل bucket.

سيتم إضافة هذه السياسات في ملف `rls_policies_extended.sql`

---

## 📝 ملاحظات مهمة

### 🔒 Private Buckets:
- `family-documents`: فقط العائلة المالكة والمشغلين يمكنهم الوصول
- `company-documents`: فقط الشركة المالكة والمشغلين يمكنهم الوصول

### 🌐 Public Buckets:
- `majlis-photos`: الجميع يمكنهم المشاهدة، فقط العوائل يمكنهم الرفع
- `review-photos`: الجميع يمكنهم المشاهدة، فقط الزوار يمكنهم الرفع

### 📏 حدود الحجم:
- المستندات (PDF, صور الهوية): 10MB
- صور المجالس: 5MB
- صور التقييمات: 3MB

### 🖼️ أنواع الملفات:
- **الصور**: JPEG, PNG, WebP
- **المستندات**: PDF (للعقود والتراخيص)

---

## ⚠️ في حالة الخطأ

إذا واجهت مشكلة في إنشاء bucket:

1. تأكد أن الاسم فريد ولا يحتوي على مسافات
2. استخدم أحرف صغيرة فقط (lowercase)
3. استخدم شرطة `-` بدلاً من مسافة
4. تأكد من الاتصال بالإنترنت

---

## 🎯 بعد الانتهاء

بعد إنشاء جميع الـ Buckets، انتقل لتطبيق:

**الملف التالي**: `database/rls_policies_extended.sql`

✅ **جاهز للمتابعة!**

---

**تم الإعداد بواسطة**: Dr. Shakir Alhuthali  
**التاريخ**: 2025-12-25  
**المشروع**: Karam Platform 🌟
