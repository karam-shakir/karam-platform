# 🔧 حل مشكلة زر التسجيل

## المشكلة
زر "تقديم الطلب" في صفحة `family-register.html` لا يعمل.

## السبب
ملف `js/config.js` غير موجود (في `.gitignore`)

---

## ✅ الحل السريع

### **الخطوة 1: أنشئ ملف**
**المسار:** `karam-platform/js/config.js`

### **الخطوة 2: انسخ هذا الكود داخله:**

```javascript
// Supabase Configuration  
const supabaseUrl = 'https://mdkhvsvkqlhtikhpkwkf.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1ka2h2c3ZrcWxodGlraHBrd2tmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUyNTM1NTAsImV4cCI6MjA4MDgyOTU1MH0.zabhAeKeIVAU8YTKmOHcEJf0vYCKJUrS9-RgkRg14ZY';

// Create Supabase client
const supabase = window.supabase.createClient(supabaseUrl, supabaseAnonKey);

console.log('✅ Config loaded successfully');
```

### **الخطوة 3: احفظ الملف**

### **الخطوة 4: حدّث المتصفح**
```
http://localhost:8000/family-register.html
Ctrl + Shift + R
```

### **الخطوة 5: تحقق من Console**
1. اضغط `F12`
2. افتح تبويب "Console"
3. يجب أن ترى: `✅ Config loaded successfully`

---

## 🎯 الآن جرب التسجيل!

1. املأ جميع الحقول
2. اختر باقة واحدة على الأقل
3. ارفع صورة البوابة
4. وافق على الشروط
5. اضغط "تقديم الطلب"

**النتيجة المتوقعة:**
- رسالة "تم تقديم الطلب بنجاح!"
- توجيه تلقائي لـ `index.html` بعد 3 ثوان

---

## 🐛 إذا لم يعمل

### **افتح Console (F12) وأرسل لي:**
1. أي رسائل خطأ باللون الأحمر
2. صورة من Console

---

## 📌 ملاحظة

ملف `config.js` يحتوي على معلومات حساسة (Supabase Keys)، لذلك هو في `.gitignore` ولا يُرفع لـ Git. يجب إنشاؤه محلياً على كل جهاز.
