# ANALISA & PENGEMBANGAN MODUL KEUANGAN (FINANCE)

## 📊 ANALISA FITUR YANG SUDAH ADA

Berdasarkan analisa kode, modul Finance saat ini sudah memiliki:

### ✅ Fitur yang Sudah Ada:
1. **Dashboard Keuangan**
   - Total Pendapatan (Income)
   - Total Pengeluaran (Expenses)
   - Laba Bersih (Net Profit)
   - Kas di Tangan (Cash on Hand)
   - Piutang (Accounts Receivable)
   - Hutang (Accounts Payable)

2. **Laporan Keuangan**
   - Laporan Laba Rugi (Profit & Loss)
   - Laporan Pendapatan Harian
   - Laporan Pendapatan Bulanan
   - Neraca Keuangan (Balance Sheet)

3. **Manajemen Transaksi**
   - Pencatatan Pendapatan
   - Pencatatan Pengeluaran
   - Riwayat Transaksi

4. **Invoice & Billing**
   - Pembuatan Invoice
   - Manajemen Invoice
   - Status Pembayaran

5. **Perpajakan**
   - PPh 21
   - PPh Badan
   - PPN
   - Integrasi Pajak

6. **Export Data**
   - Export ke Excel
   - Export ke CSV
   - Export ke PDF

---

## 🎯 FITUR YANG PERLU DITAMBAHKAN/DIKEMBANGKAN

### 1. **PENCATATAN KEUNTUNGAN (PROFIT TRACKING)**

#### A. Margin Keuntungan per Produk
```typescript
interface ProductProfit {
  productId: string;
  productName: string;
  costPrice: number;        // Harga Modal
  sellingPrice: number;     // Harga Jual
  profitMargin: number;     // Margin (%)
  profitAmount: number;     // Keuntungan (Rp)
  quantitySold: number;     // Jumlah Terjual
  totalProfit: number;      // Total Keuntungan
}
```

**Fitur:**
- Dashboard profit per produk
- Analisa produk paling menguntungkan
- Grafik trend keuntungan per produk
- Alert produk dengan margin rendah

#### B. Profit per Transaksi
```typescript
interface TransactionProfit {
  transactionId: string;
  date: Date;
  totalSales: number;       // Total Penjualan
  totalCost: number;        // Total Modal
  grossProfit: number;      // Laba Kotor
  expenses: number;         // Biaya Operasional
  netProfit: number;        // Laba Bersih
  profitMargin: number;     // Margin (%)
}
```

**Fitur:**
- Real-time profit tracking di kasir
- Laporan profit harian/bulanan/tahunan
- Perbandingan profit antar periode
- Target profit vs actual

#### C. Profit Center Analysis
```typescript
interface ProfitCenter {
  centerId: string;
  centerName: string;       // Cabang/Departemen
  revenue: number;          // Pendapatan
  directCosts: number;      // Biaya Langsung
  indirectCosts: number;    // Biaya Tidak Langsung
  netProfit: number;        // Laba Bersih
  roi: number;              // Return on Investment
}
```

---

### 2. **MANAJEMEN HUTANG PIUTANG (ACCOUNTS RECEIVABLE/PAYABLE)**

#### A. Piutang Pelanggan (Accounts Receivable)
```typescript
interface AccountsReceivable {
  id: string;
  customerId: string;
  customerName: string;
  invoiceNumber: string;
  invoiceDate: Date;
  dueDate: Date;
  totalAmount: number;      // Total Tagihan
  paidAmount: number;       // Sudah Dibayar
  remainingAmount: number;  // Sisa Hutang
  status: 'unpaid' | 'partial' | 'paid' | 'overdue';
  daysPastDue: number;      // Hari Terlambat
  paymentHistory: PaymentRecord[];
}

interface PaymentRecord {
  id: string;
  paymentDate: Date;
  amount: number;
  paymentMethod: string;
  notes: string;
}
```

**Fitur yang Perlu Dibuat:**
- Dashboard piutang (total, jatuh tempo, overdue)
- Reminder otomatis untuk pelanggan
- Aging report (0-30, 31-60, 61-90, >90 hari)
- Pencatatan pembayaran cicilan
- Riwayat pembayaran pelanggan
- Laporan kolektibilitas piutang

#### B. Hutang Supplier (Accounts Payable)
```typescript
interface AccountsPayable {
  id: string;
  supplierId: string;
  supplierName: string;
  purchaseOrderNumber: string;
  invoiceNumber: string;
  invoiceDate: Date;
  dueDate: Date;
  totalAmount: number;
  paidAmount: number;
  remainingAmount: number;
  status: 'unpaid' | 'partial' | 'paid' | 'overdue';
  paymentTerms: string;     // NET 30, NET 60, dll
  paymentHistory: PaymentRecord[];
}
```

**Fitur yang Perlu Dibuat:**
- Dashboard hutang supplier
- Jadwal pembayaran hutang
- Alert jatuh tempo pembayaran
- Pencatatan pembayaran cicilan
- Laporan aging hutang
- Integrasi dengan Purchase Order

---

### 3. **INVOICE MANAGEMENT (ENHANCED)**

#### A. Invoice Penjualan
```typescript
interface SalesInvoice {
  id: string;
  invoiceNumber: string;
  invoiceDate: Date;
  dueDate: Date;
  customerId: string;
  customerName: string;
  customerAddress: string;
  items: InvoiceItem[];
  subtotal: number;
  tax: number;              // PPN
  discount: number;
  totalAmount: number;
  paidAmount: number;
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';
  paymentTerms: string;
  notes: string;
}

interface InvoiceItem {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  total: number;
}
```

**Fitur yang Perlu Dibuat:**
- Template invoice yang bisa dikustomisasi
- Auto-generate invoice dari transaksi POS
- Kirim invoice via email/WhatsApp
- Recurring invoice (untuk pelanggan berlangganan)
- Invoice reminder otomatis
- Multi-currency support
- Partial payment tracking

#### B. Invoice Pembelian
```typescript
interface PurchaseInvoice {
  id: string;
  invoiceNumber: string;
  supplierId: string;
  supplierName: string;
  purchaseOrderId: string;
  invoiceDate: Date;
  dueDate: Date;
  items: InvoiceItem[];
  subtotal: number;
  tax: number;
  totalAmount: number;
  paidAmount: number;
  status: string;
}
```

---

### 4. **CASH FLOW MANAGEMENT**

```typescript
interface CashFlow {
  date: Date;
  openingBalance: number;   // Saldo Awal
  cashIn: CashInflow[];     // Pemasukan
  cashOut: CashOutflow[];   // Pengeluaran
  closingBalance: number;   // Saldo Akhir
}

interface CashInflow {
  source: string;           // Penjualan, Piutang, dll
  amount: number;
  category: string;
}

interface CashOutflow {
  purpose: string;          // Pembelian, Gaji, dll
  amount: number;
  category: string;
}
```

**Fitur:**
- Proyeksi cash flow 30/60/90 hari
- Alert cash flow negatif
- Laporan cash flow statement
- Analisa sumber dan penggunaan kas

---

### 5. **BUDGET & FORECASTING**

```typescript
interface Budget {
  id: string;
  period: string;           // Bulanan/Tahunan
  category: string;         // Kategori Biaya
  budgetAmount: number;     // Anggaran
  actualAmount: number;     // Realisasi
  variance: number;         // Selisih
  variancePercentage: number;
}
```

**Fitur:**
- Set budget per kategori
- Monitoring budget vs actual
- Alert jika melebihi budget
- Forecast revenue & expenses

---

### 6. **COST ACCOUNTING**

```typescript
interface CostCenter {
  id: string;
  name: string;
  type: 'fixed' | 'variable';
  amount: number;
  allocation: CostAllocation[];
}

interface CostAllocation {
  productId: string;
  percentage: number;
  amount: number;
}
```

**Fitur:**
- Alokasi biaya overhead
- Cost per unit calculation
- Break-even analysis
- Contribution margin analysis

---

### 7. **FINANCIAL RATIOS & KPI**

```typescript
interface FinancialKPI {
  // Profitability Ratios
  grossProfitMargin: number;
  netProfitMargin: number;
  roi: number;
  
  // Liquidity Ratios
  currentRatio: number;
  quickRatio: number;
  cashRatio: number;
  
  // Efficiency Ratios
  inventoryTurnover: number;
  receivablesTurnover: number;
  payablesTurnover: number;
  
  // Growth Metrics
  revenueGrowth: number;
  profitGrowth: number;
}
```

---

## 🔄 INTEGRASI DENGAN MODUL LAIN

### 1. Integrasi dengan POS
- Auto-create invoice dari transaksi
- Real-time profit calculation
- Payment recording

### 2. Integrasi dengan Inventory
- Cost of Goods Sold (COGS) tracking
- Inventory valuation
- Stock movement impact on financials

### 3. Integrasi dengan Purchase Order
- Auto-create payables
- Payment scheduling
- Supplier payment tracking

### 4. Integrasi dengan Customer Management
- Customer credit limit
- Payment history
- Receivables aging

---

## 📋 PRIORITAS PENGEMBANGAN

### Phase 1 (High Priority) - 2-3 Minggu
1. ✅ Pencatatan Keuntungan per Produk
2. ✅ Manajemen Piutang Pelanggan
3. ✅ Manajemen Hutang Supplier
4. ✅ Enhanced Invoice Management

### Phase 2 (Medium Priority) - 2-3 Minggu
5. ✅ Cash Flow Management
6. ✅ Budget & Forecasting
7. ✅ Financial KPI Dashboard

### Phase 3 (Low Priority) - 1-2 Minggu
8. ✅ Cost Accounting
9. ✅ Advanced Reporting
10. ✅ Multi-currency Support

---

## 🗄️ DATABASE SCHEMA YANG PERLU DITAMBAHKAN

```sql
-- Tabel Piutang
CREATE TABLE accounts_receivable (
  id VARCHAR(36) PRIMARY KEY,
  customer_id VARCHAR(36),
  invoice_id VARCHAR(36),
  invoice_number VARCHAR(50),
  invoice_date DATE,
  due_date DATE,
  total_amount DECIMAL(15,2),
  paid_amount DECIMAL(15,2),
  remaining_amount DECIMAL(15,2),
  status ENUM('unpaid', 'partial', 'paid', 'overdue'),
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);

-- Tabel Hutang
CREATE TABLE accounts_payable (
  id VARCHAR(36) PRIMARY KEY,
  supplier_id VARCHAR(36),
  purchase_order_id VARCHAR(36),
  invoice_number VARCHAR(50),
  invoice_date DATE,
  due_date DATE,
  total_amount DECIMAL(15,2),
  paid_amount DECIMAL(15,2),
  remaining_amount DECIMAL(15,2),
  status ENUM('unpaid', 'partial', 'paid', 'overdue'),
  payment_terms VARCHAR(50),
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);

-- Tabel Pembayaran
CREATE TABLE payment_records (
  id VARCHAR(36) PRIMARY KEY,
  reference_type ENUM('receivable', 'payable'),
  reference_id VARCHAR(36),
  payment_date DATE,
  amount DECIMAL(15,2),
  payment_method VARCHAR(50),
  notes TEXT,
  created_by VARCHAR(36),
  created_at TIMESTAMP
);

-- Tabel Profit Tracking
CREATE TABLE profit_tracking (
  id VARCHAR(36) PRIMARY KEY,
  transaction_id VARCHAR(36),
  product_id VARCHAR(36),
  quantity INT,
  cost_price DECIMAL(15,2),
  selling_price DECIMAL(15,2),
  profit_amount DECIMAL(15,2),
  profit_margin DECIMAL(5,2),
  date DATE,
  created_at TIMESTAMP
);

-- Tabel Budget
CREATE TABLE budgets (
  id VARCHAR(36) PRIMARY KEY,
  period VARCHAR(20),
  category VARCHAR(100),
  budget_amount DECIMAL(15,2),
  actual_amount DECIMAL(15,2),
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);
```

---

## 🎨 UI/UX YANG PERLU DIBUAT

### 1. Dashboard Keuangan (Enhanced)
- Card metrics dengan trend indicators
- Chart profit trend
- Aging report piutang/hutang
- Cash flow forecast
- KPI indicators

### 2. Halaman Piutang
- List piutang dengan filter
- Detail piutang per customer
- Form pembayaran cicilan
- Aging report visualization

### 3. Halaman Hutang
- List hutang dengan filter
- Jadwal pembayaran
- Form pembayaran
- Supplier payment history

### 4. Halaman Invoice
- Invoice builder dengan drag & drop
- Preview & print invoice
- Send invoice via email
- Payment tracking

### 5. Halaman Profit Analysis
- Profit per product chart
- Profit trend analysis
- Comparison reports
- Export capabilities

---

## 🔧 TEKNOLOGI & TOOLS

### Frontend
- React/Next.js
- Chart.js / Recharts untuk visualisasi
- React Hook Form untuk forms
- Date-fns untuk date handling

### Backend
- Next.js API Routes
- Sequelize ORM
- PostgreSQL Database

### Export & Reporting
- ExcelJS untuk Excel export
- jsPDF untuk PDF generation
- Email service untuk invoice delivery

---

## 📝 NEXT STEPS

1. Review dan approval struktur database
2. Implementasi API endpoints
3. Buat UI components
4. Testing & debugging
5. Documentation
6. User training

---

**Catatan:** Dokumen ini adalah panduan pengembangan modul Finance yang komprehensif. Implementasi dapat disesuaikan dengan kebutuhan bisnis dan prioritas.
