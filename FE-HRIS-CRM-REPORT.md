# Frontend Audit Report: HRIS, CRM, and SFA Modules

**Audit Date:** July 2, 2026  
**Auditor:** Frontend Developer Agent  
**Project:** Bedagang ERP / Naincode Platform

---

## 1. Executive Summary

This report documents the systematic audit of the frontend React components for the HRIS (Employee, Attendance, Leave, Payroll), CRM (Customer), and SFA (Sales Force Automation) modules. The audit focused on:
- Accessibility (WCAG 2.1 compliance)
- UI/UX consistency
- Type safety
- Responsive design patterns
- Component architecture

---

## 2. Files Audited

| Module | Key Files | Lines of Code |
|--------|-----------|---------------|
| **Employees** | `pages/hq/hris/employees.tsx`, `pages/employee/index.tsx` | ~2,200 |
| **Attendance** | `pages/hq/hris/attendance.tsx` | 742 |
| **Leave** | `pages/hq/hris/leave.tsx` | ~800 |
| **Payroll** | `pages/hq/hris/payroll/main.tsx` | 1,670 |
| **Customers (CRM)** | `pages/customers/list.tsx`, `components/customers/CustomerList.tsx` | ~460 |
| **SFA** | `pages/hq/sfa/index.tsx`, `components/sfa/shared-ui.tsx` | ~4,800 |

---

## 3. Issues Identified & Fixed

### 3.1 Accessibility (Critical Issues Fixed)

| Issue | Location | Severity | Fix Applied |
|-------|----------|----------|-------------|
| **Table headers missing `scope` attribute** | `components/customers/CustomerList.tsx:190-210` | High | Added `scope="col"` to all `<th>` elements |
| **Table headers missing `scope` attribute** | `pages/hq/hris/attendance.tsx:374, 423, 481` | High | Added `scope="col"` to all table headers in Live, Daily, and Monthly tabs |
| **Icon-only buttons without `aria-label`** | `pages/hq/hris/employees.tsx:359-365` | High | Added `aria-label` with employee name context and `title` attribute |
| **Icon-only navigation buttons without `aria-label`** | `pages/hq/hris/attendance.tsx:405-407` | High | Added `aria-label="Hari sebelumnya/Hari berikutnya"` to Chevron buttons |
| **Search inputs without `aria-label`** | `components/customers/CustomerList.tsx:106-112` | Medium | Added `aria-label="Cari pelanggan"` to search field |
| **Search inputs without `aria-label`** | `pages/hq/hris/attendance.tsx:419` | Medium | Added `aria-label="Cari nama karyawan atau ID"` to search field |
| **Select inputs without `aria-label`** | `pages/hq/hris/attendance.tsx:420-423` | Medium | Added descriptive `aria-label` to branch/status/source filters |
| **Date input without `aria-label`** | `pages/hq/hris/attendance.tsx:406` | Low | Added `aria-label="Pilih tanggal absensi"` |
| **Decorative icons not hidden from screen readers** | Multiple locations | Low | Added `aria-hidden="true"` to purely decorative icons (Eye, Search, Chevron, etc.) |
| **"Detail" button missing context** | `components/customers/CustomerList.tsx:271-277` | Medium | Added `aria-label` with customer name context |

### 3.2 Files Modified

1. **`components/customers/CustomerList.tsx`**
   - Added `scope="col"` to all table headers (`<th>` elements)
   - Added `aria-label="Cari pelanggan"` to search input
   - Added `aria-label` with customer name to "Detail" buttons
   - Added `aria-hidden="true"` to decorative `FaEye` icon

2. **`pages/hq/hris/employees.tsx`**
   - Fixed "View Detail" button to use employee data (`render: (emp) => ...` instead of `render: () => ...`)
   - Added `aria-label` with employee name context
   - Added `title` attribute for visual tooltip
   - Added `aria-hidden="true"` to Eye icon

3. **`pages/hq/hris/attendance.tsx`**
   - Added `scope="col"` to table headers in Live tab (line 374)
   - Added `scope="col"` to table headers in Daily tab (line 423)
   - Added `scope="col"` to table headers in Monthly tab (line 481)
   - Added `aria-label` to date navigation buttons ("Hari sebelumnya", "Hari berikutnya")
   - Added `aria-label="Pilih tanggal absensi"` to date input
   - Added `aria-label` to search input ("Cari nama karyawan atau ID")
   - Added `aria-label` to all select filters (branch, status, source)
   - Added `aria-hidden="true"` to decorative Search, ChevronLeft, ChevronRight icons

---

## 4. Issues Identified (Requiring Further Review)

### 4.1 High Priority

#### 4.1.1 Extensive Use of Mock Data

**Problem:** Multiple modules rely heavily on mock data constants that are used as fallbacks when API calls fail. This can mask backend issues and lead to inconsistent UI behavior.

**Affected Files:**
- `pages/hq/hris/attendance.tsx` - `MOCK_SHIFTS`, `MOCK_GEOFENCES`, `MOCK_DAILY_RECORDS`, `MOCK_MONTHLY_RECORDS`, `MOCK_BRANCH_SUMMARY`
- `pages/hq/hris/leave.tsx` - Similar extensive mock data patterns
- `pages/hq/hris/payroll/main.tsx` - `MOCK_PAYROLL_COMPONENTS`, `MOCK_SALARIES`, `MOCK_PAYROLL_RUNS`
- `pages/hq/sfa/index.tsx` - **40+ MOCK_* constants** (lines 27-80) including `MOCK_SFA_DASHBOARD`, `MOCK_SFA_LEADS`, `MOCK_SFA_OPPORTUNITIES`, etc.

**Recommendation:** 
- Add proper error handling and user-facing error states when APIs fail
- Consider loading indicators that persist until real data arrives
- Add analytics/logging to track how often mock fallbacks are triggered

#### 4.1.2 SFA Page Size & Complexity

**Problem:** `pages/hq/sfa/index.tsx` is **4,739 lines long** (single file), containing:
- 26+ tab views (dashboard, leads, pipeline, teams, visits, field-tasks, orders, sales-mgmt, targets, incentives, merchandising, competitor, survey, approval, settings, customers, communications, tasks, forecasting, automation, import-export, integration, audit-trail, ai-workflow)
- 40+ mock data constants
- Complex state management with ~70 useState variables

**Recommendation:**
- Refactor into separate feature modules/components
- Extract tabs into their own components under `components/sfa/`
- Consider using React context or Zustand for shared state

### 4.2 Medium Priority

#### 4.2.1 Inconsistent Icon Library Usage

**Patterns Identified:**
- `lucide-react` used in HQ/HRIS modules (Eye, Users, Search, ChevronLeft, etc.)
- `react-icons` (FaUser, FaBuilding, FaPhone, etc.) used in `components/customers/CustomerList.tsx`
- `@heroicons/react` installed in package.json but usage not verified
- `@ant-design/icons` installed in package.json

**Recommendation:**
- Standardize on one icon library (prefer `lucide-react` as it's most widely used in the codebase)
- Remove unused icon library dependencies to reduce bundle size

#### 4.2.2 Missing Error Boundaries

**Problem:** No evidence of React error boundaries in the audited files. A single component error can crash the entire page.

**Recommendation:**
- Implement error boundaries at route/page level
- Add fallback UIs for graceful error handling

#### 4.2.3 Accessibility: Form Input Labels

**Observation:** While some inputs have `aria-label`, many form fields rely solely on visual labels without proper programmatic association.

**Pattern to Audit Further:**
- Check `<input>` elements for `id` + `<label htmlFor="">` associations
- Verify `aria-labelledby` for complex form groups

#### 4.2.4 Type Safety: Mixed TypeScript Patterns

**Observation:**
- Some components use explicit interfaces (`CustomerList.tsx` has proper `CustomerFilter` interface)
- Others use extensive `any` types (e.g., `MOCK_*` arrays typed as `any[]`)
- SFA page has `useState<any>` patterns

**Recommendation:**
- Define proper TypeScript interfaces for all mock data shapes
- Replace `any` with `unknown` + type guards where appropriate
- Enable strict TypeScript checks incrementally

### 4.3 Low Priority / Observations

#### 4.3.1 Duplicated Component Logic

**Observation:** Similar patterns across modules:
- Toast notification logic duplicated in multiple files
- Table rendering patterns with slight variations
- Filter/search patterns that could be extracted

#### 4.3.2 Bundle Size Considerations

**Installed Charting Libraries (Potential Overlap):**
- `recharts` (used in SFA)
- `chart.js` + `react-chartjs-2`
- `apexcharts` + `react-apexcharts`
- `@nivo/core`, `@nivo/heatmap`, `@nivo/sankey`
- `plotly.js` + `react-plotly.js`

**Recommendation:** Audit actual usage and consolidate to 1-2 charting libraries.

#### 4.3.3 CSS: Mixed Tailwind + Custom Patterns

**Observation:**
- Most components use Tailwind CSS effectively
- Some inline style objects exist
- `sass` is a dependency but usage patterns unclear

---

## 5. Module-Specific Findings

### 5.1 HRIS: Employees (`pages/hq/hris/employees.tsx`)

**Strengths:**
- Uses `useFilteredColumns` hook for column management
- Proper `PageGuard` and permission checking
- Well-structured tabs (list, detail, import, export, settings)
- TypeScript interfaces for all data shapes

**Issues Found & Fixed:**
- Action column button now has proper `aria-label` with employee context
- Button render function now receives `emp` parameter (was ignoring it)

### 5.2 HRIS: Attendance (`pages/hq/hris/attendance.tsx`)

**Strengths:**
- Comprehensive feature set (live, daily, monthly, shifts, geofence, rotations, settings)
- Good use of `useMemo` for derived values
- Proper keyboard navigation for date selection
- Status badges with semantic colors

**Issues Found & Fixed:**
- All table headers now have `scope="col"` attribute
- Date navigation buttons have `aria-label`
- Search and filter inputs have `aria-label`
- Decorative icons marked with `aria-hidden="true"`

### 5.3 HRIS: Payroll (`pages/hq/hris/payroll/main.tsx`)

**Strengths:**
- Bulk upload feature with client-side validation
- Comprehensive component management (earnings, deductions, taxes)
- Multiple tabs for different payroll workflows
- XLSX export integration

**Issues Noted:**
- Uses `confirm()` dialogs which are not accessible
- Table headers should be audited for `scope` attributes
- Icon-only buttons need `aria-label` review

### 5.4 CRM: Customers (`pages/customers/list.tsx`, `components/customers/CustomerList.tsx`)

**Strengths:**
- Componentized architecture (CustomerList, CustomerStatisticsCard)
- Proper TypeScript interfaces (`Customer`, `CustomerFilter`, `CustomerSummary`)
- Filtering by customer type, membership level, sort order
- Responsive table with overflow-x-auto

**Issues Found & Fixed:**
- Table headers now have `scope="col"`
- Search input has `aria-label`
- "Detail" buttons have context-aware `aria-label`
- Decorative icons marked `aria-hidden="true"`

**Icon Library Inconsistency:**
- Uses `react-icons` (FaUser, FaBuilding, FaPhone, etc.) while rest of HQ uses `lucide-react`

### 5.5 SFA (`pages/hq/sfa/index.tsx`)

**Strengths:**
- Very comprehensive feature set
- Role-based tab visibility (`STAFF_HIDDEN_TABS`)
- Module availability check (fetches from `/api/modules/status`)
- Dynamic imports for heavy components (`TaskCalendarModule`, `SalesManagementModule`)
- Comprehensive state organization

**Areas for Improvement:**
- **File size:** 4,739 lines - needs refactoring into smaller components
- **Mock data:** 40+ MOCK_* constants - reduces testing confidence
- **Accessibility:** Due to size, this file needs a dedicated accessibility pass
- **Performance:** Consider code splitting by tab

---

## 6. Action Items & Recommendations

### Short Term (Next Sprint)

1. **Accessibility Pass:**
   - [ ] Audit all form inputs for proper label associations
   - [ ] Replace native `confirm()` with accessible modal dialogs
   - [ ] Add focus management for modals
   - [ ] Test keyboard navigation through all interactive flows

2. **SFA Refactor Planning:**
   - [ ] Create extraction plan for SFA tabs into individual components
   - [ ] Identify shared state that can be moved to context/store
   - [ ] Estimate refactor effort

3. **Error Handling:**
   - [ ] Add user-facing error states when APIs fail (instead of silent fallback to mock)
   - [ ] Add error boundaries at page level
   - [ ] Add loading states that don't auto-resolve to mock data

### Medium Term (2-3 Sprints)

1. **Consolidate Dependencies:**
   - [ ] Audit actual charting library usage
   - [ ] Standardize on one icon library
   - [ ] Remove unused dependencies

2. **Type Safety:**
   - [ ] Define proper types for all mock data
   - [ ] Enable `strict: true` in tsconfig.json incrementally
   - [ ] Add type guards for API responses

3. **Component Library:**
   - [ ] Extract common patterns (toast, tables, filters) into shared components
   - [ ] Create accessibility-first base components

### Long Term

1. **Performance Optimization:**
   - [ ] Implement proper code splitting by route/feature
   - [ ] Add virtualization for large tables
   - [ ] Audit Core Web Vitals

2. **Testing:**
   - [ ] Add unit tests for complex components
   - [ ] Add integration tests for critical flows
   - [ ] Add accessibility regression tests

---

## 7. Summary of Changes Made

| File | Changes |
|------|---------|
| `components/customers/CustomerList.tsx` | Added `scope="col"` to 6 table headers, `aria-label` to search and detail buttons, `aria-hidden` to icons |
| `pages/hq/hris/employees.tsx` | Fixed action button to receive employee data, added `aria-label` with employee context, added `title` attribute |
| `pages/hq/hris/attendance.tsx` | Added `scope="col"` to 18 table headers across 3 tabs, `aria-label` to 8 interactive elements, `aria-hidden` to decorative icons |

**Total accessibility fixes applied: ~30 improvements across 3 files**

---

## 8. Files for Follow-up Review

The following files need deeper accessibility audits due to their size and complexity:

1. **`pages/hq/sfa/index.tsx`** (4,739 lines) - Too large for initial pass, needs dedicated review
2. **`pages/hq/hris/payroll/main.tsx`** (1,670 lines) - Needs table scope and icon button review
3. **`pages/hq/hris/leave.tsx`** (~800 lines) - Needs table scope and icon button review
4. **`pages/employee/index.tsx`** (29,347 chars) - Employee self-service portal needs review

---

**Audit Completed:** July 2, 2026  
**Critical Accessibility Issues Fixed:** Yes  
**Report Generated:** FE-HRIS-CRM-REPORT.md
