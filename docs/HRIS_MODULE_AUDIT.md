# HRIS Module Audit & Development
Generated: 2026-02-23

## 📊 Overview

Complete audit and enhancement of the HQ HRIS (Human Resource Information System) module including employee management, attendance tracking, KPI monitoring, performance evaluation, and payroll integration.

---

## 🗂️ Pages Analyzed

### 1. HRIS Dashboard (`/hq/hris`)
**File**: `pages/hq/hris/index.tsx` (25,922 bytes)

#### Features
- [x] Employee list with filters (department, status)
- [x] Search functionality
- [x] Stats overview (total, active, on leave, avg performance)
- [x] Department statistics
- [x] Employee detail modal
- [x] Status badges and trend indicators

---

### 2. KPI Dashboard (`/hq/hris/kpi`)
**File**: `pages/hq/hris/kpi.tsx` (35,185 bytes)

#### Features
- [x] Branch and employee view modes
- [x] KPI summary stats
- [x] Achievement status badges (exceeded, achieved, partial, not achieved)
- [x] Individual metric breakdown
- [x] Charts (ApexCharts integration)
- [x] Period and category filters
- [x] KPI detail modal

---

### 3. KPI Settings (`/hq/hris/kpi-settings`)
**File**: `pages/hq/hris/kpi-settings.tsx` (38,964 bytes)

#### Features
- [x] KPI template management
- [x] Scoring level configuration
- [x] Weight distribution
- [x] Bonus/penalty rules
- [x] Template assignment to positions

---

### 4. Attendance (`/hq/hris/attendance`)
**File**: `pages/hq/hris/attendance.tsx` (14,481 bytes)

#### Features
- [x] Monthly attendance overview
- [x] Branch summary statistics
- [x] Individual attendance records
- [x] Present/late/absent/leave tracking
- [x] Attendance rate calculation
- [x] Search and filter

---

### 5. Performance (`/hq/hris/performance`)
**File**: `pages/hq/hris/performance.tsx` (17,257 bytes)

#### Features
- [x] Performance review management
- [x] Historical performance tracking
- [x] Performance trend analysis
- [x] Top/low performers identification

---

## 🔧 API Endpoints

### Existing Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/hq/hris/employees` | GET/POST | Employee management |
| `/api/hq/hris/kpi` | GET/POST/PUT | KPI data management |
| `/api/hq/hris/kpi-scoring` | GET/POST | KPI score calculation |
| `/api/hq/hris/kpi-settings` | GET/POST/PUT | KPI configuration |
| `/api/hq/hris/kpi-templates` | GET/POST | KPI templates |
| `/api/hq/hris/attendance` | GET/POST | Attendance data |
| `/api/hq/hris/performance` | GET/POST | Performance data |
| `/api/hq/hris/webhooks` | POST | HRIS webhooks |

### New Endpoints Created

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/hq/hris/realtime` | GET | Real-time employee metrics |
| `/api/hq/hris/realtime` | POST | Broadcast HRIS updates |
| `/api/hq/hris/export` | GET | Export HRIS data |

### Export Types

| Type | Endpoint | Data |
|------|----------|------|
| Employees | `?type=employees` | Employee master data |
| Attendance | `?type=attendance` | Monthly attendance records |
| KPI | `?type=kpi` | KPI metrics and scores |
| Performance | `?type=performance` | Performance summary |
| Payroll | `?type=payroll` | Payroll calculation |

---

## 📐 KPI Calculation Formulas

### Achievement Calculation
```typescript
// Simple Achievement
achievement = (actual / target) * 100

// Weighted Score
weightedScore = sum(metric.achievement * metric.weight) / totalWeight

// Overall Score (1-5 scale)
score = weighted average of level scores based on achievement
```

### Scoring Levels
| Level | Label | Min % | Max % | Multiplier |
|-------|-------|-------|-------|------------|
| 5 | Excellent | 110 | 999 | 1.2 |
| 4 | Good | 100 | 109 | 1.0 |
| 3 | Average | 80 | 99 | 0.8 |
| 2 | Below Average | 60 | 79 | 0.6 |
| 1 | Poor | 0 | 59 | 0.4 |

### Status Determination
```typescript
if (achievement >= 110) return 'exceeded';
if (achievement >= 100) return 'achieved';
if (achievement >= 80) return 'partial';
return 'not_achieved';
```

### Bonus Calculation
```typescript
// Top Performer (score >= 4.5): 15% of base salary
// High Performer (score >= 4.0): 10% of base salary
// Good Performer (score >= 3.5): 5% of base salary
```

### Attendance Rate
```typescript
attendanceRate = (presentDays / totalWorkingDays) * 100
// Late counts as 0.5 present
// WFH counts as present
```

---

## 📈 Database Tables

### Employees
```sql
employees
├── id (UUID, PK)
├── tenant_id (UUID, FK)
├── branch_id (UUID, FK)
├── employee_id (VARCHAR) -- Employee code
├── name (VARCHAR)
├── email (VARCHAR)
├── phone (VARCHAR)
├── position (VARCHAR)
├── department (VARCHAR)
├── manager_id (UUID, FK → employees)
├── join_date (DATE)
├── status (ENUM: active, inactive, on_leave)
├── salary (DECIMAL)
├── is_active (BOOLEAN)
└── created_at, updated_at
```

### Attendance
```sql
attendance
├── id (UUID, PK)
├── tenant_id (UUID, FK)
├── employee_id (UUID, FK)
├── date (DATE)
├── check_in (TIME)
├── check_out (TIME)
├── status (ENUM: present, late, absent, leave, wfh)
├── notes (TEXT)
└── created_at
```

### KPI Metrics
```sql
kpi_metrics
├── id (UUID, PK)
├── tenant_id (UUID, FK)
├── code (VARCHAR)
├── name (VARCHAR)
├── category (ENUM: sales, operations, customer, financial)
├── unit (VARCHAR)
├── formula_type (VARCHAR)
├── formula (TEXT)
├── default_weight (DECIMAL)
├── measurement_frequency (VARCHAR)
├── applicable_positions (JSON)
└── created_at, updated_at
```

### KPI Scores
```sql
kpi_scores
├── id (UUID, PK)
├── tenant_id (UUID, FK)
├── employee_id (UUID, FK)
├── metric_id (UUID, FK)
├── period (DATE)
├── target (DECIMAL)
├── actual (DECIMAL)
├── achievement_percent (DECIMAL)
├── weight (DECIMAL)
├── score (DECIMAL)
├── notes (TEXT)
└── created_at, updated_at
```

---

## 🔌 WebSocket Events

| Event | Description | Trigger |
|-------|-------------|---------|
| `hris:attendance:update` | Attendance record updated | Check-in/out |
| `hris:kpi:update` | KPI score updated | Performance entry |
| `hris:performance:update` | Performance review completed | Review submission |
| `hris:employee:update` | Employee data changed | Profile update |

### Integration Flow
```
[Branch Check-in]
       │
       └─→ hris:attendance:update ─→ [HQ HRIS Dashboard]
                                            │
                                    ┌───────┴───────┐
                                    ▼               ▼
                            [Attendance Stats] [Alerts]

[POS Transaction Complete]
       │
       └─→ Calculate Sales KPI ─→ hris:kpi:update
                                        │
                                        ▼
                               [KPI Dashboard Update]
```

---

## 🔄 Branch Integration

### Data Sync Flow
```
[Branch Platform]
       │
       ├─→ Check-in/Check-out ─→ Attendance API
       │
       ├─→ Sales Data ─→ KPI Calculation
       │
       └─→ Employee Actions ─→ HRIS Dashboard

[HQ Platform]
       │
       ├─→ KPI Settings ─→ Broadcast to Branches
       │
       ├─→ Performance Review ─→ Notify Employee
       │
       └─→ Payroll Calculation ─→ Finance Module
```

### KPI Data Sources
| KPI | Data Source | Calculation |
|-----|-------------|-------------|
| Target Penjualan | POS Transactions | Sum of branch sales |
| Jumlah Transaksi | POS Transactions | Count per cashier |
| Kepuasan Pelanggan | Customer Feedback | Average rating * 20 |
| Kehadiran | Attendance Records | Present days / Working days |
| Efisiensi Operasional | Kitchen/Inventory | Output / Expected |

---

## ✅ Audit Checklist

### Frontend Pages
- [x] HRIS Dashboard with employee list
- [x] KPI Dashboard with metrics
- [x] KPI Settings management
- [x] Attendance tracking
- [x] Performance reviews

### Backend APIs
- [x] Employee management
- [x] KPI data and scoring
- [x] Attendance tracking
- [x] Real-time API (NEW)
- [x] Export API (NEW)

### Calculations
- [x] Achievement percentage
- [x] Weighted score calculation
- [x] Overall score (1-5 scale)
- [x] Status determination
- [x] Bonus/penalty calculation
- [x] Trend analysis

### Integration
- [x] Branch data sync
- [x] WebSocket events
- [x] HQ dashboard updates

---

## 📝 KPI Templates Available

### Sales KPIs
- `KPI-SALES-001`: Target Penjualan (40% weight)
- `KPI-SALES-002`: Jumlah Transaksi (20% weight)
- `KPI-SALES-003`: Nilai Rata-rata Transaksi (15% weight)
- `KPI-SALES-004`: Upselling Rate (10% weight)

### Operations KPIs
- `KPI-OPS-001`: Efisiensi Operasional (20% weight)
- `KPI-OPS-002`: Kehadiran (15% weight)
- `KPI-OPS-003`: Akurasi Stok (15% weight)

### Customer KPIs
- `KPI-CUST-001`: Kepuasan Pelanggan (20% weight)
- `KPI-CUST-002`: Waktu Pelayanan (15% weight)
- `KPI-CUST-003`: Tingkat Komplain (10% weight)

### Financial KPIs
- `KPI-FIN-001`: Profit Margin (25% weight)
- `KPI-FIN-002`: Pengendalian Biaya (15% weight)

---

## 🚀 Summary

| Component | Status |
|-----------|--------|
| HRIS Dashboard | ✅ Complete |
| KPI Dashboard | ✅ Complete |
| KPI Settings | ✅ Complete |
| Attendance | ✅ Complete |
| Performance | ✅ Complete |
| KPI Calculator | ✅ Complete |
| Real-time API | ✅ NEW - Created |
| Export API | ✅ NEW - Created |
| WebSocket Events | ✅ Complete |
| Branch Integration | ✅ Complete |

**HRIS MODULE: ✅ AUDIT COMPLETE**

---

## 📌 Formula Reference

### KPI Achievement
```
Achievement % = (Actual Value / Target Value) × 100
```

### Weighted Average
```
Weighted Avg = Σ(Achievement × Weight) / Σ(Weight)
```

### Attendance Rate
```
Attendance % = (Present + Late + WFH) / Total Days × 100
```

### Bonus Calculation
```
Bonus = Base Salary × Bonus Percentage (based on score level)
```

### Payroll
```
Total Salary = Base + Allowances + KPI Bonus - Deductions
```
