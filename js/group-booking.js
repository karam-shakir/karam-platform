/**
 * ====================================
 * Group Booking System
 * نظام الحجز الجماعي
 * ====================================
 */

// نظام الحجز الجماعي
const GroupBooking = {
    currentBooking: null,
    guests: [],
    selectedPackage: null,
    selectedFamily: null,

    /**
     * بدء عملية حجز جديدة
     */
    startBooking(familyId, packageType) {
        this.currentBooking = {
            id: Date.now(),
            familyId: familyId,
            packageType: packageType,
            createdAt: new Date().toISOString(),
            status: 'pending'
        };

        this.guests = [];
        this.loadFamilyAndPackage(familyId, packageType);
        this.showBookingModal();
    },

    /**
     * تحميل معلومات الأسرة والباقة
     */
    async loadFamilyAndPackage(familyId, packageType) {
        try {
            // جلب معلومات الأسرة
            if (typeof supabase !== 'undefined') {
                const { data: family } = await supabase
                    .from('host_families')
                    .select('*')
                    .eq('id', familyId)
                    .single();

                this.selectedFamily = family;

                // جلب معلومات الباقة
                const { data: pkg } = await supabase
                    .from('packages')
                    .select('*')
                    .eq('family_id', familyId)
                    .eq('type', packageType)
                    .single();

                this.selectedPackage = pkg;
            } else {
                // بيانات افتراضية للاختبار بدون Supabase
                this.selectedFamily = {
                    id: familyId,
                    name: 'أسرة آل محمد',
                    city: 'makkah',
                    address: 'حي العزيزية، مكة المكرمة'
                };

                this.selectedPackage = {
                    type: packageType,
                    price_per_person: packageType === 'meal' ? 300 : 150,
                    name: packageType === 'meal' ? 'وجبة كاملة' : 'ضيافة بسيطة'
                };
            }
        } catch (error) {
            console.error('Error loading family/package:', error);
            // Fallback to default data
            this.selectedFamily = {
                id: familyId,
                name: 'أسرة مستضيفة',
                city: 'makkah'
            };

            this.selectedPackage = {
                type: packageType,
                price_per_person: packageType === 'meal' ? 300 : 150
            };
        }

        this.updatePriceDisplay();
    },

    /**
     * عرض نافذة الحجز
     */
    showBookingModal() {
        const modal = document.createElement('div');
        modal.className = 'booking-modal';
        modal.id = 'group-booking-modal';
        modal.innerHTML = `
            <div class="booking-modal-overlay" onclick="GroupBooking.close()"></div>
            <div class="booking-modal-content">
                <div class="booking-modal-header">
                    <h2>تفاصيل الحجز</h2>
                    <button class="close-booking-modal" onclick="GroupBooking.close()">×</button>
                </div>
                
                <div class="booking-modal-body">
                    <!-- معلومات الباقة -->
                    <div class="booking-summary">
                        <h3>ملخص الحجز</h3>
                        <div class="booking-info">
                            <span class="info-label">الأسرة المضيفة:</span>
                            <span class="info-value" id="family-name">جاري التحميل...</span>
                        </div>
                        <div class="booking-info">
                            <span class="info-label">نوع الباقة:</span>
                            <span class="info-value" id="package-type">جاري التحميل...</span>
                        </div>
                        <div class="booking-info">
                            <span class="info-label">عدد الأشخاص:</span>
                            <span class="info-value" id="guests-count">0</span>
                        </div>
                        <div class="booking-info total-price">
                            <span class="info-label">الإجمالي:</span>
                            <span class="info-value" id="total-price">0 ريال</span>
                        </div>
                    </div>

                    <!-- قائمة الضيوف -->
                    <div class="guests-section">
                        <div class="section-header">
                            <h3>معلومات الزوار</h3>
                            <button class="btn btn-secondary btn-sm" onclick="GroupBooking.addGuest()">
                                + إضافة زائر
                            </button>
                        </div>
                        
                        <div id="guests-list">
                            <!-- سيتم إضافة الضيوف هنا -->
                        </div>
                    </div>

                    <!-- معلومات إضافية -->
                    <div class="additional-info">
                        <h3>ملاحظات إضافية (اختياري)</h3>
                        <textarea 
                            id="booking-notes" 
                            class="form-textarea" 
                            placeholder="أي ملاحظات أو طلبات خاصة..."
                            rows="3"
                        ></textarea>
                    </div>
                </div>

                <div class="booking-modal-footer">
                    <button class="btn btn-outline" onclick="GroupBooking.close()">إلغاء</button>
                    <button class="btn btn-primary" onclick="GroupBooking.proceedToPayment()" id="proceed-btn" disabled>
                        متابعة للدفع
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        // إضافة أول زائر تلقائياً
        this.addGuest();
    },

    /**
     * إضافة زائر جديد
     */
    addGuest() {
        const guestIndex = this.guests.length;
        const guestId = `guest-${Date.now()}-${guestIndex}`;

        const guest = {
            id: guestId,
            fullName: '',
            passportNumber: '',
            visaNumber: '',
            phoneNumber: '',
            communicationMethods: [],
            allergies: '',
            medicalConditions: '',
            dietaryRestrictions: ''
        };

        this.guests.push(guest);
        this.renderGuestForm(guest, guestIndex);
        this.updatePriceDisplay();
        this.checkFormValidity();
    },

    /**
     * عرض نموذج الزائر
     */
    renderGuestForm(guest, index) {
        const guestsList = document.getElementById('guests-list');

        const guestForm = document.createElement('div');
        guestForm.className = 'guest-form';
        guestForm.id = `guest-form-${guest.id}`;
        guestForm.innerHTML = `
            <div class="guest-form-header">
                <h4>الزائر ${index + 1}</h4>
                ${index > 0 ? `<button class="btn-remove-guest" onclick="GroupBooking.removeGuest('${guest.id}')">×</button>` : ''}
            </div>

            <div class="form-grid">
                <!-- الاسم الكامل -->
                <div class="form-group form-grid-full">
                    <label class="form-label">الاسم الكامل *</label>
                    <input 
                        type="text" 
                        class="form-input" 
                        placeholder="الاسم بالكامل كما في جواز السفر"
                        value="${guest.fullName}"
                        onchange="GroupBooking.updateGuest('${guest.id}', 'fullName', this.value)"
                        required
                    />
                </div>

                <!-- رقم الجواز -->
                <div class="form-group">
                    <label class="form-label">رقم جواز السفر</label>
                    <input 
                        type="text" 
                        class="form-input" 
                        placeholder="مثال: A12345678"
                        value="${guest.passportNumber}"
                        onchange="GroupBooking.updateGuest('${guest.id}', 'passportNumber', this.value)"
                    />
                </div>

                <!-- رقم التأشيرة -->
                <div class="form-group">
                    <label class="form-label">رقم التأشيرة</label>
                    <input 
                        type="text" 
                        class="form-input" 
                        placeholder="رقم تأشيرة الدخول"
                        value="${guest.visaNumber}"
                        onchange="GroupBooking.updateGuest('${guest.id}', 'visaNumber', this.value)"
                    />
                </div>

                <!-- رقم الجوال -->
                <div class="form-group form-grid-full">
                    <label class="form-label">رقم الجوال / واتساب / تليجرام *</label>
                    <input 
                        type="tel" 
                        class="form-input" 
                        placeholder="+966xxxxxxxxx أو رقم دولي"
                        value="${guest.phoneNumber}"
                        onchange="GroupBooking.updateGuest('${guest.id}', 'phoneNumber', this.value)"
                        required
                    />
                    <small class="form-hint">يمكن إدخال رقم دولي</small>
                </div>

                <!-- وسائل التواصل -->
                <div class="form-group form-grid-full">
                    <label class="form-label">وسائل التواصل المتاحة *</label>
                    <div class="checkbox-group">
                        <label class="checkbox-label">
                            <input 
                                type="checkbox" 
                                value="phone"
                                onchange="GroupBooking.updateCommunication('${guest.id}', this.value, this.checked)"
                            />
                            مكالمة هاتفية
                        </label>
                        <label class="checkbox-label">
                            <input 
                                type="checkbox" 
                                value="whatsapp"
                                onchange="GroupBooking.updateCommunication('${guest.id}', this.value, this.checked)"
                            />
                            واتساب
                        </label>
                        <label class="checkbox-label">
                            <input 
                                type="checkbox" 
                                value="telegram"
                                onchange="GroupBooking.updateCommunication('${guest.id}', this.value, this.checked)"
                            />
                            تليجرام
                        </label>
                    </div>
                </div>

                <!-- الحساسية -->
                <div class="form-group form-grid-full">
                    <label class="form-label">الحساسية من الأطعمة أو المكسرات</label>
                    <input 
                        type="text" 
                        class="form-input" 
                        placeholder="مثال: حساسية من الفول السوداني، المكسرات، الألبان..."
                        value="${guest.allergies}"
                        onchange="GroupBooking.updateGuest('${guest.id}', 'allergies', this.value)"
                    />
                </div>

                <!-- الحالات الطبية -->
                <div class="form-group form-grid-full">
                    <label class="form-label">الحالات الطبية</label>
                    <div class="checkbox-group">
                        <label class="checkbox-label">
                            <input 
                                type="checkbox" 
                                value="diabetes"
                                onchange="GroupBooking.updateMedical('${guest.id}', this.value, this.checked)"
                            />
                            مرض السكري
                        </label>
                        <label class="checkbox-label">
                            <input 
                                type="checkbox" 
                                value="heart"
                                onchange="GroupBooking.updateMedical('${guest.id}', this.value, this.checked)"
                            />
                            أمراض القلب
                        </label>
                        <label class="checkbox-label">
                            <input 
                                type="checkbox" 
                                value="pressure"
                                onchange="GroupBooking.updateMedical('${guest.id}', this.value, this.checked)"
                            />
                            ضغط الدم
                        </label>
                    </div>
                    <input 
                        type="text" 
                        class="form-input mt-sm" 
                        placeholder="حالات طبية أخرى..."
                        onchange="GroupBooking.updateGuest('${guest.id}', 'medicalConditions', this.value)"
                    />
                </div>

                <!-- قيود غذائية -->
                <div class="form-group form-grid-full">
                    <label class="form-label">قيود غذائية خاصة</label>
                    <input 
                        type="text" 
                        class="form-input" 
                        placeholder="مثال: نباتي، لا يأكل اللحوم، حلال فقط..."
                        value="${guest.dietaryRestrictions}"
                        onchange="GroupBooking.updateGuest('${guest.id}', 'dietaryRestrictions', this.value)"
                    />
                </div>
            </div>
        `;

        guestsList.appendChild(guestForm);
    },

    /**
     * تحديث بيانات الزائر
     */
    updateGuest(guestId, field, value) {
        const guest = this.guests.find(g => g.id === guestId);
        if (guest) {
            guest[field] = value;
            this.checkFormValidity();
        }
    },

    /**
     * تحديث وسائل التواصل
     */
    updateCommunication(guestId, method, checked) {
        const guest = this.guests.find(g => g.id === guestId);
        if (guest) {
            if (checked) {
                if (!guest.communicationMethods.includes(method)) {
                    guest.communicationMethods.push(method);
                }
            } else {
                guest.communicationMethods = guest.communicationMethods.filter(m => m !== method);
            }
            this.checkFormValidity();
        }
    },

    /**
     * تحديث الحالات الطبية
     */
    updateMedical(guestId, condition, checked) {
        const guest = this.guests.find(g => g.id === guestId);
        if (guest) {
            const conditions = guest.medicalConditions ? guest.medicalConditions.split(',') : [];
            if (checked) {
                if (!conditions.includes(condition)) {
                    conditions.push(condition);
                }
            } else {
                const index = conditions.indexOf(condition);
                if (index > -1) {
                    conditions.splice(index, 1);
                }
            }
            guest.medicalConditions = conditions.filter(c => c).join(',');
        }
    },

    /**
     * حذف زائر
     */
    removeGuest(guestId) {
        this.guests = this.guests.filter(g => g.id !== guestId);
        document.getElementById(`guest-form-${guestId}`).remove();
        this.updatePriceDisplay();
        this.checkFormValidity();
    },

    /**
     * حساب السعر حسب عدد الأشخاص
     */
    calculatePrice() {
        if (!this.selectedPackage) return 0;

        const guestCount = this.guests.length;
        let basePrice = this.selectedPackage.price_per_person || 150;

        // تطبيق خصومات للمجموعات
        let discount = 0;
        if (guestCount >= 10) {
            discount = 0.20; // خصم 20% لـ 10 أشخاص فأكثر
        } else if (guestCount >= 5) {
            discount = 0.15; // خصم 15% لـ 5-9 أشخاص
        } else if (guestCount >= 3) {
            discount = 0.10; // خصم 10% لـ 3-4 أشخاص
        }

        const totalBeforeDiscount = basePrice * guestCount;
        const discountAmount = totalBeforeDiscount * discount;
        const total = totalBeforeDiscount - discountAmount;

        return {
            basePrice,
            guestCount,
            totalBeforeDiscount,
            discount: discount * 100,
            discountAmount,
            total
        };
    },

    /**
     * تحديث عرض السعر
     */
    updatePriceDisplay() {
        const pricing = this.calculatePrice();

        // تحديث عدد الأشخاص
        const guestsCountEl = document.getElementById('guests-count');
        if (guestsCountEl) {
            guestsCountEl.textContent = pricing.guestCount;
        }

        // تحديث السعر الإجمالي
        const totalPriceEl = document.getElementById('total-price');
        if (totalPriceEl) {
            let priceHTML = `${pricing.total.toFixed(2)} ريال`;

            if (pricing.discount > 0) {
                priceHTML += ` <small class="discount-badge">خصم ${pricing.discount}%</small>`;
            }

            totalPriceEl.innerHTML = priceHTML;
        }

        // تحديث معلومات الحجز
        if (this.selectedFamily) {
            const familyNameEl = document.getElementById('family-name');
            if (familyNameEl) {
                familyNameEl.textContent = this.selectedFamily.name;
            }
        }

        if (this.selectedPackage) {
            const packageTypeEl = document.getElementById('package-type');
            if (packageTypeEl) {
                const packageNames = {
                    'simple': 'ضيافة بسيطة',
                    'meal': 'وجبة كاملة'
                };
                packageTypeEl.textContent = packageNames[this.selectedPackage.type] || this.selectedPackage.type;
            }
        }
    },

    /**
     * التحقق من صحة النموذج
     */
    checkFormValidity() {
        const isValid = this.guests.length > 0 && this.guests.every(guest => {
            return guest.fullName.trim() !== '' &&
                guest.phoneNumber.trim() !== '' &&
                guest.communicationMethods.length > 0;
        });

        const proceedBtn = document.getElementById('proceed-btn');
        if (proceedBtn) {
            proceedBtn.disabled = !isValid;
        }

        return isValid;
    },

    /**
     * المتابعة للدفع
     */
    async proceedToPayment() {
        if (!this.checkFormValidity()) {
            showNotification('يرجى ملء جميع الحقول المطلوبة', 'error');
            return;
        }

        const pricing = this.calculatePrice();
        const notes = document.getElementById('booking-notes').value;

        // حفظ الحجز في قاعدة البيانات
        try {
            const { data: booking, error } = await supabase
                .from('bookings')
                .insert([
                    {
                        family_id: this.currentBooking.familyId,
                        package_type: this.currentBooking.packageType,
                        guest_count: this.guests.length,
                        total_price: pricing.total,
                        discount_percentage: pricing.discount,
                        notes: notes,
                        status: 'pending',
                        guests_data: JSON.stringify(this.guests)
                    }
                ])
                .select()
                .single();

            if (error) throw error;

            // إضافة للسلة
            Cart.add({
                type: 'booking',
                id: booking.id,
                familyId: this.currentBooking.familyId,
                packageType: this.currentBooking.packageType,
                name: `${this.selectedFamily.name} - ${this.guests.length} أشخاص`,
                price: pricing.total,
                guestCount: this.guests.length,
                discount: pricing.discount
            });

            this.close();
            showNotification('تمت إضافة الحجز للسلة بنجاح', 'success');

            // فتح السلة
            setTimeout(() => {
                Cart.open();
            }, 1000);

        } catch (error) {
            console.error('Error saving booking:', error);
            showNotification('حدث خطأ أثناء حفظ الحجز', 'error');
        }
    },

    /**
     * إغلاق النافذة
     */
    close() {
        const modal = document.getElementById('group-booking-modal');
        if (modal) {
            modal.remove();
        }
        this.currentBooking = null;
        this.guests = [];
    }
};

// تصدير للاستخدام العام
if (typeof window !== 'undefined') {
    window.GroupBooking = GroupBooking;
}
