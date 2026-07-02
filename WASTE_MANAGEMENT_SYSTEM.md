# Sistem Manajemen Limbah & Produk Sisa Produksi
## Sesuai Standard FMCG, Food Retail & Multi-Purpose Business

## Overview
Sistem komprehensif untuk mengelola produk sisa, limbah, dan produk yang tidak layak jual dari proses produksi, dirancang sesuai dengan:
- **Standard Operasional FMCG (Fast-Moving Consumer Goods)**
- **Regulasi Food Safety & Hygiene**
- **Best Practices Food Retail Industry**
- **Multi-Purpose Business Requirements**
- **ISO 22000 (Food Safety Management)**
- **HACCP (Hazard Analysis Critical Control Points)**
- **GMP (Good Manufacturing Practices)**

Terintegrasi penuh dengan inventory, production, finance, dan compliance reporting.

## 1. Kategori Produk Sisa

### A. Produk Cacat (Defective Products)
- **Definisi:** Produk jadi yang tidak memenuhi standar kualitas
- **Perlakuan:**
  - Tidak bisa dijual dengan harga normal
  - Bisa dijual dengan diskon besar (clearance)
  - Atau dibuang jika tidak layak konsumsi
- **Pencatatan:** Loss/kerugian produksi

### B. Bahan Baku Sisa (Raw Material Waste)
- **Definisi:** Bahan baku yang terbuang saat produksi
- **Contoh:** Adonan yang menempel, tumpahan, dll
- **Perlakuan:** Dicatat sebagai waste/loss
- **Pencatatan:** Production overhead/loss

### C. Produk Expired/Kadaluarsa
- **Definisi:** Produk yang melewati tanggal expired
- **Perlakuan:**
  - Harus dibuang (tidak boleh dijual)
  - Dicatat sebagai kerugian
- **Pencatatan:** Inventory loss/write-off

### D. Produk Rusak (Damaged)
- **Definisi:** Produk rusak karena handling, penyimpanan
- **Perlakuan:** Tergantung tingkat kerusakan
- **Pencatatan:** Inventory loss

### E. Produk Recall (Product Recall)
- **Definisi:** Produk yang harus ditarik dari peredaran
- **Penyebab:** Kontaminasi, kesalahan label, masalah keamanan
- **Perlakuan:** Penarikan segera, dokumentasi lengkap
- **Pencatatan:** Recall loss + biaya penarikan

### F. Produk Tidak Lulus QC (Failed QC)
- **Definisi:** Produk tidak memenuhi standard quality control
- **Kriteria:** Rasa, tekstur, warna, aroma tidak sesuai
- **Perlakuan:** Rework atau disposal
- **Pencatatan:** QC rejection loss

## 1.1 Standard FMCG/Food Retail

### A. Batch/Lot Tracking
- **Requirement:** Setiap produk harus memiliki batch/lot number
- **Traceability:** Track dari raw material sampai finished goods
- **Recall Readiness:** Kemampuan trace back dalam 4 jam
- **Documentation:** Complete batch record

### B. Expiry Date Management (FEFO)
- **FEFO:** First Expired, First Out
- **Near Expiry Alert:** 30 days, 15 days, 7 days
- **Expired Product:** Automatic flagging & segregation
- **Disposal Protocol:** Documented destruction process

### C. Temperature Control (Cold Chain)
- **Monitoring:** Continuous temperature logging
- **Out of Range:** Automatic alert & quarantine
- **Documentation:** Temperature deviation report
- **Product Fate:** Evaluation by QC team

### D. Hygiene & Sanitation
- **Cleaning Schedule:** Daily, weekly, monthly
- **Pest Control:** Regular monitoring
- **Cross Contamination:** Prevention protocols
- **Waste Segregation:** Food waste vs non-food waste

## 2. Workflow Manajemen Limbah

```
PRODUKSI
   ↓
QUALITY CHECK
   ↓
┌─────────────┬──────────────┐
│   LOLOS QC  │  TIDAK LOLOS │
│             │              │
↓             ↓              ↓
PRODUK JADI   PRODUK CACAT   LIMBAH
(100%)        (Grade B/C)    (Waste)
   ↓             ↓              ↓
INVENTORY    CLEARANCE     DISPOSAL
NORMAL       SALE          RECORD
   ↓             ↓              ↓
DIJUAL       DIJUAL        KERUGIAN
NORMAL       DISKON        DICATAT
```

## 3. Data Structure

### Waste Record
```typescript
{
  id: string,
  wasteNumber: string,
  productionBatchId: string,
  wasteType: 'defective' | 'raw_material' | 'expired' | 'damaged',
  productSku?: string,
  productName?: string,
  quantity: number,
  unit: string,
  costValue: number, // Nilai kerugian
  wasteDate: string,
  reason: string,
  disposalMethod: 'discard' | 'clearance_sale' | 'donation' | 'recycle',
  clearancePrice?: number, // Jika dijual clearance
  recordedBy: string,
  notes?: string,
  photos?: string[],
  status: 'recorded' | 'disposed' | 'sold'
}
```

### Production Yield
```typescript
{
  batchId: string,
  plannedQuantity: number,
  producedQuantity: number,
  goodQuantity: number, // Lolos QC
  defectiveQuantity: number, // Cacat
  wasteQuantity: number, // Limbah
  yieldPercentage: number, // (good/planned) * 100
  defectRate: number, // (defective/produced) * 100
  wasteRate: number // (waste/produced) * 100
}
```

## 4. Financial Integration

### A. Cost Accounting

**Production Cost:**
```
Total Production Cost = Material Cost + Labor Cost + Overhead
Cost per Good Unit = Total Cost / Good Quantity
```

**Waste Loss:**
```
Waste Loss = (Defective Qty + Waste Qty) × Cost per Unit
```

**Journal Entry - Waste Loss:**
```
Dr. Production Loss/Waste Expense    Rp XXX
   Cr. Inventory - Finished Goods        Rp XXX
```

### B. Clearance Sale

**Journal Entry - Clearance Sale:**
```
Dr. Cash/Account Receivable          Rp XXX (clearance price)
Dr. Loss on Clearance Sale           Rp XXX (difference)
   Cr. Inventory - Grade B Products      Rp XXX (cost)
```

### C. Inventory Write-off

**Journal Entry - Expired/Damaged:**
```
Dr. Inventory Loss Expense           Rp XXX
   Cr. Inventory - Finished Goods        Rp XXX
```

## 5. Reporting & Analytics

### A. Production Efficiency Report
- Yield percentage per batch
- Defect rate trend
- Waste rate trend
- Cost per good unit

### B. Waste Cost Report
- Total waste value per period
- Waste by category
- Waste by product
- Waste trend analysis

### C. Financial Impact Report
- Total production loss
- Clearance sale recovery
- Net loss after recovery
- Impact on profit margin

## 6. KPI & Metrics

### Production KPIs:
- **Yield Rate:** Target > 95%
- **Defect Rate:** Target < 3%
- **Waste Rate:** Target < 2%

### Financial KPIs:
- **Waste Cost Ratio:** Waste Cost / Total Production Cost
- **Recovery Rate:** Clearance Sale Revenue / Waste Cost
- **Net Loss Ratio:** Net Waste Loss / Total Revenue

## 7. Preventive Actions

### Quality Control:
1. Pre-production material check
2. In-process quality monitoring
3. Final product inspection
4. Packaging quality check

### Waste Reduction:
1. Standard Operating Procedures (SOP)
2. Staff training
3. Equipment maintenance
4. Process optimization

### Inventory Management:
1. FIFO implementation
2. Expiry date monitoring
3. Proper storage conditions
4. Regular stock rotation

## 8. Compliance & Documentation

### Required Documents:
- Waste disposal certificate
- Quality control checklist
- Production batch report
- Financial loss report
- Photo evidence

### Regulatory Compliance:
- Food safety regulations
- Waste disposal regulations
- Financial reporting standards
- Tax deduction for losses

## 9. System Integration

### Production Module:
- Record yield data
- Track defects
- Calculate efficiency

### Inventory Module:
- Separate grade B inventory
- Track expiry dates
- Monitor damaged goods

### Finance Module:
- Record waste losses
- Track clearance sales
- Generate financial reports

### Analytics Module:
- Waste trends
- Cost analysis
- Performance metrics

## 10. User Roles & Permissions

### Production Manager:
- Record production yield
- Report defects
- Approve waste disposal

### Quality Control:
- Inspect products
- Classify defects
- Approve/reject products

### Finance:
- Review waste costs
- Approve write-offs
- Generate reports

### Admin:
- Full access
- System configuration
- Audit trail review
