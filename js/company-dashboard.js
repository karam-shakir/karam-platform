// ===================================
// Company Dashboard JavaScript
// ===================================

let currentCompany = null;
let companyBookings = [];

// Load dashboard on page load
document.addEventListener('DOMContentLoaded', async () => {
    await checkAuth();
    if (currentCompany) {
        loadDashboardData();
    }
});

// Check authentication
async function checkAuth() {
    try {
        if (!window.supabaseClient) {
            window.location.href = 'login.html';
            return;
        }

        const { data: { user }, error } = await window.supabaseClient.auth.getUser();

        if (error || !user) {
            window.location.href = 'login.html';
            return;
        }

        // Get company profile
        const { data: company, error: companyError } = await window.supabaseClient
            .from('companies')
            .select('*')
            .eq('user_id', user.id)
            .single();

        if (companyError) {
            console.error('Error fetching company:', companyError);
            alert('خطأ في تحميل بيانات الشركة: ' + companyError.message);
            window.location.href = 'login.html';
            return;
        }

        if (!company) {
            alert('لم يتم العثور على ملف الشركة. يرجى التواصل مع الدعم.');
            window.location.href = 'login.html';
            return;
        }

        currentCompany = company;
        document.getElementById('company-name').textContent = company.company_name;

    } catch (error) {
        console.error('Auth error:', error);
        window.location.href = 'login.html';
    }
}

// Load dashboard data
async function loadDashboardData() {
    await loadBookings();
    updateStats();
    loadCompanySettings();
}

// Load bookings
async function loadBookings() {
    try {
        const { data, error } = await window.supabaseClient
            .from('bookings')
            .select(`
                *,
                majlis:majlis_id (
                    majlis_name,
                    package_type,
                    package_price,
                    base_price,
                    family:family_id (
                        family_name,
                        city
                    )
                )
            `)
            .eq('user_id', currentCompany.user_id)
            .order('booking_date', { ascending: false });

        if (error) {
            console.error('Error loading bookings:', error);
            throw error;
        }

        companyBookings = data || [];
        renderBookings(companyBookings);

    } catch (error) {
        console.error('Error loading bookings:', error);
        document.getElementById('bookings-list').innerHTML = `
            <div class="empty-state">
                <p>حدث خطأ في تحميل الحجوزات</p>
                <p class="text-muted">${error.message}</p>
            </div>
        `;
    }
}

// Render bookings
function renderBookings(bookings) {
    const container = document.getElementById('bookings-list');

    if (bookings.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <p>لا توجد حجوزات جماعية بعد</p>
                <button class="btn btn-primary" onclick="newGroupBooking()">إنشاء حجز جماعي</button>
            </div>
        `;
        return;
    }

    container.innerHTML = bookings.map(booking => {
        const city = booking.majlis?.family?.city || '';
        const cityName = city === 'mecca' ? 'مكة المكرمة' : city === 'medina' ? 'المدينة المنورة' : city || '-';
        const statusClass = getStatusClass(booking.booking_status);
        const statusText = getStatusText(booking.booking_status);
        const bookingDate = new Date(booking.booking_date).toLocaleDateString('ar-SA');
        const packageType = booking.majlis?.package_type;
        const packageBadge = packageType ? `<span class="badge ${packageType === 'premium' ? 'badge-premium' : 'badge-basic'}">${packageType === 'premium' ? '⭐ متميزة' : '🎁 أساسية'}</span>` : '';
        const price = booking.majlis?.package_price || booking.majlis?.base_price || 0;
        const discount = currentCompany.discount_rate || 0;
        const finalPrice = price * (1 - discount / 100);

        return `
            <div class="booking-card">
                <div class="booking-header">
                    <div>
                        <h3>${booking.majlis?.majlis_name || 'مجلس'}</h3>
                        <p class="text-muted">📍 ${cityName} - ${booking.majlis?.family?.family_name || ''}</p>
                        ${packageBadge}
                    </div>
                    <span class="status-badge ${statusClass}">${statusText}</span>
                </div>
                <div class="booking-details">
                    <div class="detail-item">
                        <span class="label">التاريخ:</span>
                        <span>${bookingDate}</span>
                    </div>
                    <div class="detail-item">
                        <span class="label">الفترة:</span>
                        <span>${formatTimeSlot(booking.time_slot)}</span>
                    </div>
                    <div class="detail-item">
                        <span class="label">عدد الضيوف:</span>
                        <span>${booking.guests_count}</span>
                    </div>
                    <div class="detail-item">
                        <span class="label">سعر الشخص:</span>
                        <span>${price.toFixed(2)} ر.س</span>
                    </div>
                    <div class="detail-item">
                        <span class="label">بعد الخصم (${discount}%):</span>
                        <span class="price">${finalPrice.toFixed(2)} ر.س</span>
                    </div>
                    <div class="detail-item">
                        <span class="label">المبلغ الإجمالي:</span>
                        <span class="price-total">${booking.total_price.toFixed(2)} ر.س</span>
                    </div>
                </div>
                <div class="booking-actions">
                    <a href="#" class="btn btn-text btn-sm">عرض التفاصيل</a>
                    ${booking.booking_status === 'confirmed' ?
                `<button class="btn btn-secondary btn-sm" onclick="downloadInvoice('${booking.id}')">تحميل الفاتورة</button>` : ''}
                </div>
            </div>
        `;
    }).join('');
}

// Get status functions (reused from visitor dashboard)
function getStatusClass(status) {
    const classes = {
        pending: 'status-pending',
        confirmed: 'status-confirmed',
        completed: 'status-completed',
        cancelled: 'status-cancelled'
    };
    return classes[status] || '';
}

function getStatusText(status) {
    const texts = {
        pending: 'قيد الانتظار',
        confirmed: 'مؤكد',
        completed: 'مكتمل',
        cancelled: 'ملغي'
    };
    return texts[status] || status;
}

// Update stats
function updateStats() {
    const totalBookings = companyBookings.length;
    const totalVisitors = companyBookings.reduce((sum, b) => sum + (b.guests_count || 0), 0);
    const totalAmount = companyBookings
        .filter(b => b.booking_status !== 'cancelled')
        .reduce((sum, b) => sum + parseFloat(b.total_price || 0), 0);

    document.getElementById('total-bookings').textContent = totalBookings;
    document.getElementById('total-visitors').textContent = totalVisitors;
    document.getElementById('total-amount').textContent = `${totalAmount.toFixed(2)} ر.س`;
    document.getElementById('discount-rate').textContent = `${currentCompany.discount_rate || 15}%`;
}

// Format time slot
function formatTimeSlot(slot) {
    const slots = {
        morning: 'صباحي (8ص5-12ظ)',
        afternoon: 'مسائي (12ظ-5ع)',
        evening: 'ليلي (5ع-12ص)'
    };
    return slots[slot] || slot;
}

// Load company settings
function loadCompanySettings() {
    if (!currentCompany) return;

    document.getElementById('company-name-input').value = currentCompany.company_name || '';
    document.getElementById('commercial-registration').value = currentCompany.commercial_registration || '';
    document.getElementById('company-type').value = currentCompany.company_type || '';
    document.getElementById('company-address').value = currentCompany.address || '';
    document.getElementById('company-website').value = currentCompany.website || '';
}

// Update company info
async function updateCompanyInfo(event) {
    event.preventDefault();

    try {
        const formData = {
            company_name: document.getElementById('company-name-input').value,
            address: document.getElementById('company-address').value,
            website: document.getElementById('company-website').value
        };

        const { error } = await window.supabaseClient
            .from('companies')
            .update(formData)
            .eq('id', currentCompany.id);

        if (error) throw error;

        showToast('نجح', 'تم تحديث معلومات الشركة بنجاح', 'success');
        currentCompany = { ...currentCompany, ...formData };
        document.getElementById('company-name').textContent = formData.company_name;

    } catch (error) {
        console.error('Error updating company:', error);
        showToast('خطأ', 'حدث خطأ في تحديث المعلومات', 'error');
    }
}

// New group booking
function newGroupBooking() {
    window.location.href = 'browse-families-calendar.html';
}

// Add employee
function addEmployee() {
    showToast('قريباً', 'ميزة إدارة الموظفين قيد التطوير', 'info');
}

// Download invoice
async function downloadInvoice(bookingId) {
    showToast('قريباً', 'سيتم إضافة ميزة تحميل الفواتير قريباً', 'info');
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
        await window.supabaseClient.auth.signOut();
        window.location.href = 'index.html';
    } catch (error) {
        console.error('Logout error:', error);
    }
}

// Show toast
function showToast(title, message, type = 'info') {
    if (window.Karam && window.Karam.Utils) {
        window.Karam.Utils.showToast(title, message, type);
    } else {
        alert(`${title}: ${message}`);
    }
}
