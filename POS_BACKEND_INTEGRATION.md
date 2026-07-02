# POS Cashier - Backend Integration Documentation

## 📋 Overview

Dokumentasi ini menjelaskan integrasi backend untuk sistem POS Cashier yang terhubung dengan modul Inventory. Sistem ini memungkinkan transaksi real-time dengan update stok otomatis.

---

## 🏗️ Arsitektur Sistem

### Backend API Endpoints

#### 1. **GET /api/pos/products**
Mengambil daftar produk dari inventory untuk ditampilkan di kasir.

**Query Parameters:**
- `search` (optional): Pencarian berdasarkan nama, SKU, atau barcode
- `category` (optional): Filter berdasarkan kategori produk

**Response:**
```json
{
  "success": true,
  "products": [
    {
      "id": "1",
      "name": "Kopi Arabica 250g",
      "sku": "KOP001",
      "barcode": "8991234567890",
      "category": "Minuman",
      "price": 45000,
      "stock": 50,
      "unit": "pcs",
      "image": "/images/products/kopi.jpg"
    }
  ],
  "categories": ["Semua", "Minuman", "Bahan Pokok", "Protein"]
}
```

**Features:**
- ✅ Hanya menampilkan produk yang aktif (`isActive: true`)
- ✅ Hanya menampilkan produk dengan stok > 0
- ✅ Support pencarian real-time
- ✅ Filter berdasarkan kategori
- ✅ Otomatis mengambil kategori unik dari database

---

#### 2. **GET /api/pos/members**
Mengambil daftar member/pelanggan untuk sistem loyalty.

**Query Parameters:**
- `search` (optional): Pencarian berdasarkan nama, telepon, atau email

**Response:**
```json
{
  "success": true,
  "members": [
    {
      "id": "1",
      "name": "John Doe",
      "phone": "081234567890",
      "email": "john@example.com",
      "points": 150,
      "discount": 10,
      "membershipLevel": "Silver"
    }
  ]
}
```

**Features:**
- ✅ Menampilkan member aktif
- ✅ Support pencarian member
- ✅ Menampilkan poin dan diskon member

---

#### 3. **POST /api/pos/members**
Menambahkan member baru.

**Request Body:**
```json
{
  "name": "Jane Smith",
  "phone": "081234567891",
  "email": "jane@example.com",
  "discount": 10
}
```

**Response:**
```json
{
  "success": true,
  "message": "Member created successfully",
  "member": {
    "id": "2",
    "name": "Jane Smith",
    "phone": "081234567891",
    "email": "jane@example.com",
    "points": 0,
    "discount": 10,
    "membershipLevel": "Silver"
  }
}
```

**Features:**
- ✅ Validasi nomor telepon unik
- ✅ Otomatis set membership level "Silver"
- ✅ Inisialisasi poin = 0

---

#### 4. **POST /api/pos/cashier/checkout**
Memproses transaksi checkout dengan integrasi inventory.

**Request Body:**
```json
{
  "cart": [
    {
      "id": "1",
      "name": "Kopi Arabica 250g",
      "price": 45000,
      "quantity": 2,
      "stock": 50
    }
  ],
  "paymentMethod": "cash",
  "cashReceived": "100000",
  "customerType": "member",
  "selectedMember": {
    "id": "1",
    "name": "John Doe",
    "discount": 10
  },
  "selectedVoucher": {
    "id": "1",
    "code": "DISKON10",
    "type": "percentage",
    "value": 10,
    "minPurchase": 50000
  },
  "shiftId": "shift123",
  "cashierId": "user123"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Transaction completed successfully",
  "transaction": {
    "id": 1,
    "transactionNumber": "TRX202602040001",
    "subtotal": 90000,
    "discount": 9000,
    "total": 81000,
    "paidAmount": 100000,
    "changeAmount": 19000,
    "status": "completed"
  },
  "receipt": {
    "transactionNumber": "TRX202602040001",
    "date": "2026-02-04T08:57:00.000Z",
    "items": [...],
    "subtotal": 90000,
    "discount": 9000,
    "total": 81000,
    "paymentMethod": "cash",
    "paidAmount": 100000,
    "changeAmount": 19000,
    "cashier": "Admin User"
  }
}
```

**Features:**
- ✅ **Validasi stok real-time** sebelum checkout
- ✅ **Update stok otomatis** setelah transaksi berhasil
- ✅ **Perhitungan diskon member** otomatis
- ✅ **Perhitungan diskon voucher** otomatis
- ✅ **Generate nomor transaksi** unik per hari
- ✅ **Update poin member** (1 poin per Rp 10.000)
- ✅ **Database transaction** untuk data consistency
- ✅ **Rollback otomatis** jika terjadi error

---

## 🔄 Flow Integrasi dengan Inventory

### 1. Load Products
```
Frontend → GET /api/pos/products → Database (Product table)
                                 ↓
                          Filter: isActive = true
                                 stock > 0
                                 ↓
                          Return products + categories
```

### 2. Checkout Process
```
Frontend → POST /api/pos/cashier/checkout
              ↓
         Start Transaction
              ↓
    Validate Stock for Each Item
              ↓
         Calculate Totals
              ↓
    Create PosTransaction Record
              ↓
    Create PosTransactionItem Records
              ↓
    Update Product Stock (DECREMENT)
              ↓
    Update Member Points (if applicable)
              ↓
         Commit Transaction
              ↓
    Return Success + Receipt Data
```

### 3. Stock Update Logic
```sql
-- Untuk setiap item di cart:
UPDATE products 
SET stock = stock - quantity 
WHERE id = productId;
```

---

## 📊 Database Schema Integration

### Tables Used:

1. **products** (Inventory Module)
   - `id`, `name`, `sku`, `barcode`, `category`
   - `price`, `stock`, `unit`, `isActive`

2. **pos_transactions**
   - `id`, `transactionNumber`, `transactionDate`
   - `subtotal`, `discount`, `tax`, `total`
   - `paymentMethod`, `paidAmount`, `changeAmount`
   - `customerId`, `customerName`, `cashierId`, `shiftId`

3. **pos_transaction_items**
   - `id`, `transactionId`, `productId`
   - `productName`, `productSku`, `quantity`
   - `unitPrice`, `discount`, `subtotal`

4. **customers** (Member Management)
   - `id`, `name`, `phone`, `email`
   - `points`, `discount`, `membershipLevel`

---

## 🎯 Frontend Integration Points

### 1. Product Loading
```typescript
const fetchProducts = async () => {
  const params = new URLSearchParams();
  if (searchQuery) params.append('search', searchQuery);
  if (selectedCategory !== 'Semua') params.append('category', selectedCategory);

  const response = await fetch(`/api/pos/products?${params.toString()}`);
  const data = await response.json();
  
  if (data.success) {
    setProducts(data.products);
    setCategories(data.categories);
  }
};
```

### 2. Member Management
```typescript
// Fetch members
const fetchMembers = async () => {
  const response = await fetch('/api/pos/members');
  const data = await response.json();
  if (data.success) setMembersList(data.members);
};

// Add new member
const handleAddMember = async () => {
  const response = await fetch('/api/pos/members', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(newMember)
  });
  const data = await response.json();
  if (data.success) {
    setSelectedMember(data.member);
    fetchMembers(); // Refresh list
  }
};
```

### 3. Checkout Process
```typescript
const processPayment = async () => {
  const response = await fetch('/api/pos/cashier/checkout', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      cart,
      paymentMethod,
      cashReceived,
      customerType,
      selectedMember,
      selectedVoucher,
      shiftId: activeShift?.id,
      cashierId: session?.user?.id
    })
  });

  const data = await response.json();
  
  if (data.success) {
    alert(`Pembayaran berhasil!\nNo. Transaksi: ${data.receipt.transactionNumber}`);
    clearCart();
    fetchProducts(); // Refresh untuk update stok
  }
};
```

---

## ✅ Features Implemented

### Product Management
- [x] Real-time product search
- [x] Category filtering
- [x] Stock validation
- [x] Auto-refresh after transaction

### Member Management
- [x] Member search
- [x] Add new member
- [x] Member discount calculation
- [x] Points accumulation

### Transaction Processing
- [x] Multiple payment methods (Cash, Card, QRIS)
- [x] Member discount
- [x] Voucher discount
- [x] Change calculation
- [x] Transaction number generation
- [x] Receipt data

### Inventory Integration
- [x] Stock validation before checkout
- [x] Automatic stock deduction
- [x] Database transaction for consistency
- [x] Rollback on error

---

## 🔒 Security Features

1. **Authentication Required**
   - Semua endpoint memerlukan session NextAuth
   - Unauthorized access akan return 401

2. **Data Validation**
   - Validasi required fields
   - Validasi stok sebelum transaksi
   - Validasi payment amount

3. **Database Transaction**
   - Menggunakan Sequelize transaction
   - Auto rollback jika ada error
   - Memastikan data consistency

4. **Error Handling**
   - Try-catch di semua endpoint
   - Detailed error messages (development mode)
   - Proper HTTP status codes

---

## 🧪 Testing Checklist

### Product API
- [ ] Test GET products tanpa filter
- [ ] Test GET products dengan search
- [ ] Test GET products dengan category filter
- [ ] Verify hanya produk aktif yang muncul
- [ ] Verify hanya produk dengan stok > 0

### Member API
- [ ] Test GET members
- [ ] Test POST create member
- [ ] Test duplicate phone validation
- [ ] Test member search

### Checkout API
- [ ] Test checkout dengan cash
- [ ] Test checkout dengan card/QRIS
- [ ] Test member discount calculation
- [ ] Test voucher discount calculation
- [ ] Test stock validation
- [ ] Test stock update after transaction
- [ ] Test insufficient stock error
- [ ] Test insufficient payment error
- [ ] Test points accumulation

---

## 📝 Next Steps

1. **Shift Management Integration**
   - Integrate dengan shift API yang sudah ada
   - Track transactions per shift

2. **Receipt Printing**
   - Generate PDF receipt
   - Print via thermal printer

3. **Offline Mode**
   - Queue transactions saat offline
   - Sync saat online kembali

4. **Analytics**
   - Sales dashboard
   - Product performance
   - Cashier performance

5. **Advanced Features**
   - Barcode scanner integration
   - Customer display
   - Multi-currency support
   - Tax calculation

---

## 🐛 Known Issues & Solutions

### Issue: Stock tidak update
**Solution:** Pastikan Product model memiliki method `decrement` dari Sequelize

### Issue: Member tidak ditemukan
**Solution:** Pastikan Customer table memiliki field `type` dengan value 'member'

### Issue: Transaction rollback
**Solution:** Check error log untuk detail, biasanya karena constraint violation

---

## 📞 Support

Untuk pertanyaan atau issue, silakan hubungi tim development atau buat issue di repository.

**Last Updated:** February 4, 2026
**Version:** 1.0.0
