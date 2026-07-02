# 📋 Bedagang ERP — Complete Module Map & QA/QC Screening Priorities

> **Generated:** Sunday, June 28, 2026  
> **Repository:** `/Users/winnerharry/Bedagang ERP/bedagang---PoS`  
> **Branch:** `New-Backend-Nainerp`  
> **Scope:** `pages/hq/` (UI pages) + `pages/api/hq/` (API endpoints)

---

## 1. MODULE MAP — Pages & API

### 🟢 Tier 1 — Core Business Modules (High Complexity, High Business Impact)

| # | Module | Pages (hq/) | API Endpoints | API Structure | Code Volume (API) | Priority Score |
|---|--------|-------------|---------------|---------------|-------------------|----------------|
| 1 | **HRIS** | 36 pages | 35 endpoints | Modular dir/ | Very High | **P0 — Critical** |
| 2 | **Finance** | 11 pages | 16 endpoints | Modular dir/ | High | **P0 — Critical** |
| 3 | **Fleet** | 12 pages | 18 endpoints | Modular dir/ + sub-dirs | High | **P0 — Critical** |
| 4 | **DMS (Digital Vault)** | 20 pages | 1 mega-API | `dms.ts` (514 lines) | High (monolith) | **P0 — Critical** |
| 5 | **BUMDes** | 20 pages | 1 mega-API | `bumdes.ts` (633 lines) | Very High (monolith) | **P0 — Critical** |
| 6 | **Billing & Subscription** | 5 (+ billing-info) | 9 (billing) + 5 (sub) + 1 (billing-info.ts 597 lines) | Mixed dir/ + mega-API | Very High | **P0 — Critical** |
| 7 | **Settings & Integrations** | ~21 pages | 2 (settings.ts 225 lines) + 10 (integrations) | Mixed | High | **P0 — Critical** |

### 🟡 Tier 2 — Operational Modules (Medium-High Complexity)

| # | Module | Pages (hq/) | API Endpoints | API Structure | Priority Score |
|---|--------|-------------|---------------|---------------|----------------|
| 8 | **Inventory** | 9 pages | 10 endpoints | Modular dir/ | **P1 — High** |
| 9 | **SFA (Sales Force Automation)** | 3 pages | 13 endpoints | Modular dir/ | **P1 — High** |
| 10 | **Branches** | 5 pages | 15 endpoints | Modular dir/ | **P1 — High** |
| 11 | **Reports** | 9 pages | 6 endpoints | Modular dir/ | **P1 — High** |
| 12 | **Live streaming** | 11 pages | 1 mega-API | `livestreaming.ts` (59 lines) | **P1 — High** |
| 13 | **Marketplace** | 6 pages | 3 endpoints | Modular dir/ | **P1 — High** |
| 14 | **Modules (Catalog/Config)** | 5 pages | 4 endpoints | Modular dir/ | **P1 — High** |
| 15 | **Users & Roles** | 4 pages | 7 endpoints (users 4 + roles 3) | Modular dir/ | **P1 — High** |

### 🔵 Tier 3 — Specialized Modules (Medium Complexity)

| # | Module | Pages (hq/) | API Endpoints | API Structure | Priority Score |
|---|--------|-------------|---------------|---------------|----------------|
| 16 | **Manufacturing** | 1 page | 4 endpoints | Modular dir/ | **P2 — Medium** |
| 17 | **TMS (Trip Mgmt)** | 1 page | 2 endpoints | Modular dir/ | **P2 — Medium** |
| 18 | **FMS (Facility Mgmt)** | 1 page | 3 endpoints | Modular dir/ | **P2 — Medium** |
| 19 | **Assets** | 1 page | 4 endpoints | Modular dir/ | **P2 — Medium** |
| 20 | **Requisitions** | 1 page | 1 mega-API (404 lines) + 4 dir endpoints | Mixed | **P2 — Medium** |
| 21 | **Products** | 3 pages | 3 endpoints | Modular dir/ | **P2 — Medium** |
| 22 | **E-Procurement** | 1 page | 1 endpoint | Modular dir/ | **P2 — Medium** |
| 23 | **Project Management** | 3 pages | 1 endpoint | Modular dir/ | **P2 — Medium** |
| 24 | **Helpdesk** | 1 page | 1 endpoint | Modular dir/ | **P2 — Medium** |
| 25 | **Marketing** | 1 page | 1 endpoint | Modular dir/ | **P2 — Medium** |
| 26 | **Export-Import** | 1 page | 1 endpoint | Modular dir/ | **P2 — Medium** |
| 27 | **Website Builder** | 2 pages | 0 (client-side?) | — | **P2 — Medium** |
| 28 | **Knowledge Base** | 2 pages | 0 (client-side?) | — | **P2 — Medium** |
| 29 | **WhatsApp** | 1 page | 1 endpoint | Modular dir/ | **P2 — Medium** |
| 30 | **Audit Logs** | 1 page | 1 endpoint | Modular dir/ | **P2 — Medium** |
| 31 | **Purchase Orders** | 1 page | 1 endpoint | Modular dir/ | **P2 — Medium** |
| 32 | **Suppliers** | 1 page | 1 endpoint | Modular dir/ | **P2 — Medium** |

### ⚪ Tier 4 — Infrastructure & Cross-Cutting

| # | Module | API Endpoints | Notes |
|---|--------|---------------|-------|
| 33 | **Sync** | 3 endpoints | Branch data sync |
| 34 | **Webhooks** | 2 endpoints | Branch realtime |
| 35 | **Warehouse** | 2 endpoints | Smart warehouse |
| 36 | **Analytics** | 1 endpoint | Cross-module analytics |
| 37 | **Monitoring** | 1 endpoint | Realtime monitoring |
| 38 | **Command Center** | 1 endpoint | Central command |
| 39 | **Realtime** | 1 endpoint | Real-time updates |
| 40 | **Export** | 1 endpoint | Data export utility |
| 41 | **Documents** | 1 endpoint | Document management |
| 42 | **Permissions** | 1 endpoint | Permission explorer |
| 43 | **Managers** | 1 endpoint | Manager delegation |

---

## 2. TOTALS

| Metric | Count |
|--------|-------|
| **Total HQ Pages** | **~208** `.tsx` files |
| **Total API Endpoint Files** | **~213** `.ts`/`.tsx` files |
| **Total Modules (HQ)** | **~43** distinct directories/files |
| **Mega-API Monoliths** | **6** files (`dms.ts`, `bumdes.ts`, `livestreaming.ts`, `billing-info.ts`, `requisitions.ts`, `settings.ts`) |

---

## 3. 🎯 QA/QC SCREENING PRIORITIES

### Phase 1 — P0 Critical (Week 1-2)
*Focus: Highest business impact, data integrity, financial accuracy*

| Order | Module | Rationale |
|-------|--------|-----------|
| **1** | **Finance** | Financial data integrity — transactions, P&L, tax, cash flow, AI Guardian. **Highest audit risk.** |
| **2** | **Billing & Subscription** | Revenue-critical — invoice lifecycle, payment methods, overdue sweep, subscription plans/checkout/cancel/resume. **Direct revenue impact.** |
| **3** | **HRIS** | Largest module (36 pages, 35 APIs). Employee data, payroll (BPJS, PPH21, THR, lembur), attendance, KPI, recruitment, training, travel expense. **Massive feature surface.** |
| **4** | **DMS (Digital Vault)** | 20 pages, monolithic 514-line API. National digital vault — documents, e-sign, archives, persuratan, compliance, PPID, mata-elang, records management. **Monolith refactor risk.** |
| **5** | **BUMDes** | 20 pages, monolithic 633-line API (largest single API file). Village enterprise management — accounting, capital, profit-sharing, microfinance, governance, contracts. **Monolith refactor highest priority.** |
| **6** | **Fleet** | 12 pages, 18 API endpoints. Vehicles, tracking, routes, maintenance, fuel, costs, drivers, leaderboard, KPI, integrations with other modules. **Many integration touchpoints.** |
| **7** | **Settings & Integrations** | 21 pages of configuration. E-commerce (Shopee, Tokopedia), food delivery (GoFood, GrabFood, ShopeeFood), payment gateways (Xendit), messaging. **Integration reliability is business-critical.** |

### Phase 2 — P1 High (Week 3-4)
*Focus: Operational continuity, data sync*

| Order | Module | Rationale |
|-------|--------|-----------|
| **8** | **Inventory** | 9 pages, 10 APIs. Stock, stocktake, transfers, pricing, receipts, alerts, smart warehouse, categories. **Directly impacts operations.** |
| **9** | **SFA** | 3 pages but 13 APIs — CRM, advanced features, AI workflow, audit trail, sales management, task calendar, import/export, HRIS sync. **High API-to-page ratio suggests complex business logic.** |
| **10** | **Branches** | 5 pages, 15 APIs. Branch CRUD, analytics, finance per branch, inventory per branch, performance, settings, per-branch module management. **Multi-tenant data isolation.** |
| **11** | **Marketplace** | 6 pages, 3 APIs + webhook. Orders, products, channels, logistics, settings. **Public-facing platform risk.** |
| **12** | **Live streaming** | 11 pages, 1 small mega-API (59 lines). Talent, channels, brands, schedule, liveshop, gifts, commissions, analytics, content, events. **Customer-facing with real-time transactions.** |
| **13** | **Reports** | 9 pages, 6 APIs + comprehensive report. Sales, finance, inventory, procurement, HRIS, data analysis. **Data accuracy for decision-making.** |
| **14** | **Users & Roles** | 4 pages, 7 APIs. User management, role-based access, permissions explorer. **Security & access control.** |
| **15** | **Modules (Catalog/Config)** | 5 pages, 4 APIs. Module catalog, deployment, history, templates, features, flows, configuration. **Platform extensibility.** |

### Phase 3 — P2 Medium (Week 5-6)
*Focus: Niche features, completeness*

| Order | Module | Rationale |
|-------|--------|-----------|
| 16 | Manufacturing | BOM, production, integration |
| 17 | TMS | Trip management |
| 18 | FMS | Facility management |
| 19 | Assets | Asset management + depreciation |
| 20 | Requisitions | Procurement requests + fulfillment |
| 21 | Products | Product catalog, pricing, categories |
| 22 | E-Procurement | Procurement |
| 23 | Project Management | Projects + Gantt |
| 24 | Helpdesk | Support ticketing |
| 25 | Marketing | Campaigns |
| 26 | Export-Import | Trade docs |
| 27 | Website Builder | Site builder + editor |
| 28 | Knowledge Base | Wiki/docs |
| 29 | WhatsApp | Messaging |
| 30 | Audit Logs | Logging |
| 31 | Purchase Orders | PO management |
| 32 | Suppliers | Vendor mgmt |

### Phase 4 — P3 Infra (As Needed)
Sync, Webhooks, Warehouse, Analytics, Monitoring, Command Center, Realtime, Export, Documents, Permissions, Managers

---

## 4. 🔍 KEY ARCHITECTURAL OBSERVATIONS FOR QA/QC

### Monolithic API Risk (Critical)
6 modules use a **single mega-API file** instead of modular endpoints:

| File | Lines | Module | Risk Level |
|------|-------|--------|------------|
| `bumdes.ts` | 633 lines | BUMDes | 🔴 Extreme |
| `dms.ts` | 514 lines | DMS | 🔴 Extreme |
| `billing-info.ts` | 597 lines | Billing-Info | 🔴 Extreme |
| `requisitions.ts` | 404 lines | Requisitions | 🟡 High |
| `settings.ts` | 225 lines | Settings | 🟡 High |
| `livestreaming.ts` | 59 lines | Livestreaming | 🟢 Low |

**Recommendation:** QA/QC should flag these for refactoring — monoliths are harder to test, maintain, and reason about.

### Inter-Module Dependencies
- **Fleet** has explicit integration APIs with: HRIS, Finance, Inventory, Manufacturing
- **SFA** integrates with HRIS, Marketing
- **Settings > Integrations** wraps e-commerce (Shopee, Tokopedia), food delivery (GoFood, GrabFood, ShopeeFood), payment gateways
- **Finance** has AI Guardian and AI Autonomous modules

### Data Sensitivity Classification
| Sensitivity | Modules |
|-------------|---------|
| **🔴 Financial** | Finance, Billing, Subscription, Payroll (HRIS) |
| **🟡 Personal** | HRIS (employees), Users, Roles |
| **🟢 Operational** | Inventory, Fleet, SFA, Marketplace, Manufacturing |

---

## 5. 📊 QA/QC SUCCESS METRICS

| Metric | Target | Measured By |
|--------|--------|-------------|
| Module test coverage | ≥80% per module | Coverage report |
| API endpoint response time | ≤500ms p95 | Load test |
| Error rate | ≤1% of API calls | Monitoring |
| Mega-API refactoring | All 6 monoliths modularized | Code review |
| Auth/authorization checks | 100% of endpoints | Security audit |
| Cross-module integration tests | ≥90% pass rate | Integration CI |

---

*Generated by Hermes Agent — PM Subagent Task*
