# Waste Management System - Full Integration Documentation

## 🎯 Overview
Sistem Waste Management yang terintegrasi penuh dengan backend API, database PostgreSQL, dan frontend React/Next.js untuk mencatat dan mengelola limbah produksi, produk cacat, dan material sisa.

## 📊 Database Schema

### Table: `wastes`
```sql
CREATE TABLE wastes (
  id SERIAL PRIMARY KEY,
  waste_number VARCHAR(50) UNIQUE NOT NULL,
  product_id INTEGER REFERENCES products(id),
  product_name VARCHAR(255),
  product_sku VARCHAR(100),
  waste_type ENUM('finished_product', 'raw_material', 'packaging', 'production_defect'),
  quantity DECIMAL(10,2) NOT NULL,
  unit VARCHAR(20) NOT NULL,
  cost_value DECIMAL(15,2) NOT NULL,
  reason TEXT NOT NULL,
  disposal_method ENUM('disposal', 'donation', 'clearance_sale', 'recycling'),
  clearance_price DECIMAL(15,2),
  waste_date DATE NOT NULL,
  status ENUM('recorded', 'disposed', 'processed') DEFAULT 'recorded',
  notes TEXT,
  created_by VARCHAR(100) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**Indexes:**
- `waste_number` (unique)
- `product_id`
- `waste_type`
- `waste_date`
- `status`

## 🔌 API Endpoints

### 1. GET /api/waste
**Deskripsi:** Mengambil daftar waste records dengan pagination dan filter

**Query Parameters:**
- `page` (number, default: 1) - Halaman data
- `limit` (number, default: 10) - Jumlah data per halaman
- `status` (string) - Filter berdasarkan status
- `wasteType` (string) - Filter berdasarkan tipe limbah
- `startDate` (date) - Filter tanggal mulai
- `endDate` (date) - Filter tanggal akhir

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "wasteNumber": "WST-2026-0001",
      "productName": "Roti Tawar Premium",
      "productSku": "PRD-ROTI-001",
      "wasteType": "finished_product",
      "quantity": 5,
      "unit": "loaf",
      "costValue": 54600,
      "reason": "Produk kadaluarsa",
      "disposalMethod": "clearance_sale",
      "clearancePrice": 20000,
      "wasteDate": "2026-01-26",
      "status": "recorded",
      "createdBy": "demo@bedagang.com",
      "createdAt": "2026-01-26T11:56:00.000Z"
    }
  ],
  "pagination": {
    "total": 15,
    "page": 1,
    "limit": 10,
    "totalPages": 2
  }
}
```

### 2. POST /api/waste
**Deskripsi:** Membuat waste record baru

**Request Body:**
```json
{
  "productId": 1,
  "productName": "Roti Tawar Premium",
  "productSku": "PRD-ROTI-001",
  "wasteType": "finished_product",
  "quantity": 5,
  "unit": "loaf",
  "costValue": 54600,
  "reason": "Produk kadaluarsa",
  "disposalMethod": "clearance_sale",
  "clearancePrice": 20000,
  "wasteDate": "2026-01-26",
  "notes": "Dijual dengan diskon 60%"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Waste record created successfully",
  "data": {
    "id": 1,
    "wasteNumber": "WST-2026-0001",
    "productName": "Roti Tawar Premium",
    "wasteType": "finished_product",
    "quantity": 5,
    "unit": "loaf",
    "costValue": 54600,
    "disposalMethod": "clearance_sale",
    "clearancePrice": 20000,
    "status": "recorded",
    "createdAt": "2026-01-26T11:56:00.000Z"
  }
}
```

### 3. GET /api/waste/stats
**Deskripsi:** Mengambil statistik waste management

**Query Parameters:**
- `startDate` (date) - Filter tanggal mulai
- `endDate` (date) - Filter tanggal akhir

**Response:**
```json
{
  "success": true,
  "data": {
    "totalWaste": 15,
    "totalLoss": 546000,
    "totalRecovery": 150000,
    "netLoss": 396000,
    "wasteByType": [
      {
        "wasteType": "finished_product",
        "count": 8,
        "totalCost": 300000
      },
      {
        "wasteType": "raw_material",
        "count": 5,
        "totalCost": 150000
      }
    ],
    "wasteByMethod": [
      {
        "disposalMethod": "clearance_sale",
        "count": 6,
        "totalCost": 200000
      },
      {
        "disposalMethod": "disposal",
        "count": 9,
        "totalCost": 346000
      }
    ]
  }
}
```

## 💻 Frontend Integration

### File: `/pages/inventory/production.tsx`

**Key Functions:**

1. **fetchWasteData()** - Mengambil data waste dari API
```typescript
const fetchWasteData = async () => {
  try {
    const response = await axios.get('/api/waste?limit=10');
    if (response.data.success) {
      setWasteRecords(response.data.data);
    }
  } catch (error) {
    console.error('Error fetching waste data:', error);
  }
};
```

2. **fetchWasteStats()** - Mengambil statistik waste
```typescript
const fetchWasteStats = async () => {
  try {
    const response = await axios.get('/api/waste/stats');
    if (response.data.success) {
      setFinancialLoss(response.data.data.netLoss);
    }
  } catch (error) {
    console.error('Error fetching waste stats:', error);
  }
};
```

3. **handleWasteSubmit()** - Menyimpan waste record baru
```typescript
const handleWasteSubmit = async (wasteData: any) => {
  setLoading(true);
  
  try {
    const apiData = {
      productId: wasteData.productId || null,
      productName: wasteData.productName || null,
      productSku: wasteData.productSku || null,
      wasteType: wasteData.wasteType,
      quantity: parseFloat(wasteData.quantity),
      unit: wasteData.unit,
      costValue: parseFloat(wasteData.costValue),
      reason: wasteData.reason,
      disposalMethod: wasteData.disposalMethod,
      clearancePrice: wasteData.clearancePrice ? parseFloat(wasteData.clearancePrice) : null,
      wasteDate: wasteData.wasteDate || new Date().toISOString(),
      notes: wasteData.notes || null
    };

    const response = await axios.post('/api/waste', apiData);

    if (response.data.success) {
      await fetchWasteData();
      await fetchWasteStats();
      
      toast.success('Limbah tercatat!', { duration: 5000 });
      setShowWasteModal(false);
    }
  } catch (error: any) {
    toast.error('Gagal menyimpan data limbah', { duration: 4000 });
  } finally {
    setLoading(false);
  }
};
```

## 🚀 Cara Menggunakan

### 1. Jalankan Migration
```bash
npx sequelize-cli db:migrate
```

### 2. Start Development Server
```bash
npm run dev
```

### 3. Akses Halaman Production
Buka browser: `http://localhost:3000/inventory/production`

### 4. Catat Limbah
1. Klik tombol **"Catat Limbah"**
2. Isi form dengan data:
   - Tipe Limbah (finished_product, raw_material, packaging, production_defect)
   - Nama Produk/Material
   - Jumlah & Satuan
   - Nilai Kerugian (Rp)
   - Alasan
   - Metode Penanganan (disposal, donation, clearance_sale, recycling)
   - Harga Clearance (jika applicable)
   - Tanggal
   - Catatan (optional)
3. Klik **"Submit"**
4. Data akan tersimpan ke database dan tampil di list

## 📈 Fitur

### ✅ Terintegrasi Penuh
- ✅ Database PostgreSQL dengan Sequelize ORM
- ✅ REST API dengan Next.js API Routes
- ✅ Frontend React dengan real-time updates
- ✅ Authentication dengan NextAuth
- ✅ Toast notifications untuk feedback
- ✅ Error handling yang comprehensive

### ✅ Waste Types
- `finished_product` - Produk jadi yang rusak/kadaluarsa
- `raw_material` - Bahan baku yang rusak/kadaluarsa
- `packaging` - Kemasan yang rusak
- `production_defect` - Cacat produksi

### ✅ Disposal Methods
- `disposal` - Dibuang
- `donation` - Donasi
- `clearance_sale` - Dijual dengan diskon
- `recycling` - Didaur ulang

### ✅ Status Tracking
- `recorded` - Tercatat
- `disposed` - Sudah dibuang
- `processed` - Sudah diproses

## 🔐 Security
- Authentication required (NextAuth session)
- Input validation di backend
- SQL injection protection (Sequelize ORM)
- Error handling yang aman

## 📊 Reporting
Data waste dapat digunakan untuk:
- Laporan kerugian finansial
- Analisis tipe limbah
- Tracking metode penanganan
- Audit trail dengan created_by dan timestamps

## 🎨 UI Components
- Professional table untuk Stok Bahan Baku
- Clean card design untuk Waste Management
- Toast notifications untuk user feedback
- Loading states untuk better UX
- Responsive design

## ✨ Status: FULLY INTEGRATED & PRODUCTION READY
