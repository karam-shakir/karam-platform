/**
 * Browse Families Calendar - Karam Platform
 * البحث عن الأسر بناءً على التاريخ والوقت
 */

// Global state
let selectedDate = null;
let selectedTimeSlot = []; // Changed to array for multiple selection
let selectedCity = null;
let guestCount = 1;
let availableFamilies = [];
let cart = JSON.parse(localStorage.getItem('karam_booking_cart') || '[]');

// Time slot mapping
const TIME_SLOTS = {
    morning: { start: '08:00', end: '12:00', label: 'صباحاً' },
    afternoon: { start: '12:00', end: '16:00', label: 'ظهراً' },
    evening: { start: '16:00', end: '20:00', label: 'مساءً' },
    night: { start: '20:00', end: '00:00', label: 'ليلاً' }
};

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    initializeDatePicker();
    updateCartDisplay();

    // Load families on first load (show all)
    searchFamilies();
});

// Initialize Date Picker
function initializeDatePicker() {
    flatpickr('#date-picker', {
        locale: 'ar',
        dateFormat: 'Y-m-d',
        minDate: 'today',
        maxDate: new Date().fp_incr(90),
        onChange: (selectedDates, dateStr) => {
            selectedDate = dateStr;
        }
    });
}

// Change Guest Count
function changeGuestCount(delta) {
    const newCount = guestCount + delta;
    if (newCount >= 1 && newCount <= 50) {
        guestCount = newCount;
        document.getElementById('guest-count').textContent = guestCount;
    }
}

// Select Time Slot
function selectTimeSlot(slot) {
    const card = document.querySelector(`[data-slot="${slot}"]`);

    // Toggle selection (multiple selection)
    if (card.classList.contains('selected')) {
        card.classList.remove('selected');
        selectedTimeSlot = selectedTimeSlot.filter(s => s !== slot);
    } else {
        card.classList.add('selected');
        if (!selectedTimeSlot.includes(slot)) {
            selectedTimeSlot.push(slot);
        }
    }

    // Update hidden input with all selected slots
    document.getElementById('time-slot').value = selectedTimeSlot.join(',');

    console.log('Selected time slots:', selectedTimeSlot);
}

// Search Families
async function searchFamilies() {
    selectedCity = document.getElementById('city-filter').value;

    console.log('🔍 Search initiated:');
    console.log('- Date:', selectedDate);
    console.log('- Time slots:', selectedTimeSlot);
    console.log('- City:', selectedCity);
    console.log('- Guests:', guestCount);

    showLoading();

    try {
        // Check if supabase is initialized
        if (!supabase) {
            console.error('❌ Supabase not initialized!');
            throw new Error('Supabase is not initialized. Please check your configuration.');
        }

        let query = supabase
            .from('host_families')
            .select(`
                *,
                user_profiles(full_name),
                packages(*)
            `)
            .eq('status', 'approved');

        // Filter by city
        if (selectedCity) {
            query = query.eq('city', selectedCity);
        }

        console.log('📡 Querying Supabase...');
        const { data: families, error } = await query;

        if (error) {
            console.error('❌ Supabase error:', error);
            throw error;
        }

        console.log('✅ Families from DB:', families?.length || 0);
        console.log('Families data:', families);

        // If date and time are selected, filter by availability
        if (selectedDate && selectedTimeSlot.length > 0) {
            console.log('🔍 Filtering by availability...');
            availableFamilies = await filterByAvailability(families, selectedDate, selectedTimeSlot, guestCount);
        } else {
            console.log('📋 Showing all families (no date/time filter)');
            availableFamilies = families;
        }

        console.log('✅ Final families to display:', availableFamilies?.length || 0);
        displayFamilies(availableFamilies);
        hideLoading();

    } catch (error) {
        hideLoading();
        console.error('❌ Search error:', error);
        showToast('خطأ', 'فشل البحث عن الأسر: ' + error.message, 'error');
    }
}

// Filter families by availability
async function filterByAvailability(families, date, timeSlot, guests) {
    const slot = TIME_SLOTS[timeSlot];
    if (!slot) return families;

    const availableIds = [];

    for (const family of families) {
        try {
            // Check availability using the SQL function
            const { data, error } = await supabase
                .rpc('get_available_families', {
                    p_date: date,
                    p_start_time: slot.start,
                    p_end_time: slot.end,
                    p_guest_count: guests
                });

            if (error) {
                console.error('RPC error for family', family.id, error);
                continue;
            }

            // Check if this family is in the results
            if (data && data.some(f => f.family_id === family.id)) {
                availableIds.push(family.id);
            }
        } catch (err) {
            console.error('Error checking availability:', err);
        }
    }

    return families.filter(f => availableIds.includes(f.id));
}

// Display Families
function displayFamilies(families) {
    const grid = document.getElementById('families-grid');
    const count = document.getElementById('results-count');

    count.textContent = `${families.length} أسرة متاحة`;

    if (families.length === 0) {
        grid.innerHTML = `
            <div class="empty-state" style="grid-column: 1/-1;">
                <div class="empty-state-icon">😔</div>
                <h3>لا توجد أسر متاحة</h3>
                <p>جرب تغيير التاريخ أو الوقت أو المدينة</p>
            </div>
        `;
        return;
    }

    grid.innerHTML = families.map(family => {
        const isInCart = cart.some(item => item.familyId === family.id);
        const basePackage = family.packages?.[0] || { name: 'باقة أساسية', price: 200 };

        // Calculate availability
        const availableSpots = family.capacity || 10;
        const bookedSpots = Math.floor(Math.random() * 3); // Mock - replace with real data
        const remainingSpots = availableSpots - bookedSpots;

        let availabilityIcon = '✅';
        if (remainingSpots <= 0) availabilityIcon = '❌';
        else if (remainingSpots <= 3) availabilityIcon = '⚠️';

        return `
            <div class="family-card ${isInCart ? 'in-cart' : ''}" data-family-id="${family.id}">
                <div class="availability-badge">
                    ${availabilityIcon} ${remainingSpots} أماكن متبقية
                </div>
                <div class="family-image" style="background: linear-gradient(135deg, #${Math.floor(Math.random() * 16777215).toString(16)} 30%, #${Math.floor(Math.random() * 16777215).toString(16)} 100%);">
                    <div style="display: flex; align-items: center; justify-content: center; height: 100%; font-size: 60px;">
                        🏠
                    </div>
                </div>
                <div class="family-content">
                    <div class="family-header">
                        <div>
                            <h3 class="family-name">${family.family_name}</h3>
                            <div class="family-rating">
                                <span>⭐</span>
                                <span>${family.rating || 4.5}</span>
                                <span style="color: var(--color-text-light);">(${family.total_bookings || 0})</span>
                            </div>
                        </div>
                    </div>
                    
                    <div class="family-location">
                        📍 ${family.city === 'makkah' ? 'مكة المكرمة' : 'المدينة المنورة'}
                    </div>
                    
                    <div class="family-features">
                        <span class="feature-badge">👥 حتى ${family.capacity || 10} ضيف</span>
                        ${family.has_parking ? '<span class="feature-badge">🚗 موقف</span>' : ''}
                        ${family.has_elevator ? '<span class="feature-badge">🛗 مصعد</span>' : ''}
                    </div>
                    
                    <p class="text-sm text-muted" style="margin-bottom: var(--space-md);">
                        ${(family.description || 'أسرة كريمة تستقبل ضيوف الرحمن').substring(0, 80)}...
                    </p>
                    
                    <div class="family-price">
                        <div>
                            <div class="price-amount">${basePackage.price} ر.س</div>
                            <div class="price-label">للشخص</div>
                        </div>
                        <button 
                            onclick="addToCart('${family.id}', '${family.family_name}', ${basePackage.price})" 
                            class="btn ${isInCart ? 'btn-success' : 'btn-primary'}}"
                            ${remainingSpots <= 0 ? 'disabled' : ''}>
                            ${isInCart ? '✓ في السلة' : remainingSpots <= 0 ? 'غير متاح' : '+ إضافة'}
                        </button>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

// Add to Cart
function addToCart(familyId, familyName, price) {
    if (!selectedDate || !selectedTimeSlot) {
        showToast('تنبيه', 'الرجاء اختيار التاريخ والوقت أولاً', 'warning');
        return;
    }

    // Check if already in cart
    const existingIndex = cart.findIndex(item =>
        item.familyId === familyId &&
        item.date === selectedDate &&
        item.timeSlot === selectedTimeSlot
    );

    if (existingIndex >= 0) {
        // Remove from cart
        cart.splice(existingIndex, 1);
        showToast('تم', 'تم إزالة الحجز من السلة', 'info');
    } else {
        // Add to cart
        const slot = TIME_SLOTS[selectedTimeSlot];
        cart.push({
            familyId,
            familyName,
            date: selectedDate,
            timeSlot: selectedTimeSlot,
            timeLabel: slot.label,
            startTime: slot.start,
            endTime: slot.end,
            guestCount,
            price: price * guestCount,
            pricePerGuest: price
        });
        showToast('نجح', 'تمت إضافة الحجز للسلة', 'success');
    }

    // Save to localStorage
    localStorage.setItem('karam_booking_cart', JSON.stringify(cart));

    // Update display
    updateCartDisplay();
    displayFamilies(availableFamilies); // Re-render to update "in cart" state
}

// Update Cart Display
function updateCartDisplay() {
    const cartItems = document.getElementById('cart-items');
    const cartTotal = document.getElementById('cart-total');
    const cartCount = document.getElementById('cart-count');
    const checkoutBtn = document.getElementById('checkout-btn');
    const totalAmount = document.getElementById('total-amount');

    cartCount.textContent = cart.length;

    if (cart.length === 0) {
        cartItems.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">🛒</div>
                <p>لم تضف أي حجوزات بعد</p>
            </div>
        `;
        cartTotal.style.display = 'none';
        checkoutBtn.disabled = true;
        return;
    }

    const total = cart.reduce((sum, item) => sum + item.price, 0);

    cartItems.innerHTML = cart.map((item, index) => `
        <div class="cart-item">
            <div class="cart-item-header">
                <strong>${item.familyName}</strong>
                <button onclick="removeFromCart(${index})" class="btn btn-text" style="color: var(--color-error); padding: 0;">
                    ✕
                </button>
            </div>
            <div class="text-sm text-muted">
                📅 ${item.date}<br>
                🕐 ${item.timeLabel} (${item.startTime}-${item.endTime})<br>
                👥 ${item.guestCount} ضيف × ${item.pricePerGuest} ر.س
            </div>
            <div class="text-right font-bold" style="margin-top: var(--space-xs); color: var(--color-primary);">
                ${item.price} ر.س
            </div>
        </div>
    `).join('');

    totalAmount.textContent = `${total} ريال`;
    cartTotal.style.display = 'block';
    checkoutBtn.disabled = false;
}

// Remove from Cart
function removeFromCart(index) {
    cart.splice(index, 1);
    localStorage.setItem('karam_booking_cart', JSON.stringify(cart));
    updateCartDisplay();
    displayFamilies(availableFamilies);
}

// View Cart
function viewCart() {
    if (cart.length === 0) {
        showToast('تنبيه', 'السلة فارغة', 'info');
        return;
    }
    // Scroll to cart
    document.querySelector('.cart-summary').scrollIntoView({ behavior: 'smooth' });
}

// Checkout
function checkout() {
    if (cart.length === 0) {
        showToast('تنبيه', 'السلة فارغة', 'warning');
        return;
    }

    // Check if user is logged in
    const user = JSON.parse(localStorage.getItem('karam_user') || 'null');
    if (!user) {
        showToast('تنبيه', 'يجب تسجيل الدخول أولاً', 'warning');
        setTimeout(() => {
            window.location.href = 'login.html?redirect=browse-families-calendar.html';
        }, 1500);
        return;
    }

    // Proceed to checkout
    showToast('جاري التحويل', 'جاري تحويلك لصفحة الدفع...', 'info');
    setTimeout(() => {
        window.location.href = 'checkout.html';
    }, 1500);
}
