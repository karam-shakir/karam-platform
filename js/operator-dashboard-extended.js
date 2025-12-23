/**
 * Additional Operator Dashboard Functions
 * وظائف إضافية للوحة تحكم المشغل
 */

// Load Upcoming Bookings
async function loadBookings() {
    try {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const tomorrowStr = tomorrow.toISOString().split('T')[0];

        // Get tomorrow's bookings
        const { data: tomorrowBookings, error: tomorrowError } = await supabase
            .from('bookings')
            .select(`
                *,
                user_profiles!visitor_id(full_name, phone),
                host_families(family_name),
                booking_time_slots(*)
            `)
            .eq('booking_date', tomorrowStr)
            .in('status', ['pending', 'confirmed'])
            .order('booking_date', { ascending: true });

        if (tomorrowError) throw tomorrowError;

        // Render tomorrow's bookings
        const tomorrowTable = document.getElementById('tomorrow-bookings-table');
        if (tomorrowTable) {
            if (!tomorrowBookings || tomorrowBookings.length === 0) {
                tomorrowTable.innerHTML = `
                    <tr><td colspan="8" class="text-center text-muted">لا توجد حجوزات للغد</td></tr>
                `;
            } else {
                tomorrowTable.innerHTML = tomorrowBookings.map(booking => {
                    const timeSlot = booking.booking_time_slots?.[0];
                    const visitorNames = booking.visitor_names || [];
                    return `
                        <tr>
                            <td><strong>${booking.booking_number}</strong></td>
                            <td>${booking.host_families?.family_name || 'غير معروف'}</td>
                            <td>${booking.user_profiles?.full_name || 'غير معروف'}<br>
                                <small class="text-muted">${booking.user_profiles?.phone || ''}</small>
                            </td>
                            <td>${new Date(booking.booking_date).toLocaleDateString('ar-SA')}</td>
                            <td>${timeSlot?.start_time || ''} - ${timeSlot?.end_time || ''}</td>
                            <td>${timeSlot?.guest_count || 0} ضيف</td>
                            <td><span class="status-badge status-${booking.status}">${getStatusLabel(booking.status)}</span></td>
                            <td>
                                <button class="btn btn-sm btn-text" onclick="viewBookingDetails('${booking.id}')">عرض</button>
                            </td>
                        </tr>
                    `;
                }).join('');
            }
        }

        // Get all upcoming bookings
        const today = new Date().toISOString().split('T')[0];
        const { data: upcomingBookings, error: upcomingError } = await supabase
            .from('bookings')
            .select(`
                *,
                user_profiles!visitor_id(full_name),
                host_families(family_name),
                booking_time_slots(*)
            `)
            .gte('booking_date', today)
            .in('status', ['pending', 'confirmed'])
            .order('booking_date', { ascending: true })
            .limit(50);

        if (upcomingError) throw upcomingError;

        // Render upcoming bookings
        const upcomingTable = document.getElementById('upcoming-bookings-table');
        if (upcomingTable) {
            if (!upcomingBookings || upcomingBookings.length === 0) {
                upcomingTable.innerHTML = `
                    <tr><td colspan="8" class="text-center text-muted">لا توجد حجوزات قادمة</td></tr>
                `;
            } else {
                upcomingTable.innerHTML = upcomingBookings.map(booking => {
                    const timeSlot = booking.booking_time_slots?.[0];
                    return `
                        <tr>
                            <td><strong>${booking.booking_number}</strong></td>
                            <td>${booking.host_families?.family_name || 'غير معروف'}</td>
                            <td>${booking.user_profiles?.full_name || 'غير معروف'}</td>
                            <td>${new Date(booking.booking_date).toLocaleDateString('ar-SA')}</td>
                            <td>${timeSlot?.start_time || ''} - ${timeSlot?.end_time || ''}</td>
                            <td>${parseFloat(booking.total_amount || 0).toFixed(2)} ر.س</td>
                            <td><span class="status-badge status-${booking.status}">${getStatusLabel(booking.status)}</span></td>
                            <td>
                                <button class="btn btn-sm btn-text" onclick="viewBookingDetails('${booking.id}')">التفاصيل</button>
                            </td>
                        </tr>
                    `;
                }).join('');
            }
        }

    } catch (error) {
        console.error('Error loading bookings:', error);
        showToast('خطأ', 'فشل تحميل الحجوزات', 'error');
    }
}

// View Booking Details
function viewBookingDetails(bookingId) {
    // Implement modal or redirect to details page
    alert('عرض تفاصيل الحجز: ' + bookingId);
    // TODO: Implement full booking details modal
}

// Load Discount Codes
async function loadDiscountCodes() {
    try {
        const { data: codes, error } = await supabase
            .from('discount_codes')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;

        const table = document.getElementById('discount-codes-table');
        if (!table) return;

        if (!codes || codes.length === 0) {
            table.innerHTML = `
                <tr><td colspan="7" class="text-center text-muted">لا توجد أكواد خصم</td></tr>
            `;
            return;
        }

        table.innerHTML = codes.map(code => {
            const validUntil = code.valid_until ? new Date(code.valid_until).toLocaleDateString('ar-SA') : 'غير محدد';
            const usageText = code.usage_limit ? `${code.times_used} / ${code.usage_limit}` : `${code.times_used} / ∞`;
            const discountText = code.discount_type === 'percentage'
                ? `${code.discount_value}%`
                : `${code.discount_value} ر.س`;

            return `
                <tr>
                    <td><strong>${code.code}</strong></td>
                    <td>${code.discount_type === 'percentage' ? 'نسبة مئوية' : 'مبلغ ثابت'}</td>
                    <td>${discountText}</td>
                    <td>${validUntil}</td>
                    <td dir="ltr">${usageText}</td>
                    <td>
                        <span class="status-badge ${code.is_active ? 'status-confirmed' : 'status-cancelled'}">
                            ${code.is_active ? 'نشط' : 'معطل'}
                        </span>
                    </td>
                    <td>
                        <button class="btn btn-sm btn-text" onclick="editDiscountCode('${code.id}')">تعديل</button>
                        <button class="btn btn-sm btn-text" style="color: var(--color-error);" 
                                onclick="deleteDiscountCode('${code.id}', '${code.code}')">حذف</button>
                    </td>
                </tr>
            `;
        }).join('');

    } catch (error) {
        console.error('Error loading discount codes:', error);
        showToast('خطأ', 'فشل تحميل أكواد الخصم', 'error');
    }
}

// Show Add Discount Code Modal
function showAddDiscountCodeModal() {
    const code = prompt('الكود (بلاتحسب القراص او المسافات):');
    if (!code) return;

    const cleanCode = code.trim().toUpperCase();
    const type = confirm('اضغط OK للنسبة المئوية، Cancel للمبلغ الثابت') ? 'percentage' : 'fixed';
    const value = parseFloat(prompt(`قيمة الخصم (${type === 'percentage' ? '%' : 'ريال'}):`));

    if (!value || value <= 0) {
        showToast('خطأ', 'قيمة غير صحيحة', 'error'); return;
    }

    const validUntil = prompt('تاريخ الانتهاء (YYYY-MM-DD) أو اتركه فارغاً:');
    const usageLimit = prompt('الحد الأقصى للاستخدام (أو اتركه فارغاً لغير محدود):');

    createDiscountCode(cleanCode, type, value, validUntil || null, usageLimit ? parseInt(usageLimit) : null);
}

// Create Discount Code
async function createDiscountCode(code, type, value, validUntil, usageLimit) {
    showLoading();

    try {
        const { error } = await supabase
            .from('discount_codes')
            .insert({
                code: code,
                description: `كود خصم ${code}`,
                discount_type: type,
                discount_value: value,
                valid_until: validUntil,
                usage_limit: usageLimit,
                is_active: true
            });

        if (error) throw error;

        hideLoading();
        showToast('نجح', 'تم إنشاء كود الخصم بنجاح', 'success');
        await loadDiscountCodes();

    } catch (error) {
        hideLoading();
        console.error('Error creating discount code:', error);
        showToast('خطأ', 'فشل إنشاء كود الخصم: ' + error.message, 'error');
    }
}

// Edit Discount Code (placeholder)
function editDiscountCode(id) {
    alert('تعديل كود الخصم: ' + id);
    // TODO: Implement edit modal
}

// Delete Discount Code
async function deleteDiscountCode(id, code) {
    if (!confirm(`هل تريد حذف كود "${code}"؟`)) return;

    showLoading();
    try {
        const { error } = await supabase
            .from('discount_codes')
            .delete()
            .eq('id', id);

        if (error) throw error;

        hideLoading();
        showToast('نجح', 'تم حذف كود الخصم', 'success');
        await loadDiscountCodes();

    } catch (error) {
        hideLoading();
        console.error('Error deleting discount code:', error);
        showToast('خطأ', 'فشل حذف كود الخصم', 'error');
    }
}

// Toggle Family Active Status
async function toggleFamilyStatus(familyId, currentStatus) {
    const newStatus = !currentStatus;

    showLoading();
    try {
        const { error } = await supabase
            .from('host_families')
            .update({ is_active: newStatus })
            .eq('id', familyId);

        if (error) throw error;

        hideLoading();
        showToast('نجح', `تم ${newStatus ? 'تفعيل' : 'تعطيل'} الأسرة`, 'success');
        await loadFamilies();

    } catch (error) {
        hideLoading();
        console.error('Error toggling family status:', error);
        showToast('خطأ', 'فشل تغيير حالة الأسرة', 'error');
    }
}

// Print Financial Report
function printFinancialReport() {
    window.print();
}

// Placeholder for AddPricingRuleModal
function showAddPricingRuleModal() {
    alert('إضافة قاعدة تسعير - قريباً');
}

// Placeholder for EditPricingRule
function editPricingRule(id) {
    alert('تعديل قاعدة التسعير: ' + id);
}

// Placeholder for DeletePricingRule  
function deletePricingRule(id) {
    if (!confirm('هل تريد حذف قاعدة التسعير؟')) return;
    alert('حذف قاعدة التسعير: ' + id);
}
