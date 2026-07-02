# 🎯 Bedagang Admin Panel - Design Document

**Date:** February 7, 2026  
**Purpose:** Admin panel untuk mengelola partner/customer yang menggunakan layanan POS Bedagang

---

## 📋 Requirements

### **Fitur Utama:**

1. **Partner Management**
   - Lihat semua partner/customer yang menggunakan layanan POS
   - Detail informasi partner (nama bisnis, kontak, lokasi)
   - Status partner (active, inactive, suspended)

2. **Activation Requests**
   - Lihat pengajuan aktivasi POS dari partner baru
   - Approve/reject activation requests
   - Tracking status aktivasi

3. **POS Active Monitoring**
   - Lihat semua POS yang aktif
   - Status operasional per outlet
   - Informasi device dan lokasi

4. **User & Package Management**
   - Lihat user per partner
   - Paket subscription yang digunakan
   - Limit user, outlet, dan fitur per paket

5. **Transaction Overview**
   - Overview transaksi dari masing-masing outlet
   - Record transaksi per partner
   - Analytics dan reporting

---

## 🗄️ Database Schema

### **1. Table: `partners`**
```sql
CREATE TABLE partners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_name VARCHAR(255) NOT NULL,
  business_type VARCHAR(100), -- 'pharmacy', 'retail', 'restaurant', etc.
  owner_name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  phone VARCHAR(50),
  address TEXT,
  city VARCHAR(100),
  province VARCHAR(100),
  postal_code VARCHAR(20),
  tax_id VARCHAR(50), -- NPWP
  status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'active', 'inactive', 'suspended'
  activation_status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'approved', 'rejected'
  activation_requested_at TIMESTAMP,
  activation_approved_at TIMESTAMP,
  activation_approved_by UUID REFERENCES users(id),
  rejection_reason TEXT,
  logo_url TEXT,
  website VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_partners_status ON partners(status);
CREATE INDEX idx_partners_activation_status ON partners(activation_status);
CREATE INDEX idx_partners_email ON partners(email);
```

### **2. Table: `subscription_packages`**
```sql
CREATE TABLE subscription_packages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL, -- 'Starter', 'Professional', 'Enterprise'
  description TEXT,
  price_monthly DECIMAL(15, 2) NOT NULL,
  price_yearly DECIMAL(15, 2),
  max_outlets INTEGER DEFAULT 1,
  max_users INTEGER DEFAULT 3,
  max_products INTEGER DEFAULT 1000,
  max_transactions_per_month INTEGER,
  features JSONB, -- Array of feature flags
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Sample packages
INSERT INTO subscription_packages (name, description, price_monthly, price_yearly, max_outlets, max_users, max_products, features) VALUES
('Starter', 'Paket untuk usaha kecil', 99000, 990000, 1, 3, 500, '["pos", "inventory", "basic_reports"]'),
('Professional', 'Paket untuk usaha menengah', 299000, 2990000, 5, 10, 5000, '["pos", "inventory", "advanced_reports", "multi_outlet", "loyalty"]'),
('Enterprise', 'Paket untuk usaha besar', 999000, 9990000, 999, 999, 999999, '["pos", "inventory", "advanced_reports", "multi_outlet", "loyalty", "api_access", "custom_integration"]');
```

### **3. Table: `partner_subscriptions`**
```sql
CREATE TABLE partner_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id UUID NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
  package_id UUID NOT NULL REFERENCES subscription_packages(id),
  status VARCHAR(50) DEFAULT 'active', -- 'active', 'expired', 'cancelled', 'suspended'
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  auto_renew BOOLEAN DEFAULT true,
  payment_method VARCHAR(50), -- 'bank_transfer', 'credit_card', 'e-wallet'
  last_payment_date TIMESTAMP,
  next_billing_date DATE,
  total_paid DECIMAL(15, 2) DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_partner_subscriptions_partner ON partner_subscriptions(partner_id);
CREATE INDEX idx_partner_subscriptions_status ON partner_subscriptions(status);
```

### **4. Table: `partner_outlets`**
```sql
CREATE TABLE partner_outlets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id UUID NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
  outlet_name VARCHAR(255) NOT NULL,
  outlet_code VARCHAR(50) UNIQUE NOT NULL,
  address TEXT,
  city VARCHAR(100),
  province VARCHAR(100),
  phone VARCHAR(50),
  manager_name VARCHAR(255),
  is_active BOOLEAN DEFAULT true,
  pos_device_id VARCHAR(255), -- Device identifier
  last_sync_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_partner_outlets_partner ON partner_outlets(partner_id);
CREATE INDEX idx_partner_outlets_code ON partner_outlets(outlet_code);
```

### **5. Table: `partner_users`**
```sql
CREATE TABLE partner_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id UUID NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
  outlet_id UUID REFERENCES partner_outlets(id) ON DELETE SET NULL,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  phone VARCHAR(50),
  role VARCHAR(50) NOT NULL, -- 'owner', 'admin', 'manager', 'cashier', 'staff'
  password_hash TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  last_login_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_partner_users_partner ON partner_users(partner_id);
CREATE INDEX idx_partner_users_email ON partner_users(email);
```

### **6. Table: `activation_requests`**
```sql
CREATE TABLE activation_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id UUID NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
  package_id UUID NOT NULL REFERENCES subscription_packages(id),
  business_documents JSONB, -- KTP, NPWP, SIUP, etc.
  notes TEXT,
  status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'approved', 'rejected', 'under_review'
  reviewed_by UUID REFERENCES users(id),
  reviewed_at TIMESTAMP,
  review_notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_activation_requests_status ON activation_requests(status);
CREATE INDEX idx_activation_requests_partner ON activation_requests(partner_id);
```

### **7. Table: `transaction_summary`** (View or Materialized View)
```sql
CREATE MATERIALIZED VIEW transaction_summary AS
SELECT 
  po.partner_id,
  po.id as outlet_id,
  po.outlet_name,
  DATE(pt.transaction_date) as transaction_date,
  COUNT(pt.id) as total_transactions,
  SUM(pt.total_amount) as total_sales,
  SUM(pt.total_amount - pt.discount_amount) as net_sales,
  AVG(pt.total_amount) as avg_transaction_value,
  COUNT(DISTINCT pt.customer_id) as unique_customers
FROM partner_outlets po
LEFT JOIN pos_transactions pt ON pt.outlet_id = po.id
WHERE pt.status = 'completed'
GROUP BY po.partner_id, po.id, po.outlet_name, DATE(pt.transaction_date);

CREATE INDEX idx_transaction_summary_partner ON transaction_summary(partner_id);
CREATE INDEX idx_transaction_summary_date ON transaction_summary(transaction_date);
```

---

## 🎨 Admin Panel Pages

### **1. Dashboard Overview** (`/admin/dashboard`)

**Metrics Cards:**
- Total Partners (active, pending, suspended)
- Total Active POS Outlets
- Pending Activation Requests
- Total Revenue (monthly, yearly)
- Total Transactions (today, this month)

**Charts:**
- Partner Growth Chart (line chart)
- Revenue Trend (bar chart)
- Top Performing Outlets (table)
- Package Distribution (pie chart)

### **2. Partners Management** (`/admin/partners`)

**Features:**
- List all partners with filters (status, package, city)
- Search by business name, email, phone
- View partner details
- Edit partner information
- Suspend/activate partner
- View subscription history
- View outlets and users

**Columns:**
- Business Name
- Owner Name
- Email/Phone
- Package
- Status
- Active Outlets
- Total Users
- Subscription End Date
- Actions

### **3. Activation Requests** (`/admin/activations`)

**Features:**
- List pending activation requests
- View request details and documents
- Approve/reject requests
- Add review notes
- Bulk actions

**Workflow:**
1. Partner submits activation request
2. Admin reviews documents
3. Admin approves/rejects
4. System sends notification
5. If approved, create subscription and activate partner

### **4. POS Outlets** (`/admin/outlets`)

**Features:**
- List all outlets across all partners
- Filter by partner, status, city
- View outlet details
- Monitor POS device status
- View last sync time
- View transaction statistics

**Columns:**
- Outlet Name/Code
- Partner
- Location
- Manager
- Status
- Device Status
- Last Sync
- Today's Transactions
- Actions

### **5. Users Management** (`/admin/users`)

**Features:**
- List all users across all partners
- Filter by partner, role, status
- View user details
- Activate/deactivate users
- Reset passwords
- View login history

### **6. Packages** (`/admin/packages`)

**Features:**
- List all subscription packages
- Create/edit packages
- Set pricing and limits
- Enable/disable packages
- View package usage statistics

### **7. Transaction Overview** (`/admin/transactions`)

**Features:**
- View transactions by partner
- View transactions by outlet
- Date range filters
- Export reports
- Transaction analytics

**Metrics:**
- Total transactions
- Total revenue
- Average transaction value
- Top selling products
- Peak hours

---

## 🔌 API Endpoints

### **Partners API**
```
GET    /api/admin/partners              - List all partners
GET    /api/admin/partners/:id          - Get partner details
POST   /api/admin/partners              - Create partner
PUT    /api/admin/partners/:id          - Update partner
DELETE /api/admin/partners/:id          - Delete partner
PATCH  /api/admin/partners/:id/status   - Update partner status
GET    /api/admin/partners/:id/outlets  - Get partner outlets
GET    /api/admin/partners/:id/users    - Get partner users
GET    /api/admin/partners/:id/stats    - Get partner statistics
```

### **Activation Requests API**
```
GET    /api/admin/activations           - List activation requests
GET    /api/admin/activations/:id       - Get request details
POST   /api/admin/activations/:id/approve - Approve request
POST   /api/admin/activations/:id/reject  - Reject request
```

### **Outlets API**
```
GET    /api/admin/outlets               - List all outlets
GET    /api/admin/outlets/:id           - Get outlet details
GET    /api/admin/outlets/:id/transactions - Get outlet transactions
```

### **Subscriptions API**
```
GET    /api/admin/subscriptions         - List all subscriptions
GET    /api/admin/subscriptions/:id     - Get subscription details
POST   /api/admin/subscriptions         - Create subscription
PUT    /api/admin/subscriptions/:id     - Update subscription
```

### **Dashboard API**
```
GET    /api/admin/dashboard/stats       - Get dashboard statistics
GET    /api/admin/dashboard/charts      - Get chart data
GET    /api/admin/dashboard/recent      - Get recent activities
```

### **Transactions API**
```
GET    /api/admin/transactions          - List transactions (with filters)
GET    /api/admin/transactions/summary  - Get transaction summary
GET    /api/admin/transactions/export   - Export transactions
```

---

## 🔐 Security & Permissions

### **Admin Roles:**
- **Super Admin** - Full access to all features
- **Admin** - Manage partners, approve activations
- **Support** - View only, cannot approve/reject
- **Finance** - View transactions and billing

### **Authentication:**
- Separate admin authentication system
- JWT tokens with role-based access
- Session management
- Activity logging

---

## 📱 UI/UX Design

### **Layout:**
- Sidebar navigation
- Top bar with user menu and notifications
- Breadcrumbs
- Responsive design

### **Components:**
- Data tables with sorting, filtering, pagination
- Modal dialogs for forms
- Toast notifications
- Loading states
- Empty states

### **Color Scheme:**
- Primary: Blue (#3B82F6)
- Success: Green (#10B981)
- Warning: Yellow (#F59E0B)
- Danger: Red (#EF4444)
- Neutral: Gray (#6B7280)

---

## 📊 Reporting Features

### **Reports:**
1. Partner Growth Report
2. Revenue Report (by partner, by package)
3. Transaction Report (by outlet, by date)
4. User Activity Report
5. Subscription Renewal Report
6. Churn Analysis Report

### **Export Formats:**
- CSV
- Excel
- PDF

---

## 🚀 Implementation Plan

### **Phase 1: Database & Backend**
1. Create database tables and migrations
2. Create Sequelize models
3. Build API endpoints
4. Add authentication & authorization

### **Phase 2: Frontend - Core Pages**
1. Admin layout and navigation
2. Dashboard page
3. Partners list and details
4. Activation requests page

### **Phase 3: Frontend - Advanced Features**
1. Outlets management
2. Users management
3. Transaction overview
4. Reports and analytics

### **Phase 4: Testing & Deployment**
1. Unit tests
2. Integration tests
3. User acceptance testing
4. Documentation
5. Deployment

---

**Next Steps:**
1. Create database migration scripts
2. Create Sequelize models
3. Build API endpoints
4. Create admin panel pages

