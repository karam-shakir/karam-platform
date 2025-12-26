// ============================================
// Karam Platform - Moyasar Payment Integration
// تكامل بوابة الدفع Moyasar
// ============================================
// Version: 2.0
// Author: Dr. Shakir Alhuthali
// Documentation: https://moyasar.com/docs/
// ============================================

// ============================================
// Moyasar Configuration
// ============================================

const MOYASAR_CONFIG = {
    // TODO: Replace with your actual Moyasar API keys
    publishableKey: 'pk_test_XXXXXXXXXXXXXXXXXXXXXXXX', // Test key
    // Production: 'pk_live_XXXXXXXXXXXXXXXXXXXXXXXX'

    // Supported payment methods
    methods: ['creditcard', 'applepay', 'stcpay'],

    // Currency
    currency: 'SAR',

    // Callback URLs
    callbackUrl: window.location.origin + '/payment-callback.html',

    // Metadata
    metadata: {
        platform: 'karam',
        version: '2.0'
    }
};

// ============================================
// Moyasar Payment Class
// ============================================

class KaramMoyasarPayment {
    constructor() {
        this.moyasar = null;
        this.currentPayment = null;
        this.init();
    }

    init() {
        // Check if Moyasar library is loaded
        if (typeof Moyasar === 'undefined') {
            console.error('Moyasar library not loaded!');
            console.log('Add to HTML: <script src="https://cdn.moyasar.com/mpf/1.7.3/moyasar.js"></script>');
            return;
        }

        this.moyasar = Moyasar;
        console.log('✅ Moyasar Payment initialized');
    }

    // ============================================
    // Create Payment Form
    // ============================================

    createPaymentForm(containerId, options) {
        const {
            amount, // Amount in SAR
            description,
            bookingId,
            onSuccess,
            onError
        } = options;

        // Amount must be in halalas (1 SAR = 100 halalas)
        const amountInHalalas = Math.round(amount * 100);

        const formConfig = {
            element: `#${containerId}`,
            publishable_api_key: MOYASAR_CONFIG.publishableKey,
            amount: amountInHalalas,
            currency: MOYASAR_CONFIG.currency,
            description: description || 'Karam Platform Booking',
            callback_url: MOYASAR_CONFIG.callbackUrl,
            methods: MOYASAR_CONFIG.methods,

            metadata: {
                ...MOYASAR_CONFIG.metadata,
                booking_id: bookingId,
                timestamp: new Date().toISOString()
            },

            // Styling
            language: i18n.getCurrentLanguage(),

            // Callbacks
            on_completed: (payment) => {
                console.log('Payment completed:', payment);
                this.currentPayment = payment;

                if (payment.status === 'paid') {
                    this.handleSuccessfulPayment(payment, onSuccess);
                } else {
                    this.handleFailedPayment(payment, onError);
                }
            },

            on_failure: (error) => {
                console.error('Payment failed:', error);
                this.handlePaymentError(error, onError);
            }
        };

        this.moyasar.init(formConfig);
    }

    // ============================================
    // Handle Payment Responses
    // ============================================

    async handleSuccessfulPayment(payment, callback) {
        try {
            // Update booking status
            const bookingId = payment.metadata.booking_id;

            await bookingEngine.updateBookingPaymentStatus(
                bookingId,
                'paid',
                payment.id
            );

            // Show success message
            this.showPaymentSuccess(payment);

            // Execute callback
            if (callback) {
                callback(payment);
            }

        } catch (error) {
            console.error('Error handling successful payment:', error);
        }
    }

    handleFailedPayment(payment, callback) {
        const errorMessage = payment.source?.message || 'فشل الدفع، يرجى المحاولة مرة أخرى';

        this.showPaymentError(errorMessage);

        if (callback) {
            callback({ success: false, error: errorMessage, payment });
        }
    }

    handlePaymentError(error, callback) {
        const errorMessage = error.message || 'حدث خطأ أثناء معالجة الدفع';

        this.showPaymentError(errorMessage);

        if (callback) {
            callback({ success: false, error: errorMessage });
        }
    }

    // ============================================
    // Direct Payment (without form)
    // ============================================

    async createPayment(paymentData) {
        try {
            // Amount in halalas
            const amountInHalalas = Math.round(paymentData.amount * 100);

            const paymentPayload = {
                amount: amountInHalalas,
                currency: MOYASAR_CONFIG.currency,
                description: paymentData.description || 'Karam Booking',
                callback_url: MOYASAR_CONFIG.callbackUrl,
                source: paymentData.source, // Card details or payment method
                metadata: {
                    ...MOYASAR_CONFIG.metadata,
                    ...paymentData.metadata
                }
            };

            // Make API call to Moyasar
            const response = await fetch('https://api.moyasar.com/v1/payments', {
                method: 'POST',
                headers: {
                    'Authorization': `Basic ${btoa(MOYASAR_CONFIG.publishableKey + ':')}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(paymentPayload)
            });

            const payment = await response.json();

            if (!response.ok) {
                throw new Error(payment.message || 'Payment failed');
            }

            return {
                success: true,
                payment: payment
            };

        } catch (error) {
            console.error('Payment creation error:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    // ============================================
    // Check Payment Status
    // ============================================

    async getPaymentStatus(paymentId) {
        try {
            const response = await fetch(`https://api.moyasar.com/v1/payments/${paymentId}`, {
                headers: {
                    'Authorization': `Basic ${btoa(MOYASAR_CONFIG.publishableKey + ':')}`
                }
            });

            const payment = await response.json();

            if (!response.ok) {
                throw new Error(payment.message || 'Failed to get payment status');
            }

            return {
                success: true,
                payment: payment
            };

        } catch (error) {
            console.error('Error getting payment status:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    // ============================================
    // Refund Payment
    // ============================================

    async refundPayment(paymentId, amount = null) {
        try {
            const refundPayload = {};

            if (amount) {
                // Partial refund (amount in halalas)
                refundPayload.amount = Math.round(amount * 100);
            }

            const response = await fetch(`https://api.moyasar.com/v1/payments/${paymentId}/refund`, {
                method: 'POST',
                headers: {
                    'Authorization': `Basic ${btoa(MOYASAR_CONFIG.publishableKey + ':')}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(refundPayload)
            });

            const refund = await response.json();

            if (!response.ok) {
                throw new Error(refund.message || 'Refund failed');
            }

            return {
                success: true,
                refund: refund
            };

        } catch (error) {
            console.error('Refund error:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    // ============================================
    // Process Cart Payment
    // ============================================

    async processCartPayment(containerIdOrCallback) {
        const cart = bookingEngine.getCart();

        if (cart.length === 0) {
            alert(i18n.t('msg.error') + ': ' + 'السلة فارغة');
            return;
        }

        const totalAmount = bookingEngine.getCartTotal();
        const bookingIds = cart.map(item => item.id);

        const description = `حجز منصة كرم - ${cart.length} ${cart.length === 1 ? 'حجز' : 'حجوزات'}`;

        // If container ID is provided, create form
        if (typeof containerIdOrCallback === 'string') {
            this.createPaymentForm(containerIdOrCallback, {
                amount: totalAmount,
                description: description,
                bookingId: bookingIds.join(','),
                onSuccess: async (payment) => {
                    // Create bookings in database
                    const bookings = await bookingEngine.createBookings({
                        method: 'moyasar',
                        transactionId: payment.id
                    });

                    // Update all bookings to paid
                    for (const booking of bookings) {
                        await bookingEngine.updateBookingPaymentStatus(
                            booking.id,
                            'paid',
                            payment.id
                        );
                    }

                    // Redirect to success page
                    window.location.href = `/booking-success.html?bookings=${bookings.map(b => b.id).join(',')}`;
                },
                onError: (error) => {
                    alert('فشل الدفع: ' + error.error);
                }
            });
        } else {
            // Callback provided instead
            const callback = containerIdOrCallback;
            callback({ amount: totalAmount, description });
        }
    }

    // ============================================
    // UI Helpers
    // ============================================

    showPaymentSuccess(payment) {
        const message = `
            <div class="payment-success">
                <h2>✅ تم الدفع بنجاح!</h2>
                <p>رقم العملية: ${payment.id}</p>
                <p>المبلغ: ${this.formatAmount(payment.amount)}</p>
            </div>
        `;

        // Show success notification
        this.showNotification(message, 'success');
    }

    showPaymentError(errorMessage) {
        const message = `
            <div class="payment-error">
                <h2>❌ فشلت عملية الدفع</h2>
                <p>${errorMessage}</p>
            </div>
        `;

        // Show error notification
        this.showNotification(message, 'error');
    }

    showNotification(message, type = 'info') {
        // Simple notification (can be replaced with a better UI library)
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.innerHTML = message;
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 20px;
            background: ${type === 'success' ? '#4CAF50' : '#f44336'};
            color: white;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            z-index: 9999;
            max-width: 400px;
        `;

        document.body.appendChild(notification);

        setTimeout(() => {
            notification.remove();
        }, 5000);
    }

    formatAmount(amountInHalalas) {
        const amountInSAR = amountInHalalas / 100;
        return i18n.formatCurrency(amountInSAR);
    }

    // ============================================
    // Webhook Handler (Backend)
    // ============================================

    /*
    NOTE: Webhook handling should be done on the backend for security.
    
    Example webhook endpoint:
    POST https://yourapp.com/api/moyasar-webhook
    
    Verify webhook signature and update booking status.
    */

    verifyWebhookSignature(payload, signature, secret) {
        // This should be done on backend
        const crypto = require('crypto');
        const hash = crypto
            .createHmac('sha256', secret)
            .update(JSON.stringify(payload))
            .digest('hex');

        return hash === signature;
    }
}

// ============================================
// Initialize Global Instance
// ============================================

const moyasarPayment = new KaramMoyasarPayment();

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { moyasarPayment, MOYASAR_CONFIG };
}

console.log('✅ Moyasar Payment Integration initialized');
