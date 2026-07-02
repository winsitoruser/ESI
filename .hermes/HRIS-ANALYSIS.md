# HRIS Module Analysis Report

**Generated:** 28 June 2026
**Project:** Bedagang ERP — bedagang---PoS
**Branch:** New-Backend-Nainerp

---

## 1. Module Structure Overview

### 1.1 Pages (`pages/hq/hris/`)

| # | File | Module / Category |
|---|------|-------------------|
| 1 | `index.tsx` | HRIS Dashboard (home) |
| 2 | `employees.tsx` | Employee Data Management |
| 3 | `organization.tsx` | Org Structure |
| 4 | `onboarding.tsx` | Employee Onboarding |
| 5 | `offboarding.tsx` | Employee Offboarding / Exit |
| 6 | `contracts.tsx` | Contract Management |
| 7 | `ess.tsx` | Employee Self-Service |
| 8 | `mss.tsx` | Manager Self-Service |
| 9 | `attendance.tsx` | Attendance Overview |
| 10 | `attendance/daily.tsx` | Daily Attendance Recap |
| 11 | `attendance-management.tsx` | Attendance Management (shifts, geofences) |
| 12 | `attendance/devices.tsx` | Attendance Devices |
| 13 | `attendance/settings.tsx` | Attendance Policy Settings |
| 14 | `leave.tsx` | Leave Management |
| 15 | `calendar.tsx` | HR Calendar |
| 16 | `payroll/index.tsx` | Payroll Dashboard |
| 17 | `payroll/main.tsx` | Payroll Run Processing |
| 18 | `payroll/slip-gaji.tsx` | Payslip Distribution |
| 19 | `payroll/thr.tsx` | THR & Bonus |
| 20 | `payroll/pph21.tsx` | PPh 21 Tax |
| 21 | `payroll/bpjs.tsx` | BPJS Health & Employment |
| 22 | `payroll/lembur.tsx` | Overtime |
| 23 | `payroll/laporan.tsx` | Payroll Reports |
| 24 | `kpi.tsx` | KPI Dashboard |
| 25 | `performance.tsx` | Performance Reviews |
| 26 | `kpi-settings.tsx` | KPI Template Settings |
| 27 | `engagement.tsx` | Employee Engagement |
| 28 | `recruitment.tsx` | Recruitment & ATS |
| 29 | `training.tsx` | Training Management |
| 30 | `training-development.tsx` | Learning & Development |
| 31 | `training-scoring.tsx` | Training Scoring & Certification |
| 32 | `travel-expense.tsx` | Travel & Expense |
| 33 | `project-management.tsx` | Project Management |
| 34 | `workforce-analytics.tsx` | Workforce Analytics |
| 35 | `industrial-relations.tsx` | Industrial Relations |
| 36 | `announcements.tsx` | Announcements |

**Total: 36 pages** covering 8 sub-module categories.

### 1.2 API Endpoints (`pages/api/hq/hris/`)

| # | File | Operations |
|---|------|------------|
| 1 | `employees.ts` | CRUD employees + batch KPI/attendance data |
| 2 | `employee-profile.ts` | Employee detail, family, education, certification, skills, experience, documents, contracts |
| 3 | `attendance.ts` | GET (filterable), POST (clock in/out) |
| 4 | `attendance/devices.ts` | Device management |
| 5 | `attendance/device-sync.ts` | Device data sync |
| 6 | `attendance/settings.ts` | Attendance settings |
| 7 | `attendance-management.ts` | Work shifts, schedules, rotations, geofences, clock-in/out |
| 8 | `leave.ts` | GET/POST/PUT leave requests |
| 9 | `leave-management.ts` | Leave types, approval configs, balances |
| 10 | `payroll.ts` | Full payroll: components, runs, calculation, approval, THR, BPJS, PPh21, lembur, laporan |
| 11 | `payroll-bulk.ts` | Bulk payroll operations |
| 12 | `overtime.ts` | Overtime management |
| 13 | `performance.ts` | Performance review CRUD + templates |
| 14 | `kpi.ts` | KPI management |
| 15 | `kpi-settings.ts` | KPI settings |
| 16 | `kpi-templates.ts` | KPI template CRUD |
| 17 | `kpi-scoring.ts` | KPI scoring |
| 18 | `recruitment.ts` | Full ATS: openings, candidates, pipeline, analytics |
| 19 | `training.ts` | Programs, certifications, enrollments, analytics |
| 20 | `training-development.ts` | Learning & development |
| 21 | `training-scoring.ts` | Training scoring |
| 22 | `engagement.ts` | Employee engagement/surveys |
| 23 | `travel-expense.ts` | Travel & expense |
| 24 | `project-management.ts` | Project management |
| 25 | `project-documents.ts` | Project documents |
| 26 | `organization.ts` | Org structure |
| 27 | `lifecycle.ts` | Onboarding, offboarding, contracts, contract reminders |
| 28 | `workforce-analytics.ts` | Workforce analytics |
| 29 | `industrial-relations.ts` | Industrial relations |
| 30 | `workflow.ts` | Approval workflows |
| 31 | `webhooks.ts` | HRIS webhook triggers |
| 32 | `reminders.ts` | Notifications/reminders |
| 33 | `realtime.ts` | WebSocket realtime |
| 34 | `export.ts` | Data export |
| 35 | `upload-claim.ts` | Claim document upload |

**Total: 35 API files**

### 1.3 Models

**JS Sequelize Models (models/):**

| Model | Table | Key Fields |
|-------|-------|------------|
| `Employee.js` | `employees` | id(UUID), employeeId, userId, name, email, phoneNumber, position, department(ENUM), branchId, workLocation(ENUM), role(ENUM), status(ENUM), baseSalary, salaryGrade, tenantId |
| `EmployeeAttendance.js` | `employee_attendance` | employeeId, branchId, date, clockIn, clockOut, scheduledStart/End, status(ENUM: present/late/absent/leave/sick/holiday/work_from_home), lateMinutes, overtimeMinutes, workHours, clockIn/OutLocation(JSONB), tenantId |
| `EmployeeSalary.js` | `employee_salaries` | employeeId, payType(ENUM: monthly/daily/hourly/weekly), baseSalary, hourlyRate, dailyRate, overtimeRateMultiplier, taxStatus, taxMethod, bankName, bankAccount, bpjsKesehatan/Ketenagakerjaan, npwp, effectiveDate |
| `EmployeeContract.js` | `employee_contracts` | employeeId(INTEGER!), contractType(PKWT/PKWTT/MAGANG/FREELANCE), contractNumber, startDate, endDate, probationEnd, status, salary, position, department, renewalCount, previousContractId |
| `EmployeeKPI.js` | `employee_kpis` | employeeId, branchId, period(YYYY-MM), metricName, category, target, actual, weight, achievement(VIRTUAL computed), status, templateId |
| `EmployeeClaim.js` | `employee_claims` | employeeId(INTEGER!), claimNumber, claimType(transport/meal/medical/training/travel/equipment/other), amount, approvedAmount, claimDate, status(pending/approved/rejected/paid/cancelled), receiptUrl |
| `EmployeeSchedule.js` | `employee_schedules` | employeeId, scheduleDate, shiftType(pagi/siang/malam/full), startTime, endTime, locationId, status, isRecurring, recurringPattern |
| `EmployeeDocument.js` | `employee_documents` | employeeId(INTEGER!), documentType(KONTRAK_KERJA/PKWT/PKWTT/NDA/etc), title, fileUrl, fileName, issueDate, expiryDate, status, version, tags |
| `EmployeeEducation.js` | `employee_educations` | employeeId(INTEGER!), level(SD/SMP/SMA/D3/S1/S2/S3), institution, major, startYear, endYear, gpa |
| `EmployeeFamily.js` | `employee_families` | employeeId(INTEGER!), name, relationship(spouse/child/parent/sibling/other), dateOfBirth, nationalId, isDependent |
| `EmployeeCertification.js` | `employee_certifications` | employeeId(INTEGER!), name, issuingOrganization, credentialId, issueDate, expiryDate |
| `EmployeeSkill.js` | `employee_skills` | employeeId(INTEGER!), name, category(technical/soft_skill/language/other), proficiencyLevel, yearsExperience |
| `EmployeeWorkExperience.js` | `employee_work_experiences` | employeeId(INTEGER!), companyName, position, startDate, endDate, isCurrent, salary, referenceName/Phone |
| `EmployeeMutation.js` | `employee_mutations` | employeeId(INTEGER!), mutationType(transfer/promotion/demotion/rotation), fromBranchId/Department/Position, toBranchId/Department/Position, salaryChange, newSalary, status(pending/approved/rejected/cancelled/executed) |
| `LeaveRequest.js` | `leave_requests` | employeeId, branchId, leaveType(ENUM), startDate, endDate, totalDays, status(pending/approved/rejected/cancelled), approvedBy, rejectionReason, delegateTo |
| `PayrollRun.js` | `payroll_runs` | runCode, periodStart, periodEnd, payDate, payType, totalEmployees, totalGross/Deductions/Net/Tax/BPJS, status(draft/calculated/approved/paid/cancelled) |
| `PayrollComponent.js` | `payroll_components` | code, name, type(earning/deduction), category, calculationType(fixed/percentage/per_day), defaultAmount, isTaxable, isMandatory |
| `PerformanceReview.js` | `performance_reviews` | (in models/index.js line 106) |
| `KPITemplate.js` | `kpi_templates` | KPI templates |
| `KPIScoring.js` | `kpi_scoring` | KPI scoring |
| `LeaveType.js` | `leave_types` | Leave type config |
| `LeaveBalance.js` | `leave_balances` | Leave balances |
| `LeaveApprovalConfig.js` | `leave_approval_configs` | Approval workflow config |
| `ContractReminder.js` | `contract_reminders` | Contract reminders |
| `WorkShift.js` | `work_shifts` | Work shift definitions |
| `ShiftSchedule.js` | `shift_schedules` | Shift assignments |
| `ShiftRotation.js` | `shift_rotations` | Shift rotation plans |
| `GeofenceLocation.js` | `geofence_locations` | Geofence for attendance |
| `AttendanceSetting.js` | `attendance_settings` | Attendance policy config |
| `AttendanceDevice.js` | `attendance_devices` | Biometric/fingerprint devices |
| `HRISWebhookLog.js` | `hris_webhook_logs` | Webhook audit |

**TypeScript Models (models/hris/):**

| Model | Table | Notes |
|-------|-------|-------|
| `Employee.ts` | `hris_employees` | **DUAL model** — separate TS model using different table |
| `Attendance.ts` | `hris_attendance` | Dual attendance model |
| `PerformanceReview.ts` | `hris_performance_reviews` | Dual performance model |

> **⚠️ CRITICAL ISSUE**: Two sets of Employee models exist.
> - `models/Employee.js` → table `employees` (used by most API endpoints)
> - `models/hris/Employee.ts` → table `hris_employees` (unused by current APIs)
> Similar duality for Attendance and PerformanceReview.
> The TS models are NOT loaded in `models/index.js`.

### 1.4 Components (`components/`)

Only 2 components directly related to HRIS:
- `components/dashboard/EmployeesScheduleInsightCard.tsx`
- `components/projectManagement/EmployeePicker.tsx`

---

## 2. Business Process Flows

### 2.1 Attendance → Payroll Flow

```
Employee clocks in/out → EmployeeAttendance record created
                              ↓
                     Daily attendance aggregated
                              ↓
              Overtime calculated (overtimeMinutes)
                              ↓
              Payroll run created → periodStart/periodEnd
                              ↓
              Payroll calculated per employee:
                - Base salary (monthly/daily/hourly)
                - Components (earnings + deductions)
                - BPJS (Kesehatan 1% emp + 4% co, JHT 2%+3.7%, JP 1%+2%, JKK, JKM)
                - PPh 21 (annualized, PTKP applied)
                              ↓
              Payroll approved → paid status
                              ↓
              Payslip generated → distributed
```

**Gaps:**
1. ❌ No automated attendance → payroll integration. Payroll manually selects employees.
2. ❌ Overtime from attendance (`overtimeMinutes`) not automatically fed into payroll.
3. ❌ Leave from attendance (`status: 'leave'`) not deducted from leave balances.
4. ❌ `leaveType` in EmployeeAttendance not validated against LeaveType config.

### 2.2 Leave → Approval Flow

```
Employee submits leave request → LeaveRequest created (status: 'pending')
                                         ↓
                      Approval workflow triggered (multi-level config)
                                         ↓
                      Manager/Supervisor approves/rejects
                                         ↓
                      status → 'approved' / 'rejected'
                                         ↓
                      Leave balance updated (if approved)
                                         ↓
                      Attendance auto-updated with leave status
```

**Gaps:**
1. ❌ Multi-level approval exists in `LeaveApprovalConfig` model and `approvalConfig` UI, but API only supports single-step approve/reject via `leave-management.ts` — no multi-step approval execution.
2. ❌ Leave balance deduction is **not implemented** in API — no PUT to LeaveBalance when approved.
3. ❌ Attendance is NOT auto-created when leave is approved (no cross-entity action).
4. ❌ `leave-management.ts` has detailed interfaces for `ApprovalLevel` and `ApprovalConfig` but the API endpoint appears to only return mock data for these.

### 2.3 Payroll Flow

```
PayrollComponent (setup) → SalaryConfig (per employee) → PayrollRun
                                                              ↓
                      Calculate → foreach employee:
                        1. Base salary (payType dependent)
                        2. Assigned components (fixed/per_day/percentage)
                        3. Mandatory components (from global)
                        4. BPJS calculations (hardcoded %)
                        5. PPh21 (annualized via PTKP)
                        6. Result: earnings JSONB, deductions JSONB
                                                              ↓
                      payroll_items created → status='calculated'
                                                              ↓
                      Approve → status='approved'
                                                              ↓
                      Pay → status='paid'
```

**Gaps:**
1. ❌ **BPJS rates are hardcoded** in `payroll.ts` (lines 399-406) — should come from config/DB.
2. ❌ PPh21 calculation uses simplified annualized method — no TER (Tarif Efektif Rata-rata) method which is the 2024+ Indonesian regulation.
3. ❌ `payroll.ts` uses raw SQL queries instead of Sequelize models for most operations, bypassing model validation.
4. ❌ No `paid` status transition implementation found — only draft → calculated → approved.
5. ❌ Payslip distribution appears to be just a list, no actual PDF generation or email delivery.
6. ❌ THR calculation is a separate endpoint but the calculation logic is unclear (no proration for partial year).

### 2.4 Recruitment Flow

```
Job Opening (open/draft/closed) → Candidates apply
                                       ↓
              Pipeline stages: applied → screening → test → interview → offer → hired
                                       ↓
              Candidate stage updates → Analytics update
                                       ↓
              When hired → Employee creation (not automated!)
```

**Gaps:**
1. ❌ No automated employee creation when candidate reaches `hired` stage.
2. ❌ `hris_job_openings` and `hris_candidates` use raw SQL (not models) — no migration tracked.
3. ❌ No interview scheduling or calendar integration.
4. ❌ No email automation for candidate communications.

### 2.5 Performance & KPI Flow

```
KPI Templates → Per-employee KPI assigned (period: YYYY-MM)
                      ↓
              Actual values entered → Achievement % computed
                      ↓
              Performance Review created (quarterly/annually)
                      ↓
              Categories with weights → Overall rating
                      ↓
              workflow: draft → submitted → reviewed → acknowledged
```

**Gaps:**
1. ❌ KPI achievement is NOT automatically pulled into Performance Reviews.
2. ❌ No 360-degree feedback implementation.
3. ❌ Performance review → salary adjustment link missing.
4. ❌ `performance_reviews` table uses raw SQL, not the Sequelize model.

### 2.6 Training Flow

```
Training Program created → Employees enrolled
                                ↓
              Capacity checked → Participation tracked
                                ↓
              Completion → Score recorded → Certification issued
```

**Gaps:**
1. ❌ No competency matrix / skills gap analysis.
2. ❌ Training cost budgeting not integrated with finance.
3. ❌ Certification expiry monitoring is tracked (`expiring_certs`) but no auto-notification.

---

## 3. User Journey Map

### 3.1 Employee

```
ESS (Employee Self-Service) →
  - View personal data
  - Submit leave request (leave.tsx)
  - View attendance history
  - View payslips
  - Submit claims (travel-expense.tsx)
  - View training enrollments
  - View KPI/performance
```

**Pages accessed:** `ess.tsx`, `leave.tsx`, `attendance.tsx`, `payroll/slip-gaji.tsx`

### 3.2 Manager

```
MSS (Manager Self-Service) →
  - Approve/reject leave requests
  - View team attendance
  - View team KPI
  - Conduct performance reviews
  - Approve timesheets
```

**Pages accessed:** `mss.tsx`, `leave.tsx`, `attendance.tsx`, `kpi.tsx`, `performance.tsx`

### 3.3 HR Staff/Admin

```
HR Dashboard (index.tsx) →
  - Employee data management (employees.tsx)
  - Onboarding/offboarding (onboarding.tsx, offboarding.tsx)
  - Contract management (contracts.tsx)
  - Attendance management (attendance-management.tsx)
  - Leave management (leave.tsx)
  - Payroll processing (payroll/main.tsx)
  - KPI settings (kpi-settings.tsx)
  - Recruitment (recruitment.tsx)
  - Training (training.tsx)
  - Reports (workforce-analytics.tsx)
```

### 3.4 Super Admin

```
All HR pages + Settings →
  - Organization structure (organization.tsx)
  - Attendance device config (attendance/devices.tsx)
  - Attendance policy (attendance/settings.tsx)
  - Payroll component management
  - Leave type & approval config
  - Industrial relations
  - Announcements
```

---

## 4. Technical Findings

### 4.1 API Pattern Analysis

| Aspect | Status |
|--------|--------|
| **Auth** | ✅ Session check via `getServerSession` — most APIs use it |
| **Auth Middleware** | ❌ Inconsistent — `attendance.ts` uses `withHQAuth`, others inline session check |
| **Response Format** | ❌ Inconsistent — `employees.ts` uses `successResponse/errorResponse` helpers; `payroll.ts`, `leave.ts`, and others return `{ success, data, error }` manually |
| **HTTP Status Codes** | ❌ Inconsistent — some use `HttpStatus` constants (`employees.ts`, `performance.ts`), others hardcode 200/400/500 |
| **Error Handling** | ✅ Try/catch with `console.error` on most APIs |
| **Tenant Isolation** | ❌ Inconsistent — `employees.ts` uses `tenantId` field, `recruitment.ts`/`training.ts` use `tenant_id OR tenant_id IS NULL` (fallback), some ignore it entirely |
| **Pagination** | ⚠️ Some APIs use `getPaginationParams` helper, others use manual `LIMIT/OFFSET` |
| **Validation** | ⚠️ `employees.ts` uses `validateRequiredFields` helper; others inline checks |
| **Mock Data** | ❌ **Heavy mock fallback** — `attendance.ts`, `leave.ts`, `payroll.ts`, `leave-management.ts` all fall back to mock data when DB/models unavailable |
| **Raw SQL vs Models** | ❌ Mixed — `payroll.ts`, `recruitment.ts`, `training.ts`, `employee-profile.ts` use raw `sequelize.query()`; `employees.ts`, `attendance.ts` use Sequelize models |
| **Webhooks** | ✅ `webhooks.ts` triggers for employee.created, leave.requested/approved/rejected, performance events |

### 4.2 Mock Data Extent

| API | Mock Used When |
|-----|---------------|
| `attendance.ts` | Model unavailable OR DB query fails |
| `leave.ts` | Model unavailable OR empty results OR DB error |
| `payroll.ts` | Model unavailable, catch on overview/components |
| `leave-management.ts` | API response not OK or any exception |
| `employee-profile.ts` (list) | API call fails — falls to MOCK_EMPLOYEES in page |
| `employees.tsx` (page) | **Always falls to MOCK_EMPLOYEES** when API returns empty or errors |

### 4.3 Dual Model Problem

**Critical:** `models/Employee.js` (table `employees`, loaded in index.js) vs `models/hris/Employee.ts` (table `hris_employees`, NOT loaded).

- `employees.ts` API uses `require('../../../../models')` → gets `Employee.js`
- `employee-profile.ts` API uses raw SQL queries against `employees` table
- `recruitment.ts` uses `hris_job_openings` / `hris_candidates` tables (raw SQL)
- `training.ts` uses `hris_training_programs` / `hris_training_enrollments` / `hris_certifications` tables

The TS models appear to be a newer refactoring attempt that was never integrated.

### 4.4 Missing Models in Index

Models that exist as files but are **NOT registered** in `models/index.js`:
- EmployeeSalary, EmployeeContract, EmployeeClaim, EmployeeDocument, EmployeeEducation, EmployeeFamily, EmployeeCertification, EmployeeSkill, EmployeeWorkExperience, EmployeeMutation
- PayrollRun, PayrollComponent
- LeaveType, LeaveBalance, LeaveApprovalConfig
- WorkShift, ShiftSchedule, ShiftRotation, GeofenceLocation, AttendanceSetting, AttendanceDevice, AttendanceDeviceLog
- TravelExpense, TravelRequest
- HeadcountPlan, ManpowerBudget
- TerminationRequest, WarningLetter, HRISWebhookLog

These files define themselves directly with `sequelize.define()` (not passing from index) so they work independently, but associations between them are not set up.

---

## 5. UX/UI Issues

### 5.1 Missing UX Features

| Issue | Location | Severity |
|-------|----------|----------|
| **No loading skeletons** — pages show blank during fetch | All pages | 🔴 High |
| **No error boundary / error state UI** — catch blocks silently set empty state | All pages | 🔴 High |
| **Form validation is minimal** — mostly checks `if (!field)` | `employees.tsx`, `leave.tsx` | 🟡 Medium |
| **No optimistic updates** — all mutations wait for server | All pages | 🟡 Medium |
| **No confirmation dialogs** for critical actions (except delete) | Leave approve/reject | 🟡 Medium |
| **No pagination in sub-data** (family, education lists) | `employees.tsx` detail tabs | 🟡 Medium |
| **No search/sort in sub-data tabs** | `employees.tsx` detail tabs | 🟡 Medium |
| **Toast notifications are basic setTimeout** — no accessibility | All pages | 🟡 Medium |
| **No responsive design for mobile** — table layouts wide | All pages | 🟡 Medium |
| **No export functionality on pages** (API exists at `export.ts`) | All pages | 🟡 Medium |
| **Date formatting only in `id-ID` locale** — not using i18n properly | `employees.tsx` | 🟢 Low |

### 5.2 State Management Issues

- `employees.tsx` uses a huge single-file component (~1100 lines) with 20+ useState hooks
- `leave.tsx` similarly large (~1221 lines)
- No useReducer or context — all state co-located
- Repeated fetch patterns (fetchTabExtra, fetchData, fetchEmployees) — no custom hooks abstraction
- No React Query / SWR for caching and refetching

---

## 6. Prioritized Fix List

### 🔴 P0 — Critical (blocking functionality)

1. **Resolve dual Employee model** — decide between `employees` (JS) and `hris_employees` (TS); consolidate to one
2. **Register all missing models in `models/index.js`** — EmployeeSalary, PayrollRun, PayrollComponent, LeaveRequest is already there but many others missing
3. **Remove mock data fallback for critical operations** — attendance, leave, payroll should never silently return mock data on DB error
4. **Implement leave balance deduction** — when leave is approved, update LeaveBalance table
5. **Implement attendance → payroll integration** — auto-feed overtime and attendance data into payroll runs

### 🟠 P1 — High (important for correctness)

6. **Make BPJS rates configurable** — move hardcoded 1%/4%/2%/3.7% etc. to DB/config
7. **Update PPh21 calculation** — implement TER method (2024+ regulation) instead of simplified annualized
8. **Standardize API response format** — all APIs should use `successResponse/errorResponse` consistently
9. **Standardize auth pattern** — all APIs should use same auth middleware (`withHQAuth` or manual session)
10. **Implement consistent tenant isolation** — every query must filter by tenantId
11. **Add loading states** — skeletons/spinners on all data-fetching pages
12. **Add error UI** — dedicated error states instead of silent fallback to empty/mock

### 🟡 P2 — Medium (business process gaps)

13. **Multi-level leave approval** — implement step-by-step approval from LeaveApprovalConfig
14. **Auto-create attendance on leave approval** — when leave approved, create/update EmployeeAttendance
15. **Recruitment → Employee auto-creation** — when candidate status = 'hired', auto-create employee record
16. **KPI → Performance Review integration** — pull KPI data automatically into review categories
17. **Paid status for payroll** — implement the `paid` transition with payment tracking
18. **Payslip PDF generation** — replace list view with downloadable/emailable payslips
19. **THR proration logic** — implement partial-year THR calculation for mid-year hires

### 🟢 P3 — Low (UX polish)

20. **Extract reusable hooks** — `useHRISFetch`, `useToast`, `usePagination` from repeated patterns
21. **Add confirmation dialogs** — for approve/reject leave, approve payroll
22. **Add pagination/search in sub-data tabs** — employee family, education lists
23. **Consolidate mock data into single mock files** — separate from page logic
24. **Add React Query or SWR** — for caching, deduplication, and background refetching
25. **i18n audit** — ensure all strings use `t()` function, not hardcoded Indonesian
26. **Responsive table layouts** — horizontal scroll or card view on mobile

---

## 7. Summary Statistics

| Metric | Count |
|--------|-------|
| HRIS Pages | 36 |
| API Endpoints | 35 |
| JS Models (existing) | ~30+ |
| TS Models (unused) | 3 |
| Total lines of HRIS code (approx) | ~35,000+ |
| APIs with mock fallback | 6 |
| APIs using raw SQL | 5 |
| APIs using Sequelize models | 7 |
| Models NOT in index.js | ~25 |
| Critical issues identified | 5 |
| High issues | 7 |
| Medium issues | 7 |
| Low issues | 7 |

---

**Report generated by Hermes Agent — Module Analysis**
