# دليل ربط النطاق karam-haji.com بمنصة كرم 🌐

## المحتويات
1. [نشر المشروع على Netlify (موصى به)](#netlify)
2. [نشر المشروع على Vercel](#vercel)
3. [ربط النطاق karam-haji.com](#domain-setup)
4. [تكوين DNS](#dns-config)
5. [التحقق من النطاق](#verification)

---

## الخيار 1: نشر على Netlify + ربط النطاق 🚀 {#netlify}

### المرحلة الأولى: نشر المشروع على Netlify

#### 1. إنشاء حساب Netlify
- اذهب إلى [https://www.netlify.com](https://www.netlify.com)
- اضغط **"Sign up"**
- سجل باستخدام:
  - GitHub (موصى به إذا كان لديك حساب)
  - Email
  - GitLab
  - Bitbucket

#### 2. نشر المشروع

**الطريقة الأولى: السحب والإفلات (Drag & Drop)**
1. بعد تسجيل الدخول، اضغط **"Add new site"** → **"Deploy manually"**
2. **اسحب مجلد** `C:\Users\Shakir\.gemini\antigravity\scratch\karam-platform` **بالكامل** وأفلته في منطقة الرفع
3. انتظر حتى يكتمل الرفع (عادة 1-2 دقيقة)
4. ستحصل على رابط مثل: `https://random-name-123456.netlify.app`

**الطريقة الثانية: ربط GitHub (احترافي)**
1. أولاً، ارفع المشروع على GitHub:
   ```powershell
   cd C:\Users\Shakir\.gemini\antigravity\scratch\karam-platform
   git init
   git add .
   git commit -m "Initial commit - Karam Platform"
   git branch -M main
   git remote add origin https://github.com/YOUR_USERNAME/karam-platform.git
   git push -u origin main
   ```

2. في Netlify:
   - اضغط **"Add new site"** → **"Import an existing project"**
   - اختر **"GitHub"**
   - اختر repository: `karam-platform`
   - اضغط **"Deploy site"**

#### 3. تخصيص الاسم (اختياري)
- اذهب إلى **Site settings** → **Site details**
- اضغط **"Change site name"**
- غير الاسم إلى `karam-platform` أو أي اسم تفضله
- الرابط الجديد: `https://karam-platform.netlify.app`

---

### المرحلة الثانية: ربط النطاق karam-haji.com في Netlify

#### 1. الوصول إلى إعدادات النطاق
- في لوحة تحكم Netlify، اختر المشروع
- اذهب إلى **"Domain management"** → **"Add custom domain"**

#### 2. إضافة النطاق
- أدخل: `karam-haji.com`
- اضغط **"Verify"**
- اضغط **"Add domain"**

#### 3. إضافة WWW Subdomain (اختياري)
- اضغط **"Add domain alias"**
- أدخل: `www.karam-haji.com`
- اضغط **"Add domain"**

#### 4. الحصول على DNS Records من Netlify

بعد إضافة النطاق، ستحتاج إلى **DNS Records**. Netlify سيعطيك:

**الطريقة A: استخدام Netlify DNS (الأسهل)**
- ستظهر لك Name Servers مثل:
  ```
  dns1.p03.nsone.net
  dns2.p03.nsone.net
  dns3.p03.nsone.net
  dns4.p03.nsone.net
  ```
- احتفظ بها للخطوة التالية

**الطريقة B: استخدام DNS Records يدوياً**
- إذا اخترت عدم استخدام Netlify DNS، ستحتاج:
  - **A Record**: `75.2.60.5` (عنوان Netlify Load Balancer)
  - أو استخدم **CNAME Record** (إذا كان متاح):
    - Name: `@` (أو اتركه فارغاً)
    - Value: `your-site-name.netlify.app`

---

## الخيار 2: نشر على Vercel + ربط النطاق ⚡ {#vercel}

### المرحلة الأولى: نشر المشروع على Vercel

#### 1. إنشاء حساب Vercel
- اذهب إلى [https://vercel.com](https://vercel.com)
- اضغط **"Sign up"**
- سجل باستخدام GitHub (موصى به) أو Email

#### 2. نشر المشروع

**الطريقة الأولى: استخدام Vercel CLI**
```powershell
# تثبيت Vercel CLI
npm install -g vercel

# الانتقال إلى مجلد المشروع
cd C:\Users\Shakir\.gemini\antigravity\scratch\karam-platform

# تسجيل الدخول
vercel login

# النشر
vercel --prod
```

**الطريقة الثانية: استخدام GitHub**
1. ارفع المشروع على GitHub (كما في الطريقة أعلاه)
2. في Vercel Dashboard:
   - اضغط **"Add New"** → **"Project"**
   - اختر repository: `karam-platform`
   - اضغط **"Import"**
   - اضغط **"Deploy"**

#### 3. الاسم التلقائي
- ستحصل على رابط مثل: `https://karam-platform.vercel.app`

---

### المرحلة الثانية: ربط النطاق karam-haji.com في Vercel

#### 1. الوصول إلى إعدادات النطاق
- في لوحة تحكم Vercel، اختر المشروع
- اذهب إلى **"Settings"** → **"Domains"**

#### 2. إضافة النطاق
- أدخل: `karam-haji.com`
- اضغط **"Add"**

#### 3. الحصول على DNS Records من Vercel

Vercel سيعطيك أحد الخيارات:

**Option A: A Record**
- Type: `A`
- Name: `@`
- Value: `76.76.21.21` (Vercel's IP)

**Option B: CNAME Record**
- Type: `CNAME`
- Name: `@` (or leave empty)
- Value: `cname.vercel-dns.com`

**For WWW subdomain:**
- Type: `CNAME`
- Name: `www`
- Value: `cname.vercel-dns.com`

---

## تكوين DNS عند مزود النطاق 🔧 {#dns-config}

الآن تحتاج إلى تكوين DNS Records عند مزود النطاق الذي اشتريت منه **karam-haji.com**.

### إذا كنت تستخدم **GoDaddy**:

#### 1. تسجيل الدخول
- اذهب إلى [https://www.godaddy.com](https://www.godaddy.com)
- سجل دخول إلى حسابك

#### 2. إدارة النطاقات
- اذهب إلى **"My Products"** → **"Domains"**
- ابحث عن `karam-haji.com`
- اضغط **"DNS"** أو **"Manage DNS"**

#### 3. إضافة DNS Records

**للخيار A: استخدام Netlify/Vercel DNS (Name Servers)**
1. اضغط **"Change Nameservers"**
2. اختر **"Custom"**
3. أدخل Name Servers من Netlify أو Vercel
4. اضغط **"Save"**

**للخيار B: إضافة A Record أو CNAME يدوياً**

**لـ Netlify:**
1. اضغط **"Add"** تحت Records
2. اختر Type: **A**
3. Name: `@`
4. Value: `75.2.60.5`
5. TTL: `1 Hour` (أو الافتراضي)
6. اضغط **"Save"**

7. (اختياري) للـ WWW:
   - Type: **CNAME**
   - Name: `www`
   - Value: `your-site-name.netlify.app`
   - TTL: `1 Hour`

**لـ Vercel:**
1. اضغط **"Add"**
2. Type: **A**
3. Name: `@`
4. Value: `76.76.21.21`
5. اضغط **"Save"**

6. (اختياري) للـ WWW:
   - Type: **CNAME**
   - Name: `www`
   - Value: `cname.vercel-dns.com`

---

### إذا كنت تستخدم **Namecheap**:

#### 1. تسجيل الدخول
- اذهب إلى [https://www.namecheap.com](https://www.namecheap.com)
- سجل دخول

#### 2. إدارة النطاق
- اذهب إلى **"Domain List"**
- اضغط **"Manage"** بجانب `karam-haji.com`

#### 3. إعداد DNS

**للخيار A: Custom DNS (Name Servers)**
1. اذهب إلى **"Nameservers"**
2. اختر **"Custom DNS"**
3. أدخل Name Servers من Netlify/Vercel
4. اضغط **"Save"**

**للخيار B: Advanced DNS (Records)**
1. اذهب إلى **"Advanced DNS"**
2. اضغط **"Add New Record"**

**لـ Netlify:**
- Type: **A Record**
- Host: `@`
- Value: `75.2.60.5`
- TTL: **Automatic**

**لـ WWW:**
- Type: **CNAME Record**
- Host: `www`
- Value: `your-site-name.netlify.app`
- TTL: **Automatic**

---

### إذا كنت تستخدم **Google Domains** أو **Cloudflare**:

#### Google Domains:
1. اذهب إلى [https://domains.google.com](https://domains.google.com)
2. اختر النطاق → **"DNS"**
3. أضف Records كما في الأمثلة أعلاه

#### Cloudflare:
1. اذهب إلى [https://dash.cloudflare.com](https://dash.cloudflare.com)
2. اختر النطاق
3. اذهب إلى **"DNS"** → **"Records"**
4. اضغط **"Add record"**
5. أضف A Record أو CNAME كما في الأمثلة

---

## التحقق من النطاق ✅ {#verification}

### 1. الانتظار لانتشار DNS
- **DNS Propagation** يستغرق من دقائق إلى 48 ساعة
- عادة يكون جاهزاً في **1-6 ساعات**

### 2. فحص DNS Propagation
استخدم هذه الأدوات للتحقق:
- [https://dnschecker.org](https://dnschecker.org)
  - أدخل: `karam-haji.com`
  - اختر Type: `A` أو `CNAME`
  - اضغط **"Search"**
  - تحقق من انتشار DNS في مناطق مختلفة

- [https://www.whatsmydns.net](https://www.whatsmydns.net)

### 3. التحقق من HTTPS/SSL
- بعد انتشار DNS، Netlify/Vercel سيُفعّل **SSL Certificate** تلقائياً
- قد يستغرق **بضع دقائق إلى ساعة**
- بعدها، الموقع سيعمل على:
  - `https://karam-haji.com` ✅
  - `https://www.karam-haji.com` ✅ (إذا أضفت WWW)

### 4. اختبار الموقع
- افتح المتصفح
- اذهب إلى: `https://karam-haji.com`
- تأكد من:
  - ✅ الموقع يعمل بشكل صحيح
  - ✅ HTTPS مفعّل (قفل أخضر في شريط العنوان)
  - ✅ جميع الصفحات تعمل
  - ✅ الصور والأنماط تُحمّل بشكل صحيح

---

## نصائح مهمة ⚠️

### 1. النطاق الرئيسي (Root Domain)
- إذا أردت `karam-haji.com` فقط (بدون www):
  - استخدم A Record على `@`
  
- إذا أردت `www.karam-haji.com` أيضاً:
  - أضف CNAME Record على `www`
  - في Netlify/Vercel، فعّل **"Automatic HTTPS"**

### 2. إعادة التوجيه (Redirect)
- في Netlify/Vercel، يمكنك ضبط إعادة توجيه من:
  - `www.karam-haji.com` → `karam-haji.com`
  - أو العكس

- **في Netlify:**
  - اذهب إلى **"Domain management"** → **"HTTPS"**
  - فعّل **"Force HTTPS"**

### 3. تحديث الروابط
- تأكد من تحديث أي روابط داخلية في الكود
- تحديث ملف `js/config.js` أو أي ملف تكوين إذا كانت تحتوي على URLs

### 4. Supabase URL Configuration
- إذا كنت تستخدم Supabase، تذكر تحديث:
  - **Allowed URLs** في Supabase Dashboard
  - أضف: `https://karam-haji.com` و `https://www.karam-haji.com`

الخطوات:
1. اذهب إلى [https://app.supabase.com](https://app.supabase.com)
2. اختر المشروع
3. **Settings** → **Authentication** → **URL Configuration**
4. أضف:
   - Site URL: `https://karam-haji.com`
   - Redirect URLs: 
     - `https://karam-haji.com/*`
     - `https://www.karam-haji.com/*`

---

## استكشاف الأخطاء 🔍

### المشكلة 1: النطاق لا يعمل بعد 24 ساعة
- **الحل:**
  - تحقق من DNS Records في مزود النطاق
  - تأكد من أن القيم صحيحة تماماً
  - استخدم `dnschecker.org` للتحقق

### المشكلة 2: "SSL Certificate Error"
- **الحل:**
  - انتظر بضع دقائق إضافية
  - في Netlify: اذهب إلى **Domain management** → **HTTPS** → **"Renew certificate"**
  - في Vercel: عادة تلقائي، انتظر قليلاً

### المشكلة 3: الموقع يعمل على HTTP لكن ليس HTTPS
- **الحل:**
  - في Netlify: فعّل **"Force HTTPS"**
  - في Vercel: تأكد من أن SSL Certificate تم إصداره

### المشكلة 4: "Domain not found" في Netlify/Vercel
- **الحل:**
  - تأكد من إضافة النطاق في Dashboard
  - تحقق من DNS Records مرة أخرى

---

## الخطوات التالية بعد النشر 🚀

### 1. تتبع الزوار (Analytics)
- **Netlify Analytics**: خدمة مدفوعة
- **الخيارات المجانية:**
  - Google Analytics
  - Plausible
  - Umami

### 2. تحسين SEO
- إضافة `robots.txt`
- إضافة `sitemap.xml`
- تحسين Meta Tags

### 3. الأداء
- استخدم **Lighthouse** في Chrome DevTools
- ضغط الصور
- تفعيل Caching

### 4. المراقبة
- إعداد **Uptime Monitoring**:
  - UptimeRobot (مجاني)
  - StatusCake
  - Pingdom

---

## ملخص سريع 📋

### للنشر على Netlify:
1. ✅ سجل حساب في Netlify
2. ✅ ارفع مجلد `karam-platform`
3. ✅ أضف `karam-haji.com` في Domain Settings
4. ✅ احصل على DNS Records من Netlify
5. ✅ أضف DNS Records في مزود النطاق (GoDaddy/Namecheap/etc)
6. ✅ انتظر DNS Propagation (1-6 ساعات)
7. ✅ فعّل HTTPS
8. ✅ اختبر الموقع

### للنشر على Vercel:
1. ✅ سجل حساب في Vercel
2. ✅ استخدم `vercel --prod` أو اربط GitHub
3. ✅ أضف `karam-haji.com` في Domains Settings
4. ✅ احصل على DNS Records من Vercel
5. ✅ أضف DNS Records في مزود النطاق
6. ✅ انتظر DNS Propagation
7. ✅ فعّل HTTPS (تلقائي)
8. ✅ اختبر الموقع

---

## الموارد المفيدة 📚

- [Netlify Documentation](https://docs.netlify.com)
- [Vercel Documentation](https://vercel.com/docs)
- [DNS Checker](https://dnschecker.org)
- [SSL Test](https://www.ssllabs.com/ssltest/)
- [Supabase Docs](https://supabase.com/docs)

---

**بالتوفيق في نشر منصة كرم! 🎉**

إذا واجهت أي مشكلة، لا تتردد في طلب المساعدة.
