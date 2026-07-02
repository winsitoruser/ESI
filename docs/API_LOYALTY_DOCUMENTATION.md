# Loyalty Program API Documentation

## Overview
Comprehensive API documentation for the Loyalty Program system, including program management, customer enrollment, point transactions, and reward redemption.

## Base URL
```
/api/loyalty
```

---

## Program Management

### 1. Get All Programs
**Endpoint:** `GET /api/loyalty/programs`

**Query Parameters:**
- `includeStats` (optional): Include statistics (`true` | `false`)

**Response:**
```json
{
  "programs": [
    {
      "id": "uuid",
      "programName": "FARMANESIA Loyalty Program",
      "description": "Program loyalitas untuk pelanggan setia",
      "isActive": true,
      "pointsPerRupiah": 1,
      "minimumPurchase": 10000,
      "pointsExpiry": 365,
      "autoEnroll": true,
      "tiers": [...],
      "rewards": [...]
    }
  ],
  "statistics": {
    "totalMembers": 1250,
    "activeMembers": 980,
    "totalPointsIssued": 125000,
    "totalPointsRedeemed": 45000,
    "averagePointsPerMember": 100
  }
}
```

### 2. Create Program
**Endpoint:** `POST /api/loyalty/programs`

**Request Body:**
```json
{
  "programName": "FARMANESIA Loyalty Program",
  "description": "Program loyalitas",
  "isActive": true,
  "pointsPerRupiah": 1,
  "minimumPurchase": 10000,
  "pointsExpiry": 365,
  "autoEnroll": true
}
```

### 3. Update Program
**Endpoint:** `PUT /api/loyalty/programs`

**Request Body:**
```json
{
  "id": "uuid",
  "programName": "Updated Name",
  "pointsPerRupiah": 1.5
}
```

---

## Tier Management

### 1. Get All Tiers
**Endpoint:** `GET /api/loyalty/tiers`

**Query Parameters:**
- `programId` (optional): Filter by program ID
- `includeCount` (optional): Include member count per tier

**Response:**
```json
{
  "tiers": [
    {
      "id": "uuid",
      "programId": "uuid",
      "tierName": "Gold",
      "tierLevel": 3,
      "minSpending": 4000000,
      "pointMultiplier": 1.5,
      "discountPercentage": 10,
      "benefits": ["Poin 1.5x", "Diskon 10%"],
      "color": "from-yellow-600 to-yellow-400",
      "isActive": true,
      "memberCount": 450
    }
  ]
}
```

### 2. Create Tier
**Endpoint:** `POST /api/loyalty/tiers`

**Request Body:**
```json
{
  "programId": "uuid",
  "tierName": "Platinum",
  "tierLevel": 4,
  "minSpending": 8000000,
  "pointMultiplier": 2.0,
  "discountPercentage": 15,
  "benefits": ["Poin 2x", "Diskon 15%", "VIP Service"],
  "color": "from-gray-600 to-gray-400"
}
```

### 3. Update Tier
**Endpoint:** `PUT /api/loyalty/tiers`

### 4. Delete Tier
**Endpoint:** `DELETE /api/loyalty/tiers?id=uuid`

---

## Reward Management

### 1. Get All Rewards
**Endpoint:** `GET /api/loyalty/rewards`

**Query Parameters:**
- `programId` (optional): Filter by program ID
- `isActive` (optional): Filter by active status
- `rewardType` (optional): Filter by type

**Response:**
```json
{
  "rewards": [
    {
      "id": "uuid",
      "programId": "uuid",
      "rewardName": "Diskon Rp 50.000",
      "description": "Voucher diskon",
      "pointsRequired": 500,
      "rewardType": "discount",
      "rewardValue": 50000,
      "validityDays": 30,
      "maxRedemptions": 100,
      "currentRedemptions": 25,
      "isActive": true
    }
  ]
}
```

### 2. Create Reward
**Endpoint:** `POST /api/loyalty/rewards`

**Request Body:**
```json
{
  "programId": "uuid",
  "rewardName": "Diskon Rp 100.000",
  "description": "Voucher diskon untuk pembelian minimum Rp 500.000",
  "pointsRequired": 1000,
  "rewardType": "discount",
  "rewardValue": 100000,
  "validityDays": 30,
  "maxRedemptions": 50,
  "isActive": true
}
```

### 3. Update Reward
**Endpoint:** `PUT /api/loyalty/rewards`

### 4. Delete Reward
**Endpoint:** `DELETE /api/loyalty/rewards?id=uuid`

---

## Customer Loyalty

### 1. Get Customer Loyalty Info
**Endpoint:** `GET /api/loyalty/customers/:customerId`

**Response:**
```json
{
  "customerLoyalty": {
    "id": "uuid",
    "customerId": "uuid",
    "programId": "uuid",
    "currentTierId": "uuid",
    "totalPoints": 1500,
    "availablePoints": 1200,
    "lifetimePoints": 3000,
    "totalSpending": 5000000,
    "enrollmentDate": "2025-01-01",
    "lastActivityDate": "2025-01-17",
    "isActive": true,
    "customer": {...},
    "program": {...},
    "currentTier": {...}
  },
  "recentTransactions": [...]
}
```

### 2. Enroll Customer
**Endpoint:** `POST /api/loyalty/customers/:customerId`

**Request Body:**
```json
{
  "programId": "uuid"
}
```

---

## Point Transactions

### 1. Get Point Transactions
**Endpoint:** `GET /api/loyalty/customers/:customerId/points`

**Query Parameters:**
- `limit` (optional): Number of results (default: 50)
- `offset` (optional): Pagination offset
- `transactionType` (optional): Filter by type

**Response:**
```json
{
  "transactions": [
    {
      "id": "uuid",
      "customerLoyaltyId": "uuid",
      "transactionType": "earn",
      "points": 150,
      "referenceType": "pos_transaction",
      "referenceId": "uuid",
      "description": "Earned from purchase",
      "balanceBefore": 1000,
      "balanceAfter": 1150,
      "expiryDate": "2026-01-17",
      "transactionDate": "2025-01-17"
    }
  ],
  "total": 100,
  "limit": 50,
  "offset": 0
}
```

### 2. Add Points (Manual)
**Endpoint:** `POST /api/loyalty/customers/:customerId/points`

**Request Body:**
```json
{
  "points": 100,
  "transactionType": "earn",
  "referenceType": "manual",
  "description": "Bonus points",
  "processedBy": "employee-uuid"
}
```

---

## Reward Redemption

### 1. Redeem Reward
**Endpoint:** `POST /api/loyalty/rewards/redeem`

**Request Body:**
```json
{
  "customerId": "uuid",
  "rewardId": "uuid",
  "processedBy": "employee-uuid"
}
```

**Response:**
```json
{
  "message": "Reward redeemed successfully",
  "redemption": {
    "id": "uuid",
    "customerLoyaltyId": "uuid",
    "rewardId": "uuid",
    "pointsUsed": 500,
    "redemptionCode": "RWD-ABC123XYZ",
    "status": "approved",
    "redemptionDate": "2025-01-17",
    "expiryDate": "2025-02-16",
    "reward": {
      "rewardName": "Diskon Rp 50.000",
      "rewardType": "discount",
      "rewardValue": 50000
    }
  },
  "newBalance": 700
}
```

### 2. Get Customer Redemptions
**Endpoint:** `GET /api/loyalty/rewards/redeem?customerId=uuid`

**Query Parameters:**
- `customerId` (required): Customer ID
- `status` (optional): Filter by status

---

## POS Integration

### 1. Earn Points from POS Transaction
**Endpoint:** `POST /api/loyalty/pos/earn-points`

**Request Body:**
```json
{
  "customerId": "uuid",
  "posTransactionId": "uuid",
  "totalAmount": 250000
}
```

**Response:**
```json
{
  "message": "Points earned successfully",
  "pointsEarned": 375,
  "newBalance": 1575,
  "tierUpgrade": {
    "upgraded": true,
    "newTier": "Gold",
    "tierLevel": 3
  },
  "pointTransaction": {...}
}
```

---

## Error Responses

### 401 Unauthorized
```json
{
  "error": "Unauthorized"
}
```

### 400 Bad Request
```json
{
  "error": "Missing required fields"
}
```

### 404 Not Found
```json
{
  "error": "Customer not enrolled in loyalty program"
}
```

### 500 Internal Server Error
```json
{
  "error": "Internal server error",
  "details": "Error message"
}
```

---

## Usage Examples

### Example 1: Get program with statistics
```javascript
const response = await fetch('/api/loyalty/programs?includeStats=true');
const data = await response.json();
console.log(data.statistics);
```

### Example 2: Enroll customer and earn points
```javascript
// Enroll customer
await fetch('/api/loyalty/customers/customer-uuid', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ programId: 'program-uuid' })
});

// Earn points from purchase
await fetch('/api/loyalty/pos/earn-points', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    customerId: 'customer-uuid',
    posTransactionId: 'transaction-uuid',
    totalAmount: 250000
  })
});
```

### Example 3: Redeem reward
```javascript
const response = await fetch('/api/loyalty/rewards/redeem', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    customerId: 'customer-uuid',
    rewardId: 'reward-uuid',
    processedBy: 'employee-uuid'
  })
});

const data = await response.json();
console.log('Redemption Code:', data.redemption.redemptionCode);
```

---

## Integration Points

### With POS System
- Automatic point earning on transaction completion
- Tier-based discounts applied at checkout
- Reward redemption during transaction

### With Customer Module
- Auto-enrollment for new customers
- Customer profile shows loyalty status
- Point balance in customer details

### With Product Module
- Product-based rewards
- Special pricing for loyalty tiers

### With Transaction Module
- Point earning tracked per transaction
- Redemption codes applied to transactions
- Transaction history linked to point history
