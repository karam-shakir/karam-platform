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
    document.getElementById('commercial-registration').value = currentCompany.registration_number || '';
    document.getElementById('company-city').value = currentCompany.city || '';
    document.getElementById('company-address').value = currentCompany.office_address || '';
    document.getElementById('company-phone').value = currentCompany.responsible_person_phone || '';
}

async function updateCompanyInfo(event) {
    event.preventDefault();

    try {
        const formData = {
            company_name: document.getElementById('company-name-input').value,
            city: document.getElementById('company-city').value,
            address: document.getElementById('company-address').value,
            phone: document.getElementById('company-phone').value
        };

        const { error } = await window.supabaseClient
            .from('companies')
            .update({
                company_name: formData.company_name,
                city: formData.city,
                office_address: formData.address,
                responsible_person_phone: formData.phone
            })
            .eq('id', currentCompany.id);

        if (error) throw error;

        showToast('نجح', 'تم تحديث معلومات الشركة بنجاح', 'success');
        currentCompany = { ...currentCompany, ...formData };
        document.getElementById('company-name').textContent = formData.company_name;

    } catch (error) {
        console.error('Error updating company:', error);
        showToast('خطأ', 'حدث خطأ في إنشاء الحجز', 'error');
    }
}


// Custom prompt helper function
function customPrompt(title, message, type = 'text', options = []) {
    return new Promise((resolve) => {
        const overlay = document.getElementById('custom-prompt-overlay');
        const titleEl = document.getElementById('prompt-title');
        const messageEl = document.getElementById('prompt-message');
        const inputEl = document.getElementById('prompt-input');
        const selectEl = document.getElementById('prompt-select');
        const confirmBtn = document.getElementById('prompt-confirm');
        const cancelBtn = document.getElementById('prompt-cancel');

        titleEl.textContent = title;
        messageEl.textContent = message;

        // Reset
        inputEl.style.display = 'none';
        selectEl.style.display = 'none';
        inputEl.value = '';
        selectEl.innerHTML = '<option value="">اختر...</option>';

        if (type === 'select') {
            selectEl.style.display = 'block';
            options.forEach(opt => {
                const option = document.createElement('option');
                option.value = opt.value;
                option.textContent = opt.label;
                selectEl.appendChild(option);
            });
        } else {
            inputEl.style.display = 'block';
            inputEl.type = type;
        }

        overlay.classList.add('active');

        // Focus input
        setTimeout(() => {
            if (type === 'select') {
                selectEl.focus();
            } else {
                inputEl.focus();
            }
        }, 100);

        const confirm = () => {
            const value = type === 'select' ? selectEl.value : inputEl.value;
            overlay.classList.remove('active');
            resolve(value || null);
            cleanup();
        };

        const cancel = () => {
            overlay.classList.remove('active');
            resolve(null);
            cleanup();
        };

        const cleanup = () => {
            confirmBtn.removeEventListener('click', confirm);
            cancelBtn.removeEventListener('click', cancel);
            inputEl.removeEventListener('keypress', handleEnter);
        };

        const handleEnter = (e) => {
            if (e.key === 'Enter') confirm();
        };

        confirmBtn.addEventListener('click', confirm);
        cancelBtn.addEventListener('click', cancel);
        inputEl.addEventListener('keypress', handleEnter);
    });
}

// Prompt for date when booking from view-all mode
async function promptDateForBooking(majlisId, guestsCount) {
    try {
        // Step 1: Get date
        const date = await customPrompt(
            '📅 تحديد تاريخ الحجز',
            'أدخل تاريخ الحجز (مثال: 2026-01-15)\nاستخدم صيغة: YYYY-MM-DD',
            'date'
        );

        if (!date) return; // User cancelled

        // Validate date format
        if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
            showToast('خطأ', 'صيغة التاريخ غير صحيحة\nالرجاء استخدام: YYYY-MM-DD', 'error');
            return;
        }

        // Check if date is in the future
        const selectedDate = new Date(date);
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        if (selectedDate < today) {
            showToast('خطأ', 'لا يمكن الحجز في تاريخ ماضي', 'error');
            return;
        }

        // Step 2: Get time slot
        const timeSlot = await customPrompt(
            '⏰ اختيار الفترة',
            'اختر الفترة المناسبة للحجز:',
            'select',
            [
                { value: 'morning', label: 'صباحي (8ص-12ظ)' },
                { value: 'afternoon', label: 'مسائي (12ظ-5ع)' },
                { value: 'evening', label: 'ليلي (5ع-12ص)' }
            ]
        );

        if (!timeSlot) return; // User cancelled

        // Proceed with booking
        createGroupBooking(majlisId, guestsCount, date, timeSlot);

    } catch (error) {
        console.error('Prompt error:', error);
        showToast('خطأ', 'حدث خطأ في عملية الحجز', 'error');
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

// Switch section
function switchTab(sectionName, event) {
    if (event) event.preventDefault();

    // Hide all sections
    const sections = ['bookings', 'invoices', 'settings'];
    sections.forEach(sec => {
        const element = document.getElementById(`${sec}-section`);
        if (element) {
            element.className = 'section-hidden';
        }
    });

    // Show selected section
    const targetSection = document.getElementById(`${sectionName}-section`);
    if (targetSection) {
        targetSection.className = 'section-active';
    }
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

// =======================
// NEW BOOKING FUNCTIONS
// =======================

// Search for available majalis
async function searchAvailableMajalis() {
    try {
        const viewAll = document.getElementById('view-all-majalis').checked;
        const searchDate = document.getElementById('search-date').value;
        const searchTime = document.getElementById('search-time').value;
        const searchCity = document.getElementById('search-city').value;
        const searchGuests = parseInt(document.getElementById('search-guests').value) || 1;

        // If not viewing all, require date
        if (!viewAll && !searchDate) {
            showToast('تنبيه', 'يرجى اختيار التاريخ أو تفعيل خيار "عرض الكل"', 'warning');
            return;
        }

        // Show loading
        document.getElementById('search-results').innerHTML = '<p class="text-center text-muted">جاري البحث...</p>';

        // Build query - simplified version
        let query = window.supabaseClient
            .from('majlis')
            .select(`
                *,
                family:family_id (
                    family_name,
                    city
                )
            `)
            .eq('is_active', true);

        // Apply city filter
        if (searchCity) {
            // Will need to filter after fetch due to nested relation
        }

        const { data, error } = await query;

        if (error) {
            console.error('Search error:', error);
            showToast('خطأ', 'حدث خطأ في البحث', 'error');
            return;
        }

        // Filter by city if specified
        let filteredData = data || [];
        if (searchCity) {
            filteredData = filteredData.filter(m => m.family?.city === searchCity);
        }

        // Display results
        if (viewAll) {
            // Show all majalis without date/time filtering
            renderMajalisResults(filteredData, searchGuests, null, null);
        } else {
            // Show with specific date/time
            renderMajalisResults(filteredData, searchGuests, searchDate, searchTime);
        }

    } catch (error) {
        console.error('Search error:', error);
        showToast('خطأ', 'حدث خطأ في البحث', 'error');
    }
}

// Render search results
function renderMajalisResults(majalis, guestsCount, bookingDate, timeSlot) {
    const container = document.getElementById('search-results');

    if (majalis.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; padding: 40px;">
                <p style="font-size: 18px; color: #666;">😔 لا توجد مجالس متاحة</p>
                <p style="color: #999;">جرّب تغيير معايير البحث</p>
            </div>
        `;
        return;
    }

    const discount = currentCompany.discount_rate || 0;

    container.innerHTML = `
        <h4 style="margin-bottom: 20px;">✅ تم العثور على ${majalis.length} مجلس متاح</h4>
        <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 20px;">
            ${majalis.map(majlis => {
        const cityName = majlis.family?.city === 'mecca' ? 'مكة المكرمة' :
            majlis.family?.city === 'medina' ? 'المدينة المنورة' :
                majlis.family?.city || '';

        const packageBadge = majlis.package_type === 'premium' ?
            '<span style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 4px 12px; border-radius: 20px; font-size: 12px; display: inline-block; margin-bottom: 8px;">⭐ باقة متميزة</span>' :
            '<span style="background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); color: white; padding: 4px 12px; border-radius: 20px; font-size: 12px; display: inline-block; margin-bottom: 8px;">🎁 باقة أساسية</span>';

        const price = majlis.package_price || majlis.base_price || 0;
        const discountedPrice = price * (1 - discount / 100);
        const totalPrice = discountedPrice * guestsCount;

        return `
                    <div style="border: 1px solid #e0e0e0; border-radius: 12px; padding: 20px; background: white; box-shadow: 0 2px 8px rgba(0,0,0,0.05);">
                        ${packageBadge}
                        <h3 style="margin: 0 0 8px 0; color: #1a4d8f;">${majlis.majlis_name}</h3>
                        <p style="margin: 0 0 4px 0; color: #666; font-size: 14px;">🏠 ${majlis.family?.family_name || ''}</p>
                        <p style="margin: 0 0 12px 0; color: #999; font-size: 14px;">📍 ${cityName}</p>
                        
                        <div style="background: #f8f9fa; padding: 12px; border-radius: 8px; margin-bottom: 12px;">
                            <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
                                <span style="color: #666;">السعر للشخص:</span>
                                <span style="font-weight: 600;">${price.toFixed(2)} ر.س</span>
                            </div>
                            ${discount > 0 ? `
                            <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
                                <span style="color: #666;">بعد الخصم (${discount}%):</span>
                                <span style="font-weight: 600; color: #e74c3c;">${discountedPrice.toFixed(2)} ر.س</span>
                            </div>
                            ` : ''}
                            <div style="display: flex; justify-content: space-between; margin-top: 8px; padding-top: 8px; border-top: 1px solid #ddd;">
                                <span style="color: #333; font-weight: 600;">المبلغ الإجمالي:</span>
                                <span style="font-weight: 700; color: #1a4d8f; font-size: 16px;">${totalPrice.toFixed(2)} ر.س</span>
                            </div>
                        </div>

                        <button onclick="${bookingDate ? `createGroupBooking('${majlis.id}', ${guestsCount}, '${bookingDate}', '${timeSlot}')` : `promptDateForBooking('${majlis.id}', ${guestsCount})`}" style="width: 100%; padding: 10px; background: #1a4d8f; color: white; border: none; border-radius: 6px; font-weight: 600; cursor: pointer;">
                            ✅ ${bookingDate ? 'حجز الآن' : 'تحديد تاريخ وحجز'}
                        </button>
                    </div>
                `;
    }).join('')}
        </div>
    `;
}

// Create group booking
async function createGroupBooking(majlisId, guestsCount, bookingDate, timeSlot) {
    try {
        // Confirm booking
        const confirmMsg = `هل أنت متأكد من إتمام الحجز؟\n\nعدد الضيوف: ${guestsCount}\nالتاريخ: ${bookingDate}\nالفترة: ${formatTimeSlot(timeSlot || 'morning')}`;

        if (!confirm(confirmMsg)) {
            return;
        }

        // Get majlis info for pricing
        const { data: majlis, error: majlisError } = await window.supabaseClient
            .from('majlis')
            .select('package_price, base_price')
            .eq('id', majlisId)
            .single();

        if (majlisError) {
            showToast('خطأ', 'حدث خطأ في جلب بيانات المجلس', 'error');
            return;
        }

        const price = majlis?.package_price || majlis?.base_price || 0;
        const discount = currentCompany.discount_rate || 0;
        const finalPrice = price * (1 - discount / 100) * guestsCount;

        // Create booking
        const { data: booking, error: bookingError } = await window.supabaseClient
            .from('bookings')
            .insert({
                user_id: currentCompany.user_id,
                majlis_id: majlisId,
                booking_date: bookingDate,
                time_slot: timeSlot || 'morning',
                guests_count: guestsCount,
                total_price: finalPrice,
                booking_status: 'pending',
                payment_status: 'pending'
            })
            .select()
            .single();

        if (bookingError) {
            console.error('Booking error:', bookingError);
            showToast('خطأ', 'حدث خطأ في إنشاء الحجز: ' + bookingError.message, 'error');
            return;
        }

        showToast('نجح!', 'تم إنشاء الحجز بنجاح', 'success');

        // Reload bookings and switch to bookings tab
        await loadBookings();
        switchTab('bookings');

    } catch (error) {
        console.error('Booking error:', error);
        showToast('خطأ', 'حدث خطأ في إنشاء الحجز', 'error');
    }
}
