# 📋 خطة العمل - الخميس 26 ديسمبر 2025

**الهدف:** إكمال منصة كرم 100% - جاهزة للإنتاج الكامل

**الوقت المقدر:** 4-6 ساعات

---

## 🔴 المرحلة 1: إصلاح الأزرار (أولوية قصوى)
**الوقت:** 1-2 ساعة | **الحالة:** ⏳ قيد الانتظار

### المشكلة الحالية:
- ❌ أزرار تعديل/تعطيل/حذف لا تعمل
- ❌ زر "إضافة مجلس" في header لا يعمل

### الحل المقترح:

#### الخطوة 1.1: Debug الأزرار
```javascript
// في family-majlis.js
// Test 1: تأكد أن window functions موجودة
console.log('Testing:', {
    edit: typeof window.majlisEdit,
    toggle: typeof window.majlisToggle,
    delete: typeof window.majlisDelete
});
```

**الاحتمالات:**
1. **Script loading order** - family-majlis.js يُحمل بعد HTML
2. **onclick syntax error** - template string issue
3. **CSP Policy** - Vercel يمنع inline scripts

#### الخطوة 1.2: الحل البديل - Event Delegation
```javascript
// في family-majlis.js - بعد render()
document.getElementById('majlis-list').addEventListener('click', (e) => {
    const btn = e.target;
    if (btn.dataset.action) {
        const index = parseInt(btn.dataset.index);
        switch(btn.dataset.action) {
            case 'edit': this.editMajlis(index); break;
            case 'toggle': this.toggleMajlis(index); break;
            case 'delete': this.deleteMajlis(index); break;
        }
    }
});
```

#### الخطوة 1.3: إضافة Modal للتعديل
بدلاً من `prompt()` - modal HTML كامل:
- Form للتعديل
- Validation
- Better UX

#### الخطوة 1.4: زر إضافة مجلس
```html
<!-- في family-majlis.html header -->
<button id="btn-add-majlis" class="btn-add">➕ إضافة مجلس</button>

<script>
document.getElementById('btn-add-majlis').addEventListener('click', () => {
    majlisManager.showAddModal();
});
</script>
```

**النتائج المتوقعة:**
- ✅ جميع الأزرار تعمل 100%
- ✅ Modal احترافي للتعديل
- ✅ زر إضافة يعمل

---

## 🟠 المرحلة 2: إكمال Family Majlis Features
**الوقت:** 1 ساعة | **الحالة:** ⏳ قيد الانتظار

### 2.1: إضافة Upload للصور
```javascript
// في showAddModal() - إضافة photo upload
async uploadPhotos(files, majlisId) {
    const uploaded = [];
    for (const file of files) {
        const path = `${majlisId}/${Date.now()}_${file.name}`;
        const { data, error } = await karamDB.uploadFile(
            'majlis-photos',
            path,
            file
        );
        if (!error) uploaded.push(data.publicUrl);
    }
    return uploaded;
}
```

### 2.2: تحسين Card Design
- ✅ Photo gallery slider
- ✅ Amenities icons
- ✅ Location map preview
- ✅ Active/Inactive badge

### 2.3: Search & Filter
```javascript
// إضافة في family-majlis.html
<input type="text" id="search-majlis" placeholder="بحث..." />
<select id="filter-type">
    <option value="">الكل</option>
    <option value="men">رجالي</option>
    <option value="women">نسائي</option>
</select>
<select id="filter-status">
    <option value="">الكل</option>
    <option value="true">نشط</option>
    <option value="false">معطل</option>
</select>
```

**النتائج المتوقعة:**
- ✅ Upload صور يعمل
- ✅ Cards جميلة ومحترفة
- ✅ Search & filter يعمل

---

## 🟡 المرحلة 3: Phase 4 - Booking System
**الوقت:** 2-3 ساعات | **الحالة:** ⏳ لم يبدأ

### 3.1: Database Schema - Bookings
```sql
-- في Supabase SQL Editor
CREATE TABLE bookings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    visitor_id UUID REFERENCES visitors(id),
    majlis_id UUID REFERENCES majlis(id),
    booking_date DATE NOT NULL,
    time_slot TEXT NOT NULL, -- 'morning', 'afternoon', 'evening'
    guests_count INTEGER NOT NULL,
    total_price DECIMAL(10,2) NOT NULL,
    booking_status TEXT DEFAULT 'pending', -- pending, confirmed, cancelled
    payment_status TEXT DEFAULT 'pending', -- pending, paid, failed, refunded
    payment_method TEXT, -- moyasar, wallet, cash
    transaction_id TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS Policies
CREATE POLICY "Visitors can view their bookings"
ON bookings FOR SELECT TO authenticated
USING (visitor_id IN (
    SELECT id FROM visitors WHERE user_id = auth.uid()
));

CREATE POLICY "Families can view their majlis bookings"
ON bookings FOR SELECT TO authenticated
USING (majlis_id IN (
    SELECT m.id FROM majlis m
    JOIN families f ON m.family_id = f.id
    WHERE f.user_id = auth.uid()
));
```

### 3.2: Availability Table
```sql
CREATE TABLE majlis_availability (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    majlis_id UUID REFERENCES majlis(id),
    date DATE NOT NULL,
    time_slot TEXT NOT NULL,
    is_available BOOLEAN DEFAULT true,
    price_override DECIMAL(10,2), -- سعر مخصص لهذا اليوم
    UNIQUE(majlis_id, date, time_slot)
);
```

### 3.3: Booking Flow - Visitor Side
1. **browse-families-calendar.html** - تحديث
2. **booking-form.html** - جديد
3. **booking-confirmation.html** - جديد
4. **js/booking-engine.js** - تحديث

### 3.4: Booking Management - Family Side
1. **family-bookings.html** - تحديث كامل
2. **js/family-bookings.js** - CRUD للحجوزات
3. Dashboard stats update

**النتائج المتوقعة:**
- ✅ Visitors يمكنهم حجز مجلس
- ✅ Families يديرون حجوزاتهم
- ✅ Calendar يعرض availability

---

## 🟢 المرحلة 4: Payment Integration (Moyasar)
**الوقت:** 1-2 ساعة | **الحالة:** ⏳ لم يبدأ

### 4.1: Setup Moyasar
```javascript
// في js/config.js
const MOYASAR_API_KEY = 'pk_test_...'; // من Moyasar Dashboard
```

### 4.2: Payment Flow
```javascript
// في js/moyasar-payment.js
async function initiateMoyasarPayment(booking) {
    Moyasar.init({
        element: '.payment-form',
        amount: booking.total_price * 100, // halalas
        currency: 'SAR',
        description: `حجز مجلس - ${booking.majlis_name}`,
        publishable_api_key: MOYASAR_API_KEY,
        callback_url: `${window.location.origin}/booking-success.html`,
        methods: ['creditcard', 'applepay', 'stcpay']
    });
}
```

### 4.3: Wallet System
```sql
CREATE TABLE wallet_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    wallet_id UUID REFERENCES wallets(id),
    amount DECIMAL(10,2) NOT NULL,
    transaction_type TEXT NOT NULL, -- credit, debit
    description TEXT,
    related_booking_id UUID REFERENCES bookings(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**النتائج المتوقعة:**
- ✅ Moyasar payment يعمل
- ✅ Wallet system كامل
- ✅ Transaction history

---

## 🔵 المرحلة 5: Reviews & Ratings
**الوقت:** 1 ساعة | **الحالة:** ⏳ اختياري

### 5.1: Database
```sql
CREATE TABLE reviews (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    booking_id UUID REFERENCES bookings(id),
    visitor_id UUID REFERENCES visitors(id),
    majlis_id UUID REFERENCES majlis(id),
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    photos TEXT[],
    is_approved BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 5.2: UI Components
- Review form (after booking)
- Reviews display on majlis card
- Average rating calculation

---

## 🟣 المرحلة 6: Testing & QA
**الوقت:** 1 ساعة | **الحالة:** ⏳ نهائي

### 6.1: Checklist
- [ ] Login/Register (all user types)
- [ ] Family: Add/Edit/Delete/Toggle Majlis
- [ ] Visitor: Browse → Book → Pay
- [ ] Family: View/Manage Bookings
- [ ] Wallet: Deposit/Withdraw
- [ ] Reviews: Add/View
- [ ] Operator: Approve families
- [ ] Mobile responsive
- [ ] Performance (loading speed)
- [ ] Security (RLS policies)

### 6.2: Bug Fixes
- Fix any issues found
- Performance optimization
- UI/UX polish

---

## 📊 جدول زمني مقترح

| الوقت | المهمة | المدة |
|-------|--------|-------|
| 09:00-11:00 | المرحلة 1: إصلاح الأزرار | 2 ساعة |
| 11:00-12:00 | المرحلة 2: Family Majlis Features | 1 ساعة |
| 12:00-12:30 | استراحة ☕ | 30 دقيقة |
| 12:30-15:30 | المرحلة 3: Booking System | 3 ساعات |
| 15:30-17:00 | المرحلة 4: Payment Integration | 1.5 ساعة |
| 17:00-18:00 | المرحلة 6: Testing & Deploy | 1 ساعة |

**إجمالي:** ~8 ساعات (مع استراحات)

---

## 🎯 الأولويات

### Must Have (يجب إكماله):
1. ✅ إصلاح أزرار المجالس
2. ✅ Booking system أساسي
3. ✅ Payment integration
4. ✅ Testing شامل

### Nice to Have (إذا توفر وقت):
1. Reviews system
2. Advanced filters
3. Photo gallery slider
4. Notifications

---

## 📝 ملاحظات مهمة

### قبل البدء غداً:
1. ✅ **Pull من GitHub** - تأكد آخر نسخة موجودة
   ```bash
   git pull origin main
   ```

2. ✅ **Backup Database** - في Supabase Dashboard

3. ✅ **Test Environment** - تأكد server يعمل
   ```bash
   python serve.py
   ```

### أثناء العمل:
- 💾 **Commit كل ساعة:**
  ```bash
  git add .
  git commit -m "Progress: وصف ما تم"
  git push
  ```

- 🧪 **Test باستمرار** - بعد كل feature

- 📝 **Document issues** - أي مشكلة تواجهك

---

## 🚀 النتيجة النهائية المتوقعة

بنهاية الغد، المنصة ستكون:

✅ **100% Functional:**
- Login/Register لجميع الأنواع
- Family Majlis Management كامل
- Booking System كامل
- Payment Integration
- Reviews (optional)

✅ **Production Ready:**
- Deployed على Vercel
- Database محمي بـRLS
- Performance محسّن
- Mobile friendly

✅ **Documented:**
- User guide
- API documentation
- Deployment guide

---

## 📞 للدعم غداً

إذا واجهت مشكلة:
1. **افتح Console** - شوف الأخطاء
2. **اسأل** - وصف المشكلة بالتفصيل
3. **Screenshot** - للأخطاء أو UI issues

---

**جاهز لبداية قوية غداً! 💪**

**الوقت الحالي:** 05:56 صباحاً  
**البداية المقترحة:** 09:00 صباحاً  
**وقت الراحة:** ~3 ساعات نوم + breakfast ☕
