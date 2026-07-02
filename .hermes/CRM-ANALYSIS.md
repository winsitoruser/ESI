# CRM Module Analysis Report

**Project:** Bedagang ERP — bedagang---PoS  
**Branch:** New-Backend-Nainerp  
**Date:** 2026-06-28  
**Analyst:** Hermes Agent (automated analysis)

---

## 1. Module Structure Overview

### 1.1 Architecture Pattern

```
pages/
├── api/hq/sfa/crm.ts              ← Single monolithic CRM API endpoint
└── api/hq/integrations/crm-sfa.ts ← CRM-SFA cross-module integration API
└── hq/sfa/index.tsx                ← Monolithic 4739-line page (CRM + SFA in one file)
└── hq/sfa/enhanced.tsx             ← SFA Enhanced (no CRM-specific)
└── hq/sfa/advanced.tsx             ← SFA Advanced (no CRM-specific)

backend/src/
├── routes/crm.routes.ts            ← Express.js CRM routes (separate backend, NOT used by pages)
└── models/crm.models.ts            ← Express.js CRM models (different schema from Next.js models)

models/*.js                         ← 25 Sequelize model files (used by Next.js API via raw SQL)

migrations/
├── 20260301-create-crm-tables.js   ← Creates all 25 CRM tables
├── 20260301-add-crm-sfa-integration-columns.js
├── 20260301-seed-crm-sfa-modules.js
├── 20260421-crm-tasks-visit-purpose.js
└── 20260423-crm-tasks-sfa-visit-link.js

modules/customers/module-crm-enhanced.tsx  ← Legacy CRM customer module (separate UI, different API)
```

### 1.2 Architecture Issues

| Issue | Severity | Description |
|-------|----------|-------------|
| **No dedicated CRM pages directory** | HIGH | CRM tabs are mixed into the SFA page; no `pages/hq/crm/` directory exists |
| **Monolithic API endpoint** | HIGH | All CRM operations go through a single `pages/api/hq/sfa/crm.ts` with action-based routing |
| **Monolithic SFA page** | HIGH | `pages/hq/sfa/index.tsx` is 4739 lines handling both SFA and CRM in one file |
| **Two model systems** | HIGH | Sequelize model wrappers (`models/Crm*.js`) coexist with Express backend models (`backend/src/models/crm.models.ts`) using different schemas |
| **Mixed API route pattern** | MEDIUM | CRM call path: `pages/api/hq/sfa/crm?action=customers` — confusingly nested under `/sfa/` |

---

## 2. CRM Pages & Tabs (within SFA Module)

### 2.1 CRM Tab Definitions

From `pages/hq/sfa/index.tsx` (lines 87-126), CRM-specific tabs in the unified SFA/CRM page:

| Tab ID | Label | Group | Module |
|--------|-------|-------|--------|
| `customers` | Customer 360° | groupCustomers | crm |
| `communications` | Communication Hub | groupCustomers | crm |
| `tasks` | Tasks & Calendar | groupProductivity | crm |
| `forecasting` | Forecasting | groupProductivity | crm |
| `automation` | Automation | groupProductivity | crm |
| `integration` | Integration (CRM↔SFA) | groupAdmin | crm, sfa |

### 2.2 Tab Rendering Locations

| Tab | Line Range | UI Pattern | Notes |
|-----|-----------|------------|-------|
| customers | 2996-3150 | Table + Kanban card + Modal forms | Full CRUD, CSV import, analytics charts |
| communications | 3154-3235 | Table + Create modal | Log comms, view follow-ups |
| tasks | 3240-3241 | `TaskCalendarModule` (lazy-loaded component) | External module from `@/components/sfa/TaskCalendarModule` |
| forecasting | 3250-3317 | Table + Charts | Line/bar charts, pie charts for deal scores |
| automation | 3321-3687 | Table + Create modal | Rule CRUD, execution log viewer |
| integration | 3691-3870 | Dashboard cards + Action buttons | Convert leads, link visits, sync forecasts |

### 2.3 Missing CRM Pages (UX Gaps)

| Missing Feature | Impact | Recommended Action |
|----------------|--------|--------------------|
| Service/Ticketing tab | HIGH | `crmTickets` state exists but NO corresponding tab in the navigation |
| Documents tab | HIGH | Models and API support documents, but no tab in the UI |
| Email templates tab | MEDIUM | API supports `email-templates` GET/POST, but no tab renders them |
| Campaigns tab | MEDIUM | API supports `comm-campaigns` GET, but no tab renders them |
| SLA policies tab | MEDIUM | API supports `sla-policies` GET and `create-sla-policy`, but no tab |
| Satisfaction surveys tab | MEDIUM | API supports `satisfaction` GET, but no tab |
| Saved reports / dashboards | LOW | Models exist (`CrmSavedReport`, `CrmCustomDashboard`), no UI anywhere |
| Document templates | LOW | Models exist (`CrmDocumentTemplate`), no UI |
| Task templates | LOW | Models exist (`CrmTaskTemplate`), no UI |
| Customer tags | LOW | Model exists (`CrmCustomerTag`), no UI |
| Deal scores tab | LOW | API supports `deal-scores` GET, but no dedicated tab |

---

## 3. CRM API Endpoint Analysis

### 3.1 `/pages/api/hq/sfa/crm.ts` — Monolithic CRM API

**Architecture:** Single handler with `action` query parameter switching

**Authentication:** NextAuth session, tenant-scoped (`tenantId`), role-aware

**Response format:** `{ success: boolean, data?: any, error?: string }`

#### GET Actions (Read)

| Action | Purpose | Tenant-isolated | Pagination |
|--------|---------|-----------------|------------|
| `crm-dashboard` | Full CRM dashboard stats | ✅ | ❌ (aggregated) |
| `customers` | List customers | ✅ | ❌ (LIMIT 200) |
| `customer-detail` | Customer 360° detail | ✅ | ❌ |
| `customer-timeline` | Timeline of interactions | ✅ | ❌ (LIMIT 50) |
| `contacts` | List contacts | ✅ | ❌ (LIMIT 200) |
| `segments` | List segments | ✅ | ❌ |
| `customer-analytics` | Customer analytics | ✅ | ❌ |
| `communications` | List communications | ✅ | ❌ (LIMIT 100) |
| `follow-ups` | List follow-ups | ✅ | ❌ (LIMIT 100) |
| `email-templates` | List email templates | ✅ | ❌ |
| `comm-campaigns` | List campaigns | ✅ | ❌ |
| `tasks` | List tasks | ✅ | ❌ (LIMIT 200) |
| `task-summary` | Task statistics | ✅ | ❌ |
| `calendar-events` | Calendar events | ✅ | ❌ (LIMIT 200) |
| `forecasts` | List forecasts | ✅ | ❌ (LIMIT 50) |
| `deal-scores` | List deal scores | ✅ | ❌ (LIMIT 50) |
| `forecast-analytics` | Forecast analytics | ✅ | ❌ |
| `tickets` | List tickets | ✅ | ❌ (LIMIT 200) |
| `ticket-detail` | Ticket detail | ✅ | ❌ |
| `sla-policies` | List SLA policies | ✅ | ❌ |
| `satisfaction` | List satisfaction surveys | ✅ | ❌ (LIMIT 100) |
| `service-analytics` | Service analytics | ✅ | ❌ |
| `automation-rules` | List automation rules | ✅ | ❌ |
| `automation-logs` | List automation logs | ✅ | ❌ (LIMIT 100) |
| `documents` | List documents | ✅ | ❌ (LIMIT 100) |
| `document-templates` | List document templates | ✅ | ❌ |

#### POST Actions (Create)

| Action | Access | Notes |
|--------|--------|-------|
| `create-customer` | All users | ✅ |
| `import-customers-csv` | Manager+ | CSV parser, hardcoded INSERT |
| `create-contact` | All users | ✅ |
| `create-interaction` | All users | Updates `last_interaction_date` |
| `create-communication` | All users | ✅ |
| `create-follow-up` | All users | ✅ |
| `create-task` | All users | Supports `purpose`, `sfa_visit_id` fields |
| `create-calendar-event` | All users | ✅ |
| `create-ticket` | All users | Auto-calculates SLA deadlines |
| `create-ticket-comment` | All users | Auto-updates `first_response_at` |
| `create-forecast` | All users | ✅ |
| `create-document` | All users | ✅ |
| `create-automation-rule` | Manager+ | ✅ |
| `create-segment` | Manager+ | ✅ |
| `create-email-template` | All users | ✅ |
| `create-sla-policy` | All users | ✅ |

#### PUT Actions (Update)

| Action | Notes |
|--------|-------|
| `update-customer` | Generic dynamic SET builder |
| `update-contact` | Generic dynamic SET builder |
| `update-communication` | Generic dynamic SET builder |
| `update-task` | Auto-sets `completed_date` if status=completed |
| `update-ticket` | Auto-sets `resolved_at`, checks SLA breach |
| `update-follow-up` | Auto-sets `completed_date` if status=completed |
| `update-forecast` | Generic dynamic SET builder |
| `update-document` | Generic dynamic SET builder |
| `update-calendar-event` | Generic dynamic SET builder |
| `update-automation-rule` | JSON-serializes conditions/actions |

#### DELETE Actions

All DELETE operations require Manager+ role. Single generic `deleteCrmEntity` function handles all tables.

**⚠️ Missing DELETE endpoints:** `segments`, `email-templates` listed in switch but `segments` maps to `crm_customer_segments` and `email-templates` to `crm_email_templates`. However the entity ID matching has no update endpoint for segments or email templates (PUT missing).

### 3.2 API Quality Assessment

| Criterion | Rating | Notes |
|-----------|--------|-------|
| Consistent response format | ✅ | `{ success, data, error }` throughout |
| Authentication | ✅ | NextAuth + session |
| Tenant isolation | ✅ | All queries filter by `tenant_id` |
| Role-based access | ✅ | Manager-only for delete, automation, segments |
| Audit logging | ✅ | Fire-and-forget audit via `logAudit()` |
| Input validation | ⚠️ | Minimal — mostly passes body directly to SQL |
| SQL injection safety | ✅ | Uses parameterized queries via Sequelize |
| Pagination | ❌ | No offset/limit params — hardcoded LIMITs only |
| Sorting | ⚠️ | Hardcoded ORDER BY per action, no client control |
| Filtering | ⚠️ | Only basic filters (customer_id, date range for calendar) |
| Search | ❌ | No search/filter query params |
| Field selection | ❌ | SELECT * everywhere |
| Rate limiting | ❌ | None |
| Request validation | ❌ | No Joi/Zod schema validation |
| Error response detail | ❌ | Generic 500 errors, sometimes leaks SQL errors |

### 3.3 `/pages/api/hq/integrations/crm-sfa.ts`

GET actions: `health`, `convertible-leads`, `unlinkable-visits`, `syncable-pipeline`  
POST actions: `convert-lead`, `bulk-convert-leads`, `link-visit`, `bulk-link-visits`, `sync-pipeline-forecast`

This is a separate integration API that bridges CRM ↔ SFA. Well-designed with clear actions and bulk operations.

---

## 4. CRM Models (25 Sequelize Models)

### 4.1 Model Inventory

| # | Model | Table | Fields | Associations |
|---|-------|-------|--------|--------------|
| 1 | CrmCustomer | crm_customers | 40+ fields (name, company, address, lifecycle, scoring, financial, stats) | HasMany: contacts, interactions, communications, followUps, tasks, tickets, documents |
| 2 | CrmContact | crm_contacts | 16 fields (name, title, email, phone, whatsapp, is_primary, is_decision_maker, etc.) | BelongsTo: CrmCustomer |
| 3 | CrmInteraction | crm_interactions | 18 fields (type, direction, subject, outcome, duration, sentiment, channel, etc.) | BelongsTo: CrmCustomer, CrmContact |
| 4 | CrmCustomerSegment | crm_customer_segments | 14 fields (name, code, type, RFM weights, rules, customer_count, revenue) | None |
| 5 | CrmCustomerTag | crm_customer_tags | 5 fields (name, color, category, usage_count) | None |
| 6 | CrmCommunication | crm_communications | 27 fields (type, direction, call, email, meeting, scheduling, outcome, etc.) | BelongsTo: CrmCustomer, CrmContact |
| 7 | CrmFollowUp | crm_follow_ups | 15 fields (title, type, priority, due_date, reminder, assigned_to) | BelongsTo: CrmCustomer |
| 8 | CrmEmailTemplate | crm_email_templates | 13 fields (name, category, subject, body_html, body_text, variables, stats) | None |
| 9 | CrmCommCampaign | crm_comm_campaigns | 13 fields (name, type, status, schedule, delivery stats) | None |
| 10 | CrmTask | crm_tasks | 25 fields (title, type, priority, status, due dates, assigned, checklist, recursion) | BelongsTo: CrmCustomer, CrmContact |
| 11 | CrmTaskTemplate | crm_task_templates | 10 fields (name, type, priority, due_days_offset, checklist, auto_assign_role) | None |
| 12 | CrmCalendarEvent | crm_calendar_events | 22 fields (title, type, start/end, location, virtual, recurring, attendees, reminders) | BelongsTo: CrmCustomer |
| 13 | CrmForecast | crm_forecasts | 20 fields (period, targets, actuals, best/most_likely/worst, accuracy, assignment) | HasMany: CrmForecastItem |
| 14 | CrmForecastItem | crm_forecast_items | 12 fields (category, amount, probability, weighted, close_date, stage) | BelongsTo: CrmForecast |
| 15 | CrmDealScore | crm_deal_scores | 15 fields (engagement, fit, behavior, timing, overall, signals, risk, win_probability) | None |
| 16 | CrmTicket | crm_tickets | 28 fields (subject, category, priority, status, SLA, escalation, resolution, satisfaction) | BelongsTo: CrmCustomer; HasMany: CrmTicketComment; BelongsTo: CrmSlaPolicy |
| 17 | CrmTicketComment | crm_ticket_comments | 7 fields (type, body, is_public, attachments) | BelongsTo: CrmTicket |
| 18 | CrmSlaPolicy | crm_sla_policies | 13 fields (response/resolution times per severity, escalation, business_hours) | None |
| 19 | CrmSatisfaction | crm_satisfaction | 10 fields (survey_type, score, comment, trigger_event, channel) | BelongsTo: CrmCustomer |
| 20 | CrmAutomationRule | crm_automation_rules | 15 fields (type, trigger_event, conditions, actions, schedule, execution stats) | HasMany: CrmAutomationLog |
| 21 | CrmAutomationLog | crm_automation_logs | 8 fields (trigger, entity, status, executed actions, error, execution_time) | BelongsTo: CrmAutomationRule |
| 22 | CrmDocument | crm_documents | 18 fields (type, version, file, content, tracking, financial) | BelongsTo: CrmCustomer |
| 23 | CrmDocumentTemplate | crm_document_templates | 7 fields (type, content_html, variables, usage_count) | None |
| 24 | CrmSavedReport | crm_saved_reports | 9 fields (type, config JSON, schedule, is_public, is_favorite) | None |
| 25 | CrmCustomDashboard | crm_custom_dashboards | 8 fields (layout JSON, is_default, is_public, owner) | None |

### 4.2 Model Quality Assessment

| Criterion | Rating | Notes |
|-----------|--------|-------|
| Comprehensive coverage | ✅ | Covers 7 business domains thoroughly |
| UUID primary keys | ✅ | All use UUID v4 |
| Tenant isolation | ✅ | All have `tenant_id` field |
| Timestamps | ✅ | All have `created_at`/`updated_at` |
| JSONB fields | ✅ | Used for tags, custom_fields, metadata |
| Model associations | ⚠️ | Many models have no associations defined (e.g., CrmCustomerSegment, CrmForecastItem missing BelongsTo for CrmForecast) |
| Index coverage | ✅ | Migration creates 25+ indexes |
| Soft delete | ⚠️ | Only `CrmCustomer` model uses `paranoid: true` |
| Schema mismatch | ⚠️ | `backend/src/models/crm.models.ts` uses INTEGER auto-increment PKs and different column names — **two separate schema systems coexist** |

---

## 5. Business Process Flows

### 5.1 Lead → Customer → Loyalty Flow

```
SFA Lead → Convert (crm-sfa integration) → CRM Customer → Track interactions
                                                               ↓
                                              Communication Hub → Log calls/emails/meetings
                                              Follow-ups → Reminders
                                              Tasks → Assign/monitor
                                              Forecast → Track revenue targets
                                              Tickets → Service/support
                                              Satisfaction → CSAT/NPS
                                              Documents → Contracts/proposals
```

**⚠️ GAPS:**
- No loyalty/rewards system integration — `CrmCustomer` has `tier` field but no loyalty points, redemption, or membership management
- No campaign-to-conversion tracking — `CrmCommCampaign` exists but no link to pipeline revenue
- No automated lead scoring from engagement data
- `CrmCustomer.lifecycle_stage` is manually set, no automated progression

### 5.2 Customer 360° Flow

```
GET customers → GET customer-detail → Returns:
  - customer (master record)
  - contacts (all contacts)
  - interactions (last 20)
  - tickets (last 10)
  - communications (last 10)
  - documents (last 10)
  - satisfaction (last 5)
```

**✅ Complete:** Customer detail API aggregates all sub-entities  
**⚠️ Missing from API:** Tasks, Follow-ups, Deal scores for a specific customer  
**⚠️ Missing from UI:** No customer detail page — only inline table rows

### 5.3 Communication Flow

```
Create Communication → If follow-up needed → Create Follow-Up with due_date
                        ↓
                   Create Task → Assign to user/team
```

**⚠️ GAPS:**
- No email sending integration (SMTP/API)
- No WhatsApp integration
- `call_recording_url` field exists but no actual recording storage
- Campaigns have no actual sending mechanism
- No real-time notification system for follow-ups

### 5.4 Task & Calendar Flow

```
Create Task → Set priority, status, due_date → Assign to user/team
              ↓
        TaskCalendarModule (external component) → Calendar view
              ↓
        Update task → Complete → Auto-log in interaction history
```

**✅** Task-to-SFA-visit linking via `sfa_visit_id` field  
**✅** Recurring tasks supported  
**⚠️** Task template usage not implemented in API

### 5.5 Forecasting Flow

```
Create Forecast → Set period, targets → Auto-calculate actuals from deals
                  ↓
            Add ForecastItems from pipeline (or manual)
                  ↓
            Track accuracy vs actuals
```

**⚠️ GAPS:**
- Forecast actuals are NOT auto-calculated from CRM deals
- No revenue recognition from orders
- Items linked to SFA opportunities only via integration API (`sync-pipeline-forecast`), not automatic

### 5.6 Service/Ticketing Flow

```
Create Ticket → Auto-apply SLA → Set first_response_due, resolution_due
                ↓
          Add Comments → Set first_response_at
                ↓
          Resolve → Check SLA breach → Optionally request satisfaction
```

**✅** SLA automatic calculation  
**✅** SLA breach detection on resolution  
**⚠️** No automatic escalation based on SLA violation  
**⚠️** No satisfaction survey sending mechanism  
**⚠️** Ticket tab NOT rendered in any page

### 5.7 Automation Flow

```
Define Rule → Set trigger_event, conditions, actions → Activate
                ↓
          On trigger → Evaluate conditions → Execute actions → Log execution
```

**⚠️ GAPS:**
- **No actual automation runtime exists.** The `actions` JSON is stored but never executed
- No cron/scheduled job runner for `schedule_cron` rules
- No webhook support
- No event emitter/bus for triggers
- **Automation is essentially a configuration UI with no engine**

---

## 6. User Journey Map

### Current Journey (CRM tabs within SFA page)

```
1. User lands on /hq/sfa → Sees SFA dashboard
2. Clicks "Customers" tab → Sees customer table → Clicks row → Opens edit modal
3. Clicks "Communications" tab → Sees comm log → Creates new communication via modal
4. Clicks "Tasks" tab → External TaskCalendarModule component
5. Clicks "Forecasting" tab → Forecast table + charts
6. Clicks "Automation" tab → Rule table → Creates rule via modal
7. Clicks "Integration" tab → Dashboard showing CRM-SFA sync status
```

### Journey Gaps

| Step | Issue | Impact |
|------|-------|--------|
| Customer detail view | No dedicated detail page — only inline table | Cannot see full 360° view naturally |
| Creating interaction from customer view | Must switch tabs | No contextual interaction logging |
| Ticket management | No UI at all | Service desk cannot use CRM |
| Documents | No UI at all | Cannot manage customer documents |
| Campaign creation | No UI at all | Marketing campaigns not possible |
| Cross-tab navigation | Must switch tabs and re-fetch data | Slow UX, no context preservation |
| Bulk operations | Only CSV import for customers | No bulk contact, task, or ticket operations in UI |

---

## 7. Technical Findings

### 7.1 Critical Issues

| # | Issue | Severity | Details | Recommendation |
|---|-------|----------|---------|----------------|
| C1 | **Automation engine missing** | CRITICAL | Rules are stored but never executed | Build a trigger event system + cron runner |
| C2 | **SQL injection via dynamic SET builder** | HIGH | `updateCustomer`, `updateCommunication`, etc. use dynamic column building: `Object.keys(fields).map(k => \`${k} = :${k}\`)` — the key `k` is NOT validated against allowed columns | Whitelist allowed columns per entity |
| C3 | **No input validation** | HIGH | No Zod/Joi schema validation on any endpoint | Add Zod schemas for all POST/PUT requests |
| C4 | **Monolithic 4739-line page** | HIGH | All CRM+SFA UI in one React component | Split into separate page files per tab |
| C5 | **Two incompatible model systems** | HIGH | `models/Crm*.js` (Sequelize UUID) vs `backend/src/models/crm.models.ts` (Express INT auto-inc) | Align on one ORM approach |
| C6 | **No tickets/documents UI** | HIGH | APIs exist but no pages render them | Add ticket management and document tabs |

### 7.2 Gaps & Missing Features

| # | Gap | Domain | Effort |
|---|-----|--------|--------|
| G1 | No pagination/search/filter on any list API | All | Medium |
| G2 | No Export functionality for CRM data (Excel/PDF) | All | Medium |
| G3 | No email sending integration | Communication | High |
| G4 | No WhatsApp integration | Communication | High |
| G5 | No loyalty/rewards system | Customer | High |
| G6 | No customer portal/self-service | Service | High |
| G7 | No automated lifecycle stage transitions | Customer | Medium |
| G8 | No activity feed / timeline widget | Dashboard | Medium |
| G9 | No notification system (email/push) | All | High |
| G10 | No reporting/analytics dashboard | Analytics | Medium |
| G11 | No rate limiting or DDOS protection | API | Low |
| G12 | No API versioning | API | Low |
| G13 | No OpenAPI/Swagger documentation | API | Low |
| G14 | No integration tests | QA | Medium |
| G15 | No Sentry/error monitoring | Ops | Low |

### 7.3 API Pattern Analysis

| Pattern | Status | Notes |
|---------|--------|-------|
| Response format | ✅ Consistent | `{ success, data, error }` |
| Auth middleware | ✅ Present | `getServerSession`, role checks |
| Tenant isolation | ✅ Strong | Every query includes `tenant_id` |
| Module guard | ✅ `withModuleGuard('crm')` | Ensures CRM module is enabled |
| Audit logging | ✅ Fire-and-forget | Added to all write operations |
| Error handling | ⚠️ Inconsistent | Some errors `res.status(500).json(...)`, others return error strings |
| Async handler wrapper | ❌ Missing | Would reduce try/catch boilerplate |
| Request/Response typing | ⚠️ Partial | Some actions not fully typed |
| Rate limiting | ❌ Missing | None |
| CORS | ❌ Not applicable | Next.js handles |

### 7.4 Mock Data Pattern

**Pattern:** Every data state in the page initializes with mock data, then overwrites on successful API fetch:

```typescript
const [crmCustomers, setCrmCustomers] = useState<any[]>(MOCK_SFA_CRM_CUSTOMERS);
// fetch...
if (r1.success) setCrmCustomers(rowsOr(r1.data, MOCK_SFA_CRM_CUSTOMERS));
```

**Problems:**
- Mock data uses a different schema than real DB data
- When DB is available, mock data flashes briefly before real data loads
- Mock data is extremely limited (e.g., only 1 mock ticket, 1 mock automation rule)
- Hard to distinguish real data from mock during development

---

## 8. Business Domain Coverage Matrix

| Domain | Models | API Endpoints | UI Available | Status |
|--------|--------|---------------|--------------|--------|
| Customer 360° | CrmCustomer, CrmContact, CrmCustomerSegment, CrmCustomerTag | 5 GET, 4 POST, 3 PUT, 2 DELETE | ✅ Tab exists | ✅ Complete |
| Communication Hub | CrmCommunication, CrmFollowUp, CrmEmailTemplate, CrmCommCampaign | 5 GET, 4 POST, 2 PUT, 3 DELETE | ⚠️ Partial (no campaigns/templates UI) | ⚠️ Partial |
| Tasks & Calendar | CrmTask, CrmTaskTemplate, CrmCalendarEvent | 4 GET, 4 POST, 2 PUT, 3 DELETE | ✅ Tab + external component | ✅ Complete |
| Sales Forecasting | CrmForecast, CrmForecastItem, CrmDealScore | 4 GET, 2 POST, 1 PUT, 1 DELETE | ✅ Tab exists | ⚠️ Partial (auto-actuals missing)|
| Service/Ticketing | CrmTicket, CrmTicketComment, CrmSlaPolicy, CrmSatisfaction | 4 GET, 3 POST, 1 PUT, 1 DELETE | ❌ No UI tab | ⚠️ API complete, UI missing |
| Automation | CrmAutomationRule, CrmAutomationLog | 2 GET, 2 POST, 1 PUT, 2 DELETE | ✅ Tab exists | ❌ Engine missing |
| Documents | CrmDocument, CrmDocumentTemplate | 2 GET, 2 POST, 1 PUT, 1 DELETE | ❌ No UI tab | ⚠️ API partial, UI missing |
| Analytics | CrmSavedReport, CrmCustomDashboard | None | ❌ No UI | ❌ Not implemented |

---

## 9. Prioritized Fix List

### 🔴 Critical (Fix Immediately)

| # | Item | Reason |
|---|------|--------|
| 1 | **Validate SQL dynamic SET keys** | SQL injection risk in all update functions |
| 2 | **Add input validation (Zod)** | All POST/PUT bodies unvalidated |
| 3 | **Add tickets tab to SFA page** | Customers cannot file tickets; API already complete |

### 🟠 High (Fix Soon)

| # | Item | Reason |
|---|------|--------|
| 4 | **Split monolithic SFA page** | 4739 lines is unmaintainable; split into pages/hq/crm/{customers,communications,...} |
| 5 | **Split CRM API out of /sfa/crm** | Move to pages/api/hq/crm/*.ts for cleaner routing |
| 6 | **Add pagination to all list endpoints** | LIMIT 200 is OK initially, but no offset/sort/search is limiting |
| 7 | **Add documents tab to UI** | Documents API exists, just needs a tab |
| 8 | **Reconcile dual model systems** | Choose one ORM strategy (Sequelize UUID or Express INT auto-inc) |

### 🟡 Medium (Plan for Next Sprint)

| # | Item | Reason |
|---|------|--------|
| 9 | **Build automation engine** | Rules stored but never run — wasted feature |
| 10 | **Add Customer detail page (not just modal)** | Need proper 360° view with timeline |
| 11 | **Add loyalty/rewards to Customer model** | tier field exists but no points/redemption |
| 12 | **Add search/filter to all CRM lists** | Users need to search customers, tickets, etc. |
| 13 | **Add email sending integration** | Communication logging without actual sending is incomplete |
| 14 | **Add campaigns tab + sending UI** | Campaign model exists, but no way to execute |

### 🟢 Low (Backlog)

| # | Item | Reason |
|---|------|--------|
| 15 | Add task templates UI | Model exists, no UI |
| 16 | Add document templates UI | Model exists, no UI |
| 17 | Add saved reports/Custom dashboards | Models exist, no UI or API |
| 18 | Add customer tags UI | Model exists, no UI |
| 19 | Add API documentation (Swagger/OpenAPI) | Missing dev docs |
| 20 | Add export to Excel/CSV for all lists | Users will need this |
| 21 | Add notification system (follow-up reminders) | FollowUp model has reminder fields but no sending |

---

## 10. Conclusion

The CRM module has **strong data model coverage** (25 tables, 7 business domains) and **comprehensive API endpoints** (26 GET, 16 POST, 10 PUT, 12 DELETE actions) but suffers from:

1. **Architecture debt** — monolithic page + monolithic API endpoint + dual model systems
2. **Missing UI** — Tickets, documents, campaigns, and SLA features have APIs but no user interface
3. **Critical security gap** — Dynamic SQL in update functions without column whitelisting
4. **No automation engine** — Rules are configurable but never executed
5. **No pagination/search** — All list endpoints are limited with no client control

The module is **functional for basic CRM** (customer management, communication logging, tasks, forecasting) but needs significant investment in **UI completion, security hardening, and missing execution engines** (automation, email sending, campaign execution) to become production-ready.
