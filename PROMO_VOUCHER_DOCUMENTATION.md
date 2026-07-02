# Promo & Voucher Management - Complete Documentation

## 📋 Overview

Modul Promo & Voucher Management untuk mengelola promo, voucher, dan diskon untuk pelanggan. Sistem ini mencakup backend (database, models, API) dan frontend (UI, forms, tables) yang terintegrasi penuh.

---

## 🗄️ Database Schema

### **Table: promos**

```sql
CREATE TABLE promos (
  id UUID PRIMARY KEY,
  name VARCHAR(200) NOT NULL,
  code VARCHAR(50) UNIQUE NOT NULL,
  description TEXT,
  type ENUM('percentage', 'fixed') DEFAULT 'percentage',
  value DECIMAL(15,2) NOT NULL,
  minPurchase DECIMAL(15,2) DEFAULT 0,
  maxDiscount DECIMAL(15,2),
  startDate DATE NOT NULL,
  endDate DATE NOT NULL,
  usageLimit INT,
  usageCount INT DEFAULT 0,
  perUserLimit INT,
  applicableProducts JSON,
  applicableCategories JSON,
  status ENUM('active', 'inactive', 'expired') DEFAULT 'active',
  isActive BOOLEAN DEFAULT true,
  createdAt TIMESTAMP,
  updatedAt TIMESTAMP
);
```

**Indexes:**
- `code` (unique)
- `status`
- `startDate, endDate`

---

### **Table: vouchers**

```sql
CREATE TABLE vouchers (
  id UUID PRIMARY KEY,
  code VARCHAR(50) UNIQUE NOT NULL,
  description TEXT,
  category ENUM('welcome', 'member', 'birthday', 'referral', 'seasonal', 'custom') DEFAULT 'custom',
  type ENUM('percentage', 'fixed') DEFAULT 'fixed',
  value DECIMAL(15,2) NOT NULL,
  minPurchase DECIMAL(15,2) DEFAULT 0,
  maxDiscount DECIMAL(15,2),
  validFrom DATE DEFAULT NOW(),
  validUntil DATE NOT NULL,
  usageLimit INT,
  usageCount INT DEFAULT 0,
  perUserLimit INT DEFAULT 1,
  applicableFor ENUM('all', 'new_customer', 'existing_customer', 'specific_customer') DEFAULT 'all',
  specificCustomers JSON,
  applicableProducts JSON,
  applicableCategories JSON,
  status ENUM('active', 'inactive', 'expired') DEFAULT 'active',
  isActive BOOLEAN DEFAULT true,
  createdAt TIMESTAMP,
  updatedAt TIMESTAMP
);
```

**Indexes:**
- `code` (unique)
- `category`
- `status`
- `validFrom, validUntil`

---

## 📦 Sequelize Models

### **1. Promo Model**

**File:** `/models/Promo.js`

**Fields:**
- `id` - UUID primary key
- `name` - Nama promo
- `code` - Kode promo unik (uppercase)
- `description` - Deskripsi promo
- `type` - 'percentage' atau 'fixed'
- `value` - Nilai diskon
- `minPurchase` - Minimum pembelian
- `maxDiscount` - Maximum diskon (untuk percentage)
- `startDate` - Tanggal mulai
- `endDate` - Tanggal berakhir
- `usageLimit` - Batas penggunaan total
- `usageCount` - Jumlah penggunaan
- `perUserLimit` - Batas per user
- `applicableProducts` - Array product IDs
- `applicableCategories` - Array category IDs
- `status` - 'active', 'inactive', 'expired'
- `isActive` - Boolean soft delete

---

### **2. Voucher Model**

**File:** `/models/Voucher.js`

**Fields:**
- `id` - UUID primary key
- `code` - Kode voucher unik (uppercase)
- `description` - Deskripsi voucher
- `category` - welcome, member, birthday, etc.
- `type` - 'percentage' atau 'fixed'
- `value` - Nilai diskon
- `minPurchase` - Minimum pembelian
- `maxDiscount` - Maximum diskon
- `validFrom` - Tanggal mulai berlaku
- `validUntil` - Tanggal berakhir
- `usageLimit` - Batas penggunaan total
- `usageCount` - Jumlah penggunaan
- `perUserLimit` - Batas per user
- `applicableFor` - all, new_customer, existing_customer
- `specificCustomers` - Array customer IDs
- `applicableProducts` - Array product IDs
- `applicableCategories` - Array category IDs
- `status` - 'active', 'inactive', 'expired'
- `isActive` - Boolean soft delete

---

## 🌐 API Endpoints

### **1. GET /api/promo-voucher/promos**

Get all promos with optional filters.

**Query Parameters:**
- `search` - Search by name or code
- `status` - Filter by status (active, inactive, expired)
- `type` - Filter by type (percentage, fixed)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "name": "Diskon Akhir Tahun",
      "code": "NEWYEAR2026",
      "type": "percentage",
      "value": 20,
      "minPurchase": 100000,
      "maxDiscount": 50000,
      "startDate": "2026-01-01",
      "endDate": "2026-01-31",
      "usageLimit": 100,
      "usageCount": 45,
      "status": "active"
    }
  ],
  "stats": {
    "totalActive": 12,
    "totalUsage": 234,
    "totalPromos": 15
  }
}
```

---

### **2. POST /api/promo-voucher/promos**

Create new promo.

**Request Body:**
```json
{
  "name": "Diskon Akhir Tahun",
  "code": "NEWYEAR2026",
  "description": "Diskon spesial tahun baru",
  "type": "percentage",
  "value": 20,
  "minPurchase": 100000,
  "maxDiscount": 50000,
  "startDate": "2026-01-01",
  "endDate": "2026-01-31",
  "usageLimit": 100,
  "perUserLimit": 1
}
```

**Response:**
```json
{
  "success": true,
  "message": "Promo created successfully",
  "data": { ... }
}
```

---

### **3. PUT /api/promo-voucher/promos?id={id}**

Update existing promo.

**Request Body:** Same as POST (all fields optional)

**Response:**
```json
{
  "success": true,
  "message": "Promo updated successfully",
  "data": { ... }
}
```

---

### **4. DELETE /api/promo-voucher/promos?id={id}**

Soft delete promo.

**Response:**
```json
{
  "success": true,
  "message": "Promo deleted successfully"
}
```

---

### **5. GET /api/promo-voucher/vouchers**

Get all vouchers with optional filters.

**Query Parameters:**
- `search` - Search by code or description
- `status` - Filter by status
- `category` - Filter by category
- `type` - Filter by type

**Response:** Similar to promos endpoint

---

### **6. POST /api/promo-voucher/vouchers**

Create new voucher.

**Request Body:**
```json
{
  "code": "WELCOME50K",
  "description": "Voucher selamat datang",
  "category": "welcome",
  "type": "fixed",
  "value": 50000,
  "minPurchase": 250000,
  "validFrom": "2026-01-01",
  "validUntil": "2026-12-31",
  "usageLimit": 1000,
  "perUserLimit": 1,
  "applicableFor": "new_customer"
}
```

---

### **7. PUT /api/promo-voucher/vouchers?id={id}**

Update existing voucher.

---

### **8. DELETE /api/promo-voucher/vouchers?id={id}**

Soft delete voucher.

---

### **9. GET /api/promo-voucher/stats**

Get dashboard statistics.

**Response:**
```json
{
  "success": true,
  "data": {
    "overview": {
      "totalActivePromos": 12,
      "totalActiveVouchers": 25,
      "totalUsageThisMonth": 1234,
      "totalDiscountGiven": 45000000
    },
    "topPerformers": {
      "promos": [...],
      "vouchers": [...]
    },
    "alerts": {
      "expiringPromos": 3,
      "expiringVouchers": 5
    }
  }
}
```

---

## 🎨 Frontend Components

### **Page:** `/pages/promo-voucher.tsx`

**Features:**
- ✅ Dashboard dengan stats cards
- ✅ Tabs untuk Promo dan Voucher
- ✅ Table dengan search dan filter
- ✅ Modal form Create Promo/Voucher
- ✅ Modal form Edit Promo/Voucher
- ✅ Delete confirmation
- ✅ Copy code to clipboard
- ✅ Loading states
- ✅ Error handling

**State Management:**
```typescript
- promos: any[]
- vouchers: any[]
- stats: { totalActivePromos, totalActiveVouchers, ... }
- showCreateModal: boolean
- showEditModal: boolean
- selectedItem: any
- modalType: 'promo' | 'voucher'
- promoFormData: { ... }
- voucherFormData: { ... }
```

**Handler Functions:**
```typescript
- fetchData() - Fetch promos/vouchers and stats
- handleCreatePromo() - Create new promo
- handleEditPromo() - Update promo
- handleDeletePromo() - Delete promo
- handleCreateVoucher() - Create new voucher
- handleEditVoucher() - Update voucher
- handleDeleteVoucher() - Delete voucher
- copyToClipboard() - Copy code
- openCreateModal() - Open create modal
- openEditPromoModal() - Open edit promo modal
- openEditVoucherModal() - Open edit voucher modal
```

---

## 🔄 Data Flow

### **Create Promo Flow:**

```
User clicks "Buat Promo"
    ↓
openCreateModal('promo') called
    ↓
Modal opens dengan form kosong
    ↓
User fills form (name, code, type, value, dates, etc.)
    ↓
Submit → handleCreatePromo()
    ↓
POST /api/promo-voucher/promos
    ↓
Backend validates & creates promo
    ↓
Success → Alert + Close modal + Refresh data
```

### **Edit Promo Flow:**

```
User clicks Edit icon
    ↓
openEditPromoModal(promo) called
    ↓
Modal opens dengan data promo
    ↓
User edits form
    ↓
Submit → handleEditPromo()
    ↓
PUT /api/promo-voucher/promos?id=xxx
    ↓
Backend validates & updates promo
    ↓
Success → Alert + Close modal + Refresh data
```

---

## 🧪 Testing Guide

### **1. Database Migration**

```bash
cd /Users/winnerharry/Documents/bedagang
npx sequelize-cli db:migrate
```

**Expected:**
- Tables `promos` and `vouchers` created
- Default data inserted (3 promos, 3 vouchers)

---

### **2. Test API Endpoints**

**Get Promos:**
```bash
curl http://localhost:3001/api/promo-voucher/promos
```

**Create Promo:**
```bash
curl -X POST http://localhost:3001/api/promo-voucher/promos \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Flash Sale",
    "code": "FLASH50",
    "type": "percentage",
    "value": 50,
    "minPurchase": 200000,
    "maxDiscount": 100000,
    "startDate": "2026-02-01",
    "endDate": "2026-02-28",
    "usageLimit": 50,
    "perUserLimit": 1
  }'
```

**Get Vouchers:**
```bash
curl http://localhost:3001/api/promo-voucher/vouchers
```

**Get Stats:**
```bash
curl http://localhost:3001/api/promo-voucher/stats
```

---

### **3. Test Frontend**

1. **Start Server:**
   ```bash
   npm run dev
   ```

2. **Open Browser:**
   ```
   http://localhost:3001/promo-voucher
   ```

3. **Test Promo Tab:**
   - ✅ Stats cards display correctly
   - ✅ Promo table shows data
   - ✅ Click "Buat Promo" → Modal opens
   - ✅ Fill form → Submit → Success alert
   - ✅ Click Edit icon → Modal opens with data
   - ✅ Click Delete icon → Confirmation → Success
   - ✅ Click Copy icon → Code copied

4. **Test Voucher Tab:**
   - ✅ Switch to Voucher tab
   - ✅ Voucher table shows data
   - ✅ Click "Buat Voucher" → Modal opens
   - ✅ Fill form → Submit → Success alert
   - ✅ Click Edit icon → Modal opens with data
   - ✅ Click Delete icon → Confirmation → Success
   - ✅ Click Copy icon → Code copied

---

## 📊 Default Data

### **Promos:**

1. **Diskon Akhir Tahun**
   - Code: NEWYEAR2026
   - Type: Percentage (20%)
   - Min Purchase: Rp 100,000
   - Max Discount: Rp 50,000
   - Period: 01 Jan - 31 Jan 2026
   - Limit: 100 uses

2. **Gratis Ongkir**
   - Code: FREESHIPJAN
   - Type: Fixed (Rp 15,000)
   - Min Purchase: Rp 50,000
   - Period: 01 Jan - 31 Jan 2026
   - Limit: 500 uses

3. **Cashback 10%**
   - Code: CASHBACK10
   - Type: Percentage (10%)
   - Min Purchase: Rp 200,000
   - Max Discount: Rp 100,000
   - Period: 15 Jan - 15 Feb 2026
   - Limit: 200 uses

### **Vouchers:**

1. **WELCOME50K**
   - Category: Welcome
   - Type: Fixed (Rp 50,000)
   - Min Purchase: Rp 250,000
   - Valid Until: 31 Dec 2026
   - For: New customers
   - Limit: 1000 uses

2. **MEMBER20**
   - Category: Member
   - Type: Percentage (20%)
   - Min Purchase: Rp 100,000
   - Max Discount: Rp 200,000
   - Valid Until: 30 Jun 2026
   - For: Existing customers
   - Limit: Unlimited

3. **BIRTHDAY100K**
   - Category: Birthday
   - Type: Fixed (Rp 100,000)
   - Min Purchase: Rp 500,000
   - Valid Until: 31 Dec 2026
   - For: All customers
   - Limit: 500 uses

---

## ✅ Integration Checklist

### **Backend:**
- [x] Promo model created
- [x] Voucher model created
- [x] Migration file created
- [x] Default data seeded
- [x] API endpoints for Promos (GET, POST, PUT, DELETE)
- [x] API endpoints for Vouchers (GET, POST, PUT, DELETE)
- [x] Stats API endpoint
- [x] Authentication on all endpoints
- [x] Error handling
- [x] Validation

### **Frontend:**
- [x] Page layout with tabs
- [x] Stats cards with real data
- [x] Promo table with data
- [x] Voucher table with data
- [x] Create Promo modal
- [x] Edit Promo modal
- [x] Create Voucher modal
- [x] Edit Voucher modal
- [x] Delete confirmation
- [x] Copy to clipboard
- [x] Loading states
- [x] Error handling
- [x] Form validation

### **Integration:**
- [x] Frontend fetches data from backend
- [x] Create operations work
- [x] Update operations work
- [x] Delete operations work
- [x] Stats display correctly
- [x] Search functionality
- [x] Filter functionality

---

## 🎯 Use Cases

### **Use Case 1: Create Flash Sale Promo**

**Scenario:** Admin wants to create a flash sale with 50% discount.

**Steps:**
1. Go to `/promo-voucher`
2. Click "Buat Promo"
3. Fill form:
   - Name: Flash Sale 50%
   - Code: FLASH50
   - Type: Percentage
   - Value: 50
   - Min Purchase: 200000
   - Max Discount: 100000
   - Start Date: 2026-02-01
   - End Date: 2026-02-28
   - Usage Limit: 50
   - Per User Limit: 1
4. Click "Simpan"
5. Promo created and appears in table

---

### **Use Case 2: Create Welcome Voucher**

**Scenario:** Admin wants to give new customers a welcome voucher.

**Steps:**
1. Go to `/promo-voucher`
2. Switch to "Voucher" tab
3. Click "Buat Voucher"
4. Fill form:
   - Code: WELCOME100K
   - Category: Welcome
   - Type: Fixed
   - Value: 100000
   - Min Purchase: 500000
   - Valid Until: 2026-12-31
   - Usage Limit: 500
   - Per User Limit: 1
   - Applicable For: New Customer
5. Click "Simpan"
6. Voucher created and appears in table

---

### **Use Case 3: Edit Promo**

**Scenario:** Admin wants to extend promo period.

**Steps:**
1. Find promo in table
2. Click Edit icon
3. Change End Date to new date
4. Click "Update"
5. Promo updated

---

### **Use Case 4: Delete Expired Promo**

**Scenario:** Admin wants to remove expired promo.

**Steps:**
1. Find expired promo in table
2. Click Delete icon
3. Confirm deletion
4. Promo soft deleted (isActive = false)

---

## 🚀 Future Enhancements

1. **Auto-apply Promo/Voucher at Checkout**
   - Integrate with POS system
   - Validate promo/voucher code
   - Apply discount automatically

2. **Usage Tracking**
   - Track who used which promo/voucher
   - Usage history per customer
   - Analytics dashboard

3. **Advanced Filters**
   - Filter by date range
   - Filter by usage count
   - Filter by discount amount

4. **Bulk Operations**
   - Bulk create vouchers
   - Bulk activate/deactivate
   - Bulk delete

5. **Email Notifications**
   - Send voucher code via email
   - Notify when promo is about to expire
   - Send usage reports

6. **QR Code Generation**
   - Generate QR code for vouchers
   - Scan QR code at checkout
   - Track QR code usage

---

## 📝 Maintenance

### **Daily Tasks:**
- Monitor active promos/vouchers
- Check usage statistics
- Review expiring items

### **Weekly Tasks:**
- Analyze top performing promos
- Review customer feedback
- Adjust promo strategies

### **Monthly Tasks:**
- Generate usage reports
- Clean up expired promos/vouchers
- Plan new campaigns

---

**Last Updated:** February 4, 2026  
**Version:** 1.0.0  
**Status:** ✅ Fully Integrated & Tested
