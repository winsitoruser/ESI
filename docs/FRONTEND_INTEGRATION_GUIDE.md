# 🎨 Frontend Integration Guide - HQ-Branch System

## 🎯 Overview

Guide ini akan membantu Anda mengintegrasikan sistem HQ-Branch multi-tenant ke dalam frontend Next.js yang sudah ada.

---

## ✅ Backend Ready

Semua komponen backend sudah siap:
- ✅ Database schema
- ✅ API endpoints dengan tenant filtering
- ✅ Middleware untuk authentication & authorization
- ✅ Sample data untuk testing

---

## 🚀 Quick Integration Steps

### 1. Update Admin Dashboard

**File:** `/pages/admin/analytics/index.tsx` (Currently open)

**Add Tenant Context:**

```typescript
import { useSession } from 'next-auth/react';
import { useState, useEffect } from 'react';

export default function AnalyticsDashboard() {
  const { data: session } = useSession();
  const [tenantData, setTenantData] = useState(null);
  const [branches, setBranches] = useState([]);

  useEffect(() => {
    if (session?.user) {
      fetchTenantData();
      fetchBranches();
    }
  }, [session]);

  const fetchTenantData = async () => {
    const res = await fetch('/api/hq/tenants');
    const data = await res.json();
    setTenantData(data.tenants[0]); // Current user's tenant
  };

  const fetchBranches = async () => {
    const res = await fetch('/api/hq/branches');
    const data = await res.json();
    setBranches(data.branches);
  };

  // Your existing analytics code...
}
```

---

### 2. Create Tenant Selector Component

**File:** `/components/TenantSelector.tsx` (Create new)

```typescript
import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';

interface Tenant {
  id: string;
  code: string;
  name: string;
  status: string;
}

export default function TenantSelector() {
  const { data: session } = useSession();
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [selectedTenant, setSelectedTenant] = useState<string>('');

  useEffect(() => {
    fetchTenants();
  }, []);

  const fetchTenants = async () => {
    try {
      const res = await fetch('/api/hq/tenants');
      const data = await res.json();
      setTenants(data.tenants);
      if (data.tenants.length > 0) {
        setSelectedTenant(data.tenants[0].id);
      }
    } catch (error) {
      console.error('Error fetching tenants:', error);
    }
  };

  // Only show for super admin
  if (session?.user?.role !== 'super_admin') {
    return null;
  }

  return (
    <div className="flex items-center space-x-2">
      <label className="text-sm font-medium">Tenant:</label>
      <select
        value={selectedTenant}
        onChange={(e) => setSelectedTenant(e.target.value)}
        className="px-3 py-2 border rounded-lg"
      >
        {tenants.map((tenant) => (
          <option key={tenant.id} value={tenant.id}>
            {tenant.name} ({tenant.code})
          </option>
        ))}
      </select>
    </div>
  );
}
```

---

### 3. Create Branch Selector Component

**File:** `/components/BranchSelector.tsx` (Create new)

```typescript
import { useState, useEffect } from 'react';

interface Branch {
  id: string;
  code: string;
  name: string;
  city: string;
  isActive: boolean;
}

interface BranchSelectorProps {
  onBranchChange?: (branchId: string) => void;
}

export default function BranchSelector({ onBranchChange }: BranchSelectorProps) {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [selectedBranch, setSelectedBranch] = useState<string>('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBranches();
  }, []);

  const fetchBranches = async () => {
    try {
      const res = await fetch('/api/hq/branches');
      const data = await res.json();
      setBranches(data.branches);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching branches:', error);
      setLoading(false);
    }
  };

  const handleChange = (branchId: string) => {
    setSelectedBranch(branchId);
    if (onBranchChange) {
      onBranchChange(branchId);
    }
  };

  if (loading) {
    return <div className="animate-pulse h-10 bg-gray-200 rounded"></div>;
  }

  return (
    <div className="flex items-center space-x-2">
      <label className="text-sm font-medium">Branch:</label>
      <select
        value={selectedBranch}
        onChange={(e) => handleChange(e.target.value)}
        className="px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
      >
        <option value="all">All Branches</option>
        {branches.map((branch) => (
          <option key={branch.id} value={branch.id}>
            {branch.name} - {branch.city}
          </option>
        ))}
      </select>
      <span className="text-xs text-gray-500">
        ({branches.length} branches)
      </span>
    </div>
  );
}
```

---

### 4. Create Sync Status Widget

**File:** `/components/SyncStatusWidget.tsx` (Create new)

```typescript
import { useState, useEffect } from 'react';
import { RefreshCw, CheckCircle, XCircle, Clock } from 'lucide-react';

interface SyncStatus {
  branch: {
    id: string;
    name: string;
    lastSyncAt: string;
    syncStatus: 'synced' | 'pending' | 'failed' | 'never';
    needsSync: boolean;
  };
  recentSyncs: Array<{
    id: string;
    syncType: string;
    status: string;
    itemsSynced: number;
    createdAt: string;
  }>;
}

interface SyncStatusWidgetProps {
  branchId: string;
}

export default function SyncStatusWidget({ branchId }: SyncStatusWidgetProps) {
  const [status, setStatus] = useState<SyncStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    if (branchId) {
      fetchStatus();
      // Refresh every 30 seconds
      const interval = setInterval(fetchStatus, 30000);
      return () => clearInterval(interval);
    }
  }, [branchId]);

  const fetchStatus = async () => {
    try {
      const res = await fetch(`/api/hq/sync/status/${branchId}`);
      const data = await res.json();
      setStatus(data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching sync status:', error);
      setLoading(false);
    }
  };

  const triggerSync = async (syncType: string) => {
    setSyncing(true);
    try {
      const res = await fetch('/api/hq/sync/trigger', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ branchId, syncType })
      });
      
      if (res.ok) {
        setTimeout(fetchStatus, 2000); // Refresh after 2 seconds
      }
    } catch (error) {
      console.error('Error triggering sync:', error);
    } finally {
      setSyncing(false);
    }
  };

  if (loading) {
    return <div className="animate-pulse h-32 bg-gray-200 rounded"></div>;
  }

  if (!status) {
    return <div className="text-gray-500">No sync data available</div>;
  }

  const getStatusIcon = () => {
    switch (status.branch.syncStatus) {
      case 'synced':
        return <CheckCircle className="text-green-500" />;
      case 'failed':
        return <XCircle className="text-red-500" />;
      case 'pending':
        return <Clock className="text-yellow-500" />;
      default:
        return <RefreshCw className="text-gray-400" />;
    }
  };

  return (
    <div className="bg-white rounded-lg shadow p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Sync Status</h3>
        {getStatusIcon()}
      </div>

      <div className="space-y-2 mb-4">
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">Branch:</span>
          <span className="font-medium">{status.branch.name}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">Last Sync:</span>
          <span className="font-medium">
            {status.branch.lastSyncAt 
              ? new Date(status.branch.lastSyncAt).toLocaleString()
              : 'Never'}
          </span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">Status:</span>
          <span className={`font-medium ${
            status.branch.syncStatus === 'synced' ? 'text-green-600' :
            status.branch.syncStatus === 'failed' ? 'text-red-600' :
            'text-yellow-600'
          }`}>
            {status.branch.syncStatus.toUpperCase()}
          </span>
        </div>
      </div>

      <div className="flex space-x-2">
        <button
          onClick={() => triggerSync('products')}
          disabled={syncing}
          className="flex-1 px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 text-sm"
        >
          {syncing ? 'Syncing...' : 'Sync Products'}
        </button>
        <button
          onClick={() => triggerSync('full')}
          disabled={syncing}
          className="flex-1 px-3 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 text-sm"
        >
          Full Sync
        </button>
      </div>

      {status.recentSyncs.length > 0 && (
        <div className="mt-4 pt-4 border-t">
          <h4 className="text-sm font-medium mb-2">Recent Syncs</h4>
          <div className="space-y-1">
            {status.recentSyncs.slice(0, 3).map((sync) => (
              <div key={sync.id} className="flex justify-between text-xs">
                <span className="text-gray-600">{sync.syncType}</span>
                <span className={
                  sync.status === 'completed' ? 'text-green-600' :
                  sync.status === 'failed' ? 'text-red-600' :
                  'text-yellow-600'
                }>
                  {sync.status} ({sync.itemsSynced} items)
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
```

---

### 5. Update Admin Layout

**File:** `/components/AdminLayout.tsx` or similar

**Add Components to Header:**

```typescript
import TenantSelector from './TenantSelector';
import BranchSelector from './BranchSelector';

export default function AdminLayout({ children }) {
  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold">Admin Dashboard</h1>
          
          <div className="flex items-center space-x-4">
            <TenantSelector />
            <BranchSelector />
          </div>
        </div>
      </header>
      
      <main className="max-w-7xl mx-auto px-4 py-6">
        {children}
      </main>
    </div>
  );
}
```

---

## 📊 API Integration Examples

### Fetch Tenants

```typescript
const fetchTenants = async () => {
  const res = await fetch('/api/hq/tenants?page=1&limit=10');
  const data = await res.json();
  // data.tenants, data.total, data.page, data.totalPages
};
```

### Fetch Branches (Auto-filtered by tenant)

```typescript
const fetchBranches = async (search = '', type = 'all') => {
  const params = new URLSearchParams({
    page: '1',
    limit: '20',
    search,
    type
  });
  
  const res = await fetch(`/api/hq/branches?${params}`);
  const data = await res.json();
  // data.branches, data.total
};
```

### Create Branch

```typescript
const createBranch = async (branchData) => {
  const res = await fetch('/api/hq/branches', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      code: 'BR-001',
      name: 'New Branch',
      type: 'branch',
      address: 'Street Address',
      city: 'City Name',
      province: 'Province',
      phone: '08123456789',
      email: 'branch@example.com',
      managerId: 'user-id'
    })
  });
  
  const data = await res.json();
  // data.branch, data.message
};
```

### Trigger Sync

```typescript
const triggerSync = async (branchId, syncType = 'products') => {
  const res = await fetch('/api/hq/sync/trigger', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ branchId, syncType })
  });
  
  const data = await res.json();
  // data.success, data.results
};
```

---

## 🔐 Authentication Context

**Ensure user session includes tenant info:**

```typescript
// In your auth context or hook
const useAuth = () => {
  const { data: session } = useSession();
  
  return {
    user: session?.user,
    tenantId: session?.user?.tenantId,
    role: session?.user?.role,
    isSuperAdmin: session?.user?.role === 'super_admin',
    isOwner: session?.user?.role === 'owner',
    isManager: session?.user?.role === 'manager'
  };
};
```

---

## 🎨 UI Components Needed

### 1. Tenant Stats Card
- Total users
- Total branches
- Subscription status
- Usage vs limits

### 2. Branch List Table
- Branch code, name, city
- Manager info
- Sync status indicator
- Actions (edit, sync, view)

### 3. Sync Dashboard
- Sync history timeline
- Success/failure rates
- Sync schedule
- Manual sync triggers

### 4. Multi-Branch Analytics
- Consolidated sales across branches
- Branch performance comparison
- Regional analytics
- Top performing branches

---

## 🚦 State Management

**Consider using React Context for tenant/branch state:**

```typescript
// contexts/TenantContext.tsx
import { createContext, useContext, useState } from 'react';

const TenantContext = createContext(null);

export function TenantProvider({ children }) {
  const [currentTenant, setCurrentTenant] = useState(null);
  const [currentBranch, setCurrentBranch] = useState('all');
  
  return (
    <TenantContext.Provider value={{
      currentTenant,
      setCurrentTenant,
      currentBranch,
      setCurrentBranch
    }}>
      {children}
    </TenantContext.Provider>
  );
}

export const useTenant = () => useContext(TenantContext);
```

---

## ✅ Testing Checklist

- [ ] Tenant selector shows correct tenants for super admin
- [ ] Branch selector shows only user's tenant branches
- [ ] Sync widget displays correct status
- [ ] Sync trigger works and updates status
- [ ] Analytics filtered by selected branch
- [ ] Role-based UI elements show/hide correctly
- [ ] Error handling for API failures
- [ ] Loading states for all async operations

---

## 🎯 Priority Components

**Week 1:**
1. ✅ Tenant Selector (for super admin)
2. ✅ Branch Selector (for all users)
3. ✅ Sync Status Widget

**Week 2:**
4. Branch Management Page
5. Tenant Dashboard
6. Multi-Branch Analytics

**Week 3:**
7. Sync History & Monitoring
8. Real-time Updates (WebSocket)
9. Advanced Filters & Search

---

## 📝 Notes

- All API endpoints already have tenant filtering
- Middleware automatically handles authentication
- Sample data available for testing
- Backend supports pagination, search, filters

---

**Ready to integrate! Start with the components above and test with sample data.** 🚀

