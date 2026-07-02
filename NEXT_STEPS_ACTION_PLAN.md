# NEXT STEPS - Action Plan untuk Implementasi

## 🎯 Current Status

**Dokumentasi Selesai:**
- ✅ Business Plan (BUSINESS_PLAN_MODULAR_SYSTEM.md)
- ✅ Implementation Roadmap (IMPLEMENTATION_ROADMAP_ALIGNED.md)
- ✅ Technical Architecture (MODULAR_SYSTEM_BY_INDUSTRY.md)
- ✅ POS Integration (POS_RESERVATION_TABLE_INTEGRATION.md)

**Codebase Saat Ini:**
- ✅ Basic POS system sudah ada
- ✅ Table Management sudah ada
- ✅ Reservation System sudah ada
- ✅ HPP Analysis sudah ada
- ✅ Inventory Management sudah ada
- ❌ Sistem modular belum diimplementasikan
- ❌ Business type selection belum ada
- ❌ Module access control belum ada

---

## 🚀 IMMEDIATE NEXT STEPS (Week 1-2)

### **Step 1: Database Migration untuk Sistem Modular**

**Priority:** P0 (Critical)
**Time:** 1-2 days

**Tasks:**
1. ✅ Create migration file untuk business types, modules, dll
2. ✅ Run migration di development database
3. ✅ Seed business types (retail, fnb, hybrid)
4. ✅ Seed modules (dashboard, pos, inventory, tables, etc.)
5. ✅ Seed business_type_modules mapping
6. ✅ Test database relationships

**Files to Create:**
```
migrations/
  └── 20260213-create-modular-system.js
seeders/
  └── 20260213-seed-business-types-modules.js
```

**Command:**
```bash
# Create migration
npx sequelize-cli migration:create --name create-modular-system

# Run migration
npx sequelize-cli db:migrate

# Create seeder
npx sequelize-cli seed:create --name seed-business-types-modules

# Run seeder
npx sequelize-cli db:seed:all
```

---

### **Step 2: Create Sequelize Models**

**Priority:** P0 (Critical)
**Time:** 1 day

**Tasks:**
1. ✅ Create BusinessType model
2. ✅ Create Module model
3. ✅ Create BusinessTypeModule model
4. ✅ Create TenantModule model
5. ✅ Update Tenant model (add business_type_id)
6. ✅ Update User model (add tenant_id, role)
7. ✅ Define associations

**Files to Create:**
```
models/
  ├── BusinessType.js
  ├── Module.js
  ├── BusinessTypeModule.js
  └── TenantModule.js

models/index.js (update associations)
```

---

### **Step 3: Business Config API**

**Priority:** P0 (Critical)
**Time:** 1 day

**Tasks:**
1. ✅ Create `/api/business/config` endpoint
2. ✅ Fetch user's tenant and business type
3. ✅ Fetch enabled modules for tenant
4. ✅ Return business config to frontend
5. ✅ Test API endpoint

**Files to Create:**
```
pages/api/business/
  ├── config.ts
  └── types.ts
```

**API Response:**
```json
{
  "success": true,
  "businessType": "retail",
  "businessTypeName": "Retail/Toko",
  "modules": [
    {
      "id": "uuid",
      "code": "dashboard",
      "name": "Dashboard",
      "icon": "layout-dashboard",
      "route": "/dashboard",
      "isEnabled": true
    },
    // ... other modules
  ],
  "tenant": {
    "id": "uuid",
    "name": "Toko ABC",
    "setupCompleted": true
  }
}
```

---

### **Step 4: Business Type Context (Frontend)**

**Priority:** P0 (Critical)
**Time:** 1 day

**Tasks:**
1. ✅ Create BusinessTypeContext
2. ✅ Create useBusinessType hook
3. ✅ Implement hasModule() function
4. ✅ Wrap app with BusinessTypeProvider
5. ✅ Test context in components

**Files to Create:**
```
contexts/
  └── BusinessTypeContext.tsx

pages/_app.tsx (update to wrap with provider)
```

**Usage Example:**
```tsx
import { useBusinessType } from '@/contexts/BusinessTypeContext';

function MyComponent() {
  const { businessType, hasModule } = useBusinessType();
  
  return (
    <div>
      {hasModule('tables') && <TableManagement />}
      {hasModule('reservations') && <Reservations />}
    </div>
  );
}
```

---

### **Step 5: Update DashboardLayout (Conditional Sidebar)**

**Priority:** P0 (Critical)
**Time:** 1 day

**Tasks:**
1. ✅ Import useBusinessType hook
2. ✅ Filter menuItems based on enabled modules
3. ✅ Update sidebar rendering
4. ✅ Test with different business types
5. ✅ Ensure smooth UX

**Files to Update:**
```
components/layouts/DashboardLayout.tsx
```

**Implementation:**
```tsx
const { modules, hasModule } = useBusinessType();

const allMenuItems = [
  { code: 'dashboard', icon: LayoutDashboard, label: 'Dashboard', href: '/dashboard' },
  { code: 'pos', icon: ShoppingCart, label: 'Kasir', href: '/pos' },
  { code: 'tables', icon: Utensils, label: 'Manajemen Meja', href: '/tables' },
  // ... all menu items
];

// Filter based on enabled modules
const menuItems = allMenuItems.filter(item => hasModule(item.code));
```

---

### **Step 6: Update Dashboard (Conditional Widgets)**

**Priority:** P1 (High)
**Time:** 1 day

**Tasks:**
1. ✅ Import useBusinessType hook
2. ✅ Conditionally render quick actions
3. ✅ Conditionally render stats cards
4. ✅ Show only relevant widgets per business type
5. ✅ Test with retail and F&B

**Files to Update:**
```
pages/dashboard.tsx
```

**Implementation:**
```tsx
const { hasModule } = useBusinessType();

// Quick Actions
{hasModule('pos') && <QuickAction title="Kasir" href="/pos/cashier" />}
{hasModule('tables') && <QuickAction title="Meja" href="/tables" />}
{hasModule('reservations') && <QuickAction title="Reservasi" href="/reservations" />}

// Stats Cards
{hasModule('inventory') && <StatsCard title="Stok Menipis" />}
{hasModule('tables') && <StatsCard title="Meja Tersedia" />}
```

---

### **Step 7: Module Guard Component**

**Priority:** P1 (High)
**Time:** 1 day

**Tasks:**
1. ✅ Create ModuleGuard component
2. ✅ Check module access
3. ✅ Redirect if no access
4. ✅ Show loading state
5. ✅ Test protection

**Files to Create:**
```
components/guards/ModuleGuard.tsx
```

**Usage:**
```tsx
// pages/tables/index.tsx
export default function TablesPage() {
  return (
    <ModuleGuard moduleCode="tables">
      <DashboardLayout>
        <TableManagement />
      </DashboardLayout>
    </ModuleGuard>
  );
}
```

---

### **Step 8: Onboarding Flow - Business Type Selection**

**Priority:** P1 (High)
**Time:** 2-3 days

**Tasks:**
1. ✅ Create onboarding pages
2. ✅ Business type selection UI
3. ✅ Business details form
4. ✅ Module selection (optional)
5. ✅ Save to database
6. ✅ Auto-enable default modules
7. ✅ Redirect to dashboard

**Files to Create:**
```
pages/onboarding/
  ├── business-type.tsx
  ├── business-details.tsx
  └── modules.tsx

pages/api/onboarding/
  ├── business-type.ts
  └── complete.ts
```

**Flow:**
```
Register → Business Type Selection → Business Details → 
Module Selection (optional) → Complete → Dashboard
```

---

### **Step 9: API Middleware untuk Module Access Control**

**Priority:** P1 (High)
**Time:** 1 day

**Tasks:**
1. ✅ Create checkModuleAccess middleware
2. ✅ Apply to protected API routes
3. ✅ Return 403 if no access
4. ✅ Test with different business types

**Files to Create:**
```
middleware/moduleAccess.ts
```

**Usage:**
```typescript
// pages/api/tables/index.ts
import { checkModuleAccess } from '@/middleware/moduleAccess';

export default async function handler(req, res) {
  const accessCheck = await checkModuleAccess(req, res, 'tables');
  
  if (!accessCheck.hasAccess) {
    return res.status(403).json({ 
      success: false, 
      error: 'Module not enabled' 
    });
  }
  
  // Continue with normal logic
}
```

---

### **Step 10: Testing & Validation**

**Priority:** P0 (Critical)
**Time:** 2-3 days

**Test Scenarios:**

**1. Retail User Journey:**
```
✅ Register → Select Retail → Complete onboarding
✅ Login → See only retail modules in sidebar
✅ Dashboard shows retail widgets only
✅ Can access /pos, /inventory, /products
✅ Cannot access /tables, /reservations
✅ Direct URL to /tables → Redirected to dashboard
✅ API call to /api/tables → 403 Forbidden
```

**2. F&B User Journey:**
```
✅ Register → Select F&B → Complete onboarding
✅ Login → See F&B modules in sidebar
✅ Dashboard shows F&B widgets (tables, reservations)
✅ Can access /tables, /reservations, /products/hpp-analysis
✅ Cannot access /suppliers
✅ POS shows table selection option
✅ Reservation integration works
```

**3. Module Toggle:**
```
✅ Admin can enable/disable optional modules
✅ Sidebar updates immediately
✅ Access control enforced
✅ API endpoints protected
```

---

## 📋 Implementation Checklist

### Week 1: Database & Backend Foundation

**Day 1-2: Database Setup**
- [ ] Create migration file
- [ ] Define tables (business_types, modules, etc.)
- [ ] Run migration
- [ ] Create seeder
- [ ] Seed business types
- [ ] Seed modules
- [ ] Seed business_type_modules
- [ ] Test database

**Day 3: Sequelize Models**
- [ ] Create BusinessType model
- [ ] Create Module model
- [ ] Create BusinessTypeModule model
- [ ] Create TenantModule model
- [ ] Update Tenant model
- [ ] Update User model
- [ ] Define associations
- [ ] Test models

**Day 4: Business Config API**
- [ ] Create /api/business/config
- [ ] Implement logic
- [ ] Test API
- [ ] Create /api/business/types
- [ ] Test API

**Day 5: Module Access Middleware**
- [ ] Create checkModuleAccess
- [ ] Test middleware
- [ ] Apply to existing APIs
- [ ] Test access control

---

### Week 2: Frontend Implementation

**Day 6: Business Type Context**
- [ ] Create BusinessTypeContext
- [ ] Create useBusinessType hook
- [ ] Wrap app with provider
- [ ] Test context

**Day 7: Update DashboardLayout**
- [ ] Import useBusinessType
- [ ] Filter menu items
- [ ] Update sidebar rendering
- [ ] Test with different business types

**Day 8: Update Dashboard**
- [ ] Conditional quick actions
- [ ] Conditional stats cards
- [ ] Test retail view
- [ ] Test F&B view

**Day 9: Module Guard**
- [ ] Create ModuleGuard component
- [ ] Apply to protected pages
- [ ] Test redirects
- [ ] Test access control

**Day 10: Onboarding Flow**
- [ ] Create business type selection page
- [ ] Create business details page
- [ ] Create module selection page
- [ ] Create onboarding APIs
- [ ] Test complete flow

---

### Week 3: Testing & Polish

**Day 11-12: Integration Testing**
- [ ] Test retail user journey
- [ ] Test F&B user journey
- [ ] Test hybrid user journey
- [ ] Test module toggle
- [ ] Test API access control

**Day 13-14: Bug Fixes & Polish**
- [ ] Fix identified bugs
- [ ] Improve UX
- [ ] Add loading states
- [ ] Add error handling
- [ ] Update documentation

**Day 15: Final Review**
- [ ] Code review
- [ ] Performance testing
- [ ] Security audit
- [ ] Documentation review
- [ ] Prepare for deployment

---

## 🎯 Success Criteria

### Technical Success:
- ✅ All migrations run successfully
- ✅ All models working correctly
- ✅ Business config API returns correct data
- ✅ Context provides module info
- ✅ Sidebar filters correctly
- ✅ Dashboard shows relevant widgets
- ✅ Module guard protects pages
- ✅ API middleware enforces access
- ✅ Onboarding flow works end-to-end

### User Experience Success:
- ✅ Retail users see only retail features
- ✅ F&B users see F&B features
- ✅ No confusion from irrelevant modules
- ✅ Smooth onboarding (<5 minutes)
- ✅ Fast page loads (<2s)
- ✅ Clear error messages

### Business Success:
- ✅ Ready for beta testing
- ✅ Can onboard first 10 users
- ✅ Different pricing tiers work
- ✅ Module access control enforced
- ✅ Foundation for scaling

---

## 🚨 Potential Blockers & Solutions

### Blocker 1: Database Migration Fails
**Solution:** Test migration on clean database first, fix schema issues

### Blocker 2: Context Not Updating
**Solution:** Check provider placement in _app.tsx, verify API response

### Blocker 3: Module Access Not Working
**Solution:** Debug middleware, check session handling, verify module codes

### Blocker 4: Onboarding Flow Broken
**Solution:** Test each step individually, check API responses, verify state management

### Blocker 5: Performance Issues
**Solution:** Implement caching, optimize queries, use React.memo

---

## 📊 Progress Tracking

**Daily Standup Questions:**
1. What did I complete yesterday?
2. What will I work on today?
3. Any blockers?

**Weekly Review:**
1. Tasks completed vs planned
2. Blockers encountered
3. Adjustments needed
4. Next week priorities

**Metrics to Track:**
- Tasks completed / total tasks
- Bugs found / bugs fixed
- Test coverage %
- Performance benchmarks

---

## 🎓 Resources Needed

### Development:
- PostgreSQL database (local or AWS RDS)
- Node.js 20+
- npm/yarn
- Git

### Testing:
- Postman (API testing)
- Chrome DevTools
- React DevTools

### Documentation:
- Markdown editor
- Diagram tool (optional)

---

## 🚀 After Week 3: Next Priorities

### Week 4-5: Enhanced Features
- [ ] Add more business types (if needed)
- [ ] Implement module toggle in settings
- [ ] Add usage analytics
- [ ] Improve onboarding UX

### Week 6-8: F&B Module Development
- [ ] Table management enhancements
- [ ] Reservation system improvements
- [ ] POS-table integration
- [ ] HPP analysis features

### Week 9-12: Premium Features & Scale
- [ ] Loyalty program
- [ ] Promo & voucher
- [ ] Advanced reports
- [ ] Multi-location support

---

## 📝 Notes

**Important Considerations:**
1. **Backward Compatibility:** Existing users need migration path
2. **Data Migration:** Existing tenants need business_type assigned
3. **Testing:** Test with real-world scenarios
4. **Documentation:** Keep docs updated
5. **Communication:** Inform team of changes

**Quick Wins:**
1. Start with database migration (foundation)
2. Get business config API working (critical)
3. Update sidebar (visible impact)
4. Add module guards (security)

**Long-term Thinking:**
1. Design for extensibility (new business types)
2. Keep module system flexible
3. Plan for feature flags
4. Consider white-label options

---

**Document Version:** 1.0
**Created:** February 13, 2026
**Status:** Ready to Execute
**Next Review:** End of Week 1
