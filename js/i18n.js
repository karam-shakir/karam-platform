// ============================================
// Karam Platform - Internationalization (i18n)
// نظام الترجمة الدولية
// ============================================
// Version: 2.0
// Author: Dr. Shakir Alhuthali
// Supports: Arabic (AR) & English (EN)
// ============================================

// ============================================
// Translations Dictionary
// ============================================

const translations = {
    ar: {
        // Common
        'app.name': 'منصة كرم',
        'app.tagline': 'ضيافة سعودية أصيلة',
        'welcome': 'مرحباً',
        'loading': 'جاري التحميل...',
        'save': 'حفظ',
        'cancel': 'إلغاء',
        'delete': 'حذف',
        'edit': 'تعديل',
        'view': 'عرض',
        'search': 'بحث',
        'filter': 'تصفية',
        'export': 'تصدير',
        'print': 'طباعة',
        'close': 'إغلاق',
        'submit': 'إرسال',
        'confirm': 'تأكيد',
        'yes': 'نعم',
        'no': 'لا',

        // Navigation
        'nav.home': 'الرئيسية',
        'nav.about': 'عن المنصة',
        'nav.how_it_works': 'كيف تعمل',
        'nav.browse_families': 'تصفح العوائل',
        'nav.login': 'تسجيل الدخول',
        'nav.register': 'تسجيل جديد',
        'nav.dashboard': 'لوحة التحكم',
        'nav.profile': 'الملف الشخصي',
        'nav.logout': 'تسجيل خروج',

        // Auth
        'auth.email': 'البريد الإلكتروني',
        'auth.password': 'كلمة المرور',
        'auth.confirm_password': 'تأكيد كلمة المرور',
        'auth.forgot_password': 'نسيت كلمة المرور؟',
        'auth.register_as_family': 'تسجيل كعائلة',
        'auth.register_as_visitor': 'تسجيل كزائر',
        'auth.register_as_company': 'تسجيل كشركة',

        // User Types
        'user.family': 'عائلة',
        'user.visitor': 'زائر',
        'user.company': 'شركة',
        'user.operator': 'مشغل',

        // Cities
        'city.mecca': 'مكة المكرمة',
        'city.medina': 'المدينة المنورة',

        // Booking
        'booking.date': 'التاريخ',
        'booking.time': 'الوقت',
        'booking.guests': 'عدد الضيوف',
        'booking.package': 'الباقة',
        'booking.price': 'السعر',
        'booking.total': 'الإجمالي',
        'booking.book_now': 'احجز الآن',
        'booking.confirm': 'تأكيد الحجز',

        // Time Slots
        'time.morning': 'صباحاً (9-12)',
        'time.afternoon': 'ظهراً (2-5)',
        'time.evening': 'مساءً (7-10)',

        // Packages
        'package.basic': 'الباقة الأساسية',
        'package.diamond': 'الباقة الماسية',

        // Status
        'status.pending': 'قيد المراجعة',
        'status.approved': 'موافق عليه',
        'status.rejected': 'مرفوض',
        'status.active': 'نشط',
        'status.inactive': 'غير نشط',
        'status.completed': 'مكتمل',
        'status.cancelled': 'ملغي',

        // Messages
        'msg.success': 'تمت العملية بنجاح',
        'msg.error': 'حدث خطأ',
        'msg.no_data': 'لا توجد بيانات',
        'msg.confirm_delete': 'هل أنت متأكد من الحذف؟',

        // Footer
        'footer.rights': 'جميع الحقوق محفوظة لمنصة كرم',
        'footer.designed_by': 'صُممت وطُورت بواسطة د. شاكر الحذالي'
    },

    en: {
        // Common
        'app.name': 'Karam Platform',
        'app.tagline': 'Authentic Saudi Hospitality',
        'welcome': 'Welcome',
        'loading': 'Loading...',
        'save': 'Save',
        'cancel': 'Cancel',
        'delete': 'Delete',
        'edit': 'Edit',
        'view': 'View',
        'search': 'Search',
        'filter': 'Filter',
        'export': 'Export',
        'print': 'Print',
        'close': 'Close',
        'submit': 'Submit',
        'confirm': 'Confirm',
        'yes': 'Yes',
        'no': 'No',

        // Navigation
        'nav.home': 'Home',
        'nav.about': 'About',
        'nav.how_it_works': 'How It Works',
        'nav.browse_families': 'Browse Families',
        'nav.login': 'Login',
        'nav.register': 'Register',
        'nav.dashboard': 'Dashboard',
        'nav.profile': 'Profile',
        'nav.logout': 'Logout',

        // Auth
        'auth.email': 'Email',
        'auth.password': 'Password',
        'auth.confirm_password': 'Confirm Password',
        'auth.forgot_password': 'Forgot Password?',
        'auth.register_as_family': 'Register as Family',
        'auth.register_as_visitor': 'Register as Visitor',
        'auth.register_as_company': 'Register as Company',

        // User Types
        'user.family': 'Family',
        'user.visitor': 'Visitor',
        'user.company': 'Company',
        'user.operator': 'Operator',

        // Cities
        'city.mecca': 'Mecca',
        'city.medina': 'Medina',

        // Booking
        'booking.date': 'Date',
        'booking.time': 'Time',
        'booking.guests': 'Guests',
        'booking.package': 'Package',
        'booking.price': 'Price',
        'booking.total': 'Total',
        'booking.book_now': 'Book Now',
        'booking.confirm': 'Confirm Booking',

        // Time Slots
        'time.morning': 'Morning (9am-12pm)',
        'time.afternoon': 'Afternoon (2pm-5pm)',
        'time.evening': 'Evening (7pm-10pm)',

        // Packages
        'package.basic': 'Basic Package',
        'package.diamond': 'Diamond Package',

        // Status
        'status.pending': 'Pending',
        'status.approved': 'Approved',
        'status.rejected': 'Rejected',
        'status.active': 'Active',
        'status.inactive': 'Inactive',
        'status.completed': 'Completed',
        'status.cancelled': 'Cancelled',

        // Messages
        'msg.success': 'Operation completed successfully',
        'msg.error': 'An error occurred',
        'msg.no_data': 'No data available',
        'msg.confirm_delete': 'Are you sure you want to delete?',

        // Footer
        'footer.rights': 'All rights reserved to Karam Platform',
        'footer.designed_by': 'Designed and Developed by Dr. Shakir Alhuthali'
    }
};

// ============================================
// i18n Class
// ============================================

class KaramI18n {
    constructor() {
        this.currentLang = this.detectLanguage();
        this.translations = translations;
        this.init();
    }

    init() {
        // Apply initial language
        this.setLanguage(this.currentLang);

        // Listen for language toggle
        this.setupLanguageToggle();
    }

    detectLanguage() {
        // Check localStorage
        const saved = localStorage.getItem('karam_lang');
        if (saved) return saved;

        // Check browser language
        const browserLang = navigator.language || navigator.userLanguage;
        return browserLang.startsWith('ar') ? 'ar' : 'en';
    }

    setLanguage(lang) {
        if (!['ar', 'en'].includes(lang)) {
            console.warn(`Unsupported language: ${lang}`);
            return;
        }

        this.currentLang = lang;
        localStorage.setItem('karam_lang', lang);

        // Update HTML attributes
        document.documentElement.lang = lang;
        document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';

        // Update body class for RTL/LTR
        document.body.classList.remove('rtl', 'ltr');
        document.body.classList.add(lang === 'ar' ? 'rtl' : 'ltr');

        // Update all translatable elements
        this.updatePageTranslations();

        // Dispatch event
        window.dispatchEvent(new CustomEvent('languageChanged', {
            detail: { language: lang }
        }));
    }

    toggleLanguage() {
        const newLang = this.currentLang === 'ar' ? 'en' : 'ar';
        this.setLanguage(newLang);
    }

    getCurrentLanguage() {
        return this.currentLang;
    }

    isRTL() {
        return this.currentLang === 'ar';
    }

    t(key, replacements = {}) {
        const translation = this.translations[this.currentLang][key] || key;

        // Replace placeholders
        return translation.replace(/\{(\w+)\}/g, (match, placeholder) => {
            return replacements[placeholder] || match;
        });
    }

    updatePageTranslations() {
        // Update elements with data-i18n attribute
        document.querySelectorAll('[data-i18n]').forEach(element => {
            const key = element.getAttribute('data-i18n');
            const translation = this.t(key);

            if (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA') {
                // Update placeholder
                if (element.hasAttribute('placeholder')) {
                    element.placeholder = translation;
                }
            } else {
                // Update text content
                element.textContent = translation;
            }
        });

        // Update elements with data-i18n-title
        document.querySelectorAll('[data-i18n-title]').forEach(element => {
            const key = element.getAttribute('data-i18n-title');
            element.title = this.t(key);
        });

        // Update elements with data-i18n-alt
        document.querySelectorAll('[data-i18n-alt]').forEach(element => {
            const key = element.getAttribute('data-i18n-alt');
            element.alt = this.t(key);
        });
    }

    setupLanguageToggle() {
        // Find language toggle buttons
        document.querySelectorAll('[data-lang-toggle]').forEach(button => {
            button.addEventListener('click', () => {
                this.toggleLanguage();
            });
        });

        // Find specific language buttons
        document.querySelectorAll('[data-set-lang]').forEach(button => {
            button.addEventListener('click', () => {
                const lang = button.getAttribute('data-set-lang');
                this.setLanguage(lang);
            });
        });
    }

    // Format numbers based on locale
    formatNumber(number, decimals = 2) {
        const locale = this.currentLang === 'ar' ? 'ar-SA' : 'en-US';
        return new Intl.NumberFormat(locale, {
            minimumFractionDigits: decimals,
            maximumFractionDigits: decimals
        }).format(number);
    }

    // Format currency
    formatCurrency(amount, currency = 'SAR') {
        const locale = this.currentLang === 'ar' ? 'ar-SA' : 'en-US';
        return new Intl.NumberFormat(locale, {
            style: 'currency',
            currency: currency
        }).format(amount);
    }

    // Format date
    formatDate(date, options = {}) {
        const locale = this.currentLang === 'ar' ? 'ar-SA' : 'en-US';
        const defaultOptions = {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            ...options
        };

        return new Intl.DateTimeFormat(locale, defaultOptions).format(new Date(date));
    }

    // Format relative time
    formatRelativeTime(date) {
        const locale = this.currentLang === 'ar' ? 'ar-SA' : 'en-US';
        const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });

        const now = new Date();
        const then = new Date(date);
        const diffInSeconds = Math.floor((then - now) / 1000);

        // Calculate appropriate unit
        const units = [
            { unit: 'year', seconds: 31536000 },
            { unit: 'month', seconds: 2592000 },
            { unit: 'week', seconds: 604800 },
            { unit: 'day', seconds: 86400 },
            { unit: 'hour', seconds: 3600 },
            { unit: 'minute', seconds: 60 },
            { unit: 'second', seconds: 1 }
        ];

        for (const { unit, seconds } of units) {
            if (Math.abs(diffInSeconds) >= seconds) {
                const value = Math.floor(diffInSeconds / seconds);
                return rtf.format(value, unit);
            }
        }

        return rtf.format(0, 'second');
    }
}

// ============================================
// Initialize Global Instance
// ============================================

const i18n = new KaramI18n();

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { i18n };
}

console.log('✅ Karam i18n System initialized - Language:', i18n.getCurrentLanguage());
