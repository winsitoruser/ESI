# 🧪 Purchase Order - Browser Testing Guide

**Date:** 25 Januari 2026, 02:05 AM  
**Page:** `http://localhost:3000/inventory/create-purchase-order`  
**Status:** ✅ **READY FOR TESTING**

---

## 🚀 QUICK START

### **1. Open Browser**
```
http://localhost:3000/inventory/create-purchase-order
```

### **2. Expected Initial State**
- ✅ Loading spinner appears
- ✅ "Memuat data produk..." message
- ✅ After 1-2 seconds, page loads with data

---

## ✅ TESTING CHECKLIST

### **Phase 1: Page Load & Data Fetching**

#### **Test 1.1: Page Loads Successfully**
- [ ] Page loads without errors
- [ ] No console errors (F12 → Console)
- [ ] Loading spinner appears briefly
- [ ] Page transitions to loaded state

#### **Test 1.2: Suppliers Dropdown**
- [ ] Supplier dropdown is populated
- [ ] Shows "Pilih Supplier" as default
- [ ] Contains real supplier names from database
- [ ] Expected suppliers:
  - PT Bahan Baku Nusantara
  - CV Distributor Makanan
  - Toko Grosir Sentosa

#### **Test 1.3: Products List**
- [ ] Products list shows items
- [ ] Each product shows:
  - Name
  - SKU
  - Current stock
  - ROP (Reorder Point)
  - EOQ (Economic Order Quantity)
  - Suggested quantity
  - Stock level progress bar
  - Urgency badge (Critical/Low Stock/Medium/Normal)
- [ ] Products are sorted by urgency (Critical first)

#### **Test 1.4: Stats Cards**
- [ ] Total Produk count is correct
- [ ] Critical count shows red badge
- [ ] Low Stock count shows yellow badge
- [ ] Items Selected starts at 0

---

### **Phase 2: Product Selection**

#### **Test 2.1: Add Product to Order**
- [ ] Click "Add" button on any product
- [ ] Product appears in Order Summary (right panel)
- [ ] Quantity is pre-filled with suggested amount
- [ ] Subtotal calculates correctly
- [ ] Total Cost updates
- [ ] Items Selected counter increases

#### **Test 2.2: Update Quantity**
- [ ] Click "-" button to decrease quantity
- [ ] Quantity decreases by 10
- [ ] Subtotal updates
- [ ] Total Cost updates
- [ ] Click "+" button to increase quantity
- [ ] Quantity increases by 10
- [ ] Can manually type quantity in input field

#### **Test 2.3: Remove Product**
- [ ] Click "X" button on product in order summary
- [ ] Product is removed from order
- [ ] Total Cost updates
- [ ] Items Selected counter decreases

#### **Test 2.4: Add Multiple Products**
- [ ] Add 3-5 different products
- [ ] All appear in order summary
- [ ] Each has correct subtotal
- [ ] Total Cost is sum of all subtotals
- [ ] Items Selected shows correct count

---

### **Phase 3: Filters & Search**

#### **Test 3.1: Filter by Status**
- [ ] Click "Critical" filter
- [ ] Only critical products show
- [ ] Click "Low Stock" filter
- [ ] Only low stock products show
- [ ] Click "Normal" filter
- [ ] Only normal stock products show
- [ ] Click "Semua" filter
- [ ] All products show again

#### **Test 3.2: Search Functionality**
- [ ] Type product name in search box
- [ ] Products filter in real-time
- [ ] Type SKU in search box
- [ ] Products filter by SKU
- [ ] Clear search box
- [ ] All products show again

---

### **Phase 4: Order Details**

#### **Test 4.1: Supplier Selection**
- [ ] Click supplier dropdown
- [ ] Select a supplier
- [ ] Supplier name appears in confirmation modal later
- [ ] "Create Purchase Order" button becomes enabled

#### **Test 4.2: Dates**
- [ ] Order Date is pre-filled with today
- [ ] Can change order date
- [ ] Can set expected delivery date
- [ ] Dates appear in confirmation modal

#### **Test 4.3: Payment Terms**
- [ ] Payment Terms dropdown shows options:
  - Cash on Delivery
  - 7 Days
  - 14 Days
  - 30 Days (default)
  - 45 Days
  - 60 Days
- [ ] Can change payment terms
- [ ] Selection appears in confirmation modal

#### **Test 4.4: Notes**
- [ ] Can type notes in text area
- [ ] Notes appear in confirmation modal

---

### **Phase 5: Create Purchase Order**

#### **Test 5.1: Validation**
- [ ] "Create Purchase Order" button is disabled when:
  - No items selected
  - No supplier selected
- [ ] Button is enabled when:
  - At least 1 item selected
  - Supplier is selected

#### **Test 5.2: Confirmation Modal**
- [ ] Click "Create Purchase Order" button
- [ ] Confirmation modal appears
- [ ] Modal shows:
  - Supplier name
  - Order date
  - Expected delivery date
  - Payment terms
  - List of items with quantities
  - Subtotals
  - Total amount
  - Notes (if any)
- [ ] Can click "Cancel" to close modal
- [ ] Can click "Confirm & Create" to proceed

#### **Test 5.3: Save to Database**
- [ ] Click "Confirm & Create"
- [ ] Button shows "Creating..." with spinner
- [ ] Button is disabled during save
- [ ] After 1-2 seconds:
  - Success alert appears
  - Shows PO number (e.g., "PO-2026-123456")
  - Shows success message
- [ ] Click OK on alert
- [ ] Redirects to `/inventory/purchase-orders`

---

### **Phase 6: Error Scenarios**

#### **Test 6.1: Network Error**
- [ ] Turn off internet/server
- [ ] Try to create order
- [ ] Error message appears
- [ ] No redirect occurs
- [ ] Can retry after fixing connection

#### **Test 6.2: Validation Errors**
- [ ] Try to create order without supplier
- [ ] Button should be disabled
- [ ] Try to create order without items
- [ ] Button should be disabled

---

### **Phase 7: Navigation**

#### **Test 7.1: Back Button**
- [ ] Click "Back" button (top left)
- [ ] If no changes: redirects to `/inventory`
- [ ] If has changes: shows exit warning modal
- [ ] Can cancel exit warning
- [ ] Can confirm exit (loses changes)

#### **Test 7.2: View All Orders Button**
- [ ] Click "View All Orders" button (top right)
- [ ] Redirects to `/inventory/purchase-orders`

#### **Test 7.3: Browser Back**
- [ ] Use browser back button
- [ ] If has unsaved changes: shows browser warning
- [ ] Can stay on page or leave

---

## 🔍 CONSOLE CHECKS

### **Open Browser Console (F12)**

#### **Expected Console Logs:**
```
✅ No errors
✅ API calls visible in Network tab:
   - GET /api/suppliers
   - GET /api/inventory/low-stock
   - POST /api/inventory/purchase-orders (when saving)
```

#### **Check Network Tab:**
```
1. GET /api/suppliers
   Status: 200 OK
   Response: { success: true, data: [...] }

2. GET /api/inventory/low-stock?status=all&limit=100
   Status: 200 OK
   Response: { success: true, data: [...] }

3. POST /api/inventory/purchase-orders
   Status: 201 Created
   Response: { success: true, data: {...}, message: "..." }
```

---

## 📊 EXPECTED RESULTS

### **Successful Test:**
- ✅ All checkboxes above are checked
- ✅ No console errors
- ✅ All API calls return 200/201
- ✅ Data saves to database
- ✅ Can view saved PO in list

### **If Issues Found:**
1. Note the specific step that failed
2. Check console for errors
3. Check Network tab for failed requests
4. Report error message and step number

---

## 🎯 CRITICAL PATHS

### **Happy Path (Most Important):**
1. ✅ Page loads with data
2. ✅ Add 2-3 products
3. ✅ Select supplier
4. ✅ Click Create PO
5. ✅ Confirm
6. ✅ Success message
7. ✅ Redirects to PO list

### **Edge Cases:**
1. ✅ Try to save without supplier (should be disabled)
2. ✅ Try to save without items (should be disabled)
3. ✅ Add item, remove item, add again
4. ✅ Change quantity to very large number
5. ✅ Change quantity to 0 (should remove item)

---

## 🐛 COMMON ISSUES & FIXES

### **Issue 1: Page Stuck on Loading**
**Cause:** API not responding  
**Fix:** Check if server is running (`npm run dev`)

### **Issue 2: Suppliers Dropdown Empty**
**Cause:** No suppliers in database  
**Fix:** Check `/api/suppliers` endpoint

### **Issue 3: Products List Empty**
**Cause:** No low stock products  
**Fix:** Check `/api/inventory/low-stock` endpoint

### **Issue 4: Save Fails**
**Cause:** API error or validation  
**Fix:** Check console for error message

### **Issue 5: No Redirect After Save**
**Cause:** API returned error  
**Fix:** Check Network tab for response

---

## ✅ VERIFICATION CHECKLIST

After completing all tests:

- [ ] Page loads successfully
- [ ] Suppliers load from API
- [ ] Products load from API
- [ ] Can add/remove items
- [ ] Calculations are correct
- [ ] Can select supplier
- [ ] Can set dates and terms
- [ ] Validation works
- [ ] Can create PO
- [ ] Data saves to database
- [ ] Success message shows
- [ ] Redirects correctly
- [ ] No console errors
- [ ] All API calls successful

---

## 📝 TEST REPORT TEMPLATE

```
# Purchase Order Test Report

**Date:** [Date]
**Tester:** [Name]
**Browser:** [Chrome/Firefox/Safari]
**Status:** [Pass/Fail]

## Results:
- Page Load: [✅/❌]
- API Integration: [✅/❌]
- Product Selection: [✅/❌]
- Filters & Search: [✅/❌]
- Order Creation: [✅/❌]
- Save to Database: [✅/❌]

## Issues Found:
1. [Issue description]
2. [Issue description]

## Console Errors:
[Paste any errors]

## Network Errors:
[Paste any failed requests]

## Overall: [✅ PASS / ❌ FAIL]
```

---

## 🚀 NEXT STEPS AFTER TESTING

### **If All Tests Pass:**
1. ✅ Mark system as production ready
2. ✅ Proceed with PDF export implementation
3. ✅ Deploy to staging

### **If Tests Fail:**
1. ❌ Document all failures
2. ❌ Fix issues one by one
3. ❌ Re-test after fixes
4. ❌ Repeat until all pass

---

**Testing Guide Created by:** Cascade AI  
**Date:** 25 Jan 2026, 02:05 AM  
**Status:** ✅ **READY FOR USE**
