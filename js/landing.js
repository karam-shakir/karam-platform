// ============================================
// Landing Page JavaScript
// ============================================

class LandingPage {
    constructor() {
        this.init();
    }

    async init() {
        await this.loadPopularMajalis();
        this.setupSmoothScroll();
    }

    async loadPopularMajalis() {
        try {
            // Check if supabaseClient is available
            if (!window.supabaseClient) {
                console.warn('Supabase client not initialized yet');
                document.getElementById('popular-majalis').innerHTML = `
                    <div style="grid-column: 1/-1; text-align:center; padding:40px;">
                        <h3>قريباً...</h3>
                        <p style="color:#666;">سنعرض المجالس المتاحة قريباً</p>
                        <a href="browse-families-calendar.html" class="btn-primary" style="display:inline-block; margin-top:20px;">تصفح الأسر</a>
                    </div>
                `;
                return;
            }

            const { data, error } = await window.supabaseClient
                .from('host_families')
                .select('id, family_name, city, capacity, description, rating, majlis_type')
                .eq('status', 'approved')
                .order('created_at', { ascending: false })
                .limit(6);

            if (error) throw error;

            if (data && data.length > 0) {
                this.renderMajalis(data);
            } else {
                document.getElementById('popular-majalis').innerHTML = `
                    <div style="grid-column: 1/-1; text-align:center; padding:40px;">
                        <div style="font-size:64px; margin-bottom:20px;">🏠</div>
                        <h3>قريباً...</h3>
                        <p style="color:#666;">سنعرض المجالس المتاحة قريباً</p>
                        <a href="browse-families-calendar.html" class="btn-primary" style="display:inline-block; margin-top:20px;">تصفح الأسر</a>
                    </div>
                `;
            }

        } catch (error) {
            console.error('Error loading families:', error);
            document.getElementById('popular-majalis').innerHTML = `
                <p class="text-center" style="grid-column: 1/-1;">
                    <a href="browse-families-calendar.html" class="btn-primary">تصفح جميع المجالس</a>
                </p>
            `;
        }
    }

    renderMajalis(familiesList) {
        const container = document.getElementById('popular-majalis');

        container.innerHTML = familiesList.map(family => {
            const basePrice = 150; // السعر الافتراضي
            const cityName = family.city === 'makkah' ? 'مكة المكرمة' : 'المدينة المنورة';
            const majlisIcon = family.majlis_type === 'men' ? '👨' : family.majlis_type === 'women' ? '👩' : '👨‍👩‍👧‍👦';

            return `
            <div class="feature-card" style="text-align:right;">
                <div style="font-size:64px; margin-bottom:16px;">
                    ${majlisIcon}
                </div>
                <h3>${family.family_name}</h3>
                <p style="margin:12px 0; color:#666; min-height:60px;">
                    ${family.description ? family.description.substring(0, 80) : 'أسرة كريمة تستقبل ضيوف الرحمن'}${family.description && family.description.length > 80 ? '...' : ''}
                </p>
                <div style="display:flex; justify-content:space-between; align-items:center; margin:16px 0; padding-top:16px; border-top:1px solid #e0e0e0;">
                    <div>
                        <span style="font-size:14px; color:#999;">📍 ${cityName}</span><br>
                        <span style="font-size:14px; color:#999;">👥 ${family.capacity || 10} شخص</span>
                    </div>
                    <div>
                        <strong style="font-size:20px; color: var(--color-primary, #2d6a4f);">
                            ${basePrice} ر.س
                        </strong>
                        <span style="font-size:14px; color:#999;">/شخص</span>
                    </div>
                </div>
                <a href="browse-families-calendar.html?family=${family.id}" 
                   style="display:block; width:100%; padding:12px; background:linear-gradient(135deg, #2d6a4f 0%, #40916c 100%); color:white; text-decoration:none; border-radius:8px; text-align:center; font-weight:600; margin-top:12px;">
                    عرض التفاصيل
                </a>
            </div>
        `;
        }).join('');
    }

    setupSmoothScroll() {
        document.querySelectorAll('a[href^="#"]').forEach(anchor => {
            anchor.addEventListener('click', function (e) {
                e.preventDefault();
                const target = document.querySelector(this.getAttribute('href'));
                if (target) {
                    target.scrollIntoView({
                        behavior: 'smooth',
                        block: 'start'
                    });
                }
            });
        });
    }
}

// Initialize
const landingPage = new LandingPage();
