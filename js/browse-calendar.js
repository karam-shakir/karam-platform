// ============================================
// Browse & Book Majalis - v2.2
// Enhanced: Alternative times support
// ============================================

// Logout function
async function logout() {
    if (confirm('هل تريد تسجيل الخروج؟')) {
        await window.supabaseClient.auth.signOut();
        window.location.href = 'login.html';
    }
}
window.logout = logout;

let selectedMajlis = null;
let searchFilters = {
    date: null,
    timeSlot: null,
    majlisType: null,
    guestCount: 1
};

// ============================================
// 1. INITIALIZATION
// ============================================

document.addEventListener('DOMContentLoaded', async () => {
    console.log('🚀 Browse calendar initialized');

    // Setup date picker
    flatpickr('#date-picker', {
        locale: 'ar',
        minDate: 'today',
        dateFormat: 'Y-m-d',
        onChange: function (selectedDates, dateStr) {
            searchFilters.date = dateStr;
            document.getElementById('booking-date').value = dateStr;
            document.getElementById('booking-date').min = new Date().toISOString().split('T')[0];
        }
    });

    // Don't load majalis automatically - wait for user to search
    // await searchFamilies();

    // Setup guests count listener
    document.getElementById('booking-guests')?.addEventListener('change', updatePriceSummary);

    // Setup alternative times checkbox listener
    document.getElementById('show-alternative-times')?.addEventListener('change', searchFamilies);
});

// ============================================
// 2. SEARCH & FILTERS
// ============================================

function selectTimeSlot(slot) {
    document.querySelectorAll('.time-slot-card').forEach(card => {
        card.classList.remove('selected');
    });
    document.querySelector(`[data-slot="${slot}"]`).classList.add('selected');
    searchFilters.timeSlot = slot;
    document.getElementById('time-slot').value = slot;
}

function changeGuestCount(delta) {
    const countEl = document.getElementById('guest-count');
    let current = parseInt(countEl.textContent);
    current += delta;
    if (current < 1) current = 1;
    if (current > 100) current = 100;
    countEl.textContent = current;
    searchFilters.guestCount = current;
}

async function searchFamilies() {
    try {
        const date = searchFilters.date;
        const timeSlot = searchFilters.timeSlot;
        const majlisType = document.getElementById('majlis-filter')?.value || '';
        const showAlternative = document.getElementById('show-alternative-times')?.checked || false;

        console.log('🔍 Starting search...');
        console.log('Filters:', { date, timeSlot, majlisType, showAlternative });

        // Require both date and time to be selected
        if (!date || !timeSlot) {
            document.getElementById('results-count').textContent = `0 مجلس متاح`;
            document.getElementById('families-grid').innerHTML = `
                <div class="empty-state" style="grid-column: 1/-1;">
                    <div class="empty-state-icon">📅</div>
                    <p style="font-size: 1.2rem; margin-bottom: var(--space-sm);">يرجى اختيار التاريخ والفترة الزمنية</p>
                    <p style="font-size: var(--font-size-sm); color: var(--color-text-light);">
                        حدد التاريخ والوقت المطلوب ثم اضغط على زر البحث
                    </p>
                </div>
            `;
            document.getElementById('alternative-results-section').style.display = 'none';
            return;
        }

        // Build base query
        let query = window.supabaseClient
            .from('majlis')
            .select(`
                *,
                families (
                    id,
                    family_name,
                    city
                )
            `)
            .eq('is_active', true);

        if (majlisType) {
            query = query.eq('majlis_type', majlisType);
        }

        const { data: allMajalis, error } = await query;

        if (error) {
            console.error('❌ Query error:', error);
            throw error;
        }

        console.log('✅ Got', allMajalis?.length || 0, 'active majalis');

        let matchingMajalis = [];
        let alternativeMajalis = [];

        // Get all available slots for the selected date
        const { data: exactSlots, error: slotsError } = await window.supabaseClient
            .from('available_slots')
            .select('*')
            .eq('available_date', date)
            .eq('is_active', true);

        if (slotsError) {
            console.error('Error loading slots:', slotsError);
        } else {
            console.log('📅 Found', exactSlots?.length || 0, 'slots for', date);

            // Exact matches: same date AND time
            const exactSlotIds = new Set(
                exactSlots
                    .filter(slot => slot.time_slot === timeSlot)
                    .map(slot => slot.majlis_id)
            );

            matchingMajalis = allMajalis.filter(m => exactSlotIds.has(m.id));
            console.log('✅ Exact matches:', matchingMajalis.length);
        }

        // Alternative: any future date (if checkbox enabled)
        if (showAlternative) {
            const { data: futureSlots, error: futureSlotsError } = await window.supabaseClient
                .from('available_slots')
                .select('*')
                .gte('available_date', new Date().toISOString().split('T')[0])
                .eq('is_active', true);

            if (!futureSlotsError && futureSlots) {
                // Get majalis that have ANY future availability (excluding exact matches)
                const exactMatchIds = new Set(matchingMajalis.map(m => m.id));
                const alternativeSlotIds = new Set(
                    futureSlots
                        .filter(slot => !exactMatchIds.has(slot.majlis_id))
                        .map(slot => slot.majlis_id)
                );

                alternativeMajalis = allMajalis.filter(m => alternativeSlotIds.has(m.id));
                console.log('🔄 Alternative availability:', alternativeMajalis.length);
            }
        }

        // Render results
        document.getElementById('results-count').textContent = `${matchingMajalis.length} مجلس متاح`;
        renderMajalisList(matchingMajalis);

        // Show/hide alternative results
        const alternativeSection = document.getElementById('alternative-results-section');
        if (showAlternative && alternativeMajalis.length > 0) {
            alternativeSection.style.display = 'block';
            document.getElementById('alternative-results-count').textContent = `${alternativeMajalis.length} مجلس`;
            renderAlternativeMajalisList(alternativeMajalis);
        } else {
            alternativeSection.style.display = 'none';
        }

    } catch (error) {
        console.error('❌ Search failed:', error);
        alert('حدث خطأ: ' + (error.message || 'غير محدد'));
    }
}

function renderMajalisList(majalisList) {
    const container = document.getElementById('families-grid');

    console.log('🎨 Rendering', majalisList.length, 'majalis');

    if (!majalisList || majalisList.length === 0) {
        container.innerHTML = `
            <div class="empty-state" style="grid-column: 1/-1;">
                <div class="empty-state-icon">🔍</div>
                <p>لا توجد مجالس متاحة في الوقت المحدد</p>
                <p style="font-size: var(--font-size-sm); color: var(--color-text-light); margin-top: var(--space-sm);">
                    جرّب تفعيل خيار "إظهار المجالس المتاحة في أوقات أخرى"
                </p>
            </div>
        `;
        return;
    }

    container.innerHTML = majalisList.map(m => renderMajlisCard(m, false)).join('');
    console.log('✅ Rendering complete');
}

function renderAlternativeMajalisList(majalisList) {
    const container = document.getElementById('alternative-families-grid');
    container.innerHTML = majalisList.map(m => renderMajlisCard(m, true)).join('');
}

function renderMajlisCard(m, isAlternative = false) {
    // Get available times for this majlis (for alternative results)
    let availableTimesHTML = '';

    if (isAlternative) {
        availableTimesHTML = `
            <div style="background: #eff6ff; padding: var(--space-sm); border-radius: var(--radius-md); margin-bottom: var(--space-sm);">
                <small style="color: #0369a1; font-weight: var(--font-weight-medium);">
                    📅 الأوقات المتاحة القادمة
                </small>
                <div id="times-${m.id}" style="margin-top: var(--space-xs); font-size: var(--font-size-sm); color: #0c4a6e;">
                    جاري التحميل...
                </div>
            </div>
        `;
    }

    // Use package_price if available, otherwise base_price
    const price = m.package_price || m.base_price || 0;
    const packageBadge = m.package_type ?
        `<span class="feature-badge" style="background: ${m.package_type === 'premium' ? '#fef3c7' : '#dbeafe'}; color: ${m.package_type === 'premium' ? '#92400e' : '#1e40af'};">
            ${m.package_type === 'premium' ? '⭐ متميزة' : '🎁 أساسية'}
        </span>` : '';

    const card = `
        <div class="family-card">
            <div class="family-image"></div>
            <div class="family-content">
                <div class="family-header">
                    <div>
                        <h3 class="family-name">${escapeHtml(m.majlis_name || m.name)}</h3>
                        <div class="family-rating"><span>⭐ 4.8</span></div>
                    </div>
                </div>
                <p class="family-location">📍 ${m.families?.city || 'مكة المكرمة'}</p>
                ${availableTimesHTML}
                <div class="family-features">
                    <span class="feature-badge">${m.majlis_type === 'men' ? '👨 رجالي' : '👩 نسائي'}</span>
                    <span class="feature-badge">👥 ${m.capacity} شخص</span>
                    ${packageBadge}
                </div>
                <div class="family-price">
                    <div>
                        <div class="price-amount">${price} ر.س</div>
                        <div class="price-label">لكل شخص</div>
                    </div>
                    <button onclick='openBookingModal(${JSON.stringify(m).replace(/'/g, "&apos;")})' class="btn btn-primary">احجز الآن</button>
                </div>
            </div>
        </div>
    `;

    // Load available times for alternative results
    if (isAlternative) {
        setTimeout(() => loadAllAvailableTimes(m.id), 100);
    }

    return card;
}

async function loadAllAvailableTimes(majlisId) {
    try {
        const { data, error } = await window.supabaseClient
            .from('available_slots')
            .select('available_date, time_slot')
            .eq('majlis_id', majlisId)
            .gte('available_date', new Date().toISOString().split('T')[0])
            .eq('is_active', true)
            .order('available_date', { ascending: true })
            .limit(10); // Show first 10 upcoming dates

        if (error) throw error;

        const timeSlotNames = {
            morning: '🌅 صباحاً',
            afternoon: '☀️ ظهراً',
            evening: '🌆 مساءً',
            night: '🌙 ليلاً'
        };

        // Group by date
        const dateGroups = {};
        data.forEach(slot => {
            if (!dateGroups[slot.available_date]) {
                dateGroups[slot.available_date] = [];
            }
            dateGroups[slot.available_date].push(slot.time_slot);
        });

        const timesHTML = Object.entries(dateGroups).map(([date, slots]) => `
            <div style="margin-bottom: var(--space-xs); padding: var(--space-xs); background: white; border-radius: 4px;">
                <strong style="color: #0369a1;">${new Date(date).toLocaleDateString('ar-SA')}</strong>: 
                ${slots.map(s => timeSlotNames[s] || s).join(', ')}
            </div>
        `).join('');

        const container = document.getElementById(`times-${majlisId}`);
        if (container) {
            container.innerHTML = timesHTML || 'لا توجد أوقات متاحة';
        }
    } catch (error) {
        console.error('Error loading times for majlis', majlisId, error);
    }
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ============================================
// 3. BOOKING MODAL
// ============================================

function openBookingModal(majlis) {
    selectedMajlis = majlis;
    const price = majlis.package_price || majlis.base_price || 0;

    document.getElementById('selected-majlis-id').value = majlis.id;
    document.getElementById('selected-majlis-price').value = price;
    document.getElementById('modal-majlis-name').textContent = majlis.majlis_name || majlis.name;
    document.getElementById('modal-majlis-location').textContent = `📍 ${majlis.families?.city || 'المدينة'}`;
    document.getElementById('price-per-person').textContent = `${price} ر.س`;
    updatePriceSummary();
    document.getElementById('bookingModal').classList.add('active');
}

function closeBookingModal() {
    document.getElementById('bookingModal').classList.remove('active');
    selectedMajlis = null;
}

function updatePriceSummary() {
    const guests = parseInt(document.getElementById('booking-guests')?.value || 1);
    const pricePerPerson = parseFloat(document.getElementById('selected-majlis-price')?.value || 0);
    const subtotal = guests * pricePerPerson;
    const vat = subtotal * 0.15; // 15% VAT
    const total = subtotal + vat;

    document.getElementById('summary-guests').textContent = guests;
    document.getElementById('total-price').textContent = `${total.toFixed(2)} ر.س`;
}

// ============================================
// 4. SUBMIT BOOKING
// ============================================

async function submitBooking(e) {
    e.preventDefault();

    const majlisId = document.getElementById('selected-majlis-id').value;
    const date = document.getElementById('booking-date').value;
    const timeSlot = document.getElementById('booking-time-slot').value;
    const guests = parseInt(document.getElementById('booking-guests').value);
    const notes = document.getElementById('booking-notes').value;
    const pricePerPerson = parseFloat(document.getElementById('selected-majlis-price').value);

    // Calculate with VAT
    const subtotal = guests * pricePerPerson;
    const vat = subtotal * 0.15; // 15% VAT
    const totalPrice = subtotal + vat;

    try {
        const { data: { user }, error: userError } = await window.supabaseClient.auth.getUser();
        if (userError || !user) {
            if (confirm('يجب تسجيل الدخول أولاً. انتقال لصفحة الدخول؟')) {
                window.location.href = 'login.html';
            }
            return false;
        }

        // Check if slot is available
        const slotAvailable = await checkSlotAvailability(majlisId, date, timeSlot);
        if (!slotAvailable) {
            alert('⚠️ هذا الوقت غير متاح للحجز. يرجى اختيار وقت آخر.');
            return false;
        }

        const available = await checkAvailability(majlisId, date, timeSlot);
        if (!available) {
            alert('⚠️ الموعد محجوز مسبقاً');
            return false;
        }

        const { data, error } = await window.supabaseClient
            .from('bookings')
            .insert([{
                user_id: user.id,
                majlis_id: majlisId,
                booking_date: date,
                time_slot: timeSlot,
                guests_count: guests,
                total_price: totalPrice,
                notes: notes,
                customer_name: user.user_metadata?.full_name || user.email,
                customer_email: user.email,
                booking_status: 'pending',
                payment_status: 'pending'
            }])
            .select();

        if (error) throw error;

        alert('✅ تم الحجز! انتقال للدفع...');
        localStorage.setItem('pending_booking_id', data[0].id);
        localStorage.setItem('pending_booking_amount', totalPrice);
        window.location.href = `checkout.html?booking_id=${data[0].id}&amount=${totalPrice}`;

    } catch (error) {
        console.error('Error:', error);
        alert('❌ خطأ: ' + error.message);
    }

    return false;
}

async function checkSlotAvailability(majlisId, date, timeSlot) {
    try {
        const { data, error } = await window.supabaseClient
            .from('available_slots')
            .select('*')
            .eq('majlis_id', majlisId)
            .eq('available_date', date)
            .eq('time_slot', timeSlot)
            .eq('is_active', true);

        if (error) throw error;

        return data && data.length > 0;
    } catch (error) {
        console.error('Error checking slot:', error);
        return false;
    }
}

async function checkAvailability(majlisId, date, timeSlot) {
    try {
        const { data, error } = await window.supabaseClient
            .from('bookings')
            .select('*')
            .eq('majlis_id', majlisId)
            .eq('booking_date', date)
            .eq('time_slot', timeSlot);

        if (error) throw error;

        const hasBooking = data && data.length > 0 &&
            data.some(b => b.booking_status === 'confirmed' || b.booking_status === 'pending');

        return !hasBooking;
    } catch (error) {
        console.error('Error checking availability:', error);
        return false;
    }
}

// Global functions
window.selectTimeSlot = selectTimeSlot;
window.changeGuestCount = changeGuestCount;
window.searchFamilies = searchFamilies;
window.openBookingModal = openBookingModal;
window.closeBookingModal = closeBookingModal;
window.submitBooking = submitBooking;

console.log('✅ Browse calendar v2.2 initialized with alternative times support');
