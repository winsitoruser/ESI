# Customers Module - Backend Documentation

## 📋 Overview

Dokumentasi lengkap untuk backend Customers/CRM Module yang mencakup database schema, Sequelize model, migration, dan API endpoints.

---

## 🗄️ Database Schema

### Table: `customers`

```sql
CREATE TABLE customers (
  id VARCHAR(36) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  phone VARCHAR(50) UNIQUE,
  email VARCHAR(255) UNIQUE,
  address TEXT,
  city VARCHAR(100),
  province VARCHAR(100),
  postalCode VARCHAR(20),
  type ENUM('walk-in', 'member', 'vip') DEFAULT 'walk-in',
  status ENUM('active', 'inactive', 'blocked') DEFAULT 'active',
  membershipLevel ENUM('Bronze', 'Silver', 'Gold', 'Platinum') DEFAULT 'Silver',
  points INT DEFAULT 0,
  discount DECIMAL(5,2) DEFAULT 0,
  totalPurchases INT DEFAULT 0,
  totalSpent DECIMAL(15,2) DEFAULT 0,
  lastVisit DATETIME,
  birthDate DATE,
  gender ENUM('male', 'female', 'other'),
  notes TEXT,
  isActive BOOLEAN DEFAULT true,
  partnerId VARCHAR(36),
  createdAt DATETIME NOT NULL,
  updatedAt DATETIME NOT NULL,
  
  INDEX idx_phone (phone),
  INDEX idx_email (email),
  INDEX idx_type (type),
  INDEX idx_status (status),
  INDEX idx_membershipLevel (membershipLevel)
);
```

### Field Descriptions:

| Field | Type | Description |
|-------|------|-------------|
| `id` | UUID | Primary key |
| `name` | String | Customer name (required) |
| `phone` | String | Phone number (unique) |
| `email` | String | Email address (unique, validated) |
| `address` | Text | Full address |
| `city` | String | City name |
| `province` | String | Province/state |
| `postalCode` | String | Postal/ZIP code |
| `type` | Enum | Customer type: walk-in, member, vip |
| `status` | Enum | Account status: active, inactive, blocked |
| `membershipLevel` | Enum | Bronze, Silver, Gold, Platinum |
| `points` | Integer | Loyalty points |
| `discount` | Decimal | Discount percentage (0-100) |
| `totalPurchases` | Integer | Total number of purchases |
| `totalSpent` | Decimal | Total amount spent |
| `lastVisit` | DateTime | Last visit/purchase date |
| `birthDate` | Date | Date of birth |
| `gender` | Enum | male, female, other |
| `notes` | Text | Additional notes |
| `isActive` | Boolean | Soft delete flag |

---

## 🔧 Sequelize Model

### Location: `/models/Customer.js`

**Key Features:**
- UUID primary key
- Email validation
- Unique constraints on phone and email
- Indexes for performance
- Association with PosTransaction

**Associations:**
```javascript
Customer.hasMany(PosTransaction, {
  foreignKey: 'customerId',
  as: 'transactions'
});
```

---

## 📦 Migration

### File: `/migrations/20260204-update-customers-table.js`

**Features:**
- Smart migration that checks if table exists
- Creates table if not exists
- Adds missing columns if table exists
- Creates indexes for performance
- Rollback support

**Run Migration:**
```bash
npx sequelize-cli db:migrate
```

**Rollback:**
```bash
npx sequelize-cli db:migrate:undo
```

---

## 🌐 API Endpoints

### 1. **GET /api/customers/crud**
Get list of customers with pagination and filters.

**Query Parameters:**
- `page` (number, default: 1)
- `limit` (number, default: 10)
- `search` (string) - Search by name, phone, or email
- `type` (string) - Filter by customer type
- `status` (string) - Filter by status
- `membershipLevel` (string) - Filter by membership level

**Response:**
```json
{
  "success": true,
  "data": {
    "customers": [
      {
        "id": "uuid",
        "name": "John Doe",
        "phone": "081234567890",
        "email": "john@example.com",
        "type": "member",
        "status": "active",
        "membershipLevel": "Gold",
        "points": 1500,
        "discount": 15,
        "totalPurchases": 25,
        "totalSpent": 5000000,
        "lastVisit": "2026-02-04T10:00:00.000Z"
      }
    ],
    "pagination": {
      "total": 100,
      "page": 1,
      "limit": 10,
      "totalPages": 10
    },
    "stats": {
      "totalCustomers": 100,
      "activeCustomers": 85,
      "vipCustomers": 15,
      "avgLifetimeValue": 3500000
    }
  }
}
```

---

### 2. **POST /api/customers/crud**
Create a new customer.

**Request Body:**
```json
{
  "name": "Jane Smith",
  "phone": "081234567891",
  "email": "jane@example.com",
  "address": "Jl. Sudirman No. 123",
  "city": "Jakarta",
  "province": "DKI Jakarta",
  "postalCode": "12190",
  "type": "member",
  "membershipLevel": "Silver",
  "discount": 10,
  "birthDate": "1990-05-15",
  "gender": "female",
  "notes": "VIP customer"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Customer created successfully",
  "data": {
    "id": "uuid",
    "name": "Jane Smith",
    ...
  }
}
```

**Validations:**
- Name is required
- Phone must be unique
- Email must be unique and valid format
- Automatic initialization of points, totalPurchases, totalSpent

---

### 3. **PUT /api/customers/crud?id={customerId}**
Update existing customer.

**Query Parameters:**
- `id` (required) - Customer UUID

**Request Body:**
```json
{
  "name": "Jane Smith Updated",
  "phone": "081234567899",
  "email": "jane.new@example.com",
  "status": "active",
  "membershipLevel": "Gold",
  "discount": 20
}
```

**Response:**
```json
{
  "success": true,
  "message": "Customer updated successfully",
  "data": {
    "id": "uuid",
    "name": "Jane Smith Updated",
    ...
  }
}
```

**Validations:**
- Customer ID must exist
- Phone uniqueness (excluding current customer)
- Email uniqueness (excluding current customer)

---

### 4. **DELETE /api/customers/crud?id={customerId}**
Delete (soft delete) a customer.

**Query Parameters:**
- `id` (required) - Customer UUID

**Response:**
```json
{
  "success": true,
  "message": "Customer deleted successfully"
}
```

**Note:** This performs a soft delete by setting `isActive = false` and `status = 'inactive'`

---

### 5. **GET /api/customers/stats**
Get customer statistics and analytics.

**Response:**
```json
{
  "success": true,
  "data": {
    "overview": {
      "totalCustomers": 1234,
      "activeCustomers": 892,
      "vipCustomers": 156,
      "memberCustomers": 678,
      "newCustomersThisMonth": 45,
      "avgLifetimeValue": 4520000,
      "avgPurchases": 12.5,
      "totalRevenue": 558480000
    },
    "customersByLevel": [
      { "level": "Bronze", "count": 300 },
      { "level": "Silver", "count": 500 },
      { "level": "Gold", "count": 250 },
      { "level": "Platinum", "count": 184 }
    ],
    "topCustomers": [
      {
        "id": "uuid",
        "name": "Top Customer",
        "totalSpent": 15000000,
        "totalPurchases": 50
      }
    ],
    "recentCustomers": [...]
  }
}
```

---

### 6. **GET /api/customers/[id]**
Get detailed customer information with purchase history.

**Response:**
```json
{
  "success": true,
  "data": {
    "customer": {
      "id": "uuid",
      "name": "John Doe",
      ...
    },
    "purchaseStats": {
      "totalTransactions": 25,
      "totalSpent": 5000000,
      "averageOrderValue": 200000,
      "lastPurchaseDate": "2026-02-04T10:00:00.000Z"
    },
    "recentTransactions": [
      {
        "id": "uuid",
        "transactionNumber": "TRX202602040001",
        "total": 250000,
        "items": [...]
      }
    ],
    "topProducts": [
      {
        "productId": "uuid",
        "productName": "Product A",
        "totalQuantity": 50,
        "purchaseCount": 10
      }
    ],
    "monthlySpending": [
      {
        "month": "2026-01",
        "totalSpent": 800000,
        "transactionCount": 5
      }
    ]
  }
}
```

---

## 🔐 Security & Authentication

All endpoints require authentication via NextAuth session:

```typescript
const session = await getServerSession(req, res, authOptions);

if (!session) {
  return res.status(401).json({ error: 'Unauthorized' });
}
```

---

## 📊 Database Queries

### Get Customers with Filters
```javascript
const { count, rows } = await Customer.findAndCountAll({
  where: {
    [Op.or]: [
      { name: { [Op.like]: `%${search}%` } },
      { phone: { [Op.like]: `%${search}%` } },
      { email: { [Op.like]: `%${search}%` } }
    ],
    type: 'member',
    status: 'active'
  },
  limit: 10,
  offset: 0,
  order: [['createdAt', 'DESC']]
});
```

### Calculate Statistics
```javascript
const stats = await Customer.findAll({
  attributes: [
    [Customer.sequelize.fn('COUNT', Customer.sequelize.col('id')), 'totalCustomers'],
    [Customer.sequelize.fn('AVG', Customer.sequelize.col('totalSpent')), 'avgLifetimeValue']
  ],
  raw: true
});
```

### Get Customer with Transactions
```javascript
const customer = await Customer.findByPk(id, {
  include: [
    {
      model: PosTransaction,
      as: 'transactions',
      include: ['items']
    }
  ]
});
```

---

## 🎯 Integration with POS

### Auto-update Customer Stats on Transaction

When a POS transaction is completed:

```javascript
// In checkout API
await Customer.increment({
  totalPurchases: 1,
  totalSpent: transactionTotal,
  points: Math.floor(transactionTotal / 10000)
}, {
  where: { id: customerId }
});

await Customer.update({
  lastVisit: new Date()
}, {
  where: { id: customerId }
});
```

---

## 📈 Membership Level Logic

### Automatic Upgrade Based on Spending

```javascript
function calculateMembershipLevel(totalSpent) {
  if (totalSpent >= 10000000) return 'Platinum';
  if (totalSpent >= 5000000) return 'Gold';
  if (totalSpent >= 2000000) return 'Silver';
  return 'Bronze';
}
```

### Discount Tiers

| Level | Discount |
|-------|----------|
| Bronze | 5% |
| Silver | 10% |
| Gold | 15% |
| Platinum | 20% |

---

## 🧪 Testing

### Test Customer Creation
```bash
curl -X POST http://localhost:3001/api/customers/crud \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Customer",
    "phone": "081234567890",
    "email": "test@example.com",
    "type": "member"
  }'
```

### Test Get Customers
```bash
curl http://localhost:3001/api/customers/crud?page=1&limit=10&search=test
```

### Test Get Statistics
```bash
curl http://localhost:3001/api/customers/stats
```

---

## 🔄 Data Flow

```
Frontend (CRM Module)
    ↓
API Endpoints (/api/customers/*)
    ↓
Sequelize Model (Customer)
    ↓
MySQL Database (customers table)
    ↓
Response with Data
```

---

## 📝 Error Handling

All endpoints include comprehensive error handling:

```javascript
try {
  // API logic
} catch (error) {
  console.error('API Error:', error);
  return res.status(500).json({ 
    error: error.message,
    details: process.env.NODE_ENV === 'development' ? error.stack : undefined
  });
}
```

**Common Error Codes:**
- `400` - Bad Request (validation errors)
- `401` - Unauthorized (no session)
- `404` - Not Found (customer doesn't exist)
- `405` - Method Not Allowed
- `500` - Internal Server Error

---

## 🚀 Next Steps

1. **Frontend Integration**
   - Update CRM module to use new API endpoints
   - Add loading states
   - Implement error handling

2. **Advanced Features**
   - Customer segmentation
   - Email/SMS marketing integration
   - Customer feedback system
   - Loyalty rewards program

3. **Analytics**
   - Customer lifetime value prediction
   - Churn analysis
   - RFM (Recency, Frequency, Monetary) analysis

4. **Export/Import**
   - CSV export
   - Excel export
   - Bulk import customers

---

## 📞 Support

**Last Updated:** February 4, 2026  
**Version:** 1.0.0  
**Database:** MySQL with Sequelize ORM  
**Authentication:** NextAuth.js
