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

// UI Helper Functions
function showLoading() {
    if (window.Karam && window.Karam.Utils) {
        window.Karam.Utils.showLoading();
    } else {
        console.log('Loading...');
    }
}

function hideLoading() {
    if (window.Karam && window.Karam.Utils) {
        window.Karam.Utils.hideLoading();
    } else {
        console.log('Loading finished');
    }
}

function showToast(title, message, type) {
    if (window.Karam && window.Karam.Utils) {
        window.Karam.Utils.showToast(title, message, type);
    } else {
        alert(`${title}: ${message}`);
    }
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 Browse Calendar Page Loaded');

    try {
        initializeDatePicker();
    } catch (e) {
        console.error('Failed to init date picker:', e);
    }

    try {
        updateCartDisplay();
    } catch (e) {
        console.error('Failed to update cart:', e);
    }

    // Load families on first load (show all)
    // Small delay to ensure Supabase is ready
    setTimeout(() => {
        searchFamilies();
    }, 100);
});

// Initialize Date Picker
function initializeDatePicker() {
    if (typeof flatpickr === 'undefined') {
        console.error('❌ Flatpickr library not loaded!');
        return;
    }

    try {
        flatpickr('#date-picker', {
            locale: 'ar',
            dateFormat: 'Y-m-d',
            minDate: 'today',
            maxDate: new Date().fp_incr(90),
            onChange: (selectedDates, dateStr) => {
                selectedDate = dateStr;
            }
        });
    } catch (err) {
        console.error('❌ Error initializing Flatpickr:', err);
    }
}

// Change Guest Count
window.changeGuestCount = function (delta) {
    const newCount = guestCount + delta;
    if (newCount >= 1 && newCount <= 50) {
        guestCount = newCount;
        document.getElementById('guest-count').textContent = guestCount;
    }
}

// Select Time Slot
window.selectTimeSlot = function (slot) {
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
// Search Families
window.searchFamilies = async function () {
    selectedCity = document.getElementById('city-filter').value;
    const selectedMajlisType = document.getElementById('majlis-filter').value;

    console.log('🔍 Search initiated:');
    console.log('- Date:', selectedDate);
    console.log('- Time slots:', selectedTimeSlot);
    console.log('- City:', selectedCity);
    console.log('- Majlis Type:', selectedMajlisType);
    console.log('- Guests:', guestCount);

    showLoading();

    try {
        // Fetch available families from Supabase
        const { data: families, error } = await window.supabaseClient
            .from('host_families')
            .select(`
                id,
                family_name,
                city,
                address,
                capacity,
                description,
                majlis_type,
                amenities,
                rating,
                total_reviews,
                created_at
            `)
            .eq('status', 'approved')
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Supabase error:', error);
            hideLoading();
            showToast('خطأ', 'حدث خطأ أثناء البحث. حاول مرة أخرى.', 'error');
            return;
        }

        // If date and time are selected, filter by availability
        if (selectedDate && selectedTimeSlot.length > 0) {
            console.log('🔍 Filtering by availability...');
            availableFamilies = await filterByAvailability(families, selectedDate, selectedTimeSlot, guestCount);
        } else {
            console.log('📋 Showing all families (no date/time filter)');
            availableFamilies = families || [];
        }

        // Client-side filtering for capacity
        availableFamilies = availableFamilies.filter(family => (family.capacity || 0) >= guestCount);

        displayFamilies(availableFamilies);

    } catch (error) {
        console.error('❌ Search error:', error);
        if (typeof showToast === 'function') {
            showToast('خطأ', 'فشل تحميل قائمة الأسر: ' + (error.message || 'خطأ غير معروف'), 'error');
        } else {
            console.error(error.message);
        }
        // Ensure UI shows empty state handled by displayFamilies
        displayFamilies([]);
    } finally {
        hideLoading();
    }
}

// Filter families by availability
async function filterByAvailability(families, date, timeSlot, guests) {
    // This function now expects timeSlot to be an array, but the RPC expects a single slot.
    // For now, we'll use the first selected slot if multiple are selected.
    const primarySlot = timeSlot.length > 0 ? TIME_SLOTS[timeSlot[0]] : null;
    if (!primarySlot) return families; // If no slot selected, return all families

    const availableIds = [];

    for (const family of families) {
        try {
            // Check availability using the SQL function
            const { data, error } = await supabaseClient
                .rpc('get_available_families', {
                    p_date: date,
                    p_start_time: primarySlot.start,
                    p_end_time: primarySlot.end,
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

// Helper function to format city names
function formatCity(city) {
    if (city === 'makkah') return 'مكة المكرمة';
    if (city === 'madinah') return 'المدينة المنورة';
    return city; // Default to original if not recognized
}

// Helper function to calculate price (assuming first package price for simplicity)
function calculatePrice(family) {
    return family.packages?.[0]?.price || 200; // Default price if no package
}

// Display Families
function displayFamilies(families) {
    const grid = document.getElementById('families-grid');
    const countLabel = document.getElementById('results-count');

    countLabel.textContent = `${families.length} أسرة متاحة`;

    if (families.length === 0) {
        grid.innerHTML = `
            <div class="empty-results" style="grid-column: 1/-1; text-align: center; padding: 40px;">
                <div style="font-size: 60px; margin-bottom: 20px;">🏠</div>
                <h3>لا توجد أسر متاحة حالياً</h3>
                <p class="text-muted">جرب تغيير معايير البحث أو اختيار وقت آخر</p>
            </div>
        `;
        return;
    }

    grid.innerHTML = families.map(family => {
        // Real data usage: availableFamilies are already filtered by availability.
        // We use capacity as proxy for remaining spots since RPC handled the logic.
        const remainingSpots = family.capacity || 10;
        const isInCart = cart.some(item => item.familyId === family.id);
        const basePackage = family.packages?.[0] || { price: 200 }; // Ensure basePackage is defined

        let availabilityIcon = '✅';
        // Logic simplification: if it's in the list, it's available.
        if (remainingSpots <= 3) availabilityIcon = '⚠️';

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
                            class="btn ${isInCart ? 'btn-success' : 'btn-primary'}"
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
    if (!selectedDate || selectedTimeSlot.length === 0) {
        showToast('تنبيه', 'الرجاء اختيار التاريخ والوقت أولاً', 'warning');
        return;
    }

    // --- Auth Check ---
    const user = JSON.parse(localStorage.getItem('karam_user'));

    if (!user) {
        showToast('تنبيه', 'يجب تسجيل الدخول أو إنشاء حساب لإتمام الحجز', 'warning');
        setTimeout(() => {
            window.location.href = 'login.html?redirect=browse-families-calendar.html';
        }, 1500);
        return;
    }

    // Find the family object to check majlis type
    const family = availableFamilies.find(f => f.id === familyId);

    if (user && user.user_metadata && family) {
        const userGender = user.user_metadata.gender; // 'male' or 'female'
        const majlisType = family.majlis_type; // 'men', 'women', 'both'

        let warningMessage = '';
        let isMismatch = false;

        // Check Mismatch
        if (userGender === 'male' && majlisType === 'women') {
            isMismatch = true;
            warningMessage = `⚠️ تنبيه شديد:\n\nلقد قمت باختيار "مجلس نساء" وأنت مسجل كـ "ذكر".\n\nحسب سياسات المنصة، لا يُسمح للرجال بدخول مجالس النساء.\n\nفي حال إتمام الحجز وثبوت المخالفة عند الوصول:\n1- سيتم إلغاء استضافتكم فوراً.\n2- لن يتم استرداد المبلغ المدفوع نهائياً.\n\nهل تقر وتوافق على المتابعة تحت مسؤوليتك الشخصية؟`;
        } else if (userGender === 'female' && majlisType === 'men') {
            isMismatch = true;
            warningMessage = `⚠️ تنبيه شديد:\n\nلقد قمت باختيار "مجلس رجال" وأنت مسجلة كـ "أنثى".\n\nحسب سياسات المنصة، لا يُسمح للنساء بدخول مجالس الرجال.\n\nفي حال إتمام الحجز وثبوت المخالفة عند الوصول:\n1- سيتم إلغاء استضافتكم فوراً.\n2- لن يتم استرداد المبلغ المدفوع نهائياً.\n\nهل تقرين وتوافقين على المتابعة تحت مسؤوليتك الشخصية؟`;
        }

        if (isMismatch) {
            // Show custom confirmation dialog
            if (!confirm(warningMessage)) {
                return; // User cancelled
            }
        }
    }
    // ----------------------------------

    // Check if already in cart
    const existingIndex = cart.findIndex(item =>
        item.familyId === familyId &&
        item.date === selectedDate &&
        // Check if ANY of the selected slots match (simplified for now, ideally exact set match)
        item.timeSlot[0] === selectedTimeSlot[0]
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
        checkoutBtn.style.pointerEvents = 'none';
        checkoutBtn.style.opacity = '0.5';
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

    // Enable button (remove disabled style/behavior)
    checkoutBtn.style.pointerEvents = 'auto';
    checkoutBtn.style.opacity = '1';
    // Validation removed for debugging
    // checkoutBtn.onclick = window.validateCheckout;
}

// Remove from Cart
window.removeFromCart = function (index) {
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

// Validate Checkout (for Anchor Tag)
function validateCheckout(event) {
    console.log('Validating checkout...');

    // Safety check for empty cart
    if (!cart || cart.length === 0) {
        event.preventDefault(); // Stop navigation
        if (typeof showToast === 'function') showToast('تنبيه', 'السلة فارغة', 'warning');
        else alert('السلة فارغة');
        return false;
    }

    // Check if user is logged in
    const userString = localStorage.getItem('karam_user');
    const user = userString ? JSON.parse(userString) : null;

    if (!user) {
        event.preventDefault(); // Stop navigation
        if (typeof showToast === 'function') showToast('تنبيه', 'يجب تسجيل الدخول أولاً', 'warning');
        else alert('يجب تسجيل الدخول أولاً');

        setTimeout(() => {
            window.location.href = 'login.html?redirect=browse-families-calendar.html';
        }, 1000);
        return false;
    }

    // If all good, allow navigation
    return true;
}

// Expose globally
window.validateCheckout = validateCheckout;
window.searchFamilies = searchFamilies;
window.addToCart = addToCart;
window.selectTimeSlot = selectTimeSlot;
window.changeGuestCount = changeGuestCount;
