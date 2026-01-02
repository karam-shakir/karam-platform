# دليل النشر - Deployment Guide

## 📋 قائمة التحقق قبل النشر

- [ ] تنفيذ `database/package_system_clean.sql` في Supabase Production
- [ ] تحديث متغيرات البيئة في Vercel
- [ ] اختبار جميع الميزات محلياً
- [ ] مراجعة RLS Policies
- [ ] تفعيل HTTPS

---

## 🗄️ قاعدة البيانات (Supabase)

### الخطوة 1: إعداد Production Database

1. **افتح Supabase Dashboard**
   ```
   https://app.supabase.com
   ```

2. **اختر المشروع** (أو أنشئ مشروع جديد)

3. **افتح SQL Editor**

4. **نفّذ السكريبت الرئيسي**
   ```sql
   -- انسخ محتوى database/package_system_clean.sql
   -- والصقه في SQL Editor
   -- اضغط RUN
   ```

5. **تحقق من النجاح**
   ```sql
   -- تحقق من الجداول
   SELECT table_name FROM information_schema.tables 
   WHERE table_name IN ('package_settings', 'available_slots', 'email_notifications');
   
   -- تحقق من الباقات الافتراضية
   SELECT * FROM package_settings;
   
   -- يجب أن ترى باقتين: basic و premium
   ```

### الخطوة 2: RLS Policies (اختياري - للأمان)

إذا كنت تريد تشديد الأمان:

```sql
-- تفعيل RLS
ALTER TABLE package_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE available_slots ENABLE ROW LEVEL SECURITY;

-- سياسات محسّنة (بعد التأكد من بنية user_profiles)
-- راجع المستند للتفاصيل
```

---

## 🌐 النشر على Vercel

### الخطوة 1: ربط GitHub

1. **افتح** https://vercel.com
2. **اضغط** "New Project"
3. **اختر** Git Repository
4. **حدد** `karam-platform`

### الخطوة 2: إعداد المتغيرات البيئية

في Vercel Dashboard → Settings → Environment Variables:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

> **ملاحظة**: إذا كنت تستخدم vanilla JS (بدون Next.js)، لا تحتاج environment variables - يمكنك استخدام `js/config.js` مباشرة

### الخطوة 3: إعدادات Build

```json
{
  "buildCommand": "",
  "outputDirectory": ".",
  "installCommand": ""
}
```

> للمشاريع Static (HTML/CSS/JS فقط)

### الخطوة 4: Deploy

```bash
# من terminal محلي (اختياري)
vercel --prod

# أو
# اضغط "Deploy" في Vercel Dashboard
```

---

## 🔐 الأمان

### 1. Supabase Keys

**⚠️ مهم جداً:**
- استخدم `anon key` للـ Frontend
- **لا تشارك** `service_role key` أبداً
- احتفظ بـ keys في متغيرات بيئة

### 2. RLS Policies

تأكد من تفعيل RLS على:
- `package_settings`
- `available_slots`
- `email_notifications`
- `majlis`
- `families`
- `bookings`

### 3. CORS

في Supabase Dashboard → Settings → API:
```
Allowed Origins: https://your-domain.vercel.app
```

---

## 📧 إعداد Resend (للإشعارات)

### الخطوة 1: إنشاء حساب

1. اذهب إلى https://resend.com
2. أنشئ حساب
3. احصل على API Key

### الخطوة 2: إعداد Domain

```
Domain: karam-haji.com
DNS Records: (سيوفرها Resend)
```

### الخطوة 3: دالة Supabase Edge Function

```javascript
// supabase/functions/send-email/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

serve(async (req) => {
  const { email, subject, html } = await req.json()
  
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${Deno.env.get('RESEND_API_KEY')}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      from: 'نظام كرم <noreply@karam-haji.com>',
      to: email,
      subject: subject,
      html: html
    })
  })
  
  return new Response(JSON.stringify(await res.json()))
})
```

---

## 🧪 الاختبار بعد النشر

### 1. اختبار المشغلين
```
URL: https://your-domain.vercel.app/operator-packages.html
- تسجيل دخول كمشغل
- تعديل أسعار الباقات
- حفظ
- التحقق من قاعدة البيانات
```

### 2. اختبار الأسر
```
URL: https://your-domain.vercel.app/family-majlis.html
- إضافة مجلس جديد
- اختيار باقة
- إضافة أوقات متاحة
- حفظ
```

### 3. اختبار الزوار
```
URL: https://your-domain.vercel.app/browse-families-calendar.html
- البحث عن مجالس
- تفعيل "الأوقات البديلة"
- عرض التفاصيل
- محاولة الحجز
```

---

## 🐛 استكشاف الأخطاء

### الخطأ: "CORS Error"
**الحل:**
```
Supabase → Settings → API → Add your Vercel domain
```

### الخطأ: "Invalid API Key"
**الحل:**
```
تحقق من js/config.js
تأكد من استخدام Production keys
```

### الخطأ: "RLS Policy Error"
**الحل:**
```sql
-- مؤقتاً للاختبار
ALTER TABLE table_name DISABLE ROW LEVEL SECURITY;

-- ثم راجع السياسات
```

### الخطأ: "Column does not exist"
**الحل:**
```
تأكد من تنفيذ package_system_clean.sql كاملاً
تحقق من أسماء الأعمدة في قاعدة البيانات
```

---

## 📊 المراقبة

### Vercel Analytics
```
Vercel Dashboard → Analytics
- Page views
- Performance
- Errors
```

### Supabase Logs
```
Supabase Dashboard → Logs
- Database queries
- API requests
- Errors
```

---

## 🔄 التحديثات المستقبلية

### Git Workflow
```bash
# تطوير محلي
git checkout -b feature/new-feature
# ... تعديلات ...
git commit -m "feat: add new feature"
git push origin feature/new-feature

# Pull Request على GitHub
# بعد الموافقة والدمج في main
# Vercel ستنشر تلقائياً!
```

### Database Migrations
```sql
-- لأي تعديلات مستقبلية على قاعدة البيانات
-- أنشئ ملفات migration منفصلة
-- مثال: database/migrations/2026-01-15-add-reviews.sql
```

---

## ✅ قائمة التحقق النهائية

- [ ] ✅ قاعدة البيانات Production جاهزة
- [ ] ✅ جميع الجداول موجودة
- [ ] ✅ الباقات الافتراضية موجودة
- [ ] ✅ RLS Policies مفعّلة
- [ ] ✅ Vercel متصل بـ GitHub
- [ ] ✅ Domain مربوط (إذا كان موجود)
- [ ] ✅ HTTPS مفعّل
- [ ] ✅ تم اختبار جميع الميزات
- [ ] ✅ Resend معدّ (للإشعارات)
- [ ] ✅ Analytics مفعّل

---

**النشر جاهز!** 🚀

في حال وجود أي مشاكل، راجع:
- [README.md](README.md)
- [CHANGELOG.md](CHANGELOG.md)
- أو افتح Issue على GitHub
