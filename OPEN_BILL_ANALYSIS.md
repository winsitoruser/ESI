# 📋 Analisis & Implementasi Open Bill / Transaksi Gantung

**Date:** 13 Feb 2026  
**Feature:** Open Bill & Held Transactions untuk POS Cashier

---

## 🎯 Konsep Open Bill / Transaksi Gantung

### **Definisi**
- **Open Bill (Bill Terbuka):** Transaksi yang sedang dalam proses input item tapi belum dibayar
- **Transaksi Gantung (Held Transaction):** Transaksi yang di-hold/park sementara untuk dilanjutkan nanti
- **Use Case:** Kasir melayani customer A, tiba-tiba ada customer B yang urgent → Hold transaksi A, layani B, lalu resume A

### **Skenario Penggunaan**

#### **Scenario 1: Multiple Customers**
1. Kasir input items untuk Customer A (5 items)
2. Customer B datang dengan 1 item urgent
3. Kasir **HOLD** transaksi A
4. Kasir proses transaksi B hingga selesai
5. Kasir **RESUME** transaksi A
6. Lanjutkan dan selesaikan transaksi A

#### **Scenario 2: Incomplete Order**
1. Customer pesan 10 items
2. Kasir sudah input 7 items
3. Customer ingat ada item lain yang perlu diambil
4. Kasir **HOLD** transaksi
5. Customer ambil item tambahan
6. Kasir **RESUME** dan tambah item baru
7. Selesaikan pembayaran

#### **Scenario 3: Price Check**
1. Kasir input items
2. Ada item yang harganya perlu dicek ke manager
3. **HOLD** transaksi
4. Layani customer lain
5. Setelah harga confirmed, **RESUME** transaksi

---

## 🗄️ Database Schema

### **Tabel: `held_transactions`**

```sql
CREATE TABLE held_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  hold_number VARCHAR(50) UNIQUE NOT NULL,  -- e.g., "HOLD-20260213-001"
  cashier_id UUID NOT NULL REFERENCES employees(id),
  customer_name VARCHAR(255),
  customer_id UUID REFERENCES customers(id),
  
  -- Transaction Data (JSON)
  cart_items JSONB NOT NULL,  -- Array of cart items
  subtotal DECIMAL(15,2) NOT NULL DEFAULT 0,
  discount DECIMAL(15,2) DEFAULT 0,
  tax DECIMAL(15,2) DEFAULT 0,
  total DECIMAL(15,2) NOT NULL,
  
  -- Customer & Discount Info
  customer_type VARCHAR(20) DEFAULT 'walk-in',  -- 'walk-in' or 'member'
  selected_member JSONB,
  selected_voucher JSONB,
  
  -- Metadata
  hold_reason VARCHAR(255),  -- Optional: why was it held
  notes TEXT,
  
  -- Status & Timestamps
  status VARCHAR(20) DEFAULT 'held',  -- 'held', 'resumed', 'cancelled', 'completed'
  held_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  resumed_at TIMESTAMP,
  completed_at TIMESTAMP,
  cancelled_at TIMESTAMP,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_held_transactions_cashier ON held_transactions(cashier_id);
CREATE INDEX idx_held_transactions_status ON held_transactions(status);
CREATE INDEX idx_held_transactions_held_at ON held_transactions(held_at);
```

### **Update Existing: `pos_transactions`**

Tambah field untuk tracking held transactions:

```sql
ALTER TABLE pos_transactions 
ADD COLUMN held_transaction_id UUID REFERENCES held_transactions(id),
ADD COLUMN was_held BOOLEAN DEFAULT FALSE;
```

---

## 🔌 Backend API Endpoints

### **1. Hold Transaction**
```
POST /api/pos/transactions/hold
```

**Request Body:**
```json
{
  "cartItems": [
    {
      "id": "uuid",
      "name": "Product A",
      "price": 50000,
      "quantity": 2,
      "stock": 100
    }
  ],
  "subtotal": 100000,
  "discount": 0,
  "tax": 10000,
  "total": 110000,
  "customerType": "walk-in",
  "customerName": "John Doe",
  "customerId": null,
  "selectedMember": null,
  "selectedVoucher": null,
  "holdReason": "Customer needs to get more items",
  "notes": ""
}
```

**Response:**
```json
{
  "success": true,
  "message": "Transaction held successfully",
  "data": {
    "id": "uuid",
    "holdNumber": "HOLD-20260213-001",
    "total": 110000,
    "itemCount": 1,
    "heldAt": "2026-02-13T13:30:00Z"
  }
}
```

### **2. Get Held Transactions**
```
GET /api/pos/transactions/held
```

**Query Params:**
- `cashierId` (optional): Filter by cashier
- `status` (optional): Filter by status (default: 'held')

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "holdNumber": "HOLD-20260213-001",
      "customerName": "John Doe",
      "total": 110000,
      "itemCount": 2,
      "heldAt": "2026-02-13T13:30:00Z",
      "holdReason": "Customer needs to get more items"
    }
  ]
}
```

### **3. Resume Held Transaction**
```
POST /api/pos/transactions/held/:id/resume
```

**Response:**
```json
{
  "success": true,
  "message": "Transaction resumed successfully",
  "data": {
    "id": "uuid",
    "holdNumber": "HOLD-20260213-001",
    "cartItems": [...],
    "subtotal": 100000,
    "discount": 0,
    "tax": 10000,
    "total": 110000,
    "customerType": "walk-in",
    "customerName": "John Doe",
    "selectedMember": null,
    "selectedVoucher": null
  }
}
```

### **4. Cancel Held Transaction**
```
DELETE /api/pos/transactions/held/:id
```

**Response:**
```json
{
  "success": true,
  "message": "Held transaction cancelled successfully"
}
```

### **5. Complete from Held**
```
POST /api/pos/transactions/held/:id/complete
```

**Request Body:**
```json
{
  "paymentMethod": "cash",
  "paidAmount": 150000,
  "changeAmount": 40000
}
```

**Response:**
```json
{
  "success": true,
  "message": "Transaction completed successfully",
  "data": {
    "transactionId": "uuid",
    "transactionNumber": "TRX-20260213-001",
    "total": 110000,
    "paidAmount": 150000,
    "changeAmount": 40000
  }
}
```

---

## 🎨 Frontend UI Components

### **1. Hold Button**
- **Location:** Di area cart, sebelah tombol "Bayar"
- **Icon:** FaPause atau FaClock
- **Label:** "Tahan Transaksi"
- **Color:** Yellow/Orange (warning color)
- **Action:** Open hold confirmation modal

### **2. Held Transactions Button**
- **Location:** Top bar atau sidebar
- **Icon:** FaList atau FaClipboardList
- **Badge:** Show count of held transactions
- **Label:** "Transaksi Ditahan (3)"
- **Action:** Open held transactions modal

### **3. Hold Confirmation Modal**
```tsx
<Modal>
  <Title>Tahan Transaksi?</Title>
  <Input 
    label="Nama Customer (Optional)"
    placeholder="Masukkan nama customer"
  />
  <Textarea
    label="Alasan Ditahan (Optional)"
    placeholder="Contoh: Customer perlu ambil item tambahan"
  />
  <Buttons>
    <Button variant="secondary" onClick={cancel}>Batal</Button>
    <Button variant="warning" onClick={holdTransaction}>
      Tahan Transaksi
    </Button>
  </Buttons>
</Modal>
```

### **4. Held Transactions List Modal**
```tsx
<Modal size="large">
  <Title>Transaksi Ditahan</Title>
  <List>
    {heldTransactions.map(tx => (
      <Card key={tx.id}>
        <Header>
          <HoldNumber>{tx.holdNumber}</HoldNumber>
          <Time>{formatTime(tx.heldAt)}</Time>
        </Header>
        <Body>
          <CustomerName>{tx.customerName || 'Walk-in'}</CustomerName>
          <ItemCount>{tx.itemCount} items</ItemCount>
          <Total>Rp {formatCurrency(tx.total)}</Total>
          <Reason>{tx.holdReason}</Reason>
        </Body>
        <Actions>
          <Button onClick={() => resumeTransaction(tx.id)}>
            Resume
          </Button>
          <Button variant="danger" onClick={() => cancelHeld(tx.id)}>
            Batalkan
          </Button>
        </Actions>
      </Card>
    ))}
  </List>
</Modal>
```

---

## 🔄 User Flow

### **Flow 1: Hold Transaction**
```
1. Kasir input items ke cart
2. Click "Tahan Transaksi" button
3. Modal muncul untuk input nama customer & alasan (optional)
4. Click "Tahan Transaksi" di modal
5. API call POST /api/pos/transactions/hold
6. Cart dikosongkan
7. Toast notification: "Transaksi berhasil ditahan"
8. Badge "Transaksi Ditahan" bertambah
```

### **Flow 2: Resume Transaction**
```
1. Click "Transaksi Ditahan (3)" button
2. Modal list transaksi ditahan muncul
3. Click "Resume" pada salah satu transaksi
4. API call POST /api/pos/transactions/held/:id/resume
5. Cart terisi dengan items dari transaksi yang di-resume
6. Customer info & discount info ter-restore
7. Modal ditutup
8. Kasir bisa lanjutkan transaksi (tambah/kurang item, dll)
9. Proses checkout normal
```

### **Flow 3: Cancel Held Transaction**
```
1. Buka modal "Transaksi Ditahan"
2. Click "Batalkan" pada transaksi
3. Confirmation dialog muncul
4. Click "Ya, Batalkan"
5. API call DELETE /api/pos/transactions/held/:id
6. Transaksi dihapus dari list
7. Toast: "Transaksi dibatalkan"
```

---

## 📊 Business Rules

### **Limits & Constraints**
1. **Max Held Transactions per Cashier:** 10 transaksi
2. **Auto-expire:** Transaksi ditahan > 24 jam otomatis cancelled
3. **Hold Number Format:** `HOLD-YYYYMMDD-XXX` (sequential per day)
4. **Minimum Items:** Minimal 1 item untuk bisa di-hold
5. **Stock Reservation:** Stock TIDAK di-reserve saat hold (hanya saat checkout)

### **Permissions**
1. **Hold Transaction:** Semua kasir bisa hold
2. **Resume Own:** Kasir bisa resume transaksi sendiri
3. **Resume Others:** Hanya supervisor/manager bisa resume transaksi kasir lain
4. **Cancel:** Hanya yang hold atau supervisor yang bisa cancel

### **Notifications**
1. Toast saat berhasil hold
2. Toast saat berhasil resume
3. Badge counter untuk jumlah held transactions
4. Alert jika held transactions > 5 (terlalu banyak)

---

## 🚀 Implementation Priority

### **Phase 1: Core Functionality**
1. ✅ Create database migration untuk `held_transactions` table
2. ✅ Create Sequelize model `HeldTransaction`
3. ✅ Implement API: Hold transaction
4. ✅ Implement API: Get held transactions
5. ✅ Implement API: Resume held transaction

### **Phase 2: Frontend UI**
6. ✅ Add "Tahan Transaksi" button di cashier page
7. ✅ Create hold confirmation modal
8. ✅ Add "Transaksi Ditahan" button with badge
9. ✅ Create held transactions list modal
10. ✅ Implement resume functionality

### **Phase 3: Advanced Features**
11. ✅ Implement cancel held transaction
12. ✅ Add auto-expire for old held transactions
13. ✅ Add permissions check
14. ✅ Add analytics/reporting for held transactions

---

## 📝 Notes

- Held transactions adalah **temporary storage**, bukan final transaction
- Stock tidak di-reserve saat hold, hanya saat final checkout
- Kasir bisa edit cart setelah resume (tambah/kurang item)
- Jika item sudah habis saat resume, kasir akan di-notify
- Held transactions bisa di-search by customer name atau hold number

---

**Status:** Ready for Implementation  
**Estimated Time:** 6-8 hours  
**Priority:** High
