# Loyalty Program - Integration Testing & Verification

## 📋 Overview

Panduan lengkap untuk memverifikasi integrasi antara backend dan frontend Loyalty Program, termasuk testing API endpoints, database connectivity, dan fungsi CRUD.

---

## ✅ Checklist Integrasi

### **Backend Components:**
- [x] Sequelize Models (LoyaltyTier, LoyaltyReward, LoyaltyProgram)
- [x] Database Migration (20260204-create-loyalty-tables.js)
- [x] API Endpoints (dashboard, tiers/crud, rewards/crud, members/crud)
- [x] Helper Functions (tier-sync.ts)
- [x] Auto-sync after checkout

### **Frontend Components:**
- [x] Loyalty Program Page (/pages/loyalty-program.tsx)
- [x] State Management (useState, useEffect)
- [x] API Integration (fetch calls)
- [x] Modal Forms (Add/Edit Tier, Add/Edit Reward)
- [x] CRUD Handlers (Create, Read, Update, Delete)
- [x] Loading States & Error Handling

### **Integration Points:**
- [x] Customer Type → Loyalty Tier
- [x] Checkout → Auto Tier Upgrade
- [x] Points Calculation → Tier Multiplier
- [x] Discount Application → Tier Discount

---

## 🗄️ Database Setup

### **1. Run Migration**

```bash
cd /Users/winnerharry/Documents/bedagang
npx sequelize-cli db:migrate
```

**Expected Output:**
```
== 20260204-create-loyalty-tables: migrating =======
== 20260204-create-loyalty-tables: migrated (0.234s)
```

### **2. Verify Tables Created**

```sql
SHOW TABLES LIKE 'loyalty%';
```

**Expected Result:**
```
loyalty_programs
loyalty_tiers
loyalty_rewards
```

### **3. Verify Default Data**

```sql
-- Check default program
SELECT * FROM loyalty_programs;

-- Check default tiers
SELECT tierName, tierLevel, minSpending, pointMultiplier, discountPercentage 
FROM loyalty_tiers 
ORDER BY tierLevel;

-- Check default rewards
SELECT rewardName, pointsCost, rewardType, stockQuantity 
FROM loyalty_rewards;
```

**Expected:**
- 1 default program: "BEDAGANG Loyalty Program"
- 4 default tiers: Bronze, Silver, Gold, Platinum
- 4 default rewards: Voucher 50k, 100k, Free Sample, Merchandise

---

## 🌐 API Endpoints Testing

### **Test 1: Dashboard API**

**Endpoint:** `GET /api/loyalty/dashboard`

```bash
curl http://localhost:3001/api/loyalty/dashboard
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "stats": {
      "totalMembers": 0,
      "pointsRedeemedThisMonth": 0,
      "rewardsClaimed": 0,
      "engagementRate": 0
    },
    "tiers": [
      {
        "id": "uuid",
        "name": "Bronze",
        "minPoints": 0,
        "benefits": ["Diskon 5%", "Poin 1x"],
        "members": 0,
        "color": "bg-orange-600",
        "pointMultiplier": 1.0,
        "discountPercentage": 5
      }
    ],
    "topMembers": []
  }
}
```

**Status:** ✅ Should return 200 OK

---

### **Test 2: Get Tiers**

**Endpoint:** `GET /api/loyalty/tiers/crud`

```bash
curl http://localhost:3001/api/loyalty/tiers/crud
```

**Expected Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "name": "Bronze",
      "level": 1,
      "minSpending": 0,
      "pointMultiplier": 1.0,
      "discountPercentage": 5,
      "benefits": ["Diskon 5%", "Poin 1x"],
      "color": "bg-orange-600",
      "members": 0,
      "isActive": true
    }
  ]
}
```

**Status:** ✅ Should return 200 OK with 4 tiers

---

### **Test 3: Create Tier**

**Endpoint:** `POST /api/loyalty/tiers/crud`

```bash
curl -X POST http://localhost:3001/api/loyalty/tiers/crud \
  -H "Content-Type: application/json" \
  -d '{
    "tierName": "Diamond",
    "tierLevel": 5,
    "minSpending": 50000000,
    "pointMultiplier": 5.0,
    "discountPercentage": 30,
    "benefits": ["Diskon 30%", "Poin 5x", "VIP Access"],
    "color": "bg-blue-600"
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Tier created successfully",
  "data": { ... }
}
```

**Status:** ✅ Should return 201 Created

---

### **Test 4: Update Tier**

**Endpoint:** `PUT /api/loyalty/tiers/crud?id={tierId}`

```bash
curl -X PUT "http://localhost:3001/api/loyalty/tiers/crud?id=YOUR_TIER_ID" \
  -H "Content-Type: application/json" \
  -d '{
    "tierName": "Diamond Updated",
    "pointMultiplier": 6.0
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Tier updated successfully",
  "data": { ... }
}
```

**Status:** ✅ Should return 200 OK

---

### **Test 5: Delete Tier**

**Endpoint:** `DELETE /api/loyalty/tiers/crud?id={tierId}`

```bash
curl -X DELETE "http://localhost:3001/api/loyalty/tiers/crud?id=YOUR_TIER_ID"
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Tier deleted successfully"
}
```

**Status:** ✅ Should return 200 OK

---

### **Test 6: Get Rewards**

**Endpoint:** `GET /api/loyalty/rewards/crud`

```bash
curl http://localhost:3001/api/loyalty/rewards/crud
```

**Expected Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "name": "Voucher Rp 50.000",
      "description": "Voucher belanja senilai Rp 50.000",
      "points": 500,
      "stock": 100,
      "claimed": 0,
      "type": "voucher",
      "value": 50000,
      "isActive": true
    }
  ]
}
```

**Status:** ✅ Should return 200 OK with 4 rewards

---

### **Test 7: Create Reward**

**Endpoint:** `POST /api/loyalty/rewards/crud`

```bash
curl -X POST http://localhost:3001/api/loyalty/rewards/crud \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Voucher Rp 500.000",
    "description": "Voucher belanja senilai Rp 500.000",
    "points": 5000,
    "stock": 25,
    "type": "voucher",
    "value": 500000
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Reward created successfully",
  "data": { ... }
}
```

**Status:** ✅ Should return 201 Created

---

### **Test 8: Customer Tier Sync**

**Endpoint:** `POST /api/customers/sync-tier`

```bash
curl -X POST http://localhost:3001/api/customers/sync-tier \
  -H "Content-Type: application/json" \
  -d '{"customerId": "YOUR_CUSTOMER_ID"}'
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Tier upgraded successfully",
  "data": {
    "customerId": "uuid",
    "customerName": "Ahmad Rizki",
    "oldTier": "Bronze",
    "newTier": "Silver",
    "totalSpent": 1500000,
    "discount": 10,
    "tierChanged": true
  }
}
```

**Status:** ✅ Should return 200 OK

---

## 🎨 Frontend Testing

### **Test 1: Page Load**

1. Start server: `npm run dev`
2. Open browser: `http://localhost:3001/loyalty-program`
3. Login jika belum login

**Expected:**
- ✅ Page loads without errors
- ✅ Dashboard statistics displayed
- ✅ Tabs visible (Overview, Tier, Rewards, Members)
- ✅ No console errors

---

### **Test 2: Dashboard Overview**

**Check:**
- ✅ Stats cards menampilkan data dari API
- ✅ Tier distribution chart muncul
- ✅ Top 5 members list (kosong jika belum ada data)
- ✅ Loading spinner saat fetch data

---

### **Test 3: Tiers Tab**

**Check:**
- ✅ Click tab "Tier"
- ✅ 4 tier cards muncul (Bronze, Silver, Gold, Platinum)
- ✅ Each card shows: name, spending range, benefits, member count
- ✅ Edit and Delete buttons visible

---

### **Test 4: Add Tier**

1. Click "Tambah Tier"
2. **Modal muncul dengan form**
3. Fill form:
   - Nama Tier: "Diamond"
   - Level Tier: 5
   - Minimum Spending: 50000000
   - Point Multiplier: 5.0
   - Discount: 30
   - Benefits: "Diskon 30%", "Poin 5x"
   - Color: Blue
4. Click "Simpan"

**Expected:**
- ✅ Alert "Tier berhasil ditambahkan!"
- ✅ Modal closes
- ✅ Tier list refreshes
- ✅ New tier card appears

---

### **Test 5: Edit Tier**

1. Click Edit icon on a tier card
2. **Modal muncul dengan data tier**
3. Change Point Multiplier to 6.0
4. Click "Update"

**Expected:**
- ✅ Alert "Tier berhasil diupdate!"
- ✅ Modal closes
- ✅ Tier card updates with new data

---

### **Test 6: Delete Tier**

1. Click Delete icon on a tier card
2. **Confirmation dialog muncul**
3. Click OK

**Expected:**
- ✅ Alert "Tier berhasil dihapus!"
- ✅ Tier card disappears
- ✅ If tier has members, error message shown

---

### **Test 7: Rewards Tab**

**Check:**
- ✅ Click tab "Rewards"
- ✅ Table with rewards displayed
- ✅ Columns: Name, Type, Points, Stock, Claimed, Status, Actions
- ✅ Progress bar for claimed/stock ratio

---

### **Test 8: Add Reward**

1. Click "Tambah Reward"
2. **Modal muncul dengan form**
3. Fill form:
   - Nama: "Voucher Rp 500.000"
   - Deskripsi: "Voucher belanja senilai Rp 500.000"
   - Tipe: Voucher
   - Poin: 5000
   - Stok: 25
   - Nilai: 500000
4. Click "Simpan"

**Expected:**
- ✅ Alert "Reward berhasil ditambahkan!"
- ✅ Modal closes
- ✅ Table refreshes
- ✅ New reward row appears

---

### **Test 9: Edit Reward**

1. Click Edit icon on a reward row
2. **Modal muncul dengan data reward**
3. Change Stock to 50
4. Click "Update"

**Expected:**
- ✅ Alert "Reward berhasil diupdate!"
- ✅ Modal closes
- ✅ Table updates with new stock

---

### **Test 10: Delete Reward**

1. Click Delete icon on a reward row
2. **Confirmation dialog muncul**
3. Click OK

**Expected:**
- ✅ Alert "Reward berhasil dihapus!"
- ✅ Reward row disappears

---

## 🔗 Integration Testing

### **Test 1: Customer Type → Tier Integration**

1. Go to `/customers`
2. Click "Tambah Pelanggan"
3. Select Type: "Member"
4. **Dropdown "Membership Tier" muncul**
5. Select tier from dropdown (fetched from Loyalty API)

**Expected:**
- ✅ Tier dropdown shows tiers from Loyalty Program
- ✅ Options: Bronze, Silver, Gold, Platinum (+ any custom tiers)

---

### **Test 2: Checkout → Auto Tier Upgrade**

1. Create a customer with Bronze tier
2. Make a purchase > Rp 1,000,000
3. Check customer tier after checkout

**Expected:**
- ✅ Customer automatically upgraded to Silver
- ✅ Discount updated to 10%
- ✅ Points calculated with 1.5x multiplier

---

### **Test 3: Points Multiplier**

**Scenario:**
- Bronze customer (1x): Purchase Rp 100,000 → 10 points
- Silver customer (1.5x): Purchase Rp 100,000 → 15 points
- Gold customer (2x): Purchase Rp 100,000 → 20 points
- Platinum customer (3x): Purchase Rp 100,000 → 30 points

**Test:**
1. Create customers with different tiers
2. Make same amount purchase for each
3. Check points earned

**Expected:**
- ✅ Points calculated correctly with tier multiplier

---

## 🐛 Common Issues & Solutions

### **Issue 1: "Unauthorized" Error**
**Cause:** No active session  
**Solution:** Login at `/auth/login`

### **Issue 2: Tables don't exist**
**Cause:** Migration not run  
**Solution:** `npx sequelize-cli db:migrate`

### **Issue 3: Modal doesn't open**
**Cause:** JavaScript error  
**Solution:** Check browser console for errors

### **Issue 4: API returns 500 error**
**Cause:** Database connection issue  
**Solution:** Check database credentials in `.env`

### **Issue 5: Tier dropdown empty in Customers**
**Cause:** Loyalty API not responding  
**Solution:** Verify `/api/loyalty/tiers/crud` works

---

## ✅ Final Verification Checklist

### **Backend:**
- [ ] Database migration successful
- [ ] All tables created (loyalty_programs, loyalty_tiers, loyalty_rewards)
- [ ] Default data inserted
- [ ] All API endpoints return 200 OK
- [ ] CRUD operations work (Create, Read, Update, Delete)
- [ ] Authentication working on all endpoints

### **Frontend:**
- [ ] Page loads without errors
- [ ] Dashboard displays real data
- [ ] All tabs functional
- [ ] Add Tier modal works
- [ ] Edit Tier modal works
- [ ] Delete Tier works
- [ ] Add Reward modal works
- [ ] Edit Reward modal works
- [ ] Delete Reward works
- [ ] Loading states show correctly
- [ ] Error messages display properly

### **Integration:**
- [ ] Customer form shows tier dropdown
- [ ] Tier dropdown fetches from Loyalty API
- [ ] Checkout auto-upgrades tier
- [ ] Points calculated with multiplier
- [ ] Discount applied from tier
- [ ] Customer type syncs with tier

---

## 📊 Performance Testing

### **Load Test:**
```bash
# Test with 100 concurrent requests
for i in {1..100}; do
  curl http://localhost:3001/api/loyalty/dashboard &
done
wait
```

**Expected:**
- All requests succeed
- Response time < 1 second
- No timeout errors

---

## 🎯 Success Criteria

✅ **All API endpoints functional**  
✅ **Database properly configured**  
✅ **Frontend displays real-time data**  
✅ **CRUD operations work seamlessly**  
✅ **Modals open and close properly**  
✅ **Forms submit successfully**  
✅ **Data refreshes after changes**  
✅ **Integration points working**  
✅ **No console errors**  
✅ **No server errors**  

---

## 📝 Test Report Template

```
Date: [Date]
Tester: [Name]
Environment: Development

Backend API Tests:
- GET /api/loyalty/dashboard: [PASS/FAIL]
- GET /api/loyalty/tiers/crud: [PASS/FAIL]
- POST /api/loyalty/tiers/crud: [PASS/FAIL]
- PUT /api/loyalty/tiers/crud: [PASS/FAIL]
- DELETE /api/loyalty/tiers/crud: [PASS/FAIL]
- GET /api/loyalty/rewards/crud: [PASS/FAIL]
- POST /api/loyalty/rewards/crud: [PASS/FAIL]
- PUT /api/loyalty/rewards/crud: [PASS/FAIL]
- DELETE /api/loyalty/rewards/crud: [PASS/FAIL]

Frontend Tests:
- Page load: [PASS/FAIL]
- Dashboard display: [PASS/FAIL]
- Add Tier: [PASS/FAIL]
- Edit Tier: [PASS/FAIL]
- Delete Tier: [PASS/FAIL]
- Add Reward: [PASS/FAIL]
- Edit Reward: [PASS/FAIL]
- Delete Reward: [PASS/FAIL]

Integration Tests:
- Customer tier dropdown: [PASS/FAIL]
- Auto tier upgrade: [PASS/FAIL]
- Points multiplier: [PASS/FAIL]

Issues Found:
1. [Issue description]
2. [Issue description]

Overall Status: [PASS/FAIL]
```

---

**Last Updated:** February 4, 2026  
**Version:** 1.0.0  
**Status:** ✅ Ready for Testing
