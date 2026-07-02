# 📋 API TESTING GUIDE - BEDAGANG ERP

**Version:** 1.0  
**Date:** 2026-02-27  
**Total APIs:** 38/49+ (78%)

---

## 🎯 OVERVIEW

Panduan komprehensif untuk testing semua standardized APIs di Bedagang ERP system.

### **Modules Covered:**
- ✅ **Finance Module** - 12 APIs (100%)
- ✅ **Inventory Module** - 9 APIs (100%)
- ✅ **HRIS Module** - 9 APIs (100%)
- ✅ **Fleet Module** - 7 APIs (100%)
- ⏸️ **Branches Module** - 1 API (13%)

---

## 🧪 TESTING CHECKLIST

### **1. FINANCE MODULE (12 APIs)**

#### **Transactions API** ✅
```bash
# GET - List transactions
curl -X GET "http://localhost:3000/api/hq/finance/transactions?type=expense&limit=10"

# POST - Create transaction
curl -X POST "http://localhost:3000/api/hq/finance/transactions" \
  -H "Content-Type: application/json" \
  -d '{"type":"expense","amount":100000,"category":"office","description":"Test"}'

# Expected Response:
{
  "data": { ... },
  "meta": { "pagination": { ... } },
  "message": "Success"
}
```

#### **Invoices API** ✅
```bash
# GET - List invoices
curl -X GET "http://localhost:3000/api/hq/finance/invoices?status=pending"

# POST - Create invoice
curl -X POST "http://localhost:3000/api/hq/finance/invoices" \
  -H "Content-Type: application/json" \
  -d '{"customerName":"Test","amount":500000,"items":[]}'
```

#### **Summary API** ✅
```bash
# GET - Financial summary
curl -X GET "http://localhost:3000/api/hq/finance/summary?period=month"
```

#### **Accounts API** ✅
```bash
# GET - Chart of accounts
curl -X GET "http://localhost:3000/api/hq/finance/accounts"
```

#### **Budget API** ✅
```bash
# GET - Budget data
curl -X GET "http://localhost:3000/api/hq/finance/budget?period=2026-02"
```

#### **Cash Flow API** ✅
```bash
# GET - Cash flow statement
curl -X GET "http://localhost:3000/api/hq/finance/cash-flow?period=month"
```

#### **P&L API** ✅
```bash
# GET - Profit & Loss
curl -X GET "http://localhost:3000/api/hq/finance/profit-loss?period=month"
```

#### **Tax API** ✅
```bash
# GET - Tax summary
curl -X GET "http://localhost:3000/api/hq/finance/tax?period=2026-02"
```

#### **Expenses API** ✅
```bash
# GET - Expense analysis
curl -X GET "http://localhost:3000/api/hq/finance/expenses?period=month"
```

#### **Revenue API** ✅
```bash
# GET - Revenue analysis
curl -X GET "http://localhost:3000/api/hq/finance/revenue?period=month"
```

#### **Export API** ✅
```bash
# GET - Export data
curl -X GET "http://localhost:3000/api/hq/finance/export?type=profit-loss&period=2026-02"
```

#### **Realtime API** ✅
```bash
# GET - Real-time financial data
curl -X GET "http://localhost:3000/api/hq/finance/realtime?period=month"
```

---

### **2. INVENTORY MODULE (9 APIs)**

#### **Products API** ✅
```bash
# GET - List products
curl -X GET "http://localhost:3000/api/hq/inventory/products?limit=10"

# POST - Create product
curl -X POST "http://localhost:3000/api/hq/inventory/products" \
  -H "Content-Type: application/json" \
  -d '{"sku":"TEST-001","name":"Test Product","category":"Test"}'
```

#### **Stock API** ✅
```bash
# GET - Stock levels
curl -X GET "http://localhost:3000/api/hq/inventory/stock?branch=all"

# PUT - Update stock
curl -X PUT "http://localhost:3000/api/hq/inventory/stock" \
  -H "Content-Type: application/json" \
  -d '{"productId":"1","branchId":"1","quantity":100}'
```

#### **Categories API** ✅
```bash
# GET - Categories
curl -X GET "http://localhost:3000/api/hq/inventory/categories"

# POST - Create category
curl -X POST "http://localhost:3000/api/hq/inventory/categories" \
  -H "Content-Type: application/json" \
  -d '{"name":"Test Category","slug":"test-category"}'
```

#### **Pricing API** ✅
```bash
# GET - Pricing data
curl -X GET "http://localhost:3000/api/hq/inventory/pricing"

# POST - Create price tier
curl -X POST "http://localhost:3000/api/hq/inventory/pricing" \
  -H "Content-Type: application/json" \
  -d '{"name":"Wholesale","discount":10}'
```

#### **Alerts API** ✅
```bash
# GET - Stock alerts
curl -X GET "http://localhost:3000/api/hq/inventory/alerts?type=low_stock"
```

#### **Receipts API** ✅
```bash
# GET - Goods receipts
curl -X GET "http://localhost:3000/api/hq/inventory/receipts"

# POST - Create receipt
curl -X POST "http://localhost:3000/api/hq/inventory/receipts" \
  -H "Content-Type: application/json" \
  -d '{"supplier":"Test","items":[]}'
```

#### **Transfers API** ✅
```bash
# GET - Stock transfers
curl -X GET "http://localhost:3000/api/hq/inventory/transfers"

# POST - Create transfer
curl -X POST "http://localhost:3000/api/hq/inventory/transfers" \
  -H "Content-Type: application/json" \
  -d '{"fromBranch":"1","toBranch":"2","items":[]}'
```

#### **Stocktake API** ✅
```bash
# GET - Stocktake records
curl -X GET "http://localhost:3000/api/hq/inventory/stocktake"

# POST - Create stocktake
curl -X POST "http://localhost:3000/api/hq/inventory/stocktake" \
  -H "Content-Type: application/json" \
  -d '{"branchId":"1","items":[]}'
```

---

### **3. HRIS MODULE (9 APIs)**

#### **Employees API** ✅
```bash
# GET - List employees
curl -X GET "http://localhost:3000/api/hq/hris/employees?limit=10"

# POST - Create employee
curl -X POST "http://localhost:3000/api/hq/hris/employees" \
  -H "Content-Type: application/json" \
  -d '{"name":"Test Employee","position":"Staff"}'
```

#### **Attendance API** ✅
```bash
# GET - Attendance records
curl -X GET "http://localhost:3000/api/hq/hris/attendance?period=month"

# POST - Record attendance
curl -X POST "http://localhost:3000/api/hq/hris/attendance" \
  -H "Content-Type: application/json" \
  -d '{"employeeId":"1","date":"2026-02-27","status":"present"}'
```

#### **Performance API** ✅
```bash
# GET - Performance reviews
curl -X GET "http://localhost:3000/api/hq/hris/performance"

# POST - Create review
curl -X POST "http://localhost:3000/api/hq/hris/performance" \
  -H "Content-Type: application/json" \
  -d '{"employeeId":"1","period":"2026-02","rating":4}'
```

#### **KPI API** ✅
```bash
# GET - KPI data
curl -X GET "http://localhost:3000/api/hq/hris/kpi?period=current"

# POST - Create KPI
curl -X POST "http://localhost:3000/api/hq/hris/kpi" \
  -H "Content-Type: application/json" \
  -d '{"employeeId":"1","metrics":[]}'
```

#### **KPI Settings API** ✅
```bash
# GET - KPI settings
curl -X GET "http://localhost:3000/api/hq/hris/kpi-settings"

# POST - Create template
curl -X POST "http://localhost:3000/api/hq/hris/kpi-settings" \
  -H "Content-Type: application/json" \
  -d '{"name":"Sales Target","category":"sales","weight":30}'
```

#### **KPI Templates API** ✅
```bash
# GET - KPI templates
curl -X GET "http://localhost:3000/api/hq/hris/kpi-templates"
```

#### **Webhooks API** ✅
```bash
# GET - Webhook logs
curl -X GET "http://localhost:3000/api/hq/hris/webhooks"

# POST - Trigger webhook
curl -X POST "http://localhost:3000/api/hq/hris/webhooks" \
  -H "Content-Type: application/json" \
  -d '{"eventType":"attendance.clock_in","employeeId":"1"}'
```

#### **Export API** ✅
```bash
# GET - Export employee data
curl -X GET "http://localhost:3000/api/hq/hris/export?type=employees"
```

#### **Realtime API** ✅
```bash
# GET - Real-time employee metrics
curl -X GET "http://localhost:3000/api/hq/hris/realtime"
```

---

### **4. FLEET MODULE (7 APIs)**

#### **Vehicles API** ✅
```bash
# GET - List vehicles
curl -X GET "http://localhost:3000/api/hq/fleet/vehicles"

# POST - Create vehicle
curl -X POST "http://localhost:3000/api/hq/fleet/vehicles" \
  -H "Content-Type: application/json" \
  -d '{"licensePlate":"B 1234 XYZ","vehicleType":"truck"}'
```

#### **Drivers API** ✅
```bash
# GET - List drivers
curl -X GET "http://localhost:3000/api/hq/fleet/drivers"

# POST - Create driver
curl -X POST "http://localhost:3000/api/hq/fleet/drivers" \
  -H "Content-Type: application/json" \
  -d '{"fullName":"Test Driver","licenseNumber":"123456","licenseType":"B1"}'
```

#### **Fuel API** ✅
```bash
# GET - Fuel transactions
curl -X GET "http://localhost:3000/api/hq/fleet/fuel"

# POST - Record fuel
curl -X POST "http://localhost:3000/api/hq/fleet/fuel" \
  -H "Content-Type: application/json" \
  -d '{"vehicleId":"1","fuelType":"diesel","quantityLiters":50,"totalCost":500000}'
```

#### **Maintenance API** ✅
```bash
# GET - Maintenance records
curl -X GET "http://localhost:3000/api/hq/fleet/maintenance"

# POST - Create maintenance
curl -X POST "http://localhost:3000/api/hq/fleet/maintenance" \
  -H "Content-Type: application/json" \
  -d '{"vehicleId":"1","maintenanceType":"scheduled","serviceType":"oil_change"}'
```

#### **Routes API** ✅
```bash
# GET - Routes
curl -X GET "http://localhost:3000/api/hq/fleet/routes"

# POST - Create route
curl -X POST "http://localhost:3000/api/hq/fleet/routes" \
  -H "Content-Type: application/json" \
  -d '{"routeName":"Jakarta-Bandung","origin":"Jakarta","destination":"Bandung","distance":150}'
```

#### **Tracking API** ✅
```bash
# GET - Vehicle tracking
curl -X GET "http://localhost:3000/api/hq/fleet/tracking"

# POST - Update location
curl -X POST "http://localhost:3000/api/hq/fleet/tracking" \
  -H "Content-Type: application/json" \
  -d '{"vehicleId":"1","latitude":-6.2088,"longitude":106.8456,"speed":60}'
```

#### **Costs API** ✅
```bash
# GET - Fleet costs
curl -X GET "http://localhost:3000/api/hq/fleet/costs"

# POST - Record cost
curl -X POST "http://localhost:3000/api/hq/fleet/costs" \
  -H "Content-Type: application/json" \
  -d '{"vehicleId":"1","costType":"fuel","amount":500000,"date":"2026-02-27"}'
```

---

## ✅ EXPECTED RESPONSE FORMAT

### **Success Response:**
```json
{
  "data": {
    // Main data payload
  },
  "meta": {
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 100,
      "totalPages": 10
    }
  },
  "message": "Success message (optional)"
}
```

### **Error Response:**
```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message"
  }
}
```

---

## 🔍 VERIFICATION CHECKLIST

### **For Each API:**
- [ ] Returns standard success response format
- [ ] Returns standard error response format
- [ ] Uses HttpStatus constants
- [ ] Uses ErrorCodes enum
- [ ] Has proper validation
- [ ] Has proper error handling
- [ ] Supports required query parameters
- [ ] Supports pagination (where applicable)
- [ ] Supports filtering (where applicable)
- [ ] Returns correct HTTP status codes

---

## 📊 TESTING STATUS

| Module | APIs | Tested | Status |
|--------|------|--------|--------|
| Finance | 12 | 0 | ⏸️ Pending |
| Inventory | 9 | 0 | ⏸️ Pending |
| HRIS | 9 | 0 | ⏸️ Pending |
| Fleet | 7 | 0 | ⏸️ Pending |
| **TOTAL** | **37** | **0** | ⏸️ **Ready** |

---

**Generated:** 2026-02-27 11:30 AM  
**Status:** ✅ **READY FOR TESTING**
