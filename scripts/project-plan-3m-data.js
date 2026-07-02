// BEDAGANG ERP - 3-MONTH MODULE DATA (13 Weeks, Start: 26 Mar 2026)
const COLORS = {
  phase1: 'FF27AE60', phase2: 'FF2980B9', phase3: 'FFF39C12',
  phase4: 'FF8E44AD', phase5: 'FFE74C3C', phase6: 'FF1ABC9C',
};

module.exports = [
  // ===== PHASE 1 - Foundation (W1-3) =====
  {
    phase: 'Phase 1 - Foundation (W1-3)', phaseColor: COLORS.phase1,
    module: 'M01 - Authentication & Authorization',
    goal: 'Sistem login multi-tenant dengan role-based access control',
    objectives: ['JWT auth flow', 'Multi-tenant isolation', 'Role & permission matrix', 'Session management'],
    tasks: [
      { platform: 'Backend', task: 'Auth API - Register/Login/Logout', subtasks: ['POST /api/auth/register','POST /api/auth/login','POST /api/auth/logout','JWT token generation & refresh','Password hashing (bcrypt)','Email verification flow'], sp: 8, wkStart: 0, wkDur: 1 },
      { platform: 'Backend', task: 'Role & Permission System', subtasks: ['Role model (super_admin, owner, admin, manager, staff, cashier)','Permission matrix CRUD','Middleware auth guard','Middleware role guard','Middleware module access guard'], sp: 8, wkStart: 0, wkDur: 1 },
      { platform: 'Backend', task: 'Multi-Tenant Isolation', subtasks: ['Tenant model & migration','Tenant middleware for data isolation','Tenant-aware query scoping','Tenant settings API'], sp: 5, wkStart: 0, wkDur: 1 },
      { platform: 'Frontend', task: 'Login & Register Pages', subtasks: ['Login page UI','Register page UI','Forgot password flow','OTP verification UI','Auth context/provider'], sp: 5, wkStart: 0, wkDur: 1 },
      { platform: 'Frontend', task: 'Auth Guards & Layout', subtasks: ['Protected route wrapper','Role-based route guard','Layout with sidebar (HQ/Branch/Admin)','Sidebar config integration','User profile dropdown'], sp: 5, wkStart: 1, wkDur: 1 },
      { platform: 'Mobile', task: 'Mobile Auth Flow', subtasks: ['Login screen','Biometric auth (fingerprint/face)','Token storage (secure)','Auto-refresh token','Push notification token registration'], sp: 5, wkStart: 1, wkDur: 1 },
    ]
  },
  {
    phase: 'Phase 1 - Foundation (W1-3)', phaseColor: COLORS.phase1,
    module: 'M02 - Onboarding & Tenant Setup',
    goal: 'Wizard onboarding untuk tenant baru dan setup awal bisnis',
    objectives: ['KYB application flow', 'Business type selection', 'Initial branch & user setup'],
    tasks: [
      { platform: 'Backend', task: 'Onboarding API', subtasks: ['POST /api/onboarding/start','Business type selection endpoint','KYB document upload','Tenant provisioning service','Default data seeding'], sp: 8, wkStart: 1, wkDur: 1 },
      { platform: 'Backend', task: 'Subscription & Package API', subtasks: ['Package model & CRUD','Subscription lifecycle','Module activation per package','Trial period management'], sp: 5, wkStart: 1, wkDur: 1 },
      { platform: 'Frontend', task: 'Onboarding Wizard UI', subtasks: ['Step 1: Business info','Step 2: Business type','Step 3: KYB upload','Step 4: Branch setup','Step 5: Admin user','Progress indicator'], sp: 8, wkStart: 1, wkDur: 1 },
      { platform: 'Mobile', task: 'Mobile Onboarding', subtasks: ['Onboarding welcome screens','Business setup wizard','Initial sync'], sp: 3, wkStart: 2, wkDur: 1 },
    ]
  },
  {
    phase: 'Phase 1 - Foundation (W1-3)', phaseColor: COLORS.phase1,
    module: 'M03 - Branch Management',
    goal: 'Manajemen multi-cabang dari HQ dengan monitoring performa',
    objectives: ['CRUD cabang', 'Performance dashboard per branch', 'Branch settings', 'Real-time metrics'],
    tasks: [
      { platform: 'Backend', task: 'Branch CRUD API', subtasks: ['GET/POST/PUT/DELETE /api/branches','Branch model & migration','Branch-module activation','Branch user assignment','Branch metrics model'], sp: 8, wkStart: 1, wkDur: 1 },
      { platform: 'Backend', task: 'Branch Performance API', subtasks: ['Sales aggregation per branch','Inventory status per branch','Employee count & schedule','Comparison analytics'], sp: 5, wkStart: 1, wkDur: 1 },
      { platform: 'Frontend', task: 'Branch List & Detail Pages', subtasks: ['Branch list with filters','Branch detail page','Branch creation form','Branch settings page','Branch performance dashboard'], sp: 8, wkStart: 1, wkDur: 1 },
      { platform: 'Frontend', task: 'Branch Performance Charts', subtasks: ['Revenue comparison chart','Branch ranking','Branch map view (Leaflet)','Real-time metrics cards'], sp: 5, wkStart: 2, wkDur: 1 },
      { platform: 'Mobile', task: 'Branch Switcher (Mobile)', subtasks: ['Branch selector','Branch dashboard summary','Quick performance view'], sp: 3, wkStart: 2, wkDur: 1 },
    ]
  },
  {
    phase: 'Phase 1 - Foundation (W1-3)', phaseColor: COLORS.phase1,
    module: 'M04 - Settings & Configuration',
    goal: 'Pengaturan global, modul, pajak, notifikasi, dan integrasi',
    objectives: ['Global settings', 'Module management', 'Tax configuration', 'Notification settings'],
    tasks: [
      { platform: 'Backend', task: 'Settings API', subtasks: ['Store settings CRUD','Tax & fee configuration','Notification settings','Module toggle','Integration config'], sp: 5, wkStart: 2, wkDur: 1 },
      { platform: 'Frontend', task: 'Settings Pages', subtasks: ['Global settings page','Module management','Tax & fee settings','Notification preferences','Integration settings'], sp: 5, wkStart: 2, wkDur: 1 },
      { platform: 'Mobile', task: 'Mobile Settings', subtasks: ['App preferences','Notification toggle','Printer/device settings'], sp: 3, wkStart: 2, wkDur: 1 },
    ]
  },

  // ===== PHASE 2 - Core Commerce (W3-6) =====
  {
    phase: 'Phase 2 - Core Commerce (W3-6)', phaseColor: COLORS.phase2,
    module: 'M05 - Product & Category Management',
    goal: 'Master data produk, kategori, varian, dan harga',
    objectives: ['Product CRUD with variants', 'Category hierarchy', 'Price tiers', 'Barcode support'],
    tasks: [
      { platform: 'Backend', task: 'Product CRUD API', subtasks: ['Product model & migration','GET/POST/PUT/DELETE /api/products','Product variant support','Image upload (multer)','Barcode generation','Bulk import/export CSV'], sp: 8, wkStart: 2, wkDur: 1 },
      { platform: 'Backend', task: 'Category & Pricing API', subtasks: ['Category hierarchy CRUD','Price tier model','Multi-branch pricing logic','HPP calculation'], sp: 8, wkStart: 3, wkDur: 1 },
      { platform: 'Frontend', task: 'Product Management Pages', subtasks: ['Product list grid/list view','Product create/edit form','Variant builder UI','Image upload with crop','Barcode scanner','Bulk import UI'], sp: 8, wkStart: 3, wkDur: 1 },
      { platform: 'Frontend', task: 'Category & Pricing Pages', subtasks: ['Category tree view','Drag-drop reorder','Price tier management','Branch-specific pricing UI'], sp: 5, wkStart: 3, wkDur: 1 },
      { platform: 'Mobile', task: 'Mobile Product Catalog', subtasks: ['Product list & search','Product detail view','Barcode scan','Quick price check'], sp: 5, wkStart: 3, wkDur: 1 },
    ]
  },
  {
    phase: 'Phase 2 - Core Commerce (W3-6)', phaseColor: COLORS.phase2,
    module: 'M06 - Point of Sale (POS)',
    goal: 'Sistem kasir lengkap dengan multi-payment, split bill, dan struk',
    objectives: ['Full POS flow', 'Multi-payment', 'Receipt printing', 'Held transactions', 'Shift management'],
    tasks: [
      { platform: 'Backend', task: 'POS Transaction API', subtasks: ['POST /api/pos/transactions','Transaction model & items','Payment processing (cash, card, QRIS, e-wallet)','Split payment logic','Void & refund','Transaction search'], sp: 13, wkStart: 3, wkDur: 2 },
      { platform: 'Backend', task: 'Shift & Cash Management API', subtasks: ['Open/close shift','Cash drawer tracking','Shift handover report','Held transaction CRUD','Daily sales summary'], sp: 8, wkStart: 3, wkDur: 1 },
      { platform: 'Backend', task: 'Receipt & Printer API', subtasks: ['Receipt template engine','Thermal printer config','Digital receipt (email/WA)','Receipt reprint'], sp: 5, wkStart: 4, wkDur: 1 },
      { platform: 'Frontend', task: 'POS Cashier Interface', subtasks: ['POS main screen','Product grid + categories','Cart management','Quantity & discount','Customer selection','Barcode scanner','Payment modal','Split bill UI','Receipt preview & print'], sp: 13, wkStart: 3, wkDur: 2 },
      { platform: 'Frontend', task: 'Shift & Transaction History', subtasks: ['Shift open/close dialogs','Cash count form','Shift summary','Transaction history','Transaction detail & reprint','Held transactions list'], sp: 8, wkStart: 4, wkDur: 1 },
      { platform: 'Mobile', task: 'Mobile POS', subtasks: ['Mobile POS interface','Product search & scan','Cart management','Payment processing','Bluetooth printer','Offline queue','Sync when online'], sp: 13, wkStart: 4, wkDur: 2 },
    ]
  },
  {
    phase: 'Phase 2 - Core Commerce (W3-6)', phaseColor: COLORS.phase2,
    module: 'M07 - Inventory Management',
    goal: 'Stok real-time, transfer antar gudang, stock opname, dan peringatan',
    objectives: ['Real-time stock', 'Stock movements', 'Stock opname', 'Multi-warehouse', 'Low stock alerts'],
    tasks: [
      { platform: 'Backend', task: 'Stock & Warehouse API', subtasks: ['Stock model per branch/warehouse','Stock movement logging','GET /api/inventory/stock','Stock adjustment','Warehouse CRUD','Stock transfer'], sp: 13, wkStart: 3, wkDur: 2 },
      { platform: 'Backend', task: 'Stock Opname API', subtasks: ['Stock opname session CRUD','Opname item recording','Variance calculation','Approval workflow','Opname reports'], sp: 8, wkStart: 4, wkDur: 1 },
      { platform: 'Backend', task: 'Alerts & Reorder API', subtasks: ['Low stock threshold','Alert generation','Reorder point notification','Stock expiry tracking','Batch/lot tracking'], sp: 5, wkStart: 4, wkDur: 1 },
      { platform: 'Frontend', task: 'Inventory Dashboard & Stock Pages', subtasks: ['Inventory dashboard KPIs','Stock list with filters','Stock detail & history','Stock adjustment form','Transfer request form','Multi-warehouse view'], sp: 8, wkStart: 4, wkDur: 1 },
      { platform: 'Frontend', task: 'Stock Opname UI', subtasks: ['Start opname wizard','Item count entry','Variance review','Approval flow UI','Opname history'], sp: 8, wkStart: 4, wkDur: 1 },
      { platform: 'Mobile', task: 'Mobile Stock Management', subtasks: ['Stock check by scan','Mobile stock opname','Stock transfer request','Low stock alert push','Stock receive confirmation'], sp: 8, wkStart: 5, wkDur: 1 },
    ]
  },
  {
    phase: 'Phase 2 - Core Commerce (W3-6)', phaseColor: COLORS.phase2,
    module: 'M08 - Purchase Orders & Suppliers',
    goal: 'Pembelian barang, manajemen pemasok, dan penerimaan barang',
    objectives: ['PO lifecycle', 'Supplier management', 'Goods receipt', 'PO approval'],
    tasks: [
      { platform: 'Backend', task: 'Purchase Order API', subtasks: ['PO model & items','PO CRUD','PO approval workflow','PO status tracking','Auto-PO from reorder point'], sp: 8, wkStart: 4, wkDur: 1 },
      { platform: 'Backend', task: 'Supplier & Goods Receipt API', subtasks: ['Supplier CRUD','Goods receipt recording','Partial receipt','Receipt-to-stock integration','Supplier metrics'], sp: 5, wkStart: 5, wkDur: 1 },
      { platform: 'Frontend', task: 'Purchase Order Pages', subtasks: ['PO list & filter','PO creation wizard','PO approval screen','PO detail & timeline','Supplier list','Goods receipt form'], sp: 8, wkStart: 5, wkDur: 1 },
      { platform: 'Mobile', task: 'Mobile Goods Receipt', subtasks: ['Scan PO barcode','Item count confirmation','Photo proof','Receipt signature capture'], sp: 5, wkStart: 5, wkDur: 1 },
    ]
  },

  // ===== PHASE 3 - Customer & Engagement (W5-7) =====
  {
    phase: 'Phase 3 - Customer & Engagement (W5-7)', phaseColor: COLORS.phase3,
    module: 'M09 - Customer Management',
    goal: 'Database pelanggan lengkap dengan segmentasi dan riwayat transaksi',
    objectives: ['Customer CRUD', 'Segmentation & tags', 'Transaction history', 'Corporate customers'],
    tasks: [
      { platform: 'Backend', task: 'Customer CRUD API', subtasks: ['Customer model & migration','CRUD endpoints','Customer search & filter','Import/export','Segmentation logic','Corporate customer support'], sp: 8, wkStart: 4, wkDur: 1 },
      { platform: 'Frontend', task: 'Customer Management Pages', subtasks: ['Customer list','Customer detail 360 view','Add customer wizard','Edit form','Transaction history','Segmentation UI','Corporate form'], sp: 8, wkStart: 5, wkDur: 1 },
      { platform: 'Mobile', task: 'Mobile Customer Lookup', subtasks: ['Customer search','Quick add customer','Customer card view','Link to POS transaction'], sp: 3, wkStart: 5, wkDur: 1 },
    ]
  },
  {
    phase: 'Phase 3 - Customer & Engagement (W5-7)', phaseColor: COLORS.phase3,
    module: 'M10 - Loyalty Program',
    goal: 'Program poin, tier, reward, dan redemption',
    objectives: ['Point accumulation', 'Tier system', 'Reward catalog', 'Redemption flow'],
    tasks: [
      { platform: 'Backend', task: 'Loyalty Program API', subtasks: ['LoyaltyProgram model','Point transaction','Tier calculation','Reward catalog CRUD','Redemption processing','Point expiry'], sp: 8, wkStart: 5, wkDur: 1 },
      { platform: 'Frontend', task: 'Loyalty Program Pages', subtasks: ['Loyalty dashboard','Program config','Tier management','Reward catalog','Redemption history','Member analytics'], sp: 8, wkStart: 5, wkDur: 1 },
      { platform: 'Mobile', task: 'Mobile Loyalty', subtasks: ['Loyalty card view','Point balance','Available rewards','Redeem from mobile','Digital membership'], sp: 5, wkStart: 6, wkDur: 1 },
    ]
  },
  {
    phase: 'Phase 3 - Customer & Engagement (W5-7)', phaseColor: COLORS.phase3,
    module: 'M11 - Promo & Voucher',
    goal: 'Sistem promosi, bundle, voucher, dan diskon otomatis',
    objectives: ['Promo engine', 'Bundle deals', 'Voucher generation', 'Auto-discount rules'],
    tasks: [
      { platform: 'Backend', task: 'Promo & Voucher API', subtasks: ['Promo model & rules','Bundle deal logic','Voucher generation','Voucher validation','Promo scheduling','Category/product promos'], sp: 8, wkStart: 5, wkDur: 1 },
      { platform: 'Frontend', task: 'Promo & Voucher Pages', subtasks: ['Promo list & wizard','Bundle builder','Voucher generator','Promo analytics','Promo calendar'], sp: 8, wkStart: 6, wkDur: 1 },
      { platform: 'Mobile', task: 'Mobile Promo Display', subtasks: ['Active promo list','Voucher scanner','Apply promo in cart','Push notification promos'], sp: 3, wkStart: 6, wkDur: 1 },
    ]
  },
  {
    phase: 'Phase 3 - Customer & Engagement (W5-7)', phaseColor: COLORS.phase3,
    module: 'M12 - CRM',
    goal: 'CRM 360 dengan komunikasi, tiket, otomasi, dan peramalan penjualan',
    objectives: ['Contact management', 'Communication tracking', 'Support tickets & SLA', 'Sales forecasting'],
    tasks: [
      { platform: 'Backend', task: 'CRM Core API', subtasks: ['CrmContact model','CrmCommunication model','CrmInteraction tracking','CrmDocument management','CrmCalendarEvent CRUD','Customer 360 aggregation'], sp: 8, wkStart: 5, wkDur: 1 },
      { platform: 'Backend', task: 'CRM Tickets & Automation API', subtasks: ['CrmTicket CRUD','SLA policy engine','Ticket escalation','CrmAutomationRule engine','Trigger-based actions','CrmFollowUp scheduler'], sp: 8, wkStart: 6, wkDur: 1 },
      { platform: 'Backend', task: 'CRM Forecasting API', subtasks: ['CrmForecast model','Pipeline value calc','Win probability','CrmDealScore model','Forecast vs actual'], sp: 5, wkStart: 6, wkDur: 1 },
      { platform: 'Frontend', task: 'CRM Dashboard & Contact Pages', subtasks: ['CRM dashboard pipeline','Contact list & 360','Communication timeline','Calendar & task integration','Document management UI'], sp: 8, wkStart: 6, wkDur: 1 },
      { platform: 'Frontend', task: 'CRM Tickets & Automation UI', subtasks: ['Ticket kanban','Ticket detail & comments','SLA config','Automation rule builder','Follow-up scheduler'], sp: 8, wkStart: 6, wkDur: 1 },
      { platform: 'Mobile', task: 'Mobile CRM', subtasks: ['Contact list','Quick log interaction','Ticket view','Follow-up reminders'], sp: 5, wkStart: 7, wkDur: 1 },
    ]
  },

  // ===== PHASE 4 - Operations (W6-9) =====
  {
    phase: 'Phase 4 - Operations (W6-9)', phaseColor: COLORS.phase4,
    module: 'M13 - Kitchen Management',
    goal: 'Manajemen dapur F&B: pesanan, resep, inventori bahan',
    objectives: ['Kitchen order display', 'Recipe management', 'Kitchen inventory', 'Staff assignment'],
    tasks: [
      { platform: 'Backend', task: 'Kitchen Order API', subtasks: ['KitchenOrder model','Order queue management','Order status updates','KDS integration','Order priority logic'], sp: 8, wkStart: 6, wkDur: 1 },
      { platform: 'Backend', task: 'Recipe & Kitchen Inventory API', subtasks: ['Recipe CRUD with ingredients','Auto-deduct stock','Kitchen inventory tracking','Waste recording','Recipe costing'], sp: 8, wkStart: 6, wkDur: 1 },
      { platform: 'Frontend', task: 'Kitchen Display System (KDS)', subtasks: ['KDS board layout','Order cards with timers','Status update buttons','Sound/visual alerts','Multi-station view'], sp: 8, wkStart: 6, wkDur: 1 },
      { platform: 'Frontend', task: 'Recipe & Kitchen Settings', subtasks: ['Recipe editor','Ingredient mapping','Kitchen inventory page','Staff assignment','Kitchen settings'], sp: 5, wkStart: 7, wkDur: 1 },
      { platform: 'Mobile', task: 'Mobile KDS', subtasks: ['Mobile kitchen display','Order status quick update','Alert on new orders'], sp: 3, wkStart: 7, wkDur: 1 },
    ]
  },
  {
    phase: 'Phase 4 - Operations (W6-9)', phaseColor: COLORS.phase4,
    module: 'M14 - Table & Reservation',
    goal: 'Manajemen meja restoran dan sistem reservasi',
    objectives: ['Table layout', 'Table sessions', 'Reservation booking', 'Table-POS integration'],
    tasks: [
      { platform: 'Backend', task: 'Table & Session API', subtasks: ['Table model CRUD','Table session management','Table status tracking','Merge/split table','Table-POS linking'], sp: 5, wkStart: 6, wkDur: 1 },
      { platform: 'Backend', task: 'Reservation API', subtasks: ['Reservation CRUD','Availability check','Confirmation & reminder','Walk-in vs reserved','Cancellation policy'], sp: 5, wkStart: 7, wkDur: 1 },
      { platform: 'Frontend', task: 'Table Layout & Reservation UI', subtasks: ['Drag-drop table layout','Real-time table map','Table session view','Reservation calendar','Reservation form','Waitlist management'], sp: 8, wkStart: 7, wkDur: 1 },
      { platform: 'Mobile', task: 'Mobile Table/Reservation', subtasks: ['Table status overview','Quick seat assignment','Reservation lookup'], sp: 3, wkStart: 7, wkDur: 1 },
    ]
  },
  {
    phase: 'Phase 4 - Operations (W6-9)', phaseColor: COLORS.phase4,
    module: 'M15 - Employee & Schedule',
    goal: 'Jadwal karyawan, shift, dan handover',
    objectives: ['Shift templates', 'Schedule builder', 'Shift handover', 'Attendance basic'],
    tasks: [
      { platform: 'Backend', task: 'Schedule & Shift API', subtasks: ['Shift model & templates','Schedule CRUD','Shift assignment engine','Shift handover recording','Conflict detection'], sp: 5, wkStart: 7, wkDur: 1 },
      { platform: 'Frontend', task: 'Schedule & Shift Pages', subtasks: ['Schedule calendar (FullCalendar)','Shift template builder','Drag-drop assignment','Shift handover form','Schedule export'], sp: 8, wkStart: 7, wkDur: 1 },
      { platform: 'Mobile', task: 'Mobile Schedule View', subtasks: ['My schedule view','Shift swap request','Clock in/out','Handover checklist'], sp: 5, wkStart: 7, wkDur: 1 },
    ]
  },
  {
    phase: 'Phase 4 - Operations (W6-9)', phaseColor: COLORS.phase4,
    module: 'M16 - HRIS',
    goal: 'Sistem HR lengkap: kehadiran, penggajian, cuti, kinerja, rekrutmen',
    objectives: ['Employee database', 'Attendance', 'Payroll', 'Leave management', 'Performance review', 'Recruitment'],
    tasks: [
      { platform: 'Backend', task: 'Employee Database API', subtasks: ['Employee model','Documents','Family data','Education & skills','Work experience','Org structure','Job grade system'], sp: 8, wkStart: 7, wkDur: 1 },
      { platform: 'Backend', task: 'Attendance & Devices API', subtasks: ['AttendanceDevice model','Device log ingestion','Attendance calc','Overtime calc','Settings per branch','Device integration'], sp: 8, wkStart: 7, wkDur: 1 },
      { platform: 'Backend', task: 'Payroll API', subtasks: ['PayrollComponent model','Salary structure','Payroll run processing','Tax PPh21','Payslip generation','Bank file export'], sp: 13, wkStart: 7, wkDur: 2 },
      { platform: 'Backend', task: 'Leave & Performance API', subtasks: ['LeaveType & balance','Leave request workflow','Approval chain','PerformanceReview model','KPI template','360 feedback'], sp: 8, wkStart: 8, wkDur: 1 },
      { platform: 'Backend', task: 'Recruitment & Training API', subtasks: ['Job posting CRUD','Candidate tracking','Interview scheduling','Training program','Certification tracking','Employee mutation'], sp: 5, wkStart: 8, wkDur: 1 },
      { platform: 'Frontend', task: 'HRIS Dashboard & Employee Pages', subtasks: ['HRIS dashboard','Employee list & detail','Create/edit wizard','Org chart','Document mgmt','Lifecycle timeline'], sp: 8, wkStart: 7, wkDur: 1 },
      { platform: 'Frontend', task: 'Attendance & Payroll Pages', subtasks: ['Attendance dashboard','Daily log','Device management','Payroll run wizard','Payslip viewer','Salary structure editor'], sp: 8, wkStart: 8, wkDur: 1 },
      { platform: 'Frontend', task: 'Leave, KPI & Recruitment Pages', subtasks: ['Leave calendar','Leave request form','Leave approval','KPI dashboard','KPI scoring','Performance review','Recruitment pipeline','Training catalog'], sp: 8, wkStart: 8, wkDur: 1 },
      { platform: 'Mobile', task: 'Mobile HRIS (ESS)', subtasks: ['My profile','Clock in/out GPS','Leave request','Payslip viewer','KPI & goals','Training schedule','Claim submission','Travel request'], sp: 8, wkStart: 8, wkDur: 1 },
    ]
  },

  // ===== PHASE 5 - Finance & Advanced (W8-11) =====
  {
    phase: 'Phase 5 - Finance & Advanced (W8-11)', phaseColor: COLORS.phase5,
    module: 'M17 - Finance Lite',
    goal: 'Ringkasan keuangan dasar: transaksi harian dan laporan sederhana',
    objectives: ['Daily transaction summary', 'Basic income/expense tracking'],
    tasks: [
      { platform: 'Backend', task: 'Finance Lite API', subtasks: ['FinanceTransaction model','Daily income aggregation','Basic expense recording','Daily/weekly/monthly summary','Export to Excel/PDF'], sp: 5, wkStart: 8, wkDur: 1 },
      { platform: 'Frontend', task: 'Finance Lite Pages', subtasks: ['Transaction list','Daily summary dashboard','Income/expense chart','Export buttons'], sp: 5, wkStart: 8, wkDur: 1 },
    ]
  },
  {
    phase: 'Phase 5 - Finance & Advanced (W8-11)', phaseColor: COLORS.phase5,
    module: 'M18 - Finance Pro (Full Accounting)',
    goal: 'Akuntansi lengkap: GL, AP/AR, invoicing, anggaran, arus kas, pajak',
    objectives: ['Chart of Accounts', 'General Ledger', 'AP & AR', 'Invoicing', 'Budget', 'Cash flow', 'Tax'],
    tasks: [
      { platform: 'Backend', task: 'Chart of Accounts & GL API', subtasks: ['FinanceAccount model (CoA)','Journal entry recording','General ledger queries','Trial balance','Balance sheet','Income statement (P&L)'], sp: 13, wkStart: 8, wkDur: 2 },
      { platform: 'Backend', task: 'Invoice & AP/AR API', subtasks: ['Invoice model & items','Invoice from POS','AR tracking & aging','AP tracking & aging','Payment recording','Invoice email'], sp: 8, wkStart: 9, wkDur: 1 },
      { platform: 'Backend', task: 'Budget & Cash Flow API', subtasks: ['Budget model per dept','Budget vs actual','Cash flow projection','Cash flow report','Tax calculation','Tax report'], sp: 8, wkStart: 9, wkDur: 1 },
      { platform: 'Frontend', task: 'Finance Dashboard & GL Pages', subtasks: ['Finance dashboard KPIs','Chart of Accounts page','Journal entry form','GL view','Trial balance report','P&L report','Balance sheet report'], sp: 13, wkStart: 9, wkDur: 2 },
      { platform: 'Frontend', task: 'Invoice & AP/AR Pages', subtasks: ['Invoice list & detail','Invoice creation','AR aging report','AP aging report','Payment recording','Invoice PDF preview'], sp: 8, wkStart: 10, wkDur: 1 },
      { platform: 'Frontend', task: 'Budget & Tax Pages', subtasks: ['Budget planning page','Budget vs actual chart','Cash flow report','Tax summary','Financial ratio analysis'], sp: 5, wkStart: 10, wkDur: 1 },
      { platform: 'Mobile', task: 'Mobile Finance', subtasks: ['Daily revenue summary','Expense quick entry','Invoice approval','Cash flow overview'], sp: 3, wkStart: 10, wkDur: 1 },
    ]
  },
  {
    phase: 'Phase 5 - Finance & Advanced (W8-11)', phaseColor: COLORS.phase5,
    module: 'M19 - SFA (Sales Force Automation)',
    goal: 'Otomasi tenaga penjualan: kunjungan, target, insentif, pipeline',
    objectives: ['Visit tracking', 'Target & achievement', 'Incentive calculation', 'Field order', 'Territory management'],
    tasks: [
      { platform: 'Backend', task: 'SFA Core API', subtasks: ['SfaTeam & territory','SfaVisit GPS check-in','SfaLead & opportunity pipeline','SfaFieldOrder CRUD','SfaQuotation CRUD','Coverage plan'], sp: 13, wkStart: 9, wkDur: 2 },
      { platform: 'Backend', task: 'SFA Target & Incentive API', subtasks: ['SfaTarget & assignment','Achievement tracking','Incentive scheme','Commission calculation','SfaPlafon (credit limit)','Approval workflow'], sp: 8, wkStart: 9, wkDur: 1 },
      { platform: 'Frontend', task: 'SFA Dashboard & Pages', subtasks: ['SFA dashboard','Visit map & list','Lead pipeline kanban','Field order mgmt','Quotation builder','Territory mgmt','Target tracking','Incentive view','Survey & competitor'], sp: 13, wkStart: 9, wkDur: 2 },
      { platform: 'Mobile', task: 'Mobile SFA', subtasks: ['GPS check-in visits','Photo proof upload','Quick field order','Route plan view','Target dashboard','Visit history','Offline mode + sync'], sp: 13, wkStart: 10, wkDur: 1 },
    ]
  },
  {
    phase: 'Phase 5 - Finance & Advanced (W8-11)', phaseColor: COLORS.phase5,
    module: 'M20 - Marketing & Campaigns',
    goal: 'Kampanye pemasaran, segmentasi, promosi, dan anggaran marketing',
    objectives: ['Campaign management', 'Customer segmentation', 'Promotion engine', 'Marketing budget'],
    tasks: [
      { platform: 'Backend', task: 'Marketing API', subtasks: ['MktCampaign CRUD','MktCampaignChannel tracking','MktSegment rules engine','MktPromotion model','MktBudget tracking','Campaign analytics'], sp: 8, wkStart: 10, wkDur: 1 },
      { platform: 'Frontend', task: 'Marketing Pages', subtasks: ['Marketing dashboard','Campaign builder wizard','Segment builder','Promotion management','Budget allocation','Campaign analytics'], sp: 8, wkStart: 10, wkDur: 1 },
      { platform: 'Mobile', task: 'Mobile Marketing', subtasks: ['Campaign overview','Quick promotion setup','Push notification to customers'], sp: 3, wkStart: 10, wkDur: 1 },
    ]
  },

  // ===== PHASE 6 - Enterprise (W9-13) =====
  {
    phase: 'Phase 6 - Enterprise (W9-13)', phaseColor: COLORS.phase6,
    module: 'M21 - Fleet Management (FMS)',
    goal: 'Manajemen armada kendaraan: tracking, maintenance, BBM, inspeksi',
    objectives: ['Vehicle registry', 'Driver management', 'GPS tracking', 'Maintenance', 'Fuel tracking', 'Geofencing'],
    tasks: [
      { platform: 'Backend', task: 'Fleet Core API', subtasks: ['FleetVehicle CRUD','FleetDriver CRUD','GPS location ingestion','Geofence model & check','Maintenance schedule','Fuel transaction recording','Inspection & incident models'], sp: 13, wkStart: 9, wkDur: 2 },
      { platform: 'Frontend', task: 'Fleet Dashboard & Pages', subtasks: ['Fleet dashboard','Vehicle list & detail','Driver list & assignment','GPS live map (Leaflet)','Geofence editor','Maintenance calendar','Fuel log & analytics','Inspection forms','Incident reports','Cost analytics'], sp: 13, wkStart: 10, wkDur: 2 },
      { platform: 'Mobile', task: 'Mobile Fleet (Driver App)', subtasks: ['Driver check-in/out','GPS tracking background','Fuel entry form','Vehicle inspection checklist','Incident report with photos','Route navigation'], sp: 8, wkStart: 11, wkDur: 1 },
    ]
  },
  {
    phase: 'Phase 6 - Enterprise (W9-13)', phaseColor: COLORS.phase6,
    module: 'M22 - Transportation Management (TMS)',
    goal: 'Manajemen pengiriman, dispatch, pelacakan, dan carrier management',
    objectives: ['Shipment management', 'Dispatch planning', 'Carrier scorecards', 'Delivery SLA', 'Rate cards'],
    tasks: [
      { platform: 'Backend', task: 'TMS API', subtasks: ['Shipment CRUD','Dispatch & assignment','Tracking status','Carrier model & scoring','Route optimization','Rate card management','Zone mapping','Billing integration','SLA monitoring'], sp: 13, wkStart: 10, wkDur: 1 },
      { platform: 'Frontend', task: 'TMS Dashboard & Pages', subtasks: ['TMS dashboard','Shipment list & tracking','Dispatch board','Carrier management','Route planner','Rate card editor','Zone management','SLA dashboard','Logistics KPI'], sp: 13, wkStart: 10, wkDur: 1 },
      { platform: 'Mobile', task: 'Mobile TMS (Driver)', subtasks: ['Delivery task list','GPS tracking & proof of delivery','Signature capture','Photo upload','Status updates'], sp: 5, wkStart: 11, wkDur: 1 },
    ]
  },
  {
    phase: 'Phase 6 - Enterprise (W9-13)', phaseColor: COLORS.phase6,
    module: 'M23 - Manufacturing',
    goal: 'Produksi: work order, BOM, routing, QC, OEE, waste tracking',
    objectives: ['Work order management', 'BOM & routing', 'Quality control', 'OEE analytics', 'Production planning'],
    tasks: [
      { platform: 'Backend', task: 'Manufacturing API', subtasks: ['MfgWorkOrder CRUD','MfgBom & BomItem','MfgRouting & operations','MfgWorkCenter & Machine','MfgQcTemplate','MfgProductionPlan','MfgProductionCost','MfgWasteRecord','MfgShiftProduction','Subcontracting','COGM calculation'], sp: 13, wkStart: 10, wkDur: 2 },
      { platform: 'Frontend', task: 'Manufacturing Pages', subtasks: ['Manufacturing dashboard','Work order list','BOM builder','Routing editor','Work center mgmt','Machine registry','QC inspection forms','Production planning calendar','OEE analytics','Cost analysis','Waste tracking','PLM'], sp: 13, wkStart: 10, wkDur: 2 },
      { platform: 'Mobile', task: 'Mobile Manufacturing', subtasks: ['Work order task view','QC inspection mobile','Production count entry','Machine status update','Waste recording'], sp: 5, wkStart: 12, wkDur: 1 },
    ]
  },
  {
    phase: 'Phase 6 - Enterprise (W9-13)', phaseColor: COLORS.phase6,
    module: 'M24 - Asset Management',
    goal: 'Pengelolaan aset: registry, penyusutan, pemeliharaan, lisensi',
    objectives: ['Asset registry', 'Depreciation', 'Maintenance work orders', 'Software licenses', 'Asset movements'],
    tasks: [
      { platform: 'Backend', task: 'Asset Management API', subtasks: ['Asset CRUD','AssetCategory','Depreciation (SL/DB/SYD)','AssetMovement tracking','MaintenanceSchedule','AssetWorkOrder','AssetLicense','AssetTenancy','Alert generation'], sp: 8, wkStart: 10, wkDur: 1 },
      { platform: 'Frontend', task: 'Asset Management Pages', subtasks: ['Asset dashboard','Asset registry','Asset detail & history','Depreciation report','Maintenance calendar','Work order mgmt','License tracking','Movement log','Settings'], sp: 8, wkStart: 11, wkDur: 1 },
      { platform: 'Mobile', task: 'Mobile Asset', subtasks: ['Asset scan (barcode/QR)','Asset inspection form','Maintenance request','Asset transfer request'], sp: 3, wkStart: 11, wkDur: 1 },
    ]
  },
  {
    phase: 'Phase 6 - Enterprise (W9-13)', phaseColor: COLORS.phase6,
    module: 'M25 - Project Management',
    goal: 'Manajemen proyek: task, milestone, timesheet, risk, budget',
    objectives: ['Project CRUD', 'Task board (Kanban)', 'Milestone tracking', 'Timesheet', 'Resource allocation', 'Risk management'],
    tasks: [
      { platform: 'Backend', task: 'Project Management API', subtasks: ['PjmProject CRUD','PjmTask CRUD','PjmMilestone model','PjmTimesheet recording','PjmResource allocation','PjmRisk model','PjmBudget tracking','PjmDocument management'], sp: 8, wkStart: 11, wkDur: 1 },
      { platform: 'Frontend', task: 'Project Management Pages', subtasks: ['Project dashboard','Project list & detail','Task kanban board','Gantt chart view','Milestone timeline','Timesheet entry','Resource allocation','Risk register','Budget tracking','Document repository'], sp: 8, wkStart: 11, wkDur: 1 },
      { platform: 'Mobile', task: 'Mobile Project', subtasks: ['Task list & update','Time logging','Milestone notifications','Document viewer'], sp: 3, wkStart: 12, wkDur: 1 },
    ]
  },
  {
    phase: 'Phase 6 - Enterprise (W9-13)', phaseColor: COLORS.phase6,
    module: 'M26 - E-Procurement',
    goal: 'Pengadaan elektronik: vendor, RFQ, tender, kontrak, evaluasi',
    objectives: ['Vendor management', 'RFQ process', 'Tender management', 'Contract lifecycle', 'Vendor evaluation'],
    tasks: [
      { platform: 'Backend', task: 'E-Procurement API', subtasks: ['EprVendor CRUD','EprProcurementRequest','EprRfq & responses','EprTender & bids','EprContract lifecycle','EprEvaluation scoring','Approval workflows','Analytics'], sp: 8, wkStart: 11, wkDur: 1 },
      { platform: 'Frontend', task: 'E-Procurement Pages', subtasks: ['E-Procurement dashboard','Vendor registry','Procurement request form','RFQ builder','Tender management','Contract management','Vendor evaluation','Analytics & reports'], sp: 8, wkStart: 11, wkDur: 1 },
      { platform: 'Mobile', task: 'Mobile E-Procurement', subtasks: ['Approval from mobile','Vendor lookup','RFQ review'], sp: 3, wkStart: 12, wkDur: 1 },
    ]
  },
  {
    phase: 'Phase 6 - Enterprise (W9-13)', phaseColor: COLORS.phase6,
    module: 'M27 - Export/Import (EXIM)',
    goal: 'Manajemen ekspor-impor: pengiriman, kepabeanan, L/C, dokumen',
    objectives: ['Shipment tracking', 'Customs management', 'Letter of Credit', 'HS code', 'Cost tracking'],
    tasks: [
      { platform: 'Backend', task: 'EXIM API', subtasks: ['EximShipment CRUD','EximCustoms model','EximLC (Letter of Credit)','EximContainer tracking','EximDocument mgmt','EximPartner CRUD','EximCost recording','EximHsCode reference','Analytics'], sp: 8, wkStart: 11, wkDur: 1 },
      { platform: 'Frontend', task: 'EXIM Pages', subtasks: ['EXIM dashboard','Shipment list & detail','Customs management','L/C tracking','Container tracking','Document mgmt','Partner registry','Cost analysis','HS code search','Analytics'], sp: 8, wkStart: 12, wkDur: 1 },
      { platform: 'Mobile', task: 'Mobile EXIM', subtasks: ['Shipment status tracker','Document viewer','Cost entry'], sp: 3, wkStart: 12, wkDur: 1 },
    ]
  },
  {
    phase: 'Phase 6 - Enterprise (W9-13)', phaseColor: COLORS.phase6,
    module: 'M28 - Reports & Analytics',
    goal: 'Pusat laporan konsolidasi untuk semua modul',
    objectives: ['Sales reports', 'Inventory reports', 'Finance reports', 'HR reports', 'Custom report builder'],
    tasks: [
      { platform: 'Backend', task: 'Report Engine API', subtasks: ['Report query builder','Sales aggregation','Inventory aggregation','Finance aggregation','HR aggregation','Multi-branch consolidated','Export Excel/PDF/CSV','Scheduled report (cron)'], sp: 13, wkStart: 9, wkDur: 2 },
      { platform: 'Frontend', task: 'Report Hub & Pages', subtasks: ['Report hub dashboard','Sales report page','Inventory report','Finance report','Customer report','HR report','Procurement report','Custom data analysis','Chart & pivot builder','Export & schedule UI'], sp: 13, wkStart: 10, wkDur: 2 },
      { platform: 'Mobile', task: 'Mobile Reports', subtasks: ['Key metric dashboard','Quick report viewer','Share report via mobile'], sp: 3, wkStart: 11, wkDur: 1 },
    ]
  },
  {
    phase: 'Phase 6 - Enterprise (W9-13)', phaseColor: COLORS.phase6,
    module: 'M29 - WhatsApp Business Integration',
    goal: 'Integrasi WhatsApp untuk broadcast, notifikasi, dan pesan otomatis',
    objectives: ['WA API integration', 'Broadcast messaging', 'Template messages', 'Auto-reply'],
    tasks: [
      { platform: 'Backend', task: 'WhatsApp API Integration', subtasks: ['WA Business API connection','Message template CRUD','Broadcast service','Auto-reply webhook','Message log & analytics','Rate limiting'], sp: 8, wkStart: 11, wkDur: 1 },
      { platform: 'Frontend', task: 'WhatsApp Management Pages', subtasks: ['WA dashboard','Template editor','Broadcast builder','Message analytics','Settings & connection'], sp: 5, wkStart: 12, wkDur: 1 },
    ]
  },
  {
    phase: 'Phase 6 - Enterprise (W9-13)', phaseColor: COLORS.phase6,
    module: 'M30 - Marketplace Integration',
    goal: 'Integrasi marketplace: sinkronisasi produk dan pesanan multi-channel',
    objectives: ['Tokopedia/Shopee/Lazada integration', 'Product sync', 'Order sync', 'Stock sync'],
    tasks: [
      { platform: 'Backend', task: 'Marketplace API Integration', subtasks: ['Marketplace adapter pattern','Tokopedia API','Shopee API','Product sync service','Order sync service','Stock sync service','Webhook handlers','Error retry queue'], sp: 13, wkStart: 11, wkDur: 2 },
      { platform: 'Frontend', task: 'Marketplace Pages', subtasks: ['Marketplace dashboard','Channel connection wizard','Product mapping UI','Order list multi-channel','Stock sync status','Settings'], sp: 8, wkStart: 12, wkDur: 1 },
    ]
  },
  {
    phase: 'Phase 6 - Enterprise (W9-13)', phaseColor: COLORS.phase6,
    module: 'M31 - Website Builder',
    goal: 'Pembangun website drag-drop untuk toko online sederhana',
    objectives: ['Page builder', 'Component library', 'Theme system', 'Publish'],
    tasks: [
      { platform: 'Backend', task: 'Website Builder API', subtasks: ['Page model CRUD','Component/section storage','Theme config','Publish/unpublish','Custom domain mapping','SEO metadata'], sp: 5, wkStart: 12, wkDur: 1 },
      { platform: 'Frontend', task: 'Website Builder Editor', subtasks: ['Drag-drop page editor','Component palette','Theme customizer','Preview mode','Publish flow','Page list management'], sp: 8, wkStart: 12, wkDur: 1 },
    ]
  },
  {
    phase: 'Phase 6 - Enterprise (W9-13)', phaseColor: COLORS.phase6,
    module: 'M32 - Knowledge Base',
    goal: 'Basis pengetahuan internal untuk SOP dan dokumentasi',
    objectives: ['Article CRUD', 'Category organization', 'Search', 'Versioning'],
    tasks: [
      { platform: 'Backend', task: 'Knowledge Base API', subtasks: ['Article model CRUD','Category organization','Full-text search','Article versioning','Access control'], sp: 3, wkStart: 12, wkDur: 1 },
      { platform: 'Frontend', task: 'Knowledge Base Pages', subtasks: ['Article list & search','Article editor (rich text)','Category navigation','Version history'], sp: 3, wkStart: 12, wkDur: 1 },
    ]
  },
  {
    phase: 'Phase 6 - Enterprise (W9-13)', phaseColor: COLORS.phase6,
    module: 'M33 - Billing & Subscription (SaaS)',
    goal: 'Sistem billing SaaS: paket, subscription, invoice, payment gateway',
    objectives: ['Package management', 'Subscription lifecycle', 'Invoice generation', 'Payment gateway'],
    tasks: [
      { platform: 'Backend', task: 'Billing API', subtasks: ['SubscriptionPackage CRUD','Subscription lifecycle','BillingCycle tracking','Invoice auto-generation','Payment gateway (Stripe/Midtrans)','Webhook payment','Usage-based billing','Upgrade/downgrade logic'], sp: 8, wkStart: 12, wkDur: 1 },
      { platform: 'Frontend', task: 'Billing Pages', subtasks: ['Pricing page','Subscription management','Invoice list & detail','Payment history','Upgrade/downgrade flow','Usage analytics'], sp: 5, wkStart: 12, wkDur: 1 },
    ]
  },
  {
    phase: 'Phase 6 - Enterprise (W9-13)', phaseColor: COLORS.phase6,
    module: 'M34 - Admin Panel (Super Admin)',
    goal: 'Panel admin untuk mengelola semua tenant, modul, dan sistem',
    objectives: ['Tenant management', 'Module management', 'User management', 'System logs', 'Business type config'],
    tasks: [
      { platform: 'Backend', task: 'Admin API', subtasks: ['Tenant list & management','Module activation','System user management','Audit log queries','Business type CRUD','System health','Backup management'], sp: 8, wkStart: 12, wkDur: 1 },
      { platform: 'Frontend', task: 'Admin Panel Pages', subtasks: ['Admin dashboard','Tenant list & detail','Module management','User management','System log viewer','Business type config','System settings'], sp: 8, wkStart: 12, wkDur: 1 },
    ]
  },
  {
    phase: 'Phase 6 - Enterprise (W9-13)', phaseColor: COLORS.phase6,
    module: 'M35 - Notifications & Alerts',
    goal: 'Sistem notifikasi real-time dan alerting',
    objectives: ['In-app notifications', 'Push notifications', 'Email notifications', 'Alert subscriptions'],
    tasks: [
      { platform: 'Backend', task: 'Notification Service', subtasks: ['Notification model','WebSocket/SSE real-time','Push notification (FCM)','Email (Nodemailer)','Alert subscription model','Alert trigger engine','Notification preferences'], sp: 8, wkStart: 12, wkDur: 1 },
      { platform: 'Frontend', task: 'Notification UI', subtasks: ['Notification bell & dropdown','Notification center page','Alert subscription settings','Real-time toast'], sp: 3, wkStart: 12, wkDur: 1 },
      { platform: 'Mobile', task: 'Mobile Notifications', subtasks: ['Push notification handler','Notification list screen','Deep linking','Badge count management'], sp: 3, wkStart: 12, wkDur: 1 },
    ]
  },
  {
    phase: 'Phase 6 - Enterprise (W9-13)', phaseColor: COLORS.phase6,
    module: 'M36 - Audit & Security',
    goal: 'Audit trail lengkap dan keamanan sistem',
    objectives: ['Audit logging', 'Data encryption', 'RBAC enforcement', 'Security monitoring', 'GDPR compliance'],
    tasks: [
      { platform: 'Backend', task: 'Audit & Security API', subtasks: ['AuditLog model','Auto audit trail middleware','Data encryption at rest','Rate limiting & throttling','IP whitelist/blacklist','Security event monitoring','GDPR data export/delete','Two-factor authentication','Session management','API key management'], sp: 8, wkStart: 12, wkDur: 1 },
      { platform: 'Frontend', task: 'Audit & Security Pages', subtasks: ['Audit log viewer','Security dashboard','User session management','API key management','Security settings','Access report','Data export (GDPR)'], sp: 5, wkStart: 12, wkDur: 1 },
    ]
  },
];
