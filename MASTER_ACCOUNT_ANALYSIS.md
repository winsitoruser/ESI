# Master Account (Super Admin) - Analysis & Implementation

## 📊 Current System Analysis

### **Existing Role System**
```typescript
// models/User.js
role: {
  type: DataTypes.ENUM('owner', 'admin', 'manager', 'cashier', 'staff'),
  defaultValue: 'owner'
}
```

**Current Roles:**
- `owner` - Business owner
- `admin` - Administrator
- `manager` - Manager
- `cashier` - Cashier
- `staff` - Staff

**Limitation:** All roles terikat ke tenant dan business type

---

## 🎯 Master Account Requirements

### **Super Admin Characteristics:**
1. **Bypass Module Restrictions** - Access all modules regardless of business type
2. **Multi-Tenant Access** - Can switch between tenants
3. **System-Wide Access** - Not limited to single tenant
4. **All Features** - Access tables, reservations, suppliers, HPP, etc.
5. **Admin Panel** - Manage tenants, users, modules

### **Use Cases:**
- System administrator
- Support team
- Development/Testing
- Multi-tenant management
- System monitoring

---

## 🏗️ Architecture Design

### **Option 1: Super Admin Role (Recommended)**
```typescript
role: {
  type: DataTypes.ENUM('super_admin', 'owner', 'admin', 'manager', 'cashier', 'staff'),
  defaultValue: 'staff'
}

// Super admin characteristics:
- isSuperAdmin: true (derived from role)
- tenantId: null (not tied to specific tenant)
- Can access any tenant
- Bypass all module checks
```

**Pros:**
- Simple implementation
- Clear separation
- Easy to check

**Cons:**
- Need to update all role checks

### **Option 2: Separate Flag**
```typescript
isSuperAdmin: {
  type: DataTypes.BOOLEAN,
  defaultValue: false
}
```

**Pros:**
- Doesn't change existing roles
- Flexible (can be owner + super admin)

**Cons:**
- Two fields to check

### **Recommended: Hybrid Approach**
```typescript
role: ENUM with 'super_admin'
isSuperAdmin: computed property (role === 'super_admin')
tenantId: nullable for super admin
```

---

## 🔧 Implementation Plan

### **1. Update User Model**
```javascript
// models/User.js
module.exports = (sequelize, DataTypes) => {
  const User = sequelize.define('User', {
    // ... existing fields
    role: {
      type: DataTypes.ENUM('super_admin', 'owner', 'admin', 'manager', 'cashier', 'staff'),
      defaultValue: 'staff'
    },
    tenantId: {
      type: DataTypes.UUID,
      allowNull: true, // Allow null for super admin
      field: 'tenant_id'
    }
  });

  // Add virtual field
  User.prototype.isSuperAdmin = function() {
    return this.role === 'super_admin';
  };

  return User;
};
```

### **2. Update Middleware**
```typescript
// middleware/moduleAccess.ts
export async function checkModuleAccess(
  req: NextApiRequest,
  res: NextApiResponse,
  moduleCode: string
): Promise<ModuleAccessResult> {
  try {
    const session = await getServerSession(req, res, authOptions);
    
    if (!session || !session.user) {
      return { hasAccess: false, error: 'Unauthorized' };
    }

    const { User } = db;
    
    const user = await User.findOne({
      where: { email: session.user.email }
    });

    // SUPER ADMIN BYPASS
    if (user && user.role === 'super_admin') {
      return { hasAccess: true };
    }

    // Normal module check for regular users
    // ... existing logic
  }
}
```

### **3. Update Business Type Context**
```typescript
// contexts/BusinessTypeContext.tsx
const fetchBusinessConfig = async () => {
  try {
    const response = await fetch('/api/business/config');
    const data = await response.json();
    
    if (data.success) {
      // Check if super admin
      if (data.isSuperAdmin) {
        // Load ALL modules
        setModules(data.allModules);
        setBusinessType('super_admin');
        setBusinessTypeName('Super Administrator');
      } else {
        // Normal user flow
        setModules(data.modules);
        setBusinessType(data.businessType);
      }
    }
  }
};

const hasModule = (moduleCode: string): boolean => {
  // Super admin has access to everything
  if (businessType === 'super_admin') {
    return true;
  }
  
  return modules.some(m => m.code === moduleCode && m.isEnabled);
};
```

### **4. Update Business Config API**
```typescript
// pages/api/business/config.ts
export default async function handler(req, res) {
  const user = await User.findOne({
    where: { email: session.user.email }
  });

  // Super Admin Response
  if (user.role === 'super_admin') {
    const allModules = await Module.findAll({
      where: { isActive: true },
      order: [['sortOrder', 'ASC']]
    });

    return res.status(200).json({
      success: true,
      isSuperAdmin: true,
      businessType: 'super_admin',
      businessTypeName: 'Super Administrator',
      modules: allModules.map(m => ({
        id: m.id,
        code: m.code,
        name: m.name,
        icon: m.icon,
        route: m.route,
        isEnabled: true
      })),
      allModules: allModules, // All available modules
      tenant: null
    });
  }

  // Normal user logic
  // ...
}
```

### **5. Update Module Guard**
```typescript
// components/guards/ModuleGuard.tsx
export function ModuleGuard({ moduleCode, children }) {
  const { hasModule, businessType, isLoading } = useBusinessType();

  // Super admin bypass
  if (businessType === 'super_admin') {
    return <>{children}</>;
  }

  // Normal guard logic
  if (!hasModule(moduleCode)) {
    return <AccessDenied />;
  }

  return <>{children}</>;
}
```

---

## 📝 Database Migration

### **Migration: Add Super Admin Role**
```javascript
// migrations/20260213-add-super-admin-role.js
module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Change ENUM to include super_admin
    await queryInterface.sequelize.query(`
      ALTER TYPE "enum_users_role" ADD VALUE 'super_admin';
    `);
  },

  down: async (queryInterface, Sequelize) => {
    // Cannot remove ENUM value in PostgreSQL
    // Would need to recreate the type
  }
};
```

### **Seeder: Create Master Account**
```javascript
// seeders/20260213-create-master-account.js
const bcrypt = require('bcrypt');

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const hashedPassword = await bcrypt.hash('MasterPassword123!', 10);

    await queryInterface.bulkInsert('users', [{
      id: 1, // Or use uuid_generate_v4()
      name: 'Super Administrator',
      email: 'superadmin@bedagang.com',
      password: hashedPassword,
      role: 'super_admin',
      tenant_id: null,
      is_active: true,
      created_at: new Date(),
      updated_at: new Date()
    }]);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.bulkDelete('users', {
      email: 'superadmin@bedagang.com'
    });
  }
};
```

---

## 🔐 Security Considerations

### **Access Control:**
1. **Super Admin Detection:**
   ```typescript
   const isSuperAdmin = user.role === 'super_admin';
   ```

2. **Bypass All Checks:**
   - Module access checks
   - Tenant restrictions
   - Business type limitations

3. **Audit Logging:**
   ```typescript
   if (user.role === 'super_admin') {
     await AuditLog.create({
       userId: user.id,
       action: 'ACCESS',
       resource: moduleCode,
       timestamp: new Date()
     });
   }
   ```

### **Best Practices:**
- ✅ Use strong password for master account
- ✅ Enable 2FA for super admin
- ✅ Log all super admin actions
- ✅ Limit number of super admin accounts
- ✅ Regular password rotation
- ✅ IP whitelist (optional)

---

## 🎨 UI Enhancements

### **Super Admin Dashboard:**
```typescript
// pages/admin/dashboard.tsx
export default function SuperAdminDashboard() {
  const { isSuperAdmin } = useBusinessType();

  if (!isSuperAdmin) {
    return <AccessDenied />;
  }

  return (
    <DashboardLayout>
      <div>
        <h1>Super Admin Dashboard</h1>
        
        {/* System Overview */}
        <div className="grid grid-cols-4 gap-4">
          <StatCard title="Total Tenants" value={tenants.length} />
          <StatCard title="Total Users" value={users.length} />
          <StatCard title="Active Modules" value={modules.length} />
          <StatCard title="System Health" value="Good" />
        </div>

        {/* Tenant Management */}
        <TenantList />

        {/* User Management */}
        <UserList />

        {/* Module Management */}
        <ModuleList />
      </div>
    </DashboardLayout>
  );
}
```

### **Tenant Switcher:**
```typescript
// components/TenantSwitcher.tsx
export function TenantSwitcher() {
  const { isSuperAdmin } = useBusinessType();
  const [selectedTenant, setSelectedTenant] = useState(null);

  if (!isSuperAdmin) return null;

  return (
    <select onChange={(e) => switchTenant(e.target.value)}>
      <option value="">Select Tenant</option>
      {tenants.map(t => (
        <option key={t.id} value={t.id}>{t.name}</option>
      ))}
    </select>
  );
}
```

---

## 📊 Module Access Matrix

### **Regular User (Retail):**
| Module | Access |
|--------|--------|
| Dashboard | ✅ |
| POS | ✅ |
| Tables | ❌ |
| Reservations | ❌ |
| Suppliers | ✅ |

### **Regular User (F&B):**
| Module | Access |
|--------|--------|
| Dashboard | ✅ |
| POS | ✅ |
| Tables | ✅ |
| Reservations | ✅ |
| Suppliers | ❌ |

### **Super Admin:**
| Module | Access |
|--------|--------|
| Dashboard | ✅ |
| POS | ✅ |
| Tables | ✅ |
| Reservations | ✅ |
| Suppliers | ✅ |
| HPP | ✅ |
| Promo | ✅ |
| Loyalty | ✅ |
| **Admin Panel** | ✅ |
| **Tenant Mgmt** | ✅ |
| **User Mgmt** | ✅ |

---

## 🧪 Testing Scenarios

### **Test 1: Super Admin Login**
```bash
# Login as super admin
Email: superadmin@bedagang.com
Password: MasterPassword123!

# Expected:
- Sidebar shows ALL modules
- Can access /tables, /reservations, /suppliers
- Can access /admin panel
- No module restrictions
```

### **Test 2: API Access**
```bash
# Super admin calls any API
curl -H "Cookie: session=..." http://localhost:3001/api/tables

# Expected: 200 OK (bypass module check)
```

### **Test 3: Tenant Switching**
```bash
# Super admin switches to Tenant A (retail)
# Expected: Still see all modules (not restricted)

# Super admin switches to Tenant B (F&B)
# Expected: Still see all modules
```

---

## 📝 Implementation Checklist

### **Phase 1: Database (1 hour)**
- [ ] Create migration to add 'super_admin' to role ENUM
- [ ] Run migration
- [ ] Create seeder for master account
- [ ] Run seeder
- [ ] Verify super admin user created

### **Phase 2: Backend (2 hours)**
- [ ] Update User model (add isSuperAdmin method)
- [ ] Update moduleAccess middleware (add bypass)
- [ ] Update business/config API (handle super admin)
- [ ] Test API with super admin
- [ ] Test API with regular user

### **Phase 3: Frontend (2 hours)**
- [ ] Update BusinessTypeContext (handle super admin)
- [ ] Update hasModule function (bypass for super admin)
- [ ] Update ModuleGuard (bypass for super admin)
- [ ] Update DashboardLayout (show all menus)
- [ ] Test UI with super admin

### **Phase 4: Admin Panel (4 hours - Optional)**
- [ ] Create /admin/dashboard page
- [ ] Create tenant management UI
- [ ] Create user management UI
- [ ] Create module management UI
- [ ] Add tenant switcher

### **Phase 5: Testing (1 hour)**
- [ ] Test super admin login
- [ ] Test module access (all should work)
- [ ] Test API access (all should work)
- [ ] Test regular user (should be restricted)
- [ ] Security audit

---

## 🎯 Expected Results

### **After Implementation:**

**Super Admin Can:**
- ✅ Access ALL modules (tables, reservations, suppliers, etc.)
- ✅ Bypass all business type restrictions
- ✅ Access admin panel
- ✅ Manage tenants and users
- ✅ Switch between tenants
- ✅ View system-wide analytics

**Regular Users:**
- ✅ Still restricted by business type
- ✅ Module access controlled
- ❌ Cannot access admin panel
- ❌ Cannot switch tenants

---

## 🔒 Security Best Practices

1. **Strong Password:** Use complex password for master account
2. **2FA:** Enable two-factor authentication
3. **Audit Logging:** Log all super admin actions
4. **Limited Accounts:** Only create necessary super admin accounts
5. **Regular Review:** Audit super admin access regularly
6. **IP Whitelist:** Restrict super admin login to specific IPs
7. **Session Timeout:** Shorter session for super admin
8. **Password Rotation:** Change password regularly

---

## 📚 Documentation

**Master Account Credentials:**
```
Email: superadmin@bedagang.com
Password: MasterPassword123! (CHANGE THIS!)
Role: super_admin
Access: ALL MODULES
```

**Important Notes:**
- Super admin bypasses ALL module restrictions
- Super admin can access any tenant
- Super admin sees all modules in sidebar
- Use responsibly - full system access

---

**Status:** Design Complete - Ready for Implementation
**Estimated Time:** 5-6 hours (without admin panel)
**Priority:** HIGH (for system management)
