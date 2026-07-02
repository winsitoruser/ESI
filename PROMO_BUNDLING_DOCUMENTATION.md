# Promo Bundling & Product-Specific - Advanced Documentation

## 📋 Overview

Sistem promo dinamis yang mendukung:
- **Product-Specific Promos** - Diskon untuk produk tertentu
- **Bundle Promos** - Paket bundling produk dengan harga spesial
- **Quantity-Based Discounts** - Diskon progresif berdasarkan jumlah
- **Buy X Get Y** - Beli produk tertentu dapat gratis produk lain
- **Category Promos** - Diskon untuk kategori produk
- **Stock Integration** - Integrasi dengan inventory untuk validasi stok

---

## 🗄️ Database Schema

### **1. Table: promo_products**

Menyimpan produk-produk yang eligible untuk promo tertentu.

```sql
CREATE TABLE promo_products (
  id UUID PRIMARY KEY,
  promoId UUID REFERENCES promos(id),
  productId UUID NOT NULL,
  productName VARCHAR(200),
  productSku VARCHAR(100),
  discountType ENUM('percentage', 'fixed', 'override_price'),
  discountValue DECIMAL(15,2),
  minQuantity INT DEFAULT 1,
  maxQuantity INT,
  overridePrice DECIMAL(15,2),
  quantityTiers JSON,
  checkStock BOOLEAN DEFAULT true,
  isActive BOOLEAN DEFAULT true
);
```

**Quantity Tiers Format:**
```json
[
  { "minQty": 2, "maxQty": 5, "discount": 10 },
  { "minQty": 6, "maxQty": 10, "discount": 15 },
  { "minQty": 11, "discount": 20 }
]
```

---

### **2. Table: promo_bundles**

Menyimpan konfigurasi bundle promo.

```sql
CREATE TABLE promo_bundles (
  id UUID PRIMARY KEY,
  promoId UUID REFERENCES promos(id),
  name VARCHAR(200),
  description TEXT,
  bundleType ENUM('fixed_bundle', 'mix_match', 'buy_x_get_y', 'quantity_discount'),
  bundleProducts JSON,
  minQuantity INT,
  maxQuantity INT,
  bundlePrice DECIMAL(15,2),
  discountType ENUM('percentage', 'fixed', 'free_item'),
  discountValue DECIMAL(15,2),
  requireAllProducts BOOLEAN DEFAULT true,
  checkStock BOOLEAN DEFAULT true,
  isActive BOOLEAN DEFAULT true
);
```

**Bundle Products Format:**
```json
[
  {
    "productId": "uuid-1",
    "productName": "Product A",
    "quantity": 2,
    "isFree": false,
    "discountPercent": 0
  },
  {
    "productId": "uuid-2",
    "productName": "Product B",
    "quantity": 1,
    "isFree": true,
    "discountPercent": 0
  }
]
```

---

### **3. Table: promo_categories**

Menyimpan kategori produk yang eligible untuk promo.

```sql
CREATE TABLE promo_categories (
  id UUID PRIMARY KEY,
  promoId UUID REFERENCES promos(id),
  categoryId UUID NOT NULL,
  categoryName VARCHAR(200),
  discountType ENUM('percentage', 'fixed'),
  discountValue DECIMAL(15,2),
  minQuantity INT DEFAULT 1,
  maxDiscount DECIMAL(15,2),
  allowMixMatch BOOLEAN DEFAULT true,
  isActive BOOLEAN DEFAULT true
);
```

---

### **4. Updated: promos table**

Tambahan fields untuk mendukung promo dinamis:

```sql
ALTER TABLE promos ADD COLUMN promoScope ENUM('general', 'product_specific', 'category', 'bundle') DEFAULT 'general';
ALTER TABLE promos ADD COLUMN autoApply BOOLEAN DEFAULT false;
ALTER TABLE promos ADD COLUMN stackable BOOLEAN DEFAULT false;
ALTER TABLE promos ADD COLUMN priority INT DEFAULT 0;
```

---

## 🎯 Promo Types & Use Cases

### **1. Product-Specific Promo**

**Use Case:** Diskon 20% untuk produk tertentu

**Configuration:**
```json
{
  "promoId": "promo-uuid",
  "productId": "product-uuid",
  "productName": "Laptop ASUS ROG",
  "discountType": "percentage",
  "discountValue": 20,
  "minQuantity": 1,
  "checkStock": true
}
```

**Result:** Customer beli 1 laptop dapat diskon 20%

---

### **2. Quantity-Based Discount**

**Use Case:** Beli 2-5 dapat 10%, 6-10 dapat 15%, 11+ dapat 20%

**Configuration:**
```json
{
  "promoId": "promo-uuid",
  "productId": "product-uuid",
  "productName": "Kaos Polos",
  "discountType": "percentage",
  "discountValue": 0,
  "quantityTiers": [
    { "minQty": 2, "maxQty": 5, "discount": 10 },
    { "minQty": 6, "maxQty": 10, "discount": 15 },
    { "minQty": 11, "discount": 20 }
  ]
}
```

**Result:** 
- Beli 3 kaos → 10% off
- Beli 8 kaos → 15% off
- Beli 15 kaos → 20% off

---

### **3. Override Price**

**Use Case:** Harga spesial Rp 50,000 (normal Rp 75,000)

**Configuration:**
```json
{
  "promoId": "promo-uuid",
  "productId": "product-uuid",
  "productName": "Sepatu Sneakers",
  "discountType": "override_price",
  "overridePrice": 50000,
  "minQuantity": 1
}
```

**Result:** Customer beli sepatu dengan harga Rp 50,000

---

### **4. Fixed Bundle**

**Use Case:** Paket Laptop + Mouse + Keyboard = Rp 10 juta (hemat Rp 2 juta)

**Configuration:**
```json
{
  "name": "Paket Komputer Lengkap",
  "bundleType": "fixed_bundle",
  "bundleProducts": [
    { "productId": "laptop-uuid", "quantity": 1 },
    { "productId": "mouse-uuid", "quantity": 1 },
    { "productId": "keyboard-uuid", "quantity": 1 }
  ],
  "bundlePrice": 10000000,
  "requireAllProducts": true
}
```

**Result:** Customer beli 3 produk dengan harga paket Rp 10 juta

---

### **5. Buy X Get Y**

**Use Case:** Beli 2 Shampoo gratis 1 Conditioner

**Configuration:**
```json
{
  "name": "Buy 2 Get 1 Free",
  "bundleType": "buy_x_get_y",
  "bundleProducts": [
    { "productId": "shampoo-uuid", "quantity": 2, "isFree": false },
    { "productId": "conditioner-uuid", "quantity": 1, "isFree": true }
  ],
  "discountType": "free_item",
  "requireAllProducts": true
}
```

**Result:** Customer beli 2 shampoo, conditioner gratis

---

### **6. Mix & Match Bundle**

**Use Case:** Beli 3 produk dari kategori Snack dapat diskon 15%

**Configuration:**
```json
{
  "name": "Mix 3 Snacks",
  "bundleType": "mix_match",
  "bundleProducts": [
    { "productId": "snack-1-uuid", "quantity": 1 },
    { "productId": "snack-2-uuid", "quantity": 1 },
    { "productId": "snack-3-uuid", "quantity": 1 }
  ],
  "discountType": "percentage",
  "discountValue": 15,
  "requireAllProducts": false
}
```

**Result:** Customer pilih 3 snack apapun dapat 15% off

---

### **7. Quantity Discount Bundle**

**Use Case:** Beli 5+ produk dari bundle dapat 20% off

**Configuration:**
```json
{
  "name": "Bulk Purchase Discount",
  "bundleType": "quantity_discount",
  "bundleProducts": [
    { "productId": "product-1-uuid", "quantity": 1 },
    { "productId": "product-2-uuid", "quantity": 1 },
    { "productId": "product-3-uuid", "quantity": 1 }
  ],
  "minQuantity": 5,
  "discountType": "percentage",
  "discountValue": 20
}
```

**Result:** Customer beli total 5+ item dari bundle dapat 20% off

---

## 🌐 API Endpoints

### **1. GET /api/promo-voucher/promo-products**

Get all product-specific promos.

**Query Parameters:**
- `promoId` - Filter by promo ID
- `productId` - Filter by product ID

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "promoId": "promo-uuid",
      "productId": "product-uuid",
      "productName": "Laptop ASUS",
      "discountType": "percentage",
      "discountValue": 20,
      "minQuantity": 1
    }
  ]
}
```

---

### **2. POST /api/promo-voucher/promo-products**

Add product to promo.

**Request Body:**
```json
{
  "promoId": "promo-uuid",
  "productId": "product-uuid",
  "productName": "Laptop ASUS",
  "productSku": "LAP-001",
  "discountType": "percentage",
  "discountValue": 20,
  "minQuantity": 1,
  "maxQuantity": 10,
  "checkStock": true
}
```

---

### **3. POST /api/promo-voucher/promo-products?bulk=true**

Bulk add products to promo.

**Request Body:**
```json
{
  "promoId": "promo-uuid",
  "products": [
    {
      "productId": "product-1-uuid",
      "productName": "Product 1",
      "discountType": "percentage",
      "discountValue": 15
    },
    {
      "productId": "product-2-uuid",
      "productName": "Product 2",
      "discountType": "fixed",
      "discountValue": 50000
    }
  ]
}
```

---

### **4. GET /api/promo-voucher/bundles**

Get all bundle promos.

**Query Parameters:**
- `promoId` - Filter by promo ID
- `bundleType` - Filter by bundle type

---

### **5. POST /api/promo-voucher/bundles**

Create bundle promo.

**Request Body:**
```json
{
  "promoId": "promo-uuid",
  "name": "Paket Komputer",
  "description": "Laptop + Mouse + Keyboard",
  "bundleType": "fixed_bundle",
  "bundleProducts": [
    { "productId": "laptop-uuid", "quantity": 1 },
    { "productId": "mouse-uuid", "quantity": 1 },
    { "productId": "keyboard-uuid", "quantity": 1 }
  ],
  "bundlePrice": 10000000,
  "requireAllProducts": true,
  "checkStock": true
}
```

---

### **6. GET /api/promo-voucher/products-list**

Get available products for selection.

**Query Parameters:**
- `search` - Search by name or SKU
- `category` - Filter by category
- `inStock` - Only show products in stock

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "name": "Laptop ASUS ROG",
      "sku": "LAP-001",
      "price": 15000000,
      "stock": 10,
      "category": "Electronics",
      "image": "laptop.jpg"
    }
  ]
}
```

---

## 🧮 Promo Calculation Logic

### **Product-Specific Calculation:**

```typescript
// Example: 20% off for Laptop
const cartItem = {
  productId: "laptop-uuid",
  quantity: 2,
  price: 15000000
};

const promoProduct = {
  discountType: "percentage",
  discountValue: 20,
  minQuantity: 1
};

// Calculation:
const itemTotal = 15000000 * 2 = 30000000
const discount = (30000000 * 20) / 100 = 6000000
const finalPrice = 30000000 - 6000000 = 24000000
```

---

### **Quantity Tier Calculation:**

```typescript
// Example: Buy 8 items get 15% off
const cartItem = {
  productId: "kaos-uuid",
  quantity: 8,
  price: 50000
};

const quantityTiers = [
  { minQty: 2, maxQty: 5, discount: 10 },
  { minQty: 6, maxQty: 10, discount: 15 },
  { minQty: 11, discount: 20 }
];

// Find applicable tier: 6-10 → 15%
const itemTotal = 50000 * 8 = 400000
const discount = (400000 * 15) / 100 = 60000
const finalPrice = 400000 - 60000 = 340000
```

---

### **Bundle Calculation:**

```typescript
// Example: Fixed bundle price
const cart = [
  { productId: "laptop-uuid", quantity: 1, price: 12000000 },
  { productId: "mouse-uuid", quantity: 1, price: 500000 },
  { productId: "keyboard-uuid", quantity: 1, price: 1000000 }
];

const bundle = {
  bundleType: "fixed_bundle",
  bundlePrice: 10000000
};

// Calculation:
const normalTotal = 12000000 + 500000 + 1000000 = 13500000
const bundlePrice = 10000000
const discount = 13500000 - 10000000 = 3500000
```

---

## 🔄 Integration Flow

### **At Checkout:**

```
1. Customer adds products to cart
    ↓
2. System checks applicable promos
    ↓
3. Calculate all possible discounts:
   - Product-specific promos
   - Bundle promos
   - Category promos
    ↓
4. Select best promo (highest discount)
    ↓
5. Validate stock availability
    ↓
6. Apply discount to cart
    ↓
7. Show savings to customer
```

---

### **Stock Validation:**

```typescript
// Before applying bundle promo
async function validateBundleStock(bundleProducts) {
  for (const bp of bundleProducts) {
    const product = await Product.findByPk(bp.productId);
    if (!product || product.stock < bp.quantity) {
      return { available: false, product: bp.productId };
    }
  }
  return { available: true };
}
```

---

## 📊 Frontend Implementation

### **Product Selector Component:**

```tsx
// Multi-select product picker
<ProductSelector
  selectedProducts={selectedProducts}
  onProductsChange={setSelectedProducts}
  onDiscountChange={(productId, discount) => {
    // Update discount for specific product
  }}
/>
```

### **Bundle Creator Component:**

```tsx
// Bundle configuration UI
<BundleCreator
  bundleType="fixed_bundle"
  products={bundleProducts}
  onProductAdd={(product) => {
    // Add product to bundle
  }}
  onProductRemove={(productId) => {
    // Remove product from bundle
  }}
  bundlePrice={bundlePrice}
  onBundlePriceChange={setBundlePrice}
/>
```

---

## ✅ Testing Scenarios

### **Test 1: Product-Specific Promo**

1. Create promo with 20% off for "Laptop ASUS"
2. Add laptop to cart
3. Verify 20% discount applied
4. Add 2 laptops
5. Verify discount applied to both

---

### **Test 2: Quantity Tiers**

1. Create promo with tiers: 2-5 (10%), 6-10 (15%), 11+ (20%)
2. Add 3 items → Verify 10% discount
3. Add 8 items → Verify 15% discount
4. Add 12 items → Verify 20% discount

---

### **Test 3: Fixed Bundle**

1. Create bundle: Laptop + Mouse + Keyboard = Rp 10M
2. Add all 3 products to cart
3. Verify bundle price applied
4. Remove 1 product
5. Verify bundle not applied

---

### **Test 4: Buy X Get Y**

1. Create promo: Buy 2 Shampoo Get 1 Conditioner Free
2. Add 2 shampoos to cart
3. Add 1 conditioner
4. Verify conditioner is free

---

### **Test 5: Stock Validation**

1. Create bundle with product (stock = 5)
2. Try to apply bundle requiring 10 units
3. Verify error: "Insufficient stock"

---

## 🎯 Business Rules

1. **Priority System:**
   - Higher priority promos applied first
   - Auto-apply promos run automatically
   - Manual promos require code entry

2. **Stackability:**
   - Non-stackable: Only one promo per transaction
   - Stackable: Multiple promos can combine

3. **Stock Management:**
   - Check stock before applying promo
   - Reserve stock for bundle items
   - Auto-disable promo when stock depleted

4. **Validation:**
   - Minimum quantity requirements
   - Maximum quantity limits
   - Date range validation
   - Customer eligibility

---

## 📈 Analytics & Reporting

**Track:**
- Most popular bundles
- Conversion rate per promo type
- Average discount per transaction
- Stock movement from promos
- Revenue impact

---

**Last Updated:** February 4, 2026  
**Version:** 2.0.0  
**Status:** ✅ Advanced Promo System Ready
