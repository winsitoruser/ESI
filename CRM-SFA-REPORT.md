# BEDAGANG ERP — CRM/SFA/Marketing API Audit Report

**Generated:** 2026-07-02  
**Audit Scope:** API Routes, CRUD Operations, Authentication  
**Target:** `pages/api/hq/sfa/`, `pages/api/hq/marketing/`, `pages/api/customers/`

---

## Executive Summary

| Metric | Value |
|--------|-------|
| **Total API Files (Project)** | 776 |
| **Total Actions/Endpoints** | 1,938 |
| **SFA Module Files** | 13 |
| **SFA Actions** | 321 |
| **CRM Actions** | 65 |
| **Marketing Module Files** | 2 |
| **Marketing Actions** | 17 |
| **Customers Module Files** | 16 |
| **Customers Actions** | 5 |

---

## 1. CRM Module Analysis

### 1.1 Customers API (`/api/customers/`)

| Endpoint | File | Actions |
|----------|------|---------|
| `/api/customers/[id]` | `pages/api/customers/[id].ts` | 0 (REST-style) |
| `/api/customers/create` | `pages/api/customers/create.ts` | 0 |
| `/api/customers/crud` | `pages/api/customers/crud.ts` | 0 |
| `/api/customers/[id]/detail` | `pages/api/customers/[id]/detail.ts` | 0 |
| `/api/customers/index` | `pages/api/customers/index.ts` | 0 |
| `/api/customers/list` | `pages/api/customers/list.ts` | 0 |
| `/api/customers/loyalty-programs` | `pages/api/customers/loyalty-programs.ts` | 0 |
| `/api/customers/purchase-history` | `pages/api/customers/purchase-history.ts` | 0 |
| `/api/customers/reports` | `pages/api/customers/reports.ts` | 5 actions |
| `/api/customers/statistics` | `pages/api/customers/statistics.ts` | 0 |
| `/api/customers/stats` | `pages/api/customers/stats.ts` | 0 |
| `/api/customers/[id]/update` | `pages/api/customers/[id]/update.ts` | 0 |

**Customer Report Actions:**
- `overview`
- `purchase-behavior`
- `retention`
- `segmentation`
- `top-customers`

### 1.2 CRM API (`/api/hq/sfa/crm.ts`) — 65 Actions

**Core CRM Operations:**

| Category | Actions |
|----------|---------|
| **Customers** | `customers`, `customer-detail`, `customer-analytics`, `customer-timeline`, `create-customer`, `update-customer`, `delete-customer`, `import-customers-csv` |
| **Contacts** | `contacts`, `create-contact`, `update-contact`, `delete-contact` |
| **Leads** | (in `/api/hq/sfa/index.ts`) |
| **Tasks** | `tasks`, `create-task`, `update-task`, `delete-task`, `task-summary` |
| **Tickets/Service** | `tickets`, `ticket-detail`, `create-ticket`, `update-ticket`, `delete-ticket`, `create-ticket-comment`, `service-analytics`, `satisfaction` |
| **Calendar** | `calendar-events`, `create-calendar-event`, `update-calendar-event`, `delete-calendar-event` |
| **Communications** | `communications`, `comm-campaigns`, `create-communication`, `update-communication`, `delete-communication` |
| **Documents** | `documents`, `document-templates`, `create-document`, `update-document`, `delete-document` |
| **Email Templates** | `email-templates`, `create-email-template`, `delete-email-template` |
| **Follow-ups** | `follow-ups`, `create-follow-up`, `update-follow-up`, `delete-follow-up` |
| **Forecasts** | `forecasts`, `forecast-analytics`, `create-forecast`, `update-forecast`, `delete-forecast` |
| **Segments** | `segments`, `create-segment`, `delete-segment` |
| **SLA Policies** | `sla-policies`, `create-sla-policy` |
| **Automation** | `automation-rules`, `automation-logs`, `create-automation-rule`, `update-automation-rule`, `delete-automation-rule` |
| **Analytics** | `crm-dashboard`, `deal-scores` |

---

## 2. SFA (Sales Force Automation) Module Analysis

### 2.1 SFA Module Overview

| File | Actions | Description |
|------|---------|-------------|
| `sfa/advanced.ts` | 52 | Advanced SFA: geofence, commission, competitors, coverage, surveys, strategies |
| `sfa/ai-workflow.ts` | 16 | AI/ML workflows: lead scoring, forecasting, segmentation, model catalog |
| `sfa/audit-trail.ts` | 5 | Audit logging: entity timeline, filters, log, summary |
| `sfa/crm.ts` | 65 | CRM core: customers, contacts, tasks, tickets, communications |
| `sfa/data-export.ts` | 0 | Data export utilities |
| `sfa/enhanced.ts` | 53 | Enhanced SFA: incentives, targets, teams, currencies, taxes, plafon |
| `sfa/hris-sync.ts` | 8 | HRIS integration: sync employees, departments, teams |
| `sfa/import-export.ts` | 6 | Import/export: entities, export, import, template, validate |
| `sfa/index.ts` | 32 | Core SFA: leads, opportunities, visits, activities, quotations, pipeline |
| `sfa/lookup.ts` | 9 | Lookup tables: options, defaults, categories |
| `sfa/notifications.ts` | 5 | Notifications: reminders, my-notifications, mark-read |
| `sfa/sales-management.ts` | 56 | Sales management: entries, targets, KPIs, performance, pareto analysis |
| `sfa/task-calendar.ts` | 14 | Task & Calendar: Kanban board, Gantt, calendar, holidays |

### 2.2 Core SFA Actions (`sfa/index.ts` — 32 actions)

**Leads Management:**
- `leads`, `lead-detail`, `create-lead`, `update-lead`, `delete-lead`, `convert-lead`

**Opportunities & Pipeline:**
- `opportunities`, `create-opportunity`, `update-opportunity`, `delete-opportunity`
- `pipeline`, `create-quotation`, `update-quotation`, `delete-quotation`, `quotations`

**Field Visits:**
- `visits`, `create-visit`, `update-visit`, `checkin-visit`, `checkout-visit`

**Activities:**
- `activities`, `create-activity`, `update-activity`, `delete-activity`

**Territory & Targets:**
- `territories`, `create-territory`, `targets`, `create-target`, `update-target`

**Dashboard:**
- `dashboard`, `unified-dashboard`, `route-plans`

### 2.3 Sales Management (`sales-management.ts` — 56 actions)

**Sales Entries:**
- `sales-entries`, `sales-entry-detail`, `create-sales-entry`, `update-sales-entry`, `delete-sales-entry`
- `bulk-sales-entry`, `import-csv`, `import-from-field-orders`, `export-csv`, `csv-template`

**Performance Analysis:**
- `sales-dashboard`, `sales-trend`, `sales-funnel`, `advanced-kpis`
- `performance-branch`, `performance-team`, `performance-territory`, `salespersons`, `salesperson-detail`, `salesperson-scorecard`
- `leaderboard`, `mtd-ytd-run`

**Target Management:**
- `item-targets`, `create-item-target`, `update-item-target`, `delete-item-target`
- `outlet-growth-targets`, `create-outlet-growth-target`, `update-outlet-growth-target`, `delete-outlet-growth-target`

**Outlet Analysis:**
- `outlet-coverage`, `outlet-transactions`, `outlet-order-behavior`
- `pareto-outlets`, `pareto-products`, `pareto-salespersons`, `pareto-product-target`
- `distribution`, `distribution-per-product`, `entries-drilldown`

**vs Target Reporting:**
- `vs-target-global`, `vs-target-outlet`, `vs-target-product`, `vs-target-product-group`, `vs-target-salesperson`

**Integration:**
- `integration-config`, `update-integration-config`, `integration-health`
- `check-stock`, `reverse-stock`, `stock-locations`, `item-catalog`, `item-detail`, `product-categories`, `lookup-filters`, `growth-analysis`

### 2.4 Enhanced SFA (`enhanced.ts` — 53 actions)

**Incentives & Commissions:**
- `incentive-schemes`, `incentive-scheme-detail`, `create-incentive-scheme`, `update-incentive-scheme`
- `calculate-incentive`, `calculate-achievement`, `approve-incentive`, `incentive-calculations`, `save-incentive-tiers`

**Targets & Teams:**
- `target-groups`, `target-group-detail`, `create-target-group`, `update-target-group`
- `target-products`, `create-target-product`, `target-assignments`, `create-target-assignment`, `update-target-assignment`
- `teams`, `team-detail`, `create-team`, `update-team`, `add-member`, `remove-member`

**Business Settings:**
- `business-settings`, `update-business-setting`, `bulk-update-business-settings`, `settings-overview`
- `currencies`, `create-currency`, `update-currency`, `delete-currency`
- `exchange-rates`, `save-exchange-rate`, `delete-exchange-rate`
- `payment-terms`, `save-payment-term`, `delete-payment-term`
- `tax-settings`, `save-tax`, `delete-tax`
- `numbering-formats`, `save-numbering-format`
- `parameters`, `update-parameter`, `update-parameters-bulk`
- `plafon-list`, `create-plafon`, `update-plafon`, `check-plafon`, `plafon-usage`

**Dashboard:**
- `enhanced-dashboard`, `achievements`

### 2.5 Advanced SFA (`advanced.ts` — 52 actions)

**Geofence & Location:**
- `geofences`, `create-geofence`, `check-geofence`

**Coverage Plans:**
- `coverage-plans`, `create-coverage-plan`, `update-coverage-plan`, `coverage-assignments`, `create-coverage-assignment`, `coverage-compliance`

**Sales Strategies:**
- `sales-strategies`, `sales-strategy-detail`, `create-sales-strategy`, `update-sales-strategy`, `strategy-scorecard`, `activate-strategy`

**Commission Management:**
- `commission-groups`, `create-commission-group`, `update-commission-group`, `delete-commission-group`, `product-commissions`, `create-product-commission`, `update-product-commission`, `commission-summary`

**Competitor Tracking:**
- `competitor-activities`, `create-competitor-activity`, `update-competitor-activity`, `competitor-summary`

**Display Audits:**
- `display-audits`, `display-audit-detail`, `create-display-audit`

**Field Orders:**
- `field-orders`, `field-order-detail`, `create-field-order`, `update-field-order-status`

**Outlet Targets:**
- `outlet-targets`, `create-outlet-target`, `update-outlet-target`, `outlet-target-summary`

**Surveys:**
- `survey-templates`, `survey-template-detail`, `create-survey-template`, `survey-responses`, `submit-survey-response`

**Approvals:**
- `approval-workflows`, `approval-workflow-detail`, `create-approval-workflow`, `approval-requests`, `process-approval`, `submit-approval`

**Inventory:**
- `inventory-products`

### 2.6 Task & Calendar (`task-calendar.ts` — 14 actions)

**Views:**
- `board` — Kanban board view
- `gantt` — Gantt chart timeline
- `calendar` — Calendar events
- `holidays` — Indonesian holidays (Google Calendar sync)
- `stats` — Task statistics

**Operations:**
- `create-task`, `create-event`
- `move` — Move task (drag-drop)
- `bulk-move` — Bulk move tasks
- `quick-update` — Quick inline update

**SFA Bridge:**
- `customer-picker` — Customer search for tasks
- `visit-bridge` — Visit ↔ Task integration
- `visit-suggestions` — AI-powered visit suggestions
- `users` — Assignee lookup

### 2.7 AI Workflow (`ai-workflow.ts` — 16 actions)

**ML Models:**
- `models`, `model-catalog`, `setup-model`, `assign-model`
- `lead_scoring` — Lead scoring model
- `forecasting` — Sales forecasting
- `segmentation` — Customer segmentation

**Workflows:**
- `workflows`, `workflow-detail`, `workflow-templates`, `create-workflow`, `execute`, `executions`, `init-templates`

**Content:**
- `content`, `usage-stats`

---

## 3. Marketing Module Analysis

### 3.1 Marketing API (`/api/hq/marketing/index.ts` — 17 actions)

**Campaign Management:**
- `campaigns`, `campaign-detail`, `create-campaign`, `add-channel`
- `dashboard` — Marketing dashboard

**Segments:**
- `segments`, `segment-detail`, `create-segment`, `refresh-segment`

**Promotions:**
- `promotions`, `create-promotion`, `validate-promo`, `redeem-promo`

**Budgets:**
- `budgets`, `create-budget`

**Content:**
- `content-assets`, `create-content`

### 3.2 AI Marketing Insights (`/api/ai/marketing/insights`)

Placeholder for AI-powered marketing insights.

---

## 4. Authentication & Security

### 4.1 Authentication Flow

All API endpoints under `/api/hq/` use NextAuth.js session validation:

```typescript
// Pattern used in all SFA/CRM/Marketing endpoints:
const session = await getServerSession(req, res, authOptions);
if (!session?.user) return res.status(401).json({ success: false, error: 'Unauthorized' });
```

**Session Data Available:**
- `tenantId` — Multi-tenant isolation
- `userId` — User identification
- `role` — Role-based access control
- `branchId` — Branch scope

### 4.2 Role-Based Access

**Manager-Only Actions (example from `task-calendar.ts`):**
```typescript
const isManager = ['super_admin', 'owner', 'admin', 'manager'].includes(userRole);
// action: 'bulk-move' requires isManager
```

### 4.3 Tenant Isolation

All database queries include `tenant_id` filter:
```typescript
WHERE t.tenant_id = :tid
```

---

## 5. Database Tables Used

### CRM Tables
- `crm_customers` — Customer records
- `crm_contacts` — Contact persons
- `crm_leads` — Lead records
- `crm_opportunities` — Sales opportunities
- `crm_tasks` — Tasks & activities
- `crm_tickets` — Support tickets
- `crm_calendar_events` — Calendar events
- `crm_follow_ups` — Follow-up reminders
- `crm_documents` — Document management
- `crm_communications` — Communication log
- `crm_forecasts` — Sales forecasts
- `crm_segments` — Customer segments
- `crm_sla_policies` — SLA policies
- `crm_automation_rules` — Automation workflows

### SFA Tables
- `sfa_visits` — Field visits
- `sfa_activities` — Sales activities
- `sfa_sales_entries` — Sales transactions
- `sfa_quotations` — Quotations
- `sfa_territories` — Sales territories
- `sfa_coverage_plans` — Coverage plans
- `sfa_geofences` — Geofence boundaries
- `sfa_commissions` — Commission calculations
- `sfa_incentive_schemes` — Incentive programs
- `sfa_target_groups` — Target groups
- `sfa_teams` — Sales teams
- `sfa_competitor_activities` — Competitor tracking
- `sfa_display_audits` — Store audits
- `sfa_field_orders` — Field orders
- `sfa_survey_templates` — Survey templates
- `sfa_approval_workflows` — Approval processes

### Marketing Tables
- `mkt_campaigns` — Marketing campaigns
- `mkt_segments` — Customer segments
- `mkt_promotions` — Promotions & vouchers
- `mkt_budgets` — Marketing budgets
- `mkt_content_assets` — Content library
- `mkt_campaign_channels` — Campaign channels
- `mkt_promotion_usage` — Promotion redemption log

---

## 6. API Test Plan

### 6.1 Test Credentials (Development)

| Email | Password | Role |
|-------|----------|------|
| `superadmin@bedagang.com` | `superadmin123` | super_admin |
| `demo@bedagang.com` | `demo123` | owner |

### 6.2 Test Endpoints (Unauthenticated)

All protected endpoints should return `401 Unauthorized` without session:

```
GET /api/hq/sfa/crm?action=customers → 401
GET /api/hq/sfa/index?action=leads → 401
GET /api/hq/marketing?action=dashboard → 401
GET /api/hq/sfa/sales-management?action=sales-dashboard → 401
```

### 6.3 Authenticated Test Flow

1. **Get CSRF Token:**
   ```
   GET /api/auth/csrf → { csrfToken: "..." }
   ```

2. **Login:**
   ```
   POST /api/auth/callback/credentials
   Content-Type: application/x-www-form-urlencoded
   Body: csrfToken=...&email=superadmin@bedagang.com&password=superadmin123
   → 302 Redirect + Set-Cookie headers
   ```

3. **Test Authenticated Endpoints:**
   Use cookies from login response for subsequent requests.

---

## 7. Recommendations

### 7.1 Security
- ✅ All endpoints enforce authentication (`401` without session)
- ✅ Tenant isolation via `tenant_id` in all queries
- ⚠️ Consider rate limiting for sensitive operations

### 7.2 API Design
- ✅ Consistent action-based pattern (`?action=...`)
- ✅ Standardized response format (`{ success: boolean, data: ..., error: ... }`)
- ⚠️ Add OpenAPI/Swagger documentation for all endpoints

### 7.3 Testing Gaps
1. **No unit tests** for SFA/CRM/Marketing modules
2. **No integration tests** for multi-tenant scenarios
3. **No performance benchmarks** for high-volume endpoints

### 7.4 Prioritized Actions
1. Create `tests/sfa/` directory with Jest tests
2. Add rate limiting middleware to SFA endpoints
3. Generate OpenAPI specification from code
4. Add input validation (Zod/JSON Schema) to all write operations

---

## 8. Files Modified/Created

| File | Action |
|------|--------|
| `ALL-ROUTES-TEST.csv` | Created — 776 API routes with actions |
| `docs/API-ROUTES-SUMMARY.json` | Created — Structured API summary |
| `scripts/extract-api-routes.js` | Created — Route extraction script |
| `CRM-SFA-REPORT.md` | Created — This audit report |

---

## Appendix: SFA/CRM/Marketing Action Inventory

### Complete Action List by File

**`sfa/crm.ts` (65 actions):**
```
automation-logs, automation-rules, calendar-events, comm-campaigns,
communications, contacts, create-automation-rule, create-calendar-event,
create-communication, create-contact, create-customer, create-document,
create-email-template, create-follow-up, create-forecast, create-interaction,
create-segment, create-sla-policy, create-task, create-ticket,
create-ticket-comment, crm-dashboard, customer-analytics, customer-detail,
customer-timeline, customers, deal-scores, delete-automation-rule,
delete-calendar-event, delete-communication, delete-contact, delete-customer,
delete-document, delete-email-template, delete-follow-up, delete-forecast,
delete-segment, delete-task, delete-ticket, document-templates, documents,
email-templates, follow-ups, forecast-analytics, forecasts, import-customers-csv,
satisfaction, segments, service-analytics, sla-policies, task-summary, tasks,
ticket-detail, tickets, update-automation-rule, update-calendar-event,
update-communication, update-contact, update-customer, update-document,
update-follow-up, update-forecast, update-task, update-ticket
```

**`sfa/index.ts` (32 actions):**
```
activities, checkin-visit, checkout-visit, convert-lead, create-activity,
create-lead, create-opportunity, create-quotation, create-target, create-territory,
create-visit, dashboard, delete-activity, delete-lead, delete-opportunity,
delete-quotation, lead-detail, leads, opportunities, pipeline, quotations,
route-plans, targets, territories, unified-dashboard, update-activity,
update-lead, update-opportunity, update-quotation, update-target, update-visit,
visits
```

**`marketing/index.ts` (17 actions):**
```
add-channel, budgets, campaign-detail, campaigns, content-assets, create-budget,
create-campaign, create-content, create-promotion, create-segment, dashboard,
promotions, redeem-promo, refresh-segment, segment-detail, segments, validate-promo
```

---

*Report generated by Bedagang Backend Agent (t_df69ac90)*
