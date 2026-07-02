# Customer Type & Loyalty Tier Integration

## 📋 Overview

Dokumentasi integrasi antara Customer Type di Customers Module dengan Membership Tier di Loyalty Program Module. Sistem ini memungkinkan auto-upgrade tier berdasarkan total spending dan sinkronisasi otomatis setelah setiap transaksi.

---

## 🔗 Integration Points

### Customer Model Fields:
- **`type`**: 'walk-in', 'member', 'vip'
- **`membershipLevel`**: 'Bronze', 'Silver', 'Gold', 'Platinum'
- **`points`**: Loyalty points accumulated
- **`discount`**: Discount percentage from tier
- **`totalSpent`**: Total spending (basis for tier upgrade)
- **`totalPurchases`**: Total number of purchases

### Loyalty Tier Model Fields:
- **`tierName`**: Bronze, Silver, Gold, Platinum
- **`tierLevel`**: Hierarchy level (1-4)
- **`minSpending`**: Minimum spending to reach tier
- **`pointMultiplier`**: Points multiplier (1x, 1.5x, 2x, 3x)
- **`discountPercentage`**: Discount for tier (5%, 10%, 15%, 20%)
- **`benefits`**: Array of benefits

---

## 🎯 Integration Logic

### 1. **Tier Assignment Based on Spending**

```typescript
// Default Tier Thresholds:
Bronze:   Rp 0+         → 5% discount,  1.0x points
Silver:   Rp 1,000,000+ → 10% discount, 1.5x points
Gold:     Rp 5,000,000+ → 15% discount, 2.0x points
Platinum: Rp 10,000,000+→ 20% discount, 3.0x points
```

### 2. **Auto-Upgrade Flow**

```
Customer makes purchase
    ↓
Update totalSpent in Customer table
    ↓
Check current totalSpent vs tier thresholds
    ↓
If qualifies for higher tier:
    - Update membershipLevel
    - Update discount percentage
    - Set type to 'member' (if was 'walk-in')
    ↓
Customer gets new tier benefits immediately
```

### 3. **Points Calculation with Multiplier**

```typescript
// Base calculation: 1 point per Rp 10,000
basePoints = Math.floor(totalAmount / 10000)

// Apply tier multiplier
tierMultiplier = getTierMultiplier(customerTier)
finalPoints = basePoints * tierMultiplier

// Example:
// Purchase: Rp 100,000
// Bronze (1x):   10 points
// Silver (1.5x): 15 points
// Gold (2x):     20 points
// Platinum (3x): 30 points
```

---

## 🌐 API Endpoints

### 1. **POST /api/customers/sync-tier**
Sync single customer tier based on current spending.

**Request Body:**
```json
{
  "customerId": "uuid-here"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Tier upgraded successfully",
  "data": {
    "customerId": "uuid",
    "customerName": "Ahmad Rizki",
    "oldTier": "Silver",
    "newTier": "Gold",
    "totalSpent": 6500000,
    "discount": 15,
    "tierChanged": true
  }
}
```

---

### 2. **GET /api/customers/sync-tier**
Check which customers need tier upgrade.

**Response:**
```json
{
  "success": true,
  "data": {
    "totalCustomers": 2124,
    "upgradeNeeded": 45,
    "customers": [
      {
        "customerId": "uuid",
        "customerName": "Ahmad Rizki",
        "currentTier": "Silver",
        "correctTier": "Gold",
        "totalSpent": 6500000
      }
    ]
  }
}
```

---

### 3. **POST /api/customers/auto-upgrade-tiers**
Auto-upgrade all customers to correct tier.

**Response:**
```json
{
  "success": true,
  "message": "Auto tier upgrade completed",
  "data": {
    "totalProcessed": 2124,
    "upgraded": 45,
    "downgraded": 3,
    "unchanged": 2076,
    "changes": [
      {
        "customerId": "uuid",
        "customerName": "Ahmad Rizki",
        "oldTier": "Silver",
        "newTier": "Gold",
        "totalSpent": 6500000,
        "action": "upgraded"
      }
    ]
  }
}
```

---

## 🔄 Automatic Tier Sync

### Triggered After Each Transaction

**File:** `/pages/api/pos/cashier/checkout.ts`

```typescript
// After successful checkout:
1. Calculate points with tier multiplier
2. Add points to customer
3. Commit transaction
4. Auto-sync tier based on new totalSpent
5. If tier changed, update membershipLevel and discount
```

**Benefits:**
- ✅ Customers automatically upgraded when they qualify
- ✅ Discount applied immediately on next purchase
- ✅ Points multiplier updated for future purchases
- ✅ No manual intervention required

---

## 📊 Data Synchronization

### Customer Table Updates:

```sql
-- When tier is synced:
UPDATE customers SET
  membershipLevel = 'Gold',
  discount = 15.00,
  type = 'member'
WHERE id = 'customer-uuid';
```

### Points Calculation:

```sql
-- After checkout:
UPDATE customers SET
  points = points + (basePoints * tierMultiplier),
  totalSpent = totalSpent + transactionTotal,
  totalPurchases = totalPurchases + 1,
  lastVisit = NOW()
WHERE id = 'customer-uuid';
```

---

## 🎨 Frontend Integration

### Customers Page (`/customers`)

**Display:**
- Customer type badge (walk-in, member, vip)
- Membership level badge (Bronze, Silver, Gold, Platinum)
- Current points
- Discount percentage
- Total spent
- Total purchases

**Actions:**
- View customer details
- Edit customer info
- Sync tier manually (if needed)

---

### Loyalty Program Page (`/loyalty-program`)

**Display:**
- Tier distribution chart
- Members per tier
- Tier benefits
- Minimum spending requirements

**Actions:**
- View tier details
- Edit tier thresholds
- View members in each tier

---

## 🔧 Helper Functions

### File: `/lib/helpers/tier-sync.ts`

#### **syncCustomerTier(customerId)**
Calculate and update customer tier based on spending.

#### **calculatePointsEarned(amount, tierName)**
Calculate points with tier multiplier.

#### **getTierDiscount(tierName)**
Get discount percentage for tier.

#### **checkTierUpgrade(customerId)**
Check if customer qualifies for upgrade.

---

## 🧪 Testing Guide

### 1. Test Tier Assignment

```bash
# Create customer with low spending
curl -X POST http://localhost:3001/api/customers/crud \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Customer",
    "phone": "081234567890",
    "email": "test@example.com",
    "type": "walk-in"
  }'

# Make purchase to increase spending
# Customer should auto-upgrade when reaching threshold
```

### 2. Test Manual Sync

```bash
# Sync single customer
curl -X POST http://localhost:3001/api/customers/sync-tier \
  -H "Content-Type: application/json" \
  -d '{"customerId": "customer-uuid"}'

# Check customers needing upgrade
curl http://localhost:3001/api/customers/sync-tier

# Auto-upgrade all customers
curl -X POST http://localhost:3001/api/customers/auto-upgrade-tiers
```

### 3. Test Points Multiplier

```bash
# Bronze customer (1x): Rp 100,000 → 10 points
# Silver customer (1.5x): Rp 100,000 → 15 points
# Gold customer (2x): Rp 100,000 → 20 points
# Platinum customer (3x): Rp 100,000 → 30 points
```

---

## 📈 Tier Upgrade Scenarios

### Scenario 1: New Customer
```
Initial: walk-in, Bronze, Rp 0
Purchase: Rp 500,000
Result: member, Bronze, Rp 500,000 (no upgrade yet)
```

### Scenario 2: Reaching Silver
```
Current: member, Bronze, Rp 800,000
Purchase: Rp 300,000
New Total: Rp 1,100,000
Result: member, Silver, 10% discount, 1.5x points
```

### Scenario 3: Reaching Gold
```
Current: member, Silver, Rp 4,500,000
Purchase: Rp 600,000
New Total: Rp 5,100,000
Result: member, Gold, 15% discount, 2x points
```

### Scenario 4: Reaching Platinum
```
Current: member, Gold, Rp 9,500,000
Purchase: Rp 800,000
New Total: Rp 10,300,000
Result: vip, Platinum, 20% discount, 3x points
```

---

## 🔍 Monitoring & Maintenance

### Check Tier Distribution

```sql
SELECT 
  membershipLevel,
  COUNT(*) as count,
  AVG(totalSpent) as avgSpent,
  SUM(points) as totalPoints
FROM customers
WHERE type IN ('member', 'vip')
  AND isActive = true
GROUP BY membershipLevel;
```

### Find Customers Needing Upgrade

```sql
SELECT 
  c.id,
  c.name,
  c.membershipLevel as currentTier,
  c.totalSpent,
  (SELECT tierName FROM loyalty_tiers 
   WHERE c.totalSpent >= minSpending 
   ORDER BY minSpending DESC LIMIT 1) as correctTier
FROM customers c
WHERE c.type IN ('member', 'vip')
  AND c.isActive = true
HAVING currentTier != correctTier;
```

---

## ✅ Integration Checklist

### Backend
- [x] Customer model has membershipLevel field
- [x] LoyaltyTier model created
- [x] Tier sync API endpoints
- [x] Auto-upgrade API endpoint
- [x] Helper functions for tier sync
- [x] Points multiplier calculation
- [x] Auto-sync after checkout

### Frontend
- [x] Display customer tier in Customers page
- [x] Display tier distribution in Loyalty page
- [x] Show tier benefits
- [x] Show discount percentage

### Database
- [x] loyalty_tiers table created
- [x] Default tiers inserted
- [x] Indexes for performance
- [x] Foreign key relationships

### Testing
- [x] Test tier assignment
- [x] Test auto-upgrade
- [x] Test points multiplier
- [x] Test discount application

---

## 🎯 Benefits of Integration

1. **Automatic Tier Management**
   - No manual tier assignment needed
   - Customers automatically upgraded when qualified
   - Real-time tier updates

2. **Enhanced Customer Experience**
   - Immediate benefits after upgrade
   - Transparent tier requirements
   - Motivates customers to spend more

3. **Business Intelligence**
   - Track customer spending patterns
   - Identify high-value customers
   - Optimize tier thresholds

4. **Operational Efficiency**
   - Automated tier sync
   - Reduced manual work
   - Consistent tier assignment

---

## 🚀 Future Enhancements

1. **Tier Downgrade**
   - Implement tier downgrade if spending decreases
   - Grace period before downgrade
   - Notification before downgrade

2. **Custom Tier Rules**
   - Allow custom tier thresholds per branch
   - Seasonal tier promotions
   - Special event tiers

3. **Tier Notifications**
   - Email notification on tier upgrade
   - SMS notification for VIP tier
   - In-app notifications

4. **Tier Analytics**
   - Tier conversion rate
   - Average time to upgrade
   - Tier retention rate

---

## 📝 Maintenance Tasks

### Daily
- Monitor tier upgrades
- Check for sync errors

### Weekly
- Run auto-upgrade for all customers
- Review tier distribution

### Monthly
- Analyze tier performance
- Adjust tier thresholds if needed
- Review customer feedback

---

**Last Updated:** February 4, 2026  
**Version:** 1.0.0  
**Status:** ✅ Fully Integrated & Tested
