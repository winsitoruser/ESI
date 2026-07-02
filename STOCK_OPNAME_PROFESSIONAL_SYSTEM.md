# Sistem Stock Opname Profesional
## Standard Inventory Management System

## Overview
Sistem stock opname (stock taking/physical inventory count) yang komprehensif dan profesional untuk manajemen inventory yang akurat, terintegrasi dengan variance analysis, approval workflow, dan financial reconciliation.

## 1. JENIS STOCK OPNAME

### A. Full Stock Opname (Periodic Count)
**Karakteristik:**
- Menghitung seluruh inventory
- Dilakukan periodik (bulanan/tahunan)
- Operasional bisa dihentikan sementara
- Akurasi tinggi, waktu lama
- Untuk audit dan laporan keuangan

**Frekuensi:**
- Tahunan: Wajib untuk audit
- Kuartalan: Untuk bisnis besar
- Bulanan: Untuk FMCG/food retail

### B. Cycle Count (Perpetual Inventory)
**Karakteristik:**
- Menghitung sebagian inventory secara bergilir
- Dilakukan terus-menerus
- Operasional tidak terganggu
- Akurasi tinggi, efisien
- Untuk continuous improvement

**Metode:**
- ABC Analysis based
- High-value items: Weekly
- Medium-value items: Monthly
- Low-value items: Quarterly

### C. Spot Check (Random Sampling)
**Karakteristik:**
- Random sampling
- Verifikasi cepat
- Deteksi fraud/theft
- Audit internal

**Trigger:**
- Suspicious activity
- High-value items
- Fast-moving items
- Complaint investigation

## 2. WORKFLOW STOCK OPNAME

```
PLANNING
   ↓
PREPARATION
   ↓
FREEZE INVENTORY (Optional)
   ↓
PHYSICAL COUNT
   ↓
DATA ENTRY
   ↓
VARIANCE ANALYSIS
   ↓
INVESTIGATION (if variance > threshold)
   ↓
APPROVAL
   ↓
ADJUSTMENT
   ↓
RECONCILIATION
   ↓
REPORTING
```

## 3. TAHAPAN DETAIL

### A. Planning Phase
**Activities:**
1. Tentukan jenis opname (full/cycle/spot)
2. Jadwalkan tanggal dan waktu
3. Assign team dan area
4. Siapkan tools (scanner, form, tablet)
5. Komunikasi ke stakeholders

**Deliverables:**
- Stock opname schedule
- Team assignment
- Area mapping
- Count sheets/forms

### B. Preparation Phase
**Activities:**
1. Organize warehouse/storage
2. Label semua lokasi
3. Print count sheets
4. Brief counting team
5. Setup system (freeze transactions)

**Checklist:**
- [ ] Warehouse organized
- [ ] Labels updated
- [ ] Count sheets ready
- [ ] Team briefed
- [ ] System prepared

### C. Physical Count Phase
**Activities:**
1. Count by location/category
2. Double count untuk high-value
3. Record count results
4. Tag counted items
5. Supervisor verification

**Best Practices:**
- Count in pairs (counter + recorder)
- Use barcode scanner
- Blind count (tanpa lihat system stock)
- Tag counted items
- Document discrepancies immediately

### D. Data Entry Phase
**Activities:**
1. Input physical count ke system
2. Validate data entry
3. Cross-check dengan count sheets
4. Identify missing counts
5. Recount if needed

**Validation:**
- Double entry verification
- Range check (reasonable values)
- Completeness check
- Supervisor approval

### E. Variance Analysis Phase
**Activities:**
1. Calculate variance (Physical - System)
2. Categorize variance (over/under/missing)
3. Calculate variance value (Qty × Cost)
4. Identify root causes
5. Prioritize investigation

**Variance Categories:**
- **Overage:** Physical > System
- **Shortage:** Physical < System
- **Missing:** Not found physically
- **Unrecorded:** Found but not in system

**Thresholds:**
- Minor: < 2% or < Rp 100,000
- Moderate: 2-5% or Rp 100,000-500,000
- Major: > 5% or > Rp 500,000

### F. Investigation Phase
**For Major Variances:**
1. Review transaction history
2. Check receiving/shipping records
3. Interview staff
4. Review CCTV (if available)
5. Identify root cause

**Common Causes:**
- Data entry errors
- Unreported damage/waste
- Theft/shrinkage
- Receiving errors
- Shipping errors
- Location errors
- Unit of measure errors

### G. Approval Phase
**Approval Levels:**
1. **Supervisor:** Minor variances (< 2%)
2. **Manager:** Moderate variances (2-5%)
3. **Director:** Major variances (> 5%)

**Approval Criteria:**
- Variance amount
- Root cause identified
- Corrective action planned
- Supporting documentation

### H. Adjustment Phase
**Activities:**
1. Create adjustment document
2. Get approval
3. Post adjustment to system
4. Update inventory records
5. Generate adjustment report

**Adjustment Types:**
- Increase (for overage)
- Decrease (for shortage)
- Write-off (for missing/damaged)
- Reclassification (location/category)

### I. Reconciliation Phase
**Activities:**
1. Verify system stock = physical stock
2. Update inventory valuation
3. Post to general ledger
4. Reconcile with accounting
5. Close stock opname

**Financial Impact:**
- Inventory asset adjustment
- Cost of goods sold adjustment
- Shrinkage/loss expense
- Variance to standard cost

### J. Reporting Phase
**Reports Generated:**
1. Stock opname summary
2. Variance report
3. Adjustment report
4. Financial impact report
5. Root cause analysis
6. Action plan

## 4. DATA STRUCTURE

### Stock Opname Header
```typescript
{
  opnameId: string,
  opnameNumber: string,
  opnameType: 'full' | 'cycle' | 'spot',
  status: 'draft' | 'in_progress' | 'completed' | 'approved' | 'posted',
  scheduledDate: string,
  startDate: string,
  endDate: string,
  location: string,
  warehouse: string,
  area: string,
  performedBy: string[],
  supervisedBy: string,
  approvedBy: string,
  notes: string,
  freezeInventory: boolean,
  totalItems: number,
  countedItems: number,
  itemsWithVariance: number,
  totalVarianceValue: number,
  createdAt: string,
  updatedAt: string
}
```

### Stock Opname Item
```typescript
{
  itemId: string,
  opnameId: string,
  productId: string,
  productName: string,
  sku: string,
  category: string,
  location: string,
  uom: string,
  
  // Stock Data
  systemStock: number,
  physicalCount: number,
  variance: number,
  variancePercentage: number,
  
  // Financial Data
  unitCost: number,
  varianceValue: number,
  
  // Count Details
  countedBy: string,
  countDate: string,
  countMethod: 'manual' | 'scanner',
  recountRequired: boolean,
  recountCount?: number,
  
  // Variance Analysis
  varianceCategory: 'minor' | 'moderate' | 'major',
  rootCause?: string,
  investigation?: string,
  corrective Action?: string,
  
  // Status
  status: 'pending' | 'counted' | 'verified' | 'investigated' | 'approved',
  notes: string,
  photos?: string[]
}
```

### Adjustment Document
```typescript
{
  adjustmentId: string,
  adjustmentNumber: string,
  opnameId: string,
  adjustmentDate: string,
  adjustmentType: 'increase' | 'decrease' | 'write_off',
  status: 'draft' | 'pending_approval' | 'approved' | 'posted',
  totalValue: number,
  approvedBy: string,
  postedBy: string,
  postedDate: string,
  glImpact: {
    inventoryAsset: number,
    cogs: number,
    shrinkageExpense: number,
    varianceAccount: number
  },
  items: AdjustmentItem[]
}
```

## 5. VARIANCE ANALYSIS

### A. Variance Calculation
```typescript
Variance Quantity = Physical Count - System Stock
Variance Percentage = (Variance / System Stock) × 100%
Variance Value = Variance Quantity × Unit Cost
```

### B. Variance Classification
**By Magnitude:**
- **Minor:** < 2% or < Rp 100,000
- **Moderate:** 2-5% or Rp 100,000-500,000
- **Major:** > 5% or > Rp 500,000

**By Direction:**
- **Overage:** Physical > System (potential unreported receiving)
- **Shortage:** Physical < System (potential theft/damage)
- **Zero Variance:** Physical = System (accurate)

**By Category:**
- **Acceptable:** Within tolerance
- **Requires Investigation:** Above threshold
- **Critical:** Significant financial impact

### C. Root Cause Analysis (5 Whys)
**Example:**
1. Why shortage? → Physical count less than system
2. Why less? → Items not found in location
3. Why not found? → Moved to different location
4. Why moved? → No proper location management
5. Why no management? → No SOP for location transfer

**Root Cause:** Lack of location management SOP

**Corrective Action:** Implement location transfer SOP

## 6. APPROVAL WORKFLOW

### Level 1: Supervisor
**Authority:**
- Minor variances (< 2%)
- Total value < Rp 500,000
- Routine adjustments

**Requirements:**
- Count verification
- Basic explanation
- Photo evidence (optional)

### Level 2: Manager
**Authority:**
- Moderate variances (2-5%)
- Total value Rp 500,000 - 2,000,000
- Non-routine adjustments

**Requirements:**
- Investigation report
- Root cause analysis
- Corrective action plan
- Supporting documents

### Level 3: Director
**Authority:**
- Major variances (> 5%)
- Total value > Rp 2,000,000
- Write-offs
- Policy exceptions

**Requirements:**
- Comprehensive investigation
- Financial impact analysis
- Board presentation (if material)
- Audit committee review

## 7. FINANCIAL INTEGRATION

### A. Journal Entries

**1. Inventory Increase (Overage):**
```
Dr. Inventory Asset              Rp XXX
   Cr. Inventory Adjustment Income    Rp XXX
```

**2. Inventory Decrease (Shortage):**
```
Dr. Inventory Shrinkage Expense  Rp XXX
   Cr. Inventory Asset                Rp XXX
```

**3. Write-off (Damaged/Obsolete):**
```
Dr. Inventory Write-off Expense  Rp XXX
   Cr. Inventory Asset                Rp XXX
```

**4. Variance to Standard Cost:**
```
Dr. Inventory Variance Account   Rp XXX
   Cr. Inventory Asset                Rp XXX
```

### B. Impact on Financial Statements

**Balance Sheet:**
- Inventory asset value adjusted
- Working capital impact

**Income Statement:**
- Shrinkage expense (shortage)
- Adjustment income (overage)
- Write-off expense (damaged)

**Cash Flow:**
- No direct cash impact
- Indirect impact on working capital

## 8. KPIs & METRICS

### A. Accuracy Metrics
- **Inventory Accuracy Rate:** (Items with zero variance / Total items) × 100%
- **Target:** > 95%

- **Variance Rate:** (Items with variance / Total items) × 100%
- **Target:** < 5%

- **Shrinkage Rate:** (Shortage value / Total inventory value) × 100%
- **Target:** < 2%

### B. Efficiency Metrics
- **Count Time per Item:** Total time / Items counted
- **Target:** < 2 minutes/item

- **Recount Rate:** Recounts / Total counts
- **Target:** < 10%

- **Completion Rate:** Completed on time / Total scheduled
- **Target:** > 90%

### C. Financial Metrics
- **Total Variance Value:** Sum of all variance values
- **Shrinkage Cost:** Total shortage value
- **Adjustment Impact:** Net adjustment to P&L

## 9. BEST PRACTICES

### A. Preparation
1. Schedule during low activity periods
2. Organize warehouse before count
3. Train counting team
4. Use technology (barcode scanner)
5. Prepare backup plan

### B. Counting
1. Blind count (no system reference)
2. Count in pairs
3. Double count high-value items
4. Tag counted items
5. Document immediately

### C. Variance Management
1. Set clear thresholds
2. Investigate promptly
3. Document root causes
4. Implement corrective actions
5. Track recurring issues

### D. Continuous Improvement
1. Analyze variance trends
2. Identify systemic issues
3. Update procedures
4. Train staff
5. Leverage technology

## 10. TECHNOLOGY INTEGRATION

### A. Barcode/RFID Scanning
**Benefits:**
- Faster counting
- Higher accuracy
- Real-time data
- Reduced errors

### B. Mobile Apps
**Features:**
- Offline capability
- Photo capture
- Voice notes
- GPS location
- Signature capture

### C. System Integration
**Integrations:**
- ERP system
- WMS (Warehouse Management)
- Accounting software
- BI/Analytics tools

### D. Analytics & Reporting
**Capabilities:**
- Real-time dashboards
- Variance analysis
- Trend analysis
- Predictive analytics
- Automated alerts

## 11. COMPLIANCE & AUDIT

### A. Internal Controls
**Segregation of Duties:**
- Counter ≠ Recorder
- Counter ≠ Approver
- Adjuster ≠ Approver

**Documentation:**
- Count sheets signed
- Photos attached
- Investigation documented
- Approvals recorded

### B. Audit Trail
**Required Records:**
- Who counted
- When counted
- What was counted
- Variance identified
- Investigation performed
- Approval obtained
- Adjustment posted

### C. External Audit
**Auditor Requirements:**
- Observe physical count
- Test count accuracy
- Review variance analysis
- Verify adjustments
- Confirm financial impact

## 12. RISK MANAGEMENT

### A. Fraud Prevention
**Red Flags:**
- Consistent shortages
- Same items always missing
- Unusual variance patterns
- Reluctance to recount
- Missing documentation

**Controls:**
- Surprise counts
- Rotation of counters
- CCTV monitoring
- Segregation of duties
- Regular audits

### B. Error Prevention
**Common Errors:**
- Counting errors
- Data entry errors
- UOM confusion
- Location errors
- Timing differences

**Prevention:**
- Double counting
- Validation rules
- Clear labeling
- Training
- Standard procedures

## SUMMARY

Professional stock opname system ensures:
✅ **Accurate Inventory Records** - Physical = System
✅ **Financial Accuracy** - Correct asset valuation
✅ **Loss Prevention** - Identify shrinkage/theft
✅ **Process Improvement** - Root cause analysis
✅ **Compliance** - Audit requirements met
✅ **Efficiency** - Optimized counting process
✅ **Accountability** - Clear approval workflow
✅ **Integration** - Seamless with finance/ERP

**Result:** World-class inventory management with full traceability, accountability, and financial accuracy.
