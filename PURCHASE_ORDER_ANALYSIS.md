# 📋 Purchase Order System - Complete Analysis

**Date:** 25 Januari 2026, 02:00 AM  
**Page:** `/inventory/create-purchase-order`  
**Status:** 🔴 **NEEDS MAJOR FIXES**

---

## 🔍 EXECUTIVE SUMMARY

Halaman Create Purchase Order saat ini menggunakan **100% MOCK DATA** dan tidak terintegrasi dengan backend. Tidak ada API calls, tidak ada database queries, dan tidak ada export/document generation functionality.

### **Critical Issues Found:**
1. ❌ No API integration - All data is hardcoded
2. ❌ No database queries - Using mock products array
3. ❌ No supplier API - Suppliers extracted from mock data
4. ❌ No save functionality - Only alert() and redirect
5. ❌ No export/PDF generation
6. ❌ No document generation (PO document)
7. ❌ No real ROP/EOQ calculation from database
8. ❌ No relation to actual Product/Supplier models

---

## 📊 CURRENT STATE ANALYSIS

### **1. Frontend (`/pages/inventory/create-purchase-order.tsx`)**

#### **Data Source:**
```typescript
// Lines 54-64: HARDCODED MOCK DATA
const products: Product[] = [
  { id: '1', name: 'Kopi Arabica Premium 250g', ... },
  { id: '2', name: 'Teh Hijau Organik', ... },
  // ... 8 products total
];
```
❌ **Issue:** No API call to fetch real products from database

#### **Supplier Data:**
```typescript
// Line 66: Extracted from mock products
const suppliers = Array.from(new Set(products.map(p => p.supplier)));
```
❌ **Issue:** Should fetch from `/api/suppliers` endpoint

#### **Save Function:**
```typescript
// Lines 183-187: NO API CALL
const handleCreateOrder = () => {
  setHasUnsavedChanges(false);
  alert('Purchase Order created successfully!\nRedirecting to PO Management...');
  router.push('/inventory/purchase-orders');
};
```
❌ **Issue:** Just shows alert, no POST request to save data

#### **Calculations:**
```typescript
// Lines 88-100: ROP & EOQ calculations
const calculateROP = (product: Product) => {
  const avgDailySales = product.avgDailySales || 5;
  const leadTime = product.leadTime || 7;
  const safetyStock = product.minStock;
  return Math.ceil((avgDailySales * leadTime) + safetyStock);
};
```
✅ **Good:** Calculations are correct
❌ **Issue:** Using mock data, not real database values

---

### **2. Backend API (`/pages/api/inventory/purchase-orders.ts`)**

#### **GET Endpoint:**
```typescript
// Lines 233-427: Has database query implementation
const purchaseOrdersQuery = `
  SELECT po.*, s.name as supplier_name, ...
  FROM purchase_orders po
  LEFT JOIN suppliers s ON po.supplier_id = s.id
  ...
`;
```
✅ **Good:** Has proper SQL query
✅ **Good:** Has fallback to mock data
✅ **Good:** Has pagination

#### **POST Endpoint:**
```typescript
// Lines 429-566: Has database insert implementation
const insertOrderQuery = `
  INSERT INTO purchase_orders (
    id, po_number, supplier_id, order_date, ...
  ) VALUES ($1, $2, $3, ...)
`;
```
✅ **Good:** Has transaction support
✅ **Good:** Inserts order + items
✅ **Good:** Has error handling

---

### **3. Database Models**

#### **PurchaseOrder Model:**
```javascript
// /models/PurchaseOrder.js
- id (UUID)
- poNumber (STRING)
- supplierId (UUID) → references suppliers
- orderDate (DATE)
- expectedDeliveryDate (DATE)
- status (ENUM: draft, pending, approved, ordered, partial, received, cancelled)
- subtotal, taxAmount, discountAmount, shippingCost, totalAmount
- paymentTerms, paymentStatus
- notes
```
✅ **Good:** Complete model structure

#### **PurchaseOrderItem Model:**
```javascript
// /models/PurchaseOrderItem.js
- id (UUID)
- purchaseOrderId (UUID) → references purchase_orders
- productId (UUID) → references products
- quantity, receivedQuantity
- unitPrice, taxRate, taxAmount
- discountRate, discountAmount
- subtotal, totalAmount
```
✅ **Good:** Complete model structure

---

## 🔴 CRITICAL PROBLEMS IDENTIFIED

### **Problem 1: No API Integration**
**Current:** Frontend uses hardcoded mock data  
**Expected:** Should fetch from `/api/products?lowStock=true`  
**Impact:** Users see fake data, not real inventory

### **Problem 2: No Supplier API**
**Current:** Suppliers extracted from mock products  
**Expected:** Should fetch from `/api/suppliers`  
**Impact:** Cannot select real suppliers

### **Problem 3: No Save Functionality**
**Current:** `handleCreateOrder()` just shows alert  
**Expected:** Should POST to `/api/inventory/purchase-orders`  
**Impact:** Purchase orders are not saved to database

### **Problem 4: No Export/PDF Generation**
**Current:** No export functionality  
**Expected:** Should generate PDF purchase order document  
**Impact:** Cannot print or send PO to suppliers

### **Problem 5: No Document Generation**
**Current:** No PO document template  
**Expected:** Should generate formatted PO document with:
- Company header
- Supplier details
- PO number & date
- Item list with quantities & prices
- Terms & conditions
- Signature fields

### **Problem 6: Missing API Endpoints**
**Current:** No `/api/suppliers` endpoint  
**Expected:** Need endpoint to fetch supplier list  
**Impact:** Cannot populate supplier dropdown

### **Problem 7: No Low Stock API Integration**
**Current:** Mock products with hardcoded stock levels  
**Expected:** Should use `/api/inventory/low-stock` endpoint  
**Impact:** ROP/EOQ calculations based on fake data

---

## 📋 REQUIRED FIXES

### **Priority 1: Critical (Must Fix)**

#### **1.1 Create Suppliers API**
- [ ] Create `/api/suppliers` endpoint
- [ ] GET: Fetch all active suppliers
- [ ] Return: id, name, code, contact, address

#### **1.2 Integrate Low Stock API**
- [ ] Replace mock products with API call
- [ ] Fetch from `/api/inventory/low-stock?status=all`
- [ ] Include ROP/EOQ data in response

#### **1.3 Implement Save Functionality**
- [ ] POST to `/api/inventory/purchase-orders`
- [ ] Send: supplier, items, dates, terms, notes
- [ ] Handle success/error responses
- [ ] Show proper notifications

#### **1.4 Fix Data Flow**
```
Current: Mock Data → Display → Alert → Redirect
Expected: API Fetch → Display → POST Save → Success → Redirect
```

---

### **Priority 2: Important (Should Fix)**

#### **2.1 Add Export Functionality**
- [ ] Create `/api/inventory/purchase-orders/export` endpoint
- [ ] Support formats: PDF, Excel, CSV
- [ ] Generate formatted PO document

#### **2.2 Add PDF Generation**
- [ ] Install `pdfkit` or `jspdf`
- [ ] Create PO document template
- [ ] Include company logo & details
- [ ] Format item table
- [ ] Add terms & conditions

#### **2.3 Add Document Preview**
- [ ] Show PO preview before saving
- [ ] Allow editing before final submission
- [ ] Print preview functionality

---

### **Priority 3: Enhancement (Nice to Have)**

#### **3.1 Add Email Functionality**
- [ ] Send PO to supplier email
- [ ] Attach PDF document
- [ ] Email template

#### **3.2 Add Approval Workflow**
- [ ] Draft → Pending → Approved flow
- [ ] Approval notifications
- [ ] Approval history

#### **3.3 Add Batch Operations**
- [ ] Create multiple POs at once
- [ ] Auto-generate POs for critical items
- [ ] Scheduled PO generation

---

## 🔧 IMPLEMENTATION PLAN

### **Phase 1: API Integration (2-3 hours)**

1. **Create Suppliers API**
   ```javascript
   // /pages/api/suppliers.js
   GET /api/suppliers
   - Fetch all active suppliers from database
   - Return: id, name, code, contact, phone, email, address
   ```

2. **Integrate Low Stock API**
   ```typescript
   // Update create-purchase-order.tsx
   useEffect(() => {
     fetchLowStockProducts();
   }, []);
   
   const fetchLowStockProducts = async () => {
     const response = await fetch('/api/inventory/low-stock?status=all');
     const data = await response.json();
     setProducts(data.data);
   };
   ```

3. **Implement Save Function**
   ```typescript
   const handleCreateOrder = async () => {
     const payload = {
       poNumber: generatePONumber(),
       supplierId: selectedSupplier,
       orderDate,
       expectedDeliveryDate,
       items: selectedItems.map(item => ({
         productId: item.product.id,
         quantity: item.quantity,
         unitPrice: item.product.cost,
         subtotal: item.product.cost * item.quantity
       })),
       subtotal: getTotalCost(),
       total: getTotalCost(),
       paymentTerms,
       notes
     };
     
     const response = await fetch('/api/inventory/purchase-orders', {
       method: 'POST',
       headers: { 'Content-Type': 'application/json' },
       body: JSON.stringify(payload)
     });
     
     if (response.ok) {
       toast.success('Purchase Order created!');
       router.push('/inventory/purchase-orders');
     }
   };
   ```

---

### **Phase 2: Export & PDF (2-3 hours)**

1. **Install Dependencies**
   ```bash
   npm install jspdf jspdf-autotable
   ```

2. **Create PDF Generator**
   ```typescript
   // /lib/pdf/purchaseOrderPDF.ts
   export const generatePurchaseOrderPDF = (order) => {
     const doc = new jsPDF();
     
     // Header
     doc.setFontSize(20);
     doc.text('PURCHASE ORDER', 105, 20, { align: 'center' });
     
     // PO Details
     doc.setFontSize(10);
     doc.text(`PO Number: ${order.poNumber}`, 20, 40);
     doc.text(`Date: ${order.orderDate}`, 20, 50);
     
     // Supplier Details
     doc.text('Supplier:', 20, 70);
     doc.text(order.supplierName, 20, 80);
     
     // Items Table
     doc.autoTable({
       startY: 100,
       head: [['Product', 'SKU', 'Qty', 'Unit Price', 'Total']],
       body: order.items.map(item => [
         item.productName,
         item.productSku,
         item.quantity,
         formatCurrency(item.unitPrice),
         formatCurrency(item.total)
       ])
     });
     
     // Total
     const finalY = doc.lastAutoTable.finalY + 10;
     doc.text(`Total: ${formatCurrency(order.total)}`, 150, finalY);
     
     return doc;
   };
   ```

3. **Add Export Button**
   ```typescript
   const handleExportPDF = () => {
     const pdf = generatePurchaseOrderPDF(orderData);
     pdf.save(`PO-${orderData.poNumber}.pdf`);
   };
   ```

---

### **Phase 3: Document Generation (1-2 hours)**

1. **Create PO Template**
   ```typescript
   // /components/purchase-order/POTemplate.tsx
   export const POTemplate = ({ order }) => (
     <div className="p-8 bg-white">
       <div className="text-center mb-8">
         <h1 className="text-3xl font-bold">PURCHASE ORDER</h1>
         <p className="text-gray-600">PO Number: {order.poNumber}</p>
       </div>
       
       <div className="grid grid-cols-2 gap-8 mb-8">
         <div>
           <h3 className="font-bold mb-2">From:</h3>
           <p>BEDAGANG Cloud POS</p>
           <p>Jl. Contoh No. 123</p>
           <p>Jakarta, Indonesia</p>
         </div>
         
         <div>
           <h3 className="font-bold mb-2">To:</h3>
           <p>{order.supplierName}</p>
           <p>{order.supplierAddress}</p>
         </div>
       </div>
       
       <table className="w-full border">
         <thead>
           <tr className="bg-gray-100">
             <th>Product</th>
             <th>Qty</th>
             <th>Unit Price</th>
             <th>Total</th>
           </tr>
         </thead>
         <tbody>
           {order.items.map(item => (
             <tr key={item.id}>
               <td>{item.productName}</td>
               <td>{item.quantity}</td>
               <td>{formatCurrency(item.unitPrice)}</td>
               <td>{formatCurrency(item.total)}</td>
             </tr>
           ))}
         </tbody>
       </table>
       
       <div className="mt-8 text-right">
         <p className="text-2xl font-bold">
           Total: {formatCurrency(order.total)}
         </p>
       </div>
     </div>
   );
   ```

---

## 📊 RELASI ANTAR MODUL

### **Database Relations:**
```
PurchaseOrder
  ├── belongsTo: Supplier (supplierId)
  ├── belongsTo: Branch (branchId)
  ├── belongsTo: Employee (createdBy, approvedBy)
  └── hasMany: PurchaseOrderItem

PurchaseOrderItem
  ├── belongsTo: PurchaseOrder (purchaseOrderId)
  └── belongsTo: Product (productId)

Product
  ├── belongsTo: Supplier (supplier_id)
  └── hasMany: PurchaseOrderItem

Supplier
  ├── hasMany: Product
  └── hasMany: PurchaseOrder
```

### **API Flow:**
```
Frontend                    Backend                     Database
--------                    -------                     --------
Load Page
  └─→ GET /api/suppliers ──→ Query suppliers ────→ suppliers table
  └─→ GET /api/inventory/
      low-stock ───────────→ Query products ─────→ products table
                             Calculate ROP/EOQ

Select Items
  └─→ Calculate totals
  └─→ Show summary

Create Order
  └─→ POST /api/inventory/
      purchase-orders ──────→ BEGIN TRANSACTION
                             INSERT purchase_order ──→ purchase_orders
                             INSERT items ───────────→ purchase_order_items
                             COMMIT
                             
Export PDF
  └─→ GET /api/inventory/
      purchase-orders/
      [id]/export ──────────→ Query order + items
                             Generate PDF
                             Return file
```

---

## ✅ TESTING CHECKLIST

### **API Tests:**
- [ ] GET /api/suppliers returns supplier list
- [ ] GET /api/inventory/low-stock returns products with ROP/EOQ
- [ ] POST /api/inventory/purchase-orders creates order
- [ ] POST saves order items correctly
- [ ] GET /api/inventory/purchase-orders/[id] returns order details
- [ ] Export generates valid PDF

### **Frontend Tests:**
- [ ] Page loads suppliers from API
- [ ] Page loads low stock products from API
- [ ] ROP/EOQ calculations display correctly
- [ ] Can add items to order
- [ ] Can update quantities
- [ ] Can remove items
- [ ] Total calculations correct
- [ ] Can save order successfully
- [ ] Success message displays
- [ ] Redirects to PO list after save
- [ ] Can export PDF
- [ ] PDF contains correct data

### **Integration Tests:**
- [ ] End-to-end: Create PO → Save → View → Export
- [ ] Data persists in database
- [ ] Can retrieve saved PO
- [ ] PDF matches saved data

---

## 📈 ESTIMATED EFFORT

| Task | Effort | Priority |
|------|--------|----------|
| Create Suppliers API | 1 hour | P1 |
| Integrate Low Stock API | 1 hour | P1 |
| Implement Save Function | 2 hours | P1 |
| Add PDF Generation | 2 hours | P2 |
| Create PO Template | 1 hour | P2 |
| Add Export Endpoint | 1 hour | P2 |
| Testing & Bug Fixes | 2 hours | P1 |
| **Total** | **10 hours** | |

---

## 🎯 CONCLUSION

**Current Status:** 🔴 **NOT PRODUCTION READY**

**Issues:**
- ❌ No real data integration
- ❌ No save functionality
- ❌ No export capability
- ❌ No document generation

**Required Work:**
- ✅ API integration (3-4 hours)
- ✅ Save functionality (2 hours)
- ✅ Export & PDF (3-4 hours)
- ✅ Testing (2 hours)

**Total Effort:** ~10 hours to make fully functional

---

**Analyzed by:** Cascade AI  
**Date:** 25 Jan 2026, 02:00 AM  
**Status:** 🔴 **NEEDS MAJOR REFACTORING**
