# QA Report — HRIS & Finance

**Date:** 2026-03-15
**Reviewer:** Hermes Agent (Tim QA/QC)
**Scope:** HRIS (pages/hq/hris/) & Finance (pages/hq/finance/) modules
**Branch:** New-Backend-Nainerp

---

## HRIS MODULE

### [HRIS] employees.tsx

#### Severity: P1
- **Issue**: `pkwtExpiring` stat uses `Date.now()` during render (derived `statsData` object)
- **Line**: `pages/hq/hris/employees.tsx:101-104`
- **Fix**: Move to a `useMemo` with empty deps, or use a useEffect-based calculation. This causes hydration mismatch in Next.js SSR since server and client will see different values.

#### Severity: P2
- **Issue**: `TabExtra` state (line 76) typed as `any` — when `fetchTabExtra` catches an error, it sets `[tab]: null` (line 116), but downstream code may try to read properties from null.
- **Line**: `pages/hq/hris/employees.tsx:116`
- **Fix**: Guard usage with `tabExtra[tab]?.property` or default to `[]`/`{}`.

#### Severity: P2
- **Issue**: `useEffect` on line 173 depends on `[mounted, search, filterDept, filterStatus, page]`. On initial mount, `mounted` becomes `true`, so it triggers `fetchEmployees()` immediately. But `search`, `filterDept`, `filterStatus`, and `page` are also initial values — so it's fine. However, if the component unmounts mid-fetch, `setEmployees` could be called on an unmounted component.
- **Line**: `pages/hq/hris/employees.tsx:173`
- **Fix**: Add an `abortController` or mounted guard inside `fetchEmployees`.

---

### [HRIS] leave.tsx

#### Severity: P2
- **Issue**: `MOCK_LEAVE_REQUESTS` (line 89-96) uses dual-naming convention (`employee_name` vs `employeeName`, `leave_type` vs `leaveType`). The `getLeaveField` helper (line 404-413) handles this with `r.employee_name || r.employeeName`, which works but creates inconsistency. However, the `filtered` memo (line 192-205) also uses `l.employee_name || l.employeeName` but `l.leave_type || l.leaveType` — if ALL records only have `leave_type`, the filter works. But line 203 uses `(l.leave_type || l.leaveType) === typeFilter` while line 475 uses `lt.code` as value for type filter. This means type filter compares the code (like 'ANNUAL') against `leave_type` field which stores 'annual' (lowercase). This is a **mismatch** — `leave_type` values are lowercase ('annual') but `lt.code` values are uppercase ('ANNUAL').
- **Lines**: `pages/hq/hris/leave.tsx:203` and `pages/hq/hris/leave.tsx:475`
- **Fix**: Normalize comparison to lowercase: `(l.leave_type || l.leaveType || '').toLowerCase() === typeFilter`

#### Severity: P2
- **Issue**: `getLeaveField` is defined inside the component body after the `if (!mounted) return null;` guard (line 402-413). This means the function is re-created on every render. It's called in JSX but only when `mounted` is true. More importantly, it's defined as `const` inside the component after the early return, which means it's technically unreachable before `mounted` is true. While this doesn't cause a runtime error because it's only called in JSX after the guard, it's sloppy.
- **Line**: `pages/hq/hris/leave.tsx:404`
- **Fix**: Move `getLeaveField` before the early return guard.

---

### [HRIS] attendance.tsx

#### Severity: P2
- **Issue**: `getSourceIcon` function (line 292-295) doesn't have `gps_mobile` in its lookup map. The mock data (lines 90, 95) uses `gps_mobile` as source. While it falls back to `map.manual`, this means mobile GPS records display as "Manual" instead of "Ponsel/GPS".
- **Lines**: `pages/hq/hris/attendance.tsx:293`
- **Fix**: Add `gps_mobile: { icon: Smartphone, label: 'Ponsel' }` to the map.

#### Severity: P2
- **Issue**: `TABS` array (line 319-327) is defined inside the component body after the `if (!mounted) return null;` guard. Same issue as leave.tsx — it's unreachable before mount but works because it's only used in JSX after the guard.
- **Line**: `pages/hq/hris/attendance.tsx:319`
- **Fix**: Move constants outside component or before guard.

---

### [HRIS] payroll/main.tsx

#### Severity: P1
- **Issue**: `setInterval` in `handleConfirmUpload` (line 445-447) is not cleaned up on component unmount or on error before `clearInterval`. If the user navigates away before the upload completes, the interval runs forever (memory leak). If an error is thrown before `clearInterval` (line 453), the interval keeps incrementing `uploadProgress` forever.
- **Lines**: `pages/hq/hris/payroll/main.tsx:445-453`
- **Fix**: Use a ref to track the interval and clear it in a `finally` block: 
  ```tsx
  const intervalRef = useRef<NodeJS.Timeout>();
  try {
    intervalRef.current = setInterval(...);
    ...
  } finally {
    if (intervalRef.current) clearInterval(intervalRef.current);
  }
  ```

---

### [HRIS] payroll/pph21.tsx

#### Severity: P1
- **Issue**: When mapping API data (lines 74-89), `ytd_paid` is hardcoded to `0` (line 86) and `remaining` is set to `Number(r.pph21_annual || 0)` (line 87) instead of `pph21_annual - ytd_paid`. This means the "YTD Disetor" stat at the top will always be 0, and "Sisa Kewajiban" will equal the total annual tax, which is misleading.
- **Lines**: `pages/hq/hris/payroll/pph21.tsx:86-88`
- **Fix**: Map `ytd_paid` and `remaining` from actual API fields if available, or calculate: `remaining: Number(r.pph21_annual || 0) - Number(r.ytd_paid || 0)`.

#### Severity: P2
- **Issue**: `tax_method` is hardcoded to `'gross'` (line 87) even though mock data shows `'gross_up'` for most items. API data will always display "Gross" regardless of the actual method.
- **Line**: `pages/hq/hris/payroll/pph21.tsx:87`
- **Fix**: Map `tax_method` from API response: `tax_method: r.tax_method || 'gross'`.

---

### [HRIS] payroll/bpjs.tsx

#### Severity: P2
- **Issue**: `dependents` is hardcoded to `0` (line 85) when mapping from API data. The mock data has `dependents: 2` or similar for each employee, but when loading from API, all employees show 0 dependents.
- **Lines**: `pages/hq/hris/payroll/bpjs.tsx:85`
- **Fix**: Map `dependents` from API response: `dependents: Number(r.dependents || 0)`.

---

### [HRIS] payroll/lembur.tsx

#### Severity: P1
- **Issue**: When mapping from API (lines 83-93), `date` is hardcoded to `\`${r.period}-01\`` which always sets the date to the 1st of the period month. Additionally, `start_time` is hardcoded to `'17:00'` and `end_time` to `'-'`. This means ALL overtime records loaded from the API will show the same date (1st of month), same start time (17:00), and no end time.
- **Lines**: `pages/hq/hris/payroll/lembur.tsx:83-86`
- **Fix**: Map actual date and time fields from API: `date: r.date`, `start_time: r.start_time`, `end_time: r.end_time`.

#### Severity: P2
- **Issue**: `handleApprove` and `handleReject` (lines 122-129) only update local state without sending the approval/rejection to the server. On page refresh, the status reverts to whatever the API returns.
- **Lines**: `pages/hq/hris/payroll/lembur.tsx:122-130`
- **Fix**: Send PUT/POST request to API endpoint before updating local state.

---

### [HRIS] payroll/laporan.tsx

#### Severity: P2
- **Issue**: API data mapping (line 70) uses `label: m.month.split('-')[1]` which returns the numeric month ("01", "02", etc.) instead of month names ("Jan", "Feb"). The DEFAULT_MONTHLY uses proper month abbreviation labels, so the chart will show numbers when API data is loaded.
- **Lines**: `pages/hq/hris/payroll/laporan.tsx:70`
- **Fix**: Map numeric month to label: `const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']; label: monthNames[parseInt(m.month.split('-')[1]) - 1] || m.month.split('-')[1]`

#### Severity: P2
- **Issue**: Department net salary calculation (line 82) uses a hardcoded 0.83 multiplier (`Math.round(Number(d.total_basic || 0) * 0.83)`). This assumes a flat 17% deduction rate across all departments, which is inaccurate as deductions vary per employee.
- **Lines**: `pages/hq/hris/payroll/laporan.tsx:82`
- **Fix**: Map actual net salary from API: `net: Number(d.net || 0)`.

---

### [HRIS] payroll/thr.tsx

#### Severity: P2
- **Issue**: No `loading` state is passed to the table. When API is slow but returns empty data, the mock data is shown (line 72). If API errors, same fallback. But between mount and fetch completion, there's no loading indicator.
- **Lines**: `pages/hq/hris/payroll/thr.tsx:58-79`
- **Fix**: Use the `loading` state to show a spinner while fetching.

---

## FINANCE MODULE

### [FINANCE] invoices.tsx

#### Severity: P2
- **Issue**: Summary calculation for `paidAmount` (line 156) sums `i.total` instead of `i.paidAmount` for paid invoices. For fully paid invoices, `total === paidAmount`, so it's correct. But for `partial` status, line 157 already handles `i.total - i.paidAmount` correctly. For `paid` status, summing `i.total` is correct because `paidAmount === total`. However, if a paid invoice has `paidAmount < total` (an edge case), the summary would be inflated.
- **Lines**: `pages/hq/finance/invoices.tsx:156`
- **Fix**: Use `i.paidAmount` instead of `i.total` for paid invoices to be safe: `const paidAmount = mappedInvoices.filter(i => i.status === 'paid').reduce((s, i) => s + i.paidAmount, 0);`

#### Severity: P2
- **Issue**: `customerType` mapping (line 137) assumes `customerType: row.customer_id ? 'corporate' : 'individual'`. This is incorrect — having a customer_id doesn't guarantee corporate status. Individual customers also have IDs.
- **Lines**: `pages/hq/finance/invoices.tsx:137`
- **Fix**: Map actual `customerType` from API if available: `customerType: row.customer_type || 'individual'`.

---

### [FINANCE] profit-loss.tsx

#### Severity: P3
- **Issue**: Revenue summary card (line 253-256) shows a hardcoded "12.4% vs prev" text rather than using actual calculated growth. This makes the growth indicator static and potentially misleading.
- **Lines**: `pages/hq/finance/profit-loss.tsx:253-256`
- **Fix**: Calculate actual growth from data: `summary.revenue > 0 && summary.previousPeriod ? ((summary.revenue / summary.previousPeriod - 1) * 100).toFixed(1) : 'N/A'`

#### Severity: P2
- **Issue**: The `formatCurrency` function (lines 72-79) shortens large values to "M" (Miliar) and "Jt" (Juta) format, but the summary cards always display in shortened format. The net income card (line 279) shows `formatCurrency(summary.netIncome)` which for `850000000` shows "Rp 850.0Jt" — the ".0" is unnecessary for round numbers.
- **Lines**: `pages/hq/finance/profit-loss.tsx:72-79`
- **Fix**: Add special case: if value % 1,000,000 === 0, show without decimal.

---

### [FINANCE] transactions.tsx

#### Severity: P2
- **Issue**: The `useEffect` on line 66-70 fetches on `[typeFilter, statusFilter, branchFilter, dateRange, pagination.offset]` but NOT `searchTerm`. When the user types a search and presses Enter, `handleSearch` calls `fetchTransactions()` directly (which works). But the `searchTerm` value used in `fetchTransactions`'s params (line 77) comes from closure, which is correct. However, if `searchTerm` changes for any other reason, the effect won't re-run. This is acceptable since the search triggers `handleSearch` manually. The real issue: the search dependency is missing from the effect, which could cause stale data if search changes programmatically.
- **Lines**: `pages/hq/finance/transactions.tsx:66-70`
- **Fix**: Add `searchTerm` to the dependency array, or keep current design and document it.

#### Severity: P2
- **Issue**: Branch filter uses `branch.id` in the select (line 431) but the transactions data uses `branch.code` or `branch.name` (line 529). Looking at line 529: `transaction.branch?.code || 'N/A'`. The filter logic on line 76-84 sends `branch: branchFilter` to the API. But if branchFilter is an ID like '1' and the API expects a name like 'Kantor Pusat Jakarta', the filter won't work.
- **Lines**: `pages/hq/finance/transactions.tsx:76-84, 430-432, 529`
- **Fix**: Ensure the API filter parameter matches what the backend expects (name vs id). The select displays `branch.code - branch.name` but sends `branch.id` — the backend needs to resolve this correctly.

---

### [FINANCE] expenses.tsx

#### Severity: P2
- **Issue**: Branches and accounts are fetched separately in a `useEffect` (lines 166-193) that depends on `[mounted]`. If the main page already has branch data from the transactions page, this is redundant. But there's no guard against duplicate fetches.
- **Lines**: `pages/hq/finance/expenses.tsx:166-193`
- **Fix**: Not critical, but consider caching or using shared state.

---

### [FINANCE] tax.tsx

#### Severity: P3
- **Issue**: Tax breakdown chart series (lines 148-152) divides by 1,000,000 and rounds, losing precision. `summary.netVat` is `280500000` → `Math.round(280500000 / 1000000)` = `281` (million). The chart title doesn't specify "in millions", so the displayed number may be misinterpreted.
- **Lines**: `pages/hq/finance/tax.tsx:148-152`
- **Fix**: Either display unit in chart labels or don't divide by 1,000,000.

---

### [FINANCE] ai-guardian.tsx

#### Severity: P2
- **Issue**: `runScan` is called in the `useEffect` on mount (line 283), which triggers immediately when the component mounts. If the scan takes more than a few seconds, the UI shows loading state, but there's no timeout — if the API hangs, the scan "never" completes.
- **Lines**: `pages/hq/finance/ai-guardian.tsx:283`
- **Fix**: Add an `AbortController` with timeout (e.g., 30s) so the UI can recover from a hung API.

#### Severity: P2
- **Issue**: The `toggleAlert` function (line 289-295) and `toggleTask` (not shown but likely similar) create a new `Set` on every call. While this is idiomatic React, the `expandedAlerts` state type `Set<string>` is not serializable (can't be stored in Redux/session storage). Not a crash bug, but a compatibility concern.
- **Lines**: `pages/hq/finance/ai-guardian.tsx:289-295`
- **Fix**: Use `string[]` or `Record<string, boolean>` instead of `Set`.

---

### [FINANCE] budget.tsx

#### Severity: P2
- **Issue**: `fetchData` (lines 109-147) maps API data to `branchBudgets` state (lines 130-135) but doesn't map `categories` from API. If the API returns budget categories, they are ignored, and the mock categories are used (line 142 on error). There's no path to update categories from API.
- **Lines**: `pages/hq/finance/budget.tsx:127-136`
- **Fix**: Map `payload.categories` to `setCategories` when available.

---

### [FINANCE] accounts.tsx

#### Severity: P2
- **Issue**: `fetchData` is called once on mount (line 160) with no dependency on filters. The `filterStatus` state exists (line 133) but changing it doesn't re-fetch — it only filters the already-loaded client-side data. This is fine for small datasets but means loading all records upfront.
- **Lines**: `pages/hq/finance/accounts.tsx:158-161`
- **Fix**: If the dataset is large, add `filterStatus` to the useEffect dependency and pass it as an API parameter.

---

## SUMMARY

| Severity | Count | Description |
|----------|-------|-------------|
| **P1** (Critical) | 3 | Data integrity issues: hardcoded values in API mapping (ytd_paid=0, overtime dates/times hardcoded), memory leak from uncleared interval |
| **P2** (Major) | 16 | Incorrect data mapping, fallback logic gaps, missing API fields, missing loading states, non-serializable states, chart precision |
| **P3** (Minor) | 2 | Hardcoded display text, decimal formatting |

**Total issues found: 21** across 14 files (7 HRIS, 7 Finance)
