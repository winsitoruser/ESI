# 🚀 F&B Modular System - Deployment Guide

## 📋 Prerequisites

### System Requirements
- Node.js 16.x or higher
- PostgreSQL 12.x or higher
- npm or yarn package manager
- Git

### Environment Setup
```bash
# Clone repository
git clone <repository-url>
cd bedagang---PoS

# Install dependencies
npm install

# Setup environment variables
cp .env.example .env
```

### Environment Variables
```env
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/farmanesia_dev

# NextAuth
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-secret-key

# Other configurations
NODE_ENV=development
```

---

## 🗄️ Database Setup

### 1. Run Migrations

```bash
# Run all migrations
npx sequelize-cli db:migrate

# Run specific migration for modular system
npx sequelize-cli db:migrate --name 20260227-create-module-features.js
```

**Migrations Created:**
- ✅ `module_features` - Feature definitions for modules
- ✅ `tenant_module_features` - Tenant-specific feature toggles
- ✅ `module_integration_flows` - Integration flow definitions
- ✅ `tenant_integration_flows` - Active flows per tenant
- ✅ `event_logs` - Event tracking and debugging

### 2. Run Seeders

```bash
# Seed F&B modules
npx sequelize-cli db:seed --seed 20260227-seed-fnb-modules.js
```

**Modules Seeded:**
- Core: POS_CORE, INVENTORY_CORE
- F&B: TABLE_MANAGEMENT, KITCHEN_DISPLAY, RECIPE_MANAGEMENT
- Optional: RESERVATION, ONLINE_ORDERING, DELIVERY_MANAGEMENT, LOYALTY_PROGRAM
- Add-on: WAITER_APP

### 3. Verify Database

```sql
-- Check modules
SELECT code, name, category FROM modules ORDER BY category, sort_order;

-- Check business type associations
SELECT bt.name, m.name, btm.is_default, btm.is_optional
FROM business_type_modules btm
JOIN business_types bt ON btm.business_type_id = bt.id
JOIN modules m ON btm.module_id = m.id
ORDER BY bt.name, m.name;

-- Check dependencies
SELECT m1.name as module, m2.name as depends_on
FROM module_dependencies md
JOIN modules m1 ON md.module_id = m1.id
JOIN modules m2 ON md.depends_on_module_id = m2.id;
```

---

## 🔧 Application Setup

### 1. Start Development Server

```bash
npm run dev
```

Server will start at `http://localhost:3000`

### 2. Access Onboarding Wizard

Navigate to: `http://localhost:3000/onboarding/setup`

**Wizard Steps:**
1. **Select Business Type** - Choose from Fine Dining, Cloud Kitchen, QSR, or Cafe
2. **Select Modules** - Review and select recommended modules
3. **Review & Confirm** - Confirm configuration and complete setup

### 3. Verify Module Configuration

```bash
# Check configured modules via API
curl http://localhost:3000/api/modules/configure \
  -H "Cookie: next-auth.session-token=<your-session-token>"

# Browse module catalog
curl http://localhost:3000/api/modules/catalog?businessType=fine_dining
```

---

## 📦 Module System Architecture

### Core Components

#### 1. Module Registry (`/lib/modules/ModuleRegistry.ts`)
```typescript
import { moduleRegistry } from '@/lib/modules/ModuleRegistry';

// Get all modules
const modules = moduleRegistry.getAllModules();

// Get modules for business type
const fnbModules = moduleRegistry.getModulesForBusinessType('fine_dining');

// Resolve dependencies
const allModules = moduleRegistry.resolveDependencies(['TABLE_MANAGEMENT']);
```

#### 2. Event Bus (`/lib/integration/EventBus.ts`)
```typescript
import { eventBus, FnBEvents } from '@/lib/integration/EventBus';

// Publish event
await eventBus.publish(FnBEvents.ORDER_CREATED, {
  orderId: '123',
  items: [...]
}, {
  tenantId: 'tenant-id',
  userId: 'user-id'
});

// Subscribe to event
eventBus.subscribe(FnBEvents.ORDER_CREATED, async (event) => {
  console.log('Order created:', event.payload);
});
```

#### 3. Flow Orchestrator (`/lib/integration/FlowOrchestrator.ts`)
```typescript
import { flowOrchestrator } from '@/lib/integration/FlowOrchestrator';

// Setup flows for tenant
await flowOrchestrator.setupFlowsForTenant(
  'tenant-id',
  ['POS_CORE', 'KITCHEN_DISPLAY', 'INVENTORY_CORE']
);

// Get active flows
const flows = flowOrchestrator.getActiveFlows('tenant-id');
```

---

## 🎯 Integration Flows

### Automatic Flows Setup

When modules are enabled, integration flows are automatically configured:

#### Order to Kitchen Flow
```
Order Created (POS)
    ↓
Kitchen Display receives order
    ↓
Order routed to appropriate station
```

#### Order to Inventory Flow
```
Order Created (POS)
    ↓
Get recipe ingredients
    ↓
Deduct stock from inventory
    ↓
Check for low stock alerts
```

#### Kitchen to Table Flow
```
Kitchen Order Complete
    ↓
Update table status to "ready to serve"
    ↓
Notify waiter (if Waiter App enabled)
```

#### Payment to Loyalty Flow
```
Payment Completed
    ↓
Calculate loyalty points
    ↓
Award points to customer
```

---

## 🧪 Testing

### 1. Test Module Configuration

```typescript
// Test configuring modules for a tenant
const response = await fetch('/api/modules/configure', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    businessType: 'fine_dining',
    moduleIds: ['POS_CORE', 'TABLE_MANAGEMENT', 'KITCHEN_DISPLAY']
  })
});

const result = await response.json();
console.log('Configured:', result.data.configured);
console.log('Flows setup:', result.data.flowsSetup);
```

### 2. Test Event Publishing

```typescript
import { eventBus, FnBEvents } from '@/lib/integration/EventBus';

// Test order creation event
await eventBus.publish(FnBEvents.ORDER_CREATED, {
  id: 'order-123',
  orderNumber: 'ORD-001',
  items: [
    { productId: 'prod-1', productName: 'Steak', quantity: 1 }
  ],
  tableId: 'table-5',
  total: 50000
}, {
  tenantId: 'test-tenant',
  userId: 'test-user'
});

// Check event log
const logs = eventBus.getEventLog(10);
console.log('Recent events:', logs);
```

### 3. Test Integration Flows

```typescript
// Subscribe to kitchen event
eventBus.subscribe(FnBEvents.KITCHEN_ORDER_RECEIVED, (event) => {
  console.log('Kitchen received order:', event.payload);
});

// Subscribe to inventory event
eventBus.subscribe(FnBEvents.STOCK_DEDUCTED, (event) => {
  console.log('Stock deducted:', event.payload);
});

// Publish order and watch flows execute
await eventBus.publish(FnBEvents.ORDER_CREATED, orderData, metadata);
```

---

## 🔍 Monitoring & Debugging

### Event Logs

Query event logs from database:
```sql
SELECT 
  event_type,
  payload,
  metadata,
  status,
  created_at
FROM event_logs
WHERE tenant_id = 'your-tenant-id'
ORDER BY created_at DESC
LIMIT 100;
```

### Active Flows

Check active flows for tenant:
```sql
SELECT 
  mif.name,
  mif.event_type,
  tif.is_active,
  tif.activated_at
FROM tenant_integration_flows tif
JOIN module_integration_flows mif ON tif.flow_id = mif.id
WHERE tif.tenant_id = 'your-tenant-id'
AND tif.is_active = true;
```

### Module Features

Check enabled features:
```sql
SELECT 
  m.name as module,
  mf.name as feature,
  tmf.is_enabled
FROM tenant_module_features tmf
JOIN module_features mf ON tmf.feature_id = mf.id
JOIN modules m ON tmf.module_id = m.id
WHERE tmf.tenant_id = 'your-tenant-id';
```

---

## 📱 UI Components

### Module Selector Component

```tsx
import ModuleSelector from '@/components/modules/ModuleSelector';

<ModuleSelector
  businessType="fine_dining"
  onModulesSelected={(moduleIds) => {
    console.log('Selected modules:', moduleIds);
  }}
  preSelectedModules={['POS_CORE']}
/>
```

### Business Type Wizard

```tsx
import BusinessTypeWizard from '@/components/onboarding/BusinessTypeWizard';

// Full onboarding flow
<BusinessTypeWizard />
```

---

## 🚢 Production Deployment

### 1. Build Application

```bash
# Build for production
npm run build

# Start production server
npm start
```

### 2. Environment Variables (Production)

```env
NODE_ENV=production
DATABASE_URL=postgresql://user:password@prod-host:5432/farmanesia_prod
NEXTAUTH_URL=https://yourdomain.com
NEXTAUTH_SECRET=<strong-secret-key>
```

### 3. Database Migration (Production)

```bash
# Run migrations on production
NODE_ENV=production npx sequelize-cli db:migrate

# Seed modules
NODE_ENV=production npx sequelize-cli db:seed --seed 20260227-seed-fnb-modules.js
```

### 4. Health Checks

```bash
# Check API health
curl https://yourdomain.com/api/health

# Check module catalog
curl https://yourdomain.com/api/modules/catalog
```

---

## 🔐 Security Considerations

### 1. API Authentication
All module configuration endpoints require authentication:
- Session-based auth via NextAuth
- Role-based access control (super_admin, owner, hq_admin)

### 2. Tenant Isolation
- All module configurations are tenant-scoped
- Event flows are filtered by tenant_id
- Database queries include tenant_id in WHERE clauses

### 3. Input Validation
- Module IDs validated against registry
- Business type validated against allowed types
- Dependency resolution prevents circular dependencies

---

## 📊 Performance Optimization

### 1. Database Indexes
All critical tables have indexes:
- `module_features`: module_id, code, is_active
- `tenant_module_features`: tenant_id + module_id, feature_id
- `module_integration_flows`: source_module_id, target_module_id, event_type
- `event_logs`: tenant_id, event_type, correlation_id, created_at

### 2. Event Bus Optimization
- Event handlers executed in parallel
- Retry logic with exponential backoff
- Event log size limited to 1000 entries

### 3. Caching Strategy
Consider implementing:
- Module catalog caching (Redis)
- Tenant module configuration caching
- Active flows caching per tenant

---

## 🐛 Troubleshooting

### Issue: Modules not appearing in catalog

**Solution:**
```bash
# Re-run seeder
npx sequelize-cli db:seed:undo --seed 20260227-seed-fnb-modules.js
npx sequelize-cli db:seed --seed 20260227-seed-fnb-modules.js
```

### Issue: Integration flows not executing

**Check:**
1. Verify flows are active in database
2. Check event_logs table for errors
3. Verify tenant has modules enabled
4. Check browser console for errors

**Debug:**
```typescript
// Enable debug logging
const logs = eventBus.getEventLog(50);
console.log('Event logs:', logs);

// Check active flows
const flows = flowOrchestrator.getActiveFlows('tenant-id');
console.log('Active flows:', flows);
```

### Issue: Dependencies not resolving

**Solution:**
```typescript
// Manually resolve dependencies
const resolved = moduleRegistry.resolveDependencies(['TABLE_MANAGEMENT']);
console.log('All required modules:', resolved);
```

---

## 📚 Additional Resources

### Documentation Files
- `FNB_MODULAR_SYSTEM_ARCHITECTURE.md` - Complete architecture overview
- `FNB_MODULAR_IMPLEMENTATION_GUIDE.md` - Technical implementation details
- `FNB_DEPLOYMENT_GUIDE.md` - This file

### API Endpoints
- `GET /api/modules/catalog` - Browse module catalog
- `POST /api/modules/configure` - Configure modules for tenant
- `GET /api/modules/configure` - Get configured modules

### Database Tables
- `modules` - Module definitions
- `module_features` - Feature definitions
- `module_dependencies` - Module dependencies
- `business_type_modules` - Business type associations
- `tenant_modules` - Enabled modules per tenant
- `module_integration_flows` - Integration flow definitions
- `event_logs` - Event tracking

---

## ✅ Deployment Checklist

- [ ] Database migrations run successfully
- [ ] F&B modules seeded
- [ ] Business types configured
- [ ] Environment variables set
- [ ] Application builds without errors
- [ ] Module catalog API accessible
- [ ] Module configuration API working
- [ ] Onboarding wizard functional
- [ ] Event bus publishing events
- [ ] Integration flows executing
- [ ] Event logs being recorded
- [ ] Production environment configured
- [ ] SSL certificates installed
- [ ] Monitoring setup
- [ ] Backup strategy in place

---

**Status:** ✅ **DEPLOYMENT GUIDE COMPLETE**  
**Version:** 1.0.0  
**Last Updated:** February 27, 2026  

**System is ready for production deployment! 🚀**
