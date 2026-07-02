# Inventory Analysis System - Dokumentasi Lengkap

## Overview
Sistem analisis inventory yang terintegrasi penuh dengan backend untuk memberikan insights real-time tentang kondisi inventory, termasuk fast moving products, slow moving products, stock suggestions, expiry alerts, dan rekomendasi FIFO/FEFO.

## Arsitektur Sistem

### 1. Backend Service Layer
**File:** `services/inventoryAnalysisService.js`

Service ini menyediakan analisis komprehensif inventory dengan fitur:

#### A. Product Velocity Analysis
- **Fungsi:** `analyzeProductVelocity(days = 30)`
- **Deskripsi:** Menganalisis kecepatan pergerakan produk berdasarkan data penjualan atau stock movements
- **Output:**
  - Fast Moving Products (penjualan > 150% dari rata-rata)
  - Slow Moving Products (penjualan < 50% dari rata-rata)
  - Average daily sales
  - Days of stock untuk setiap produk

**Algoritma:**
```javascript
// Fast moving: avg_daily_sales > average * 1.5
// Slow moving: avg_daily_sales < average * 0.5
velocity_ratio = product_avg_sales / overall_average
days_of_stock = current_stock / avg_daily_sales
```

#### B. Stock Level Suggestions
- **Fungsi:** `generateStockSuggestions()`
- **Deskripsi:** Memberikan saran restock berdasarkan minimum_stock dan maximum_stock
- **Severity Levels:**
  - **Critical:** Out of stock atau below minimum
  - **Warning:** Approaching minimum (< 120% min) atau overstock (> max)
  - **Info:** Normal stock levels

**Logic:**
```javascript
if (currentStock === 0) → CRITICAL: Restock immediately
else if (currentStock < minimum_stock) → CRITICAL: Below minimum
else if (currentStock < minimum_stock * 1.2) → WARNING: Approaching minimum
else if (currentStock > maximum_stock) → WARNING: Overstock
```

#### C. Expiry Analysis & FIFO/FEFO Strategy
- **Fungsi:** `analyzeExpiryAndStrategy()`
- **Deskripsi:** Analisis produk yang mendekati expired dan rekomendasi strategi
- **Strategies:**
  - **FEFO (First Expire First Out):** Untuk produk dengan shelf life < 30 hari
  - **FIFO (First In First Out):** Untuk produk dengan shelf life > 30 hari

**Priority Levels:**
```javascript
≤ 3 days   → CRITICAL: Diskon 30-50% atau return
≤ 7 days   → HIGH: Promo 20-30% atau bundle deals
≤ 14 days  → MEDIUM: Feature in promotions
≤ 30 days  → LOW: Monitor dan prioritas penjualan
> 30 days  → NORMAL: Normal stock rotation (FIFO)
```

#### D. Purchase Order Suggestions
- **Fungsi:** `generatePurchaseOrderSuggestions()`
- **Deskripsi:** Kombinasi velocity analysis dan stock suggestions untuk rekomendasi PO
- **Priority:**
  - **High:** Fast moving + below minimum
  - **Medium:** Normal velocity + below minimum
  - **Low:** Approaching minimum

#### E. Live Updates for Marquee
- **Fungsi:** `getLiveUpdates()`
- **Deskripsi:** Agregasi semua analisis untuk ditampilkan di marquee
- **Output Types:**
  - Stock alerts (critical & warning)
  - Expiry alerts
  - Fast moving products
  - Slow moving with overstock
  - Purchase suggestions

### 2. API Endpoints

#### A. Live Updates API
**Endpoint:** `GET /api/inventory/live-updates`
**Response:**
```json
{
  "success": true,
  "data": [
    {
      "type": "stock_alert",
      "severity": "critical",
      "icon": "🚨",
      "message": "Paracetamol 500mg - URGENT: Restock immediately",
      "product_id": 1
    }
  ],
  "total": 5,
  "timestamp": "2026-01-28T17:52:29.284Z"
}
```

#### B. Velocity Analysis API
**Endpoint:** `GET /api/inventory/analysis/velocity?days=30`
**Response:**
```json
{
  "success": true,
  "data": {
    "fast_moving": [...],
    "slow_moving": [...],
    "average_daily_sales": 15.5,
    "analysis_period_days": 30
  }
}
```

#### C. Stock Suggestions API
**Endpoint:** `GET /api/inventory/analysis/stock-suggestions`
**Response:**
```json
{
  "success": true,
  "data": [...],
  "grouped": {
    "critical": [...],
    "warning": [...],
    "info": [...]
  },
  "summary": {
    "total": 25,
    "critical": 5,
    "warning": 10,
    "info": 10
  }
}
```

#### D. Expiry Strategy API
**Endpoint:** `GET /api/inventory/analysis/expiry-strategy`
**Response:**
```json
{
  "success": true,
  "data": {
    "expiring_products": [...],
    "total_expiring": 10,
    "critical_count": 2,
    "high_priority_count": 5
  }
}
```

#### E. Purchase Suggestions API
**Endpoint:** `GET /api/inventory/analysis/purchase-suggestions`
**Response:**
```json
{
  "success": true,
  "data": [...],
  "grouped": {
    "high": [...],
    "medium": [...],
    "low": [...]
  },
  "summary": {
    "total": 15,
    "high_priority": 5,
    "medium_priority": 7,
    "low_priority": 3
  }
}
```

### 3. Frontend Integration

#### Marquee Live Updates
**File:** `pages/inventory/index.tsx`

**Features:**
- Auto-refresh setiap 30 detik
- Real-time data dari backend API
- Dynamic icon dan color berdasarkan severity
- Seamless loop animation
- Empty state handling

**Implementation:**
```typescript
const [liveUpdates, setLiveUpdates] = useState<any[]>([]);

useEffect(() => {
  fetchLiveUpdates();
  const interval = setInterval(() => {
    fetchLiveUpdates();
  }, 30000); // Refresh every 30 seconds
  return () => clearInterval(interval);
}, []);

const fetchLiveUpdates = async () => {
  const response = await fetch('/api/inventory/live-updates');
  const data = await response.json();
  if (data.success && data.data) {
    setLiveUpdates(data.data);
  }
};
```

## Parameter Configuration

### Minimum & Maximum Stock
Digunakan untuk menentukan kapan produk perlu restock:
- **minimum_stock:** Batas bawah stock yang aman
- **maximum_stock:** Batas atas untuk mencegah overstock

### Expiry Date
Digunakan untuk analisis FIFO/FEFO:
- Produk dengan `expiry` field akan dianalisis
- Rekomendasi strategi berdasarkan days until expiry

### Velocity Calculation
Berdasarkan data transaksi atau stock movements:
- **Primary:** POS transaction items (jika ada)
- **Fallback:** Stock movements dengan type 'out'

## Best Practices

### 1. Set Minimum & Maximum Stock
```sql
UPDATE products 
SET minimum_stock = 10, 
    maximum_stock = 100 
WHERE id = 1;
```

### 2. Set Expiry Dates
```sql
UPDATE products 
SET expiry = '2026-03-15' 
WHERE id = 1;
```

### 3. Monitor Live Updates
- Check marquee di halaman inventory
- Review alerts secara berkala
- Ambil action berdasarkan severity

### 4. Use Analysis APIs
```javascript
// Get velocity analysis
const velocity = await fetch('/api/inventory/analysis/velocity?days=7');

// Get stock suggestions
const suggestions = await fetch('/api/inventory/analysis/stock-suggestions');

// Get expiry strategy
const expiry = await fetch('/api/inventory/analysis/expiry-strategy');

// Get purchase suggestions
const purchase = await fetch('/api/inventory/analysis/purchase-suggestions');
```

## Troubleshooting

### API Returns Empty Data
**Penyebab:**
- Tidak ada produk dengan minimum/maximum stock yang terisi
- Tidak ada transaksi dalam periode analisis
- Tidak ada produk dengan expiry date

**Solusi:**
- Set minimum_stock dan maximum_stock untuk produk
- Pastikan ada data transaksi atau stock movements
- Set expiry date untuk produk yang memiliki tanggal kadaluarsa

### Velocity Analysis Returns Empty
**Penyebab:**
- Tabel pos_transaction_items belum ada
- Tidak ada stock movements dalam periode

**Solusi:**
- Service otomatis fallback ke stock_movements
- Pastikan ada data stock movements dengan type 'out'

## Future Enhancements

1. **Machine Learning Integration**
   - Predictive analytics untuk demand forecasting
   - Seasonal pattern detection
   - Automatic reorder point calculation

2. **Advanced Reporting**
   - ABC Analysis (Pareto principle)
   - Inventory turnover ratio
   - Stock aging analysis

3. **Real-time Notifications**
   - Email/SMS alerts untuk critical stock
   - Push notifications untuk mobile app
   - Webhook integration

4. **Multi-location Support**
   - Per-location velocity analysis
   - Inter-location transfer suggestions
   - Centralized vs distributed inventory optimization

## Kesimpulan

Sistem Inventory Analysis ini menyediakan:
✅ **Real-time insights** tentang kondisi inventory
✅ **Automated suggestions** untuk restock dan pricing
✅ **FIFO/FEFO recommendations** untuk produk dengan expiry
✅ **Fast/Slow moving analysis** untuk optimasi inventory
✅ **Live updates marquee** yang terintegrasi dengan backend
✅ **Comprehensive API** untuk custom integrations

Semua data berasal dari database real dan diupdate secara real-time.
