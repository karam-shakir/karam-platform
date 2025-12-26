# 🔍 تحليل شامل للمتطلبات - Karam Platform
## مراجعة كاملة لما تم ذكره وما قد يكون مفقوداً

---

## ✅ ما تم تغطيته بالكامل

### Database & Backend:
- ✅ 16 جدول بقاعدة بيانات شاملة
- ✅ RLS Policies للأمان
- ✅ المحفظة الرئيسية + محافظ الأسر
- ✅ نظام الدفع الهجين (يدوي/تلقائي)
- ✅ نظام الحجوزات
- ✅ نظام المراجعات والشكاوى
- ✅ نظام الإشعارات (البنية التحتية)
- ✅ التقارير والتحليلات
- ✅ Triggers & Functions

---

## ⚠️ متطلبات مهمة مفقودة أو ناقصة

### 🔴 **حرجة - يجب تنفيذها**

#### 1. **التحقق من الهوية (KYC/Verification)**
**المشكلة**: لا يوجد نظام للتحقق من هوية الأسر والشركات

**المطلوب**:
- ✅ رفع صورة الهوية الوطنية للأسرة
- ✅ رفع السجل التجاري للشركات
- ✅ التحقق من رقم الجوال (OTP)
- ✅ التحقق من البريد الإلكتروني
- ✅ حالة التحقق: `verified`, `pending`, `rejected`

**إضافة للـ Database**:
```sql
ALTER TABLE families ADD COLUMN 
    id_document_url TEXT,
    id_verified BOOLEAN DEFAULT false,
    phone_verified BOOLEAN DEFAULT false,
    email_verified BOOLEAN DEFAULT false;

ALTER TABLE companies ADD COLUMN
    commercial_license_url TEXT,
    license_verified BOOLEAN DEFAULT false;
```

#### 2. **سياسة الإلغاء والاسترجاع (Cancellation & Refund Policy)**
**المشكلة**: لا توجد قواعد واضحة للإلغاء

**المطلوب**:
- ✅ فترة الإلغاء المجاني (مثلاً: 24 ساعة قبل الموعد)
- ✅ نسبة الاسترداد حسب وقت الإلغاء
- ✅ رسوم الإلغاء
- ✅ استثناءات (ظروف قاهرة)

**إضافة للـ Database**:
```sql
CREATE TABLE cancellation_policies (
    id UUID PRIMARY KEY,
    hours_before_booking INTEGER,
    refund_percentage DECIMAL(5,2),
    cancellation_fee DECIMAL(10,2),
    description_ar TEXT,
    description_en TEXT
);

ALTER TABLE bookings ADD COLUMN
    cancelled_by UUID REFERENCES auth.users(id),
    cancellation_reason TEXT,
    refund_amount DECIMAL(10,2),
    cancellation_fee DECIMAL(10,2);
```

#### 3. **نظام رفع الملفات (File Upload System)**
**المشكلة**: لم يتم تحديد آلية رفع الصور

**المطلوب**:
- ✅ Supabase Storage buckets
- ✅ حدود حجم الملف (5MB للصور، 10MB للمستندات)
- ✅ أنواع الملفات المسموحة
- ✅ معالجة الصور (resize, compress)
- ✅ CDN للأداء

**Supabase Storage Structure**:
```
- family-documents/
  - {family_id}/
    - id-card.jpg
    - house-entrance.jpg
    
- majlis-photos/
  - {majlis_id}/
    - photo1.jpg
    - photo2.jpg
    
- review-photos/
  - {review_id}/
    - photo1.jpg
    
- company-documents/
  - {company_id}/
    - commercial-license.pdf
```

#### 4. **نظام السحب المالي (Withdrawal System)**
**المشكلة**: الأسر تحتاج سحب أرباحها

**المطلوب**:
- ✅ طلب سحب من الأسرة
- ✅ حد أدنى للسحب (مثلاً: 100 ريال)
- ✅ موافقة المشغل
- ✅ تسجيل تفاصيل التحويل البنكي
- ✅ حالات: pending, approved, completed, rejected

**إضافة للـ Database**:
```sql
CREATE TYPE withdrawal_status AS ENUM ('pending', 'approved', 'processing', 'completed', 'rejected');

CREATE TABLE withdrawal_requests (
    id UUID PRIMARY KEY,
    wallet_id UUID REFERENCES wallets(id),
    amount DECIMAL(10,2) NOT NULL,
    bank_account_number TEXT,
    iban TEXT,
    bank_name TEXT,
    status withdrawal_status DEFAULT 'pending',
    requested_at TIMESTAMP DEFAULT NOW(),
    approved_at TIMESTAMP,
    approved_by UUID REFERENCES auth.users(id),
    completed_at TIMESTAMP,
    rejection_reason TEXT
);
```

#### 5. **نظام الخصومات (Promo Codes & Coupons)**
**المشكلة**: لا يوجد نظام للعروض والخصومات

**المطلوب**:
- ✅ إنشاء كوبونات خصم
- ✅ أنواع: نسبة مئوية، مبلغ ثابت
- ✅ شروط الاستخدام (حد أدنى للمبلغ، صلاحية، عدد الاستخدامات)
- ✅ كوبونات لمستخدمين محددين
- ✅ كوبونات لمدن أو عوائل محددة

**إضافة للـ Database**:
```sql
CREATE TYPE coupon_type AS ENUM ('percentage', 'fixed_amount');

CREATE TABLE coupons (
    id UUID PRIMARY KEY,
    code TEXT UNIQUE NOT NULL,
    discount_type coupon_type,
    discount_value DECIMAL(10,2),
    min_booking_amount DECIMAL(10,2),
    max_discount_amount DECIMAL(10,2),
    usage_limit INTEGER,
    used_count INTEGER DEFAULT 0,
    valid_from TIMESTAMP,
    valid_until TIMESTAMP,
    is_active BOOLEAN DEFAULT true,
    applicable_cities city_type[],
    created_by UUID REFERENCES auth.users(id)
);

CREATE TABLE coupon_usage (
    id UUID PRIMARY KEY,
    coupon_id UUID REFERENCES coupons(id),
    booking_id UUID REFERENCES bookings(id),
    user_id UUID REFERENCES auth.users(id),
    discount_amount DECIMAL(10,2),
    used_at TIMESTAMP DEFAULT NOW()
);
```

---

### 🟡 **مهمة - يُفضل تنفيذها**

#### 6. **نظام التقييم المزدوج (Mutual Rating)**
**الحالي**: فقط الزوار يقيمون الأسر

**المقترح**: الأسر أيضاً تقيّم الزوار!
- ✅ يساعد في منع السلوك السيء
- ✅ الزوار ذوي التقييم المنخفض قد يُرفضون

**إضافة للـ Database**:
```sql
CREATE TABLE family_visitor_ratings (
    id UUID PRIMARY KEY,
    booking_id UUID UNIQUE REFERENCES bookings(id),
    family_id UUID REFERENCES families(id),
    visitor_id UUID REFERENCES visitors(id),
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- إضافة للـ visitors table
ALTER TABLE visitors ADD COLUMN
    average_rating DECIMAL(3,2) DEFAULT 0,
    rating_count INTEGER DEFAULT 0;
```

#### 7. **نظام الإشعارات الفعلي (SMS & Email Implementation)**
**الحالي**: جدول notifications فقط

**المطلوب**:
- ✅ تكامل SMS (Unifonic, Twilio)
- ✅ تكامل Email (SendGrid, AWS SES)
- ✅ إشعارات Push (للتطبيق المستقبلي)
- ✅ تفضيلات الإشعارات للمستخدم

**إضافة**:
```sql
CREATE TABLE notification_preferences (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id),
    email_enabled BOOLEAN DEFAULT true,
    sms_enabled BOOLEAN DEFAULT true,
    push_enabled BOOLEAN DEFAULT true,
    booking_notifications BOOLEAN DEFAULT true,
    payment_notifications BOOLEAN DEFAULT true,
    review_notifications BOOLEAN DEFAULT true
);

CREATE TABLE notification_logs (
    id UUID PRIMARY KEY,
    notification_id UUID REFERENCES notifications(id),
    channel TEXT, -- 'email', 'sms', 'push'
    sent_at TIMESTAMP,
    delivered BOOLEAN,
    error_message TEXT
);
```

#### 8. **نظام الحظر والإبلاغ (Block & Report System)**
**المشكلة**: لا يوجد آلية لحظر مستخدمين مسيئين

**المطلوب**:
- ✅ حظر مستخدمين من قبل المشغلين
- ✅ الإبلاغ عن سلوك غير لائق
- ✅ القائمة السوداء
- ✅ أسباب الحظر

**إضافة**:
```sql
CREATE TABLE blocked_users (
    id UUID PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id),
    blocked_by UUID REFERENCES auth.users(id),
    reason TEXT,
    blocked_at TIMESTAMP DEFAULT NOW(),
    expires_at TIMESTAMP,  -- NULL = دائم
    is_active BOOLEAN DEFAULT true
);

CREATE TABLE user_reports (
    id UUID PRIMARY KEY,
    reported_user_id UUID REFERENCES auth.users(id),
    reporter_id UUID REFERENCES auth.users(id),
    booking_id UUID REFERENCES bookings(id),
    report_type TEXT,
    description TEXT,
    status TEXT DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT NOW()
);
```

#### 9. **Audit Logs (سجل التدقيق)**
**المشكلة**: لا يوجد تتبع للتغييرات الحساسة

**المطلوب**:
- ✅ تسجيل جميع عمليات المشغلين
- ✅ تتبع التغييرات في الأسعار
- ✅ تتبع الموافقات والرفض
- ✅ تتبع المعاملات المالية

**إضافة**:
```sql
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id),
    action TEXT NOT NULL, -- 'approve_family', 'reject_payout', etc.
    table_name TEXT,
    record_id UUID,
    old_values JSONB,
    new_values JSONB,
    ip_address TEXT,
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);
```

#### 10. **FAQ & Help Center**
**المشكلة**: المستخدمون سيحتاجون مساعدة

**المطلوب**:
- ✅ قاعدة معرفية (Knowledge Base)
- ✅ أسئلة شائعة
- ✅ أدلة الاستخدام
- ✅ فيديوهات تعليمية

**إضافة**:
```sql
CREATE TABLE faq_categories (
    id UUID PRIMARY KEY,
    name_ar TEXT,
    name_en TEXT,
    icon TEXT,
    order_index INTEGER
);

CREATE TABLE faqs (
    id UUID PRIMARY KEY,
    category_id UUID REFERENCES faq_categories(id),
    question_ar TEXT,
    question_en TEXT,
    answer_ar TEXT,
    answer_en TEXT,
    order_index INTEGER,
    is_published BOOLEAN DEFAULT true,
    views_count INTEGER DEFAULT 0,
    helpful_count INTEGER DEFAULT 0
);
```

---

### 🟢 **اختيارية - Nice to Have**

#### 11. **نظام النقاط والمكافآت (Loyalty Program)**
- نقاط للأسر عند اكتمال الحجوزات
- نقاط للزوار عند الحجز
- استبدال النقاط بخصومات

#### 12. **Wishlist/Favorites**
- الزوار يحفظون عوائلهم المفضلة
- إشعار عند توفر تواريخ

#### 13. **Gift Cards**
- شراء بطاقات هدايا
- إهداء تجربة ضيافة

#### 14. **Referral Program**
- دعوة أصدقاء
- مكافآت للإحالات

#### 15. **Advanced Analytics**
- Google Analytics
- Hotjar/Mixpanel
- Conversion tracking

---

##📱 Frontend Requirements (التفصيل المفقود)

### 1. **Landing Page** (الصفحة الرئيسية)
**يجب أن تحتوي على**:
- ✅ Hero section مبهر
- ✅ شرح الآلية (How it Works)
- ✅ عرض الفوائد
- ✅ شهادات العملاء (Testimonials)
- ✅ إحصائيات المنصة (عدد الأسر، المدن، الحجوزات)
- ✅ أبرز العوائل
- ✅ دعوة للتسجيل (CTA)
- ✅ Footer شامل

### 2. **Authentication Pages**
- ✅ صفحة Login
- ✅ صفحة Register (منفصلة لكل نوع مستخدم)
- ✅ Forgot Password
- ✅ Email Verification
- ✅ Phone OTP Verification
- ✅ Social Login (اختياري: Google, Apple)

### 3. **Family Dashboard** (لوحة الأسرة)
**الصفحات المطلوبة**:
- ✅ Overview (نظرة عامة)
- ✅ Calendar Management (إدارة التوفر)
- ✅ Bookings (الحجوزات: Upcoming, Completed, Cancelled)
- ✅ Wallet & Earnings (المحفظة)
- ✅ Withdrawal Requests (طلبات السحب)
- ✅ Reviews (التقييمات المستلمة)
- ✅ Profile Settings
- ✅ Majlis Management (إدارة المجالس)
- ✅ Notifications

### 4. **Visitor Dashboard** (لوحة الزائر)
- ✅ Browse Families (تصفح العوائل)
- ✅ My Bookings (حجوزاتي)
- ✅ Favorites (المفضلة)
- ✅ Reviews Given (تقييماتي)
- ✅ Complaints (شكاويّ)
- ✅ Profile Settings

### 5. **Company Dashboard** (لوحة الشركة)
- ✅ Group Bookings (حجوزات جماعية)
- ✅ Guest Management (إدارة الضيوف)
- ✅ Booking History
- ✅ Invoices (الفواتير)
- ✅ Company Profile

### 6. **Operator Dashboard** (لوحة المشغّل) - **مفصلة**
**الأقسام الرئيسية**:
- ✅ Dashboard Overview (الإحصائيات الرئيسية)
- ✅ Families Management
  - Pending Approvals
  - Active Families
  - Rejected
  - Verification Queue
- ✅ Companies Management
- ✅ Bookings Overview
  - All Bookings
  - By Status
  - By Date Range
- ✅ Financial Management
  - Platform Wallet
  - Pending Payouts (الدفعات المعلقة) ⭐
  - Transaction History
  - Reports & Analytics
- ✅ Users Management
  - Visitors
  - Blocked Users
  - User Reports
- ✅ Complaints Management
- ✅ Reviews Moderation
- ✅ Pricing Management
  - Packages
  - Coupons
  - Discounts
- ✅ Platform Settings
  - General Settings
  - Notification Settings
  - Payment Gateway
  - Cancellation Policy
- ✅ Audit Logs
- ✅ Reports
  - Sales Report
  - Family Performance
  - City Performance
  - Monthly Trends

### 7. **Public Pages**
- ✅ Browse Families (تصفح مفتوح)
- ✅ Family Profile Page (صفحة العائلة)
- ✅ About Us
- ✅ How It Works
- ✅ Terms & Conditions
- ✅ Privacy Policy
- ✅ FAQ
- ✅ Contact Us

### 8. **Booking Flow** (سير الحجز)
**الخطوات المطلوبة**:
1. ✅ تصفح العوائل (Browse)
2. ✅ اختيار التاريخ والوقت (Calendar)
3. ✅ اختيار الباقة (Package)
4. ✅ إدخال عدد الضيوف
5. ✅ تفاصيل الضيوف (Guest Details)
6. ✅ تطبيق كوبون خصم (Coupon - إن وُجد)
7. ✅ Cart (السلة - للحجوزات المتعددة)
8. ✅ Review Order (مراجعة الطلب)
9. ✅ Payment (الدفع عبر Moyasar)
10. ✅ Confirmation (التأكيد)
11. ✅ Email/SMS Receipt (الإيصال)

---

## 🔧 Technical Requirements (التقنية)

### Security:
- ✅ **HTTPS** إجباري
- ✅ **CORS** configuration
- ✅ **Rate Limiting** (منع الإساءة)
- ✅ **Input Validation** (جميع المدخلات)
- ✅ **XSS Protection**
- ✅ **CSRF Protection**
- ✅ **SQL Injection** (محمي بـ Supabase)
- ✅ **Password Hashing** (bcrypt)
- ✅ **2FA** (اختياري للمشغلين)

### Performance:
- ✅ **Caching Strategy**
  - Redis للـ sessions
  - Service Worker للـ assets
- ✅ **CDN** للصور والـ static files
- ✅ **Lazy Loading** للصور
- ✅ **Code Splitting**
- ✅ **Database Indexing** (موجود)
- ✅ **Query Optimization**

### Monitoring:
- ✅ **Error Tracking** (Sentry)
- ✅ **Performance Monitoring**
- ✅ **Uptime Monitoring**
- ✅ **Database Metrics**
- ✅ **User Analytics**

### Backup & Recovery:
- ✅ **Daily Database Backups**
- ✅ **Point-in-Time Recovery**
- ✅ **Disaster Recovery Plan**
- ✅ **Data Retention Policy**

### Testing:
- ✅ **Unit Tests** (Functions)
- ✅ **Integration Tests** (API)
- ✅ **E2E Tests** (User Flows)
- ✅ **Load Testing** (للأداء)

### Documentation:
- ✅ **API Documentation**
- ✅ **User Manuals**
- ✅ **Developer Guide**
- ✅ **Deployment Guide**

---

## 📋 الأولويات المقترحة

### **المرحلة 1 - مُلحّة (الأسبوع الأول)**:
1. ✅ نظام رفع الملفات (File Upload)
2. ✅ التحقق من الهوية (KYC)
3. ✅ سياسة الإلغاء والاسترجاع
4. ✅ نظام السحب المالي

### **المرحلة 2 - مهمة (الأسبوع الثاني)**:
5. ✅ نظام الخصومات (Coupons)
6. ✅ التقييم المزدوج
7. ✅ تكامل SMS/Email
8. ✅ نظام الحظر

### **المرحلة 3 - تحسينات (الأسبوع الثالث)**:
9. ✅ Audit Logs
10. ✅ FAQ System
11. ✅ Monitoring & Analytics
12. ✅ Testing

### **المرحلة 4 - اختيارية (مستقبلاً)**:
13. ✅ Loyalty Program
14. ✅ Referral System
15. ✅ Gift Cards

---

## 📊 ملخص الإضافات المطلوبة على Database

**جداول جديدة مقترحة**:
1. `cancellation_policies` - سياسة الإلغاء
2. `withdrawal_requests` - طلبات السحب
3. `coupons` - الكوبونات
4. `coupon_usage` - استخدام الكوبونات
5. `family_visitor_ratings` - تقييم الأسر للزوار
6. `notification_preferences` - تفضيلات الإشعارات
7. `notification_logs` - سجل الإشعارات
8. `blocked_users` - المستخدمون المحظورون
9. `user_reports` - التبليغات
10. `audit_logs` - سجل التدقيق
11. `faq_categories` + `faqs` - الأسئلة الشائعة

**إجمالي الجداول**: 16 (حالي) + 11 (مقترح) = **27 جدول**

---

## ✅ الخلاصة

**تم تغطيته**: ~60%  
**مفقود (حرج)**: ~25%  
**مفقود (مهم)**: ~10%  
**اختياري**: ~5%

**التوصية**: تنفيذ المتطلبات الحرجة (🔴) أولاً قبل إطلاق النظام!

---

**تم الإعداد بواسطة**: Dr. Shakir Alhuthali  
**التاريخ**: 2025-12-25  
**المشروع**: Karam Platform 🌟
