// ============================================
// Operator Families Management
// ============================================

class FamiliesManager {
    constructor() {
        this.currentFamily = null;
        this.init();
    }

    async init() {
        if (!karamAuth.requireAuth(['operator'])) {
            return;
        }

        await this.loadStats();
        await this.loadFamilies('pending');
    }

    switchTab(tab) {
        document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
        event.target.classList.add('active');

        document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
        document.getElementById(`tab-${tab}`).classList.add('active');

        this.loadFamilies(tab);
    }

    async loadStats() {
        try {
            const { data: all } = await karamDB.select('families', {});
            const { data: pending } = await karamDB.select('families', { eq: { approval_status: 'pending' } });
            const { data: active } = await karamDB.select('families', { eq: { is_active: true } });
            const { data: majlis } = await karamDB.select('majlis', {});

            document.getElementById('total-families').textContent = all?.length || 0;
            document.getElementById('pending-families').textContent = pending?.length || 0;
            document.getElementById('active-families').textContent = active?.length || 0;
            document.getElementById('total-majlis').textContent = majlis?.length || 0;

            document.getElementById('pending-count').textContent = pending?.length || 0;
            document.getElementById('active-count').textContent = active?.length || 0;

        } catch (error) {
            console.error('Error loading stats:', error);
        }
    }

    async loadFamilies(filter) {
        try {
            let query = { select: '*, majlis(count)' };

            if (filter === 'pending') {
                query.eq = { approval_status: 'pending' };
            } else if (filter === 'active') {
                query.eq = { is_active: true };
            }

            const { data, error } = await karamDB.select('families', query);
            if (error) throw error;

            this.renderFamilies(data || [], filter);

        } catch (error) {
            console.error('Error loading families:', error);
        }
    }

    renderFamilies(families, filter) {
        const tbody = document.getElementById(`${filter}-tbody`);

        if (families.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" class="text-center">لا توجد عوائل</td></tr>';
            return;
        }

        if (filter === 'pending') {
            tbody.innerHTML = families.map(f => `
                <tr>
                    <td><strong>${f.family_name}</strong></td>
                    <td>${f.city === 'mecca' ? 'مكة' : 'المدينة'}</td>
                    <td>${f.contact_phone}</td>
                    <td>${i18n.formatDate(f.created_at, { month: 'short', day: 'numeric' })}</td>
                    <td><span class="badge badge-warning">${this.getStatusText(f.approval_status)}</span></td>
                    <td>
                        <div class="action-buttons">
                            <button class="btn-approve" onclick="familiesManager.viewFamily('${f.id}')">👁️ عرض</button>
                            <button class="btn-approve" onclick="familiesManager.approveFamily('${f.id}', true)">✅</button>
                            <button class="btn-reject" onclick="familiesManager.approveFamily('${f.id}', false)">❌</button>
                        </div>
                    </td>
                </tr>
            `).join('');
        } else if (filter === 'active') {
            tbody.innerHTML = families.map(f => `
                <tr>
                    <td><strong>${f.family_name}</strong></td>
                    <td>${f.city === 'mecca' ? 'مكة' : 'المدينة'}</td>
                    <td>${f.majlis?.length || 0}</td>
                    <td>-</td>
                    <td><span class="badge badge-success">نشط</span></td>
                    <td>
                        <button class="btn-complete" onclick="familiesManager.viewFamily('${f.id}')">عرض التفاصيل</button>
                    </td>
                </tr>
            `).join('');
        } else {
            tbody.innerHTML = families.map(f => `
                <tr>
                    <td><strong>${f.family_name}</strong></td>
                    <td>${f.city === 'mecca' ? 'مكة' : 'المدينة'}</td>
                    <td><span class="badge badge-${this.getApprovalClass(f.approval_status)}">${this.getStatusText(f.approval_status)}</span></td>
                    <td><span class="badge ${f.is_active ? 'badge-success' : 'badge-secondary'}">${f.is_active ? 'نشط' : 'غير نشط'}</span></td>
                    <td>${i18n.formatDate(f.created_at, { month: 'short', day: 'numeric' })}</td>
                    <td>
                        <button class="btn-complete" onclick="familiesManager.viewFamily('${f.id}')">عرض</button>
                    </td>
                </tr>
            `).join('');
        }
    }

    getStatusText(status) {
        const statuses = {
            'pending': 'قيد المراجعة',
            'approved': 'موافق عليه',
            'rejected': 'مرفوض'
        };
        return statuses[status] || status;
    }

    getApprovalClass(status) {
        const classes = {
            'pending': 'warning',
            'approved': 'success',
            'rejected': 'danger'
        };
        return classes[status] || 'secondary';
    }

    async viewFamily(familyId) {
        try {
            const { data, error } = await karamDB.select('families', {
                eq: { id: familyId },
                select: '*, majlis(*), wallets(*)',
                single: true
            });

            if (error) throw error;

            this.currentFamily = data;
            this.showFamilyModal(data);

        } catch (error) {
            console.error('Error loading family details:', error);
        }
    }

    showFamilyModal(family) {
        const modal = document.getElementById('family-modal');
        const details = document.getElementById('family-details');

        details.innerHTML = `
            <div style="display:grid; gap:20px;">
                <div>
                    <h3 style="margin-bottom:10px;">📋 المعلومات الأساسية</h3>
                    <table style="width:100%;">
                        <tr><td><strong>اسم العائلة:</strong></td><td>${family.family_name}</td></tr>
                        <tr><td><strong>المدينة:</strong></td><td>${family.city === 'mecca' ? 'مكة المكرمة' : 'المدينة المنورة'}</td></tr>
                        <tr><td><strong>العنوان:</strong></td><td>${family.address || '-'}</td></tr>
                        <tr><td><strong>رقم الجوال:</strong></td><td>${family.contact_phone}</td></tr>
                        <tr><td><strong>البريد الإلكتروني:</strong></td><td>${family.user_id || '-'}</td></tr>
                    </table>
                </div>

                <div>
                    <h3 style="margin-bottom:10px;">📝 الوصف</h3>
                    <p style="background:#f8f9fa; padding:15px; border-radius:8px;">
                        ${family.description_ar || 'لا يوجد وصف'}
                    </p>
                </div>

                <div>
                    <h3 style="margin-bottom:10px;">🏠 المجالس (${family.majlis?.length || 0})</h3>
                    ${family.majlis?.length > 0 ? family.majlis.map(m => `
                        <div style="background:#f8f9fa; padding:15px; margin-bottom:10px; border-radius:8px;">
                            <strong>${m.majlis_name}</strong><br>
                            <small>السعة: ${m.capacity} شخص | النوع: ${m.majlis_type === 'men' ? 'رجال' : 'نساء'}</small>
                        </div>
                    `).join('') : '<p>لا توجد مجالس</p>'}
                </div>

                <div>
                    <h3 style="margin-bottom:10px;">💰 المحفظة</h3>
                    <p><strong>الرصيد:</strong> ${i18n.formatCurrency(family.wallets?.[0]?.balance || 0)}</p>
                </div>

                <div>
                    <h3 style="margin-bottom:10px;">✅ حالة الموافقة</h3>
                    <p>
                        <span class="badge badge-${this.getApprovalClass(family.approval_status)}">
                            ${this.getStatusText(family.approval_status)}
                        </span>
                        ${family.is_active ? '| <span class="badge badge-success">نشط</span>' : ''}
                    </p>
                    ${family.approved_at ? `<p><small>تاريخ الموافقة: ${i18n.formatDate(family.approved_at)}</small></p>` : ''}
                </div>
            </div>
        `;

        modal.style.display = 'block';
    }

    closeModal() {
        document.getElementById('family-modal').style.display = 'none';
        this.currentFamily = null;
    }

    async approveFamily(familyId, approve) {
        const action = approve ? 'الموافقة على' : 'رفض';

        if (!confirm(`هل أنت متأكد من ${action} هذه العائلة؟`)) {
            return;
        }

        try {
            const { user } = await karamDB.getCurrentUser();

            const updateData = {
                approval_status: approve ? 'approved' : 'rejected',
                is_active: approve,
                approved_by: user.id,
                approved_at: new Date().toISOString()
            };

            const { error } = await karamDB.update('families', updateData, { id: familyId });

            if (error) throw error;

            alert(`✅ تم ${action} العائلة بنجاح`);
            await this.loadStats();
            await this.loadFamilies('pending');

        } catch (error) {
            console.error('Error approving family:', error);
            alert('حدث خطأ');
        }
    }

    async approveFamilyFromModal() {
        if (this.currentFamily) {
            await this.approveFamily(this.currentFamily.id, true);
            this.closeModal();
        }
    }

    async rejectFamilyFromModal() {
        if (this.currentFamily) {
            await this.approveFamily(this.currentFamily.id, false);
            this.closeModal();
        }
    }
}

const familiesManager = new FamiliesManager();
