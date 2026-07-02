# Customers Module - Integration Testing Guide

## 📋 Overview

Panduan lengkap untuk testing integrasi Customers Module dengan backend API dan database.

---

## 🚀 Setup & Prerequisites

### 1. Database Migration
Jalankan migration untuk membuat/update table customers:

```bash
cd /Users/winnerharry/Documents/bedagang
npx sequelize-cli db:migrate
```

**Expected Output:**
```
== 20260204-update-customers-table: migrating =======
== 20260204-update-customers-table: migrated (0.123s)
```

### 2. Start Development Server
```bash
npm run dev
```

Server harus berjalan di `http://localhost:3001`

---

## 🧪 API Testing

### Test 1: Get Customers List

**Endpoint:** `GET /api/customers/crud`

**Test dengan cURL:**
```bash
curl http://localhost:3001/api/customers/crud?page=1&limit=10
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "customers": [],
    "pagination": {
      "total": 0,
      "page": 1,
      "limit": 10,
      "totalPages": 0
    },
    "stats": {
      "totalCustomers": 0,
      "activeCustomers": 0,
      "vipCustomers": 0,
      "avgLifetimeValue": 0
    }
  }
}
```

---

### Test 2: Create Customer

**Endpoint:** `POST /api/customers/crud`

**Test dengan cURL:**
```bash
curl -X POST http://localhost:3001/api/customers/crud \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Customer",
    "phone": "081234567890",
    "email": "test@example.com",
    "type": "member",
    "membershipLevel": "Silver"
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Customer created successfully",
  "data": {
    "id": "uuid-here",
    "name": "Test Customer",
    "phone": "081234567890",
    "email": "test@example.com",
    "type": "member",
    "status": "active",
    "membershipLevel": "Silver",
    "points": 0,
    "discount": 0,
    "totalPurchases": 0,
    "totalSpent": 0
  }
}
```

---

### Test 3: Get Statistics

**Endpoint:** `GET /api/customers/stats`

**Test dengan cURL:**
```bash
curl http://localhost:3001/api/customers/stats
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "overview": {
      "totalCustomers": 1,
      "activeCustomers": 1,
      "vipCustomers": 0,
      "memberCustomers": 1,
      "newCustomersThisMonth": 1,
      "avgLifetimeValue": 0,
      "avgPurchases": 0,
      "totalRevenue": 0
    },
    "customersByLevel": [
      { "level": "Silver", "count": 1 }
    ],
    "topCustomers": [],
    "recentCustomers": [...]
  }
}
```

---

### Test 4: Update Customer

**Endpoint:** `PUT /api/customers/crud?id={customerId}`

**Test dengan cURL:**
```bash
curl -X PUT "http://localhost:3001/api/customers/crud?id=YOUR_CUSTOMER_ID" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Updated Customer Name",
    "type": "vip",
    "membershipLevel": "Gold"
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Customer updated successfully",
  "data": {
    "id": "uuid-here",
    "name": "Updated Customer Name",
    "type": "vip",
    "membershipLevel": "Gold"
  }
}
```

---

### Test 5: Delete Customer

**Endpoint:** `DELETE /api/customers/crud?id={customerId}`

**Test dengan cURL:**
```bash
curl -X DELETE "http://localhost:3001/api/customers/crud?id=YOUR_CUSTOMER_ID"
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Customer deleted successfully"
}
```

---

## 🌐 Frontend Testing

### Test 1: Access Customers Page

1. Open browser: `http://localhost:3001/customers`
2. Login jika belum login
3. **Expected:** Halaman CRM module terbuka dengan stats cards

### Test 2: View Statistics

**Check:**
- ✅ Total Pelanggan menampilkan angka dari database
- ✅ Pelanggan Aktif menampilkan persentase yang benar
- ✅ Pelanggan VIP menampilkan jumlah yang benar
- ✅ Lifetime Value menampilkan format rupiah

### Test 3: Search Customers

1. Ketik di search box: "test"
2. **Expected:** Table auto-refresh dengan hasil search
3. **Check:** Loading spinner muncul saat fetching

### Test 4: Add New Customer

1. Click button "Tambah Pelanggan"
2. **Expected:** Modal form terbuka
3. Fill form:
   - Nama: "John Doe"
   - Telepon: "081234567891"
   - Email: "john@example.com"
   - Tipe: "Member"
4. Click "Simpan"
5. **Expected:** 
   - Alert "Pelanggan berhasil ditambahkan!"
   - Modal close
   - Table refresh dengan customer baru

### Test 5: Edit Customer

1. Click icon Edit (hijau) pada customer
2. **Expected:** Modal edit terbuka dengan data customer
3. Ubah nama menjadi "John Doe Updated"
4. Click "Update"
5. **Expected:**
   - Alert "Pelanggan berhasil diupdate!"
   - Table refresh dengan data baru

### Test 6: Delete Customer

1. Click icon Delete (merah) pada customer
2. **Expected:** Confirm dialog muncul
3. Click OK
4. **Expected:**
   - Alert "Pelanggan berhasil dihapus!"
   - Customer hilang dari table
   - Stats update

### Test 7: Pagination

1. Tambah lebih dari 10 customers
2. **Expected:** Pagination controls muncul di bawah table
3. Click "Next"
4. **Expected:** Table menampilkan page 2
5. Click "Previous"
6. **Expected:** Kembali ke page 1

---

## 🔍 Database Verification

### Check Table Structure

```sql
DESCRIBE customers;
```

**Expected Columns:**
- id (UUID)
- name (VARCHAR)
- phone (VARCHAR)
- email (VARCHAR)
- address (TEXT)
- city, province, postalCode
- type (ENUM)
- status (ENUM)
- membershipLevel (ENUM)
- points, discount
- totalPurchases, totalSpent
- lastVisit, birthDate, gender
- notes, isActive
- createdAt, updatedAt

### Check Indexes

```sql
SHOW INDEX FROM customers;
```

**Expected Indexes:**
- PRIMARY (id)
- phone
- email
- type
- status
- membershipLevel

### Check Data

```sql
SELECT * FROM customers LIMIT 10;
```

---

## ✅ Integration Checklist

### Backend API
- [ ] GET /api/customers/crud - List customers
- [ ] POST /api/customers/crud - Create customer
- [ ] PUT /api/customers/crud?id=xxx - Update customer
- [ ] DELETE /api/customers/crud?id=xxx - Delete customer
- [ ] GET /api/customers/stats - Get statistics
- [ ] GET /api/customers/[id] - Get customer detail

### Database
- [ ] Table customers exists
- [ ] All columns present
- [ ] Indexes created
- [ ] ENUM values correct
- [ ] Default values working

### Frontend
- [ ] Page loads without errors
- [ ] Stats display real data
- [ ] Search functionality works
- [ ] Add customer modal works
- [ ] Edit customer modal works
- [ ] Delete customer works
- [ ] Pagination works
- [ ] Loading states show
- [ ] Error handling works

### Data Flow
- [ ] Frontend → API → Database (Create)
- [ ] Database → API → Frontend (Read)
- [ ] Frontend → API → Database (Update)
- [ ] Frontend → API → Database (Delete)
- [ ] Stats auto-update after changes

---

## 🐛 Common Issues & Solutions

### Issue 1: "Unauthorized" Error
**Cause:** No active session  
**Solution:** Login terlebih dahulu di `/auth/login`

### Issue 2: "Phone number already exists"
**Cause:** Duplicate phone number  
**Solution:** Gunakan nomor telepon yang berbeda

### Issue 3: Table doesn't exist
**Cause:** Migration belum dijalankan  
**Solution:** Run `npx sequelize-cli db:migrate`

### Issue 4: Stats showing 0
**Cause:** Belum ada data di database  
**Solution:** Tambah beberapa customers terlebih dahulu

### Issue 5: Loading forever
**Cause:** API endpoint error atau database connection issue  
**Solution:** 
1. Check console browser untuk error
2. Check terminal server untuk error log
3. Verify database connection

---

## 📊 Performance Testing

### Load Test - 100 Customers

```bash
# Create 100 test customers
for i in {1..100}; do
  curl -X POST http://localhost:3001/api/customers/crud \
    -H "Content-Type: application/json" \
    -d "{\"name\":\"Customer $i\",\"phone\":\"0812345678$i\",\"email\":\"customer$i@test.com\",\"type\":\"member\"}"
  sleep 0.1
done
```

**Expected:**
- All requests succeed
- No timeout errors
- Stats update correctly
- Pagination works smoothly

### Search Performance

```bash
# Test search with 100 customers
curl "http://localhost:3001/api/customers/crud?search=Customer&limit=10"
```

**Expected:**
- Response time < 500ms
- Correct results returned
- Pagination accurate

---

## 🎯 Success Criteria

✅ **All API endpoints return correct responses**  
✅ **Database schema matches model definition**  
✅ **Frontend displays real-time data**  
✅ **CRUD operations work without errors**  
✅ **Statistics calculate correctly**  
✅ **Search and pagination function properly**  
✅ **Error handling works as expected**  
✅ **No console errors in browser**  
✅ **No server errors in terminal**  

---

## 📝 Test Report Template

```
Date: [Date]
Tester: [Name]
Environment: Development

API Tests:
- GET customers: [PASS/FAIL]
- POST customer: [PASS/FAIL]
- PUT customer: [PASS/FAIL]
- DELETE customer: [PASS/FAIL]
- GET stats: [PASS/FAIL]

Frontend Tests:
- Page load: [PASS/FAIL]
- Stats display: [PASS/FAIL]
- Search: [PASS/FAIL]
- Add customer: [PASS/FAIL]
- Edit customer: [PASS/FAIL]
- Delete customer: [PASS/FAIL]
- Pagination: [PASS/FAIL]

Database Tests:
- Table structure: [PASS/FAIL]
- Indexes: [PASS/FAIL]
- Data integrity: [PASS/FAIL]

Issues Found:
1. [Issue description]
2. [Issue description]

Overall Status: [PASS/FAIL]
```

---

## 🚀 Next Steps After Testing

1. **If all tests pass:**
   - Deploy to staging environment
   - Perform UAT (User Acceptance Testing)
   - Document any edge cases found

2. **If tests fail:**
   - Review error logs
   - Fix issues
   - Re-run tests
   - Update documentation

3. **Performance optimization:**
   - Add database indexes if needed
   - Implement caching for stats
   - Optimize queries

4. **Security audit:**
   - Verify authentication on all endpoints
   - Check SQL injection prevention
   - Test XSS prevention

---

**Last Updated:** February 4, 2026  
**Version:** 1.0.0  
**Status:** Ready for Testing
