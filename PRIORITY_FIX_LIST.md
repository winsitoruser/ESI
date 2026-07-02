# 🚨 DAFTAR PRIORITAS PERBAIKAN - BEDAGANG Inventory System

**Berdasarkan Analisis:** Amazon Q + Manual Review  
**Status:** ❌ **BANYAK YANG BELUM BERFUNGSI & BELUM TERINTEGRASI**

---

## 📊 RINGKASAN MASALAH

| Kategori | Total | Berfungsi | Belum | Persentase Masalah |
|----------|-------|-----------|-------|-------------------|
| **Buttons** | 15 | 10 | 5 | **33% TIDAK BERFUNGSI** |
| **Tables** | 8 | 0 | 8 | **100% BELUM TERINTEGRASI** |
| **Pages** | 20 | 15 | 5 | **25% HALAMAN BELUM ADA** |
| **API Integration** | 10 | 2 | 8 | **80% BELUM TERINTEGRASI** |

**TOTAL MASALAH:** ⚠️ **26 Item Perlu Diperbaiki**

---

## 🔴 PRIORITAS 1 - CRITICAL (Harus Segera Diperbaiki)

### **A. BUTTON TIDAK BERFUNGSI**

#### **1. Filter Button** ❌
**Lokasi:** `/inventory/index.tsx` line 513-516  
**Masalah:** 
- Tidak ada onClick handler
- Tidak ada modal
- Tidak ada state management

**Fix:**
```tsx
// SEKARANG:
<Button variant="outline" size="sm">
  <FaFilter className="mr-2" />
  Filter
</Button>

// HARUS JADI:
const [showFilterModal, setShowFilterModal] = useState(false);
const [filters, setFilters] = useState<FilterOptions>({});

<Button onClick={() => setShowFilterModal(true)}>
  <FaFilter className="mr-2" />
  Filter
</Button>

<FilterModal 
  isOpen={showFilterModal}
  onClose={() => setShowFilterModal(false)}
  onApplyFilters={handleApplyFilters}
/>
```

**Status:** ⚠️ Modal sudah dibuat, perlu integrasi

---

#### **2. Export Button** ❌
**Lokasi:** `/inventory/index.tsx` line 517-520  
**Masalah:**
- Tidak ada onClick handler
- Tidak ada fungsi export
- Tidak terintegrasi

**Fix:**
```tsx
// SEKARANG:
<Button variant="outline" size="sm">
  <FaDownload className="mr-2" />
  Export
</Button>

// HARUS JADI:
const [showExportModal, setShowExportModal] = useState(false);

<Button onClick={() => setShowExportModal(true)}>
  <FaDownload className="mr-2" />
  Export
</Button>

<ExportModal
  isOpen={showExportModal}
  onClose={() => setShowExportModal(false)}
  onExport={handleExport}
/>

// Tambah fungsi export
const handleExport = async (format: 'excel' | 'pdf' | 'csv') => {
  const response = await fetch('/api/products/export', {
    method: 'POST',
    body: JSON.stringify({ format, filters })
  });
  const blob = await response.blob();
  downloadFile(blob, `products.${format}`);
};
```

**Status:** ⚠️ Modal sudah dibuat, perlu fungsi export

---

#### **3. Sort Buttons (Table Headers)** ❌
**Lokasi:** `/inventory/index.tsx` line 664-673  
**Masalah:**
- Table headers tidak clickable
- Tidak ada sorting functionality
- Tidak ada indicator arah sort

**Fix:**
```tsx
// SEKARANG:
<th className="text-left p-4">Produk</th>
<th className="text-left p-4">SKU</th>
<th className="text-right p-4">Harga</th>

// HARUS JADI:
const [sortField, setSortField] = useState<string>('name');
const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

<th 
  className="text-left p-4 cursor-pointer hover:bg-gray-100"
  onClick={() => handleSort('name')}
>
  Produk {sortField === 'name' && (sortDirection === 'asc' ? '↑' : '↓')}
</th>
```

**Status:** ❌ Belum ada sama sekali

---

#### **4. Bulk Action Checkboxes** ❌
**Lokasi:** Semua table di `/inventory/index.tsx`  
**Masalah:**
- Tidak ada checkbox untuk select multiple
- Tidak ada bulk delete
- Tidak ada bulk edit

**Fix:**
```tsx
// Tambah state
const [selectedProducts, setSelectedProducts] = useState<string[]>([]);

// Tambah checkbox di table header
<th className="w-12 p-4">
  <input 
    type="checkbox"
    checked={selectedProducts.length === products.length}
    onChange={handleSelectAll}
  />
</th>

// Tambah checkbox di setiap row
<td className="w-12 p-4">
  <input 
    type="checkbox"
    checked={selectedProducts.includes(product.id)}
    onChange={() => handleSelectProduct(product.id)}
  />
</td>

// Tambah bulk action bar
{selectedProducts.length > 0 && (
  <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 bg-white shadow-lg rounded-lg p-4">
    <span>{selectedProducts.length} produk dipilih</span>
    <Button onClick={handleBulkDelete}>Hapus</Button>
    <Button onClick={handleBulkEdit}>Edit</Button>
  </div>
)}
```

**Status:** ❌ Belum ada sama sekali

---

### **B. TABLE BELUM TERINTEGRASI (100% MOCK DATA)**

#### **1. Product List Table** ❌
**Lokasi:** `/inventory/index.tsx` line 51-76  
**Masalah:**
```tsx
// SEKARANG: MOCK DATA
const generateProducts = () => {
  const baseProducts = [
    { id: '1', name: 'Kopi Arabica Premium 250g', ... },  // ❌ Hardcoded
    // ...
  ];
  // Generate 80 duplicate mock products
};
```

**Fix:**
```tsx
// HARUS JADI: FETCH DARI API
const [products, setProducts] = useState([]);
const [loading, setLoading] = useState(true);

useEffect(() => {
  fetchProducts();
}, [currentPage, itemsPerPage, filters]);

const fetchProducts = async () => {
  setLoading(true);
  try {
    const response = await fetch(
      `/api/products?page=${currentPage}&limit=${itemsPerPage}&filters=${JSON.stringify(filters)}`
    );
    const data = await response.json();
    setProducts(data.products);
    setTotalCount(data.total);
  } catch (error) {
    console.error('Error fetching products:', error);
  } finally {
    setLoading(false);
  }
};
```

**Status:** ❌ Belum ada API integration

---

#### **2. Stats Cards** ❌
**Lokasi:** `/inventory/index.tsx` line 40-48  
**Masalah:**
```tsx
// SEKARANG: HARDCODED
const stats = {
  totalProducts: 342,        // ❌ Hardcoded
  totalValue: 125000000,     // ❌ Hardcoded
  lowStock: 23,              // ❌ Hardcoded
  outOfStock: 5,             // ❌ Hardcoded
  categories: 12,            // ❌ Hardcoded
  suppliers: 8               // ❌ Hardcoded
};
```

**Fix:**
```tsx
// HARUS JADI: FETCH DARI API
const [stats, setStats] = useState({
  totalProducts: 0,
  totalValue: 0,
  lowStock: 0,
  outOfStock: 0,
  categories: 0,
  suppliers: 0
});

useEffect(() => {
  fetchStats();
}, []);

const fetchStats = async () => {
  const response = await fetch('/api/inventory/stats');
  const data = await response.json();
  setStats(data);
};
```

**Status:** ❌ Belum ada API `/api/inventory/stats`

---

#### **3. Recent Activities** ❌
**Lokasi:** `/inventory/index.tsx` line 80-85  
**Masalah:**
```tsx
// SEKARANG: HARDCODED & TIDAK DITAMPILKAN
const recentActivities = [
  { type: 'in', product: 'Kopi Arabica Premium', ... },  // ❌ Hardcoded
];
// Tidak ada komponen untuk menampilkan
```

**Fix:**
```tsx
// HARUS JADI: FETCH & TAMPILKAN
const [activities, setActivities] = useState([]);

useEffect(() => {
  fetchActivities();
}, []);

const fetchActivities = async () => {
  const response = await fetch('/api/inventory/activities?limit=10');
  const data = await response.json();
  setActivities(data);
};

// Tambah komponen di UI
<Card>
  <CardHeader>
    <CardTitle>Aktivitas Terbaru</CardTitle>
  </CardHeader>
  <CardContent>
    {activities.map(activity => (
      <ActivityItem key={activity.id} activity={activity} />
    ))}
  </CardContent>
</Card>
```

**Status:** ❌ Belum ada API & komponen

---

### **C. HALAMAN YANG BELUM ADA**

#### **1. Product Edit Page** ❌
**Expected:** `/pages/inventory/products/[id]/edit.tsx`  
**Status:** ❌ **BELUM ADA**

**Perlu dibuat:**
```tsx
// /pages/inventory/products/[id]/edit.tsx
import { useRouter } from 'next/router';
import { useState, useEffect } from 'react';

const EditProductPage = () => {
  const router = useRouter();
  const { id } = router.query;
  const [product, setProduct] = useState(null);

  useEffect(() => {
    if (id) {
      fetchProduct(id);
    }
  }, [id]);

  const fetchProduct = async (productId) => {
    const response = await fetch(`/api/products/${productId}`);
    const data = await response.json();
    setProduct(data);
  };

  const handleSubmit = async (formData) => {
    const response = await fetch(`/api/products/${id}`, {
      method: 'PUT',
      body: JSON.stringify(formData)
    });
    if (response.ok) {
      router.push('/inventory');
    }
  };

  return (
    <DashboardLayout>
      <ProductForm 
        product={product}
        onSubmit={handleSubmit}
        mode="edit"
      />
    </DashboardLayout>
  );
};
```

**Priority:** 🔴 **CRITICAL** - Edit button sudah diperbaiki tapi halaman belum ada

---

#### **2. Product Detail Page** ❌
**Expected:** `/pages/inventory/products/[id]/index.tsx`  
**Status:** ⚠️ **Ada modal tapi belum ada dedicated page**

**Perlu dibuat:** Halaman detail lengkap dengan:
- Product information
- Stock history
- Price history
- Sales analytics
- Related products

---

#### **3. Inventory Stats/Analytics Page** ❌
**Expected:** `/pages/inventory/analytics.tsx`  
**Status:** ❌ **BELUM ADA**

**Perlu dibuat:** Dashboard analytics dengan:
- Stock turnover rate
- Slow-moving items
- Fast-moving items
- Stock value over time
- Category performance

---

#### **4. Stock Movement History Page** ❌
**Expected:** `/pages/inventory/movements.tsx`  
**Status:** ❌ **BELUM ADA**

**Perlu dibuat:** History semua stock movements:
- Stock in
- Stock out
- Adjustments
- Transfers
- Returns

---

#### **5. Low Stock Alert Page** ❌
**Expected:** `/pages/inventory/low-stock.tsx`  
**Status:** ⚠️ **Ada di /alerts tapi tidak dedicated**

**Perlu dibuat:** Dedicated page untuk:
- Low stock products
- Out of stock products
- Reorder recommendations
- Quick reorder actions

---

## 🟡 PRIORITAS 2 - IMPORTANT (Perlu Segera)

### **A. API ENDPOINTS YANG BELUM ADA**

#### **1. Inventory Stats API** ❌
```javascript
// PERLU DIBUAT: /pages/api/inventory/stats.js
GET /api/inventory/stats

Response:
{
  totalProducts: 342,
  totalValue: 125000000,
  lowStock: 23,
  outOfStock: 5,
  categories: 12,
  suppliers: 8,
  recentChanges: {
    products: +12,
    value: +8.5
  }
}
```

---

#### **2. Product Export API** ❌
```javascript
// PERLU DIBUAT: /pages/api/products/export.js
POST /api/products/export

Body:
{
  format: 'excel' | 'pdf' | 'csv',
  filters: {...},
  fields: ['name', 'sku', 'price', 'stock']
}

Response: File download
```

---

#### **3. Inventory Activities API** ❌
```javascript
// PERLU DIBUAT: /pages/api/inventory/activities.js
GET /api/inventory/activities?limit=10

Response:
{
  activities: [
    {
      id: '1',
      type: 'in' | 'out' | 'adjustment',
      product: {...},
      quantity: 50,
      user: 'Admin',
      timestamp: '2024-01-25T10:30:00Z'
    }
  ]
}
```

---

#### **4. Product Bulk Actions API** ❌
```javascript
// PERLU DIBUAT: /pages/api/products/bulk.js
POST /api/products/bulk

Body:
{
  action: 'delete' | 'update' | 'export',
  productIds: ['1', '2', '3'],
  updateData: {...}  // for update action
}
```

---

#### **5. Product Detail API** ❌
```javascript
// PERLU DIBUAT: /pages/api/products/[id].js
GET /api/products/:id

Response:
{
  product: {...},
  stockHistory: [...],
  priceHistory: [...],
  salesData: {...}
}
```

---

### **B. COMPONENTS YANG BELUM ADA**

#### **1. BulkActionsBar Component** ❌
**File:** `/components/inventory/BulkActionsBar.tsx`

```tsx
interface BulkActionsBarProps {
  selectedCount: number;
  onDelete: () => void;
  onEdit: () => void;
  onExport: () => void;
  onCancel: () => void;
}
```

---

#### **2. SortableTableHeader Component** ❌
**File:** `/components/inventory/SortableTableHeader.tsx`

```tsx
interface SortableTableHeaderProps {
  field: string;
  label: string;
  currentSort: string;
  direction: 'asc' | 'desc';
  onSort: (field: string) => void;
}
```

---

#### **3. ActivityTimeline Component** ❌
**File:** `/components/inventory/ActivityTimeline.tsx`

```tsx
interface ActivityTimelineProps {
  activities: Activity[];
  limit?: number;
}
```

---

#### **4. StockLevelIndicator Component** ❌
**File:** `/components/inventory/StockLevelIndicator.tsx`

```tsx
interface StockLevelIndicatorProps {
  current: number;
  min: number;
  max: number;
  showLabel?: boolean;
}
```

---

## 🟢 PRIORITAS 3 - ENHANCEMENT (Nice to Have)

### **A. Advanced Features**

#### **1. Real-time Stock Updates** ❌
- WebSocket integration
- Live stock changes
- Multi-user sync

#### **2. Barcode Scanner Integration** ❌
- Scan to search
- Scan to add stock
- Scan to sell

#### **3. Stock Forecasting** ❌
- AI-based predictions
- Seasonal trends
- Reorder recommendations

#### **4. Multi-warehouse Support** ❌
- Stock per warehouse
- Inter-warehouse transfers
- Warehouse analytics

---

## 📋 ACTION PLAN - STEP BY STEP

### **WEEK 1: Critical Fixes**

**Day 1-2:**
- [ ] Create `/api/inventory/stats` endpoint
- [ ] Create `/api/products/export` endpoint
- [ ] Integrate stats API to dashboard
- [ ] Integrate products API with real data

**Day 3-4:**
- [ ] Create Product Edit Page (`/products/[id]/edit.tsx`)
- [ ] Create Product Detail Page (`/products/[id]/index.tsx`)
- [ ] Implement Filter functionality
- [ ] Implement Export functionality

**Day 5:**
- [ ] Add sorting to all tables
- [ ] Add bulk selection checkboxes
- [ ] Create BulkActionsBar component
- [ ] Test all integrations

---

### **WEEK 2: Important Features**

**Day 1-2:**
- [ ] Create `/api/inventory/activities` endpoint
- [ ] Create `/api/products/bulk` endpoint
- [ ] Create ActivityTimeline component
- [ ] Integrate activities to dashboard

**Day 3-4:**
- [ ] Create Stock Movement History page
- [ ] Create Low Stock Alert page
- [ ] Create Inventory Analytics page
- [ ] Add stock level indicators

**Day 5:**
- [ ] Implement advanced filters
- [ ] Add export to Excel/PDF/CSV
- [ ] Clean up duplicate files
- [ ] Documentation

---

## 📊 ESTIMASI WAKTU & RESOURCES

| Task Category | Estimated Time | Priority |
|---------------|----------------|----------|
| **API Integration** | 3-4 days | 🔴 Critical |
| **Missing Pages** | 2-3 days | 🔴 Critical |
| **Button Fixes** | 1-2 days | 🔴 Critical |
| **Table Functions** | 2-3 days | 🟡 Important |
| **Components** | 2-3 days | 🟡 Important |
| **Advanced Features** | 5-7 days | 🟢 Enhancement |

**TOTAL ESTIMATED TIME:** 15-22 working days (3-4 weeks)

---

## ✅ CHECKLIST LENGKAP

### **Buttons (15 total)**
- [x] Tambah Produk - ✅ Berfungsi
- [x] Alert & Saran - ✅ Berfungsi
- [x] Stock Opname - ✅ Berfungsi
- [x] Purchase Order - ✅ Berfungsi
- [x] Recipe & Formula - ✅ Berfungsi
- [x] Production - ✅ Berfungsi
- [x] Laporan - ✅ Berfungsi
- [x] Retur - ✅ Berfungsi
- [x] Transfer - ✅ Berfungsi
- [x] Request Stok - ✅ Berfungsi
- [x] Edit Product - ✅ Fixed (redirect ke edit page)
- [x] Delete Product - ✅ Fixed (dengan konfirmasi & API)
- [ ] Filter - ⚠️ Handler ada, perlu integrasi
- [ ] Export - ⚠️ Handler ada, perlu fungsi export
- [ ] Sort Headers - ❌ Belum ada

### **Tables (8 total)**
- [ ] Product List - ❌ Mock data, perlu API
- [ ] Stats Cards - ❌ Hardcoded, perlu API
- [ ] Recent Activities - ❌ Tidak ditampilkan
- [ ] Stock History - ❌ Belum ada
- [ ] Price History - ❌ Belum ada
- [ ] Low Stock List - ❌ Belum ada
- [ ] Purchase Orders - ❌ Belum dicek
- [ ] Stock Movements - ❌ Belum ada

### **Pages (20 total)**
- [x] `/inventory` - ✅ Ada
- [x] `/inventory/products/new` - ✅ Ada
- [x] `/inventory/alerts` - ✅ Ada
- [x] `/inventory/stock-opname` - ✅ Ada
- [x] `/inventory/create-purchase-order` - ✅ Ada
- [x] `/inventory/recipes` - ✅ Ada
- [x] `/inventory/production` - ✅ Ada
- [x] `/inventory/reports` - ✅ Ada
- [x] `/inventory/returns` - ✅ Ada
- [x] `/inventory/transfers` - ✅ Ada
- [x] `/inventory/rac` - ✅ Ada
- [ ] `/inventory/products/[id]/edit` - ❌ Belum ada
- [ ] `/inventory/products/[id]` - ❌ Belum ada (ada modal)
- [ ] `/inventory/analytics` - ❌ Belum ada
- [ ] `/inventory/movements` - ❌ Belum ada
- [ ] `/inventory/low-stock` - ❌ Belum ada

### **API Endpoints (10 total)**
- [x] `GET /api/products` - ✅ Ada (perlu dicek)
- [x] `POST /api/products` - ✅ Ada & terintegrasi
- [ ] `GET /api/products/:id` - ❌ Belum ada
- [ ] `PUT /api/products/:id` - ❌ Belum ada
- [ ] `DELETE /api/products/:id` - ❌ Belum ada
- [ ] `GET /api/inventory/stats` - ❌ Belum ada
- [ ] `POST /api/products/export` - ❌ Belum ada
- [ ] `GET /api/inventory/activities` - ❌ Belum ada
- [ ] `POST /api/products/bulk` - ❌ Belum ada
- [ ] `POST /api/alerts/generate` - ✅ Sudah ada

---

## 🎯 KESIMPULAN

**Status Saat Ini:** ⚠️ **40% Complete**

**Masalah Utama:**
1. ❌ **80% data masih mock/hardcoded**
2. ❌ **5 halaman penting belum ada**
3. ❌ **8 API endpoint belum ada**
4. ❌ **Table functions (sort, bulk, filter) belum ada**

**Yang Sudah Diperbaiki:**
1. ✅ Edit product function
2. ✅ Delete product function
3. ✅ Filter & Export button handlers
4. ✅ FilterModal component
5. ✅ ExportModal component

**Next Immediate Steps:**
1. 🔴 Buat API endpoints yang missing
2. 🔴 Integrasikan real data ke semua tables
3. 🔴 Buat halaman edit & detail product
4. 🟡 Implementasi sorting & bulk actions
5. 🟡 Implementasi filter & export logic

---

**Dibuat oleh:** Cascade AI  
**Berdasarkan:** Amazon Q Analysis + Manual Code Review  
**Untuk:** BEDAGANG Cloud POS Development Team
