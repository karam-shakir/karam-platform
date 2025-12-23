// ===================================
// Main JavaScript - Karam Platform
// ===================================

// Configuration
const API_BASE_URL = 'https://mdkhvsvkqlhtikhpkwkf.supabase.co';
const API_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1ka2h2c3ZrcWxodGlraHBrd2tmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUyNTM1NTAsImV4cCI6MjA4MDgyOTU1MH0.zabhAeKeIVAU8YTKmOHcEJf0vYCKJUrS9-RgkRg14ZY';


// State Management
const AppState = {
    user: null,
    cart: [],
    bookings: [],
    isLoading: false
};

// Utility Functions
const Utils = {
    // Create element with classes
    createElement(tag, classes = [], attributes = {}) {
        const element = document.createElement(tag);
        if (classes.length) element.className = classes.join(' ');
        Object.entries(attributes).forEach(([key, value]) => {
            element.setAttribute(key, value);
        });
        return element;
    },

    // Format currency
    formatCurrency(amount) {
        return `${amount} ريال`;
    },

    // Format date
    formatDate(date) {
        return new Intl.DateTimeFormat('ar-SA', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        }).format(new Date(date));
    },

    // Show loading
    showLoading() {
        AppState.isLoading = true;
        const overlay = Utils.createElement('div', ['loading-overlay']);
        overlay.innerHTML = '<div class="spinner"></div>';
        overlay.id = 'loading-overlay';
        document.body.appendChild(overlay);
    },

    // Hide loading
    hideLoading() {
        AppState.isLoading = false;
        const overlay = document.getElementById('loading-overlay');
        if (overlay) overlay.remove();
    },

    // Show toast notification
    showToast(title, message, type = 'info') {
        let container = document.querySelector('.toast-container');
        if (!container) {
            container = Utils.createElement('div', ['toast-container']);
            document.body.appendChild(container);
        }

        const toast = Utils.createElement('div', ['toast', type]);

        const icons = {
            success: '✓',
            error: '✗',
            warning: '⚠',
            info: 'ℹ'
        };

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
    },

    // Validate email
    validateEmail(email) {
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return re.test(email);
    },

    // Validate phone (Saudi)
    validatePhone(phone) {
        const re = /^(05|5)(5|0|3|6|4|9|1|8|7)([0-9]{7})$/;
        return re.test(phone);
    },

    // Smooth scroll to element
    scrollTo(elementId) {
        const element = document.getElementById(elementId) || document.querySelector(elementId);
        if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    },

    // Local storage helpers
    storage: {
        set(key, value) {
            localStorage.setItem(key, JSON.stringify(value));
        },
        get(key) {
            const item = localStorage.getItem(key);
            return item ? JSON.parse(item) : null;
        },
        remove(key) {
            localStorage.removeItem(key);
        },
        clear() {
            localStorage.clear();
        }
    }
};

// Modal Manager
const Modal = {
    create(title, content, footer = null) {
        const modal = Utils.createElement('div', ['modal']);
        modal.innerHTML = `
            <div class="modal-backdrop" onclick="Modal.close(this.parentElement)"></div>
            <div class="modal-content">
                <div class="modal-header">
                    <h3 class="modal-title">${title}</h3>
                    <button class="modal-close" onclick="Modal.close(this.closest('.modal'))">&times;</button>
                </div>
                <div class="modal-body">${content}</div>
                ${footer ? `<div class="modal-footer">${footer}</div>` : ''}
            </div>
        `;
        return modal;
    },

    show(modal) {
        document.getElementById('modal-container').appendChild(modal);
        setTimeout(() => modal.classList.add('active'), 10);
    },

    close(modal) {
        modal.classList.remove('active');
        setTimeout(() => modal.remove(), 300);
    }
};

// API Service
const API = {
    async request(endpoint, options = {}) {
        Utils.showLoading();
        try {
            const response = await fetch(`${API_BASE_URL}${endpoint}`, {
                ...options,
                headers: {
                    'Content-Type': 'application/json',
                    'apikey': API_KEY,
                    ...options.headers
                }
            });

            if (!response.ok) {
                throw new Error('خطأ في الاتصال بالخادم');
            }

            return await response.json();
        } catch (error) {
            Utils.showToast('خطأ', error.message, 'error');
            throw error;
        } finally {
            Utils.hideLoading();
        }
    },

    async get(endpoint) {
        return this.request(endpoint, { method: 'GET' });
    },

    async post(endpoint, data) {
        return this.request(endpoint, {
            method: 'POST',
            body: JSON.stringify(data)
        });
    },

    async put(endpoint, data) {
        return this.request(endpoint, {
            method: 'PUT',
            body: JSON.stringify(data)
        });
    },

    async delete(endpoint) {
        return this.request(endpoint, { method: 'DELETE' });
    }
};

// Auth Service
const Auth = {
    async login(email, password) {
        try {
            const data = await API.post('/auth/v1/token?grant_type=password', {
                email,
                password
            });

            AppState.user = data.user;
            Utils.storage.set('user', data.user);
            Utils.storage.set('token', data.access_token);

            Utils.showToast('نجح', 'تم تسجيل الدخول بنجاح', 'success');
            return data;
        } catch (error) {
            Utils.showToast('خطأ', 'فشل تسجيل الدخول', 'error');
            throw error;
        }
    },

    async register(userData) {
        try {
            const data = await API.post('/auth/v1/signup', userData);
            Utils.showToast('نجح', 'تم التسجيل بنجاح! يرجى تأكيد البريد الإلكتروني', 'success');
            return data;
        } catch (error) {
            Utils.showToast('خطأ', 'فشل التسجيل', 'error');
            throw error;
        }
    },

    logout() {
        AppState.user = null;
        Utils.storage.clear();
        Utils.showToast('نجح', 'تم تسجيل الخروج', 'success');
        window.location.href = '/';
    },

    isAuthenticated() {
        return !!Utils.storage.get('user');
    },

    getUser() {
        return Utils.storage.get('user');
    }
};

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    // Check if user is logged in
    const user = Auth.getUser();
    if (user) {
        AppState.user = user;
    }

    // Initialize smooth scroll for nav links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const target = this.getAttribute('href');
            Utils.scrollTo(target);
        });
    });

    // Active nav link on scroll
    const sections = document.querySelectorAll('section[id]');
    const navLinks = document.querySelectorAll('.nav-link');

    window.addEventListener('scroll', () => {
        let current = '';
        sections.forEach(section => {
            const sectionTop = section.offsetTop;
            const sectionHeight = section.clientHeight;
            if (window.pageYOffset >= sectionTop - 100) {
                current = section.getAttribute('id');
            }
        });

        navLinks.forEach(link => {
            link.classList.remove('active');
            if (link.getAttribute('href') === `#${current}`) {
                link.classList.add('active');
            }
        });
    });
});

// Mobile menu toggle
function toggleMobileMenu() {
    const navLinks = document.querySelector('.nav-links');
    const navActions = document.querySelector('.nav-actions');
    navLinks?.classList.toggle('active');
    navActions?.classList.toggle('active');
}

// Export for use in other files
window.Karam = {
    Utils,
    Modal,
    API,
    Auth,
    AppState
};
