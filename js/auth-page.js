// ============================================
// Auth Page Handler
// ============================================

let selectedUserType = null;

function switchForm(formType) {
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');

    if (formType === 'login') {
        loginForm.classList.add('active');
        registerForm.classList.remove('active');
    } else {
        loginForm.classList.remove('active');
        registerForm.classList.add('active');
    }
}

function selectUserType(type) {
    selectedUserType = type;
    document.getElementById('register-user-type').value = type;

    // Update selection UI
    document.querySelectorAll('.user-type-option').forEach(opt => {
        opt.classList.remove('selected');
    });
    event.currentTarget.classList.add('selected');

    // Show/hide relevant fields
    document.getElementById('family-fields').style.display = type === 'family' ? 'block' : 'none';
    document.getElementById('visitor-fields').style.display = type === 'visitor' ? 'block' : 'none';
    document.getElementById('company-fields').style.display = type === 'company' ? 'block' : 'none';
}

async function handleLogin(event) {
    event.preventDefault();

    const btn = document.getElementById('login-btn');
    const spinner = btn.querySelector('.spinner');
    const span = btn.querySelector('span');

    btn.disabled = true;
    spinner.style.display = 'inline-block';
    span.textContent = 'جاري تسجيل الدخول...';

    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;

    try {
        const result = await karamAuth.login(email, password);

        if (result.success) {
            // Auto redirect handled by auth.js
        } else {
            alert('❌ ' + result.error);
            btn.disabled = false;
            spinner.style.display = 'none';
            span.textContent = 'تسجيل الدخول';
        }
    } catch (error) {
        console.error('Login error:', error);
        alert('حدث خطأ أثناء تسجيل الدخول');
        btn.disabled = false;
        spinner.style.display = 'none';
        span.textContent = 'تسجيل الدخول';
    }

    return false;
}

async function handleRegister(event) {
    event.preventDefault();

    if (!selectedUserType) {
        alert('يرجى اختيار نوع الحساب');
        return false;
    }

    const password = document.getElementById('register-password').value;
    const passwordConfirm = document.getElementById('register-password-confirm').value;

    if (password !== passwordConfirm) {
        alert('كلمتا المرور غير متطابقتين');
        return false;
    }

    const btn = document.getElementById('register-btn');
    const spinner = btn.querySelector('.spinner');
    const span = btn.querySelector('span');

    btn.disabled = true;
    spinner.style.display = 'inline-block';
    span.textContent = 'جاري إنشاء الحساب...';

    const email = document.getElementById('register-email').value;

    const registrationData = {
        userType: selectedUserType,
        email: email,
        password: password
    };

    // Add type-specific fields
    if (selectedUserType === 'family') {
        registrationData.family_name = document.getElementById('family-name').value;
        registrationData.city = document.getElementById('family-city').value;
        registrationData.contact_phone = document.getElementById('family-phone').value;
    } else if (selectedUserType === 'visitor') {
        registrationData.full_name = document.getElementById('visitor-name').value;
        registrationData.phone = document.getElementById('visitor-phone').value;
    } else if (selectedUserType === 'company') {
        registrationData.company_name = document.getElementById('company-name').value;
        registrationData.registration_number = document.getElementById('company-reg').value;
        registrationData.responsible_person_phone = document.getElementById('company-phone').value;
    }

    try {
        const result = await karamAuth.register(registrationData);

        if (result.success) {
            alert('✅ تم إنشاء الحساب بنجاح!\nيرجى تسجيل الدخول.');
            switchForm('login');
            document.getElementById('login-email').value = email;
        } else {
            alert('❌ ' + result.error);
        }
    } catch (error) {
        console.error('Registration error:', error);
        alert('حدث خطأ أثناء إنشاء الحساب');
    } finally {
        btn.disabled = false;
        spinner.style.display = 'none';
        span.textContent = 'إنشاء الحساب';
    }

    return false;
}

// Check if user is already logged in
window.addEventListener('DOMContentLoaded', async () => {
    const { user } = await karamDB.getCurrentUser();
    if (user) {
        // Load user profile first
        await karamAuth.loadUserProfile();

        // Redirect to dashboard
        karamAuth.redirectToDashboard();
    }

    // Check for redirect parameter
    const urlParams = new URLSearchParams(window.location.search);
    const returnUrl = urlParams.get('return');
    if (returnUrl) {
        localStorage.setItem('karam_return_url', returnUrl);
    }
});
