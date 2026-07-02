# ✅ Admin Panel Implementation - Complete Guide

**Date:** February 7, 2026  
**Status:** ✅ **PHASE 1 COMPLETED**

---

## 🎯 Overview

Admin panel untuk Bedagang telah berhasil diimplementasikan dengan fitur-fitur berikut:

### **Fitur yang Sudah Diimplementasikan:**

1. ✅ **Database Schema** - 6 tables untuk partner management
2. ✅ **Sequelize Models** - 6 models dengan associations
3. ✅ **API Endpoints** - Dashboard stats, Partners, Activations
4. ✅ **Admin Dashboard Page** - Overview dengan statistics dan charts

---

## 📁 File Structure

```
bedagang/
├── migrations/
│   └── 20260207-create-admin-panel-tables.js    # Database migration
│
├── models/
│   ├── Partner.js                                # Partner model
│   ├── SubscriptionPackage.js                    # Package model
│   ├── PartnerSubscription.js                    # Subscription model
│   ├── PartnerOutlet.js                          # Outlet model
│   ├── PartnerUser.js                            # User model
│   ├── ActivationRequest.js                      # Activation request model
│   └── index.js                                  # Updated with new models
│
├── pages/
│   ├── admin/
│   │   └── index.tsx                             # Admin dashboard page
│   │
│   └── api/
│       └── admin/
│           ├── dashboard/
│           │   └── stats.ts                      # Dashboard statistics API
│           ├── partners/
│           │   └── index.ts                      # Partners CRUD API
│           └── activations/
│               └── index.ts                      # Activation requests API
│
└── ADMIN_PANEL_DESIGN.md                         # Design document
```

---

## 🗄️ Database Tables

### **1. partners**
Menyimpan informasi partner/customer yang menggunakan layanan POS.

**Columns:**
- `id` - UUID primary key
- `business_name` - Nama bisnis
- `business_type` - Jenis bisnis (pharmacy, retail, etc.)
- `owner_name` - Nama pemilik
- `email` - Email (unique)
- `phone` - Nomor telepon
- `address`, `city`, `province`, `postal_code` - Alamat lengkap
- `tax_id` - NPWP
- `status` - Status partner (pending, active, inactive, suspended)
- `activation_status` - Status aktivasi (pending, approved, rejected)
- `activation_requested_at` - Waktu pengajuan aktivasi
- `activation_approved_at` - Waktu approval
- `activation_approved_by` - Admin yang approve
- `rejection_reason` - Alasan penolakan
- `logo_url` - URL logo
- `website` - Website bisnis
- `created_at`, `updated_at` - Timestamps

**Indexes:**
- `idx_partners_status`
- `idx_partners_activation_status`
- `idx_partners_email`

---

### **2. subscription_packages**
Paket subscription yang tersedia.

**Columns:**
- `id` - UUID primary key
- `name` - Nama paket (Starter, Professional, Enterprise)
- `description` - Deskripsi paket
- `price_monthly` - Harga per bulan
- `price_yearly` - Harga per tahun
- `max_outlets` - Maksimal outlet
- `max_users` - Maksimal user
- `max_products` - Maksimal produk
- `max_transactions_per_month` - Maksimal transaksi per bulan
- `features` - JSONB array fitur
- `is_active` - Status aktif
- `created_at`, `updated_at` - Timestamps

**Sample Data:**
```javascript
// Starter - Rp 99,000/bulan
{
  max_outlets: 1,
  max_users: 3,
  max_products: 500,
  features: ['pos', 'inventory', 'basic_reports']
}

// Professional - Rp 299,000/bulan
{
  max_outlets: 5,
  max_users: 10,
  max_products: 5000,
  features: ['pos', 'inventory', 'advanced_reports', 'multi_outlet', 'loyalty', 'analytics']
}

// Enterprise - Rp 999,000/bulan
{
  max_outlets: 999,
  max_users: 999,
  max_products: 999999,
  features: ['pos', 'inventory', 'advanced_reports', 'multi_outlet', 'loyalty', 'analytics', 'api_access', 'custom_integration', 'priority_support']
}
```

---

### **3. partner_subscriptions**
Subscription aktif dari partner.

**Columns:**
- `id` - UUID primary key
- `partner_id` - FK to partners
- `package_id` - FK to subscription_packages
- `status` - Status (active, expired, cancelled, suspended)
- `start_date` - Tanggal mulai
- `end_date` - Tanggal berakhir
- `auto_renew` - Auto renewal
- `payment_method` - Metode pembayaran
- `last_payment_date` - Tanggal pembayaran terakhir
- `next_billing_date` - Tanggal billing berikutnya
- `total_paid` - Total yang sudah dibayar
- `created_at`, `updated_at` - Timestamps

---

### **4. partner_outlets**
Outlet/cabang dari partner.

**Columns:**
- `id` - UUID primary key
- `partner_id` - FK to partners
- `outlet_name` - Nama outlet
- `outlet_code` - Kode outlet (unique)
- `address`, `city`, `province` - Alamat
- `phone` - Nomor telepon
- `manager_name` - Nama manager
- `is_active` - Status aktif
- `pos_device_id` - ID device POS
- `last_sync_at` - Waktu sync terakhir
- `created_at`, `updated_at` - Timestamps

---

### **5. partner_users**
User yang bekerja di partner.

**Columns:**
- `id` - UUID primary key
- `partner_id` - FK to partners
- `outlet_id` - FK to partner_outlets (optional)
- `name` - Nama user
- `email` - Email (unique)
- `phone` - Nomor telepon
- `role` - Role (owner, admin, manager, cashier, staff)
- `password_hash` - Password hash
- `is_active` - Status aktif
- `last_login_at` - Login terakhir
- `created_at`, `updated_at` - Timestamps

---

### **6. activation_requests**
Pengajuan aktivasi dari partner baru.

**Columns:**
- `id` - UUID primary key
- `partner_id` - FK to partners
- `package_id` - FK to subscription_packages
- `business_documents` - JSONB (KTP, NPWP, SIUP, dll)
- `notes` - Catatan dari partner
- `status` - Status (pending, approved, rejected, under_review)
- `reviewed_by` - FK to users (admin yang review)
- `reviewed_at` - Waktu review
- `review_notes` - Catatan review dari admin
- `created_at`, `updated_at` - Timestamps

---

## 🔌 API Endpoints

### **1. Dashboard Statistics**

**Endpoint:** `GET /api/admin/dashboard/stats`

**Authentication:** Required (ADMIN, SUPER_ADMIN)

**Response:**
```json
{
  "success": true,
  "data": {
    "partners": {
      "total": 150,
      "active": 120,
      "pending": 25,
      "suspended": 5
    },
    "outlets": {
      "total": 280
    },
    "activations": {
      "pending": 15,
      "recent": 8
    },
    "revenue": {
      "monthly": 45000000,
      "yearly": 450000000
    },
    "subscriptions": {
      "active": 120,
      "expiring": 12
    },
    "charts": {
      "partnerGrowth": [
        { "month": "Sep 2025", "count": 10 },
        { "month": "Oct 2025", "count": 15 },
        { "month": "Nov 2025", "count": 20 },
        { "month": "Dec 2025", "count": 25 },
        { "month": "Jan 2026", "count": 30 },
        { "month": "Feb 2026", "count": 50 }
      ],
      "packageDistribution": [
        { "package": "Starter", "count": 60 },
        { "package": "Professional", "count": 45 },
        { "package": "Enterprise", "count": 15 }
      ]
    }
  }
}
```

---

### **2. Partners List**

**Endpoint:** `GET /api/admin/partners`

**Authentication:** Required (ADMIN, SUPER_ADMIN)

**Query Parameters:**
- `page` - Page number (default: 1)
- `limit` - Items per page (default: 20)
- `status` - Filter by status (pending, active, inactive, suspended)
- `activation_status` - Filter by activation status
- `city` - Filter by city
- `search` - Search by business name, owner name, email, phone
- `sort_by` - Sort field (default: created_at)
- `sort_order` - Sort order (ASC, DESC)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "business_name": "Apotek Sehat",
      "business_type": "pharmacy",
      "owner_name": "John Doe",
      "email": "john@apoteksehat.com",
      "phone": "081234567890",
      "city": "Jakarta",
      "province": "DKI Jakarta",
      "status": "active",
      "activation_status": "approved",
      "logo_url": "https://...",
      "total_outlets": 3,
      "active_outlets": 3,
      "total_users": 12,
      "active_users": 10,
      "current_package": "Professional",
      "subscription_end_date": "2026-12-31",
      "created_at": "2025-01-15T10:00:00Z",
      "updated_at": "2026-02-01T15:30:00Z"
    }
  ],
  "pagination": {
    "total": 150,
    "page": 1,
    "limit": 20,
    "total_pages": 8
  }
}
```

---

### **3. Create Partner**

**Endpoint:** `POST /api/admin/partners`

**Authentication:** Required (ADMIN, SUPER_ADMIN)

**Request Body:**
```json
{
  "business_name": "Apotek Baru",
  "business_type": "pharmacy",
  "owner_name": "Jane Smith",
  "email": "jane@apotekbaru.com",
  "phone": "081234567891",
  "address": "Jl. Sudirman No. 123",
  "city": "Bandung",
  "province": "Jawa Barat",
  "postal_code": "40123",
  "tax_id": "12.345.678.9-012.000",
  "website": "https://apotekbaru.com"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "business_name": "Apotek Baru",
    "status": "pending",
    "activation_status": "pending"
  },
  "message": "Partner created successfully"
}
```

---

### **4. Activation Requests List**

**Endpoint:** `GET /api/admin/activations`

**Authentication:** Required (ADMIN, SUPER_ADMIN)

**Query Parameters:**
- `page` - Page number
- `limit` - Items per page
- `status` - Filter by status (pending, approved, rejected, under_review)
- `sort_by` - Sort field
- `sort_order` - Sort order

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "partner": {
        "id": "uuid",
        "business_name": "Apotek Baru",
        "owner_name": "Jane Smith",
        "email": "jane@apotekbaru.com",
        "phone": "081234567891",
        "city": "Bandung"
      },
      "package": {
        "id": "uuid",
        "name": "Professional",
        "price_monthly": 299000,
        "max_outlets": 5,
        "max_users": 10
      },
      "business_documents": {
        "ktp": "url_to_ktp",
        "npwp": "url_to_npwp",
        "siup": "url_to_siup"
      },
      "notes": "Ingin menggunakan POS untuk 3 cabang apotek",
      "status": "pending",
      "created_at": "2026-02-05T10:00:00Z"
    }
  ],
  "pagination": {
    "total": 15,
    "page": 1,
    "limit": 20,
    "total_pages": 1
  }
}
```

---

## 🎨 Admin Dashboard Page

**URL:** `/admin`

**Features:**

### **1. Statistics Cards**
- Total Partners (dengan breakdown active, pending, suspended)
- Active Outlets
- Pending Activations
- Monthly Revenue

### **2. Subscription Stats**
- Active Subscriptions
- Expiring Soon (30 days)

### **3. Quick Actions**
- Manage Partners
- Review Activations (dengan badge count)
- View Transactions

### **4. Charts**
- **Partner Growth** - Bar chart pertumbuhan partner 6 bulan terakhir
- **Package Distribution** - Distribution paket yang digunakan

### **5. Design**
- Responsive layout
- Modern UI dengan Tailwind CSS
- Icons dari Lucide React
- Loading states
- Error handling

---

## 🚀 Cara Menjalankan

### **1. Run Database Migration**

```bash
# Jalankan migration untuk membuat tables
npm run db:migrate

# Atau manual
node -e "require('./migrations/20260207-create-admin-panel-tables').up(require('sequelize').QueryInterface, require('sequelize'))"
```

### **2. Verify Tables Created**

```sql
-- Check tables
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN (
  'partners',
  'subscription_packages',
  'partner_subscriptions',
  'partner_outlets',
  'partner_users',
  'activation_requests'
);

-- Check sample packages
SELECT * FROM subscription_packages;
```

### **3. Start Development Server**

```bash
npm run dev
```

### **4. Access Admin Dashboard**

```
http://localhost:3001/admin
```

**Note:** Pastikan user yang login memiliki role `ADMIN` atau `SUPER_ADMIN`.

---

## 🔐 Security & Authentication

### **Role-Based Access Control:**

```typescript
// Middleware check di setiap API endpoint
const session = await getServerSession(req, res, authOptions);
if (!session || !['ADMIN', 'SUPER_ADMIN'].includes(session.user?.role)) {
  return res.status(401).json({ error: 'Unauthorized' });
}
```

### **Roles:**
- **SUPER_ADMIN** - Full access ke semua fitur
- **ADMIN** - Manage partners, approve activations
- **SUPPORT** - View only (belum diimplementasikan)
- **FINANCE** - View transactions dan billing (belum diimplementasikan)

---

## 📋 Next Steps (Phase 2)

### **API Endpoints yang Perlu Dibuat:**

1. **Partners Detail & Update**
   - `GET /api/admin/partners/:id`
   - `PUT /api/admin/partners/:id`
   - `PATCH /api/admin/partners/:id/status`
   - `GET /api/admin/partners/:id/outlets`
   - `GET /api/admin/partners/:id/users`
   - `GET /api/admin/partners/:id/stats`

2. **Activation Approval**
   - `POST /api/admin/activations/:id/approve`
   - `POST /api/admin/activations/:id/reject`
   - `GET /api/admin/activations/:id`

3. **Outlets Management**
   - `GET /api/admin/outlets`
   - `GET /api/admin/outlets/:id`
   - `GET /api/admin/outlets/:id/transactions`

4. **Transactions Overview**
   - `GET /api/admin/transactions`
   - `GET /api/admin/transactions/summary`
   - `GET /api/admin/transactions/export`

5. **Subscriptions Management**
   - `GET /api/admin/subscriptions`
   - `POST /api/admin/subscriptions`
   - `PUT /api/admin/subscriptions/:id`

### **Pages yang Perlu Dibuat:**

1. **Partners Management** (`/admin/partners`)
   - List partners dengan filters
   - Partner detail page
   - Edit partner form
   - View outlets & users

2. **Activation Requests** (`/admin/activations`)
   - List pending requests
   - Review form dengan document viewer
   - Approve/reject workflow

3. **Outlets Management** (`/admin/outlets`)
   - List all outlets
   - Outlet details
   - Transaction statistics

4. **Transaction Overview** (`/admin/transactions`)
   - Transaction list dengan filters
   - Summary statistics
   - Export functionality

5. **Users Management** (`/admin/users`)
   - List all partner users
   - User details
   - Activate/deactivate

6. **Packages Management** (`/admin/packages`)
   - List packages
   - Create/edit packages
   - Package usage statistics

---

## 🧪 Testing

### **Manual Testing:**

```bash
# 1. Test Dashboard Stats API
curl http://localhost:3001/api/admin/dashboard/stats \
  -H "Cookie: next-auth.session-token=YOUR_SESSION_TOKEN"

# 2. Test Partners List API
curl "http://localhost:3001/api/admin/partners?page=1&limit=10" \
  -H "Cookie: next-auth.session-token=YOUR_SESSION_TOKEN"

# 3. Test Create Partner
curl -X POST http://localhost:3001/api/admin/partners \
  -H "Content-Type: application/json" \
  -H "Cookie: next-auth.session-token=YOUR_SESSION_TOKEN" \
  -d '{
    "business_name": "Test Apotek",
    "owner_name": "Test Owner",
    "email": "test@example.com"
  }'

# 4. Test Activations List
curl "http://localhost:3001/api/admin/activations?status=pending" \
  -H "Cookie: next-auth.session-token=YOUR_SESSION_TOKEN"
```

---

## 📊 Sample Data

### **Create Sample Partner:**

```sql
INSERT INTO partners (
  id, business_name, business_type, owner_name, email, phone,
  address, city, province, status, activation_status,
  activation_requested_at, created_at, updated_at
) VALUES (
  gen_random_uuid(),
  'Apotek Sehat Sentosa',
  'pharmacy',
  'Budi Santoso',
  'budi@apoteksehat.com',
  '081234567890',
  'Jl. Sudirman No. 123',
  'Jakarta',
  'DKI Jakarta',
  'active',
  'approved',
  NOW(),
  NOW(),
  NOW()
);
```

### **Create Sample Activation Request:**

```sql
-- First, get partner_id and package_id
INSERT INTO activation_requests (
  id, partner_id, package_id, status,
  business_documents, notes, created_at, updated_at
) VALUES (
  gen_random_uuid(),
  (SELECT id FROM partners LIMIT 1),
  (SELECT id FROM subscription_packages WHERE name = 'Professional'),
  'pending',
  '{"ktp": "url_to_ktp", "npwp": "url_to_npwp"}',
  'Ingin menggunakan untuk 3 cabang apotek',
  NOW(),
  NOW()
);
```

---

## ✅ Summary

**Phase 1 Completed:**
- ✅ Database schema (6 tables)
- ✅ Sequelize models (6 models)
- ✅ API endpoints (3 endpoints)
- ✅ Admin dashboard page

**Ready for Phase 2:**
- Partners management page
- Activation approval workflow
- Transaction overview
- Advanced filtering & reporting

---

**Last Updated:** February 7, 2026, 12:30 AM (UTC+07:00)
