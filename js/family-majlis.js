// ============================================
// Family Majlis Management - ENHANCED VERSION
// Package System + Available Slots Management
// ============================================

class MajlisManager {
    constructor() {
        this.familyData = null;
        this.majlisList = [];
        this.packages = {};
        this.currentMajlisId = null;
        this.availableSlots = [];
        this.init();
    }

    async init() {
        await karamAuth.checkSession();
        if (!karamAuth.requireAuth(['family'])) return;
        await this.loadFamilyData();
        await this.loadPackages(); // Load packages first
        await this.loadStats();
        await this.loadMajlis();
    }

    async loadFamilyData() {
        try {
            const { user } = await karamDB.getCurrentUser();
            const { data, error } = await karamDB.select('families', {
                eq: { user_id: user.id },
                single: true
            });
            if (error) throw error;
            this.familyData = data;
            if (document.getElementById('family-name')) {
                document.getElementById('family-name').textContent = data.family_name;
            }
        } catch (error) {
            console.error('Error loading family:', error);
        }
    }

    // ���� Load packages from database
    async loadPackages() {
        try {
            const { data, error } = await karamDB.select('package_settings', {
                filters: { is_active: true }
            });
            if (error) throw error;

            // Store packages by type
            data.forEach(pkg => {
                this.packages[pkg.package_type] = pkg;
            });

            console.log('✅ Packages loaded:', this.packages);
        } catch (error) {
            console.error('Error loading packages:', error);
        }
    }

    // 📦 Show package details when selected
    showPackageDetails() {
        const packageType = document.getElementById('package-type').value;
        const detailsDiv = document.getElementById('package-details');

        if (!packageType || !this.packages[packageType]) {
            detailsDiv.style.display = 'none';
            return;
        }

        const pkg = this.packages[packageType];
        const features = Array.isArray(pkg.features) ? pkg.features : JSON.parse(pkg.features || '[]');

        // Update price display
        document.getElementById('package-price').textContent =
            `${pkg.price_per_guest} ريال / للضيف الواحد`;

        // Update features list
        const featuresList = document.getElementById('package-features');
        featuresList.innerHTML = features.map(f => `<li style="margin: 5px 0;">${f}</li>`).join('');

        // Show the details
        detailsDiv.style.display = 'block';
    }

    // 🗓️ Add available slot
    async addAvailableSlot() {
        const majlisId = document.getElementById('majlis-id').value;
        if (!majlisId) {
            alert('⚠️ يرجى حفظ المجلس أولاً قبل إضافة الأوقات المتاحة');
            return;
        }

        const date = document.getElementById('slot-date').value;
        const timeSlot = document.getElementById('slot-time').value;

        if (!date || !timeSlot) {
            alert('⚠️ يرجى اختيار التاريخ والفترة الزمنية');
            return;
        }

        // Check if date is in the past
        if (new Date(date) < new Date().setHours(0, 0, 0, 0)) {
            alert('⚠️ لا يمكن إضافة وقت في الماضي');
            return;
        }

        try {
            const { data, error } = await karamDB.insert('available_slots', {
                majlis_id: majlisId,
                available_date: date,
                time_slot: timeSlot,
                is_active: true
            });

            if (error) {
                if (error.message.includes('unique')) {
                    alert('⚠️ هذا الوقت مضاف بالفعل');
                } else {
                    throw error;
                }
                return;
            }

            alert('✅ تمت إضافة الوقت المتاح بنجاح!');

            // Clear inputs
            document.getElementById('slot-date').value = '';
            document.getElementById('slot-time').value = '';

            // Reload slots
            await this.loadAvailableSlots(majlisId);
        } catch (error) {
            console.error('Error adding slot:', error);
            alert('❌ حدث خطأ: ' + error.message);
        }
    }

    // 📋 Load available slots for a majlis
    async loadAvailableSlots(majlisId) {
        if (!majlisId) return;

        try {
            const { data, error } = await karamDB.select('available_slots', {
                filters: { majlis_id: majlisId },
                order: { column: 'available_date', ascending: true }
            });

            if (error) throw error;

            this.availableSlots = data || [];
            this.renderAvailableSlots();
        } catch (error) {
            console.error('Error loading slots:', error);
            this.availableSlots = [];
            this.renderAvailableSlots();
        }
    }

    // 🎨 Render available slots list
    renderAvailableSlots() {
        const container = document.getElementById('available-slots-container');
        if (!container) return;

        if (this.availableSlots.length === 0) {
            container.innerHTML = '<p style="color: #999; font-style: italic;">لم تقم بإضافة أوقات متاحة بعد. أضف أوقاتاً لتمكين الزوار من حجز مجلسك.</p>';
            return;
        }

        const slotNames = {
            morning: '🌅 صباحاً (8:00 - 12:00)',
            afternoon: '☀️ ظهراً (12:00 - 16:00)',
            evening: '🌆 مساءً (16:00 - 20:00)',
            night: '🌙 ليلاً (20:00 - 00:00)'
        };

        const html = this.availableSlots.map((slot, index) => {
            const date = new Date(slot.available_date).toLocaleDateString('ar-SA');
            const status = slot.is_active ? '✅ نشط' : '⏸️ معطل';
            const statusColor = slot.is_active ? '#10b981' : '#666';

            return `
                <div style="background: #f8f9fa; padding: 12px; border-radius: 8px; margin-bottom: 10px; display: flex; justify-content: space-between; align-items: center;">
                    <div>
                        <strong style="color: #1e3a8a;">${date}</strong>
                        <span style="margin-right: 10px;">${slotNames[slot.time_slot]}</span>
                        <span style="color: ${statusColor}; font-size: 12px;">${status}</span>
                    </div>
                    <div>
                        <button onclick="majlisManager.toggleSlot('${slot.id}', ${!slot.is_active})" 
                                style="padding: 6px 12px; margin-left: 5px; border: none; border-radius: 6px; background: #f59e0b; color: white; cursor: pointer; font-size: 12px;">
                            ${slot.is_active ? '⏸️ تعطيل' : '▶️ تفعيل'}
                        </button>
                        <button onclick="majlisManager.removeSlot('${slot.id}')" 
                                style="padding: 6px 12px; border: none; border-radius: 6px; background: #ef4444; color: white; cursor: pointer; font-size: 12px;">
                            🗑️ حذف
                        </button>
                    </div>
                </div>
            `;
        }).join('');

        container.innerHTML = html;
    }

    // 🔄 Toggle slot active status
    async toggleSlot(slotId, newStatus) {
        try {
            const { error } = await karamDB.update('available_slots',
                { is_active: newStatus },
                { id: slotId }
            );

            if (error) throw error;

            alert(`✅ تم ${newStatus ? 'التفعيل' : 'التعطيل'} بنجاح`);
            await this.loadAvailableSlots(this.currentMajlisId);
        } catch (error) {
            console.error('Error toggling slot:', error);
            alert('❌ حدث خطأ: ' + error.message);
        }
    }

    // 🗑️ Remove available slot
    async removeSlot(slotId) {
        if (!confirm('⚠️ هل تريد حذف هذا الوقت المتاح؟')) return;

        try {
            const { error } = await karamDB.delete('available_slots', { id: slotId });
            if (error) throw error;

            alert('✅ تم الحذف بنجاح');
            await this.loadAvailableSlots(this.currentMajlisId);
        } catch (error) {
            console.error('Error removing slot:', error);
            alert('❌ حدث خطأ: ' + error.message);
        }
    }

    async loadStats() {
        try {
            if (!this.familyData) return;
            const { data } = await karamDB.select('majlis', {
                eq: { family_id: this.familyData.id }
            });
            const total = data?.length || 0;
            const active = data?.filter(m => m.is_active).length || 0;
            const capacity = data?.reduce((sum, m) => sum + m.capacity, 0) || 0;

            if (document.getElementById('total-majlis')) document.getElementById('total-majlis').textContent = total;
            if (document.getElementById('active-majlis')) document.getElementById('active-majlis').textContent = active;
            if (document.getElementById('total-capacity')) document.getElementById('total-capacity').textContent = capacity;
        } catch (error) {
            console.error('Error loading stats:', error);
        }
    }

    async loadMajlis() {
        try {
            if (!this.familyData) return;
            const { data, error } = await karamDB.select('majlis', {
                eq: { family_id: this.familyData.id },
                order: { column: 'created_at', ascending: false }
            });
            if (error) throw error;
            this.majlisList = data || [];
            this.render();
        } catch (error) {
            console.error('Error loading majlis:', error);
            this.majlisList = [];
            this.render();
        }
    }

    render() {
        const container = document.getElementById('majlis-list');
        if (!container) return;

        if (!this.majlisList || this.majlisList.length === 0) {
            container.innerHTML = '<p style="text-align:center;color:#666;padding:40px;">لا توجد مجالس. اضغط "إضافة مجلس" للبدء.</p>';
            return;
        }

        const cards = this.majlisList.map((m, i) => {
            const statusBg = m.is_active ? '#e8f5e9' : '#f5f5f5';
            const statusColor = m.is_active ? '#2e7d32' : '#757575';
            const statusText = m.is_active ? '✅ نشط' : '⏸️ معطل';
            const toggleBg = m.is_active ? '#ff9800' : '#4caf50';
            const toggleText = m.is_active ? '⏸️ تعطيل' : '▶️ تفعيل';

            // Display package info if available
            const packageInfo = m.package_type ?
                `<p style="margin:5px 0;"><strong>الباقة:</strong> ${m.package_type === 'basic' ? '🎁 أساسية' : '⭐ متميزة'} (${m.package_price || 0} ر.س)</p>` :
                `<p style="margin:5px 0;"><strong>السعر:</strong> ${m.base_price} ر.س</p>`;

            return `
                <div style="border:1px solid #e0e0e0;padding:20px;margin:15px 0;border-radius:12px;background:#fff;box-shadow:0 2px 4px rgba(0,0,0,0.05);">
                    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:15px;">
                        <h3 style="margin:0;color:#1a1a1a;">${this.esc(m.majlis_name || m.name)}</h3>
                        <span style="padding:5px 15px;border-radius:20px;font-size:14px;background:${statusBg};color:${statusColor};">${statusText}</span>
                    </div>
                    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px;margin-bottom:15px;color:#666;">
                        <p style="margin:5px 0;"><strong>النوع:</strong> ${m.majlis_type === 'men' ? '👨 رجالي' : '👩 نسائي'}</p>
                        <p style="margin:5px 0;"><strong>السعة:</strong> ${m.capacity} شخص</p>
                        ${packageInfo}
                    </div>
                    ${m.description_ar ? `<p style="color:#666;margin:10px 0;">${this.esc(m.description_ar)}</p>` : ''}
                    <div style="display:flex;gap:10px;margin-top:15px;">
                        <button onclick="window.majlisEdit(${i})" style="flex:1;padding:10px;border:none;border-radius:8px;background:#2196f3;color:white;cursor:pointer;font-weight:500;">✏️ تعديل</button>
                        <button onclick="window.majlisToggle(${i})" style="flex:1;padding:10px;border:none;border-radius:8px;background:${toggleBg};color:white;cursor:pointer;font-weight:500;">${toggleText}</button>
                        <button onclick="window.majlisDelete(${i})" style="flex:1;padding:10px;border:none;border-radius:8px;background:#f44336;color:white;cursor:pointer;font-weight:500;">🗑️ حذف</button>
                    </div>
                </div>
            `;
        }).join('');

        container.innerHTML = cards;
    }

    esc(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    async editMajlis(index) {
        const m = this.majlisList[index];
        if (!m) return alert('❌ المجلس غير موجود');

        // Open modal in edit mode
        const majlisIdEl = document.getElementById('majlis-id');
        const modalTitleEl = document.getElementById('modal-title');
        const majlisNameEl = document.getElementById('majlis-name');
        const majlisTypeEl = document.getElementById('majlis-type');
        const capacityEl = document.getElementById('capacity');

        if (majlisIdEl) majlisIdEl.value = m.id;
        if (modalTitleEl) modalTitleEl.textContent = '✏️ تعديل المجلس';
        if (majlisNameEl) majlisNameEl.value = m.majlis_name || m.name || '';
        if (majlisTypeEl) majlisTypeEl.value = m.majlis_type || '';
        if (capacityEl) capacityEl.value = m.capacity || '';

        // Set package type if exists
        const packageTypeEl = document.getElementById('package-type');
        const basePriceEl = document.getElementById('base-price');

        if (m.package_type && packageTypeEl) {
            packageTypeEl.value = m.package_type;
            this.showPackageDetails();
        } else if (m.base_price && basePriceEl) {
            // Old format - has base_price
            basePriceEl.value = m.base_price;
        }

        const descArEl = document.getElementById('description-ar');
        const descEnEl = document.getElementById('description-en');
        const locationEl = document.getElementById('location');
        const mapsEl = document.getElementById('maps-url');
        const isActiveEl = document.getElementById('is-active');

        if (descArEl) descArEl.value = m.description_ar || '';
        if (descEnEl) descEnEl.value = m.description_en || '';
        if (locationEl) locationEl.value = m.location || '';
        if (mapsEl) mapsEl.value = m.maps_url || '';
        if (isActiveEl) isActiveEl.checked = m.is_active !== false;

        // Show modal
        document.getElementById('majlisModal').classList.add('active');

        // Show availability section and load slots
        const availSection = document.getElementById('availability-section');
        if (availSection) {
            availSection.style.display = 'block';
            this.currentMajlisId = m.id;
            await this.loadAvailableSlots(m.id);
        }
    }

    async toggleMajlis(index) {
        const m = this.majlisList[index];
        if (!m) return alert('❌ المجلس غير موجود');

        const newStatus = !m.is_active;
        if (!confirm(newStatus ? 'تفعيل المجلس؟' : 'تعطيل المجلس؟')) return;

        try {
            const { error } = await karamDB.update('majlis',
                { is_active: newStatus },
                { id: m.id }
            );
            if (error) throw error;
            alert(`✅ تم ${newStatus ? 'التفعيل' : 'التعطيل'}`);
            await this.loadMajlis();
            await this.loadStats();
        } catch (error) {
            console.error(error);
            alert('❌ خطأ: ' + error.message);
        }
    }

    async deleteMajlis(index) {
        const m = this.majlisList[index];
        if (!m) return alert('❌ المجلس غير موجود');

        if (!confirm('⚠️ حذف المجلس نهائياً؟')) return;

        try {
            const { error } = await karamDB.delete('majlis', { id: m.id });
            if (error) throw error;
            alert('✅ تم الحذف');
            await this.loadMajlis();
            await this.loadStats();
        } catch (error) {
            console.error(error);
            alert('❌ خطأ: ' + error.message);
        }
    }

    showAddModal() {
        // Reset form
        document.getElementById('majlisForm').reset();
        document.getElementById('majlis-id').value = '';
        document.getElementById('modal-title').textContent = '➕ إضافة مجلس جديد';

        // Hide package details
        const packageDetails = document.getElementById('package-details');
        if (packageDetails) packageDetails.style.display = 'none';

        // Hide availability section for new majlis
        const availSection = document.getElementById('availability-section');
        if (availSection) availSection.style.display = 'none';

        // Show modal
        document.getElementById('majlisModal').classList.add('active');
    }

    closeModal() {
        document.getElementById('majlisModal').classList.remove('active');
        this.currentMajlisId = null;
    }

    async saveMajlis(e) {
        e.preventDefault();

        const formData = {
            family_id: this.familyData.id
        };

        // Check if using package system or old base_price
        const packageType = document.getElementById('package-type')?.value;

        if (packageType) {
            // New system: use package
            formData.package_type = packageType;
            // package_price will be set automatically by trigger
        } else {
            // Old system or fallback: use base_price
            const basePrice = document.getElementById('base-price')?.value;
            if (basePrice) {
                formData.base_price = parseFloat(basePrice);
            }
        }

        // Common fields
        formData.majlis_name = document.getElementById('majlis-name').value;
        formData.majlis_type = document.getElementById('majlis-type').value;
        formData.capacity = parseInt(document.getElementById('capacity').value);
        formData.description_ar = document.getElementById('description-ar').value || null;
        formData.description_en = document.getElementById('description-en').value || null;
        formData.location = document.getElementById('location').value || null;
        formData.maps_url = document.getElementById('maps-url').value || null;
        formData.is_active = document.getElementById('is-active').checked;

        // Get amenities
        const amenities = [];
        document.querySelectorAll('.amenity:checked').forEach(cb => {
            amenities.push(cb.value);
        });
        formData.amenities = amenities;

        try {
            const majlisId = document.getElementById('majlis-id').value;

            if (majlisId) {
                // Update
                const { error } = await karamDB.update('majlis', formData, { id: majlisId });
                if (error) throw error;
                alert('✅ تم تحديث المجلس بنجاح!');
            } else {
                // Insert
                const { data, error } = await karamDB.insert('majlis', formData);
                if (error) throw error;
                alert('✅ تم إضافة المجلس بنجاح!\n\nيمكنك الآن تعديل المجلس لإضافة الأوقات المتاحة.');
            }

            this.closeModal();
            await this.loadMajlis();
            await this.loadStats();
        } catch (error) {
            console.error('Error saving majlis:', error);
            alert('❌ حدث خطأ: ' + error.message);
        }
    }
}

// Initialize
const majlisManager = new MajlisManager();

// Global functions for onclick - CRITICAL for buttons to work!
window.majlisEdit = (index) => majlisManager.editMajlis(index);
window.majlisToggle = (index) => majlisManager.toggleMajlis(index);
window.majlisDelete = (index) => majlisManager.deleteMajlis(index);

console.log('✅ Enhanced Family Majlis Manager initialized with Package System & Available Slots');
