# Analisis & Rencana Pengembangan HQ Settings + Billing & Payment Gateway

Dokumen ini merangkum hasil audit dan rencana pengembangan komprehensif untuk modul:

| URL | Deskripsi |
|-----|-----------|
| `/hq/settings` | Pengaturan global (pajak, bisnis, operasional, notifikasi) |
| `/hq/settings/modules` | Manajemen modul aktif/nonaktif + marketplace modul |
| `/hq/settings/integrations` | Integrasi pihak ke-3 (Payment GW, WA, Email, Marketplace) |
| `/hq/settings/taxes` | (NEW) Halaman khusus pengaturan pajak |
| `/hq/settings/notifications` | (NEW) Halaman khusus pengaturan notifikasi |
| `/hq/billing-info` | Informasi langganan, pemakaian, invoice, modul aktif |

Termasuk integrasi **billing & payment gateway untuk layanan ERP** itu sendiri (berlangganan paket & modul).

---

## 1. Temuan (Audit)

### 1.1 Database / Model

| Tabel | Migrasi | Model file | Terdaftar di `models/index.js` |
|-------|---------|------------|-------------------------------|
| `plans` | ✔ `20260217-create-billing-tables.js` | ✔ `models/Plan.js` (factory) | ⚠ **SALAH** (load factory, bukan invoke) |
| `plan_limits` | ✔ | ✘ **Tidak ada model** | ✘ |
| `subscriptions` | ✔ | ✔ `models/Subscription.js` (factory) | ✘ **Tidak terdaftar** |
| `billing_cycles` | ✔ | ✔ `models/BillingCycle.js` (factory) | ⚠ **SALAH** |
| `invoices` | ✔ | ✔ `models/Invoice.js` (factory) | ⚠ **SALAH** |
| `invoice_items` | ✔ | ✘ **Tidak ada model** | ✘ |
| `usage_metrics` | ✔ | ✘ **Tidak ada model** | ✘ |
| `payment_transactions` | ✔ | ✘ **Tidak ada model** | ✘ |

> **Root cause**: di `models/index.js` baris 288, 308, 312 menulis `require('./Plan')` (mengambil factory function), bukan `require('./Plan')(sequelize)`. Akibatnya semua query ke `db.Plan`, `db.Invoice`, `db.BillingCycle` akan melempar runtime error → API `/api/hq/billing-info` masuk ke fallback `MOCK_BILLING`.

### 1.2 Backend API

| Endpoint | Status | Catatan |
|----------|--------|---------|
| `GET /api/hq/billing-info` | ⚠ Parsial | Fallback mock karena model tidak terload |
| `GET/PUT /api/hq/settings` | ✔ OK | Menyimpan di `store_settings` JSON |
| `GET /api/hq/modules` | ✔ OK | Fallback mock saat DB error |
| `GET /api/hq/integrations/providers` | ⚠ | **Pakai mock data in-memory** |
| `GET /api/hq/integrations/configs` | ⚠ | **Pakai mock data in-memory** |
| ✘ `/api/hq/subscription/plans` | ✘ | Belum ada |
| ✘ `/api/hq/subscription/change` | ✘ | Belum ada |
| ✘ `/api/hq/subscription/checkout` | ✘ | Belum ada |
| ✘ `/api/hq/billing/invoices/[id]/pay` | ✘ | Belum ada |
| ✘ `/api/webhooks/payment/[provider]` | ✘ | Belum ada |
| ✘ `/api/hq/modules/catalog` | ✘ | Belum ada pricing modul |
| ✘ `/api/hq/settings/taxes` | ✘ | Belum dipisah dari `/api/hq/settings` |
| ✘ `/api/hq/settings/notifications` | ✘ | Belum dipisah |

### 1.3 Frontend Pages

| Halaman | Status |
|---------|--------|
| `/hq/settings/index.tsx` | ✔ Ada – tab Pajak/Bisnis/Operasional/Notifikasi |
| `/hq/settings/modules.tsx` | ✔ Ada – tetapi marketplace/pricing modul belum ada |
| `/hq/settings/integrations/index.tsx` | ✔ Ada – sudah lumayan |
| `/hq/settings/integrations/payment-gateway/*` | ✔ Ada – per branch/xendit/midtrans |
| `/hq/settings/taxes` | ✘ **Belum ada** |
| `/hq/settings/notifications` | ✘ **Belum ada** |
| `/hq/billing-info.tsx` | ✔ Ada – tetapi tidak ada tombol Upgrade/Pay Invoice/Cancel |
| `/hq/billing-info/plans` | ✘ **Belum ada** (pilih paket) |
| `/hq/billing-info/checkout` | ✘ **Belum ada** (flow pembayaran) |

### 1.4 Payment Gateway

- `pages/hq/settings/integrations/payment-gateway/xendit.tsx` ada tetapi untuk **transaksi POS tenant** (bukan untuk pembayaran langganan ERP).
- **Tidak ada adapter/service terpadu** (`lib/services/PaymentService.ts`).
- **Tidak ada webhook handler** untuk verifikasi pembayaran langganan.

---

## 2. Arsitektur Baru

```
┌──────────────────────────────────────────────────────────────────┐
│                      BILLING SERVICE (ERP Layanan)                │
├──────────────────────────────────────────────────────────────────┤
│ Plans (paket)  ┐                                                  │
│                ├─> Subscription (tenant) ──> BillingCycle ──> Invoice │
│ ModulePricing  ┘                                │                 │
│ (add-on)                                        ▼                 │
│                                         PaymentTransaction        │
│                                                 │                 │
│         ┌───────────────────────────────────────┴──────┐          │
│         ▼ Midtrans SNAP    ▼ Xendit Invoice           │          │
│  POST /v2/charge          POST /invoices              │          │
│         ◀── Webhook ───────────── Webhook ────────────┘          │
└──────────────────────────────────────────────────────────────────┘
```

### 2.1 Jenis Paket (Plan) & Billing Model

1. **Plan** (paket utama, mis. Starter / Professional / Enterprise):
   - `price` (bulan/tahun)
   - `maxUsers`, `maxBranches`, `maxProducts`, `maxTransactions`
   - `features` (JSON, per-module boolean)
2. **ModulePricing** (NEW) – harga add-on modul di luar paket:
   - `moduleId`, `price`, `billingInterval`, `perUser` (boolean)
3. **Per-user overage** – rate tambahan ketika user > plan limit.
4. **Trial**: `plan.trialDays` (default 14 hari).

### 2.2 Opsi Langganan (Tenant)

- Upgrade plan – bisa langsung tanpa tunggu siklus (prorate).
- Tambah modul add-on – tambah `tenant_module_subscriptions` (via `tenant_modules.metadata` + invoice item "addon").
- Tambah kuota user – bayar per user × rate modul.
- Opsi interval: `monthly` / `yearly` (diskon 10-20% untuk yearly).
- Pembayaran via **Midtrans** (SNAP) atau **Xendit** (Invoice API) – multi-method: QRIS, VA, CC, E-Wallet.

### 2.3 Flow Pembayaran Langganan

```
[User klik Upgrade]
      │
      ▼
POST /api/hq/subscription/checkout
  { planId, interval: 'monthly'|'yearly', addonModuleIds?: [...] }
      │
      ▼
[Backend]
  1. Hitung total (base + addon − diskon + pajak)
  2. Create Invoice (status: draft → sent)
  3. Call PaymentService.createPayment(provider, invoice)
  4. Return { redirectUrl | snapToken | qrCode }
      │
      ▼
[User bayar di gateway]
      │
      ▼ webhook
POST /api/webhooks/payment/[provider]
  → Verifikasi signature
  → Mark invoice paid
  → Aktifkan plan / modul
  → Update subscription.currentPeriodEnd
```

---

## 3. Implementasi Yang Akan Dikerjakan

### 3.1 Backend

1. **Fix `models/index.js`** → invoke factory yang salah + register: Subscription, InvoiceItem, PaymentTransaction, UsageMetric, PlanLimit, ModulePricing.
2. **Model baru**:
   - `models/InvoiceItem.js`
   - `models/PaymentTransaction.js`
   - `models/UsageMetric.js`
   - `models/PlanLimit.js`
   - `models/ModulePricing.js` (+ migrasi `module_pricing`)
3. **Seeder plans & module_pricing** – Starter / Professional / Enterprise + harga per modul add-on.
4. **PaymentService**:
   - `lib/services/payment/PaymentGateway.ts` (interface + factory)
   - `lib/services/payment/MidtransAdapter.ts`
   - `lib/services/payment/XenditAdapter.ts`
   - `lib/services/payment/ManualAdapter.ts` (untuk transfer manual)
5. **Subscription service** – `lib/services/SubscriptionService.ts`:
   - `createCheckout(tenantId, planId, interval, addons, provider)`
   - `activateSubscription(invoiceId)`
   - `cancelSubscription(subscriptionId, atPeriodEnd)`
   - `calculateProration(currentSub, newPlan)`
6. **APIs baru**:
   - `GET /api/hq/subscription/plans` – list plan + module add-on + harga
   - `GET /api/hq/subscription/current` – paket sekarang tenant
   - `POST /api/hq/subscription/checkout` – buat invoice + transaksi PG
   - `POST /api/hq/subscription/cancel` – batalkan
   - `POST /api/hq/subscription/resume` – batalkan cancel
   - `GET /api/hq/billing/invoices` – list invoice
   - `GET /api/hq/billing/invoices/[id]` – detail
   - `POST /api/hq/billing/invoices/[id]/pay` – retry bayar
   - `POST /api/webhooks/payment/[provider]` – webhook
   - `GET/PUT /api/hq/settings/taxes`
   - `GET/PUT /api/hq/settings/notifications`
   - `GET /api/hq/modules/catalog` – daftar modul + harga

### 3.2 Frontend

1. **`/hq/settings/taxes`** – halaman khusus (PPN, Service Charge, PB1, Rounding) dengan preview live.
2. **`/hq/settings/notifications`** – halaman khusus (threshold stok, target, email, WA, telegram, slack).
3. **`/hq/billing-info`** – tambah tombol **Upgrade Paket**, **Bayar Sekarang** (invoice outstanding), **Batalkan Langganan**.
4. **`/hq/billing-info/plans`** – halaman pilih paket + add-on modul + kalkulator harga.
5. **`/hq/billing-info/checkout`** – review order → pilih payment method → redirect.
6. **`/hq/billing-info/payment/success`** dan `/hq/billing-info/payment/failure`.
7. **`/hq/settings/modules`** – tambah badge harga add-on dan tombol **Berlangganan Modul** yang mengarah ke checkout.
8. Integrasi admin (super_admin) – halaman `/admin/plans`, `/admin/subscriptions`, `/admin/tenants` sudah di luar scope page tetapi API `/api/hq/subscription/plans` membuka manage untuk super admin.

### 3.3 Integrasi & Keamanan

- Webhook signature verification (Midtrans: `SHA512(order_id+status_code+gross_amount+server_key)`; Xendit: header `x-callback-token`).
- Credentials disimpan di `integration_configs.credentials` (field JSON encrypted – pakai helper `lib/utils/crypto`).
- Audit log setiap perubahan plan, module, invoice status (`audit_logs`).

---

## 4. Quick-win Deliverables

Dokumen ini diikuti dengan implementasi langsung pada commit berikutnya. Perhatikan bahwa:
- Beberapa halaman yang sudah ada akan **ditingkatkan**, bukan ditulis ulang total.
- Semua fitur backward compatible → fallback mock tetap jalan kalau DB belum di-seed.
