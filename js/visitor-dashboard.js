// ============================================
// Visitor Dashboard
// ============================================

class VisitorDashboard {
    constructor() {
        this.visitorData = null;
        this.init();
    }

    async init() {
        if (!karamAuth.requireAuth(['visitor', 'company'])) {
            return;
        }

        await this.loadVisitorData();
        await this.loadStats();
        await this.loadUpcomingBookings();
        this.updateCartBadge();
    }

    async loadVisitorData() {
        try {
            const { user } = await karamDB.getCurrentUser();
            const { data } = await karamDB.select('visitors', {
                eq: { user_id: user.id },
                single: true
            });

            this.visitorData = data;
            document.getElementById('visitor-name').textContent = data?.full_name || 'زائر';
        } catch (error) {
            console.error('Error loading visitor data:', error);
        }
    }

    async loadStats() {
        try {
            if (!this.visitorData) return;

            const { data: bookings } = await karamDB.select('bookings', {
                eq: { visitor_id: this.visitorData.id }
            });

            const total = bookings?.length || 0;
            const upcoming = bookings?.filter(b =>
                b.status === 'confirmed' && new Date(b.booking_date) >= new Date()
            ).length || 0;
            const completed = bookings?.filter(b => b.status === 'completed').length || 0;
            const totalSpent = bookings?.reduce((sum, b) => sum + (b.total_price || 0), 0) || 0;

            document.getElementById('total-bookings').textContent = total;
            document.getElementById('upcoming-bookings').textContent = upcoming;
            document.getElementById('completed-bookings').textContent = completed;
            document.getElementById('total-spent').textContent = i18n.formatCurrency(totalSpent);

        } catch (error) {
            console.error('Error loading stats:', error);
        }
    }

    async loadUpcomingBookings() {
        try {
            if (!this.visitorData) return;

            const { data, error } = await karamDB.supabase
                .from('bookings')
                .select(`
                    *,
                    majlis (
                        majlis_name,
                        majlis_type,
                        families (
                            family_name
                        )
                    )
                `)
                .eq('visitor_id', this.visitorData.id)
                .eq('status', 'confirmed')
                .gte('booking_date', new Date().toISOString().split('T')[0])
                .order('booking_date', { ascending: true })
                .limit(3);

            if (error) throw error;

            this.renderUpcomingBookings(data || []);

        } catch (error) {
            console.error('Error loading upcoming bookings:', error);
            document.getElementById('upcoming-list').innerHTML = `
                <p class="text-center" style="color:#999;">لا توجد حجوزات قادمة</p>
            `;
        }
    }

    renderUpcomingBookings(bookings) {
        const container = document.getElementById('upcoming-list');

        if (bookings.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">📅</div>
                    <p>لا توجد حجوزات قادمة</p>
                    <a href="/browse-families.html" class="btn-primary">احجز الآن</a>
                </div>
            `;
            return;
        }

        container.innerHTML = bookings.map(booking => `
            <div class="booking-item">
                <div class="booking-icon">
                    ${booking.majlis?.majlis_type === 'men' ? '👨' : '👩'}
                </div>
                <div class="booking-info">
                    <h4>${booking.majlis?.majlis_name || 'مجلس'}</h4>
                    <p>👨‍👩‍👧 ${booking.majlis?.families?.family_name || 'عائلة'}</p>
                    <div class="booking-meta">
                        <span>📅 ${this.formatDate(booking.booking_date)}</span>
                        <span>⏰ ${this.getTimeSlot(booking.time_slot)}</span>
                        <span>👥 ${booking.guest_count} ضيف</span>
                    </div>
                </div>
                <div class="booking-price">
                    ${i18n.formatCurrency(booking.total_price)}
                </div>
            </div>
        `).join('');
    }

    formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('ar-SA', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    }

    getTimeSlot(slot) {
        const slots = {
            morning: 'صباحاً',
            afternoon: 'ظهراً',
            evening: 'مساءً',
            night: 'ليلاً'
        };
        return slots[slot] || slot;
    }

    updateCartBadge() {
        const cart = JSON.parse(localStorage.getItem('karam_cart') || '[]');
        document.getElementById('cart-badge').textContent = cart.length;
    }
}

const visitorDashboard = new VisitorDashboard();
