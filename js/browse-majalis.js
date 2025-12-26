// ============================================
// Browse Majalis Page
// ============================================

class BrowseMajalis {
    constructor() {
        this.allMajalis = [];
        this.filteredMajalis = [];
        this.selectedMajlis = null;
        this.cart = JSON.parse(localStorage.getItem('karam_cart') || '[]');
        this.init();
    }

    async init() {
        await this.loadAllMajalis();
        this.checkURLParams();
    }

    async loadAllMajalis() {
        try {
            // Get all active majalis with family info
            const { data, error } = await window.supabaseClient
                .from('majlis')
                .select(`
                    *,
                    families (
                        id,
                        family_name,
                        city,
                        contact_phone
                    )
                `)
                .eq('is_active', true)
                .order('created_at', { ascending: false });

            if (error) throw error;

            this.allMajalis = data || [];
            this.filteredMajalis = [...this.allMajalis];
            this.renderResults();

        } catch (error) {
            console.error('Error loading majalis:', error);
            document.getElementById('majalis-results').innerHTML = `
                <p class="text-center" style="grid-column: 1/-1; color:#999;">
                    حدث خطأ في تحميل المجالس
                </p>
            `;
        }
    }

    applyFilters() {
        const city = document.getElementById('city-filter').value;
        const type = document.getElementById('type-filter').value;
        const maxPrice = document.getElementById('price-filter').value;
        const minCapacity = document.getElementById('capacity-filter').value;
        const sortBy = document.getElementById('sort-by').value;

        this.filteredMajalis = this.allMajalis.filter(majlis => {
            if (city && majlis.families?.city !== city) return false;
            if (type && majlis.majlis_type !== type) return false;
            if (maxPrice && majlis.base_price > parseFloat(maxPrice)) return false;
            if (minCapacity && majlis.capacity < parseInt(minCapacity)) return false;
            return true;
        });

        // Sort
        switch (sortBy) {
            case 'price-low':
                this.filteredMajalis.sort((a, b) => a.base_price - b.base_price);
                break;
            case 'price-high':
                this.filteredMajalis.sort((a, b) => b.base_price - a.base_price);
                break;
            case 'capacity':
                this.filteredMajalis.sort((a, b) => b.capacity - a.capacity);
                break;
            default: // recent
                this.filteredMajalis.sort((a, b) =>
                    new Date(b.created_at) - new Date(a.created_at)
                );
        }

        this.renderResults();
    }

    resetFilters() {
        document.getElementById('city-filter').value = '';
        document.getElementById('type-filter').value = '';
        document.getElementById('price-filter').value = '';
        document.getElementById('capacity-filter').value = '';
        document.getElementById('sort-by').value = 'recent';
        this.filteredMajalis = [...this.allMajalis];
        this.renderResults();
    }

    renderResults() {
        const container = document.getElementById('majalis-results');
        const count = this.filteredMajalis.length;

        document.getElementById('results-count').textContent = count;

        if (count === 0) {
            container.innerHTML = '';
            document.getElementById('no-results').style.display = 'block';
            return;
        }

        document.getElementById('no-results').style.display = 'none';

        container.innerHTML = this.filteredMajalis.map(majlis => `
            <div class="majlis-result-card">
                <div class="majlis-result-image">
                    ${majlis.photos?.length > 0
                ? `<img src="${majlis.photos[0]}" alt="${majlis.majlis_name}">`
                : '<div class="placeholder-img">🏠</div>'}
                    <span class="type-badge">${this.getTypeBadge(majlis.majlis_type)}</span>
                </div>
                
                <div class="majlis-result-content">
                    <h3>${majlis.majlis_name}</h3>
                    <p class="family-name">📍 ${majlis.families?.family_name || 'عائلة'} - ${this.getCityName(majlis.families?.city)}</p>
                    
                    <p class="majlis-desc">
                        ${majlis.description_ar?.substring(0, 120)}${majlis.description_ar?.length > 120 ? '...' : ''}
                    </p>

                    <div class="majlis-meta">
                        <div class="meta-item">
                            <span>👥</span>
                            <span>${majlis.capacity} شخص</span>
                        </div>
                        ${majlis.amenities?.length > 0 ? `
                            <div class="meta-item">
                                <span>✨</span>
                                <span>${majlis.amenities.length} مرافق</span>
                            </div>
                        ` : ''}
                    </div>

                    <div class="majlis-footer">
                        <div class="price-info">
                            <span class="price">${i18n.formatCurrency(majlis.base_price)}</span>
                            <span class="price-unit">/شخص</span>
                        </div>
                        <button onclick="browseMajalis.viewDetails('${majlis.id}')" class="btn-view">
                            عرض التفاصيل →
                        </button>
                    </div>
                </div>
            </div>
        `).join('');
    }

    getTypeBadge(type) {
        return type === 'men' ? '👨 رجالي' : '👩 نسائي';
    }

    getCityName(city) {
        const cities = {
            'mecca': 'مكة المكرمة',
            'medina': 'المدينة المنورة'
        };
        return cities[city] || city;
    }

    async viewDetails(majlisId) {
        try {
            const { data, error } = await window.supabaseClient
                .from('majlis')
                .select(`
                    *,
                    families (
                        id,
                        family_name,
                        city,
                        contact_phone
                    )
                `)
                .eq('id', majlisId)
                .single();

            if (error) throw error;

            this.selectedMajlis = data;
            this.renderModal(data);
            document.getElementById('majlis-modal').classList.add('active');

        } catch (error) {
            console.error('Error loading majlis details:', error);
            alert('حدث خطأ في تحميل التفاصيل');
        }
    }

    renderModal(majlis) {
        document.getElementById('modal-majlis-name').textContent = majlis.majlis_name;

        const detailsHtml = `
            <!-- Photos -->
            ${majlis.photos?.length > 0 ? `
                <div class="majlis-photos">
                    <img src="${majlis.photos[0]}" alt="${majlis.majlis_name}" class="main-photo">
                    ${majlis.photos.length > 1 ? `
                        <div class="photo-thumbnails">
                            ${majlis.photos.slice(1, 4).map(photo => `
                                <img src="${photo}" alt="صورة">
                            `).join('')}
                        </div>
                    ` : ''}
                </div>
            ` : ''}

            <div class="details-grid">
                <div class="details-main">
                    <div class="detail-section">
                        <h3>📝 الوصف</h3>
                        <p>${majlis.description_ar}</p>
                        ${majlis.description_en ? `<p style="margin-top:12px; color:#666;">${majlis.description_en}</p>` : ''}
                    </div>

                    <div class="detail-section">
                        <h3>📍 الموقع</h3>
                        <p>${majlis.location || 'غير محدد'}</p>
                        ${majlis.maps_url ? `
                            <a href="${majlis.maps_url}" target="_blank" class="btn-map">
                                🗺️ فتح في خرائط جوجل
                            </a>
                        ` : ''}
                    </div>

                    ${majlis.amenities?.length > 0 ? `
                        <div class="detail-section">
                            <h3>✨ المرافق المتاحة</h3>
                            <div class="amenities-tags">
                                ${majlis.amenities.map(amenity => `
                                    <span class="amenity-tag">${this.getAmenityIcon(amenity)} ${this.getAmenityText(amenity)}</span>
                                `).join('')}
                            </div>
                        </div>
                    ` : ''}
                </div>

                <div class="details-sidebar">
                    <div class="booking-card">
                        <div class="price-large">
                            ${i18n.formatCurrency(majlis.base_price)}
                            <span>/شخص</span>
                        </div>

                        <div class="info-list">
                            <div class="info-row">
                                <span>👥 السعة</span>
                                <strong>${majlis.capacity} شخص</strong>
                            </div>
                            <div class="info-row">
                                <span>${this.getTypeBadge(majlis.majlis_type)}</span>
                            </div>
                            <div class="info-row">
                                <span>📍 المدينة</span>
                                <strong>${this.getCityName(majlis.families?.city)}</strong>
                            </div>
                            <div class="info-row">
                                <span>👨‍👩‍👧 العائلة</span>
                                <strong>${majlis.families?.family_name}</strong>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        document.getElementById('majlis-details').innerHTML = detailsHtml;
    }

    getAmenityIcon(amenity) {
        const icons = {
            wifi: '📶',
            parking: '🚗',
            ac: '❄️',
            tv: '📺',
            kitchen: '🍳',
            bathroom: '🚿'
        };
        return icons[amenity] || '✓';
    }

    getAmenityText(amenity) {
        const texts = {
            wifi: 'Wi-Fi',
            parking: 'موقف سيارات',
            ac: 'تكييف',
            tv: 'شاشة تلفاز',
            kitchen: 'مطبخ',
            bathroom: 'دورة مياه'
        };
        return texts[amenity] || amenity;
    }

    async addToCart() {
        // Check if user is logged in
        const { data: { user } } = await window.supabaseClient.auth.getUser();

        if (!user) {
            // Redirect to login with return URL
            window.location.href = '/login.html?return=/browse-families.html';
            return;
        }

        // Add to cart (localStorage for now)
        const cartItem = {
            majlis_id: this.selectedMajlis.id,
            majlis_name: this.selectedMajlis.majlis_name,
            family_name: this.selectedMajlis.families?.family_name,
            price: this.selectedMajlis.base_price,
            capacity: this.selectedMajlis.capacity,
            added_at: new Date().toISOString()
        };

        this.cart.push(cartItem);
        localStorage.setItem('karam_cart', JSON.stringify(this.cart));

        alert('✅ تمت الإضافة للعربة بنجاح!');
        this.closeModal();

        // Ask if they want to continue browsing or go to cart
        if (confirm('هل تريد الذهاب للعربة الآن؟')) {
            window.location.href = '/cart.html';
        }
    }

    closeModal() {
        document.getElementById('majlis-modal').classList.remove('active');
        this.selectedMajlis = null;
    }

    checkURLParams() {
        const params = new URLSearchParams(window.location.search);
        const majlisId = params.get('majlis');
        if (majlisId) {
            this.viewDetails(majlisId);
        }
    }
}

const browseMajalis = new BrowseMajalis();
