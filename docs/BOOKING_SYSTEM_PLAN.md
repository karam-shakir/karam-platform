# 🗓️ Booking System Implementation Plan

**الهدف:** إنشاء نظام حجز كامل للمجالس  
**الوقت المقدر:** 3 ساعات  
**البداية:** 4:46 مساءً

---

## المرحلة 1: Database Schema (30 دقيقة)

### 1.1 Bookings Table
```sql
CREATE TABLE bookings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    visitor_id UUID REFERENCES visitors(id) ON DELETE CASCADE,
    majlis_id UUID REFERENCES majlis(id) ON DELETE CASCADE,
    booking_date DATE NOT NULL,
    time_slot TEXT NOT NULL CHECK (time_slot IN ('morning', 'afternoon', 'evening')),
    guests_count INTEGER NOT NULL CHECK (guests_count > 0),
    total_price DECIMAL(10,2) NOT NULL,
    booking_status TEXT DEFAULT 'pending' CHECK (booking_status IN ('pending', 'confirmed', 'cancelled', 'completed')),
    payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'failed', 'refunded')),
    payment_method TEXT CHECK (payment_method IN ('moyasar', 'wallet', 'cash')),
    transaction_id TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(majlis_id, booking_date, time_slot)
);

CREATE INDEX idx_bookings_visitor ON bookings(visitor_id);
CREATE INDEX idx_bookings_majlis ON bookings(majlis_id);
CREATE INDEX idx_bookings_date ON bookings(booking_date);
CREATE INDEX idx_bookings_status ON bookings(booking_status);
```

### 1.2 RLS Policies
```sql
-- Visitors see their bookings
CREATE POLICY "Visitors view own bookings"
ON bookings FOR SELECT TO authenticated
USING (visitor_id IN (SELECT id FROM visitors WHERE user_id = auth.uid()));

-- Families see bookings for their majlis
CREATE POLICY "Families view majlis bookings"
ON bookings FOR SELECT TO authenticated
USING (majlis_id IN (
    SELECT m.id FROM majlis m
    JOIN families f ON m.family_id = f.id
    WHERE f.user_id = auth.uid()
));

-- Visitors can create bookings
CREATE POLICY "Visitors create bookings"
ON bookings FOR INSERT TO authenticated
WITH CHECK (visitor_id IN (SELECT id FROM visitors WHERE user_id = auth.uid()));

-- Visitors can update their pending bookings
CREATE POLICY "Visitors update own bookings"
ON bookings FOR UPDATE TO authenticated
USING (visitor_id IN (SELECT id FROM visitors WHERE user_id = auth.uid()) AND booking_status = 'pending');

-- Families can update bookings for their majlis
CREATE POLICY "Families update majlis bookings"
ON bookings FOR UPDATE TO authenticated
USING (majlis_id IN (
    SELECT m.id FROM majlis m
    JOIN families f ON m.family_id = f.id
    WHERE f.user_id = auth.uid()
));
```

### 1.3 Availability Tracking (Optional - Phase 2)
```sql
CREATE TABLE majlis_availability (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    majlis_id UUID REFERENCES majlis(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    time_slot TEXT NOT NULL,
    is_available BOOLEAN DEFAULT true,
    price_override DECIMAL(10,2),
    max_capacity INTEGER,
    UNIQUE(majlis_id, date, time_slot)
);
```

---

## المرحلة 2: Browse & Search (1 ساعة)

### 2.1 Update browse-families-calendar.html
**Features:**
- Search by city, date, guests
- Filter by majlis type (men/women)
- Show availability for selected date
- Price display
- "Book Now" button

### 2.2 Update js/browse-calendar.js
```javascript
class BrowseCalendar {
    async searchMajalis(filters) {
        // Search with date availability check
        // Return available majalis only
    }
    
    async checkAvailability(majlisId, date, timeSlot) {
        // Check if slot is booked
        // Return true/false
    }
    
    showMajlisDetails(majlis) {
        // Show in modal with booking form
    }
}
```

---

## المرحلة 3: Booking Flow (1 ساعة)

### 3.1 Booking Form Modal
في browse-families-calendar.html:
```html
<div id="bookingModal" class="modal">
    <form id="bookingForm">
        <input type="hidden" id="selected-majlis-id">
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

### 3.2 Create Booking Function
```javascript
async createBooking(bookingData) {
    // 1. Validate availability
    const available = await this.checkAvailability(...);
    if (!available) return alert('غير متاح');
    
    // 2. Calculate price
    const totalPrice = majlis.base_price * guests_count;
    
    // 3. Insert booking
    const { data, error } = await karamDB.insert('bookings', {
        visitor_id: currentVisitor.id,
        majlis_id: bookingData.majlisId,
        booking_date: bookingData.date,
        time_slot: bookingData.timeSlot,
        guests_count: bookingData.guestsCount,
        total_price: totalPrice,
        booking_status: 'pending',
        payment_status: 'pending'
    });
    
    // 4. Redirect to payment or confirmation
    window.location.href = 'booking-success.html?id=' + data.id;
}
```

---

## المرحلة 4: Family Bookings Management (30 دقيقة)

### 4.1 Update family-bookings.html
**Sections:**
- Upcoming bookings (confirmed, pending)
- Past bookings (completed, cancelled)
- Booking details modal
- Accept/Reject buttons

### 4.2 Update js/family-bookings.js
```javascript
class FamilyBookings {
    async loadBookings() {
        // Get all bookings for family's majalis
        // Group by status
        // Display in tables
    }
    
    async updateBookingStatus(bookingId, status) {
        // Confirm or cancel booking
        // Update database
        // Send notification (future)
    }
    
    showBookingDetails(booking) {
        // Show in modal with visitor info
    }
}
```

---

## 📊 Timeline

| الوقت | المهمة |
|-------|--------|
| 4:46-5:15 | Database Schema + RLS |
| 5:15-6:15 | Browse & Search UI |
| 6:15-7:15 | Booking Flow + Form |
| 7:15-7:45 | Family Bookings Management |
| 7:45-8:00 | Testing + Deploy |

---

## ✅ Success Criteria

### Must Have:
- [x] Database schema created
- [ ] Visitor can search available majalis
- [ ] Visitor can create booking (pending payment)
- [ ] Family can view bookings
- [ ] Family can confirm/cancel bookings

### Nice to Have:
- [ ] Calendar UI (visual)
- [ ] Availability blocking
- [ ] Email notifications
- [ ] Advanced filters

---

## 🚀 الخطوة الأولى: Database Schema

سأبدأ الآن بإنشاء SQL script للtables والRLS policies.
