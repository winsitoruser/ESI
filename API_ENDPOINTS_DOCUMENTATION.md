# 📚 API Endpoints Documentation - BEDAGANG Inventory System

**Created:** 25 Januari 2026  
**Status:** ✅ All Critical Endpoints Implemented

---

## 🎯 OVERVIEW

Dokumentasi lengkap untuk semua API endpoints yang baru dibuat untuk sistem inventory.

---

## 📊 INVENTORY ENDPOINTS

### **1. GET /api/inventory/stats**

**Deskripsi:** Mendapatkan statistik dashboard inventory

**Method:** `GET`

**Response:**
```json
{
  "success": true,
  "data": {
    "totalProducts": 342,
    "totalValue": 125000000,
    "lowStock": 23,
    "outOfStock": 5,
    "categories": 12,
    "suppliers": 8,
    "recentChanges": {
      "products": 12,
      "valuePercentage": 8.5
    }
  }
}
```

**Features:**
- ✅ Real-time product count
- ✅ Total inventory value calculation
- ✅ Low stock & out of stock counts
- ✅ Categories & suppliers count
- ✅ Month-over-month comparison

---

### **2. GET /api/inventory/activities**

**Deskripsi:** Mendapatkan aktivitas inventory terbaru

**Method:** `GET`

**Query Parameters:**
- `limit` (optional) - Jumlah aktivitas (default: 20)
- `type` (optional) - Filter by type: in, out, adjustment, transfer
- `product_id` (optional) - Filter by product ID

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "activity-1",
      "type": "in",
      "product_id": "123",
      "product_name": "Kopi Arabica Premium",
      "product_sku": "KOP-001",
      "quantity": 50,
      "current_stock": 100,
      "user": "Admin",
      "timestamp": "2024-01-25T10:30:00Z",
      "notes": "Penerimaan stock Kopi Arabica Premium sebanyak 50 unit"
    }
  ],
  "total": 20
}
```

**Activity Types:**
- `in` - Stock masuk
- `out` - Stock keluar
- `adjustment` - Penyesuaian
- `transfer` - Transfer antar gudang

---

### **3. GET /api/inventory/low-stock**

**Deskripsi:** Mendapatkan produk dengan stock rendah atau habis

**Method:** `GET`

**Query Parameters:**
- `status` (optional) - Filter: all, low, out, critical (default: all)
- `limit` (optional) - Jumlah produk (default: 50)
- `category` (optional) - Filter by category

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "1",
      "name": "Minyak Goreng 2L",
      "sku": "MIN-001",
      "stock": 2,
      "minStock": 15,
      "reorderPoint": 10,
      "daysOfStock": 0,
      "reorderQuantity": 13,
      "urgency": "urgent",
      "estimatedCost": 364000,
      "supplier": {
        "id": "sup-1",
        "name": "PT Minyak Sejahtera",
        "contact": "021-1234567"
      }
    }
  ],
  "summary": {
    "total": 28,
    "outOfStock": 5,
    "lowStock": 23,
    "critical": 15,
    "totalReorderCost": 15000000
  }
}
```

**Urgency Levels:**
- `urgent` - Stock habis (0)
- `high` - Stock <= reorder point
- `medium` - Stock <= min stock

---

## 📦 PRODUCT ENDPOINTS

### **4. GET /api/products/:id**

**Deskripsi:** Mendapatkan detail produk lengkap

**Method:** `GET`

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "1",
    "name": "Kopi Arabica Premium 250g",
    "sku": "KOP-001",
    "category": "Minuman",
    "price": 45000,
    "stock": 50,
    "supplier": {
      "id": "sup-1",
      "name": "PT Kopi Nusantara",
      "contact": "021-9876543"
    },
    "recipe": null,
    "prices": [
      {
        "id": "price-1",
        "price_type": "tier_gold",
        "price": 40500,
        "discount_percentage": 10
      }
    ],
    "variants": [
      {
        "id": "var-1",
        "variant_name": "250g",
        "variant_type": "size",
        "price": 45000,
        "stock": 30
      }
    ]
  }
}
```

**Includes:**
- Product details
- Supplier information
- Recipe (if manufactured)
- Tiered prices
- Product variants

---

### **5. PUT /api/products/:id**

**Deskripsi:** Update produk

**Method:** `PUT`

**Request Body:**
```json
{
  "name": "Kopi Arabica Premium 250g",
  "price": 47000,
  "stock": 55,
  "min_stock": 10,
  "category": "Minuman",
  "supplier_id": "sup-1",
  "variants": [
    {
      "variant_name": "250g",
      "variant_type": "size",
      "price": 47000,
      "stock": 30
    }
  ],
  "tiered_prices": [
    {
      "price_type": "tier_gold",
      "tier_id": "tier-123",
      "price": 42300,
      "discount_percentage": 10,
      "min_quantity": 1
    }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "data": { /* updated product */ },
  "message": "Product updated successfully"
}
```

**Features:**
- ✅ Update all product fields
- ✅ Update variants (delete old, create new)
- ✅ Update tiered prices
- ✅ Validation

---

### **6. DELETE /api/products/:id**

**Deskripsi:** Hapus produk (soft delete)

**Method:** `DELETE`

**Response:**
```json
{
  "success": true,
  "message": "Product deleted successfully"
}
```

**Note:** Menggunakan soft delete (set `isActive = false`)

---

### **7. POST /api/products/export**

**Deskripsi:** Export produk ke Excel, PDF, atau CSV

**Method:** `POST`

**Request Body:**
```json
{
  "format": "excel",
  "filters": {
    "category": "Minuman",
    "stockStatus": "low",
    "priceMin": 10000,
    "priceMax": 100000
  },
  "fields": ["name", "sku", "category", "price", "stock", "supplier"]
}
```

**Parameters:**
- `format` - excel, pdf, atau csv
- `filters` (optional) - Filter produk
  - `category` - Filter by category
  - `supplier` - Filter by supplier ID
  - `stockStatus` - low, out, normal
  - `priceMin` - Minimum price
  - `priceMax` - Maximum price
- `fields` (optional) - Field yang di-export (default: all)

**Response:** File download (Excel/PDF/CSV)

**Supported Formats:**
- ✅ **Excel (.xlsx)** - Dengan styling & formatting
- ✅ **PDF (.pdf)** - Dengan table layout
- ✅ **CSV (.csv)** - Plain text format

---

### **8. POST /api/products/bulk**

**Deskripsi:** Bulk operations pada multiple produk

**Method:** `POST`

**Request Body:**
```json
{
  "action": "delete",
  "productIds": ["1", "2", "3"],
  "updateData": {
    "category": "Makanan",
    "supplier_id": "sup-2"
  }
}
```

**Supported Actions:**
- `delete` - Bulk delete (soft delete)
- `update` - Bulk update fields
- `activate` - Bulk activate products
- `deactivate` - Bulk deactivate products
- `update_category` - Update category
- `update_supplier` - Update supplier

**Response:**
```json
{
  "success": true,
  "message": "3 products deleted successfully",
  "affected": 3
}
```

**Allowed Update Fields:**
- category
- supplier_id
- min_stock
- max_stock
- reorder_point
- is_active
- markup_percentage

---

## 🔐 AUTHENTICATION

Semua endpoints memerlukan authentication (kecuali disebutkan lain).

**Headers:**
```
Authorization: Bearer <token>
Content-Type: application/json
```

---

## ⚠️ ERROR RESPONSES

### **400 Bad Request**
```json
{
  "success": false,
  "message": "Invalid request parameters"
}
```

### **404 Not Found**
```json
{
  "success": false,
  "message": "Product not found"
}
```

### **405 Method Not Allowed**
```json
{
  "success": false,
  "message": "Method GET not allowed"
}
```

### **500 Internal Server Error**
```json
{
  "success": false,
  "message": "Internal server error",
  "error": "Detailed error message (development only)"
}
```

---

## 📝 USAGE EXAMPLES

### **Example 1: Get Inventory Stats**
```javascript
const response = await fetch('/api/inventory/stats');
const data = await response.json();
console.log(data.data.totalProducts); // 342
```

### **Example 2: Get Low Stock Products**
```javascript
const response = await fetch('/api/inventory/low-stock?status=critical&limit=20');
const data = await response.json();
console.log(data.summary.critical); // 15
```

### **Example 3: Update Product**
```javascript
const response = await fetch('/api/products/123', {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    price: 50000,
    stock: 100
  })
});
const data = await response.json();
```

### **Example 4: Export to Excel**
```javascript
const response = await fetch('/api/products/export', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    format: 'excel',
    filters: { category: 'Minuman' }
  })
});
const blob = await response.blob();
const url = window.URL.createObjectURL(blob);
const a = document.createElement('a');
a.href = url;
a.download = 'products.xlsx';
a.click();
```

### **Example 5: Bulk Delete**
```javascript
const response = await fetch('/api/products/bulk', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    action: 'delete',
    productIds: ['1', '2', '3']
  })
});
const data = await response.json();
console.log(data.affected); // 3
```

---

## 🧪 TESTING

### **Test dengan cURL:**

```bash
# Get stats
curl http://localhost:3000/api/inventory/stats

# Get low stock
curl http://localhost:3000/api/inventory/low-stock?status=critical

# Get product detail
curl http://localhost:3000/api/products/1

# Update product
curl -X PUT http://localhost:3000/api/products/1 \
  -H "Content-Type: application/json" \
  -d '{"price": 50000, "stock": 100}'

# Delete product
curl -X DELETE http://localhost:3000/api/products/1

# Export to Excel
curl -X POST http://localhost:3000/api/products/export \
  -H "Content-Type: application/json" \
  -d '{"format": "excel"}' \
  --output products.xlsx

# Bulk delete
curl -X POST http://localhost:3000/api/products/bulk \
  -H "Content-Type: application/json" \
  -d '{"action": "delete", "productIds": ["1", "2"]}'
```

---

## 📊 ENDPOINT SUMMARY

| Endpoint | Method | Status | Description |
|----------|--------|--------|-------------|
| `/api/inventory/stats` | GET | ✅ Ready | Dashboard statistics |
| `/api/inventory/activities` | GET | ✅ Ready | Recent activities |
| `/api/inventory/low-stock` | GET | ✅ Ready | Low stock products |
| `/api/products/:id` | GET | ✅ Ready | Product detail |
| `/api/products/:id` | PUT | ✅ Ready | Update product |
| `/api/products/:id` | DELETE | ✅ Ready | Delete product |
| `/api/products/export` | POST | ✅ Ready | Export products |
| `/api/products/bulk` | POST | ✅ Ready | Bulk operations |

**Total:** 8 Endpoints ✅

---

## 🔄 NEXT STEPS

### **Recommended Enhancements:**

1. **Add Pagination** to all list endpoints
2. **Add Search** functionality
3. **Add Sorting** options
4. **Create Stock Movements Table** for proper activity tracking
5. **Add WebSocket** for real-time updates
6. **Add Rate Limiting** for security
7. **Add Request Validation** with Joi or Zod
8. **Add Unit Tests** for all endpoints

---

## 📞 SUPPORT

Untuk pertanyaan atau issues, hubungi development team.

---

**Dibuat oleh:** Cascade AI  
**Untuk:** BEDAGANG Cloud POS Development Team  
**Last Updated:** 25 Januari 2026
