# SFA Module Analysis — Bedagang ERP

> **Date:** June 28, 2026  
> **Branch:** New-Backend-Nainerp  
> **Codebase:** `/Users/winnerharry/Bedagang ERP/bedagang---PoS/`  
> **Author:** Hermes Agent (Automated Analysis)

---

## 1. Module Overview

The **Sales Force Automation (SFA)** module is a comprehensive sales management system for retail/FMCG/direct sales operations. It covers the full sales lifecycle from lead generation through order fulfillment, with field force management, performance tracking, and incentive calculation.

### 1.1 Architecture

The SFA module is split across **4 API endpoints**, **3 page files**, and **~39 database models**:

| Component | Location | Size |
|-----------|----------|------|
| Core API | `pages/api/hq/sfa/index.ts` | 766 lines — 13+ actions |
| Enhanced API | `pages/api/hq/sfa/enhanced.ts` | 763 lines — Teams, Targets, Incentives, Plafon, Parameters |
| Advanced API | `pages/api/hq/sfa/advanced.ts` | 761 lines — Coverage, Field Orders, Audits, Competitors, Surveys, Approvals, Geofences, Commissions |
| Sales Mgmt API | `pages/api/hq/sfa/sales-management.ts` | 3,601 lines — Sales entries, item targets, outlet growth |
| CRM API | `pages/api/hq/sfa/crm.ts` | 65,228 bytes — Customers, comms, tasks, forecasting |
| Import/Export API | `pages/api/hq/sfa/import-export.ts` | 42,872 bytes |
| Other APIs | `ai-workflow.ts`, `audit-trail.ts`, `data-export.ts`, `hris-sync.ts`, `lookup.ts`, `notifications.ts`, `task-calendar.ts` | Various |
| Main Page | `pages/hq/sfa/index.tsx` | 4,739 lines (single-page SPA) |
| Enhanced Page | `pages/hq/sfa/enhanced.tsx` | ~1,500 lines |
| Advanced Page | `pages/hq/sfa/advanced.tsx` | ~1,500 lines |
| Components | `components/sfa/SalesManagementModule.tsx` | 190,773 bytes |
| Components | `components/sfa/TaskCalendarModule.tsx` | 70,784 bytes |
| Library | `lib/sfa/visitTaskSync.ts` | 121 lines — CRM task ↔ Visit sync |
| Middleware | `lib/middleware/withModuleGuard` | SFA module access guard |

---

## 2. Database Models (39 Models)

### 2.1 Core SFA Models (9)
| Model | Table | Key Fields |
|-------|-------|-----------|
| `SfaTerritory` | `sfa_territories` | code, name, region, city, province, parent_territory_id, manager_id |
| `SfaLead` | `sfa_leads` | lead_number, company_name, contact_name, email/phone, source, status, priority, score, estimated_value, territory_id, tags (JSONB), custom_fields (JSONB), campaign_id |
| `SfaOpportunity` | `sfa_opportunities` | opportunity_number, title, customer_name, stage, status, probability, expected_value, actual_value, expected_close_date, lead_id, territory_id, product_interest |
| `SfaActivity` | `sfa_activities` | activity_type (call/email/meeting), subject, status, priority, duration_minutes, lead_id, opportunity_id |
| `SfaVisit` | `sfa_visits` | salesperson_id, customer_name, visit_type, purpose, visit_date, status, check_in/out lat/lng/address/photo, duration_minutes, outcome, order_taken, order_value |
| `SfaTarget` | `sfa_targets` | target_type, period_type, period, assigned_to, target_value, actual_value, achievement_pct, branch_id, territory_id |
| `SfaQuotation` | `sfa_quotations` | quotation_number, customer_name, subtotal, discount, tax, total, status (draft/sent/approved/rejected) |
| `SfaQuotationItem` | `sfa_quotation_items` | quotation_id, product_id, product_name, quantity, unit_price, discount_pct, subtotal |
| `SfaRoutePlan` | `sfa_route_plans` | name, description, territory_id, active |

### 2.2 Enhanced SFA Models (11)
| Model | Table | Purpose |
|-------|-------|---------|
| `SfaTeam` | `sfa_teams` | code, name, team_type, territory_id, branch_id, leader_id, max_members, parent_team_id |
| `SfaTeamMember` | `sfa_team_members` | team_id, user_id, role, position, daily_visit_target, monthly_revenue_target |
| `SfaTargetGroup` | `sfa_target_groups` | code, name, group_type, period, year, total_target_value, team_id, territory_id |
| `SfaTargetAssignment` | `sfa_target_assignments` | assigned_to, revenue_target, volume_target, visit_target, new_customer_target, weight_config (JSONB) |
| `SfaTargetProduct` | `sfa_target_products` | product_id, product_name, revenue_target, volume_target, target_assignment_id |
| `SfaAchievement` | `sfa_achievements` | user_id, period, year, total_revenue, weighted_pct, completed_visits |
| `SfaAchievementDetail` | `sfa_achievement_details` | target_id, target_type, target_value, actual_value, achievement_pct |
| `SfaIncentiveScheme` | `sfa_incentive_schemes` | name, incentive_type, base_amount_type, tiers (JSONB), overachievement_multiplier |
| `SfaIncentiveTier` | `sfa_incentive_tiers` | scheme_id, tier_name, min_pct, max_pct, incentive_pct, flat_amount, bonus_amount |
| `SfaIncentiveCalculation` | `sfa_incentive_calculations` | user_id, scheme_id, achievement_pct, gross_incentive, net_incentive, status |
| `SfaPlafon` / `SfaPlafonUsage` | `sfa_plafon` / `sfa_plafon_usage` | Customer credit limits, usage tracking, overdue monitoring |
| `SfaParameter` | `sfa_parameters` | category, param_key, param_value, display_order |

### 2.3 Advanced SFA Models (19)
| Model | Table | Purpose |
|-------|-------|---------|
| `SfaCoveragePlan` | `sfa_coverage_plans` | Visit coverage plans by customer class |
| `SfaCoverageAssignment` | `sfa_coverage_assignments` | Customer-to-salesperson assignment with visit frequency |
| `SfaFieldOrder` | `sfa_field_orders` | Field orders (manual/POS integrated), with items, status workflow |
| `SfaFieldOrderItem` | `sfa_field_order_items` | Line items for field orders |
| `SfaDisplayAudit` | `sfa_display_audits` | Merchandising display audits with compliance_pct |
| `SfaDisplayItem` | `sfa_display_items` | Display audit line items |
| `SfaCompetitorActivity` | `sfa_competitor_activities` | Competitive intelligence reports |
| `SfaSurveyTemplate` | `sfa_survey_templates` | Survey templates with questions |
| `SfaSurveyQuestion` | `sfa_survey_questions` | Individual survey questions |
| `SfaSurveyResponse` | `sfa_survey_responses` | Completed survey responses, linked to visit |
| `SfaApprovalWorkflow` | `sfa_approval_workflows` | Approval workflows (quotations, field orders, etc.) |
| `SfaApprovalStep` | `sfa_approval_steps` | Multi-step approval chain |
| `SfaApprovalRequest` | `sfa_approval_requests` | Pending approval requests |
| `SfaGeofence` | `sfa_geofences` | GPS geofences for visit validation |
| `SfaProductCommission` | `sfa_product_commissions` | Per-product commission rates |
| `SfaCommissionGroup` | `sfa_commission_groups` | Product commission groups |
| `SfaCommissionGroupProduct` | `sfa_commission_group_products` | Products in commission groups |
| `SfaOutletTarget` | `sfa_outlet_targets` | Per-outlet growth targets |
| `SfaSalesStrategy` / `SfaStrategyKpi` | `sfa_sales_strategies` / `sfa_strategy_kpis` | Sales strategies with KPI tracking |

### 2.4 Integration with Other Modules
- **Marketing**: `MktCampaign` → `SfaLead` (campaign_id FK) — campaign-to-lead attribution
- **CRM**: `CrmTask` ↔ `SfaVisit` via `visitTaskSync.ts` — visit-to-task bridge
- **POS**: `pos_transactions` queried in dashboard for revenue data
- **HRIS**: `users` table queried for salesperson data, team assignments
- **Inventory**: Product catalog used in quotations and field orders

---

## 3. API Actions Inventory

### 3.1 Core API (`/api/hq/sfa?action=...`)
| Method | Action | Description |
|--------|--------|-------------|
| GET | `dashboard` | Summary stats (leads by status, pipeline, targets, visits, top leads, POS revenue) |
| GET | `unified-dashboard` | Combined dashboard with all metrics (core + enhanced + advanced) |
| GET | `leads` | List leads with filters (status, source, priority, search, territory) |
| GET | `lead-detail` | Lead detail + activities/visits/opportunities |
| GET | `opportunities` | List opportunities with filters |
| GET | `pipeline` | Pipeline breakdown by stage (count, value, avg probability, weighted value) |
| GET | `activities` | Activities with filters (status, type, lead, opportunity) |
| GET | `visits` | Visits with filters + CRM task link |
| GET | `targets` | Targets by period/type |
| GET | `quotations` | Quotations by status |
| GET | `territories` | All territories |
| GET | `route-plans` | All route plans |
| POST | `create-lead` | Create lead with auto-numbering |
| POST | `create-opportunity` | Create opportunity with auto-numbering |
| POST | `create-activity` | Create activity (updates lead/opp last_activity_at) |
| POST | `create-visit` | Schedule visit + auto-create CRM task via `visitTaskSync` |
| POST | `create-quotation` | Create quotation with items, PPN 11% auto-tax |
| POST | `create-territory` | Create territory |
| POST | `create-target` | Create target |
| POST | `convert-lead` | Convert lead → opportunity, update lead status |
| POST | `checkin-visit` | GPS check-in with lat/lng/address/photo |
| POST | `checkout-visit` | GPS check-out with outcome, order info, duration calc |
| PUT | `update-lead` | Update lead fields (18 allowed fields) |
| PUT | `update-opportunity` | Update opportunity fields (21 allowed fields) |
| PUT | `update-activity` | Update activity (sets completed_at if status=completed) |
| PUT | `update-visit` | Update visit fields |
| PUT | `update-quotation` | Update quotation (status flow: sent/approved/rejected) |
| PUT | `update-target` | Update target with auto-achievement calculation |
| DELETE | `delete-lead` | Delete lead (manager only) |
| DELETE | `delete-opportunity` | Delete opportunity (manager only) |
| DELETE | `delete-activity` | Delete activity (manager only) |
| DELETE | `delete-quotation` | Delete quotation + items (manager only) |

### 3.2 Enhanced API (`/api/hq/sfa/enhanced?action=...`)
Teams CRUD, Team Members add/remove, Target Groups CRUD, Target Assignments, Target Products, Achievements (auto-calculate), Incentive Schemes CRUD, Incentive Tiers, Incentive Calculation Engine, Plafon CRUD, Parameters, Multi-Currency, Enhanced Dashboard.

### 3.3 Advanced API (`/api/hq/sfa/advanced?action=...`)
Coverage Plans CRUD, Coverage Assignments, Compliance Reports, Field Orders CRUD (with items, tax), Display Audits, Competitor Activity CRUD, Survey Templates/Questions/Responses, Approval Workflows/Steps/Requests, Geofences CRUD, Product Commissions, Commission Groups, Outlet Targets, Sales Strategies.

### 3.4 Sales Management API (`/api/hq/sfa/sales-management?action=...`)
Sales entries CRUD (manual/bulk/import), sales vs target reports, per-product/per-group/per-outlet targets, outlet growth tracking, POS integration.

---

## 4. Business Process Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                    SFA CORE PROCESS FLOW                         │
└─────────────────────────────────────────────────────────────────┘

LEAD ────(convert)────▶ OPPORTUNITY ────(quote)────▶ QUOTATION
  │                        │                            │
  │                        │                            ├─▶ Approved
  ├── Activity (call)      ├── Activity (meeting)       ├─▶ Rejected
  ├── Visit (field)        ├── Visit (field)            └─▶ Sent
  └── Lost                 └── Won/Lost
                               │
                               ▼
                          FIELD ORDER ◀── (if won + approved)
                               │
                    ┌──────────┼──────────┐
                    ▼          ▼          ▼
                 Delivered   Invoiced   Paid


┌─────────────────────────────────────────────────────────────────┐
│                    TARGETS & PERFORMANCE FLOW                     │
└─────────────────────────────────────────────────────────────────┘

TARGET GROUPS ──▶ TARGET ASSIGNMENTS ──▶ ACHIEVEMENTS
     │                  │                      │
     │                  │                      ├──▶ INCENTIVE CALC
     │                  │                      │      │
     │                  │                      │      ├── Approved
     │                  │                      │      └── Paid
     │                  │                      │
     └── Product        └── Per-salesperson     └── Team Performance
         Targets            Targets                  Dashboard


┌─────────────────────────────────────────────────────────────────┐
│                    FIELD FORCE OPERATIONS FLOW                    │
└─────────────────────────────────────────────────────────────────┘

COVERAGE PLAN ──▶ COVERAGE ASSIGN. ──▶ VISIT (planned)
                     │                      │
                     │                      ├──▶ Check-in (GPS)
                     │                      ├──▶ Check-out (GPS)
                     │                      │      └── Order Taken?
                     │                      │            ├── Yes → Field Order
                     │                      │            └── No  → Outcome notes
                     │                      │
                     │                      └──▶ CRM Task Sync
                     │
                     └── Compliance Report
```

---

## 5. User Journey

### 5.1 Sales Rep (Staff)
```
1. DASHBOARD → View personal KPIs, today's visits, leads assigned
2. LEADS → View/manage assigned leads, log activities, convert to opportunity
3. PIPELINE → Track opportunities, update stages
4. VISITS → View scheduled visits, check-in/out with GPS, record outcomes
5. ORDERS → Create field orders during visits, submit quotations
6. TARGETS → View personal targets vs achievement
7. MERCHANDISING → Conduct display audits at outlets
8. COMPETITOR → Report competitor activities
9. SURVEY → Fill survey forms during visits
```

### 5.2 Supervisor / Team Lead
```
Everything in Sales Rep, plus:
- TEAMS → View team members and their performance
- VISITS → Monitor team visit completion
- TARGETS → View team-level targets vs actuals
- INCENTIVES → View team incentive calculations
- DASHBOARD → Team performance overview
```

### 5.3 Manager / Admin
```
Everything above, plus:
- CREATE/EDIT teams, target groups, incentive schemes
- APPROVE: quotations, field orders, incentives, workflows
- SETTINGS: geofences, parameters, currencies, plafons
- IMPORT/EXPORT data
- AUDIT TRAIL: full activity log
- INTEGRATION: CRM-SFA sync, HRIS sync
- AI WORKFLOW: automation rules
```

---

## 6. Tab Structure (Frontend)

The SFA page (`pages/hq/sfa/index.tsx`) is a **single-page application** with 24 tabs organized in 7 groups:

| Group | Tabs | Module |
|-------|------|--------|
| **Main** | Dashboard, Leads, Pipeline | sfa |
| **Customers** | Customers 360°, Communications | crm |
| **Productivity** | Tasks/Calendar, Forecasting, Automation | crm |
| **Field Force** | Teams/Territory, Visits/Coverage, Visit Plan/Tasks, Orders/Quotations | sfa |
| **Performance** | Sales Management, Targets/Achievement, Incentives/Commissions | sfa |
| **Intelligence** | Merchandising, Competitor, Survey, AI Workflow | sfa/crm |
| **Admin** | Approval, Integration, Audit Trail, Settings, Import/Export | sfa |

**Role-Based Visibility:**
- Staff sees operational tabs only
- Manager sees ALL tabs including admin/settings
- Module filter: tabs hide if CRM or SFA module is disabled for tenant

---

## 7. Technical Issues Identified

### 🔴 CRITICAL

#### 7.1 Raw SQL Queries — No ORM Usage
All 4 API files use raw SQL via `sequelize.query()` with string interpolation for dynamic SET clauses. This bypasses Sequelize's parameterized query protection in several places:
- `enhanced.ts` line 92: `const sets = Object.keys(fields).filter(k => [...].includes(k)).map(k => \`${k} = :${k}\`)` — field names come from request body
- `index.ts` lines 283-295, 378-391, 437-448, 546-551 — same pattern
- **Risk**: While values are parameterized, field names are concatenated directly

#### 7.2 Silent DB Failure Handling
All `q()` and `qExec()` functions catch errors silently:
```typescript
catch (e: any) { console.error('SFA DB Error:', e.message); return []; }
```
This means **API calls can return `{ success: true, data: [] }` when the database is down** — false success responses.

#### 7.3 Massive Page Size
`pages/hq/sfa/index.tsx` is **4,739 lines** — one of the largest files in the project. It contains all 24 tab renderings, CRUD modals, chart configs, and form logic in a single component.

#### 7.4 Heavy Mock Data Dependency
The page imports **50+ mock data arrays** from `@/lib/hq/mock-data`. If the API fails, the UI shows mock data via `rowsOr()`. This hides API failures from users and makes the module look functional when it's actually broken.

#### 7.5 Hardcoded Tax Rate
```typescript
const taxAmt = (subtotal - discountAmt) * 0.11; // PPN 11%
```
Indonesian PPN is hardcoded at 11% in quotations (index.ts) and field orders (advanced.ts) — should be configurable.

### 🟡 HIGH

#### 7.6 No Pagination on List Endpoints
- `getLeads`: `LIMIT 200` — no offset/pagination support
- `getOpportunities`: `LIMIT 200`
- `getActivities`: `LIMIT 100`
- `getVisits`: `LIMIT 200`
- `getQuotations`: `LIMIT 100`
- For tenants with thousands of records, this will cause memory/timeout issues.

#### 7.7 Missing Input Validation
- Lead creation: Only `contact_name` required — everything else optional (including email)
- Opportunity creation: Only `title` required
- Quotation creation: Only `customer_name` and `items` required
- Territory creation: No check for duplicate code
- No maximum length validation on string fields

#### 7.8 No Transaction Support
Multiple-table operations (create quotation + items, create field order + items, convert lead → opportunity) run individual INSERTs without transactions. A failure mid-operation can leave orphan records.

#### 7.9 Inconsistent Audit Trail
`fireAudit()` is called as fire-and-forget (`.catch(() => {})`). If audit logging fails, there's no rollback or notification. Audit events for GET operations are not logged.

#### 7.10 No Soft Delete
All DELETE operations are hard deletes (`DELETE FROM sfa_leads WHERE id = :id`). No `deleted_at` or `is_deleted` field on any model.

#### 7.11 Lead-to-Opportunity Conversion Missing Validation
`convertLead()` doesn't check if the lead is already converted — could create duplicate opportunities.

### 🟡 MEDIUM

#### 7.12 Duplicate Code Across API Files
Each API file (`index.ts`, `enhanced.ts`, `advanced.ts`, `sales-management.ts`) independently defines:
- `q()` / `qOne()` / `qExec()` helpers (identical patterns)
- Auth/session extraction
- Role checking (`isManager`)
- `fireAudit()` helper

This is ~50+ lines of duplicated code per file × 4 files = ~200+ lines of duplication.

#### 7.13 Lead Number Format Issue
Lead numbers use `COUNT(*)` to generate sequence numbers (`LD-0001`). This is **not thread-safe** — concurrent requests could get the same number. Should use a sequence table or UUID-based numbering.

#### 7.14 No Data Ownership Scoping for Staff
The API doesn't filter data by `assigned_to` or `created_by` for non-manager roles. Staff can potentially see all leads/opportunities in the tenant (though the UI tabs are role-restricted, the API is not).

#### 7.15 Check-in/out without Visit Ownership Check
`checkinVisit` / `checkoutVisit` don't verify that the current user owns the visit (doesn't check `salesperson_id` match). A staff could check in on another rep's visit.

#### 7.16 Missing Index Hints
No composite indexes mentioned in models for common query patterns:
- `(tenant_id, status)` on leads
- `(tenant_id, stage)` on opportunities
- `(tenant_id, period, status)` on targets

#### 7.17 POS Revenue Query Missing Tenant Filter
```typescript
posRevenue = await qOne(`SELECT ... FROM pos_transactions WHERE created_at >= date_trunc('month', CURRENT_DATE)`);
```
This query has **no tenant_id filter** — it could leak revenue data across tenants.

### 🟢 LOW

#### 7.18 Hardcoded Indonesian Language
All messages use Indonesian (`'Lead berhasil dibuat'`, `'Kunjungan dijadwalkan'`, etc.) while the frontend uses i18n. Messages should come from a locale file.

#### 7.19 `salesperson_id` Type Inconsistency
In `createVisit()` (index.ts line 484):
```typescript
const sp = salesperson_id != null && salesperson_id !== '' ? Number(salesperson_id) : Number(session?.user?.id) || 0;
```
This forcefully converts UUID to Number — `Number(uuid)` produces `NaN`, which gets stored as `0`.

#### 7.20 Visit `salesperson_id` Relationship
`SfaVisit.salespersonId` is `DataTypes.INTEGER` (references `users.id`) but all other models use `UUID` for IDs. This inconsistency could cause JOIN failures.

#### 7.21 AI Models & Mock Data Stubs
Several tables referenced in the UI (AI models, AI workflows, forecast analytics) appear to have no corresponding API implementations — they rely entirely on mock data.

---

## 8. Prioritized Fix List

### 🔴 Immediate (Critical)
| # | Issue | Impact | Suggested Fix |
|---|-------|--------|---------------|
| 1 | **Raw SQL injection risk** in dynamic SET clauses | Security | Use whitelist-only field mapping; validate field names against exact allowlist |
| 2 | **Silent DB failures** return false success | Data integrity | Return `success: false` with error details when queries fail |
| 3 | **POS revenue leak** — missing tenant filter | Data privacy | Add `AND tenant_id = :tid` to POS revenue query |
| 4 | **No DB transactions** for multi-table writes | Data integrity | Wrap multi-INSERT operations in transactions |
| 5 | **Hardcoded PPN 11%** | Compliance | Make tax rate configurable via `sfa_parameters` |

### 🟡 High Priority (Should Fix)
| # | Issue | Impact | Suggested Fix |
|---|-------|--------|---------------|
| 6 | **No pagination** on list endpoints | Performance/scalability | Add offset/limit/DB-level cursor pagination |
| 7 | **No soft delete** | Data recovery | Add `deleted_at` column; use `UPDATE ... SET deleted_at = NOW()` |
| 8 | **Inconsistent ID types** (UUID vs INTEGER) | Data integrity | Standardize all `salesperson_id` fields to same type as `users.id` |
| 9 | **Duplicate opportunity from lead** | Data quality | Check `status != 'converted'` before allowing conversion |
| 10 | **No data ownership scoping** for staff | Data privacy | Add `AND (created_by = :userId OR assigned_to = :userId)` for staff roles |

### 🟢 Medium Priority
| # | Issue | Impact | Suggested Fix |
|---|-------|--------|---------------|
| 11 | **Refactor API helpers** into shared module | Maintainability | Extract `q()`, `qExec()`, `fireAudit()` into shared lib |
| 12 | **Thread-unsafe lead numbering** | Race condition | Use DB sequence or UUID-based numbering |
| 13 | **Check-in without visit ownership** | Data integrity | Add `AND salesperson_id = :userId` to checkin/checkout WHERE |
| 14 | **Add composite indexes** | Performance | Add indexes on `(tenant_id, status)`, `(tenant_id, period)` |
| 15 | **Replace mock data fallback** with error state | UX | Show actual API error state instead of silently showing mock data |
| 16 | **Split massive SFA page** into per-tab lazy modules | Maintainability | Extract each tab into separate component file |

### ⚪ Nice-to-Have
| # | Issue | Impact | Suggested Fix |
|---|-------|--------|---------------|
| 17 | Support multiple tax rates (PPN, PPh) | Flexibility | Add `tax_type` field to quotations |
| 18 | Add field-level validation (email format, phone) | Data quality | Add validation middleware |
| 19 | Move hardcoded Indonesian strings to i18n | Localization | Use locale system for all API response messages |
| 20 | Add webhook support for external integrations | Extensibility | Fire events on lead conversion, visit completion |

---

## 9. Integration Points Summary

| System | Integration | Direction | Reliability |
|--------|------------|-----------|-------------|
| **POS** | Dashboard reads `pos_transactions` for revenue | SFA → POS (read) | ❌ Missing tenant filter |
| **CRM** | `visitTaskSync.ts` creates/updates `crm_tasks` from visits | SFA ↔ CRM (bidirectional) | ⚠️ Silent failures |
| **HRIS** | API queries `users` for salesperson data, team members | SFA → HRIS (read) | ✅ Read-only |
| **Inventory** | Products used in quotations and field orders | SFA → Inventory (read) | ✅ Read-only |
| **Marketing** | `MktCampaign` can have many `SfaLead` | SFA ← Marketing | ✅ Model-level only |

---

## 10. Key Metrics (Unified Dashboard Returns)

| Category | Metric | Source |
|----------|--------|--------|
| **Sales** | Total leads, new leads, converted, conversion rate, pipeline value, pipeline count | `sfa_leads`, `sfa_opportunities` |
| **Visits** | This month visits, completed | `sfa_visits` |
| **Teams** | Active teams | `sfa_teams` |
| **Targets** | Target groups, assignments | `sfa_target_groups` |
| **Incentives** | Schemes, pending calculations | `sfa_incentive_schemes` |
| **Coverage** | Total assignments, overdue visits | `sfa_coverage_assignments` |
| **Field Orders** | Monthly orders, revenue | `sfa_field_orders` |
| **Audits** | Monthly audits, avg compliance | `sfa_display_audits` |
| **Competitor** | Reports, unresolved | `sfa_competitor_activities` |
| **Approvals** | Pending requests | `sfa_approval_requests` |
| **Surveys** | Completed this month | `sfa_survey_responses` |

---

## 11. Conclusion

The SFA module is **architecturally comprehensive** — covering the full sales lifecycle, field force management, performance tracking, and incentive calculation. It follows a **layered API pattern** (core → enhanced → advanced) with a unified frontend SPA.

However, the implementation has **several critical issues** that need immediate attention:

1. **Security**: Raw SQL concatenation and missing tenant filters in key queries
2. **Data Integrity**: No transactions, no soft deletes, silent failure handling
3. **Scalability**: No pagination, no composite indexes, massive single-page frontend
4. **UX**: Mock data hides real API failures; no loading/error differentiation

The module is **functional for demos and small-scale use** but needs hardening before production deployment with real data volumes.
