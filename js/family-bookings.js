// ============================================
// Family Bookings Management
// ============================================

class BookingsManager {
    constructor() {
        this.familyData = null;
        this.currentBooking = null;
        this.init();
    }

    async init() {
        if (!karamAuth.requireAuth(['family'])) {
            return;
        }

        await this.loadFamilyData();
        await this.loadStats();
        await this.loadBookings('upcoming');
    }

    async loadFamilyData() {
        try {
            const { user } = await karamDB.getCurrentUser();
            const { data } = await karamDB.select('families', {
                eq: { user_id: user.id },
                single: true
            });

            this.familyData = data;
            document.getElementById('family-name').textContent = data.family_name;
        } catch (error) {
            console.error('Error loading family data:', error);
        }
    }

    async loadStats() {
        try {
            // Get all bookings for this family
            const { data: allBookings } = await karamDB.select('bookings', {
                select: `
                    *,
                    majlis!inner(families!inner(id))
                `
            });

            const familyBookings = allBookings?.filter(b =>
                b.majlis?.families?.id === this.familyData.id
            ) || [];

            const today = new Date().toISOString().split('T')[0];
            const upcoming = familyBookings.filter(b =>
                b.booking_status === 'confirmed' && b.booking_date >= today
            );
            const completed = familyBookings.filter(b =>
                b.booking_status === 'completed'
            );

            const totalRevenue = familyBookings.reduce((sum, b) =>
                sum + parseFloat(b.family_amount || 0), 0
            );

            document.getElementById('total-bookings').textContent = familyBookings.length;
            document.getElementById('upcoming-bookings').textContent = upcoming.length;
            document.getElementById('completed-bookings').textContent = completed.length;
            document.getElementById('total-revenue').textContent = i18n.formatCurrency(totalRevenue);
            document.getElementById('upcoming-count').textContent = upcoming.length;

        } catch (error) {
            console.error('Error loading stats:', error);
        }
    }

    switchTab(tab) {
        document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
        event.target.classList.add('active');

        document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
        document.getElementById(`tab-${tab}`).classList.add('active');

        this.loadBookings(tab);
    }

    async loadBookings(filter) {
        try {
            const { data } = await karamDB.select('bookings', {
                select: `
                    *,
                    visitors(full_name, phone, email),
                    majlis!inner(majlis_name, families!inner(id, family_name))
                `,
                order: { column: 'booking_date', ascending: filter === 'upcoming' }
            });

            const familyBookings = data?.filter(b =>
                b.majlis?.families?.id === this.familyData.id
            ) || [];

            let filtered = familyBookings;
            const today = new Date().toISOString().split('T')[0];

            if (filter === 'upcoming') {
                filtered = familyBookings.filter(b =>
                    b.booking_status === 'confirmed' && b.booking_date >= today
                );
            } else if (filter === 'completed') {
                filtered = familyBookings.filter(b =>
                    b.booking_status === 'completed'
                );
            } else if (filter === 'cancelled') {
                filtered = familyBookings.filter(b =>
                    b.booking_status === 'cancelled'
                );
            }

            if (filter === 'all') {
                this.renderAllBookings(familyBookings);
            } else {
                this.renderBookingsGrid(filtered, filter);
            }

        } catch (error) {
            console.error('Error loading bookings:', error);
        }
    }

    renderBookingsGrid(bookings, containerId) {
        const container = document.getElementById(`${containerId}-list`);

        if (bookings.length === 0) {
            container.innerHTML = '<p class="text-center text-muted">لا توجد حجوزات</p>';
            return;
        }

        container.innerHTML = bookings.map(booking => `
            <div class="booking-card" onclick="bookingsManager.viewBooking('${booking.id}')">
                <div class="booking-card-header">
                    <h4>${booking.visitors.full_name}</h4>
                    <span class="badge badge-${this.getStatusClass(booking.booking_status)}">
                        ${this.getStatusText(booking.booking_status)}
                    </span>
                </div>
                <div class="booking-card-body">
                    <p><strong>📅</strong> ${i18n.formatDate(booking.booking_date)}</p>
                    <p><strong>⏰</strong> ${this.getTimeSlotText(booking.time_slot)}</p>
                    <p><strong>🏠</strong> ${booking.majlis.majlis_name}</p>
                    <p><strong>👥</strong> ${booking.guest_count} ضيف</p>
                </div>
                <div class="booking-card-footer">
                    <span class="booking-price">${i18n.formatCurrency(booking.family_amount)}</span>
                    <span class="booking-number">#${booking.booking_number}</span>
                </div>
            </div>
        `).join('');
    }

    renderAllBookings(bookings) {
        const tbody = document.getElementById('all-tbody');

        if (bookings.length === 0) {
            tbody.innerHTML = '<tr><td colspan="8" class="text-center">لا توجد حجوزات</td></tr>';
            return;
        }

        tbody.innerHTML = bookings.map(b => `
            <tr onclick="bookingsManager.viewBooking('${b.id}')" style="cursor:pointer;">
                <td>#${b.booking_number}</td>
                <td>${b.visitors.full_name}</td>
                <td>${b.majlis.majlis_name}</td>
                <td>${i18n.formatDate(b.booking_date)}</td>
                <td>${this.getTimeSlotText(b.time_slot)}</td>
                <td>${b.guest_count}</td>
                <td>${i18n.formatCurrency(b.family_amount)}</td>
                <td><span class="badge badge-${this.getStatusClass(b.booking_status)}">${this.getStatusText(b.booking_status)}</span></td>
            </tr>
        `).join('');
    }

    getTimeSlotText(slot) {
        const slots = {
            'morning': '🌅 صباحاً (9-12)',
            'afternoon': '☀️ ظهراً (2-5)',
            'evening': '🌙 مساءً (7-10)'
        };
        return slots[slot] || slot;
    }

    getStatusClass(status) {
        const classes = {
            'pending': 'warning',
            'confirmed': 'info',
            'completed': 'success',
            'cancelled': 'danger'
        };
        return classes[status] || 'secondary';
    }

    getStatusText(status) {
        const texts = {
            'pending': 'قيد الانتظار',
            'confirmed': 'مؤكد',
            'completed': 'مكتمل',
            'cancelled': 'ملغي'
        };
        return texts[status] || status;
    }

    async viewBooking(bookingId) {
        try {
            const { data } = await karamDB.select('bookings', {
                eq: { id: bookingId },
                select: `
                    *,
                    visitors(*),
                    majlis(*),
                    packages(*)
                `,
                single: true
            });

            this.currentBooking = data;
            this.showBookingModal(data);

        } catch (error) {
            console.error('Error loading booking details:', error);
        }
    }

    showBookingModal(booking) {
        const modal = document.getElementById('booking-modal');
        const details = document.getElementById('booking-details');

        details.innerHTML = `
            <div style="display:grid; gap:20px;">
                <div style="background:#f8f9fa; padding:20px; border-radius:8px;">
                    <h3 style="margin-bottom:15px;">📋 معلومات الحجز</h3>
                    <table style="width:100%;">
                        <tr><td><strong>رقم الحجز:</strong></td><td>#${booking.booking_number}</td></tr>
                        <tr><td><strong>التاريخ:</strong></td><td>${i18n.formatDate(booking.booking_date)}</td></tr>
                        <tr><td><strong>الوقت:</strong></td><td>${this.getTimeSlotText(booking.time_slot)}</td></tr>
                        <tr><td><strong>عدد الضيوف:</strong></td><td>${booking.guest_count} شخص</td></tr>
                        <tr><td><strong>المجلس:</strong></td><td>${booking.majlis.majlis_name}</td></tr>
                        <tr><td><strong>الباقة:</strong></td><td>${booking.packages?.package_name_ar || '-'}</td></tr>
                    </table>
                </div>

                <div style="background:#f8f9fa; padding:20px; border-radius:8px;">
                    <h3 style="margin-bottom:15px;">👤 معلومات الزائر</h3>
                    <table style="width:100%;">
                        <tr><td><strong>الاسم:</strong></td><td>${booking.visitors.full_name}</td></tr>
                        <tr><td><strong>الجوال:</strong></td><td>${booking.visitors.phone}</td></tr>
                        <tr><td><strong>البريد:</strong></td><td>${booking.visitors.email || '-'}</td></tr>
                    </table>
                </div>

                <div style="background:#f8f9fa; padding:20px; border-radius:8px;">
                    <h3 style="margin-bottom:15px;">💰 المبالغ المالية</h3>
                    <table style="width:100%;">
                        <tr><td><strong>المبلغ الإجمالي:</strong></td><td>${i18n.formatCurrency(booking.total_amount)}</td></tr>
                        <tr><td><strong>نصيب العائلة:</strong></td><td>${i18n.formatCurrency(booking.family_amount)}</td></tr>
                        <tr><td><strong>عمولة المنصة:</strong></td><td>${i18n.formatCurrency(booking.platform_commission)}</td></tr>
                        <tr><td><strong>حالة الدفع:</strong></td><td><span class="badge badge-${booking.payment_status === 'paid' ? 'success' : 'warning'}">${booking.payment_status === 'paid' ? 'مدفوع' : 'معلق'}</span></td></tr>
                    </table>
                </div>

                <div>
                    <h3 style="margin-bottom:10px;">📌 الحالة</h3>
                    <p>
                        <span class="badge badge-${this.getStatusClass(booking.booking_status)}">
                            ${this.getStatusText(booking.booking_status)}
                        </span>
                    </p>
                </div>

                ${booking.special_requests ? `
                    <div style="background:#fff3cd; padding:15px; border-radius:8px;">
                        <strong>📝 ملاحظات خاصة:</strong>
                        <p style="margin-top:10px;">${booking.special_requests}</p>
                    </div>
                ` : ''}
            </div>
        `;

        modal.style.display = 'block';
    }

    closeModal() {
        document.getElementById('booking-modal').style.display = 'none';
        this.currentBooking = null;
    }
}

const bookingsManager = new BookingsManager();
