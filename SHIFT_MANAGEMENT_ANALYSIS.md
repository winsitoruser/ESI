# 📊 ANALISA FITUR SHIFT MANAGEMENT - POS SYSTEM

## 🎯 TUJUAN
Membuat sistem manajemen shift kasir yang komprehensif dengan fitur:
- Buka/Tutup Shift
- Serah Terima Shift (Handover)
- Cash Management
- Rekonsiliasi Kas
- Audit Trail

---

## 📋 KEBUTUHAN FUNGSIONAL

### 1. BUKA SHIFT (Opening Shift)

**Input Required:**
- Nama Kasir (auto dari session)
- Modal Awal (Opening Balance)
- Waktu Mulai (auto timestamp)
- Shift Type (Pagi/Siang/Malam)
- Catatan (optional)

**Validasi:**
- Tidak boleh ada shift aktif dari kasir yang sama
- Modal awal harus > 0
- Jika ada shift sebelumnya, modal awal = cash handover dari shift sebelumnya

**Output:**
- Shift ID (auto-generated)
- Status: ACTIVE
- Timestamp mulai shift

**Business Rules:**
```
IF shift_sebelumnya.status == 'HANDED_OVER' THEN
  modal_awal = shift_sebelumnya.handover_amount
ELSE
  modal_awal = input_manual
END IF
```

---

### 2. TRANSAKSI SELAMA SHIFT

**Tracking Data:**
- Total Transaksi
- Penjualan Cash
- Penjualan Card (Debit/Credit)
- Penjualan E-Wallet (QRIS/GoPay/OVO/dll)
- Refund/Void
- Diskon

**Perhitungan Expected Cash:**
```
expected_cash = opening_balance + cash_sales - cash_refunds
```

---

### 3. TUTUP SHIFT (Closing Shift)

**Input Required:**
- Cash Aktual di Laci (Actual Cash Count)
- Breakdown Denominasi (optional tapi recommended):
  - Rp 100.000 x qty
  - Rp 50.000 x qty
  - Rp 20.000 x qty
  - Rp 10.000 x qty
  - Rp 5.000 x qty
  - Rp 2.000 x qty
  - Rp 1.000 x qty
  - Koin
- Catatan Penutupan

**Perhitungan Otomatis:**
```javascript
// Expected Balance
expected_balance = opening_balance + cash_sales - cash_refunds

// Actual Balance (dari input)
actual_balance = cash_count_input

// Difference (Selisih)
difference = actual_balance - expected_balance

// Status
if (difference > 0) {
  status = "OVER" // Kelebihan
} else if (difference < 0) {
  status = "SHORT" // Kekurangan
} else {
  status = "BALANCED" // Pas
}
```

**Rekap Penjualan:**
```
Total Transaksi: 156
├─ Cash: Rp 6.800.000 (85 trx)
├─ Debit Card: Rp 2.400.000 (35 trx)
├─ Credit Card: Rp 1.200.000 (20 trx)
└─ E-Wallet: Rp 500.000 (16 trx)

Total Penjualan: Rp 10.900.000

Modal Awal: Rp 1.000.000
Cash Sales: Rp 6.800.000
Expected Cash: Rp 7.800.000
Actual Cash: Rp 7.850.000
Difference: Rp 50.000 (OVER)
```

**Validasi:**
- Shift harus dalam status ACTIVE
- Hanya kasir yang membuka shift yang bisa menutup
- Selisih > Rp 100.000 harus ada approval manager

**Output:**
- Shift Status: CLOSED
- Laporan Shift (PDF/Print)
- Timestamp tutup shift

---

### 4. SERAH TERIMA SHIFT (Handover)

**Skenario:**
Kasir A (shift pagi) serah terima ke Kasir B (shift siang)

**Input Required:**
- Kasir Penerima (Handover To)
- Jumlah Cash yang Diserahkan
- Breakdown Denominasi
- Catatan Serah Terima
- Tanda Tangan/PIN Kasir Penerima (verifikasi)

**Validasi:**
- Shift harus sudah CLOSED
- Jumlah handover ≤ actual_balance
- Kasir penerima tidak boleh sama dengan pemberi
- Kasir penerima harus verify dengan PIN/signature

**Flow:**
```
1. Kasir A tutup shift
   - Actual Cash: Rp 7.850.000
   
2. Kasir A pilih "Serah Terima"
   - Input: Kasir B
   - Input: Jumlah Rp 1.000.000 (untuk modal shift berikutnya)
   - Sisa: Rp 6.850.000 (disetor ke brankas)

3. Kasir B verifikasi
   - Input PIN/Signature
   - Konfirmasi terima Rp 1.000.000

4. System Update:
   - Shift A: status = HANDED_OVER
   - Create Shift B: opening_balance = Rp 1.000.000
```

**Output:**
- Berita Acara Serah Terima (PDF)
- Shift Status: HANDED_OVER
- Notifikasi ke Kasir Penerima

---

## 🗄️ DATABASE SCHEMA

```sql
CREATE TABLE pos_shifts (
  id VARCHAR(50) PRIMARY KEY,
  shift_number VARCHAR(20) UNIQUE NOT NULL,
  
  -- Kasir Info
  cashier_id INT NOT NULL,
  cashier_name VARCHAR(100) NOT NULL,
  shift_type ENUM('pagi', 'siang', 'malam') NOT NULL,
  
  -- Timing
  start_time DATETIME NOT NULL,
  end_time DATETIME,
  duration_minutes INT,
  
  -- Cash Management
  opening_balance DECIMAL(15,2) NOT NULL,
  closing_balance DECIMAL(15,2),
  expected_balance DECIMAL(15,2),
  difference DECIMAL(15,2),
  difference_status ENUM('balanced', 'over', 'short'),
  
  -- Sales Summary
  total_transactions INT DEFAULT 0,
  cash_sales DECIMAL(15,2) DEFAULT 0,
  card_sales DECIMAL(15,2) DEFAULT 0,
  ewallet_sales DECIMAL(15,2) DEFAULT 0,
  total_sales DECIMAL(15,2) DEFAULT 0,
  refunds DECIMAL(15,2) DEFAULT 0,
  discounts DECIMAL(15,2) DEFAULT 0,
  
  -- Handover
  handover_to_cashier_id INT,
  handover_to_cashier_name VARCHAR(100),
  handover_amount DECIMAL(15,2),
  handover_time DATETIME,
  handover_notes TEXT,
  handover_verified BOOLEAN DEFAULT FALSE,
  
  -- Status & Notes
  status ENUM('active', 'closed', 'handed_over') DEFAULT 'active',
  opening_notes TEXT,
  closing_notes TEXT,
  
  -- Audit
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  INDEX idx_cashier (cashier_id),
  INDEX idx_status (status),
  INDEX idx_date (start_time)
);

CREATE TABLE pos_shift_cash_breakdown (
  id INT PRIMARY KEY AUTO_INCREMENT,
  shift_id VARCHAR(50) NOT NULL,
  breakdown_type ENUM('opening', 'closing', 'handover'),
  
  -- Denominasi
  note_100k INT DEFAULT 0,
  note_50k INT DEFAULT 0,
  note_20k INT DEFAULT 0,
  note_10k INT DEFAULT 0,
  note_5k INT DEFAULT 0,
  note_2k INT DEFAULT 0,
  note_1k INT DEFAULT 0,
  coins DECIMAL(10,2) DEFAULT 0,
  
  total_amount DECIMAL(15,2) NOT NULL,
  
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (shift_id) REFERENCES pos_shifts(id),
  INDEX idx_shift (shift_id)
);
```

---

## 🎨 UI/UX DESIGN

### Halaman Shifts (/pos/shifts)

**Components:**

1. **Header Card**
   - Shift Aktif (jika ada)
   - Info: Kasir, Waktu Mulai, Modal Awal
   - Button: Tutup Shift

2. **Stats Cards**
   - Shift Hari Ini
   - Total Penjualan
   - Kasir Aktif
   - Shift Bulan Ini

3. **Action Buttons**
   - Buka Shift Baru (jika tidak ada shift aktif)
   - Tutup Shift (jika ada shift aktif)
   - Serah Terima

4. **Shift History Table**
   - Filter: Tanggal, Kasir, Status
   - Columns: ID, Kasir, Tanggal, Waktu, Modal, Transaksi, Status
   - Actions: Lihat Detail, Print, Export

---

### Modal: Buka Shift

```
┌─────────────────────────────────────┐
│ 🟢 Buka Shift Baru                  │
├─────────────────────────────────────┤
│ Kasir: John Doe (auto)              │
│                                     │
│ Shift Type:                         │
│ ○ Pagi (08:00-16:00)               │
│ ○ Siang (16:00-00:00)              │
│ ○ Malam (00:00-08:00)              │
│                                     │
│ Modal Awal:                         │
│ Rp [1.000.000]                      │
│                                     │
│ ℹ️ Shift sebelumnya diserahkan:     │
│    Rp 1.000.000 dari Jane Smith    │
│                                     │
│ Catatan (optional):                 │
│ [________________]                  │
│                                     │
│ [Batal]  [Mulai Shift] ✓           │
└─────────────────────────────────────┘
```

---

### Modal: Tutup Shift

```
┌─────────────────────────────────────┐
│ 🔴 Tutup Shift                      │
├─────────────────────────────────────┤
│ REKAP PENJUALAN                     │
│ ─────────────────────────────────── │
│ Total Transaksi: 156                │
│ • Cash: Rp 6.800.000 (85 trx)      │
│ • Card: Rp 3.600.000 (55 trx)      │
│ • E-Wallet: Rp 500.000 (16 trx)    │
│ Total: Rp 10.900.000                │
│                                     │
│ CASH MANAGEMENT                     │
│ ─────────────────────────────────── │
│ Modal Awal: Rp 1.000.000            │
│ Cash Sales: Rp 6.800.000            │
│ Expected: Rp 7.800.000              │
│                                     │
│ Hitung Cash Aktual:                 │
│ Rp 100.000 x [78] = Rp 7.800.000   │
│ Rp 50.000  x [1]  = Rp 50.000      │
│ Koin              = Rp 0           │
│ ─────────────────────────────────── │
│ Total Aktual: Rp 7.850.000          │
│                                     │
│ SELISIH: +Rp 50.000 (OVER) ✓       │
│                                     │
│ Catatan:                            │
│ [________________]                  │
│                                     │
│ [Batal]  [Tutup Shift] ✓           │
└─────────────────────────────────────┘
```

---

### Modal: Serah Terima

```
┌─────────────────────────────────────┐
│ 🔄 Serah Terima Shift               │
├─────────────────────────────────────┤
│ DARI                                │
│ Kasir: John Doe                     │
│ Shift: Pagi (08:00-16:00)          │
│ Cash Tersedia: Rp 7.850.000         │
│                                     │
│ KEPADA                              │
│ Pilih Kasir: [▼ Jane Smith]        │
│                                     │
│ JUMLAH SERAH TERIMA                 │
│ Rp [1.000.000]                      │
│                                     │
│ Sisa (Disetor): Rp 6.850.000        │
│                                     │
│ Breakdown:                          │
│ Rp 100.000 x [10] = Rp 1.000.000   │
│                                     │
│ Catatan:                            │
│ [________________]                  │
│                                     │
│ VERIFIKASI PENERIMA                 │
│ PIN Kasir Penerima: [****]          │
│                                     │
│ [Batal]  [Serah Terima] ✓          │
└─────────────────────────────────────┘
```

---

## 🔐 SECURITY & AUDIT

### Access Control
- Buka Shift: Semua kasir
- Tutup Shift: Hanya kasir yang membuka
- Serah Terima: Kasir pemberi + verifikasi penerima
- Lihat History: Semua kasir (hanya shift sendiri)
- Lihat All History: Manager/Admin
- Edit/Delete: Admin only

### Audit Trail
Log semua aktivitas:
- Shift opened by [user] at [time]
- Shift closed by [user] at [time] with difference [amount]
- Shift handed over from [user1] to [user2] amount [amount]
- Shift report printed by [user] at [time]

---

## 📊 REPORTING

### Laporan Shift (Per Shift)
```
LAPORAN SHIFT #SHF-001
Tanggal: 19 Januari 2024
Shift: Pagi (08:00 - 16:00)
Kasir: John Doe

PENJUALAN
─────────────────────────────
Total Transaksi: 156
• Cash: Rp 6.800.000 (85)
• Debit Card: Rp 2.400.000 (35)
• Credit Card: Rp 1.200.000 (20)
• E-Wallet: Rp 500.000 (16)
─────────────────────────────
TOTAL: Rp 10.900.000

CASH MANAGEMENT
─────────────────────────────
Modal Awal: Rp 1.000.000
Cash Sales: Rp 6.800.000
Expected: Rp 7.800.000
Actual: Rp 7.850.000
─────────────────────────────
Selisih: +Rp 50.000 (OVER)

SERAH TERIMA
─────────────────────────────
Kepada: Jane Smith
Jumlah: Rp 1.000.000
Sisa Disetor: Rp 6.850.000

Tanda Tangan:
Pemberi: ___________
Penerima: ___________
```

---

## 🚀 IMPLEMENTATION PRIORITY

**Phase 1: MVP (Week 1)**
- ✅ Buka Shift (basic)
- ✅ Tutup Shift (basic)
- ✅ View Shift History
- ✅ Basic Cash Calculation

**Phase 2: Enhanced (Week 2)**
- ✅ Serah Terima Shift
- ✅ Cash Breakdown Denominasi
- ✅ Print Laporan
- ✅ Difference Alert

**Phase 3: Advanced (Week 3)**
- ✅ Multi-shift per day
- ✅ Manager Approval untuk selisih besar
- ✅ Dashboard Analytics
- ✅ Export Excel/PDF

---

## 💡 BEST PRACTICES

1. **Selalu Hitung Cash Fisik**
   - Jangan hanya input total
   - Breakdown per denominasi lebih akurat

2. **Dokumentasi Selisih**
   - Selisih > Rp 50.000 harus ada catatan
   - Selisih > Rp 100.000 perlu approval

3. **Serah Terima Wajib**
   - Shift berurutan harus serah terima
   - Hindari buka shift dengan modal baru terus

4. **Backup Data**
   - Auto backup setiap tutup shift
   - Simpan laporan PDF

5. **Audit Regular**
   - Review shift mingguan
   - Identifikasi pola selisih

---

## 🎯 SUCCESS METRICS

- **Accuracy**: Selisih < 0.1% dari total sales
- **Compliance**: 100% shift ada laporan
- **Handover Rate**: > 90% shift diserah terimakan
- **Response Time**: Tutup shift < 5 menit
- **User Satisfaction**: > 4.5/5

---

## 📝 NOTES

File ini adalah dokumentasi lengkap untuk implementasi fitur Shift Management.
Untuk implementasi kode, lihat:
- `/pages/pos/shifts.tsx` - Halaman utama
- `/components/pos/ShiftModals.tsx` - Modal components
- `/api/pos/shifts/` - API endpoints
