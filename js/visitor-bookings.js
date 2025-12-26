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
                    city
                )
            `)
            .eq('user_id', userId)
            .order('booking_date', { ascending: false });

        if (error) throw error;

        console.log('Bookings loaded:', data?.length || 0);

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const all = data || [];
        const upcoming = all.filter(b => new Date(b.booking_date) >= today && b.booking_status !== 'cancelled');
        const completed = all.filter(b => new Date(b.booking_date) < today || b.booking_status === 'completed');
        const cancelled = all.filter(b => b.booking_status === 'cancelled');

        document.getElementById('all-count').textContent = all.length;
        document.getElementById('upcoming-count').textContent = upcoming.length;
        document.getElementById('completed-count').textContent = completed.length;
        document.getElementById('cancelled-count').textContent = cancelled.length;

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
            <div class="empty-state" style="text-align:center;padding:60px 20px;color:#999;">
                <div style="font-size:4em;margin-bottom:20px;">📅</div>
                <p>لا توجد حجوزات بعد</p>
                <a href="browse-families-calendar.html" class="btn-primary" style="display:inline-block;margin-top:20px;padding:12px 30px;background:var(--color-primary);color:white;border-radius:8px;text-decoration:none;">ابدأ الحجز الآن</a>
            </div>
        `;
        return;
    }

    container.innerHTML = bookings.map(b => `
        <div class="booking-item" style="background:white;border-radius:12px;padding:20px;margin-bottom:15px;box-shadow:0 2px 10px rgba(0,0,0,0.1);">
            <div style="display:flex;justify-content:space-between;align-items:start;margin-bottom:15px;">
                <div>
                    <h4 style="color:var(--color-primary);margin:0 0 5px 0;">${b.majlis?.majlis_name || 'مجلس'}</h4>
                    <div style="color:#666;font-size:0.9em;">
                        📍 ${b.majlis?.city || 'غير محدد'}
                    </div>
                </div>
                <div class="status-badge" style="padding:5px 12px;border-radius:20px;font-size:0.85em;font-weight:bold;${getStatusStyle(b.booking_status)}">
                    ${getStatusText(b.booking_status)}
                </div>
            </div>
            <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px;padding:10px 0;border-top:1px solid #eee;">
                <div style="font-size:0.9em;">
                    <div style="color:#666;">📅 التاريخ</div>
                    <div style="font-weight:bold;">${formatDate(b.booking_date)}</div>
                </div>
                <div style="font-size:0.9em;">
                    <div style="color:#666;">⏰ الوقت</div>
                    <div style="font-weight:bold;">${formatTimeSlot(b.time_slot)}</div>
                </div>
                <div style="font-size:0.9em;">
                    <div style="color:#666;">👥 الضيوف</div>
                    <div style="font-weight:bold;">${b.guests_count} ضيف</div>
                </div>
            </div>
            <div style="display:flex;justify-content:space-between;align-items:center;margin-top:15px;padding-top:15px;border-top:1px solid #eee;">
                <div style="font-size:1.2em;font-weight:bold;color:var(--color-primary);">
                    ${b.total_price.toFixed(2)} ر.س
                </div>
                <div style="font-size:0.85em;color:${b.payment_status === 'paid' ? '#28a745' : '#ffc107'};">
                    ${b.payment_status === 'paid' ? '✅ مدفوع' : '⏳ بانتظار الدفع'}
                </div>
            </div>
        </div>
    `).join('');
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

function getStatusStyle(status) {
    const styles = {
        confirmed: 'background:#d4edda;color:#155724;',
        pending: 'background:#fff3cd;color:#856404;',
        cancelled: 'background:#f8d7da;color:#721c24;',
        completed: 'background:#d1ecf1;color:#0c5460;'
    };
    return styles[status] || 'background:#e2e3e5;color:#383d41;';
}

const visitorBookings = { init: () => { } };

