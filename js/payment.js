/**
 * ====================================
 * Payment Integration - Moyasar
 * تكامل نظام الدفع مع ميسر
 * ====================================
 */

// بيانات الاتصال بميسر
const MOYASAR_CONFIG = {
    publishableKey: 'pk_test_YOUR_MOYASAR_KEY', // استبدل بمفتاحك من لوحة تحكم ميسر
    apiUrl: 'https://api.moyasar.com/v1',
    // للإنتاج استخدم المفتاح الحقيقي وليس التجريبي
};

/**
 * تهيئة ميسر
 */
function initializeMoyasar() {
    // تحميل سكريبت ميسر
    if (!document.getElementById('moyasar-script')) {
        const script = document.createElement('script');
        script.id = 'moyasar-script';
        script.src = 'https://cdn.moyasar.com/mpf/1.7.3/moyasar.js';
        document.head.appendChild(script);

        // تحميل CSS الخاص بميسر
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = 'https://cdn.moyasar.com/mpf/1.7.3/moyasar.css';
        document.head.appendChild(link);
    }
}

/**
 * إنشاء نموذج الدفع
 * @param {Object} paymentData - بيانات الدفع
 */
function createPaymentForm(paymentData) {
    const {
        amount, // المبلغ بالهللات (مثلاً: 10000 = 100 ريال)
        currency = 'SAR',
        description,
        callbackUrl,
        metadata = {}
    } = paymentData;

    // إنشاء container لنموذج الدفع
    const container = document.createElement('div');
    container.id = 'moyasar-payment-form';

    // تهيئة نموذج ميسر
    Moyasar.init({
        element: container,
        amount: amount,
        currency: currency,
        description: description,
        publishable_api_key: MOYASAR_CONFIG.publishableKey,
        callback_url: callbackUrl,
        methods: ['creditcard', 'applepay', 'stcpay'], // طرق الدفع المتاحة
        metadata: metadata,

        // تخصيص الألوان
        style: {
            base: {
                color: '#2C3E1F',
                fontSize: '16px',
                fontFamily: "'Tajawal', sans-serif",
            },
            invalid: {
                color: '#F44336'
            }
        },

        // عند نجاح الدفع
        on_success: function (payment) {
            handlePaymentSuccess(payment);
        },

        // عند فشل الدفع
        on_failure: function (error) {
            handlePaymentFailure(error);
        }
    });

    return container;
}

/**
 * معالجة نجاح الدفع
 */
function handlePaymentSuccess(payment) {
    console.log('Payment successful:', payment);

    // حفظ معلومات الدفع في قاعدة البيانات
    savePaymentToDatabase(payment);

    // عرض رسالة نجاح
    showNotification('تم الدفع بنجاح! ✅', 'success');

    // توجيه المستخدم لصفحة التأكيد
    setTimeout(() => {
        window.location.href = `/payment-success.html?id=${payment.id}`;
    }, 2000);
}

/**
 * معالجة فشل الدفع
 */
function handlePaymentFailure(error) {
    console.error('Payment failed:', error);

    showNotification('فشلت عملية الدفع. يرجى المحاولة مرة أخرى.', 'error');
}

/**
 * إنشاء دفعة سريعة (Checkout)
 * @param {Object} bookingData - بيانات الحجز
 */
async function createCheckout(bookingData) {
    try {
        const {
            items, // قائمة العناصر المحجوزة
            totalAmount,
            userEmail,
            userName
        } = bookingData;

        // حساب المبلغ الإجمالي بالهللات
        const amountInHalalas = Math.round(totalAmount * 100);

        // إنشاء وصف للدفع
        const description = `حجز منصة كرم - ${items.length} عنصر`;

        // البيانات الإضافية
        const metadata = {
            user_email: userEmail,
            user_name: userName,
            items: JSON.stringify(items),
            booking_date: new Date().toISOString()
        };

        // إنشاء نموذج الدفع
        const paymentForm = createPaymentForm({
            amount: amountInHalalas,
            description: description,
            callbackUrl: `${window.location.origin}/payment-callback.html`,
            metadata: metadata
        });

        // عرض النموذج في modal
        showPaymentModal(paymentForm);

    } catch (error) {
        console.error('Error creating checkout:', error);
        showNotification('حدث خطأ أثناء إنشاء عملية الدفع', 'error');
    }
}

/**
 * عرض نموذج الدفع في modal
 */
function showPaymentModal(paymentForm) {
    // إنشاء modal
    const modal = document.createElement('div');
    modal.className = 'payment-modal';
    modal.innerHTML = `
        <div class="payment-modal-overlay"></div>
        <div class="payment-modal-content">
            <div class="payment-modal-header">
                <h2>إتمام عملية الدفع</h2>
                <button class="close-payment-modal">×</button>
            </div>
            <div class="payment-modal-body">
                <!-- نموذج الدفع سيضاف هنا -->
            </div>
        </div>
    `;

    // إضافة نموذج الدفع
    modal.querySelector('.payment-modal-body').appendChild(paymentForm);

    // إضافة المودال للصفحة
    document.body.appendChild(modal);

    // إغلاق المودال
    modal.querySelector('.close-payment-modal').addEventListener('click', () => {
        modal.remove();
    });

    modal.querySelector('.payment-modal-overlay').addEventListener('click', () => {
        modal.remove();
    });
}

/**
 * حفظ معلومات الدفع في قاعدة البيانات
 */
async function savePaymentToDatabase(payment) {
    try {
        const { data, error } = await supabase
            .from('payments')
            .insert([
                {
                    payment_id: payment.id,
                    amount: payment.amount / 100, // تحويل من هللات لريال
                    currency: payment.currency,
                    status: payment.status,
                    method: payment.source.type,
                    user_id: getCurrentUserId(),
                    metadata: payment.metadata,
                    created_at: new Date().toISOString()
                }
            ]);

        if (error) throw error;

        console.log('Payment saved to database:', data);

        // تحديث حالة الحجوزات
        await updateBookingsStatus(payment.metadata);

    } catch (error) {
        console.error('Error saving payment:', error);
    }
}

/**
 * تحديث حالة الحجوزات بعد الدفع
 */
async function updateBookingsStatus(metadata) {
    try {
        const items = JSON.parse(metadata.items);

        for (const item of items) {
            await supabase
                .from('bookings')
                .update({
                    status: 'confirmed',
                    payment_status: 'paid',
                    paid_at: new Date().toISOString()
                })
                .eq('id', item.bookingId);
        }

    } catch (error) {
        console.error('Error updating bookings:', error);
    }
}

/**
 * التحقق من حالة الدفع
 * @param {string} paymentId - معرف الدفع
 */
async function verifyPayment(paymentId) {
    try {
        const response = await fetch(`${MOYASAR_CONFIG.apiUrl}/payments/${paymentId}`, {
            headers: {
                'Authorization': `Basic ${btoa(MOYASAR_CONFIG.publishableKey + ':')}`
            }
        });

        const payment = await response.json();
        return payment;

    } catch (error) {
        console.error('Error verifying payment:', error);
        return null;
    }
}

/**
 * استرجاع المبلغ (Refund)
 * @param {string} paymentId - معرف الدفع
 * @param {number} amount - المبلغ المراد استرجاعه (بالهللات)
 */
async function refundPayment(paymentId, amount = null) {
    try {
        const response = await fetch(`${MOYASAR_CONFIG.apiUrl}/payments/${paymentId}/refund`, {
            method: 'POST',
            headers: {
                'Authorization': `Basic ${btoa(MOYASAR_CONFIG.publishableKey + ':')}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                amount: amount // إذا كان null سيسترجع المبلغ كاملاً
            })
        });

        const refund = await response.json();

        if (refund.status === 'refunded') {
            showNotification('تم استرجاع المبلغ بنجاح', 'success');
            return true;
        }

        return false;

    } catch (error) {
        console.error('Error refunding payment:', error);
        showNotification('حدث خطأ أثناء استرجاع المبلغ', 'error');
        return false;
    }
}

/**
 * الحصول على معرف المستخدم الحالي
 */
function getCurrentUserId() {
    // إذا كان المستخدم مسجل دخول
    const userStr = localStorage.getItem('karam_user');
    if (userStr) {
        const user = JSON.parse(userStr);
        return user.id;
    }
    return null;
}

// تهيئة ميسر عند تحميل الصفحة
if (typeof window !== 'undefined') {
    window.addEventListener('load', initializeMoyasar);
}

// تصدير الوظائف
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        createCheckout,
        verifyPayment,
        refundPayment
    };
}
