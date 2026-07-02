# Inventory Master - Testing Guide

## 🧪 Panduan Testing untuk Inventory Master Data

### Prerequisites
- ✅ Development server running (`npm run dev`)
- ✅ Database sudah di-migrate
- ✅ User sudah login

---

## 📋 Test Scenarios

### 1. Database Migration Test

**Objective:** Memastikan semua tabel berhasil dibuat

**Steps:**
```bash
# 1. Connect to database
psql -U postgres -d bedagang

# 2. Check tables
\dt

# Expected: Harus ada 8 tabel baru:
# - categories
# - suppliers
# - units
# - brands
# - warehouses
# - storage_locations
# - manufacturers
# - tags
# - product_tags

# 3. Check default data
SELECT COUNT(*) FROM categories;  -- Expected: 10
SELECT COUNT(*) FROM units;       -- Expected: 15
SELECT COUNT(*) FROM warehouses;  -- Expected: 3
SELECT COUNT(*) FROM tags;        -- Expected: 10
```

**Expected Result:**
- ✅ Semua tabel ada
- ✅ Default data terinsert
- ✅ Foreign keys berfungsi

---

### 2. API Endpoints Test

#### Test 1: Summary API
```bash
# GET Summary
curl http://localhost:3001/api/inventory/master/summary \
  -H "Cookie: next-auth.session-token=YOUR_TOKEN"

# Expected Response:
{
  "success": true,
  "data": {
    "categories": 10,
    "suppliers": 0,
    "units": 15,
    "brands": 0,
    "warehouses": 3,
    "locations": 0,
    "manufacturers": 0,
    "tags": 10,
    "recentActivities": []
  }
}
```

#### Test 2: Categories API

**GET - Fetch Categories**
```bash
curl http://localhost:3001/api/inventory/master/categories \
  -H "Cookie: next-auth.session-token=YOUR_TOKEN"

# Expected: Array of 10 categories
```

**POST - Create Category**
```bash
curl -X POST http://localhost:3001/api/inventory/master/categories \
  -H "Content-Type: application/json" \
  -H "Cookie: next-auth.session-token=YOUR_TOKEN" \
  -d '{
    "name": "Test Category",
    "description": "Testing category creation",
    "icon": "FaBox",
    "color": "blue"
  }'

# Expected: 
{
  "success": true,
  "message": "Category created successfully",
  "data": { ... }
}
```

**PUT - Update Category**
```bash
curl -X PUT http://localhost:3001/api/inventory/master/categories \
  -H "Content-Type: application/json" \
  -H "Cookie: next-auth.session-token=YOUR_TOKEN" \
  -d '{
    "id": 1,
    "name": "Updated Category Name"
  }'

# Expected: Success message
```

**DELETE - Delete Category**
```bash
curl -X DELETE "http://localhost:3001/api/inventory/master/categories?id=11" \
  -H "Cookie: next-auth.session-token=YOUR_TOKEN"

# Expected: Success message
```

#### Test 3: Suppliers API

**POST - Create Supplier**
```bash
curl -X POST http://localhost:3001/api/inventory/master/suppliers \
  -H "Content-Type: application/json" \
  -H "Cookie: next-auth.session-token=YOUR_TOKEN" \
  -d '{
    "code": "SUP001",
    "name": "PT Test Supplier",
    "contact_person": "John Doe",
    "email": "john@test.com",
    "phone": "021-1234567",
    "address": "Jl. Test No. 123",
    "city": "Jakarta",
    "province": "DKI Jakarta",
    "payment_terms": "Net 30",
    "credit_limit": 10000000
  }'
```

#### Test 4: Units API

**POST - Create Unit**
```bash
curl -X POST http://localhost:3001/api/inventory/master/units \
  -H "Content-Type: application/json" \
  -H "Cookie: next-auth.session-token=YOUR_TOKEN" \
  -d '{
    "code": "PACK",
    "name": "Pack",
    "description": "Satuan per pack",
    "base_unit_id": 1,
    "conversion_factor": 6
  }'
```

---

### 3. Frontend Integration Test

#### Test 1: Master Page Load
**Steps:**
1. Buka browser: `http://localhost:3001/inventory/master`
2. Login jika belum
3. Tunggu page load

**Expected Result:**
- ✅ Page load tanpa error
- ✅ Header menampilkan "Master Data Inventory"
- ✅ Total count di header menampilkan angka (bukan 0)
- ✅ 8 cards master data tampil
- ✅ Setiap card menampilkan badge count
- ✅ Badge count sesuai dengan data di database

#### Test 2: Real-time Data Display
**Steps:**
1. Buka browser console (F12)
2. Lihat Network tab
3. Refresh page (Ctrl+R)

**Expected Result:**
- ✅ API call ke `/api/inventory/master/summary`
- ✅ Response 200 OK
- ✅ Data ditampilkan di UI
- ✅ Badge counts update

#### Test 3: Refresh Button
**Steps:**
1. Klik tombol "Refresh" di header
2. Perhatikan loading state

**Expected Result:**
- ✅ Data refresh
- ✅ Toast notification muncul (optional)
- ✅ Counts update jika ada perubahan

#### Test 4: Auto-refresh
**Steps:**
1. Buka page dan tunggu 30 detik
2. Perhatikan Network tab

**Expected Result:**
- ✅ API call otomatis setiap 30 detik
- ✅ Data update otomatis
- ✅ Tidak ada error di console

---

### 4. React Hooks Test

#### Test 1: useMasterSummary Hook
**Code:**
```typescript
import { useMasterSummary } from '@/hooks/useInventoryMaster';

function TestComponent() {
  const { summary, isLoading, isError, refresh } = useMasterSummary();
  
  console.log('Summary:', summary);
  console.log('Loading:', isLoading);
  console.log('Error:', isError);
  
  return <div>Check console</div>;
}
```

**Expected:**
- ✅ summary berisi data object
- ✅ isLoading = false setelah load
- ✅ isError = false jika tidak ada error

#### Test 2: useCategories Hook
**Code:**
```typescript
import { useCategories } from '@/hooks/useInventoryMaster';

function TestComponent() {
  const { categories, count, isLoading } = useCategories();
  
  console.log('Categories:', categories);
  console.log('Count:', count);
  
  return <div>{count} categories</div>;
}
```

**Expected:**
- ✅ categories berisi array
- ✅ count = jumlah categories
- ✅ Data sesuai dengan database

#### Test 3: useMasterCRUD Hook
**Code:**
```typescript
import { useMasterCRUD } from '@/hooks/useInventoryMaster';

function TestComponent() {
  const { create, update, remove, loading } = useMasterCRUD('categories');
  
  const handleCreate = async () => {
    await create({
      name: "Test Category",
      description: "Test"
    });
  };
  
  return <button onClick={handleCreate}>Create</button>;
}
```

**Expected:**
- ✅ create() berhasil membuat data
- ✅ Toast notification muncul
- ✅ Data tersimpan di database

---

### 5. Error Handling Test

#### Test 1: Unauthorized Access
**Steps:**
1. Logout dari aplikasi
2. Akses: `http://localhost:3001/api/inventory/master/summary`

**Expected:**
- ✅ Response 401 Unauthorized
- ✅ Error message: "Unauthorized"

#### Test 2: Invalid Data
**Steps:**
1. POST category tanpa name
```bash
curl -X POST http://localhost:3001/api/inventory/master/categories \
  -H "Content-Type: application/json" \
  -H "Cookie: next-auth.session-token=YOUR_TOKEN" \
  -d '{
    "description": "No name field"
  }'
```

**Expected:**
- ✅ Response 400 Bad Request
- ✅ Error message jelas

#### Test 3: Delete with Dependencies
**Steps:**
1. Coba delete category yang punya subcategories

**Expected:**
- ✅ Response 400 Bad Request
- ✅ Error: "Cannot delete category with subcategories"

---

### 6. Performance Test

#### Test 1: Page Load Time
**Steps:**
1. Buka Chrome DevTools
2. Network tab → Disable cache
3. Refresh page
4. Lihat load time

**Expected:**
- ✅ Page load < 2 seconds
- ✅ API response < 500ms
- ✅ No memory leaks

#### Test 2: Multiple Concurrent Requests
**Steps:**
1. Buka multiple tabs dengan master page
2. Refresh semua tabs bersamaan

**Expected:**
- ✅ Semua requests berhasil
- ✅ No race conditions
- ✅ Data konsisten

---

## ✅ Testing Checklist

### Database
- [ ] Tables created successfully
- [ ] Default data inserted correctly
- [ ] Foreign keys working
- [ ] Indexes created
- [ ] Constraints enforced

### API Endpoints
- [ ] Summary API returns correct data
- [ ] Categories CRUD works
- [ ] Suppliers CRUD works
- [ ] Units CRUD works
- [ ] Brands CRUD works
- [ ] Warehouses CRUD works
- [ ] Tags CRUD works
- [ ] Authentication enforced
- [ ] Error handling proper
- [ ] Response format consistent

### React Hooks
- [ ] useMasterSummary fetches data
- [ ] useCategories fetches data
- [ ] useSuppliers fetches data
- [ ] useUnits fetches data
- [ ] useBrands fetches data
- [ ] useWarehouses fetches data
- [ ] useTags fetches data
- [ ] useMasterCRUD create works
- [ ] useMasterCRUD update works
- [ ] useMasterCRUD delete works
- [ ] SWR caching works
- [ ] Auto-refresh works
- [ ] Manual refresh works

### Frontend
- [ ] Page loads without errors
- [ ] Real counts displayed
- [ ] Refresh button works
- [ ] Cards clickable
- [ ] Loading states show
- [ ] Error states handled
- [ ] Toast notifications work
- [ ] Responsive design works
- [ ] No console errors
- [ ] No memory leaks

### Integration
- [ ] Frontend → API → Database flow works
- [ ] Data consistency maintained
- [ ] Real-time updates work
- [ ] Error propagation correct
- [ ] Loading states synchronized

---

## 🐛 Common Issues & Solutions

### Issue 1: "Unauthorized" Error
**Problem:** API returns 401
**Solution:** 
- Pastikan sudah login
- Check session token di cookies
- Restart dev server

### Issue 2: Badge Count Shows 0
**Problem:** Semua badge menampilkan 0
**Solution:**
- Check database connection
- Run migration script
- Check API response di Network tab
- Verify summary API returns data

### Issue 3: Auto-refresh Not Working
**Problem:** Data tidak update otomatis
**Solution:**
- Check SWR configuration
- Verify refreshInterval setting (30000ms)
- Check browser console for errors

### Issue 4: Toast Notifications Not Showing
**Problem:** No feedback after CRUD operations
**Solution:**
- Import react-hot-toast
- Add Toaster component to layout
- Check toast configuration

---

## 📊 Test Results Template

```markdown
## Test Results - [Date]

### Database Tests
- [x] Tables created: PASS
- [x] Default data: PASS
- [x] Foreign keys: PASS

### API Tests
- [x] Summary API: PASS
- [x] Categories CRUD: PASS
- [x] Suppliers CRUD: PASS
- [x] Units CRUD: PASS
- [x] Brands CRUD: PASS
- [x] Warehouses CRUD: PASS
- [x] Tags CRUD: PASS

### Frontend Tests
- [x] Page load: PASS
- [x] Real-time data: PASS
- [x] Refresh button: PASS
- [x] Auto-refresh: PASS

### Performance
- Page load time: 1.2s
- API response time: 250ms
- Memory usage: Normal

### Issues Found
- None

### Recommendations
- All tests passed
- Ready for production
```

---

**Last Updated:** February 11, 2026  
**Version:** 1.0.0
