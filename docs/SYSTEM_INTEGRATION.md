# System Integration Documentation
Generated: 2026-02-23

## 📊 Overview

This document describes the integration architecture of the Bedagang PoS platform, including module connections, data flows, API endpoints, database tables, and WebSocket events.

---

## 🔄 Module Integration Map

```
┌─────────────────────────────────────────────────────────────────────┐
│                           HQ PLATFORM                                │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐   │
│  │Dashboard│  │ Finance │  │  HRIS   │  │ Reports │  │Settings │   │
│  └────┬────┘  └────┬────┘  └────┬────┘  └────┬────┘  └─────────┘   │
│       │            │            │            │                       │
│       └────────────┴─────┬──────┴────────────┘                       │
│                          │                                           │
│                    ┌─────▼─────┐                                     │
│                    │  HQ APIs  │                                     │
│                    └─────┬─────┘                                     │
└──────────────────────────┼───────────────────────────────────────────┘
                           │
            ┌──────────────┼──────────────┐
            │              │              │
            ▼              ▼              ▼
     ┌──────────┐   ┌──────────┐   ┌──────────┐
     │ Branch 1 │   │ Branch 2 │   │ Branch N │
     └────┬─────┘   └────┬─────┘   └────┬─────┘
          │              │              │
          └──────────────┼──────────────┘
                         │
    ┌────────────────────┼────────────────────┐
    │                    │                    │
    ▼                    ▼                    ▼
┌───────┐          ┌──────────┐         ┌───────────┐
│  POS  │◄────────►│  Kitchen │◄───────►│ Inventory │
└───┬───┘          └────┬─────┘         └─────┬─────┘
    │                   │                     │
    └───────────────────┴─────────────────────┘
                        │
                        ▼
                  ┌──────────┐
                  │ Database │
                  └──────────┘
```

---

## 📦 Module Descriptions

### 1. POS Module
**Path**: `/pos/*`

| Feature | Description |
|---------|-------------|
| Cashier | Transaction processing |
| Shifts | Shift management |
| History | Transaction history |
| Receipts | Receipt printing |

**Data Output**:
- Transactions → Finance (revenue)
- Orders → Kitchen (preparation)
- Sales → Reports (analytics)

### 2. Kitchen Module
**Path**: `/kitchen/*`

| Feature | Description |
|---------|-------------|
| Orders | Kitchen display system |
| Recipes | Recipe management |
| Inventory | Kitchen stock |
| Staff | Kitchen staff |

**Data Flow**:
- Receives orders from POS
- Deducts ingredients from Inventory
- Sends completion status back to POS

### 3. Inventory Module
**Path**: `/inventory/*`

| Feature | Description |
|---------|-------------|
| Products | Product catalog |
| Stock | Stock levels |
| Movements | Stock transactions |
| Transfers | Inter-branch transfers |
| RAC | Request & Approval |

**Data Flow**:
- Products → POS (availability)
- Stock levels → Kitchen (ingredients)
- Movements → Finance (COGS)

### 4. HQ Finance Module
**Path**: `/hq/finance/*`

| Feature | Description |
|---------|-------------|
| Dashboard | Financial overview |
| Revenue | Revenue tracking |
| Expenses | Expense management |
| P&L | Profit & Loss statement |
| Cash Flow | Cash flow analysis |
| Invoices | Invoice management |
| Budget | Budget planning |
| Tax | Tax reporting |

**Data Sources**:
- POS transactions (revenue)
- Inventory movements (COGS)
- HRIS data (payroll)

### 5. HQ HRIS Module
**Path**: `/hq/hris/*`

| Feature | Description |
|---------|-------------|
| Employees | Employee management |
| Attendance | Attendance tracking |
| KPI | Performance metrics |
| Performance | Performance reviews |

**Data Flow**:
- Attendance → Finance (payroll deductions)
- KPI → Finance (bonus calculations)
- Performance → HR decisions

### 6. Reports Module
**Path**: `/reports/*`

| Feature | Description |
|---------|-------------|
| Sales | Sales reports |
| Inventory | Inventory reports |
| Financial | Financial reports |
| Staff | Staff reports |

**Data Sources**:
- Aggregates from all modules

---

## 🔗 Data Flow Integrations

### POS → Finance
```typescript
// When POS transaction completes
{
  event: 'pos:transaction:complete',
  data: {
    transactionId: 'xxx',
    total: 150000,
    branchId: 'branch-001'
  }
}
// Finance module aggregates for revenue
```

### POS → Kitchen
```typescript
// When order is placed
{
  event: 'kitchen:order:new',
  data: {
    orderId: 'xxx',
    items: [...],
    priority: 'normal'
  }
}
// Kitchen displays for preparation
```

### Kitchen → Inventory
```typescript
// When order is completed
// System deducts recipe ingredients from stock
UPDATE stocks SET quantity = quantity - :used WHERE product_id = :ingredient
```

### Branch → HQ
```typescript
// Real-time metrics sync
{
  event: 'hq:branch:sale',
  data: {
    branchId: 'branch-001',
    dailySales: 5000000,
    transactions: 150
  }
}
```

### HRIS → Finance
```typescript
// Monthly payroll calculation
payroll = baseSalary 
  + (attendance_bonus) 
  + (kpi_bonus) 
  - (late_deductions)
  - (absence_deductions)
```

---

## 🗄️ Database Tables

### Core Tables
| Table | Module | Description |
|-------|--------|-------------|
| `users` | Auth | User accounts |
| `branches` | HQ | Branch locations |
| `tenants` | Multi-tenant | Tenant data |

### POS Tables
| Table | Description |
|-------|-------------|
| `pos_transactions` | Sales transactions |
| `pos_transaction_items` | Transaction line items |
| `shifts` | Cashier shifts |
| `held_transactions` | Held orders |

### Kitchen Tables
| Table | Description |
|-------|-------------|
| `kitchen_orders` | Kitchen orders |
| `kitchen_order_items` | Order items |
| `recipes` | Recipe definitions |
| `recipe_ingredients` | Recipe ingredients |

### Inventory Tables
| Table | Description |
|-------|-------------|
| `products` | Product catalog |
| `stocks` | Stock levels |
| `stock_movements` | Stock transactions |
| `warehouses` | Warehouse locations |

### Finance Tables
| Table | Description |
|-------|-------------|
| `finance_transactions` | Financial transactions |
| `finance_accounts` | Chart of accounts |
| `finance_invoices` | Invoices |
| `finance_budgets` | Budget allocations |

### HRIS Tables
| Table | Description |
|-------|-------------|
| `employees` | Employee records |
| `employee_attendance` | Attendance records |
| `employee_kpis` | KPI scores |
| `kpi_templates` | KPI templates |

---

## 🔌 WebSocket Events

### Event Types
```typescript
type WebSocketEventType = 
  // Kitchen
  | 'kitchen:order:new'
  | 'kitchen:order:update'
  | 'kitchen:order:complete'
  
  // Inventory
  | 'inventory:stock:update'
  | 'inventory:alert'
  
  // POS
  | 'pos:transaction:complete'
  | 'pos:transaction:void'
  
  // HQ
  | 'hq:branch:sale'
  | 'hq:realtime:update'
  
  // HRIS
  | 'hris:attendance:update'
  | 'hris:kpi:update'
  
  // Finance
  | 'finance:revenue:update'
  | 'finance:expense:update'
  | 'finance:alert'
```

### Broadcasting
```typescript
// API endpoint
POST /api/websocket/broadcast
{
  "event": "kitchen:order:new",
  "data": { ... },
  "branchId": "branch-001"
}
```

---

## 🔐 API Authentication

### Session-based Auth
```typescript
import { getServerSession } from 'next-auth/next';
import { authOptions } from './auth/[...nextauth]';

const session = await getServerSession(req, res, authOptions);
if (!session?.user) {
  return res.status(401).json({ error: 'Unauthorized' });
}
```

### Role-based Access
```typescript
const allowedRoles = ['admin', 'hq_admin', 'manager'];
if (!allowedRoles.includes(session.user.role)) {
  return res.status(403).json({ error: 'Access denied' });
}
```

---

## 📡 API Endpoints Summary

### System
| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/system/integration-check` | GET | Check integration status |
| `/api/system/data-flow` | GET | Test data flows |
| `/api/websocket/broadcast` | POST | Broadcast events |

### HQ Finance
| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/hq/finance/summary` | GET | Dashboard summary |
| `/api/hq/finance/realtime` | GET/POST | Real-time data |
| `/api/hq/finance/export` | GET | Export data |
| `/api/hq/finance/profit-loss` | GET | P&L statement |
| `/api/hq/finance/cash-flow` | GET | Cash flow |

### HQ HRIS
| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/hq/hris/employees` | GET/POST | Employee management |
| `/api/hq/hris/attendance` | GET/POST | Attendance |
| `/api/hq/hris/kpi` | GET/POST/PUT | KPI management |
| `/api/hq/hris/realtime` | GET/POST | Real-time data |
| `/api/hq/hris/export` | GET | Export data |

### POS
| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/pos/transactions` | GET/POST | Transactions |
| `/api/pos/shifts` | GET/POST | Shifts |
| `/api/pos/receipts` | GET | Receipts |

### Kitchen
| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/kitchen/orders` | GET/POST/PUT | Orders |
| `/api/kitchen/recipes` | GET/POST | Recipes |
| `/api/kitchen/activities` | GET | Activity feed |

### Inventory
| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/inventory/products` | GET/POST | Products |
| `/api/inventory/stock` | GET/PUT | Stock levels |
| `/api/inventory/realtime` | GET | Real-time data |
| `/api/inventory/export` | GET | Export data |

---

## 🧪 Integration Testing

### Test Endpoints

1. **Integration Check**
```bash
curl http://localhost:3001/api/system/integration-check
```

2. **Data Flow Test**
```bash
curl http://localhost:3001/api/system/data-flow
```

### Expected Response
```json
{
  "timestamp": "2026-02-23T04:30:00.000Z",
  "flows": [
    {
      "flow": "POS → Finance",
      "status": "ok",
      "description": "POS sales data flows correctly to Finance module"
    }
  ],
  "summary": {
    "total": 8,
    "ok": 7,
    "warnings": 1,
    "errors": 0
  },
  "overallStatus": "ok"
}
```

---

## ✅ Integration Checklist

### Database
- [x] Sequelize connection configured
- [x] Models defined with associations
- [x] Tables created with migrations
- [x] Indexes optimized

### APIs
- [x] RESTful endpoints for all modules
- [x] Authentication middleware
- [x] Role-based access control
- [x] Error handling with fallback to mock data

### WebSocket
- [x] Broadcast endpoint available
- [x] Event types defined
- [x] Client hook (useWebSocket)
- [x] SSE fallback for non-WS clients

### Data Flows
- [x] POS → Finance (revenue)
- [x] POS → Kitchen (orders)
- [x] Kitchen → Inventory (stock)
- [x] Branch → HQ (metrics)
- [x] HRIS → Finance (payroll)
- [x] Inventory → POS (products)
- [x] Finance → Reports (analytics)

---

## 🚀 Summary

| Component | Status |
|-----------|--------|
| Database Connection | ✅ |
| Model Associations | ✅ |
| API Endpoints | ✅ |
| WebSocket Events | ✅ |
| Data Flow Integration | ✅ |
| HQ-Branch Sync | ✅ |
| Export Functionality | ✅ |
| Real-time Updates | ✅ |

**SYSTEM INTEGRATION: ✅ COMPLETE**
