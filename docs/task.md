# 📋 Task List - Family Majlis Management & Critical Features

## ✅ Completed
- [x] Storage Buckets Setup (4 buckets)
- [x] RLS Policies for Storage
- [x] Config files (config.js, config-enhanced.js)
- [x] Family Majlis Management - CRUD
- [x] Photo Upload functionality

---

## 🔴 Phase 1: Family Majlis Management (✅ Completed)

### [x] UI Development
- [x] تحسين `family-majlis.html`
  - [x] قائمة المجالس الحالية
  - [x] نموذج إضافة مجلس جديد
  - [x] نموذج تعديل المجلس
  - [x] معاينة المجلس
  - [x] حذف المجلس

### [x] Photo Upload Functionality
- [x] واجهة رفع الصور
  - [x] Multi-file upload
  - [x] Image preview
  - [x] Progress indicator
  - [x] Delete uploaded images
- [x] التكامل مع `majlis-photos` bucket
  - [x] Upload to Supabase Storage
  - [x] Get public URLs
  - [x] Save URLs to database

### [x] JavaScript Development (`js/family-majlis.js`)
- [x] CRUD Operations
  - [x] Create majlis
  - [x] Read/List majalis
  - [x] Update majlis
  - [x] Delete majlis
- [x] Photo Management
  - [x] uploadPhotos()
  - [x] deletePhoto()
  - [x] loadPhotos()
- [x] Form Validation
  - [x] Required fields
  - [x] Price validation
  - [x] Capacity validation
- [x] Integration
  - [x] Link to family profile
  - [x] Update availability
  - [x] Set pricing packages

### [ ] Testing
- [ ] اختبار إضافة مجلس
- [ ] اختبار رفع الصور
- [ ] اختبار التعديل
- [ ] اختبار الحذف

---

## 🟡 Phase 2: Interactive Booking Calendar

### [ ] Calendar UI
- [ ] Flatpickr/FullCalendar integration
- [ ] عرض التوفر
- [ ] اختيار متعدد للتواريخ
- [ ] Time slots selection

### [ ] JavaScript (`js/browse-calendar.js`)
- [ ] Load availability from DB
- [ ] Real-time availability check
- [ ] Add to cart functionality
- [ ] Price calculation

---

## 🟡 Phase 3: Review System

### [ ] Review HTML Page
- [ ] نموذج إضافة تقييم
- [ ] Star rating component
- [ ] Photo upload for review
- [ ] Display reviews list

### [ ] JavaScript (`js/review.js`)
- [ ] Add review
- [ ] Upload review photos
- [ ] Load reviews
- [ ] Calculate average rating
- [ ] Moderate reviews (operator)

---

## 🟡 Phase 4: Payment Flow Completion

### [ ] Moyasar Integration Enhancement
- [ ] Webhook handler (Edge Function)
- [ ] Auto status update
- [ ] Receipt generation
- [ ] Failed payment handling
- [ ] Refund processing

---

## 🟢 Phase 5: Notifications System

### [ ] In-app Notifications
- [ ] UI component
- [ ] Real-time updates
- [ ] Mark as read

### [ ] Email Notifications
- [ ] SendGrid integration
- [ ] Email templates
- [ ] Trigger functions

### [ ] SMS Notifications
- [ ] Unifonic/Twilio setup
- [ ] SMS templates
- [ ] Send functions

---

## 🟢 Phase 6: English Translation

### [ ] Translation Dictionary Expansion
- [ ] 500+ translation keys
- [ ] All UI text
- [ ] Dynamic content

### [ ] HTML Updates
- [ ] Add data-i18n attributes
- [ ] Update all pages (35 pages)

### [ ] JavaScript Updates
- [ ] Use i18n.t() everywhere
- [ ] Dynamic content translation

---

## الأولويات
- 🔴 **Critical** (أسبوع 1): Majlis, Calendar, Reviews, Payment
- 🟡 **Important** (أسبوع 2): Notifications, Analytics, Polish
- 🟢 **Nice to Have** (أسبوع 3-4): Translation, Advanced features
