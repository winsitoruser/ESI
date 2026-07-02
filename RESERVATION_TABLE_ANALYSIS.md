# Analisa Fitur Reservasi & Manajemen Table

## 📋 Overview
Fitur untuk mengelola meja (table) di restaurant/cafe dan sistem reservasi pelanggan.

---

## 🎯 Business Requirements

### **A. Table Management**
1. **CRUD Tables**
   - Create, Read, Update, Delete meja
   - Informasi: nomor meja, kapasitas, lokasi/area, status
   - Status: available, occupied, reserved, maintenance

2. **Table Layout**
   - Grouping berdasarkan area (Indoor, Outdoor, VIP, Smoking, Non-Smoking)
   - Visual layout untuk melihat status meja real-time
   - Quick action: mark as occupied/available

3. **Table Assignment**
   - Assign meja ke customer walk-in
   - Assign meja ke reservation
   - Merge tables untuk group besar
   - Split bill untuk shared tables

### **B. Reservation Management**
1. **Create Reservation**
   - Customer info: nama, phone, email
   - Reservation details: tanggal, waktu, jumlah orang
   - Table assignment (manual atau auto)
   - Special requests/notes
   - Deposit/down payment (optional)

2. **Reservation Status**
   - Pending - Menunggu konfirmasi
   - Confirmed - Sudah dikonfirmasi
   - Seated - Customer sudah datang & duduk
   - Completed - Selesai
   - Cancelled - Dibatalkan
   - No-show - Customer tidak datang

3. **Reservation Features**
   - Search & filter reservations
   - Calendar view untuk availability
   - Reminder notifications
   - Waitlist management
   - Recurring reservations (optional)

---

## 📊 Database Schema

### **1. Table: `tables`**
```sql
CREATE TABLE tables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  table_number VARCHAR(20) NOT NULL UNIQUE,
  capacity INTEGER NOT NULL,
  area VARCHAR(50), -- 'indoor', 'outdoor', 'vip', 'smoking', 'non-smoking'
  floor INTEGER DEFAULT 1,
  position_x INTEGER, -- For visual layout
  position_y INTEGER,
  status VARCHAR(20) DEFAULT 'available', -- 'available', 'occupied', 'reserved', 'maintenance'
  is_active BOOLEAN DEFAULT TRUE,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_tables_status ON tables(status);
CREATE INDEX idx_tables_area ON tables(area);
```

### **2. Table: `reservations`**
```sql
CREATE TABLE reservations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reservation_number VARCHAR(50) NOT NULL UNIQUE,
  
  -- Customer Info
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  customer_name VARCHAR(255) NOT NULL,
  customer_phone VARCHAR(50) NOT NULL,
  customer_email VARCHAR(255),
  
  -- Reservation Details
  reservation_date DATE NOT NULL,
  reservation_time TIME NOT NULL,
  guest_count INTEGER NOT NULL,
  duration_minutes INTEGER DEFAULT 120, -- Default 2 hours
  
  -- Table Assignment
  table_id UUID REFERENCES tables(id) ON DELETE SET NULL,
  table_number VARCHAR(20),
  
  -- Status & Payment
  status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'confirmed', 'seated', 'completed', 'cancelled', 'no-show'
  deposit_amount DECIMAL(15,2) DEFAULT 0,
  deposit_paid BOOLEAN DEFAULT FALSE,
  
  -- Additional Info
  special_requests TEXT,
  notes TEXT,
  cancellation_reason TEXT,
  
  -- Staff Info
  created_by UUID REFERENCES employees(id),
  confirmed_by UUID REFERENCES employees(id),
  seated_by UUID REFERENCES employees(id),
  
  -- Timestamps
  confirmed_at TIMESTAMP,
  seated_at TIMESTAMP,
  completed_at TIMESTAMP,
  cancelled_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_reservations_date ON reservations(reservation_date);
CREATE INDEX idx_reservations_status ON reservations(status);
CREATE INDEX idx_reservations_customer ON reservations(customer_id);
CREATE INDEX idx_reservations_table ON reservations(table_id);
CREATE INDEX idx_reservations_number ON reservations(reservation_number);
```

### **3. Table: `table_sessions`** (Optional - untuk tracking occupancy)
```sql
CREATE TABLE table_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  table_id UUID NOT NULL REFERENCES tables(id),
  reservation_id UUID REFERENCES reservations(id),
  pos_transaction_id UUID REFERENCES pos_transactions(id),
  
  guest_count INTEGER,
  started_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ended_at TIMESTAMP,
  duration_minutes INTEGER,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_table_sessions_table ON table_sessions(table_id);
CREATE INDEX idx_table_sessions_active ON table_sessions(ended_at) WHERE ended_at IS NULL;
```

---

## 🔌 API Endpoints

### **A. Table Management APIs**

#### **1. GET /api/tables**
Get all tables with filters
```typescript
Query params:
- status?: 'available' | 'occupied' | 'reserved' | 'maintenance'
- area?: string
- floor?: number
- isActive?: boolean

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
      currentSession: null | {...},
      reservation: null | {...}
    }
  ]
}
```

#### **2. POST /api/tables**
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
```

#### **3. PUT /api/tables/:id**
Update table

#### **4. DELETE /api/tables/:id**
Delete table (soft delete)

#### **5. PATCH /api/tables/:id/status**
Update table status
```typescript
Body:
{
  status: "occupied" | "available" | "reserved" | "maintenance"
}
```

### **B. Reservation Management APIs**

#### **1. GET /api/reservations**
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
      ...
    }
  ]
}
```

#### **2. POST /api/reservations**
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
  depositAmount?: 100000
}

Response:
{
  success: true,
  data: {
    id: "uuid",
    reservationNumber: "RSV-20260213-001",
    ...
  }
}
```

#### **3. PUT /api/reservations/:id**
Update reservation

#### **4. PATCH /api/reservations/:id/status**
Update reservation status
```typescript
Body:
{
  status: "confirmed" | "seated" | "completed" | "cancelled" | "no-show",
  cancellationReason?: "Customer request",
  tableId?: "uuid" // For seating
}
```

#### **5. DELETE /api/reservations/:id**
Cancel reservation

#### **6. GET /api/reservations/availability**
Check table availability
```typescript
Query params:
- date: "2026-02-13"
- time: "19:00"
- guestCount: 4
- duration?: 120

Response:
{
  success: true,
  availableTables: [
    { id: "uuid", tableNumber: "T-05", capacity: 4, area: "indoor" }
  ]
}
```

---

## 🎨 Frontend Pages & Components

### **1. Page: `/tables` - Table Management**
**Features:**
- Visual table layout (grid/floor plan)
- Table list view dengan filters
- Quick status update
- Create/Edit table modal
- Real-time status updates

**Components:**
- `TableLayout.tsx` - Visual floor plan
- `TableCard.tsx` - Individual table display
- `TableForm.tsx` - Create/Edit form
- `TableFilters.tsx` - Filter controls

### **2. Page: `/reservations` - Reservation Management**
**Features:**
- Calendar view untuk reservations
- List view dengan search & filters
- Create/Edit reservation modal
- Reservation details modal
- Quick actions (confirm, seat, cancel)

**Components:**
- `ReservationCalendar.tsx` - Calendar view
- `ReservationList.tsx` - List view
- `ReservationForm.tsx` - Create/Edit form
- `ReservationCard.tsx` - Individual reservation display
- `TableSelector.tsx` - Select table for reservation

### **3. Integration dengan POS Cashier**
- Link table ke transaction
- Auto-update table status saat checkout
- Table selection saat create transaction

---

## 🔄 Business Flows

### **Flow 1: Walk-in Customer**
1. Customer datang tanpa reservasi
2. Staff check available tables
3. Assign table → Status: occupied
4. Create POS transaction (linked to table)
5. Customer selesai → Checkout
6. Table status → available

### **Flow 2: Reservation**
1. Customer call/online booking
2. Staff create reservation → Status: pending
3. Staff confirm → Status: confirmed
4. Customer datang → Check-in → Status: seated
5. Table status → occupied
6. Create POS transaction
7. Customer selesai → Status: completed
8. Table status → available

### **Flow 3: No-show**
1. Reservation time passed
2. Customer tidak datang
3. Staff mark as no-show
4. Table released

---

## 📱 Additional Features (Future)

1. **Online Booking Portal**
   - Customer self-service booking
   - Real-time availability check
   - Email/SMS confirmation

2. **Waitlist Management**
   - Queue system untuk full capacity
   - Auto-notify saat table available

3. **Analytics & Reports**
   - Table utilization rate
   - Peak hours analysis
   - Reservation trends
   - No-show rate

4. **Notifications**
   - SMS/Email reminders
   - Staff notifications
   - Customer confirmations

---

## 🎯 Implementation Priority

### **Phase 1: Core Features** (Immediate)
- ✅ Database tables & migrations
- ✅ Models (Table, Reservation)
- ✅ API endpoints (CRUD)
- ✅ Basic frontend pages
- ✅ Table status management
- ✅ Reservation CRUD

### **Phase 2: Integration** (Next)
- Link dengan POS system
- Real-time updates
- Advanced filters & search

### **Phase 3: Advanced** (Future)
- Online booking portal
- Waitlist system
- Analytics dashboard
- Automated notifications

---

## 🔧 Technical Considerations

1. **Real-time Updates**
   - Use WebSocket atau polling untuk status updates
   - Prevent double-booking dengan locking mechanism

2. **Validation**
   - Check table availability sebelum assign
   - Validate reservation time (business hours)
   - Prevent overlapping reservations

3. **Performance**
   - Index pada frequently queried fields
   - Cache table status
   - Pagination untuk large datasets

4. **Security**
   - Role-based access (staff only)
   - Audit log untuk changes
   - Data validation & sanitization

---

**Status:** Ready for implementation
**Estimated Time:** 6-8 hours for Phase 1
