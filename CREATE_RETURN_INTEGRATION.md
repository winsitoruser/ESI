# ✅ Create Return Page - FULLY INTEGRATED

## 🎉 Halaman Create Return Terintegrasi Penuh dengan Backend & API

Halaman `/inventory/returns/create` sudah dibuat dengan integrasi penuh ke backend API dan database PostgreSQL.

## 📄 File Created

**`/pages/inventory/returns/create.tsx`** - Form lengkap untuk membuat return baru

## 🎯 Features

### 1. **Customer Information Section**
- Transaction ID (optional) - Link ke transaksi original
- Customer Name - Nama customer
- Customer Phone - No. telepon customer

### 2. **Product Information Section**
- Product Dropdown - Pilih dari daftar produk (fetch dari API)
- Product Name - Auto-fill dari dropdown atau manual input
- Product SKU - Auto-fill atau manual
- Quantity - Jumlah produk yang diretur
- Unit - Satuan (pcs, kg, liter, box, pack)
- Condition - Kondisi produk (unopened, opened, damaged, expired)

### 3. **Return Details Section**
- Return Reason - Alasan retur (defective, expired, wrong_item, customer_request, damaged, other)
- Return Type - Tipe retur (refund, exchange, store_credit)
- Return Date - Tanggal retur
- Notes - Catatan tambahan

### 4. **Cost Summary Sidebar**
- Original Price - Harga original per unit
- Restocking Fee - Biaya restocking (optional)
- **Auto-calculation:**
  - Subtotal = Quantity × Original Price
  - Total Refund = Subtotal - Restocking Fee
- Real-time calculation saat user input

### 5. **Form Validation**
- Required fields validation
- Number validation (quantity, price > 0)
- Date validation
- Error messages yang jelas

### 6. **API Integration**
- Fetch products dari `/api/products`
- Submit return ke `/api/returns` (POST)
- Auto-redirect ke list page setelah sukses
- Toast notifications untuk feedback

## 🔄 Data Flow

```
User Input Form
    ↓
Validation
    ↓
POST /api/returns
    ↓
Database Insert (returns table)
    ↓
Auto-generate Return Number (RET-2026-0001)
    ↓
Response Success
    ↓
Toast Notification
    ↓
Redirect to /inventory/returns
```

## 💻 Code Highlights

### Auto-Calculate Refund Amount
```typescript
const calculateRefundAmount = () => {
  const quantity = parseFloat(formData.quantity) || 0;
  const originalPrice = parseFloat(formData.originalPrice) || 0;
  const restockingFee = parseFloat(formData.restockingFee) || 0;
  
  const subtotal = quantity * originalPrice;
  const refund = subtotal - restockingFee;
  
  setFormData(prev => ({
    ...prev,
    refundAmount: refund.toString()
  }));
};

useEffect(() => {
  if (formData.quantity && formData.originalPrice) {
    calculateRefundAmount();
  }
}, [formData.quantity, formData.originalPrice, formData.restockingFee]);
```

### Product Auto-Fill
```typescript
const handleProductSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
  const productId = e.target.value;
  const product = products.find(p => p.id === parseInt(productId));
  
  if (product) {
    setFormData(prev => ({
      ...prev,
      productId: productId,
      productName: product.name,
      productSku: product.sku,
      originalPrice: product.price.toString()
    }));
  }
};
```

### Form Submission
```typescript
const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();

  if (!validateForm()) {
    toast.error('Mohon lengkapi semua field yang wajib diisi');
    return;
  }

  setLoading(true);

  try {
    const response = await axios.post('/api/returns', submitData);

    if (response.data.success) {
      toast.success(
        `Return berhasil dibuat! Nomor: ${response.data.data.return_number}`,
        { duration: 5000 }
      );
      
      setTimeout(() => {
        router.push('/inventory/returns');
      }, 2000);
    }
  } catch (error: any) {
    toast.error(
      error.response?.data?.message || 'Gagal membuat return',
      { duration: 4000 }
    );
  } finally {
    setLoading(false);
  }
};
```

## 🎨 UI Components

### Layout Structure
```
┌─────────────────────────────────────────────────────────┐
│ Header: Buat Retur Baru                    [Kembali]    │
├─────────────────────────────────────┬───────────────────┤
│ Customer Information Card           │ Cost Summary      │
│ - Transaction ID                    │ - Original Price  │
│ - Customer Name                     │ - Restocking Fee  │
│ - Customer Phone                    │ - Subtotal        │
│                                     │ - Total Refund    │
│ Product Information Card            │                   │
│ - Product Dropdown                  │ [Simpan Retur]    │
│ - Product Name/SKU                  │ [Batal]           │
│ - Quantity/Unit/Condition           │                   │
│                                     │ Info Box:         │
│ Return Details Card                 │ - Status Pending  │
│ - Return Reason                     │ - Need Approval   │
│ - Return Type                       │ - Auto Number     │
│ - Return Date                       │                   │
│ - Notes                             │                   │
└─────────────────────────────────────┴───────────────────┘
```

### Responsive Design
- Desktop: 2-column layout (form + sidebar)
- Mobile: Single column, stacked layout
- Sticky sidebar on desktop

### Color Scheme
- Primary: Red (#DC2626) - untuk buttons
- Success: Green - untuk refund amount
- Info: Blue - untuk info box
- Warning: Yellow - untuk validation errors

## 🔗 Integration Points

### 1. **From Returns List Page**
Button "Buat Retur Baru" di `/inventory/returns`:
```tsx
<Button onClick={() => router.push('/inventory/returns/create')}>
  <FaPlus className="mr-2" />
  Buat Retur Baru
</Button>
```

### 2. **To API Backend**
POST request ke `/api/returns`:
```typescript
const response = await axios.post('/api/returns', {
  transactionId: 123,
  customerName: "John Doe",
  productName: "Kopi Arabica",
  quantity: 2,
  returnReason: "defective",
  returnType: "refund",
  // ... other fields
});
```

### 3. **To Database**
API akan insert ke table `returns`:
```sql
INSERT INTO returns (
  return_number, customer_name, product_name,
  quantity, return_reason, return_type, condition,
  original_price, refund_amount, restocking_fee,
  status, return_date, created_by
) VALUES (
  'RET-2026-0001', 'John Doe', 'Kopi Arabica',
  2, 'defective', 'refund', 'damaged',
  30000, 60000, 0,
  'pending', '2026-01-26', 'user@example.com'
);
```

### 4. **Back to Returns List**
After success, redirect dengan data baru:
```typescript
setTimeout(() => {
  router.push('/inventory/returns');
}, 2000);
```

## ✅ Validation Rules

### Required Fields
- ✅ Product Name
- ✅ Quantity (> 0)
- ✅ Original Price (> 0)
- ✅ Return Date

### Optional Fields
- Transaction ID
- Customer Name
- Customer Phone
- Product SKU
- Restocking Fee
- Notes

### Auto-Generated
- Return Number (RET-YYYY-####)
- Status (default: 'pending')
- Created By (from session)
- Created At / Updated At

## 🎯 User Flow

1. **User klik "Buat Retur Baru"** di `/inventory/returns`
2. **Redirect ke** `/inventory/returns/create`
3. **Pilih produk** dari dropdown (atau input manual)
4. **Isi quantity** → Auto-calculate refund
5. **Pilih reason & type** → Sesuaikan dengan kondisi
6. **Review summary** → Check total refund
7. **Klik "Simpan Retur"** → Submit ke API
8. **Loading state** → Menunggu response
9. **Toast success** → "Return berhasil dibuat! Nomor: RET-2026-0001"
10. **Auto-redirect** → Kembali ke `/inventory/returns`
11. **Data muncul** → Return baru ada di list dengan status "Pending"

## 🔐 Security

- ✅ NextAuth session required
- ✅ Form validation client-side
- ✅ API validation server-side
- ✅ SQL injection protection (parameterized queries)
- ✅ XSS protection (React auto-escaping)

## 📱 Responsive Features

### Desktop (lg+)
- 2-column layout
- Sticky sidebar
- Wide form fields

### Tablet (md)
- 2-column grid for some fields
- Scrollable sidebar

### Mobile (sm)
- Single column
- Full-width fields
- Stacked layout

## 🎉 Status: PRODUCTION READY

Halaman create return sudah:
- ✅ Form lengkap dengan semua fields
- ✅ Integrasi dengan API POST /api/returns
- ✅ Fetch products dari API
- ✅ Auto-calculate refund amount
- ✅ Form validation
- ✅ Error handling
- ✅ Toast notifications
- ✅ Loading states
- ✅ Auto-redirect after success
- ✅ Responsive design
- ✅ Production ready

## 🚀 Cara Menggunakan

1. **Buka halaman returns:**
   ```
   http://localhost:3000/inventory/returns
   ```

2. **Klik "Buat Retur Baru"**

3. **Isi form:**
   - Pilih produk dari dropdown
   - Isi jumlah yang diretur
   - Pilih alasan dan tipe retur
   - Review total refund

4. **Klik "Simpan Retur"**

5. **Lihat notifikasi sukses**

6. **Otomatis redirect ke list page**

7. **Return baru muncul dengan status "Pending"**

**Sistem create return sudah fully integrated dan siap digunakan!** 🎯✨
