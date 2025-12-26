// ============================================
// Karam Platform - Booking Engine
// محرك الحجز المتقدم
// ============================================
// Version: 2.0
// Author: Dr. Shakir Alhuthali
// ============================================

class KaramBookingEngine {
    constructor() {
        this.cart = [];
        this.selectedDate = null;
        this.selectedTimeSlot = null;
        this.selectedMajlis = null;
        this.guestCount = 1;
        this.selectedPackage = null;
        this.appliedCoupon = null;

        // Load cart from localStorage
        this.loadCart();
    }

    // ============================================
    // Availability Checking
    // ============================================

    async checkAvailability(majlisId, date, timeSlot) {
        try {
            const { data, error } = await karamDB.select('family_availability', {
                eq: {
                    majlis_id: majlisId,
                    date: date,
                    time_slot: timeSlot
                },
                single: true
            });

            if (error) throw error;

            return {
                available: data?.is_available || false,
                availableSlots: data?.available_slots || 0,
                data: data
            };

        } catch (error) {
            console.error('Error checking availability:', error);
            return { available: false, availableSlots: 0 };
        }
    }

    async getAvailableDates(majlisId, startDate, endDate) {
        try {
            const { data, error } = await karamDB.select('family_availability', {
                eq: { majlis_id: majlisId, is_available: true },
                gte: { date: startDate },
                lte: { date: endDate },
                order: { column: 'date', ascending: true }
            });

            if (error) throw error;

            return data || [];

        } catch (error) {
            console.error('Error getting available dates:', error);
            return [];
        }
    }

    // ============================================
    // Package Management
    // ============================================

    async getPackages() {
        try {
            const { data, error } = await karamDB.select('packages', {
                eq: { is_active: true }
            }, true); // Use cache

            if (error) throw error;

            return data || [];

        } catch (error) {
            console.error('Error getting packages:', error);
            return [];
        }
    }

    async getPackageById(packageId) {
        try {
            const { data, error } = await karamDB.select('packages', {
                eq: { id: packageId },
                single: true
            }, true);

            if (error) throw error;

            return data;

        } catch (error) {
            console.error('Error getting package:', error);
            return null;
        }
    }

    // ============================================
    // Price Calculation
    // ============================================

    async calculateBookingPrice(packageId, guestCount, majlisId, couponCode = null) {
        try {
            // Get package price
            const packageData = await this.getPackageById(packageId);
            if (!packageData) throw new Error('Package not found');

            const basePrice = packageData.price_per_person * guestCount;

            // Get majlis city for coupon validation
            const { data: majlisData } = await karamDB.select('majlis', {
                eq: { id: majlisId },
                select: 'city, families(city)',
                single: true
            });

            let discount = 0;
            let couponId = null;

            // Apply coupon if provided
            if (couponCode) {
                const couponResult = await this.validateCoupon(
                    couponCode,
                    basePrice,
                    majlisData.families.city,
                    packageData.package_type
                );

                if (couponResult.valid) {
                    discount = couponResult.discount_amount;
                    couponId = couponResult.coupon_id;
                }
            }

            const totalAmount = basePrice - discount;

            // Get commission rate
            const { data: settings } = await karamDB.select('platform_settings', {
                eq: { setting_key: 'commission_percentage' },
                single: true
            });

            const commissionRate = parseFloat(settings?.setting_value || 20) / 100;
            const commissionAmount = totalAmount * commissionRate;
            const familyAmount = totalAmount - commissionAmount;

            return {
                basePrice,
                discount,
                totalAmount,
                commissionAmount,
                familyAmount,
                couponId,
                pricePerPerson: packageData.price_per_person,
                breakdown: {
                    package: packageData.package_type,
                    guests: guestCount,
                    pricePerGuest: packageData.price_per_person,
                    subtotal: basePrice,
                    couponDiscount: discount,
                    total: totalAmount,
                    commission: commissionAmount,
                    familyEarning: familyAmount
                }
            };

        } catch (error) {
            console.error('Error calculating price:', error);
            return null;
        }
    }

    // ============================================
    // Coupon Validation
    // ============================================

    async validateCoupon(couponCode, bookingAmount, city, packageType) {
        try {
            const { user } = await karamDB.getCurrentUser();
            if (!user) throw new Error('User not authenticated');

            const { data, error } = await karamDB.rpc('validate_coupon', {
                p_code: couponCode,
                p_user_id: user.id,
                p_booking_amount: bookingAmount,
                p_city: city,
                p_package_type: packageType
            });

            if (error) throw error;

            const result = data[0];

            return {
                valid: result.is_valid,
                discount_amount: result.discount_amount || 0,
                coupon_id: result.coupon_id,
                message: result.message
            };

        } catch (error) {
            console.error('Error validating coupon:', error);
            return {
                valid: false,
                discount_amount: 0,
                message: error.message
            };
        }
    }

    // ============================================
    // Cart Management
    // ============================================

    async addToCart(bookingData) {
        // Calculate price
        const pricing = await this.calculateBookingPrice(
            bookingData.packageId,
            bookingData.guestCount,
            bookingData.majlisId,
            bookingData.couponCode
        );

        if (!pricing) {
            throw new Error('Failed to calculate pricing');
        }

        // Check availability
        const availability = await this.checkAvailability(
            bookingData.majlisId,
            bookingData.date,
            bookingData.timeSlot
        );

        if (!availability.available || availability.availableSlots < bookingData.guestCount) {
            throw new Error('Selected time slot is not available');
        }

        // Create cart item
        const cartItem = {
            id: Date.now().toString(),
            majlisId: bookingData.majlisId,
            familyName: bookingData.familyName,
            date: bookingData.date,
            timeSlot: bookingData.timeSlot,
            guestCount: bookingData.guestCount,
            packageId: bookingData.packageId,
            packageName: bookingData.packageName,
            couponCode: bookingData.couponCode,
            pricing: pricing,
            addedAt: new Date().toISOString()
        };

        this.cart.push(cartItem);
        this.saveCart();

        return cartItem;
    }

    removeFromCart(itemId) {
        this.cart = this.cart.filter(item => item.id !== itemId);
        this.saveCart();
    }

    clearCart() {
        this.cart = [];
        this.saveCart();
    }

    getCart() {
        return this.cart;
    }

    getCartTotal() {
        return this.cart.reduce((total, item) => total + item.pricing.totalAmount, 0);
    }

    getCartItemCount() {
        return this.cart.length;
    }

    saveCart() {
        localStorage.setItem('karam_cart', JSON.stringify(this.cart));

        // Dispatch cart updated event
        window.dispatchEvent(new CustomEvent('cartUpdated', {
            detail: {
                cart: this.cart,
                total: this.getCartTotal(),
                count: this.getCartItemCount()
            }
        }));
    }

    loadCart() {
        const saved = localStorage.getItem('karam_cart');
        this.cart = saved ? JSON.parse(saved) : [];
    }

    // ============================================
    // Create Booking
    // ============================================

    async createBooking(cartItem, paymentDetails) {
        try {
            const { user } = await karamDB.getCurrentUser();
            if (!user) throw new Error('User must be logged in');

            // Get visitor ID
            const { data: visitor } = await karamDB.select('visitors', {
                eq: { user_id: user.id },
                single: true
            });

            if (!visitor) throw new Error('Visitor profile not found');

            // Create booking
            const { data, error } = await karamDB.insert('bookings', {
                visitor_id: visitor.id,
                majlis_id: cartItem.majlisId,
                package_id: cartItem.packageId,
                booking_date: cartItem.date,
                time_slot: cartItem.timeSlot,
                guest_count: cartItem.guestCount,
                total_amount: cartItem.pricing.totalAmount,
                commission_amount: cartItem.pricing.commissionAmount,
                family_amount: cartItem.pricing.familyAmount,
                coupon_id: cartItem.pricing.couponId,
                coupon_discount_amount: cartItem.pricing.discount,
                payment_status: 'pending',
                booking_status: 'pending',
                payment_method: paymentDetails.method || 'moyasar',
                payment_transaction_id: paymentDetails.transactionId
            }, { select: '*' });

            if (error) throw error;

            return data[0];

        } catch (error) {
            console.error('Error creating booking:', error);
            throw error;
        }
    }

    async createBookings(paymentDetails) {
        try {
            const bookings = [];

            for (const cartItem of this.cart) {
                const booking = await this.createBooking(cartItem, paymentDetails);
                bookings.push(booking);
            }

            // Clear cart after successful booking
            this.clearCart();

            return bookings;

        } catch (error) {
            console.error('Error creating bookings:', error);
            throw error;
        }
    }

    // ============================================
    // Update Booking Status
    // ============================================

    async updateBookingPaymentStatus(bookingId, status, transactionId = null) {
        try {
            const updateData = {
                payment_status: status,
                updated_at: new Date().toISOString()
            };

            if (transactionId) {
                updateData.payment_transaction_id = transactionId;
            }

            if (status === 'paid') {
                updateData.booking_status = 'confirmed';
                updateData.confirmed_at = new Date().toISOString();
            }

            const { data, error } = await karamDB.update(
                'bookings',
                updateData,
                { id: bookingId },
                { select: '*' }
            );

            if (error) throw error;

            return data[0];

        } catch (error) {
            console.error('Error updating booking status:', error);
            throw error;
        }
    }

    // ============================================
    // Get User Bookings
    // ============================================

    async getMyBookings(status = null) {
        try {
            const { user } = await karamDB.getCurrentUser();
            if (!user) throw new Error('User not authenticated');

            const { data: visitor } = await karamDB.select('visitors', {
                eq: { user_id: user.id },
                single: true
            });

            const query = {
                eq: { visitor_id: visitor.id },
                select: `
                    *,
                    majlis!inner(
                        id,
                        majlis_name,
                        families!inner(
                            family_name,
                            contact_phone,
                            city
                        )
                    ),
                    packages(package_type, description_ar, description_en)
                `,
                order: { column: 'created_at', ascending: false }
            };

            if (status) {
                query.eq.booking_status = status;
            }

            const { data, error } = await karamDB.select('bookings', query);

            if (error) throw error;

            return data || [];

        } catch (error) {
            console.error('Error getting bookings:', error);
            return [];
        }
    }

    // ============================================
    // Cancel Booking
    // ============================================

    async cancelBooking(bookingId, reason) {
        try {
            const { user } = await karamDB.getCurrentUser();
            if (!user) throw new Error('User not authenticated');

            const { data, error } = await karamDB.rpc('cancel_booking', {
                p_booking_id: bookingId,
                p_cancelled_by: user.id,
                p_reason: reason
            });

            if (error) throw error;

            const result = data[0];

            return {
                success: result.success,
                refundAmount: result.refund_amount,
                message: result.message
            };

        } catch (error) {
            console.error('Error cancelling booking:', error);
            return {
                success: false,
                message: error.message
            };
        }
    }
}

// ============================================
// Initialize Global Instance
// ============================================

const bookingEngine = new KaramBookingEngine();

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { bookingEngine };
}

console.log('✅ Karam Booking Engine initialized');
