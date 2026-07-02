# 🔔 Comprehensive Alert & Notification System

## 📋 Overview

Sistem alert lengkap untuk monitoring dan notifikasi seluruh aktivitas sistem BEDAGANG Cloud POS.

---

## 🗄️ Database Schema

### **Tables Created:**

#### 1. `system_alerts`
```sql
- id (UUID, PK)
- alert_type (stock_low, stock_out, expiry_warning, expiry_critical, price_change, overstock, quality_issue, supplier_issue, system_error, custom)
- severity (info, warning, critical, urgent)
- title (VARCHAR 255)
- message (TEXT)
- category (inventory, sales, finance, production, quality, system, customer)
- source (VARCHAR 100)
- reference_type (product, stock, order, transaction, etc)
- reference_id (VARCHAR 100)
- reference_data (JSON)
- action_required (BOOLEAN)
- action_type (reorder, adjust_price, check_quality, contact_supplier, etc)
- action_url (VARCHAR 500)
- priority (INTEGER)
- is_read (BOOLEAN)
- is_resolved (BOOLEAN)
- resolved_at (TIMESTAMP)
- resolved_by (UUID FK to users)
- resolution_notes (TEXT)
- assigned_to (UUID FK to users)
- expires_at (TIMESTAMP)
- metadata (JSON)
- created_at, updated_at
```

#### 2. `alert_subscriptions`
```sql
- id (UUID, PK)
- user_id (UUID FK to users)
- alert_type (VARCHAR 50)
- category (VARCHAR 50)
- is_enabled (BOOLEAN)
- notify_email (BOOLEAN)
- notify_sms (BOOLEAN)
- notify_push (BOOLEAN)
- min_severity (ENUM)
- created_at, updated_at
```

#### 3. `alert_actions`
```sql
- id (UUID, PK)
- alert_id (UUID FK to system_alerts)
- user_id (UUID FK to users)
- action_type (read, dismissed, resolved, escalated, assigned, commented)
- action_data (JSON)
- notes (TEXT)
- created_at
```

---

## 🔌 API Endpoints

### **1. Get Alerts**
```javascript
GET /api/alerts
Query Parameters:
  - category: string (inventory, sales, finance, etc)
  - severity: string (info, warning, critical, urgent)
  - alert_type: string
  - is_read: boolean
  - is_resolved: boolean
  - limit: number (default: 50)
  - offset: number (default: 0)

Response:
{
  success: true,
  data: {
    alerts: [...],
    total: 150,
    stats: {
      info: 50,
      warning: 60,
      critical: 30,
      urgent: 10
    }
  }
}
```

### **2. Create Alert**
```javascript
POST /api/alerts
Body:
{
  alert_type: "stock_low",
  severity: "warning",
  title: "Stock Rendah: Produk A",
  message: "Produk A memiliki stock 5 unit",
  category: "inventory",
  source: "stock_monitor",
  reference_type: "product",
  reference_id: "prod-123",
  reference_data: {...},
  action_required: true,
  action_type: "reorder",
  action_url: "/inventory/purchase-orders/new",
  priority: 80
}

Response:
{
  success: true,
  data: {...alert},
  message: "Alert created successfully"
}
```

### **3. Update Alert**
```javascript
PATCH /api/alerts/:id
Body:
{
  is_read: true,
  is_resolved: true,
  resolved_by: "user-uuid",
  resolution_notes: "Sudah di-restock",
  action_type: "resolved",
  user_id: "user-uuid"
}

Response:
{
  success: true,
  data: {...updated_alert},
  message: "Alert updated successfully"
}
```

### **4. Delete Alert**
```javascript
DELETE /api/alerts/:id

Response:
{
  success: true,
  message: "Alert deleted successfully"
}
```

### **5. Generate Alerts (Auto)**
```javascript
POST /api/alerts/generate

Response:
{
  success: true,
  data: {
    generated_count: 15,
    alerts: [...]
  },
  message: "Generated 15 alerts"
}
```

---

## 🎯 Alert Types & Categories

### **Alert Types:**
- `stock_low` - Stock rendah
- `stock_out` - Stock habis
- `expiry_warning` - Produk akan expired (7-30 hari)
- `expiry_critical` - Produk akan expired (< 7 hari)
- `price_change` - Perubahan harga
- `overstock` - Stock berlebih
- `quality_issue` - Masalah kualitas
- `supplier_issue` - Masalah supplier
- `system_error` - Error sistem
- `custom` - Custom alert

### **Categories:**
- `inventory` - Inventory/stock
- `sales` - Penjualan
- `finance` - Keuangan
- `production` - Produksi
- `quality` - Kualitas
- `system` - Sistem
- `customer` - Customer

### **Severity Levels:**
- `info` - Informasi (biru)
- `warning` - Peringatan (orange)
- `critical` - Kritis (merah)
- `urgent` - Mendesak (merah tua)

---

## 💻 Frontend Usage

### **Page Location:**
```
http://localhost:3000/inventory/alerts
```

### **Component:**
```tsx
import InventoryAlerts from '@/components/inventory/InventoryAlerts';

// Full page view
<InventoryAlerts showInDashboard={false} />

// Dashboard summary view
<InventoryAlerts showInDashboard={true} />
```

### **Features:**
- ✅ Collapsible sections
- ✅ Severity badges
- ✅ Action buttons
- ✅ Filtering by category/severity
- ✅ Real-time statistics
- ✅ Suggested actions
- ✅ Reference links

---

## 🔧 Utility Service

### **Import:**
```javascript
const {
  createAlert,
  updateAlert,
  markAsRead,
  resolveAlert,
  generateAlerts,
  createStockAlert,
  createExpiryAlert,
  createPriceChangeAlert,
  AlertTypes,
  AlertCategories,
  AlertSeverity
} = require('@/utils/alertService');
```

### **Quick Examples:**

#### Create Stock Alert:
```javascript
await createStockAlert(product, 'critical');
```

#### Create Expiry Alert:
```javascript
await createExpiryAlert(product, 5); // 5 days until expiry
```

#### Create Price Change Alert:
```javascript
await createPriceChangeAlert(
  product,
  oldPrice,
  newPrice,
  'Admin',
  'Kenaikan harga supplier'
);
```

#### Mark as Read:
```javascript
await markAsRead(alertId, userId);
```

#### Resolve Alert:
```javascript
await resolveAlert(alertId, userId, 'Sudah di-handle');
```

---

## 🔗 Integration Points

### **1. Product Creation/Update**
```javascript
// In /api/products.js
if (newProduct.stock <= newProduct.min_stock) {
  await createStockAlert(newProduct, 'warning');
}
```

### **2. Stock Movement**
```javascript
// In /api/stock/movements.js
if (updatedStock.stock === 0) {
  await createStockAlert(product, 'urgent');
}
```

### **3. Price Changes**
```javascript
// In /api/products/[id].js
if (oldPrice !== newPrice) {
  await createPriceChangeAlert(
    product,
    oldPrice,
    newPrice,
    req.user.name,
    req.body.price_change_reason
  );
}
```

### **4. Scheduled Jobs (Cron)**
```javascript
// Run daily at 8 AM
cron.schedule('0 8 * * *', async () => {
  await generateAlerts();
});
```

---

## 📊 Auto-Generated Alerts

The system automatically generates alerts for:

1. **Low Stock Products**
   - Triggers when: `stock <= min_stock`
   - Severity: `warning` or `urgent` (if stock = 0)
   - Action: Reorder

2. **Overstock Products**
   - Triggers when: `stock >= max_stock`
   - Severity: `warning`
   - Action: Adjust price or promote

3. **Expiring Products**
   - Triggers when: Expiry within 30 days
   - Severity: `warning` (30-14 days), `critical` (14-7 days), `urgent` (< 7 days)
   - Action: Check quality, discount, or return

---

## 🎨 UI Components

### **Alert Card Features:**
- Severity badge with icon
- Product information
- Reference data grid
- Suggested action box
- Action buttons
- Expandable/collapsible

### **Dashboard Summary:**
- Critical alerts banner
- Quick stats cards
- Alert counts by type
- Direct links to detail page

---

## 🚀 Deployment Checklist

- [x] Database migration created
- [x] Models created (SystemAlert, AlertSubscription, AlertAction)
- [x] API endpoints implemented
- [x] Alert generation service
- [x] Utility service helpers
- [x] Frontend UI component
- [x] Page route configured
- [ ] Run migration: `npm run db:migrate`
- [ ] Test alert creation
- [ ] Test alert generation
- [ ] Configure cron jobs
- [ ] Set up email notifications (optional)

---

## 📝 Next Steps

1. **Run Migration:**
   ```bash
   npm run db:migrate
   ```

2. **Test Alert System:**
   - Create manual alert via API
   - Generate auto alerts
   - View in UI at `/inventory/alerts`

3. **Configure Notifications:**
   - Email integration
   - SMS integration
   - Push notifications

4. **Set Up Monitoring:**
   - Schedule auto-generation
   - Configure alert thresholds
   - Set up user subscriptions

---

## 🔍 Monitoring & Analytics

Track alert metrics:
- Total alerts by type
- Response time
- Resolution rate
- Most common alerts
- User engagement

---

**System Status:** ✅ **READY TO DEPLOY**

All components created and integrated. Run migration to activate!
