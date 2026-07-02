# Store Settings Integration Analysis

## 📋 Overview
Comprehensive analysis and implementation plan for Store/Branch Settings feature with full integration across backend, frontend, API, database, and all modules.

---

## 🗄️ Database Schema Analysis

### Current Tables

#### 1. **stores** table (exists)
```sql
CREATE TABLE stores (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  address TEXT,
  city VARCHAR(255),
  province VARCHAR(255),
  postal_code VARCHAR(10),
  phone VARCHAR(20),
  email VARCHAR(255),
  website VARCHAR(255),
  tax_id VARCHAR(30) COMMENT 'NPWP or Tax ID',
  logo_url VARCHAR(255),
  description TEXT,
  operating_hours JSON DEFAULT '[]',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### 2. **locations** table (exists - for warehouse locations)
```sql
CREATE TABLE locations (
  id INTEGER PRIMARY KEY AUTO_INCREMENT,
  warehouse_id INTEGER NOT NULL,
  code VARCHAR(50) NOT NULL,
  name VARCHAR(100) NOT NULL,
  type ENUM('rack', 'shelf', 'bin', 'pallet', 'floor', 'chiller', 'freezer'),
  aisle VARCHAR(10),
  row VARCHAR(10),
  level VARCHAR(10),
  capacity DECIMAL(10, 2),
  current_usage DECIMAL(10, 2) DEFAULT 0,
  status ENUM('available', 'occupied', 'reserved', 'maintenance'),
  temperature_controlled BOOLEAN DEFAULT false,
  temperature_min DECIMAL(5, 2),
  temperature_max DECIMAL(5, 2),
  notes TEXT,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);
```

### Required New Tables

#### 3. **branches** table (NEW - for multi-branch management)
```sql
CREATE TABLE branches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id UUID REFERENCES stores(id) ON DELETE CASCADE,
  code VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  type ENUM('main', 'branch', 'warehouse', 'kiosk') DEFAULT 'branch',
  address TEXT,
  city VARCHAR(255),
  province VARCHAR(255),
  postal_code VARCHAR(10),
  phone VARCHAR(20),
  email VARCHAR(255),
  manager_id UUID REFERENCES users(id),
  operating_hours JSON DEFAULT '[]',
  is_active BOOLEAN DEFAULT true,
  settings JSON DEFAULT '{}',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_store_id (store_id),
  INDEX idx_code (code),
  INDEX idx_is_active (is_active)
);
```

#### 4. **store_settings** table (NEW - for advanced settings)
```sql
CREATE TABLE store_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id UUID REFERENCES stores(id) ON DELETE CASCADE,
  branch_id UUID REFERENCES branches(id) ON DELETE CASCADE,
  category VARCHAR(100) NOT NULL,
  key VARCHAR(100) NOT NULL,
  value TEXT,
  data_type ENUM('string', 'number', 'boolean', 'json') DEFAULT 'string',
  description TEXT,
  is_global BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY unique_setting (store_id, branch_id, category, key),
  INDEX idx_category (category),
  INDEX idx_key (key)
);
```

---

## 🔧 Backend Models

### 1. Store Model (EXISTS - needs enhancement)
**File:** `/models/Store.js`

**Current Status:** ✅ Exists
**Enhancements Needed:**
- Add associations with branches
- Add associations with settings
- Add methods for branch management

### 2. Branch Model (NEW)
**File:** `/models/Branch.js`

**Required Fields:**
- id, store_id, code, name, type
- address, city, province, postal_code
- phone, email, manager_id
- operating_hours, is_active, settings

**Associations:**
- belongsTo Store
- belongsTo User (manager)
- hasMany Inventory
- hasMany PosTransactions
- hasMany Employees

### 3. StoreSetting Model (NEW)
**File:** `/models/StoreSetting.js`

**Required Fields:**
- id, store_id, branch_id
- category, key, value, data_type
- description, is_global

**Associations:**
- belongsTo Store
- belongsTo Branch

---

## 🌐 API Endpoints

### Store Settings API

#### GET `/api/settings/store`
**Purpose:** Get store settings
**Response:**
```json
{
  "success": true,
  "data": {
    "store": {
      "id": "uuid",
      "name": "Toko ABC",
      "address": "...",
      "city": "Jakarta",
      "province": "DKI Jakarta",
      "postalCode": "12345",
      "phone": "021-1234567",
      "email": "info@toko.com",
      "website": "www.toko.com",
      "taxId": "01.234.567.8-901.000",
      "logoUrl": "/uploads/logo.png",
      "description": "...",
      "operatingHours": [...]
    },
    "branches": [...],
    "settings": {...}
  }
}
```

#### PUT `/api/settings/store`
**Purpose:** Update store settings
**Request Body:**
```json
{
  "store": {...},
  "operatingHours": [...]
}
```

#### GET `/api/settings/store/branches`
**Purpose:** Get all branches
**Query Params:** `?storeId=uuid&isActive=true`

#### POST `/api/settings/store/branches`
**Purpose:** Create new branch

#### PUT `/api/settings/store/branches/:id`
**Purpose:** Update branch

#### DELETE `/api/settings/store/branches/:id`
**Purpose:** Delete/deactivate branch

#### GET `/api/settings/store/settings`
**Purpose:** Get store-specific settings
**Query Params:** `?category=pos&branchId=uuid`

#### PUT `/api/settings/store/settings`
**Purpose:** Update store settings

---

## 🎨 Frontend Components

### Pages

#### 1. `/pages/settings/store.tsx` (EXISTS - needs enhancement)
**Current Status:** ✅ Exists
**Enhancements Needed:**
- Add branch management tab
- Add advanced settings tab
- Add branch selector
- Add multi-branch support

#### 2. `/pages/settings/store/branches.tsx` (NEW)
**Purpose:** Branch management page
**Features:**
- List all branches
- Add/Edit/Delete branches
- Branch status toggle
- Branch details view

#### 3. `/pages/settings/store/advanced.tsx` (NEW)
**Purpose:** Advanced store settings
**Features:**
- POS settings per branch
- Inventory settings
- Finance settings
- Notification settings

### Components

#### 1. `/components/settings/BranchCard.tsx` (NEW)
**Purpose:** Display branch information card

#### 2. `/components/settings/BranchForm.tsx` (NEW)
**Purpose:** Form for creating/editing branches

#### 3. `/components/settings/BranchSelector.tsx` (NEW)
**Purpose:** Dropdown to select active branch

#### 4. `/components/settings/StoreSettingsForm.tsx` (NEW)
**Purpose:** Reusable form for store settings

#### 5. `/components/settings/OperatingHoursEditor.tsx` (NEW)
**Purpose:** Component for editing operating hours

---

## 🔗 Integration Points

### 1. POS Module Integration
**Files to Update:**
- `/pages/pos/index.tsx` - Add branch selector
- `/pages/api/pos/transactions.ts` - Include branch_id
- `/models/PosTransaction.js` - Add branch association

**Changes:**
```javascript
// Add branch_id to transactions
PosTransaction.belongsTo(Branch, { foreignKey: 'branch_id' });

// Filter transactions by branch
const transactions = await PosTransaction.findAll({
  where: { branch_id: selectedBranchId }
});
```

### 2. Inventory Module Integration
**Files to Update:**
- `/pages/inventory/index.tsx` - Add branch filter
- `/pages/api/inventory/products.ts` - Filter by branch
- `/models/Stock.js` - Add branch association

**Changes:**
```javascript
// Add branch_id to stock
Stock.belongsTo(Branch, { foreignKey: 'branch_id' });

// Get stock by branch
const stock = await Stock.findAll({
  where: { branch_id: selectedBranchId }
});
```

### 3. Finance Module Integration
**Files to Update:**
- `/pages/finance/index.tsx` - Add branch filter
- `/pages/api/finance/transactions.ts` - Filter by branch

### 4. Employee Module Integration
**Files to Update:**
- `/pages/employees/schedules.tsx` - Filter by branch
- `/models/EmployeeSchedule.js` - Add branch association

**Changes:**
```javascript
// Add branch_id to schedules
EmployeeSchedule.belongsTo(Branch, { foreignKey: 'branch_id' });
```

### 5. Reports Module Integration
**Files to Update:**
- `/pages/reports/index.tsx` - Add branch filter
- All report APIs - Include branch filtering

---

## 🪝 Custom Hooks

### 1. `useStore` Hook (NEW)
**File:** `/hooks/useStore.ts`

```typescript
export const useStore = () => {
  const [store, setStore] = useState(null);
  const [loading, setLoading] = useState(true);
  
  const fetchStore = async () => {
    const res = await fetch('/api/settings/store');
    const data = await res.json();
    setStore(data.data);
  };
  
  const updateStore = async (storeData) => {
    const res = await fetch('/api/settings/store', {
      method: 'PUT',
      body: JSON.stringify(storeData)
    });
    return res.json();
  };
  
  return { store, loading, fetchStore, updateStore };
};
```

### 2. `useBranches` Hook (NEW)
**File:** `/hooks/useBranches.ts`

```typescript
export const useBranches = (storeId?: string) => {
  const [branches, setBranches] = useState([]);
  const [selectedBranch, setSelectedBranch] = useState(null);
  
  const fetchBranches = async () => {
    const res = await fetch(`/api/settings/store/branches?storeId=${storeId}`);
    const data = await res.json();
    setBranches(data.data);
  };
  
  const createBranch = async (branchData) => {
    const res = await fetch('/api/settings/store/branches', {
      method: 'POST',
      body: JSON.stringify(branchData)
    });
    return res.json();
  };
  
  const updateBranch = async (id, branchData) => {
    const res = await fetch(`/api/settings/store/branches/${id}`, {
      method: 'PUT',
      body: JSON.stringify(branchData)
    });
    return res.json();
  };
  
  const deleteBranch = async (id) => {
    const res = await fetch(`/api/settings/store/branches/${id}`, {
      method: 'DELETE'
    });
    return res.json();
  };
  
  return {
    branches,
    selectedBranch,
    setSelectedBranch,
    fetchBranches,
    createBranch,
    updateBranch,
    deleteBranch
  };
};
```

### 3. `useStoreSettings` Hook (NEW)
**File:** `/hooks/useStoreSettings.ts`

```typescript
export const useStoreSettings = (category?: string, branchId?: string) => {
  const [settings, setSettings] = useState({});
  
  const fetchSettings = async () => {
    const params = new URLSearchParams();
    if (category) params.append('category', category);
    if (branchId) params.append('branchId', branchId);
    
    const res = await fetch(`/api/settings/store/settings?${params}`);
    const data = await res.json();
    setSettings(data.data);
  };
  
  const updateSettings = async (settingsData) => {
    const res = await fetch('/api/settings/store/settings', {
      method: 'PUT',
      body: JSON.stringify(settingsData)
    });
    return res.json();
  };
  
  return { settings, fetchSettings, updateSettings };
};
```

---

## 🗂️ Context Providers

### 1. StoreContext (NEW)
**File:** `/contexts/StoreContext.tsx`

```typescript
export const StoreContext = createContext({
  store: null,
  branches: [],
  selectedBranch: null,
  setSelectedBranch: () => {},
  refreshStore: () => {},
  refreshBranches: () => {}
});

export const StoreProvider = ({ children }) => {
  const { store, fetchStore } = useStore();
  const { branches, selectedBranch, setSelectedBranch, fetchBranches } = useBranches();
  
  useEffect(() => {
    fetchStore();
    fetchBranches();
  }, []);
  
  return (
    <StoreContext.Provider value={{
      store,
      branches,
      selectedBranch,
      setSelectedBranch,
      refreshStore: fetchStore,
      refreshBranches: fetchBranches
    }}>
      {children}
    </StoreContext.Provider>
  );
};
```

---

## 📊 Database Migrations

### Migration 1: Create branches table
**File:** `/migrations/YYYYMMDDHHMMSS-create-branches.js`

### Migration 2: Create store_settings table
**File:** `/migrations/YYYYMMDDHHMMSS-create-store-settings.js`

### Migration 3: Add branch_id to existing tables
**File:** `/migrations/YYYYMMDDHHMMSS-add-branch-id-to-tables.js`

**Tables to update:**
- pos_transactions
- inventory_stock
- stock_movements
- employee_schedules
- finance_transactions

---

## 🧪 Testing Checklist

### Backend Tests
- [ ] Store model CRUD operations
- [ ] Branch model CRUD operations
- [ ] StoreSetting model CRUD operations
- [ ] API endpoint responses
- [ ] Model associations
- [ ] Data validation

### Frontend Tests
- [ ] Store settings page loads
- [ ] Branch management works
- [ ] Form validation
- [ ] API integration
- [ ] Branch selector functionality
- [ ] Operating hours editor

### Integration Tests
- [ ] POS with branch selection
- [ ] Inventory filtered by branch
- [ ] Finance filtered by branch
- [ ] Employee schedules per branch
- [ ] Reports with branch filter

---

## 🚀 Implementation Steps

### Phase 1: Database & Models (Priority: HIGH)
1. Create branches table migration
2. Create store_settings table migration
3. Create Branch model
4. Create StoreSetting model
5. Update Store model associations
6. Add branch_id to relevant tables

### Phase 2: API Endpoints (Priority: HIGH)
1. Enhance `/api/settings/store` endpoint
2. Create `/api/settings/store/branches` endpoints
3. Create `/api/settings/store/settings` endpoints
4. Add branch filtering to existing APIs

### Phase 3: Custom Hooks & Context (Priority: MEDIUM)
1. Create useStore hook
2. Create useBranches hook
3. Create useStoreSettings hook
4. Create StoreContext provider

### Phase 4: Frontend Components (Priority: MEDIUM)
1. Enhance `/pages/settings/store.tsx`
2. Create `/pages/settings/store/branches.tsx`
3. Create BranchCard component
4. Create BranchForm component
5. Create BranchSelector component
6. Create OperatingHoursEditor component

### Phase 5: Module Integration (Priority: HIGH)
1. Integrate with POS module
2. Integrate with Inventory module
3. Integrate with Finance module
4. Integrate with Employee module
5. Integrate with Reports module

### Phase 6: Testing & Documentation (Priority: MEDIUM)
1. Write unit tests
2. Write integration tests
3. Update API documentation
4. Create user guide

---

## 📝 Configuration Examples

### Operating Hours Format
```json
[
  {
    "day": "Senin",
    "open": "09:00",
    "close": "21:00",
    "isOpen": true
  },
  {
    "day": "Minggu",
    "open": "10:00",
    "close": "20:00",
    "isOpen": true
  }
]
```

### Branch Settings Format
```json
{
  "pos": {
    "autoprint": true,
    "defaultPaymentMethod": "cash",
    "taxRate": 10
  },
  "inventory": {
    "lowStockAlert": true,
    "lowStockThreshold": 10
  },
  "notifications": {
    "email": true,
    "sms": false
  }
}
```

---

## 🔒 Security Considerations

1. **Authorization:** Only admin/owner can modify store settings
2. **Branch Access:** Employees can only access assigned branches
3. **Data Validation:** Validate all inputs on backend
4. **Audit Trail:** Log all changes to settings
5. **API Rate Limiting:** Prevent abuse of settings APIs

---

## 📈 Performance Optimization

1. **Caching:** Cache store settings in Redis
2. **Lazy Loading:** Load branches on demand
3. **Pagination:** Paginate branch list for large datasets
4. **Indexing:** Add database indexes on frequently queried fields
5. **Query Optimization:** Use joins efficiently

---

## 🎯 Success Metrics

1. ✅ All CRUD operations working
2. ✅ Full integration with all modules
3. ✅ Branch filtering functional
4. ✅ Settings persist correctly
5. ✅ No performance degradation
6. ✅ All tests passing
7. ✅ Documentation complete

---

**Last Updated:** February 10, 2026  
**Version:** 1.0.0  
**Status:** Implementation Ready
