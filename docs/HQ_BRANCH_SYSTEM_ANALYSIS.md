# Analisis Sistem HQ-Branch Integration

## 📊 Database Structure Analysis

### Core Tables

#### 1. **tenants** (Multi-tenant Core)
```sql
- id (UUID, PK)
- business_type_id (UUID, FK -> business_types)
- business_name (VARCHAR 255)
- business_address (TEXT)
- business_phone (VARCHAR 50)
- business_email (VARCHAR 255)
- setup_completed (BOOLEAN)
- onboarding_step (INTEGER)
- name (VARCHAR 255) -- MISSING
- code (VARCHAR 50) -- MISSING
- status (ENUM) -- MISSING
- subscription_plan (VARCHAR 50) -- MISSING
- max_users (INTEGER) -- MISSING
- max_branches (INTEGER) -- MISSING
```

**Issues Found:**
- ❌ Missing critical columns: name, code, status, subscription_plan
- ❌ No tenant_id in branches table
- ❌ No relationship between tenant and branches

#### 2. **branches** (Branch Management)
```sql
- id (UUID, PK)
- store_id (UUID, FK -> stores)
- code (VARCHAR 50, UNIQUE)
- name (VARCHAR 255)
- type (ENUM: main, branch, warehouse, kiosk)
- address (TEXT)
- city (VARCHAR 255)
- province (VARCHAR 255)
- postal_code (VARCHAR 10)
- phone (VARCHAR 20)
- email (VARCHAR 255)
- manager_id (INTEGER, FK -> users)
- operating_hours (JSON)
- is_active (BOOLEAN)
- settings (JSON)
- tenant_id (UUID) -- MISSING
- region (VARCHAR 100) -- MISSING
```

**Issues Found:**
- ❌ Missing tenant_id (critical for multi-tenant)
- ❌ Missing region field
- ❌ No cascade delete rules

#### 3. **stores** (Store/Outlet Management)
```sql
- id (UUID, PK)
- name (VARCHAR 255)
- code (VARCHAR 50, UNIQUE)
- description (TEXT)
- tenant_id (UUID, FK -> tenants)
- owner_id (INTEGER, FK -> users)
- business_type (VARCHAR 50)
- is_active (BOOLEAN)
- settings (JSON)
```

**Status:** ✅ Table exists but not created in migration

#### 4. **users** (User Management)
```sql
- id (INTEGER, PK)
- name (VARCHAR)
- email (VARCHAR, UNIQUE)
- phone (VARCHAR)
- businessName (VARCHAR)
- password (VARCHAR)
- tenant_id (UUID, FK -> tenants)
- assigned_branch_id (UUID, FK -> branches)
- role (ENUM)
- isActive (BOOLEAN)
- lastLogin (DATE)
```

**Status:** ✅ Complete with proper relationships

---

## 🔗 Model Associations Analysis

### Current Associations

#### Tenant Model
```javascript
✅ Tenant.belongsTo(BusinessType, { foreignKey: 'businessTypeId' })
✅ Tenant.hasMany(User, { foreignKey: 'tenantId' })
✅ Tenant.belongsToMany(Module, { through: TenantModule })
❌ MISSING: Tenant.hasMany(Branch, { foreignKey: 'tenantId' })
❌ MISSING: Tenant.hasMany(Store, { foreignKey: 'tenantId' })
```

#### Branch Model
```javascript
✅ Branch.belongsTo(Store, { foreignKey: 'storeId' })
✅ Branch.belongsTo(User, { foreignKey: 'managerId', as: 'manager' })
✅ Branch.hasMany(PosTransaction, { foreignKey: 'branchId' })
✅ Branch.hasMany(Stock, { foreignKey: 'branchId' })
❌ MISSING: Branch.belongsTo(Tenant, { foreignKey: 'tenantId' })
❌ MISSING: Branch.hasMany(Employee, { foreignKey: 'branchId' })
```

#### User Model
```javascript
✅ User.belongsTo(Tenant, { foreignKey: 'tenantId' })
✅ User.belongsTo(Branch, { foreignKey: 'assignedBranchId', as: 'assignedBranch' })
✅ User.hasMany(Branch, { foreignKey: 'managerId', as: 'managedBranches' })
```

---

## 🌐 API Endpoints Analysis

### HQ Endpoints (Existing)

#### ✅ `/api/hq/branches`
- GET: List branches with pagination, search, filters
- POST: Create new branch with initialization
- **Issues:** No tenant filtering, missing tenant_id

#### ✅ `/api/hq/branches/[id]`
- GET: Get branch details
- PUT: Update branch
- DELETE: Delete branch
- **Issues:** No tenant validation

#### ✅ `/api/hq/dashboard`
- GET: HQ dashboard analytics
- **Issues:** Queries reference non-existent columns (region)

#### ✅ `/api/hq/users`
- GET: List users
- POST: Create user
- **Issues:** No tenant context

#### ✅ `/api/hq/sync`
- POST: Sync data from HQ to branches
- **Issues:** Missing tenant_id in queries

#### ❌ MISSING Endpoints:
- `/api/hq/tenants` - Tenant management
- `/api/hq/stores` - Store management
- `/api/hq/reports/consolidated` - Cross-branch reports
- `/api/hq/inventory/transfers` - Inter-branch transfers
- `/api/hq/finance/consolidated` - Consolidated financials

### Branch Endpoints (Needed)

#### ❌ MISSING:
- `/api/branch/sync/pull` - Pull data from HQ
- `/api/branch/sync/push` - Push data to HQ
- `/api/branch/inventory/request` - Request stock from HQ
- `/api/branch/reports/daily` - Daily branch reports

---

## 🔄 Data Flow Analysis

### Current Flow Issues

#### 1. **HQ → Branch Sync**
```
❌ Problem: No tenant_id in sync queries
❌ Problem: No webhook system for real-time sync
❌ Problem: No conflict resolution mechanism
```

#### 2. **Branch → HQ Reporting**
```
❌ Problem: No aggregation service
❌ Problem: No real-time dashboard updates
❌ Problem: No data validation before sync
```

#### 3. **Multi-tenant Isolation**
```
❌ Problem: Queries don't filter by tenant_id
❌ Problem: No tenant context middleware
❌ Problem: Risk of data leakage between tenants
```

---

## 🔧 Required Fixes

### Phase 1: Database Schema (Priority: CRITICAL)

1. **Add tenant_id to branches table**
2. **Add missing columns to tenants table**
3. **Create stores table migration**
4. **Add region column to branches**
5. **Create indexes for performance**
6. **Add foreign key constraints with CASCADE**

### Phase 2: Model Updates (Priority: HIGH)

1. **Update Tenant model** - Add Branch and Store associations
2. **Update Branch model** - Add Tenant association
3. **Create Store model** - Complete implementation
4. **Add validation methods** - Tenant isolation checks

### Phase 3: API Implementation (Priority: HIGH)

1. **Create tenant middleware** - Automatic tenant filtering
2. **Implement missing HQ endpoints**
3. **Implement Branch sync endpoints**
4. **Add webhook system** - Real-time notifications
5. **Create aggregation services** - Cross-branch analytics

### Phase 4: Frontend Integration (Priority: MEDIUM)

1. **Update HQ dashboard** - Use correct API endpoints
2. **Create branch selector** - Multi-branch context
3. **Implement real-time updates** - WebSocket integration
4. **Add error handling** - Graceful degradation

### Phase 5: Testing & Optimization (Priority: MEDIUM)

1. **Unit tests** - Model associations
2. **Integration tests** - API endpoints
3. **Performance tests** - Query optimization
4. **Security audit** - Tenant isolation

---

## 📋 Implementation Checklist

### Database Migrations
- [ ] 20260224-add-tenant-to-branches.js
- [ ] 20260224-update-tenants-table.js
- [ ] 20260224-create-stores-table.js
- [ ] 20260224-add-branch-indexes.js
- [ ] 20260224-create-sync-logs-table.js

### Models
- [ ] Update Tenant.js - Add associations
- [ ] Update Branch.js - Add tenant association
- [ ] Create Store.js - Complete model
- [ ] Create SyncLog.js - Track sync operations

### API Endpoints
- [ ] /api/hq/tenants - CRUD operations
- [ ] /api/hq/stores - Store management
- [ ] /api/hq/sync/status - Sync monitoring
- [ ] /api/branch/sync - Branch sync operations
- [ ] /api/webhooks/branch-update - Real-time notifications

### Services
- [ ] TenantService.js - Tenant operations
- [ ] BranchSyncService.js - Sync logic
- [ ] AggregationService.js - Cross-branch analytics
- [ ] WebhookService.js - Event notifications

### Middleware
- [ ] tenantContext.js - Automatic tenant filtering
- [ ] branchAccess.js - Branch permission checks
- [ ] syncValidator.js - Data validation

---

## 🚀 Recommended Implementation Order

1. **Database Schema** (Day 1)
   - Add tenant_id to branches
   - Update tenants table
   - Create necessary indexes

2. **Model Associations** (Day 1-2)
   - Update all model associations
   - Add validation methods
   - Test relationships

3. **Tenant Middleware** (Day 2)
   - Create tenant context
   - Add to all HQ routes
   - Test isolation

4. **Core API Endpoints** (Day 3-4)
   - Implement missing endpoints
   - Add proper error handling
   - Document APIs

5. **Sync System** (Day 5)
   - Implement sync service
   - Add webhook system
   - Test data flow

6. **Frontend Integration** (Day 6-7)
   - Update components
   - Add real-time features
   - End-to-end testing

---

## 🔒 Security Considerations

1. **Tenant Isolation**
   - All queries MUST include tenant_id
   - Middleware validation on every request
   - No cross-tenant data access

2. **Branch Access Control**
   - Role-based permissions
   - Branch-level access restrictions
   - Audit logging

3. **Data Sync Security**
   - Encrypted data transfer
   - Signature verification
   - Conflict resolution rules

---

## 📊 Performance Optimization

1. **Database Indexes**
   - tenant_id on all tables
   - Composite indexes for common queries
   - Partial indexes for active records

2. **Caching Strategy**
   - Redis for tenant data
   - Branch settings cache
   - Aggregated reports cache

3. **Query Optimization**
   - Use eager loading
   - Limit result sets
   - Pagination on all lists

---

## 🎯 Success Metrics

- ✅ All queries include tenant_id
- ✅ Zero cross-tenant data leakage
- ✅ < 200ms API response time
- ✅ Real-time sync < 5 seconds
- ✅ 100% test coverage on critical paths
- ✅ Zero data loss during sync

