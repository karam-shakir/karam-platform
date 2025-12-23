// ===================================
// Visitor Dashboard JavaScript
// ===================================

let currentUser = null;
let allBookings = [];
let favorites = [];
let notifications = [];

// Load dashboard data on page load
document.addEventListener('DOMContentLoaded', async () => {
    await checkAuth();
    if (currentUser) {
        loadDashboardData();
    }
});

// Check authentication
async function checkAuth() {
    try {
        // Use simple localStorage check instead of Supabase for now
        const userData = localStorage.getItem('karam_user');
        if (!userData) {
            console.warn('No user data found, redirecting to login');
            window.location.href = 'login.html';
            return;
        }

        currentUser = JSON.parse(userData);
        document.getElementById('user-name').textContent = currentUser.user_metadata?.full_name || currentUser.email || 'المستخدم';
        console.log('✅ User logged in:', currentUser.email);

        /* Original Supabase auth check - disabled temporarily
        if (!supabase) {
            window.location.href = 'login.html';
            return;
        }

        const { data: { user }, error } = await supabase.auth.getUser();

        if (error || !user) {
            window.location.href = 'login.html';
            return;
        }

        // Get user profile
        const { data: profile } = await supabase
            .from('user_profiles')
            .select('*')
            .eq('id', user.id)
            .single();

        if (profile && profile.user_type !== 'visitor') {
            // Redirect to appropriate dashboard
            redirectByRole(profile.user_type);
            return;
        }

        currentUser = { ...user, ...profile };
        document.getElementById('user-name').textContent = profile?.full_name || 'المستخدم';
        */

    } catch (error) {
        console.error('Auth error:', error);
        // Don't redirect on error, just log it
        console.log('Auth check failed, but allowing access');
    }
}

// Redirect by role
function redirectByRole(role) {
    const redirects = {
        family: 'family-dashboard.html',
        company: 'company-dashboard.html',
        admin: 'operator-dashboard.html'
    };
    if (redirects[role]) {
        window.location.href = redirects[role];
    }
}

// Load all dashboard data
async function loadDashboardData() {
    await Promise.all([
        loadBookings(),
        loadFavorites(),
        loadNotifications(),
        loadProfile()
    ]);
    updateStats();
}

// Load bookings
async function loadBookings() {
    try {
        const { data, error } = await supabase
            .from('bookings')
            .select(`
                *,
                family:host_families(family_name, city),
                package:packages(name, price)
            `)
            .eq('visitor_id', currentUser.id)
            .order('booking_date', { ascending: false });

        if (error) throw error;

        allBookings = data || [];
        renderBookings(allBookings);

    } catch (error) {
        console.error('Error loading bookings:', error);
    }
}

// Render bookings
function renderBookings(bookings) {
    const container = document.getElementById('bookings-list');

    if (bookings.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <p>لا توجد حجوزات بعد</p>
                <a href="browse-families.html" class="btn btn-primary">ابدأ بالحجز الآن</a>
            </div>
        `;
        return;
    }

    container.innerHTML = bookings.map(booking => {
        const cityName = booking.family?.city === 'makkah' ? 'مكة المكرمة' : 'المدينة المنورة';
        const statusClass = getStatusClass(booking.status);
        const statusText = getStatusText(booking.status);
        const bookingDate = new Date(booking.booking_date).toLocaleDateString('ar-SA');

        return `
            <div class="booking-card">
                <div class="booking-header">
                    <div>
                        <h3>${booking.family?.family_name || 'أسرة'}</h3>
                        <p class="text-muted">📍 ${cityName}</p>
                    </div>
                    <span class="status-badge ${statusClass}">${statusText}</span>
                </div>
                <div class="booking-details">
                    <div class="detail-item">
                        <span class="label">الباقة:</span>
                        <span>${booking.package?.name || '-'}</span>
                    </div>
                    <div class="detail-item">
                        <span class="label">التاريخ:</span>
                        <span>${bookingDate}</span>
                    </div>
                    <div class="detail-item">
                        <span class="label">الوقت:</span>
                        <span>${booking.booking_time}</span>
                    </div>
                    <div class="detail-item">
                        <span class="label">المبلغ:</span>
                        <span class="price">${booking.final_price} ريال</span>
                    </div>
                </div>
                <div class="booking-actions">
                    ${booking.status === 'completed' && !hasReview(booking.id) ?
                `<button class="btn btn-secondary btn-sm" onclick="addReview('${booking.id}')">إضافة تقييم</button>` : ''}
                    ${booking.status === 'confirmed' ?
                `<button class="btn btn-danger btn-sm" onclick="cancelBooking('${booking.id}')">إلغاء الحجز</button>` : ''}
                    <a href="booking-details.html?id=${booking.id}" class="btn btn-text btn-sm">التفاصيل</a>
                </div>
            </div>
        `;
    }).join('');
}

// Filter bookings
function filterBookings(status) {
    // Update active filter button
    document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');

    let filtered = allBookings;
    if (status !== 'all') {
        filtered = allBookings.filter(b => {
            if (status === 'upcoming') return ['pending', 'confirmed'].includes(b.status);
            if (status === 'completed') return b.status === 'completed';
            if (status === 'cancelled') return b.status === 'cancelled';
            return true;
        });
    }
    renderBookings(filtered);
}

// Get status class
function getStatusClass(status) {
    const classes = {
        pending: 'status-pending',
        confirmed: 'status-confirmed',
        completed: 'status-completed',
        cancelled: 'status-cancelled'
    };
    return classes[status] || '';
}

// Get status text
function getStatusText(status) {
    const texts = {
        pending: 'قيد الانتظار',
        confirmed: 'مؤكد',
        completed: 'مكتمل',
        cancelled: 'ملغي',
        no_show: 'لم يحضر'
    };
    return texts[status] || status;
}

// Check if booking has review
function hasReview(bookingId) {
    // This should check the database
    return false;
}

// Load favorites
async function loadFavorites() {
    try {
        // TODO: Implement favorites table and logic
        favorites = [];
        renderFavorites();
    } catch (error) {
        console.error('Error loading favorites:', error);
    }
}

// Render favorites
function renderFavorites() {
    const container = document.getElementById('favorites-list');

    if (favorites.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <p>لا توجد مفضلات بعد</p>
                <a href="browse-families.html" class="btn btn-primary">تصفح الأسر</a>
            </div>
        `;
    }
}

// Load notifications
async function loadNotifications() {
    try {
        const { data, error } = await supabase
            .from('notifications')
            .select('*')
            .eq('user_id', currentUser.id)
            .order('created_at', { ascending: false })
            .limit(20);

        if (error) throw error;

        notifications = data || [];
        renderNotifications();
        updateNotificationCount();

    } catch (error) {
        console.error('Error loading notifications:', error);
    }
}

// Render notifications
function renderNotifications() {
    const container = document.getElementById('notifications-list');

    if (notifications.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <p>لا توجد إشعارات</p>
            </div>
        `;
        return;
    }

    container.innerHTML = notifications.map(notif => `
        <div class="notification-item ${notif.is_read ? '' : 'unread'}">
            <div class="notification-content">
                <h4>${notif.title}</h4>
                <p>${notif.message}</p>
                <span class="notification-time">${formatDate(notif.created_at)}</span>
            </div>
            ${!notif.is_read ?
            `<button class="mark-read-btn" onclick="markAsRead('${notif.id}')">✓</button>` : ''}
        </div>
    `).join('');
}

// Update notification count
function updateNotificationCount() {
    const unreadCount = notifications.filter(n => !n.is_read).length;
    const badge = document.getElementById('notification-count');
    if (unreadCount > 0) {
        badge.textContent = unreadCount;
        badge.style.display = 'inline';
    } else {
        badge.style.display = 'none';
    }
}

// Mark notification as read
async function markAsRead(notifId) {
    try {
        await supabase
            .from('notifications')
            .update({ is_read: true })
            .eq('id', notifId);

        await loadNotifications();
    } catch (error) {
        console.error('Error marking notification as read:', error);
    }
}

// Load profile
async function loadProfile() {
    if (!currentUser) return;

    document.getElementById('full-name').value = currentUser.full_name || '';
    document.getElementById('phone').value = currentUser.phone || '';
    document.getElementById('email').value = currentUser.email || '';
    document.getElementById('city').value = currentUser.city || '';
    document.getElementById('address').value = currentUser.address || '';
}

// Update profile
async function updateProfile(event) {
    event.preventDefault();

    try {
        const formData = {
            full_name: document.getElementById('full-name').value,
            phone: document.getElementById('phone').value,
            city: document.getElementById('city').value,
            address: document.getElementById('address').value
        };

        const { error } = await supabase
            .from('user_profiles')
            .update(formData)
            .eq('id', currentUser.id);

        if (error) throw error;

        showToast('نجح', 'تم تحديث الملف الشخصي بنجاح', 'success');
        currentUser = { ...currentUser, ...formData };

    } catch (error) {
        console.error('Error updating profile:', error);
        showToast('خطأ', 'حدث خطأ في تحديث الملف الشخصي', 'error');
    }
}

// Update stats
function updateStats() {
    const upcoming = allBookings.filter(b => ['pending', 'confirmed'].includes(b.status)).length;
    const completed = allBookings.filter(b => b.status === 'completed').length;
    const totalSpent = allBookings
        .filter(b => b.status !== 'cancelled')
        .reduce((sum, b) => sum + parseFloat(b.final_price || 0), 0);

    document.getElementById('upcoming-bookings').textContent = upcoming;
    document.getElementById('completed-bookings').textContent = completed;
    document.getElementById('favorites-count').textContent = favorites.length;
    document.getElementById('total-spent').textContent = `${totalSpent.toFixed(2)} ريال`;
}

// Switch tab
function switchTab(tabName, event) {
    event.preventDefault();

    // Update sidebar links
    document.querySelectorAll('.sidebar-link').forEach(link => link.classList.remove('active'));
    event.target.classList.add('active');

    // Update content
    document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
    document.getElementById(`${tabName}-tab`).classList.add('active');
}

// Logout
async function logout() {
    try {
        await supabase.auth.signOut();
        window.location.href = 'index.html';
    } catch (error) {
        console.error('Logout error:', error);
    }
}

// Format date
function formatDate(dateStr) {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now - date;

    // Less than 1 hour
    if (diff < 3600000) {
        const mins = Math.floor(diff / 60000);
        return `منذ ${mins} دقيقة`;
    }

    // Less than 24 hours
    if (diff < 86400000) {
        const hours = Math.floor(diff / 3600000);
        return `منذ ${hours} ساعة`;
    }

    return date.toLocaleDateString('ar-SA');
}

// Show toast (from main.js)
function showToast(title, message, type = 'info') {
    if (window.Karam && window.Karam.Utils) {
        window.Karam.Utils.showToast(title, message, type);
    } else {
        alert(`${title}: ${message}`);
    }
}
