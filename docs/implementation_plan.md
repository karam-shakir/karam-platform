# Mock Data Removal & Supabase Enforcement Plan

## Goal Description
Remove all instances of mock/dummy data and fallback simulation logic from the codebase. Ensure that the application strictly relies on the real Supabase database connection. If the database is unreachable, the app should fail gracefully or show a connection error, rather than pretending to work with fake data.

## User Review Required
> [!IMPORTANT]
> This change will effectively break the application if the Supabase connection is invalid or if the database is empty. Ensure `setup_test_data.html` has been run or the database is seeded with real data.

## Proposed Changes

### 1. Authentication (`js/auth.js`)
#### [MODIFY] `js/auth.js`
- **Remove** `else` blocks that handle `!supabaseClient`.
- **Remove** `mockUser` object and fake `signIn`/`signUp` simulation.
- **Enforce** `supabaseClient` check at the start; if missing, alert user immediately.

### 2. Browsing & Listing (`js/browse.js`, `js/browse-calendar.js`)
#### [MODIFY] `js/browse.js`
- **Remove** `MOCK_FAMILIES` constant.
- **Remove** fallback assignment `families = MOCK_FAMILIES`.
- Ensure `fetchHostFamilies` relies solely on `supabaseClient.from('host_families')`.

#### [MODIFY] `js/browse-calendar.js`
- **Remove** random `bookedSpots` generation (formerly commented as mock).
- Ensure availability check queries the real `bookings` table.

### 3. Landing Page (`js/landing.js`)
#### [MODIFY] `js/landing.js`
- **Remove** any hardcoded stats or mock family arrays used for the "Featured Families" section.

### 4. Dashboards
#### [MODIFY] `js/visitor-dashboard.js`, `js/family-details.js`
- Verify `supabase` vs `supabaseClient` usage (already partially fixed).
- Remove any mock data fallbacks for profile loading.

### 5. Auth Redirect Flow
#### [MODIFY] `js/browse-calendar.js`
- **Update** `addToCart` to check for login status.
- **Redirect** to `login.html?redirect=browse-families-calendar.html` if unauthenticated.

#### [MODIFY] `js/auth.js`
- **Update** `handleLogin` to check for `redirect` query parameter.
- **Prioritize** redirect URL over role-based dashboard if present.

## Verification Plan

### Automated/Manual Verification
1.  **Auth**: Try to login with a non-existent user. Should fail (not mock success).
2.  **Browsing**: Page should be empty if DB is empty (not showing "Family A", "Family B").
3.  **Booking**: Availability should be real.
