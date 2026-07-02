# Inventory Management API Documentation

## Overview
Comprehensive API documentation for Inventory Management system including stock management, purchase orders, sales orders, goods receipt, and stock adjustments.

## Base URL
```
/api/inventory
```

---

## Stock Management

### 1. Get Stock List
**Endpoint:** `GET /api/inventory/stock`

**Query Parameters:**
- `branchId` (optional): Filter by branch
- `productId` (optional): Filter by product
- `lowStock` (optional): Show only low stock items (`true`)
- `search` (optional): Search by product name/SKU/barcode
- `limit` (optional): Results per page (default: 50)
- `offset` (optional): Pagination offset

**Response:**
```json
{
  "stocks": [
    {
      "id": "uuid",
      "productId": "uuid",
      "branchId": "uuid",
      "quantity": 150,
      "reservedQuantity": 20,
      "availableQuantity": 130,
      "minimumStock": 50,
      "reorderPoint": 75,
      "averageCost": 50000,
      "totalValue": 7500000,
      "product": {
        "name": "Product Name",
        "sku": "SKU001"
      }
    }
  ],
  "total": 100,
  "summary": {
    "totalProducts": 100,
    "totalQuantity": 15000,
    "totalValue": 750000000,
    "lowStockCount": 15
  }
}
```

### 2. Update Stock Settings
**Endpoint:** `PUT /api/inventory/stock`

**Request Body:**
```json
{
  "id": "uuid",
  "minimumStock": 50,
  "maximumStock": 500,
  "reorderPoint": 75,
  "reorderQuantity": 200
}
```

---

## Stock Movement

### 1. Get Stock Movements
**Endpoint:** `GET /api/inventory/stock/movements`

**Query Parameters:**
- `productId` (optional)
- `branchId` (optional)
- `movementType` (optional): `in`, `out`, `transfer`, `adjustment`, etc.
- `startDate` (optional)
- `endDate` (optional)
- `limit`, `offset`

**Response:**
```json
{
  "movements": [
    {
      "id": "uuid",
      "productId": "uuid",
      "movementType": "purchase",
      "quantity": 100,
      "unitCost": 50000,
      "totalCost": 5000000,
      "referenceType": "purchase_order",
      "referenceNumber": "PO260001",
      "movementDate": "2026-01-18",
      "balanceBefore": 50,
      "balanceAfter": 150,
      "product": {
        "name": "Product Name"
      }
    }
  ],
  "total": 50
}
```

### 2. Create Stock Movement
**Endpoint:** `POST /api/inventory/stock/movements`

**Request Body:**
```json
{
  "productId": "uuid",
  "branchId": "uuid",
  "movementType": "in",
  "quantity": 100,
  "unitCost": 50000,
  "referenceType": "manual",
  "batchNumber": "BATCH001",
  "expiryDate": "2027-01-18",
  "notes": "Manual stock in",
  "performedBy": "employee-uuid"
}
```

---

## Purchase Order Management

### 1. Get Purchase Orders
**Endpoint:** `GET /api/inventory/purchase-orders`

**Query Parameters:**
- `supplierId` (optional)
- `status` (optional): `draft`, `pending`, `approved`, `received`, etc.
- `startDate`, `endDate` (optional)
- `limit`, `offset`

**Response:**
```json
{
  "purchaseOrders": [
    {
      "id": "uuid",
      "poNumber": "PO260001",
      "supplierId": "uuid",
      "orderDate": "2026-01-18",
      "status": "approved",
      "totalAmount": 10000000,
      "items": [
        {
          "productId": "uuid",
          "quantity": 100,
          "unitPrice": 50000,
          "receivedQuantity": 0
        }
      ]
    }
  ],
  "total": 25,
  "summary": {
    "totalOrders": 25,
    "totalValue": 250000000,
    "pendingOrders": 5,
    "approvedOrders": 10
  }
}
```

### 2. Create Purchase Order
**Endpoint:** `POST /api/inventory/purchase-orders`

**Request Body:**
```json
{
  "supplierId": "uuid",
  "branchId": "uuid",
  "expectedDeliveryDate": "2026-01-25",
  "items": [
    {
      "productId": "uuid",
      "quantity": 100,
      "unitPrice": 50000,
      "taxRate": 11,
      "discountRate": 0
    }
  ],
  "paymentTerms": "Net 30",
  "notes": "Urgent order",
  "createdBy": "employee-uuid"
}
```

### 3. Approve Purchase Order
**Endpoint:** `POST /api/inventory/purchase-orders/:id/approve`

**Request Body:**
```json
{
  "approvedBy": "employee-uuid"
}
```

---

## Goods Receipt

### 1. Create Goods Receipt
**Endpoint:** `POST /api/inventory/goods-receipts`

**Request Body:**
```json
{
  "purchaseOrderId": "uuid",
  "items": [
    {
      "purchaseOrderItemId": "uuid",
      "receivedQuantity": 100,
      "acceptedQuantity": 98,
      "rejectedQuantity": 2,
      "batchNumber": "BATCH001",
      "expiryDate": "2027-01-18",
      "manufacturingDate": "2026-01-01",
      "notes": "Good condition",
      "rejectionReason": "2 units damaged"
    }
  ],
  "receivedBy": "employee-uuid",
  "invoiceNumber": "INV-001",
  "deliveryNote": "DN-001",
  "notes": "Delivery completed"
}
```

**Response:**
```json
{
  "message": "Goods receipt created successfully",
  "goodsReceipt": {
    "id": "uuid",
    "grNumber": "GR260001",
    "purchaseOrderId": "uuid",
    "receiptDate": "2026-01-18",
    "status": "completed"
  }
}
```

**Note:** This endpoint automatically:
- Updates stock quantities
- Creates stock movements
- Updates PO item received quantities
- Updates PO status to 'partial' or 'received'
- Calculates weighted average cost

---

## Sales Order Management

### 1. Get Sales Orders
**Endpoint:** `GET /api/inventory/sales-orders`

**Query Parameters:**
- `customerId` (optional)
- `status` (optional)
- `startDate`, `endDate` (optional)
- `limit`, `offset`

**Response:**
```json
{
  "salesOrders": [
    {
      "id": "uuid",
      "soNumber": "SO260001",
      "customerId": "uuid",
      "orderDate": "2026-01-18",
      "status": "confirmed",
      "totalAmount": 5000000,
      "customer": {
        "name": "Customer Name"
      },
      "items": [
        {
          "productId": "uuid",
          "quantity": 50,
          "unitPrice": 100000,
          "shippedQuantity": 0
        }
      ]
    }
  ],
  "total": 30,
  "summary": {
    "totalOrders": 30,
    "totalValue": 150000000,
    "pendingOrders": 8,
    "completedOrders": 15
  }
}
```

### 2. Create Sales Order
**Endpoint:** `POST /api/inventory/sales-orders`

**Request Body:**
```json
{
  "customerId": "uuid",
  "branchId": "uuid",
  "requiredDate": "2026-01-25",
  "items": [
    {
      "productId": "uuid",
      "quantity": 50,
      "unitPrice": 100000,
      "taxRate": 11,
      "discountRate": 5
    }
  ],
  "shippingAddress": "Customer address",
  "shippingMethod": "JNE Regular",
  "shippingCost": 50000,
  "notes": "Handle with care",
  "createdBy": "employee-uuid"
}
```

**Response:**
```json
{
  "message": "Sales order created successfully",
  "salesOrder": {
    "id": "uuid",
    "soNumber": "SO260001",
    "status": "draft",
    "totalAmount": 5000000
  }
}
```

**Note:** This endpoint automatically:
- Checks stock availability
- Reserves stock for the order
- Calculates totals with tax and discount

---

## Stock Adjustment

### 1. Create Stock Adjustment
**Endpoint:** `POST /api/inventory/stock-adjustments`

**Request Body:**
```json
{
  "branchId": "uuid",
  "adjustmentType": "count",
  "items": [
    {
      "productId": "uuid",
      "physicalQuantity": 145,
      "batchNumber": "BATCH001",
      "expiryDate": "2027-01-18",
      "notes": "Physical count result"
    }
  ],
  "reason": "Monthly stock count",
  "notes": "Adjustment notes",
  "createdBy": "employee-uuid",
  "autoApprove": true
}
```

**Response:**
```json
{
  "message": "Stock adjustment created successfully",
  "adjustment": {
    "id": "uuid",
    "adjustmentNumber": "ADJ260001",
    "status": "approved",
    "adjustmentDate": "2026-01-18"
  }
}
```

**Adjustment Types:**
- `count`: Physical stock count
- `damage`: Damaged goods
- `expired`: Expired products
- `lost`: Lost/stolen items
- `found`: Found items
- `correction`: System correction

---

## Integration with POS

### Update POS Transaction to Deduct Stock

When creating a POS transaction, the system should automatically:

1. Check stock availability
2. Deduct stock quantity
3. Create stock movement record

**Example Integration:**
```typescript
// In POS transaction creation
const posTransaction = await createPosTransaction({...});

// For each item in transaction
for (const item of items) {
  await createStockMovement({
    productId: item.productId,
    branchId: transaction.branchId,
    movementType: 'sale',
    quantity: -item.quantity, // Negative for OUT
    unitCost: item.cost,
    referenceType: 'pos_transaction',
    referenceId: posTransaction.id,
    referenceNumber: posTransaction.transactionNumber,
    performedBy: transaction.employeeId
  });
}
```

---

## Low Stock Alerts

### Get Low Stock Items
**Endpoint:** `GET /api/inventory/stock?lowStock=true`

Returns all products where `quantity <= minimumStock`

### Reorder Suggestions
Products with `quantity <= reorderPoint` should trigger purchase order creation.

---

## Batch & Expiry Tracking

All stock movements support:
- **Batch Number**: Track product batches
- **Expiry Date**: Monitor product expiration
- **Manufacturing Date**: Track production date

### Get Expiring Products
```typescript
// Filter stock movements by expiry date
GET /api/inventory/stock/movements?expiryDate[lte]=2026-02-18
```

---

## Error Responses

### 400 Bad Request
```json
{
  "error": "Insufficient stock",
  "available": 50,
  "requested": 100
}
```

### 404 Not Found
```json
{
  "error": "Stock record not found for product"
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

## Best Practices

1. **Stock Movements**: Always create stock movement records for audit trail
2. **Transactions**: Use database transactions for multi-step operations
3. **Validation**: Check stock availability before creating sales orders
4. **Batch Tracking**: Always include batch numbers for pharmaceutical products
5. **Expiry Monitoring**: Set up automated alerts for expiring products
6. **Average Cost**: System automatically calculates weighted average cost
7. **Reserved Stock**: Sales orders automatically reserve stock

---

## Workflow Examples

### Purchase Order to Stock IN
1. Create Purchase Order → `POST /api/inventory/purchase-orders`
2. Approve PO → `POST /api/inventory/purchase-orders/:id/approve`
3. Receive Goods → `POST /api/inventory/goods-receipts`
   - Automatically updates stock
   - Creates stock movements
   - Updates PO status

### Sales Order to Stock OUT
1. Create Sales Order → `POST /api/inventory/sales-orders`
   - Automatically reserves stock
2. Process shipment (future endpoint)
   - Deduct reserved stock
   - Create stock movement
   - Update SO status

### Stock Adjustment
1. Physical Count → `POST /api/inventory/stock-adjustments`
   - Compare system vs physical
   - Auto-approve or require approval
   - Updates stock if approved

---

## Database Schema Summary

**Tables:**
- `stocks` - Current stock levels per product/branch
- `stock_movements` - All stock transactions (audit trail)
- `purchase_orders` - Purchase orders
- `purchase_order_items` - PO line items
- `goods_receipts` - Goods receipt documents
- `goods_receipt_items` - GR line items
- `sales_orders` - Sales orders
- `sales_order_items` - SO line items
- `stock_adjustments` - Stock adjustment documents
- `stock_adjustment_items` - Adjustment line items

**Key Relationships:**
- Stock ↔ Product (1:N per branch)
- PurchaseOrder ↔ GoodsReceipt (1:N)
- StockMovement → Product, PurchaseOrder, SalesOrder (audit trail)

---

## Performance Considerations

1. **Indexes**: Created on frequently queried fields
2. **Pagination**: Use limit/offset for large datasets
3. **Batch Operations**: Use transactions for consistency
4. **Caching**: Consider caching stock levels for read-heavy operations

---

**Prepared by:** Backend Development Team  
**Last Updated:** January 18, 2026  
**Version:** 1.0
