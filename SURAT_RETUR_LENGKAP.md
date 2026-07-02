# ✅ Surat Retur Lengkap - Sistem Dokumentasi Retur

## 🎯 Pengembangan Surat Retur Resmi

Sistem retur telah dikembangkan dengan **surat retur resmi** yang lengkap, formal, dan sesuai standar bisnis untuk komunikasi dengan distributor/supplier.

---

## 📋 1. FORMAT SURAT RETUR

### **Struktur Surat Retur Resmi:**

```
┌─────────────────────────────────────────────────┐
│ 1. KOP SURAT                                    │
│    - Nama Perusahaan                            │
│    - Alamat Lengkap                             │
│    - Telepon & Email                            │
├─────────────────────────────────────────────────┤
│ 2. JUDUL SURAT                                  │
│    - "SURAT RETUR BARANG"                       │
│    - Nomor: RET-2026-0001                       │
├─────────────────────────────────────────────────┤
│ 3. KEPADA (Distributor)                         │
│    - Kepada Yth.                                │
│    - PT. Distributor ABC                        │
│    - Telp: 021-1234567                          │
│    - Dengan hormat,                             │
├─────────────────────────────────────────────────┤
│ 4. ISI SURAT                                    │
│    - Pembukaan formal                           │
│    - "Bersama surat ini, kami mengajukan..."    │
├─────────────────────────────────────────────────┤
│ 5. REFERENSI FAKTUR                             │
│    - No. Faktur: INV-2024-001                   │
│    - Tanggal Faktur: 15 Januari 2024            │
│    - Tanggal Pembelian: 10 Januari 2024         │
├─────────────────────────────────────────────────┤
│ 6. DETAIL RETUR                                 │
│    - Informasi Retur (tanggal, tipe, status)    │
│    - Informasi Customer                         │
│    - Tabel Produk                               │
│    - Ringkasan Keuangan                         │
├─────────────────────────────────────────────────┤
│ 7. PENUTUP                                      │
│    - "Demikian surat retur ini kami sampaikan"  │
│    - "Atas perhatian dan kerjasamanya..."       │
├─────────────────────────────────────────────────┤
│ 8. APPROVAL (jika sudah disetujui)              │
│    - ✓ DISETUJUI                                │
│    - Disetujui oleh: Manager                    │
│    - Tanggal: 26 Januari 2026                   │
├─────────────────────────────────────────────────┤
│ 9. TANDA TANGAN                                 │
│    - Hormat kami (Petugas Retur)                │
│    - Mengetahui (Manager)                       │
│    - Diterima oleh (Distributor)                │
├─────────────────────────────────────────────────┤
│ 10. DISCLAIMER                                  │
│     - Dokumen resmi                             │
│     - Instruksi penerimaan                      │
│     - Kebijakan refund                          │
│     - Digital signature                         │
└─────────────────────────────────────────────────┘
```

---

## 🎨 2. KOMPONEN SURAT RETUR

### **A. Kop Surat (Letterhead)**
```html
<div class="letterhead">
  <div class="company-name">BEDAGANG Cloud POS</div>
  <div class="company-details">
    <div>Jl. Sudirman No. 45, Jakarta Pusat</div>
    <div>Telp: (021) 5555-1234 | Email: contact@bedagang.id</div>
  </div>
</div>
```

**Features:**
- ✅ Nama perusahaan (22pt, bold, navy)
- ✅ Alamat lengkap
- ✅ Kontak (telepon & email)
- ✅ Border bottom 2px solid

### **B. Kepada (Recipient)**
```html
<div style="margin: 25px 0;">
  <p><strong>Kepada Yth.</strong></p>
  <p style="font-weight: 600;">PT. Distributor ABC</p>
  <p>Telp: 021-1234567</p>
  <p style="margin-top: 10px;">Dengan hormat,</p>
</div>
```

**Features:**
- ✅ Format formal "Kepada Yth."
- ✅ Nama distributor bold
- ✅ Kontak distributor
- ✅ Salam pembuka "Dengan hormat,"

### **C. Pembukaan Surat**
```html
<div style="text-align: justify; line-height: 1.8;">
  <p style="text-indent: 40px;">
    Bersama surat ini, kami mengajukan permohonan retur barang 
    dengan detail sebagai berikut:
  </p>
</div>
```

**Features:**
- ✅ Text justify
- ✅ Text indent 40px (paragraf)
- ✅ Line height 1.8 (readable)
- ✅ Bahasa formal

### **D. Referensi Faktur**
```html
<div class="info-box" style="background: #f9f9f9; border-left: 3px solid #2c3e50;">
  <h3>Referensi Faktur Pembelian</h3>
  <div style="display: grid; grid-template-columns: 150px 1fr;">
    <span>No. Faktur:</span>
    <span style="font-family: 'Courier New';">INV-2024-001</span>
    <span>Tanggal Faktur:</span>
    <span>15 Januari 2024</span>
    <span>Tanggal Pembelian:</span>
    <span>10 Januari 2024</span>
  </div>
</div>
```

**Features:**
- ✅ Background abu-abu (#f9f9f9)
- ✅ Border kiri navy 3px
- ✅ Grid layout 2 kolom
- ✅ Font mono untuk invoice number
- ✅ Conditional rendering (jika ada invoice)

### **E. Detail Retur**
```html
<!-- Info Grid: Informasi Retur & Customer -->
<div class="info-grid">
  <div class="info-box">
    <h3>Informasi Retur</h3>
    <!-- Tanggal, Tipe, Status, Dibuat Oleh -->
  </div>
  <div class="info-box">
    <h3>Informasi Customer</h3>
    <!-- Nama, Telepon -->
  </div>
</div>

<!-- Tabel Produk -->
<table class="product-table">
  <thead>
    <tr>
      <th>Nama Produk</th>
      <th>SKU</th>
      <th>Jumlah</th>
      <th>Kondisi</th>
      <th>Alasan Retur</th>
    </tr>
  </thead>
  <tbody>
    <!-- Product rows -->
  </tbody>
</table>

<!-- Ringkasan Keuangan -->
<div class="financial-summary">
  <h3>Ringkasan Keuangan</h3>
  <div>Harga Original: Rp 60,000</div>
  <div>Biaya Restocking: - Rp 0</div>
  <div class="total">TOTAL REFUND: Rp 60,000</div>
</div>
```

### **F. Penutup Surat**
```html
<div style="text-align: justify; line-height: 1.8;">
  <p style="text-indent: 40px;">
    Demikian surat retur ini kami sampaikan. Atas perhatian 
    dan kerjasamanya, kami ucapkan terima kasih.
  </p>
</div>
```

**Features:**
- ✅ Formal closing
- ✅ Text justify & indent
- ✅ Bahasa sopan

### **G. Approval Section (Conditional)**
```html
<!-- Hanya muncul jika status = 'approved' -->
<div style="background: #e8f5e9; border: 1px solid #4caf50;">
  <p style="color: #2e7d32;">✓ DISETUJUI</p>
  <div>
    <p>Disetujui oleh: <strong>Manager Name</strong></p>
    <p>Tanggal: 26 Januari 2026</p>
  </div>
</div>
```

**Features:**
- ✅ Green background (#e8f5e9)
- ✅ Green border (#4caf50)
- ✅ Checkmark icon ✓
- ✅ Approval info (who & when)
- ✅ Conditional rendering

### **H. Tanda Tangan (3 Kolom)**
```html
<div class="signatures">
  <div class="signature-box">
    <div class="signature-label">Hormat kami,<br>BEDAGANG Cloud POS</div>
    <div class="signature-line">
      <div class="signature-name">Staff Name</div>
      <div style="font-size: 9pt;">Petugas Retur</div>
    </div>
  </div>
  
  <div class="signature-box">
    <div class="signature-label">Mengetahui,<br>Manager</div>
    <div class="signature-line">
      <div class="signature-name">_________________</div>
    </div>
  </div>
  
  <div class="signature-box">
    <div class="signature-label">Diterima oleh,<br>PT. Distributor ABC</div>
    <div class="signature-line">
      <div class="signature-name">_________________</div>
    </div>
  </div>
</div>
```

**Features:**
- ✅ 3 kolom equal width
- ✅ Label dengan nama perusahaan/distributor
- ✅ Space 70px untuk tanda tangan
- ✅ Border top 1.5px solid navy
- ✅ Nama & jabatan

### **I. Disclaimer**
```html
<div style="background: #fff3cd; border-left: 3px solid #ffc107; color: #856404;">
  <p style="font-weight: 600;">PENTING:</p>
  <ul>
    <li>Surat retur ini merupakan dokumen resmi dan harus disertai dengan barang yang diretur</li>
    <li>Mohon periksa kondisi barang sebelum menerima retur</li>
    <li>Proses refund/penggantian akan dilakukan sesuai kebijakan yang berlaku</li>
    <li>Dokumen ini sah tanpa tanda tangan basah (digital signature)</li>
  </ul>
</div>
```

**Features:**
- ✅ Yellow background (#fff3cd)
- ✅ Yellow border left (#ffc107)
- ✅ Warning color text (#856404)
- ✅ 4 poin penting
- ✅ Font size 9pt

---

## 🔄 3. DATA FLOW SURAT RETUR

### **Complete Flow:**
```
1. User create return dengan invoice info
   ↓
2. Data tersimpan di database
   ↓
3. User klik "Print" button
   ↓
4. System fetch business settings
   ↓
5. System fetch return data (include invoice)
   ↓
6. Generate HTML surat retur
   ↓
7. Populate data:
   - Kop surat (business info)
   - Kepada (distributor info)
   - Referensi faktur (invoice info)
   - Detail retur (product, customer)
   - Approval (if approved)
   - Signatures
   - Disclaimer
   ↓
8. Open new window
   ↓
9. User klik "PRINT DOKUMEN"
   ↓
10. Browser print dialog
    ↓
11. Print surat retur resmi
```

---

## 📊 4. CONDITIONAL RENDERING

### **A. Distributor Section**
```javascript
${distributorName !== '-' ? `
  <div>
    <p><strong>Kepada Yth.</strong></p>
    <p>${distributorName}</p>
    ${distributorPhone !== '-' ? `<p>Telp: ${distributorPhone}</p>` : ''}
    <p>Dengan hormat,</p>
  </div>
` : ''}
```

**Logic:**
- Hanya muncul jika ada distributor name
- Phone conditional dalam distributor section

### **B. Invoice Reference**
```javascript
${invoiceNumber !== '-' ? `
  <div class="info-box">
    <h3>Referensi Faktur Pembelian</h3>
    <div>
      <span>No. Faktur:</span>
      <span>${invoiceNumber}</span>
      ${invoiceDate !== '-' ? `
        <span>Tanggal Faktur:</span>
        <span>${invoiceDate}</span>
      ` : ''}
      ${purchaseDate !== '-' ? `
        <span>Tanggal Pembelian:</span>
        <span>${purchaseDate}</span>
      ` : ''}
    </div>
  </div>
` : ''}
```

**Logic:**
- Hanya muncul jika ada invoice number
- Invoice date & purchase date nested conditional

### **C. Approval Section**
```javascript
${status === 'approved' && approvedBy !== '-' ? `
  <div style="background: #e8f5e9;">
    <p>✓ DISETUJUI</p>
    <p>Disetujui oleh: ${approvedBy}</p>
    ${approvalDate !== '-' ? `<p>Tanggal: ${approvalDate}</p>` : ''}
  </div>
` : ''}
```

**Logic:**
- Hanya muncul jika status = 'approved'
- Dan ada approvedBy
- Approval date nested conditional

### **D. Notes Section**
```javascript
${notes !== '-' ? `
  <div class="notes-section">
    <h3>Catatan</h3>
    <div>${notes}</div>
  </div>
` : ''}
```

**Logic:**
- Hanya muncul jika ada notes

---

## 🎨 5. STYLING SURAT RETUR

### **Typography:**
```css
body {
  font-family: 'Times New Roman', Georgia, serif;
  font-size: 11pt;
  line-height: 1.6;
  color: #1a1a1a;
}

.company-name {
  font-size: 22pt;
  font-weight: 700;
  color: #2c3e50;
  letter-spacing: 1px;
}

h1 {
  font-size: 16pt;
  font-weight: 600;
  color: #2c3e50;
  letter-spacing: 2px;
}

h3 {
  font-size: 10.5pt;
  font-weight: 600;
  color: #2c3e50;
}
```

### **Colors:**
```css
--primary: #2c3e50;      /* Navy - Headers, borders */
--text-dark: #1a1a1a;    /* Black - Body text */
--text-gray: #555;       /* Gray - Labels */
--border: #ddd;          /* Border color */
--bg-light: #fafafa;     /* Background boxes */
--success: #4caf50;      /* Approval green */
--warning: #ffc107;      /* Disclaimer yellow */
```

### **Layout:**
```css
body { padding: 25mm; }
.letterhead { margin-bottom: 25px; }
.document-title { margin: 25px 0 30px 0; }
.info-grid { margin: 25px 0; }
.signatures { margin-top: 50px; }
```

---

## 📋 6. USE CASES

### **Use Case 1: Retur ke Distributor dengan Invoice**
```
Scenario: Retur barang rusak ke distributor
Input:
- Invoice Number: INV-2024-001
- Distributor: PT. ABC
- Product: Kopi Arabica (rusak)
- Quantity: 2 pcs

Output Surat:
✓ Kop surat perusahaan
✓ Kepada: PT. ABC
✓ Referensi Faktur: INV-2024-001
✓ Detail produk & alasan
✓ Tanda tangan 3 pihak
✓ Disclaimer
```

### **Use Case 2: Retur Customer tanpa Distributor**
```
Scenario: Retur dari customer langsung
Input:
- No invoice (customer purchase)
- Customer: John Doe
- Product: Teh Hijau (salah beli)

Output Surat:
✓ Kop surat perusahaan
✓ Tanpa section "Kepada"
✓ Tanpa referensi faktur
✓ Detail customer & produk
✓ Tanda tangan (Customer, Petugas, Manager)
```

### **Use Case 3: Retur yang Sudah Disetujui**
```
Scenario: Print surat untuk retur approved
Input:
- Status: Approved
- Approved by: Manager
- Approval date: 26 Jan 2026

Output Surat:
✓ Semua detail retur
✓ Green box "✓ DISETUJUI"
✓ Info approval (who & when)
✓ Tanda tangan lengkap
```

---

## ✅ 7. BENEFITS SURAT RETUR

### **1. Professional**
- ✅ Format surat bisnis standar
- ✅ Bahasa formal & sopan
- ✅ Layout rapi & terstruktur

### **2. Legal**
- ✅ Dokumen resmi dengan nomor
- ✅ Tanda tangan 3 pihak
- ✅ Disclaimer legal
- ✅ Audit trail lengkap

### **3. Communication**
- ✅ Jelas kepada siapa (distributor)
- ✅ Referensi faktur pembelian
- ✅ Detail lengkap & akurat
- ✅ Penutup formal

### **4. Tracking**
- ✅ Nomor retur unique
- ✅ Tanggal & waktu cetak
- ✅ Approval status
- ✅ Created by info

---

## 🚀 8. CARA MENGGUNAKAN

### **Print Surat Retur:**
1. Buka list returns
2. Klik button 🖨️ Print
3. New window opens dengan surat retur
4. Review dokumen:
   - Kop surat ✓
   - Kepada distributor ✓
   - Referensi faktur ✓
   - Detail lengkap ✓
   - Tanda tangan ✓
   - Disclaimer ✓
5. Klik "PRINT DOKUMEN"
6. Browser print dialog
7. Print atau Save as PDF

### **Kirim ke Distributor:**
1. Print surat retur
2. Attach dengan barang retur
3. Kirim ke distributor
4. Minta tanda tangan penerimaan
5. Simpan copy untuk arsip

---

## ✅ STATUS: PRODUCTION READY

Surat retur resmi sudah:
- ✅ Format surat bisnis standar
- ✅ Kop surat dengan business info
- ✅ Kepada distributor (conditional)
- ✅ Referensi faktur (conditional)
- ✅ Detail retur lengkap
- ✅ Penutup formal
- ✅ Approval section (conditional)
- ✅ Tanda tangan 3 pihak
- ✅ Disclaimer legal
- ✅ Print-ready A4
- ✅ Professional & elegan

**Surat retur sekarang siap digunakan untuk komunikasi resmi dengan distributor!** 🎯✨
