/**
 * Language Switching System - نظام تبديل اللغة
 * Supports Arabic (AR) and English (EN)
 */

// Current language (default: Arabic)
let currentLang = localStorage.getItem('karam_language') || 'ar';

// Translation dictionary
const translations = {
    ar: {
        // Navigation
        home: 'الرئيسية',
        browse: 'استعراض الأسر',
        gifts: 'الهدايا',
        about: 'من نحن',
        login: 'تسجيل الدخول',
        register: 'إنشاء حساب',
        logout: 'تسجيل الخروج',
        dashboard: 'لوحة التحكم',

        // Common
        search: 'بحث',
        filter: 'تصفية',
        reset: 'إعادة تعيين',
        submit: 'إرسال',
        cancel: 'إلغاء',
        save: 'حفظ',
        delete: 'حذف',
        edit: 'تعديل',
        view: 'عرض',
        close: 'إغلاق',

        // Booking
        booking: 'حجز',
        bookings: 'الحجوزات',
        date: 'التاريخ',
        time: 'الوقت',
        guests: 'الضيوف',
        price: 'السعر',
        total: 'الإجمالي',
        checkout: 'إتمام الحجز',

        // Footer
        footerAbout: 'منصة كرم هي منصة رائدة لربط المعتمرين بالأسر المضيافة في مكة والمدينة المنورة.',
        quickLinks: 'روابط سريعة',
        contact: 'تواصل معنا',
        allRightsReserved: 'جميع الحقوق محفوظة',

        // Messages
        loading: 'جاري التحميل...',
        success: 'نجح',
        error: 'خطأ',
        warning: 'تحذير',
    },
    en: {
        // Navigation
        home: 'Home',
        browse: 'Browse Families',
        gifts: 'Gifts',
        about: 'About Us',
        login: 'Login',
        register: 'Register',
        logout: 'Logout',
        dashboard: 'Dashboard',

        // Common
        search: 'Search',
        filter: 'Filter',
        reset: 'Reset',
        submit: 'Submit',
        cancel: 'Cancel',
        save: 'Save',
        delete: 'Delete',
        edit: 'Edit',
        view: 'View',
        close: 'Close',

        // Booking
        booking: 'Booking',
        bookings: 'Bookings',
        date: 'Date',
        time: 'Time',
        guests: 'Guests',
        price: 'Price',
        total: 'Total',
        checkout: 'Checkout',

        // Footer
        footerAbout: 'Karam Platform connects pilgrims with hospitable families in Makkah and Madinah.',
        quickLinks: 'Quick Links',
        contact: 'Contact Us',
        allRightsReserved: 'All Rights Reserved',

        // Messages
        loading: 'Loading...',
        success: 'Success',
        error: 'Error',
        warning: 'Warning',
    }
};

// Get translation
function t(key) {
    return translations[currentLang][key] || key;
}

// Switch language
function switchLanguage(lang) {
    if (lang !== 'ar' && lang !== 'en') return;

    currentLang = lang;
    localStorage.setItem('karam_language', lang);

    // Update HTML direction and lang attribute
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = lang === 'ar' ? 'ar' : 'en';

    // Update all elements with data-i18n attribute
    updatePageTranslations();

    // Update language toggle buttons
    updateLanguageButtons();
}

// Update all translations on page
function updatePageTranslations() {
    document.querySelectorAll('[data-i18n]').forEach(element => {
        const key = element.getAttribute('data-i18n');
        element.textContent = t(key);
    });

    document.querySelectorAll('[data-i18n-placeholder]').forEach(element => {
        const key = element.getAttribute('data-i18n-placeholder');
        element.placeholder = t(key);
    });
}

// Update language toggle buttons
function updateLanguageButtons() {
    document.querySelectorAll('.lang-btn').forEach(btn => {
        if (btn.getAttribute('data-lang') === currentLang) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });
}

// Initialize language on page load
document.addEventListener('DOMContentLoaded', () => {
    // Set initial direction and lang
    document.documentElement.dir = currentLang === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = currentLang === 'ar' ? 'ar' : 'en';

    // Update translations
    updatePageTranslations();
    updateLanguageButtons();
});
