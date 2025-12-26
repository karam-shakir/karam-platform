# 🚀 دليل البدء السريع - Karam Platform
## Quick Start Guide

---

## ⚡ ابدأ في 5 خطوات

### 1️⃣ إعداد Supabase (10 دقائق)

```sql
-- في Supabase SQL Editor، نفّذ بالترتيب:
1. database/complete_schema.sql
2. database/rls_policies.sql
3. database/enhanced_features.sql
4. database/critical_features.sql
```

### 2️⃣ إنشاء Storage Buckets (5 دقائق)

في Supabase Dashboard > Storage:

| Bucket Name | Public/Private | Max Size |
|-------------|---------------|----------|
| `family-documents` | Private | 10 MB |
| `majlis-photos` | Public | 5 MB |
| `review-photos` | Public | 3 MB |
| `company-documents` | Private | 10 MB |

### 3️⃣ تطبيق Extended RLS (دقيقة واحدة)

```sql
-- في SQL Editor:
database/rls_policies_extended.sql
```

### 4️⃣ تكوين API Keys (دقيقتان)

```javascript
// أنشئ: js/config.js
const SUPABASE_URL = 'YOUR_SUPABASE_URL';
const SUPABASE_ANON_KEY = 'YOUR_ANON_KEY';

// في: js/moyasar-payment.js
publishableKey: 'pk_test_YOUR_KEY' // للتجريب
```

### 5️⃣ تشغيل المشروع (30 ثانية)

```bash
# بـ Python
python -m http.server 8000

# أو بـ npx
npx serve

# ثم افتح: http://localhost:8000
```

---

## 🎯 اختبار سريع

### إنشاء مستخدم Operator

```sql
-- في Supabase SQL Editor:
INSERT INTO auth.users (id, email)
VALUES ('YOUR_UUID', 'operator@karam.sa');

INSERT INTO user_profiles (id, email, user_type)
VALUES ('SAME_UUID', 'operator@karam.sa', 'operator');
```

### الوصول إلى لوحة التحكم

```
http://localhost:8000/operator-dashboard.html
```

---

## 📋 Checklist قبل الإطلاق

### الأمان
- [ ] تفعيل RLS على جميع الجداول
- [ ] اختبار Policies بحسابات مختلفة
- [ ] تفعيل HTTPS
- [ ] إخفاء API Keys من الكود

### الوظائف
- [ ] اختبار تسجيل الدخول لجميع الأنواع
- [ ] اختبار الحجز والدفع
- [ ] اختبار SMS
- [ ] اختبار المحفظة والسحب

### الأداء
- [ ] تحسين الصور
- [ ] تفعيل Caching
- [ ] اختبار على شبكة بطيئة

### الدفع
- [ ] تفعيل Moyasar Production Keys
- [ ] اختبار جميع طرق الدفع
- [ ] اختبار الاسترداد

---

## 🐛 استكشاف الأخطاء

### خطأ: "RLS Policy Violation"
```sql
-- تأكد من تطبيق جميع RLS Policies
-- تحقق من نوع المستخدم في user_profiles
```

### خطأ: "Supabase Client Error"
```javascript
// تأكد من صحة SUPABASE_URL و ANON_KEY
console.log(karamDB.supabase) // يجب أن يظهر object
```

### خطأ: "Moyasar Payment Failed"
```javascript
// تأكد من:
// 1. تحميل Moyasar SDK
// 2. صحة publishableKey
// 3. Amount بالهلالات (× 100)
```

---

## 📞 الدعم السريع

| المشكلة | الحل |
|---------|------|
| Database Error | راجع `database/README.md` |
| Auth Issue | راجع `js/CORE_MODULES_DOCS.md` |
| Payment Error | راجع Moyasar Docs |
| General | راجع `README.md` |

---

## 🎓 الموارد المفيدة

- [Supabase Docs](https://supabase.com/docs)
- [Moyasar Docs](https://moyasar.com/docs)
- [Project Walkthrough](walkthrough.md)
- [Next Steps](NEXT_STEPS.md)

---

## ✅ تم الإعداد بنجاح؟

إذا وصلت إلى هنا بدون أخطاء:
- 🎉 **مبروك! المشروع جاهز**
- 🚀 ابدأ التطوير والتخصيص
- 📖 راجع `NEXT_STEPS.md` للخطوات القادمة

---

**وقت الإعداد المتوقع**: ~20 دقيقة ⏱️

**مستوى الصعوبة**: متوسط 📊

**المساعدة**: `PROJECT_SUMMARY.md` 📚
