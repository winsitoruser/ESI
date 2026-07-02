# 📦 Business Package & Industry Dashboard Architecture

## 🎯 Objective
Develop a comprehensive system that:
1. **Industry-Specific Dashboards** - Customized dashboard layouts based on business industry
2. **Business Packages** - Pre-configured bundles of modules and sub-modules for specific business needs
3. **Seamless Integration** - Automatic module activation and dashboard configuration

---

## 🏗️ Architecture Overview

### 1. Business Package System
**Concept:** Bundle multiple modules and sub-modules into ready-to-use business packages

**Example Packages:**
- **Fine Dining Complete** → POS + Table Management + Kitchen Display + Reservations + Recipes
- **Cloud Kitchen Starter** → POS + Kitchen Display + Online Ordering + Delivery
- **QSR Express** → POS + Kitchen Display + Loyalty Program
- **Cafe Essentials** → POS + Table Management + Inventory + Menu Management

### 2. Industry Dashboard System
**Concept:** Different dashboard layouts and widgets based on industry type

**Dashboard Types:**
- **F&B Fine Dining Dashboard** → Table status, Reservations, Kitchen orders, Revenue
- **F&B Cloud Kitchen Dashboard** → Online orders, Delivery tracking, Kitchen efficiency
- **F&B QSR Dashboard** → Order queue, Sales velocity, Inventory alerts
- **Retail Dashboard** → Sales, Inventory, Customer analytics
- **Service Dashboard** → Appointments, Service queue, Staff performance

---

## 📊 Database Schema

### Table: `business_packages`
```sql
CREATE TABLE business_packages (
  id UUID PRIMARY KEY,
  code VARCHAR(100) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  industry_type VARCHAR(50), -- 'fnb', 'retail', 'service', 'manufacturing'
  business_type_id UUID REFERENCES business_types(id),
  category VARCHAR(50), -- 'starter', 'professional', 'enterprise', 'custom'
  icon VARCHAR(100),
  color VARCHAR(20),
  pricing_tier VARCHAR(50),
  base_price DECIMAL(10,2),
  is_active BOOLEAN DEFAULT true,
  is_featured BOOLEAN DEFAULT false,
  sort_order INTEGER,
  metadata JSON, -- Additional package info
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);
```

### Table: `package_modules`
```sql
CREATE TABLE package_modules (
  id UUID PRIMARY KEY,
  package_id UUID REFERENCES business_packages(id) ON DELETE CASCADE,
  module_id UUID REFERENCES modules(id) ON DELETE CASCADE,
  is_required BOOLEAN DEFAULT true,
  is_default_enabled BOOLEAN DEFAULT true,
  configuration JSON, -- Module-specific config for this package
  sort_order INTEGER,
  created_at TIMESTAMP,
  updated_at TIMESTAMP,
  UNIQUE(package_id, module_id)
);
```

### Table: `package_features`
```sql
CREATE TABLE package_features (
  id UUID PRIMARY KEY,
  package_id UUID REFERENCES business_packages(id) ON DELETE CASCADE,
  feature_code VARCHAR(100) NOT NULL,
  feature_name VARCHAR(255) NOT NULL,
  is_enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);
```

### Table: `dashboard_configurations`
```sql
CREATE TABLE dashboard_configurations (
  id UUID PRIMARY KEY,
  code VARCHAR(100) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  industry_type VARCHAR(50),
  business_type_id UUID REFERENCES business_types(id),
  layout_type VARCHAR(50), -- 'grid', 'masonry', 'flex'
  widgets JSON, -- Array of widget configurations
  theme JSON, -- Color scheme, fonts, etc.
  is_default BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);
```

### Table: `tenant_packages`
```sql
CREATE TABLE tenant_packages (
  id UUID PRIMARY KEY,
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  package_id UUID REFERENCES business_packages(id),
  is_active BOOLEAN DEFAULT true,
  activated_at TIMESTAMP,
  activated_by UUID REFERENCES users(id),
  configuration JSON,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);
```

### Table: `tenant_dashboards`
```sql
CREATE TABLE tenant_dashboards (
  id UUID PRIMARY KEY,
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  dashboard_config_id UUID REFERENCES dashboard_configurations(id),
  customization JSON, -- Tenant-specific widget customizations
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);
```

---

## 🎨 Widget System

### Widget Types
```typescript
interface DashboardWidget {
  id: string;
  type: 'metric' | 'chart' | 'table' | 'list' | 'status' | 'calendar';
  title: string;
  dataSource: string; // API endpoint or data key
  size: 'small' | 'medium' | 'large' | 'full';
  position: { x: number; y: number; w: number; h: number };
  refreshInterval?: number; // in seconds
  config: {
    chartType?: 'line' | 'bar' | 'pie' | 'donut';
    metrics?: string[];
    filters?: any;
    displayOptions?: any;
  };
}
```

### Pre-defined Widgets

**F&B Widgets:**
- `table-status` - Live table occupancy
- `kitchen-orders` - Active kitchen orders
- `reservation-calendar` - Today's reservations
- `revenue-today` - Today's revenue metric
- `top-selling-items` - Best sellers chart
- `order-queue` - Current order queue
- `delivery-tracking` - Active deliveries map

**Retail Widgets:**
- `sales-today` - Daily sales metric
- `inventory-alerts` - Low stock alerts
- `top-products` - Best selling products
- `customer-traffic` - Foot traffic chart

**Service Widgets:**
- `appointment-calendar` - Today's appointments
- `service-queue` - Current service queue
- `staff-performance` - Staff metrics
- `customer-satisfaction` - Rating trends

---

## 🔄 Business Package Flow

### 1. Package Selection
```
User selects business type → System recommends packages → User selects package
```

### 2. Package Activation
```typescript
async function activatePackage(tenantId: string, packageId: string) {
  // 1. Get package with all modules
  const package = await getPackageWithModules(packageId);
  
  // 2. Resolve module dependencies
  const allRequiredModules = await resolveDependencies(package.modules);
  
  // 3. Enable all modules for tenant
  for (const module of allRequiredModules) {
    await enableModuleForTenant(tenantId, module.id, module.configuration);
  }
  
  // 4. Apply package configuration
  await applyPackageConfiguration(tenantId, package);
  
  // 5. Set up dashboard
  await configureDashboard(tenantId, package.dashboardConfigId);
  
  // 6. Record package activation
  await recordPackageActivation(tenantId, packageId);
}
```

### 3. Dashboard Configuration
```typescript
async function configureDashboard(tenantId: string, dashboardConfigId: string) {
  // 1. Get dashboard configuration
  const dashboardConfig = await getDashboardConfig(dashboardConfigId);
  
  // 2. Apply widgets based on enabled modules
  const availableWidgets = filterWidgetsByModules(
    dashboardConfig.widgets,
    tenantEnabledModules
  );
  
  // 3. Create tenant dashboard
  await createTenantDashboard(tenantId, dashboardConfig, availableWidgets);
}
```

---

## 📦 Pre-defined Business Packages

### F&B Industry

#### 1. Fine Dining Complete
```json
{
  "code": "FNB_FINE_DINING_COMPLETE",
  "name": "Fine Dining Complete Package",
  "modules": [
    "POS_CORE",
    "INVENTORY_CORE",
    "TABLE_MANAGEMENT",
    "KITCHEN_DISPLAY",
    "RECIPE_MANAGEMENT",
    "RESERVATION",
    "WAITER_APP"
  ],
  "dashboard": "fnb_fine_dining_dashboard",
  "features": [
    "Multi-course ordering",
    "Table service management",
    "Reservation system",
    "Kitchen order routing",
    "Recipe costing",
    "Waiter mobile app"
  ]
}
```

#### 2. Cloud Kitchen Starter
```json
{
  "code": "FNB_CLOUD_KITCHEN_STARTER",
  "name": "Cloud Kitchen Starter Package",
  "modules": [
    "POS_CORE",
    "INVENTORY_CORE",
    "KITCHEN_DISPLAY",
    "ONLINE_ORDERING",
    "DELIVERY_MANAGEMENT",
    "RECIPE_MANAGEMENT"
  ],
  "dashboard": "fnb_cloud_kitchen_dashboard",
  "features": [
    "Online order integration",
    "Kitchen display system",
    "Delivery tracking",
    "Recipe management",
    "Multi-brand support"
  ]
}
```

#### 3. QSR Express
```json
{
  "code": "FNB_QSR_EXPRESS",
  "name": "QSR Express Package",
  "modules": [
    "POS_CORE",
    "INVENTORY_CORE",
    "KITCHEN_DISPLAY",
    "LOYALTY_PROGRAM"
  ],
  "dashboard": "fnb_qsr_dashboard",
  "features": [
    "Fast order processing",
    "Kitchen display",
    "Loyalty rewards",
    "Quick inventory"
  ]
}
```

#### 4. Cafe Essentials
```json
{
  "code": "FNB_CAFE_ESSENTIALS",
  "name": "Cafe Essentials Package",
  "modules": [
    "POS_CORE",
    "INVENTORY_CORE",
    "TABLE_MANAGEMENT",
    "RECIPE_MANAGEMENT",
    "ONLINE_ORDERING"
  ],
  "dashboard": "fnb_cafe_dashboard",
  "features": [
    "Table management",
    "Recipe cards",
    "Online ordering",
    "Inventory tracking"
  ]
}
```

---

## 🎨 Dashboard Layouts

### Fine Dining Dashboard
```typescript
const fineDiningDashboard = {
  layout: 'grid',
  widgets: [
    { type: 'table-status', position: { x: 0, y: 0, w: 6, h: 4 } },
    { type: 'reservation-calendar', position: { x: 6, y: 0, w: 6, h: 4 } },
    { type: 'kitchen-orders', position: { x: 0, y: 4, w: 8, h: 4 } },
    { type: 'revenue-today', position: { x: 8, y: 4, w: 4, h: 2 } },
    { type: 'top-selling-items', position: { x: 8, y: 6, w: 4, h: 2 } }
  ]
};
```

### Cloud Kitchen Dashboard
```typescript
const cloudKitchenDashboard = {
  layout: 'grid',
  widgets: [
    { type: 'order-queue', position: { x: 0, y: 0, w: 8, h: 4 } },
    { type: 'delivery-tracking', position: { x: 8, y: 0, w: 4, h: 4 } },
    { type: 'kitchen-efficiency', position: { x: 0, y: 4, w: 6, h: 3 } },
    { type: 'revenue-today', position: { x: 6, y: 4, w: 3, h: 3 } },
    { type: 'online-orders-chart', position: { x: 9, y: 4, w: 3, h: 3 } }
  ]
};
```

---

## 🔌 API Endpoints

### Business Packages
- `GET /api/packages` - List all packages
- `GET /api/packages/:id` - Get package details
- `GET /api/packages/recommended` - Get recommended packages for business type
- `POST /api/packages/:id/activate` - Activate package for tenant
- `GET /api/tenant/packages` - Get tenant's active packages

### Dashboard Configuration
- `GET /api/dashboards` - List dashboard configurations
- `GET /api/dashboards/:id` - Get dashboard config
- `GET /api/dashboards/industry/:type` - Get dashboards by industry
- `POST /api/tenant/dashboard` - Set tenant dashboard
- `GET /api/tenant/dashboard` - Get tenant's dashboard
- `PUT /api/tenant/dashboard/widgets` - Update dashboard widgets

---

## 🎯 Implementation Priority

### Phase 1: Database & Core Logic
1. Create database migrations
2. Build package and dashboard models
3. Implement package activation logic
4. Create dependency resolution system

### Phase 2: API Development
1. Business package CRUD endpoints
2. Dashboard configuration endpoints
3. Package activation API
4. Widget data endpoints

### Phase 3: UI Components
1. Business package selector
2. Package comparison view
3. Dashboard configuration wizard
4. Widget library and customizer

### Phase 4: Pre-defined Content
1. Seed F&B business packages
2. Seed dashboard configurations
3. Create widget templates
4. Set up default layouts

---

## ✅ Success Criteria

1. ✅ User can select a business package during onboarding
2. ✅ All package modules are automatically activated
3. ✅ Dashboard is configured based on industry type
4. ✅ Widgets display relevant data from enabled modules
5. ✅ User can customize dashboard layout
6. ✅ Package can be upgraded or changed
7. ✅ Dependencies are automatically resolved
8. ✅ System is scalable for new packages and industries
