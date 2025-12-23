/**
 * Moyasar Configuration - Karam Platform
 * إعدادات الدفع عبر Moyasar
 */

const MOYASAR_CONFIG = {
    // Test Keys (للاختبار)
    publishableKey: 'pk_test_1au5CTZmjPNnL4e84CcWxzkzujJeLVdjS3yuTFrC',

    // Configuration
    currency: 'SAR',
    locale: 'ar',

    // Payment Methods
    methods: ['creditcard', 'applepay'],

    // URLs
    callbackUrl: window.location.origin + '/payment-callback.html',

    // Metadata
    source: {
        type: 'karam',
        platform: 'web'
    }
};

// NOTE: Secret Key يجب أن يكون في Backend فقط
// Secret Key: sk_test_V3zDgA8niaVD7h (لا تضعه هنا!)
