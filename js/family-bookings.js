// ============================================
// Family Bookings Management
// ============================================

class FamilyBookingsManager {
    constructor() {
        this.familyData = null;
        this.bookings = [];
    }

    async init() {
        try {
            await karamAuth.checkSession();
            await karamAuth.requireAuth('family');

            this.familyData = karamAuth.currentUserProfile;
            await this.loadBookings();
        } catch (error) {
            console.error('Init error:', error);
        }
    }

    async loadBookings() {
        try {
            // Get all bookings for this family's majalis
            const { data, error } = await window.supabaseClient
                .from('bookings')
                .select(`
                    *,
                    majlis:majlis_id (
                        majlis_name,
                        majlis_type,
                        capacity,
                        base_price
                    )
                `)
                .in('majlis_id', await this.getFamilyMajalisIds())
                .order('booking_date', { ascending: true })
                .order('created_at', { ascending: false });

            if (error) throw error;

            this.bookings = data || [];
            this.renderBookings();
            this.updateStats();
        } catch (error) {
            console.error('Error loading bookings:', error);
            alert('حدث خطأ في تحميل الحجوزات');
        }
    }

    async getFamilyMajalisIds() {
        const { data } = await window.supabaseClient
            .from('majlis')
            .select('id')
            .eq('family_id', this.familyData.id);

        return data?.map(m => m.id) || [];
    }

    renderBookings() {
        const today = new Date().toISOString().split('T')[0];

        const upcoming = this.bookings.filter(b =>
            b.booking_date >= today &&
            (b.booking_status === 'pending' || b.booking_status === 'confirmed')
        );

        const past = this.bookings.filter(b =>
            b.booking_date < today ||
            b.booking_status === 'cancelled' ||
            b.booking_status === 'completed'
        );

        this.renderBookingsList('upcoming-bookings', upcoming, true);
        this.renderBookingsList('past-bookings', past, false);
    }

    renderBookingsList(containerId, bookings, isUpcoming) {
        const container = document.getElementById(containerId);

        if (!bookings || bookings.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <p>لا توجد حجوزات ${isUpcoming ? 'قادمة' : 'سابقة'}</p>
                </div>
            `;
            return;
        }

        container.innerHTML = bookings.map((b, index) => `
            <div class="booking-card ${b.booking_status}">
                <div class="booking-header">
                    <div>
                        <h3>${this.escapeHtml(b.majlis?.majlis_name || 'مجلس')}</h3>
                        <p class="booking-meta">
                            📅 ${this.formatDate(b.booking_date)} | 
                            🕐 ${this.formatTimeSlot(b.time_slot)} | 
                            👥 ${b.guests_count} ضيف
                        </p>
                    </div>
                    <div class="booking-status-badge ${b.booking_status}">
                        ${this.getStatusText(b.booking_status)}
                    </div>
                </div>
                
                <div class="booking-details">
                    <div class="detail-row">
                        <span>رقم الحجز:</span>
                        <span>${b.id.substring(0, 8)}...</span>
                    </div>
                    <div class="detail-row">
                        <span>اسم العميل:</span>
                        <span>${this.escapeHtml(b.customer_name || 'غير محدد')}</span>
                    </div>
                    <div class="detail-row">
                        <span>البريد:</span>
                        <span>${this.escapeHtml(b.customer_email || '')}</span>
                    </div>
                    <div class="detail-row">
                        <span>الإجمالي:</span>
                        <span class="price">${b.total_price} ر.س</span>
                    </div>
                    <div class="detail-row">
                        <span>حالة الدفع:</span>
                        <span class="payment-status ${b.payment_status}">
                            ${this.getPaymentStatusText(b.payment_status)}
                        </span>
                    </div>
                    ${b.notes ? `
                        <div class="detail-row notes">
                            <span>ملاحظات:</span>
                            <span>${this.escapeHtml(b.notes)}</span>
                        </div>
                    ` : ''}
                </div>

                ${isUpcoming && b.booking_status === 'pending' ? `
                    <div class="booking-actions">
                        <button onclick="familyBookingsManager.confirmBooking('${b.id}')" class="btn btn-success">
                            ✅ تأكيد الحجز
                        </button>
                        <button onclick="familyBookingsManager.cancelBooking('${b.id}')" class="btn btn-danger">
                            ❌ إلغاء الحجز
                        </button>
                    </div>
                ` : ''}
            </div>
        `).join('');
    }

    async confirmBooking(bookingId) {
        if (!confirm('هل تريد تأكيد هذا الحجز؟')) return;

        try {
            const { error } = await window.supabaseClient
                .from('bookings')
                .update({
                    booking_status: 'confirmed',
                    confirmed_at: new Date().toISOString()
                })
                .eq('id', bookingId);

            if (error) throw error;

            alert('✅ تم تأكيد الحجز بنجاح!');
            await this.loadBookings();
        } catch (error) {
            console.error('Error:', error);
            alert('❌ حدث خطأ: ' + error.message);
        }
    }

    async cancelBooking(bookingId) {
        const reason = prompt('سبب الإلغاء (اختياري):');
        if (reason === null) return; // User clicked cancel

        try {
            const { error } = await window.supabaseClient
                .from('bookings')
                .update({
                    booking_status: 'cancelled',
                    cancelled_at: new Date().toISOString(),
                    cancellation_reason: reason || 'لم يذكر'
                })
                .eq('id', bookingId);

            if (error) throw error;

            alert('✅ تم إلغاء الحجز');
            await this.loadBookings();
        } catch (error) {
            console.error('Error:', error);
            alert('❌ حدث خطأ: ' + error.message);
        }
    }

    updateStats() {
        const today = new Date().toISOString().split('T')[0];

        const totalBookings = this.bookings.length;
        const upcomingCount = this.bookings.filter(b =>
            b.booking_date >= today &&
            (b.booking_status === 'confirmed' || b.booking_status === 'pending')
        ).length;
        const pendingCount = this.bookings.filter(b =>
            b.booking_status === 'pending'
        ).length;
        const totalRevenue = this.bookings
            .filter(b => b.payment_status === 'paid')
            .reduce((sum, b) => sum + parseFloat(b.total_price || 0), 0);

        document.getElementById('total-bookings').textContent = totalBookings;
        document.getElementById('upcoming-count').textContent = upcomingCount;
        document.getElementById('pending-count').textContent = pendingCount;
        document.getElementById('total-revenue').textContent = `${totalRevenue.toFixed(2)} ر.س`;
    }

    formatDate(dateStr) {
        const date = new Date(dateStr);
        return date.toLocaleDateString('ar-SA', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    }

    formatTimeSlot(slot) {
        const slots = {
            morning: 'صباحي (8ص-12م)',
            afternoon: 'مسائي (12م-5م)',
            evening: 'ليلي (5م-12ص)'
        };
        return slots[slot] || slot;
    }

    getStatusText(status) {
        const statuses = {
            pending: 'قيد الانتظار',
            confirmed: 'مؤكد',
            cancelled: 'ملغي',
            completed: 'مكتمل'
        };
        return statuses[status] || status;
    }

    getPaymentStatusText(status) {
        const statuses = {
            pending: 'معلق',
            paid: 'مدفوع',
            failed: 'فشل',
            refunded: 'مسترجع'
        };
        return statuses[status] || status;
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Initialize
const familyBookingsManager = new FamilyBookingsManager();
document.addEventListener('DOMContentLoaded', () => familyBookingsManager.init());
