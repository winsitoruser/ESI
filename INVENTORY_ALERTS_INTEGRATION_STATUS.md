# 📊 Status Integrasi Backend - Inventory Alerts & Cards

**Tanggal Audit:** 28 Januari 2026  
**Halaman:** `http://localhost:3000/inventory`  
**Status:** ⚠️ **BELUM PRODUCTION READY - MENGGUNAKAN MOCK DATA**

---

## 🔍 Ringkasan Temuan

### ❌ **MASALAH UTAMA: Semua Cards Menggunakan MOCK DATA (Hardcoded)**

Komponen `InventoryAlerts.tsx` yang menampilkan cards berikut **TIDAK TERINTEGRASI** dengan backend/API:

1. ✗ **Near Expiry Card** - Mock data
2. ✗ **Overstock Card** - Mock data  
3. ✗ **Price Changes Card** - Mock data
4. ✗ **Suggestions Card** - Mock data
5. ✗ **Notifikasi "Perhatian! 1 Produk Kritis"** - Mock data

---

## 📁 File yang Perlu Diperhatikan

### 1. **Component Frontend**
**File:** `d:\bedagang\components\inventory\InventoryAlerts.tsx`

**Baris 74-218:** Semua data adalah MOCK/HARDCODED
```typescript
// Mock data - Expiry Alerts
const expiryAlerts: ExpiryAlert[] = [
  {
    id: 'EXP001',
    productName: 'Susu UHT 1L',
    sku: 'SUS-001',
    // ... data hardcoded
  }
];

// Mock data - Overstock Alerts  
const overstockAlerts: OverstockAlert[] = [ /* ... */ ];

// Mock data - Price Change Alerts
const priceChangeAlerts: PriceChangeAlert[] = [ /* ... */ ];

// Mock data - Pricing Suggestions
const pricingSuggestions: PricingSuggestion[] = [ /* ... */ ];
```

**Status:** ❌ Tidak ada `useEffect` atau `fetch` untuk mengambil data dari API

---

## 🔌 Status API Backend

### ✅ API yang SUDAH ADA (Tapi Tidak Digunakan)

#### 1. **Expiry Alerts API**
- **Endpoint:** `/api/inventory/expiry`
- **File:** `d:\bedagang\pages\api\inventory\expiry.ts`
- **Status:** ✅ Sudah ada dan berfungsi
- **Integrasi:** ❌ TIDAK digunakan oleh InventoryAlerts component

#### 2. **Alert Generation API**
- **Endpoint:** `/api/alerts/generate`
- **File:** `d:\bedagang\pages\api\alerts\generate.js`
- **Status:** ✅ Sudah ada
- **Fitur:**
  - ✓ Low stock alerts
  - ✓ Overstock alerts
  - ✓ Expiry alerts
- **Integrasi:** ❌ TIDAK digunakan oleh InventoryAlerts component

#### 3. **Inventory Stats API**
- **Endpoint:** `/api/inventory/stats`
- **File:** `d:\bedagang\pages\api\inventory\stats.js`
- **Status:** 🔴 **CRITICAL ERROR - Schema Mismatch**
- **Error Messages:**
  ```
  {"success":false,"message":"Internal server error","error":"column \"price\" does not exist"}
  {"success":false,"message":"Internal server error","error":"column \"stock\" does not exist"}
  ```
- **ROOT CAUSE:** 
  - **Model `Product.js`** menggunakan: `price`, `stock`
  - **Database `products` table** menggunakan: `sell_price`, `buy_price` (NO `stock` column!)
  - **Stock data** disimpan di tabel terpisah: `inventory_stock` (dengan kolom `quantity`)
- **Integrasi:** ✅ Sudah digunakan di `pages/inventory/index.tsx` line 58 (tapi ERROR!)

---

### ❌ API yang BELUM ADA

#### 1. **Price Changes API**
- **Endpoint:** `/api/inventory/price-changes` ❌ BELUM ADA
- **Kebutuhan:** Tracking perubahan harga produk
- **Data yang dibutuhkan:**
  - Product ID, name, SKU
  - Old price, new price
  - Change percentage
  - Changed by (user)
  - Change date & reason

#### 2. **Pricing Suggestions API**
- **Endpoint:** `/api/inventory/pricing-suggestions` ❌ BELUM ADA
- **Kebutuhan:** AI/algoritma untuk saran harga optimal
- **Data yang dibutuhkan:**
  - Current price & margin
  - Suggested price & margin
  - Competitor price
  - Market price
  - Sales trend
  - Reasoning

#### 3. **Overstock Alerts API**
- **Endpoint:** `/api/inventory/overstock` ❌ BELUM ADA
- **Catatan:** Ada di `/api/alerts/generate` tapi tidak ada endpoint GET terpisah
- **Kebutuhan:** Endpoint khusus untuk query overstock products

---

## 🚨 MASALAH KRITIS: Schema Mismatch

### **Database vs Model Inconsistency**

**MASALAH UTAMA:** Model Sequelize tidak sesuai dengan schema database aktual!

#### **Tabel `products` di Database:**
```sql
-- File: migrations/20260127000002-create-inventory-system.sql
CREATE TABLE products (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  sku VARCHAR(100) UNIQUE NOT NULL,
  buy_price DECIMAL(15,2) DEFAULT 0,    -- ✓ Ada
  sell_price DECIMAL(15,2) DEFAULT 0,   -- ✓ Ada
  minimum_stock INTEGER DEFAULT 0,
  maximum_stock INTEGER DEFAULT 0,
  -- NOTE: TIDAK ADA kolom 'stock' atau 'price'!
);
```

#### **Tabel `inventory_stock` (Stock Data Terpisah):**
```sql
CREATE TABLE inventory_stock (
  id SERIAL PRIMARY KEY,
  product_id INTEGER REFERENCES products(id),
  location_id INTEGER REFERENCES locations(id),
  quantity DECIMAL(10,2) DEFAULT 0,      -- ✓ Ini yang menyimpan stok!
  reserved_quantity DECIMAL(10,2) DEFAULT 0,
  available_quantity DECIMAL(10,2) GENERATED ALWAYS AS (quantity - reserved_quantity) STORED
);
```

#### **Model `Product.js` (SALAH!):**
```javascript
// File: models/Product.js
price: {                    // ❌ Kolom ini TIDAK ADA di database!
  type: DataTypes.DECIMAL(12, 2),
  allowNull: false
},
stock: {                    // ❌ Kolom ini TIDAK ADA di tabel products!
  type: DataTypes.INTEGER,
  defaultValue: 0
}
```

**DAMPAK:**
- ❌ API `/api/inventory/stats` ERROR
- ❌ Semua query yang menggunakan `price` atau `stock` GAGAL
- ❌ Frontend tidak bisa load data inventory
- ❌ Dashboard inventory menampilkan 0 untuk semua stats

---

## 🔧 Yang Perlu Diperbaiki

### **PRIORITAS KRITIS** 🔴

#### 1. **Fix Schema Mismatch - Model Product.js** ⚠️ URGENT
**File:** `d:\bedagang\models\Product.js`  
**Masalah:** Model tidak sesuai dengan database schema

**Solusi 1 - Update Model (RECOMMENDED):**
```javascript
// GANTI kolom 'price' dengan 'sell_price' dan 'buy_price'
// HAPUS kolom 'stock' (karena ada di tabel inventory_stock)

// SEBELUM:
price: {
  type: DataTypes.DECIMAL(12, 2),
  allowNull: false
},
stock: {
  type: DataTypes.INTEGER,
  defaultValue: 0
}

// SESUDAH:
sell_price: {
  type: DataTypes.DECIMAL(15, 2),
  defaultValue: 0
},
buy_price: {
  type: DataTypes.DECIMAL(15, 2),
  defaultValue: 0
}
// Hapus kolom 'stock' - gunakan relasi ke inventory_stock
```

**Solusi 2 - Tambahkan Virtual Field untuk Backward Compatibility:**
```javascript
// Di model Product.js, tambahkan:
price: {
  type: DataTypes.VIRTUAL,
  get() {
    return this.getDataValue('sell_price');
  }
}
```

#### 2. **Fix API Stats Query** ⚠️ URGENT
**File:** `d:\bedagang\pages\api\inventory\stats.js`  
**Masalah:** Query menggunakan kolom yang tidak ada

**Solusi - Rewrite Query dengan JOIN:**
```javascript
// SEBELUM (ERROR):
const products = await Product.findAll({
  attributes: ['price', 'stock', 'cost', 'purchase_price']
});

// SESUDAH (BENAR):
const products = await Product.findAll({
  attributes: ['id', 'sell_price', 'buy_price'],
  include: [{
    model: InventoryStock,
    as: 'stock_data',
    attributes: ['quantity'],
    required: false
  }]
});

// Hitung total value:
const totalValue = products.reduce((sum, product) => {
  const costValue = parseFloat(product.buy_price) || parseFloat(product.sell_price);
  const quantity = product.stock_data?.quantity || 0;
  return sum + (costValue * quantity);
}, 0);
```

#### 2. **Integrasikan API dengan InventoryAlerts Component** ⚠️ URGENT
**File:** `d:\bedagang\components\inventory\InventoryAlerts.tsx`

**Yang perlu ditambahkan:**
```typescript
const [expiryAlerts, setExpiryAlerts] = useState<ExpiryAlert[]>([]);
const [overstockAlerts, setOverstockAlerts] = useState<OverstockAlert[]>([]);
const [loading, setLoading] = useState(true);

useEffect(() => {
  fetchAlertsData();
}, []);

const fetchAlertsData = async () => {
  try {
    // Fetch expiry alerts
    const expiryRes = await fetch('/api/inventory/expiry?daysUntil=30');
    const expiryData = await expiryRes.json();
    
    // Fetch overstock (dari alerts/generate atau buat endpoint baru)
    const alertsRes = await fetch('/api/alerts/generate', { method: 'POST' });
    const alertsData = await alertsRes.json();
    
    // Set state dengan data real
    setExpiryAlerts(mapExpiryData(expiryData));
    setOverstockAlerts(filterOverstock(alertsData));
  } catch (error) {
    console.error('Error fetching alerts:', error);
  } finally {
    setLoading(false);
  }
};
```

---

### **PRIORITAS SEDANG**

#### 3. **Buat API Price Changes**
**Endpoint baru:** `/api/inventory/price-changes`

**Kebutuhan:**
- Tabel database: `price_history` atau `product_price_changes`
- Tracking setiap perubahan harga
- Audit trail (who, when, why)

#### 4. **Buat API Pricing Suggestions**
**Endpoint baru:** `/api/inventory/pricing-suggestions`

**Kebutuhan:**
- Algoritma pricing (margin analysis, competitor data)
- Sales trend analysis
- Market price comparison

#### 5. **Buat Endpoint GET Overstock**
**Endpoint baru:** `/api/inventory/overstock`

**Saat ini:** Hanya ada di POST `/api/alerts/generate`  
**Kebutuhan:** Endpoint GET terpisah untuk query overstock products

---

## 📊 Tabel Database yang Diperlukan

### ✅ **Sudah Ada:**
- `products` - Data produk
- `stocks` / `inventory_stock` - Data stok
- `system_alerts` - Alert system

### ❌ **Belum Ada (Perlu dibuat):**

#### 1. **price_history**
```sql
CREATE TABLE price_history (
  id SERIAL PRIMARY KEY,
  product_id INTEGER REFERENCES products(id),
  old_price DECIMAL(15,2),
  new_price DECIMAL(15,2),
  change_percentage DECIMAL(5,2),
  changed_by INTEGER REFERENCES users(id),
  change_reason TEXT,
  change_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### 2. **pricing_suggestions**
```sql
CREATE TABLE pricing_suggestions (
  id SERIAL PRIMARY KEY,
  product_id INTEGER REFERENCES products(id),
  current_price DECIMAL(15,2),
  suggested_price DECIMAL(15,2),
  current_margin DECIMAL(5,2),
  suggested_margin DECIMAL(5,2),
  reason TEXT,
  competitor_price DECIMAL(15,2),
  market_price DECIMAL(15,2),
  sales_trend VARCHAR(20),
  status VARCHAR(20) DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

---

## ✅ Checklist Untuk Production Ready

### **Backend API:**
- [ ] Fix error di `/api/inventory/stats` (kolom price)
- [ ] Buat endpoint `/api/inventory/price-changes`
- [ ] Buat endpoint `/api/inventory/pricing-suggestions`
- [ ] Buat endpoint `/api/inventory/overstock`
- [ ] Buat migration untuk tabel `price_history`
- [ ] Buat migration untuk tabel `pricing_suggestions`

### **Frontend Integration:**
- [ ] Hapus semua MOCK DATA di `InventoryAlerts.tsx`
- [ ] Tambahkan `useEffect` untuk fetch data dari API
- [ ] Tambahkan loading states
- [ ] Tambahkan error handling
- [ ] Tambahkan refresh/reload functionality
- [ ] Test dengan data real dari database

### **Testing:**
- [ ] Test API `/api/inventory/expiry` dengan curl/Postman
- [ ] Test API `/api/alerts/generate` dengan curl/Postman
- [ ] Test integrasi frontend dengan backend
- [ ] Verify data accuracy
- [ ] Test error scenarios

---

## 🎯 Rekomendasi Aksi

### **Langkah 1: Fix API Stats (5 menit)**
```bash
# Edit file: d:\bedagang\pages\api\inventory\stats.js
# Ganti kolom 'price' dengan kolom yang benar dari database
```

### **Langkah 2: Integrasikan Expiry & Overstock (30 menit)**
```bash
# Edit file: d:\bedagang\components\inventory\InventoryAlerts.tsx
# Tambahkan fetch dari API yang sudah ada
```

### **Langkah 3: Buat API Baru (2-3 jam)**
```bash
# Buat: /api/inventory/price-changes
# Buat: /api/inventory/pricing-suggestions
# Buat: /api/inventory/overstock
```

### **Langkah 4: Buat Tabel Database (1 jam)**
```bash
# Migration: price_history table
# Migration: pricing_suggestions table
```

---

## 📝 Kesimpulan

**Status Saat Ini:** ❌ **TIDAK PRODUCTION READY**

**Alasan:**
1. Semua cards menggunakan MOCK DATA hardcoded
2. API yang sudah ada tidak digunakan
3. API untuk Price Changes & Suggestions belum dibuat
4. Tabel database untuk tracking belum ada
5. API Stats mengalami error

**Estimasi Waktu untuk Production Ready:** 4-6 jam kerja

**Risk Level:** 🔴 **HIGH** - User melihat data palsu, bukan data real dari database

---

**Dibuat oleh:** Cascade AI  
**Untuk:** Audit Integrasi Backend Inventory Page
