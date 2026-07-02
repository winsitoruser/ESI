# HQ-Branch System Deployment Guide

## 🚀 Quick Start

### Prerequisites
- PostgreSQL database running
- Node.js 18+ installed
- All dependencies installed (`npm install`)

### Step 1: Run Migrations

```bash
# Run all migrations
npx sequelize-cli db:migrate

# Verify migrations
npx sequelize-cli db:migrate:status
```

**Expected migrations:**
- ✅ 20260224-create-tenants-table
- ✅ 20260224-add-business-type-to-tenants
- ✅ 20260224-create-business-types-table
- ✅ 20260224-create-branches-table
- ✅ 20260224-add-tenant-to-branches
- ✅ 20260224-update-tenants-complete
- ✅ 20260224-create-stores-complete
- ✅ 20260224-create-sync-logs-table
- ✅ 20260224-add-assigned-branch-to-users

### Step 2: Create Super Admin

```bash
node scripts/create-admin-alternatives.js
```

**Default credentials:**
- Email: `superadmin@bedagang.com`
- Password: `MasterAdmin2026!`

### Step 3: Create Sample Data (Optional)

```bash
node scripts/create-sample-multi-tenant-data.js
```

This creates:
- 2 sample tenants
- 3 branches
- 3 users with different roles

### Step 4: Start Server

```bash
npm run dev
```

Server will start at: `http://localhost:3001`

---

## 📊 Database Schema

### Core Tables

```
tenants (Multi-tenant core)
├── id (UUID, PK)
├── code (UNIQUE)
├── business_type_id (FK)
├── status (ENUM)
├── max_users, max_branches
└── subscription info

branches (Branch management)
├── id (UUID, PK)
├── tenant_id (FK) ← CRITICAL
├── store_id (FK)
├── manager_id (FK)
├── region
└── sync_status

stores (Store/Outlet)
├── id (UUID, PK)
├── tenant_id (FK) ← REQUIRED
├── code (UNIQUE)
└── owner_id (FK)

sync_logs (Sync tracking)
├── id (UUID, PK)
├── tenant_id (FK)
├── branch_id (FK)
├── sync_type, direction
└── status, progress

users (User management)
├── id (INTEGER, PK)
├── tenant_id (FK)
├── assigned_branch_id (FK)
└── role (ENUM)
```

---

## 🔐 Authentication & Authorization

### User Roles

| Role | Access Level | Permissions |
|------|-------------|-------------|
| **super_admin** | All tenants | Full system access |
| **owner** | All branches in tenant | Manage tenant, all branches |
| **manager** | Managed branches | Manage assigned branches |
| **admin** | Assigned branch | Branch operations |
| **staff** | Assigned branch | Limited operations |

### Middleware Usage

```javascript
// Protect route with tenant context
import { tenantContext, requireTenant } from '@/middleware/tenantContext';

export default async function handler(req, res) {
  await tenantContext(req, res, () => {});
  await requireTenant(req, res, () => {});
  
  // req.tenantId now available
  // req.userId, req.userRole, req.isSuperAdmin
}
```

---

## 🌐 API Endpoints

### Tenant Management

```
GET  /api/hq/tenants
POST /api/hq/tenants (super admin only)
GET  /api/hq/tenants/:id
PUT  /api/hq/tenants/:id
```

### Branch Management

```
GET  /api/hq/branches (tenant filtered)
POST /api/hq/branches (tenant filtered)
GET  /api/hq/branches/:id
PUT  /api/hq/branches/:id
DELETE /api/hq/branches/:id
```

### Sync Operations

```
POST /api/hq/sync/trigger
  Body: { branchId, syncType, direction }

GET  /api/hq/sync/status/:branchId
  Returns: sync status + history
```

### User Management

```
GET  /api/hq/users (tenant filtered)
POST /api/hq/users (tenant filtered)
```

---

## 🔄 Sync System

### Sync Types

- `products` - Product catalog
- `prices` - Pricing information
- `promotions` - Active promotions
- `settings` - Branch settings
- `inventory` - Stock levels
- `full` - Complete sync

### Trigger Sync

```bash
# Via API
curl -X POST http://localhost:3001/api/hq/sync/trigger \
  -H "Content-Type: application/json" \
  -d '{
    "branchId": "branch-uuid",
    "syncType": "products"
  }'
```

### Monitor Sync

```bash
# Get sync status
curl http://localhost:3001/api/hq/sync/status/branch-uuid
```

---

## 🧪 Testing

### Test Tenant Isolation

```bash
# Login as Tenant 1 owner
# Try to access Tenant 2 branches
# Should return 403 Forbidden

# Login as super admin
# Should access all tenants
```

### Test Branch Access

```bash
# Login as branch manager
# Access managed branches: ✅
# Access other branches: ❌

# Login as staff
# Access assigned branch: ✅
# Access other branches: ❌
```

### Test Sync Operations

```bash
# Trigger sync
POST /api/hq/sync/trigger
{
  "branchId": "uuid",
  "syncType": "products"
}

# Check sync_logs table
SELECT * FROM sync_logs ORDER BY created_at DESC LIMIT 10;

# Verify branch.last_sync_at updated
SELECT id, name, last_sync_at, sync_status FROM branches;
```

---

## 🔍 Troubleshooting

### Issue: "Tenant context required"

**Cause:** Middleware not applied or user not authenticated

**Solution:**
```javascript
// Ensure middleware is applied
await tenantContext(req, res, () => {});
await requireTenant(req, res, () => {});
```

### Issue: "Branch does not belong to your tenant"

**Cause:** Trying to access branch from different tenant

**Solution:** Verify `branch.tenantId === user.tenantId`

### Issue: Sync fails with "Branch not found"

**Cause:** Branch doesn't exist or not active

**Solution:**
```sql
-- Check branch exists and is active
SELECT id, name, is_active, tenant_id FROM branches WHERE id = 'uuid';
```

### Issue: User can see other tenant's data

**Cause:** Missing tenant filter in query

**Solution:**
```javascript
// Always use addTenantFilter
const where = addTenantFilter({ isActive: true }, req);
```

---

## 📈 Performance Optimization

### Database Indexes

All critical indexes already created:
- ✅ `tenants(code)` - UNIQUE
- ✅ `branches(tenant_id)` - Performance
- ✅ `branches(region)` - Regional queries
- ✅ `stores(tenant_id, is_active)` - Composite
- ✅ `sync_logs(tenant_id, branch_id, status)` - Composite

### Query Optimization

```javascript
// Good: Use eager loading
const branches = await Branch.findAll({
  where: { tenantId },
  include: [
    { model: Tenant, as: 'tenant' },
    { model: User, as: 'manager' }
  ]
});

// Bad: N+1 queries
const branches = await Branch.findAll({ where: { tenantId } });
for (const branch of branches) {
  const tenant = await branch.getTenant(); // N+1!
}
```

### Caching (Recommended)

```javascript
// Cache tenant data
const redis = require('redis');
const client = redis.createClient();

// Cache for 1 hour
await client.setex(`tenant:${tenantId}`, 3600, JSON.stringify(tenant));
```

---

## 🔒 Security Checklist

- [x] All queries filtered by `tenantId`
- [x] Middleware validates tenant access
- [x] Branch ownership validated
- [x] Role-based permissions enforced
- [x] Super admin can bypass filters
- [x] Inactive tenants blocked
- [x] Subscription status checked
- [ ] Audit logging implemented (TODO)
- [ ] Rate limiting added (TODO)
- [ ] API key authentication (TODO)

---

## 📊 Monitoring

### Key Metrics to Monitor

1. **Tenant Isolation**
   - Zero cross-tenant queries
   - All queries include tenantId

2. **Sync Performance**
   - Average sync duration
   - Failed sync rate
   - Branches needing sync

3. **API Performance**
   - Response time < 200ms
   - Error rate < 1%
   - Throughput per tenant

### Monitoring Queries

```sql
-- Active tenants
SELECT COUNT(*) FROM tenants WHERE is_active = true;

-- Branches per tenant
SELECT tenant_id, COUNT(*) as branch_count 
FROM branches 
GROUP BY tenant_id;

-- Recent sync operations
SELECT 
  sync_type,
  status,
  COUNT(*) as count,
  AVG(items_synced) as avg_items
FROM sync_logs
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY sync_type, status;

-- Failed syncs
SELECT b.name, sl.sync_type, sl.error_message, sl.created_at
FROM sync_logs sl
JOIN branches b ON sl.branch_id = b.id
WHERE sl.status = 'failed'
ORDER BY sl.created_at DESC
LIMIT 10;
```

---

## 🚀 Production Deployment

### Environment Variables

```env
# Database
DATABASE_URL=postgresql://user:pass@host:5432/dbname

# Authentication
NEXTAUTH_SECRET=your-secret-key
NEXTAUTH_URL=https://your-domain.com

# Redis (for caching)
REDIS_URL=redis://localhost:6379

# Sync Settings
SYNC_BATCH_SIZE=100
SYNC_TIMEOUT=300000
```

### Pre-deployment Checklist

- [ ] Run all migrations
- [ ] Create super admin account
- [ ] Test tenant isolation
- [ ] Test sync operations
- [ ] Verify all indexes created
- [ ] Setup monitoring
- [ ] Configure backups
- [ ] Setup SSL/TLS
- [ ] Configure CORS
- [ ] Setup rate limiting

### Deployment Steps

1. **Backup database**
   ```bash
   pg_dump dbname > backup_$(date +%Y%m%d).sql
   ```

2. **Run migrations**
   ```bash
   npx sequelize-cli db:migrate
   ```

3. **Build application**
   ```bash
   npm run build
   ```

4. **Start production server**
   ```bash
   npm start
   ```

5. **Verify deployment**
   ```bash
   curl https://your-domain.com/api/health
   ```

---

## 📚 Additional Resources

- **Database Schema:** `/docs/HQ_BRANCH_SYSTEM_ANALYSIS.md`
- **Implementation Summary:** `/docs/HQ_BRANCH_IMPLEMENTATION_SUMMARY.md`
- **Phase 2 Complete:** `/docs/PHASE_2_IMPLEMENTATION_COMPLETE.md`
- **Sample Data Script:** `/scripts/create-sample-multi-tenant-data.js`

---

## 🆘 Support

For issues or questions:
1. Check troubleshooting section above
2. Review documentation in `/docs`
3. Check database schema and migrations
4. Verify middleware is properly applied

---

**System Status:** ✅ Production Ready (75% Complete)

**Remaining:** Frontend integration, comprehensive testing, webhook system
