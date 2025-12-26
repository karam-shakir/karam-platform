# خطة الإصلاح الشامل - CSS Dashboards

## الهدف
إصلاح تضاربات CSS في `unified-dashboards.css` مع الاحتفاظ بالدمج

## الاستراتيجية

### 1. إضافة Namespaces
```
.family-dash → لجميع صفحات Family
.operator-dash → لجميع صفحات Operator  
.visitor-dash → لجميع صفحات Visitor
.company-dash → لجميع صفحات Company
```

### 2. التعديلات المطلوبة

#### أ. HTML (12 صفحة)
إضافة class للـ body:
```html
<!-- Family -->
<body class="rtl family-dash">

<!-- Operator -->
<body class="rtl operator-dash">

<!-- Visitor -->
<body class="rtl visitor-dash">

<!-- Company -->
<body class="company-dash">
```

#### ب. CSS
إعادة كتابة جميع القواعد:
```css
/* قبل */
.sidebar { ... }

/* بعد */
.family-dash .sidebar { ... }
.operator-dash .sidebar { ... }
```

## المراحل

### المرحلة 1: تحديث HTML ✅
- [ ] family-dashboard.html
- [ ] family-bookings.html
- [ ] family-majlis.html
- [ ] family-wallet.html
- [ ] operator-dashboard.html
- [ ] operator-families.html
- [ ] operator-finance.html
- [ ] operator-sms.html
- [ ] visitor-dashboard.html
- [ ] visitor-bookings.html
- [ ] company-dashboard.html
- [ ] operator-dashboard-simple.html

### المرحلة 2: إعادة كتابة CSS ✅
- [ ] Family sections with `.family-dash`
- [ ] Operator sections with `.operator-dash`
- [ ] Visitor sections with `.visitor-dash`
- [ ] Company sections with `.company-dash`

### المرحلة 3: الاختبار ✅
- [ ] اختبار family dashboards
- [ ] اختبار operator dashboards
- [ ] اختبار visitor dashboards
- [ ] اختبار company dashboards

## التقدير الزمني
- تحديث HTML: 15 دقيقة
- إعادة كتابة CSS: 30 دقيقة
- الاختبار: 15 دقيقة
- **الإجمالي: ~60 دقيقة**
