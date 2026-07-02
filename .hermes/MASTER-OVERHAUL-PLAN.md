# 🏗️ Bedagang ERP — Master Overhaul Plan

**Generated:** 28 June 2026
**Branch:** `New-Backend-Nainerp`
**Status:** Analysis Phase Complete — Execution Phase Start

---

## 1. ⚠️ KRISIS — Critical Findings (Harus Fix Sekarang)

| # | Module | Issue | Severity | Dampak |
|---|--------|-------|----------|--------|
| 1 | **E-Procurement** | **NO API HANDLER** — `eprFetch()` calls `/api/hq/e-procurement?action=...` tapi file tidak ada. Seluruh module 100% mock, UI tidak bisa menyimpan data. | 🔴 BLOCKER | Module tidak fungsional |
| 2 | **Manufacturing** | **No tenant isolation on SELECT** — semua read query tanpa filter `tenant_id` | 🔴 BLOCKER | Data leak cross-tenant |
| 3 | **CRM** | **SQL injection in update handlers** — dynamic SET clause dari req.body tanpa whitelist | 🔴 BLOCKER | Security critical |
| 4 | **SFA** | **SQL injection + silent failures** — sama seperti CRM + `catch { return [] }` | 🔴 BLOCKER | Security critical |
| 5 | **Asset Management** | **Models not registered in models/index.js** — semua Asset model tidak terdaftar | 🔴 BLOCKER | Associations broken |
| 6 | **HRIS** | **25+ models not registered** — selesai di batch sebelumnya ✅ | ✅ FIXED | |
| 7 | **Finance** | **7/10 models missing tenant_id** — tenant isolation tidak berfungsi | 🔴 BLOCKER | Data leak |
| 8 | **Project Mgmt** | **8 raw SQL tables without Sequelize models** — sprints, comments, approvals etc. | 🔴 HIGH | Tidak konsisten |
| 9 | **Fleet** | **All core CRUD APIs use mock data** — vehicles, drivers, routes, fuel, costs | 🔴 HIGH | Tidak real |

---

## 2. 📋 MODULE-BY-MODULE OVERHAUL PLAN

### P0 — Week 1 (Security & Infrastructure)

| Task | Module | Assign | Effort |
|------|--------|--------|--------|
| **Create E-Procurement API handler** | E-Procurement | Backend Team | 3 days |
| **Add tenant isolation to all queries** | Manufacturing, Finance, Fleet | Backend-1,2 | 2 days |
| **Fix SQL injection in CRM + SFA** | CRM, SFA | Backend-3,4 | 1 day |
| **Register Asset models** | Asset Management | Backend-5 | 0.5 day |
| **Add tenant_id to Finance models** | Finance | Backend-2 | 1 day |
| **Create Sequelize models for raw tables** | Project Management | Backend-1 | 2 days |

### P1 — Week 2-3 (Business Logic)

| Task | Module | Assign | Effort |
|------|--------|--------|--------|
| **Attendance→Payroll integration** | HRIS | Backend Team | 2 days |
| **Leave balance deduction on approval** | HRIS | Backend-4 | 0.5 day |
| **SFA pagination + soft delete** | SFA | Backend-3 | 1 day |
| **Replace mock data with real DB** | Fleet (core CRUD) | Backend-2 | 3 days |
| **Finance: replace mock APIs with real DB** | Finance | Backend-5 | 3 days |
| **Manufacturing: pagination + empty states** | Manufacturing | Backend-1 | 1 day |

### P2 — Week 3-5 (Frontend & UX)

| Task | Module | Assign | Effort |
|------|--------|--------|--------|
| **Split monolithic SFA page (4739 lines → 24 files)** | SFA | Frontend-1,2,3 | 4 days |
| **Split monolithic Manufacturing page (2225 lines → 16 files)** | Manufacturing | Frontend-4,5 | 3 days |
| **Split Asset Management page (2171 lines → 10 files)** | Assets | Frontend-1,2 | 2 days |
| **Add loading states + error handling ALL pages** | ALL | All Frontend | 5 days |
| **Add pagination to ALL list pages** | ALL | All Frontend | 3 days |
| **Fix missing CRM UI pages (tickets, documents, campaigns, SLA)** | CRM | Frontend-3,4 | 5 days |
| **Create E-Procurement vendor portal pages** | E-Procurement | Frontend-5 | 3 days |
| **Fix Fleet page API paths (/api/fleet/ → /api/hq/fleet/)** | Fleet | Frontend-1 | 1 day |

### P3 — Week 5-8 (Enhancement)

| Task | Module | Assign | Effort |
|------|--------|--------|--------|
| **Audit logging for all APIs** | ALL | Backend Team | 5 days |
| **Rate limiting for all APIs** | ALL | Backend Team | 3 days |
| **Response format standardization** | ALL | Backend + Frontend | 5 days |
| **i18n completeness audit** | ALL | PO Team | 3 days |
| **Integration tests for critical flows** | ALL | QA Team | 10 days |

---

## 3. 👥 TEAM ASSIGNMENT

| Profile | Role | Priority Tasks |
|---------|------|----------------|
| **bedagang-architect-1** | System Architect | Design API standard patterns, review all P0 fixes |
| **bedagang-backend-1** | Backend Lead | E-Procurement API, Project Mgmt models |
| **bedagang-backend-2** | Backend | Tenant isolation fixes, Finance tenant_id |
| **bedagang-backend-3** | Backend | SQL injection fixes (CRM + SFA) |
| **bedagang-backend-4** | Backend | HRIS business logic (attendance→payroll, leave) |
| **bedagang-backend-5** | Backend | Asset models register, Finance mock→real DB |
| **bedagang-frontend-1** | Frontend Lead | SFA split, loading states standardization |
| **bedagang-frontend-2** | Frontend | Assets split, loading states |
| **bedagang-frontend-3** | Frontend | CRM missing pages, loading states |
| **bedagang-frontend-4** | Frontend | Manufacturing split |
| **bedagang-frontend-5** | Frontend | E-Procurement pages, Fleet API paths |
| **bedagang-po-1** | PO Lead | Plan UX improvements, i18n audit |
| **bedagang-po-2** | PO | Feature prioritization, user journey mapping |
| **bedagang-qa-1** | QA Lead | Test plan for P0 fixes |
| **bedagang-qa-2** | QA | Integration tests |
| **bedagang-qa-3** | QA | E2E smoke tests |

---

## 4. 📊 MODULE HEALTH SCORE

| Module | Pages | APIs | Models | Health | Priority |
|--------|-------|------|--------|--------|----------|
| **DMS** | 20 | 1 (modular 26) | 14 | 🟢 8/10 | Maintain |
| **Finance** | 11 | 16 | 10 | 🟡 5/10 | ⬆️ Refactor |
| **HRIS** | 36 | 35 | 42+ | 🟡 5/10 | ⬆️ Refactor |
| **CRM** | 0 (embedded) | 1 (monolith) | 25 | 🔴 3/10 | ⬆️⬆️ Urgent |
| **SFA** | 1 (monolith) | 3 (monolith) | 39 | 🟡 5/10 | ⬆️ Refactor |
| **Manufacturing** | 1 (monolith) | 4 | 20 | 🟡 5/10 | ⬆️ Refactor |
| **Fleet** | 12 | 18 | 10 | 🟡 5/10 | ⬆️ Refactor |
| **E-Procurement** | 1 (monolith) | **0** | 10 | 🔴 2/10 | ⬆️⬆️ CRITICAL |
| **Project Mgmt** | 3 | 1 (monolith) | 9 | 🟡 5/10 | ⬆️ Refactor |
| **Asset Mgmt** | 1 (monolith) | 4 | 7 | 🔴 3/10 | ⬆️⬆️ Urgent |
| **BUMDes** | 18 | 1 (modular) | — | 🟡 5/10 | Skipped |
| **Inventory** | 9 | 10 | — | 🟡 5/10 | ⬆️ Refactor |
| **Marketplace** | 6 | 3 | — | 🟡 5/10 | Maintain |

---

## 5. 🚀 IMMEDIATE EXECUTION

**WEEK 1 PRIORITY:**
1. 🔴 **Create E-Procurement API handler** — tanpa ini module mati total
2. 🔴 **Fix SQL injection CRM + SFA** — security hole terbuka
3. 🔴 **Register Asset models** — biar associations jalan
4. 🔴 **Add tenant_id to Finance models** — cegah data leak
5. 🟡 **Start SFA monolithic split** — 4739 lines → 24 files

**Tim PM/PO:** Validasi business flow setiap module, buat user journey documentation
**Tim QA:** Regression test setiap P0 fix
