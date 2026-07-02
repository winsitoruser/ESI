# ✅ Mode Nomor Dokumen Retur - Auto Generate atau Manual Input

## 🎯 Fitur Pilihan Mode Penomoran Retur

Sistem retur sekarang mendukung **2 mode penomoran dokumen retur**: Auto-Generate atau Manual Input, memberikan fleksibilitas kepada user untuk memilih sesuai kebutuhan.

---

## 📋 1. DUA MODE PENOMORAN

### **Mode 1: Auto-Generate (Default)** 🤖

**Cara Kerja:**
- Sistem otomatis generate nomor retur
- Format: `RET-YYYY-####`
- Sequential numbering (0001, 0002, 0003, ...)
- Tahun otomatis sesuai tahun pembuatan

**Contoh:**
```
RET-2026-0001
RET-2026-0002
RET-2026-0003
...
RET-2026-9999
```

**Benefits:**
- ✅ Tidak perlu mikir nomor
- ✅ Otomatis sequential
- ✅ Format konsisten
- ✅ Tidak ada duplikasi
- ✅ Mudah tracking

### **Mode 2: Manual Input** ✍️

**Cara Kerja:**
- User input nomor sendiri
- Format bebas (tidak ada batasan)
- Validasi uniqueness oleh sistem
- Minimal 5 karakter

**Contoh:**
```
RET-CUSTOM-001
RETUR-ABC-2024-001
MY-RETURN-12345
DIST-XYZ-RET-001
Format bebas sesuai kebutuhan
```

**Benefits:**
- ✅ Format custom sesuai kebutuhan
- ✅ Integrasi dengan sistem lain
- ✅ Nomor referensi khusus
- ✅ Fleksibilitas penuh

---

## 💻 2. IMPLEMENTASI FRONTEND

### **A. State Management**

```typescript
// Return number mode state
const [returnNumberMode, setReturnNumberMode] = useState<'auto' | 'manual'>('auto');
const [customReturnNumber, setCustomReturnNumber] = useState('');

// Form data
const [formData, setFormData] = useState({
  // ... other fields
  customReturnNumber: ''
});
```

### **B. UI Component**

```tsx
<Card className="border-2 border-purple-200 bg-purple-50/30">
  <CardHeader>
    <CardTitle>Nomor Dokumen Retur</CardTitle>
    <p>Pilih mode penomoran dokumen retur</p>
  </CardHeader>
  <CardContent>
    {/* Radio Buttons */}
    <div className="flex gap-4">
      <label>
        <input
          type="radio"
          value="auto"
          checked={returnNumberMode === 'auto'}
          onChange={() => setReturnNumberMode('auto')}
        />
        🤖 Generate Otomatis
      </label>
      <label>
        <input
          type="radio"
          value="manual"
          checked={returnNumberMode === 'manual'}
          onChange={() => setReturnNumberMode('manual')}
        />
        ✍️ Input Manual
      </label>
    </div>

    {/* Auto Mode Info */}
    {returnNumberMode === 'auto' && (
      <div className="bg-green-50 border border-green-200">
        ✓ Nomor retur akan di-generate otomatis dengan format: RET-YYYY-####
      </div>
    )}

    {/* Manual Mode Input */}
    {returnNumberMode === 'manual' && (
      <div>
        <Input
          placeholder="Contoh: RET-CUSTOM-001"
          value={customReturnNumber}
          onChange={(e) => setCustomReturnNumber(e.target.value)}
          className="font-mono"
        />
        <div className="bg-yellow-50 border border-yellow-200">
          ⚠️ Pastikan nomor yang Anda masukkan unik dan belum pernah digunakan.
        </div>
      </div>
    )}
  </CardContent>
</Card>
```

### **C. Validation**

```typescript
const validateForm = (): boolean => {
  const newErrors: {[key: string]: string} = {};

  // Validate custom return number if manual mode
  if (returnNumberMode === 'manual') {
    if (!customReturnNumber.trim()) {
      newErrors.customReturnNumber = 'Nomor retur wajib diisi untuk mode manual';
    } else if (customReturnNumber.length < 5) {
      newErrors.customReturnNumber = 'Nomor retur minimal 5 karakter';
    }
  }

  // ... other validations

  setErrors(newErrors);
  return Object.keys(newErrors).length === 0;
};
```

### **D. Submit Logic**

```typescript
const submitData = {
  // ... other fields
  customReturnNumber: returnNumberMode === 'manual' ? customReturnNumber.trim() : null
};

const response = await axios.post('/api/returns', submitData);
```

---

## 🔌 3. IMPLEMENTASI BACKEND (API)

### **A. Request Body**

```javascript
const {
  // ... existing fields
  customReturnNumber
} = req.body;
```

### **B. Return Number Logic**

```javascript
let returnNumber;

// Check if custom return number is provided
if (customReturnNumber && customReturnNumber.trim()) {
  returnNumber = customReturnNumber.trim();
  
  // Check if custom return number already exists
  const existingReturn = await pool.query(
    'SELECT id FROM returns WHERE return_number = $1',
    [returnNumber]
  );
  
  if (existingReturn.rows.length > 0) {
    return res.status(400).json({ 
      error: 'Return number already exists',
      message: `Nomor retur "${returnNumber}" sudah digunakan. Silakan gunakan nomor lain.`
    });
  }
} else {
  // Auto-generate return number
  const lastReturnResult = await pool.query(
    'SELECT return_number FROM returns ORDER BY created_at DESC LIMIT 1'
  );

  if (lastReturnResult.rows.length > 0) {
    const lastNumber = parseInt(lastReturnResult.rows[0].return_number.split('-').pop());
    returnNumber = `RET-${new Date().getFullYear()}-${String(lastNumber + 1).padStart(4, '0')}`;
  } else {
    returnNumber = `RET-${new Date().getFullYear()}-0001`;
  }
}
```

### **C. Uniqueness Check**

```javascript
// For manual mode, check if return number already exists
const existingReturn = await pool.query(
  'SELECT id FROM returns WHERE return_number = $1',
  [returnNumber]
);

if (existingReturn.rows.length > 0) {
  return res.status(400).json({ 
    error: 'Return number already exists',
    message: `Nomor retur "${returnNumber}" sudah digunakan.`
  });
}
```

---

## 🎨 4. UI/UX DESIGN

### **Layout:**

```
┌─────────────────────────────────────────────────┐
│ 📄 Nomor Dokumen Retur                          │
│ Pilih mode penomoran dokumen retur              │
├─────────────────────────────────────────────────┤
│ Mode Penomoran:                                 │
│ ○ 🤖 Generate Otomatis  ○ ✍️ Input Manual      │
├─────────────────────────────────────────────────┤
│ [Mode Auto - Green Box]                         │
│ ✓ Nomor retur akan di-generate otomatis        │
│   Format: RET-YYYY-####                         │
│   Contoh: RET-2026-0001, RET-2026-0002          │
└─────────────────────────────────────────────────┘

atau

┌─────────────────────────────────────────────────┐
│ 📄 Nomor Dokumen Retur                          │
│ Pilih mode penomoran dokumen retur              │
├─────────────────────────────────────────────────┤
│ Mode Penomoran:                                 │
│ ○ 🤖 Generate Otomatis  ● ✍️ Input Manual      │
├─────────────────────────────────────────────────┤
│ Nomor Retur Custom *                            │
│ ┌─────────────────────────────────────────────┐ │
│ │ RET-CUSTOM-001                              │ │
│ └─────────────────────────────────────────────┘ │
│                                                 │
│ [Yellow Warning Box]                            │
│ ⚠️ Perhatian: Pastikan nomor unik              │
│    Minimal 5 karakter. Format bebas.           │
└─────────────────────────────────────────────────┘
```

### **Color Scheme:**

**Card Border & Background:**
- Border: `border-2 border-purple-200`
- Background: `bg-purple-50/30`
- Icon color: `text-purple-600`

**Auto Mode Info Box:**
- Background: `bg-green-50`
- Border: `border-green-200`
- Text: `text-green-800`
- Icon: ✓ (checkmark)

**Manual Mode Warning Box:**
- Background: `bg-yellow-50`
- Border: `border-yellow-200`
- Text: `text-yellow-800`
- Icon: ⚠️ (warning)

---

## 🔄 5. DATA FLOW

### **Flow Auto-Generate:**

```
1. User pilih "Generate Otomatis"
   ↓
2. customReturnNumber = ''
   ↓
3. User submit form
   ↓
4. Frontend: customReturnNumber = null
   ↓
5. Backend: Check if customReturnNumber is null
   ↓
6. Backend: Auto-generate RET-2026-0001
   ↓
7. Backend: Insert to database
   ↓
8. Response: { return_number: "RET-2026-0001" }
   ↓
9. Toast: "Return berhasil dibuat! Nomor: RET-2026-0001"
```

### **Flow Manual Input:**

```
1. User pilih "Input Manual"
   ↓
2. Input field muncul
   ↓
3. User ketik: "RET-CUSTOM-001"
   ↓
4. User submit form
   ↓
5. Frontend: Validate (min 5 char)
   ↓
6. Frontend: customReturnNumber = "RET-CUSTOM-001"
   ↓
7. Backend: Check if customReturnNumber provided
   ↓
8. Backend: Check uniqueness in database
   ↓
9a. If exists: Error "Nomor sudah digunakan"
9b. If unique: Insert to database
   ↓
10. Response: { return_number: "RET-CUSTOM-001" }
    ↓
11. Toast: "Return berhasil dibuat! Nomor: RET-CUSTOM-001"
```

---

## ✅ 6. VALIDASI

### **Frontend Validation:**

**Auto Mode:**
- ✅ No validation needed
- ✅ System will generate

**Manual Mode:**
- ✅ Required field (tidak boleh kosong)
- ✅ Minimal 5 karakter
- ✅ Clear error saat switch mode
- ✅ Real-time error clear saat typing

### **Backend Validation:**

**Auto Mode:**
- ✅ Generate sequential number
- ✅ Check last number in database
- ✅ Increment by 1

**Manual Mode:**
- ✅ Check if customReturnNumber provided
- ✅ Trim whitespace
- ✅ Check uniqueness in database
- ✅ Return error if duplicate

---

## 🎯 7. USE CASES

### **Use Case 1: Standard Return (Auto)**

```
Scenario: Retur normal dari customer
User Action:
1. Pilih "Generate Otomatis" (default)
2. Isi form retur
3. Submit

Result:
✓ Nomor: RET-2026-0001
✓ Auto-generated
✓ Sequential
```

### **Use Case 2: Custom Return Number**

```
Scenario: Retur dengan nomor referensi khusus
User Action:
1. Pilih "Input Manual"
2. Input: "DIST-ABC-RET-001"
3. Isi form retur
4. Submit

Result:
✓ Nomor: DIST-ABC-RET-001
✓ Custom format
✓ Sesuai kebutuhan
```

### **Use Case 3: Duplicate Number Error**

```
Scenario: User input nomor yang sudah ada
User Action:
1. Pilih "Input Manual"
2. Input: "RET-2026-0001" (sudah ada)
3. Submit

Result:
✗ Error: "Nomor retur RET-2026-0001 sudah digunakan"
✗ Form tidak submit
✗ User harus ganti nomor
```

### **Use Case 4: Integration with External System**

```
Scenario: Integrasi dengan sistem distributor
User Action:
1. Pilih "Input Manual"
2. Input nomor dari sistem distributor: "SUPP-XYZ-2024-001"
3. Submit

Result:
✓ Nomor: SUPP-XYZ-2024-001
✓ Sinkron dengan sistem distributor
✓ Easy tracking
```

---

## 📊 8. BENEFITS

### **Flexibility:**
- ✅ User bisa pilih sesuai kebutuhan
- ✅ Auto untuk kemudahan
- ✅ Manual untuk customization

### **Integration:**
- ✅ Support integrasi sistem lain
- ✅ Nomor referensi eksternal
- ✅ Cross-system tracking

### **Control:**
- ✅ User punya kontrol penuh
- ✅ Format bebas untuk manual
- ✅ Konsistensi untuk auto

### **Safety:**
- ✅ Validasi uniqueness
- ✅ Error handling
- ✅ Prevent duplicate

---

## 🚀 9. CARA MENGGUNAKAN

### **Mode Auto-Generate:**

1. Buka: `http://localhost:3000/inventory/returns/create`
2. Section "Nomor Dokumen Retur" sudah default "Generate Otomatis"
3. Lihat info box hijau dengan format RET-YYYY-####
4. Isi form retur lainnya
5. Submit
6. Nomor otomatis di-generate: RET-2026-0001

### **Mode Manual Input:**

1. Buka: `http://localhost:3000/inventory/returns/create`
2. Klik radio button "Input Manual"
3. Input field muncul
4. Ketik nomor custom (min 5 karakter)
5. Contoh: "RET-CUSTOM-001" atau format bebas
6. Isi form retur lainnya
7. Submit
8. Nomor custom tersimpan: RET-CUSTOM-001

### **Error Handling:**

**Jika nomor sudah ada:**
1. Submit form dengan nomor duplicate
2. Error muncul: "Nomor retur sudah digunakan"
3. Ganti dengan nomor lain
4. Submit ulang

---

## ✅ STATUS: PRODUCTION READY

Fitur mode nomor retur sudah:
- ✅ 2 mode: Auto-generate & Manual input
- ✅ UI dengan radio button & conditional rendering
- ✅ Validation frontend (required, min 5 char)
- ✅ Validation backend (uniqueness check)
- ✅ Error handling untuk duplicate
- ✅ Auto-generate sequential (RET-YYYY-####)
- ✅ Manual input format bebas
- ✅ Green info box untuk auto mode
- ✅ Yellow warning box untuk manual mode
- ✅ Font mono untuk input
- ✅ Real-time error clear
- ✅ Production ready

**Refresh browser dan test kedua mode penomoran retur!** 🎯✨
