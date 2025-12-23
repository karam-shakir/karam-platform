// Souvenirs Store Logic

// Mock Data
const MOCK_PRODUCTS = [
    {
        id: 'p1',
        name: 'سبحة خشبية فاخرة',
        category: 'gifts',
        price: 45,
        image: 'assets/souvenirs/souvenir_1.png',
        rating: 4.8,
        reviews: 24,
        description: 'سبحة مصنوعة يدوياً من خشب الزيتون الطبيعي'
    },
    {
        id: 'p2',
        name: 'سجادة صلاة مطرزة',
        category: 'crafts',
        price: 120,
        image: 'assets/souvenirs/souvenir_1.png',
        rating: 4.9,
        reviews: 56,
        description: 'سجادة صلاة فاخرة بتطريز يدوي مستوحى من كسوة الكعبة'
    },
    {
        id: 'p3',
        name: 'تمر عجوة فاخر (1 كجم)',
        category: 'food',
        price: 85,
        image: 'assets/souvenirs/souvenir_1.png',
        rating: 5.0,
        reviews: 112,
        description: 'تمر عجوة المدينة الفاخر، قطف جديد'
    },
    {
        id: 'p4',
        name: 'مبخرة خشبية تراثية',
        category: 'crafts',
        price: 150,
        image: 'assets/souvenirs/souvenir_1.png',
        rating: 4.7,
        reviews: 33,
        description: 'مبخرة بتصميم حجازي تقليدي'
    },
    {
        id: 'p5',
        name: 'ثوب سعودي مطرز',
        category: 'clothing',
        price: 250,
        image: 'assets/souvenirs/souvenir_1.png',
        rating: 4.6,
        reviews: 18,
        description: 'ثوب منزلي مريح بتطريز ناعم'
    },
    {
        id: 'p6',
        name: 'مجموعة قهوة عربية',
        category: 'gifts',
        price: 180,
        image: 'assets/souvenirs/souvenir_1.png',
        rating: 4.9,
        reviews: 45,
        description: 'دلة وفناجين مع قهوة سعودية فاخرة'
    }
];

let products = [];

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
    await loadProducts();

    // Check if user is logged in
    const user = JSON.parse(localStorage.getItem('user') || 'null');
    if (user) {
        document.getElementById('user-name').textContent = user.full_name || 'حسابي';
    }
});

// Load Products
async function loadProducts() {
    const grid = document.getElementById('products-grid');
    const countSpan = document.getElementById('results-count');

    grid.innerHTML = `
        <div class="loading-state">
            <div class="spinner"></div>
            <p>جاري تحميل المنتجات...</p>
        </div>
    `;

    try {
        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 800));

        products = MOCK_PRODUCTS;
        renderProducts(products);

    } catch (error) {
        console.error('Error loading products:', error);
        grid.innerHTML = '<p class="text-center text-error">حدث خطأ أثناء تحميل البيانات</p>';
    }
}

// Render Products Grid
function renderProducts(data) {
    const grid = document.getElementById('products-grid');
    const countSpan = document.getElementById('results-count');

    countSpan.textContent = `${data.length} منتج متاح`;

    if (data.length === 0) {
        grid.innerHTML = `
            <div class="loading-state">
                <p>لا توجد منتجات تطابق بحثك</p>
                <button class="btn btn-outline btn-sm mt-md" onclick="resetFilters()">عرض الجميع</button>
            </div>
        `;
        return;
    }

    grid.innerHTML = data.map(product => `
        <div class="family-card product-card">
            <div class="card-image-wrapper">
                <img src="${product.image}" alt="${product.name}" class="card-image">
                <div class="card-badge">
                    ${getCategoryName(product.category)}
                </div>
            </div>
            <div class="card-content">
                <div class="card-header">
                    <h3 class="family-name">${product.name}</h3>
                    <div class="rating">
                        <span>★</span>
                        <span>${product.rating}</span>
                    </div>
                </div>
                
                <p class="text-muted text-sm mb-md">${product.description}</p>

                <div class="card-footer">
                    <div class="price">
                        <span class="price-label">السعر</span>
                        <div>
                            <span class="price-value">${product.price}</span>
                            <span class="price-currency">ريال</span>
                        </div>
                    </div>
                    <button class="btn btn-primary btn-sm" onclick="addToCart('${product.id}')">
                        أضف للسلة
                    </button>
                </div>
            </div>
        </div>
    `).join('');
}

// Helper: Get Category Name
function getCategoryName(category) {
    const categories = {
        'crafts': 'حرف يدوية',
        'food': 'مأكولات',
        'clothing': 'ملابس',
        'gifts': 'هدايا'
    };
    return categories[category] || category;
}

// Filter Products
function filterProducts() {
    const searchTerm = document.getElementById('search-input').value.toLowerCase();
    const categoryFilter = document.getElementById('category-filter').value;

    const filtered = products.filter(product => {
        const matchesSearch = product.name.toLowerCase().includes(searchTerm) ||
            product.description.toLowerCase().includes(searchTerm);
        const matchesCategory = categoryFilter ? product.category === categoryFilter : true;

        return matchesSearch && matchesCategory;
    });

    renderProducts(filtered);
}

// Sort Products
function sortProducts() {
    const sortValue = document.getElementById('sort-filter').value;
    let sorted = [...products];

    switch (sortValue) {
        case 'price-low':
            sorted.sort((a, b) => a.price - b.price);
            break;
        case 'price-high':
            sorted.sort((a, b) => b.price - a.price);
            break;
        case 'popular':
            sorted.sort((a, b) => b.reviews - a.reviews);
            break;
    }

    // Re-apply filters
    const searchTerm = document.getElementById('search-input').value.toLowerCase();
    const categoryFilter = document.getElementById('category-filter').value;

    const finalResult = sorted.filter(product => {
        const matchesSearch = product.name.toLowerCase().includes(searchTerm) ||
            product.description.toLowerCase().includes(searchTerm);
        const matchesCategory = categoryFilter ? product.category === categoryFilter : true;

        return matchesSearch && matchesCategory;
    });

    renderProducts(finalResult);
}

// Reset Filters
function resetFilters() {
    document.getElementById('search-input').value = '';
    document.getElementById('category-filter').value = '';
    document.getElementById('sort-filter').value = 'popular';
    renderProducts(products);
}

// Add to Cart Wrapper
function addToCart(productId) {
    const product = products.find(p => p.id === productId);
    if (!product) return;

    const cartItem = {
        id: product.id,
        name: product.name,
        price: product.price,
        image: product.image,
        type: 'product',
        details: getCategoryName(product.category)
    };

    Cart.add(cartItem);
}
