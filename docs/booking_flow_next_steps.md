# 🗓️ Booking Flow Implementation - الخطوات التالية

**الوقت:** 4:54 مساءً  
**المتبقي:** ~2.5 ساعة

---

## ✅ تم إنجازه:
- Database schema (bookings + availability tables)
- RLS policies
- Triggers

---

## 🎯 المرحلة التالية (الآن - 2.5 ساعة):

### 1. Browse & Search (45 دقيقة)
**ملفات:**
- `browse-families-calendar.html` - تحديث
- `js/browse-calendar.js` - إنشاء/تحديث

**Features:**
- Search filters (city, date, guests, type)
- Display available majalis
- Show price
- "Book Now" button → opens modal

### 2. Booking Modal & Form (30 دقيقة)
**في browse-families-calendar.html:**
```html
<div id="bookingModal" class="modal">
    <form id="bookingForm">
        <h2>حجز مجلس</h2>
        <input type="date" id="booking-date" required>
        <select id="time-slot" required>
            <option value="morning">صباحي (8ص - 12م)</option>
            <option value="afternoon">مسائي (12م - 5م)</option>
            <option value="evening">ليلي (5م - 12ص)</option>
        </select>
        <input type="number" id="guests-count" min="1" required>
        <div id="price-summary"></div>
        <button type="submit">تأكيد الحجز</button>
    </form>
</div>
```

### 3. Create Booking Function (30 دقيقة)
**في js/browse-calendar.js:**
```javascript
async createBooking(bookingData) {
    // 1. Check availability
    const available = await this.checkAvailability(...);
    if (!available) return alert('غير متاح');
    
    // 2. Get current user
    const { user } = await karamAuth.getCurrentUser();
    
    // 3. Insert booking
    const { data, error } = await karamDB.insert('bookings', {
        user_id: user.id,
        majlis_id: bookingData.majlisId,
        booking_date: bookingData.date,
        time_slot: bookingData.timeSlot,
        guests_count: bookingData.guestsCount,
        total_price: bookingData.totalPrice,
        customer_name: user.user_metadata.full_name,
        customer_email: user.email
    });
    
    // 4. Show success
    alert('✅ تم الحجز بنجاح!');
    window.location.href = 'visitor-bookings.html';
}
```

### 4. Family Bookings Management (45 دقيقة)
**ملفات:**
- `family-bookings.html` - تحديث
- `js/family-bookings.js` - تحديث

**Features:**
- Upcoming bookings table
- Past bookings table
- Confirm/Cancel buttons
- Booking details modal

---

## Timeline:

| الوقت | المهمة |
|-------|--------|
| 4:54-5:40 | Browse & Search UI |
| 5:40-6:10 | Booking Modal & Form |
| 6:10-6:40 | Create Booking Function |
| 6:40-7:25 | Family Bookings Management |
| 7:25-7:45 | Testing & Deploy |
| 7:45-8:00 | Buffer/Documentation |

---

**نبدأ الآن! 🚀**
