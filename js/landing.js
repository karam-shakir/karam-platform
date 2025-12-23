// ===================================
// Landing Page JavaScript
// ===================================

const { Utils, Modal, API, Auth } = window.Karam;

// Show login modal
function showLogin() {
    const content = `
        <form id="login-form" class="form">
            <div class="form-group">
                <label class="form-label">البريد الإلكتروني</label>
                <input type="email" id="login-email" class="form-input" placeholder="example@email.com" required>
            </div>
            <div class="form-group">
                <label class="form-label">كلمة المرور</label>
                <input type="password" id="login-password" class="form-input" placeholder="••••••••" required>
            </div>
            <div class="form-group">
                <label style="display: flex; align-items: center; gap: 8px; cursor: pointer;">
                    <input type="checkbox" id="remember-me">
                    <span>تذكرني</span>
                </label>
            </div>
        </form>
    `;

    const footer = `
        <button class="btn btn-text" onclick="showForgotPassword()">نسيت كلمة المرور؟</button>
        <button class="btn btn-primary" onclick="handleLogin()">تسجيل الدخول</button>
    `;

    const modal = Modal.create('تسجيل الدخول', content, footer);
    Modal.show(modal);
}

// Handle login
async function handleLogin() {
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;

    if (!Utils.validateEmail(email)) {
        Utils.showToast('خطأ', 'يرجى إدخال بريد إلكتروني صحيح', 'error');
        return;
    }

    if (password.length < 6) {
        Utils.showToast('خطأ', 'كلمة المرور يجب أن تكون 6 أحرف على الأقل', 'error');
        return;
    }

    try {
        await Auth.login(email, password);
        const activeModal = document.querySelector('.modal.active');
        if (activeModal) Modal.close(activeModal);

        // Redirect based on user role
        const user = Auth.getUser();
        redirectByRole(user.role);
    } catch (error) {
        console.error(error);
    }
}

// Show register modal
function showRegister() {
    const content = `
        <div class="tabs">
            <button class="tab active" onclick="switchRegisterTab('umrah')">معتمر</button>
            <button class="tab" onclick="switchRegisterTab('family')">أسرة مستضيفة</button>
            <button class="tab" onclick="switchRegisterTab('company')">شركة</button>
        </div>
        <div id="register-content" class="tab-content">
            ${getUmrahRegisterForm()}
        </div>
    `;

    const footer = `
        <button class="btn btn-text" onclick="showLogin()">لديك حساب؟ سجل دخول</button>
        <button class="btn btn-primary" onclick="handleRegister()">إنشاء حساب</button>
    `;

    const modal = Modal.create('إنشاء حساب جديد', content, footer);
    Modal.show(modal);
}

// Register tab content
function getUmrahRegisterForm() {
    return `
        <form id="register-form" class="form">
            <input type="hidden" id="user-role" value="umrah_visitor">
            <div class="form-group">
                <label class="form-label">الاسم الكامل</label>
                <input type="text" id="full-name" class="form-input" placeholder="اسمك الكامل" required>
            </div>
            <div class="form-group">
                <label class="form-label">البريد الإلكتروني</label>
                <input type="email" id="email" class="form-input" placeholder="example@email.com" required>
            </div>
            <div class="form-group">
                <label class="form-label">رقم الجوال</label>
                <input type="tel" id="phone" class="form-input" placeholder="05xxxxxxxx" required>
            </div>
            <div class="form-group">
                <label class="form-label">كلمة المرور</label>
                <input type="password" id="password" class="form-input" placeholder="••••••••" required>
            </div>
            <div class="form-group">
                <label class="form-label">تأكيد كلمة المرور</label>
                <input type="password" id="confirm-password" class="form-input" placeholder="••••••••" required>
            </div>
            <div class="form-group">
                <label style="display: flex; align-items: start; gap: 8px;">
                    <input type="checkbox" id="accept-terms" required>
                    <span>أوافق على <a href="#">الشروط والأحكام</a> و <a href="#">سياسة الخصوصية</a></span>
                </label>
            </div>
        </form>
    `;
}

function getFamilyRegisterForm() {
    return `
        <form id="register-form" class="form">
            <input type="hidden" id="user-role" value="host_family">
            <div class="form-group">
                <label class="form-label">اسم الأسرة</label>
                <input type="text" id="family-name" class="form-input" placeholder="اسم الأسرة" required>
            </div>
            <div class="form-group">
                <label class="form-label">المدينة</label>
                <select id="city" class="form-select" required>
                    <option value="">اختر المدينة</option>
                    <option value="makkah">مكة المكرمة</option>
                    <option value="madinah">المدينة المنورة</option>
                </select>
            </div>
            <div class="form-group">
                <label class="form-label">البريد الإلكتروني</label>
                <input type="email" id="email" class="form-input" placeholder="example@email.com" required>
            </div>
            <div class="form-group">
                <label class="form-label">رقم الجوال</label>
                <input type="tel" id="phone" class="form-input" placeholder="05xxxxxxxx" required>
            </div>
            <div class="form-group">
                <label class="form-label">العنوان</label>
                <textarea id="address" class="form-textarea" placeholder="عنوان المجلس" required></textarea>
            </div>
            <div class="form-group">
                <label class="form-label">كلمة المرور</label>
                <input type="password" id="password" class="form-input" placeholder="••••••••" required>
            </div>
            <div class="form-group">
                <label style="display: flex; align-items: start; gap: 8px;">
                    <input type="checkbox" id="accept-terms" required>
                    <span>أوافق على <a href="#">الشروط والأحكام</a> و <a href="#">سياسة الخصوصية</a></span>
                </label>
            </div>
        </form>
    `;
}

function getCompanyRegisterForm() {
    return `
        <form id="register-form" class="form">
            <input type="hidden" id="user-role" value="company">
            <div class="form-group">
                <label class="form-label">اسم الشركة</label>
                <input type="text" id="company-name" class="form-input" placeholder="اسم الشركة" required>
            </div>
            <div class="form-group">
                <label class="form-label">السجل التجاري</label>
                <input type="text" id="commercial-registration" class="form-input" placeholder="رقم السجل التجاري" required>
            </div>
            <div class="form-group">
                <label class="form-label">نوع الشركة</label>
                <select id="company-type" class="form-select" required>
                    <option value="">اختر نوع الشركة</option>
                    <option value="umrah">شركة عمرة</option>
                    <option value="hajj">شركة حج</option>
                </select>
            </div>
            <div class="form-group">
                <label class="form-label">البريد الإلكتروني</label>
                <input type="email" id="email" class="form-input" placeholder="example@email.com" required>
            </div>
            <div class="form-group">
                <label class="form-label">رقم الجوال</label>
                <input type="tel" id="phone" class="form-input" placeholder="05xxxxxxxx" required>
            </div>
            <div class="form-group">
                <label class="form-label">كلمة المرور</label>
                <input type="password" id="password" class="form-input" placeholder="••••••••" required>
            </div>
            <div class="form-group">
                <label style="display: flex; align-items: start; gap: 8px;">
                    <input type="checkbox" id="accept-terms" required>
                    <span>أوافق على <a href="#">الشروط والأحكام</a> و <a href="#">سياسة الخصوصية</a></span>
                </label>
            </div>
        </form>
    `;
}

// Switch register tab
function switchRegisterTab(type) {
    document.querySelectorAll('.tab').forEach(tab => tab.classList.remove('active'));
    event.target.classList.add('active');

    const content = document.getElementById('register-content');
    switch (type) {
        case 'umrah':
            content.innerHTML = getUmrahRegisterForm();
            break;
        case 'family':
            content.innerHTML = getFamilyRegisterForm();
            break;
        case 'company':
            content.innerHTML = getCompanyRegisterForm();
            break;
    }
}

// Handle register
async function handleRegister() {
    const form = document.getElementById('register-form');
    const formData = new FormData(form);
    const data = Object.fromEntries(formData);

    // Validation
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const confirmPassword = document.getElementById('confirm-password')?.value;
    const phone = document.getElementById('phone').value;
    const acceptTerms = document.getElementById('accept-terms').checked;

    if (!Utils.validateEmail(email)) {
        Utils.showToast('خطأ', 'يرجى إدخال بريد إلكتروني صحيح', 'error');
        return;
    }

    if (!Utils.validatePhone(phone)) {
        Utils.showToast('خطأ', 'يرجى إدخال رقم جوال صحيح', 'error');
        return;
    }

    if (password.length < 6) {
        Utils.showToast('خطأ', 'كلمة المرور يجب أن تكون 6 أحرف على الأقل', 'error');
        return;
    }

    if (confirmPassword && password !== confirmPassword) {
        Utils.showToast('خطأ', 'كلمتا المرور غير متطابقتين', 'error');
        return;
    }

    if (!acceptTerms) {
        Utils.showToast('خطأ', 'يجب الموافقة على الشروط والأحكام', 'error');
        return;
    }

    try {
        await Auth.register(data);
        const activeModal = document.querySelector('.modal.active');
        if (activeModal) Modal.close(activeModal);
    } catch (error) {
        console.error(error);
    }
}

// Show booking modal
function showBooking(packageType) {
    if (!Auth.isAuthenticated()) {
        Utils.showToast('تنبيه', 'يرجى تسجيل الدخول أولاً', 'warning');
        showLogin();
        return;
    }

    const content = `
        <form id="booking-form" class="form">
            <input type="hidden" id="package-type" value="${packageType}">
            <div class="form-group">
                <label class="form-label">اختر الأسرة المستضيفة</label>
                <select id="host-family" class="form-select" required>
                    <option value="">جاري التحميل...</option>
                </select>
            </div>
            <div class="form-group">
                <label class="form-label">تاريخ الزيارة</label>
                <input type="date" id="booking-date" class="form-input" required>
            </div>
            <div class="form-group">
                <label class="form-label">وقت الزيارة</label>
                <input type="time" id="booking-time" class="form-input" required>
            </div>
            <div class="form-group">
                <label class="form-label">عدد الضيوف</label>
                <input type="number" id="number-of-guests" class="form-input" min="1" value="1" required>
            </div>
            <div class="form-group">
                <label class="form-label">ملاحظات خاصة (اختياري)</label>
                <textarea id="notes" class="form-textarea" placeholder="أي طلبات خاصة..."></textarea>
            </div>
        </form>
    `;

    const footer = `
        <button class="btn btn-text" onclick="Modal.close(this.closest('.modal'))">إلغاء</button>
        <button class="btn btn-primary" onclick="handleBooking()">تأكيد الحجز</button>
    `;

    const modal = Modal.create('حجز باقة', content, footer);
    Modal.show(modal);

    // Load host families
    loadHostFamilies();
}

// Load host families
async function loadHostFamilies() {
    try {
        // This would be an actual API call
        // const families = await API.get('/rest/v1/host_families');

        // Mock data for now
        const families = [
            { id: 1, name: 'أسرة آل سعيد - مكة المكرمة' },
            { id: 2, name: 'أسرة آل عبدالله - المدينة المنورة' },
            { id: 3, name: 'أسرة آل أحمد - مكة المكرمة' }
        ];

        const select = document.getElementById('host-family');
        select.innerHTML = '<option value="">اختر الأسرة</option>' +
            families.map(f => `<option value="${f.id}">${f.name}</option>`).join('');
    } catch (error) {
        console.error(error);
    }
}

// Handle booking
async function handleBooking() {
    const formData = {
        package_type: document.getElementById('package-type').value,
        host_family_id: document.getElementById('host-family').value,
        booking_date: document.getElementById('booking-date').value,
        booking_time: document.getElementById('booking-time').value,
        number_of_guests: document.getElementById('number-of-guests').value,
        notes: document.getElementById('notes').value
    };

    if (!formData.host_family_id) {
        Utils.showToast('خطأ', 'يرجى اختيار الأسرة المستضيفة', 'error');
        return;
    }

    if (!formData.booking_date || !formData.booking_time) {
        Utils.showToast('خطأ', 'يرجى تحديد التاريخ والوقت', 'error');
        return;
    }

    try {
        // await API.post('/rest/v1/bookings', formData);
        Utils.showToast('نجح', 'تم الحجز بنجاح! سيتم التواصل معك قريباً', 'success');
        const activeModal = document.querySelector('.modal.active');
        if (activeModal) Modal.close(activeModal);
    } catch (error) {
        console.error(error);
    }
}

// Show B2B form
function showB2BForm() {
    const content = `
        <form id="b2b-form" class="form">
            <div class="form-group">
                <label class="form-label">اسم الشركة</label>
                <input type="text" id="company-name" class="form-input" required>
            </div>
            <div class="form-group">
                <label class="form-label">اسم المسؤول</label>
                <input type="text" id="contact-name" class="form-input" required>
            </div>
            <div class="form-group">
                <label class="form-label">البريد الإلكتروني</label>
                <input type="email" id="email" class="form-input" required>
            </div>
            <div class="form-group">
                <label class="form-label">رقم الجوال</label>
                <input type="tel" id="phone" class="form-input" required>
            </div>
            <div class="form-group">
                <label class="form-label">عدد المعتمرين المتوقع</label>
                <input type="number" id="expected-visitors" class="form-input" min="10" required>
            </div>
            <div class="form-group">
                <label class="form-label">رسالة</label>
                <textarea id="message" class="form-textarea" placeholder="أخبرنا المزيد عن احتياجاتك..."></textarea>
            </div>
        </form>
    `;

    const footer = `
        <button class="btn btn-text" onclick="Modal.close(this.closest('.modal'))">إلغاء</button>
        <button class="btn btn-primary" onclick="handleB2BSubmit()">إرسال</button>
    `;

    const modal = Modal.create('طلب عروض الشركات', content, footer);
    Modal.show(modal);
}

// Handle B2B submit
async function handleB2BSubmit() {
    Utils.showToast('نجح', 'تم إرسال طلبك بنجاح! سنتواصل معك قريباً', 'success');
    const activeModal = document.querySelector('.modal.active');
    if (activeModal) Modal.close(activeModal);
}

// Show investment form
function showInvestmentForm() {
    const content = `
        <form id="investment-form" class="form">
            <div class="form-group">
                <label class="form-label">الاسم الكامل</label>
                <input type="text" id="investor-name" class="form-input" required>
            </div>
            <div class="form-group">
                <label class="form-label">البريد الإلكتروني</label>
                <input type="email" id="email" class="form-input" required>
            </div>
            <div class="form-group">
                <label class="form-label">رقم الجوال</label>
                <input type="tel" id="phone" class="form-input" required>
            </div>
            <div class="form-group">
                <label class="form-label">الشركة/المؤسسة (اختياري)</label>
                <input type="text" id="company" class="form-input">
            </div>
            <div class="form-group">
                <label class="form-label">مبلغ الاستثمار المتوقع</label>
                <select id="investment-amount" class="form-select" required>
                    <option value="">اختر المبلغ</option>
                    <option value="100000-500000">100,000 - 500,000 ريال</option>
                    <option value="500000-1000000">500,000 - 1,000,000 ريال</option>
                    <option value="1000000+">أكثر من 1,000,000 ريال</option>
                </select>
            </div>
            <div class="form-group">
                <label class="form-label">رسالة</label>
                <textarea id="message" class="form-textarea" placeholder="أخبرنا عن اهتمامك بالاستثمار..."></textarea>
            </div>
        </form>
    `;

    const footer = `
        <button class="btn btn-text" onclick="Modal.close(this.closest('.modal'))">إلغاء</button>
        <button class="btn btn-primary" onclick="handleInvestmentSubmit()">إرسال الطلب</button>
    `;

    const modal = Modal.create('طلب استثمار', content, footer);
    Modal.show(modal);
}

// Handle investment submit
async function handleInvestmentSubmit() {
    Utils.showToast('نجح', 'شكراً لاهتمامك! سنتواصل معك قريباً', 'success');
    const activeModal = document.querySelector('.modal.active');
    if (activeModal) Modal.close(activeModal);
}

// Switch team tab
function switchTeamTab(department) {
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');

    // Load team members for the selected department
    loadTeamMembers(department);
}

// Load team members
async function loadTeamMembers(department) {
    const grid = document.getElementById('team-content');
    grid.innerHTML = '<div class="loading-overlay"><div class="spinner"></div></div>';

    try {
        // This would be an actual API call
        // const members = await API.get(`/rest/v1/team_members?department=eq.${department}`);

        // Mock data
        const members = [
            {
                name: 'سيتم الإضافة',
                role: 'عضو الفريق',
                photo_url: 'assets/team/placeholder.jpg',
                bio: 'يمكن إضافة أعضاء الفريق من لوحة التحكم'
            }
        ];

        grid.innerHTML = members.map(member => `
            <div class="team-card">
                <div class="team-avatar">
                    <img src="${member.photo_url}" alt="${member.name}">
                </div>
                <h3 class="team-name">${member.name}</h3>
                <p class="team-role">${member.role}</p>
                <p class="team-bio">${member.bio}</p>
            </div>
        `).join('');
    } catch (error) {
        grid.innerHTML = '<p class="text-center text-muted">حدث خطأ في تحميل البيانات</p>';
    }
}

// Scroll to packages
function scrollToPackages() {
    Utils.scrollTo('#packages');
}

// Redirect by role
function redirectByRole(role) {
    switch (role) {
        case 'umrah_visitor':
            window.location.href = '/visitor-dashboard.html';
            break;
        case 'host_family':
            window.location.href = '/family-dashboard.html';
            break;
        case 'company':
            window.location.href = '/company-dashboard.html';
            break;
        case 'admin':
        case 'operator':
            window.location.href = '/admin-dashboard.html';
            break;
        default:
            window.location.href = '/';
    }
}

// Forgot password
function showForgotPassword() {
    const content = `
        <form id="forgot-password-form" class="form">
            <p class="text-muted mb-lg">أدخل بريدك الإلكتروني وسنرسل لك رابط إعادة تعيين كلمة المرور</p>
            <div class="form-group">
                <label class="form-label">البريد الإلكتروني</label>
                <input type="email" id="reset-email" class="form-input" placeholder="example@email.com" required>
            </div>
        </form>
    `;

    const footer = `
        <button class="btn btn-text" onclick="showLogin()">رجوع</button>
        <button class="btn btn-primary" onclick="handleForgotPassword()">إرسال</button>
    `;

    const modal = Modal.create('استعادة كلمة المرور', content, footer);

    // Close existing modal first
    const existingModal = document.querySelector('.modal.active');
    if (existingModal) Modal.close(existingModal);

    setTimeout(() => Modal.show(modal), 350);
}

// Handle forgot password
async function handleForgotPassword() {
    const email = document.getElementById('reset-email').value;

    if (!Utils.validateEmail(email)) {
        Utils.showToast('خطأ', 'يرجى إدخال بريد إلكتروني صحيح', 'error');
        return;
    }

    Utils.showToast('نجح', 'تم إرسال رابط إعادة التعيين إلى بريدك الإلكتروني', 'success');
    const activeModal = document.querySelector('.modal.active');
    if (activeModal) Modal.close(activeModal);
}

// Make functions available globally for onclick handlers
window.showRegister = showRegister;
window.showLogin = showLogin;
window.scrollToPackages = scrollToPackages;
window.showBooking = showBooking;
window.showB2BForm = showB2BForm;
window.showInvestmentForm = showInvestmentForm;
window.switchRegisterTab = switchRegisterTab;
window.handleRegister = handleRegister;
window.handleLogin = handleLogin;
window.handleBooking = handleBooking;
window.handleB2BSubmit = handleB2BSubmit;
window.handleInvestmentSubmit = handleInvestmentSubmit;
window.switchTeamTab = switchTeamTab;
window.showForgotPassword = showForgotPassword;
window.handleForgotPassword = handleForgotPassword;

