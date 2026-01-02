// ============================================
// Visitor Bookings - Simple Version
// ============================================

document.addEventListener('DOMContentLoaded', async () => {
    console.log('📋 Visitor Bookings Page');

    // Check auth
    const { data: { user }, error } = await window.supabaseClient.auth.getUser();

    if (error || !user) {
        alert('يجب تسجيل الدخول أولاً');
        window.location.href = 'login.html?redirect=/visitor-bookings.html';
        return;
    }

    console.log('User:', user.email);
    loadBookings(user.id);
});

async function loadBookings(userId) {
    try {
        const { data, error } = await window.supabaseClient
            .from('bookings')
            .select(`
                *,
                majlis:majlis_id (
                    majlis_name,
                    package_type,
                    package_price,
                    base_price
                )
            `)
            .eq('user_id', userId)
            .order('booking_date', { ascending: false });

        if (error) throw error;

        console.log('Bookings loaded:', data?.length || 0);

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const all = data || [];
        window.allBookings = all; // Store globally for filtering

        const upcoming = all.filter(b => new Date(b.booking_date) >= today && b.booking_status !== 'cancelled');
        const past = all.filter(b => new Date(b.booking_date) < today);

        document.getElementById('all-count').textContent = all.length;
        document.getElementById('upcoming-count').textContent = upcoming.length;
        document.getElementById('past-count').textContent = past.length;

        renderBookings(all);

    } catch (error) {
        console.error('Error:', error);
        document.getElementById('bookings-list').innerHTML = '<p class="text-center">حدث خطأ في تحميل الحجوزات</p>';
    }
}

function renderBookings(bookings) {
    const container = document.getElementById('bookings-list');

    if (!bookings || bookings.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">📅</div>
                <p>لا توجد حجوزات بعد</p>
                <a href="browse-families-calendar.html" class="btn btn-primary">ابدأ الحجز الآن</a>
            </div>
        `;
        return;
    }

    container.innerHTML = bookings.map(b => {
        // Get package badge if available
        const packageBadge = b.majlis?.package_type ?
            `<span class="badge ${b.majlis.package_type === 'premium' ? 'badge-premium' : 'badge-basic'}">
                ${b.majlis.package_type === 'premium' ? '⭐ باقة متميزة' : '🎁 باقة أساسية'}
            </span>` : '';

        return `
        <div class="booking-card">
            <div class="booking-header">
                <div>
                    <h4 class="booking-majlis-name">${b.majlis?.majlis_name || 'مجلس'}</h4>
                    ${packageBadge}
                </div>
                <span class="status-badge status-${b.booking_status}">
                    ${getStatusText(b.booking_status)}
                </span>
            </div>
            <div class="booking-details">
                <div class="detail-item">
                    <div class="detail-label">📅 التاريخ</div>
                    <div class="detail-value">${formatDate(b.booking_date)}</div>
                </div>
                <div class="detail-item">
                    <div class="detail-label">⏰ الوقت</div>
                    <div class="detail-value">${formatTimeSlot(b.time_slot)}</div>
                </div>
                <div class="detail-item">
                    <div class="detail-label">👥 الضيوف</div>
                    <div class="detail-value">${b.guests_count} ضيف</div>
                </div>
            </div>
            <div class="booking-footer">
                <div class="booking-price">
                    ${b.total_price.toFixed(2)} ر.س
                </div>
                <div class="payment-status ${b.payment_status === 'paid' ? 'status-paid' : 'status-pending'}">
                    ${b.payment_status === 'paid' ? '✅ مدفوع' : '⏳ بانتظار الدفع'}
                </div>
            </div>
        </div>
    `;
    }).join('');
}

function formatDate(dateStr) {
    const date = new Date(dateStr);
    return date.toLocaleDateString('ar-SA', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
}

function formatTimeSlot(slot) {
    const slots = {
        morning: 'صباحي',
        afternoon: 'مسائي',
        evening: 'ليلي'
    };
    return slots[slot] || slot;
}

function getStatusText(status) {
    const statuses = {
        pending: 'بانتظار التأكيد',
        confirmed: 'مؤكد',
        cancelled: 'ملغي',
        completed: 'مكتمل'
    };
    return statuses[status] || status;
}

// Filter function
function filterBookings(filter) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let filtered = window.allBookings || [];

    if (filter === 'upcoming') {
        filtered = filtered.filter(b => new Date(b.booking_date) >= today && b.booking_status !== 'cancelled');
    } else if (filter === 'past') {
        filtered = filtered.filter(b => new Date(b.booking_date) < today);
    }

    // Update active tab
    document.querySelectorAll('.tab').forEach(t => {
        t.style.background = 'white';
        t.style.color = 'var(--color-primary)';
    });
    event.target.style.background = 'var(--color-primary)';
    event.target.style.color = 'white';

    renderBookings(filtered);
}

const visitorBookings = { init: () => { } };
