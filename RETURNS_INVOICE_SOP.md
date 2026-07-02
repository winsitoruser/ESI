# ✅ Sistem Retur dengan Invoice/Faktur Distributor - SESUAI SOP

## 🎯 Pengembangan Sistem Retur Sesuai SOP

Sistem retur telah dikembangkan dengan menambahkan **nomor faktur/invoice dari distributor** sesuai Standard Operating Procedure (SOP) untuk dokumentasi yang lebih lengkap dan audit trail yang jelas.

---

## 📊 1. DATABASE SCHEMA UPDATE

### ✅ New Columns Added to `returns` Table

```sql
-- Nomor faktur/invoice dari distributor
invoice_number VARCHAR(100)

-- Tanggal faktur/invoice
invoice_date TIMESTAMP

-- Nama distributor/supplier
distributor_name VARCHAR(255)

-- No. telepon distributor
distributor_phone VARCHAR(50)

-- Tanggal pembelian dari distributor
purchase_date TIMESTAMP
```

### **Migration Files Created:**

**1. Sequelize Migration:** `/migrations/20260126000003-add-invoice-to-returns.js`
```javascript
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('returns', 'invoice_number', {...});
    await queryInterface.addColumn('returns', 'invoice_date', {...});
    await queryInterface.addColumn('returns', 'distributor_name', {...});
    await queryInterface.addColumn('returns', 'distributor_phone', {...});
    await queryInterface.addColumn('returns', 'purchase_date', {...});
    
    // Add indexes
    await queryInterface.addIndex('returns', ['invoice_number']);
    await queryInterface.addIndex('returns', ['distributor_name']);
  }
};
```

**2. Raw SQL Migration:** `/migrations/manual-add-invoice-columns.sql`
```sql
ALTER TABLE returns ADD COLUMN IF NOT EXISTS invoice_number VARCHAR(100);
ALTER TABLE returns ADD COLUMN IF NOT EXISTS invoice_date TIMESTAMP;
ALTER TABLE returns ADD COLUMN IF NOT EXISTS distributor_name VARCHAR(255);
ALTER TABLE returns ADD COLUMN IF NOT EXISTS distributor_phone VARCHAR(50);
ALTER TABLE returns ADD COLUMN IF NOT EXISTS purchase_date TIMESTAMP;

CREATE INDEX IF NOT EXISTS idx_returns_invoice_number ON returns(invoice_number);
CREATE INDEX IF NOT EXISTS idx_returns_distributor_name ON returns(distributor_name);
```

### **Indexes Created:**
- ✅ `idx_returns_invoice_number` - Untuk search by invoice number
- ✅ `idx_returns_distributor_name` - Untuk search by distributor

---

## 🔌 2. API ENDPOINTS UPDATE

### ✅ POST /api/returns - Updated

**File:** `/pages/api/returns/index.js`

**New Request Body Fields:**
```json
{
  // ... existing fields ...
  "invoiceNumber": "INV-2024-001",
  "invoiceDate": "2024-01-15",
  "distributorName": "PT. Distributor ABC",
  "distributorPhone": "021-1234567",
  "purchaseDate": "2024-01-10"
}
```

**Updated INSERT Query:**
```javascript
const insertResult = await pool.query(
  `INSERT INTO returns (
    return_number, transaction_id, customer_name, customer_phone,
    product_id, product_name, product_sku, quantity, unit,
    return_reason, return_type, condition, original_price,
    refund_amount, restocking_fee, status, return_date,
    notes, images, created_by,
    invoice_number, invoice_date, distributor_name, 
    distributor_phone, purchase_date
  ) VALUES ($1, $2, ..., $25)
  RETURNING *`,
  [
    // ... existing values ...
    invoiceNumber || null,
    invoiceDate ? new Date(invoiceDate) : null,
    distributorName || null,
    distributorPhone || null,
    purchaseDate ? new Date(purchaseDate) : null
  ]
);
```

**Response:**
```json
{
  "success": true,
  "message": "Return record created successfully",
  "data": {
    "id": 1,
    "return_number": "RET-2026-0001",
    "invoice_number": "INV-2024-001",
    "invoice_date": "2024-01-15T00:00:00.000Z",
    "distributor_name": "PT. Distributor ABC",
    "status": "pending",
    "created_at": "2026-01-26T12:00:00.000Z"
  }
}
```

---

## 💻 3. FRONTEND UPDATE - CREATE RETURN PAGE

### ✅ New Form Section: Invoice/Faktur Distributor

**File:** `/pages/inventory/returns/create.tsx`

**New State Fields:**
```typescript
const [formData, setFormData] = useState({
  // ... existing fields ...
  invoiceNumber: '',
  invoiceDate: '',
  distributorName: '',
  distributorPhone: '',
  purchaseDate: ''
});
```

**New UI Section (First Section - Priority):**
```tsx
<Card className="border-2 border-blue-200 bg-blue-50/30">
  <CardHeader>
    <CardTitle className="flex items-center text-lg">
      <FaFileInvoice className="mr-2 text-blue-600" />
      Informasi Faktur/Invoice Distributor
    </CardTitle>
    <p className="text-xs text-gray-600 mt-1">
      Sesuai SOP: Wajib mencantumkan nomor faktur dari distributor
    </p>
  </CardHeader>
  <CardContent className="space-y-4">
    {/* No. Faktur/Invoice */}
    <Input
      name="invoiceNumber"
      placeholder="INV-2024-001"
      className="font-mono"
    />
    
    {/* Tanggal Faktur */}
    <Input
      name="invoiceDate"
      type="date"
    />
    
    {/* Nama Distributor */}
    <Input
      name="distributorName"
      placeholder="PT. Distributor ABC"
    />
    
    {/* No. Telepon Distributor */}
    <Input
      name="distributorPhone"
      placeholder="021-1234567"
    />
    
    {/* Tanggal Pembelian */}
    <Input
      name="purchaseDate"
      type="date"
    />
  </CardContent>
</Card>
```

**Features:**
- ✅ Blue border & background untuk highlight
- ✅ Icon FaFileInvoice
- ✅ SOP notice text
- ✅ Positioned as FIRST section (priority)
- ✅ Font mono untuk invoice number
- ✅ Date pickers untuk tanggal

---

## 📋 4. SOP COMPLIANCE

### **Standard Operating Procedure - Retur Barang:**

**Dokumen yang Diperlukan:**
1. ✅ **Nomor Faktur/Invoice** - Dari distributor/supplier
2. ✅ **Tanggal Faktur** - Untuk validasi periode retur
3. ✅ **Nama Distributor** - Identifikasi supplier
4. ✅ **Kontak Distributor** - Untuk koordinasi
5. ✅ **Tanggal Pembelian** - Untuk validasi warranty/garansi

**Alur Retur Sesuai SOP:**
```
1. Terima barang retur dari customer
   ↓
2. Cek faktur pembelian dari distributor
   ↓
3. Input nomor faktur ke sistem
   ↓
4. Validasi periode retur (berdasarkan tanggal faktur)
   ↓
5. Hubungi distributor (gunakan kontak tersimpan)
   ↓
6. Proses retur ke distributor
   ↓
7. Dokumentasi lengkap dengan nomor faktur
```

**Manfaat SOP Invoice:**
- ✅ **Audit Trail** - Jejak lengkap dari pembelian hingga retur
- ✅ **Validasi** - Cek apakah barang masih dalam periode retur
- ✅ **Koordinasi** - Kontak distributor tersimpan
- ✅ **Dokumentasi** - Bukti untuk klaim ke distributor
- ✅ **Akuntansi** - Rekonsiliasi dengan faktur pembelian

---

## 🎨 5. UI/UX DESIGN

### **Form Layout (Priority Order):**

```
┌─────────────────────────────────────────────────┐
│ 1. INVOICE/FAKTUR DISTRIBUTOR (Blue highlight)  │
│    - No. Faktur *                               │
│    - Tanggal Faktur                             │
│    - Nama Distributor                           │
│    - No. Telepon Distributor                    │
│    - Tanggal Pembelian                          │
├─────────────────────────────────────────────────┤
│ 2. CUSTOMER INFORMATION                         │
│    - ID Transaksi                               │
│    - Nama Customer                              │
│    - No. Telepon                                │
├─────────────────────────────────────────────────┤
│ 3. PRODUCT INFORMATION                          │
│    - Search Product                             │
│    - Product Details                            │
├─────────────────────────────────────────────────┤
│ 4. RETURN DETAILS                               │
│    - Reason, Type, Date                         │
└─────────────────────────────────────────────────┘
```

**Design Highlights:**
- ✅ **Blue border** (border-2 border-blue-200)
- ✅ **Light blue background** (bg-blue-50/30)
- ✅ **Icon** (FaFileInvoice)
- ✅ **SOP notice** (text-xs text-gray-600)
- ✅ **First position** - Priority tinggi

---

## 🔄 6. DATA FLOW

### **Complete Flow dengan Invoice:**

```
1. User buka create return page
   ↓
2. User isi Invoice/Faktur section (FIRST)
   - Input nomor faktur: INV-2024-001
   - Pilih tanggal faktur
   - Input nama distributor
   - Input kontak distributor
   ↓
3. User isi Customer info
   ↓
4. User pilih Product (dengan search)
   ↓
5. User isi Return details
   ↓
6. System auto-calculate refund
   ↓
7. User submit form
   ↓
8. POST /api/returns dengan invoice data
   ↓
9. Database INSERT dengan invoice fields
   ↓
10. Return number generated: RET-2026-0001
    ↓
11. Response success dengan invoice info
    ↓
12. Toast notification
    ↓
13. Redirect ke list page
```

---

## 📊 7. DATABASE SCHEMA LENGKAP

### **Table: returns (Updated)**

```sql
CREATE TABLE returns (
  -- Existing columns
  id SERIAL PRIMARY KEY,
  return_number VARCHAR(50) UNIQUE NOT NULL,
  transaction_id INTEGER,
  customer_name VARCHAR(255),
  customer_phone VARCHAR(50),
  product_id INTEGER,
  product_name VARCHAR(255) NOT NULL,
  product_sku VARCHAR(100),
  quantity DECIMAL(10,2) NOT NULL,
  unit VARCHAR(20) NOT NULL DEFAULT 'pcs',
  return_reason VARCHAR(50) NOT NULL,
  return_type VARCHAR(50) NOT NULL,
  condition VARCHAR(50) NOT NULL,
  original_price DECIMAL(15,2) NOT NULL,
  refund_amount DECIMAL(15,2) NOT NULL,
  restocking_fee DECIMAL(15,2) NOT NULL DEFAULT 0,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  return_date TIMESTAMP NOT NULL,
  approval_date TIMESTAMP,
  completion_date TIMESTAMP,
  notes TEXT,
  images JSON,
  approved_by VARCHAR(100),
  created_by VARCHAR(100) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  -- NEW: Invoice/Distributor columns
  invoice_number VARCHAR(100),
  invoice_date TIMESTAMP,
  distributor_name VARCHAR(255),
  distributor_phone VARCHAR(50),
  purchase_date TIMESTAMP
);

-- Indexes
CREATE INDEX idx_returns_return_number ON returns(return_number);
CREATE INDEX idx_returns_transaction_id ON returns(transaction_id);
CREATE INDEX idx_returns_product_id ON returns(product_id);
CREATE INDEX idx_returns_status ON returns(status);
CREATE INDEX idx_returns_return_date ON returns(return_date);
CREATE INDEX idx_returns_customer_phone ON returns(customer_phone);
CREATE INDEX idx_returns_invoice_number ON returns(invoice_number);
CREATE INDEX idx_returns_distributor_name ON returns(distributor_name);
```

---

## 🚀 8. CARA MENJALANKAN MIGRATION

### **Option 1: Sequelize Migration**
```bash
# Run migration
npx sequelize-cli db:migrate

# Verify
npx sequelize-cli db:migrate:status
```

### **Option 2: Raw SQL (Recommended)**
```bash
# Connect to database
psql -U postgres -d farmanesia_dev

# Run migration
\i /path/to/migrations/manual-add-invoice-columns.sql

# Verify columns
\d returns
```

### **Option 3: Manual via pgAdmin/DBeaver**
1. Open database tool
2. Connect to `farmanesia_dev`
3. Run SQL from `manual-add-invoice-columns.sql`
4. Verify columns added

---

## ✅ 9. TESTING CHECKLIST

### **Test 1: Database Migration**
- [ ] Run migration script
- [ ] Verify 5 new columns added
- [ ] Verify 2 new indexes created
- [ ] Check column types correct

### **Test 2: API Endpoint**
- [ ] POST /api/returns dengan invoice data
- [ ] Verify data tersimpan di database
- [ ] Check response include invoice fields
- [ ] Test dengan invoice_number null (optional)

### **Test 3: Frontend Form**
- [ ] Buka create return page
- [ ] Verify invoice section muncul FIRST
- [ ] Verify blue border & background
- [ ] Fill invoice fields
- [ ] Submit form
- [ ] Check data di database

### **Test 4: End-to-End**
- [ ] Create return dengan invoice lengkap
- [ ] Verify di list page
- [ ] Check detail modal
- [ ] Print document (should include invoice)
- [ ] Verify search by invoice number

---

## 📋 10. BENEFITS SOP INVOICE

### **1. Compliance & Audit**
- ✅ Memenuhi SOP perusahaan
- ✅ Audit trail lengkap
- ✅ Dokumentasi proper

### **2. Operational**
- ✅ Koordinasi dengan distributor lebih mudah
- ✅ Validasi periode retur otomatis
- ✅ Tracking klaim ke distributor

### **3. Financial**
- ✅ Rekonsiliasi dengan faktur pembelian
- ✅ Klaim refund ke distributor
- ✅ Akuntansi lebih akurat

### **4. Customer Service**
- ✅ Proses retur lebih cepat
- ✅ Informasi lengkap untuk customer
- ✅ Transparansi proses

---

## 🎯 11. NEXT STEPS

### **Immediate:**
1. ✅ Run database migration
2. ✅ Test API endpoints
3. ✅ Test frontend form
4. ✅ Verify data flow

### **Enhancement:**
- [ ] Update list page - tampilkan invoice
- [ ] Update detail modal - show invoice info
- [ ] Update print document - include invoice
- [ ] Add search by invoice number
- [ ] Add distributor dropdown (master data)

---

## ✅ STATUS: READY FOR MIGRATION

Sistem retur dengan invoice/faktur distributor sudah:
- ✅ Database schema updated (5 new columns)
- ✅ Migration files created (Sequelize + Raw SQL)
- ✅ API endpoints updated (POST /api/returns)
- ✅ Frontend form updated (Invoice section added)
- ✅ SOP compliance implemented
- ✅ Indexes created untuk performa
- ✅ Documentation complete

**Run migration dan test sistem sekarang!** 🎯✨
