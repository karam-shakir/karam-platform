// ============================================
// Operator Dashboard - Main JavaScript
// ============================================

class OperatorDashboard {
    constructor() {
        this.stats = {};
        this.charts = {};
        this.init();
    }

    async init() {
        // Check authentication
        if (!karamAuth.requireAuth(['operator'])) {
            return;
        }

        // Load dashboard data
        await this.loadStats();
        await this.loadRecentBookings();
        await this.loadTopFamilies();
        await this.initCharts();
    }

    // ============================================
    // Load Statistics
    // ============================================

    async loadStats() {
        try {
            // Get overall stats from view
            const { data: stats, error } = await karamDB.select('operator_dashboard_stats', {
                single: true
            });

            if (error) throw error;

            this.stats = stats;
            this.updateStatsUI();

        } catch (error) {
            console.error('Error loading stats:', error);
        }
    }

    updateStatsUI() {
        document.getElementById('total-families').textContent =
            this.stats.total_families || 0;

        document.getElementById('pending-families').textContent =
            this.stats.pending_families || 0;

        document.getElementById('total-bookings').textContent =
            this.stats.total_bookings || 0;

        // Get platform wallet balance
        this.loadPlatformBalance();
    }

    async loadPlatformBalance() {
        try {
            const { data, error } = await karamDB.select('platform_wallet', {
                eq: { id: '00000000-0000-0000-0000-000000000001' },
                single: true
            });

            if (error) throw error;

            document.getElementById('platform-balance').textContent =
                i18n.formatCurrency(data.balance);

        } catch (error) {
            console.error('Error loading platform balance:', error);
        }
    }

    // ============================================
    // Load Recent Bookings
    // ============================================

    async loadRecentBookings() {
        try {
            const { data, error } = await karamDB.select('bookings', {
                select: `
                    id,
                    booking_number,
                    booking_date,
                    total_amount,
                    booking_status,
                    majlis!inner(
                        families!inner(family_name)
                    )
                `,
                order: { column: 'created_at', ascending: false },
                limit: 5
            });

            if (error) throw error;

            this.renderRecentBookings(data);

        } catch (error) {
            console.error('Error loading recent bookings:', error);
        }
    }

    renderRecentBookings(bookings) {
        const tbody = document.querySelector('#recent-bookings-table tbody');

        if (!bookings || bookings.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" class="text-center">لا توجد حجوزات</td></tr>';
            return;
        }

        tbody.innerHTML = bookings.map(booking => `
            <tr>
                <td>${booking.booking_number}</td>
                <td>${booking.majlis.families.family_name}</td>
                <td>${i18n.formatDate(booking.booking_date)}</td>
                <td>${i18n.formatCurrency(booking.total_amount)}</td>
                <td>
                    <span class="badge badge-${this.getStatusClass(booking.booking_status)}">
                        ${this.getStatusText(booking.booking_status)}
                    </span>
                </td>
            </tr>
        `).join('');
    }

    getStatusClass(status) {
        const classes = {
            'pending': 'warning',
            'confirmed': 'success',
            'completed': 'info',
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

    // ============================================
    // Load Top Families
    // ============================================

    async loadTopFamilies() {
        try {
            const { data, error } = await karamDB.rpc('get_top_families', {
                limit_count: 5
            });

            if (error) throw error;

            this.renderTopFamilies(data);

        } catch (error) {
            console.error('Error loading top families:', error);
        }
    }

    renderTopFamilies(families) {
        const tbody = document.querySelector('#top-families-table tbody');

        if (!families || families.length === 0) {
            tbody.innerHTML = '<tr><td colspan="3" class="text-center">لا توجد بيانات</td></tr>';
            return;
        }

        tbody.innerHTML = families.map(family => `
            <tr>
                <td>${family.family_name}</td>
                <td>${family.booking_count}</td>
                <td>${i18n.formatCurrency(family.total_revenue)}</td>
            </tr>
        `).join('');
    }

    // ============================================
    // Initialize Charts
    // ============================================

    async initCharts() {
        await this.initBookingsChart();
        await this.initRevenueChart();
    }

    async initBookingsChart() {
        try {
            const { data, error } = await karamDB.select('monthly_booking_trends', {
                order: { column: 'month', ascending: true },
                limit: 6
            });

            if (error) throw error;

            const ctx = document.getElementById('bookings-chart').getContext('2d');

            this.charts.bookings = new Chart(ctx, {
                type: 'line',
                data: {
                    labels: data.map(d => {
                        const date = new Date(d.month);
                        return i18n.formatDate(date, { month: 'short', year: 'numeric' });
                    }),
                    datasets: [{
                        label: 'الحجوزات',
                        data: data.map(d => d.booking_count),
                        borderColor: 'rgb(75, 192, 192)',
                        backgroundColor: 'rgba(75, 192, 192, 0.2)',
                        tension: 0.4
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            display: false
                        }
                    }
                }
            });

        } catch (error) {
            console.error('Error initializing bookings chart:', error);
        }
    }

    async initRevenueChart() {
        try {
            const { data, error } = await karamDB.select('city_performance', {});

            if (error) throw error;

            const ctx = document.getElementById('revenue-chart').getContext('2d');

            this.charts.revenue = new Chart(ctx, {
                type: 'doughnut',
                data: {
                    labels: data.map(d => d.city === 'mecca' ? 'مكة' : 'المدينة'),
                    datasets: [{
                        data: data.map(d => d.total_revenue),
                        backgroundColor: [
                            'rgba(255, 99, 132, 0.8)',
                            'rgba(54, 162, 235, 0.8)'
                        ]
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false
                }
            });

        } catch (error) {
            console.error('Error initializing revenue chart:', error);
        }
    }
}

// Initialize dashboard
const dashboard = new OperatorDashboard();
