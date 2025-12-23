# دليل إعداد Supabase لمنصة كرم

## الخطوة 1: إنشاء حساب ومشروع Supabase

### 1.1 التسجيل
1. اذهب إلى [https://supabase.com](https://supabase.com)
2. اضغط "Start your project"
3. سجل عبر GitHub أو Email

### 1.2 إنشاء مشروع جديد
1. بعد تسجيل الدخول، اضغط "New Project"
2. املأ البيانات:
   - **Name:** karam-platform
   - **Database Password:** اختر كلمة مرور قوية (احفظها!)
   - **Region:** اختر الأقرب لك (مثل: Frankfurt)
3. اضغط "Create new project"
4. انتظر دقيقتين حتى يتم تجهيز المشروع

---

## الخطوة 2: إنشاء قاعدة البيانات

### 2.1 فتح SQL Editor
1. من القائمة الجانبية، اختر "SQL Editor"
2. اضغط "New query"

### 2.2 تنفيذ SQL Schema

انسخ والصق الكود التالي في SQL Editor:

```sql
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table (handled by Supabase Auth automatically)
-- We'll extend it with user_profiles

-- User Profiles
CREATE TABLE user_profiles (
    id UUID REFERENCES auth.users PRIMARY KEY,
    role TEXT NOT NULL CHECK (role IN ('umrah_visitor', 'host_family', 'company', 'admin', 'operator')),
    full_name TEXT,
    phone TEXT,
    avatar_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Host Families
CREATE TABLE host_families (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users NOT NULL,
    family_name TEXT NOT NULL,
    city TEXT NOT NULL CHECK (city IN ('makkah', 'madinah')),
    address TEXT NOT NULL,
    description TEXT,
    capacity INTEGER NOT NULL DEFAULT 10,
    images TEXT[],
    rating_avg NUMERIC(3,2) DEFAULT 0,
    total_reviews INTEGER DEFAULT 0,
    is_verified BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id)
);

-- Packages
CREATE TABLE packages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    name_en TEXT,
    type TEXT NOT NULL CHECK (type IN ('simple_hospitality', 'meal_hospitality')),
    base_price NUMERIC(10,2) NOT NULL,
    b2b_price NUMERIC(10,2),
    description TEXT,
    includes JSONB,
    duration_hours INTEGER DEFAULT 2,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Bookings
CREATE TABLE bookings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users NOT NULL,
    host_family_id UUID REFERENCES host_families NOT NULL,
    package_id UUID REFERENCES packages NOT NULL,
    booking_type TEXT NOT NULL CHECK (booking_type IN ('individual', 'group')),
    number_of_guests INTEGER NOT NULL DEFAULT 1,
    booking_date DATE NOT NULL,
    booking_time TIME NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'completed', 'cancelled')),
    total_price NUMERIC(10,2) NOT NULL,
    commission NUMERIC(10,2),
    payment_status TEXT NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'refunded')),
    salla_transaction_id TEXT,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Products
CREATE TABLE products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    description TEXT,
    price NUMERIC(10,2) NOT NULL,
    category TEXT,
    images TEXT[],
    stock INTEGER DEFAULT 0,
    family_commission_rate NUMERIC(5,2) DEFAULT 10.00,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Product Inventory at Family's Place
CREATE TABLE product_inventory (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID REFERENCES products NOT NULL,
    host_family_id UUID REFERENCES host_families NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 0,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(product_id, host_family_id)
);

-- Reviews
CREATE TABLE reviews (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    booking_id UUID REFERENCES bookings UNIQUE NOT NULL,
    user_id UUID REFERENCES auth.users NOT NULL,
    host_family_id UUID REFERENCES host_families NOT NULL,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Companies
CREATE TABLE companies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users NOT NULL,
    company_name TEXT NOT NULL,
    commercial_registration TEXT NOT NULL,
    license_number TEXT,
    company_type TEXT CHECK (company_type IN ('umrah', 'hajj', 'both')),
    company_address TEXT,
    expected_visitors TEXT,
    website TEXT,
    discount_rate NUMERIC(5,2) DEFAULT 15.00,
    is_approved BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id)
);

-- Chat Messages
CREATE TABLE chat_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users NOT NULL,
    operator_id UUID REFERENCES auth.users,
    message TEXT NOT NULL,
    is_from_user BOOLEAN DEFAULT TRUE,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Landing Page Content (CMS)
CREATE TABLE landing_page_content (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    section TEXT NOT NULL UNIQUE,
    content JSONB NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Team Members
CREATE TABLE team_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    role TEXT NOT NULL,
    department TEXT NOT NULL CHECK (department IN ('founders', 'development', 'marketing', 'operations')),
    photo_url TEXT,
    bio TEXT,
    order_index INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Investment Requests
CREATE TABLE investment_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT NOT NULL,
    company TEXT,
    investment_amount TEXT,
    message TEXT,
    status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'reviewed', 'contacted', 'approved', 'rejected')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create Indexes for Performance
CREATE INDEX idx_bookings_user ON bookings(user_id);
CREATE INDEX idx_bookings_family ON bookings(host_family_id);
CREATE INDEX idx_bookings_date ON bookings(booking_date);
CREATE INDEX idx_reviews_family ON reviews(host_family_id);
CREATE INDEX idx_chat_messages_user ON chat_messages(user_id);

-- Insert Default Packages
INSERT INTO packages (name, name_en, type, base_price, b2b_price, description, includes, duration_hours) VALUES
('باقة الضيافة البسيطة', 'Simple Hospitality Package', 'simple_hospitality', 150.00, 120.00,
 'استقبال تراثي مع ضيافة وتصوير',
 '["قهوة وتمر", "حلويات تقليدية", "جلسة تراثية", "تصوير بالزي الشعبي", "صور تذكارية"]'::jsonb,
 2),

('باقة الوجبة الكاملة', 'Full Meal Package', 'meal_hospitality', 300.00, 240.00,
 'تجربة متكاملة مع وجبة تقليدية فاخرة',
 '["كل ما في الباقة البسيطة", "وجبة غداء أو عشاء", "أطباق شعبية أصيلة", "جلسة ممتدة", "هدية تذكارية", "خصم 10% على المنتجات"]'::jsonb,
 3);
```

3. اضغط "Run" أو Ctrl+Enter
4. انتظر حتى يظهر "Success"

---

## الخطوة 3: إعداد Row Level Security (RLS)

انسخ والصق هذا الكود في SQL Editor جديد:

```sql
-- Enable RLS on all tables
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE host_families ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE investment_requests ENABLE ROW LEVEL SECURITY;

-- User Profiles Policies
CREATE POLICY "Users can view own profile" ON user_profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON user_profiles FOR UPDATE USING (auth.uid() = id);

-- Host Families Policies (Everyone can view approved families)
CREATE POLICY "Anyone can view verified families" ON host_families FOR SELECT USING (is_verified = TRUE AND is_active = TRUE);
CREATE POLICY "Family owners can manage their data" ON host_families FOR ALL USING (auth.uid() = user_id);

-- Bookings Policies
CREATE POLICY "Users can view own bookings" ON bookings FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create bookings" ON bookings FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Families can view their bookings" ON bookings FOR SELECT USING (
    EXISTS (SELECT 1 FROM host_families WHERE host_families.id = bookings.host_family_id AND host_families.user_id = auth.uid())
);

-- Reviews Policies
CREATE POLICY "Anyone can view reviews" ON reviews FOR SELECT USING (TRUE);
CREATE POLICY "Users can create reviews for their bookings" ON reviews FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Products Policies (Everyone can view)
CREATE POLICY "Anyone can view products" ON products FOR SELECT USING (is_active = TRUE);

-- Team Members (Public)
CREATE POLICY "Anyone can view team members" ON team_members FOR SELECT USING (TRUE);

-- Chat Messages Policies
CREATE POLICY "Users can view own messages" ON chat_messages FOR SELECT USING (auth.uid() = user_id OR auth.uid() = operator_id);
CREATE POLICY "Users can send messages" ON chat_messages FOR INSERT WITH CHECK (auth.uid() = user_id);
```

اضغط "Run"

---

## الخطوة 4: إعداد Storage للصور

1. من القائمة الجانبية، اختر "Storage"
2. اضغط "Create bucket"
3. أنشئ Buckets التالية:
   - **avatars** (Public) - لصور المستخدمين
   - **family-images** (Public) - لصور المجالس
   - **products** (Public) - لصور المنتجات
   - **photos** (Public) - للصور التذكارية

لكل bucket، ضع علامة ✓ على "Public bucket"

---

## الخطوة 5: الحصول على API Keys

1. من القائمة الجانبية، اختر "Settings" > "API"
2. انسخ:
   - **Project URL** (مثل: https://xxxxx.supabase.co)
   - **anon/public key** (مفتاح طويل)

---

## الخطوة 6: تحديث الكود

### 6.1 حدّث ملف `js/auth.js`

افتح الملف وابحث عن:
```javascript
const SUPABASE_URL = 'https://your-project.supabase.co';
const SUPABASE_ANON_KEY = 'your-anon-key';
```

استبدلهما بالقيم الحقيقية من Supabase:
```javascript
const SUPABASE_URL = 'https://xxxxx.supabase.co'; // ضع الـ URL هنا
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'; // ضع المفتاح هنا
```

### 6.2 حدّث ملف `js/main.js`

ابحث عن:
```javascript
const API_BASE_URL = 'https://your-supabase-project.supabase.co';
const API_KEY = 'your-supabase-anon-key';
```

استبدلهما بنفس القيم.

---

## الخطوة 7: اختبار النظام

### 7.1 افتح الموقع

افتح `index.html` في المتصفح أو استخدم خادم محلي

### 7.2 جرّب التسجيل

1. اذهب إلى صفحة التسجيل
2. أنشئ حساب جديد
3. تحقق من بريدك الإلكتروني للتأكيد
4. سجل دخول

### 7.3 تحقق من قاعدة البيانات

1. في Supabase، اذهب إلى "Table Editor"
2. تحقق من جدول `auth.users` - يجب أن ترى المستخدم الجديد
3. تحقق من `user_profiles`

---

## الخطوة 8: حماية المفاتيح (Production)

> ⚠️ **مهم جداً:** المفاتيح الحالية في الكود هي "anon/public" وآمنة للاستخدام في Frontend، 
> لكن لا تشارك **service_role** key في Frontend أبداً!

### للنشر (Production):

1. استخدم Environment Variables:
   ```javascript
   const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
   const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
   ```

2. في Vercel/Netlify، أضف المتغيرات في Settings > Environment Variables

---

## استكشاف الأخطاء

### مشكلة: "Invalid API key"
- **الحل:** تأكد من نسخ المفتاح الصحيح (anon public key)

### مشكلة: "User already registered"
- **الحل:** استخدم بريد إلكتروني مختلف أو احذف المستخدم من Supabase

### مشكلة: "Email not confirmed"
- **الحل:** تحقق من بريدك الإلكتروني واضغط على رابط التأكيد

### مشكلة: لا توجد بيانات في الجداول
- **الحل:** تأكد من تنفيذ جميع SQL queries بنجاح

---

## الموارد المفيدة

- [Supabase Docs](https://supabase.com/docs)
- [Supabase Auth Guide](https://supabase.com/docs/guides/auth)
- [Row Level Security](https://supabase.com/docs/guides/auth/row-level-security)

---

## الخطوات التالية

بعد إعداد Supabase بنجاح:

1. ✅ اختبر جميع صفحات التسجيل
2. ✅ اختبر تسجيل الدخول
3. ✅ ابدأ في بناء صفحات Dashboard
4. ✅ أضف تكامل الدفع مع سلة
5. ✅ أضف ميزة رفع الصور للأسر

🎉 **تهانينا! أصبحت قاعدة البيانات جاهزة!**
