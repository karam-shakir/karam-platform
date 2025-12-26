# 🎯 Core JavaScript Modules - الوثيقة الشاملة
## Karam Platform - جاهز للتطوير!

---

## 📦 الملفات المُنشأة

تم إنشاء 5 ملفات JavaScript أساسية في مجلد `/js`:

### 1. `supabase-client.js` ✅
**عميل Supabase المحسّن**

#### الميزات:
- ✅ **Retry Logic**: إعادة المحاولة التلقائية للاستعلامات الفاشلة
- ✅ **Caching System**: نظام تخزين مؤقت ذكي (5 دقائق)
- ✅ **Error Handling**: معالجة الأخطاء بشكل موحّد
- ✅ **Query Builder**: بناء استعلامات مرنة وقوية
- ✅ **Storage Methods**: رفع/تحميل/حذف الملفات
- ✅ **Auth Helpers**: دوال مساعدة للمصادقة

#### الاستخدام:
```javascript
// استعلام بسيط
const { data, error } = await karamDB.select('families', {
    eq: { city: 'mecca', is_active: true },
    order: { column: 'created_at', ascending: false },
    limit: 10
});

// استعلام مع Cache
const packages = await karamDB.select('packages', {
    eq: { is_active: true }
}, true); // true = use cache

// إضافة سجل
await karamDB.insert('families', {
    family_name: 'عائلة الحذالي',
    city: 'mecca',
    contact_phone: '0501234567'
});

// تحديث
await karamDB.update('families', 
    { is_active: true },
    { id: 'family-uuid' }
);

// حذف
await karamDB.delete('families', { id: 'family-uuid' });

// استدعاء Function
const result = await karamDB.rpc('generate_financial_report', {
    start_date: '2025-01-01',
    end_date: '2025-01-31'
});

// رفع ملف
const { data } = await karamDB.uploadFile(
    'majlis-photos',
    'family-123/photo.jpg',
    fileObject
);
```

---

### 2. `auth.js` ✅
**نظام المصادقة المتكامل**

#### الميزات:
- ✅ **Registration**: تسجيل 4 أنواع مستخدمين (operator, family, visitor, company)
- ✅ **Login/Logout**: تسجيل دخول وخروج
- ✅ **Password Reset**: إعادة تعيين كلمة المرور
- ✅ **Email Verification**: تأكيد البريد الإلكتروني
- ✅ **Phone Verification**: تأكيد رقم الجوال (OTP)
- ✅ **Auto Redirect**: توجيه تلقائي حسب نوع المستخدم
- ✅ **Session Management**: إدارة الجلسات

#### الاستخدام:
```javascript
// التسجيل
const result = await karamAuth.register({
    userType: 'family',
    email: 'family@example.com',
    password: 'password123',
    family_name: 'عائلة الحذالي',
    contact_phone: '0501234567',
    city: 'mecca',
    address: 'حي العزيزية'
});

// تسجيل الدخول
const result = await karamAuth.login('email@example.com', 'password');

// تسجيل الخروج
await karamAuth.logout();

// التحقق من الصلاحيات
if (karamAuth.isOperator()) {
    // عرض إعدادات المشغلين
}

// حماية الصفحة
karamAuth.requireAuth(['operator']); // فقط المشغلين

// إرسال OTP للجوال
const result = await karamAuth.sendPhoneVerification('0501234567');

// تأكيد OTP
await karamAuth.verifyPhoneCode('123456');
```

---

### 3. `i18n.js` ✅
**نظام الترجمة الدولية**

#### الميزات:
- ✅ **Arabic/English**: دعم العربية والإنجليزية
- ✅ **RTL/LTR**: تبديل الاتجاه تلقائياً
- ✅ **Auto Translation**: ترجمة تلقائية عند تغيير اللغة
- ✅ **Number Formatting**: تنسيق الأرقام حسب اللغة
- ✅ **Currency Formatting**: تنسيق العملات
- ✅ **Date Formatting**: تنسيق التواريخ
- ✅ **Relative Time**: الوقت النسبي (منذ 5 دقائق...)

#### الاستخدام:
```javascript
// تغيير اللغة
i18n.setLanguage('ar'); // أو 'en'

// الحصول على الترجمة
const text = i18n.t('nav.home'); // "الرئيسية" أو "Home"

// ترجمة مع متغيرات
const msg = i18n.t('welcome', { name: 'شاكر' });

// تنسيق الأرقام
i18n.formatNumber(1234.56); // "١٬٢٣٤٫٥٦" بالعربية

// تنسيق العملات
i18n.formatCurrency(150); // "١٥٠٫٠٠ ر.س" بالعربية

// تنسيق التاريخ
i18n.formatDate(new Date()); // "٢٥ ديسمبر ٢٠٢٥" بالعربية

// HTML - الترجمة التلقائية
<h1 data-i18n="app.name"></h1>
<input placeholder="" data-i18n="auth.email">
<button data-lang-toggle>تبديل اللغة</button>
```

---

### 4. `booking-engine.js` ✅
**محرك الحجز المتقدم**

#### الميزات:
- ✅ **Availability Check**: فحص التوفر
- ✅ **Price Calculation**: حساب السعر
- ✅ **Coupon Validation**: التحقق من الكوبونات
- ✅ **Cart Management**: إدارة السلة
- ✅ **Booking Creation**: إنشاء الحجوزات
- ✅ **Cancellation**: إلغاء الحجز مع الاسترداد

#### الاستخدام:
```javascript
// فحص التوفر
const availability = await bookingEngine.checkAvailability(
    'majlis-id',
    '2025-12-26',
    'evening'
);

if (availability.available) {
    console.log('متاح!', availability.availableSlots, 'مقعد');
}

// حساب السعر
const pricing = await bookingEngine.calculateBookingPrice(
    'package-id',
    5, // عدد الضيوف
    'majlis-id',
    'COUPON10' // كوبون اختياري
);

console.log('السعر:', pricing.totalAmount);
console.log('الخصم:', pricing.discount);

// إضافة للسلة
await bookingEngine.addToCart({
    majlisId: 'majlis-123',
    familyName: 'عائلة الحذالي',
    date: '2025-12-26',
    timeSlot: 'evening',
    guestCount: 5,
    packageId: 'package-id',
    packageName: 'الباقة الماسية'
});

// إنشاء الحجوزات
const bookings = await bookingEngine.createBookings({
    method: 'moyasar',
    transactionId: 'pay_12345'
});

// إلغاء الحجز
const result = await bookingEngine.cancelBooking(
    'booking-id',
    'تغيير الموعد'
);

console.log('المبلغ المسترد:', result.refundAmount);
```

---

### 5. `moyasar-payment.js` ✅
**تكامل بوابة الدفع Moyasar**

#### الميزات:
- ✅ **Payment Form**: نموذج الدفع الجاهز
- ✅ **Payment Status**: التحقق من حالة الدفع
- ✅ **Refunds**: استرداد المبالغ
- ✅ **Cart Payment**: دفع السلة الكاملة
- ✅ **Multiple Methods**: بطاقات، Apple Pay، STC Pay

#### التحضير:
1. أضف Moyasar SDK في HTML:
```html
<script src="https://cdn.moyasar.com/mpf/1.7.3/moyasar.js"></script>
```

2. احصل على API Keys من: https://dashboard.moyasar.com/

3. حدّث المفاتيح في الملف:
```javascript
publishableKey: 'pk_test_xxxxx' // Test
// publishableKey: 'pk_live_xxxxx' // Production
```

#### الاستخدام:
```javascript
// إنشاء نموذج دفع
moyasarPayment.createPaymentForm('payment-container', {
    amount: 250.00,
    description: 'حجز الباقة الماسية',
    bookingId: 'booking-123',
    onSuccess: (payment) => {
        console.log('نجح الدفع!', payment);
        window.location.href = '/success.html';
    },
    onError: (error) => {
        alert('فشل الدفع: ' + error.error);
    }
});

// دفع السلة
moyasarPayment.processCartPayment('payment-container');

// التحقق من حالة الدفع
const { payment } = await moyasarPayment.getPaymentStatus('pay_12345');

// استرداد المبلغ
const { refund } = await moyasarPayment.refundPayment('pay_12345', 100);
```

---

## 🗂️ ترتيب تحميل الملفات

في ملفات HTML، حمّل الملفات بهذا الترتيب:

```html
<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
    <meta charset="UTF-8">
    <title>منصة كرم</title>
    
    <!-- External Libraries -->
    <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
    <script src="https://cdn.moyasar.com/mpf/1.7.3/moyasar.js"></script>
</head>
<body>
    <!-- Your Content -->
    
    <!-- Karam Core Modules (في هذا الترتيب!) -->
    <script src="/js/supabase-client.js"></script>
    <script src="/js/i18n.js"></script>
    <script src="/js/auth.js"></script>
    <script src="/js/booking-engine.js"></script>
    <script src="/js/moyasar-payment.js"></script>
    
    <!-- Your Page-Specific Scripts -->
    <script src="/js/your-page.js"></script>
</body>
</html>
```

---

## 🎨 أمثلة عملية

### مثال 1: صفحة تسجيل الدخول
```html
<form id="loginForm">
    <input type="email" id="email" data-i18n="auth.email" placeholder="">
    <input type="password" id="password" data-i18n="auth.password" placeholder="">
    <button type="submit" data-i18n="nav.login">تسجيل الدخول</button>
</form>

<script>
document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    
    const result = await karamAuth.login(email, password);
    
    if (result.success) {
        // سيتم التوجيه تلقائياً للوحة التحكم
    } else {
        alert(result.error);
    }
});
</script>
```

### مثال 2: صفحة الحجز
```html
<div id="booking-form">
    <input type="date" id="date">
    <select id="timeSlot">
        <option value="morning">صباحاً</option>
        <option value="afternoon">ظهراً</option>
        <option value="evening">مساءً</option>
    </select>
    <input type="number" id="guests" min="1" max="20">
    <button onclick="checkAvailability()">تحقق من التوفر</button>
    <button onclick="addToCart()">أضف للسلة</button>
</div>

<div id="cart">
    <h3>السلة (<span id="cart-count">0</span>)</h3>
    <div id="cart-items"></div>
    <p>الإجمالي: <span id="cart-total">0</span> ريال</p>
    <button onclick="proceedToPayment()">الدفع</button>
</div>

<div id="payment-container"></div>

<script>
async function checkAvailability() {
    const date = document.getElementById('date').value;
    const timeSlot = document.getElementById('timeSlot').value;
    
    const result = await bookingEngine.checkAvailability(
        majlisId,
        date,
        timeSlot
    );
    
    alert(result.available ? 'متاح!' : 'غير متاح');
}

async function addToCart() {
    // ... جمع البيانات
    await bookingEngine.addToCart({...});
    updateCartUI();
}

function updateCartUI() {
    const cart = bookingEngine.getCart();
    document.getElementById('cart-count').textContent = cart.length;
    document.getElementById('cart-total').textContent = 
        i18n.formatNumber(bookingEngine.getCartTotal());
}

function proceedToPayment() {
    moyasarPayment.processCartPayment('payment-container');
}

// Listen for cart updates
window.addEventListener('cartUpdated', updateCartUI);
</script>
```

---

## ⚡ التالي - Next Steps

الآن بعد إنشاء Core Modules، يمكنك:

1. **إنشاء Operator Dashboard** 🎛️
2. **إنشاء Family Dashboard** 👨‍👩‍👧
3. **إنشاء Visitor Booking Pages** 🎫
4. **إنشاء Landing Page** 🏠

---

## 📝 ملاحظات مهمة

### Moyasar Keys
- ⚠️ **مهم جداً**: استبدل `pk_test_xxxxx` بمفاتيحك الحقيقية
- 🧪 **Test Mode**: استخدم `pk_test` للتطوير
- 🚀 **Production**: استخدم `pk_live` عند الإطلاق

### Security
- 🔐 لا تُخزّن API Keys الحساسة في الكود (Frontend)
- 🔐 استخدم Environment Variables للمفاتيح
- 🔐 نفّذ Webhook على Backend للتحقق من الدفع

### Testing
- اختبر جميع الوظائف قبل الإطلاق
- استخدم Test Cards من Moyasar للاختبار
- تأكد من RLS Policies تعمل بشكل صحيح

---

✅ **جاهز للتطوير!** 🚀

**تم الإعداد بواسطة**: Dr. Shakir Alhuthali  
**التاريخ**: 2025-12-25  
**المشروع**: Karam Platform 🌟
