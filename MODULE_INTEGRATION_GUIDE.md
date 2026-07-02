# Module Integration Guide - Branch Filtering

## 📋 Overview

Panduan lengkap untuk mengintegrasikan BranchSelector dengan modul-modul dalam aplikasi Bedagang POS. Dokumentasi ini menjelaskan pola integrasi yang konsisten dan best practices.

---

## ✅ Completed Integrations

### 1. POS Module ✅
**File:** `/pages/pos/index.tsx`  
**Status:** Complete  
**Commit:** 0255c5c

**What was integrated:**
- Branch filtering for POS dashboard statistics
- Real-time data refresh on branch change
- Clean UI integration with BranchSelector

**Implementation:**
```typescript
// Import hooks and components
import BranchSelector from '@/components/settings/BranchSelector';
import { useBranches } from '@/hooks/useBranches';

// Use in component
const { branches, selectedBranch, setSelectedBranch } = useBranches();

// Add branchId to API calls
const params = new URLSearchParams({ period: selectedPeriod });
if (selectedBranch) {
  params.append('branchId', selectedBranch.id);
}

// Add to UI
{branches.length > 0 && (
  <div className="bg-white rounded-lg shadow-sm border p-4">
    <BranchSelector
      branches={branches}
      selectedBranch={selectedBranch}
      onSelect={setSelectedBranch}
    />
  </div>
)}

// Add dependency to useEffect
useEffect(() => {
  fetchDashboardData();
}, [selectedPeriod, selectedBranch]);
```

### 2. Inventory Module ✅
**File:** `/pages/inventory/index.tsx`  
**Status:** Complete  
**Commit:** d3c9e72

**What was integrated:**
- Branch filtering for inventory statistics
- Product list filtered by branch
- Real-time updates on branch change

**Implementation:**
```typescript
// Same pattern as POS
import BranchSelector from '@/components/settings/BranchSelector';
import { useBranches } from '@/hooks/useBranches';

const { branches, selectedBranch, setSelectedBranch } = useBranches();

// Filter stats
const params = new URLSearchParams();
if (selectedBranch) {
  params.append('branchId', selectedBranch.id);
}

// Filter products
if (selectedBranch) {
  params.append('branchId', selectedBranch.id);
}

// Auto-refresh on branch change
useEffect(() => {
  fetchStats();
  fetchProducts();
}, [selectedBranch]);
```

---

## 🔄 Integration Pattern

### Standard Integration Steps

#### Step 1: Import Dependencies
```typescript
import BranchSelector from '@/components/settings/BranchSelector';
import { useBranches } from '@/hooks/useBranches';
```

#### Step 2: Use Hook in Component
```typescript
const YourComponent = () => {
  const { branches, selectedBranch, setSelectedBranch } = useBranches();
  // ... rest of component
};
```

#### Step 3: Update Data Fetching Functions
```typescript
const fetchData = async () => {
  const params = new URLSearchParams();
  
  // Add your existing params
  params.append('page', currentPage.toString());
  
  // Add branch filter
  if (selectedBranch) {
    params.append('branchId', selectedBranch.id);
  }
  
  const response = await fetch(`/api/your-endpoint?${params}`);
  // ... handle response
};
```

#### Step 4: Add Branch Dependency to useEffect
```typescript
useEffect(() => {
  fetchData();
}, [
  // ... existing dependencies
  selectedBranch  // Add this
]);
```

#### Step 5: Add BranchSelector to UI
```typescript
return (
  <DashboardLayout>
    {/* Header */}
    <div className="header">...</div>
    
    {/* Branch Selector */}
    {branches.length > 0 && (
      <div className="bg-white rounded-lg shadow-sm border p-4">
        <BranchSelector
          branches={branches}
          selectedBranch={selectedBranch}
          onSelect={setSelectedBranch}
        />
      </div>
    )}
    
    {/* Rest of content */}
  </DashboardLayout>
);
```

---

## 📦 Modules Ready for Integration

### 3. Finance Module ⏳
**Files to update:**
- `/pages/finance/index.tsx`
- `/pages/finance/transactions.tsx`
- `/pages/finance/expenses.tsx`

**What to integrate:**
- Branch filtering for financial transactions
- Branch-specific expense tracking
- Revenue reports per branch

**API endpoints to update:**
- `/api/finance/transactions` - Add branchId filter
- `/api/finance/expenses` - Add branchId filter
- `/api/finance/stats` - Add branchId filter

### 4. Employee Module ⏳
**Files to update:**
- `/pages/employees/index.tsx`
- `/pages/employees/schedules.tsx`

**What to integrate:**
- Employee list filtered by branch
- Schedule management per branch
- Attendance tracking per branch

**API endpoints to update:**
- `/api/employees` - Add branchId filter
- `/api/employees/schedules` - Add branchId filter

### 5. Reports Module ⏳
**Files to update:**
- `/pages/reports/index.tsx`
- `/pages/reports/sales.tsx`
- `/pages/reports/inventory.tsx`

**What to integrate:**
- Branch-specific sales reports
- Inventory reports per branch
- Consolidated multi-branch reports

**API endpoints to update:**
- `/api/reports/sales` - Add branchId filter
- `/api/reports/inventory` - Add branchId filter

---

## 🎯 Best Practices

### 1. Consistent UI Placement
Always place BranchSelector:
- After the page header
- Before main content
- In a white card with shadow-sm border

### 2. Conditional Rendering
Only show BranchSelector if branches exist:
```typescript
{branches.length > 0 && (
  <BranchSelector ... />
)}
```

### 3. Handle "All Branches" Option
BranchSelector allows `null` for "Semua Cabang":
```typescript
if (selectedBranch) {
  params.append('branchId', selectedBranch.id);
}
// If null, don't add branchId = show all branches
```

### 4. Auto-refresh on Change
Always add `selectedBranch` to useEffect dependencies:
```typescript
useEffect(() => {
  fetchData();
}, [otherDeps, selectedBranch]);
```

### 5. Loading States
Show loading indicator while data refreshes:
```typescript
const [loading, setLoading] = useState(false);

const fetchData = async () => {
  setLoading(true);
  try {
    // fetch data
  } finally {
    setLoading(false);
  }
};
```

---

## 🔧 API Backend Integration

### Update API Endpoints

#### Example: Update Transaction API
```typescript
// pages/api/pos/transactions.ts
export default async function handler(req, res) {
  const { branchId } = req.query;
  
  const where = {};
  
  // Add branch filter if provided
  if (branchId) {
    where.branchId = branchId;
  }
  
  const transactions = await PosTransaction.findAll({
    where,
    // ... rest of query
  });
  
  return res.json({ success: true, data: transactions });
}
```

#### Example: Update Stats API
```typescript
// pages/api/inventory/stats.ts
export default async function handler(req, res) {
  const { branchId } = req.query;
  
  const where = {};
  if (branchId) {
    where.branchId = branchId;
  }
  
  const stats = {
    totalProducts: await Product.count({ where }),
    lowStock: await Product.count({ 
      where: { 
        ...where,
        quantity: { [Op.lt]: sequelize.col('minStock') }
      }
    }),
    // ... more stats
  };
  
  return res.json({ success: true, data: stats });
}
```

---

## 🗄️ Database Schema Updates

### Add branch_id to Tables

For modules that need branch tracking, add `branch_id` column:

```sql
-- Example: Add branch_id to pos_transactions
ALTER TABLE pos_transactions 
ADD COLUMN branch_id UUID REFERENCES branches(id);

-- Create index for performance
CREATE INDEX idx_pos_transactions_branch_id 
ON pos_transactions(branch_id);

-- Example: Add branch_id to inventory_stock
ALTER TABLE inventory_stock 
ADD COLUMN branch_id UUID REFERENCES branches(id);

CREATE INDEX idx_inventory_stock_branch_id 
ON inventory_stock(branch_id);
```

### Update Models

Add branch association to models:

```javascript
// models/PosTransaction.js
PosTransaction.associate = function(models) {
  PosTransaction.belongsTo(models.Branch, {
    foreignKey: 'branchId',
    as: 'branch'
  });
  // ... other associations
};
```

---

## 📊 Testing Checklist

For each module integration:

### Frontend Tests
- [ ] BranchSelector appears on page
- [ ] Can select different branches
- [ ] Can select "Semua Cabang"
- [ ] Data refreshes on branch change
- [ ] Loading state shows during refresh
- [ ] No console errors

### Backend Tests
- [ ] API accepts branchId parameter
- [ ] Data filtered correctly by branch
- [ ] Returns all data when branchId is null
- [ ] Performance is acceptable
- [ ] No database errors

### Integration Tests
- [ ] End-to-end workflow works
- [ ] Data consistency across modules
- [ ] Branch changes reflect immediately
- [ ] No data leakage between branches

---

## 🚀 Quick Integration Checklist

Use this checklist when integrating a new module:

### Preparation
- [ ] Identify pages to update
- [ ] Identify API endpoints to update
- [ ] Check if database schema needs updates

### Frontend Implementation
- [ ] Import BranchSelector and useBranches
- [ ] Add hook to component
- [ ] Update data fetching functions
- [ ] Add selectedBranch to useEffect
- [ ] Add BranchSelector to UI
- [ ] Test in browser

### Backend Implementation
- [ ] Update API to accept branchId
- [ ] Add filtering logic
- [ ] Update database queries
- [ ] Test API endpoints
- [ ] Verify performance

### Documentation
- [ ] Update this guide
- [ ] Add code examples
- [ ] Document any gotchas
- [ ] Update API documentation

### Testing
- [ ] Manual testing
- [ ] Cross-browser testing
- [ ] Performance testing
- [ ] User acceptance testing

---

## 💡 Common Issues & Solutions

### Issue 1: Type Errors with Branch
**Problem:** TypeScript errors about Branch type mismatch

**Solution:** BranchSelector uses `any` type for flexibility:
```typescript
interface BranchSelectorProps {
  branches: any[];
  selectedBranch: any;
  onSelect: (branch: any) => void;
}
```

### Issue 2: Data Not Refreshing
**Problem:** Data doesn't update when branch changes

**Solution:** Add `selectedBranch` to useEffect dependencies:
```typescript
useEffect(() => {
  fetchData();
}, [selectedBranch]); // Don't forget this!
```

### Issue 3: API Returns Wrong Data
**Problem:** API returns data from all branches

**Solution:** Ensure branchId is properly passed:
```typescript
// Check if branchId is in params
console.log('Params:', params.toString());

// Verify API receives it
console.log('Query:', req.query);
```

### Issue 4: Performance Issues
**Problem:** Slow queries with branch filter

**Solution:** Add database indexes:
```sql
CREATE INDEX idx_table_branch_id ON table_name(branch_id);
```

---

## 📝 Code Templates

### Template 1: Basic Page Integration
```typescript
import React, { useState, useEffect } from 'react';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import BranchSelector from '@/components/settings/BranchSelector';
import { useBranches } from '@/hooks/useBranches';

const YourPage = () => {
  const { branches, selectedBranch, setSelectedBranch } = useBranches();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedBranch) {
        params.append('branchId', selectedBranch.id);
      }
      
      const response = await fetch(`/api/your-endpoint?${params}`);
      const result = await response.json();
      
      if (result.success) {
        setData(result.data);
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [selectedBranch]);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl p-8 text-white">
          <h1 className="text-3xl font-bold">Your Page</h1>
        </div>

        {/* Branch Selector */}
        {branches.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm border p-4">
            <BranchSelector
              branches={branches}
              selectedBranch={selectedBranch}
              onSelect={setSelectedBranch}
            />
          </div>
        )}

        {/* Content */}
        {loading ? (
          <div>Loading...</div>
        ) : (
          <div>Your content here</div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default YourPage;
```

### Template 2: API Endpoint with Branch Filter
```typescript
import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';

const YourModel = require('@/models/YourModel');

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const session = await getServerSession(req, res, authOptions);
    if (!session) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    if (req.method === 'GET') {
      const { branchId } = req.query;
      
      const where: any = {};
      
      // Add branch filter if provided
      if (branchId) {
        where.branchId = branchId;
      }
      
      const data = await YourModel.findAll({
        where,
        order: [['createdAt', 'DESC']]
      });

      return res.status(200).json({
        success: true,
        data
      });
    }

    return res.status(405).json({ success: false, error: 'Method not allowed' });

  } catch (error: any) {
    console.error('API Error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: error.message
    });
  }
}
```

---

## 🎓 Learning Resources

### Related Documentation
- `STORE_SETTINGS_INTEGRATION_ANALYSIS.md` - Complete system analysis
- `STORE_SETTINGS_IMPLEMENTATION_SUMMARY.md` - Implementation details
- `DEPLOYMENT_GUIDE_STORE_SETTINGS.md` - Deployment instructions

### Example Implementations
- POS Module: `/pages/pos/index.tsx`
- Inventory Module: `/pages/inventory/index.tsx`

### Components
- BranchSelector: `/components/settings/BranchSelector.tsx`
- BranchCard: `/components/settings/BranchCard.tsx`
- BranchForm: `/components/settings/BranchForm.tsx`

### Hooks
- useBranches: `/hooks/useBranches.ts`
- useStore: `/hooks/useStore.ts`
- useStoreSettings: `/hooks/useStoreSettings.ts`

---

## 📈 Progress Tracking

### Completed ✅
- [x] Store/Branch Settings System
- [x] POS Module Integration
- [x] Inventory Module Integration

### In Progress ⏳
- [ ] Finance Module Integration
- [ ] Employee Module Integration
- [ ] Reports Module Integration

### Planned 📋
- [ ] Customer Module Integration
- [ ] Loyalty Program Module Integration
- [ ] Analytics Dashboard Integration

---

## 🎯 Success Metrics

Integration is successful when:
1. ✅ BranchSelector appears on page
2. ✅ Data filters correctly by branch
3. ✅ "Semua Cabang" shows all data
4. ✅ Auto-refresh works on branch change
5. ✅ No performance degradation
6. ✅ No console errors
7. ✅ User experience is smooth

---

**Last Updated:** February 10, 2026  
**Version:** 1.0.0  
**Modules Integrated:** 2/8 (POS, Inventory)  
**Status:** Active Development
