# 🎯 قائمة الأولويات المحدثة - بعد Storage Buckets
## التاريخ: 28 ديسمبر 2025، 10:36 مساءً

---

## ✅ تحديث الحالة:

### تم مؤخراً:
- ✅ **Storage Buckets** → تم إنشاؤها! 🎉
- ✅ **النطاق karam-haji.com** → مربوط ويعمل
- ✅ **Favicon** → تم إضافته

**الإنجاز المُحدّث:** 60% → **65%** ✅

---

## 🔥 المهام ذات الأولوية القصوى الآن (Top 5)

### 1️⃣ **Critical Features SQL** ⭐⭐⭐⭐⭐
**الوقت:** 10 دقائق فقط!  
**السبب:** SQL جاهز، فقط نطبقه!  
**التأثير:** يفعّل 5 ميزات دفعة واحدة

**الميزات التي ستُفعّل:**
```
✅ KYC/Verification columns
✅ Cancellation Policies
✅ Withdrawal System
✅ Coupons System
✅ Uploads Tracking
```

**الملف:** `database/critical_features.sql`

**الخطوة:**
1. افتح Supabase SQL Editor
2. انسخ محتوى `critical_features.sql`
3. Run
4. تم! ✅

---

### 2️⃣ **Moyasar Payment Integration** ⭐⭐⭐⭐⭐
**الوقت:** 2 ساعة  
**السبب:** حرج للإطلاق - لا مدفوعات بدونه!

**الخطوات:**
```
المرحلة 1: التسجيل (30 دقيقة)
✅ التسجيل في https://moyasar.com
✅ الحصول على Test API keys
✅ إضافة keys في js/config.js

المرحلة 2: التكامل (1.5 ساعة)
✅ تحديث checkout.html
✅ إنشاء/تحديث js/checkout.js
✅ Integration مع Moyasar SDK
✅ Callback handling
✅ Update booking payment_status
```

**الملفات:**
- `docs/MOYASAR_SETUP.md` (دليل موجود)
- `checkout.html` (يحتاج تحديث)
- `js/checkout.js` (يحتاج تكامل)

---

### 3️⃣ **SMS Service (Unifonic)** ⭐⭐⭐⭐
**الوقت:** 6 ساعات  
**السبب:** أنت طلبته + مهم للتواصل مع العملاء

**الخطوات:**
```
المرحلة 1: Unifonic Setup (1 ساعة)
✅ التسجيل في Unifonic
✅ الحصول على API key
✅ إدخال key في database (sms_accounts table)

المرحلة 2: Service Development (3 ساعات)
✅ إنشاء js/sms-service.js
✅ Send SMS function
✅ Bulk send function
✅ Check balance function

المرحلة 3: UI Integration (2 ساعة)
✅ تحديث operator-sms.html
✅ تحديث js/operator-sms.js
✅ Send form
✅ Templates management
✅ History display
```

**الملفات الموجودة:**
- ✅ `operator-sms.html`
- ✅ `database/sms_tables.sql`

**الملفات المطلوبة:**
- ❌ `js/sms-service.js` (NEW)
- ❌ `js/operator-sms.js` (تحديث)

---

### 4️⃣ **Financial Management Complete** ⭐⭐⭐⭐
**الوقت:** 8 ساعات  
**السبب:** Payouts & Withdrawals حرجة للعمليات

**الأقسام:**

#### A) Payouts Management (4 ساعات)
```
الصفحة: operator-finance.html

المطلوب:
✅ عرض pending_payouts من view
✅ زر "موافقة" → يحدّث payout_status
✅ زر "رفض" مع سبب
✅ عرض تفاصيل كل دفعة
✅ Filter & Search
```

#### B) Withdrawals Management (4 ساعات)
```
1. Operator Side (2 ساعة):
✅ عرض pending_withdrawals
✅ موافقة/رفض
✅ إدخال رقم التحويل
✅ تحديث wallet balance

2. Family Side (2 ساعة):
في family-wallet.html:
✅ نموذج طلب السحب
✅ IBAN input
✅ Bank details
✅ Amount validation
✅ عرض سجل الطلبات
```

**الملفات:**
- ✅ `operator-finance.html` (يحتاج تحديث)
- ✅ `js/operator-finance.js` (يحتاج تحديث)
- ✅ `family-wallet.html` (يحتاج تحديث)
- ✅ `js/family-wallet.js` (يحتاج تحديث)

---

### 5️⃣ **Booking Flow Complete** ⭐⭐⭐⭐⭐
**الوقت:** 4 ساعات  
**السبب:** نظام الحجز القلب النابض للمنصة!

**المراحل:**
```
1. Browse → Search (1 ساعة)
✅ عرض المجالس المتاحة
✅ Filters (city, date, type)
✅ Availability checking
✅ Price display

2. Booking → Add to Cart (1 ساعة)
✅ Select majlis
✅ Choose date & time
✅ Enter guests count
✅ Price calculation
✅ Add to cart

3. Checkout → Payment (1 ساعة)
✅ Cart summary
✅ Coupon application
✅ Total calculation
✅ Redirect to Moyasar

4. Confirmation → Updates (1 ساعة)
✅ Payment callback
✅ Update booking status
✅ Update wallet balances
✅ Send SMS notification
✅ Redirect to success page
```

**الملفات:**
- ✅ `browse-families-calendar.html` (يحتاج تحسين)
- ✅ `js/browse-calendar.js` (يحتاج تحسين)
- ✅ `checkout.html` (يحتاج تكامل Moyasar)
- ❌ `js/booking-engine.js` (NEW)

---

## 📅 خطة الجلسات المقترحة

### **الجلسة 1 (اليوم - 2.5 ساعة):**
```
✅ Critical Features SQL (10 دقيقة) ⭐⭐⭐⭐⭐
✅ Moyasar Registration (30 دقيقة) ⭐⭐⭐⭐⭐
✅ Moyasar Integration Start (2 ساعة) ⭐⭐⭐⭐⭐
```

### **الجلسة 2 (غداً - 4 ساعات):**
```
✅ Complete Moyasar Integration (1 ساعة)
✅ Booking Flow Complete (3 ساعات)
```

### **الجلسة 3 (بعد غد - 6 ساعات):**
```
✅ SMS Service Complete (6 ساعات)
```

### **الجلسة 4 (يوم 4 - 4 ساعات):**
```
✅ Payouts Management (4 ساعات)
```

### **الجلسة 5 (يوم 5 - 4 ساعات):**
```
✅ Withdrawals Management (4 ساعات)
```

**الإجمالي:** 20.5 ساعة لإكمال جميع الميزات الحرجة!

---

## 🚀 التوصية الفورية:

### **ابدأ الآن بـ:**

#### **الخيار A (موصى به!):** Critical SQL + Moyasar ⭐
```
الوقت: 2.5 ساعة
التأثير: 🔥🔥🔥🔥🔥

1. Critical Features SQL (10 دقيقة)
   → يفعّل 5 ميزات دفعة واحدة!

2. Moyasar Registration (30 دقيقة)
   → جهّز الحساب

3. Moyasar Integration (2 ساعة)
   → نطبق في checkout.html
```

#### **الخيار B:** SMS Service ⭐
```
الوقت: 6 ساعات
التأثير: 🔥🔥🔥🔥

مناسب إذا كان لديك وقت طويل
وتريد إنجاز ميزة كاملة
```

#### **الخيار C:** Financial Management ⭐
```
الوقت: 4 ساعات (Payouts فقط)
التأثير: 🔥🔥🔥🔥

Payouts Management
أو Withdrawals Management
```

---

## 📊 الإنجاز المتوقع:

```
الحالي: ██████░░░░ 65%

بعد Moyasar:      ████████░░ 75%
بعد Booking Flow: █████████░ 85%
بعد SMS:          █████████░ 90%
بعد Financial:    ██████████ 95%
بعد Testing:      ██████████ 100% 🎉
```

---

## ❓ ماذا تختار؟

**1️⃣** Critical SQL + Moyasar (2.5 ساعة) - **موصى به!** ⭐  
**2️⃣** SMS Service (6 ساعات)  
**3️⃣** Financial Management (4-8 ساعات)  
**4️⃣** Booking Flow (4 ساعات)  
**5️⃣** شيء آخر؟

---

**أخبرني بقرارك وسأبدأ فوراً! 🚀**

---

**التحديث:** Storage Buckets ✅ تم  
**التاريخ:** 28 ديسمبر 2025، 10:36 مساءً  
**الموقع:** https://karam-haji.com ✅
