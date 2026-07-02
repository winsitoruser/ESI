# Finance Module - Cross-Module Integration Documentation

## 📋 Overview

Finance module terintegrasi otomatis dengan semua modul lain dalam sistem untuk mencatat transaksi keuangan secara real-time. Setiap transaksi dari modul lain (POS, Inventory, Invoice, dll) akan otomatis membuat record di Finance module.

---

## 🔄 **INTEGRATION ARCHITECTURE**

```
┌─────────────────────────────────────────────────────────────┐
│                    BEDAGANG SYSTEM                           │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────┐    ┌──────────┐    ┌──────────┐              │
│  │   POS    │    │ Inventory│    │ Invoice  │              │
│  │ (Kasir)  │    │ Purchase │    │ Payment  │              │
│  └────┬─────┘    └────┬─────┘    └────┬─────┘              │
│       │               │                │                     │
│       │ Transaction   │ Purchase       │ Payment             │
│       │ Completed     │ Order Paid     │ Received            │
│       │               │                │                     │
│       ▼               ▼                ▼                     │
│  ┌────────────────────────────────────────────┐             │
│  │      FINANCE INTEGRATION LAYER             │             │
│  │  (Auto-create Finance Transactions)        │             │
│  └────────────────────┬───────────────────────┘             │
│                       │                                      │
│                       ▼                                      │
│  ┌─────────────────────────────────────────────┐            │
│  │         FINANCE MODULE                      │            │
│  │  • Accounts                                 │            │
│  │  • Transactions                             │            │
│  │  • Budgets                                  │            │
│  │  • Reports                                  │            │
│  └─────────────────────────────────────────────┘            │
│                       │                                      │
│                       ▼                                      │
│  ┌─────────────────────────────────────────────┐            │
│  │         DATABASE                            │            │
│  │  • finance_accounts                         │            │
│  │  • finance_transactions                     │            │
│  │  • finance_budgets                          │            │
│  └─────────────────────────────────────────────┘            │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔗 **INTEGRATION POINTS**

### **1. POS (Kasir) → Finance**

**Trigger:** Transaksi POS selesai (pembayaran diterima)

**Flow:**
```
Customer bayar di kasir
    ↓
POS Transaction Created
    ↓
Call: POST /api/finance/integrations/pos-webhook
    ↓
Finance Transaction Created:
  - Type: Income
  - Category: Sales
  - Subcategory: POS Sales
  - Account: Cash/Bank (based on payment method)
  - Amount: Total pembayaran
  - Reference: POS Transaction ID
    ↓
Update Account Balance:
  - Kas/Bank balance += Amount
    ↓
Update Dashboard Stats
```

**Implementation:**
```javascript
// In POS transaction completion handler
await fetch('/api/finance/integrations/pos-webhook', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    posTransaction: {
      id: transaction.id,
      transactionNumber: transaction.number,
      totalAmount: transaction.total,
      paymentMethod: transaction.paymentMethod,
      customerName: transaction.customerName,
      customerId: transaction.customerId,
      createdAt: new Date()
    }
  })
});
```

**Finance Transaction Created:**
```json
{
  "transactionNumber": "TRX-2026-XXX",
  "transactionType": "income",
  "category": "Sales",
  "subcategory": "POS Sales",
  "amount": 150000,
  "description": "Penjualan POS - POS-001",
  "referenceType": "order",
  "referenceId": "pos-transaction-uuid",
  "paymentMethod": "cash",
  "accountId": "kas-account-uuid"
}
```

---

### **2. Inventory (Purchase Order) → Finance**

**Trigger:** Purchase Order dibayar

**Flow:**
```
Purchase Order Created
    ↓
Status: Paid
    ↓
Call: POST /api/finance/integrations/inventory-webhook
    ↓
Finance Transaction Created:
  - Type: Expense
  - Category: Operating
  - Subcategory: Inventory Purchase
  - Account: Cash/Bank
  - Amount: Total pembelian
  - Reference: Purchase Order ID
    ↓
Update Account Balance:
  - Kas/Bank balance -= Amount
    ↓
Update Budget (if exists):
  - Operating budget spentAmount += Amount
```

**Implementation:**
```javascript
// In Purchase Order payment handler
await fetch('/api/finance/integrations/inventory-webhook', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    purchaseOrder: {
      id: po.id,
      poNumber: po.number,
      totalAmount: po.total,
      paymentMethod: 'bank_transfer',
      paymentStatus: 'paid',
      supplierName: po.supplier.name,
      supplierId: po.supplierId,
      orderDate: po.createdAt
    }
  })
});
```

**Finance Transaction Created:**
```json
{
  "transactionNumber": "TRX-2026-XXX",
  "transactionType": "expense",
  "category": "Operating",
  "subcategory": "Inventory Purchase",
  "amount": 5000000,
  "description": "Pembelian Inventory - PO-001",
  "referenceType": "bill",
  "referenceId": "po-uuid",
  "paymentMethod": "bank_transfer",
  "contactName": "PT. Supplier ABC"
}
```

---

### **3. Invoice (Payment) → Finance**

**Trigger:** Pembayaran invoice diterima

**Flow:**
```
Invoice Created (Piutang)
    ↓
Payment Received
    ↓
Call: POST /api/finance/integrations/invoice-webhook
    ↓
Finance Transaction Created:
  - Type: Income
  - Category: Sales
  - Subcategory: Invoice Payment
  - Account: Cash/Bank
  - Amount: Payment amount
  - Reference: Invoice ID
    ↓
Update Account Balances:
  - Kas/Bank balance += Amount
  - Piutang balance -= Amount
```

**Implementation:**
```javascript
// In Invoice payment handler
await fetch('/api/finance/integrations/invoice-webhook', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    invoice: {
      id: invoice.id,
      invoiceNumber: invoice.number,
      customerName: invoice.customer.name,
      customerId: invoice.customerId
    },
    payment: {
      amount: payment.amount,
      paymentMethod: payment.method,
      paymentDate: new Date()
    }
  })
});
```

---

### **4. Expenses Module → Finance**

**Trigger:** Expense record dibuat

**Flow:**
```
Expense Created
    ↓
Call: POST /api/finance/integrations/expense-webhook
    ↓
Finance Transaction Created:
  - Type: Expense
  - Category: From expense category
  - Account: Cash/Bank
  - Amount: Expense amount
    ↓
Update Account Balance:
  - Kas/Bank balance -= Amount
    ↓
Update Budget:
  - Relevant budget spentAmount += Amount
```

---

### **5. Salary/Payroll → Finance**

**Trigger:** Gaji dibayarkan

**Flow:**
```
Payroll Processed
    ↓
Finance Transaction Created:
  - Type: Expense
  - Category: Salary
  - Subcategory: Monthly Salary
  - Account: Bank
  - Amount: Total gaji
    ↓
Update Account Balance:
  - Bank balance -= Amount
    ↓
Update Budget:
  - Salary budget spentAmount += Amount
```

---

## 📊 **INTEGRATION HELPER FUNCTIONS**

### **File:** `/lib/helpers/finance-integration.ts`

**Functions:**

1. **`createFinanceTransactionFromPOS(posTransaction, userId)`**
   - Creates income transaction from POS sale
   - Updates cash/bank account balance
   - Returns finance transaction object

2. **`createFinanceTransactionFromPurchase(purchaseOrder, userId)`**
   - Creates expense transaction from purchase
   - Updates cash/bank account balance
   - Returns finance transaction object

3. **`createFinanceTransactionFromInvoice(invoice, payment, userId)`**
   - Creates income transaction from invoice payment
   - Updates cash/bank and receivables balances
   - Returns finance transaction object

4. **`createFinanceTransactionFromExpense(expense, userId)`**
   - Creates expense transaction
   - Updates cash/bank account balance
   - Updates relevant budget
   - Returns finance transaction object

5. **`updateFinanceTransactionFromSource(referenceType, referenceId, updates)`**
   - Updates existing finance transaction when source is updated
   - Adjusts account balances if amount changed

6. **`deleteFinanceTransactionFromSource(referenceType, referenceId)`**
   - Soft deletes finance transaction when source is deleted
   - Reverses account balance changes

---

## 🌐 **WEBHOOK API ENDPOINTS**

### **1. POST /api/finance/integrations/pos-webhook**

Create finance transaction from POS sale.

**Request:**
```json
{
  "posTransaction": {
    "id": "uuid",
    "transactionNumber": "POS-001",
    "totalAmount": 150000,
    "paymentMethod": "cash",
    "customerName": "John Doe",
    "customerId": "customer-uuid"
  }
}
```

**Response:**
```json
{
  "success": true,
  "message": "Finance transaction created from POS",
  "data": {
    "financeTransactionId": "uuid",
    "transactionNumber": "TRX-2026-004",
    "amount": 150000,
    "accountUpdated": true
  }
}
```

---

### **2. POST /api/finance/integrations/inventory-webhook**

Create finance transaction from purchase order.

**Request:**
```json
{
  "purchaseOrder": {
    "id": "uuid",
    "poNumber": "PO-001",
    "totalAmount": 5000000,
    "paymentMethod": "bank_transfer",
    "paymentStatus": "paid",
    "supplierName": "PT. Supplier ABC",
    "supplierId": "supplier-uuid"
  }
}
```

---

### **3. POST /api/finance/integrations/invoice-webhook**

Create finance transaction from invoice payment.

**Request:**
```json
{
  "invoice": {
    "id": "uuid",
    "invoiceNumber": "INV-001",
    "customerName": "PT. Customer XYZ",
    "customerId": "customer-uuid"
  },
  "payment": {
    "amount": 10000000,
    "paymentMethod": "bank_transfer",
    "paymentDate": "2026-02-04"
  }
}
```

---

## 🔄 **AUTO-UPDATE SCENARIOS**

### **Scenario 1: POS Sale**

```
1. Customer beli produk di kasir
2. Total: Rp 150,000
3. Payment: Cash
4. POS transaction completed
5. Auto-create finance transaction:
   - Income: Rp 150,000
   - Account: Kas
6. Kas balance: +Rp 150,000
7. Dashboard stats updated
```

### **Scenario 2: Inventory Purchase**

```
1. Create Purchase Order
2. Total: Rp 5,000,000
3. Mark as Paid
4. Auto-create finance transaction:
   - Expense: Rp 5,000,000
   - Account: Bank BCA
5. Bank balance: -Rp 5,000,000
6. Operating budget: +Rp 5,000,000 spent
7. Dashboard stats updated
```

### **Scenario 3: Invoice Payment**

```
1. Invoice created: Rp 10,000,000
2. Piutang balance: +Rp 10,000,000
3. Payment received: Rp 10,000,000
4. Auto-create finance transaction:
   - Income: Rp 10,000,000
   - Account: Bank
5. Bank balance: +Rp 10,000,000
6. Piutang balance: -Rp 10,000,000
7. Dashboard stats updated
```

---

## 📈 **DASHBOARD INTEGRATION**

Finance Dashboard menampilkan data dari semua modul:

**Income Sources:**
- POS Sales (from POS module)
- Invoice Payments (from Invoice module)
- Other Income (manual entry)

**Expense Sources:**
- Inventory Purchases (from Inventory module)
- Operating Expenses (from Expenses module)
- Salary Payments (from Payroll module)
- Other Expenses (manual entry)

**Real-time Updates:**
- Dashboard stats update setiap ada transaksi baru
- Charts update dengan data terbaru
- Budget monitoring update otomatis

---

## 🧪 **TESTING INTEGRATION**

### **Test 1: POS Integration**

```bash
# 1. Create POS transaction
curl -X POST http://localhost:3001/api/pos/transactions \
  -d '{"items":[...], "total":150000, "paymentMethod":"cash"}'

# 2. Verify finance transaction created
curl http://localhost:3001/api/finance/transactions-crud?category=Sales

# 3. Verify account balance updated
curl http://localhost:3001/api/finance/accounts?category=Cash
```

### **Test 2: Inventory Integration**

```bash
# 1. Create and pay purchase order
curl -X POST http://localhost:3001/api/inventory/purchase-orders \
  -d '{"items":[...], "total":5000000, "paymentStatus":"paid"}'

# 2. Verify finance transaction created
curl http://localhost:3001/api/finance/transactions-crud?category=Operating

# 3. Verify budget updated
curl http://localhost:3001/api/finance/budgets?category=Operating
```

---

## ✅ **INTEGRATION CHECKLIST**

### **POS Integration:**
- [x] Webhook endpoint created
- [x] Helper function implemented
- [x] Auto-create income transaction
- [x] Update cash/bank balance
- [x] Link to POS transaction (referenceId)
- [ ] Add to POS transaction completion handler

### **Inventory Integration:**
- [x] Webhook endpoint created
- [x] Helper function implemented
- [x] Auto-create expense transaction
- [x] Update cash/bank balance
- [x] Update budget if exists
- [ ] Add to Purchase Order payment handler

### **Invoice Integration:**
- [x] Webhook endpoint created
- [x] Helper function implemented
- [x] Auto-create income transaction
- [x] Update cash/bank balance
- [x] Update receivables balance
- [ ] Add to Invoice payment handler

### **Expenses Integration:**
- [x] Helper function implemented
- [x] Auto-create expense transaction
- [x] Update cash/bank balance
- [x] Update budget
- [ ] Add to Expenses creation handler

---

## 📝 **IMPLEMENTATION GUIDE**

### **Step 1: Add Webhook Call to POS Module**

```javascript
// In pages/api/pos/transactions/index.ts or similar
import { createFinanceTransactionFromPOS } from '@/lib/helpers/finance-integration';

// After POS transaction is completed
if (transaction.status === 'completed') {
  try {
    await createFinanceTransactionFromPOS(transaction, session.user?.id);
  } catch (error) {
    console.error('Failed to create finance transaction:', error);
    // Don't fail POS transaction if finance fails
  }
}
```

### **Step 2: Add Webhook Call to Inventory Module**

```javascript
// In pages/api/inventory/purchase-orders/index.ts or similar
import { createFinanceTransactionFromPurchase } from '@/lib/helpers/finance-integration';

// After purchase order is marked as paid
if (purchaseOrder.paymentStatus === 'paid') {
  try {
    await createFinanceTransactionFromPurchase(purchaseOrder, session.user?.id);
  } catch (error) {
    console.error('Failed to create finance transaction:', error);
  }
}
```

### **Step 3: Add Webhook Call to Invoice Module**

```javascript
// In pages/api/invoices/payments/index.ts or similar
import { createFinanceTransactionFromInvoice } from '@/lib/helpers/finance-integration';

// After invoice payment is received
try {
  await createFinanceTransactionFromInvoice(invoice, payment, session.user?.id);
} catch (error) {
  console.error('Failed to create finance transaction:', error);
}
```

---

## 🎯 **BENEFITS OF INTEGRATION**

1. **Automatic Recording** - Semua transaksi tercatat otomatis di Finance
2. **Real-time Balance** - Account balances selalu up-to-date
3. **Accurate Reports** - Laporan keuangan akurat dari semua sumber
4. **Budget Monitoring** - Budget tracking otomatis dari semua expenses
5. **Audit Trail** - Setiap transaksi punya reference ke source module
6. **No Double Entry** - Tidak perlu input manual di Finance
7. **Consistency** - Data konsisten across modules
8. **Traceability** - Mudah trace dari Finance ke source transaction

---

## 📊 **REPORTING INTEGRATION**

Finance Reports include data from all modules:

**Profit & Loss Statement:**
- Income: POS Sales + Invoice Payments + Other Income
- Expenses: Purchases + Operating + Salary + Other Expenses
- Net Profit: Total Income - Total Expenses

**Cash Flow Statement:**
- Operating Activities: POS, Invoices, Expenses
- Investing Activities: Asset purchases
- Financing Activities: Loans, equity

**Balance Sheet:**
- Assets: Cash, Bank, Receivables, Inventory
- Liabilities: Payables, Loans
- Equity: Capital, Retained Earnings

---

**Last Updated:** February 4, 2026  
**Version:** 1.0.0  
**Status:** ✅ Integration Layer Complete  
**Next:** Implement webhook calls in source modules
