# 🎯 PHASE 5: FRONTEND INTEGRATION GUIDE

**Date:** 2026-02-26  
**Status:** ✅ **IN PROGRESS**  
**Objective:** Integrate new APIs and CRUD modals into existing frontend pages

---

## 📋 INTEGRATION CHECKLIST

### **1. Finance Module Integration**

#### **A. New Transaction Management Page**
- ✅ **Created:** `/pages/hq/finance/transactions.tsx`
- ✅ **Features:**
  - Full CRUD operations with TransactionFormModal
  - Real-time stats (Income, Expense, Transfer, Net Cash Flow)
  - Advanced filters (search, type, status, branch, date range)
  - Pagination support
  - CSV export functionality
  - Loading states
  - Error handling

#### **B. Update Existing Finance Pages**
- ⏸️ `/pages/hq/finance/index.tsx` - Already using `/api/hq/finance/summary`
- ⏸️ `/pages/hq/finance/expenses.tsx` - Update to use Transaction API
- ⏸️ `/pages/hq/finance/revenue.tsx` - Update to use Transaction API
- ⏸️ `/pages/hq/finance/invoices.tsx` - Update to use Invoice API

### **2. Inventory Module Integration**

#### **A. Update Product Management Pages**
- ⏸️ `/pages/hq/inventory/stock.tsx` - Integrate Product API
- ⏸️ `/pages/hq/inventory/index.tsx` - Update to use Product API
- ⏸️ Create `/pages/hq/inventory/products.tsx` - New product management page

#### **B. Features to Implement**
- Product CRUD with ProductFormModal
- Stock levels display
- Low stock alerts
- Barcode scanning integration
- Category management

### **3. HRIS Module Integration**

#### **A. Update Employee Pages**
- ⏸️ `/pages/hq/hris/index.tsx` - Already using `/api/hq/hris/employees`
- ⏸️ Create Employee CRUD modal
- ⏸️ Update to use new Employee model

---

## 🚀 QUICK START GUIDE

### **Using Transaction Management Page**

1. **Navigate to:** `http://localhost:3001/hq/finance/transactions`

2. **Create New Transaction:**
   ```tsx
   // Click "New Transaction" button
   // Fill in the form:
   - Transaction Date
   - Type (Income/Expense/Transfer)
   - Category (auto-populated based on type)
   - Branch (optional)
   - Account (required)
   - Amount
   - Payment Method
   - Description
   ```

3. **Filter Transactions:**
   ```tsx
   // Use filters:
   - Search by number or description
   - Filter by type (income/expense/transfer)
   - Filter by status (draft/pending/completed)
   - Filter by branch
   - Date range selection
   ```

4. **Export Data:**
   ```tsx
   // Click "Export CSV" button
   // Downloads: transactions-YYYY-MM-DD.csv
   ```

### **API Integration Pattern**

```tsx
// Example: Fetch transactions
const fetchTransactions = async () => {
  const params = new URLSearchParams({
    search: searchTerm,
    type: typeFilter,
    status: statusFilter,
    branchId: branchFilter,
    startDate: dateRange.startDate,
    endDate: dateRange.endDate,
    limit: '50',
    offset: '0'
  });

  const response = await fetch(`/api/hq/finance/transactions?${params}`);
  const data = await response.json();
  
  if (response.ok) {
    setTransactions(data.transactions);
    setPagination({ total: data.total, limit: 50, offset: 0 });
  }
};

// Example: Create transaction
const handleCreate = async (formData) => {
  const response = await fetch('/api/hq/finance/transactions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ...formData,
      tenantId: session.user.tenantId,
      createdBy: session.user.id
    })
  });
  
  if (response.ok) {
    fetchTransactions(); // Refresh list
  }
};
```

---

## 📝 INTEGRATION STEPS

### **Step 1: Import Required Components**

```tsx
import TransactionFormModal from '@/components/hq/finance/TransactionFormModal';
import ProductFormModal from '@/components/hq/inventory/ProductFormModal';
```

### **Step 2: Set Up State Management**

```tsx
const [showModal, setShowModal] = useState(false);
const [selectedItem, setSelectedItem] = useState(null);
const [items, setItems] = useState([]);
const [loading, setLoading] = useState(true);
```

### **Step 3: Implement Fetch Function**

```tsx
const fetchData = async () => {
  setLoading(true);
  try {
    const response = await fetch('/api/your-endpoint');
    const data = await response.json();
    if (response.ok) {
      setItems(data.items);
    }
  } catch (error) {
    console.error('Error:', error);
  } finally {
    setLoading(false);
  }
};

useEffect(() => {
  fetchData();
}, []);
```

### **Step 4: Implement CRUD Handlers**

```tsx
const handleCreate = async (data) => {
  const response = await fetch('/api/your-endpoint', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  
  if (response.ok) {
    setShowModal(false);
    fetchData();
  }
};

const handleUpdate = async (data) => {
  const response = await fetch(`/api/your-endpoint?id=${selectedItem.id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  
  if (response.ok) {
    setShowModal(false);
    setSelectedItem(null);
    fetchData();
  }
};

const handleDelete = async (id) => {
  if (!confirm('Are you sure?')) return;
  
  const response = await fetch(`/api/your-endpoint?id=${id}`, {
    method: 'DELETE'
  });
  
  if (response.ok) {
    fetchData();
  }
};
```

### **Step 5: Render Modal**

```tsx
<TransactionFormModal
  isOpen={showModal}
  onClose={() => {
    setShowModal(false);
    setSelectedItem(null);
  }}
  onSubmit={selectedItem ? handleUpdate : handleCreate}
  transaction={selectedItem}
  branches={branches}
  accounts={accounts}
/>
```

---

## 🎨 UI PATTERNS

### **Stats Cards**

```tsx
<div className="grid grid-cols-1 md:grid-cols-4 gap-6">
  <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-6 text-white shadow-lg">
    <div className="flex items-center justify-between">
      <div>
        <p className="text-green-100 text-sm">Total Income</p>
        <p className="text-2xl font-bold mt-1">{formatCurrency(stats.totalIncome)}</p>
      </div>
      <TrendingUp className="w-12 h-12 text-green-200" />
    </div>
  </div>
</div>
```

### **Filter Section**

```tsx
<div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
  <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
    <div className="md:col-span-2">
      <label className="block text-sm font-medium text-gray-700 mb-2">
        <Search className="w-4 h-4 inline mr-1" />
        Search
      </label>
      <input
        type="text"
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        placeholder="Search..."
        className="w-full px-4 py-2 border border-gray-300 rounded-lg"
      />
    </div>
  </div>
</div>
```

### **Data Table**

```tsx
<div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
  <table className="w-full">
    <thead className="bg-gray-50 border-b border-gray-200">
      <tr>
        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
          Column
        </th>
      </tr>
    </thead>
    <tbody className="bg-white divide-y divide-gray-200">
      {loading ? (
        <tr>
          <td colSpan={8} className="px-6 py-12 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          </td>
        </tr>
      ) : items.length === 0 ? (
        <tr>
          <td colSpan={8} className="px-6 py-12 text-center text-gray-500">
            No data found
          </td>
        </tr>
      ) : (
        items.map(item => (
          <tr key={item.id} className="hover:bg-gray-50">
            <td className="px-6 py-4">{item.name}</td>
          </tr>
        ))
      )}
    </tbody>
  </table>
</div>
```

---

## 🔧 UTILITY FUNCTIONS

### **Currency Formatter**

```tsx
const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0
  }).format(amount);
};
```

### **Date Formatter**

```tsx
const formatDate = (date: string) => {
  return new Date(date).toLocaleDateString('id-ID', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
};
```

### **Status Badge**

```tsx
const getStatusColor = (status: string) => {
  switch (status) {
    case 'completed': return 'text-green-600 bg-green-50';
    case 'pending': return 'text-yellow-600 bg-yellow-50';
    case 'draft': return 'text-gray-600 bg-gray-50';
    case 'cancelled': return 'text-red-600 bg-red-50';
    default: return 'text-gray-600 bg-gray-50';
  }
};
```

---

## ⚠️ COMMON ISSUES & SOLUTIONS

### **Issue 1: Import Path Errors**

```tsx
// ❌ Wrong
import HQLayout from '../../../components/layouts/HQLayout';

// ✅ Correct
import HQLayout from '../../../components/hq/HQLayout';
```

### **Issue 2: Missing Session Data**

```tsx
// Add session management
import { useSession } from 'next-auth/react';

const { data: session } = useSession();

// Use in API calls
body: JSON.stringify({
  ...data,
  tenantId: session?.user?.tenantId || 'default-tenant',
  createdBy: session?.user?.id || 'current-user'
})
```

### **Issue 3: CORS Errors**

```tsx
// Ensure API routes are in /pages/api/
// Next.js handles CORS automatically for API routes
```

### **Issue 4: State Not Updating**

```tsx
// Always use functional updates
setItems(prev => [...prev, newItem]);

// Not
setItems([...items, newItem]); // May use stale state
```

---

## 📊 TESTING CHECKLIST

### **Before Deployment:**

- [ ] All API endpoints return correct data
- [ ] CRUD operations work (Create, Read, Update, Delete)
- [ ] Filters and search work correctly
- [ ] Pagination works
- [ ] Export functionality works
- [ ] Loading states display correctly
- [ ] Error messages display correctly
- [ ] Modal opens and closes properly
- [ ] Form validation works
- [ ] Data refreshes after CRUD operations
- [ ] Responsive design works on mobile
- [ ] No console errors
- [ ] No TypeScript errors

---

## 🎯 NEXT ACTIONS

### **Immediate:**
1. ✅ Created Transaction Management page
2. ⏸️ Test Transaction page end-to-end
3. ⏸️ Create Product Management page
4. ⏸️ Update Inventory index page
5. ⏸️ Create Employee CRUD modal

### **Short Term:**
6. Update all Finance sub-pages
7. Update all Inventory sub-pages
8. Update all HRIS sub-pages
9. Add real-time notifications
10. Add bulk operations

### **Medium Term:**
11. Add advanced analytics
12. Add export to Excel/PDF
13. Add import from CSV
14. Add audit logging
15. Add user permissions

---

## 📚 DOCUMENTATION LINKS

- **API Documentation:** See `INTEGRATION_PHASE_4_COMPLETE.md`
- **Database Models:** See `IMPLEMENTATION_COMPLETE_SUMMARY.md`
- **Component Usage:** See modal component files

---

## ✅ SUCCESS CRITERIA

**Phase 5 Complete When:**
- ✅ Transaction management page working
- ⏸️ Product management page working
- ⏸️ All CRUD modals integrated
- ⏸️ All filters working
- ⏸️ Export functionality working
- ⏸️ No mock data in production code
- ⏸️ All pages tested
- ⏸️ Documentation complete

---

**Generated:** 2026-02-26  
**Status:** 🚧 **IN PROGRESS - 25% COMPLETE**

