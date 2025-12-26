// ============================================
// Karam Platform - Authentication System
// نظام المصادقة المتكامل
// ============================================
// Version: 2.0
// Author: Dr. Shakir Alhuthali
// Supports: Operators, Families, Visitors, Companies
// ============================================

// ============================================
// Authentication Class
// ============================================

class KaramAuth {
    constructor() {
        this.currentUser = null;
        this.currentUserProfile = null;
        this.redirectAfterLogin = null;

        // Initialize on load
        this.init();
    }

    async init() {
        // Check for existing session
        const { session } = await karamDB.getCurrentSession();

        if (session) {
            await this.loadUserProfile();
        }

        // Check for redirect parameter
        const urlParams = new URLSearchParams(window.location.search);
        this.redirectAfterLogin = urlParams.get('redirect');
    }

    // ============================================
    // User Profile Management
    // ============================================

    async loadUserProfile() {
        const { user } = await karamDB.getCurrentUser();

        if (!user) {
            this.currentUser = null;
            this.currentUserProfile = null;
            return null;
        }

        this.currentUser = user;

        // Get user profile
        const { data, error } = await karamDB.select('user_profiles', {
            eq: { id: user.id },
            single: true
        });

        if (error) {
            console.error('Error loading profile:', error);
            return null;
        }

        this.currentUserProfile = data;
        return data;
    }

    getUserType() {
        return this.currentUserProfile?.user_type || null;
    }

    isOperator() {
        return this.getUserType() === 'operator';
    }

    isFamily() {
        return this.getUserType() === 'family';
    }

    isVisitor() {
        return this.getUserType() === 'visitor';
    }

    isCompany() {
        return this.getUserType() === 'company';
    }

    isAuthenticated() {
        return this.currentUser !== null;
    }

    // ============================================
    // Registration
    // ============================================

    async register(userData) {
        const { userType, email, password, ...profileData } = userData;

        try {
            // 1. Create auth user
            const { data: authData, error: authError } = await window.supabaseClient.auth.signUp({
                email,
                password,
                options: {
                    data: {
                        user_type: userType
                    }
                }
            });

            if (authError) throw authError;

            const userId = authData.user.id;

            // 2. Create user profile
            const { error: profileError } = await karamDB.insert('user_profiles', {
                id: userId,
                email,
                user_type: userType,
                full_name: profileData.full_name || profileData.family_name || profileData.company_name
            });

            if (profileError) throw profileError;

            // 3. Create type-specific record
            let typeRecord;

            switch (userType) {
                case 'family':
                    typeRecord = await this.createFamilyRecord(userId, profileData);
                    break;
                case 'visitor':
                    typeRecord = await this.createVisitorRecord(userId, profileData);
                    break;
                case 'company':
                    typeRecord = await this.createCompanyRecord(userId, profileData);
                    break;
                case 'operator':
                    // Operators are created manually by system admins
                    throw new Error('Operator accounts must be created by system administrators');
            }

            if (typeRecord.error) throw typeRecord.error;

            return {
                success: true,
                user: authData.user,
                message: 'تم التسجيل بنجاح! يرجى تفعيل حسابك عبر البريد الإلكتروني'
            };

        } catch (error) {
            console.error('Registration error:', error);
            return {
                success: false,
                error: error.message || 'حدث خطأ أثناء التسجيل'
            };
        }
    }

    async createFamilyRecord(userId, data) {
        return await karamDB.insert('families', {
            user_id: userId,
            family_name: data.family_name,
            contact_phone: data.contact_phone,
            city: data.city,
            address: data.address,
            description_ar: data.description_ar || '',
            description_en: data.description_en || ''
        }, { select: '*' });
    }

    async createVisitorRecord(userId, data) {
        return await karamDB.insert('visitors', {
            user_id: userId,
            full_name: data.full_name,
            phone: data.phone,
            nationality: data.nationality || 'saudi',
            national_id: data.national_id
        }, { select: '*' });
    }

    async createCompanyRecord(userId, data) {
        return await karamDB.insert('companies', {
            user_id: userId,
            company_name: data.company_name,
            registration_number: data.registration_number,
            responsible_person_name: data.responsible_person_name,
            responsible_person_phone: data.responsible_person_phone,
            office_address: data.office_address,
            city: data.city
        }, { select: '*' });
    }

    // ============================================
    // Login
    // ============================================

    async login(email, password) {
        try {
            const { data, error } = await window.supabaseClient.auth.signInWithPassword({
                email,
                password
            });

            if (error) throw error;

            // Load user profile
            await this.loadUserProfile();

            // Redirect based on user type
            this.redirectAfterLogin ?
                window.location.href = this.redirectAfterLogin :
                this.redirectToDashboard();

            return {
                success: true,
                user: data.user,
                userType: this.getUserType()
            };

        } catch (error) {
            console.error('Login error:', error);

            let message = 'حدث خطأ أثناء تسجيل الدخول';

            if (error.message.includes('Invalid login credentials')) {
                message = 'البريد الإلكتروني أو كلمة المرور غير صحيحة';
            } else if (error.message.includes('Email not confirmed')) {
                message = 'يرجى تفعيل حسابك عبر البريد الإلكتروني أولاً';
            }

            return {
                success: false,
                error: message
            };
        }
    }

    // ============================================
    // Logout
    // ============================================

    async logout() {
        try {
            const { error } = await karamDB.signOut();

            if (error) throw error;

            this.currentUser = null;
            this.currentUserProfile = null;

            // Redirect to home or login
            window.location.href = 'index.html';

            return { success: true };

        } catch (error) {
            console.error('Logout error:', error);
            return {
                success: false,
                error: 'حدث خطأ أثناء تسجيل الخروج'
            };
        }
    }

    // ============================================
    // Password Reset
    // ============================================

    async requestPasswordReset(email) {
        try {
            const { error } = await window.supabaseClient.auth.resetPasswordForEmail(email, {
                redirectTo: `${window.location.origin}/reset-password.html`
            });

            if (error) throw error;

            return {
                success: true,
                message: 'تم إرسال رابط إعادة تعيين كلمة المرور إلى بريدك الإلكتروني'
            };

        } catch (error) {
            console.error('Password reset error:', error);
            return {
                success: false,
                error: 'حدث خطأ أثناء إرسال رابط إعادة التعيين'
            };
        }
    }

    async updatePassword(newPassword) {
        try {
            const { error } = await window.supabaseClient.auth.updateUser({
                password: newPassword
            });

            if (error) throw error;

            return {
                success: true,
                message: 'تم تحديث كلمة المرور بنجاح'
            };

        } catch (error) {
            console.error('Password update error:', error);
            return {
                success: false,
                error: 'حدث خطأ أثناء تحديث كلمة المرور'
            };
        }
    }

    // ============================================
    // Email & Phone Verification
    // ============================================

    async sendEmailVerification() {
        try {
            const { error } = await window.supabaseClient.auth.resend({
                type: 'signup',
                email: this.currentUser.email
            });

            if (error) throw error;

            return {
                success: true,
                message: 'تم إرسال رابط التفعيل إلى بريدك الإلكتروني'
            };

        } catch (error) {
            return {
                success: false,
                error: 'حدث خطأ أثناء إرسال رابط التفعيل'
            };
        }
    }

    async sendPhoneVerification(phone) {
        try {
            // Generate OTP code
            const { data, error } = await karamDB.rpc('generate_verification_code', {
                p_user_id: this.currentUser.id,
                p_type: 'phone',
                p_contact_info: phone
            });

            if (error) throw error;

            // TODO: Integrate with SMS provider to send the code
            console.log('OTP Code:', data);

            return {
                success: true,
                message: 'تم إرسال رمز التحقق إلى رقم جوالك',
                code: data // Remove in production!
            };

        } catch (error) {
            return {
                success: false,
                error: 'حدث خطأ أثناء إرسال رمز التحقق'
            };
        }
    }

    async verifyPhoneCode(code) {
        try {
            const { data, error } = await karamDB.update(
                'verification_codes',
                { verified: true, verified_at: new Date().toISOString() },
                {
                    user_id: this.currentUser.id,
                    code: code,
                    verification_type: 'phone',
                    verified: false
                }
            );

            if (error || !data || data.length === 0) {
                throw new Error('Invalid or expired code');
            }

            // Update user profile
            const userType = this.getUserType();
            const tableName = userType === 'family' ? 'families' :
                userType === 'visitor' ? 'visitors' : 'companies';

            await karamDB.update(
                tableName,
                { phone_verified: true, phone_verified_at: new Date().toISOString() },
                { user_id: this.currentUser.id }
            );

            return {
                success: true,
                message: 'تم تأكيد رقم الجوال بنجاح'
            };

        } catch (error) {
            return {
                success: false,
                error: 'رمز التحقق غير صحيح أو منتهي الصلاحية'
            };
        }
    }

    // ============================================
    // Navigation & Redirection
    // ============================================

    redirectToDashboard() {
        const userType = this.getUserType();

        const dashboards = {
            operator: 'operator-dashboard.html',
            family: 'family-dashboard.html',
            visitor: 'visitor-dashboard.html',
            company: 'company-dashboard.html'
        };

        window.location.href = dashboards[userType] || 'index.html';
    }

    requireAuth(allowedTypes = []) {
        if (!this.isAuthenticated()) {
            const currentPath = window.location.pathname;
            window.location.href = `login.html?redirect=${encodeURIComponent(currentPath)}`;
            return false;
        }

        if (allowedTypes.length > 0 && !allowedTypes.includes(this.getUserType())) {
            alert('ليس لديك صلاحية للوصول لهذه الصفحة');
            this.redirectToDashboard();
            return false;
        }

        return true;
    }

    // ============================================
    // Session Check
    // ============================================

    async checkSession() {
        const { session } = await karamDB.getCurrentSession();

        if (!session) {
            this.currentUser = null;
            this.currentUserProfile = null;
            return false;
        }

        if (!this.currentUserProfile) {
            await this.loadUserProfile();
        }

        return true;
    }
}

// ============================================
// Initialize Global Instance
// ============================================

// Create instance and attach to window for global access
window.karamAuth = new KaramAuth();
const karamAuth = window.karamAuth;

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { karamAuth };
}

console.log('✅ Karam Auth System initialized');
