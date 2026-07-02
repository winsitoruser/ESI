# Role-Based Access Guide - Complete Documentation

## 🔐 Login Credentials untuk Semua Role

**Login URL:** `http://localhost:3001/auth/login`

---

## 👥 User Accounts & Access Levels

### **1. SUPER ADMIN** 🔴
**Akses Tertinggi - Full System Control**

**Login:**
```
Email: superadmin@bedagang.com
Password: admin123
```

**Akses:**
- ✅ **Admin Panel** - Kelola semua tenant
  - `/admin/dashboard` - Admin dashboard
  - `/admin/tenants` - Kelola semua tenant
  - `/admin/modules` - Kelola modul sistem
  - `/admin/analytics` - Analytics sistem
  - `/admin/business-types` - Kelola tipe bisnis
  - `/admin/partners` - Kelola partner
  - `/admin/outlets` - Kelola outlet
  - `/admin/activations` - Kelola aktivasi

- ✅ **Full Business Access** - Akses semua modul
  - Dashboard, POS, Inventory, Products
  - Tables, Reservations, Suppliers
  - Customers, Finance, Reports, Settings
  - HPP Analysis, Loyalty, Promotions

**Permissions:**
- Manage all tenants
- Enable/disable modules
- Change business types
- View system analytics
- Full CRUD on all resources

---

### **2. ADMIN** 🟠
**Administrator - Tenant Management**

**Login:**
```
Email: admin@bedagang.com
Password: admin123
```

**Akses:**
- ✅ **Admin Panel** (Limited)
  - `/admin/dashboard` - Admin dashboard
  - `/admin/tenants` - Kelola tenant (jika super admin)
  - `/admin/partners` - Kelola partner

- ✅ **Business Features**
  - Dashboard, Settings, User Management
  - Reports, Analytics
  - System Configuration

**Permissions:**
- Manage tenant settings
- Manage users
- View reports
- Configure system settings
- Cannot manage modules or business types

---

### **3. OWNER** 🟡
**Business Owner - Full Business Access**

**Login:**
```
Email: owner@bedagang.com
Password: owner123
```

**Akses:**
- ✅ **Dashboard** - `/dashboard`
- ✅ **POS** - `/pos` - Point of Sale
- ✅ **Inventory** - `/inventory` - Stock management
- ✅ **Products** - `/products` - Product management
- ✅ **Suppliers** - `/suppliers` - Supplier management (Retail)
- ✅ **Tables** - `/tables` - Table management (F&B)
- ✅ **Reservations** - `/reservations` - Reservation system (F&B)
- ✅ **Customers** - `/customers` - Customer management
- ✅ **Finance** - `/finance` - Financial reports
- ✅ **Reports** - `/reports` - Business reports
- ✅ **Settings** - `/settings` - Business settings
- ✅ **HPP Analysis** - `/products/hpp-analysis` - Cost analysis
- ✅ **Loyalty** - `/loyalty` - Loyalty program
- ✅ **Promotions** - `/promotions` - Promo management

**Permissions:**
- Full access to all business features
- Manage staff and users
- View all reports
- Configure business settings
- Manage inventory and products
- Process transactions
- Cannot access admin panel

---

### **4. MANAGER** 🟢
**Manager - Operations & Reports**

**Login:**
```
Email: manager@bedagang.com
Password: manager123
```

**Akses:**
- ✅ **Dashboard** - `/dashboard`
- ✅ **POS** - `/pos` - Point of Sale
- ✅ **Inventory** - `/inventory` - Stock management
- ✅ **Products** - `/products` - Product management
- ✅ **Suppliers** - `/suppliers` - Supplier management
- ✅ **Tables** - `/tables` - Table management
- ✅ **Customers** - `/customers` - Customer management
- ✅ **Reports** - `/reports` - Business reports
- ✅ **HPP Analysis** - `/products/hpp-analysis` - Cost analysis
- ❌ **Finance** - Limited access
- ❌ **Settings** - View only

**Permissions:**
- Manage inventory and stock
- Manage products and suppliers
- Process transactions
- Manage staff schedules
- View reports
- Cannot change critical settings
- Cannot access financial details

---

### **5. CASHIER** 🔵
**Cashier - Transaction Processing**

**Login:**
```
Email: cashier@bedagang.com
Password: cashier123
```

**Akses:**
- ✅ **Dashboard** - `/dashboard` - View only
- ✅ **POS** - `/pos` - Point of Sale (main access)
- ✅ **Tables** - `/tables` - View table status (F&B)
- ✅ **Customers** - `/customers` - View and add customers
- ✅ **Products** - `/products` - View products
- ❌ **Inventory** - No access
- ❌ **Finance** - No access
- ❌ **Reports** - Limited access
- ❌ **Settings** - No access

**Permissions:**
- Process sales transactions
- View product catalog
- Add/search customers
- View table status
- Print receipts
- Cannot modify inventory
- Cannot view financial reports
- Cannot change settings

---

### **6. STAFF** ⚪
**Staff - Basic Access**

**Login:**
```
Email: staff@bedagang.com
Password: staff123
```

**Akses:**
- ✅ **Dashboard** - `/dashboard` - View only
- ✅ **Tables** - `/tables` - View and update table status (F&B)
- ✅ **Products** - `/products` - View products
- ❌ **POS** - No access
- ❌ **Inventory** - No access
- ❌ **Finance** - No access
- ❌ **Reports** - No access
- ❌ **Settings** - No access

**Permissions:**
- View dashboard
- Update table status (F&B)
- View product information
- Basic customer service
- Cannot process transactions
- Cannot access sensitive data

---

## 🌐 Access URLs Summary

### **Admin Panel URLs** (Super Admin & Admin only)
```
http://localhost:3001/admin/dashboard
http://localhost:3001/admin/tenants
http://localhost:3001/admin/modules
http://localhost:3001/admin/analytics
http://localhost:3001/admin/business-types
http://localhost:3001/admin/partners
http://localhost:3001/admin/outlets
```

### **Business URLs** (Owner, Manager, Cashier, Staff)
```
http://localhost:3001/dashboard
http://localhost:3001/pos
http://localhost:3001/pos/cashier
http://localhost:3001/inventory
http://localhost:3001/products
http://localhost:3001/suppliers
http://localhost:3001/tables
http://localhost:3001/reservations
http://localhost:3001/customers
http://localhost:3001/finance
http://localhost:3001/reports
http://localhost:3001/settings
http://localhost:3001/products/hpp-analysis
http://localhost:3001/loyalty
http://localhost:3001/promotions
```

---

## 📊 Access Matrix

| Feature | Super Admin | Admin | Owner | Manager | Cashier | Staff |
|---------|-------------|-------|-------|---------|---------|-------|
| **Admin Panel** | ✅ Full | ✅ Limited | ❌ | ❌ | ❌ | ❌ |
| **Dashboard** | ✅ | ✅ | ✅ | ✅ | ✅ View | ✅ View |
| **POS** | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| **Inventory** | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| **Products** | ✅ | ✅ | ✅ | ✅ | ✅ View | ✅ View |
| **Suppliers** | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| **Tables** | ✅ | ✅ | ✅ | ✅ | ✅ View | ✅ Update |
| **Reservations** | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| **Customers** | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| **Finance** | ✅ | ✅ | ✅ | ✅ Limited | ❌ | ❌ |
| **Reports** | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| **Settings** | ✅ | ✅ | ✅ | ✅ View | ❌ | ❌ |
| **HPP Analysis** | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| **Loyalty** | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| **Promotions** | ✅ | ✅ | ✅ | ✅ | ✅ View | ❌ |

---

## 🔒 Security Features

### **Password Policy**
- Minimum 6 characters
- Hashed with bcrypt (10 rounds)
- Stored securely in database

### **Session Management**
- JWT-based authentication
- 30-day session expiry
- Secure HTTP-only cookies

### **Role Validation**
- Backend API validation
- Frontend route guards
- Middleware protection

---

## 🚀 Quick Start Guide

### **For Super Admin:**
1. Login dengan `superadmin@bedagang.com`
2. Akses Admin Panel: `/admin/dashboard`
3. Kelola tenant, modul, dan sistem

### **For Business Owner:**
1. Login dengan `owner@bedagang.com`
2. Setup bisnis di `/settings`
3. Tambah produk di `/products`
4. Mulai transaksi di `/pos`

### **For Manager:**
1. Login dengan `manager@bedagang.com`
2. Cek inventory di `/inventory`
3. Kelola staff dan operasional
4. Monitor reports di `/reports`

### **For Cashier:**
1. Login dengan `cashier@bedagang.com`
2. Langsung ke POS: `/pos/cashier`
3. Process transaksi penjualan
4. Print receipt

### **For Staff:**
1. Login dengan `staff@bedagang.com`
2. Update table status (F&B)
3. Assist customers
4. View product info

---

## 📝 Notes

**Important:**
- Semua user sudah aktif (`is_active = true`)
- Password dapat diubah setelah login pertama
- Role tidak bisa diubah oleh user sendiri
- Super Admin dapat mengubah role user lain

**Modular System:**
- Akses modul bergantung pada business type
- Retail: Suppliers, tidak ada Tables/Reservations
- F&B: Tables, Reservations, tidak ada Suppliers
- Hybrid: Semua modul tersedia

**Testing:**
- Gunakan user sesuai role yang ingin ditest
- Coba akses URL yang tidak diizinkan untuk test security
- Verifikasi redirect dan error handling

---

## 🎯 Recommended Testing Flow

1. **Test Super Admin:**
   - Login → Admin Panel → Manage Tenants → Enable/Disable Modules

2. **Test Owner:**
   - Login → Setup Business → Add Products → Process Transaction

3. **Test Manager:**
   - Login → Check Inventory → View Reports → Manage Stock

4. **Test Cashier:**
   - Login → POS → Process Sale → Print Receipt

5. **Test Staff:**
   - Login → View Dashboard → Update Table Status

---

**🎉 Sistem Role-Based Access Siap Digunakan!**

**Login URL:** http://localhost:3001/auth/login

**Pilih user sesuai role yang ingin ditest!**
