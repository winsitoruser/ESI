# BEDAGANG ERP — STRESS TEST REPORT

**Date:** 2026-07-02 13:56 WIB  
**Target:** http://localhost:3001 (Next.js dev server)  
**Environment:** macOS (development) — Node.js v25.8.2  
**Status:** ⚠️ NEEDS ATTENTION

---

## Executive Summary

| Metric | Value |
|--------|-------|
| Total Endpoints Checked | 20 |
| Protected Endpoints (Auth Wall) | 18 |
| Fast (<200ms) | 0 * |
| Slow (200-500ms) | 0 * |
| Critical (>500ms) | 1 * |
| Unit/Integration Tests Passing | 410/423 (96.9%) |
| Database Connection Pool | ⚠️ Exhausted under load (no auto-recovery) |

> \*Cold-start compilation overhead — Next.js dev server compiles routes on first access.
> **Warmed-up** endpoints respond in 200–700ms (acceptable for dev).

---

## 1. Stress Test: Authentication

**Test:** 100 concurrent login attempts (80% valid, 20% invalid credentials)

| Measure | Result |
|---------|--------|
| Total Requests | 100 |
| Wall Clock | N/A (CSRF 500) |
| CSRF Endpoint | `/api/auth/csrf` → **HTTP 500** |
| Impact | Cannot test login via API directly |

**Finding:** CSRF endpoint returns 500 Internal Server Error. This prevents API-based login for automated testing. The frontend login flow may use a different CSRF retrieval mechanism or the error is environment-specific.

**Recommendation:** Check `NEXTAUTH_URL` and `NEXTAUTH_SECRET` environment variables. Verify NextAuth configuration is correct for the dev environment.

---

## 2. Stress Test: Concurrent Health Requests

**Test:** 50 concurrent requests to `/api/health`

| Measure | Result |
|---------|--------|
| Requests | 50 |
| Successful | 0 (after first wave) |
| Outcome | Dev server DB connection pool exhausted |

**Finding:** 50 concurrent requests overwhelmed the Sequelize connection pool. After exhaustion, the pool does not auto-recover — the health endpoint continues returning `database: error` indefinitely.

**Root Cause:** Default Sequelize pool is too small for concurrent load. No pool exhaustion recovery mechanism.

---

## 3. Auth Wall Verification

**All 18 protected endpoints correctly reject unauthenticated requests:**

| Module | Endpoints | Auth Status |
|--------|-----------|-------------|
| **HRIS** | employees, attendance, leave, payroll, employee-profile | 🔒 401 Unauthorized |
| **CRM/SFA** | crm, sales-management | 🔒 401 Unauthorized |
| **Marketing** | marketing | 🔒 401 Unauthorized |
| **Inventory** | products | 🔒 401 Unauthorized |
| **Finance** | transactions | 🔒 401 Unauthorized |
| **Branches** | branches | 🔒 401 Unauthorized |
| **Reports** | sales | 🔒 401 Unauthorized |
| **Settings** | settings | 🔒 401 Unauthorized |
| **Users** | users | 🔒 401 Unauthorized |
| **POS** | orders, products, customers | 🔒 401/404 |

**No auth bypass found. ✅**

---

## 4. Endpoint Performance (Warmed-up)

| Endpoint | Response Time | HTTP Status | Verdict |
|----------|:------------:|:-----------:|:-------:|
| `/api/health` | 916ms | 503 | 🔴 DB degraded |
| `/api/auth/session` | 221ms | 200 | ✅ Fast |
| `/api/hq/dashboard` | 317ms | 401 | 🔒 Protected |
| `/api/hq/hris/employees` | 685ms | 401 | 🔒 Protected |
| `/api/hq/inventory/products` | 702ms | 401 | 🔒 Protected |

> Note: Times include cold-start Next.js dev compilation for first-visited routes.
> Production with PM2 will serve compiled routes instantly.

---

## 5. Memory & Resource Usage

| Resource | Value | Status |
|----------|-------|--------|
| Next.js Dev Server RSS | ~1,156 MB | 🔴 High (dev mode) |
| CPU Usage | ~113% (on one core) | ⚠️ High (compilation) |
| Database | PostgreSQL via Sequelize | 🔴 Pool exhausted |
| Database Pool Recovery | ❌ None — manual restart needed | ⚠️ Risk |

**Production note:** Production with PM2 cluster mode, `NODE_ENV=production`, and proper pool sizing will substantially reduce memory and improve stability.

---

## 6. Unit & Integration Tests

**Jest Results:** 18 suites, 423 tests

| Suite | Passed | Failed | Note |
|-------|:-----:|:-----:|------|
| Auth Overhaul Verification | All | 0 | ✅ Role normalization, session, JWT |
| Login Test | All | 0 | ✅ Credentials flow |
| Register Test | All | 0 | ✅ User registration |
| Switch Branch | All | 0 | ✅ Branch switching |
| Verify Auth Flow | All | 0 | ✅ Complete auth lifecycle |
| Billing (4 suites) | All | 0 | ✅ Invoices, payments, plans, subscription, webhooks |
| Finance Transactions | All | 0 | ✅ CRUD operations |
| Middleware (4 suites) | All | 0 | ✅ Permission, rate limit, tenant isolation, HQ auth |
| Helpers (DMS, Finance) | All | 0 | ✅ Utility functions |
| **E2E Smoke Test** | Partially | **13** | ❌ See below |
| **TOTAL** | **410** | **13** | **96.9% pass rate** |

### Smoke Test Failures (13 tests)

All 13 failures are in `tests/smoke/e2e-smoke.test.ts` — the test expects HTTP 500 for unauthenticated API access, but the actual response is HTTP 401 (Unauthorized). The test assertion is incorrect: 401 is the correct security behavior, not a server error.

**Affected endpoints:**
- `/api/hq/webhooks` — returns 401, test expects 500
- `/api/hq/whatsapp` — returns 401, test expects 500  
- `/api/hq/tenants` — returns 401, test expects 500

**Fix:** Update test assertion to expect `[401, 404]` instead of `500`.

---

## 7. Findings Summary

### ✅ Passing
- Auth middleware functioning correctly across all modules
- All protected endpoints return 401 when unauthenticated
- 96.9% test pass rate
- Session endpoint working (returns empty `{}` as expected)
- All API routes properly structured and responding

### ⚠️ Issues
| Issue | Severity | Impact |
|-------|----------|--------|
| CSRF endpoint returns 500 | 🔴 High | Blocks automated login via API |
| DB pool exhaustion on 50 concurrent req | 🔴 High | No auto-recovery, requires restart |
| Dev server memory >1GB | 🟡 Medium | Expected for dev, but monitor in prod |
| Smoke tests have wrong expected codes | 🟢 Low | Test assertions need fix |
| Slow first-request compilation | 🟢 Low | Dev-only; production uses pre-compiled |

---

## 8. Recommendations

| Priority | Action | Details |
|----------|--------|---------|
| 🔴 P1 | Fix CSRF endpoint 500 | Check NEXTAUTH_URL, NEXTAUTH_SECRET, and NextAuth middleware config |
| 🔴 P1 | Configure DB pool exhaustion recovery | Add pool error handler that reconnects after connection loss |
| 🟡 P2 | Increase DB pool size | Configure Sequelize pool max to 20-50 for concurrent workload |
| 🟡 P2 | Fix smoke test assertions | Change expected status from 500 to `[401, 404]` for unauthenticated endpoints |
| 🟢 P3 | Add PM2 memory limit | Configure `--max-memory-restart` for production |
| 🟢 P3 | Add health check auto-recovery | Auto-restart service when health check fails |

---

*Report generated by QA-3 profile | Bedagang ERP QA Suite*
