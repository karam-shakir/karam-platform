// ============================================
// Family Majlis Management - FINAL VERSION
// Using global window functions for onclick
// ============================================

class MajlisManager {
    constructor() {
        this.familyData = null;
        this.majlisList = [];
        this.init();
    }

    async init() {
        await karamAuth.checkSession();
        if (!karamAuth.requireAuth(['family'])) return;
        await this.loadFamilyData();
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

            return `
                <div style="border:1px solid #e0e0e0;padding:20px;margin:15px 0;border-radius:12px;background:#fff;box-shadow:0 2px 4px rgba(0,0,0,0.05);">
                    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:15px;">
                        <h3 style="margin:0;color:#1a1a1a;">${this.esc(m.majlis_name)}</h3>
                        <span style="padding:5px 15px;border-radius:20px;font-size:14px;background:${statusBg};color:${statusColor};">${statusText}</span>
                    </div>
                    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px;margin-bottom:15px;color:#666;">
                        <p style="margin:5px 0;"><strong>النوع:</strong> ${m.majlis_type === 'men' ? '👨 رجالي' : '👩 نسائي'}</p>
                        <p style="margin:5px 0;"><strong>السعة:</strong> ${m.capacity} شخص</p>
                        <p style="margin:5px 0;"><strong>السعر:</strong> ${m.base_price} ر.س</p>
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
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    async editMajlis(index) {
        const m = this.majlisList[index];
        if (!m) return alert('❌ المجلس غير موجود');

        const name = prompt('اسم المجلس:', m.majlis_name);
        if (!name || name === m.majlis_name) return;

        const capacity = prompt('السعة:', m.capacity);
        if (!capacity) return;

        const price = prompt('السعر:', m.base_price);
        if (!price) return;

        try {
            const { error } = await karamDB.update('majlis',
                { majlis_name: name, capacity: parseInt(capacity), base_price: parseFloat(price) },
                { id: m.id }
            );
            if (error) throw error;
            alert('✅ تم التحديث');
            await this.loadMajlis();
            await this.loadStats();
        } catch (error) {
            console.error(error);
            alert('❌ خطأ: ' + error.message);
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
        alert('ℹ️ ميزة إضافة المجالس من الواجهة ستكون متاحة قريباً!\n\nحالياً: يمكنك إضافة المجلس من Supabase Dashboard.');
    }
}

// Initialize
const majlisManager = new MajlisManager();

// Global functions for onclick
window.majlisEdit = (i) => majlisManager.editMajlis(i);
window.majlisToggle = (i) => majlisManager.toggleMajlis(i);
window.majlisDelete = (i) => majlisManager.deleteMajlis(i);
