/**
 * Family Dashboard - Karam Platform
 * إدارة لوحة التحكم للأسر المستضيفة
 */

// Global state
let currentFamilyId = null;
let weeklySchedule = {};

// Initialize Dashboard
document.addEventListener('DOMContentLoaded', async () => {
    // Check authentication
    const user = JSON.parse(localStorage.getItem('karam_user') || 'null');
    if (!user || user.user_type !== 'family') {
        window.location.href = 'login.html';
        return;
    }

    // Load family data
    await loadFamilyData();

    // Initialize calendar
    initializeDatePicker();

    // Load weekly schedule
    await loadWeeklySchedule();

    // Load bookings
    await loadBookings();

    // Load earnings
    await loadEarnings();
});

// Load Family Data
async function loadFamilyData() {
    try {
        const user = JSON.parse(localStorage.getItem('karam_user'));

        // Get family info from Supabase
        const { data, error } = await supabase
            .from('host_families')
            .select('*')
            .eq('user_id', user.id)
            .single();

        if (error) throw error;

        currentFamilyId = data.id;
        document.getElementById('family-name').textContent = data.family_name;

        // Update profile form
        if (document.getElementById('profile-name')) {
            document.getElementById('profile-name').value = data.family_name;
            document.getElementById('profile-description').value = data.description || '';
        }
    } catch (error) {
        console.error('Error loading family data:', error);
        showToast('خطأ', 'فشل تحميل بيانات الأسرة', 'error');
    }
}

// Initialize Date Picker
function initializeDatePicker() {
    if (typeof flatpickr === 'undefined') {
        console.warn('Flatpickr not loaded yet');
        return;
    }

    flatpickr('#specific-date-picker', {
        locale: 'ar',
        dateFormat: 'Y-m-d',
        minDate: 'today',
        maxDate: new Date().fp_incr(90) // 90 days ahead
    });
}

// Load Weekly Schedule
async function loadWeeklySchedule() {
    const days = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
    const timeSlots = [
        { id: 'morning', label: 'صباحاً (8-12)', time: '08:00-12:00' },
        { id: 'afternoon', label: 'ظهراً (12-4)', time: '12:00-16:00' },
        { id: 'evening', label: 'مساءً (4-8)', time: '16:00-20:00' },
        { id: 'night', label: 'ليلاً (8-12)', time: '20:00-00:00' }
    ];

    const scheduleGrid = document.getElementById('weekly-schedule');
    if (!scheduleGrid) return;

    scheduleGrid.innerHTML = '';

    try {
        // Load existing availability from Supabase
        const { data: availability, error } = await supabase
            .from('family_availability')
            .select('*')
            .eq('family_id', currentFamilyId)
            .is('specific_date', null); // Only weekly recurring

        if (error && error.code !== 'PGRST116') throw error;

        // Build schedule UI
        days.forEach((dayName, index) => {
            const dayDiv = document.createElement('div');
            dayDiv.className = 'schedule-day';
            dayDiv.innerHTML = `
                <div class="schedule-day-header">
                    <span class="day-name">${dayName}</span>
                    <label class="checkbox-label">
                        <input type="checkbox" class="day-toggle" data-day="${index}">
                        <span>نشط</span>
                    </label>
                </div>
                <div class="time-slots">
                    ${timeSlots.map(slot => `
                        <label class="checkbox-label">
                            <input type="checkbox" 
                                   data-day="${index}" 
                                   data-slot="${slot.id}" 
                                   data-time="${slot.time}"
                                   value="${slot.id}">
                            <span>${slot.label}</span>
                        </label>
                    `).join('')}
                </div>
                <div class="form-group mt-md">
                    <label>السعة:</label>
                    <input type="number" class="form-input form-input-sm" 
                           data-day="${index}" 
                           placeholder="10" min="1" max="50" value="10">
                </div>
            `;
            scheduleGrid.appendChild(dayDiv);

            // Load existing data for this day
            if (availability) {
                const dayAvailability = availability.filter(a => a.day_of_week === index);
                if (dayAvailability.length > 0) {
                    dayDiv.querySelector('.day-toggle').checked = true;
                    dayAvailability.forEach(avail => {
                        const timeRange = `${avail.start_time.substring(0, 5)}-${avail.end_time.substring(0, 5)}`;
                        const checkbox = dayDiv.querySelector(`[data-time="${timeRange}"]`);
                        if (checkbox) checkbox.checked = true;
                    });
                }
            }
        });

        // Add day toggle event listeners
        document.querySelectorAll('.day-toggle').forEach(toggle => {
            toggle.addEventListener('change', (e) => {
                const dayDiv = e.target.closest('.schedule-day');
                const slots = dayDiv.querySelectorAll('.time-slots input[type="checkbox"]');
                slots.forEach(slot => slot.disabled = !e.target.checked);
            });
        });

    } catch (error) {
        console.error('Error loading weekly schedule:', error);
        showToast('خطأ', 'فشل تحميل الجدول الأسبوعي', 'error');
    }
}

// Save Weekly Schedule
async function saveWeeklySchedule() {
    if (!currentFamilyId) {
        showToast('خطأ', 'لم يتم تحديد الأسرة', 'error');
        return;
    }

    showLoading();

    try {
        // Delete existing weekly schedule
        await supabase
            .from('family_availability')
            .delete()
            .eq('family_id', currentFamilyId)
            .is('specific_date', null);

        // Get all checked slots
        const days = document.querySelectorAll('.schedule-day');
        const availabilityRecords = [];

        days.forEach((dayDiv, dayIndex) => {
            const dayToggle = dayDiv.querySelector('.day-toggle');
            if (!dayToggle.checked) return;

            const slots = dayDiv.querySelectorAll('.time-slots input[type="checkbox"]:checked');
            const capacity = parseInt(dayDiv.querySelector('input[type="number"]').value) || 10;

            slots.forEach(slot => {
                const [start, end] = slot.dataset.time.split('-');
                availabilityRecords.push({
                    family_id: currentFamilyId,
                    day_of_week: dayIndex,
                    start_time: start,
                    end_time: end,
                    max_capacity: capacity,
                    is_available: true
                });
            });
        });

        if (availabilityRecords.length === 0) {
            showToast('تحذير', 'لم تحدد أي أوقات متاحة', 'warning');
            hideLoading();
            return;
        }

        // Insert new availability
        const { error } = await supabase
            .from('family_availability')
            .insert(availabilityRecords);

        if (error) throw error;

        hideLoading();
        showToast('نجح', `تم حفظ ${availabilityRecords.length} فترة زمنية بنجاح`, 'success');

    } catch (error) {
        hideLoading();
        console.error('Error saving weekly schedule:', error);
        showToast('خطأ', 'فشل حفظ الجدول: ' + error.message, 'error');
    }
}

// Save Specific Date
async function saveSpecificDate() {
    const datePicker = document.getElementById('specific-date-picker');
    const action = document.getElementById('specific-action').value;
    const capacity = parseInt(document.getElementById('specific-capacity').value) || 10;

    if (!datePicker.value) {
        showToast('تحذير', 'الرجاء اختيار تاريخ', 'warning');
        return;
    }

    const selectedDate = datePicker.value;
    const slots = document.querySelectorAll('#specific-time-slots input[type="checkbox"]:checked');

    if (action === 'add' && slots.length === 0) {
        showToast('تحذير', 'الرجاء اختيار فترة زمنية واحدة على الأقل', 'warning');
        return;
    }

    showLoading();

    try {
        if (action === 'block') {
            // Block the entire day
            await supabase
                .from('family_availability')
                .delete()
                .eq('family_id', currentFamilyId)
                .eq('specific_date', selectedDate);

            hideLoading();
            showToast('نجح', `تم إغلاق يوم ${selectedDate}`, 'success');
        } else {
            // Add specific availability
            const availabilityRecords = [];
            slots.forEach(slot => {
                const [start, end] = slot.dataset.time.split('-');
                availabilityRecords.push({
                    family_id: currentFamilyId,
                    specific_date: selectedDate,
                    start_time: start,
                    end_time: end,
                    max_capacity: capacity,
                    is_available: true
                });
            });

            const { error } = await supabase
                .from('family_availability')
                .insert(availabilityRecords);

            if (error) throw error;

            hideLoading();
            showToast('نجح', `تم إضافة ${availabilityRecords.length} فترة ليوم ${selectedDate}`, 'success');
        }

        // Reset form
        datePicker.value = '';
        slots.forEach(slot => slot.checked = false);

    } catch (error) {
        hideLoading();
        console.error('Error saving specific date:', error);
        showToast('خطأ', 'فشل الحفظ: ' + error.message, 'error');
    }
}

// Load Bookings
async function loadBookings() {
    try {
        const { data: bookings, error } = await supabase
            .from('bookings')
            .select(`
                *,
                booking_time_slots(*),
                user_profiles(full_name),
                packages(name)
            `)
            .eq('family_id', currentFamilyId)
            .gte('booking_date', new Date().toISOString().split('T')[0])
            .order('booking_date', { ascending: true });

        if (error) throw error;

        // Update stats
        document.getElementById('total-bookings').textContent = bookings.length;
        document.getElementById('upcoming-bookings').textContent =
            bookings.filter(b => b.status === 'confirmed').length;
        document.getElementById('completed-bookings').textContent =
            bookings.filter(b => b.status === 'completed').length;

        // Render bookings list
        const bookingsList = document.getElementById('bookings-list');
        if (!bookingsList) return;

        if (bookings.length === 0) {
            bookingsList.innerHTML = '<p class="text-muted">لا توجد حجوزات قادمة</p>';
            return;
        }

        bookingsList.innerHTML = bookings.map(booking => `
            <div class="booking-item">
                <div class="booking-header">
                    <span class="booking-number">${booking.booking_number}</span>
                    <span class="status-badge status-${booking.status}">${getStatusText(booking.status)}</span>
                </div>
                <div class="booking-details">
                    <div><strong>التاريخ:</strong> ${booking.booking_date}</div>
                    <div><strong>الزائر:</strong> ${booking.user_profiles?.full_name || 'غير محدد'}</div>
                    <div><strong>الباقة:</strong> ${booking.packages?.name || 'غير محدد'}</div>
                    <div><strong>المبلغ:</strong> ${booking.total_amount} ريال</div>
                </div>
            </div>
        `).join('');

    } catch (error) {
        console.error('Error loading bookings:', error);
        showToast('خطأ', 'فشل تحميل الحجوزات', 'error');
    }
}

// Load Earnings
async function loadEarnings() {
    try {
        const { data: earnings, error } = await supabase
            .from('family_earnings')
            .select('*')
            .eq('family_id', currentFamilyId)
            .order('created_at', { ascending: false });

        if (error) throw error;

        // Calculate totals
        const total = earnings.reduce((sum, e) => sum + parseFloat(e.net_amount || 0), 0);
        const thisMonth = earnings
            .filter(e => new Date(e.created_at).getMonth() === new Date().getMonth())
            .reduce((sum, e) => sum + parseFloat(e.net_amount || 0), 0);
        const pending = earnings
            .filter(e => e.status === 'pending')
            .reduce((sum, e) => sum + parseFloat(e.net_amount || 0), 0);

        // Update stats
        document.getElementById('total-earnings').textContent = `${total.toFixed(2)} ريال`;
        document.getElementById('this-month-earnings').textContent = `${thisMonth.toFixed(2)} ريال`;
        document.getElementById('pending-earnings').textContent = `${pending.toFixed(2)} ريال`;

        // Render earnings list
        const earningsList = document.getElementById('earnings-list');
        if (!earningsList) return;

        if (earnings.length === 0) {
            earningsList.innerHTML = '<p class="text-muted">لا توجد أرباح مسجلة</p>';
            return;
        }

        earningsList.innerHTML = earnings.slice(0, 10).map(earning => `
            <div class="earning-item">
                <div>
                    <div class="text-sm text-muted">${new Date(earning.created_at).toLocaleDateString('ar-SA')}</div>
                    <div class="font-bold">حجز #${earning.booking_id.substring(0, 8)}</div>
                </div>
                <div class="text-right">
                    <div class="font-bold">${parseFloat(earning.net_amount).toFixed(2)} ريال</div>
                    <div class="text-sm text-muted">بعد العمولة</div>
                </div>
                <div>
                    <span class="status-badge status-${earning.status}">${getStatusText(earning.status)}</span>
                </div>
            </div>
        `).join('');

    } catch (error) {
        console.error('Error loading earnings:', error);
        showToast('خطأ', 'فشل تحميل الأرباح', 'error');
    }
}

// Show Section
function showSection(section) {
    // Hide all sections
    document.querySelectorAll('.dashboard-section').forEach(s => {
        s.style.display = 'none';
    });

    // Show selected section
    document.getElementById(`${section}-section`).style.display = 'block';

    // Update nav
    document.querySelectorAll('.sidebar-nav .nav-item').forEach(item => {
        item.classList.remove('active');
    });
    document.querySelector(`[href="#${section}"]`).classList.add('active');
}

// Helper: Get Status Text
function getStatusText(status) {
    const statusMap = {
        'pending': 'قيد الانتظار',
        'confirmed': 'مؤكد',
        'completed': 'مكتمل',
        'cancelled': 'ملغي',
        'paid': 'مدفوع',
        'processing': 'قيد المعالجة'
    };
    return statusMap[status] || status;
}

// Logout
function logout() {
    localStorage.removeItem('karam_user');
    window.location.href = 'login.html';
}
