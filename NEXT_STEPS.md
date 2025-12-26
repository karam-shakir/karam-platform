# 🚀 الخطوات التالية - Phase 2
## بعد إكمال قاعدة البيانات

---

## ✅ تم الإنجاز - Completed

- ✅ **قاعدة البيانات الكاملة** (27 جدول)
- ✅ **RLS Policies** للجداول الأساسية
- ✅ **نظام المحفظة الهجين**
- ✅ **التقارير والتحليلات**
- ✅ **الميزات الحرجة** (KYC, Cancellation, Withdrawals, Coupons, SMS)

---

## 📋 Phase 2.1: إكمال إعدادات Supabase

### 1. 📁 **إعداد Storage Buckets** (5 دقائق)

قم بإنشاء Buckets التالية من **Supabase Dashboard → Storage**:

#### Bucket 1: `family-documents` (Private)
```
Settings:
- Public: ❌ No
- Allowed MIME types: image/jpeg, image/png, application/pdf
- Max file size: 10MB
```

**RLS Policy**:
```sql
-- Upload: Families can upload their own documents
CREATE POLICY "Families can upload documents"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'family-documents' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Read: Family and operators can read
CREATE POLICY "Families and operators can view documents"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'family-documents' 
  AND (
    (storage.foldername(name))[1] = auth.uid()::text
    OR EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE id = auth.uid() AND user_type = 'operator'
    )
  )
);
```

#### Bucket 2: `majlis-photos` (Public)
```
Settings:
- Public: ✅ Yes
- Allowed MIME types: image/jpeg, image/png, image/webp
- Max file size: 5MB
```

#### Bucket 3: `review-photos` (Public)
```
Settings:
- Public: ✅ Yes
- Allowed MIME types: image/jpeg, image/png, image/webp
- Max file size: 3MB
```

#### Bucket 4: `company-documents` (Private)
```
Settings:
- Public: ❌ No
- Allowed MIME types: application/pdf, image/jpeg, image/png
- Max file size: 10MB
```

---

### 2. 🔐 **RLS Policies للجداول الجديدة**

قم بتنفيذ هذا السكريبت في SQL Editor:

**ملف**: `database/rls_policies_extended.sql`

سأقوم بإنشائه الآن...

---

### 3. 📧 **إعداد SMS & Email Providers**

#### SMS Provider (Unifonic):
1. سجل في Unifonic: https://www.unifonic.com/
2. احصل على API Key
3. أضف السجل في جدول `sms_accounts`:

```sql
INSERT INTO public.sms_accounts (
    provider,
    api_key,
    sender_name,
    balance,
    is_active,
    created_by
) VALUES (
    'unifonic',
    'YOUR_UNIFONIC_API_KEY_HERE',
    'Karam',  -- Sender name (must be approved by Unifonic)
    0,
    true,
    (SELECT id FROM auth.users WHERE email = 'YOUR_OPERATOR_EMAIL' LIMIT 1)
);
```

#### Email Provider (SendGrid):
سنقوم بإعداده لاحقاً في Core Modules

---

## 📋 Phase 2.2: Core JavaScript Modules

### 1. **تحسين Supabase Client** ✨

**ملف**: `js/supabase-client.js`

إضافة:
- Error handling محسّن
- Retry logic
- Request interceptors
- Response caching

### 2. **نظام المصادقة الكامل** 🔐

**ملف**: `js/auth.js`

Features:
- Login/Logout
- Register (4 أنواع مستخدمين)
- Password Reset
- Email Verification
- Phone OTP Verification
- Session Management
- Auto-redirect based on user type

### 3. **نظام الترجمة (i18n)** 🌍

**ملف**: `js/i18n.js`

Features:
- العربية/English switching
- RTL/LTR support
- Dynamic content translation
- Date/Number formatting

### 4. **محرك الحجز** 🎫

**ملف**: `js/booking-engine.js`

Features:
- Calendar integration
- Availability checking
- Price calculation
- Coupon validation
- Multi-booking cart
- Booking confirmation

### 5. **تكامل Moyasar** 💳

**ملف**: `js/moyasar-payment.js`

Features:
- Payment initialization
- Payment processing
- Webhook handling
- Refund processing
- Receipt generation

---

## 📋 Phase 2.3: Operator Dashboard (أولوية عالية!)

### الصفحات المطلوبة:

#### 1. **Dashboard Overview** (`operator-dashboard.html`)
- الإحصائيات الرئيسية (من `operator_dashboard_stats`)
- Charts (حجوزات، إيرادات)
- أفضل/أسوأ أسر
- النشاط الأخير

#### 2. **Families Management** (`operator-families.html`)
- Pending Approvals
- Active Families
- KYC Verification
- Family Details View

#### 3. **Financial Management** (`operator-finance.html`)
- 💰 **Platform Wallet** (الرصيد الحالي)
- 📊 **Pending Payouts** (الدفعات المعلقة) ⭐
  - عرض من `pending_payouts` view
  - زر "موافقة" / "رفض"
  - تفاصيل كل دفعة
- 💸 **Withdrawal Requests** (طلبات السحب)
  - عرض من `pending_withdrawals` view
  - موافقة/رفض
  - إدخال رقم التحويل البنكي
- 📈 **Reports & Analytics**

#### 4. **SMS Management** (`operator-sms.html`) ⭐
- 📱 **SMS Balance** (رصيد الرسائل)
  - عرض الرصيد الحالي
  - زر "شحن الرصيد"
  - نموذج لإضافة رصيد
- ✉️ **Send SMS** (إرسال رسائل)
  - اختيار المستلمين (عوائل، زوار، الكل)
  - اختيار من القوالب الجاهزة
  - أو كتابة رسالة مخصصة
  - معاينة قبل الإرسال
- 📊 **SMS History** (سجل الرسائل)
  - جميع الرسائل المرسلة
  - الحالة (مرسل، تم التوصيل، فشل)
  - التكلفة
  - Filter & Search
- 📝 **SMS Templates** (القوالب)
  - عرض/تعديل القوالب
  - إضافة قوالب جديدة

#### 5. **Coupons Management** (`operator-coupons.html`)
- إنشاء كوبونات جديدة
- عرض الكوبونات النشطة
- إحصائيات الاستخدام
- تفعيل/إلغاء تفعيل

#### 6. **Settings** (`operator-settings.html`)
- Platform Settings
- Cancellation Policies
- Package Pricing
- Commission Rates

---

## 📋 Phase 2.4: Family Dashboard

### الصفحات المطلوبة:

1. **Dashboard** (`family-dashboard.html`)
2. **Calendar** (`family-calendar.html`)
3. **Bookings** (`family-bookings.html`)
4. **Wallet** (`family-wallet.html`) ⭐
   - عرض الرصيد الحالي
   - المعاملات الأخيرة
   - **زر "طلب سحب"** ⭐
   - نموذج طلب السحب (الحساب البنكي، IBAN، المبلغ)
5. **Withdrawal History** (`family-withdrawals.html`)
6. **Reviews** (`family-reviews.html`)
7. **Profile** (`family-profile.html`)

---

## 📋 Phase 2.5: Visitor Portal

1. **Browse Families** (`browse-families.html`)
2. **Family Profile** (`family-details.html`)
3. **Booking Flow** (multi-step)
4. **My Bookings** (`visitor-bookings.html`)
5. **Profile** (`visitor-profile.html`)

---

## 📋 Phase 2.6: Public Pages

1. **Landing Page** (`index.html`) ✨
2. **About** (`about.html`)
3. **How it Works** (`how-it-works.html`)
4. **FAQ** (`faq.html`)
5. **Contact** (`contact.html`)
6. **Terms** (`terms.html`)
7. **Privacy** (`privacy.html`)

---

## 🎯 الأولويات المقترحة

### **أسبوع 1**: Core Infrastructure
- [ ] إعداد Storage Buckets
- [ ] RLS Policies Extended
- [ ] Core JS Modules (Auth, i18n, Supabase client)
- [ ] Moyasar Integration

### **أسبوع 2**: Operator Dashboard
- [ ] Dashboard Overview
- [ ] Families Management
- [ ] **Financial Management** (Payouts, Withdrawals)
- [ ] **SMS Management** ⭐

### **أسبوع 3**: Family Portal + Visitor Flow
- [ ] Family Dashboard & Wallet
- [ ] Withdrawal Request Flow
- [ ] Visitor Booking Flow
- [ ] Payment Processing

### **أسبوع 4**: Polish & Launch
- [ ] Landing Page
- [ ] Testing
- [ ] Documentation
- [ ] Deployment

---

## 📞 ما تريد البدء به الآن؟

اختر واحداً:

**A)** إنشاء `rls_policies_extended.sql` للجداول الجديدة

**B)** بناء **Operator Dashboard - SMS Management** (كما طلبت)

**C)** بناء **Operator Dashboard - Financial Management** (Payouts + Withdrawals)

**D)** Core JavaScript Modules أولاً

**E)** شيء آخر تريده

---

**أخبرني بأي خيار تفضل وسأبدأ فوراً!** 🚀

---

**تم الإعداد بواسطة**: Dr. Shakir Alhuthali  
**التاريخ**: 2025-12-25  
**المشروع**: Karam Platform 🌟
