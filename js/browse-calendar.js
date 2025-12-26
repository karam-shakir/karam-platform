// ============================================
// Browse & Book Majalis - Complete Implementation  
// Fixed to use supabaseClient directly
// ============================================

let selectedMajlis = null;
let searchFilters = {
    date: null,
    timeSlot: null,
    city: null,
    majlisType: null,
    guestCount: 1
};

// ============================================
// 1. INITIALIZATION
// ============================================

document.addEventListener('DOMContentLoaded', async () => {
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

    // Load available majalis on page load
    await searchFamilies();

    // Setup guests count listener
    document.getElementById('booking-guests')?.addEventListener('change', updatePriceSummary);
});

// ============================================
// 2. SEARCH & FILTERS
// ============================================

function selectTimeSlot(slot) {
    // Remove selection from all
    document.querySelectorAll('.time-slot-card').forEach(card => {
        card.classList.remove('selected');
    });

    // Add selection to clicked
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
        // Get filters
        const city = document.getElementById('city-filter')?.value || '';
        const majlisType = document.getElementById('majlis-filter')?.value || '';

        // Build query - use supabaseClient directly
        let query = window.supabaseClient
            .from('majlis')
            .select(`
                *,
                families!inner(
                    id,
                    family_name,
                    city
                )
            `)
            .eq('is_active', true);

        // Apply filters
        if (city) {
            query = query.eq('families.city', city);
        }

        if (majlisType) {
            query = query.eq('majlis_type', majlisType);
        }

        const { data, error } = await query;

        if (error) {
            console.error('Search error details:', error);
            throw error;
        }

        // Update results count
        document.getElementById('results-count').textContent = `${data?.length || 0} مجلس متاح`;

        // Render results
        renderMajalisList(data || []);

    } catch (error) {
        console.error('Error searching:', error);
        alert('حدث خطأ أثناء البحث: ' + (error.message || 'غير معروف'));
    }
}

function renderMajalisList(majalisList) {
    const container = document.getElementById('families-grid');

    if (!majalisList || majalisList.length === 0) {
        container.innerHTML = `
            <div class="empty-state" style="grid-column: 1/-1;">
                <div class="empty-state-icon">🔍</div>
                <p>لا توجد مجالس متاحة بهذه المواصفات</p>
            </div>
        `;
        return;
    }

    container.innerHTML = majalisList.map(m => `
        <div class="family-card">
            <div class="family-image"></div>
            <div class="family-content">
                <div class="family-header">
                    <div>
                        <h3 class="family-name">${escapeHtml(m.majlis_name)}</h3>
                        <div class="family-rating">
                            <span>⭐ 4.8</span>
                        </div>
                    </div>
                </div>
                <p class="family-location">📍 ${m.families?.city || 'مكة المكرمة'}</p>
                <div class="family-features">
                    <span class="feature-badge">${m.majlis_type === 'men' ? '👨 رجالي' : '👩 نسائي'}</span>
                    <span class="feature-badge">👥 ${m.capacity} شخص</span>
                </div>
                <div class="family-price">
                    <div>
                        <div class="price-amount">${m.base_price} ر.س</div>
                        <div class="price-label">لكل شخص</div>
                    </div>
                    <button onclick='openBookingModal(${JSON.stringify(m).replace(/'/g, "&apos;")})' class="btn btn-primary">احجز الآن</button>
                </div>
            </div>
        </div>
    `).join('');
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ============================================
// 3. BOOKING MODAL
// ============================================

function openBookingModal(majlis) {
    selectedMajlis = majlis;

    // Fill modal info
    document.getElementById('selected-majlis-id').value = majlis.id;
    document.getElementById('selected-majlis-price').value = majlis.base_price;
    document.getElementById('modal-majlis-name').textContent = majlis.majlis_name;
    document.getElementById('modal-majlis-location').textContent = `📍 ${majlis.families?.city || 'المدينة'}`;

    // Set price
    document.getElementById('price-per-person').textContent = `${majlis.base_price} ر.س`;

    // Update price summary
    updatePriceSummary();

    // Show modal
    document.getElementById('bookingModal').classList.add('active');
}

function closeBookingModal() {
    document.getElementById('bookingModal').classList.remove('active');
    selectedMajlis = null;
}

function updatePriceSummary() {
    const guests = parseInt(document.getElementById('booking-guests')?.value || 1);
    const pricePerPerson = parseFloat(document.getElementById('selected-majlis-price')?.value || 0);
    const total = guests * pricePerPerson;

    document.getElementById('summary-guests').textContent = guests;
    document.getElementById('total-price').textContent = `${total} ر.س`;
}

// ============================================
// 4. SUBMIT BOOKING
// ============================================

async function submitBooking(e) {
    e.preventDefault();

    // Get form data
    const majlisId = document.getElementById('selected-majlis-id').value;
    const date = document.getElementById('booking-date').value;
    const timeSlot = document.getElementById('booking-time-slot').value;
    const guests = parseInt(document.getElementById('booking-guests').value);
    const notes = document.getElementById('booking-notes').value;
    const pricePerPerson = parseFloat(document.getElementById('selected-majlis-price').value);
    const totalPrice = guests * pricePerPerson;

    try {
        // Check if user is logged in
        const { data: { user }, error: userError } = await window.supabaseClient.auth.getUser();
        if (userError || !user) {
            if (confirm('يجب تسجيل الدخول أولاً. هل تريد الذهاب لصفحة تسجيل الدخول؟')) {
                window.location.href = 'login.html';
            }
            return false;
        }

        // Check availability
        const available = await checkAvailability(majlisId, date, timeSlot);
        if (!available) {
            alert('⚠️ عذراً، هذا الموعد محجوز مسبقاً. اختر موعداً آخر.');
            return false;
        }

        // Create booking
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

        // Success! Redirect to payment
        alert('✅ تم إنشاء الحجز بنجاح! سيتم تحويلك للدفع...');

        // Store booking ID for payment
        localStorage.setItem('pending_booking_id', data[0].id);
        localStorage.setItem('pending_booking_amount', totalPrice);

        // Redirect to payment page
        window.location.href = `checkout.html?booking_id=${data[0].id}&amount=${totalPrice}`;

    } catch (error) {
        console.error('Error creating booking:', error);
        alert('❌ حدث خطأ: ' + error.message);
    }

    return false;
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

        // Check if there's a confirmed or pending booking
        const hasBooking = data && data.length > 0 &&
            data.some(b => b.booking_status === 'confirmed' || b.booking_status === 'pending');

        return !hasBooking;
    } catch (error) {
        console.error('Error checking availability:', error);
        return false;
    }
}

// Make functions global
window.selectTimeSlot = selectTimeSlot;
window.changeGuestCount = changeGuestCount;
window.searchFamilies = searchFamilies;
window.openBookingModal = openBookingModal;
window.closeBookingModal = closeBookingModal;
window.submitBooking = submitBooking;
