// ============================================
// Family Dashboard - Main
// ============================================

class FamilyDashboard {
    constructor() {
        this.familyData = null;
        this.walletData = null;
        this.init();
    }

    async init() {
        // Wait for auth to be ready
        await karamAuth.checkSession();

        if (!karamAuth.requireAuth(['family'])) {
            return;
        }

        await this.loadFamilyData();
        await this.loadWallet();
        await this.loadStats();
        await this.loadUpcomingBookings();
        await this.loadRecentTransactions();
    }

    async loadFamilyData() {
        try {
            const { user } = await karamDB.getCurrentUser();

            const { data, error } = await karamDB.select('families', {
                eq: { user_id: user.id },
                single: true
            });

            if (error) throw error;

            this.familyData = data;
            document.getElementById('family-name').textContent = data.family_name;

        } catch (error) {
            console.error('Error loading family data:', error);
        }
    }

    async loadWallet() {
        try {
            const { data, error } = await karamDB.select('wallets', {
                eq: { family_id: this.familyData.id },
                single: true
            });

            if (error) throw error;

            this.walletData = data;
            document.getElementById('wallet-balance').textContent =
                i18n.formatCurrency(data.balance);

        } catch (error) {
            console.error('Error loading wallet:', error);
        }
    }

    async loadStats() {
        try {
            // Total bookings
            const { data: allBookings } = await karamDB.select('bookings', {
                eq: {
                    'majlis.families.id': this.familyData.id
                },
                select: 'id, majlis!inner(families!inner(id))'
            });

            document.getElementById('total-bookings').textContent = allBookings?.length || 0;

            // Upcoming bookings
            const today = new Date().toISOString().split('T')[0];
            const { data: upcoming } = await karamDB.select('bookings', {
                eq: { booking_status: 'confirmed' },
                gte: { booking_date: today },
                select: 'id, majlis!inner(families!inner(id))'
            });

            const upcomingCount = upcoming?.filter(b =>
                b.majlis?.families?.id === this.familyData.id
            ).length || 0;

            document.getElementById('upcoming-bookings').textContent = upcomingCount;

            // Average rating
            const { data: reviews } = await karamDB.select('reviews', {
                eq: { 'majlis.families.id': this.familyData.id },
                select: 'rating, majlis!inner(families!inner(id))'
            });

            if (reviews && reviews.length > 0) {
                const avgRating = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;
                document.getElementById('avg-rating').textContent = avgRating.toFixed(1);
            }

        } catch (error) {
            console.error('Error loading stats:', error);
        }
    }

    async loadUpcomingBookings() {
        try {
            const today = new Date().toISOString().split('T')[0];

            const { data, error } = await karamDB.select('bookings', {
                eq: { booking_status: 'confirmed' },
                gte: { booking_date: today },
                select: `
                    *,
                    visitors(full_name, phone),
                    majlis!inner(majlis_name, families!inner(id))
                `,
                order: { column: 'booking_date', ascending: true },
                limit: 5
            });

            if (error) throw error;

            const familyBookings = data?.filter(b =>
                b.majlis?.families?.id === this.familyData.id
            ) || [];

            this.renderUpcomingBookings(familyBookings);

        } catch (error) {
            console.error('Error loading upcoming bookings:', error);
        }
    }

    renderUpcomingBookings(bookings) {
        const container = document.getElementById('upcoming-list');

        if (bookings.length === 0) {
            container.innerHTML = '<p class="text-center text-muted">لا توجد حجوزات قادمة</p>';
            return;
        }

        container.innerHTML = bookings.map(booking => `
            <div class="booking-item">
                <div class="booking-icon">📅</div>
                <div class="booking-details">
                    <strong>${booking.visitors.full_name}</strong>
                    <small>${i18n.formatDate(booking.booking_date)} - ${this.getTimeSlotText(booking.time_slot)}</small>
                </div>
                <div class="booking-amount">
                    ${i18n.formatCurrency(booking.family_amount)}
                </div>
            </div>
        `).join('');
    }

    getTimeSlotText(slot) {
        const slots = {
            'morning': 'صباحاً (9-12)',
            'afternoon': 'ظهراً (2-5)',
            'evening': 'مساءً (7-10)'
        };
        return slots[slot] || slot;
    }

    async loadRecentTransactions() {
        try {
            const { data, error } = await karamDB.select('wallet_transactions', {
                eq: { wallet_id: this.walletData.id },
                order: { column: 'created_at', ascending: false },
                limit: 5
            });

            if (error) throw error;

            this.renderTransactions(data || []);

        } catch (error) {
            console.error('Error loading transactions:', error);
        }
    }

    renderTransactions(transactions) {
        const container = document.getElementById('transactions-list');

        if (transactions.length === 0) {
            container.innerHTML = '<p class="text-center text-muted">لا توجد معاملات</p>';
            return;
        }

        container.innerHTML = transactions.map(tx => {
            const isIncoming = ['booking_payment', 'payout_received'].includes(tx.transaction_type);
            const icon = isIncoming ? '💰' : '💸';
            const amountClass = isIncoming ? 'text-success' : 'text-danger';
            const amountPrefix = isIncoming ? '+' : '-';

            return `
                <div class="transaction-item">
                    <div class="transaction-icon">${icon}</div>
                    <div class="transaction-details">
                        <strong>${this.getTransactionTypeText(tx.transaction_type)}</strong>
                        <small>${i18n.formatDate(tx.created_at, { month: 'short', day: 'numeric', hour: 'numeric', minute: 'numeric' })}</small>
                    </div>
                    <div class="transaction-amount ${amountClass}">
                        ${amountPrefix}${i18n.formatCurrency(tx.amount)}
                    </div>
                </div>
            `;
        }).join('');
    }

    getTransactionTypeText(type) {
        const types = {
            'booking_payment': 'دفعة حجز',
            'payout_received': 'صرف دفعة',
            'withdrawal': 'سحب',
            'refund': 'استرداد',
            'commission': 'عمولة'
        };
        return types[type] || type;
    }
}

// Initialize
const familyDashboard = new FamilyDashboard();
