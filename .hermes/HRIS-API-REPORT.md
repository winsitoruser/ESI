# HRIS Module API Audit Report

**Audit Date**: July 2, 2026  
**Auditor**: Bedagang Backend Agent  
**Task ID**: t_d4411ff7

---

## Executive Summary

Audit of HRIS module APIs (Employee CRUD, Attendance, Leave Management, Payroll) identified **4 critical security vulnerabilities** and **3 architectural inconsistencies** requiring immediate remediation.

---

## 🚨 Critical Issues Found

### 1. Authentication & Authorization Inconsistency

**Severity**: CRITICAL  
**Affected Files**:
- `pages/api/hq/hris/employees.ts`
- `pages/api/hq/hris/employee-profile.ts`
- `pages/api/hq/hris/leave-management.ts`

**Problem**:
These APIs use raw `getServerSession()` directly instead of the standardized `withHQAuth` middleware, unlike `pages/api/hq/hris/webhooks.ts` which correctly uses:

```typescript
// ✅ Correct (webhooks.ts)
export default withHQAuth(handler, { module: 'hris' });

// ❌ Incorrect (others)
const session = await getServerSession(req, res, authOptions);
if (!session?.user) { /* manual check */ }
```

**Impact**:
- Missing `module: 'hris'` requirement check - users without HRIS module enabled can access
- Missing granular permission checks (create/read/update/delete permissions)
- Inconsistent error response format between APIs

---

### 2. Tenant Isolation Violation - User-Supplied tenantId

**Severity**: CRITICAL  
**Affected File**: `pages/api/hq/hris/employees.ts:268-283`

**Problem**:
```typescript
// ❌ DANGEROUS: tenantId from request body (user-controlled!)
const { name, email, phone, position, department, workLocation, branchId, branchName, tenantId } = req.body;

// Later used directly:
const count = await Employee.count({ where: tenantId ? { tenantId } : {} });
const employee = await Employee.create({
  ...
  tenantId  // User can inject ANY tenantId!
});
```

**Impact**:
- Authenticated users can create employees in ANY tenant by supplying a different `tenantId`
- Complete bypass of multi-tenant isolation
- Data leakage between tenants

**Root Cause**:
The `tenantId` should ALWAYS come from `session.user.tenantId`, NEVER from user input.

---

### 3. No Tenant Filtering on Queries

**Severity**: HIGH  
**Affected Files**:
- `pages/api/hq/hris/employee-profile.ts` (NO tenant filtering at all)
- `pages/api/hq/hris/employees.ts` (partial/missing)

**Problem in `employee-profile.ts`**:
```typescript
// ❌ NO tenant filtering!
const [countResult] = await sequelize.query(
  `SELECT COUNT(*) as total FROM employees e ${where}`, 
  { replacements }  // No tenantId in WHERE clause!
);

const [rows] = await sequelize.query(
  `SELECT * FROM ${table} WHERE employee_id = :empId ...`, 
  { replacements }  // No tenant check on employee sub-data!
);
```

**Problem in `employees.ts`**:
```typescript
// getEmployees has NO tenant filtering:
const where: any = {};  // No tenantId added!

// Only tenantId check is at creation - and that's from user input!
```

**Impact**:
- Users can read/write employees from ANY tenant
- Complete data exposure across tenants

---

### 4. SQL Injection via Dynamic Table Names

**Severity**: HIGH  
**Affected File**: `pages/api/hq/hris/employee-profile.ts`

**Problem**:
```typescript
// Whitelist exists but pattern is still risky
const allowed = ['employee_families', 'employee_educations', ...];
if (!allowed.includes(table)) return res.status(400).json({ error: 'Invalid table' });

// Still using dynamic table name in raw SQL:
const [rows] = await sequelize.query(
  `SELECT * FROM ${table} WHERE employee_id = :empId ORDER BY created_at DESC`,
  { replacements: { empId } }
);
```

**Additional locations**:
- Line 147: `getSubData()` 
- Line 176: `upsertSubData()` - UPDATE with `${table}`
- Line 188: `upsertSubData()` - INSERT with `${table}`
- Line 201: `deleteSubData()` - DELETE with `${table}`

**Impact**:
- If whitelist bypass is found, arbitrary SQL execution
- Better to use Sequelize models directly since they exist:
  - `EmployeeFamily`, `EmployeeEducation`, `EmployeeCertification`, `EmployeeSkill`, 
  - `EmployeeWorkExperience`, `EmployeeDocument`, `EmployeeContract`

---

### 5. Race Conditions in Leave Balance Operations

**Severity**: MEDIUM-HIGH  
**Affected File**: `pages/api/hq/hris/leave-management.ts`

**Problem**:
Balance operations are multiple separate queries without transactions:

```typescript
// 1. Read balance (query 1)
const [balanceRows] = await sequelize.query(`SELECT ... FROM leave_balances ...`);

// 2. Check balance in application code (race window!)
if (remaining < totalDays) { /* error */ }

// 3. Update pending_days (query 2)
await sequelize.query(`UPDATE leave_balances SET pending_days = pending_days + :days ...`);
```

**Concurrent request scenario**:
1. Request A reads: remaining = 5
2. Request B reads: remaining = 5
3. Request A deducts 3: pending = 3
4. Request B deducts 3: pending = 3
5. **Result**: 6 days deducted from 5 available → negative balance!

**Impact**:
- Employees can take more leave than available
- Possible financial impact if leave is paid

**Mitigation needed**:
1. Use database transactions with row locking (`SELECT ... FOR UPDATE`)
2. OR use atomic update with WHERE clause checking balance:
   ```sql
   UPDATE leave_balances 
   SET pending_days = pending_days + :days 
   WHERE employee_id = :empId 
     AND (entitled_days + carried_forward_days - used_days - pending_days) >= :days
   ```
   Then check affected rows.

---

## 📋 Module Status Summary

| Module | Status | Issues | Priority |
|--------|--------|--------|----------|
| Employee CRUD (`employees.ts`) | ⚠️ At Risk | Tenant bypass, auth bypass | CRITICAL |
| Employee Profile (`employee-profile.ts`) | 🔴 Critical | No tenant isolation, SQLi risk | CRITICAL |
| Leave Management (`leave-management.ts`) | ⚠️ At Risk | Race conditions, auth bypass | HIGH |
| Webhooks (`webhooks.ts`) | ✅ Secure | Uses withHQAuth(module:'hris') | OK |
| Attendance/Clock-In (`pages/api/hq/hris/*`) | ⚠️ Needs check | Inconsistent patterns | MEDIUM |
| Payroll Calculation | ❓ Not found | No dedicated API module yet | LOW |

---

## 🔧 Recommended Fixes (Immediate)

### Fix 1: Standardize all HRIS APIs to use `withHQAuth`

**All 3 APIs should use**:
```typescript
import { withHQAuth } from '../../../../lib/middleware/withHQAuth';

// Base pattern - require HRIS module
export default withHQAuth(handler, { module: 'hris' });

// For write operations - add permissions
export default withHQAuth(handler, { 
  module: 'hris',
  permission: 'employees.create'  // or appropriate permission
});
```

### Fix 2: Always get `tenantId` from Session, NOT Request

**Correct pattern**:
```typescript
// Inside handler after withHQAuth:
const session = (req as any).session;
const tenantId = session?.user?.tenantId;

// NEVER: const { tenantId } = req.body;
```

### Fix 3: Add tenantId to ALL queries

**For Sequelize models**:
```typescript
const employees = await Employee.findAndCountAll({
  where: { tenantId, ...otherFilters },
  include: [...]
});
```

**For raw queries**:
```typescript
let where = "WHERE 1=1";
const replacements: any = {};

if (tenantId) {
  where += " AND e.tenant_id = :tenantId";
  replacements.tenantId = tenantId;
}
```

### Fix 4: Replace dynamic table names with Sequelize models

Since models exist, use them:

```typescript
// ❌ OLD:
const [rows] = await sequelize.query(`SELECT * FROM ${table} ...`);

// ✅ NEW:
const modelMap: Record<string, any> = {
  'employee_families': models.EmployeeFamily,
  'employee_educations': models.EmployeeEducation,
  'employee_certifications': models.EmployeeCertification,
  'employee_skills': models.EmployeeSkill,
  'employee_work_experiences': models.EmployeeWorkExperience,
  'employee_documents': models.EmployeeDocument,
  'employee_contracts': models.EmployeeContract,
};

const Model = modelMap[table];
if (!Model) { /* error */ }

const rows = await Model.findAll({ 
  where: { employeeId: empId, tenantId },
  order: [['createdAt', 'DESC']]
});
```

### Fix 5: Atomic leave balance operations

Use either:

**Option A - Atomic UPDATE with check**:
```typescript
const [result, metadata] = await sequelize.query(`
  UPDATE leave_balances 
  SET pending_days = pending_days + :days,
      updated_at = NOW()
  WHERE employee_id = :empId 
    AND year = :year
    AND leave_type_id = (SELECT id FROM leave_types WHERE code = :code LIMIT 1)
    AND (entitled_days + COALESCE(carried_forward_days,0) + COALESCE(adjustment_days,0)
         - used_days - pending_days) >= :days
`, { replacements: { days, empId, year, code } });

if (metadata.rowCount === 0) {
  // Balance insufficient - no rows updated
  return res.status(400).json({ error: 'Insufficient leave balance' });
}
```

**Option B - Transaction with row locking**:
```typescript
const t = await sequelize.transaction();

try {
  // Lock the row
  const [balance] = await sequelize.query(
    `SELECT * FROM leave_balances WHERE ... FOR UPDATE`,
    { transaction: t }
  );
  
  // Check balance
  if (remaining < days) {
    await t.rollback();
    return res.status(400).json({ error: 'Insufficient balance' });
  }
  
  // Update
  await sequelize.query(`UPDATE leave_balances SET ...`, { transaction: t });
  
  await t.commit();
} catch (err) {
  await t.rollback();
  throw err;
}
```

---

## 📊 Missing Tests

**Current test coverage** (`tests/` directory):
- ✅ `withHQAuth.test.ts` - middleware tests (486 lines, comprehensive)
- ✅ `tenantIsolation.test.ts` - tenant isolation tests
- ✅ Various auth, finance, billing tests

**Missing HRIS tests**:
- ❌ No tests for `employees.ts`
- ❌ No tests for `employee-profile.ts`
- ❌ No tests for `leave-management.ts`
- ❌ No tests for `attendance` APIs

**Recommended test additions**:
1. `tests/hris/employees-crud.test.ts` - CRUD with tenant isolation
2. `tests/hris/employee-profile.test.ts` - Sub-data operations
3. `tests/hris/leave-balance-concurrency.test.ts` - Race condition tests
4. `tests/hris/tenant-isolation.test.ts` - Cross-tenant access attempts

---

## ✅ Action Items

### Immediate (Must Fix Before Production)

| # | Task | File | Priority |
|---|------|------|----------|
| 1 | Add `withHQAuth({ module: 'hris' })` to all HRIS APIs | `employees.ts`, `employee-profile.ts`, `leave-management.ts` | 🔴 CRITICAL |
| 2 | Fix `tenantId` source - use session, not req.body | `employees.ts:254,268,282` | 🔴 CRITICAL |
| 3 | Add tenant filtering to ALL SELECT/UPDATE/DELETE queries | All 3 APIs | 🔴 CRITICAL |
| 4 | Replace dynamic table names with Sequelize models | `employee-profile.ts` | 🔴 HIGH |
| 5 | Add atomic balance operations with row locking | `leave-management.ts` | 🟡 HIGH |

### Short Term

| # | Task | Priority |
|---|------|----------|
| 6 | Add permission checks (hris.view, hris.create, etc.) | 🟡 MEDIUM |
| 7 | Create unit tests for HRIS APIs | 🟡 MEDIUM |
| 8 | Create integration tests for tenant isolation | 🟡 MEDIUM |

### Long Term

| # | Task | Priority |
|---|------|----------|
| 9 | Implement Redis caching for frequently accessed HRIS data | 🟢 LOW |
| 10 | Add request validation (Zod/Joi schemas) | 🟢 LOW |
| 11 | Add audit logging for all HRIS write operations | 🟢 LOW |

---

## 📝 References

- **Standard auth pattern**: `lib/middleware/withHQAuth.ts` (well documented)
- **Secure API example**: `pages/api/hq/hris/webhooks.ts` (uses withHQAuth correctly)
- **Test examples**: `tests/middleware/withHQAuth.test.ts` (comprehensive patterns)
- **Models available**: `models/Employee*.js`, `models/Leave*.js`

---

*End of Audit Report*

*Note: Fixes will be applied in subsequent steps.*
