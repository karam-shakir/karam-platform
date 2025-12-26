// ============================================
// Karam Platform - Checkout & Payment
// Moyasar Integration
// ============================================

// Get booking info from URL
const urlParams = new URLSearchParams(window.location.search);
const bookingId = urlParams.get('booking_id');
const amount = parseFloat(urlParams.get('amount'));

let currentBooking = null;

// ============================================
// Initialize
// ============================================

document.addEventListener('DOMContentLoaded', async () => {
    console.log('💳 Checkout initialized');
    console.log('Booking ID:', bookingId);
    console.log('Amount:', amount);

    if (!bookingId || !amount) {
        alert('❌ معلومات الحجز غير صحيحة');
        window.location.href = 'browse-families-calendar.html';
        return;
    }

    // Load booking details
    await loadBookingDetails();

    // Initialize Moyasar
    initializeMoyasar();

    // Setup payment method selection
    setupPaymentMethods();
});

// ============================================
// Load Booking Details
// ============================================

async function loadBookingDetails() {
    try {
        const { data, error } = await window.supabaseClient
            .from('bookings')
            .select(`
                *,
                majlis:majlis_id (
                    majlis_name,
                    base_price
                )
            `)
            .eq('id', bookingId)
            .single();

        if (error) throw error;

        currentBooking = data;
        renderBookingSummary(data);

    } catch (error) {
        console.error('Error loading booking:', error);
        alert('حدث خطأ في تحميل تفاصيل الحجز');
    }
}

function renderBookingSummary(booking) {
    const container = document.getElementById('booking-details');

    // Reverse calculate to show price breakdown clearly
    const totalWithVat = parseFloat(booking.total_price);
    const guestCount = booking.guests_count;

    // Price per person after VAT
    const pricePerPersonWithVat = totalWithVat / guestCount;

    // Price per person before VAT
    const pricePerPersonBeforeVat = pricePerPersonWithVat / 1.15;

    // VAT per person
    const vatPerPerson = pricePerPersonWithVat - pricePerPersonBeforeVat;

    // Totals
    const subtotalAllGuests = pricePerPersonBeforeVat * guestCount;
    const vatTotal = vatPerPerson * guestCount;

    container.innerHTML = `
        <div class="summary-item">
            <span>المجلس:</span>
            <span>${booking.majlis?.majlis_name || 'غير محدد'}</span>
        </div>
        <div class="summary-item">
            <span>التاريخ:</span>
            <span>${formatDate(booking.booking_date)}</span>
        </div>
        <div class="summary-item">
            <span>الفترة:</span>
            <span>${formatTimeSlot(booking.time_slot)}</span>
        </div>
        <div class="summary-item">
            <span>عدد الضيوف:</span>
            <span>${guestCount} ضيف</span>
        </div>
        <div class="summary-item">
            <span>سعر الشخص الواحد:</span>
            <span>${pricePerPersonBeforeVat.toFixed(2)} ر.س</span>
        </div>
        <div class="summary-item">
            <span>سعر الشخص بعد الضريبة (15%):</span>
            <span>${pricePerPersonWithVat.toFixed(2)} ر.س</span>
        </div>
        <div class="summary-item" style="margin-top: 15px; padding-top: 15px; border-top: 2px solid #ddd;">
            <span>المبلغ الأساسي (${guestCount} × ${pricePerPersonBeforeVat.toFixed(2)}):</span>
            <span>${subtotalAllGuests.toFixed(2)} ر.س</span>
        </div>
        <div class="summary-item">
            <span>ضريبة القيمة المضافة (15%):</span>
            <span>${vatTotal.toFixed(2)} ر.س</span>
        </div>
        <div class="summary-item">
            <span>الإجمالي النهائي:</span>
            <span>${totalWithVat.toFixed(2)} ر.س</span>
        </div>
    `;
}

// ============================================
// Initialize Moyasar Payment
// ============================================

function initializeMoyasar() {
    console.log('🔧 Initializing Moyasar...');

    // Moyasar Test Key - Updated
    const MOYASAR_TEST_KEY = 'pk_test_1au5CTZmjPNnL4e84CcWxzkzujJeLVdjS3yuTFrC';

    Moyasar.init({
        element: '.mysr-form', // Try class selector instead
        amount: amount * 100,
        currency: 'SAR',
        description: `Booking ${bookingId}`,
        publishable_api_key: MOYASAR_TEST_KEY,
        callback_url: `${window.location.origin}/payment-success.html?booking_id=${bookingId}`,
        methods: ['creditcard'],

        // Additional required fields
        language: 'ar',

        // Metadata
        metadata: {
            booking_id: bookingId
        },

        on_completed: async function (payment) {
            console.log('✅ Payment completed!', payment);
            await handlePaymentSuccess(payment);
        },

        on_failed: function (error) {
            console.error('❌ Payment failed:', error);
            alert('فشل الدفع: ' + error.message);
        }
    });

    console.log('✅ Moyasar initialized');
}

// ============================================
// Handle Payment Success
// ============================================

async function handlePaymentSuccess(payment) {
    try {
        console.log('Updating booking with payment info...');

        // Update booking with payment details
        const { error } = await window.supabaseClient
            .from('bookings')
            .update({
                payment_status: 'paid',
                payment_method: 'moyasar', // Fixed value instead of payment.source.type
                transaction_id: payment.id,
                booking_status: 'confirmed'
            })
            .eq('id', bookingId);

        if (error) throw error;

        console.log('✅ Booking updated successfully');

        // Redirect to success page
        window.location.href = `payment-success.html?booking_id=${bookingId}&payment_id=${payment.id}`;

    } catch (error) {
        console.error('Error updating booking:', error);
        alert('الدفع تم بنجاح لكن حدث خطأ في تحديث الحجز. يرجى التواصل مع الدعم.');
    }
}

// ============================================
// Handle Payment Failure
// ============================================

async function handlePaymentFailure(error) {
    try {
        // Update booking status to failed
        await window.supabaseClient
            .from('bookings')
            .update({
                payment_status: 'failed'
            })
            .eq('id', bookingId);

        alert('❌ فشلت عملية الدفع. يرجى المحاولة مرة أخرى.');

    } catch (err) {
        console.error('Error updating failed payment:', err);
    }
}

// ============================================
// Payment Method Selection
// ============================================

function setupPaymentMethods() {
    document.querySelectorAll('.payment-method').forEach(method => {
        method.addEventListener('click', function () {
            // Remove active from all
            document.querySelectorAll('.payment-method').forEach(m => {
                m.classList.remove('active');
            });

            // Add active to clicked
            this.classList.add('active');

            const selectedMethod = this.getAttribute('data-method');
            console.log('Selected payment method:', selectedMethod);
        });
    });
}

// ============================================
// Helper Functions
// ============================================

function formatDate(dateStr) {
    const date = new Date(dateStr);
    return date.toLocaleDateString('ar-SA', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
}

function formatTimeSlot(slot) {
    const slots = {
        morning: 'صباحي (8ص-12م)',
        afternoon: 'مسائي (12م-5م)',
        evening: 'ليلي (5م-12ص)'
    };
    return slots[slot] || slot;
}
