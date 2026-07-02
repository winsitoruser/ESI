# Stock Opname Variance Resolution Flow
## ISO Compliant - SOP & Documentation System

## Overview
Sistem penyelesaian selisih stock opname yang komprehensif, sesuai dengan ISO 9001 (Quality Management), ISO 22000 (Food Safety), dan best practices inventory management. Mencakup workflow, approval system, incident reporting, dan dokumentasi lengkap.

---

## 1. VARIANCE DETECTION & CLASSIFICATION

### A. Variance Detection
**Saat Physical Count ≠ System Stock:**
```
Physical Stock - System Stock = Variance
```

**Contoh:**
- System Stock: 500 kg Tepung
- Physical Count: 480 kg Tepung
- **Variance: -20 kg (Shortage)**

### B. Variance Classification

#### **1. By Magnitude (Besaran):**

**Minor Variance:**
- Threshold: < 2% atau < Rp 100,000
- Approval: Supervisor
- Investigation: Optional
- Action: Quick adjustment

**Moderate Variance:**
- Threshold: 2-5% atau Rp 100,000-500,000
- Approval: Manager
- Investigation: Required
- Action: Root cause analysis

**Major Variance:**
- Threshold: > 5% atau > Rp 500,000
- Approval: Director/GM
- Investigation: Mandatory + Audit
- Action: Comprehensive investigation

#### **2. By Direction (Arah):**

**Shortage (Kekurangan):**
- Physical < System
- Potential causes: Theft, damage, unreported usage
- Financial impact: Loss/expense
- Risk level: HIGH

**Overage (Kelebihan):**
- Physical > System
- Potential causes: Unreported receiving, data entry error
- Financial impact: Asset increase
- Risk level: MEDIUM

#### **3. By Category (Kategori):**

**Acceptable Variance:**
- Within tolerance limit
- Normal business operation
- Quick approval process

**Unacceptable Variance:**
- Exceeds tolerance limit
- Requires investigation
- Formal approval process

---

## 2. VARIANCE RESOLUTION WORKFLOW

```
┌─────────────────────────────────────────────────────────────┐
│                    VARIANCE DETECTED                         │
│              (Physical ≠ System Stock)                       │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│              STEP 1: IMMEDIATE ACTIONS                       │
│  • Recount (double-check physical count)                    │
│  • Verify system data (check transaction history)           │
│  • Isolate affected items (quarantine if needed)            │
│  • Document initial findings                                │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│         STEP 2: VARIANCE CLASSIFICATION                      │
│  • Calculate variance amount & percentage                    │
│  • Determine financial impact                                │
│  • Classify by magnitude (Minor/Moderate/Major)             │
│  • Assign priority level                                     │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│            STEP 3: INVESTIGATION                             │
│  Minor: Quick review                                         │
│  Moderate: Root cause analysis (5 Whys)                      │
│  Major: Comprehensive investigation + Audit                  │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│         STEP 4: INCIDENT REPORT CREATION                     │
│  • Generate incident number (INC-YYYY-XXXX)                  │
│  • Document all findings                                     │
│  • Attach evidence (photos, CCTV, documents)                │
│  • Identify root cause                                       │
│  • Propose corrective action                                 │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│           STEP 5: APPROVAL WORKFLOW                          │
│  Minor → Supervisor                                          │
│  Moderate → Manager                                          │
│  Major → Director/GM                                         │
│  (Multi-level approval if needed)                            │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│         STEP 6: CORRECTIVE ACTION                            │
│  • Create adjustment document                                │
│  • Update inventory system                                   │
│  • Post to general ledger                                    │
│  • Implement preventive measures                             │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│         STEP 7: DOCUMENTATION & CLOSURE                      │
│  • Print incident report                                     │
│  • Archive all documents                                     │
│  • Update SOP if needed                                      │
│  • Close incident                                            │
│  • Lesson learned session                                    │
└─────────────────────────────────────────────────────────────┘
```

---

## 3. DETAILED ACTION STEPS

### STEP 1: IMMEDIATE ACTIONS (0-2 Hours)

#### **A. Recount Verification**
**Purpose:** Confirm variance is real, not counting error

**Actions:**
1. ✅ Assign different counter for recount
2. ✅ Use blind count method (no system reference)
3. ✅ Document recount results
4. ✅ Compare original count vs recount
5. ✅ If results differ, do third count

**Documentation:**
- Recount Form (RC-FORM-001)
- Counter signatures
- Timestamp of recount
- Variance confirmation

#### **B. System Data Verification**
**Purpose:** Ensure system stock is accurate

**Actions:**
1. ✅ Review transaction history (last 30 days)
2. ✅ Check receiving documents
3. ✅ Check shipping/sales documents
4. ✅ Verify production records
5. ✅ Check adjustment history
6. ✅ Identify last known good stock

**Documentation:**
- Transaction History Report
- Receiving/Shipping logs
- Production records
- Previous stock opname results

#### **C. Item Isolation**
**Purpose:** Prevent further discrepancy

**Actions:**
1. ✅ Tag items with "Under Investigation"
2. ✅ Move to quarantine area (if applicable)
3. ✅ Freeze transactions for affected SKU
4. ✅ Notify relevant departments
5. ✅ Secure evidence (photos, samples)

**Documentation:**
- Quarantine Tag (QT-TAG-001)
- Location transfer record
- Transaction freeze notice
- Photo evidence

#### **D. Initial Notification**
**Purpose:** Alert management immediately

**Actions:**
1. ✅ Notify immediate supervisor
2. ✅ Send email alert to management
3. ✅ Log in incident tracking system
4. ✅ Assign incident number
5. ✅ Set investigation deadline

**Documentation:**
- Incident Alert Email
- Incident Log Entry
- Assignment Record

---

### STEP 2: VARIANCE CLASSIFICATION (2-4 Hours)

#### **A. Calculate Variance Metrics**

**Formulas:**
```
Variance Quantity = Physical Stock - System Stock
Variance Percentage = (Variance / System Stock) × 100%
Variance Value = Variance Quantity × Unit Cost
```

**Example:**
```
Product: Tepung Terigu Premium
System Stock: 500 kg
Physical Stock: 480 kg
Unit Cost: Rp 12,000/kg

Variance Quantity: -20 kg
Variance Percentage: -4%
Variance Value: -Rp 240,000
Classification: MODERATE (2-5% range)
```

#### **B. Determine Priority Level**

**Priority Matrix:**
| Magnitude | Financial Impact | Priority | Response Time |
|-----------|------------------|----------|---------------|
| Minor | < Rp 100K | Low | 24 hours |
| Moderate | Rp 100K-500K | Medium | 12 hours |
| Major | > Rp 500K | High | 4 hours |
| Critical | > Rp 2M | Critical | Immediate |

#### **C. Assign Investigation Team**

**Minor Variance:**
- Lead: Warehouse Supervisor
- Support: Stock Controller

**Moderate Variance:**
- Lead: Warehouse Manager
- Support: QC Team, Finance
- Reviewer: Operations Manager

**Major Variance:**
- Lead: Operations Manager
- Support: Warehouse, QC, Finance, Security
- Reviewer: Director/GM
- Observer: Internal Audit

---

### STEP 3: INVESTIGATION (4-24 Hours)

#### **A. Root Cause Analysis (5 Whys Method)**

**Example - Shortage Case:**
```
Problem: 20 kg Tepung missing

Why 1: Why is there shortage?
Answer: Physical count less than system

Why 2: Why is physical less?
Answer: Items not found in designated location

Why 3: Why not in location?
Answer: No proper location tracking

Why 4: Why no tracking?
Answer: Staff not following SOP

Why 5: Why not following SOP?
Answer: Lack of training and supervision

ROOT CAUSE: Inadequate training & supervision
CORRECTIVE ACTION: Implement training program & daily supervision
```

#### **B. Investigation Checklist**

**For Shortage:**
- [ ] Check for unreported damage/waste
- [ ] Review CCTV footage (if available)
- [ ] Interview staff (receiving, warehouse, production)
- [ ] Check for theft indicators
- [ ] Review access logs
- [ ] Inspect storage conditions
- [ ] Check for data entry errors
- [ ] Review production consumption records
- [ ] Check for unreported samples/testing

**For Overage:**
- [ ] Check for unreported receiving
- [ ] Review purchase orders
- [ ] Check for duplicate entries
- [ ] Review return from production
- [ ] Check for data entry errors
- [ ] Verify unit of measure
- [ ] Check for location mix-up
- [ ] Review previous adjustments

#### **C. Evidence Collection**

**Required Evidence:**
1. **Photos:**
   - Item in current location
   - Storage conditions
   - Packaging condition
   - Label/barcode
   - Surrounding area

2. **Documents:**
   - Count sheets (original + recount)
   - Transaction history (30 days)
   - Receiving documents
   - Shipping documents
   - Production records
   - Previous stock opname

3. **Witness Statements:**
   - Counter testimony
   - Warehouse staff interview
   - Supervisor statement
   - Security report (if theft suspected)

4. **System Data:**
   - Transaction log export
   - User activity log
   - System audit trail
   - Previous stock levels

---

### STEP 4: INCIDENT REPORT CREATION (4-8 Hours)

#### **A. Incident Report Structure**

**Document Number:** INC-2024-XXXX

**Section 1: Incident Summary**
- Incident number & date
- Product details (SKU, name, category)
- Location (warehouse, rack, bin)
- Variance details (quantity, value, percentage)
- Classification (minor/moderate/major)
- Priority level
- Detected by
- Reported by

**Section 2: Variance Details**
- System stock (before opname)
- Physical count (1st count)
- Physical count (recount)
- Final confirmed variance
- Unit cost
- Total financial impact
- Last transaction date
- Last known good stock

**Section 3: Investigation Findings**
- Investigation team members
- Investigation period
- Methods used (5 Whys, Fishbone, etc.)
- Evidence collected
- Witness statements
- CCTV review results (if applicable)
- Root cause identified
- Contributing factors

**Section 4: Root Cause Analysis**
- Primary root cause
- Secondary causes
- Systemic issues identified
- Process gaps
- Control weaknesses

**Section 5: Corrective Actions**
- Immediate actions taken
- Short-term corrective actions
- Long-term preventive actions
- Process improvements
- SOP updates required
- Training needs
- System enhancements

**Section 6: Financial Impact**
- Variance value
- Cost category (COGS, Shrinkage, Loss)
- GL accounts affected
- Budget impact
- Insurance claim (if applicable)

**Section 7: Approvals**
- Investigated by (signature & date)
- Reviewed by (signature & date)
- Approved by (signature & date)
- Finance approval (signature & date)
- Final authority (signature & date)

**Section 8: Attachments**
- Photos (numbered)
- Count sheets
- Transaction reports
- Witness statements
- CCTV screenshots
- Supporting documents

---

### STEP 5: APPROVAL WORKFLOW (4-48 Hours)

#### **A. Approval Levels**

**Level 1: Supervisor (Minor Variance)**
**Authority:**
- Variance < 2% or < Rp 100,000
- Single product/SKU
- Clear root cause
- No fraud indication

**Requirements:**
- Recount verification
- Basic investigation
- Incident report (simplified)
- Corrective action plan

**Timeline:** 4 hours

---

**Level 2: Manager (Moderate Variance)**
**Authority:**
- Variance 2-5% or Rp 100K-500K
- Multiple products (< 5 SKUs)
- Root cause identified
- No major control issues

**Requirements:**
- Complete investigation
- Full incident report
- Root cause analysis
- Corrective & preventive actions
- Finance review

**Timeline:** 12 hours

---

**Level 3: Director/GM (Major Variance)**
**Authority:**
- Variance > 5% or > Rp 500,000
- Multiple products (> 5 SKUs)
- Systemic issues
- Fraud suspected
- Material financial impact

**Requirements:**
- Comprehensive investigation
- Full incident report
- Independent audit review
- Board notification (if material)
- Legal review (if fraud)
- Insurance claim preparation

**Timeline:** 24-48 hours

---

#### **B. Approval Process Flow**

```
INCIDENT REPORT SUBMITTED
        ↓
LEVEL 1: Supervisor Review
        ↓
    [Approved?]
    ↙        ↘
  YES         NO
   ↓           ↓
LEVEL 2     RETURN FOR
Manager     REVISION
   ↓
[Approved?]
  ↙      ↘
YES       NO
 ↓         ↓
LEVEL 3  RETURN
Director
 ↓
[Approved?]
  ↙      ↘
YES       NO
 ↓         ↓
POST    ESCALATE
ADJUSTMENT  TO BOARD
```

#### **C. Approval Criteria**

**Supervisor Must Verify:**
- [ ] Recount completed
- [ ] Variance confirmed
- [ ] Basic investigation done
- [ ] No fraud indicators
- [ ] Within authority limit

**Manager Must Verify:**
- [ ] Root cause identified
- [ ] Evidence documented
- [ ] Corrective actions defined
- [ ] Financial impact assessed
- [ ] Process improvements planned

**Director Must Verify:**
- [ ] Comprehensive investigation
- [ ] Independent review completed
- [ ] Systemic issues addressed
- [ ] Board notification (if needed)
- [ ] Legal implications reviewed

---

### STEP 6: CORRECTIVE ACTION (Immediate)

#### **A. Inventory Adjustment**

**Create Adjustment Document:**
```
Document Number: ADJ-2024-XXXX
Reference: INC-2024-XXXX (Incident Report)
Date: [Adjustment Date]
Approved By: [Approver Name]
```

**Adjustment Details:**
| SKU | Product | Location | System | Physical | Variance | Unit Cost | Value |
|-----|---------|----------|--------|----------|----------|-----------|-------|
| RM001 | Tepung | Gudang B1 | 500 | 480 | -20 | 12,000 | -240,000 |

**Journal Entry (Shortage):**
```
Dr. Inventory Shrinkage Expense    Rp 240,000
   Cr. Inventory - Raw Materials        Rp 240,000

Memo: Adjustment per Stock Opname SO-2024-001
      Incident Report INC-2024-XXXX
```

**Journal Entry (Overage):**
```
Dr. Inventory - Raw Materials     Rp 240,000
   Cr. Inventory Adjustment Income      Rp 240,000

Memo: Adjustment per Stock Opname SO-2024-001
      Incident Report INC-2024-XXXX
```

#### **B. System Update**

**Actions:**
1. ✅ Post adjustment to inventory system
2. ✅ Update stock balance
3. ✅ Post to general ledger
4. ✅ Update inventory valuation
5. ✅ Generate adjustment report
6. ✅ Notify relevant departments

**Verification:**
- [ ] System stock = Physical stock (after adjustment)
- [ ] GL balance updated
- [ ] Inventory value reconciled
- [ ] Reports generated
- [ ] Notifications sent

#### **C. Preventive Measures**

**Immediate Actions:**
1. **Process Improvement:**
   - Update SOP
   - Add control checkpoints
   - Implement double-check
   - Enhance supervision

2. **Training:**
   - Retrain affected staff
   - Conduct awareness session
   - Update training materials
   - Assess competency

3. **System Enhancement:**
   - Add validation rules
   - Implement alerts
   - Enhance reporting
   - Improve traceability

4. **Physical Controls:**
   - Improve storage layout
   - Enhance security
   - Better labeling
   - Access control

---

### STEP 7: DOCUMENTATION & CLOSURE (24-48 Hours)

#### **A. Document Package**

**Required Documents:**
1. **Incident Report** (INC-2024-XXXX)
2. **Count Sheets** (Original + Recount)
3. **Investigation Report**
4. **Root Cause Analysis**
5. **Corrective Action Plan**
6. **Adjustment Document** (ADJ-2024-XXXX)
7. **Approval Forms** (All levels)
8. **Evidence Package** (Photos, statements, etc.)
9. **Financial Impact Report**
10. **Closure Report**

#### **B. Document Retention**

**Retention Period:**
- Active incidents: Current year + 1 year
- Closed incidents: 7 years (tax requirement)
- Major incidents: 10 years (audit requirement)
- Fraud cases: Permanent

**Storage:**
- Physical: Locked filing cabinet
- Digital: Secure server with backup
- Access: Restricted (need-to-know basis)
- Backup: Off-site storage

#### **C. Lesson Learned Session**

**Participants:**
- Investigation team
- Warehouse staff
- Management
- QC team
- Finance

**Agenda:**
1. Incident overview
2. Root cause discussion
3. What went wrong
4. What went right
5. Improvements implemented
6. Lessons learned
7. Best practices
8. Q&A

**Output:**
- Lesson learned document
- Updated SOP
- Training materials
- Process improvements

---

## 4. PRINTABLE DOCUMENTS

### A. Incident Report Template

**Document:** Variance Incident Report
**Form Number:** INC-FORM-001
**ISO Reference:** ISO 9001:2015 Clause 10.2

**Sections:**
1. Header (Company logo, document number, date)
2. Incident summary table
3. Variance details with calculations
4. Investigation findings
5. Root cause analysis (5 Whys diagram)
6. Corrective actions table
7. Financial impact summary
8. Approval signatures section
9. Attachments list
10. Footer (page number, confidential marking)

**Print Options:**
- Full report (all sections)
- Summary report (executive summary)
- Financial report (finance focus)
- Technical report (operations focus)

---

### B. Adjustment Document Template

**Document:** Inventory Adjustment Form
**Form Number:** ADJ-FORM-001
**ISO Reference:** ISO 9001:2015 Clause 8.5

**Sections:**
1. Header (Company, warehouse, date)
2. Adjustment number & reference
3. Reason for adjustment
4. Item details table
5. Variance summary
6. Financial impact
7. Approval signatures
8. GL posting reference
9. Footer

---

### C. Approval Form Template

**Document:** Variance Approval Form
**Form Number:** APP-FORM-001
**ISO Reference:** ISO 9001:2015 Clause 5.3

**Sections:**
1. Incident reference
2. Variance summary
3. Investigation summary
4. Recommendation
5. Approval decision (Approve/Reject/Return)
6. Comments
7. Signature & date
8. Next approver (if applicable)

---

### D. Recount Verification Form

**Document:** Physical Count Verification
**Form Number:** RC-FORM-001

**Sections:**
1. Original count details
2. Recount details
3. Counter information
4. Variance confirmation
5. Witness signatures
6. Supervisor approval

---

## 5. ISO COMPLIANCE REQUIREMENTS

### A. ISO 9001:2015 (Quality Management)

**Clause 8.5.6 - Control of Changes:**
- Document all inventory changes
- Approval before implementation
- Review consequences
- Maintain records

**Clause 10.2 - Nonconformity & Corrective Action:**
- React to nonconformity (variance)
- Evaluate need for action
- Implement corrective action
- Review effectiveness
- Update risks and opportunities

**Compliance Checklist:**
- [ ] Variance documented
- [ ] Root cause identified
- [ ] Corrective action implemented
- [ ] Effectiveness reviewed
- [ ] Records maintained

---

### B. ISO 22000:2018 (Food Safety)

**Clause 8.9 - Control of Nonconformity:**
- Handle nonconforming products
- Evaluate for food safety impact
- Decide on disposition
- Document decisions
- Verify effectiveness

**For Food Products:**
- [ ] Food safety impact assessed
- [ ] Quarantine if needed
- [ ] Disposition decided (use/rework/dispose)
- [ ] Traceability maintained
- [ ] Regulatory notification (if required)

---

### C. Documentation Requirements

**ISO 9001 Clause 7.5 - Documented Information:**

**Must Create:**
- Incident reports
- Investigation records
- Corrective action plans
- Approval records
- Training records

**Must Retain:**
- 7 years minimum
- Accessible when needed
- Protected from loss
- Controlled distribution

**Must Control:**
- Version control
- Review and approval
- Distribution control
- Obsolete document removal

---

## 6. AUDIT TRAIL REQUIREMENTS

### A. Complete Traceability

**What to Track:**
1. **Who:**
   - Who detected variance
   - Who counted (original + recount)
   - Who investigated
   - Who approved (each level)
   - Who posted adjustment

2. **What:**
   - What product/SKU
   - What variance (quantity, value)
   - What root cause
   - What corrective action
   - What documents created

3. **When:**
   - When detected
   - When recounted
   - When investigated
   - When approved
   - When adjusted
   - When closed

4. **Where:**
   - Where stored (location)
   - Where found (during count)
   - Where moved (if relocated)

5. **Why:**
   - Why variance occurred
   - Why corrective action chosen
   - Why approved/rejected

6. **How:**
   - How detected
   - How investigated
   - How resolved
   - How prevented

---

### B. System Audit Log

**Required Log Entries:**
```
[2024-01-24 14:30:15] USER: john.doe
ACTION: Variance Detected
INCIDENT: INC-2024-0123
PRODUCT: RM001 - Tepung Terigu
VARIANCE: -20 kg (-4%)
VALUE: -Rp 240,000
STATUS: Investigation Started

[2024-01-24 15:45:22] USER: jane.smith
ACTION: Recount Completed
INCIDENT: INC-2024-0123
RESULT: Variance Confirmed
STATUS: Investigation In Progress

[2024-01-24 18:20:10] USER: supervisor.warehouse
ACTION: Investigation Completed
INCIDENT: INC-2024-0123
ROOT_CAUSE: Inadequate training
STATUS: Pending Approval

[2024-01-25 09:15:30] USER: manager.operations
ACTION: Approved Level 2
INCIDENT: INC-2024-0123
DECISION: Approved
STATUS: Adjustment Created

[2024-01-25 10:00:45] USER: system.auto
ACTION: Adjustment Posted
INCIDENT: INC-2024-0123
ADJ_NUMBER: ADJ-2024-0456
GL_POSTED: Yes
STATUS: Closed
```

---

## 7. PERFORMANCE METRICS & KPIs

### A. Variance Metrics

**Variance Rate:**
```
Variance Rate = (Items with Variance / Total Items Counted) × 100%
Target: < 5%
```

**Shrinkage Rate:**
```
Shrinkage Rate = (Shortage Value / Total Inventory Value) × 100%
Target: < 2%
```

**Accuracy Rate:**
```
Accuracy Rate = (Items without Variance / Total Items) × 100%
Target: > 95%
```

### B. Process Metrics

**Investigation Time:**
- Minor: < 4 hours
- Moderate: < 12 hours
- Major: < 24 hours

**Resolution Time:**
- Minor: < 24 hours
- Moderate: < 48 hours
- Major: < 72 hours

**Approval Time:**
- Level 1: < 4 hours
- Level 2: < 12 hours
- Level 3: < 24 hours

### C. Quality Metrics

**First Time Resolution Rate:**
```
FTR Rate = (Resolved without Rework / Total Incidents) × 100%
Target: > 90%
```

**Recurring Incident Rate:**
```
Recurring Rate = (Same Root Cause / Total Incidents) × 100%
Target: < 10%
```

---

## 8. CONTINUOUS IMPROVEMENT

### A. Monthly Review

**Review Items:**
1. Total incidents by category
2. Top 5 products with variance
3. Root cause analysis summary
4. Corrective actions effectiveness
5. Process improvements implemented
6. Training needs identified
7. System enhancements required

### B. Quarterly Audit

**Audit Focus:**
1. Compliance with SOP
2. Documentation completeness
3. Approval process adherence
4. Corrective action effectiveness
5. Preventive measures impact
6. ISO compliance status

### C. Annual Assessment

**Assessment Areas:**
1. Overall variance trend
2. Financial impact analysis
3. Process maturity level
4. Staff competency
5. System effectiveness
6. Best practices adoption

---

## SUMMARY

This comprehensive variance resolution system ensures:

✅ **Immediate Detection** - Real-time variance identification
✅ **Structured Investigation** - Systematic root cause analysis
✅ **Multi-Level Approval** - Authority-based decision making
✅ **Complete Documentation** - ISO-compliant record keeping
✅ **Printable Reports** - Professional incident documentation
✅ **Audit Trail** - Full traceability of all actions
✅ **Corrective Actions** - Effective problem resolution
✅ **Preventive Measures** - Continuous improvement
✅ **ISO Compliance** - Meets ISO 9001 & ISO 22000
✅ **SOP Adherence** - Standard operating procedures

**Result:** World-class variance management system with full accountability, traceability, and compliance.
