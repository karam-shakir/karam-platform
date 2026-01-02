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

            const familyNameEl = document.getElementById('family-name');
            if (familyNameEl) {
                familyNameEl.textContent = data.family_name || 'عائلة ...';
            }

        } catch (error) {
            console.error('Error loading family data:', error);
        }
    }

    async loadWallet() {
        try {
            if (!this.familyData) {
                console.warn('Family data not loaded yet');
                return;
            }

            // Try to get wallet (wallets table may not exist yet)
            let { data, error } = await karamDB.select('wallets', {
                eq: { family_id: this.familyData.id }
            });

            // If wallets table doesn't exist, just show default
            if (error && error.code === '42P01') {
                console.warn('Wallets table does not exist yet');
                this.showDefaultBalance();
                return;
            }

            // If wallet doesn't exist, create one
            if (!error && (!data || data.length === 0)) {
                console.log('Creating wallet for family...');
                const { data: newWallet, error: createError } = await karamDB.insert('wallets', {
                    family_id: this.familyData.id,
                    balance: 0,
                    pending_balance: 0,
                    total_earned: 0
                }, { select: '*' });

                if (createError) {
                    console.error('Error creating wallet:', createError);
                    // Show 0 balance if creation fails
                    this.showDefaultBalance();
                    return;
                }

                this.walletData = newWallet[0];
            } else {
                this.walletData = data[0];
            }

            // Update UI
            const balanceEl = document.getElementById('wallet-balance');
            if (balanceEl) {
                balanceEl.textContent = i18n.formatCurrency(this.walletData.balance || 0);
            }

        } catch (error) {
            console.error('Error loading wallet:', error);
            this.showDefaultBalance();
        }
    }

    showDefaultBalance() {
        const balanceEl = document.getElementById('wallet-balance');
        if (balanceEl) {
            balanceEl.textContent = '0 ر.س';
        }
    }

    async loadStats() {
        try {
            if (!this.familyData) return;

            // Get majalis count instead of bookings
            const { data: majalis, error: majlisError } = await karamDB.select('majlis', {
                eq: { family_id: this.familyData.id },
                select: 'id'
            });

            if (!majlisError && majalis) {
                // Show majalis count as "total bookings" for now
                const totalBookingsEl = document.getElementById('total-bookings');
                if (totalBookingsEl) {
                    totalBookingsEl.textContent = majalis.length || 0;
                }
            }

            // Get available slots count via majlis
            let slotCount = 0;
            if (majalis && majalis.length > 0) {
                const majlisIds = majalis.map(m => m.id);
                const { data: slots, error: slotsError } = await karamDB.select('available_slots', {
                    in: { majlis_id: majlisIds },
                    select: 'id'
                });
                slotCount = slots?.length || 0;
            }

            const upcomingEl = document.getElementById('upcoming-bookings');
            if (upcomingEl) {
                upcomingEl.textContent = slotCount;
            }

            // Default rating (no reviews table yet)
            const ratingEl = document.getElementById('avg-rating');
            if (ratingEl) {
                ratingEl.textContent = '0.0';
            }

        } catch (error) {
            console.error('Error loading stats:', error);
            // Set defaults
            this.setDefaultStats();
        }
    }

    setDefaultStats() {
        const stats = {
            'total-bookings': '0',
            'upcoming-bookings': '0',
            'avg-rating': '0.0'
        };

        Object.keys(stats).forEach(id => {
            const el = document.getElementById(id);
            if (el) el.textContent = stats[id];
        });
    }

    async loadUpcomingBookings() {
        const container = document.getElementById('upcoming-list');
        if (!container) return;

        try {
            if (!this.familyData) {
                container.innerHTML = '<p class="text-center text-muted">جاري التحميل...</p>';
                return;
            }

            // Get family's majalis first
            const { data: majalis, error: majlisError } = await karamDB.select('majlis', {
                eq: { family_id: this.familyData.id },
                select: 'id, majlis_name'
            });

            if (majlisError || !majalis || majalis.length === 0) {
                container.innerHTML = '<p class="text-center text-muted">لا توجد مجالس بعد</p>';
                return;
            }

            // Get upcoming available slots for these majalis
            const today = new Date().toISOString().split('T')[0];
            const majlisIds = majalis.map(m => m.id);

            const { data, error } = await karamDB.select('available_slots', {
                in: { majlis_id: majlisIds },
                gte: { available_date: today },
                select: '*, majlis(majlis_name)',
                order: { column: 'available_date', ascending: true },
                limit: 5
            });

            if (error) throw error;

            if (!data || data.length === 0) {
                container.innerHTML = '<p class="text-center text-muted">لا توجد أوقات متاحة قادمة</p>';
                return;
            }

            container.innerHTML = data.map(slot => `
                <div class="booking-item">
                    <div class="booking-icon">📅</div>
                    <div class="booking-details">
                        <strong>${slot.majlis?.majlis_name || 'مجلس'}</strong>
                        <small>${i18n.formatDate(slot.available_date)} - ${this.getTimeSlotText(slot.time_slot)}</small>
                    </div>
                    <div class="booking-amount">
                        <span class="badge badge-success">متاح</span>
                    </div>
                </div>
            `).join('');

        } catch (error) {
            console.error('Error loading upcoming slots:', error);
            container.innerHTML = '<p class="text-center text-muted">حدث خطأ في تحميل البيانات</p>';
        }
    }

    getTimeSlotText(slot) {
        const slots = {
            'morning': 'صباحاً (9-12)',
            'afternoon': 'ظهراً (2-5)',
            'evening': 'مساءً (7-10)',
            'night': 'ليلاً (10-1)'
        };
        return slots[slot] || slot;
    }

    async loadRecentTransactions() {
        const container = document.getElementById('transactions-list');
        if (!container) return;

        try {
            if (!this.walletData || !this.walletData.id) {
                container.innerHTML = '<p class="text-center text-muted">لا توجد معاملات بعد</p>';
                return;
            }

            const { data, error } = await karamDB.select('wallet_transactions', {
                eq: { wallet_id: this.walletData.id },
                order: { column: 'created_at', ascending: false },
                limit: 5
            });

            if (error) throw error;

            this.renderTransactions(data || []);

        } catch (error) {
            console.error('Error loading transactions:', error);
            container.innerHTML = '<p class="text-center text-muted">لا توجد معاملات</p>';
        }
    }

    renderTransactions(transactions) {
        const container = document.getElementById('transactions-list');
        if (!container) return;

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
