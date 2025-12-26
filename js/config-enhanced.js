// ============================================
// Karam Platform - Enhanced Configuration
// ملف التكوين المحسّن
// ============================================
// This file extends the basic config.js with additional settings
// ============================================

// ============================================
// Moyasar Payment Configuration
// ============================================

window.MOYASAR_CONFIG = {
    // IMPORTANT: Replace with your actual keys
    publishableKey: 'pk_test_YOUR_KEY_HERE', // Get from: https://moyasar.com/dashboard

    // Environment
    isProduction: false, // Set to true for production

    // Callback URLs (auto-detected)
    callbackUrl: window.location.origin + '/payment-success.html',
    errorUrl: window.location.origin + '/payment-failed.html',

    // Supported payment methods
    methods: ['creditcard', 'stcpay', 'applepay'],

    // Currency
    currency: 'SAR'
};

// ============================================
// Storage Buckets Configuration
// ============================================

window.STORAGE_BUCKETS = {
    familyDocuments: 'family-documents',
    majlisPhotos: 'majlis-photos',
    reviewPhotos: 'review-photos',
    companyDocuments: 'company-documents'
};

// ============================================
// Application Settings
// ============================================

window.APP_CONFIG = {
    // Basic Info
    name: 'Karam Platform',
    nameAr: 'منصة كرم',
    version: '1.0.0',

    // Platform Fees
    platformFee: 5, // percentage

    // Cancellation Policy
    cancellationDeadlineHours: 24,
    cancellationFeePercentage: 20,

    // Booking Settings
    maxGuestsPerBooking: 50,
    minBookingHours: 3,
    pricePerPerson: {
        basic: 50, // SAR
        diamond: 100 // SAR
    },

    // Wallet Settings
    minWithdrawalAmount: 100, // SAR

    // File Upload Limits
    maxImageSize: 5 * 1024 * 1024, // 5MB
    maxDocumentSize: 10 * 1024 * 1024, // 10MB

    // Allowed file types
    allowedImageTypes: ['image/jpeg', 'image/png', 'image/webp'],
    allowedDocumentTypes: ['application/pdf', 'image/jpeg', 'image/png'],

    // Cities
    cities: [
        { value: 'mecca', labelAr: 'مكة المكrمة', labelEn: 'Makkah' },
        { value: 'medina', labelAr: 'المدينة المنورة', labelEn: 'Madinah' }
    ],

    // Time Slots
    timeSlots: [
        { value: 'morning', labelAr: 'صباحاً (9-12)', labelEn: 'Morning (9am-12pm)', hours: '9-12' },
        { value: 'afternoon', labelAr: 'ظهراً (2-5)', labelEn: 'Afternoon (2pm-5pm)', hours: '14-17' },
        { value: 'evening', labelAr: 'مساءً (7-10)', labelEn: 'Evening (7pm-10pm)', hours: '19-22' }
    ],

    // Packages
    packages: [
        { value: 'basic', labelAr: 'الباقة الأساسية', labelEn: 'Basic Package', price: 50 },
        { value: 'diamond', labelAr: 'الباقة الماسية', labelEn: 'Diamond Package', price: 100 }
    ]
};

// ============================================
// API Endpoints (for Edge Functions if needed)
// ============================================

window.API_ENDPOINTS = {
    sendSMS: '/functions/v1/send-sms',
    sendEmail: '/functions/v1/send-email',
    processPayment: '/functions/v1/process-payment',
    webhookMoyasar: '/functions/v1/webhook-moyasar',
    generateReceipt: '/functions/v1/generate-receipt'
};

// ============================================
// Development Mode Detection
// ============================================

window.isDevelopment = window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1' ||
    window.location.hostname.includes('192.168');

window.isProduction = !window.isDevelopment;

// ============================================
// Helper Functions
// ============================================

// Get Supabase client (from config.js)
window.getSupabase = function () {
    return window.supabaseClient || window.supabase;
};

// Get storage bucket URL
window.getStorageUrl = function (bucket, path) {
    const supabase = window.getSupabase();
    const { data } = supabase.storage.from(bucket).getPublicUrl(path);
    return data.publicUrl;
};

// Format currency
window.formatCurrency = function (amount, locale = 'ar-SA') {
    return new Intl.NumberFormat(locale, {
        style: 'currency',
        currency: 'SAR'
    }).format(amount);
};

// Format date
window.formatDate = function (date, locale = 'ar-SA') {
    return new Intl.DateTimeFormat(locale, {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    }).format(new Date(date));
};

// ============================================
// Validation
// ============================================

function validateConfig() {
    const issues = [];

    // Check Moyasar
    if (MOYASAR_CONFIG.publishableKey.includes('YOUR_KEY')) {
        issues.push('⚠️ Moyasar key not configured');
    }

    // Check Storage
    const requiredBuckets = ['family-documents', 'majlis-photos', 'review-photos', 'company-documents'];
    // Note: We can't check if buckets exist without async call

    if (issues.length > 0 && window.isDevelopment) {
        console.warn('📝 Configuration Issues:');
        issues.forEach(issue => console.warn(issue));
    }

    return issues.length === 0;
}

// ============================================
// Auto-init
// ============================================

if (window.isDevelopment) {
    console.group('🔧 Karam Platform - Enhanced Config');
    console.log('Environment:', window.isProduction ? 'Production' : 'Development');
    console.log('Supabase:', window.supabaseClient ? '✅ Ready' : '❌ Not initialized');
    console.log('Storage Buckets:', window.STORAGE_BUCKETS);
    console.log('Moyasar:', MOYASAR_CONFIG.publishableKey.includes('YOUR_KEY') ? '⚠️ Not configured' : '✅ Configured');
    validateConfig();
    console.groupEnd();
}

console.log('✅ Enhanced configuration loaded');
