# Humanify Waves 86–100

> Living checklist. Deepen existing surfaces only — no greenfield modules. No commit/deploy unless requested.

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

## Waves 93–100

_Reserved — append here._
