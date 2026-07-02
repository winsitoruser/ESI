# ✅ Fitur Tambah Produk Baru di Purchase Order

**Date:** 25 Januari 2026, 02:10 AM  
**Feature:** Add New Product from PO Page  
**Status:** 🔴 **IMPLEMENTATION IN PROGRESS**

---

## 🎯 REQUIREMENT

User meminta fitur untuk menambahkan produk baru yang belum pernah ada di sistem, langsung dari halaman Create Purchase Order. Ini untuk kasus dimana staff ingin membeli produk untuk pertama kalinya.

---

## 💡 SOLUTION DESIGN

### **Feature: "Tambah Produk Baru" Button**

**Location:** Di halaman `/inventory/create-purchase-order`  
**Position:** Di atas product list, sebelum filters

**Flow:**
```
1. User clicks "Tambah Produk Baru" button
2. Modal opens with quick product creation form
3. User fills: Name, SKU, Category, Cost, Unit, Min Stock, Supplier
4. User clicks "Tambah Produk"
5. Product is created via POST /api/products
6. New product appears in product list
7. User can immediately add it to PO
```

---

## 🎨 UI DESIGN

### **Button Card:**
```
┌─────────────────────────────────────────────────────────┐
│ Produk Tidak Ditemukan?                    [+ Tambah    │
│ Tambahkan produk baru yang akan dibeli      Produk Baru]│
│ untuk pertama kali                                       │
└─────────────────────────────────────────────────────────┘
```

### **Modal Form:**
```
┌──────────────────────────────────────────────────────┐
│  + Tambah Produk Baru                            [X] │
├──────────────────────────────────────────────────────┤
│                                                      │
│  💡 Info: Produk yang ditambahkan akan langsung     │
│  tersedia di sistem dan dapat ditambahkan ke PO     │
│                                                      │
│  Nama Produk *          │ SKU *                     │
│  [________________]     │ [________________]        │
│                                                      │
│  Kategori               │ Harga Beli (Cost) *       │
│  [▼ Pilih Kategori]     │ [________________]        │
│                         │ Harga jual: Rp XXX        │
│                                                      │
│  Unit                   │ Stok Minimum              │
│  [▼ pcs]                │ [10______________]        │
│                                                      │
│  Supplier (Opsional)                                │
│  [▼ Pilih Supplier____________________________]     │
│                                                      │
│  ⚠️ Catatan: Stok awal produk akan 0. Setelah PO   │
│  diterima, stok akan otomatis bertambah.            │
│                                                      │
│  [Batal]                    [+ Tambah Produk]       │
└──────────────────────────────────────────────────────┘
```

---

## 📝 FORM FIELDS

### **Required Fields:**
1. **Nama Produk** * - Text input
2. **SKU** * - Text input (unique)
3. **Harga Beli (Cost)** * - Number input

### **Optional Fields:**
4. **Kategori** - Dropdown:
   - Bakery
   - Pastry
   - Raw Material
   - Minuman
   - Makanan
   - Snack
   - Bahan Pokok

5. **Unit** - Dropdown:
   - pcs (default)
   - kg
   - liter
   - box
   - pack
   - botol
   - karton

6. **Stok Minimum** - Number (default: 10)

7. **Supplier** - Dropdown (from suppliers list)

---

## 🔧 TECHNICAL IMPLEMENTATION

### **1. State Management:**
```typescript
const [showNewProductModal, setShowNewProductModal] = useState(false);
const [newProductData, setNewProductData] = useState({
  name: '',
  sku: '',
  category: '',
  cost: '',
  unit: 'pcs',
  minStock: '10',
  supplier_id: ''
});
```

### **2. Create Product Function:**
```typescript
const handleCreateNewProduct = async () => {
  // Validation
  if (!newProductData.name || !newProductData.sku || !newProductData.cost) {
    alert('❌ Nama, SKU, dan Cost wajib diisi!');
    return;
  }

  // POST to API
  const response = await fetch('/api/products', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: newProductData.name,
      sku: newProductData.sku,
      category: newProductData.category || 'General',
      price: parseFloat(newProductData.cost) * 1.3, // Markup 30%
      cost: parseFloat(newProductData.cost),
      purchase_price: parseFloat(newProductData.cost),
      stock: 0, // Initial stock is 0
      min_stock: parseFloat(newProductData.minStock) || 10,
      unit: newProductData.unit,
      supplier_id: newProductData.supplier_id || null,
      product_type: 'finished',
      is_active: true
    })
  });

  const result = await response.json();

  if (result.success) {
    // Add to products list
    const newProduct = {
      id: result.data.id.toString(),
      name: newProductData.name,
      sku: newProductData.sku,
      cost: parseFloat(newProductData.cost),
      stock: 0,
      minStock: parseFloat(newProductData.minStock),
      // ... other fields
    };
    
    setProducts([newProduct, ...products]);
    setShowNewProductModal(false);
    alert('✅ Produk baru berhasil ditambahkan!');
  }
};
```

### **3. UI Components:**

**Button Card:**
```tsx
<Card className="shadow-lg border-0 mb-4">
  <CardContent className="p-4">
    <div className="flex items-center justify-between">
      <div>
        <h3 className="font-semibold text-gray-900">
          Produk Tidak Ditemukan?
        </h3>
        <p className="text-sm text-gray-600">
          Tambahkan produk baru yang akan dibeli untuk pertama kali
        </p>
      </div>
      <Button
        onClick={() => setShowNewProductModal(true)}
        className="bg-green-600 hover:bg-green-700"
      >
        <FaPlus className="mr-2" />
        Tambah Produk Baru
      </Button>
    </div>
  </CardContent>
</Card>
```

**Modal:**
```tsx
{showNewProductModal && (
  <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
    <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
      {/* Modal content */}
    </div>
  </div>
)}
```

---

## ✅ FEATURES

### **Auto-calculations:**
- ✅ Harga jual = Cost × 1.3 (markup 30%)
- ✅ Stok awal = 0
- ✅ Min stock default = 10

### **Validations:**
- ✅ Nama produk required
- ✅ SKU required (must be unique)
- ✅ Cost required
- ✅ Button disabled until required fields filled

### **User Feedback:**
- ✅ Info message: Produk akan langsung tersedia
- ✅ Warning: Stok awal 0, akan bertambah setelah PO diterima
- ✅ Success message after creation
- ✅ Product appears in list immediately

---

## 🔄 INTEGRATION WITH PO FLOW

### **After Product Created:**
1. ✅ Product added to top of products list
2. ✅ Product has urgency badge (Critical - stock 0)
3. ✅ User can click "Add" to add to PO
4. ✅ Product included in PO like any other product
5. ✅ When PO received, stock will be updated

---

## 🧪 TESTING CHECKLIST

### **Test 1: Open Modal**
- [ ] Click "Tambah Produk Baru" button
- [ ] Modal opens
- [ ] All fields visible
- [ ] Info and warning messages show

### **Test 2: Validation**
- [ ] Try to submit empty form
- [ ] Error message shows
- [ ] Button disabled when fields empty
- [ ] Button enabled when required fields filled

### **Test 3: Create Product**
- [ ] Fill all required fields
- [ ] Click "Tambah Produk"
- [ ] Success message shows
- [ ] Modal closes
- [ ] Product appears in list

### **Test 4: Add to PO**
- [ ] Find newly created product in list
- [ ] Product shows stock = 0
- [ ] Product shows Critical badge
- [ ] Click "Add" button
- [ ] Product added to order summary
- [ ] Can create PO with new product

### **Test 5: Database**
- [ ] Check products table
- [ ] New product exists
- [ ] Stock = 0
- [ ] All fields correct

---

## 📊 BENEFITS

### **For Staff:**
- ✅ No need to switch pages
- ✅ Quick product creation
- ✅ Immediate availability
- ✅ Streamlined workflow

### **For Business:**
- ✅ Faster PO creation
- ✅ Better inventory tracking
- ✅ No missing products
- ✅ Complete purchase history

---

## 🚀 IMPLEMENTATION STEPS

### **Step 1: Add State** ✅
```typescript
const [showNewProductModal, setShowNewProductModal] = useState(false);
const [newProductData, setNewProductData] = useState({...});
```

### **Step 2: Add Button** ✅
```tsx
<Card>
  <Button onClick={() => setShowNewProductModal(true)}>
    Tambah Produk Baru
  </Button>
</Card>
```

### **Step 3: Add Modal** ✅
```tsx
{showNewProductModal && (
  <Modal>
    <Form />
  </Modal>
)}
```

### **Step 4: Add Handler** ✅
```typescript
const handleCreateNewProduct = async () => {
  // Validation
  // POST to API
  // Add to list
  // Close modal
};
```

### **Step 5: Test** 🔴 Pending
- [ ] Test in browser
- [ ] Verify all functionality
- [ ] Fix any bugs

---

## 📝 USAGE EXAMPLE

### **Scenario: Ordering New Coffee Brand**

1. Staff opens Create PO page
2. Searches for "Kopi Toraja Premium"
3. Product not found
4. Clicks "Tambah Produk Baru"
5. Fills form:
   - Nama: Kopi Toraja Premium 250g
   - SKU: KOP-TOR-001
   - Kategori: Minuman
   - Cost: 45000
   - Unit: pack
   - Min Stock: 20
   - Supplier: PT Kopi Nusantara
6. Clicks "Tambah Produk"
7. Product appears in list with Critical badge (stock 0)
8. Clicks "Add" to add to PO
9. Sets quantity: 50 packs
10. Completes PO as normal
11. When PO received, stock becomes 50

---

## ⚠️ IMPORTANT NOTES

### **Stock Management:**
- Initial stock is 0
- Stock will be updated when PO is received
- Product will show as Critical until first PO received

### **Pricing:**
- Cost = Purchase price
- Selling price = Cost × 1.3 (30% markup)
- Can be edited later in product master

### **Supplier:**
- Optional during quick creation
- Can be assigned later
- Recommended to assign for better tracking

---

## 🎯 NEXT STEPS

1. **Immediate:** Fix implementation errors
2. **Test:** Verify all functionality
3. **Document:** Update user guide
4. **Train:** Show staff how to use

---

## ✅ CONCLUSION

Fitur ini memungkinkan staff untuk menambahkan produk baru langsung dari halaman Purchase Order, tanpa perlu pindah ke halaman lain. Ini sangat berguna untuk produk yang akan dibeli pertama kali.

**Status:** Implementation in progress  
**ETA:** 15 minutes  
**Priority:** High

---

**Designed by:** Cascade AI  
**Date:** 25 Jan 2026, 02:10 AM
