# QA Baseline Test Coverage Audit

**Date:** 2026-06-28  
**Auditor:** Hermes Agent (bedagang-qa-1)  
**Project:** Bedagang ERP (bedagang---PoS)  

---

## 1. EXECUTIVE SUMMARY

**Status: 🔴 CRITICAL — NO TEST COVERAGE**

The Bedagang ERP codebase has **zero automated tests** across all layers. Despite having `jest`, `@testing-library/react`, and `ts-jest` in `devDependencies`, no test files have ever been created, and Jest is not configured.

| Metric | Value |
|--------|-------|
| Total source files | ~3,545 |
| API route handlers | 744 |
| Sequelize models | 344 |
| Shared lib/utils | 148 |
| UI components | 195 |
| Frontend pages | 396 |
| Hooks | 13 |
| Test files found | **0** |
| Jest test suites | 0 passing / 5 phantom failures |

---

## 2. CODEBASE BREAKDOWN

### 2.1 Backend (API Routes) — 744 files

- **Admin modules** — integrations, partners, tenants, subscriptions, branches, activations, KYB, analytics, audit, products, transactions, webhooks, settings, AI models, reports
- **Auth** — NextAuth credentials, registration, branch switching
- **Billing** — invoices, payment methods, plans, subscriptions, Midtrans webhooks (also v2)
- **Branches** — branch management
- **Cart** — promo application
- **Customers** — CRUD, loyalty, purchase history, reports, tier sync, health profile, statistics
- **Dashboard** — stats, F&B stats, tenant dashboard, compare
- **Debug** — check-user, test-login
- **Driver** — dashboard, upload
- **Employee** — dashboard, field visit, attendance (GPS + mobile), roaming, roster, schedules
- **Finance** — accounts, budgets, balance sheet, profit/loss, invoices, payables, receivables, expenses, income, reconciliation, reports, settings (chart of accounts, bank accounts, categories, assets, payment methods), daily income, settlements, transactions, cross-module integrations
- **Fleet** — vehicles, drivers, routes, fuel, maintenance, costs, tracking, export
- **Frontend** — leaderboard, settings
- **Health** — health check
- **HQ** — analytics, assets, audit logs, billing, branch settings, branches, bumdes, categories, command center, dashboard, DMS, documents, e-procurement, export/import, finance (accounts, AI, budget, cash flow, expenses, invoices, journal, tax, etc.), fleet command center, FMS
- **HRIS** — attendance, employees, payroll, leave, performance, recruitment, training, warnings
- **Inventory** — products, stock, stock movements, stock opname, waste, adjustments, transfers, receipts, reports
- **Manufacturing** — BOM, work orders, production plans, QC, waste, machines, settings, routing
- **Kitchen** — inventory, recipes, orders, staff
- **Marketing** — campaigns, promotions, segments, budgets, content
- **POS** — transactions, shifts, orders, payments, receipts, coupons, split bill, holds
- **And more...**

### 2.2 Models Layer — 344 files

Sequelize models covering: Products, Inventory, Stock, Finance, HRIS, Fleet, Marketing, Manufacturing, POS, CRM, Project Management, Compliance, and more. Includes model associations and TypeScript typed models under `models/finance/`, `models/inventory/`, `models/hris/`.

### 2.3 Shared Libraries — 148 files

- Database adapters (finance, inventory, POS, products, purchasing, reports, etc.)
- Export utilities (Excel, PDF, Word)
- Email sender
- Payment gateway adapters (Midtrans, Xendit, Manual)
- Permissions system
- AI provider
- WebSocket server
- i18n translations (20+ translation files)
- Cache manager
- Middleware (rate limiting, tenant isolation, permission checks, validation)
- Error handling utilities
- And more...

---

## 3. TEST INFRASTRUCTURE ASSESSMENT

### 3.1 What's Installed (Unused)

| Package | Version | Purpose |
|---------|---------|---------|
| `jest` | ^29.7.0 | Test runner |
| `jest-environment-jsdom` | ^29.7.0 | DOM environment for React tests |
| `ts-jest` | ^29.3.2 | TypeScript support for Jest |
| `@testing-library/jest-dom` | ^6.6.3 | DOM matchers |
| `@testing-library/react` | ^16.3.0 | React component testing |
| `@types/jest` | ^29.5.14 | Jest TypeScript types |
| `next-router-mock` | ^0.9.13 | Next.js router mocking |
| `node-mocks-http` | ^1.16.2 | HTTP request mocking |
| `cypress` | ^14.3.2 | E2E testing |

### 3.2 What's Missing

| Item | Status |
|------|--------|
| Jest configuration file | ❌ Missing entirely |
| Test match pattern config | ❌ Uses default (matches `test.ts` API route files as suites, causing 5 phantom failures) |
| Test setup file | ❌ Missing |
| Environment config (test DB, env) | ❌ Not set up |
| Any test file of any kind | ❌ Zero |
| npm test script | ❌ Configured but never run (5 failing suites, 0 tests) |

### 3.3 Configuration Issue

Jest runs with zero configuration (no `jest.config.js` or `jest` block in `package.json`). The default test match pattern `**/?(*.)+(spec|test).[jt]s?(x)` incorrectly picks up 5 API route endpoint files that are named `test.ts` (integration test endpoints, not Jest test suites). This causes:

```
FAIL pages/api/settings/integrations/[id]/test.ts
FAIL pages/api/hq/integrations/configs/[id]/test.ts
FAIL pages/api/admin/integrations/[id]/test.ts
FAIL export/backend/pages/api/settings/integrations/[id]/test.ts
FAIL export/backend/pages/api/admin/integrations/[id]/test.ts
```

These files are Babel-transformed API handlers (using ES module `import` syntax with `require()` mixed in), not Jest test files. They will never pass as test suites.

---

## 4. COVERAGE GAPS BY LAYER

### 4.1 API Layer (0% Coverage)
- 744 route handlers: no unit tests, no integration tests
- Key modules untested: auth, billing/subscriptions, finance transactions, inventory operations, fleet management, manufacturing, HRIS payroll, marketing promotions, customer loyalty, POS operations, HQ dashboards
- No API contract tests (no supertest, no OpenAPI validation tests)
- No error-handling tests for the 500+ edge cases across routes

### 4.2 Model / Data Layer (0% Coverage)
- 344 Sequelize models: no model validation tests, no association tests
- No repository/database query tests
- No migration tests

### 4.3 Service / Business Logic Layer (0% Coverage)
- Payment gateway adapters (Midtrans, Xendit, Manual)
- AI guardian / autonomous accounting engine
- KPI calculator, finance calculator
- Loyalty tier sync
- Promo calculator
- Email sender templates
- Export generators (Excel, PDF, Word)
- Webhook service
- Caching layer

### 4.4 Middleware Layer (0% Coverage)
- Tenant isolation middleware
- Rate limiter
- Permission checks
- Module guard
- Validation middleware
- HQ auth middleware

### 4.5 E2E Layer (0% Coverage)
- Cypress installed but no E2E test files
- No critical user journeys automated

---

## 5. RISK ASSESSMENT

| Risk | Impact | Likelihood | Priority |
|------|--------|------------|----------|
| API regression after changes | High | High | **P0** |
| Payment integration failure | Critical | Medium | **P0** |
| Multi-tenant data leakage | Critical | Medium | **P0** |
| Auth/authorization bypass | Critical | Medium | **P0** |
| Business logic errors (finance, inventory) | High | High | **P1** |
| UI component regressions | Medium | High | **P1** |
| Database migration issues | High | Medium | **P1** |

---

## 6. RECOMMENDATIONS

### Phase 1 (Immediate — Fix Infrastructure)

1. **Create `jest.config.ts`** with:
   - `testMatch: ['<rootDir>/**/*.test.{ts,tsx,js,jsx}']` (exclude `test.ts` API files)
   - `testPathIgnorePatterns: ['/node_modules/', '/.next/', '/export/backend/']`
   - `moduleNameMapper` for `@/` path aliases
   - `testEnvironment: 'node'` for API tests
   - Separate `jsdom` config for component tests

2. **Create `jest.setup.ts`** with test environment initialization

3. **Fix `npm test`** to actually work (currently 5 phantom failures)

### Phase 2 (Critical Path — API Tests)

4. **Auth & Multi-tenancy tests** (highest risk)
5. **Payment/Billing integration tests**
6. **Finance transaction tests** (double-entry accounting)
7. **Inventory operation tests** (stock movements, transfers, adjustments)

### Phase 3 (Service Layer)

8. **Payment gateway adapter tests**
9. **Export utility tests**
10. **Middleware tests** (rate limit, tenant isolation, permissions)

### Phase 4 (Frontend & E2E)

11. **Critical UI component tests** (forms, tables, dashboards)
12. **Cypress E2E tests** for critical user journeys (login → POS transaction → payment)

---

## 7. RAW METRICS

```
Source files (TS/TSX/JS/JSX): 3,545
  ├── API routes:             744
  ├── Models:                 344
  ├── Lib/Utils:              148
  ├── UI Components:          195
  ├── Frontend Pages:         396
  ├── Hooks:                   13
  ├── Services:                 9
  ├── Utils:                   25
  └── Other:                 ~1,671

Test files found:             0
Test coverage:                0%
Phantom test suites:          5 (all failing — misidentified API files)
```

---

*End of Audit Report*
