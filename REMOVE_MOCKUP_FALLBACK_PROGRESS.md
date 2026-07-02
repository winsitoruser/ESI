# 🚫 Remove Mockup Fallback Data - Progress Report

**Date:** February 6, 2026  
**Status:** IN PROGRESS

---

## 🎯 Objective

Menghapus semua data mockup fallback di seluruh modul aplikasi dan memastikan semua endpoint API hanya menggunakan data dari database.

---

## ✅ Completed

### **1. Inventory Activities** ✅
**File:** `pages/api/inventory/activities.js`

**Changes:**
- ❌ Removed: Mock data generation based on product updates
- ✅ Added: Real query to `stock_movements` table
- ✅ Added: JOIN with `products` table for product details

**Before:**
```javascript
// Mock activities based on recent product updates
const recentProducts = await Product.findAll({...});
const activities = recentProducts.map((product, index) => {
  // Simulate different activity types
  const types = ['in', 'out', 'adjustment', 'transfer'];
  const activityType = types[index % types.length];
  let quantity = Math.floor(Math.random() * 50) + 1;
  ...
});
```

**After:**
```javascript
// Get real stock movements from database
const movements = await StockMovement.findAll({
  where,
  include: [{ model: Product, as: 'product' }],
  order: [['created_at', 'DESC']],
  limit: parseInt(limit)
});
```

---

### **2. POS Dashboard Stats** ✅
**File:** `pages/api/pos/dashboard-stats.ts`

**Changes:**
- ❌ Removed: `generateMockSalesTrend()` function
- ❌ Removed: Fallback to mock data on database error
- ✅ Changed: Return proper error (500) instead of mock data

**Before:**
```typescript
} catch (dbError: any) {
  // Fallback to mock data if database query fails
  return res.status(200).json({
    success: true,
    data: {
      today: { transactions: 0, sales: 0, ... },
      salesTrend: generateMockSalesTrend(period),
      ...
    },
    warning: 'Using fallback data - database not ready'
  });
}
```

**After:**
```typescript
} catch (dbError: any) {
  console.error('Database error:', dbError);
  return res.status(500).json({
    success: false,
    error: 'Database error - failed to fetch dashboard stats',
    details: dbError.message
  });
}
```

---

### **3. Locations API** ✅
**File:** `pages/api/locations.js`

**Changes:**
- ❌ Removed: Mock locations data fallback
- ✅ Changed: Return proper error (500) if table doesn't exist
- ✅ Changed: Return error instead of mock data on query failure

**Before:**
```javascript
if (!tableCheck.rows[0].exists) {
  // If table doesn't exist, return mock data for development
  return res.status(200).json({
    success: true,
    data: [
      { id: 1, name: 'Gudang Pusat', ... },
      { id: 2, name: 'Toko Cabang A', ... },
      ...
    ]
  });
}

} catch (error) {
  // Fallback to mock data on error
  return res.status(200).json({
    success: true,
    data: [ /* mock data */ ]
  });
}
```

**After:**
```javascript
if (!tableCheck.rows[0].exists) {
  return res.status(500).json({
    success: false,
    error: 'Locations table does not exist - please run migrations'
  });
}

} catch (error) {
  return res.status(500).json({
    success: false,
    error: 'Failed to fetch locations',
    details: error.message
  });
}
```

---

## 🔄 In Progress / To Do

### **High Priority Files with Mock Fallback:**

#### **4. POS Analytics - Sales Performance** 🔄
**File:** `pages/api/pos/analytics/sales-performance.ts`
- Has `mockSalesPerformance` object (77 lines)
- Fallback to mock data on error (line 494)
- **Action:** Remove mock fallback, return proper errors

#### **5. POS Shifts Status** 🔄
**File:** `pages/api/pos/shifts/status.ts`
- Has `getMockShiftResponse()` function
- Returns mock shift data on database error
- **Action:** Remove mock function, return proper errors

#### **6. POS Invoices** 🔄
**Files:**
- `pages/api/pos/invoices/[id].ts` - Has `mockInvoiceData`
- `pages/api/pos/invoices/[id]_payment.ts` - Uses mock data in development
- **Action:** Remove all mock invoice data

#### **7. POS Prescription Invoice** 🔄
**File:** `pages/api/pos/transactions/prescription-invoice.ts`
- Has `mockDrugPrices` object
- Uses `generateMockPrescription()` as fallback
- **Action:** Remove mock prescriptions

#### **8. POS AI Assistant** 🔄
**File:** `pages/api/pos/ai-assistant.ts`
- Has `medicalConditions` mock database
- Has `mockProducts` array
- Fallback to mock inventory data
- **Action:** Remove all mock data

#### **9. Loyalty Programs** 🔄
**File:** `pages/api/loyalty/index.ts`
- Returns hardcoded mock tiers data
- **Action:** Create database table and use real data

#### **10. Promo Vouchers** 🔄
**File:** `pages/api/promo-voucher/index.ts`
- Returns hardcoded mock promos array
- **Action:** Create database table and use real data

#### **11. POS Receipt Templates** 🔄
**File:** `pages/api/pos/receipt-templates.ts`
- Uses `templateStorage` array as mock database
- **Action:** Create database table for templates

#### **12. Inventory Reports** 🔄
**Files:**
- `pages/api/inventory/shelf-positions.ts` (16 mock matches)
- `pages/api/inventory/receipts/index.ts` (15 mock matches)
- `pages/api/inventory/returns/index.ts` (14 mock matches)
- `pages/api/inventory/price-groups.ts` (13 mock matches)
- **Action:** Review and remove mock data

---

## 📊 Statistics

**Total Files Identified:** 52 files  
**Total Mock Matches:** 188 occurrences  

**Completed:** 3 files ✅  
**In Progress:** 0 files 🔄  
**Pending:** 49 files ⏳  

---

## 🎯 Strategy

### **Phase 1: Critical APIs** (Current)
Remove mock fallback from core APIs that are actively used:
- ✅ Inventory activities
- ✅ POS dashboard stats
- ✅ Locations
- 🔄 POS analytics
- 🔄 POS shifts
- 🔄 POS invoices

### **Phase 2: Feature APIs**
Remove mock data from feature-specific APIs:
- Loyalty programs
- Promo vouchers
- Receipt templates
- AI assistant

### **Phase 3: Report APIs**
Clean up inventory report endpoints:
- Shelf positions
- Receipts
- Returns
- Price groups

---

## ⚠️ Important Notes

1. **Error Handling:** All APIs now return proper HTTP error codes (500) instead of mock data
2. **Database Required:** Frontend will show errors if database tables don't exist
3. **Migration Needed:** Some features may require database migrations to work
4. **Testing Required:** Each module needs testing after mock removal

---

## 🔧 Recommended Actions

### **For Each Module:**

1. **Check Database Table Exists**
   ```sql
   SELECT * FROM information_schema.tables 
   WHERE table_name = 'table_name';
   ```

2. **Create Migration if Needed**
   ```bash
   # Example for missing tables
   node scripts/create-[module]-tables.js
   ```

3. **Test API Endpoint**
   ```bash
   curl http://localhost:3001/api/[endpoint]
   ```

4. **Verify Frontend**
   - Check browser console for errors
   - Verify data displays correctly
   - Test error states

---

## 📝 Next Steps

1. Continue removing mock fallback from POS analytics
2. Remove mock data from POS shifts and invoices
3. Create database tables for loyalty and promo features
4. Test all modified endpoints
5. Update frontend error handling if needed

---

**Last Updated:** February 6, 2026, 2:20 PM (UTC+07:00)
