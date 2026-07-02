# 🚀 QUICK START: Inventory Transfers System

## ⚡ IMMEDIATE ACTIONS

### **Option 1: Automated Setup (Recommended)**

```bash
# Navigate to project directory
cd /Users/winnerharry/Documents/bedagang

# Run automated setup script
./scripts/setup-inventory-transfers.sh
```

**Script will:**
- ✅ Run migration to create tables
- ✅ Verify tables and indexes
- ✅ Test all 10 API endpoints
- ✅ Create sample transfers
- ✅ Show summary report

---

### **Option 2: Manual Setup**

#### **Step 1: Run Migration**

**If you have psql installed:**
```bash
psql -U postgres -d farmanesia_dev \
  -f migrations/20260126000005-create-inventory-transfers.sql
```

**If psql not available, use database client:**
1. Open your database client (pgAdmin, DBeaver, etc)
2. Connect to `farmanesia_dev` database
3. Open file: `migrations/20260126000005-create-inventory-transfers.sql`
4. Execute the SQL

**Verify tables created:**
```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name LIKE 'inventory_transfer%';

-- Should return:
-- inventory_transfers
-- inventory_transfer_items
-- inventory_transfer_history
```

#### **Step 2: Start Next.js Server**

```bash
npm run dev
# or
yarn dev
```

Wait for: `ready - started server on 0.0.0.0:3000`

#### **Step 3: Test API Endpoints**

**Test 1: Get Stats (Empty State)**
```bash
curl http://localhost:3000/api/inventory/transfers/stats
```

Expected: `{"success":true,"data":{"total_transfers":0,...}}`

**Test 2: Create Transfer**
```bash
curl -X POST http://localhost:3000/api/inventory/transfers \
  -H "Content-Type: application/json" \
  -d '{
    "from_location_id": 1,
    "to_location_id": 2,
    "priority": "urgent",
    "reason": "Stock menipis di cabang",
    "items": [{
      "product_id": 1,
      "product_name": "Kopi Arabica",
      "product_sku": "KOP-001",
      "quantity": 50,
      "unit_cost": 30000
    }],
    "shipping_cost": 150000
  }'
```

Expected: `{"success":true,"message":"Transfer request created successfully","data":{"transfer_number":"TRF-2026-0001",...}}`

**Test 3: List Transfers**
```bash
curl http://localhost:3000/api/inventory/transfers
```

Expected: `{"success":true,"data":[...],"pagination":{...}}`

**Test 4: Approve Transfer (use ID from create response)**
```bash
curl -X PUT http://localhost:3000/api/inventory/transfers/1/approve \
  -H "Content-Type: application/json" \
  -d '{"approval_notes":"Approved"}'
```

Expected: `{"success":true,"message":"Transfer approved successfully",...}`

---

## 📋 VERIFICATION CHECKLIST

After running setup, verify:

### **Database:**
- [ ] 3 tables created (inventory_transfers, inventory_transfer_items, inventory_transfer_history)
- [ ] ~13 indexes created
- [ ] Constraints working (try creating transfer with same from/to location - should fail)

### **API Endpoints:**
- [ ] GET /api/inventory/transfers/stats - Returns stats
- [ ] GET /api/inventory/transfers - Returns list
- [ ] POST /api/inventory/transfers - Creates transfer
- [ ] GET /api/inventory/transfers/[id] - Returns detail
- [ ] PUT /api/inventory/transfers/[id]/approve - Approves
- [ ] PUT /api/inventory/transfers/[id]/reject - Rejects
- [ ] PUT /api/inventory/transfers/[id]/ship - Ships
- [ ] PUT /api/inventory/transfers/[id]/receive - Receives
- [ ] DELETE /api/inventory/transfers/[id] - Cancels
- [ ] All endpoints return proper JSON responses

### **Frontend:**
- [ ] Page loads: http://localhost:3000/inventory/transfers
- [ ] Currently shows mock data (expected)
- [ ] No console errors

---

## 🔧 TROUBLESHOOTING

### **Issue: "psql: command not found"**

**Solution 1: Install PostgreSQL**
```bash
# macOS
brew install postgresql

# Or use database client GUI (pgAdmin, DBeaver)
```

**Solution 2: Use Database Client**
- Open pgAdmin or DBeaver
- Connect to database
- Run migration SQL manually

### **Issue: "Database table not ready"**

**Check if migration ran:**
```sql
SELECT COUNT(*) FROM inventory_transfers;
```

If error "relation does not exist" → Migration not run yet

### **Issue: "Server not running"**

```bash
# Check if server is running
curl http://localhost:3000

# If not, start it
npm run dev
```

### **Issue: "Unauthorized" on API calls**

API endpoints require authentication. Either:
1. Login to the app first
2. Get session token from browser cookies
3. Add to curl: `-H "Cookie: next-auth.session-token=YOUR_TOKEN"`

### **Issue: "Cannot transfer to same location"**

This is expected! Validation working correctly.
Use different from_location_id and to_location_id.

---

## 📊 EXPECTED TEST RESULTS

After running all tests, you should see:

**Database:**
```
✓ 3 tables created
✓ 13 indexes created
✓ Constraints active
```

**API Tests:**
```
✓ Stats endpoint: Returns {"success":true,...}
✓ List endpoint: Returns empty array initially
✓ Create endpoint: Returns TRF-2026-0001
✓ Detail endpoint: Returns transfer with items
✓ Approve endpoint: Status → approved
✓ Ship endpoint: Status → in_transit
✓ Receive endpoint: Status → completed
✓ Reject endpoint: Status → rejected
✓ Cancel endpoint: Status → cancelled
✓ Stats updated: Shows transfer counts
```

---

## 🎯 NEXT STEPS (After Verification)

### **Short-term (1-2 days):**

**1. Update Frontend - Main Page**

File: `/pages/inventory/transfers.tsx`

```typescript
// Add imports
import axios from 'axios';
import { useEffect } from 'react';
import toast, { Toaster } from 'react-hot-toast';

// Replace mock data with API
const [transfers, setTransfers] = useState([]);
const [stats, setStats] = useState({});
const [loading, setLoading] = useState(true);

useEffect(() => {
  fetchTransfers();
  fetchStats();
}, []);

const fetchTransfers = async () => {
  try {
    const res = await axios.get('/api/inventory/transfers');
    if (res.data.success) {
      setTransfers(res.data.data);
    }
  } catch (error) {
    toast.error('Gagal memuat transfers');
  } finally {
    setLoading(false);
  }
};

const fetchStats = async () => {
  try {
    const res = await axios.get('/api/inventory/transfers/stats');
    if (res.data.success) {
      setStats(res.data.data);
    }
  } catch (error) {
    console.error('Error fetching stats:', error);
  }
};
```

**2. Create Transfer Page**

File: `/pages/inventory/transfers/create.tsx`

See complete code in: `INVENTORY_TRANSFERS_DEPLOYMENT_GUIDE.md` (Step 4)

**3. Connect Action Buttons**

```typescript
const handleApprove = async (id: number) => {
  try {
    await axios.put(`/api/inventory/transfers/${id}/approve`, {
      approval_notes: 'Approved'
    });
    toast.success('Transfer disetujui');
    fetchTransfers();
  } catch (error) {
    toast.error('Gagal menyetujui transfer');
  }
};
```

### **Medium-term (3-5 days):**

**1. Stock Integration**

Add to ship endpoint:
```javascript
// Deduct stock from source
await pool.query(`
  UPDATE inventory_stock
  SET quantity = quantity - $1
  WHERE product_id = $2 AND location_id = $3
`, [quantity_shipped, product_id, from_location_id]);
```

Add to receive endpoint:
```javascript
// Add stock to destination
await pool.query(`
  UPDATE inventory_stock
  SET quantity = quantity + $1
  WHERE product_id = $2 AND location_id = $3
`, [quantity_received, product_id, to_location_id]);
```

**2. Notification System**

- Email on transfer request
- Email on approval/rejection
- Email on shipment
- Email on receipt

**3. End-to-End Testing**

- Create transfer
- Approve
- Ship (verify stock deducted)
- Receive (verify stock added)
- Check stock movements
- Verify history log

---

## 📚 DOCUMENTATION REFERENCE

**Complete Guides:**
1. `INVENTORY_TRANSFERS_COMPLETE_ANALYSIS.md` - Business case & requirements
2. `INVENTORY_TRANSFERS_IMPLEMENTATION.md` - Technical implementation
3. `INVENTORY_TRANSFERS_DEPLOYMENT_GUIDE.md` - Deployment & testing

**Key Files:**
- Migration: `migrations/20260126000005-create-inventory-transfers.sql`
- API: `pages/api/inventory/transfers/`
- Frontend: `pages/inventory/transfers.tsx`

---

## ✅ SUCCESS CRITERIA

System is ready when:
- ✅ All tables created
- ✅ All API endpoints working
- ✅ Can create transfer via API
- ✅ Can approve/reject/ship/receive
- ✅ Stats show correct data
- ✅ Frontend displays real data
- ✅ No console errors

---

## 🆘 NEED HELP?

**Check logs:**
```bash
# Next.js console
# Look for API errors

# Database logs
# Check for SQL errors
```

**Common Issues:**
- Migration not run → Run SQL file
- Server not running → `npm run dev`
- Auth errors → Login to app first
- Validation errors → Check request body

**Contact:**
- Check documentation files
- Review error messages
- Test with curl commands

---

**Status:** ✅ **READY TO START**
**Estimated Time:** 
- Setup & Testing: 30 minutes
- Frontend Integration: 1-2 days
- Stock Integration: 2-3 days

**Let's get started! Run the setup script or follow manual steps above.** 🚀
