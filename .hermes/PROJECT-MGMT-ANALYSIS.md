# 📊 Analisis Modul Project Management (PJM)

**Tanggal:** 28 Juni 2026  
**Branch:** New-Backend-Nainerp  
**Dianalisis oleh:** Hermes Agent — Project Management Module Analysis

---

## 1. Struktur Modul

### 1.1 Frontend Pages (3 files)

| File | Ukuran | Fungsi |
|------|--------|--------|
| `pages/hq/project-management/index.tsx` | 141 KB (1535 baris) | **Single-Page Application utama** — 14 tab: dashboard, projects, tasks, milestones, timesheets, resources, risks, budgets, documents, gantt, calendar, workload, sprints, evm |
| `pages/hq/project-management/[id].tsx` | 55 KB (916 baris) | **Halaman detail proyek** — overview, tasks (Kanban/table), milestones, resources, risks, budget, documents, comments, activity, watchers, approvals, dependencies |
| `pages/hq/project-management/gantt.tsx` | 26 KB (520 baris) | **Gantt Chart Center** — full-screen Gantt dengan filter, grouping, critical path, baseline overlay, drag-reschedule, export CSV |

### 1.2 API Endpoint (1 file)

| File | Ukuran | Metode |
|------|--------|--------|
| `pages/api/hq/project-management/index.ts` | 87 KB (1705 baris) | **Monolithic catch-all API** — action-based routing via `?action=` parameter. GET/POST/PUT/DELETE dalam satu file |

**Action yang di-support (~50+ actions):**
- **Core CRUD:** dashboard, projects, project-detail, tasks, task-detail, milestones, timesheets, resources, risks, budgets, documents
- **Gantt:** gantt, gantt-full, update-schedule
- **Advanced:** sprints, comments, activity-log, approvals, dependencies, watchers, baselines
- **Analytics:** evm, critical-path, workload, burndown, calendar, team-directory
- **Integrations:** employees, customers, branches, fleet-vehicles, inventory-items, purchase-orders
- **Workflow:** submit-timesheet, approve-timesheet, reject-timesheet, assign-task

Semua proteksi via `withHQAuth` middleware.

### 1.3 Model Database (9 files)

| Model | Tabel | Ukuran | Relasi Utama |
|-------|-------|--------|-------------|
| `PjmProject` | `pjm_projects` | 48 baris | hasMany: tasks, milestones, resources, risks, budgetItems, documents |
| `PjmTask` | `pjm_tasks` | 41 baris | belongsTo: project, milestone; hasMany: timesheets |
| `PjmMilestone` | `pjm_milestones` | 25 baris | belongsTo: project; hasMany: tasks |
| `PjmTimesheet` | `pjm_timesheets` | 30 baris | belongsTo: project, task |
| `PjmResource` | `pjm_resources` | 28 baris | belongsTo: project |
| `PjmBudget` | `pjm_budgets` | 26 baris | belongsTo: project |
| `PjmRisk` | `pjm_risks` | 31 baris | belongsTo: project |
| `PjmDocument` | `pjm_documents` | 27 baris | belongsTo: project |
| `PjmSetting` | `pjm_settings` | 14 baris | Standalone key-value settings store |

**Catatan:** Beberapa tabel (sprints, comments, activity_log, watchers, approvals, dependencies, baselines, attachments) hanya dipanggil via raw SQL dan **tidak memiliki model Sequelize**. Ini adalah tech debt — tidak ada validasi skema, migrasi, atau auto-migration untuk tabel-tabel ini.

### 1.4 Libraries & Components

| File | Ukuran | Fungsi |
|------|--------|--------|
| `lib/projectManagement/integrations.ts` | 25 KB (597 baris) | Cross-module integrations: HRIS, Finance, Procurement, CRM, Fleet, Inventory, Notifications, Activity Log, EVM, Critical Path, Burndown, Team Workload |
| `components/projectManagement/AdvancedGantt.tsx` | 27 KB | Advanced interactive Gantt chart component |
| `components/projectManagement/GanttChart.tsx` | 10 KB | Basic Gantt chart |
| `components/projectManagement/EmployeePicker.tsx` | 7 KB | Employee lookup picker |
| `components/projectManagement/LookupPicker.tsx` | 7 KB | Generic lookup picker (customers, branches, etc.) |
| `components/projectManagement/CalendarView.tsx` | 6 KB | Calendar view component |
| `components/projectManagement/EVMPanel.tsx` | 5 KB | EVM metrics panel |
| `components/projectManagement/WorkloadHeatmap.tsx` | 5 KB | Team workload heatmap |

---

## 2. Business Flows

### 2.1 Project Creation → Task Management → Completion

```
┌─────────────┐     ┌──────────────┐     ┌──────────┐     ┌────────────┐
│ Create      │────>│ Manage Tasks │────>│ Submit   │────>│ Complete   │
│ Project     │     │ (Kanban/     │     │ Timesheet│     │ & Archive  │
│ (POST       │     │  Table/Gantt)│     │ (draft→  │     │            │
│  projects)  │     │              │     │ submitted│     │            │
└─────────────┘     └──────────────┘     │ →approved│     └────────────┘
                                         └──────────┘
```

**Flow detail:**
1. **Create Project** → `POST ?action=projects` → auto-generates `project_code` (`PJM-{timestamp}`), auto-assigns PM notification
2. **Create Task** → `POST ?action=tasks` → linked to project, milestone, sprint; auto-assigns assignee notification
3. **Manage Tasks** → Kanban board (drag columns) or table view; status changes → triggers `refreshProjectRollups`
4. **Track Time** → Timesheet entries → submitted → approved → `syncTimesheetToPayroll`
5. **Monitor Progress** → Dashboard updates, EVM calculations, burndown charts, Gantt visualization
6. **Complete** → Status `completed` / `cancelled`

### 2.2 Risk Management Flow

```
Identify (POST risks) → Score (probability × impact) → 
  ├─ Score ≥ 9 (critical) → Auto-notify watchers
  └─ Score < 9 → Track normally
→ Mitigate / Resolve / Accept
```

### 2.3 Budget & Cost Flow

```
Create Budget Items (pjm_budgets) → 
  ├─ planned_amount, actual_amount, committed_amount
  └─ PO linkage via purchase_order_id
→ recomputeProjectActualCost() → updates pjm_projects.actual_cost
→ Optional push to finance_expenses
```

### 2.4 Approval Workflow

```
User creates approval request (POST ?action=approvals) → 
  ├─ entity_type: timesheet / budget / generic
  └─ Approver notified
→ Approver accepts/rejects (PUT ?action=approvals)
→ Notification sent back to requester
```

### 2.5 Gantt Chart → Critical Path → EVM

```
Gantt Full Data:
  ├─ Projects, Tasks, Milestones, Dependencies, Baselines
  ├─ Critical Path (CPM algorithm: forward/backward pass)
  └─ Baseline comparison

EVM Dashboard:
  ├─ BAC, PV, EV, AC, SV, CV, SPI, CPI, EAC, ETC, VAC
  └─ % Planned vs % Complete vs % Spent
```

---

## 3. User Journey

### 3.1 Team Member
```
Dashboard (tab) → View assigned tasks → 
  ├─ Kanban: drag to update status
  ├─ Timesheet: log hours → submit for approval
  ├─ Comments: discuss on tasks/project
  └─ Gantt: view schedule
```

### 3.2 Project Manager
```
Dashboard (overview) → 
  ├─ Projects tab: create/manage projects
  ├─ Tasks tab: assign, prioritize, track
  ├─ Milestones tab: define and track milestones
  ├─ Gantt tab: full schedule management
  ├─ Resources tab: allocate team
  ├─ Risks tab: identify, score, mitigate
  ├─ Budgets tab: track costs
  ├─ Timesheets tab: approve/reject
  ├─ EVM tab: earned value analysis
  ├─ Workload tab: team capacity
  └─ Sprints tab: sprint planning
```

### 3.3 Director / Executive
```
Dashboard → 
  ├─ KPI cards: total projects, active tasks, budget, high risks
  ├─ Charts: budget trend, task distribution, weekly hours, risk matrix
  ├─ Project health radar (schedule, budget, quality, risk, resources, stakeholder)
  └─ Recent projects + upcoming milestones
```

---

## 4. Technical Findings

### 4.1 Arsitektur

✅ **Monolith vs Modular**: Meski API dalam 1 file besar (1705 baris), struktur action-based routing cukup jelas dan memudahkan navigasi  
✅ **Soft-fail integrations**: Semua query cross-module via `safeQuery()` — tidak akan crash jika tabel sibling tidak ada  
✅ **Activity logging**: Setiap CREATE/UPDATE/DELETE tercatat di `pjm_activity_log`  
✅ **Notification system**: User notifications untuk assignment, risk escalation, approval workflow  
✅ **Comprehensive EVM**: Full earned value management metrics dengan perhitungan yang benar (BAC, PV, EV, AC, SPI, CPI, EAC, ETC)  
✅ **Critical Path Method**: Forward/backward pass implementasi yang benar untuk CPM  
✅ **Multi-tenant ready**: Semua model punya `tenantId` field  

### 4.2 Masalah Teknis

⚠️ **Tabel tanpa model Sequelize** — `pjm_sprints`, `pjm_comments`, `pjm_activity_log`, `pjm_watchers`, `pjm_approvals`, `pjm_dependencies`, `pjm_baselines`, `pjm_attachments` hanya diakses via raw SQL. Ini menyebabkan:
   - Tidak ada validasi skema otomatis
   - Tidak ada auto-migration
   - Tidak ada relationship definitions (associates)
   - Rawan error field name mismatch

⚠️ **Inconsistent field naming in raw SQL** — API menggunakan campuran field name style:
   - Beberapa query pakai `snake_case` (e.g., `project_id`, `assignee_name`)
   - Beberapa pakai `camelCase` (e.g., `"employeeNumber"`, `"branchId"` di HRIS integration)
   - Risiko: salah satu query bisa gagal jika skema tidak cocok

⚠️ **API Monolith terlalu besar** — 1705 baris untuk satu file API sulit di-maintain. Sebaiknya di-split per entitas (projects, tasks, timesheets, dll)

⚠️ **Hardcoded currency IDR** — `const fmt = (n: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' })` — tidak fleksibel untuk multi-currency

⚠️ **Mock data di production code** — `MOCK_BUDGET_TREND`, `MOCK_TASK_DISTRIBUTION`, `MOCK_RESOURCE_ALLOCATION`, `MOCK_RISK_MATRIX`, `MOCK_WEEKLY_HOURS`, `MOCK_PROJECT_HEALTH` didefinisikan dan digunakan sebagai fallback di komponen utama — seharusnya hanya untuk development

⚠️ **Error handling minimal di frontend** — Banyak `catch(() => {})` tanpa user feedback. Juga ada beberapa `.catch(() => [[]])` yang bisa menyembunyikan error serius

⚠️ **No TypeScript types for raw SQL results** — Semua hasil query di-cast sebagai `any[]`, kehilangan type safety

⚠️ **Gap model-field**: Model `PjmProject` tidak punya field `customer_id`, `manager_user_id`, `task_count`, `open_risks`, `rag_status`, `health_score`, dsb. yang digunakan di raw SQL

### 4.3 Masalah Keamanan

⚠️ **SQL injection risk**: Meski sebagian besar menggunakan parameterized query (`:param`), ada beberapa tempat yang concatenate user input langsung:
   - `INITCAP(REPLACE(probability, '_', ' '))` — safe karena field name
   - Filter `WHERE` building menggunakan string concatenation untuk table/column names — ini standard Sequelize tapi perlu review

---

## 5. UX Findings

### 5.1 Dashboard (index.tsx)
✅ **KPI cards** dengan icon, trend indicators, dan warna  
✅ **Task status pipeline** visual dengan badge colors  
✅ **KPI Gauges** (SVG donut) untuk on-time delivery, budget compliance, quality  
✅ **Charts**: budget trend (area), task distribution (pie), project health (radar), risk matrix, weekly hours  
✅ **Recent projects** dan **upcoming milestones** cards  

### 5.2 Project Detail ([id].tsx)
✅ **Kanban view** dengan drag-and-drop untuk task status changes  
✅ **12 sub-tabs**: overview, tasks, milestones, resources, risks, budget, documents, comments, activity, watchers, approvals, dependencies  
✅ **Budget tracking**: breakdown chart dengan planned vs actual  
✅ **Task pie chart** untuk distribution  
✅ **Collaboration features**: comments, activity log, watchers, approvals  

### 5.3 Gantt Chart (gantt.tsx)
✅ **Advanced filtering**: by project, assignee, status  
✅ **Grouping**: by project, assignee, or none  
✅ **View modes**: day, week, month, quarter  
✅ **Display toggles**: critical path, baseline, dependencies, weekends, milestones, projects  
✅ **Drag-reschedule** langsung update via API  
✅ **CSV export**  
✅ **Fullscreen mode**  
✅ **Side panel** untuk detail item  

### 5.4 Masalah UX

⚠️ **Single page terlalu besar** — index.tsx (1535 baris) berisi semua tab dalam 1 component. Performance akan menurun dengan banyak data  
⚠️ **Loading state**: Semua tab loading menggunakan `setLoading(true)` global — tidak ada granular loading per section  
⚠️ **No pagination for some views**: Timesheets, resources, risks tidak punya pagination di frontend meski API mendukung  
⚠️ **Form validation minimal**: Tidak ada validasi frontend yang jelas untuk required fields  
⚠️ **Color inconsistency**: Status colors didefinisikan di 3 tempat (`SC`, `PC`, `MATRIX_LEVEL_COLORS`) — bisa tidak konsisten  
⚠️ **No error boundaries**: Jika satu tab crash, seluruh halaman error  

---

## 6. Prioritized Fix List

### 🔴 High Priority (Critical)

| # | Issue | File | Impact |
|---|-------|------|--------|
| 1 | **8 tabel tanpa model Sequelize** (sprints, comments, activity_log, watchers, approvals, dependencies, baselines, attachments) | models/ | Migrasi, validasi, dan relationship tidak bisa diandalkan. Bisa menyebabkan data inconsistency |
| 2 | **Inconsistent column references** — raw SQL menggunakan column names yang tidak ada di model (e.g., `customer_id`, `manager_user_id`, `hris_employee_id`, `rag_status`, `story_points`, `sprint_id`) | `api/index.ts` | Query bisa runtime error jika skema tidak cocok |
| 3 | **Monolithic API file (1705 baris)** — sulit di-debug, di-test, dan di-maintain | `api/index.ts` | Perlu di-split per entity |
| 4 | **Mock data di production code** — fallback tanpa API data memberi ilusi fitur berfungsi | `index.tsx` | User melihat data palsu, bingung ketika data asli berbeda |

### 🟡 Medium Priority

| # | Issue | File | Impact |
|---|-------|------|--------|
| 5 | **Empty catch blocks** — 15+ `catch(() => {})` / `catch(() => [[]])` yang menyembunyikan error | `api/index.ts`, komponen | Error tidak terdeteksi |
| 6 | **Global loading state** — Tidak ada granular loading per tab/section | `index.tsx` | UX buruk untuk data besar |
| 7 | **No pagination on frontend** untuk resources, risks, documents | `index.tsx` | Bisa overload browser |
| 8 | **Hardcoded IDR currency** — tidak multi-currency friendly | `index.tsx`, `[id].tsx` | Tidak scalable untuk klien internasional |
| 9 | **No TypeScript interfaces untuk raw SQL results** — semua `any[]` | `api/index.ts` | Kehilangan type safety |

### 🟢 Low Priority

| # | Issue | File | Impact |
|---|-------|------|--------|
| 10 | **Color definitions duplikasi** (SC, PC di 2 tempat) | `index.tsx`, `[id].tsx` | Maintenance overhead |
| 11 | **No error boundaries** di halaman | Semua pages | Satu error crash seluruh halaman |
| 12 | **Form validation** minimal / tidak ada | `index.tsx` | User error mudah terjadi |
| 13 | **Batas 2000 lines per read_file** — beberapa file melebihi ini | Semua pages | Sulit di-review |

---

## 7. Ringkasan

**Kekuatan Modul:**
- Fitur sangat komprehensif: dari creational, task management, timesheets, resources, risks, budgets, documents, hingga analitik lanjutan (EVM, CPM, burndown, workload)
- Cross-module integration yang matang: HRIS, Finance, Procurement, Fleet, Inventory, CRM
- Notification & activity logging end-to-end
- Multi-tenant ready
- Gantt chart dengan drag-reschedule, critical path, baseline comparison

**Kelemahan Utama:**
- **API monolith** — 1 file 1705 baris
- **8 tabel tanpa model Sequelize** — gap validasi dan migrasi
- **Raw SQL inconsistencies** — field names tidak konsisten antara model dan query
- **Mock data di production** — bisa menyesatkan user
- **Error handling** — terlalu banyak empty catch blocks

**Rekomendasi Prioritas:**
1. Buat model Sequelize untuk 8 tabel yang hilang
2. Syncronize field names antara model definitions dan raw SQL queries
3. Split API menjadi file per entity (projects.ts, tasks.ts, timesheets.ts, dll)
4. Hapus mock data, ganti dengan loading/empty states
5. Tambahkan TypeScript interfaces untuk semua query results
