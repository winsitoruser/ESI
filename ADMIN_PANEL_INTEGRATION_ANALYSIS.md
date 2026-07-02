# Admin Panel Integration - Comprehensive Analysis & Implementation

## 📊 Current Admin Panel Analysis

### **Existing Admin Panel Structure**

**Pages:**
- `/admin/dashboard.tsx` - Main admin dashboard
- `/admin/login.tsx` - Admin login
- `/admin/partners/` - Partner management
- `/admin/outlets/` - Outlet management
- `/admin/activations/` - Activation requests
- `/admin/transactions/` - Transaction monitoring

**Models:**
- `Partner` - Business partners
- `PartnerOutlet` - Partner outlets/locations
- `PartnerUser` - Partner users
- `PartnerSubscription` - Subscription management
- `ActivationRequest` - Activation requests
- `SubscriptionPackage` - Subscription packages

**Current Admin Roles:**
- `ADMIN` - Regular admin
- `SUPER_ADMIN` - Super administrator

---

## 🎯 Integration Requirements

### **What Needs Integration:**

1. **Partner → Tenant Mapping**
   - Partner model should link to Tenant
   - Each Partner can have multiple Tenants
   - Tenant inherits business_type from Partner

2. **Business Type Integration**
   - Partner.businessType (string) → Link to BusinessType model
   - Partner can select business type during registration
   - Affects available modules for Partner's tenants

3. **Module Management**
   - Admin can enable/disable modules per Partner
   - Admin can view module usage statistics
   - Admin can manage module pricing

4. **Tenant Management**
   - Admin can view all tenants
   - Admin can manage tenant modules
   - Admin can switch tenant business types
   - Admin can view tenant analytics

5. **User Management**
   - Admin can view all users across tenants
   - Admin can manage user roles
   - Admin can assign users to tenants

6. **Subscription Integration**
   - Link subscriptions to enabled modules
   - Module-based pricing
   - Track module usage per subscription

---

## 🏗️ Integration Architecture

### **Database Schema Updates**

```sql
-- 1. Update Partner model to link with BusinessType
ALTER TABLE partners 
ADD COLUMN business_type_id UUID REFERENCES business_types(id);

-- 2. Create Partner-Tenant relationship
ALTER TABLE tenants
ADD COLUMN partner_id UUID REFERENCES partners(id);

-- 3. Update PartnerSubscription to track modules
CREATE TABLE partner_subscription_modules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  subscription_id UUID REFERENCES partner_subscriptions(id),
  module_id UUID REFERENCES modules(id),
  is_enabled BOOLEAN DEFAULT true,
  enabled_at TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW()
);
```

### **Model Relationships**

```
Partner (1) ──→ (N) Tenant
Partner (1) ──→ (1) BusinessType
Partner (1) ──→ (N) PartnerSubscription
PartnerSubscription (N) ←→ (N) Module (via partner_subscription_modules)
Tenant (N) ←→ (N) Module (via tenant_modules)
```

---

## 📋 New Admin Panel Features

### **1. Tenant Management**

**Page:** `/admin/tenants/index.tsx`

**Features:**
- List all tenants with filters
- View tenant details
- Manage tenant modules
- Change tenant business type
- View tenant analytics
- Suspend/activate tenants

**API Endpoints:**
```
GET    /api/admin/tenants          - List all tenants
GET    /api/admin/tenants/:id      - Get tenant details
PUT    /api/admin/tenants/:id      - Update tenant
DELETE /api/admin/tenants/:id      - Delete tenant
POST   /api/admin/tenants/:id/modules - Enable/disable modules
GET    /api/admin/tenants/:id/analytics - Tenant analytics
```

### **2. Module Management**

**Page:** `/admin/modules/index.tsx`

**Features:**
- List all modules
- Create/edit modules
- Assign modules to business types
- Set module pricing
- View module usage statistics
- Enable/disable modules globally

**API Endpoints:**
```
GET    /api/admin/modules          - List all modules
POST   /api/admin/modules          - Create module
PUT    /api/admin/modules/:id      - Update module
DELETE /api/admin/modules/:id      - Delete module
GET    /api/admin/modules/:id/stats - Module statistics
POST   /api/admin/modules/:id/business-types - Assign to business types
```

### **3. Business Type Management**

**Page:** `/admin/business-types/index.tsx`

**Features:**
- List all business types
- Create/edit business types
- Manage default modules per business type
- View business type statistics
- Set business type pricing

**API Endpoints:**
```
GET    /api/admin/business-types          - List all
POST   /api/admin/business-types          - Create
PUT    /api/admin/business-types/:id      - Update
DELETE /api/admin/business-types/:id      - Delete
GET    /api/admin/business-types/:id/stats - Statistics
```

### **4. User Management (Enhanced)**

**Page:** `/admin/users/index.tsx`

**Features:**
- List all users across all tenants
- Filter by tenant, role, business type
- Manage user roles
- Assign users to tenants
- View user activity
- Suspend/activate users

**API Endpoints:**
```
GET    /api/admin/users            - List all users
GET    /api/admin/users/:id        - Get user details
PUT    /api/admin/users/:id        - Update user
PUT    /api/admin/users/:id/role   - Change role
PUT    /api/admin/users/:id/tenant - Assign tenant
DELETE /api/admin/users/:id        - Delete user
```

### **5. Analytics Dashboard (Enhanced)**

**Page:** `/admin/analytics/index.tsx`

**Features:**
- System-wide analytics
- Module usage statistics
- Business type distribution
- Revenue by module
- Tenant growth
- User activity

**API Endpoints:**
```
GET /api/admin/analytics/overview       - System overview
GET /api/admin/analytics/modules        - Module usage
GET /api/admin/analytics/business-types - Business type stats
GET /api/admin/analytics/revenue        - Revenue analytics
```

---

## 🔧 Implementation Plan

### **Phase 1: Database Integration (2-3 hours)**

**Tasks:**
1. Create migration to link Partner with BusinessType
2. Create migration to link Tenant with Partner
3. Create partner_subscription_modules table
4. Update Partner model associations
5. Update Tenant model associations
6. Run migrations and test

### **Phase 2: Backend APIs (4-5 hours)**

**Tasks:**
1. Create tenant management APIs
2. Create module management APIs
3. Create business type management APIs
4. Update user management APIs
5. Create analytics APIs
6. Add role-based access control
7. Test all endpoints

### **Phase 3: Frontend Pages (6-8 hours)**

**Tasks:**
1. Create tenant management page
2. Create module management page
3. Create business type management page
4. Update user management page
5. Create enhanced analytics dashboard
6. Update admin navigation
7. Add filters and search
8. Test all pages

### **Phase 4: Integration & Testing (2-3 hours)**

**Tasks:**
1. Integrate with existing admin panel
2. Update admin dashboard stats
3. Test role-based access
4. Test data flow
5. Fix bugs
6. Documentation

**Total Estimated Time:** 14-19 hours

---

## 🎨 UI/UX Design

### **Admin Navigation Structure**

```
Admin Panel
├── Dashboard (Overview)
├── Partners
│   ├── All Partners
│   ├── Pending Activations
│   └── Subscriptions
├── Tenants (NEW)
│   ├── All Tenants
│   ├── By Business Type
│   └── Module Usage
├── Users (ENHANCED)
│   ├── All Users
│   ├── By Role
│   └── By Tenant
├── Modules (NEW)
│   ├── All Modules
│   ├── Module Statistics
│   └── Pricing
├── Business Types (NEW)
│   ├── All Types
│   ├── Module Mapping
│   └── Statistics
├── Analytics (ENHANCED)
│   ├── System Overview
│   ├── Module Analytics
│   ├── Revenue Analytics
│   └── User Analytics
└── Settings
    ├── System Settings
    └── Admin Users
```

---

## 🔐 Role-Based Access Control

### **Admin Roles:**

**SUPER_ADMIN:**
- Full access to everything
- Can manage admins
- Can manage business types
- Can manage modules
- Can view all analytics

**ADMIN:**
- Can manage partners
- Can manage tenants
- Can manage users
- Can view analytics
- Cannot manage business types
- Cannot manage modules

**SUPPORT:**
- Can view partners
- Can view tenants
- Can view users
- Cannot edit anything
- Limited analytics access

### **Implementation:**

```typescript
// middleware/adminAccess.ts
export async function checkAdminAccess(
  req: NextApiRequest,
  res: NextApiResponse,
  requiredRole: 'SUPER_ADMIN' | 'ADMIN' | 'SUPPORT'
): Promise<boolean> {
  const session = await getServerSession(req, res, authOptions);
  
  if (!session || !session.user) {
    return false;
  }

  const roleHierarchy = {
    'SUPER_ADMIN': 3,
    'ADMIN': 2,
    'SUPPORT': 1
  };

  const userRoleLevel = roleHierarchy[session.user.role] || 0;
  const requiredRoleLevel = roleHierarchy[requiredRole] || 0;

  return userRoleLevel >= requiredRoleLevel;
}
```

---

## 📊 Key Features Implementation

### **1. Tenant-Partner Linking**

```typescript
// When Partner is approved
async function approvePartner(partnerId: string) {
  const partner = await Partner.findByPk(partnerId);
  
  // Create default tenant for partner
  const tenant = await Tenant.create({
    partnerId: partner.id,
    businessTypeId: partner.businessTypeId,
    businessName: partner.businessName,
    setupCompleted: false
  });

  // Enable default modules for tenant
  const defaultModules = await getDefaultModulesForBusinessType(
    partner.businessTypeId
  );

  for (const module of defaultModules) {
    await TenantModule.create({
      tenantId: tenant.id,
      moduleId: module.id,
      isEnabled: true
    });
  }

  return tenant;
}
```

### **2. Module Usage Tracking**

```typescript
// Track module usage
async function trackModuleUsage(tenantId: string, moduleCode: string) {
  await ModuleUsageLog.create({
    tenantId,
    moduleCode,
    accessedAt: new Date()
  });
}

// Get module statistics
async function getModuleStats(moduleId: string) {
  const stats = await ModuleUsageLog.findAll({
    where: { moduleId },
    attributes: [
      [sequelize.fn('COUNT', sequelize.col('id')), 'totalAccess'],
      [sequelize.fn('COUNT', sequelize.fn('DISTINCT', sequelize.col('tenant_id'))), 'uniqueTenants']
    ]
  });

  return stats;
}
```

### **3. Dynamic Pricing**

```typescript
// Calculate subscription price based on modules
async function calculateSubscriptionPrice(
  businessTypeId: string,
  selectedModules: string[]
) {
  const businessType = await BusinessType.findByPk(businessTypeId);
  const basePrice = businessType.basePrice || 0;

  let modulePrice = 0;
  for (const moduleCode of selectedModules) {
    const module = await Module.findOne({ where: { code: moduleCode } });
    if (module && module.price) {
      modulePrice += module.price;
    }
  }

  return basePrice + modulePrice;
}
```

---

## 🧪 Testing Scenarios

### **Test 1: Partner to Tenant Flow**
1. Create partner with business type "retail"
2. Approve partner
3. Verify tenant created automatically
4. Verify default retail modules enabled
5. Verify partner can login and see only retail features

### **Test 2: Module Management**
1. Admin creates new module
2. Admin assigns module to business type
3. Admin enables module for specific tenant
4. Verify tenant can access new module
5. Verify module appears in sidebar

### **Test 3: Business Type Change**
1. Admin changes tenant from retail to F&B
2. Verify modules updated (tables, reservations enabled)
3. Verify old modules disabled (suppliers)
4. Verify tenant sees updated sidebar

---

## 📝 Migration Scripts

### **Migration 1: Partner-BusinessType Link**

```javascript
// migrations/20260213-link-partner-business-type.js
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('partners', 'business_type_id', {
      type: Sequelize.UUID,
      references: {
        model: 'business_types',
        key: 'id'
      },
      onDelete: 'SET NULL'
    });

    // Migrate existing businessType string to business_type_id
    // This requires manual mapping or default to retail
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('partners', 'business_type_id');
  }
};
```

### **Migration 2: Tenant-Partner Link**

```javascript
// migrations/20260213-link-tenant-partner.js
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('tenants', 'partner_id', {
      type: Sequelize.UUID,
      references: {
        model: 'partners',
        key: 'id'
      },
      onDelete: 'SET NULL'
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('tenants', 'partner_id');
  }
};
```

---

## 🎯 Success Criteria

**Integration Complete When:**
- ✅ Partner linked to BusinessType
- ✅ Tenant linked to Partner
- ✅ Admin can manage tenants
- ✅ Admin can manage modules
- ✅ Admin can manage business types
- ✅ Admin can view analytics
- ✅ Role-based access working
- ✅ All APIs tested
- ✅ All pages functional
- ✅ Documentation complete

---

**Status:** Design Complete - Ready for Implementation
**Estimated Time:** 14-19 hours
**Priority:** HIGH (Critical for system management)
