# ✅ Print Dokumen Retur - STANDAR KOP SURAT PROFESIONAL

## 🎯 Print Document dengan Kop Surat Bisnis

Dokumen print retur telah diperbaiki mengikuti standar kop surat profesional dengan data bisnis/outlet dari settings.

---

## 📋 STRUKTUR DOKUMEN

### 1. **KOP SURAT (Letterhead)**
```
┌─────────────────────────────────────────────────┐
│ BEDAGANG CLOUD POS                              │
│ 📍 Jl. Contoh No. 123, Jakarta                 │
│ 📞 (021) 1234-5678 | ✉️ info@bedagang.com      │
├─────────────────────────────────────────────────┤
```

**Data Dinamis dari Settings:**
- ✅ Nama Bisnis/Outlet (business_name)
- ✅ Alamat Lengkap (address)
- ✅ No. Telepon (phone)
- ✅ Email Bisnis (email)

**API Call:**
```typescript
const settingsResponse = await axios.get('/api/settings/business');
if (settingsResponse.data.success) {
  const settings = settingsResponse.data.data;
  businessName = settings.business_name || settings.name;
  businessAddress = settings.address;
  businessPhone = settings.phone;
  businessEmail = settings.email;
}
```

**Fallback:**
Jika API gagal atau settings tidak ada, menggunakan default:
- Nama: "BEDAGANG Cloud POS"
- Alamat: "Jl. Contoh No. 123, Jakarta"
- Telepon: "(021) 1234-5678"
- Email: "info@bedagang.com"

---

### 2. **JUDUL DOKUMEN**
```
┌─────────────────────────────────────────────────┐
│         DOKUMEN RETUR BARANG                    │
│         No: RET-2026-0001                       │
└─────────────────────────────────────────────────┘
```

**Features:**
- Border merah (#DC2626)
- Background abu-abu (#f5f5f5)
- Font besar dan bold
- Nomor retur auto-generated

---

### 3. **INFO GRID (2 Kolom)**

**Kolom Kiri - Informasi Retur:**
```
📋 Informasi Retur
├─ Tanggal Retur: Senin, 26 Januari 2026
├─ Tipe Retur: REFUND
├─ Status: [BADGE dengan warna]
└─ Dibuat Oleh: Staff Name
```

**Kolom Kanan - Informasi Customer:**
```
👤 Informasi Customer
├─ Nama: John Doe
└─ No. Telepon: 08123456789
```

**Status Badge Colors:**
- 🟡 Pending: Yellow (#fef3c7)
- 🔵 Approved: Blue (#dbeafe)
- 🔴 Rejected: Red (#fee2e2)
- 🟢 Completed: Green (#d1fae5)

---

### 4. **TABEL PRODUK**

```
┌──────────────┬─────┬────────┬─────────┬──────────────┐
│ Nama Produk  │ SKU │ Jumlah │ Kondisi │ Alasan Retur │
├──────────────┼─────┼────────┼─────────┼──────────────┤
│ Kopi Arabica │ K01 │ 2 pcs  │ Rusak   │ Cacat        │
└──────────────┴─────┴────────┴─────────┴──────────────┘
```

**Features:**
- Header merah (#DC2626) dengan text putih
- Zebra striping (baris genap abu-abu)
- Border 1px solid #ddd
- Font 10pt untuk readability

**Columns:**
1. Nama Produk (35%)
2. SKU (15%)
3. Jumlah (12%)
4. Kondisi (15%)
5. Alasan Retur (23%)

---

### 5. **RINGKASAN KEUANGAN**

```
┌─────────────────────────────────────────────────┐
│ 💰 Ringkasan Keuangan                           │
├─────────────────────────────────────────────────┤
│ Harga Original (2 × Rp 30,000):  Rp 60,000     │
│ Biaya Restocking:                - Rp 0         │
│ ─────────────────────────────────────────────   │
│ TOTAL REFUND:                    Rp 60,000     │
└─────────────────────────────────────────────────┘
```

**Features:**
- Border merah 2px (#DC2626)
- Background pink muda (#fff5f5)
- Calculation otomatis:
  - Subtotal = Quantity × Original Price
  - Total Refund = Subtotal - Restocking Fee
- Total dengan font besar (13pt) dan bold
- Warna hijau untuk total refund (#059669)

---

### 6. **CATATAN (Optional)**

```
┌─────────────────────────────────────────────────┐
│ 📝 Catatan                                      │
│ Produk rusak saat pengiriman, kemasan penyok   │
└─────────────────────────────────────────────────┘
```

**Features:**
- Hanya muncul jika ada notes
- Background kuning muda (#fffbeb)
- Border kiri kuning (#f59e0b)
- White-space: pre-wrap (preserve line breaks)

---

### 7. **TANDA TANGAN (3 Kolom)**

```
┌──────────────┬──────────────┬──────────────────┐
│   Customer   │   Petugas    │ Manager/Supervisor│
│              │              │                   │
│              │              │                   │
│ ─────────── │ ─────────── │ ───────────────  │
│  John Doe    │  Staff Name  │  _____________   │
└──────────────┴──────────────┴──────────────────┘
```

**Features:**
- 3 kolom equal width
- Space 60px untuk tanda tangan
- Border top 1px solid #000
- Nama pre-filled untuk Customer & Petugas
- Manager kosong untuk tanda tangan manual

---

### 8. **FOOTER DOKUMEN**

```
─────────────────────────────────────────────────
Dokumen ini dicetak secara otomatis oleh sistem BEDAGANG Cloud POS
Tanggal Cetak: Senin, 26 Januari 2026, 19:45
```

**Features:**
- Border top 1px solid #ddd
- Font kecil 8pt
- Warna abu-abu (#666)
- Timestamp lengkap dengan hari, tanggal, jam

---

## 🎨 STYLING PROFESIONAL

### CSS Features:

**1. Typography:**
- Font: Arial, sans-serif
- Body: 11pt
- Headers: 18pt (title), 11pt (sections)
- Small text: 8-10pt

**2. Colors:**
- Primary: #DC2626 (Red)
- Success: #059669 (Green)
- Warning: #f59e0b (Yellow)
- Gray: #666, #333, #000

**3. Layout:**
- Padding: 20mm (print-ready)
- Grid: CSS Grid untuk responsive
- Flexbox: Untuk alignment

**4. Print Optimization:**
```css
@media print {
  body { padding: 0; }
  .print-button { display: none; }
  .info-grid { page-break-inside: avoid; }
  .product-table { page-break-inside: avoid; }
  .signatures { page-break-inside: avoid; }
}
```

**5. Print Button:**
- Fixed position (top-right)
- Red background (#DC2626)
- Hover effect
- Auto-hide saat print
- Icon: 🖨️

---

## 📊 DATA MAPPING

### From API to Print:

```typescript
// Return Data
returnNum        → return_number
customerName     → customer_name
customerPhone    → customer_phone
productName      → product_name
productSku       → product_sku
quantity         → quantity
unit             → unit
condition        → condition
originalPrice    → original_price
restockingFee    → restocking_fee
refundAmt        → refund_amount
returnDate       → return_date (formatted)
returnReason     → return_reason
returnType       → return_type
status           → status
notes            → notes
createdBy        → created_by

// Business Settings
businessName     → settings.business_name
businessAddress  → settings.address
businessPhone    → settings.phone
businessEmail    → settings.email
```

---

## 🔧 IMPLEMENTASI

### Function Signature:
```typescript
const handlePrintReturn = async (returnData: any) => {
  // 1. Open new window
  const printWindow = window.open('', '_blank');
  
  // 2. Fetch business settings
  const settingsResponse = await axios.get('/api/settings/business');
  
  // 3. Extract data
  const returnNum = returnData.return_number || returnData.returnNumber;
  const customerName = returnData.customer_name || '-';
  // ... etc
  
  // 4. Generate HTML with CSS
  const printContent = `<!DOCTYPE html>...`;
  
  // 5. Write to window
  printWindow.document.write(printContent);
  printWindow.document.close();
};
```

### Async Function:
- ✅ Menggunakan async/await
- ✅ Fetch settings sebelum print
- ✅ Error handling dengan fallback
- ✅ Console log untuk debugging

---

## 🚀 CARA MENGGUNAKAN

### 1. **Dari Table List:**
```
- Klik button 🖨️ di row return
- New window opens
- Data auto-populated
- Klik "🖨️ Print Dokumen"
- Browser print dialog muncul
```

### 2. **Dari Detail Modal:**
```
- Buka detail modal (👁️)
- Klik button "🖨️ Print Dokumen"
- Same flow as above
```

### 3. **Print Options:**
```
Browser Print Dialog:
- Pilih printer
- Set orientation: Portrait
- Set paper: A4
- Margins: Default
- Print!
```

---

## 📋 CHECKLIST STANDAR KOP SURAT

- [x] **Nama Bisnis** - Dari settings, uppercase, bold, red
- [x] **Alamat Lengkap** - Dengan icon 📍
- [x] **No. Telepon** - Dengan icon 📞
- [x] **Email Bisnis** - Dengan icon ✉️
- [x] **Border Bottom** - 3px solid black
- [x] **Professional Layout** - Grid & flexbox
- [x] **Print-Ready** - 20mm padding, A4 size
- [x] **Responsive** - Works on all screen sizes
- [x] **Auto-Hide Button** - Saat print
- [x] **Page Break Control** - Avoid breaking sections
- [x] **Timestamp** - Tanggal & jam cetak
- [x] **Signature Lines** - 3 kolom dengan space
- [x] **Financial Summary** - Calculation otomatis
- [x] **Status Badge** - Color-coded
- [x] **Notes Section** - Conditional rendering
- [x] **Footer** - System info

---

## 🎯 BENEFITS

### 1. **Professional Appearance**
- Kop surat standar bisnis
- Layout rapi dan terstruktur
- Typography yang readable
- Color scheme konsisten

### 2. **Dynamic Data**
- Ambil dari settings bisnis
- Update otomatis jika settings berubah
- Fallback untuk safety

### 3. **Print-Ready**
- Optimized untuk A4
- Page break control
- Margins yang tepat
- Button auto-hide

### 4. **Complete Information**
- Customer details
- Product details
- Financial summary
- Signatures
- Timestamp

### 5. **Easy to Use**
- One-click print
- New window opens
- Browser print dialog
- No configuration needed

---

## 📝 CONTOH OUTPUT

```
╔═══════════════════════════════════════════════════╗
║ BEDAGANG CLOUD POS                                ║
║ 📍 Jl. Sudirman No. 45, Jakarta Pusat            ║
║ 📞 (021) 5555-1234 | ✉️ contact@bedagang.id      ║
╠═══════════════════════════════════════════════════╣
║                                                   ║
║         DOKUMEN RETUR BARANG                      ║
║         No: RET-2026-0001                         ║
║                                                   ║
╠═══════════════════════════════════════════════════╣
║ 📋 Informasi Retur    │ 👤 Informasi Customer    ║
║ Tanggal: 26 Jan 2026  │ Nama: John Doe           ║
║ Tipe: REFUND          │ Telp: 08123456789        ║
║ Status: [APPROVED]    │                          ║
╠═══════════════════════════════════════════════════╣
║ Produk  │ SKU │ Qty │ Kondisi │ Alasan           ║
║ Kopi    │ K01 │ 2   │ Rusak   │ Cacat Produksi   ║
╠═══════════════════════════════════════════════════╣
║ 💰 Ringkasan Keuangan                             ║
║ Harga Original:              Rp 60,000           ║
║ Biaya Restocking:            - Rp 0              ║
║ ─────────────────────────────────────            ║
║ TOTAL REFUND:                Rp 60,000           ║
╠═══════════════════════════════════════════════════╣
║ 📝 Catatan: Produk rusak saat pengiriman         ║
╠═══════════════════════════════════════════════════╣
║ Customer    │ Petugas     │ Manager/Supervisor   ║
║             │             │                      ║
║ ─────────── │ ─────────── │ ──────────────────  ║
║ John Doe    │ Staff Name  │ ________________    ║
╠═══════════════════════════════════════════════════╣
║ Dokumen dicetak oleh sistem BEDAGANG Cloud POS   ║
║ Tanggal Cetak: Senin, 26 Januari 2026, 19:45    ║
╚═══════════════════════════════════════════════════╝
```

---

## ✅ STATUS: PRODUCTION READY

Print document sudah:
- ✅ Kop surat standar profesional
- ✅ Data bisnis dari settings API
- ✅ Fallback untuk default values
- ✅ Layout print-ready (A4, 20mm padding)
- ✅ CSS optimized untuk print
- ✅ Page break control
- ✅ Signature section dengan 3 kolom
- ✅ Financial summary dengan calculation
- ✅ Status badge color-coded
- ✅ Timestamp lengkap
- ✅ Footer dengan system info
- ✅ Print button dengan hover effect
- ✅ Responsive design
- ✅ Production ready

**Dokumen print retur sekarang mengikuti standar kop surat profesional dengan data bisnis yang dinamis!** 🎉✨
