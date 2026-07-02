# Sistem Modular Berdasarkan Jenis Industri

## 📋 Executive Summary

Dokumen ini menjelaskan implementasi sistem modular yang menyesuaikan fitur dan modul berdasarkan jenis industri/usaha. Sistem akan menampilkan hanya modul yang relevan untuk setiap jenis bisnis (Retail, F&B/Restaurant, dll).

## 🎯 Tujuan

1. **Simplifikasi UX** - User hanya melihat fitur yang relevan untuk bisnisnya
2. **Efisiensi** - Tidak ada clutter dari fitur yang tidak digunakan
3. **Scalability** - Mudah menambah jenis industri baru
4. **Flexibility** - User dapat upgrade/change business type
5. **Performance** - Load hanya modul yang diperlukan

## 📊 Analisa Kebutuhan Modul per Industri

### **1. RETAIL (Toko/Minimarket/Supermarket)**

#### Modul yang DITAMPILKAN:
- ✅ **Dashboard** - Sales overview, inventory alerts
- ✅ **POS/Kasir** - Point of Sale untuk transaksi retail
- ✅ **Inventory** - Stock management, reorder points
- ✅ **Products** - Product catalog, categories, pricing
- ✅ **Customers** - Customer database, loyalty program
- ✅ **Suppliers** - Supplier management, purchase orders
- ✅ **Finance** - Accounting, expenses, profit/loss
- ✅ **Reports** - Sales reports, inventory reports
- ✅ **Employees** - Staff management, attendance
- ✅ **Promo & Voucher** - Discounts, promotions
- ✅ **Loyalty Program** - Points, rewards, tiers
- ✅ **Settings** - System configuration

#### Modul yang TIDAK DITAMPILKAN:
- ❌ **Table Management** - Tidak relevan untuk retail
- ❌ **Reservations** - Tidak ada booking di retail
- ❌ **HPP Analysis** - Simplified untuk retail (optional)

#### Fitur Khusus Retail:
- Barcode scanning
- Quick checkout
- Batch pricing
- Stock alerts
- Supplier purchase orders
- Multi-location inventory (optional)

---

### **2. F&B / RESTAURANT (Rumah Makan/Restoran/Cafe)**

#### Modul yang DITAMPILKAN:
- ✅ **Dashboard** - Sales, table occupancy, reservations
- ✅ **POS/Kasir** - Order taking, table management integration
- ✅ **Table Management** - Table status, floor plans
- ✅ **Reservations** - Booking management, deposits
- ✅ **Inventory** - Ingredient stock, recipe management
- ✅ **Products** - Menu items, categories, modifiers
- ✅ **HPP Analysis** - Cost of goods sold, margins
- ✅ **Customers** - Guest database, preferences
- ✅ **Finance** - Accounting, expenses, profit/loss
- ✅ **Reports** - Sales, table utilization, popular items
- ✅ **Employees** - Staff, shifts, kitchen/service roles
- ✅ **Promo & Voucher** - Special offers, happy hours
- ✅ **Settings** - System configuration

#### Modul yang TIDAK DITAMPILKAN:
- ❌ **Suppliers** - Simplified atau integrated ke Inventory
- ❌ **Loyalty Program** - Optional (not all restaurants use)

#### Fitur Khusus F&B:
- Table selection in POS
- Reservation integration
- Kitchen display system (KDS)
- Recipe/ingredient tracking
- Service charge calculation
- Split bill functionality
- Table transfer
- Order modifiers (extra spicy, no ice, etc)

---

### **3. HYBRID (Retail + F&B)**

#### Contoh: Cafe dengan Retail Products
- ✅ Semua modul Retail
- ✅ Semua modul F&B
- ✅ Flexible product categorization (dine-in vs retail)

---

## 🗄️ Database Schema Updates

### 1. Business Types Table

```sql
CREATE TABLE business_types (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  icon VARCHAR(50),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Seed data
INSERT INTO business_types (code, name, description, icon) VALUES
('retail', 'Retail/Toko', 'Toko retail, minimarket, supermarket', 'shopping-cart'),
('fnb', 'F&B/Restaurant', 'Rumah makan, restoran, cafe, warung', 'utensils'),
('hybrid', 'Hybrid', 'Kombinasi retail dan F&B', 'store');
```

### 2. Modules Table

```sql
CREATE TABLE modules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  icon VARCHAR(50),
  route VARCHAR(100),
  parent_module_id UUID REFERENCES modules(id),
  sort_order INTEGER DEFAULT 0,
  is_core BOOLEAN DEFAULT false, -- Core modules always shown
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Seed data
INSERT INTO modules (code, name, icon, route, is_core, sort_order) VALUES
-- Core modules (always shown)
('dashboard', 'Dashboard', 'layout-dashboard', '/dashboard', true, 1),
('pos', 'POS/Kasir', 'shopping-cart', '/pos', true, 2),
('inventory', 'Inventory', 'package', '/inventory', true, 3),
('products', 'Products', 'box', '/products', true, 4),
('customers', 'Customers', 'users', '/customers', true, 5),
('finance', 'Finance', 'wallet', '/finance', true, 6),
('reports', 'Reports', 'bar-chart-3', '/reports', true, 7),
('employees', 'Employees', 'users', '/employees', true, 8),
('settings', 'Settings', 'settings', '/settings', true, 99),

-- F&B specific modules
('tables', 'Table Management', 'utensils', '/tables', false, 10),
('reservations', 'Reservations', 'calendar', '/reservations', false, 11),
('hpp', 'HPP Analysis', 'dollar-sign', '/products/hpp-analysis', false, 12),

-- Retail specific modules
('suppliers', 'Suppliers', 'truck', '/suppliers', false, 13),

-- Optional modules
('promo', 'Promo & Voucher', 'ticket', '/promo-voucher', false, 14),
('loyalty', 'Loyalty Program', 'award', '/loyalty-program', false, 15);
```

### 3. Business Type Modules (Junction Table)

```sql
CREATE TABLE business_type_modules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_type_id UUID REFERENCES business_types(id) ON DELETE CASCADE,
  module_id UUID REFERENCES modules(id) ON DELETE CASCADE,
  is_default BOOLEAN DEFAULT true, -- Shown by default for this business type
  is_optional BOOLEAN DEFAULT false, -- Can be enabled/disabled by user
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(business_type_id, module_id)
);

-- Seed data for RETAIL
INSERT INTO business_type_modules (business_type_id, module_id, is_default, is_optional)
SELECT 
  (SELECT id FROM business_types WHERE code = 'retail'),
  m.id,
  CASE 
    WHEN m.code IN ('tables', 'reservations', 'hpp') THEN false
    WHEN m.code IN ('promo', 'loyalty') THEN true
    ELSE true
  END as is_default,
  CASE 
    WHEN m.code IN ('promo', 'loyalty', 'hpp') THEN true
    ELSE false
  END as is_optional
FROM modules m
WHERE m.code NOT IN ('tables', 'reservations');

-- Seed data for F&B
INSERT INTO business_type_modules (business_type_id, module_id, is_default, is_optional)
SELECT 
  (SELECT id FROM business_types WHERE code = 'fnb'),
  m.id,
  CASE 
    WHEN m.code IN ('suppliers') THEN false
    WHEN m.code IN ('promo', 'loyalty') THEN true
    ELSE true
  END as is_default,
  CASE 
    WHEN m.code IN ('promo', 'loyalty') THEN true
    ELSE false
  END as is_optional
FROM modules m
WHERE m.code NOT IN ('suppliers');

-- Seed data for HYBRID (all modules)
INSERT INTO business_type_modules (business_type_id, module_id, is_default, is_optional)
SELECT 
  (SELECT id FROM business_types WHERE code = 'hybrid'),
  m.id,
  true as is_default,
  CASE 
    WHEN m.code IN ('promo', 'loyalty') THEN true
    ELSE false
  END as is_optional
FROM modules m;
```

### 4. Update Tenants Table

```sql
ALTER TABLE tenants ADD COLUMN business_type_id UUID REFERENCES business_types(id);
ALTER TABLE tenants ADD COLUMN business_name VARCHAR(255);
ALTER TABLE tenants ADD COLUMN business_address TEXT;
ALTER TABLE tenants ADD COLUMN business_phone VARCHAR(50);
ALTER TABLE tenants ADD COLUMN business_email VARCHAR(255);
ALTER TABLE tenants ADD COLUMN setup_completed BOOLEAN DEFAULT false;
ALTER TABLE tenants ADD COLUMN onboarding_step INTEGER DEFAULT 0;
```

### 5. Tenant Modules (User's enabled modules)

```sql
CREATE TABLE tenant_modules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  module_id UUID REFERENCES modules(id) ON DELETE CASCADE,
  is_enabled BOOLEAN DEFAULT true,
  enabled_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  disabled_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(tenant_id, module_id)
);

-- Index for performance
CREATE INDEX idx_tenant_modules_tenant ON tenant_modules(tenant_id);
CREATE INDEX idx_tenant_modules_enabled ON tenant_modules(tenant_id, is_enabled);
```

### 6. Update Users Table

```sql
ALTER TABLE users ADD COLUMN tenant_id UUID REFERENCES tenants(id);
ALTER TABLE users ADD COLUMN role VARCHAR(50) DEFAULT 'staff';
-- roles: owner, admin, manager, cashier, staff
```

---

## 🔐 Registration & Onboarding Flow

### Step 1: User Registration

```tsx
// pages/auth/register.tsx
<form>
  <h2>Daftar Akun Baru</h2>
  
  {/* Step 1: Basic Info */}
  <input name="name" placeholder="Nama Lengkap" required />
  <input name="email" placeholder="Email" required />
  <input name="phone" placeholder="No. Telepon" required />
  <input name="password" placeholder="Password" required />
  
  <button type="submit">Daftar</button>
</form>
```

### Step 2: Business Type Selection

```tsx
// pages/onboarding/business-type.tsx
<div className="onboarding-container">
  <h2>Pilih Jenis Usaha Anda</h2>
  <p>Sistem akan menyesuaikan fitur sesuai dengan jenis usaha Anda</p>
  
  <div className="business-type-grid">
    {/* Retail Card */}
    <button 
      onClick={() => selectBusinessType('retail')}
      className="business-type-card"
    >
      <ShoppingCart className="icon" />
      <h3>Retail/Toko</h3>
      <p>Toko retail, minimarket, supermarket</p>
      <ul className="features-list">
        <li>✓ Manajemen Stok</li>
        <li>✓ Kasir Cepat</li>
        <li>✓ Barcode Scanner</li>
        <li>✓ Supplier Management</li>
        <li>✓ Loyalty Program</li>
      </ul>
    </button>
    
    {/* F&B Card */}
    <button 
      onClick={() => selectBusinessType('fnb')}
      className="business-type-card"
    >
      <Utensils className="icon" />
      <h3>F&B/Restaurant</h3>
      <p>Rumah makan, restoran, cafe, warung</p>
      <ul className="features-list">
        <li>✓ Manajemen Meja</li>
        <li>✓ Reservasi Online</li>
        <li>✓ Menu Digital</li>
        <li>✓ Analisa HPP</li>
        <li>✓ Kitchen Display</li>
      </ul>
    </button>
    
    {/* Hybrid Card */}
    <button 
      onClick={() => selectBusinessType('hybrid')}
      className="business-type-card"
    >
      <Store className="icon" />
      <h3>Hybrid</h3>
      <p>Kombinasi retail dan F&B</p>
      <ul className="features-list">
        <li>✓ Semua Fitur Retail</li>
        <li>✓ Semua Fitur F&B</li>
        <li>✓ Fleksibel</li>
      </ul>
    </button>
  </div>
</div>
```

### Step 3: Business Details

```tsx
// pages/onboarding/business-details.tsx
<form>
  <h2>Informasi Usaha</h2>
  
  <input name="businessName" placeholder="Nama Usaha" required />
  <textarea name="businessAddress" placeholder="Alamat Usaha" required />
  <input name="businessPhone" placeholder="No. Telepon Usaha" required />
  <input name="businessEmail" placeholder="Email Usaha" />
  
  {/* F&B specific fields */}
  {businessType === 'fnb' && (
    <>
      <input name="tableCount" type="number" placeholder="Jumlah Meja" />
      <select name="serviceType">
        <option>Dine-in</option>
        <option>Dine-in + Takeaway</option>
        <option>Dine-in + Delivery</option>
      </select>
    </>
  )}
  
  {/* Retail specific fields */}
  {businessType === 'retail' && (
    <>
      <input name="storeSize" placeholder="Ukuran Toko (m²)" />
      <select name="retailType">
        <option>Toko Kelontong</option>
        <option>Minimarket</option>
        <option>Supermarket</option>
        <option>Specialty Store</option>
      </select>
    </>
  )}
  
  <button type="submit">Lanjutkan</button>
</form>
```

### Step 4: Module Selection (Optional Modules)

```tsx
// pages/onboarding/modules.tsx
<div className="module-selection">
  <h2>Pilih Modul Tambahan</h2>
  <p>Modul inti sudah aktif. Pilih modul tambahan yang Anda butuhkan:</p>
  
  <div className="modules-grid">
    {optionalModules.map(module => (
      <div key={module.id} className="module-card">
        <input 
          type="checkbox" 
          checked={selectedModules.includes(module.id)}
          onChange={() => toggleModule(module.id)}
        />
        <div className="module-icon">{module.icon}</div>
        <h3>{module.name}</h3>
        <p>{module.description}</p>
      </div>
    ))}
  </div>
  
  <button onClick={completeOnboarding}>Selesai & Mulai</button>
</div>
```

### Step 5: Initial Setup

```tsx
// pages/onboarding/setup.tsx
<div className="setup-wizard">
  <h2>Setup Awal</h2>
  
  {/* For F&B */}
  {businessType === 'fnb' && (
    <>
      <h3>Setup Meja</h3>
      <button onClick={() => router.push('/tables/setup')}>
        Atur Meja Sekarang
      </button>
      <button onClick={skipStep}>Lewati (Atur Nanti)</button>
    </>
  )}
  
  {/* For Retail */}
  {businessType === 'retail' && (
    <>
      <h3>Import Produk</h3>
      <button onClick={() => router.push('/products/import')}>
        Import dari Excel
      </button>
      <button onClick={skipStep}>Lewati (Tambah Manual)</button>
    </>
  )}
  
  <button onClick={finishSetup}>Selesai</button>
</div>
```

---

## 🎨 Frontend Implementation

### 1. Business Type Context

```tsx
// contexts/BusinessTypeContext.tsx
import { createContext, useContext, useEffect, useState } from 'react';

interface BusinessTypeContextType {
  businessType: string | null;
  modules: Module[];
  hasModule: (moduleCode: string) => boolean;
  isLoading: boolean;
}

const BusinessTypeContext = createContext<BusinessTypeContextType | undefined>(undefined);

export function BusinessTypeProvider({ children }: { children: React.ReactNode }) {
  const [businessType, setBusinessType] = useState<string | null>(null);
  const [modules, setModules] = useState<Module[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchBusinessConfig();
  }, []);

  const fetchBusinessConfig = async () => {
    try {
      const response = await fetch('/api/business/config');
      const data = await response.json();
      
      if (data.success) {
        setBusinessType(data.businessType);
        setModules(data.modules);
      }
    } catch (error) {
      console.error('Error fetching business config:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const hasModule = (moduleCode: string) => {
    return modules.some(m => m.code === moduleCode && m.isEnabled);
  };

  return (
    <BusinessTypeContext.Provider value={{ businessType, modules, hasModule, isLoading }}>
      {children}
    </BusinessTypeContext.Provider>
  );
}

export function useBusinessType() {
  const context = useContext(BusinessTypeContext);
  if (!context) {
    throw new Error('useBusinessType must be used within BusinessTypeProvider');
  }
  return context;
}
```

### 2. Updated Sidebar Navigation

```tsx
// components/layouts/DashboardLayout.tsx
import { useBusinessType } from '@/contexts/BusinessTypeContext';

const DashboardLayout = ({ children }) => {
  const { modules, hasModule, isLoading } = useBusinessType();

  // Define all possible menu items
  const allMenuItems = [
    { code: 'dashboard', icon: LayoutDashboard, label: 'Dashboard', href: '/dashboard' },
    { code: 'pos', icon: ShoppingCart, label: 'Kasir', href: '/pos' },
    { code: 'inventory', icon: Package, label: 'Inventori', href: '/inventory' },
    { code: 'tables', icon: Utensils, label: 'Manajemen Meja', href: '/tables' },
    { code: 'reservations', icon: Calendar, label: 'Reservasi', href: '/reservations' },
    { code: 'products', icon: Box, label: 'Produk', href: '/products' },
    { code: 'hpp', icon: DollarSign, label: 'Analisa HPP', href: '/products/hpp-analysis' },
    { code: 'customers', icon: Users, label: 'Pelanggan', href: '/customers' },
    { code: 'suppliers', icon: Truck, label: 'Supplier', href: '/suppliers' },
    { code: 'finance', icon: Wallet, label: 'Keuangan', href: '/finance' },
    { code: 'employees', icon: Users, label: 'Karyawan', href: '/employees' },
    { code: 'promo', icon: Ticket, label: 'Promo & Voucher', href: '/promo-voucher' },
    { code: 'loyalty', icon: Award, label: 'Program Loyalitas', href: '/loyalty-program' },
    { code: 'reports', icon: BarChart3, label: 'Laporan', href: '/reports' },
    { code: 'settings', icon: Settings, label: 'Pengaturan', href: '/settings' },
  ];

  // Filter menu items based on enabled modules
  const menuItems = allMenuItems.filter(item => hasModule(item.code));

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="dashboard-layout">
      <aside className="sidebar">
        <nav>
          {menuItems.map(item => (
            <Link key={item.code} href={item.href}>
              <item.icon />
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>
      </aside>
      <main>{children}</main>
    </div>
  );
};
```

### 3. Updated Dashboard

```tsx
// pages/dashboard.tsx
import { useBusinessType } from '@/contexts/BusinessTypeContext';

const Dashboard = () => {
  const { businessType, hasModule } = useBusinessType();

  return (
    <div>
      <h1>Dashboard</h1>
      
      {/* Quick Actions - Conditional */}
      <div className="quick-actions">
        {hasModule('pos') && (
          <QuickActionCard title="Kasir" href="/pos/cashier" />
        )}
        
        {hasModule('inventory') && (
          <QuickActionCard title="Inventori" href="/inventory" />
        )}
        
        {hasModule('tables') && (
          <QuickActionCard title="Manajemen Meja" href="/tables" />
        )}
        
        {hasModule('reservations') && (
          <QuickActionCard title="Reservasi" href="/reservations" />
        )}
        
        {hasModule('hpp') && (
          <QuickActionCard title="Analisa HPP" href="/products/hpp-analysis" />
        )}
      </div>
      
      {/* Stats Cards - Conditional */}
      <div className="stats-grid">
        <StatsCard title="Penjualan Hari Ini" />
        
        {hasModule('inventory') && (
          <StatsCard title="Stok Menipis" />
        )}
        
        {hasModule('tables') && businessType === 'fnb' && (
          <StatsCard title="Meja Tersedia" />
        )}
        
        {hasModule('reservations') && businessType === 'fnb' && (
          <StatsCard title="Reservasi Hari Ini" />
        )}
      </div>
    </div>
  );
};
```

### 4. Module Guard Component

```tsx
// components/guards/ModuleGuard.tsx
import { useBusinessType } from '@/contexts/BusinessTypeContext';
import { useRouter } from 'next/router';
import { useEffect } from 'react';

interface ModuleGuardProps {
  moduleCode: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function ModuleGuard({ moduleCode, children, fallback }: ModuleGuardProps) {
  const { hasModule, isLoading } = useBusinessType();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !hasModule(moduleCode)) {
      router.push('/dashboard');
    }
  }, [hasModule, moduleCode, isLoading, router]);

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (!hasModule(moduleCode)) {
    return fallback || <div>Module not available</div>;
  }

  return <>{children}</>;
}

// Usage in pages
// pages/tables/index.tsx
export default function TablesPage() {
  return (
    <ModuleGuard moduleCode="tables">
      <DashboardLayout>
        {/* Table management content */}
      </DashboardLayout>
    </ModuleGuard>
  );
}
```

---

## 🔧 Backend API Implementation

### 1. Business Config API

```typescript
// pages/api/business/config.ts
import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]';

const db = require('../../../models');

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const session = await getServerSession(req, res, authOptions);
    
    if (!session || !session.user) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const { User, Tenant, BusinessType, TenantModule, Module } = db;
    
    // Get user's tenant
    const user = await User.findOne({
      where: { email: session.user.email },
      include: [{
        model: Tenant,
        as: 'tenant',
        include: [{
          model: BusinessType,
          as: 'businessType'
        }]
      }]
    });

    if (!user || !user.tenant) {
      return res.status(404).json({ success: false, error: 'Tenant not found' });
    }

    // Get enabled modules for this tenant
    const tenantModules = await TenantModule.findAll({
      where: {
        tenantId: user.tenant.id,
        isEnabled: true
      },
      include: [{
        model: Module,
        as: 'module'
      }]
    });

    const modules = tenantModules.map(tm => ({
      id: tm.module.id,
      code: tm.module.code,
      name: tm.module.name,
      icon: tm.module.icon,
      route: tm.module.route,
      isEnabled: tm.isEnabled
    }));

    return res.status(200).json({
      success: true,
      businessType: user.tenant.businessType.code,
      businessTypeName: user.tenant.businessType.name,
      modules,
      tenant: {
        id: user.tenant.id,
        name: user.tenant.businessName,
        setupCompleted: user.tenant.setupCompleted
      }
    });

  } catch (error) {
    console.error('Business config error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch business configuration'
    });
  }
}
```

### 2. Onboarding API

```typescript
// pages/api/onboarding/business-type.ts
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const session = await getServerSession(req, res, authOptions);
    
    if (!session) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const { businessTypeCode, businessDetails, selectedModules } = req.body;
    
    const { User, Tenant, BusinessType, BusinessTypeModule, TenantModule } = db;
    
    // Get user
    const user = await User.findOne({ where: { email: session.user.email } });
    
    // Get business type
    const businessType = await BusinessType.findOne({ where: { code: businessTypeCode } });
    
    if (!businessType) {
      return res.status(404).json({ success: false, error: 'Business type not found' });
    }
    
    // Create or update tenant
    let tenant = await Tenant.findOne({ where: { id: user.tenantId } });
    
    if (!tenant) {
      tenant = await Tenant.create({
        businessTypeId: businessType.id,
        businessName: businessDetails.businessName,
        businessAddress: businessDetails.businessAddress,
        businessPhone: businessDetails.businessPhone,
        businessEmail: businessDetails.businessEmail,
        onboardingStep: 1
      });
      
      // Link user to tenant
      await user.update({ tenantId: tenant.id });
    } else {
      await tenant.update({
        businessTypeId: businessType.id,
        businessName: businessDetails.businessName,
        businessAddress: businessDetails.businessAddress,
        businessPhone: businessDetails.businessPhone,
        businessEmail: businessDetails.businessEmail,
        onboardingStep: 2
      });
    }
    
    // Get default modules for this business type
    const defaultModules = await BusinessTypeModule.findAll({
      where: {
        businessTypeId: businessType.id,
        isDefault: true
      },
      include: [{ model: Module, as: 'module' }]
    });
    
    // Create tenant modules
    for (const btm of defaultModules) {
      await TenantModule.create({
        tenantId: tenant.id,
        moduleId: btm.moduleId,
        isEnabled: true
      });
    }
    
    // Enable selected optional modules
    if (selectedModules && selectedModules.length > 0) {
      for (const moduleId of selectedModules) {
        await TenantModule.create({
          tenantId: tenant.id,
          moduleId,
          isEnabled: true
        });
      }
    }
    
    return res.status(200).json({
      success: true,
      message: 'Business type configured successfully',
      tenant: {
        id: tenant.id,
        businessType: businessType.code
      }
    });

  } catch (error) {
    console.error('Onboarding error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to configure business type'
    });
  }
}
```

### 3. Module Access Middleware

```typescript
// middleware/moduleAccess.ts
import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../pages/api/auth/[...nextauth]';

const db = require('../models');

export async function checkModuleAccess(
  req: NextApiRequest,
  res: NextApiResponse,
  moduleCode: string
) {
  try {
    const session = await getServerSession(req, res, authOptions);
    
    if (!session) {
      return { hasAccess: false, error: 'Unauthorized' };
    }

    const { User, TenantModule, Module } = db;
    
    const user = await User.findOne({
      where: { email: session.user.email }
    });

    if (!user || !user.tenantId) {
      return { hasAccess: false, error: 'Tenant not found' };
    }

    const module = await Module.findOne({ where: { code: moduleCode } });
    
    if (!module) {
      return { hasAccess: false, error: 'Module not found' };
    }

    const tenantModule = await TenantModule.findOne({
      where: {
        tenantId: user.tenantId,
        moduleId: module.id,
        isEnabled: true
      }
    });

    return {
      hasAccess: !!tenantModule,
      error: tenantModule ? null : 'Module not enabled for this tenant'
    };

  } catch (error) {
    console.error('Module access check error:', error);
    return { hasAccess: false, error: 'Failed to check module access' };
  }
}

// Usage in API routes
// pages/api/tables/index.ts
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Check module access
  const accessCheck = await checkModuleAccess(req, res, 'tables');
  
  if (!accessCheck.hasAccess) {
    return res.status(403).json({
      success: false,
      error: accessCheck.error || 'Access denied'
    });
  }

  // Continue with normal API logic
  // ...
}
```

### 4. Get Available Business Types API

```typescript
// pages/api/business/types.ts
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const { BusinessType, BusinessTypeModule, Module } = db;
    
    const businessTypes = await BusinessType.findAll({
      where: { isActive: true },
      include: [{
        model: BusinessTypeModule,
        as: 'businessTypeModules',
        include: [{
          model: Module,
          as: 'module'
        }]
      }],
      order: [['name', 'ASC']]
    });

    const formattedTypes = businessTypes.map(bt => ({
      id: bt.id,
      code: bt.code,
      name: bt.name,
      description: bt.description,
      icon: bt.icon,
      modules: bt.businessTypeModules
        .filter(btm => btm.isDefault)
        .map(btm => ({
          code: btm.module.code,
          name: btm.module.name,
          icon: btm.module.icon
        })),
      optionalModules: bt.businessTypeModules
        .filter(btm => btm.isOptional)
        .map(btm => ({
          code: btm.module.code,
          name: btm.module.name,
          icon: btm.module.icon,
          description: btm.module.description
        }))
    }));

    return res.status(200).json({
      success: true,
      data: formattedTypes
    });

  } catch (error) {
    console.error('Get business types error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch business types'
    });
  }
}
```

---

## 📝 Migration Scripts

### Migration 1: Create Business Type Tables

```javascript
// migrations/YYYYMMDD-create-business-type-system.js
module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Create business_types table
    await queryInterface.createTable('business_types', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      code: {
        type: Sequelize.STRING(50),
        unique: true,
        allowNull: false
      },
      name: {
        type: Sequelize.STRING(100),
        allowNull: false
      },
      description: Sequelize.TEXT,
      icon: Sequelize.STRING(50),
      is_active: {
        type: Sequelize.BOOLEAN,
        defaultValue: true
      },
      created_at: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW
      },
      updated_at: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW
      }
    });

    // Create modules table
    await queryInterface.createTable('modules', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      code: {
        type: Sequelize.STRING(50),
        unique: true,
        allowNull: false
      },
      name: {
        type: Sequelize.STRING(100),
        allowNull: false
      },
      description: Sequelize.TEXT,
      icon: Sequelize.STRING(50),
      route: Sequelize.STRING(100),
      parent_module_id: {
        type: Sequelize.UUID,
        references: {
          model: 'modules',
          key: 'id'
        }
      },
      sort_order: {
        type: Sequelize.INTEGER,
        defaultValue: 0
      },
      is_core: {
        type: Sequelize.BOOLEAN,
        defaultValue: false
      },
      is_active: {
        type: Sequelize.BOOLEAN,
        defaultValue: true
      },
      created_at: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW
      },
      updated_at: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW
      }
    });

    // Create business_type_modules junction table
    await queryInterface.createTable('business_type_modules', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      business_type_id: {
        type: Sequelize.UUID,
        references: {
          model: 'business_types',
          key: 'id'
        },
        onDelete: 'CASCADE'
      },
      module_id: {
        type: Sequelize.UUID,
        references: {
          model: 'modules',
          key: 'id'
        },
        onDelete: 'CASCADE'
      },
      is_default: {
        type: Sequelize.BOOLEAN,
        defaultValue: true
      },
      is_optional: {
        type: Sequelize.BOOLEAN,
        defaultValue: false
      },
      created_at: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW
      }
    });

    // Create tenant_modules table
    await queryInterface.createTable('tenant_modules', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      tenant_id: {
        type: Sequelize.UUID,
        references: {
          model: 'tenants',
          key: 'id'
        },
        onDelete: 'CASCADE'
      },
      module_id: {
        type: Sequelize.UUID,
        references: {
          model: 'modules',
          key: 'id'
        },
        onDelete: 'CASCADE'
      },
      is_enabled: {
        type: Sequelize.BOOLEAN,
        defaultValue: true
      },
      enabled_at: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW
      },
      disabled_at: Sequelize.DATE,
      created_at: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW
      }
    });

    // Add indexes
    await queryInterface.addIndex('tenant_modules', ['tenant_id']);
    await queryInterface.addIndex('tenant_modules', ['tenant_id', 'is_enabled']);
    await queryInterface.addConstraint('business_type_modules', {
      fields: ['business_type_id', 'module_id'],
      type: 'unique',
      name: 'unique_business_type_module'
    });
    await queryInterface.addConstraint('tenant_modules', {
      fields: ['tenant_id', 'module_id'],
      type: 'unique',
      name: 'unique_tenant_module'
    });

    // Update tenants table
    await queryInterface.addColumn('tenants', 'business_type_id', {
      type: Sequelize.UUID,
      references: {
        model: 'business_types',
        key: 'id'
      }
    });
    await queryInterface.addColumn('tenants', 'business_name', Sequelize.STRING(255));
    await queryInterface.addColumn('tenants', 'business_address', Sequelize.TEXT);
    await queryInterface.addColumn('tenants', 'business_phone', Sequelize.STRING(50));
    await queryInterface.addColumn('tenants', 'business_email', Sequelize.STRING(255));
    await queryInterface.addColumn('tenants', 'setup_completed', {
      type: Sequelize.BOOLEAN,
      defaultValue: false
    });
    await queryInterface.addColumn('tenants', 'onboarding_step', {
      type: Sequelize.INTEGER,
      defaultValue: 0
    });

    // Update users table
    await queryInterface.addColumn('users', 'tenant_id', {
      type: Sequelize.UUID,
      references: {
        model: 'tenants',
        key: 'id'
      }
    });
    await queryInterface.addColumn('users', 'role', {
      type: Sequelize.STRING(50),
      defaultValue: 'staff'
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('tenant_modules');
    await queryInterface.dropTable('business_type_modules');
    await queryInterface.dropTable('modules');
    await queryInterface.dropTable('business_types');
    await queryInterface.removeColumn('tenants', 'business_type_id');
    await queryInterface.removeColumn('tenants', 'business_name');
    await queryInterface.removeColumn('tenants', 'business_address');
    await queryInterface.removeColumn('tenants', 'business_phone');
    await queryInterface.removeColumn('tenants', 'business_email');
    await queryInterface.removeColumn('tenants', 'setup_completed');
    await queryInterface.removeColumn('tenants', 'onboarding_step');
    await queryInterface.removeColumn('users', 'tenant_id');
    await queryInterface.removeColumn('users', 'role');
  }
};
```

### Seed Script

```javascript
// seeders/YYYYMMDD-seed-business-types-modules.js
module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Seed business types
    const businessTypes = await queryInterface.bulkInsert('business_types', [
      {
        id: Sequelize.literal('uuid_generate_v4()'),
        code: 'retail',
        name: 'Retail/Toko',
        description: 'Toko retail, minimarket, supermarket',
        icon: 'shopping-cart',
        is_active: true,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        id: Sequelize.literal('uuid_generate_v4()'),
        code: 'fnb',
        name: 'F&B/Restaurant',
        description: 'Rumah makan, restoran, cafe, warung',
        icon: 'utensils',
        is_active: true,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        id: Sequelize.literal('uuid_generate_v4()'),
        code: 'hybrid',
        name: 'Hybrid',
        description: 'Kombinasi retail dan F&B',
        icon: 'store',
        is_active: true,
        created_at: new Date(),
        updated_at: new Date()
      }
    ], { returning: true });

    // Seed modules
    await queryInterface.bulkInsert('modules', [
      // Core modules
      { id: Sequelize.literal('uuid_generate_v4()'), code: 'dashboard', name: 'Dashboard', icon: 'layout-dashboard', route: '/dashboard', is_core: true, sort_order: 1, is_active: true, created_at: new Date(), updated_at: new Date() },
      { id: Sequelize.literal('uuid_generate_v4()'), code: 'pos', name: 'POS/Kasir', icon: 'shopping-cart', route: '/pos', is_core: true, sort_order: 2, is_active: true, created_at: new Date(), updated_at: new Date() },
      { id: Sequelize.literal('uuid_generate_v4()'), code: 'inventory', name: 'Inventory', icon: 'package', route: '/inventory', is_core: true, sort_order: 3, is_active: true, created_at: new Date(), updated_at: new Date() },
      { id: Sequelize.literal('uuid_generate_v4()'), code: 'products', name: 'Products', icon: 'box', route: '/products', is_core: true, sort_order: 4, is_active: true, created_at: new Date(), updated_at: new Date() },
      { id: Sequelize.literal('uuid_generate_v4()'), code: 'customers', name: 'Customers', icon: 'users', route: '/customers', is_core: true, sort_order: 5, is_active: true, created_at: new Date(), updated_at: new Date() },
      { id: Sequelize.literal('uuid_generate_v4()'), code: 'finance', name: 'Finance', icon: 'wallet', route: '/finance', is_core: true, sort_order: 6, is_active: true, created_at: new Date(), updated_at: new Date() },
      { id: Sequelize.literal('uuid_generate_v4()'), code: 'reports', name: 'Reports', icon: 'bar-chart-3', route: '/reports', is_core: true, sort_order: 7, is_active: true, created_at: new Date(), updated_at: new Date() },
      { id: Sequelize.literal('uuid_generate_v4()'), code: 'employees', name: 'Employees', icon: 'users', route: '/employees', is_core: true, sort_order: 8, is_active: true, created_at: new Date(), updated_at: new Date() },
      { id: Sequelize.literal('uuid_generate_v4()'), code: 'settings', name: 'Settings', icon: 'settings', route: '/settings', is_core: true, sort_order: 99, is_active: true, created_at: new Date(), updated_at: new Date() },
      
      // F&B specific
      { id: Sequelize.literal('uuid_generate_v4()'), code: 'tables', name: 'Table Management', icon: 'utensils', route: '/tables', is_core: false, sort_order: 10, is_active: true, created_at: new Date(), updated_at: new Date() },
      { id: Sequelize.literal('uuid_generate_v4()'), code: 'reservations', name: 'Reservations', icon: 'calendar', route: '/reservations', is_core: false, sort_order: 11, is_active: true, created_at: new Date(), updated_at: new Date() },
      { id: Sequelize.literal('uuid_generate_v4()'), code: 'hpp', name: 'HPP Analysis', icon: 'dollar-sign', route: '/products/hpp-analysis', is_core: false, sort_order: 12, is_active: true, created_at: new Date(), updated_at: new Date() },
      
      // Retail specific
      { id: Sequelize.literal('uuid_generate_v4()'), code: 'suppliers', name: 'Suppliers', icon: 'truck', route: '/suppliers', is_core: false, sort_order: 13, is_active: true, created_at: new Date(), updated_at: new Date() },
      
      // Optional
      { id: Sequelize.literal('uuid_generate_v4()'), code: 'promo', name: 'Promo & Voucher', icon: 'ticket', route: '/promo-voucher', is_core: false, sort_order: 14, is_active: true, created_at: new Date(), updated_at: new Date() },
      { id: Sequelize.literal('uuid_generate_v4()'), code: 'loyalty', name: 'Loyalty Program', icon: 'award', route: '/loyalty-program', is_core: false, sort_order: 15, is_active: true, created_at: new Date(), updated_at: new Date() }
    ]);

    // Note: business_type_modules seeding would need to be done with proper IDs
    // This is simplified - in production, you'd query the IDs first
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.bulkDelete('modules', null, {});
    await queryInterface.bulkDelete('business_types', null, {});
  }
};
```

---

## 🧪 Testing Scenarios

### Test 1: Retail Registration
1. Register new account
2. Select "Retail/Toko" business type
3. Fill business details
4. Skip optional modules
5. Complete setup
6. Verify: Only retail modules shown in sidebar
7. Verify: No table/reservation modules

### Test 2: F&B Registration
1. Register new account
2. Select "F&B/Restaurant" business type
3. Fill business details (including table count)
4. Enable optional modules (loyalty)
5. Complete setup
6. Verify: F&B modules shown (tables, reservations, HPP)
7. Verify: No supplier module

### Test 3: Module Access Control
1. Login as retail user
2. Try to access `/tables` directly
3. Verify: Redirected to dashboard or 403 error
4. Try API call to `/api/tables`
5. Verify: 403 Forbidden response

### Test 4: Hybrid Business
1. Register as hybrid
2. Verify: All modules available
3. Test both retail and F&B features
4. Verify: Everything works

---

## 📊 Implementation Roadmap

### Phase 1: Database & Models (Week 1)
- ✅ Create database schema
- ✅ Run migrations
- ✅ Create Sequelize models
- ✅ Seed business types and modules
- ✅ Test database relationships

### Phase 2: Backend API (Week 1-2)
- ✅ Business config API
- ✅ Onboarding APIs
- ✅ Module access middleware
- ✅ Update existing APIs with module checks
- ✅ Test all endpoints

### Phase 3: Frontend Core (Week 2-3)
- ✅ Business Type Context
- ✅ Module Guard component
- ✅ Updated DashboardLayout
- ✅ Updated Dashboard
- ✅ Test conditional rendering

### Phase 4: Onboarding Flow (Week 3)
- ✅ Registration page
- ✅ Business type selection
- ✅ Business details form
- ✅ Module selection
- ✅ Initial setup wizard
- ✅ Test complete flow

### Phase 5: Module Updates (Week 4)
- ✅ Add ModuleGuard to all pages
- ✅ Update POS for F&B features
- ✅ Update Reports for business type
- ✅ Test all modules

### Phase 6: Testing & Polish (Week 5)
- ✅ End-to-end testing
- ✅ User acceptance testing
- ✅ Performance optimization
- ✅ Documentation
- ✅ Training materials

---

## 🎯 Benefits

### For Users:
- ✅ **Simplified Interface** - Only see what they need
- ✅ **Faster Onboarding** - Guided setup process
- ✅ **Better UX** - No confusion from irrelevant features
- ✅ **Flexibility** - Can upgrade/change business type

### For Business:
- ✅ **Scalability** - Easy to add new industry types
- ✅ **Market Expansion** - Target multiple industries
- ✅ **Better Conversion** - Tailored experience per industry
- ✅ **Reduced Support** - Less confusion = fewer tickets

### For Development:
- ✅ **Maintainability** - Modular architecture
- ✅ **Testability** - Isolated module testing
- ✅ **Extensibility** - Easy to add features
- ✅ **Code Reuse** - Shared core modules

---

## 📚 Related Documentation

- `POS_RESERVATION_TABLE_INTEGRATION.md` - POS integration details
- `IMPLEMENTATION_SUMMARY.md` - Table & Reservation implementation
- `API_ENDPOINTS_COMPLETE.md` - API documentation

---

**Status:** Ready for Implementation
**Priority:** Critical
**Estimated Time:** 4-5 weeks for full implementation
**Impact:** High - Affects entire system architecture
