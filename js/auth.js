// ===================================
// Authentication JavaScript
// ===================================

// Utils and API are already loaded from main.js

// Supabase client is already initialized in config.js
// We'll use the global supabase variable from there

// Verify Supabase is available
if (typeof supabase !== 'undefined') {
    console.log('✅ auth.js: Using Supabase client from config.js');
} else {
    console.warn('⚠️ auth.js: Supabase client not found - running in mock mode');
}

// Toggle password visibility
function togglePassword(inputId) {
    const input = document.getElementById(inputId);
    const button = input.nextElementSibling;

    if (input.type === 'password') {
        input.type = 'text';
        button.querySelector('.show-icon').textContent = '👁️‍🗨️';
    } else {
        input.type = 'password';
        button.querySelector('.show-icon').textContent = '👁️';
    }
}

// Validate form fields
function validateEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
}

function validatePhone(phone) {
    const re = /^05[0-9]{8}$/;
    return re.test(phone);
}

function validatePassword(password) {
    return password.length >= 6;
}

// Show error message
function showError(elementId, message) {
    const errorElement = document.getElementById(elementId);
    if (errorElement) {
        errorElement.textContent = message;
        errorElement.style.display = 'block';
    }
}

// Clear error message
function clearError(elementId) {
    const errorElement = document.getElementById(elementId);
    if (errorElement) {
        errorElement.textContent = '';
        errorElement.style.display = 'none';
    }
}

// Clear all errors
function clearAllErrors() {
    document.querySelectorAll('.form-error').forEach(el => {
        el.textContent = '';
        el.style.display = 'none';
    });
}

// Show toast notification
function showToast(title, message, type = 'info') {
    let container = document.getElementById('toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        container.className = 'toast-container';
        document.body.appendChild(container);
    }

    const icons = {
        success: '✓',
        error: '✗',
        warning: '⚠',
        info: 'ℹ'
    };

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
        <div class="toast-icon">${icons[type]}</div>
        <div class="toast-content">
            <div class="toast-title">${title}</div>
            <p class="toast-message">${message}</p>
        </div>
    `;

    container.appendChild(toast);

    setTimeout(() => {
        toast.style.animation = 'fadeOut 0.3s ease-out';
        setTimeout(() => toast.remove(), 300);
    }, 5000);
}

// Show loading state
function showLoading(button) {
    button.disabled = true;
    button.dataset.originalText = button.textContent;
    button.innerHTML = '<div class="spinner" style="width: 24px; height: 24px; border-width: 3px;"></div>';
}

// Hide loading state
function hideLoading(button) {
    button.disabled = false;
    button.textContent = button.dataset.originalText;
}

// ===== LOGIN =====
async function handleLogin() {
    clearAllErrors();

    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;
    const rememberMe = document.getElementById('remember-me')?.checked;
    const submitButton = document.querySelector('button[type="submit"]');

    // Validation
    if (!validateEmail(email)) {
        showError('email-error', 'البريد الإلكتروني غير صحيح');
        return;
    }

    if (!validatePassword(password)) {
        showError('password-error', 'كلمة المرور يجب أن تكون 6 أحرف على الأقل');
        return;
    }

    showLoading(submitButton);

    try {
        if (supabase) {
            // Real Supabase authentication
            const { data, error } = await supabase.auth.signInWithPassword({
                email,
                password
            });

            if (error) throw error;

            // Store user data
            localStorage.setItem('user', JSON.stringify(data.user));
            if (rememberMe) {
                localStorage.setItem('remember_me', 'true');
            }

            showToast('نجح', 'تم تسجيل الدخول بنجاح', 'success');

            // Redirect based on user role
            setTimeout(() => {
                redirectByRole(data.user.user_metadata.role || 'umrah_visitor');
            }, 1000);
        } else {
            // Mock authentication for development
            console.log('Login attempt:', { email, password });

            // Simulate API call
            await new Promise(resolve => setTimeout(resolve, 1000));

            // Mock user data
            const mockUser = {
                id: 'mock-user-id',
                email: email,
                role: 'umrah_visitor',
                full_name: 'مستخدم تجريبي'
            };

            localStorage.setItem('user', JSON.stringify(mockUser));
            showToast('نجح', 'تم تسجيل الدخول بنجاح (وضع تجريبي)', 'success');

            setTimeout(() => {
                redirectByRole(mockUser.role);
            }, 1000);
        }
    } catch (error) {
        console.error('Login error:', error);
        showToast('خطأ', error.message || 'فشل تسجيل الدخول. يرجى المحاولة مرة أخرى', 'error');
    } finally {
        hideLoading(submitButton);
    }
}

// ===== VISITOR REGISTER =====
async function handleVisitorRegister() {
    clearAllErrors();

    const fullName = document.getElementById('full-name').value.trim();
    const email = document.getElementById('email').value.trim();
    const phone = document.getElementById('phone').value.trim();
    const nationality = document.getElementById('nationality').value;
    const password = document.getElementById('password').value;
    const confirmPassword = document.getElementById('confirm-password').value;
    const acceptTerms = document.getElementById('accept-terms').checked;
    const newsletter = document.getElementById('newsletter')?.checked || false;
    const submitButton = document.querySelector('button[type="submit"]');

    // Validation
    let hasError = false;

    if (!fullName) {
        showError('name-error', 'الاسم مطلوب');
        hasError = true;
    }

    if (!validateEmail(email)) {
        showError('email-error', 'البريد الإلكتروني غير صحيح');
        hasError = true;
    }

    if (!validatePhone(phone)) {
        showError('phone-error', 'رقم الجوال غير صحيح (يجب أن يبدأ بـ 05)');
        hasError = true;
    }

    if (!nationality) {
        showError('nationality-error', 'يرجى اختيار الجنسية');
        hasError = true;
    }

    if (!validatePassword(password)) {
        showError('password-error', 'كلمة المرور يجب أن تكون 6 أحرف على الأقل');
        hasError = true;
    }

    if (password !== confirmPassword) {
        showError('confirm-password-error', 'كلمتا المرور غير متطابقتين');
        hasError = true;
    }

    if (!acceptTerms) {
        showToast('تنبيه', 'يجب الموافقة على الشروط والأحكام', 'warning');
        hasError = true;
    }

    if (hasError) return;

    showLoading(submitButton);

    try {
        if (supabase) {
            // Real Supabase registration
            const { data, error } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    data: {
                        full_name: fullName,
                        phone,
                        nationality,
                        role: 'umrah_visitor',
                        newsletter
                    }
                }
            });

            if (error) throw error;

            showToast('نجح', 'تم التسجيل بنجاح! تحقق من بريدك الإلكتروني', 'success');

            setTimeout(() => {
                window.location.href = 'login.html';
            }, 2000);
        } else {
            // Mock registration
            console.log('Register attempt:', { fullName, email, phone, nationality });

            await new Promise(resolve => setTimeout(resolve, 1500));

            showToast('نجح', 'تم التسجيل بنجاح! (وضع تجريبي)', 'success');

            setTimeout(() => {
                window.location.href = 'login.html';
            }, 2000);
        }
    } catch (error) {
        console.error('Register error:', error);
        showToast('خطأ', error.message || 'فشل التسجيل. يرجى المحاولة مرة أخرى', 'error');
    } finally {
        hideLoading(submitButton);
    }
}

// ===== FAMILY REGISTER =====
async function handleFamilyRegister() {
    clearAllErrors();

    const familyName = document.getElementById('family-name').value.trim();
    const city = document.getElementById('city').value;
    const address = document.getElementById('address').value.trim();
    const capacity = document.getElementById('capacity').value;
    const contactName = document.getElementById('contact-name').value.trim();
    const email = document.getElementById('email').value.trim();
    const phone = document.getElementById('phone').value.trim();
    const description = document.getElementById('description').value.trim();
    const password = document.getElementById('password').value;
    const confirmPassword = document.getElementById('confirm-password').value;
    const acceptTerms = document.getElementById('accept-terms').checked;

    // Get selected packages
    const packages = Array.from(document.querySelectorAll('input[name="packages"]:checked'))
        .map(cb => cb.value);

    const submitButton = document.querySelector('button[type="submit"]');

    // Validation
    let hasError = false;

    if (!familyName) {
        showError('family-name-error', 'اسم الأسرة مطلوب');
        hasError = true;
    }

    if (!city) {
        showError('city-error', 'المدينة مطلوبة');
        hasError = true;
    }

    if (!address) {
        showError('address-error', 'العنوان مطلوب');
        hasError = true;
    }

    if (!capacity || capacity < 1) {
        showError('capacity-error', 'السعة الاستيعابية مطلوبة');
        hasError = true;
    }

    if (packages.length === 0) {
        showError('packages-error', 'يجب اختيار باقة واحدة على الأقل');
        hasError = true;
    }

    if (!validateEmail(email)) {
        showError('email-error', 'البريد الإلكتروني غير صحيح');
        hasError = true;
    }

    if (!validatePhone(phone)) {
        showError('phone-error', 'رقم الجوال غير صحيح');
        hasError = true;
    }

    if (password !== confirmPassword) {
        showError('confirm-password-error', 'كلمتا المرور غير متطابقتين');
        hasError = true;
    }

    if (!acceptTerms) {
        showToast('تنبيه', 'يجب الموافقة على الشروط والأحكام', 'warning');
        hasError = true;
    }

    if (hasError) return;

    showLoading(submitButton);

    try {
        const familyData = {
            family_name: familyName,
            city,
            address,
            capacity: parseInt(capacity),
            contact_name: contactName,
            email,
            phone,
            description,
            packages,
            role: 'host_family'
        };

        if (supabase) {
            // Real registration
            const { data, error } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    data: familyData
                }
            });

            if (error) throw error;
        } else {
            // Mock
            console.log('Family register:', familyData);
            await new Promise(resolve => setTimeout(resolve, 1500));
        }

        showToast('نجح', 'تم تقديم الطلب بنجاح! سنتواصل معك خلال 48 ساعة', 'success');

        setTimeout(() => {
            window.location.href = 'index.html';
        }, 3000);
    } catch (error) {
        console.error('Register error:', error);
        showToast('خطأ', error.message || 'فشل التسجيل. يرجى المحاولة مرة أخرى', 'error');
    } finally {
        hideLoading(submitButton);
    }
}

// ===== COMPANY REGISTER =====
async function handleCompanyRegister() {
    clearAllErrors();

    const companyName = document.getElementById('company-name').value.trim();
    const commercialRegistration = document.getElementById('commercial-registration').value.trim();
    const companyType = document.getElementById('company-type').value;
    const licenseNumber = document.getElementById('license-number').value.trim();
    const companyAddress = document.getElementById('company-address').value.trim();
    const contactPerson = document.getElementById('contact-person').value.trim();
    const position = document.getElementById('position').value.trim();
    const email = document.getElementById('email').value.trim();
    const phone = document.getElementById('phone').value.trim();
    const expectedVisitors = document.getElementById('expected-visitors').value;
    const website = document.getElementById('website')?.value.trim() || '';
    const password = document.getElementById('password').value;
    const confirmPassword = document.getElementById('confirm-password').value;
    const acceptTerms = document.getElementById('accept-terms').checked;

    const submitButton = document.querySelector('button[type="submit"]');

    // Validation
    let hasError = false;

    if (!companyName) {
        showError('company-name-error', 'اسم الشركة مطلوب');
        hasError = true;
    }

    if (!commercialRegistration || !commercialRegistration.match(/^[0-9]{10}$/)) {
        showError('cr-error', 'رقم السجل التجاري يجب أن يكون 10 أرقام');
        hasError = true;
    }

    if (!companyType) {
        showError('company-type-error', 'نوع الشركة مطلوب');
        hasError = true;
    }

    if (!validateEmail(email)) {
        showError('email-error', 'البريد الإلكتروني غير صحيح');
        hasError = true;
    }

    if (!validatePhone(phone)) {
        showError('phone-error', 'رقم الجوال غير صحيح');
        hasError = true;
    }

    if (password !== confirmPassword) {
        showError('confirm-password-error', 'كلمتا المرور غير متطابقتين');
        hasError = true;
    }

    if (!acceptTerms) {
        showToast('تنبيه', 'يجب الموافقة على الشروط والأحكام', 'warning');
        hasError = true;
    }

    if (hasError) return;

    showLoading(submitButton);

    try {
        const companyData = {
            company_name: companyName,
            commercial_registration: commercialRegistration,
            company_type: companyType,
            license_number: licenseNumber,
            company_address: companyAddress,
            contact_person: contactPerson,
            position,
            email,
            phone,
            expected_visitors: expectedVisitors,
            website,
            role: 'company'
        };

        if (supabase) {
            const { data, error } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    data: companyData
                }
            });

            if (error) throw error;
        } else {
            console.log('Company register:', companyData);
            await new Promise(resolve => setTimeout(resolve, 1500));
        }

        showToast('نجح', 'تم تقديم الطلب بنجاح! سنتواصل معك قريباً للتفعيل', 'success');

        setTimeout(() => {
            window.location.href = 'index.html';
        }, 3000);
    } catch (error) {
        console.error('Register error:', error);
        showToast('خطأ', error.message || 'فشل التسجيل. يرجى المحاولة مرة أخرى', 'error');
    } finally {
        hideLoading(submitButton);
    }
}

// Redirect by user role
function redirectByRole(role) {
    switch (role) {
        case 'umrah_visitor':
            window.location.href = 'visitor-dashboard.html';
            break;
        case 'host_family':
            window.location.href = 'family-dashboard.html';
            break;
        case 'company':
            window.location.href = 'company-dashboard.html';
            break;
        case 'admin':
        case 'operator':
            window.location.href = 'admin-dashboard.html';
            break;
        default:
            window.location.href = 'index.html';
    }
}

// Check if user is already logged in
function checkAuth() {
    const user = localStorage.getItem('user');
    if (user) {
        const userData = JSON.parse(user);
        // If on auth page and already logged in, redirect
        if (window.location.pathname.includes('login') ||
            window.location.pathname.includes('register')) {
            redirectByRole(userData.role);
        }
    }
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    checkAuth();
});
