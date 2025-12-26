/**
 * Checkout & Moyasar Integration - Karam Platform
 * معالجة الدفع عبر Moyasar
 */

// Global state
let cart = [];
let customerInfo = {};
let totalAmount = 0;
let appliedDiscount = null;
let discountAmount = 0;
let visitorNamesData = {};

// Initialize Checkout
document.addEventListener('DOMContentLoaded', () => {
    // Load cart from localStorage
    cart = JSON.parse(localStorage.getItem('karam_booking_cart') || '[]');

    if (cart.length === 0) {
        showToast('تنبيه', 'السلة فارغة', 'warning');
        // Redirect disabled for debugging
        console.log('Cart is empty, but staying on page for debugging');
        /*
        setTimeout(() => {
            window.location.href = 'browse-families-calendar.html';
        }, 2000);
        return;
        */
    }

    // Load user info if logged in
    const user = JSON.parse(localStorage.getItem('karam_user') || 'null');
    if (user) {
        document.getElementById('customer-name').value = user.full_name || '';
        document.getElementById('customer-email').value = user.email || '';
        document.getElementById('customer-phone').value = user.phone || '';
    }

    // Display bookings summary
    displayBookingsSummary();

    // Calculate totals
    calculateTotals();
});

// Display Bookings Summary
function displayBookingsSummary() {
    const summaryDiv = document.getElementById('bookings-summary');
    const visitorContainer = document.getElementById('visitor-names-container');

    summaryDiv.innerHTML = cart.map((booking, index) => `
        <div class="booking-item">
            <div class="booking-header">
                <strong>${booking.familyName}</strong>
                <button onclick="removeBooking(${index})" class="btn btn-text" 
                        style="color: var(--color-error); padding: 0;">✕</button>
            </div>
            <div class="text-sm text-muted">
                📅 ${booking.date}<br>
                🕐 ${booking.timeLabel} (${booking.startTime}-${booking.endTime})<br>
                👥 ${booking.guestCount} ضيف
            </div>
            <div class="text-right font-bold" style="margin-top: var(--space-xs); color: var(--color-primary);">
                ${booking.price.toFixed(2)} ر.س
            </div>
        </div>
    `).join('');

    // Generate visitor names input fields
    visitorContainer.innerHTML = cart.map((booking, bookingIndex) => {
        let fields = '';
        for (let i = 0; i < booking.guestCount; i++) {
            fields += `
                <div class="form-group">
                    <label class="form-label">الزائر ${i + 1} - ${booking.familyName}</label>
                    <input type="text" 
                           id="visitor-name-${bookingIndex}-${i}" 
                           class="form-input visitor-name-input" 
                           data-booking="${bookingIndex}"
                           data-visitor="${i}"
                           placeholder="الاسم الثلاثي أو الرباعي (مثال: محمد أحمد علي السعيد)"
                           required
                           pattern="^[\\u0600-\\u06FF\\s]{10,}$"
                           title="يجب إدخال اسم عربي كامل (3-4 أجزاء على الأقل)">
                    <small class="text-muted">أحرف عربية فقط - 3 أو 4 أجزاء على الأقل</small>
                </div>
            `;
        }
        return fields;
    }).join('');

    // Add validation listeners
    document.querySelectorAll('.visitor-name-input').forEach(input => {
        input.addEventListener('blur', validateVisitorName);
    });
}

// Validate visitor name (Arabic or English, 3-4 parts)
function validateVisitorName(e) {
    const input = e.target;
    const value = input.value.trim();

    // Accept both Arabic and English characters with spaces
    const validPattern = /^[\u0600-\u06FFa-zA-Z\s]+$/;
    if (!value || !validPattern.test(value)) {
        input.setCustomValidity('يجب إدخال الاسم بالعربية أو الإنجليزية فقط / Only Arabic or English letters');
        input.style.borderColor = 'var(--color-error)';
        return false;
    }

    // Check if it has at least 3 parts (triple name)
    const parts = value.split(/\s+/).filter(p => p.length > 0);
    if (parts.length < 3) {
        input.setCustomValidity('يجب إدخال الاسم الثلاثي أو الرباعي على الأقل / Please enter at least 3 name parts');
        input.style.borderColor = 'var(--color-error)';
        return false;
    }

    input.setCustomValidity('');
    input.style.borderColor = 'var(--color-success)';
    return true;
}

// Calculate Totals
function calculateTotals() {
    const subtotal = cart.reduce((sum, booking) => sum + booking.price, 0);
    const serviceFee = subtotal * 0.05; // 5%

    // Apply discount
    let totalAfterDiscount = subtotal + serviceFee;
    if (discountAmount > 0) {
        totalAfterDiscount -= discountAmount;
        document.getElementById('discount-row').style.display = 'flex';
        document.getElementById('discount-display').textContent = `-${discountAmount.toFixed(2)} ر.س`;
    } else {
        document.getElementById('discount-row').style.display = 'none';
    }

    const vat = totalAfterDiscount * 0.15; // 15%
    totalAmount = totalAfterDiscount + vat;

    document.getElementById('subtotal').textContent = `${subtotal.toFixed(2)} ر.س`;
    document.getElementById('service-fee').textContent = `${serviceFee.toFixed(2)} ر.س`;
    document.getElementById('vat').textContent = `${vat.toFixed(2)} ر.س`;
    document.getElementById('grand-total').textContent = `${totalAmount.toFixed(2)} ر.س`;
}

// Remove Booking
function removeBooking(index) {
    cart.splice(index, 1);
    localStorage.setItem('karam_booking_cart', JSON.stringify(cart));

    if (cart.length === 0) {
        window.location.href = 'browse-families-calendar.html';
    } else {
        displayBookingsSummary();
        calculateTotals();
    }
}

// Apply Discount Code
async function applyDiscountCode() {
    const codeInput = document.getElementById('discount-code');
    const code = codeInput.value.trim().toUpperCase();
    const messageDiv = document.getElementById('discount-message');

    if (!code) {
        messageDiv.innerHTML = '<p class="text-error text-sm">يرجى إدخال كود الخصم</p>';
        return;
    }

    showLoading();
    messageDiv.innerHTML = '';

    try {
        // Get the first booking's family ID and subtotal
        const firstBooking = cart[0];
        const subtotal = cart.reduce((sum, booking) => sum + booking.price, 0);

        // Validate discount code
        const { data, error } = await supabaseClient
            .rpc('validate_discount_code', {
                p_code: code,
                p_family_id: firstBooking.familyId,
                p_booking_amount: subtotal
            });

        hideLoading();

        if (error) throw error;

        if (data && data.length > 0 && data[0].is_valid) {
            const result = data[0];
            appliedDiscount = {
                id: result.discount_id,
                code: code,
                type: result.discount_type,
                value: result.discount_value
            };
            discountAmount = result.discount_amount;

            messageDiv.innerHTML = `
                <div style="padding: var(--space-md); background: var(--color-success-light); 
                     border-radius: var(--radius-md); color: var(--color-success-dark);">
                    ✓ ${result.message} - وفرت ${discountAmount.toFixed(2)} ر.س
                </div>
            `;

            codeInput.disabled = true;
            calculateTotals();
        } else {
            const message = data && data.length > 0 ? data[0].message : 'كود الخصم غير صحيح';
            messageDiv.innerHTML = `<p class="text-error text-sm">❌ ${message}</p>`;
            appliedDiscount = null;
            discountAmount = 0;
            calculateTotals();
        }

    } catch (error) {
        hideLoading();
        console.error('Discount validation error:', error);
        messageDiv.innerHTML = `<p class="text-error text-sm">حدث خطأ في التحقق من كود الخصم</p>`;
    }
}

// Collect Visitor Names
function collectVisitorNames() {
    const names = {};
    let allValid = true;

    cart.forEach((booking, bookingIndex) => {
        names[bookingIndex] = [];

        for (let i = 0; i < booking.guestCount; i++) {
            const input = document.getElementById(`visitor-name-${bookingIndex}-${i}`);
            const value = input.value.trim();

            // Validate - accepts both Arabic and English
            const validPattern = /^[\u0600-\u06FFa-zA-Z\s]+$/;
            const parts = value.split(/\s+/).filter(p => p.length > 0);

            if (!value || !validPattern.test(value) || parts.length < 3) {
                input.style.borderColor = 'var(--color-error)';
                allValid = false;
            } else {
                names[bookingIndex].push(value);
            }
        }
    });

    if (!allValid) {
        throw new Error('يرجى إدخال أسماء صحيحة لجميع الزوار (الاسم الثلاثي أو الرباعي) / Please enter valid names for all visitors (3-4 parts)');
    }

    return names;
}

// Process Payment
async function processPayment() {
    // Validate customer info
    const form = document.getElementById('customer-info-form');
    if (!form.checkValidity()) {
        form.reportValidity();
        return;
    }

    // Get customer info
    customerInfo = {
        name: document.getElementById('customer-name').value.trim(),
        email: document.getElementById('customer-email').value.trim(),
        phone: document.getElementById('customer-phone').value.trim(),
        emergencyContact: document.getElementById('emergency-contact').value.trim(),
        notes: document.getElementById('customer-notes').value.trim()
    };

    // Collect and validate visitor names
    try {
        visitorNamesData = collectVisitorNames();
    } catch (error) {
        showToast('خطأ', error.message, 'error');
        payButton.disabled = false;
        payButton.textContent = '💳 الدفع الآن';
        return;
    }

    // Disable button
    const payButton = document.getElementById('pay-button');
    payButton.disabled = true;
    payButton.textContent = 'جاري المعالجة...';

    try {
        // Create booking records in Supabase first
        const bookingIds = await createBookings();

        if (!bookingIds || bookingIds.length === 0) {
            throw new Error('فشل إنشاء الحجوزات');
        }

        // Initialize Moyasar payment
        initiateMoyasarPayment(bookingIds);

    } catch (error) {
        console.error('Payment error:', error);
        showToast('خطأ', 'فشلت عملية الدفع: ' + error.message, 'error');
        payButton.disabled = false;
        payButton.textContent = '💳 الدفع الآن';
    }
}

// Create Bookings in Supabase
async function createBookings() {
    const user = JSON.parse(localStorage.getItem('karam_user') || 'null');

    if (!user) {
        throw new Error('يجب تسجيل الدخول أولاً');
    }

    const bookingIds = [];

    for (let i = 0; i < cart.length; i++) {
        const cartItem = cart[i];
        try {
            // Generate booking number
            const bookingNumber = 'BK-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9).toUpperCase();

            // Prepare visitor names for this booking
            const visitorNames = visitorNamesData[i] || [];

            // Create booking
            const { data: booking, error: bookingError } = await supabaseClient
                .from('bookings')
                .insert({
                    booking_number: bookingNumber,
                    visitor_id: user.id,
                    family_id: cartItem.familyId,
                    booking_date: cartItem.date,
                    total_amount: cartItem.price,
                    status: 'pending',
                    notes: customerInfo.notes,
                    visitor_names: visitorNames, // JSONB array of visitor names
                    discount_code_id: appliedDiscount ? appliedDiscount.id : null,
                    discount_amount: discountAmount,
                    emergency_contact: customerInfo.emergencyContact
                })
                .select()
                .single();

            if (bookingError) throw bookingError;

            // Create time slot
            const { error: slotError } = await supabaseClient
                .from('booking_time_slots')
                .insert({
                    booking_id: booking.id,
                    booking_date: cartItem.date,
                    start_time: cartItem.startTime,
                    end_time: cartItem.endTime,
                    guest_count: cartItem.guestCount,
                    status: 'confirmed'
                });

            if (slotError) throw slotError;

            bookingIds.push(booking.id);

        } catch (error) {
            console.error('Error creating booking:', error);
            throw error;
        }
    }

    return bookingIds;
}

// Initiate Moyasar Payment
function initiateMoyasarPayment(bookingIds) {
    // Prepare metadata
    const metadata = {
        customer_name: customerInfo.name,
        customer_email: customerInfo.email,
        customer_phone: customerInfo.phone,
        booking_ids: bookingIds.join(','),
        bookings_count: cart.length
    };

    // Initialize Moyasar
    Moyasar.init({
        element: '.mysr-form',
        amount: Math.round(totalAmount * 100), // Convert to halalas
        currency: MOYASAR_CONFIG.currency,
        description: `حجز ضيافة - منصة كرم (${cart.length} حجز)`,
        publishable_api_key: MOYASAR_CONFIG.publishableKey,
        callback_url: MOYASAR_CONFIG.callbackUrl,
        methods: MOYASAR_CONFIG.methods,
        metadata: metadata,

        // Callbacks
        on_completed: function (payment) {
            console.log('Payment completed:', payment);
            handlePaymentSuccess(payment, bookingIds);
        },

        on_failure: function (error) {
            console.error('Payment failed:', error);
            handlePaymentFailure(error, bookingIds);
        }
    });
}

// Handle Payment Success
async function handlePaymentSuccess(payment, bookingIds) {
    showLoading();

    try {
        // Update booking status
        for (const bookingId of bookingIds) {
            await supabaseClient
                .from('bookings')
                .update({
                    status: 'confirmed',
                    payment_status: 'paid'
                })
                .eq('id', bookingId);

            // Create payment record
            await supabaseClient
                .from('payments')
                .insert({
                    booking_id: bookingId,
                    amount: payment.amount / 100, // Convert from halalas
                    payment_method: payment.source.type,
                    transaction_id: payment.id,
                    status: 'success',
                    gateway: 'moyasar',
                    gateway_response: payment
                });

            // Create family earnings
            const commission = (payment.amount / 100) * 0.15; // 15% commission
            const netAmount = (payment.amount / 100) - commission;

            // Get family_id from booking
            const { data: booking } = await supabaseClient
                .from('bookings')
                .select('family_id')
                .eq('id', bookingId)
                .single();

            if (booking) {
                await supabaseClient
                    .from('family_earnings')
                    .insert({
                        family_id: booking.family_id,
                        booking_id: bookingId,
                        total_amount: payment.amount / 100,
                        platform_commission: commission,
                        net_amount: netAmount,
                        status: 'pending'
                    });
            }
        }

        // Clear cart
        localStorage.removeItem('karam_booking_cart');

        hideLoading();

        // Redirect to success page
        window.location.href = `payment-success.html?payment_id=${payment.id}`;

    } catch (error) {
        hideLoading();
        console.error('Error updating bookings:', error);
        showToast('تحذير', 'تم الدفع لكن هناك مشكلة في التحديث. تواصل مع الدعم.', 'warning');
    }
}

// Handle Payment Failure
async function handlePaymentFailure(error, bookingIds) {
    showLoading();

    try {
        // Update booking status to cancelled
        for (const bookingId of bookingIds) {
            await supabaseClient
                .from('bookings')
                .update({
                    status: 'cancelled',
                    payment_status: 'failed'
                })
                .eq('id', bookingId);
        }

        hideLoading();

        // Redirect to failure page
        window.location.href = `payment-failed.html?error=${encodeURIComponent(error.message || 'فشل الدفع')}`;

    } catch (err) {
        hideLoading();
        console.error('Error handling failure:', err);
        showToast('خطأ', 'فشل الدفع', 'error');
    }
}
