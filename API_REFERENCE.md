# 📚 API REFERENCE - Reports System

**Project:** Bedagang Retail Platform  
**Version:** 1.0.0  
**Base URL:** `http://localhost:3001/api`  
**Authentication:** Required (NextAuth Session)

---

## 🔐 **AUTHENTICATION**

All API endpoints require authentication via NextAuth session cookie.

### **Headers**
```
Cookie: next-auth.session-token=<session_token>
```

### **Error Response (401)**
```json
{
  "success": false,
  "message": "Unauthorized. Please login."
}
```

---

## 📊 **POS REPORTS API**

Base Path: `/api/pos/reports`

### **1. Sales Summary Report**

Get comprehensive sales summary with time and payment breakdown.

**Endpoint:** `GET /api/pos/reports`

**Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| reportType | string | Yes | Must be `sales-summary` |
| period | string | No | `today`, `week`, `month`, `year` |
| dateFrom | string | No | Start date (YYYY-MM-DD) |
| dateTo | string | No | End date (YYYY-MM-DD) |
| branch | string | No | Branch ID (default: `all`) |

**Example Request:**
```bash
GET /api/pos/reports?reportType=sales-summary&period=today
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "summary": {
      "totalTransactions": 126,
      "totalSales": 15700000,
      "netSales": 15200000,
      "averageTransaction": 124603,
      "totalItemsSold": 534,
      "totalProfit": 4710000
    },
    "timeBreakdown": [
      {
        "hour": 9,
        "transactions": 12,
        "sales": 1250000
      }
    ],
    "paymentBreakdown": [
      {
        "paymentMethod": "Cash",
        "transactions": 45,
        "amount": 5200000,
        "percentage": 33.12
      }
    ]
  },
  "isFromMock": false,
  "reportType": "sales-summary",
  "generatedAt": "2026-02-12T10:00:00.000Z"
}
```

---

### **2. Top Products Report**

Get best-selling products ranked by revenue.

**Endpoint:** `GET /api/pos/reports`

**Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| reportType | string | Yes | Must be `top-products` |
| period | string | No | `today`, `week`, `month`, `year` |
| limit | number | No | Number of products (default: 10) |
| branch | string | No | Branch ID |

**Example Request:**
```bash
GET /api/pos/reports?reportType=top-products&period=month&limit=5
```

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "rank": 1,
      "productId": "123",
      "productName": "Product A",
      "categoryName": "Category 1",
      "totalSold": 245,
      "revenue": 12250000,
      "profit": 3675000,
      "profitMargin": 30.0
    }
  ],
  "isFromMock": false,
  "reportType": "top-products",
  "generatedAt": "2026-02-12T10:00:00.000Z"
}
```

---

### **3. Cashier Performance Report**

Get sales performance per cashier.

**Endpoint:** `GET /api/pos/reports`

**Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| reportType | string | Yes | Must be `cashier-performance` |
| period | string | No | `today`, `week`, `month`, `year` |
| branch | string | No | Branch ID |

**Example Request:**
```bash
GET /api/pos/reports?reportType=cashier-performance&period=week
```

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "cashierId": "1",
      "cashierName": "John Doe",
      "totalTransactions": 85,
      "totalSales": 8500000,
      "averageTransaction": 100000,
      "totalItemsSold": 425
    }
  ],
  "isFromMock": false
}
```

---

### **4. Daily Sales Trend Report**

Get daily sales aggregation.

**Endpoint:** `GET /api/pos/reports`

**Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| reportType | string | Yes | Must be `daily-sales-trend` |
| period | string | No | `week`, `month`, `year` |
| dateFrom | string | No | Start date |
| dateTo | string | No | End date |

**Example Request:**
```bash
GET /api/pos/reports?reportType=daily-sales-trend&period=month
```

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "date": "2026-02-01",
      "totalSales": 1250000,
      "totalTransactions": 45,
      "totalItemsSold": 234
    }
  ],
  "isFromMock": false
}
```

---

### **5. Category Sales Report**

Get sales breakdown by product category.

**Endpoint:** `GET /api/pos/reports`

**Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| reportType | string | Yes | Must be `category-sales` |
| period | string | No | `today`, `week`, `month`, `year` |
| branch | string | No | Branch ID |

**Example Request:**
```bash
GET /api/pos/reports?reportType=category-sales&period=month
```

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "categoryId": "1",
      "categoryName": "Electronics",
      "totalSales": 5200000,
      "totalTransactions": 125,
      "percentage": 33.12
    }
  ],
  "isFromMock": false
}
```

---

## 💰 **FINANCE REPORTS API**

Base Path: `/api/finance/reports`

### **1. Income Statement Report**

Get comprehensive income statement with profit analysis.

**Endpoint:** `GET /api/finance/reports`

**Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| reportType | string | Yes | Must be `income-statement` |
| period | string | No | `today`, `week`, `month`, `year` |
| dateFrom | string | No | Start date |
| dateTo | string | No | End date |

**Example Request:**
```bash
GET /api/finance/reports?reportType=income-statement&period=month
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "summary": {
      "totalIncome": 40200000,
      "totalExpense": 24500000,
      "netProfit": 15700000,
      "profitMargin": 39.05
    },
    "incomeByCategory": [
      {
        "id": "1",
        "categoryName": "Sales",
        "categoryCode": "INC-001",
        "amount": 32500000,
        "transactionCount": 245,
        "percentage": 80.85
      }
    ],
    "expenseByCategory": [
      {
        "id": "4",
        "categoryName": "Purchases",
        "categoryCode": "EXP-001",
        "amount": 12300000,
        "transactionCount": 156,
        "percentage": 50.20
      }
    ]
  },
  "isFromMock": false
}
```

---

### **2. Cash Flow Report**

Get cash flow analysis with daily breakdown.

**Endpoint:** `GET /api/finance/reports`

**Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| reportType | string | Yes | Must be `cash-flow` |
| period | string | No | `month`, `year` |
| dateFrom | string | No | Start date |
| dateTo | string | No | End date |

**Example Request:**
```bash
GET /api/finance/reports?reportType=cash-flow&period=month
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "cashFlowByDate": [
      {
        "date": "2026-02-01",
        "cashIn": 1250000,
        "cashOut": 850000,
        "netCashFlow": 400000,
        "cumulativeCashFlow": 400000
      }
    ],
    "cashFlowByMethod": [
      {
        "paymentMethod": "Cash",
        "cashIn": 15200000,
        "cashOut": 8500000,
        "netFlow": 6700000
      }
    ],
    "summary": {
      "totalCashIn": 40200000,
      "totalCashOut": 24500000,
      "netCashFlow": 15700000,
      "endingBalance": 15700000
    }
  },
  "isFromMock": false
}
```

---

### **3. Expense Breakdown Report**

Get detailed expense analysis by category.

**Endpoint:** `GET /api/finance/reports`

**Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| reportType | string | Yes | Must be `expense-breakdown` |
| period | string | No | `today`, `week`, `month` |

**Example Request:**
```bash
GET /api/finance/reports?reportType=expense-breakdown&period=month
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "expenseByCategory": [
      {
        "id": "4",
        "categoryName": "Purchases",
        "categoryCode": "EXP-001",
        "icon": "FaShoppingCart",
        "color": "#3b82f6",
        "totalAmount": 12300000,
        "transactionCount": 156,
        "averageAmount": 78846,
        "maxAmount": 2500000,
        "minAmount": 15000,
        "percentage": 50.20
      }
    ],
    "topExpenses": [
      {
        "id": "1",
        "description": "Monthly Stock Purchase",
        "amount": 2500000,
        "transactionDate": "2026-02-15",
        "categoryName": "Purchases",
        "paymentMethod": "Bank Transfer"
      }
    ],
    "summary": {
      "totalExpenses": 24500000,
      "totalTransactions": 255,
      "averageExpense": 96078
    }
  },
  "isFromMock": false
}
```

---

### **4. Monthly Trend Report**

Get monthly financial trend analysis.

**Endpoint:** `GET /api/finance/reports`

**Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| reportType | string | Yes | Must be `monthly-trend` |
| months | number | No | Number of months (default: 12) |

**Example Request:**
```bash
GET /api/finance/reports?reportType=monthly-trend&months=6
```

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "month": "2025-01",
      "monthLabel": "Jan 2025",
      "income": 32500000,
      "expense": 22300000,
      "profit": 10200000,
      "profitMargin": 31.38
    }
  ],
  "isFromMock": false
}
```

---

### **5. Budget vs Actual Report**

Get budget comparison analysis.

**Endpoint:** `GET /api/finance/reports`

**Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| reportType | string | Yes | Must be `budget-vs-actual` |
| period | string | No | `month`, `year` |

**Example Request:**
```bash
GET /api/finance/reports?reportType=budget-vs-actual&period=month
```

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": "1",
      "categoryName": "Sales",
      "type": "income",
      "budgetAmount": 30000000,
      "actualAmount": 32500000,
      "variance": -2500000,
      "variancePercentage": 8.33
    }
  ],
  "isFromMock": false
}
```

---

## 👥 **CUSTOMER REPORTS API**

Base Path: `/api/customers/reports`

### **1. Customer Overview Report**

Get comprehensive customer metrics.

**Endpoint:** `GET /api/customers/reports`

**Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| reportType | string | Yes | Must be `overview` |
| period | string | No | `today`, `week`, `month`, `year` |

**Example Request:**
```bash
GET /api/customers/reports?reportType=overview&period=month
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "summary": {
      "totalCustomers": 1250,
      "newCustomers": 85,
      "activeCustomers": 420,
      "inactiveCustomers": 830,
      "totalRevenue": 125000000,
      "averageTransaction": 297619,
      "totalTransactions": 420
    }
  },
  "isFromMock": false
}
```

---

### **2. Top Customers Report**

Get top customers ranked by spending.

**Endpoint:** `GET /api/customers/reports`

**Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| reportType | string | Yes | Must be `top-customers` |
| period | string | No | `today`, `week`, `month`, `year` |
| limit | number | No | Number of customers (default: 10) |

**Example Request:**
```bash
GET /api/customers/reports?reportType=top-customers&period=month&limit=10
```

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "rank": 1,
      "id": "1",
      "customerName": "PT Maju Jaya",
      "email": "maju@example.com",
      "phone": "081234567890",
      "customerType": "corporate",
      "totalTransactions": 45,
      "totalSpent": 15200000,
      "averageTransaction": 337778,
      "lastPurchaseDate": "2025-03-15",
      "totalItemsPurchased": 234
    }
  ],
  "isFromMock": false
}
```

---

### **3. Customer Segmentation Report**

Get customer segmentation by type and spending level.

**Endpoint:** `GET /api/customers/reports`

**Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| reportType | string | Yes | Must be `segmentation` |
| period | string | No | `month`, `year` |

**Example Request:**
```bash
GET /api/customers/reports?reportType=segmentation&period=month
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "byType": [
      {
        "customerType": "corporate",
        "customerCount": 125,
        "totalRevenue": 45000000,
        "averageTransaction": 360000,
        "transactionCount": 125,
        "revenuePercentage": 36.0
      }
    ],
    "bySpending": [
      {
        "segment": "VIP",
        "customerCount": 25,
        "totalRevenue": 35000000,
        "averageSpent": 1400000,
        "revenuePercentage": 28.0
      }
    ]
  },
  "isFromMock": false
}
```

---

### **4. Customer Retention Report**

Get customer retention and churn analysis.

**Endpoint:** `GET /api/customers/reports`

**Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| reportType | string | Yes | Must be `retention` |
| months | number | No | Number of months (default: 6) |

**Example Request:**
```bash
GET /api/customers/reports?reportType=retention&months=6
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "monthlyRetention": [
      {
        "month": "2025-01",
        "monthLabel": "Jan 2025",
        "activeCustomers": 405,
        "newCustomers": 68,
        "returningCustomers": 337,
        "retentionRate": 83.21
      }
    ],
    "churnAnalysis": {
      "atRiskCustomers": 145
    }
  },
  "isFromMock": false
}
```

---

### **5. Purchase Behavior Report**

Get customer purchase behavior analysis.

**Endpoint:** `GET /api/customers/reports`

**Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| reportType | string | Yes | Must be `purchase-behavior` |
| period | string | No | `month`, `year` |

**Example Request:**
```bash
GET /api/customers/reports?reportType=purchase-behavior&period=month
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "purchaseFrequency": [
      {
        "frequencyRange": "More than 10",
        "customerCount": 45
      }
    ],
    "basketAnalysis": {
      "avgItemsPerTransaction": 5.2,
      "avgTransactionValue": 297619,
      "maxTransactionValue": 2500000,
      "minTransactionValue": 15000
    },
    "purchaseTimeDistribution": [
      {
        "hour": 9,
        "transactionCount": 25,
        "uniqueCustomers": 22
      }
    ]
  },
  "isFromMock": false
}
```

---

## 📤 **EXPORT FUNCTIONALITY**

All report APIs support export functionality via POST method.

**Endpoint:** `POST /api/{module}/reports`

**Request Body:**
```json
{
  "reportType": "sales-summary",
  "period": "month",
  "format": "excel"
}
```

**Supported Formats:**
- `pdf` - PDF document
- `excel` - Excel spreadsheet (.xlsx)
- `csv` - CSV file

**Response (200):**
```json
{
  "success": true,
  "data": {
    "reportId": "POS-RPT-1707728400000",
    "reportType": "sales-summary",
    "format": "excel",
    "generatedAt": "2026-02-12T10:00:00.000Z",
    ...reportData
  },
  "isFromMock": false,
  "message": "Report generated successfully in excel format"
}
```

---

## ❌ **ERROR RESPONSES**

### **400 Bad Request**
```json
{
  "success": false,
  "message": "Invalid report type. Valid types: sales-summary, top-products, ..."
}
```

### **401 Unauthorized**
```json
{
  "success": false,
  "message": "Unauthorized. Please login."
}
```

### **500 Internal Server Error**
```json
{
  "success": false,
  "message": "Internal server error",
  "error": "Database connection failed"
}
```

---

## 🔄 **MOCK DATA FALLBACK**

When database connection fails, APIs automatically fallback to mock data.

**Response with Mock Data:**
```json
{
  "success": true,
  "data": { ... },
  "isFromMock": true,
  "message": "Using mock data due to database error"
}
```

**Frontend Handling:**
```typescript
const result = await fetchSalesSummaryReport({ period: 'month' });
if (result.isFromMock) {
  // Show warning to user
  console.warn('Displaying sample data');
}
```

---

## 📊 **RATE LIMITING**

**Recommended Limits:**
- 100 requests per 15 minutes per IP
- 1000 requests per hour per user

**Rate Limit Headers:**
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1707728400
```

---

## 🔍 **QUERY OPTIMIZATION**

**Best Practices:**
1. Use period shortcuts instead of custom date ranges when possible
2. Limit result sets with `limit` parameter
3. Cache frequently accessed reports
4. Use appropriate indexes on database tables

**Performance Targets:**
- API response time: < 500ms
- Database query time: < 200ms
- Total request time: < 1s

---

## 📝 **CHANGELOG**

### **Version 1.0.0** (2026-02-12)
- Initial release
- POS Reports API (5 endpoints)
- Finance Reports API (5 endpoints)
- Customer Reports API (5 endpoints)
- Export functionality
- Mock data fallback
- Authentication required

---

**API Reference Version:** 1.0.0  
**Last Updated:** February 12, 2026  
**Status:** Production Ready

---

*For implementation examples, see:*
- `lib/adapters/*-reports-adapter.ts` - Frontend integration
- `pages/api/*/reports.ts` - API implementation
- `DEPLOYMENT_GUIDE.md` - Deployment instructions
