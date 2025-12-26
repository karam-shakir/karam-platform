// Browse Families Logic

// Mock Data (will be replaced by Supabase data)
const MOCK_FAMILIES = [
    {
        id: '1',
        name: 'أسرة آل محمد',
        city: 'makkah',
        address: 'حي العزيزية، مكة المكرمة',
        rating: 4.8,
        reviews: 124,
        image: 'assets/families/family_package_1_1765095884410.png',
        price: 150,
        packages: ['simple', 'meal'],
        features: ['قهوة عربية', 'مجلس أرضي', 'واي فاي'],
        capacity: 15
    },
    {
        id: '2',
        name: 'مجلس الكرم',
        city: 'madinah',
        address: 'حي العوالي، المدينة المنورة',
        rating: 4.9,
        reviews: 85,
        image: 'assets/families/family_package_2_1765095900054.png',
        price: 300,
        packages: ['meal'],
        features: ['وجبة غداء', 'إطلالة', 'موقف خاص'],
        capacity: 20
    },
    {
        id: '3',
        name: 'بيت الضيافة الحجازي',
        city: 'makkah',
        address: 'حي الشوقية، مكة المكرمة',
        rating: 4.5,
        reviews: 42,
        image: 'assets/families/family_package_3_1765095914400.png',
        price: 120,
        packages: ['simple'],
        features: ['تراث قديم', 'تصوير', 'هدايا'],
        capacity: 10
    },
    {
        id: '4',
        name: 'ديوانية الأنصار',
        city: 'madinah',
        address: 'حي قباء، المدينة المنورة',
        rating: 4.7,
        reviews: 156,
        image: 'assets/families/family_package_4_1765095938389.png',
        price: 250,
        packages: ['simple', 'meal'],
        features: ['قريب من الحرم', 'وجبة عشاء', 'مجلس كبير'],
        capacity: 30
    },
    {
        id: '5',
        name: 'دار الضيافة المكية',
        city: 'makkah',
        address: 'حي أجياد، مكة المكرمة',
        rating: 4.6,
        reviews: 78,
        image: 'assets/families/family_package_5_1765095952724.png',
        price: 180,
        packages: ['simple', 'meal'],
        features: ['مدخل جميل', 'ديكور تراثي', 'قهوة سعودية'],
        capacity: 18
    }
];

let families = [];
let cart = [];

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
    await loadFamilies();
    updateCartBadge();

    // Check if user is logged in
    const user = JSON.parse(localStorage.getItem('user') || 'null');
    if (user) {
        document.getElementById('user-name').textContent = user.full_name || 'حسابي';
    }
});

// Load Families
async function loadFamilies() {
    const grid = document.getElementById('families-grid');
    const countSpan = document.getElementById('results-count');

    grid.innerHTML = `
        <div class="loading-state">
            <div class="spinner"></div>
            <p>جاري تحميل الأسر المستضيفة...</p>
        </div>
    `;

    try {
        if (!supabaseClient) {
            throw new Error('Supabase client not initialized');
        }

        const { data, error } = await supabaseClient
            .from('host_families')
            .select(`
                *,
                packages:packages(*)
            `);

        if (error) throw error;

        families = data || [];

        // Mapping fix for UI:
        families = families.map(f => ({
            ...f,
            name: f.family_name || f.name,
            // Ensure array fields exist
            features: f.features || [],
            packages: f.packages || [] // Join result
        }));

        renderFamilies(families);

    } catch (error) {
        console.error('Error loading families:', error);
        grid.innerHTML = '<p class="text-center text-error">حدث خطأ أثناء تحميل البيانات</p>';
    }
}

// Render Families Grid
function renderFamilies(data) {
    const grid = document.getElementById('families-grid');
    const countSpan = document.getElementById('results-count');

    countSpan.textContent = `${data.length} أسرة متاحة`;

    if (data.length === 0) {
        grid.innerHTML = `
            <div class="loading-state">
                <p>لا توجد نتائج تطابق بحثك</p>
                <button class="btn btn-outline btn-sm mt-md" onclick="resetFilters()">عرض الجميع</button>
            </div>
        `;
        return;
    }

    grid.innerHTML = data.map(family => `
        <div class="family-card">
            <div class="card-image-wrapper">
                <img src="${family.image}" alt="${family.name}" class="card-image">
                <div class="card-badge">
                    ${family.city === 'makkah' ? 'مكة المكرمة' : 'المدينة المنورة'}
                </div>
            </div>
            <div class="card-content">
                <div class="card-header">
                    <h3 class="family-name">${family.name}</h3>
                    <div class="rating">
                        <span>★</span>
                        <span>${family.rating}</span>
                        <span class="text-muted text-xs">(${family.reviews})</span>
                    </div>
                </div>
                
                <div class="location">
                    <span>📍</span>
                    <span>${family.address}</span>
                </div>

                <div class="card-features">
                    ${family.features.slice(0, 3).map(f => `<span class="feature-tag">${f}</span>`).join('')}
                </div>

                <div class="card-footer">
                    <div class="price">
                        <span class="price-label">يبدأ من</span>
                        <div>
                            <span class="price-value">${family.price}</span>
                            <span class="price-currency">ريال</span>
                        </div>
                    </div>
                    <button class="btn btn-primary btn-sm" onclick="addToCart('${family.id}')">
                        احجز الآن
                    </button>
                </div>
            </div>
        </div>
    `).join('');
}

// Filter Families
function filterFamilies() {
    const searchTerm = document.getElementById('search-input').value.toLowerCase();
    const cityFilter = document.getElementById('city-filter').value;
    const packageFilter = document.getElementById('package-filter').value;

    const filtered = families.filter(family => {
        const matchesSearch = family.name.toLowerCase().includes(searchTerm) ||
            family.address.toLowerCase().includes(searchTerm);
        const matchesCity = cityFilter ? family.city === cityFilter : true;
        const matchesPackage = packageFilter ? family.packages.includes(packageFilter) : true;

        return matchesSearch && matchesCity && matchesPackage;
    });

    renderFamilies(filtered);
}

// Sort Families
function sortFamilies() {
    const sortValue = document.getElementById('sort-filter').value;
    let sorted = [...families]; // Copy array

    // First filter, then sort
    // (In a real app, we'd filter first then sort the result, but here we sort the source)

    switch (sortValue) {
        case 'price-low':
            sorted.sort((a, b) => a.price - b.price);
            break;
        case 'price-high':
            sorted.sort((a, b) => b.price - a.price);
            break;
        case 'rating':
            sorted.sort((a, b) => b.rating - a.rating);
            break;
    }

    // Re-apply filters to the sorted list
    const searchTerm = document.getElementById('search-input').value.toLowerCase();
    const cityFilter = document.getElementById('city-filter').value;
    const packageFilter = document.getElementById('package-filter').value;

    const finalResult = sorted.filter(family => {
        const matchesSearch = family.name.toLowerCase().includes(searchTerm) ||
            family.address.toLowerCase().includes(searchTerm);
        const matchesCity = cityFilter ? family.city === cityFilter : true;
        const matchesPackage = packageFilter ? family.packages.includes(packageFilter) : true;

        return matchesSearch && matchesCity && matchesPackage;
    });

    renderFamilies(finalResult);
}

// Reset Filters
function resetFilters() {
    document.getElementById('search-input').value = '';
    document.getElementById('city-filter').value = '';
    document.getElementById('package-filter').value = '';
    document.getElementById('sort-filter').value = 'rating';
    renderFamilies(families);
}

// Cart Functions - Updated for Group Booking
function addToCart(familyId, packageType = 'simple') {
    // فتح نموذج الحجز الجماعي بدلاً من الإضافة المباشرة
    if (typeof GroupBooking !== 'undefined') {
        GroupBooking.startBooking(familyId, packageType);
    } else {
        console.error('GroupBooking system not loaded');
        // Fallback: Add directly to cart
        const family = families.find(f => f.id === familyId);
        if (!family) return;

        const cartItem = {
            id: family.id,
            name: family.name,
            price: family.price,
            image: family.image,
            type: 'family',
            details: family.city
        };

        Cart.add(cartItem);
    }
}

// Global cart functions are now handled by Cart.js
// We only need to expose addToCart if it's used by HTML onclick
window.addToCart = addToCart;

// Update badge on load
document.addEventListener('DOMContentLoaded', () => {
    if (window.Karam && window.Karam.Cart) {
        window.Karam.Cart.updateUI();
    }
});
