// ============================================
// Operator Packages Management
// إدارة الباقات للمشغلين
// ============================================

class PackagesManager {
    constructor() {
        this.packages = {};
        this.init();
    }

    async init() {
        try {
            // Check authentication
            if (!karamAuth || !karamAuth.isOperator) {
                window.location.href = 'operator-login.html';
                return;
            }

            await this.loadPackages();
        } catch (error) {
            console.error('Initialization error:', error);
            this.showError('حدث خطأ في تحميل الصفحة');
        }
    }

    async loadPackages() {
        try {
            document.getElementById('loading').style.display = 'block';
            document.getElementById('packages-grid').innerHTML = '';

            const { data, error } = await karamDB.select('package_settings', {
                order: { column: 'package_type', ascending: true }
            });

            if (error) throw error;

            this.packages = {
                basic: data.find(p => p.package_type === 'basic'),
                premium: data.find(p => p.package_type === 'premium')
            };

            this.renderPackages();
        } catch (error) {
            console.error('Error loading packages:', error);
            this.showError('فشل تحميل الباقات');
        } finally {
            document.getElementById('loading').style.display = 'none';
        }
    }

    renderPackages() {
        const grid = document.getElementById('packages-grid');

        // Basic Package
        grid.innerHTML += this.renderPackageCard('basic', this.packages.basic || {
            package_type: 'basic',
            package_name_ar: 'الباقة الأساسية',
            price_per_guest: 50,
            features: ['قهوة عربية', 'تمر', 'ماء']
        });

        // Premium Package
        grid.innerHTML += this.renderPackageCard('premium', this.packages.premium || {
            package_type: 'premium',
            package_name_ar: 'الباقة المتميزة',
            price_per_guest: 100,
            features: ['قهوة عربية فاخرة', 'تمر فاخر', 'عصائر طازجة', 'حلويات', 'فواكه موسمية']
        });

        // Attach event listeners
        this.attachEventListeners();
    }

    renderPackageCard(type, packageData) {
        const icon = type === 'basic' ? '🎁' : '⭐';
        const features = Array.isArray(packageData.features)
            ? packageData.features
            : (typeof packageData.features === 'string' ? JSON.parse(packageData.features) : []);

        return `
            <div class="package-card ${type}">
                <div class="package-header">
                    <span style="font-size: 48px;">${icon}</span>
                    <h2>${packageData.package_name_ar}</h2>
                </div>

                <div class="form-group">
                    <label>💰 السعر للضيف الواحد (ريال سعودي)</label>
                    <input 
                        type="number" 
                        id="${type}-price" 
                        value="${packageData.price_per_guest || 0}"
                        min="0"
                        step="0.01"
                        placeholder="أدخل السعر"
                    />
                    <div class="price-preview">
                        <div class="amount">${packageData.price_per_guest || 0} ر.س</div>
                        <small style="color: #666;">للضيف الواحد</small>
                    </div>
                </div>

                <div class="features-section">
                    <h3>📋 مواصفات الباقة:</h3>
                    <div class="features-list" id="${type}-features">
                        ${features.map((feature, index) => this.renderFeatureItem(type, feature, index)).join('')}
                    </div>
                    <button class="btn-add-feature" onclick="packagesManager.addFeature('${type}')">
                        ➕ إضافة مواصفة جديدة
                    </button>
                </div>

                <button class="btn-save" onclick="packagesManager.savePackage('${type}')">
                    💾 حفظ التغييرات
                </button>

                <div id="${type}-status" class="status-message" style="display: none;"></div>
            </div>
        `;
    }

    renderFeatureItem(packageType, feature, index) {
        return `
            <div class="feature-item" data-index="${index}">
                <span style="font-size: 20px;">✓</span>
                <input 
                    type="text" 
                    value="${feature}" 
                    placeholder="أدخل المواصفة"
                    data-package="${packageType}"
                    data-index="${index}"
                />
                <button 
                    class="btn-remove" 
                    onclick="packagesManager.removeFeature('${packageType}', ${index})"
                >
                    ✕
                </button>
            </div>
        `;
    }

    attachEventListeners() {
        // Live price preview update
        ['basic', 'premium'].forEach(type => {
            const priceInput = document.getElementById(`${type}-price`);
            if (priceInput) {
                priceInput.addEventListener('input', (e) => {
                    const preview = e.target.parentElement.querySelector('.price-preview .amount');
                    if (preview) {
                        preview.textContent = `${e.target.value || 0} ر.س`;
                    }
                });
            }
        });
    }

    addFeature(packageType) {
        const featuresList = document.getElementById(`${packageType}-features`);
        const currentFeatures = featuresList.querySelectorAll('.feature-item');
        const newIndex = currentFeatures.length;

        const newFeature = this.renderFeatureItem(packageType, '', newIndex);
        featuresList.insertAdjacentHTML('beforeend', newFeature);

        // Focus on the new input
        const inputs = featuresList.querySelectorAll('input');
        inputs[inputs.length - 1].focus();
    }

    removeFeature(packageType, index) {
        const featuresList = document.getElementById(`${packageType}-features`);
        const features = featuresList.querySelectorAll('.feature-item');

        if (features.length <= 1) {
            alert('⚠️ يجب أن تحتوي الباقة على مواصفة واحدة على الأقل');
            return;
        }

        features[index].remove();

        // Re-index remaining features
        this.reindexFeatures(packageType);
    }

    reindexFeatures(packageType) {
        const featuresList = document.getElementById(`${packageType}-features`);
        const features = featuresList.querySelectorAll('.feature-item');

        features.forEach((item, index) => {
            item.setAttribute('data-index', index);
            const input = item.querySelector('input');
            input.setAttribute('data-index', index);

            const removeBtn = item.querySelector('.btn-remove');
            removeBtn.setAttribute('onclick', `packagesManager.removeFeature('${packageType}', ${index})`);
        });
    }

    async savePackage(packageType) {
        try {
            const statusDiv = document.getElementById(`${packageType}-status`);
            statusDiv.style.display = 'none';

            // Get price
            const priceInput = document.getElementById(`${packageType}-price`);
            const price = parseFloat(priceInput.value);

            if (!price || price <= 0) {
                this.showStatus(packageType, 'error', '⚠️ يرجى إدخال سعر صحيح');
                return;
            }

            // Get features
            const featuresList = document.getElementById(`${packageType}-features`);
            const featureInputs = featuresList.querySelectorAll('input[type="text"]');
            const features = [];

            featureInputs.forEach(input => {
                const value = input.value.trim();
                if (value) {
                    features.push(value);
                }
            });

            if (features.length === 0) {
                this.showStatus(packageType, 'error', '⚠️ يرجى إضافة مواصفة واحدة على الأقل');
                return;
            }

            // Prepare data
            const packageData = {
                package_type: packageType,
                price_per_guest: price,
                features: JSON.stringify(features),
                updated_at: new Date().toISOString()
            };

            // Check if package exists
            const existingPackage = this.packages[packageType];

            let result;
            if (existingPackage && existingPackage.id) {
                // Update existing package
                result = await karamDB.update(
                    'package_settings',
                    packageData,
                    { id: existingPackage.id }
                );
            } else {
                // Insert new package
                packageData.package_name_ar = packageType === 'basic' ? 'الباقة الأساسية' : 'الباقة المتميزة';
                packageData.package_name_en = packageType === 'basic' ? 'Basic Package' : 'Premium Package';
                packageData.is_active = true;

                result = await karamDB.insert('package_settings', packageData);
            }

            if (result.error) throw result.error;

            this.showStatus(packageType, 'success', '✅ تم حفظ الباقة بنجاح!');

            // Reload packages after a short delay
            setTimeout(() => {
                this.loadPackages();
            }, 1500);

        } catch (error) {
            console.error('Error saving package:', error);
            this.showStatus(packageType, 'error', '❌ فشل حفظ الباقة: ' + error.message);
        }
    }

    showStatus(packageType, type, message) {
        const statusDiv = document.getElementById(`${packageType}-status`);
        statusDiv.className = `status-message ${type}`;
        statusDiv.textContent = message;
        statusDiv.style.display = 'block';

        // Auto-hide success messages
        if (type === 'success') {
            setTimeout(() => {
                statusDiv.style.display = 'none';
            }, 3000);
        }
    }

    showError(message) {
        const grid = document.getElementById('packages-grid');
        grid.innerHTML = `
            <div style="grid-column: 1/-1; text-align: center; padding: 40px;">
                <div style="font-size: 48px; margin-bottom: 20px;">⚠️</div>
                <h3 style="color: #ef4444;">${message}</h3>
                <button 
                    onclick="packagesManager.loadPackages()" 
                    style="margin-top: 20px; padding: 12px 24px; background: #667eea; color: white; border: none; border-radius: 8px; cursor: pointer;"
                >
                    إعادة المحاولة
                </button>
            </div>
        `;
    }
}

// Initialize
const packagesManager = new PackagesManager();

console.log('✅ Operator Packages Manager initialized');
