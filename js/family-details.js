// ===================================
// Family Details JavaScript
// ===================================

let currentFamily = null;
let currentPackages = [];
let currentImages = [];
let currentImageIndex = 0;
let selectedPackage = null;

// Get family ID from URL
const urlParams = new URL Window.location.search);
const familyId = urlParams.get('id');

// Load family details on page load
document.addEventListener('DOMContentLoaded', () => {
    if (!familyId) {
        window.location.href = 'browse-families.html';
        return;
    }
    loadFamilyDetails();
});

// Load family details from Supabase
async function loadFamilyDetails() {
    try {
        if (!supabase) {
            showError('لم يتم تهيئة قاعدة البيانات');
            return;
        }

        // Fetch family details
        const { data: family, error: familyError } = await supabase
            .from('host_families')
            .select(`
                *,
                user:user_profiles(*),
                images:family_images(*)
            `)
            .eq('id', familyId)
            .eq('status', 'approved')
            .single();

        if (familyError) throw familyError;
        if (!family) {
            showError('لم يتم العثور على الأسرة');
            setTimeout(() => window.location.href = 'browse-families.html', 2000);
            return;
        }

        currentFamily = family;
        currentImages = family.images || [];

        // Fetch packages
        const { data: packages, error: packagesError } = await supabase
            .from('packages')
            .select('*')
            .eq('family_id', familyId)
            .eq('is_active', true);

        if (packagesError) throw packagesError;
        currentPackages = packages || [];

        // Fetch reviews
        const { data: reviews, error: reviewsError } = await supabase
            .from('reviews')
            .select(`
                *,
                visitor:user_profiles(full_name, avatar_url)
            `)
            .eq('family_id', familyId)
            .order('created_at', { ascending: false });

        if (reviewsError) throw reviewsError;

        // Render the page
        renderFamilyDetails(family, packages, reviews || []);

    } catch (error) {
        console.error('Error loading family:', error);
        showError('حدث خطأ في تحميل البيانات');
    }
}

// Render family details
function renderFamilyDetails(family, packages, reviews) {
    const container = document.getElementById('details-container');

    // Update breadcrumb
    document.getElementById('family-breadcrumb').textContent = family.family_name;

    const cityName = family.city === 'makkah' ? 'مكة المكرمة' : 'المدينة المنورة';
    const features = Array.isArray(family.features) ? family.features : [];
    const amenities = family.amenities || {};

    container.innerHTML = `
        <!-- Image Gallery -->
        <div class="family-gallery">
            <div class="main-image">
                <img src="${currentImages[0]?.image_url || 'assets/placeholder-family.jpg'}" 
                     alt="${family.family_name}" 
                     onclick="openGallery(0)">
                ${currentImages.length > 1 ? `
                    <div class="image-count">${currentImages.length} صور</div>
                ` : ''}
            </div>
            ${currentImages.length > 1 ? `
                <div class="thumbnail-grid">
                    ${currentImages.slice(1, 5).map((img, idx) => `
                        <img src="${img.image_url}" 
                             alt="صورة ${idx + 2}" 
                             onclick="openGallery(${idx + 1})">
                    `).join('')}
                    ${currentImages.length > 5 ? `
                        <div class="more-images" onclick="openGallery(5)">
                            +${currentImages.length - 5} صور
                        </div>
                    ` : ''}
                </div>
            ` : ''}
        </div>

        <!-- Family Info -->
        <div class="family-info">
            <div class="info-header">
                <div>
                    <h1 class="family-title">${family.family_name}</h1>
                    <div class="family-meta">
                        <span class="location">📍 ${cityName}</span>
                        <span class="rating">
                            ⭐ ${family.rating || 0} 
                            <span class="reviews-count">(${family.total_reviews || 0} تقييم)</span>
                        </span>
                    </div>
                </div>
                ${family.is_featured ? '<span class="featured-badge">مميزة</span>' : ''}
            </div>

            <div class="info-section">
                <h3>عن الأسرة</h3>
                <p class="description">${family.description || 'لا يوجد وصف متاح'}</p>
            </div>

            ${features.length > 0 ? `
                <div class="info-section">
                    <h3>المميزات</h3>
                    <div class="features-list">
                        ${features.map(f => `<span class="feature-item">✓ ${f}</span>`).join('')}
                    </div>
                </div>
            ` : ''}

            <div class="info-section">
                <h3>الخدمات</h3>
                <div class="amenities-grid">
                    <div class="amenity ${amenities.wifi ? 'available' : 'unavailable'}">
                        📶 واي فاي
                    </div>
                    <div class="amenity ${amenities.parking ? 'available' : 'unavailable'}">
                        🅿️ موقف سيارات
                    </div>
                    <div class="amenity ${amenities.disabled_access ? 'available' : 'unavailable'}">
                        ♿ وصول لذوي الاحتياجات
                    </div>
                    <div class="amenity available">
                        👨‍👩‍👧‍👦 مناسب للعائلات
                    </div>
                </div>
            </div>

            <div class="info-section">
                <h3>معلومات الموقع</h3>
                <p>${family.address}</p>
                <p class="text-muted">السعة القصوى: ${family.capacity} ضيف</p>
            </div>
        </div>

        <!-- Packages Section -->
        <div class="packages-section">
            <h2>الباقات المتاحة</h2>
            <div class="packages-grid">
                ${packages.map(pkg => renderPackageCard(pkg)).join('')}
            </div>
        </div>

        <!-- Reviews Section -->
        <div class="reviews-section">
            <h2>التقييمات (${reviews.length})</h2>
            ${reviews.length > 0 ? `
                <div class="reviews-list">
                    ${reviews.map(review => renderReview(review)).join('')}
                </div>
            ` : '<p class="no-reviews">لا توجد تقييمات بعد</p>'}
        </div>
    `;
}

// Render package card
function renderPackageCard(pkg) {
    const includes = Array.isArray(pkg.includes) ? pkg.includes : [];

    return `
        <div class="package-card">
            <div class="package-header">
                <h3>${pkg.name}</h3>
                ${pkg.discount_price ? `
                    <div class="price">
                        <span class="old-price">${pkg.price} ريال</span>
                        <span class="new-price">${pkg.discount_price} ريال</span>
                    </div>
                ` : `
                    <div class="price">${pkg.price} ريال</div>
                `}
            </div>
            <p class="package-description">${pkg.description || ''}</p>
            <ul class="package-includes">
                ${includes.map(item => `<li>✓ ${item}</li>`).join('')}
            </ul>
            <div class="package-meta">
                <span>⏱️ ${pkg.duration_hours} ساعة</span>
                <span>👥 حتى ${pkg.max_guests} ضيف</span>
            </div>
            <button class="btn btn-primary btn-block" onclick="selectPackage('${pkg.id}')">
                احجز الآن
            </button>
        </div>
    `;
}

// Render review
function renderReview(review) {
    const createdDate = new Date(review.created_at).toLocaleDateString('ar-SA');

    return `
        <div class="review-card">
            <div class="review-header">
                <div class="reviewer-info">
                    <div class="reviewer-avatar">
                        ${review.visitor?.avatar_url ?
            `<img src="${review.visitor.avatar_url}" alt="${review.visitor.full_name}">` :
            '<span>👤</span>'
        }
                    </div>
                    <div>
                        <div class="reviewer-name">${review.visitor?.full_name || 'مستخدم'}</div>
                        <div class="review-date">${createdDate}</div>
                    </div>
                </div>
                <div class="review-rating">
                    ${'⭐'.repeat(review.rating)}
                </div>
            </div>
            <p class="review-comment">${review.comment || ''}</p>
            ${review.response ? `
                <div class="family-response">
                    <strong>رد الأسرة:</strong>
                    <p>${review.response}</p>
                </div>
            ` : ''}
        </div>
    `;
}

// Select package for booking
function selectPackage(packageId) {
    selectedPackage = currentPackages.find(p => p.id === packageId);
    if (!selectedPackage) return;

    // Update booking modal
    document.getElementById('summary-package').textContent = selectedPackage.name;
    const price = selectedPackage.discount_price || selectedPackage.price;
    document.getElementById('summary-price').textContent = `${price} ريال`;
    document.getElementById('summary-total').textContent = `${price} ريال`;

    // Set minimum date to tomorrow
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    document.getElementById('booking-date').min = tomorrow.toISOString().split('T')[0];

    // Show modal
    showBookingModal();
}

// Show booking modal
function showBookingModal() {
    document.getElementById('booking-modal').classList.add('active');
    document.body.style.overflow = 'hidden';
}

// Close booking modal
function closeBookingModal() {
    document.getElementById('booking-modal').classList.remove('active');
    document.body.style.overflow = '';
}

// Handle booking form submission
function handleBooking(event) {
    event.preventDefault();

    if (!selectedPackage) {
        alert('يرجى اختيار باقة');
        return;
    }

    const bookingData = {
        familyId: currentFamily.id,
        familyName: currentFamily.family_name,
        packageId: selectedPackage.id,
        packageName: selectedPackage.name,
        date: document.getElementById('booking-date').value,
        time: document.getElementById('booking-time').value,
        guests: parseInt(document.getElementById('guest-count').value),
        specialRequests: document.getElementById('special-requests').value,
        price: selectedPackage.discount_price || selectedPackage.price
    };

    // Add to cart
    addToCart(bookingData);

    // Close modal
    closeBookingModal();

    // Show success message
    showToast('نجح', 'تمت إضافة الحجز إلى السلة', 'success');

    // Reset form
    event.target.reset();
}

// Gallery functions
function openGallery(index) {
    if (currentImages.length === 0) return;

    currentImageIndex = index;
    const modal = document.getElementById('gallery-modal');
    const img = document.getElementById('gallery-image');

    img.src = currentImages[currentImageIndex].image_url;
    document.getElementById('current-image').textContent = currentImageIndex + 1;
    document.getElementById('total-images').textContent = currentImages.length;

    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeGallery() {
    document.getElementById('gallery-modal').classList.remove('active');
    document.body.style.overflow = '';
}

function nextImage() {
    if (currentImageIndex < currentImages.length - 1) {
        currentImageIndex++;
    } else {
        currentImageIndex = 0;
    }
    document.getElementById('gallery-image').src = currentImages[currentImageIndex].image_url;
    document.getElementById('current-image').textContent = currentImageIndex + 1;
}

function previousImage() {
    if (currentImageIndex > 0) {
        currentImageIndex--;
    } else {
        currentImageIndex = currentImages.length - 1;
    }
    document.getElementById('gallery-image').src = currentImages[currentImageIndex].image_url;
    document.getElementById('current-image').textContent = currentImageIndex + 1;
}

// Show error message
function showError(message) {
    const container = document.getElementById('details-container');
    container.innerHTML = `
        <div class="error-state">
            <p>${message}</p>
            <a href="browse-families.html" class="btn btn-primary">العودة للتصفح</a>
        </div>
    `;
}

// Show toast notification (from main.js)
function showToast(title, message, type = 'info') {
    if (window.Karam && window.Karam.Utils) {
        window.Karam.Utils.showToast(title, message, type);
    } else {
        alert(`${title}: ${message}`);
    }
}
