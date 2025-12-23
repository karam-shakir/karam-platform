/**
 * Operator Dashboard - Karam Platform
 * لوحة تحكم المشغل
 */

// Global state
let platformStats = {};

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
    // Check authentication
    const user = JSON.parse(localStorage.getItem('karam_user') || 'null');
    if (!user || user.user_type !== 'admin') {
        window.location.href = 'login.html';
        return;
    }

    // Load all data
    await loadOverview();
    await loadPricing();
    await loadBookings();
    await loadDiscountCodes();
    await loadFinancials();
    await loadFamilies();
    await loadSettings();
});

// Load Overview
async function loadOverview() {
    try {
        // Get total revenue from bookings
        const { data: bookings, error: bookingsError } = await supabase
            .from('bookings')
            .select('total_amount, created_at');

        if (bookingsError) throw bookingsError;

        const totalRevenue = bookings.reduce((sum, b) => sum + parseFloat(b.total_amount || 0), 0);
        const platformCommission = totalRevenue * 0.15;

        // Get active families count
        const { count: familiesCount } = await supabase
            .from('host_families')
            .select('*', { count: 'exact', head: true })
            .eq('status', 'approved');

        // Update stats
        document.getElementById('total-revenue').textContent = `${totalRevenue.toFixed(2)} ر.س`;
        document.getElementById('platform-commission').textContent = `${platformCommission.toFixed(2)} ر.س`;
        document.getElementById('total-bookings').textContent = bookings.length;
        document.getElementById('active-families').textContent = familiesCount || 0;

        platformStats = {
            totalRevenue,
            platformCommission,
            totalBookings: bookings.length,
            activeFamilies: familiesCount
        };

    } catch (error) {
        console.error('Error loading overview:', error);
        showToast('خطأ', 'فشل تحميل النظرة العامة', 'error');
    }
}

// Load Pricing
async function loadPricing() {
    try {
        // Load packages
        const { data: packages, error: packagesError } = await supabase
            .from('packages')
            .select('*')
            .order('price', { ascending: true });

        if (packagesError) throw packagesError;

        const packagesList = document.getElementById('packages-list');
        if (!packagesList) return;

        packagesList.innerHTML = packages.map(pkg => `
            <div class="package-item">
                <div>
                    <strong>${pkg.name}</strong>
                    <p class="text-sm text-muted">${pkg.description || ''}</p>
                </div>
                <div>
                    <input type="number" value="${pkg.price}" class="form-input" 
                           onchange="updatePackagePrice('${pkg.id}', this.value)">
                    <small class="text-muted">ر.س للشخص</small>
                </div>
                <div>
                    <label class="checkbox-label">
                        <input type="checkbox" ${pkg.is_featured ? 'checked' : ''} 
                               onchange="toggleFeatured('${pkg.id}', this.checked)">
                        <span>مميز</span>
                    </label>
                </div>
                <div>
                    <button class="btn btn-sm btn-text">تعديل</button>
                </div>
            </div>
        `).join('');

        // Load dynamic pricing rules
        const { data: rules, error: rulesError } = await supabase
            .from('dynamic_pricing')
            .select('*')
            .order('priority', { ascending: false });

        if (rulesError && rulesError.code !== 'PGRST116') throw rulesError;

        const rulesList = document.getElementById('pricing-rules-list');
        if (!rulesList) return;

        if (!rules || rules.length === 0) {
            rulesList.innerHTML = '<p class="text-muted">لا توجد قواعد تسعير ديناميكي</p>';
            return;
        }

        rulesList.innerHTML = rules.map(rule => `
            <div class="rule-item">
                <div style="display: flex; justify-content: space-between; margin-bottom: var(--space-sm);">
                    <strong>${getRuleTypeLabel(rule.rule_type)}</strong>
                    <span class="status-badge ${rule.is_active ? 'status-confirmed' : 'status-pending'}">
                        ${rule.is_active ? 'نشط' : 'معطل'}
                    </span>
                </div>
                <div class="text-sm text-muted">
                    ${rule.adjustment_type === 'percentage' ? '+' : ''}${rule.adjustment_value}${rule.adjustment_type === 'percentage' ? '%' : ' ر.س'}
                    ${rule.valid_from ? `من ${rule.valid_from}` : ''}
                    ${rule.valid_until ? ` إلى ${rule.valid_until}` : ''}
                </div>
                <div style="margin-top: var(--space-sm);">
                    <button class="btn btn-sm btn-text" onclick="editPricingRule('${rule.id}')">تعديل</button>
                    <button class="btn btn-sm btn-text" style="color: var(--color-error);" 
                            onclick="deletePricingRule('${rule.id}')">حذف</button>
                </div>
            </div>
        `).join('');

    } catch (error) {
        console.error('Error loading pricing:', error);
        showToast('خطأ', 'فشل تحميل الأسعار', 'error');
    }
}

// Load Financials
async function loadFinancials() {
    try {
        // Get earnings grouped by family
        const { data: earnings, error } = await supabase
            .from('family_earnings')
            .select(`
                *,
                host_families(family_name)
            `)
            .order('created_at', { ascending: false });

        if (error && error.code !== 'PGRST116') throw error;

        if (!earnings || earnings.length === 0) {
            document.getElementById('family-earnings-table').innerHTML = `
                <tr><td colspan="7" class="text-center text-muted">لا توجد بيانات مالية</td></tr>
            `;
            return;
        }

        // Group by family
        const familyData = {};
        earnings.forEach(earning => {
            const familyId = earning.family_id;
            if (!familyData[familyId]) {
                familyData[familyId] = {
                    name: earning.host_families?.family_name || 'غير معروف',
                    count: 0,
                    total: 0,
                    commission: 0,
                    net: 0,
                    pending: 0
                };
            }
            familyData[familyId].count++;
            familyData[familyId].total += parseFloat(earning.total_amount || 0);
            familyData[familyId].commission += parseFloat(earning.platform_commission || 0);
            familyData[familyId].net += parseFloat(earning.net_amount || 0);
            if (earning.status === 'pending') {
                familyData[familyId].pending += parseFloat(earning.net_amount || 0);
            }
        });

        // Render table
        const table = document.getElementById('family-earnings-table');
        table.innerHTML = Object.entries(familyData).map(([familyId, data]) => `
            <tr>
                <td>${data.name}</td>
                <td>${data.count}</td>
                <td>${data.total.toFixed(2)} ر.س</td>
                <td>${data.commission.toFixed(2)} ر.س</td>
                <td><strong>${data.net.toFixed(2)} ر.س</strong></td>
                <td>
                    ${data.pending > 0 ?
                `<span class="status-badge status-pending">${data.pending.toFixed(2)} معلق</span>` :
                '<span class="status-badge status-confirmed">مدفوع</span>'
            }
                </td>
                <td>
                    ${data.pending > 0 ?
                `<button class="btn btn-sm btn-primary" onclick="processPayout('${familyId}')">دفع</button>` :
                '-'
            }
                </td>
            </tr>
        `).join('');

        // Update stats
        const thisMonth = earnings.filter(e => {
            const date = new Date(e.created_at);
            return date.getMonth() === new Date().getMonth();
        });

        document.getElementById('this-month-revenue').textContent =
            `${thisMonth.reduce((sum, e) => sum + parseFloat(e.total_amount || 0), 0).toFixed(2)} ر.س`;

        document.getElementById('pending-payouts').textContent =
            `${earnings.filter(e => e.status === 'pending').reduce((sum, e) => sum + parseFloat(e.net_amount || 0), 0).toFixed(2)} ر.س`;

    } catch (error) {
        console.error('Error loading financials:', error);
        showToast('خطأ', 'فشل تحميل التقارير المالية', 'error');
    }
}

// Load Families
async function loadFamilies() {
    try {
        // Pending families
        const { data: pending, error: pendingError } = await supabase
            .from('host_families')
            .select('*')
            .eq('status', 'pending')
            .order('created_at', { ascending: false });

        if (pendingError) throw pendingError;

        const pendingList = document.getElementById('pending-families-list');
        if (!pendingList) return;

        if (!pending || pending.length === 0) {
            pendingList.innerHTML = '<p class="text-muted">لا توجد أسر بانتظار الموافقة</p>';
        } else {
            pendingList.innerHTML = pending.map(family => `
                <div class="family-approval-card">
                    <h4>${family.family_name}</h4>
                    <div class="text-sm text-muted">
                        📍 ${family.city === 'makkah' ? 'مكة المكرمة' : 'المدينة المنورة'}<br>
                        👥 السعة: ${family.capacity || 0}<br>
                        📅 تاريخ التسجيل: ${new Date(family.created_at).toLocaleDateString('ar-SA')}
                    </div>
                    <div class="btn-group">
                        <button class="btn btn-success" onclick="approveFamily('${family.id}')">موافقة</button>
                        <button class="btn btn-error" onclick="rejectFamily('${family.id}')">رفض</button>
                        <button class="btn btn-text" onclick="viewFamilyDetails('${family.id}')">التفاصيل</button>
                    </div>
                </div>
            `).join('');
        }

        // All families
        const { data: all, error: allError } = await supabase
            .from('host_families')
            .select('*')
            .order('created_at', { ascending: false });

        if (allError) throw allError;

        const allTable = document.getElementById('all-families-table');
        if (!allTable) return;

        allTable.innerHTML = all.map(family => `
            <tr>
                <td>${family.family_name}</td>
                <td>${family.city === 'makkah' ? 'مكة' : 'المدينة'}</td>
                <td>${family.capacity || 0}</td>
                <td>${family.rating || '-'} ⭐</td>
                <td>${family.total_bookings || 0}</td>
                <td>
                    <span class="status-badge status-${family.status}">
                        ${getStatusLabel(family.status)}
                    </span>
                </td>
                <td>
                    <button class="btn btn-sm btn-text" onclick="viewFamilyDetails('${family.id}')">عرض</button>
                </td>
            </tr>
        `).join('');

    } catch (error) {
        console.error('Error loading families:', error);
        showToast('خطأ', 'فشل تحميل الأسر', 'error');
    }
}

// Load Settings
async function loadSettings() {
    try {
        const { data: settings, error } = await supabase
            .from('platform_settings')
            .select('*');

        if (error) throw error;

        settings.forEach(setting => {
            if (setting.setting_key === 'commission_rate') {
                document.getElementById('commission-rate').value = setting.setting_value.percentage || 15;
            } else if (setting.setting_key === 'booking_advance_days') {
                document.getElementById('min-booking-days').value = setting.setting_value.min || 1;
                document.getElementById('max-booking-days').value = setting.setting_value.max || 90;
            }
        });

        // Settings form submit
        document.getElementById('settings-form').addEventListener('submit', saveSettings);

    } catch (error) {
        console.error('Error loading settings:', error);
    }
}

// Save Settings
async function saveSettings(e) {
    e.preventDefault();

    const commissionRate = document.getElementById('commission-rate').value;
    const minDays = document.getElementById('min-booking-days').value;
    const maxDays = document.getElementById('max-booking-days').value;

    showLoading();

    try {
        // Update commission
        await supabase
            .from('platform_settings')
            .update({ setting_value: { percentage: parseFloat(commissionRate) } })
            .eq('setting_key', 'commission_rate');

        // Update booking advance days
        await supabase
            .from('platform_settings')
            .update({ setting_value: { min: parseInt(minDays), max: parseInt(maxDays) } })
            .eq('setting_key', 'booking_advance_days');

        hideLoading();
        showToast('نجح', 'تم حفظ الإعدادات', 'success');

    } catch (error) {
        hideLoading();
        console.error('Error saving settings:', error);
        showToast('خطأ', 'فشل حفظ الإعدادات', 'error');
    }
}

// Approve Family
async function approveFamily(familyId) {
    if (!confirm('هل تريد الموافقة على هذه الأسرة؟')) return;

    showLoading();
    try {
        const { error } = await supabase
            .from('host_families')
            .update({ status: 'approved', is_featured: true })
            .eq('id', familyId);

        if (error) throw error;

        hideLoading();
        showToast('نجح', 'تمت الموافقة على الأسرة', 'success');
        await loadFamilies();

    } catch (error) {
        hideLoading();
        console.error('Error approving family:', error);
        showToast('خطأ', 'فشلت الموافقة', 'error');
    }
}

// Reject Family
async function rejectFamily(familyId) {
    const reason = prompt('الرجاء إدخال سبب الرفض:');
    if (!reason) return;

    showLoading();
    try {
        const { error } = await supabase
            .from('host_families')
            .update({ status: 'rejected' })
            .eq('id', familyId);

        if (error) throw error;

        hideLoading();
        showToast('نجح', 'تم رفض الأسرة', 'success');
        await loadFamilies();

    } catch (error) {
        hideLoading();
        console.error('Error rejecting family:', error);
        showToast('خطأ', 'فشل الرفض', 'error');
    }
}

// Helper Functions
function showSection(section) {
    document.querySelectorAll('.dashboard-section').forEach(s => s.style.display = 'none');
    document.getElementById(`${section}-section`).style.display = 'block';

    document.querySelectorAll('.sidebar-nav .nav-item').forEach(item => item.classList.remove('active'));
    document.querySelector(`[href="#${section}"]`).classList.add('active');
}

function getRuleTypeLabel(type) {
    const labels = {
        weekend: 'عطلة نهاية الأسبوع',
        holiday: 'عطلة رسمية',
        peak_hours: 'ساعات الذروة',
        last_minute: 'حجز لحظة أخيرة',
        early_bird: 'حجز مبكر'
    };
    return labels[type] || type;
}

function getStatusLabel(status) {
    const labels = {
        pending: 'قيد المراجعة',
        approved: 'معتمد',
        rejected: 'مرفوض',
        suspended: 'موقوف'
    };
    return labels[status] || status;
}

function logout() {
    localStorage.removeItem('karam_user');
    window.location.href = 'login.html';
}

// Placeholder functions
function updatePackagePrice(id, price) {
    console.log('Update package', id, 'to', price);
    // TODO: Implement
}

function toggleFeatured(id, featured) {
    console.log('Toggle featured', id, featured);
    // TODO: Implement
}

function processPayout(familyId) {
    console.log('Process payout for', familyId);
    // TODO: Implement
}

function viewFamilyDetails(id) {
    alert('عرض تفاصيل الأسرة: ' + id);
    // TODO: Implement
}
