# دليل ربط منصة كرم بـ GitHub

## المتطلبات

### 1. تثبيت Git

**لنظام Windows:**

1. **تحميل Git:**
   - اذهب إلى: https://git-scm.com/download/win
   - حمّل النسخة المناسبة (64-bit أو 32-bit)

2. **التثبيت:**
   - شغّل ملف التثبيت
   - اختر الإعدادات الافتراضية
   - انتظر حتى يكتمل التثبيت

3. **التحقق:**
   ```powershell
   # افتح PowerShell وشغّل:
   git --version
   
   # يجب أن يظهر شيء مثل:
   # git version 2.43.0.windows.1
   ```

### 2. إعداد Git

بعد التثبيت، افتح PowerShell في مجلد المشروع وشغّل:

```powershell
# الانتقال لمجلد المشروع
cd "C:\Users\Shakir\.gemini\antigravity\scratch\karam-platform"

# إعداد اسم المستخدم والبريد
git config --global user.name "اسمك"
git config --global user.email "your-email@example.com"
```

---

## خطوات ربط المشروع بـ GitHub

### الخطوة 1: إنشاء Repository على GitHub

1. **اذهب إلى:** https://github.com
2. **سجّل دخول** أو أنشئ حساب جديد
3. **اضغط على** زر "+" في الأعلى → اختر "New repository"
4. **املأ البيانات:**
   - **Repository name:** `karam-platform`
   - **Description:** `منصة كرم - نصل ضيوف الرحمن بأهل الكرم`
   - **Public/Private:** اختر حسب رغبتك
   - **لا تضف** README أو .gitignore (موجودين بالفعل)
5. **اضغط** "Create repository"

### الخطوة 2: تهيئة Git محلياً

في PowerShell داخل مجلد المشروع:

```powershell
# تهيئة Git repository
git init

# إضافة جميع الملفات
git add .

# عمل أول commit
git commit -m "Initial commit: Complete Karam Platform v1.1.0"
```

### الخطوة 3: ربط بـ GitHub

```powershell
# استبدل YOUR_USERNAME باسم المستخدم الخاص بك على GitHub
git remote add origin https://github.com/YOUR_USERNAME/karam-platform.git

# دفع الملفات إلى GitHub
git branch -M main
git push -u origin main
```

**ملاحظة:** سيُطلب منك إدخال:
- Username: اسم المستخدم في GitHub
- Password: Personal Access Token (ليس كلمة المرور العادية)

### الخطوة 4: إنشاء Personal Access Token

إذا طُلب منك كلمة مرور:

1. اذهب إلى: https://github.com/settings/tokens
2. اضغط "Generate new token" → "Generate new token (classic)"
3. اسم التوكن: `Karam Platform`
4. اختر الصلاحيات: `repo` (كل الخيارات تحتها)
5. اضغط "Generate token"
6. **انسخ** التوكن (لن تتمكن من رؤيته مرة أخرى!)
7. استخدمه كـ password عند الـ push

---

## البديل: استخدام GitHub Desktop (الأسهل!)

إذا كنت تفضل واجهة رسومية:

### 1. تثبيت GitHub Desktop

1. حمّل من: https://desktop.github.com
2. ثبّت البرنامج
3. سجّل دخول بحساب GitHub

### 2. إضافة المشروع

1. **File** → **Add Local Repository**
2. اختر مجلد: `C:\Users\Shakir\.gemini\antigravity\scratch\karam-platform`
3. اضغط **"create a repository"** إذا ظهر خطأ
4. املأ البيانات واضغط **Create Repository**

### 3. أول Commit

1. شاهد الملفات في قائمة "Changes"
2. اكتب رسالة Commit: `Initial commit: Complete Karam Platform`
3. اضغط **"Commit to main"**

### 4. النشر على GitHub

1. اضغط **"Publish repository"**
2. اختر الاسم: `karam-platform`
3. اختر Public أو Private
4. اضغط **"Publish Repository"**

---

## التحقق من النجاح

بعد الانتهاء:

1. اذهب إلى: `https://github.com/YOUR_USERNAME/karam-platform`
2. يجب أن ترى جميع ملفات المشروع
3. شاهد README.md على الصفحة الرئيسية

---

## الأوامر المفيدة

### بعد إجراء تعديلات:

```powershell
# إضافة الملفات المعدلة
git add .

# عمل commit
git commit -m "تحديث: وصف التغييرات"

# دفع للـ GitHub
git push
```

### عرض الحالة:

```powershell
# حالة الملفات
git status

# سجل الـ commits
git log --oneline
```

---

## ملفات مهمة

### .gitignore ✅

تأكد من أن هذه الملفات **لن** تُرفع لـ GitHub:

```
✅ .env (يحتوي على API keys سرية)
✅ node_modules/
✅ *.log
✅ *.backup
```

الملف `.gitignore` موجود بالفعل في المشروع ومحدّث! ✅

---

## نصائح الأمان

### ⚠️ لا ترفع أبداً:

- ❌ ملف `.env` (يحتوي API Keys)
- ❌ كلمات مرور
- ❌ مفاتيح خاصة

### ✅ افعل:

- ✅ استخدم `.env.example` كقالب
- ✅ راجع الملفات قبل الـ commit
- ✅ استخدم `.gitignore`

---

## 🎉 مبروك!

بعد اتباع هذه الخطوات، سيكون مشروع كرم على GitHub!

**روابط مفيدة:**
- [تحميل Git](https://git-scm.com/download/win)
- [تحميل GitHub Desktop](https://desktop.github.com)
- [GitHub Docs](https://docs.github.com)

---

**آخر تحديث:** ديسمبر 8، 2025
