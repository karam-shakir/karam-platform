// Cart Management Logic

const Cart = {
    items: [],

    init() {
        this.load();
        this.updateUI();

        // Add event listener for cart close button if it exists
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('close-cart') || e.target.classList.contains('cart-overlay')) {
                this.close();
            }
        });
    },

    load() {
        const saved = localStorage.getItem('karam_cart');
        if (saved) {
            this.items = JSON.parse(saved);
        }
    },

    save() {
        localStorage.setItem('karam_cart', JSON.stringify(this.items));
        this.updateUI();
    },

    add(item) {
        // Check if item already exists
        const existing = this.items.find(i => i.id === item.id && i.type === item.type);
        if (existing) {
            if (window.Karam && window.Karam.Utils) {
                window.Karam.Utils.showToast('موجود بالفعل', 'هذا العنصر موجود في سلتك', 'info');
            } else {
                alert('هذا العنصر موجود بالفعل في السلة');
            }
            this.open();
            return;
        }

        this.items.push(item);
        this.save();
        this.open();

        if (window.Karam && window.Karam.Utils) {
            window.Karam.Utils.showToast('تمت الإضافة', 'تمت إضافة العنصر للسلة', 'success');
        }
    },

    remove(itemId) {
        this.items = this.items.filter(item => item.id !== itemId);
        this.save();
    },

    clear() {
        this.items = [];
        this.save();
    },

    open() {
        const sidebar = document.getElementById('cart-sidebar');
        const overlay = document.getElementById('cart-overlay');
        if (sidebar && overlay) {
            sidebar.classList.add('open');
            overlay.classList.add('open');
        }
    },

    close() {
        const sidebar = document.getElementById('cart-sidebar');
        const overlay = document.getElementById('cart-overlay');
        if (sidebar && overlay) {
            sidebar.classList.remove('open');
            overlay.classList.remove('open');
        }
    },

    updateUI() {
        const cartItems = document.getElementById('cart-items');
        const cartCount = document.getElementById('cart-count');
        const cartTotal = document.getElementById('cart-total');

        if (cartCount) cartCount.textContent = this.items.length;

        if (!cartItems) return;

        if (this.items.length === 0) {
            cartItems.innerHTML = `
                <div class="empty-cart">
                    <p>سلتك فارغة</p>
                    <p class="text-muted">أضف باقة أو منتج لتبدأ الحجز</p>
                </div>
            `;
            if (cartTotal) cartTotal.textContent = '0 ريال';
            return;
        }

        let total = 0;
        cartItems.innerHTML = this.items.map(item => {
            total += item.price;
            return `
                <div class="cart-item">
                    <img src="${item.image}" alt="${item.name}" class="cart-item-image">
                    <div class="cart-item-details">
                        <h4 class="cart-item-title">${item.name}</h4>
                        <div class="cart-item-meta">
                            <span class="cart-item-type">${item.type === 'family' ? 'باقة ضيافة' : 'منتج'}</span>
                            <span class="cart-item-price">${item.price} ريال</span>
                        </div>
                    </div>
                    <button onclick="Cart.remove('${item.id}')" class="cart-item-remove" title="حذف">✕</button>
                </div>
            `;
        }).join('');

        if (cartTotal) cartTotal.textContent = `${total} ريال`;
    },

    checkout() {
        if (this.items.length === 0) return;

        const user = localStorage.getItem('user');
        if (!user) {
            if (window.Karam && window.Karam.Utils) {
                window.Karam.Utils.showToast('تنبيه', 'يرجى تسجيل الدخول لإتمام الحجز', 'warning');
            } else {
                alert('يرجى تسجيل الدخول لإتمام الحجز');
            }
            setTimeout(() => {
                window.location.href = 'login.html';
            }, 1500);
            return;
        }

        if (window.Karam && window.Karam.Utils) {
            window.Karam.Utils.showToast('جاري التحويل', 'جاري تحويلك لصفحة الدفع...', 'success');
        }
        // Redirect to checkout or Salla integration
    }
}

/**
 * إتمام عملية الشراء والدفع
 */
async function checkout() {
    const items = Cart.getItems();

    if (items.length === 0) {
        showNotification('السلة فارغة', 'warning');
        return;
    }

    // التحقق من تسجيل دخول المستخدم
    const userStr = localStorage.getItem('karam_user');
    if (!userStr) {
        showNotification('يرجى تسجيل الدخول أولاً', 'warning');
        setTimeout(() => {
            window.location.href = 'login.html?redirect=' + encodeURIComponent(window.location.href);
        }, 1500);
        return;
    }

    const user = JSON.parse(userStr);
    const total = Cart.getTotal();

    // إنشاء بيانات الحجز
    const bookingData = {
        items: items,
        totalAmount: total,
        userEmail: user.email,
        userName: user.name || user.email
    };

    // استدعاء نظام الدفع من payment.js
    if (typeof createCheckout === 'function') {
        await createCheckout(bookingData);
    } else {
        console.error('Payment system not loaded');
        showNotification('حدث خطأ في تحميل نظام الدفع', 'error');
    }
};

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    Cart.init();

    // Expose to window
    window.Karam = window.Karam || {};
    window.Karam.Cart = Cart;
});
