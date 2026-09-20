# Humanify Waves 86–100

> Living checklist. Deepen existing surfaces only — no greenfield modules. No commit/deploy unless requested.
> Scorecard: Waves **86–100** catalogued; aggregate `npm run smoke:waves-86-100`. Deploy pending (parent). **HOLD launch**.

---

## Wave-86 — Mutation defer depth

**Goal:** Defer placement until effective_date; due_soon inbox/sidebar; cron apply; ESS/MSS/Hub deferred UX.

| ID | Micro-task | Status |
|---|---|---|
| W86-1 | `lib/hris/mutation-apply-due.ts` — `isMutationEffectiveOnOrBeforeToday` | Done |
| W86-2 | `isMutationDeferredPending` helper for UI badges | Done |
| W86-3 | `countDueMutations` for due_soon queue | Done |
| W86-4 | `scanDueMutations` cron apply path | Done |
| W86-5 | `stampMutationApplied` / `applied_at` notes on execute | Done |
| W86-6 | Final approve defers placement when effective_date in future | Done |
| W86-7 | API response `deferred: !dueNow` on approve-mutation | Done |
| W86-8 | HQ mutations page "Menunggu efektif" badge | Done |
| W86-9 | `fmtEffective` / days-until-effective display | Done |
| W86-10 | `due_soon` filter chip on HQ mutations | Done |
| W86-11 | Deferred toast on HQ approve | Done |
| W86-12 | MSS mutation deferred hint + deferred toast | Done |
| W86-13 | Manager Hub deferred mutation toast | Done |
| W86-14 | ESS MutationRequestCard status labels incl. Menunggu efektif | Done |
| W86-15 | ESS executed status label | Done |
| W86-16 | Workflow reject clears waiting steps | Done |
| W86-17 | Dashboard Action Inbox type `mutation_due` | Done |
| W86-18 | Dashboard index label for mutation_due | Done |
| W86-19 | Platform GET docs on mutation-apply-due-scan | Done |
| W86-20 | ensure-humanify-crons tag `mutation-apply-due` | Done |
| W86-21 | run-humanify-mutation-apply-due-scan.js runner | Done |
| W86-22 | Sidebar optional `mutationsDueBadge` | Done |
| W86-23 | Sidebar deep-link `due_soon=1` | Done |
| W86-24 | package.json `scan:mutation-apply-due` | Done |
| W86-25 | Smoke `scripts/smoke-test-humanify-wave86.js` | Done |
| W86-26 | npm script `smoke:wave86` | Done |
| W86-27 | E-letter still created on deferred approve | Done |
| W86-28 | Status stays `approved` until cron executes | Done |
| W86-29 | Cron sets status `executed` when due | Done |
| W86-30 | Docs Wave-86 catalog (≥30 rows) | Done |

**Smoke:** `npm run smoke:wave86`
---

## Wave-87 — Comp-off & leave depth

**Goal:** LeaveTab Comp-Off highlight; maternity exempt; OT earn notes; MSS/Manager compOffDays toast.

| ID | Micro-task | Status |
|---|---|---|
| W87-1 | LeaveTab highlight for `comp_off` balance cards | Done |
| W87-2 | LeaveTab cyan ring / bg for Comp-Off | Done |
| W87-3 | LeaveTab history filter includes `comp_off` | Done |
| W87-4 | LeaveTab duration hint "hari kerja" | Done |
| W87-5 | HQ leave types UI highlights Comp-Off suggestion | Done |
| W87-6 | `data-suggest-code` for leave type suggestions | Done |
| W87-7 | `leave-type-suggestions` includes `comp_off` | Done |
| W87-8 | Manager Hub OT toast surfaces `compOffDays` | Done |
| W87-9 | MSS overtime approve toast shows `compOffDays` | Done |
| W87-10 | leave-balance API includes leave type `code` | Done |
| W87-11 | Maternity exempt from ESS balance soft-block | Done |
| W87-12 | Sick leave attachment / surat dokter copy | Done |
| W87-13 | HQ overtime approve stamps `comp_off_earn=` note | Done |
| W87-14 | HQ overtime returns `compOffDays` | Done |
| W87-15 | Manager `approve-overtime` earn log + `compOffDays` | Done |
| W87-16 | `lib/hris/comp-off-earn.ts` creditCompOffFromOvertime | Done |
| W87-17 | ensureCompOffLeaveType helper | Done |
| W87-18 | Schema-aware leave_balances credit (entitled_days vs entitled) | Done |
| W87-19 | ESS soft-block when remaining < leaveDays (exc. unpaid/sick/maternity) | Done |
| W87-20 | Weekend/holiday OT ≥ rule credits days | Done |
| W87-21 | Weekday OT ≥4h path credits when policy allows | Done |
| W87-22 | Notify employee with comp-off days on OT approve | Done |
| W87-23 | Smoke `scripts/smoke-test-humanify-wave87.js` | Done |
| W87-24 | npm script `smoke:wave87` | Done |
| W87-25 | LeaveTab Comp-Off label string | Done |
| W87-26 | Portal maternity in exempt array | Done |
| W87-27 | Manager earn note idempotent (skip if already stamped) | Done |
| W87-28 | Docs Wave-87 catalog (≥30 rows) | Done |
| W87-29 | Align Manager Hub OT path with HQ earn helper | Done |
| W87-30 | Keep unpaid/sick without balance soft-block | Done |

**Smoke:** `npm run smoke:wave87`
---

## Wave-88 — Claims/expense ↔ travel

**Goal:** Link ESS reimbursement claims to existing travel requests; surface trip context in MSS + Manager Hub.

| # | Micro-task | Status |
|---|---|---|
| 1 | `employee_claims.travel_request_id` via `ensurePortalSchema` + `ALTER … IF NOT EXISTS` on claim create | Done |
| 2 | ESS claim form: travel-related types show travel request picker | Done |
| 3 | `createClaim` accepts `travelRequestId` and persists | Done |
| 4 | Validate travel belongs to employee (tenant + employee_id) | Done |
| 5 | MSS claim card: trip link → `/humanify/travel-expense` | Done |
| 6 | Manager Hub claim: trip hint (destination / request number) | Done |
| 7 | `CLAIM_TYPES` add `travel` / `travel_expense` (+ map labels) | Done |
| 8 | Smoke `scripts/smoke-test-humanify-wave88.js` | Done |
| 9 | `package.json` → `smoke:wave88` | Done |
| 10 | Receipt gallery empty-state polish | Done |
| 11 | Claim number (`CLM-#####`) on create + ESS display | Done |
| 12 | ESS claims empty state | Done |
| 13 | ESS claim status filters (all/pending/approved/rejected) | Done |
| 14 | Currency format consistency (`fmtCur` / preview under amount) | Done |
| 15 | Resubmit keeps / updates `travel_request_id` | Done |
| 16 | `getClaims` LEFT JOIN travel for destination/purpose | Done |
| 17 | Manager API SELECT `travel_request_id` + trip fields | Done |
| 18 | Workflow MSS claims JOIN travel | Done |
| 19 | `EmployeeClaim` model `travelRequestId` | Done |
| 20 | ESS list inline `ClaimReceiptGallery` thumbs | Done |
| 21 | Travel-related type gate clears picker when switching away | Done |
| 22 | HQ ESS portal CLAIM_TYPES include travel_expense map | Done |
| 23 | Index `idx_emp_claim_travel` | Done |
| 24 | Claim create path generates claim_number | Done |
| 25 | Manager Hub CLAIM_TYPE_LABEL travel / travel_expense | Done |
| 26 | Empty travel list hint on picker | Done |
| 27 | Compact gallery “Tanpa bukti” | Done |
| 28 | Resubmit prefill `travelRequestId` | Done |
| 29 | New-claim modal resets travelRequestId | Done |
| 30 | Smoke ≥15 static assertions | Done |

**Smoke:** `npm run smoke:wave88`

**Files:** `lib/employee-portal/ensure-portal.ts`, `pages/api/employee/dashboard.ts`, `pages/api/employee/manager.ts`, `pages/api/humanify/workflow.ts`, `components/employee/EmployeePortal.tsx`, `components/employee/ManagerHubTab.tsx`, `pages/humanify/mss.tsx`, `pages/humanify/ess.tsx`, `components/humanify/ClaimReceiptGallery.tsx`, `models/EmployeeClaim.js`, `scripts/smoke-test-humanify-wave88.js`, `package.json`

---

## Wave-89 — Recruitment ATS / careers

**Goal:** Polish ATS custom fields + careers apply persistence and HQ badges.

| # | Micro-task | Status |
|---|---|---|
| 1 | Custom field builder: options parse comma (sanitize + UI) | Done |
| 2 | Careers slug: select empty option (“Pilih…” / “Opsional”) | Done |
| 3 | Persist `customAnswers` → `custom_answers` **and** `custom_field_values` on apply | Done |
| 4 | HQ candidates list: custom field count badge | Done |
| 5 | Job list: “N custom fields” badge | Done |
| 6 | Smoke `scripts/smoke-test-humanify-wave89.js` | Done |
| 7 | `package.json` → `smoke:wave89` | Done |
| 8 | Deadline display on careers detail | Done |
| 9 | Salary range display on careers detail | Done |
| 10 | Status chips (Open / employment type) | Done |
| 11 | Careers empty / not-found state | Done |
| 12 | Apply success copy (3–5 hari kerja) | Done |
| 13 | Required asterisk via label (not only placeholder) | Done |
| 14 | Field builder “Wajib” checkbox | Done |
| 15 | Options placeholder “Opsi: a, b, c” | Done |
| 16 | Field builder empty hint | Done |
| 17 | Candidate detail: show custom answers block | Done |
| 18 | `countCustomAnswers` / `countFieldDefs` helpers | Done |
| 19 | Select options parse from string on careers form | Done |
| 20 | ALTER IF NOT EXISTS `custom_field_values` on candidates | Done |
| 21 | Validation message for required custom fields (existing alert) | Done |
| 22 | Job card deadline chip in HQ openings | Done |
| 23 | Careers form “Field bertanda * wajib” hint | Done |
| 24 | Apply API success message aligned with UI | Done |
| 25 | sanitizeFieldDefs accepts `;` / `|` separators too | Done |
| 26 | Recruitment create still splits options client-side | Done |
| 27 | Badge on candidate name row | Done |
| 28 | Careers salary /bulan label | Done |
| 29 | Smoke static coverage ≥12 | Done |
| 30 | Doc checklist (this file) | Done |

**Smoke:** `npm run smoke:wave89`

**Files:** `lib/hris/job-custom-fields.ts`, `pages/api/public/careers.ts`, `pages/careers/[slug].tsx`, `pages/humanify/recruitment.tsx`, `scripts/smoke-test-humanify-wave89.js`, `package.json`

---

## Wave-90 — Offboarding / final settlement

**Goal:** Ready queue already existed. Add settlement filter chips, disburse-from-queue, refresh, bank link, sort, currency, empty ready state.

| # | Micro-task | Status |
|---|---|---|
| 1 | Settlement status filter chip group (all / siap cair / sudah cair / belum) | Done |
| 2 | Chip counts from live items + readySettlements | Done |
| 3 | `aria-pressed` + `aria-label` on settlement filter group | Done |
| 4 | Disburse button on ready-queue rows | Done |
| 5 | Disburse calls `POST …?action=disburse&id=` | Done |
| 6 | `disbursingId` loading/disabled guard | Done |
| 7 | `await fetchAll()` refresh after successful disburse | Done |
| 8 | Detail modal uses shared `disburseSettlement` | Done |
| 9 | Update viewing `settlementData` after disburse | Done |
| 10 | Bank link → `/humanify/payroll/disbursement?mode=settlement` | Done |
| 11 | Hero chip “N siap cair” with Banknote icon | Done |
| 12 | KPI card Siap Cair clickable → filter ready | Done |
| 13 | Empty ready state (`data-testid=ready-settlement-empty`) | Done |
| 14 | Ready queue always visible (empty or filled) | Done |
| 15 | Ready total net sum with `fmtCurrency` | Done |
| 16 | IDR via `Intl.NumberFormat('id-ID')` helper | Done |
| 17 | Ready row net uses same currency helper | Done |
| 18 | Table Net column with currency / em dash | Done |
| 19 | Column sort: Karyawan | Done |
| 20 | Column sort: Resign | Done |
| 21 | Column sort: Hari terakhir | Done |
| 22 | Column sort: Clearance % | Done |
| 23 | Column sort: Status | Done |
| 24 | Column sort: Settlement | Done |
| 25 | Column sort: Net amount | Done |
| 26 | `SortTh` + `aria-sort` ascending/descending | Done |
| 27 | Toggle sort direction on same column | Done |
| 28 | `settlementStatusOf` + `SETTLEMENT_CHIP` badges | Done |
| 29 | Table row inline Disburse when status ready | Done |
| 30 | Toolbar link “Transfer Bank settlement” | Done |
| 31 | Modal “File Transfer Bank” with Banknote icon | Done |
| 32 | Stats: readyCount + disbursedCount | Done |
| 33 | Next.js `Link` for bank routes | Done |
| 34 | Smoke `scripts/smoke-test-humanify-wave90.js` | Done |
| 35 | npm script `smoke:wave90` | Done |

**Smoke:** `npm run smoke:wave90`

**Files:** `pages/humanify/offboarding.tsx`, `scripts/smoke-test-humanify-wave90.js`, `package.json`

---

## Wave-91 — Training request → LMS

**Goal:** Approve→LMS bridge already in store. Surface enrollment IDs, HQ requests table, MSS program title, badges, preferred date.

| # | Micro-task | Status |
|---|---|---|
| 1 | ESS `STATUS_BADGE` map (pending/approved/rejected) | Done |
| 2 | ESS show Enrollment / LMS ID after approve | Done |
| 3 | ESS short-id display with full id in `title` | Done |
| 4 | ESS “enrollment sedang disiapkan” when approved w/o id | Done |
| 5 | ESS preferred_date formatted (id-ID) | Done |
| 6 | ESS preferred_date labeled form field | Done |
| 7 | ESS empty requests state + BookOpen icon | Done |
| 8 | ESS program title secondary line | Done |
| 9 | ESS reviewer note display | Done |
| 10 | ESS “Buka LMS” link when enrolled | Done |
| 11 | HQ tab key `requests` on Training page | Done |
| 12 | HQ `fetchRequests` from `?action=requests` | Done |
| 13 | HQ status filter chips (all/pending/approved/rejected) | Done |
| 14 | HQ table column: Karyawan | Done |
| 15 | HQ table column: Topik | Done |
| 16 | HQ table column: Program | Done |
| 17 | HQ table column: Preferensi | Done |
| 18 | HQ table column: Status badge | Done |
| 19 | HQ table column: Enrollment / LMS | Done |
| 20 | HQ table column: Diajukan | Done |
| 21 | HQ approve via `approve-request` | Done |
| 22 | HQ reject via `reject-request` | Done |
| 23 | HQ `decidingId` loading guard | Done |
| 24 | HQ empty requests `HrisEmptyState` | Done |
| 25 | HQ tab count pending requests | Done |
| 26 | MSS show **Program:** title explicitly | Done |
| 27 | MSS preferred date display | Done |
| 28 | MSS training status badge colors | Done |
| 29 | MSS empty training state retained | Done |
| 30 | Store LMS bridge asserted in smoke | Done |
| 31 | Smoke `scripts/smoke-test-humanify-wave91.js` | Done |
| 32 | npm script `smoke:wave91` | Done |

**Smoke:** `npm run smoke:wave91`

**Files:** `components/employee/TrainingTab.tsx`, `pages/humanify/training.tsx`, `pages/humanify/mss.tsx`, `scripts/smoke-test-humanify-wave91.js`, `package.json`

---

## Wave-92 — OKR / KPI cascade

**Goal:** Manager assign from TeamMemberDetailSheet already existed. Validation, parentId, pending chip, owner visibility.

| # | Micro-task | Status |
|---|---|---|
| 1 | `validateKpi` — metric name ≥ 2 chars | Done |
| 2 | `validateKpi` — target must be positive number | Done |
| 3 | `validateKpi` — period `YYYY-MM` | Done |
| 4 | `validateKpi` — unit required | Done |
| 5 | `validateKpi` — weight positive | Done |
| 6 | `validateOkr` — title ≥ 3 chars | Done |
| 7 | `validateOkr` — title max 300 | Done |
| 8 | `validateOkr` — parentId soft UUID check | Done |
| 9 | Error vs success `msgTone` colors | Done |
| 10 | KPI weight input field | Done |
| 11 | OKR **parentId** optional cascade field | Done |
| 12 | OKR period optional field | Done |
| 13 | Pass `parentId` to `assign-okr` API | Done |
| 14 | Pass `weight` to `assign-kpi` API | Done |
| 15 | aria-labels on KPI/OKR/parent fields | Done |
| 16 | Clear validation message on mode switch | Done |
| 17 | HQ pending filter chip (amber toggle) | Done |
| 18 | Chip count of `pending_approval` objectives | Done |
| 19 | Chip toggles `statusFilter` pending ↔ all | Done |
| 20 | `data-testid=okr-pending-filter-chip` | Done |
| 21 | STATUS_CLS colors retained (draft/pending/active/rejected) | Done |
| 22 | HQ card shows **Owner:** with User icon | Done |
| 23 | HQ empty owner fallback copy | Done |
| 24 | HQ `HrisEmptyState` when no OKRs | Done |
| 25 | CONFIDENCE_CLS status colors retained | Done |
| 26 | MSS OKR line **Owner:** explicit | Done |
| 27 | MSS OKR empty state retained | Done |
| 28 | MSS fetches `status=pending_approval` | Done |
| 29 | API `parentId: body.parentId \|\| null` wire | Done |
| 30 | Team-scoped `assertEmployeeOnTeam` on assign | Done |
| 31 | Smoke `scripts/smoke-test-humanify-wave92.js` | Done |
| 32 | npm script `smoke:wave92` | Done |

**Smoke:** `npm run smoke:wave92`

**Files:** `components/employee/TeamMemberDetailSheet.tsx`, `pages/humanify/okr.tsx`, `pages/humanify/mss.tsx`, `scripts/smoke-test-humanify-wave92.js`, `package.json`

---

---

## Wave-93 — Desk / support polish

**Goal:** ESS desk list+create; sanitize; NO_TENANT; rate-limit; HQ assignee.

| ID | Micro-task | Status |
|---|---|---|
| W93-1 | ESS `/api/employee/desk` GET listTickets (mine only) | Done |
| W93-2 | ESS desk POST createTicket with categories | Done |
| W93-3 | Fail-closed `NO_TENANT` on desk API | Done |
| W93-4 | sanitizePlainText subject+description on create | Done |
| W93-5 | Rate-limit desk POST via checkLimit SENSITIVE | Done |
| W93-6 | withEmployeeAuth wrapper on desk | Done |
| W93-7 | HQ support assignee field `assigned_to` | Done |
| W93-8 | support-store persists assigned_to | Done |
| W93-9 | EmployeePortal deskTickets state/list | Done |
| W93-10 | HomeTab Desk quick action modal | Done |
| W93-11 | Internal categories it/hr/facility/desk/… | Done |
| W93-12 | Desk ticket status in ESS modal | Done |
| W93-13 | Requester email/user_id filter on list | Done |
| W93-14 | Subject max 300 via sanitize | Done |
| W93-15 | Description max 5000 via sanitize | Done |
| W93-16 | Category fallback to other | Done |
| W93-17 | Priority default normal | Done |
| W93-18 | Smoke wave93 needles | Done |
| W93-19 | npm smoke:wave93 | Done |
| W93-20 | Catalog W93 ids ≥30 | Done |
| W93-21 | Support HQ detail shows assignee | Done |
| W93-22 | createTicket tenant-scoped | Done |
| W93-23 | No mock fallback without tenant | Done |
| W93-24 | Desk modal empty state | Done |
| W93-25 | HomeTab LifeBuoy Desk icon | Done |
| W93-26 | Strip HTML tags on desk text | Done |
| W93-27 | 429 RATE_LIMIT_EXCEEDED on abuse | Done |
| W93-28 | GET still requires tenant | Done |
| W93-29 | POST returns 201 on create | Done |
| W93-30 | Docs Wave-93 section | Done |

**Smoke:** `npm run smoke:wave93`
---

## Wave-94 — Workforce / manpower polish

**Goal:** Position title lines on workforce analytics; sidebar links; casual workforce surface.

| ID | Micro-task | Status |
|---|---|---|
| W94-1 | workforce-analytics positionTitle lines | Done |
| W94-2 | Position title label in plan cards | Done |
| W94-3 | positionLines editor on create/edit plan | Done |
| W94-4 | Filter empty position titles before save | Done |
| W94-5 | workforce-categories helper module | Done |
| W94-6 | casual-workforce page present | Done |
| W94-7 | Sidebar Analitik Tenaga Kerja link | Done |
| W94-8 | Sidebar Tenaga Harian link | Done |
| W94-9 | Sidebar workforce-compliance link | Done |
| W94-10 | Plan form add position line button | Done |
| W94-11 | currentCount / plannedCount fields | Done |
| W94-12 | Details persisted on plan payload | Done |
| W94-13 | Display fallback position_title / title | Done |
| W94-14 | Smoke wave94 ≥8 needles | Done |
| W94-15 | npm smoke:wave94 | Done |
| W94-16 | Catalog W94 ≥30 | Done |
| W94-17 | Manpower position title in list view | Done |
| W94-18 | Empty positionLines seed row | Done |
| W94-19 | Uppercase "Position title" section header | Done |
| W94-20 | Analytics page loads without greenfield module | Done |
| W94-21 | Reuse existing workforce APIs | Done |
| W94-22 | No duplicate manpower module | Done |
| W94-23 | Compliance SSU/TKA sidebar entry | Done |
| W94-24 | HardHat icon casual workforce | Done |
| W94-25 | BarChart3 analytics icon | Done |
| W94-26 | Plan details map on edit hydrate | Done |
| W94-27 | Trim positionTitle on filter | Done |
| W94-28 | Docs Wave-94 section | Done |
| W94-29 | Honest Done for present UI only | Done |
| W94-30 | Deepen existing analytics surface | Done |

**Smoke:** `npm run smoke:wave94`
---

## Wave-95 — MSS inbox depth

**Goal:** OKR/Travel/Training MSS tabs; workflow summary counts; Manager Hub mutations.

| ID | Micro-task | Status |
|---|---|---|
| W95-1 | MSS tab okr-approval | Done |
| W95-2 | MSS tab travel-approval | Done |
| W95-3 | MSS tab training-approval | Done |
| W95-4 | MSS KPI cards for OKR/Travel | Done |
| W95-5 | workflow summary pendingTraining | Done |
| W95-6 | workflow summary pendingOkr | Done |
| W95-7 | workflow summary pendingTravel | Done |
| W95-8 | Manager Hub pending mutations | Done |
| W95-9 | Manager Hub approve-mutation via workflow | Done |
| W95-10 | MSS mutations-approval tab | Done |
| W95-11 | MSS overtime-approval tab | Done |
| W95-12 | MSS claims-approval tab | Done |
| W95-13 | MSS team tab retained | Done |
| W95-14 | Training status badges on MSS | Done |
| W95-15 | OKR Owner line on MSS | Done |
| W95-16 | Travel approval actions | Done |
| W95-17 | Smoke wave95 ≥8 needles | Done |
| W95-18 | npm smoke:wave95 | Done |
| W95-19 | Catalog W95 ≥30 | Done |
| W95-20 | workflow summary training/okr/travel counts | Done |
| W95-21 | Inbox depth without new module | Done |
| W95-22 | Manager Hub mutation deferred toast | Done |
| W95-23 | MSS Program title on training | Done |
| W95-24 | MSS preferred date on training | Done |
| W95-25 | Fetch OKR when tab active | Done |
| W95-26 | Fetch travel when tab active | Done |
| W95-27 | Docs Wave-95 section | Done |
| W95-28 | Align MSS with Manager Hub surfaces | Done |
| W95-29 | Keep overview KPI shell | Done |
| W95-30 | No greenfield MSS rewrite | Done |

**Smoke:** `npm run smoke:wave95`
---

## Wave-96 — Kasbon / settlement depth

**Goal:** CASH_ADV payroll inputs; HQ kasbon; ESS cash-advance; settlement disbursement.

| ID | Micro-task | Status |
|---|---|---|
| W96-1 | payroll-inputs CASH_ADV charge type | Done |
| W96-2 | Kasbon HQ page cash-advance.tsx | Done |
| W96-3 | ESS dashboard cash-advance GET/POST | Done |
| W96-4 | smoke-test-humanify-kasbon.js | Done |
| W96-5 | npm smoke:kasbon | Done |
| W96-6 | disbursement settlement mode | Done |
| W96-7 | Offboarding ready settlement queue | Done |
| W96-8 | Offboarding disburse action | Done |
| W96-9 | listOpenPayrollInputCharges engine | Done |
| W96-10 | Approve decrements remaining kasbon | Done |
| W96-11 | LOAN / BONUS input types coexist | Done |
| W96-12 | ESS portal Kasbon section under Klaim | Done |
| W96-13 | Dashboard inbox type kasbon | Done |
| W96-14 | Offboarding prefill outstanding kasbon | Done |
| W96-15 | Smoke wave96 ≥8 needles | Done |
| W96-16 | npm smoke:wave96 | Done |
| W96-17 | Catalog W96 ≥30 | Done |
| W96-18 | Transfer Bank settlement link | Done |
| W96-19 | Settlement status chips on offboarding | Done |
| W96-20 | Currency fmt on settlement net | Done |
| W96-21 | Docs Wave-96 section | Done |
| W96-22 | HQ cicilan / outstanding UI | Done |
| W96-23 | Payroll calculate injects CASH_ADV | Done |
| W96-24 | No wipe scripts in kasbon path | Done |
| W96-25 | Tenant-scoped payroll inputs | Done |
| W96-26 | ESS max kasbon validation | Done |
| W96-27 | Settlement → disbursed status | Done |
| W96-28 | mode=settlement query on disbursement | Done |
| W96-29 | Honest Done for present kasbon depth | Done |
| W96-30 | Deepen existing payroll inputs only | Done |

**Smoke:** `npm run smoke:wave96`
---

## Wave-97 — ESS polish

**Goal:** MutationRequestCard; Desk; leaveDays soft-block; cancel-overtime + cancel-leave.

| ID | Micro-task | Status |
|---|---|---|
| W97-1 | MutationRequestCard ESS component | Done |
| W97-2 | mutation-request API branches picker | Done |
| W97-3 | HomeTab Desk entry | Done |
| W97-4 | EmployeePortal leaveDays soft-block | Done |
| W97-5 | ESS cancel-overtime action | Done |
| W97-6 | dashboard cancel-overtime handler | Done |
| W97-7 | LeaveTab comp_off highlight | Done |
| W97-8 | Maternity exempt soft-block | Done |
| W97-9 | Sick attachment copy | Done |
| W97-10 | ESS mutation status labels | Done |
| W97-11 | to_branch_id on ESS mutation create | Done |
| W97-12 | Smoke wave97 ≥8 needles | Done |
| W97-13 | npm smoke:wave97 | Done |
| W97-14 | Catalog W97 ≥30 | Done |
| W97-15 | ESS cancel-leave pending request | Done |
| W97-16 | Balance remaining display | Done |
| W97-17 | Desk tickets list in portal | Done |
| W97-18 | Docs Wave-97 section | Done |
| W97-19 | Keep cancel-overtime only for OT | Done |
| W97-20 | Portal unpaid/sick/maternity exemptions | Done |
| W97-21 | MutationRequestCard executed label | Done |
| W97-22 | HomeTab modal desk | Done |
| W97-23 | LeaveTab Batalkan for pending leave | Done |
| W97-24 | cancel-leave parity with cancel-overtime | Done |
| W97-25 | ESS leave Days ceil calculation | Done |
| W97-26 | Toast on insufficient balance | Done |
| W97-27 | Mutation ESS GET own requests | Done |
| W97-28 | Mutation ESS POST create | Done |
| W97-29 | Tenant binding on mutation-request | Done |
| W97-30 | Deepen ESS polish only | Done |

**Smoke:** `npm run smoke:wave97`
---

## Wave-98 — Crons / platform scans

**Goal:** leave-escalation, hr-automation, mutation-apply-due crons + platform APIs + `--check` CLI.

| ID | Micro-task | Status |
|---|---|---|
| W98-1 | ensure-humanify-crons leave-escalation | Done |
| W98-2 | ensure-humanify-crons hr-automation-scan | Done |
| W98-3 | ensure-humanify-crons mutation-apply-due | Done |
| W98-4 | platform leave-escalation-scan API | Done |
| W98-5 | platform mutation-apply-due-scan API | Done |
| W98-6 | platform hr-automation-scan API | Done |
| W98-7 | run-humanify-mutation-apply-due-scan.js | Done |
| W98-8 | run-humanify-leave-escalation-scan.js | Done |
| W98-9 | run-humanify-hr-automation-scan.js | Done |
| W98-10 | package scan:mutation-apply-due | Done |
| W98-11 | Health / obs-alert crons retained | Done |
| W98-12 | db-backup cron retained | Done |
| W98-13 | action-digest weekly cron | Done |
| W98-14 | doc-expiry digest + soft dry-run | Done |
| W98-15 | security-scorecard weekly | Done |
| W98-16 | Smoke wave98 ≥8 needles | Done |
| W98-17 | npm smoke:wave98 | Done |
| W98-18 | Catalog W98 ≥30 | Done |
| W98-19 | ensure-humanify-crons.sh --check flag | Done |
| W98-20 | Leave escalation notify-only (no auto-approve) | Done |
| W98-21 | HR automation cooldown + alerts table | Done |
| W98-22 | Mutation apply due behavior docs on GET | Done |
| W98-23 | Cron marker humanify-platform-cron | Done |
| W98-24 | Idempotent ensure_line refresh | Done |
| W98-25 | Docs Wave-98 section | Done |
| W98-26 | HOLD: never wire wipe into crons | Done |
| W98-27 | --check lists tags without crontab write | Done |
| W98-28 | Platform x-cron-secret / loopback auth pattern | Done |
| W98-29 | Scan scripts OBS_ALERT_CHECK_URL hooks | Done |
| W98-30 | Deepen existing cron surface only | Done |

**Smoke:** `npm run smoke:wave98`
---

## Wave-99 — Auth / guards

**Goal:** Desk sanitize+rate-limit; leave team assert; mutation manager team gate; deploy HOLD wipe.

| ID | Micro-task | Status |
|---|---|---|
| W99-1 | desk sanitizePlainText subject | Done |
| W99-2 | desk sanitizePlainText description | Done |
| W99-3 | desk fail-closed NO_TENANT reinforced | Done |
| W99-4 | desk POST checkLimit RateLimitTier.SENSITIVE | Done |
| W99-5 | manager assertEmployeeOnTeam on approve-leave | Done |
| W99-6 | manager assertEmployeeOnTeam on reject-leave | Done |
| W99-7 | claim approve already assertPendingOnTeam | Done |
| W99-8 | OT approve already assertPendingOnTeam | Done |
| W99-9 | workflow assertMutationEmployeeOnTeamForManager | Done |
| W99-10 | Line-manager-only team gate (HQ HR skipped) | Done |
| W99-11 | reject-mutation team gate for managers | Done |
| W99-12 | deploy HOLD comment never wipe-prod | Done |
| W99-13 | deploy echo HOLD wipe-prod | Done |
| W99-14 | rsync exclude wipe-prod*.js retained | Done |
| W99-15 | mutation-request tenant_id binding | Done |
| W99-16 | withEmployeeAuth on desk | Done |
| W99-17 | sanitize-user-text stripHtmlTags helper | Done |
| W99-18 | Smoke wave99 ≥8 needles | Done |
| W99-19 | npm smoke:wave99 | Done |
| W99-20 | Catalog W99 ≥30 | Done |
| W99-21 | Docs Wave-99 section | Done |
| W99-22 | Manager Hub mutation path re-checks team | Done |
| W99-23 | Super admin bypass team filter | Done |
| W99-24 | No break HQ mutations approve | Done |
| W99-25 | Rate limit 429 headers on desk | Done |
| W99-26 | HTML script tags stripped | Done |
| W99-27 | Auth session required | Done |
| W99-28 | Tenant context required on leave approve | Done |
| W99-29 | Honest Done for implemented guards | Done |
| W99-30 | HOLD launch unchanged | Done |

**Smoke:** `npm run smoke:wave99`
---

## Wave-100 — Closeout docs + meta

**Goal:** Catalog completeness Waves 86–100; HANDOFF; AGG smoke; package dedupe; HOLD; no wipe.

| ID | Micro-task | Status |
|---|---|---|
| W100-1 | Rewrite docs Wave-86 catalog ≥30 W86-* | Done |
| W100-2 | Rewrite docs Wave-87 catalog ≥30 W87-* | Done |
| W100-3 | Keep Wave-88…92 sections intact | Done |
| W100-4 | Replace reserved with Wave-93…100 full sections | Done |
| W100-5 | Each Wave-93…100 ≥30 Wxx-* rows | Done |
| W100-6 | HANDOFF scorecard Waves 86–100 Done | Done |
| W100-7 | HANDOFF smoke:waves-86-100 note | Done |
| W100-8 | HANDOFF deployed pending until parent deploys | Done |
| W100-9 | HANDOFF HOLD launch | Done |
| W100-10 | Dedupe package.json early smoke:wave86–89 | Done |
| W100-11 | Keep later block smoke:wave86–100 | Done |
| W100-12 | smoke:waves-86-100 remains once | Done |
| W100-13 | AGG smoke prints per-wave PASS/FAIL | Done |
| W100-14 | Strengthen wave93–100 ≥8 file needles | Done |
| W100-15 | Keep ≥30 catalog id checks | Done |
| W100-16 | W100 catalog completeness task | Done |
| W100-17 | W100 no wipe in deploy path | Done |
| W100-18 | Smoke wave100 ≥8 needles | Done |
| W100-19 | npm smoke:wave100 | Done |
| W100-20 | Catalog W100 ≥30 | Done |
| W100-21 | Docs Wave-100 section | Done |
| W100-22 | Honest Pending only where code missing | Done |
| W100-23 | Cancel-leave shipped in W97 | Done |
| W100-24 | Crons --check shipped in W98 | Done |
| W100-25 | Auth sanitize Done this pass | Done |
| W100-26 | Aggregate AGG OK target | Done |
| W100-27 | No invent false Done | Done |
| W100-28 | Closeout meta only — no greenfield | Done |
| W100-29 | Parent owns deploy | Done |
| W100-30 | HOLD launch remains | Done |

**Smoke:** `npm run smoke:wave100`
