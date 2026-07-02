# Testing Guide - Store/Branch Management System

## 🧪 Comprehensive Testing Guide

Panduan lengkap untuk testing semua fitur Store/Branch Management System yang sudah diimplementasikan.

---

## 📋 Pre-Testing Checklist

### 1. Ensure Application is Running
```bash
# Check if dev server is running
lsof -ti:3001

# If not running, start it
npm run dev
```

### 2. Verify Login Access
- URL: http://localhost:3001
- Email: `admin@bedagang.com`
- Password: `admin123`

### 3. Check Browser Console
- Open Developer Tools (F12)
- Check Console tab for errors
- Check Network tab for API calls

---

## 🎯 Test Scenarios

### Test 1: Store Settings Page

#### Access Page
1. Navigate to: http://localhost:3001/settings/store
2. Verify page loads without errors
3. Check console for any errors

#### Test Store Information Tab
**Expected Behavior:**
- [ ] Page displays "Pengaturan Toko" header
- [ ] "Informasi Toko" tab is active by default
- [ ] Form fields are visible:
  - [ ] Nama Toko
  - [ ] Telepon
  - [ ] Email
  - [ ] Website
  - [ ] Deskripsi
  - [ ] Alamat Lengkap
  - [ ] Kota
  - [ ] Provinsi
  - [ ] Kode Pos
  - [ ] NPWP / Tax ID

**Actions to Test:**
1. Fill in store information
2. Click "Simpan Pengaturan"
3. Verify success message appears
4. Refresh page
5. Verify data persists

**API Calls to Monitor:**
- GET `/api/settings/store` - Should return 200
- PUT `/api/settings/store` - Should return 200 on save

#### Test Operating Hours Tab
**Expected Behavior:**
- [ ] Click "Jam Operasional" tab
- [ ] 7 days displayed (Senin - Minggu)
- [ ] Each day has:
  - [ ] Checkbox for "Buka"
  - [ ] Time inputs for open/close
  - [ ] Shows "Tutup" when unchecked

**Actions to Test:**
1. Toggle "Buka" checkbox for each day
2. Change opening hours
3. Change closing hours
4. Uncheck a day (should show "Tutup")
5. Click "Simpan Pengaturan"
6. Verify success message
7. Refresh page
8. Verify hours persist

#### Test Branches Tab
**Expected Behavior:**
- [ ] "Cabang" tab shows branch count
- [ ] Click redirects to `/settings/store/branches`

**Actions to Test:**
1. Click "Cabang" tab
2. Verify redirect to branches page

---

### Test 2: Branch Management Page

#### Access Page
1. Navigate to: http://localhost:3001/settings/store/branches
2. Verify page loads without errors

#### Test Branch List View
**Expected Behavior:**
- [ ] Page displays "Manajemen Cabang" header
- [ ] Shows "Daftar Cabang" section
- [ ] Shows total branch count
- [ ] "Tambah Cabang" button visible
- [ ] If no branches: Shows empty state

**Actions to Test:**
1. Verify page layout
2. Check if any branches exist
3. Note the count

#### Test Create Branch
**Expected Behavior:**
- [ ] Click "Tambah Cabang" button
- [ ] Form appears with fields:
  - [ ] Kode Cabang
  - [ ] Nama Cabang
  - [ ] Tipe (dropdown)
  - [ ] Manager (dropdown)
  - [ ] Alamat
  - [ ] Kota, Provinsi, Kode Pos
  - [ ] Telepon, Email
  - [ ] Cabang Aktif checkbox
  - [ ] Jam Operasional (7 days)

**Actions to Test:**
1. Click "Tambah Cabang"
2. Fill in required fields:
   - Kode: `BR-TEST-01`
   - Nama: `Cabang Test Jakarta`
   - Tipe: `branch`
   - Alamat: `Jl. Test No. 123`
   - Kota: `Jakarta`
   - Provinsi: `DKI Jakarta`
   - Telepon: `021-1234567`
3. Set operating hours
4. Click "Simpan Cabang"
5. Verify success toast appears
6. Verify branch appears in list
7. Verify branch card shows correct data

**API Calls to Monitor:**
- POST `/api/settings/store/branches` - Should return 201
- GET `/api/settings/store/branches` - Should return new branch

#### Test Edit Branch
**Expected Behavior:**
- [ ] Click edit button on branch card
- [ ] Form pre-fills with branch data
- [ ] Can modify all fields except code

**Actions to Test:**
1. Click edit icon on a branch
2. Verify form shows with data
3. Change branch name
4. Change address
5. Click "Simpan Cabang"
6. Verify success toast
7. Verify changes appear in card

**API Calls to Monitor:**
- PUT `/api/settings/store/branches/[id]` - Should return 200

#### Test Toggle Branch Status
**Expected Behavior:**
- [ ] Click toggle icon on branch card
- [ ] Confirmation appears
- [ ] Branch status changes
- [ ] Card shows "Nonaktif" badge if inactive

**Actions to Test:**
1. Click toggle status icon
2. Confirm action
3. Verify success toast
4. Verify badge changes
5. Verify card opacity changes

**API Calls to Monitor:**
- PUT `/api/settings/store/branches/[id]` - Should return 200

#### Test Delete Branch
**Expected Behavior:**
- [ ] Click delete icon on branch card
- [ ] Confirmation dialog appears
- [ ] Branch is deactivated (soft delete)
- [ ] Branch removed from list or marked inactive

**Actions to Test:**
1. Click delete icon
2. Confirm deletion
3. Verify success toast
4. Verify branch removed or marked inactive

**API Calls to Monitor:**
- DELETE `/api/settings/store/branches/[id]` - Should return 200

---

### Test 3: POS Module with Branch Filtering

#### Access Page
1. Navigate to: http://localhost:3001/pos
2. Verify page loads without errors

#### Test Branch Selector Presence
**Expected Behavior:**
- [ ] BranchSelector appears below header
- [ ] Shows "Pilih Cabang" label
- [ ] Dropdown shows "Semua Cabang" option
- [ ] Lists all active branches

**Actions to Test:**
1. Verify BranchSelector is visible
2. Click dropdown
3. Verify options appear
4. Note available branches

#### Test Branch Filtering
**Expected Behavior:**
- [ ] Select a specific branch
- [ ] Dashboard stats refresh automatically
- [ ] Loading indicator shows during refresh
- [ ] Stats update to show branch-specific data

**Actions to Test:**
1. Note current stats (transactions, revenue, etc.)
2. Select a specific branch from dropdown
3. Verify loading state appears
4. Verify stats refresh
5. Select "Semua Cabang"
6. Verify stats show all branches again
7. Switch between different branches
8. Verify stats change each time

**API Calls to Monitor:**
- GET `/api/pos/dashboard-stats?period=7d&branchId=[id]`
- Should include branchId parameter when branch selected
- Should not include branchId when "Semua Cabang" selected

#### Test Data Consistency
**Expected Behavior:**
- [ ] Selected branch persists during session
- [ ] Stats are accurate per branch
- [ ] No console errors during filtering

**Actions to Test:**
1. Select a branch
2. Navigate to another page
3. Return to POS page
4. Verify branch selection persists
5. Verify stats are still filtered

---

### Test 4: Inventory Module with Branch Filtering

#### Access Page
1. Navigate to: http://localhost:3001/inventory
2. Verify page loads without errors

#### Test Branch Selector Presence
**Expected Behavior:**
- [ ] BranchSelector appears below header
- [ ] Same UI as POS module
- [ ] Shows all active branches

**Actions to Test:**
1. Verify BranchSelector is visible
2. Verify dropdown works
3. Note available branches

#### Test Branch Filtering
**Expected Behavior:**
- [ ] Select a specific branch
- [ ] Inventory stats refresh
- [ ] Product list refreshes
- [ ] Shows branch-specific inventory

**Actions to Test:**
1. Note current stats (total products, low stock, etc.)
2. Note current product list
3. Select a specific branch
4. Verify stats refresh
5. Verify product list refreshes
6. Select "Semua Cabang"
7. Verify shows all inventory
8. Switch between branches
9. Verify data changes correctly

**API Calls to Monitor:**
- GET `/api/inventory/stats?branchId=[id]`
- GET `/api/products?branchId=[id]`
- Should include branchId when branch selected

#### Test Product Filtering
**Expected Behavior:**
- [ ] Product list shows only products from selected branch
- [ ] Pagination works correctly
- [ ] Search works with branch filter

**Actions to Test:**
1. Select a branch
2. Search for a product
3. Verify search respects branch filter
4. Change page
5. Verify pagination works
6. Verify branch filter persists

---

## 🔍 Advanced Testing

### Test 5: Integration Between Modules

#### Test Branch Selection Persistence
**Actions:**
1. Select branch in POS module
2. Navigate to Inventory
3. Verify branch selection carries over
4. Navigate back to POS
5. Verify selection still active

**Expected:** Branch selection should persist across modules during session

#### Test Multiple Branches
**Actions:**
1. Create 3-5 test branches
2. Test filtering in POS with each branch
3. Test filtering in Inventory with each branch
4. Verify data is correctly isolated per branch

**Expected:** Each branch shows only its own data

---

### Test 6: Error Handling

#### Test API Errors
**Actions:**
1. Stop the dev server
2. Try to save store settings
3. Try to create a branch
4. Verify error messages appear

**Expected:** User-friendly error messages, no crashes

#### Test Validation
**Actions:**
1. Try to create branch without required fields
2. Try to save store settings with invalid email
3. Try to set invalid operating hours

**Expected:** Validation errors appear, form doesn't submit

---

### Test 7: Performance Testing

#### Test Load Times
**Actions:**
1. Measure page load time for each page
2. Measure API response times
3. Test with 10+ branches

**Expected:**
- Page load < 2 seconds
- API response < 500ms
- No performance degradation with multiple branches

#### Test Concurrent Users
**Actions:**
1. Open app in 2-3 browser tabs
2. Make changes in one tab
3. Refresh other tabs
4. Verify data consistency

**Expected:** Data stays consistent across tabs

---

## 📊 Test Results Template

### Test Session Information
- **Date:** [Date]
- **Tester:** [Name]
- **Environment:** Development (localhost:3001)
- **Browser:** [Browser & Version]

### Test Results Summary

#### Store Settings Page
- [ ] ✅ Page loads successfully
- [ ] ✅ Store info can be saved
- [ ] ✅ Operating hours can be saved
- [ ] ✅ Data persists after refresh
- [ ] ❌ Issues found: [List issues]

#### Branch Management Page
- [ ] ✅ Page loads successfully
- [ ] ✅ Can create branches
- [ ] ✅ Can edit branches
- [ ] ✅ Can toggle status
- [ ] ✅ Can delete branches
- [ ] ❌ Issues found: [List issues]

#### POS Module Integration
- [ ] ✅ BranchSelector appears
- [ ] ✅ Branch filtering works
- [ ] ✅ Stats update correctly
- [ ] ✅ Selection persists
- [ ] ❌ Issues found: [List issues]

#### Inventory Module Integration
- [ ] ✅ BranchSelector appears
- [ ] ✅ Branch filtering works
- [ ] ✅ Products filter correctly
- [ ] ✅ Stats update correctly
- [ ] ❌ Issues found: [List issues]

### Overall Assessment
- **Total Tests:** [Number]
- **Passed:** [Number]
- **Failed:** [Number]
- **Pass Rate:** [Percentage]

### Issues Found
1. [Issue description]
2. [Issue description]

### Recommendations
1. [Recommendation]
2. [Recommendation]

---

## 🐛 Common Issues & Solutions

### Issue: BranchSelector not appearing
**Cause:** No branches in database
**Solution:** Create at least one branch first

### Issue: API returns 401 Unauthorized
**Cause:** Not logged in
**Solution:** Login with admin credentials

### Issue: Data not refreshing
**Cause:** Missing dependency in useEffect
**Solution:** Check if selectedBranch is in dependency array

### Issue: Branch selection not persisting
**Cause:** useBranches hook not properly initialized
**Solution:** Verify hook is called at component level

---

## ✅ Testing Completion Checklist

### Pre-Testing
- [ ] Application running on port 3001
- [ ] Logged in as admin
- [ ] Browser console open
- [ ] Network tab monitoring

### Core Features
- [ ] Store settings page tested
- [ ] Branch management tested
- [ ] Create branch tested
- [ ] Edit branch tested
- [ ] Delete branch tested

### Module Integrations
- [ ] POS branch filtering tested
- [ ] Inventory branch filtering tested
- [ ] Branch selection persistence tested

### Edge Cases
- [ ] Error handling tested
- [ ] Validation tested
- [ ] Performance tested
- [ ] Multiple branches tested

### Documentation
- [ ] Test results documented
- [ ] Issues logged
- [ ] Screenshots captured (if needed)

---

## 📸 Screenshot Checklist

Capture screenshots of:
1. Store settings page - Info tab
2. Store settings page - Operating hours tab
3. Branch management page - List view
4. Branch management page - Create form
5. Branch card with all details
6. POS page with BranchSelector
7. Inventory page with BranchSelector
8. Branch filtering in action (before/after)

---

## 🎯 Success Criteria

Testing is successful when:
1. ✅ All pages load without errors
2. ✅ All CRUD operations work
3. ✅ Branch filtering works in both modules
4. ✅ Data persists correctly
5. ✅ No console errors
6. ✅ API calls return expected responses
7. ✅ User experience is smooth
8. ✅ Performance is acceptable

---

**Testing Version:** 1.0.0  
**Last Updated:** February 10, 2026  
**Status:** Ready for Testing
