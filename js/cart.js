// ============================================
// Cart Management
// ============================================

class CartManager {
    constructor() {
        this.cart = JSON.parse(localStorage.getItem('karam_cart') || '[]');
        this.userData = null;
        this.bookingDetails = {};
        this.init();
    }

    async init() {
        if (!karamAuth.requireAuth(['visitor', 'company'])) {
            return;
        }

        await this.loadUserData();
        this.setMinDate();
        this.renderCart();
        this.updateCartCount();
    }

    async loadUserData() {
        try {
            const { user } = await karamDB.getCurrentUser();
            const { data } = await karamDB.select('user_profiles', {
                eq: { id: user.id },
                single: true
            });
            this.userData = data;
        } catch (error) {
            console.error('Error loading user data:', error);
        }
    }

    setMinDate() {
        const today = new Date().toISOString().split('T')[0];
        const dateInput = document.getElementById('visit-date');
        if (dateInput) {
            dateInput.min = today;
        }
    }

    renderCart() {
        const container = document.getElementById('cart-list');
        const emptyCart = document.getElementById('empty-cart');
        const summarySection = document.getElementById('cart-summary-section');

        if (this.cart.length === 0) {
            container.innerHTML = '';
            emptyCart.style.display = 'block';
            summarySection.style.display = 'none';
            return;
        }

        emptyCart.style.display = 'none';
        summarySection.style.display = 'block';

        container.innerHTML = this.cart.map((item, index) => `
            <div class="cart-item">
                <div class="cart-item-info">
                    <h3>${item.majlis_name}</h3>
                    <p class="family-name">👨‍👩‍👧 ${item.family_name}</p>
                    <div class="item-meta">
                        <span>👥 السعة: ${item.capacity} شخص</span>
                    </div>
                </div>
                <div class="cart-item-price">
                    <div class="price">${i18n.formatCurrency(item.price)}</div>
                    <div class="price-unit">/شخص</div>
                </div>
                <button onclick="cartManager.removeItem(${index})" class="btn-remove">
                    🗑️ حذف
                </button>
            </div>
        `).join('');

        this.updateSummary();
    }

    updateSummary() {
        const itemCount = this.cart.length;
        const subtotal = this.cart.reduce((sum, item) => sum + item.price, 0);
        const serviceFee = subtotal * 0.05; // 5%
        const total = subtotal + serviceFee;

        document.getElementById('total-items').textContent = itemCount;
        document.getElementById('subtotal').textContent = i18n.formatCurrency(subtotal);
        document.getElementById('service-fee').textContent = i18n.formatCurrency(serviceFee);
        document.getElementById('total').textContent = i18n.formatCurrency(total);

        this.bookingDetails.subtotal = subtotal;
        this.bookingDetails.serviceFee = serviceFee;
        this.bookingDetails.total = total;
    }

    updateCartCount() {
        const countElements = document.querySelectorAll('#cart-count');
        countElements.forEach(el => {
            el.textContent = this.cart.length;
        });
    }

    removeItem(index) {
        if (!confirm('هل أنت متأكد من حذف هذا العنصر؟')) {
            return;
        }

        this.cart.splice(index, 1);
        localStorage.setItem('karam_cart', JSON.stringify(this.cart));
        this.renderCart();
        this.updateCartCount();
    }

    async proceedToCheckout() {
        // Validate booking details
        const visitDate = document.getElementById('visit-date').value;
        const visitTime = document.getElementById('visit-time').value;
        const guestCount = document.getElementById('guest-count').value;

        if (!visitDate || !visitTime || !guestCount) {
            alert('يرجى تعبئة جميع الحقول المطلوبة');
            return;
        }

        if (parseInt(guestCount) < 1) {
            alert('عدد الضيوف يجب أن يكون 1 على الأقل');
            return;
        }

        // Save booking details
        this.bookingDetails.visitDate = visitDate;
        this.bookingDetails.visitTime = visitTime;
        this.bookingDetails.guestCount = parseInt(guestCount);
        this.bookingDetails.notes = document.getElementById('notes').value;

        // Calculate total based on guest count
        const pricePerPerson = this.cart.reduce((sum, item) => sum + item.price, 0);
        const subtotal = pricePerPerson * this.bookingDetails.guestCount;
        const serviceFee = subtotal * 0.05;
        const total = subtotal + serviceFee;

        this.bookingDetails.subtotal = subtotal;
        this.bookingDetails.serviceFee = serviceFee;
        this.bookingDetails.total = total;

        // Show checkout modal
        this.showCheckoutModal();
    }

    showCheckoutModal() {
        // Render checkout summary
        const itemsList = document.getElementById('checkout-items-list');
        itemsList.innerHTML = this.cart.map(item => `
            <div class="checkout-item">
                <span>${item.majlis_name}</span>
                <span>${i18n.formatCurrency(item.price)}/شخص</span>
            </div>
        `).join('');

        itemsList.innerHTML += `
            <div class="checkout-item">
                <span>👥 عدد الضيوف</span>
                <strong>${this.bookingDetails.guestCount} شخص</strong>
            </div>
            <div class="checkout-item">
                <span>📅 التاريخ</span>
                <strong>${this.bookingDetails.visitDate}</strong>
            </div>
            <div class="checkout-item">
                <span>⏰ الوقت</span>
                <strong>${this.getTimeSlotText(this.bookingDetails.visitTime)}</strong>
            </div>
        `;

        document.getElementById('checkout-total').textContent = i18n.formatCurrency(this.bookingDetails.total);

        // Initialize Moyasar payment form
        this.initPaymentForm();

        document.getElementById('checkout-modal').classList.add('active');
    }

    initPaymentForm() {
        const paymentDiv = document.getElementById('payment-form');
        paymentDiv.innerHTML = `
            <div class="payment-info">
                <p>💳 <strong>طرق الدفع المتاحة:</strong></p>
                <ul>
                    <li>✓ بطاقات الائتمان (Visa, Mastercard)</li>
                    <li>✓ Apple Pay</li>
                    <li>✓ STC Pay</li>
                </ul>
                <p style="margin-top:16px; color:#666; font-size:14px;">
                    🔒 جميع المعاملات آمنة ومشفرة
                </p>
            </div>
        `;
    }

    async processPayment() {
        const btn = document.getElementById('pay-btn');
        const spinner = btn.querySelector('.spinner');
        const span = btn.querySelector('span');

        btn.disabled = true;
        spinner.style.display = 'inline-block';
        span.textContent = 'جاري المعالجة...';

        try {
            // Create booking records
            const bookingIds = [];

            for (const item of this.cart) {
                const bookingData = {
                    visitor_id: this.userData.id,
                    majlis_id: item.majlis_id,
                    booking_date: this.bookingDetails.visitDate,
                    time_slot: this.bookingDetails.visitTime,
                    guest_count: this.bookingDetails.guestCount,
                    total_price: item.price * this.bookingDetails.guestCount,
                    status: 'pending',
                    notes: this.bookingDetails.notes
                };

                const { data, error } = await karamDB.insert('bookings', bookingData);

                if (error) throw error;

                bookingIds.push(data[0].id);
            }

            // Process payment with Moyasar
            const paymentResult = await karamPayment.processCartPayment(
                this.bookingDetails.total,
                `Booking for ${this.cart.length} majlis`,
                {
                    booking_ids: bookingIds,
                    visitor_id: this.userData.id
                }
            );

            if (paymentResult.success) {
                // Update booking status
                for (const bookingId of bookingIds) {
                    await karamDB.update('bookings',
                        {
                            status: 'confirmed',
                            payment_status: 'paid',
                            payment_id: paymentResult.payment_id
                        },
                        { id: bookingId }
                    );
                }

                // Clear cart
                this.cart = [];
                localStorage.setItem('karam_cart', JSON.stringify(this.cart));

                alert('✅ تم الدفع بنجاح! سيتم الاتصال بك قريباً لتأكيد الحجز.');
                window.location.href = '/visitor-bookings.html';
            } else {
                throw new Error(paymentResult.error || 'فشل الدفع');
            }

        } catch (error) {
            console.error('Payment error:', error);
            alert('❌ حدث خطأ في عملية الدفع: ' + error.message);
        } finally {
            btn.disabled = false;
            spinner.style.display = 'none';
            span.textContent = '💳 ادفع الآن';
        }
    }

    getTimeSlotText(slot) {
        const slots = {
            morning: 'صباحاً (8:00 - 12:00)',
            afternoon: 'ظهراً (12:00 - 16:00)',
            evening: 'مساءً (16:00 - 20:00)',
            night: 'ليلاً (20:00 - 24:00)'
        };
        return slots[slot] || slot;
    }

    closeCheckoutModal() {
        document.getElementById('checkout-modal').classList.remove('active');
    }
}

const cartManager = new CartManager();
