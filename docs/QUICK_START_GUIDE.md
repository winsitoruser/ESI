# 🚀 HQ-Branch System - Quick Start Guide

## ✅ System Status: 75% Complete & Ready for Testing

---

## 🎯 What's Been Built

### ✅ Complete Features
- **Multi-tenant database** with proper isolation
- **Branch management** with HQ-Branch relationships
- **Sync system** for data synchronization
- **Role-based access** (Super Admin, Owner, Manager, Staff)
- **Middleware** for automatic tenant filtering
- **API endpoints** for tenant and sync operations

---

## 🔑 Test Credentials

### Super Admin (Full Access)
```
Email: superadmin@bedagang.com
Password: MasterAdmin2026!
```

### Sample Tenants (Created by sample data script)

**Tenant 1: Warung Kopi Network**
```
Owner: owner@warungkopi.com / password123
Manager: manager@warungkopi.com / password123
Branches: 2 (Jakarta Pusat, Bandung)
```

**Tenant 2: Toko Sejahtera**
```
Owner: owner@tokosejahtera.com / password123
Branches: 1 (Bandung Pusat)
```

---

## 🚀 Getting Started

### 1. Verify Setup

```bash
# Check database migrations
npx sequelize-cli db:migrate:status

# Should show all migrations as "up"
```

### 2. Create Sample Data (If not done)

```bash
node scripts/create-sample-multi-tenant-data.js
```

### 3. Run System Tests

```bash
node scripts/test-hq-branch-system.js
```

Expected: All 10 tests should pass ✅

### 4. Start Server

```bash
npm run dev
```

Server: http://localhost:3001

---

## 🧪 Testing Scenarios

### Test 1: Tenant Isolation

**Goal:** Verify users can only see their tenant's data

```bash
# 1. Login as Tenant 1 owner
POST /api/auth/login
{
  "email": "owner@warungkopi.com",
  "password": "password123"
}

# 2. Get branches
GET /api/hq/branches

# Expected: Only see 2 branches (both from Tenant 1)
# Should NOT see Tenant 2's branch
```

### Test 2: Role-Based Access

**Goal:** Verify different roles have appropriate access

```bash
# Login as Manager
POST /api/auth/login
{
  "email": "manager@warungkopi.com",
  "password": "password123"
}

# Try to access branches
GET /api/hq/branches

# Expected: Can see branches they manage
```

### Test 3: Sync Operations

**Goal:** Test branch synchronization

```bash
# Trigger sync for a branch
POST /api/hq/sync/trigger
{
  "branchId": "branch-uuid-here",
  "syncType": "products"
}

# Check sync status
GET /api/hq/sync/status/branch-uuid-here

# Expected: See sync log with status
```

### Test 4: Tenant Management (Super Admin Only)

```bash
# Login as super admin
POST /api/auth/login
{
  "email": "superadmin@bedagang.com",
  "password": "MasterAdmin2026!"
}

# List all tenants
GET /api/hq/tenants

# Expected: See all tenants with stats
```

---

## 📊 Database Structure

### Key Tables

```
tenants (Multi-tenant core)
├── Stores 2 tenants
└── Each tenant has:
    ├── Branches (1-10 depending on plan)
    ├── Users (5-50 depending on plan)
    └── Stores (1-N)

branches (Branch management)
├── Belongs to: Tenant, Store
├── Has manager: User
└── Tracks: sync status, region

sync_logs (Sync tracking)
├── Tracks all sync operations
├── Status: pending, in_progress, completed, failed
└── Progress monitoring
```

### Sample Data Created

```
Tenant 1: Warung Kopi Network (WARUNG001)
├── Store: Warung Kopi Main Store
├── Branches:
│   ├── WK-JKT-001 (Jakarta Pusat) - Main
│   └── WK-BDG-001 (Bandung) - Branch
└── Users:
    ├── owner@warungkopi.com (Owner)
    └── manager@warungkopi.com (Manager)

Tenant 2: Toko Sejahtera (RETAIL001)
├── Store: Toko Sejahtera Pusat
├── Branches:
│   └── TS-BDG-001 (Bandung Pusat) - Main
└── Users:
    └── owner@tokosejahtera.com (Owner)
```

---

## 🔐 Security Features

### Automatic Tenant Filtering

All queries automatically filtered by tenant:

```javascript
// In API endpoint
const branches = await Branch.findAll({
  where: addTenantFilter({ isActive: true }, req)
});

// Result: Only returns branches for user's tenant
```

### Role-Based Access

| Role | Can Access | Permissions |
|------|-----------|-------------|
| **Super Admin** | All tenants | Everything |
| **Owner** | Own tenant | All branches, all users |
| **Manager** | Own tenant | Managed branches only |
| **Staff** | Own tenant | Assigned branch only |

---

## 🌐 API Endpoints

### Authentication

```
POST /api/auth/login
Body: { email, password }
```

### Tenant Management

```
GET  /api/hq/tenants           # List tenants
POST /api/hq/tenants           # Create tenant (super admin)
GET  /api/hq/tenants/:id       # Get tenant details
```

### Branch Management

```
GET  /api/hq/branches          # List branches (tenant filtered)
POST /api/hq/branches          # Create branch
GET  /api/hq/branches/:id      # Get branch details
PUT  /api/hq/branches/:id      # Update branch
```

### Sync Operations

```
POST /api/hq/sync/trigger      # Trigger sync
Body: { branchId, syncType }

GET  /api/hq/sync/status/:branchId  # Get sync status
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

### Trigger Sync Example

```bash
curl -X POST http://localhost:3001/api/hq/sync/trigger \
  -H "Content-Type: application/json" \
  -d '{
    "branchId": "branch-uuid",
    "syncType": "products"
  }'
```

### Monitor Sync

```bash
curl http://localhost:3001/api/hq/sync/status/branch-uuid
```

---

## 🛠️ Useful Scripts

### Create Admin Accounts

```bash
node scripts/create-admin-alternatives.js
```

Creates 3 admin accounts with different credentials.

### Create Sample Data

```bash
node scripts/create-sample-multi-tenant-data.js
```

Creates 2 tenants, 3 branches, 3 users for testing.

### Run System Tests

```bash
node scripts/test-hq-branch-system.js
```

Runs 10 integration tests to verify system.

### Check Super Admin

```bash
node scripts/check-superadmin.js
```

Verifies super admin account exists and password is correct.

---

## 📝 Common Tasks

### Add New Tenant

```javascript
POST /api/hq/tenants
{
  "code": "TENANT003",
  "businessName": "New Business",
  "businessTypeId": "business-type-uuid",
  "maxUsers": 10,
  "maxBranches": 3
}
```

### Add New Branch

```javascript
POST /api/hq/branches
{
  "code": "BR-001",
  "name": "New Branch",
  "type": "branch",
  "address": "Street Address",
  "city": "City",
  "managerId": "user-id"
}
```

### Sync All Branches

```javascript
POST /api/hq/sync/trigger
{
  "syncType": "full"
  // No branchId = sync all branches
}
```

---

## 🐛 Troubleshooting

### Issue: "Tenant context required"

**Solution:** Ensure you're logged in and have a valid session.

### Issue: "Branch limit reached"

**Solution:** Upgrade tenant's subscription plan or increase `maxBranches`.

### Issue: Can see other tenant's data

**Solution:** Check that `addTenantFilter()` is used in all queries.

### Issue: Sync fails

**Solution:** 
1. Check branch exists and is active
2. Verify sync_logs table for error messages
3. Check branch.syncStatus

---

## 📊 Monitoring Queries

### Check Tenant Stats

```sql
SELECT 
  t.code,
  t.name,
  COUNT(DISTINCT b.id) as branches,
  COUNT(DISTINCT u.id) as users
FROM tenants t
LEFT JOIN branches b ON b.tenant_id = t.id
LEFT JOIN users u ON u.tenant_id = t.id
GROUP BY t.id, t.code, t.name;
```

### Recent Sync Operations

```sql
SELECT 
  b.name as branch,
  sl.sync_type,
  sl.status,
  sl.items_synced,
  sl.created_at
FROM sync_logs sl
JOIN branches b ON sl.branch_id = b.id
ORDER BY sl.created_at DESC
LIMIT 10;
```

### Failed Syncs

```sql
SELECT 
  b.name,
  sl.sync_type,
  sl.error_message,
  sl.created_at
FROM sync_logs sl
JOIN branches b ON sl.branch_id = b.id
WHERE sl.status = 'failed'
ORDER BY sl.created_at DESC;
```

---

## 📚 Documentation

**Full Documentation:**
- `/docs/HQ_BRANCH_SYSTEM_ANALYSIS.md` - Complete analysis
- `/docs/DEPLOYMENT_GUIDE.md` - Production deployment
- `/docs/FINAL_IMPLEMENTATION_SUMMARY.md` - Complete overview

**Server:** http://localhost:3001

---

## ✅ Next Steps

1. **Test tenant isolation** with sample accounts
2. **Test sync operations** between HQ and branches
3. **Verify role-based access** works correctly
4. **Implement frontend** components
5. **Add webhook system** for real-time updates

---

## 🎉 System Ready!

The HQ-Branch multi-tenant system is **75% complete** and ready for:
- ✅ Backend testing
- ✅ API integration
- ✅ Multi-tenant operations
- ⏳ Frontend development
- ⏳ Production deployment

**Happy Testing!** 🚀
