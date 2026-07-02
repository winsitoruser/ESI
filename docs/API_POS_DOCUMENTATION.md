# POS API Documentation

## Overview
This documentation covers the API endpoints for the Point of Sale (POS) system, including shift management, transactions, and reporting.

## Base URL
```
/api/pos
```

---

## Shift Management

### 1. Get All Shifts
**Endpoint:** `GET /api/pos/shifts`

**Query Parameters:**
- `status` (optional): Filter by shift status (`open` | `closed`)
- `date` (optional): Filter by shift date (YYYY-MM-DD)
- `employeeId` (optional): Filter by employee ID
- `limit` (optional): Number of results (default: 50)
- `offset` (optional): Pagination offset (default: 0)

**Response:**
```json
{
  "shifts": [
    {
      "id": "uuid",
      "shiftName": "Siang",
      "shiftDate": "2025-04-23",
      "startTime": "14:00:00",
      "endTime": "22:00:00",
      "openedBy": "uuid",
      "openedAt": "2025-04-23T14:05:00Z",
      "closedBy": "uuid",
      "closedAt": "2025-04-23T22:00:00Z",
      "initialCashAmount": 2000000,
      "finalCashAmount": 4200000,
      "expectedCashAmount": 3850000,
      "cashDifference": 350000,
      "totalSales": 1850000,
      "totalTransactions": 8,
      "status": "closed",
      "notes": "...",
      "opener": {
        "id": "uuid",
        "name": "Ani Wijaya",
        "position": "Kasir Senior"
      },
      "closer": {
        "id": "uuid",
        "name": "Ani Wijaya",
        "position": "Kasir Senior"
      },
      "handovers": [...]
    }
  ],
  "total": 100,
  "limit": 50,
  "offset": 0
}
```

### 2. Open New Shift
**Endpoint:** `POST /api/pos/shifts`

**Request Body:**
```json
{
  "shiftName": "Siang",
  "startTime": "14:00:00",
  "endTime": "22:00:00",
  "initialCashAmount": 2000000,
  "notes": "Optional notes",
  "employeeId": "uuid"
}
```

**Response:**
```json
{
  "message": "Shift opened successfully",
  "shift": {
    "id": "uuid",
    "shiftName": "Siang",
    "status": "open",
    ...
  }
}
```

### 3. Close Shift
**Endpoint:** `POST /api/pos/shifts/:id/close`

**Request Body:**
```json
{
  "finalCashAmount": 4200000,
  "closedBy": "uuid",
  "notes": "Optional closing notes"
}
```

**Response:**
```json
{
  "message": "Shift closed successfully",
  "shift": {
    "id": "uuid",
    "status": "closed",
    "finalCashAmount": 4200000,
    "expectedCashAmount": 3850000,
    "cashDifference": 350000,
    ...
  }
}
```

### 4. Shift Handover
**Endpoint:** `POST /api/pos/shifts/:id/handover`

**Request Body:**
```json
{
  "handoverFrom": "uuid",
  "handoverTo": "uuid",
  "finalCashAmount": 3750000,
  "notes": "Optional handover notes"
}
```

**Response:**
```json
{
  "message": "Shift handover completed successfully",
  "handover": {
    "id": "uuid",
    "shiftId": "uuid",
    "handoverFrom": "uuid",
    "handoverTo": "uuid",
    "handoverAt": "2025-04-23T18:00:00Z",
    "finalCashAmount": 3750000,
    "status": "completed",
    "handoverFromEmployee": {...},
    "handoverToEmployee": {...}
  }
}
```

### 5. Export Shift Logs
**Endpoint:** `GET /api/pos/shifts/logs/export`

**Query Parameters:**
- `startDate` (optional): Start date for export (YYYY-MM-DD)
- `endDate` (optional): End date for export (YYYY-MM-DD)
- `format` (optional): Export format (`json` | `csv`) (default: json)

**Response (JSON):**
```json
{
  "shifts": [...]
}
```

**Response (CSV):**
```
Content-Type: text/csv
Content-Disposition: attachment; filename=shift_log_2025-04-23.csv

Tanggal,Shift,Status,Dibuka Oleh,Jabatan,...
```

---

## Transaction Management

### 1. Get All Transactions
**Endpoint:** `GET /api/pos/transactions`

**Query Parameters:**
- `shiftId` (optional): Filter by shift ID
- `cashierId` (optional): Filter by cashier ID
- `status` (optional): Filter by status (`pending` | `completed` | `cancelled` | `refunded`)
- `startDate` (optional): Start date filter
- `endDate` (optional): End date filter
- `limit` (optional): Number of results (default: 50)
- `offset` (optional): Pagination offset (default: 0)
- `search` (optional): Search by transaction number or customer name

**Response:**
```json
{
  "transactions": [
    {
      "id": "uuid",
      "transactionNumber": "TRX202504230001",
      "shiftId": "uuid",
      "customerId": "uuid",
      "customerName": "Budi Santoso",
      "cashierId": "uuid",
      "transactionDate": "2025-04-23T14:30:00Z",
      "subtotal": 450000,
      "discount": 0,
      "tax": 0,
      "total": 450000,
      "paymentMethod": "Cash",
      "paidAmount": 500000,
      "changeAmount": 50000,
      "status": "completed",
      "cashier": {
        "id": "uuid",
        "name": "Ani Wijaya",
        "position": "Kasir Senior"
      },
      "items": [
        {
          "id": "uuid",
          "productId": "uuid",
          "productName": "Paracetamol 500mg",
          "productSku": "MED-001",
          "quantity": 2,
          "unitPrice": 15000,
          "discount": 0,
          "subtotal": 30000
        }
      ]
    }
  ],
  "total": 150,
  "limit": 50,
  "offset": 0
}
```

### 2. Get Transaction by ID
**Endpoint:** `GET /api/pos/transactions/:id`

**Response:**
```json
{
  "transaction": {
    "id": "uuid",
    "transactionNumber": "TRX202504230001",
    ...
    "items": [...]
  }
}
```

### 3. Create Transaction
**Endpoint:** `POST /api/pos/transactions`

**Request Body:**
```json
{
  "shiftId": "uuid",
  "customerId": "uuid",
  "customerName": "Budi Santoso",
  "cashierId": "uuid",
  "items": [
    {
      "productId": "uuid",
      "productName": "Paracetamol 500mg",
      "productSku": "MED-001",
      "quantity": 2,
      "unitPrice": 15000,
      "discount": 0
    }
  ],
  "paymentMethod": "Cash",
  "paidAmount": 500000,
  "discount": 0,
  "tax": 0,
  "notes": "Optional notes"
}
```

**Response:**
```json
{
  "message": "Transaction created successfully",
  "transaction": {
    "id": "uuid",
    "transactionNumber": "TRX202504230001",
    "total": 450000,
    "changeAmount": 50000,
    ...
  }
}
```

---

## Error Responses

All endpoints may return the following error responses:

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
  "error": "Shift not found"
}
```

### 500 Internal Server Error
```json
{
  "error": "Internal server error"
}
```

---

## Usage Examples

### Example 1: Open a new shift
```javascript
const response = await fetch('/api/pos/shifts', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    shiftName: 'Siang',
    startTime: '14:00:00',
    endTime: '22:00:00',
    initialCashAmount: 2000000,
    employeeId: 'employee-uuid'
  })
});

const data = await response.json();
console.log(data.shift);
```

### Example 2: Create a transaction
```javascript
const response = await fetch('/api/pos/transactions', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    shiftId: 'shift-uuid',
    cashierId: 'cashier-uuid',
    customerName: 'Budi Santoso',
    items: [
      {
        productId: 'product-uuid',
        productName: 'Paracetamol 500mg',
        productSku: 'MED-001',
        quantity: 2,
        unitPrice: 15000
      }
    ],
    paymentMethod: 'Cash',
    paidAmount: 50000
  })
});

const data = await response.json();
console.log(data.transaction);
```

### Example 3: Export shift logs
```javascript
// Export as CSV
const response = await fetch('/api/pos/shifts/logs/export?startDate=2025-04-01&endDate=2025-04-30&format=csv');
const blob = await response.blob();
const url = window.URL.createObjectURL(blob);
const a = document.createElement('a');
a.href = url;
a.download = 'shift_log.csv';
a.click();
```
