# API Endpoints Implementation Summary

## ✅ Completed API Endpoints

### **A. Table Management APIs (4/7 Complete)**

#### **1. GET /api/tables** ✅
Get all tables with filters
```typescript
Query params:
- status?: 'available' | 'occupied' | 'reserved' | 'maintenance'
- area?: string
- floor?: number
- isActive?: boolean
- minCapacity?: number

Response:
{
  success: true,
  data: [
    {
      id: "uuid",
      tableNumber: "T-01",
      capacity: 4,
      area: "indoor",
      floor: 1,
      status: "available",
      currentSession: {...},
      currentReservation: {...}
    }
  ]
}
```

#### **2. POST /api/tables** ✅
Create new table
```typescript
Body:
{
  tableNumber: "T-01",
  capacity: 4,
  area: "indoor",
  floor: 1,
  positionX?: 100,
  positionY?: 200,
  notes?: "Near window"
}

Response:
{
  success: true,
  data: {...},
  message: "Table created successfully"
}
```

#### **3. GET /api/tables/:id** ✅
Get single table with details
```typescript
Response:
{
  success: true,
  data: {
    ...table,
    currentSession: {...},
    currentReservation: {...},
    sessions: [...]
  }
}
```

#### **4. PUT /api/tables/:id** ✅
Update table
```typescript
Body: {
  tableNumber?: "T-02",
  capacity?: 6,
  area?: "outdoor",
  floor?: 2,
  positionX?: 150,
  positionY?: 250,
  notes?: "Updated notes",
  isActive?: true
}
```

#### **5. DELETE /api/tables/:id** ✅
Delete table (soft delete)
```typescript
Response:
{
  success: true,
  message: "Table deleted successfully"
}
```

#### **6. PATCH /api/tables/:id/status** ✅
Update table status
```typescript
Body: {
  status: "occupied" | "available" | "reserved" | "maintenance"
}

Response:
{
  success: true,
  data: {...},
  message: "Table status updated to occupied"
}
```

#### **7. GET /api/tables/layout/:floor** ⏳
Get table layout by floor (To be created)

---

### **B. Reservation Management APIs (3/8 Complete)**

#### **1. GET /api/reservations** ✅
Get reservations with filters
```typescript
Query params:
- date?: "2026-02-13"
- status?: string
- customerId?: string
- tableId?: string
- startDate?: string
- endDate?: string

Response:
{
  success: true,
  data: [
    {
      id: "uuid",
      reservationNumber: "RSV-20260213-001",
      customerName: "John Doe",
      customerPhone: "08123456789",
      reservationDate: "2026-02-13",
      reservationTime: "19:00",
      guestCount: 4,
      tableNumber: "T-05",
      status: "confirmed",
      table: {...},
      customer: {...}
    }
  ]
}
```

#### **2. POST /api/reservations** ✅
Create new reservation
```typescript
Body:
{
  customerName: "John Doe",
  customerPhone: "08123456789",
  customerEmail?: "john@example.com",
  customerId?: "uuid",
  reservationDate: "2026-02-13",
  reservationTime: "19:00",
  guestCount: 4,
  tableId?: "uuid",
  specialRequests?: "Window seat",
  depositAmount?: 100000,
  durationMinutes?: 120
}

Response:
{
  success: true,
  data: {...},
  message: "Reservation created: RSV-20260213-001"
}
```

#### **3. PATCH /api/reservations/:id/status** ✅
Update reservation status
```typescript
Body:
{
  status: "confirmed" | "seated" | "completed" | "cancelled" | "no-show",
  cancellationReason?: "Customer request",
  tableId?: "uuid" // For seating
}

Response:
{
  success: true,
  data: {...},
  message: "Reservation status updated to confirmed"
}
```

#### **4. GET /api/reservations/:id** ⏳
Get single reservation (To be created)

#### **5. PUT /api/reservations/:id** ⏳
Update reservation (To be created)

#### **6. DELETE /api/reservations/:id** ⏳
Cancel reservation (To be created)

#### **7. GET /api/reservations/availability** ⏳
Check table availability (To be created)

#### **8. GET /api/reservations/upcoming** ⏳
Get upcoming reservations (To be created)

---

### **C. HPP Management APIs (2/7 Complete)**

#### **1. GET /api/products/:id/hpp** ✅
Get HPP details for product
```typescript
Response:
{
  success: true,
  data: {
    productId: "uuid",
    productName: "Product A",
    currentHpp: 50000,
    hppMethod: "average",
    
    costBreakdown: {
      purchasePrice: 40000,
      packagingCost: 5000,
      laborCost: 3000,
      overheadCost: 2000,
      total: 50000
    },
    
    pricing: {
      sellingPrice: 75000,
      marginAmount: 25000,
      marginPercentage: 33.33,
      markupPercentage: 50,
      minMarginPercentage: 20
    },
    
    components: [
      {
        id: "uuid",
        type: "material",
        name: "Bahan Baku A",
        cost: 40000,
        quantity: 1,
        unit: "kg",
        totalCost: 40000
      }
    ],
    
    history: [
      {
        date: "2026-02-01T10:00:00Z",
        oldHpp: 48000,
        newHpp: 50000,
        changeAmount: 2000,
        changePercentage: 4.17,
        reason: "purchase",
        sourceReference: "PO-001",
        notes: "Price increase from supplier"
      }
    ]
  }
}
```

#### **2. PUT /api/products/:id/hpp** ✅
Update product HPP
```typescript
Body:
{
  hpp?: 50000,
  hppMethod?: "average" | "fifo" | "lifo" | "standard",
  packagingCost?: 5000,
  laborCost?: 3000,
  overheadCost?: 2000,
  standardCost?: 50000,
  minMarginPercentage?: 20,
  reason?: "Manual adjustment",
  notes?: "Updated based on new supplier price"
}

Response:
{
  success: true,
  data: {
    productId: "uuid",
    oldHpp: 48000,
    newHpp: 50000,
    changeAmount: 2000,
    changePercentage: 4.17,
    marginPercentage: 33.33
  },
  message: "HPP updated successfully"
}
```

#### **3. GET /api/products/hpp/analysis** ✅
Get HPP analysis for all products
```typescript
Query params:
- categoryId?: string
- minMargin?: number
- maxMargin?: number
- sortBy?: "margin" | "hpp" | "name"

Response:
{
  success: true,
  data: [
    {
      productId: "uuid",
      productName: "Product A",
      sku: "SKU-001",
      category: "Food",
      hpp: 50000,
      sellingPrice: 75000,
      marginAmount: 25000,
      marginPercentage: 33.33,
      minMarginPercentage: 20,
      status: "healthy" | "warning" | "critical"
    }
  ],
  summary: {
    totalProducts: 100,
    averageMargin: 35.5,
    lowMarginCount: 5,
    negativeMarginCount: 2,
    healthyCount: 93
  }
}
```

#### **4. POST /api/products/:id/hpp/calculate** ⏳
Auto-calculate HPP (To be created)

#### **5. POST /api/products/:id/hpp/components** ⏳
Add cost component (To be created)

#### **6. GET /api/products/:id/hpp/history** ⏳
Get HPP change history (To be created)

#### **7. POST /api/products/hpp/bulk-update** ⏳
Bulk update HPP (To be created)

---

## 📊 Implementation Status

### **Completed:**
- ✅ 6 Table Management endpoints
- ✅ 3 Reservation Management endpoints
- ✅ 3 HPP Management endpoints
- **Total: 12/22 endpoints (55%)**

### **Remaining:**
- ⏳ 1 Table Management endpoint
- ⏳ 5 Reservation Management endpoints
- ⏳ 4 HPP Management endpoints
- **Total: 10/22 endpoints (45%)**

---

## 🎯 Key Features Implemented

### **Table Management:**
- ✅ Full CRUD operations
- ✅ Status management (available/occupied/reserved/maintenance)
- ✅ Filtering by status, area, floor, capacity
- ✅ Soft delete (mark as inactive)
- ✅ Include current session & reservation

### **Reservation Management:**
- ✅ Create reservations with auto-generated number (RSV-YYYYMMDD-XXX)
- ✅ Status workflow (pending → confirmed → seated → completed)
- ✅ Table assignment & capacity validation
- ✅ Prevent double-booking
- ✅ Filter by date, status, customer, table
- ✅ Include table & customer info

### **HPP Management:**
- ✅ Get detailed HPP breakdown
- ✅ Update HPP with history tracking
- ✅ Auto-calculate margins (amount, percentage, markup)
- ✅ Cost components tracking
- ✅ HPP change history
- ✅ Analysis dashboard with summary statistics
- ✅ Filter by category, margin range
- ✅ Status indicators (healthy/warning/critical)

---

## 🔒 Security Features

All endpoints include:
- ✅ Authentication check (NextAuth session)
- ✅ Input validation
- ✅ Error handling
- ✅ Proper HTTP status codes
- ✅ Audit trail (createdBy, changedBy)

---

## 📁 Files Created

### **API Endpoints:**
1. `pages/api/tables/index.ts` - GET, POST tables
2. `pages/api/tables/[id].ts` - GET, PUT, DELETE table
3. `pages/api/tables/[id]/status.ts` - PATCH table status
4. `pages/api/reservations/index.ts` - GET, POST reservations
5. `pages/api/reservations/[id]/status.ts` - PATCH reservation status
6. `pages/api/products/[id]/hpp.ts` - GET, PUT product HPP
7. `pages/api/products/hpp/analysis.ts` - GET HPP analysis

**Total: 7 API files created**

---

## 🧪 Testing Examples

### **Test Table Management:**
```bash
# Get all tables
curl http://localhost:3001/api/tables

# Get available tables
curl http://localhost:3001/api/tables?status=available

# Create table
curl -X POST http://localhost:3001/api/tables \
  -H "Content-Type: application/json" \
  -d '{"tableNumber":"T-10","capacity":4,"area":"indoor"}'

# Update table status
curl -X PATCH http://localhost:3001/api/tables/{id}/status \
  -H "Content-Type: application/json" \
  -d '{"status":"occupied"}'
```

### **Test Reservations:**
```bash
# Get reservations
curl http://localhost:3001/api/reservations

# Create reservation
curl -X POST http://localhost:3001/api/reservations \
  -H "Content-Type: application/json" \
  -d '{
    "customerName":"John Doe",
    "customerPhone":"08123456789",
    "reservationDate":"2026-02-14",
    "reservationTime":"19:00",
    "guestCount":4
  }'

# Confirm reservation
curl -X PATCH http://localhost:3001/api/reservations/{id}/status \
  -H "Content-Type: application/json" \
  -d '{"status":"confirmed"}'
```

### **Test HPP:**
```bash
# Get product HPP details
curl http://localhost:3001/api/products/{id}/hpp

# Update HPP
curl -X PUT http://localhost:3001/api/products/{id}/hpp \
  -H "Content-Type: application/json" \
  -d '{
    "hpp":50000,
    "packagingCost":5000,
    "laborCost":3000,
    "reason":"manual"
  }'

# Get HPP analysis
curl http://localhost:3001/api/products/hpp/analysis
```

---

## 🎨 Next Steps

### **Phase 1: Complete Remaining APIs** (4-6 hours)
- Create remaining Table endpoints (1)
- Create remaining Reservation endpoints (5)
- Create remaining HPP endpoints (4)

### **Phase 2: Frontend Implementation** (8-10 hours)
- Table Management page (`/tables`)
- Reservation Management page (`/reservations`)
- HPP Analysis page (`/products/hpp-analysis`)
- Product Management enhancement (HPP section)

### **Phase 3: Integration & Testing** (4-6 hours)
- POS integration (link table to transaction)
- Purchase Order integration (auto-update HPP)
- End-to-end testing
- Documentation

---

**Current Status:** ✅ Core API Endpoints Complete (12/22)  
**Ready for:** Frontend Implementation or Complete Remaining APIs  
**Estimated Time to Complete:** 16-22 hours

---

**Last Updated:** Feb 13, 2026 2:35 PM  
**Status:** API Implementation In Progress
