# 📁 Struktur Project Bedagang PoS - Dokumentasi Komprehensif

## 🏗️ Overview Project

**Bedagang PoS** adalah sistem Point of Sale modern yang dirancang untuk multi-tenant dengan arsitektur microservices-ready. Sistem ini mendukung berbagai jenis bisnis dengan modul yang dapat diaktifkan sesuai kebutuhan.

### **Teknologi Utama**
- **Frontend:** Next.js 15.5.10 + React 18 + TypeScript
- **Backend:** Next.js API Routes + Node.js
- **Database:** PostgreSQL 14+ dengan Sequelize ORM
- **Authentication:** NextAuth.js v4
- **Styling:** Tailwind CSS + shadcn/ui components
- **State Management:** React Context + Custom Hooks
- **Real-time:** WebSocket (planned)

---

## 📂 Struktur Folder Detail

```
bedagang/
│
├── 📄 CONFIGURATION FILES
│   ├── 📄 .env                    # Environment variables (SECRET)
│   ├── 📄 .env.example           # Template environment
│   ├── 📄 .gitignore             # Git ignore rules
│   ├── 📄 .eslintrc.json         # ESLint configuration
│   ├── 📄 .prettierrc            # Prettier configuration
│   ├── 📄 next.config.js         # Next.js config (custom webpack, etc)
│   ├── 📄 tailwind.config.js     # Tailwind CSS config + custom theme
│   ├── 📄 tsconfig.json          # TypeScript compiler options
│   ├── 📄 jsconfig.json          # JavaScript config for IDE support
│   └── 📄 package.json           # Dependencies, scripts, metadata
│
├── 📁 SOURCE CODE (/src akan di-migrate di masa depan)
│   │
│   ├── 📁 components/            # 🔧 Reusable UI Components
│   │   │
│   │   ├── 📁 ui/               # 🎨 Base UI Components (shadcn/ui)
│   │   │   ├── 📄 button.tsx
│   │   │   │   ├── Variants: default, destructive, outline, secondary, ghost, link
│   │   │   │   ├── Sizes: sm, md, lg, xl
│   │   │   │   └── Features: loading state, disabled, icons
│   │   │   ├── 📄 card.tsx
│   │   │   │   ├── Header, Content, Footer sub-components
│   │   │   │   ├── Variants: default, outlined, elevated
│   │   │   │   └── Features: hover effects, transitions
│   │   │   ├── 📄 input.tsx
│   │   │   ├── 📄 label.tsx
│   │   │   ├── 📄 select.tsx
│   │   │   ├── 📄 textarea.tsx
│   │   │   ├── 📄 checkbox.tsx
│   │   │   ├── 📄 switch.tsx
│   │   │   ├── 📄 badge.tsx
│   │   │   ├── 📄 avatar.tsx
│   │   │   ├── 📄 toast.tsx
│   │   │   ├── 📄 dialog.tsx
│   │   │   ├── 📄 dropdown-menu.tsx
│   │   │   ├── 📄 tabs.tsx
│   │   │   ├── 📄 table.tsx
│   │   │   ├── 📄 progress.tsx
│   │   │   └── 📄 separator.tsx
│   │   │
│   │   ├── 📁 layouts/          # 🏗️ Layout Components
│   │   │   ├── 📄 DashboardLayout.tsx
│   │   │   │   ├── Sidebar navigation
│   │   │   │   ├── Top bar with user menu
│   │   │   │   ├── Breadcrumb navigation
│   │   │   │   └── Responsive design
│   │   │   ├── 📄 AuthLayout.tsx
│   │   │   │   ├── Centered auth forms
│   │   │   │   ├── Background decoration
│   │   │   │   └── Brand elements
│   │   │   ├── 📄 PublicLayout.tsx
│   │   │   │   ├── Landing page layout
│   │   │   │   ├── Navigation header
│   │   │   │   └── Footer component
│   │   │   └── 📄 KitchenLayout.tsx
│   │   │       ├── Full-screen KDS layout
│   │   │       ├── No sidebar distraction
│   │   │       └── Order priority display
│   │   │
│   │   ├── 📁 forms/            # 📝 Form Components
│   │   │   ├── 📄 ProductForm.tsx
│   │   │   │   ├── CRUD operations
│   │   │   │   ├── Image upload
│   │   │   │   ├── Category selection
│   │   │   │   └── Price validation
│   │   │   ├── 📄 UserForm.tsx
│   │   │   ├── 📄 CustomerForm.tsx
│   │   │   ├── 📄 SupplierForm.tsx
│   │   │   ├── 📄 TableForm.tsx
│   │   │   ├── 📄 ReservationForm.tsx
│   │   │   └── 📄 TenantForm.tsx
│   │   │
│   │   ├── 📁 charts/           # 📊 Chart Components
│   │   │   ├── 📄 SalesChart.tsx
│   │   │   ├── 📄 InventoryChart.tsx
│   │   │   ├── 📄 CustomerChart.tsx
│   │   │   └── 📄 FinancialChart.tsx
│   │   │
│   │   ├── 📁 tables/           # 📋 Table Components
│   │   │   ├── 📄 DataTable.tsx
│   │   │   │   ├── Sorting, filtering, pagination
│   │   │   │   ├── Bulk actions
│   │   │   │   ├── Column customization
│   │   │   │   └── Export functionality
│   │   │   ├── 📄 ProductTable.tsx
│   │   │   ├── 📄 TransactionTable.tsx
│   │   │   ├── 📄 UserTable.tsx
│   │   │   └── 📄 InventoryTable.tsx
│   │   │
│   │   └── 📁 common/           # 🔧 Common Components
│   │       ├── 📄 LoadingSpinner.tsx
│   │       ├── 📄 ErrorBoundary.tsx
│   │       ├── 📄 EmptyState.tsx
│   │       ├── 📄 SearchBar.tsx
│   │       ├── 📄 DateRangePicker.tsx
│   │       ├── 📄 FileUpload.tsx
│   │       ├── 📄 ImageGallery.tsx
│   │       ├── 📄 ConfirmDialog.tsx
│   │       └── 📄 PrintButton.tsx
│   │
│   ├── 📁 pages/                # 📄 Next.js Pages (File-based Routing)
│   │   │
│   │   ├── 📄 _app.tsx          # 🎯 App Component
│   │   │   ├── Global providers (Theme, Auth, Toast)
│   │   │   ├── Component imports
│   │   │   ├── CSS imports
│   │   │   └── Error handling
│   │   ├── 📄 _document.tsx     # 📄 Document Component
│   │   │   ├── HTML structure
│   │   │   ├── Meta tags
│   │   │   ├── Font imports
│   │   │   └── Custom scripts
│   │   ├── 📄 _error.tsx         # ❌ Error Page
│   │   ├── 📄 _offline.tsx      # 📵 Offline Page
│   │   ├── 📄 index.tsx         # 🏠 Landing Page
│   │   │
│   │   ├── 📁 api/              # 🔌 API Routes (Backend)
│   │   │   │
│   │   │   ├── 📁 auth/         # 🔐 Authentication Endpoints
│   │   │   │   ├── 📄 [...nextauth].ts
│   │   │   │   │   ├── NextAuth configuration
│   │   │   │   │   ├── OAuth providers (Google, etc)
│   │   │   │   │   ├── JWT strategy
│   │   │   │   │   ├── Session management
│   │   │   │   │   └── Callback handlers
│   │   │   │   ├── 📄 login.ts
│   │   │   │   │   ├── Custom login handler
│   │   │   │   │   ├── Rate limiting
│   │   │   │   │   └── Brute force protection
│   │   │   │   ├── 📄 register.ts
│   │   │   │   ├── 📄 logout.ts
│   │   │   │   ├── 📄 forgot-password.ts
│   │   │   │   └── 📄 reset-password.ts
│   │   │   │
│   │   │   ├── 📁 dashboard/    # 📊 Dashboard API Endpoints
│   │   │   │   ├── 📄 stats.ts
│   │   │   │   │   ├── Sales statistics
│   │   │   │   │   ├── Period filtering (today/week/month)
│   │   │   │   │   ├── Chart data preparation
│   │   │   │   │   └── Caching layer
│   │   │   │   ├── 📄 fnb-stats.ts
│   │   │   │   │   ├── F&B specific metrics
│   │   │   │   │   ├── Kitchen operations data
│   │   │   │   │   ├── Table occupancy
│   │   │   │   │   └── Reservation analytics
│   │   │   │   ├── 📄 overview.ts
│   │   │   │   └── 📄 recent-activity.ts
│   │   │   │
│   │   │   ├── 📁 pos/          # 💳 Point of Sale APIs
│   │   │   │   ├── 📄 transactions.ts
│   │   │   │   │   ├── CRUD transactions
│   │   │   │   │   ├── Payment processing
│   │   │   │   │   ├── Receipt generation
│   │   │   │   │   └── Transaction history
│   │   │   │   ├── 📄 transactions/index.ts
│   │   │   │   ├── 📄 transactions/[id].ts
│   │   │   │   ├── 📄 products.ts
│   │   │   │   │   ├── Product search
│   │   │   │   │   ├── Price lookup
│   │   │   │   │   └── Stock check
│   │   │   │   ├── 📄 customers.ts
│   │   │   │   ├── 📄 held.ts
│   │   │   │   │   ├── Hold transaction functionality
│   │   │   │   │   ├── List held transactions
│   │   │   │   │   ├── Resume held transaction
│   │   │   │   │   └── Cancel held transaction
│   │   │   │   ├── 📄 held/[id]/
│   │   │   │   │   ├── cancel.ts
│   │   │   │   │   └── resume.ts
│   │   │   │   └── 📄 settings.ts
│   │   │   │
│   │   │   ├── 📁 inventory/    # 📦 Inventory Management APIs
│   │   │   │   ├── 📄 products.ts
│   │   │   │   │   ├── Product CRUD
│   │   │   │   │   ├── Category management
│   │   │   │   │   ├── Barcode scanning
│   │   │   │   │   └── Image management
│   │   │   │   ├── 📄 stock.ts
│   │   │   │   │   ├── Stock levels
│   │   │   │   │   ├── Stock movements
│   │   │   │   │   ├── Low stock alerts
│   │   │   │   │   └── Stock adjustments
│   │   │   │   ├── 📄 stocktake.ts
│   │   │   │   │   ├── Stock count sessions
│   │   │   │   │   ├── Variance reporting
│   │   │   │   │   └── Approval workflow
│   │   │   │   ├── 📄 purchase-orders.ts
│   │   │   │   ├── 📄 goods-receipts.ts
│   │   │   │   ├── 📄 suppliers.ts
│   │   │   │   ├── 📄 categories.ts
│   │   │   │   ├── 📄 low-stock.ts
│   │   │   │   ├── 📄 expiry.ts
│   │   │   │   └── 📄 movements.ts
│   │   │   │
│   │   │   ├── 📁 kitchen/      # 👨‍🍳 Kitchen Display System APIs
│   │   │   │   ├── 📄 orders.ts
│   │   │   │   │   ├── Order management
│   │   │   │   │   ├── Status updates
│   │   │   │   │   ├── Priority sorting
│   │   │   │   │   └── Time tracking
│   │   │   │   ├── 📄 orders/[id]/
│   │   │   │   │   ├── status.ts
│   │   │   │   │   └── assign.ts
│   │   │   │   ├── 📄 display.ts
│   │   │   │   │   ├── KDS display data
│   │   │   │   │   ├── Real-time updates
│   │   │   │   │   └── Order filtering
│   │   │   │   ├── 📄 inventory.ts
│   │   │   │   │   ├── Kitchen stock
│   │   │   │   │   ├── Ingredient tracking
│   │   │   │   │   └── Usage reporting
│   │   │   │   ├── 📄 recipes.ts
│   │   │   │   │   ├── Recipe management
│   │   │   │   │   ├── Cost calculation
│   │   │   │   │   └── Nutrition info
│   │   │   │   ├── 📄 settings.ts
│   │   │   │   ├── 📄 staff.ts
│   │   │   │   └── 📄 reports.ts
│   │   │   │
│   │   │   ├── 📁 tables/       # 🍽️ Table Management APIs
│   │   │   │   ├── 📄 index.ts
│   │   │   │   │   ├── Table CRUD
│   │   │   │   │   ├── Status management
│   │   │   │   │   └── Layout configuration
│   │   │   │   ├── 📄 [id].ts
│   │   │   │   │   ├── Single table operations
│   │   │   │   │   └── Status updates
│   │   │   │   ├── 📄 [id]/status.ts
│   │   │   │   ├── 📄 status.ts
│   │   │   │   │   ├── All tables status
│   │   │   │   │   ├── Real-time updates
│   │   │   │   │   └── Occupancy metrics
│   │   │   │   └── 📄 layout/
│   │   │   │       └── [floor].ts
│   │   │   │
│   │   │   ├── 📁 reservations/ # 📅 Reservation APIs
│   │   │   │   ├── 📄 index.ts
│   │   │   │   │   ├── Reservation CRUD
│   │   │   │   │   ├── Calendar view data
│   │   │   │   │   └── Conflict checking
│   │   │   │   ├── 📄 [id]/
│   │   │   │   │   ├── index.ts
│   │   │   │   │   ├── status.ts
│   │   │   │   │   └── assign-table.ts
│   │   │   │   ├── 📄 today.ts
│   │   │   │   │   ├── Today's reservations
│   │   │   │   │   ├── Time slot availability
│   │   │   │   │   └── Guest management
│   │   │   │   ├── 📄 upcoming.ts
│   │   │   │   ├── 📄 availability.ts
│   │   │   │   └── 📄 calendar.ts
│   │   │   │
│   │   │   ├── 📁 finance/      # 💰 Financial APIs
│   │   │   │   ├── 📄 invoices.ts
│   │   │   │   │   ├── Invoice generation
│   │   │   │   │   ├── Payment tracking
│   │   │   │   │   └── Tax calculations
│   │   │   │   ├── 📄 invoices/[id]/
│   │   │   │   │   ├── payment.ts
│   │   │   │   │   └── inventory.ts
│   │   │   │   ├── 📄 expenses.ts
│   │   │   │   ├── 📄 reports.ts
│   │   │   │   ├── 📄 tax.ts
│   │   │   │   └── 📄 accounting.ts
│   │   │   │
│   │   │   ├── 📁 admin/        # 👑 Admin Panel APIs
│   │   │   │   ├── 📄 users.ts
│   │   │   │   │   ├── User management
│   │   │   │   │   ├── Role assignment
│   │   │   │   │   └── Permission control
│   │   │   │   ├── 📄 users/[id].ts
│   │   │   │   ├── 📄 tenants.ts
│   │   │   │   │   ├── Tenant CRUD
│   │   │   │   │   ├── Subscription management
│   │   │   │   │   └── Configuration
│   │   │   │   ├── 📄 tenants/[id]/
│   │   │   │   │   ├── index.ts
│   │   │   │   │   └── modules.ts
│   │   │   │   ├── 📄 business-types.ts
│   │   │   │   ├── 📄 business-types/[id].ts
│   │   │   │   ├── 📄 modules.ts
│   │   │   │   ├── 📄 modules/[id].ts
│   │   │   │   ├── 📄 analytics.ts
│   │   │   │   ├── 📄 analytics/
│   │   │   │   │   └── overview.ts
│   │   │   │   └── 📄 transactions/
│   │   │   │       └── [id].ts
│   │   │   │
│   │   │   ├── 📁 reports/      # 📈 Reporting APIs
│   │   │   │   ├── 📄 dashboard.ts
│   │   │   │   ├── 📄 sales.ts
│   │   │   │   ├── 📄 inventory.ts
│   │   │   │   ├── 📄 financial.ts
│   │   │   │   ├── 📄 customers.ts
│   │   │   │   └── 📄 export.ts
│   │   │   │
│   │   │   ├── 📁 integration/  # 🔗 Integration APIs
│   │   │   │   ├── 📄 order-status-sync.ts
│   │   │   │   ├── 📄 order-status.ts
│   │   │   │   ├── 📄 pos-to-kitchen.ts
│   │   │   │   ├── 📄 reservation-to-order.ts
│   │   │   │   └── 📄 unified-order-flow.ts
│   │   │   │
│   │   │   ├── 📁 products/     # 🛍️ Product APIs
│   │   │   │   ├── 📄 [id]/
│   │   │   │   │   ├── hpp.ts
│   │   │   │   │   ├── hpp/
│   │   │   │   │   │   ├── calculate.ts
│   │   │   │   │   │   ├── components.ts
│   │   │   │   │   │   └── history.ts
│   │   │   │   │   └── price.ts
│   │   │   │   └── 📄 hpp/
│   │   │   │       ├── analysis.ts
│   │   │   │       └── bulk-update.ts
│   │   │   │
│   │   │   └── 📁 business/     # 🏢 Business Configuration
│   │   │       ├── 📄 config.ts
│   │   │       │   ├── Business type detection
│   │   │       │   ├── Module availability
│   │   │       │   └── Tenant settings
│   │   │       └── 📄 types.ts
│   │   │
│   │   ├── 📁 auth/             # 🔐 Authentication Pages
│   │   │   ├── 📄 login.tsx
│   │   │   │   ├── Login form
│   │   │   │   ├── Social login options
│   │   │   │   ├── Remember me
│   │   │   │   └── Forgot password link
│   │   │   ├── 📄 register.tsx
│   │   │   ├── 📄 forgot-password.tsx
│   │   │   ├── 📄 reset-password.tsx
│   │   │   ├── 📄 verify-email.tsx
│   │   │   └── 📄 new-verification.tsx
│   │   │
│   │   ├── 📄 dashboard.tsx     # 📊 Main Dashboard
│   │   │   ├── Business type detection
│   │   │   ├── Auto-redirect logic
│   │   │   ├── Quick stats overview
│   │   │   ├── Recent transactions
│   │   │   └── Quick actions
│   │   │
│   │   ├── 📄 dashboard-fnb.tsx # 🍽️ F&B Dashboard
│   │   │   ├── Restaurant theme (orange-red)
│   │   │   ├── Kitchen operations view
│   │   │   ├── Table status grid
│   │   │   ├── Today's reservations
│   │   │   ├── Real-time metrics
│   │   │   └── Auto-refresh (30s)
│   │   │
│   │   ├── 📁 pos/              # 💳 Point of Sale Pages
│   │   │   ├── 📄 cashier.tsx
│   │   │   │   ├── POS interface
│   │   │   │   ├── Product search
│   │   │   │   ├── Cart management
│   │   │   │   ├── Payment processing
│   │   │   │   ├── Receipt printing
│   │   │   │   └── Hold/Resume transactions
│   │   │   ├── 📄 transactions.tsx
│   │   │   │   ├── Transaction history
│   │   │   │   ├── Advanced filtering
│   │   │   │   ├── Export options
│   │   │   │   └── Transaction details
│   │   │   ├── 📄 settings.tsx
│   │   │   │   ├── Printer configuration
│   │   │   │   ├── Payment settings
│   │   │   │   ├── Tax configuration
│   │   │   │   └── Receipt customization
│   │   │   └── 📄 held-transactions.tsx
│   │   │
│   │   ├── 📁 inventory/        # 📦 Inventory Pages
│   │   │   ├── 📄 index.tsx
│   │   │   │   ├── Product listing
│   │   │   │   ├── Stock levels
│   │   │   │   ├── Quick actions
│   │   │   │   └── Low stock alerts
│   │   │   ├── 📄 stock-opname.tsx
│   │   │   │   ├── Stock count interface
│   │   │   │   ├── Variance reporting
│   │   │   │   └── Approval workflow
│   │   │   ├── 📄 production.tsx
│   │   │   ├── 📄 goods-receipt.tsx
│   │   │   ├── 📄 purchase-orders.tsx
│   │   │   └── 📄 suppliers.tsx
│   │   │
│   │   ├── 📁 kitchen/          # 👨‍🍳 Kitchen Display System
│   │   │   ├── 📄 index.tsx
│   │   │   │   ├── Kitchen dashboard
│   │   │   │   ├── Order queue
│   │   │   │   ├── Performance metrics
│   │   │   │   └── Staff management
│   │   │   ├── 📄 display.tsx
│   │   │   │   ├── Full-screen KDS
│   │   │   │   ├── Real-time orders
│   │   │   │   ├── Status updates
│   │   │   │   ├── Timer display
│   │   │   │   └── Priority indicators
│   │   │   ├── 📄 orders.tsx
│   │   │   │   ├── Order management
│   │   │   │   ├── Bulk operations
│   │   │   │   └── Order history
│   │   │   ├── 📄 inventory.tsx
│   │   │   │   ├── Kitchen stock view
│   │   │   │   ├── Ingredient usage
│   │   │   │   └── Low stock alerts
│   │   │   ├── 📄 recipes.tsx
│   │   │   │   ├── Recipe management
│   │   │   │   ├── Cost calculation
│   │   │   │   └── Nutrition tracking
│   │   │   ├── 📄 staff.tsx
│   │   │   │   ├── Staff scheduling
│   │   │   │   ├── Performance tracking
│   │   │   │   └── Role management
│   │   │   └── 📄 reports.tsx
│   │   │
│   │   ├── 📁 tables/           # 🍽️ Table Management
│   │   │   ├── 📄 index.tsx
│   │   │   │   ├── Table grid view
│   │   │   │   ├── Visual table layout
│   │   │   │   ├── Status indicators
│   │   │   │   └── Quick actions
│   │   │   └── 📄 settings.tsx
│   │   │       ├── Table configuration
│   │   │       ├── Floor layout editor
│   │   │       └── Table types
│   │   │
│   │   ├── 📁 reservations/     # 📅 Reservations
│   │   │   └── 📄 index.tsx
│   │   │       ├── Calendar view
│   │   │       ├── Reservation form
│   │   │       ├── Time slot management
│   │   │       └── Guest management
│   │   │
│   │   ├── 📁 finance/          # 💰 Financial Pages
│   │   │   ├── 📄 invoices.tsx
│   │   │   │   ├── Invoice generation
│   │   │   │   ├── Payment tracking
│   │   │   │   └── Tax reports
│   │   │   ├── 📄 expenses.tsx
│   │   │   ├── 📄 reports.tsx
│   │   │   └── 📄 accounting.tsx
│   │   │
│   │   ├── 📁 reports/          # 📈 Reports
│   │   │   ├── 📄 sales.tsx
│   │   │   ├── 📄 inventory.tsx
│   │   │   ├── 📄 financial.tsx
│   │   │   └── 📄 customers.tsx
│   │   │
│   │   ├── 📁 admin/            # 👑 Admin Panel
│   │   │   ├── 📄 dashboard.tsx
│   │   │   ├── 📄 dashboard-new.tsx
│   │   │   ├── 📄 dashboard-unified.tsx
│   │   │   ├── 📄 users.tsx
│   │   │   ├── 📄 tenants.tsx
│   │   │   │   ├── Tenant listing
│   │   │   │   ├── Subscription status
│   │   │   │   └── Module configuration
│   │   │   ├── 📄 tenants/[id]/
│   │   │   │   ├── 📄 index.tsx
│   │   │   │   └── 📄 modules.tsx
│   │   │   ├── 📄 business-types.tsx
│   │   │   ├── 📄 business-types/[id].tsx
│   │   │   ├── 📄 modules.tsx
│   │   │   ├── 📄 modules/[id].tsx
│   │   │   ├── 📄 partners.tsx
│   │   │   ├── 📄 partners/[id].tsx
│   │   │   ├── 📄 analytics.tsx
│   │   │   └── 📄 transactions/[id].tsx
│   │   │
│   │   ├── 📁 products/         # 🛍️ Product Management
│   │   │   ├── 📄 index.tsx
│   │   │   ├── 📄 [id].tsx
│   │   │   └── 📄 hpp-analysis.tsx
│   │   │
│   │   └── 📁 settings/         # ⚙️ Settings
│   │       ├── 📄 profile.tsx
│   │       ├── 📄 business.tsx
│   │       ├── 📄 integrations.tsx
│   │       └── 📄 system.tsx
│   │
│   ├── 📁 models/              # 🗄️ Database Models (Sequelize)
│   │   ├── 📄 index.js          # Model aggregator & associations
│   │   │   ├── Import all models
│   │   │   ├── Setup associations
│   │   │   └── Export db instance
│   │   │
│   │   ├── 📄 User.js           # User model
│   │   │   ├── Fields: id, name, email, password, role, etc
│   │   │   ├── Associations: tenant, sessions
│   │   │   ├── Hooks: password hashing
│   │   │   └── Scopes: active, byRole
│   │   │
│   │   ├── 📄 Tenant.js         # Tenant model
│   │   ├── 📄 BusinessType.js   # Business type model
│   │   ├── 📄 Module.js         # Module model
│   │   ├── 📄 Product.js        # Product model with HPP fields
│   │   ├── 📄 PosTransaction.js # POS transaction model
│   │   ├── 📄 PosTransactionItem.js
│   │   ├── 📄 Stock.js          # Stock model
│   │   ├── 📄 StockMovement.js
│   │   ├── 📄 StockAdjustment.js
│   │   ├── 📄 Table.js          # Table model
│   │   ├── 📄 TableSession.js
│   │   ├── 📄 Reservation.js    # Reservation model
│   │   ├── 📄 KitchenOrder.js   # Kitchen order model
│   │   ├── 📄 KitchenOrderItem.js
│   │   ├── 📄 KitchenInventoryItem.js
│   │   ├── 📄 KitchenRecipe.js
│   │   ├── 📄 Shift.js
│   │   ├── 📄 HeldTransaction.js
│   │   ├── 📄 ProductCostHistory.js
│   │   ├── 📄 ProductCostComponent.js
│   │   └── ... (other models)
│   │
│   ├── 📁 lib/                 # 🔧 Library Files
│   │   ├── 📄 sequelize.js      # Sequelize instance configuration
│   │   ├── 📄 sequelizeClient.js # Sequelize client for API routes
│   │   ├── 📄 utils.js          # Utility functions
│   │   │   ├── formatCurrency()
│   │   │   ├── formatDate()
│   │   │   ├── generateBarcode()
│   │   │   └── calculateTax()
│   │   ├── 📄 validations.js    # Validation helpers
│   │   ├── 📄 constants.js      # Application constants
│   │   └── 📄 helpers.js        # Helper functions
│   │
│   ├── 📁 contexts/            # 🔄 React Contexts
│   │   ├── 📄 AuthContext.tsx   # Authentication context
│   │   │   ├── User session state
│   │   │   ├── Login/logout functions
│   │   │   └── Permission checks
│   │   ├── 📄 BusinessTypeContext.tsx
│   │   │   ├── Business type detection
│   │   │   ├── Module availability
│   │   │   └── Feature flags
│   │   ├── 📄 ThemeContext.tsx  # Theme management
│   │   ├── 📄 NotificationContext.tsx
│   │   └── 📄 SocketContext.tsx # WebSocket context (future)
│   │
│   ├── 📁 hooks/               # 🎣 Custom React Hooks
│   │   ├── 📄 useAuth.ts        # Authentication hook
│   │   │   ├── Session management
│   │   │   ├── Login/logout
│   │   │   └── Permission checks
│   │   ├── 📄 useBusinessType.ts
│   │   │   ├── Business type detection
│   │   │   ├── Module checking
│   │   │   └── Loading states
│   │   ├── 📄 useLocalStorage.ts
│   │   ├── 📄 useDebounce.ts
│   │   ├── 📄 usePagination.ts
│   │   ├── 📄 useWebSocket.ts
│   │   ├── 📄 useBranches.ts
│   │   └── 📄 useApi.ts         # API helper hook
│   │
│   ├── 📁 styles/              # 🎨 Style Files
│   │   ├── 📄 globals.css       # Global CSS styles
│   │   │   ├── Tailwind imports
│   │   │   ├── Custom CSS variables
│   │   │   ├── Base styles
│   │   │   └── Utility classes
│   │   └── 📄 components.css    # Component-specific styles
│   │
│   ├── 📁 public/              # 📦 Static Assets
│   │   ├── 📁 images/           # Image assets
│   │   │   ├── 📁 logos/        # Company logos
│   │   │   ├── 📁 icons/        # Icon sets
│   │   │   ├── 📁 banners/      # Banner images
│   │   │   └── 📁 placeholders/  # Placeholder images
│   │   ├── 📁 fonts/            # Custom fonts
│   │   ├── 📄 favicon.ico       # Favicon
│   │   ├── 📄 manifest.json     # PWA manifest
│   │   ├── 📄 robots.txt        # SEO robots
│   │   └── 📄 sitemap.xml       # SEO sitemap
│   │
│   └── 📁 types/               # 📝 TypeScript Type Definitions
│       ├── 📄 auth.ts           # Authentication types
│       │   ├── User, Session, Role types
│       │   └── Permission types
│       ├── 📄 api.ts            # API response types
│       │   ├── Common API response
│       │   ├── Pagination types
│       │   └── Error types
│       ├── 📄 models.ts         # Database model types
│       │   ├── Product, User, etc
│       │   └── Association types
│       ├── 📄 components.ts     # Component prop types
│       ├── 📄 globals.d.ts      # Global type declarations
│       └── 📄 next-auth.d.ts    # NextAuth type extensions
│
├── 📁 DATABASE & MIGRATIONS
│   │
│   ├── 📁 config/              # ⚙️ Configuration Files
│   │   ├── 📄 database.js       # Sequelize database config
│   │   │   ├── Environment detection
│   │   │   ├── Connection pool settings
│   │   │   └── Logging configuration
│   │   └── 📄 config.json       # Sequelize CLI config
│   │
│   ├── 📁 migrations/          # 🔄 Database Migrations
│   │   ├── 📄 20260115-create-products-table.js
│   │   ├── 📄 20260116-create-users-table.js
│   │   ├── 📄 20260213-create-tenants-table.js
│   │   ├── 📄 20260213-create-business-types-table.js
│   │   ├── 📄 20260213-create-modules-table.js
│   │   ├── 📄 20260217-create-kitchen-tables.js
│   │   ├── 📄 20260217-create-tables-reservations.js
│   │   ├── 📄 20260217-create-hpp-fields.js
│   │   └── 📄 ... (other migrations)
│   │
│   └── 📁 seeders/             # 🌱 Database Seeders
│       ├── 📄 20260213-create-master-account.js
│       │   ├── Create super admin account
│       │   └── Setup basic business types
│       ├── 📄 20260213-seed-business-types-modules.js
│       │   ├── Seed business types
│       │   └── Seed system modules
│       ├── 📄 20260217000001-fnb-user-setup.js
│       │   ├── Create F&B demo user
│       │   ├── Setup F&B tenant
│       │   └── Enable F&B modules
│       └── ... (other seeders)
│
├── 📁 SCRIPTS & UTILITIES
│   │
│   ├── 📁 scripts/             # 🔧 Utility Scripts
│   │   ├── 📄 create-demo-user.js
│   │   ├── 📄 create-super-user.js
│   │   ├── 📄 create-full-access-user.js
│   │   ├── 📄 reset-password.js
│   │   ├── 📄 verify-users.js
│   │   ├── 📄 check-password-hash.js
│   │   ├── 📄 fix-tenant-id-column.js
│   │   ├── 📄 create-tables-reservations.js
│   │   ├── 📄 add-hpp-fields.js
│   │   ├── 📄 add-is-active-column.js
│   │   ├── 📄 create-finance-tables.js
│   │   ├── 📄 create-held-transactions-table.js
│   │   ├── 📄 verify-finance-transactions.js
│   │   └── 📄 list-users.js
│   │
│   └── 📁 test/                # 🧪 Testing (planned)
│       ├── 📁 __tests__/       # Unit tests
│       ├── 📁 integration/     # Integration tests
│       ├── 📁 e2e/            # End-to-end tests
│       └── 📄 setup.js        # Test setup
│
├── 📁 DOCUMENTATION
│   │
│   ├── 📁 docs/               # 📚 Documentation
│   │   ├── 📄 API_POS_DOCUMENTATION.md
│   │   ├── 📄 FNB_BACKEND_INTEGRATION.md
│   │   ├── 📄 ADMIN_ACCESS_GUIDE.md
│   │   ├── 📄 INTEGRATED_ORDER_FLOW.md
│   │   ├── 📄 FINANCE_INVOICES_COMPLETE.md
│   │   └── 📄 BUILD_ERROR_FIXED.md
│   │
│   ├── 📄 README.md            # Main documentation
│   ├── 📄 CHANGELOG.md         # Version history
│   ├── 📄 CONTRIBUTING.md      # Contribution guidelines
│   ├── 📄 DEPLOYMENT.md        # Deployment guide
│   └── 📄 TROUBLESHOOTING.md   # Troubleshooting guide
│
└── 📁 DEPLOYMENT & DEVOPS
    ├── 📁 docker/              # 🐳 Docker files (planned)
    │   ├── 📄 Dockerfile
    │   ├── 📄 docker-compose.yml
    │   └── 📄 .dockerignore
    │
    ├── 📁 k8s/                 # ☸️ Kubernetes (planned)
    │   ├── 📄 deployment.yaml
    │   ├── 📄 service.yaml
    │   └── 📄 ingress.yaml
    │
    └── 📁 .github/             # 🐙 GitHub workflows
        ├── 📁 workflows/
        │   ├── 📄 ci.yml        # Continuous integration
        │   ├── 📄 cd.yml        # Continuous deployment
        │   └── 📄 test.yml      # Test automation
        └── 📄 ISSUE_TEMPLATE/  # Issue templates
```

---

## 🔄 Arsitektur & Alur Data

### **1. Authentication Flow**
```
User → Login Page → NextAuth → Database → Session → Dashboard
                      ↓
                 JWT Token → API Routes → Validate → Response
```

### **2. Multi-tenant Data Flow**
```
Request → Auth Middleware → Extract Tenant → Filter Data → Response
    ↓           ↓                   ↓            ↓
   API    Check Session      Get tenant_id   WHERE tenant_id = ?
```

### **3. F&B Dashboard Flow**
```
Login → Business Type Check → Is F&B? → Redirect → API Calls → Display
                     ↓                ↓
               /api/business/config  /dashboard-fnb
```

---

## 🗄️ Database Schema Detail

### **Core Tables**
```sql
-- Users & Authentication
users (id, name, email, password, role, tenant_id, isActive)
tenants (id, business_name, business_type_id, setup_completed)
business_types (id, code, name, description, icon)
modules (id, code, name, description, is_active)
tenant_modules (id, tenant_id, module_id, is_enabled)

-- Business Data
products (id, name, sku, price, cost, stock, category, tenant_id)
pos_transactions (id, total, payment_method, cashier_id, tenant_id)
stocks (id, product_id, quantity, location, tenant_id)

-- F&B Specific
tables (id, number, capacity, status, floor, tenant_id)
reservations (id, customer_name, guests, date, time, table_id, tenant_id)
kitchen_orders (id, transaction_id, status, items, prep_time, tenant_id)
```

---

## 🔐 Security Implementation

### **1. Authentication Layers**
- NextAuth.js session management
- JWT token validation
- Role-based access control
- API route protection

### **2. Data Protection**
- Multi-tenant data isolation
- SQL injection prevention (Sequelize ORM)
- XSS protection (React)
- CSRF protection (NextAuth)

### **3. Best Practices**
- Environment variables for secrets
- Password hashing with bcrypt
- Rate limiting on APIs
- Input validation & sanitization

---

## 📊 Performance Optimizations

### **1. Frontend**
- Code splitting (Next.js automatic)
- Lazy loading components
- Image optimization (next/image)
- Bundle size optimization

### **2. Backend**
- Database indexing
- Query optimization
- Response caching
- Connection pooling

### **3. Database**
- Proper indexes on foreign keys
- Query optimization
- Connection pooling
- Read replicas (future)

---

## 🚀 Deployment Architecture

### **Development**
```
Local Machine → PostgreSQL → Next.js Dev Server (Port 3001)
```

### **Production (Planned)**
```
Load Balancer → Nginx → Node.js Cluster → PostgreSQL Cluster
                      ↓
                 Redis Cache → File Storage (S3)
```

---

## 📋 Development Guidelines

### **1. Code Standards**
- TypeScript for type safety
- ESLint + Prettier for formatting
- Conventional commits
- Component documentation

### **2. File Organization**
- Feature-based folder structure
- Consistent naming conventions
- Separation of concerns
- Reusable components

### **3. Best Practices**
- Error boundaries
- Loading states
- Empty states
- Responsive design
- Accessibility (a11y)

---

## 🎯 Future Roadmap

### **Phase 1: Core Features** ✅
- [x] Multi-tenant architecture
- [x] POS module
- [x] Inventory module
- [x] F&B dashboard
- [x] Basic reporting

### **Phase 2: Advanced Features** 🚧
- [ ] Real-time updates (WebSocket)
- [ ] Advanced analytics
- [ ] Mobile app (React Native)
- [ ] Payment gateway integration
- [ ] Advanced reporting

### **Phase 3: Enterprise** 📋
- [ ] Microservices architecture
- [ ] Advanced security
- [ ] API versioning
- [ ] Advanced caching
- [ ] Multi-language support

---

**Dokumentasi ini akan terus diperbarui seiring dengan perkembangan project.**

**Last Updated: February 17, 2026**
