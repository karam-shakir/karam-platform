// ============================================
// Visitor Bookings
// ============================================

class VisitorBookings {
    constructor() {
        this.visitorData = null;
        this.allBookings = [];
        this.currentTab = 'all';
        this.init();
    }

    async init() {
        if (!karamAuth.requireAuth(['visitor', 'company'])) {
            return;
        }

        await this.loadVisitorData();
        await this.loadBookings();
    }

    async loadVisitorData() {
        try {
            const { user } = await karamDB.getCurrentUser();
            const { data } = await karamDB.select('visitors', {
                eq: { user_id: user.id },
                single: true
            });

            this.visitorData = data;
            const nameEl = document.getElementById('visitor-name');
            if (nameEl) {
                nameEl.textContent = data?.full_name || 'زائر';
            }
        } catch (error) {
            console.error('Error loading visitor data:', error);
        }
    }

    async loadBookings() {
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
                            family_name,
                            city
                        )
                    )
                `)
                .eq('visitor_id', this.visitorData.id)
                .order('booking_date', { ascending: false });

            if (error) throw error;

            this.allBookings = data || [];
            this.updateCounts();
            this.renderBookings();

        } catch (error) {
            console.error('Error loading bookings:', error);
            document.getElementById('bookings-list').innerHTML = `
                <p class="text-center" style="color:#999;">حدث خطأ في تحميل الحجوزات</p>
            `;
        }
    }

    updateCounts() {
        const all = this.allBookings.length;
        const upcoming = this.allBookings.filter(b =>
            b.status === 'confirmed' && new Date(b.booking_date) >= new Date()
        ).length;
        const completed = this.allBookings.filter(b => b.status === 'completed').length;
        const cancelled = this.allBookings.filter(b => b.status === 'cancelled').length;

        document.getElementById('all-count').textContent = all;
        document.getElementById('upcoming-count').textContent = upcoming;
        document.getElementById('completed-count').textContent = completed;
        document.getElementById('cancelled-count').textContent = cancelled;
    }

    switchTab(tab) {
        this.currentTab = tab;

        // Update tab UI
        document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
        event.target.classList.add('active');

        this.renderBookings();
    }

    renderBookings() {
        const container = document.getElementById('bookings-list');

        let filteredBookings = this.allBookings;
        const now = new Date();

        switch (this.currentTab) {
            case 'upcoming':
                filteredBookings = this.allBookings.filter(b =>
                    b.status === 'confirmed' && new Date(b.booking_date) >= now
                );
                break;
            case 'completed':
                filteredBookings = this.allBookings.filter(b => b.status === 'completed');
                break;
            case 'cancelled':
                filteredBookings = this.allBookings.filter(b => b.status === 'cancelled');
                break;
        }

        if (filteredBookings.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">📅</div>
                    <p>لا توجد حجوزات</p>
                    <a href="/browse-families.html" class="btn-primary">تصفح المجالس</a>
                </div>
            `;
            return;
        }

        container.innerHTML = filteredBookings.map(booking => `
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
                        <span class="status-badge ${booking.status}">
                            ${this.getStatusBadge(booking.status)}
                        </span>
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

    getStatusBadge(status) {
        const badges = {
            pending: '⏳ معلق',
            confirmed: '✅ مؤكد',
            completed: '✅ مكتمل',
            cancelled: '❌ ملغي'
        };
        return badges[status] || status;
    }
}

const visitorBookings = new VisitorBookings();
