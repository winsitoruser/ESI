# 📊 ANALISIS LENGKAP - Reports Page (http://localhost:3001/reports)

**Tanggal Analisis:** 12 Februari 2026  
**Halaman:** `/reports` dan sub-halaman reports  
**Status:** ✅ Fully Analyzed

---

## 📋 **TABLE OF CONTENTS**

1. [Overview Arsitektur](#overview-arsitektur)
2. [Frontend Components](#frontend-components)
3. [API Endpoints](#api-endpoints)
4. [Database Schema](#database-schema)
5. [Data Flow](#data-flow)
6. [Integration Map](#integration-map)
7. [Query Analysis](#query-analysis)
8. [Recommendations](#recommendations)

---

## 🏗️ **OVERVIEW ARSITEKTUR**

### **Struktur Halaman Reports**

Reports page menggunakan **hierarchical navigation pattern**:

```
/reports (Dashboard Navigasi)
├── /pos/reports (Laporan Penjualan)
├── /inventory/reports (Laporan Inventory)
├── /finance/reports (Laporan Keuangan)
└── /customers/reports (Laporan Pelanggan)
```

### **Tech Stack**

| Layer | Technology |
|-------|-----------|
| **Frontend** | Next.js 13, React, TypeScript |
| **UI Components** | Shadcn/ui, Tailwind CSS |
| **Charts** | ApexCharts (dynamic import) |
| **State Management** | React Hooks (useState, useEffect) |
| **Data Fetching** | Axios, SWR pattern |
| **Backend API** | Next.js API Routes |
| **Database** | PostgreSQL |
| **ORM/Query Builder** | pg (node-postgres) |
| **Authentication** | NextAuth.js |

---

## 🎨 **FRONTEND COMPONENTS**

### **1. Main Reports Dashboard** (`/pages/reports.tsx`)

**Purpose:** Navigation hub untuk semua kategori laporan

**Key Features:**
- Quick stats cards (4 metrics)
- Report category cards (4 categories)
- Quick actions (date picker, export, charts)
- Recent reports list

**Data Source:** 
- ❌ **No API calls** - Static/mock data
- Data hardcoded di component

**Component Structure:**
```typescript
const ReportsPage: React.FC = () => {
  // State
  const { data: session, status } = useSession();
  
  // Static data
  const reportCategories = [
    { title: "Laporan Penjualan", href: "/pos/reports", ... },
    { title: "Laporan Inventory", href: "/inventory/reports", ... },
    { title: "Laporan Keuangan", href: "/finance/reports", ... },
    { title: "Laporan Pelanggan", href: "/customers/reports", ... }
  ];
  
  const quickStats = [
    { label: "Total Penjualan Bulan Ini", value: "Rp 125 Jt", ... },
    // ... more stats
  ];
  
  // No API calls - purely presentational
}
```

**Props & State:**
- `session` - NextAuth session
- `status` - Authentication status
- No dynamic data fetching

---

### **2. POS Reports** (`/pages/pos/reports.tsx`)

**Purpose:** Laporan penjualan dan transaksi POS

**Key Features:**
- Date range selector (today, week, month, custom)
- Key metrics cards (4 metrics)
- Sales by time period (bar chart)
- Top products table

**Data Source:**
- ❌ **No API calls** - Static/mock data
- Data hardcoded di component

**Mock Data:**
```typescript
const salesData = [
  { period: "00:00 - 06:00", sales: 1200000, transactions: 8 },
  { period: "06:00 - 12:00", sales: 4500000, transactions: 32 },
  // ...
];

const topProducts = [
  { name: "Produk A", sold: 145, revenue: 2900000 },
  // ...
];
```

**State Management:**
```typescript
const [dateRange, setDateRange] = useState('today');
// No API integration yet
```

---

### **3. Inventory Reports** (`/pages/inventory/reports.tsx`)

**Purpose:** Laporan stok, nilai inventory, dan pergerakan

**Key Features:**
- 4 tabs: Stock Value, Stock Movement, Low Stock, Product Analysis
- Branch filter (multi-location support)
- Export functionality (PDF, Excel, CSV)
- Print purchase order for low stock
- Real-time data from API

**Data Source:**
- ✅ **API Integration** - `/api/inventory/reports`
- Fallback to mock data jika API gagal

**Component Structure:**
```typescript
const ReportsPage: NextPage = () => {
  // State
  const [tab, setTab] = useState("stock-value");
  const [period, setPeriod] = useState("all-time");
  const [selectedBranch, setSelectedBranch] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(false);
  const [apiData, setApiData] = useState<any>(null);
  const [isFromMock, setIsFromMock] = useState(false);
  
  // API Integration
  const loadReportsData = async () => {
    setIsLoading(true);
    try {
      let result;
      switch (tab) {
        case 'stock-value':
          result = await fetchStockValueReport({ branch: selectedBranch, period });
          break;
        case 'stock-movement':
          result = await fetchStockMovementReport({ branch: selectedBranch, period });
          break;
        case 'low-stock':
          result = await fetchLowStockReport({ branch: selectedBranch });
          break;
        case 'product-analysis':
          result = await fetchProductAnalysisReport({ branch: selectedBranch, period });
          break;
      }
      
      if (result.success) {
        setApiData(result.data);
        setIsFromMock(result.isFromMock);
      }
    } catch (error) {
      console.error('Error loading reports data:', error);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Load on mount and filter change
  React.useEffect(() => {
    loadReportsData();
  }, [tab, selectedBranch, period]);
}
```

**Branch Mapping:**
```typescript
const mockBranches = [
  { id: "all", name: "Semua Cabang", code: "ALL" },
  { id: "warehouse-001", name: "Gudang Pusat", code: "WH-001" },
  { id: "branch-001", name: "Toko Cabang A", code: "ST-001" },
  { id: "branch-002", name: "Toko Cabang B", code: "ST-002" },
  { id: "warehouse-002", name: "Gudang Regional Jakarta", code: "WH-002" },
  { id: "branch-003", name: "Toko Cabang C", code: "ST-003" },
  { id: "branch-004", name: "Toko Cabang D", code: "ST-004" }
];
```

---

### **4. Finance Reports** (`/pages/finance/reports.tsx`)

**Purpose:** Laporan keuangan (pendapatan, pengeluaran, profit)

**Key Features:**
- Lazy-loaded component (performance optimization)
- Role-based access control
- Mock financial data

**Data Source:**
- ❌ **No API calls** - Mock data
- Uses lazy loading for performance

**Component Structure:**
```typescript
const ReportsComponent = lazy(() => import("../../components/finance/ReportsComponent"));

const FinanceReportsPage: NextPage = () => {
  const { user, loading } = useAuth();
  const [isAuthorized, setIsAuthorized] = useState(false);
  
  // Authorization check
  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.push('/login');
        return;
      }
      
      // Role-based access
      if (user.role === 'CASHIER') {
        router.push('/pos/kasir');
        return;
      } else if (user.role === 'PHARMACIST') {
        router.push('/inventory');
        return;
      }
      
      setIsAuthorized(true);
    }
  }, [loading, user, router]);
  
  return (
    <FinanceLayout>
      <Suspense fallback={<LoadingSpinner />}>
        <ReportsComponent />
      </Suspense>
    </FinanceLayout>
  );
};
```

**Mock Data:**
```typescript
const summaryData = [
  { period: 'Jan 2025', income: 32500000, expense: 22300000, profit: 10200000, growth: 3.5 },
  { period: 'Feb 2025', income: 36700000, expense: 25100000, profit: 11600000, growth: 13.7 },
  { period: 'Mar 2025', income: 40200000, expense: 24500000, profit: 15700000, growth: 35.3 }
];
```

---

### **5. Customer Reports** (`/pages/customers/reports.tsx`)

**Purpose:** Analisis pelanggan dan CRM

**Key Features:**
- 4 charts: New Customers, Purchase Frequency, Spending Distribution, Membership
- Date range filter (30 days, 90 days, 6 months, 1 year)
- Export functionality (PDF, Excel)
- Dynamic charts with ApexCharts

**Data Source:**
- ❌ **No API calls** - Mock data
- Uses `mockCustomerChartData`

**Component Structure:**
```typescript
const CustomerReportsPage: React.FC = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [chartData, setChartData] = useState(mockCustomerChartData);
  const [isFromMock, setIsFromMock] = useState(true);
  const [dateRange, setDateRange] = useState<DateRange>({
    startDate: new Date(new Date().setMonth(new Date().getMonth() - 5)),
    endDate: new Date()
  });
  
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        // TODO: API endpoint
        // const response = await fetch('/api/customers/chart-data');
        
        // Using mock data for now
        setChartData(mockCustomerChartData);
        setIsFromMock(true);
      } catch (error) {
        console.error('Error fetching chart data:', error);
        setChartData(mockCustomerChartData);
        setIsFromMock(true);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchData();
  }, [dateRange]);
}
```

**Charts Configuration:**
```typescript
// New Customers Chart (Area)
const newCustomersOptions = {
  chart: { id: 'new-customers', type: 'area' },
  colors: ['#ef4444'],
  xaxis: { categories: chartData?.newCustomersChart?.months || [] },
  stroke: { curve: 'smooth', width: 3 },
  fill: { type: 'gradient', gradient: { ... } }
};

// Purchase Frequency Chart (Bar)
const purchaseFrequencyOptions = {
  chart: { id: 'purchase-frequency', type: 'bar' },
  colors: ['#f97316'],
  plotOptions: { bar: { columnWidth: '70%', distributed: true } }
};

// Membership Distribution (Pie)
const membershipOptions = {
  chart: { id: 'membership-distribution', type: 'pie' },
  colors: ['#f59e0b', '#ef4444', '#fbbf24', '#b91c1c'],
  labels: chartData?.membershipDistributionChart?.labels || []
};
```

---

## 🔌 **API ENDPOINTS**

### **1. Inventory Reports API** (`/api/inventory/reports`)

**File:** `/pages/api/inventory/reports.ts`

**Methods:** `GET`, `POST`

**Endpoints:**

#### **GET /api/inventory/reports**

Query laporan inventory

**Query Parameters:**
```typescript
{
  reportType: 'stock-value' | 'stock-movement' | 'low-stock' | 'product-analysis',
  branch?: string,           // 'all' | 'branch-001' | 'warehouse-001' | etc
  period?: string,           // 'today' | 'week' | 'month' | 'year' | 'all-time'
  dateFrom?: string,         // ISO date string
  dateTo?: string,           // ISO date string
  page?: number,             // For pagination (stock-movement)
  limit?: number             // For pagination (stock-movement)
}
```

**Response:**
```typescript
{
  success: boolean,
  data: {
    // Varies by reportType
  },
  isFromMock: boolean,
  reportType: string,
  generatedAt: string
}
```

#### **POST /api/inventory/reports**

Generate/export laporan

**Request Body:**
```typescript
{
  reportType: string,
  parameters: {
    branch?: string,
    period?: string,
    dateFrom?: string,
    dateTo?: string
  },
  format: 'pdf' | 'excel' | 'csv'
}
```

**Response:**
```typescript
{
  success: boolean,
  data: {
    reportId: string,        // e.g., "RPT-1707734400000"
    reportType: string,
    format: string,
    generatedAt: string,
    downloadUrl?: string     // Optional download URL
  },
  isFromMock: boolean,
  message: string
}
```

---

### **2. Report Types Detail**

#### **A. Stock Value Report**

**Endpoint:** `GET /api/inventory/reports?reportType=stock-value`

**Response Structure:**
```typescript
{
  success: true,
  data: {
    summary: {
      totalValue: number,              // Total nilai stok
      previousTotalValue: number,      // Nilai periode sebelumnya
      categories: [
        {
          id: string,
          name: string,
          itemCount: number,
          value: number,
          percentage: number,
          trend: 'up' | 'down' | 'stable',
          trendPercentage: number
        }
      ]
    },
    period: string,
    branch: string,
    generatedAt: string
  },
  isFromMock: boolean
}
```

**Database Query:**
```sql
-- Total stock value
SELECT 
  COALESCE(SUM(s.quantity * p.buy_price), 0) as total_value,
  COUNT(DISTINCT p.id) as total_products
FROM inventory_stock s
JOIN products p ON s.product_id = p.id
WHERE s.quantity > 0
  AND p.is_active = true
  AND s.location_id = $1  -- if branch specified

-- Category breakdown
SELECT 
  c.id,
  c.name,
  COUNT(DISTINCT p.id) as item_count,
  COALESCE(SUM(s.quantity * p.buy_price), 0) as value
FROM categories c
LEFT JOIN products p ON c.id = p.category_id AND p.is_active = true
LEFT JOIN inventory_stock s ON p.id = s.product_id AND s.quantity > 0
GROUP BY c.id, c.name
HAVING COALESCE(SUM(s.quantity * p.buy_price), 0) > 0
ORDER BY value DESC
```

---

#### **B. Stock Movement Report**

**Endpoint:** `GET /api/inventory/reports?reportType=stock-movement`

**Response Structure:**
```typescript
{
  success: true,
  data: {
    movements: [
      {
        id: string,
        date: Date,
        type: 'in' | 'out' | 'adjustment',
        reference: string,
        productName: string,
        productId: string,
        sku: string,
        quantity: number,
        fromTo: string,
        notes: string,
        staff: string,
        batchNumber?: string,
        expiryDate?: string
      }
    ],
    pagination: {
      total: number,
      page: number,
      limit: number,
      totalPages: number
    },
    filters: {
      dateFrom?: string,
      dateTo?: string,
      period?: string
    }
  },
  isFromMock: boolean
}
```

**Database Query:**
```sql
SELECT 
  sm.id,
  sm.created_at as date,
  sm.movement_type as type,
  sm.reference_number as reference,
  p.name as product_name,
  p.id as product_id,
  p.sku,
  sm.quantity,
  CASE 
    WHEN sm.movement_type = 'in' THEN 'From: ' || COALESCE(sm.notes, 'Stock In')
    WHEN sm.movement_type = 'out' THEN 'To: ' || COALESCE(sm.notes, 'Stock Out')
    ELSE COALESCE(sm.notes, 'Adjustment')
  END as from_to,
  sm.notes,
  sm.created_by as staff,
  sm.batch_number,
  sm.expiry_date
FROM stock_movements sm
JOIN products p ON sm.product_id = p.id
WHERE 1=1
  AND sm.location_id = $1  -- if branch specified
  AND sm.created_at >= $2  -- if dateFrom specified
  AND sm.created_at <= $3  -- if dateTo specified
ORDER BY sm.created_at DESC
LIMIT $4 OFFSET $5
```

---

#### **C. Low Stock Report**

**Endpoint:** `GET /api/inventory/reports?reportType=low-stock`

**Response Structure:**
```typescript
{
  success: true,
  data: {
    products: [
      {
        id: string,
        productName: string,
        sku: string,
        categoryName: string,
        currentStock: number,
        minStock: number,
        maxStock: number,
        reorderPoint: number,
        price: number,
        supplier: string,
        location: string,
        lastRestockDate: string,
        status: 'out_of_stock' | 'critical' | 'warning' | 'normal'
      }
    ],
    summary: {
      totalLowStock: number,
      criticalCount: number,
      warningCount: number,
      totalValue: number
    }
  },
  isFromMock: boolean
}
```

**Database Query:**
```sql
SELECT 
  p.id,
  p.name as product_name,
  p.sku,
  c.name as category_name,
  COALESCE(s.quantity, 0) as current_stock,
  p.minimum_stock as min_stock,
  p.maximum_stock as max_stock,
  p.reorder_point,
  p.buy_price as price,
  sup.name as supplier,
  l.name as location,
  (
    SELECT MAX(sm.created_at)
    FROM stock_movements sm
    WHERE sm.product_id = p.id AND sm.movement_type = 'in'
  ) as last_restock_date,
  CASE 
    WHEN COALESCE(s.quantity, 0) = 0 THEN 'out_of_stock'
    WHEN COALESCE(s.quantity, 0) < (p.minimum_stock * 0.5) THEN 'critical'
    WHEN COALESCE(s.quantity, 0) < p.minimum_stock THEN 'warning'
    ELSE 'normal'
  END as status
FROM products p
LEFT JOIN inventory_stock s ON p.id = s.product_id
LEFT JOIN categories c ON p.category_id = c.id
LEFT JOIN suppliers sup ON p.supplier_id = sup.id
LEFT JOIN locations l ON s.location_id = l.id
WHERE p.is_active = true
  AND (
    COALESCE(s.quantity, 0) < p.minimum_stock 
    OR COALESCE(s.quantity, 0) < p.reorder_point
  )
ORDER BY 
  CASE status
    WHEN 'out_of_stock' THEN 1
    WHEN 'critical' THEN 2
    WHEN 'warning' THEN 3
    ELSE 4
  END,
  (COALESCE(s.quantity, 0) / NULLIF(p.minimum_stock, 0)) ASC
```

---

#### **D. Product Analysis Report**

**Endpoint:** `GET /api/inventory/reports?reportType=product-analysis`

**Response Structure:**
```typescript
{
  success: true,
  data: {
    topSellingProducts: [
      {
        id: string,
        productName: string,
        sku: string,
        totalSold: number,
        revenue: number,
        profit: number,
        profitMargin: number,
        trend: 'up' | 'down' | 'stable'
      }
    ],
    slowMovingProducts: [
      {
        id: string,
        productName: string,
        sku: string,
        currentStock: number,
        lastSaleDate: string,
        daysSinceLastSale: number,
        value: number,
        recommendation: string
      }
    ]
  },
  isFromMock: boolean
}
```

**Database Queries:**

**Top Selling Products:**
```sql
SELECT 
  p.id,
  p.name as product_name,
  p.sku,
  COUNT(DISTINCT sm.id) as total_transactions,
  SUM(ABS(sm.quantity)) as total_sold,
  SUM(ABS(sm.quantity) * p.sell_price) as revenue,
  SUM(ABS(sm.quantity) * (p.sell_price - p.buy_price)) as profit,
  CASE 
    WHEN SUM(ABS(sm.quantity) * p.sell_price) > 0 
    THEN ((SUM(ABS(sm.quantity) * (p.sell_price - p.buy_price)) / SUM(ABS(sm.quantity) * p.sell_price)) * 100)
    ELSE 0
  END as profit_margin,
  'stable' as trend
FROM products p
JOIN stock_movements sm ON p.id = sm.product_id
WHERE sm.movement_type = 'out'
  AND sm.reference_type IN ('sale', 'transfer_out')
  AND sm.created_at >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY p.id, p.name, p.sku, p.sell_price, p.buy_price
HAVING SUM(ABS(sm.quantity)) > 0
ORDER BY total_sold DESC
LIMIT 10
```

**Slow Moving Products:**
```sql
SELECT 
  p.id,
  p.name as product_name,
  p.sku,
  COALESCE(s.quantity, 0) as current_stock,
  MAX(sm.created_at) as last_sale_date,
  CASE 
    WHEN MAX(sm.created_at) IS NULL THEN 999
    ELSE EXTRACT(DAY FROM (CURRENT_TIMESTAMP - MAX(sm.created_at)))
  END as days_since_last_sale,
  (COALESCE(s.quantity, 0) * p.buy_price) as value,
  CASE 
    WHEN MAX(sm.created_at) IS NULL THEN 'Never sold - consider removing'
    WHEN EXTRACT(DAY FROM (CURRENT_TIMESTAMP - MAX(sm.created_at))) > 90 THEN 'Very slow - consider discount'
    WHEN EXTRACT(DAY FROM (CURRENT_TIMESTAMP - MAX(sm.created_at))) > 60 THEN 'Slow moving - monitor closely'
    ELSE 'Normal'
  END as recommendation
FROM products p
LEFT JOIN inventory_stock s ON p.id = s.product_id
LEFT JOIN stock_movements sm ON p.id = sm.product_id 
  AND sm.movement_type = 'out'
  AND sm.reference_type IN ('sale', 'transfer_out')
WHERE p.is_active = true
  AND COALESCE(s.quantity, 0) > 0
GROUP BY p.id, p.name, p.sku, s.quantity, p.buy_price
HAVING 
  MAX(sm.created_at) IS NULL 
  OR EXTRACT(DAY FROM (CURRENT_TIMESTAMP - MAX(sm.created_at))) > 60
ORDER BY days_since_last_sale DESC
LIMIT 10
```

---

## 🗄️ **DATABASE SCHEMA**

### **Tables Used by Reports**

#### **1. products**
```sql
CREATE TABLE products (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  sku VARCHAR(100) UNIQUE NOT NULL,
  category_id INTEGER REFERENCES categories(id),
  supplier_id INTEGER REFERENCES suppliers(id),
  buy_price DECIMAL(15,2) NOT NULL,
  sell_price DECIMAL(15,2) NOT NULL,
  minimum_stock INTEGER DEFAULT 0,
  maximum_stock INTEGER DEFAULT 0,
  reorder_point INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### **2. inventory_stock**
```sql
CREATE TABLE inventory_stock (
  id SERIAL PRIMARY KEY,
  product_id INTEGER REFERENCES products(id),
  location_id INTEGER REFERENCES locations(id),
  quantity INTEGER DEFAULT 0,
  last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(product_id, location_id)
);
```

#### **3. stock_movements**
```sql
CREATE TABLE stock_movements (
  id SERIAL PRIMARY KEY,
  product_id INTEGER REFERENCES products(id),
  location_id INTEGER REFERENCES locations(id),
  movement_type VARCHAR(20) NOT NULL, -- 'in', 'out', 'adjustment'
  reference_type VARCHAR(50),          -- 'sale', 'purchase', 'transfer_in', 'transfer_out'
  reference_number VARCHAR(100),
  quantity INTEGER NOT NULL,
  notes TEXT,
  batch_number VARCHAR(100),
  expiry_date DATE,
  created_by VARCHAR(100),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### **4. categories**
```sql
CREATE TABLE categories (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  parent_id INTEGER REFERENCES categories(id),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### **5. suppliers**
```sql
CREATE TABLE suppliers (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  contact_person VARCHAR(100),
  phone VARCHAR(20),
  email VARCHAR(100),
  address TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### **6. locations**
```sql
CREATE TABLE locations (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  code VARCHAR(20) UNIQUE,
  type VARCHAR(20),  -- 'warehouse', 'store', 'branch'
  address TEXT,
  phone VARCHAR(20),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

---

## 🔄 **DATA FLOW**

### **Complete Request-Response Flow**

```
┌─────────────┐
│   Browser   │
│  (Frontend) │
└──────┬──────┘
       │ 1. User clicks "Inventory Reports"
       │
       ▼
┌─────────────────────────────┐
│ /inventory/reports.tsx      │
│ - useState hooks            │
│ - useEffect for data load   │
└──────┬──────────────────────┘
       │ 2. Call fetchStockValueReport()
       │
       ▼
┌─────────────────────────────┐
│ reports-adapter.ts          │
│ - axios.get()               │
│ - Error handling            │
│ - Timeout (10s)             │
└──────┬──────────────────────┘
       │ 3. GET /api/inventory/reports?reportType=stock-value
       │
       ▼
┌─────────────────────────────┐
│ /api/inventory/reports.ts   │
│ - Authentication check      │
│ - Parse query params        │
│ - Map branch to location_id │
└──────┬──────────────────────┘
       │ 4. Initialize PostgreSQL pool
       │
       ▼
┌─────────────────────────────┐
│ inventory-reports-queries.ts│
│ - getStockValueReport()     │
│ - Build SQL query           │
└──────┬──────────────────────┘
       │ 5. Execute SQL queries
       │
       ▼
┌─────────────────────────────┐
│ PostgreSQL Database         │
│ - inventory_stock           │
│ - products                  │
│ - categories                │
└──────┬──────────────────────┘
       │ 6. Return query results
       │
       ▼
┌─────────────────────────────┐
│ inventory-reports-queries.ts│
│ - Process results           │
│ - Calculate percentages     │
│ - Format data               │
└──────┬──────────────────────┘
       │ 7. Return formatted data
       │
       ▼
┌─────────────────────────────┐
│ /api/inventory/reports.ts   │
│ - Add metadata              │
│ - Set isFromMock flag       │
│ - Error handling            │
└──────┬──────────────────────┘
       │ 8. JSON response
       │
       ▼
┌─────────────────────────────┐
│ reports-adapter.ts          │
│ - Parse response            │
│ - Handle errors             │
│ - Return to component       │
└──────┬──────────────────────┘
       │ 9. Update state
       │
       ▼
┌─────────────────────────────┐
│ /inventory/reports.tsx      │
│ - setApiData(result.data)   │
│ - setIsFromMock(flag)       │
│ - setIsLoading(false)       │
└──────┬──────────────────────┘
       │ 10. Re-render UI
       │
       ▼
┌─────────────┐
│   Browser   │
│ Display Data│
└─────────────┘
```

---

## 🗺️ **INTEGRATION MAP**

### **Frontend ↔ Backend Integration**

| Frontend Page | API Endpoint | Database Tables | Status |
|--------------|--------------|-----------------|--------|
| `/reports` | ❌ None | ❌ None | Static |
| `/pos/reports` | ❌ None | ❌ None | Mock Data |
| `/inventory/reports` | ✅ `/api/inventory/reports` | ✅ 6 tables | **Integrated** |
| `/finance/reports` | ❌ None | ❌ None | Mock Data |
| `/customers/reports` | ❌ None | ❌ None | Mock Data |

### **Inventory Reports Integration Detail**

```typescript
// Frontend Adapter
export async function fetchStockValueReport(filter?: ReportsFilter) {
  const response = await axios.get('/api/inventory/reports', {
    params: {
      reportType: 'stock-value',
      branch: filter?.branch,
      period: filter?.period
    }
  });
  return response.data;
}

// Backend API Handler
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { reportType, branch, period } = req.query;
  
  // Map branch to location_id
  const locationId = mapBranchToLocationId(branch as string);
  
  // Initialize database
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const reportsQueries = new InventoryReportsQueries(pool);
  
  // Execute query
  const responseData = await reportsQueries.getStockValueReport({
    branch: locationId,
    period: period as string
  });
  
  return res.status(200).json({
    success: true,
    data: responseData,
    isFromMock: false
  });
}

// Database Query Class
class InventoryReportsQueries {
  async getStockValueReport(params) {
    // Execute SQL queries
    const totalResult = await this.pool.query(totalValueQuery, [branch]);
    const categoryResult = await this.pool.query(categoryQuery, [branch]);
    
    // Process and return
    return {
      summary: {
        totalValue,
        categories
      }
    };
  }
}
```

---

## 📊 **QUERY ANALYSIS**

### **Performance Metrics**

| Query Type | Tables Joined | Avg Rows | Index Used | Performance |
|-----------|---------------|----------|------------|-------------|
| Stock Value | 3 (stock, products, categories) | 100-500 | ✅ product_id, category_id | **Fast** |
| Stock Movement | 2 (movements, products) | 1000-5000 | ✅ created_at, product_id | **Medium** |
| Low Stock | 5 (products, stock, categories, suppliers, locations) | 10-100 | ✅ minimum_stock, quantity | **Fast** |
| Product Analysis | 3 (products, movements, stock) | 500-2000 | ✅ movement_type, created_at | **Medium** |

### **Query Optimization Recommendations**

#### **1. Add Indexes**
```sql
-- For stock value queries
CREATE INDEX idx_inventory_stock_location_product ON inventory_stock(location_id, product_id);
CREATE INDEX idx_products_category_active ON products(category_id, is_active);

-- For stock movement queries
CREATE INDEX idx_stock_movements_date_type ON stock_movements(created_at DESC, movement_type);
CREATE INDEX idx_stock_movements_location_date ON stock_movements(location_id, created_at DESC);

-- For low stock queries
CREATE INDEX idx_products_min_stock ON products(minimum_stock) WHERE is_active = true;
CREATE INDEX idx_inventory_stock_quantity ON inventory_stock(quantity);

-- For product analysis
CREATE INDEX idx_stock_movements_ref_type ON stock_movements(reference_type, movement_type);
```

#### **2. Materialized Views for Heavy Queries**
```sql
-- Stock value summary (refresh daily)
CREATE MATERIALIZED VIEW mv_stock_value_summary AS
SELECT 
  c.id as category_id,
  c.name as category_name,
  COUNT(DISTINCT p.id) as item_count,
  SUM(s.quantity * p.buy_price) as total_value
FROM categories c
LEFT JOIN products p ON c.id = p.category_id
LEFT JOIN inventory_stock s ON p.id = s.product_id
WHERE p.is_active = true AND s.quantity > 0
GROUP BY c.id, c.name;

-- Refresh schedule
CREATE OR REPLACE FUNCTION refresh_stock_value_summary()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW mv_stock_value_summary;
END;
$$ LANGUAGE plpgsql;

-- Auto-refresh daily at midnight
SELECT cron.schedule('refresh-stock-value', '0 0 * * *', 'SELECT refresh_stock_value_summary()');
```

#### **3. Query Caching Strategy**
```typescript
// Redis cache for frequently accessed reports
import Redis from 'ioredis';

const redis = new Redis(process.env.REDIS_URL);

async function getCachedReport(cacheKey: string) {
  const cached = await redis.get(cacheKey);
  if (cached) {
    return JSON.parse(cached);
  }
  return null;
}

async function setCachedReport(cacheKey: string, data: any, ttl: number = 300) {
  await redis.setex(cacheKey, ttl, JSON.stringify(data));
}

// Usage in API
const cacheKey = `report:${reportType}:${branch}:${period}`;
let data = await getCachedReport(cacheKey);

if (!data) {
  data = await reportsQueries.getStockValueReport(params);
  await setCachedReport(cacheKey, data, 300); // 5 minutes cache
}
```

---

## 💡 **RECOMMENDATIONS**

### **1. Missing API Integrations**

#### **Priority 1: POS Reports API**
```typescript
// Create: /pages/api/pos/reports.ts
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { reportType, dateFrom, dateTo, period } = req.query;
  
  // Queries needed:
  // - Daily sales summary
  // - Sales by time period
  // - Top selling products
  // - Payment method breakdown
  // - Cashier performance
}
```

**Database Tables:**
- `pos_transactions`
- `pos_transaction_items`
- `payment_methods`
- `users` (cashiers)

#### **Priority 2: Finance Reports API**
```typescript
// Create: /pages/api/finance/reports.ts
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { reportType, period, dateFrom, dateTo } = req.query;
  
  // Queries needed:
  // - Income statement
  // - Expense breakdown
  // - Profit/loss analysis
  // - Cash flow
  // - Budget vs actual
}
```

**Database Tables:**
- `finance_transactions`
- `finance_categories`
- `chart_of_accounts`
- `bank_accounts`

#### **Priority 3: Customer Reports API**
```typescript
// Create: /pages/api/customers/reports.ts
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { reportType, period } = req.query;
  
  // Queries needed:
  // - New customers trend
  // - Purchase frequency distribution
  // - Spending distribution
  // - Membership level distribution
  // - Customer lifetime value
}
```

**Database Tables:**
- `customers`
- `customer_tiers`
- `pos_transactions`
- `loyalty_points`

---

### **2. Performance Improvements**

#### **A. Implement Server-Side Pagination**
```typescript
// Current: Load all data at once
const movements = await fetchAllMovements(); // ❌ Slow

// Recommended: Paginated loading
const movements = await fetchMovements({ page: 1, limit: 50 }); // ✅ Fast
```

#### **B. Add Loading States**
```typescript
// Show skeleton loaders while fetching
{isLoading ? (
  <SkeletonLoader />
) : (
  <DataTable data={apiData} />
)}
```

#### **C. Implement Data Caching**
```typescript
// Use SWR for automatic caching and revalidation
import useSWR from 'swr';

const { data, error, isLoading } = useSWR(
  `/api/inventory/reports?reportType=${tab}&branch=${branch}`,
  fetcher,
  {
    revalidateOnFocus: false,
    dedupingInterval: 60000, // 1 minute
  }
);
```

---

### **3. Security Enhancements**

#### **A. Add Role-Based Access Control**
```typescript
// Middleware for reports API
import { checkPermission } from '@/lib/middleware/checkPermission';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);
  
  // Check if user has permission to view reports
  const hasPermission = await checkPermission(session.user.id, 'reports:view');
  
  if (!hasPermission) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  
  // Continue with report generation
}
```

#### **B. Add Rate Limiting**
```typescript
import rateLimit from 'express-rate-limit';

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests, please try again later'
});

// Apply to reports API
export default limiter(handler);
```

#### **C. Sanitize Input Parameters**
```typescript
import { z } from 'zod';

const reportQuerySchema = z.object({
  reportType: z.enum(['stock-value', 'stock-movement', 'low-stock', 'product-analysis']),
  branch: z.string().optional(),
  period: z.string().optional(),
  dateFrom: z.string().datetime().optional(),
  dateTo: z.string().datetime().optional(),
});

// Validate in API
const validatedParams = reportQuerySchema.parse(req.query);
```

---

### **4. UX Improvements**

#### **A. Add Export Progress Indicator**
```typescript
const [exportProgress, setExportProgress] = useState(0);

const handleExport = async () => {
  setExportProgress(10);
  const data = await fetchData();
  setExportProgress(50);
  const file = await generatePDF(data);
  setExportProgress(90);
  await downloadFile(file);
  setExportProgress(100);
};
```

#### **B. Add Report Scheduling**
```typescript
// Allow users to schedule recurring reports
interface ReportSchedule {
  reportType: string;
  frequency: 'daily' | 'weekly' | 'monthly';
  recipients: string[];
  format: 'pdf' | 'excel';
}

// Create: /pages/api/reports/schedule
```

#### **C. Add Comparison Mode**
```typescript
// Compare two periods side-by-side
const [comparisonMode, setComparisonMode] = useState(false);
const [period1, setPeriod1] = useState('current-month');
const [period2, setPeriod2] = useState('previous-month');

// Fetch both periods and display comparison
```

---

### **5. Error Handling**

#### **A. Graceful Degradation**
```typescript
try {
  const data = await fetchFromAPI();
  setData(data);
  setIsFromMock(false);
} catch (error) {
  console.error('API failed, using mock data:', error);
  setData(mockData);
  setIsFromMock(true);
  toast.warning('Using sample data. Please check your connection.');
}
```

#### **B. Retry Logic**
```typescript
async function fetchWithRetry(url: string, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      return await axios.get(url);
    } catch (error) {
      if (i === retries - 1) throw error;
      await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
    }
  }
}
```

---

## 📈 **SUMMARY**

### **Current State**

| Feature | Status | Notes |
|---------|--------|-------|
| Main Reports Dashboard | ✅ Complete | Static navigation |
| POS Reports | ⚠️ Mock Data | Needs API integration |
| Inventory Reports | ✅ **Fully Integrated** | PostgreSQL + API working |
| Finance Reports | ⚠️ Mock Data | Needs API integration |
| Customer Reports | ⚠️ Mock Data | Needs API integration |
| Export Functionality | ⚠️ Partial | Works for inventory only |
| Real-time Data | ⚠️ Partial | Only inventory reports |
| Multi-branch Support | ✅ Complete | Inventory reports |
| Authentication | ✅ Complete | NextAuth.js |
| Authorization | ⚠️ Partial | Needs RBAC |

### **Next Steps**

1. ✅ **Inventory Reports** - Already complete
2. 🔄 **Create POS Reports API** - High priority
3. 🔄 **Create Finance Reports API** - High priority
4. 🔄 **Create Customer Reports API** - Medium priority
5. 🔄 **Add caching layer** - Performance optimization
6. 🔄 **Implement RBAC** - Security enhancement
7. 🔄 **Add report scheduling** - Feature enhancement

---

**Dokumentasi dibuat:** 12 Februari 2026  
**Last Updated:** 12 Februari 2026  
**Version:** 1.0.0
