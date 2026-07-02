const ExcelJS = require('exceljs');
const path = require('path');

// ====================================================
// BEDAGANG ERP - FULL DEVELOPMENT PROJECT PLAN
// ====================================================

const PROJECT_START = new Date('2025-04-01');
const COLORS = {
  header: 'FF1E3A5F', headerFont: 'FFFFFFFF',
  backend: 'FF3498DB', frontend: 'FF2ECC71', mobile: 'FFE74C3C',
  phase1: 'FF27AE60', phase2: 'FF2980B9', phase3: 'FFF39C12',
  phase4: 'FF8E44AD', phase5: 'FFE74C3C', phase6: 'FF1ABC9C',
  ganttBE: 'FF5DADE2', ganttFE: 'FF58D68D', ganttMB: 'FFEC7063',
  lightGray: 'FFF2F3F4', white: 'FFFFFFFF',
};

function addWeeks(date, weeks) {
  const d = new Date(date);
  d.setDate(d.getDate() + weeks * 7);
  return d;
}
function fmt(d) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}
function weeksBetween(d1, d2) {
  return Math.round((d2 - d1) / (7*24*60*60*1000));
}

// ====================================================
// MODULE DEFINITIONS
// ====================================================
const modules = [
  // PHASE 1 - Foundation (Week 1-8)
  {
    phase: 'Phase 1 - Foundation', phaseColor: COLORS.phase1,
    module: 'M01 - Authentication & Authorization',
    goal: 'Sistem login multi-tenant dengan role-based access control',
    objectives: ['JWT auth flow', 'Multi-tenant isolation', 'Role & permission matrix', 'Session management'],
    tasks: [
      { platform: 'Backend', task: 'Auth API - Register/Login/Logout', subtasks: ['POST /api/auth/register','POST /api/auth/login','POST /api/auth/logout','JWT token generation & refresh','Password hashing (bcrypt)','Email verification flow'], sp: 8, wkStart: 0, wkDur: 2 },
      { platform: 'Backend', task: 'Role & Permission System', subtasks: ['Role model (super_admin, owner, admin, manager, staff, cashier, etc)','Permission matrix CRUD','Middleware auth guard','Middleware role guard','Middleware module access guard'], sp: 8, wkStart: 0, wkDur: 2 },
      { platform: 'Backend', task: 'Multi-Tenant Isolation', subtasks: ['Tenant model & migration','Tenant middleware for data isolation','Tenant-aware query scoping','Tenant settings API'], sp: 5, wkStart: 1, wkDur: 2 },
      { platform: 'Frontend', task: 'Login & Register Pages', subtasks: ['Login page UI','Register page UI','Forgot password flow','OTP verification UI','Auth context/provider'], sp: 5, wkStart: 1, wkDur: 2 },
      { platform: 'Frontend', task: 'Auth Guards & Layout', subtasks: ['Protected route wrapper','Role-based route guard','Layout with sidebar (HQ/Branch/Admin)','Sidebar config integration','User profile dropdown'], sp: 5, wkStart: 2, wkDur: 2 },
      { platform: 'Mobile', task: 'Mobile Auth Flow', subtasks: ['Login screen','Biometric auth (fingerprint/face)','Token storage (secure)','Auto-refresh token','Push notification token registration'], sp: 5, wkStart: 3, wkDur: 2 },
    ]
  },
  {
    phase: 'Phase 1 - Foundation', phaseColor: COLORS.phase1,
    module: 'M02 - Onboarding & Tenant Setup',
    goal: 'Wizard onboarding untuk tenant baru dan setup awal bisnis',
    objectives: ['KYB application flow', 'Business type selection', 'Initial branch & user setup'],
    tasks: [
      { platform: 'Backend', task: 'Onboarding API', subtasks: ['POST /api/onboarding/start','Business type selection endpoint','KYB document upload','Tenant provisioning service','Default data seeding (roles, modules)'], sp: 8, wkStart: 2, wkDur: 2 },
      { platform: 'Backend', task: 'Subscription & Package API', subtasks: ['Package model & CRUD','Subscription lifecycle','Module activation per package','Trial period management'], sp: 5, wkStart: 3, wkDur: 2 },
      { platform: 'Frontend', task: 'Onboarding Wizard UI', subtasks: ['Step 1: Business info form','Step 2: Business type selection','Step 3: KYB document upload','Step 4: Branch setup','Step 5: Admin user creation','Progress indicator'], sp: 8, wkStart: 3, wkDur: 2 },
      { platform: 'Mobile', task: 'Mobile Onboarding', subtasks: ['Onboarding welcome screens','Business setup wizard (mobile)','Initial sync after setup'], sp: 3, wkStart: 5, wkDur: 1 },
    ]
  },
  {
    phase: 'Phase 1 - Foundation', phaseColor: COLORS.phase1,
    module: 'M03 - Branch Management',
    goal: 'Manajemen multi-cabang dari HQ dengan monitoring performa',
    objectives: ['CRUD cabang', 'Performance dashboard per branch', 'Branch settings', 'Real-time metrics'],
    tasks: [
      { platform: 'Backend', task: 'Branch CRUD API', subtasks: ['GET/POST/PUT/DELETE /api/branches','Branch model & migration','Branch-module activation','Branch user assignment','Branch real-time metrics model'], sp: 8, wkStart: 3, wkDur: 2 },
      { platform: 'Backend', task: 'Branch Performance API', subtasks: ['Sales aggregation per branch','Inventory status per branch','Employee count & schedule','Comparison analytics endpoint'], sp: 5, wkStart: 4, wkDur: 2 },
      { platform: 'Frontend', task: 'Branch List & Detail Pages', subtasks: ['Branch list with filters & search','Branch detail page','Branch creation form','Branch settings page','Branch performance dashboard'], sp: 8, wkStart: 4, wkDur: 2 },
      { platform: 'Frontend', task: 'Branch Performance Charts', subtasks: ['Revenue comparison chart','Top/bottom branch ranking','Branch map view (Leaflet)','Real-time metrics cards'], sp: 5, wkStart: 5, wkDur: 2 },
      { platform: 'Mobile', task: 'Branch Switcher (Mobile)', subtasks: ['Branch selector dropdown','Branch dashboard summary','Quick branch performance view'], sp: 3, wkStart: 6, wkDur: 1 },
    ]
  },
  {
    phase: 'Phase 1 - Foundation', phaseColor: COLORS.phase1,
    module: 'M04 - Settings & Configuration',
    goal: 'Pengaturan global, modul, pajak, notifikasi, dan integrasi',
    objectives: ['Global settings', 'Module management', 'Tax configuration', 'Notification settings'],
    tasks: [
      { platform: 'Backend', task: 'Settings API', subtasks: ['Store settings CRUD','Tax & fee configuration','Notification settings','Module toggle endpoints','Integration config endpoints'], sp: 5, wkStart: 5, wkDur: 2 },
      { platform: 'Frontend', task: 'Settings Pages', subtasks: ['Global settings page','Module management page','Tax & fee settings','Notification preferences','Integration settings page'], sp: 5, wkStart: 6, wkDur: 2 },
      { platform: 'Mobile', task: 'Mobile Settings', subtasks: ['App preferences screen','Notification toggle','Printer/device settings'], sp: 3, wkStart: 7, wkDur: 1 },
    ]
  },

  // PHASE 2 - Core Commerce (Week 7-18)
  {
    phase: 'Phase 2 - Core Commerce', phaseColor: COLORS.phase2,
    module: 'M05 - Product & Category Management',
    goal: 'Master data produk, kategori, varian, dan harga',
    objectives: ['Product CRUD with variants', 'Category hierarchy', 'Price tiers & multi-branch pricing', 'Barcode support'],
    tasks: [
      { platform: 'Backend', task: 'Product CRUD API', subtasks: ['Product model & migration','GET/POST/PUT/DELETE /api/products','Product variant support','Image upload (multer)','Barcode generation','Bulk import/export CSV'], sp: 8, wkStart: 7, wkDur: 2 },
      { platform: 'Backend', task: 'Category & Pricing API', subtasks: ['Category hierarchy CRUD','Price tier model','Multi-branch pricing logic','Product cost component tracking','HPP (Cost of Goods) calculation'], sp: 8, wkStart: 8, wkDur: 2 },
      { platform: 'Frontend', task: 'Product Management Pages', subtasks: ['Product list with grid/list view','Product create/edit form','Variant builder UI','Image upload with crop','Barcode scanner integration','Bulk import UI'], sp: 8, wkStart: 8, wkDur: 2 },
      { platform: 'Frontend', task: 'Category & Pricing Pages', subtasks: ['Category tree view','Drag-drop category reorder','Price tier management','Branch-specific pricing UI'], sp: 5, wkStart: 9, wkDur: 2 },
      { platform: 'Mobile', task: 'Mobile Product Catalog', subtasks: ['Product list & search','Product detail view','Barcode scan to find product','Quick price check'], sp: 5, wkStart: 10, wkDur: 2 },
    ]
  },
  {
    phase: 'Phase 2 - Core Commerce', phaseColor: COLORS.phase2,
    module: 'M06 - Point of Sale (POS)',
    goal: 'Sistem kasir lengkap dengan multi-payment, split bill, dan struk',
    objectives: ['Full POS transaction flow', 'Multi-payment methods', 'Receipt printing', 'Held transactions', 'Shift management'],
    tasks: [
      { platform: 'Backend', task: 'POS Transaction API', subtasks: ['POST /api/pos/transactions','Transaction model & items','Payment processing (cash, card, QRIS, e-wallet)','Split payment logic','Void & refund endpoints','Transaction search & filter'], sp: 13, wkStart: 9, wkDur: 3 },
      { platform: 'Backend', task: 'Shift & Cash Management API', subtasks: ['Open/close shift endpoints','Cash drawer tracking','Shift handover report','Held transaction CRUD','Daily sales summary'], sp: 8, wkStart: 10, wkDur: 2 },
      { platform: 'Backend', task: 'Receipt & Printer API', subtasks: ['Receipt template engine','Thermal printer config','Digital receipt (email/WA)','Receipt reprint endpoint'], sp: 5, wkStart: 11, wkDur: 1 },
      { platform: 'Frontend', task: 'POS Cashier Interface', subtasks: ['POS main screen layout','Product grid with categories','Cart management','Quantity & discount controls','Customer selection','Barcode scanner input','Payment modal (multi-method)','Split bill UI','Receipt preview & print'], sp: 13, wkStart: 10, wkDur: 3 },
      { platform: 'Frontend', task: 'Shift & Transaction History', subtasks: ['Shift open/close dialogs','Cash count form','Shift summary report','Transaction history list','Transaction detail & reprint','Held transactions list'], sp: 8, wkStart: 12, wkDur: 2 },
      { platform: 'Mobile', task: 'Mobile POS', subtasks: ['Mobile POS interface','Product search & scan','Cart management','Payment processing','Bluetooth printer integration','Offline transaction queue','Sync when online'], sp: 13, wkStart: 12, wkDur: 3 },
    ]
  },
  {
    phase: 'Phase 2 - Core Commerce', phaseColor: COLORS.phase2,
    module: 'M07 - Inventory Management',
    goal: 'Stok real-time, transfer antar gudang, stock opname, dan peringatan',
    objectives: ['Real-time stock tracking', 'Stock movements & adjustments', 'Stock opname', 'Multi-warehouse', 'Low stock alerts'],
    tasks: [
      { platform: 'Backend', task: 'Stock & Warehouse API', subtasks: ['Stock model per branch/warehouse','Stock movement logging','GET /api/inventory/stock','Stock adjustment endpoints','Warehouse CRUD','Stock transfer between branches'], sp: 13, wkStart: 10, wkDur: 3 },
      { platform: 'Backend', task: 'Stock Opname API', subtasks: ['Stock opname session CRUD','Opname item recording','Variance calculation','Approval workflow','Opname history & reports'], sp: 8, wkStart: 12, wkDur: 2 },
      { platform: 'Backend', task: 'Alerts & Reorder API', subtasks: ['Low stock threshold config','Alert generation service','Reorder point notification','Stock expiry tracking','Batch/lot number tracking'], sp: 5, wkStart: 13, wkDur: 2 },
      { platform: 'Frontend', task: 'Inventory Dashboard & Stock Pages', subtasks: ['Inventory dashboard with KPIs','Stock list with filters','Stock detail & movement history','Stock adjustment form','Transfer request form','Multi-warehouse view'], sp: 8, wkStart: 11, wkDur: 3 },
      { platform: 'Frontend', task: 'Stock Opname UI', subtasks: ['Start opname wizard','Item count entry (manual + scan)','Variance review screen','Approval flow UI','Opname history page'], sp: 8, wkStart: 13, wkDur: 2 },
      { platform: 'Mobile', task: 'Mobile Stock Management', subtasks: ['Stock check by scan','Mobile stock opname','Stock transfer request','Low stock alert push notification','Stock receive confirmation'], sp: 8, wkStart: 14, wkDur: 2 },
    ]
  },
  {
    phase: 'Phase 2 - Core Commerce', phaseColor: COLORS.phase2,
    module: 'M08 - Purchase Orders & Suppliers',
    goal: 'Pembelian barang, manajemen pemasok, dan penerimaan barang',
    objectives: ['PO lifecycle', 'Supplier management', 'Goods receipt', 'PO approval workflow'],
    tasks: [
      { platform: 'Backend', task: 'Purchase Order API', subtasks: ['PO model & items','PO CRUD endpoints','PO approval workflow','PO status tracking','Auto-PO from reorder point'], sp: 8, wkStart: 13, wkDur: 2 },
      { platform: 'Backend', task: 'Supplier & Goods Receipt API', subtasks: ['Supplier CRUD','Goods receipt recording','Partial receipt handling','Receipt-to-stock integration','Supplier performance metrics'], sp: 5, wkStart: 14, wkDur: 2 },
      { platform: 'Frontend', task: 'Purchase Order Pages', subtasks: ['PO list & filter','PO creation wizard','PO approval screen','PO detail & status timeline','Supplier list & form','Goods receipt form'], sp: 8, wkStart: 14, wkDur: 2 },
      { platform: 'Mobile', task: 'Mobile Goods Receipt', subtasks: ['Scan PO barcode to receive','Item count confirmation','Photo proof of delivery','Receipt signature capture'], sp: 5, wkStart: 16, wkDur: 1 },
    ]
  },

  // PHASE 3 - Customer & Engagement (Week 15-22)
  {
    phase: 'Phase 3 - Customer & Engagement', phaseColor: COLORS.phase3,
    module: 'M09 - Customer Management',
    goal: 'Database pelanggan lengkap dengan segmentasi dan riwayat transaksi',
    objectives: ['Customer CRUD', 'Segmentation & tags', 'Transaction history', 'Corporate customers'],
    tasks: [
      { platform: 'Backend', task: 'Customer CRUD API', subtasks: ['Customer model & migration','GET/POST/PUT/DELETE endpoints','Customer search & filter','Customer import/export','Customer segmentation logic','Corporate customer support'], sp: 8, wkStart: 15, wkDur: 2 },
      { platform: 'Frontend', task: 'Customer Management Pages', subtasks: ['Customer list with search','Customer detail 360 view','Add customer wizard','Customer edit form','Transaction history per customer','Customer segmentation UI','Corporate customer form'], sp: 8, wkStart: 15, wkDur: 2 },
      { platform: 'Mobile', task: 'Mobile Customer Lookup', subtasks: ['Customer search','Quick add customer','Customer card view','Link customer to POS transaction'], sp: 3, wkStart: 17, wkDur: 1 },
    ]
  },
  {
    phase: 'Phase 3 - Customer & Engagement', phaseColor: COLORS.phase3,
    module: 'M10 - Loyalty Program',
    goal: 'Program poin, tier, reward, dan redemption',
    objectives: ['Point accumulation', 'Tier system', 'Reward catalog', 'Redemption flow'],
    tasks: [
      { platform: 'Backend', task: 'Loyalty Program API', subtasks: ['LoyaltyProgram model','Point transaction recording','Tier calculation engine','Reward catalog CRUD','Redemption processing','Point expiry service'], sp: 8, wkStart: 17, wkDur: 2 },
      { platform: 'Frontend', task: 'Loyalty Program Pages', subtasks: ['Loyalty dashboard','Program configuration','Tier management','Reward catalog editor','Redemption history','Member analytics'], sp: 8, wkStart: 17, wkDur: 2 },
      { platform: 'Mobile', task: 'Mobile Loyalty', subtasks: ['Loyalty card view','Point balance & history','Available rewards','Redeem from mobile','Digital membership card'], sp: 5, wkStart: 19, wkDur: 2 },
    ]
  },
  {
    phase: 'Phase 3 - Customer & Engagement', phaseColor: COLORS.phase3,
    module: 'M11 - Promo & Voucher',
    goal: 'Sistem promosi, bundle, voucher, dan diskon otomatis',
    objectives: ['Promo engine', 'Bundle deals', 'Voucher generation & validation', 'Auto-discount rules'],
    tasks: [
      { platform: 'Backend', task: 'Promo & Voucher API', subtasks: ['Promo model & rules engine','Bundle deal logic','Voucher generation (unique codes)','Voucher validation & redemption','Promo scheduling','Category/product-specific promos'], sp: 8, wkStart: 19, wkDur: 2 },
      { platform: 'Frontend', task: 'Promo & Voucher Pages', subtasks: ['Promo list & creation wizard','Bundle builder UI','Voucher generator page','Promo analytics dashboard','Promo calendar view'], sp: 8, wkStart: 19, wkDur: 2 },
      { platform: 'Mobile', task: 'Mobile Promo Display', subtasks: ['Active promo list','Voucher scanner at POS','Apply promo in cart','Push notification for new promos'], sp: 3, wkStart: 21, wkDur: 1 },
    ]
  },
  {
    phase: 'Phase 3 - Customer & Engagement', phaseColor: COLORS.phase3,
    module: 'M12 - CRM (Customer Relationship Management)',
    goal: 'CRM 360 dengan komunikasi, tiket, otomasi, dan peramalan penjualan',
    objectives: ['Contact management', 'Communication tracking', 'Support tickets & SLA', 'Sales forecasting', 'Automation rules'],
    tasks: [
      { platform: 'Backend', task: 'CRM Core API', subtasks: ['CrmContact model','CrmCommunication model','CrmInteraction tracking','CrmDocument management','CrmCalendarEvent CRUD','Customer 360 aggregation endpoint'], sp: 8, wkStart: 18, wkDur: 2 },
      { platform: 'Backend', task: 'CRM Tickets & Automation API', subtasks: ['CrmTicket CRUD','SLA policy engine','Ticket escalation logic','CrmAutomationRule engine','Trigger-based actions','CrmFollowUp scheduler'], sp: 8, wkStart: 19, wkDur: 2 },
      { platform: 'Backend', task: 'CRM Forecasting API', subtasks: ['CrmForecast model','Pipeline value calculation','Win probability scoring','CrmDealScore model','Forecast vs actual comparison'], sp: 5, wkStart: 20, wkDur: 2 },
      { platform: 'Frontend', task: 'CRM Dashboard & Contact Pages', subtasks: ['CRM dashboard with pipeline','Contact list & 360 view','Communication timeline','Calendar & task integration','Document management UI'], sp: 8, wkStart: 19, wkDur: 2 },
      { platform: 'Frontend', task: 'CRM Tickets & Automation UI', subtasks: ['Ticket list & kanban board','Ticket detail & comments','SLA configuration page','Automation rule builder','Follow-up scheduler'], sp: 8, wkStart: 20, wkDur: 2 },
      { platform: 'Mobile', task: 'Mobile CRM', subtasks: ['Contact list & search','Quick log interaction','Ticket view & update','Follow-up reminders (push)'], sp: 5, wkStart: 21, wkDur: 2 },
    ]
  },

  // PHASE 4 - Operations (Week 19-30)
  {
    phase: 'Phase 4 - Operations', phaseColor: COLORS.phase4,
    module: 'M13 - Kitchen Management',
    goal: 'Manajemen dapur F&B: pesanan, resep, inventori bahan, staf dapur',
    objectives: ['Kitchen order display', 'Recipe management', 'Kitchen inventory', 'Staff assignment'],
    tasks: [
      { platform: 'Backend', task: 'Kitchen Order API', subtasks: ['KitchenOrder model','Order queue management','Order status updates (new/preparing/ready/served)','KDS integration endpoint','Order priority logic'], sp: 8, wkStart: 19, wkDur: 2 },
      { platform: 'Backend', task: 'Recipe & Kitchen Inventory API', subtasks: ['Recipe CRUD with ingredients','Auto-deduct stock on order','Kitchen inventory tracking','Production waste recording','Recipe costing calculation'], sp: 8, wkStart: 20, wkDur: 2 },
      { platform: 'Frontend', task: 'Kitchen Display System (KDS)', subtasks: ['KDS board layout','Order cards with timers','Status update buttons','Sound/visual alerts','Multi-station view'], sp: 8, wkStart: 20, wkDur: 2 },
      { platform: 'Frontend', task: 'Recipe & Kitchen Settings', subtasks: ['Recipe editor','Ingredient mapping','Kitchen inventory page','Kitchen staff assignment','Kitchen settings'], sp: 5, wkStart: 21, wkDur: 2 },
      { platform: 'Mobile', task: 'Mobile KDS', subtasks: ['Mobile kitchen display','Order status quick update','Alert on new orders'], sp: 3, wkStart: 22, wkDur: 1 },
    ]
  },
  {
    phase: 'Phase 4 - Operations', phaseColor: COLORS.phase4,
    module: 'M14 - Table & Reservation Management',
    goal: 'Manajemen meja restoran dan sistem reservasi',
    objectives: ['Table layout', 'Table sessions', 'Reservation booking', 'Table-to-POS integration'],
    tasks: [
      { platform: 'Backend', task: 'Table & Session API', subtasks: ['Table model CRUD','Table session management','Table status tracking','Merge/split table','Table-POS transaction linking'], sp: 5, wkStart: 21, wkDur: 2 },
      { platform: 'Backend', task: 'Reservation API', subtasks: ['Reservation CRUD','Availability check','Confirmation & reminder','Walk-in vs reserved','Cancellation policy'], sp: 5, wkStart: 22, wkDur: 2 },
      { platform: 'Frontend', task: 'Table Layout & Reservation UI', subtasks: ['Drag-drop table layout editor','Real-time table status map','Table session view','Reservation calendar','Reservation create/edit form','Waitlist management'], sp: 8, wkStart: 22, wkDur: 2 },
      { platform: 'Mobile', task: 'Mobile Table/Reservation', subtasks: ['Table status overview','Quick seat assignment','Reservation lookup'], sp: 3, wkStart: 24, wkDur: 1 },
    ]
  },
  {
    phase: 'Phase 4 - Operations', phaseColor: COLORS.phase4,
    module: 'M15 - Employee & Schedule Management',
    goal: 'Jadwal karyawan, shift, dan handover',
    objectives: ['Shift templates', 'Schedule builder', 'Shift handover', 'Attendance basic'],
    tasks: [
      { platform: 'Backend', task: 'Schedule & Shift API', subtasks: ['Shift model & templates','Schedule CRUD','Shift assignment engine','Shift handover recording','Schedule conflict detection'], sp: 5, wkStart: 22, wkDur: 2 },
      { platform: 'Frontend', task: 'Schedule & Shift Pages', subtasks: ['Schedule calendar view (FullCalendar)','Shift template builder','Drag-drop shift assignment','Shift handover form','Schedule print/export'], sp: 8, wkStart: 22, wkDur: 2 },
      { platform: 'Mobile', task: 'Mobile Schedule View', subtasks: ['My schedule view','Shift swap request','Clock in/out','Handover checklist'], sp: 5, wkStart: 24, wkDur: 2 },
    ]
  },
  {
    phase: 'Phase 4 - Operations', phaseColor: COLORS.phase4,
    module: 'M16 - HRIS (Human Resource Information System)',
    goal: 'Sistem HR lengkap: kehadiran, penggajian, cuti, kinerja, rekrutmen',
    objectives: ['Employee database', 'Attendance devices', 'Payroll processing', 'Leave management', 'Performance review', 'Recruitment'],
    tasks: [
      { platform: 'Backend', task: 'Employee Database API', subtasks: ['Employee model (comprehensive)','Employee documents','Employee family data','Employee education & skills','Employee work experience','Organization structure','Job grade system'], sp: 8, wkStart: 23, wkDur: 2 },
      { platform: 'Backend', task: 'Attendance & Devices API', subtasks: ['AttendanceDevice model','Device log ingestion','Attendance calculation','Overtime calculation','AttendanceSettings per branch','Fingerprint/face device integration'], sp: 8, wkStart: 24, wkDur: 2 },
      { platform: 'Backend', task: 'Payroll API', subtasks: ['PayrollComponent model','Salary structure','Payroll run processing','Tax calculation (PPh21)','Payslip generation','Bank file export'], sp: 13, wkStart: 25, wkDur: 3 },
      { platform: 'Backend', task: 'Leave & Performance API', subtasks: ['LeaveType & balance model','Leave request workflow','Leave approval chain','PerformanceReview model','KPI template & scoring','360 feedback system'], sp: 8, wkStart: 26, wkDur: 2 },
      { platform: 'Backend', task: 'Recruitment & Training API', subtasks: ['Job posting CRUD','Candidate tracking','Interview scheduling','Training program model','Certification tracking','Employee mutation/transfer'], sp: 5, wkStart: 27, wkDur: 2 },
      { platform: 'Frontend', task: 'HRIS Dashboard & Employee Pages', subtasks: ['HRIS dashboard','Employee list & detail','Employee create/edit wizard','Organization chart','Document management','Employee lifecycle timeline'], sp: 8, wkStart: 24, wkDur: 2 },
      { platform: 'Frontend', task: 'Attendance & Payroll Pages', subtasks: ['Attendance dashboard','Daily attendance log','Device management page','Payroll run wizard','Payslip viewer','Salary structure editor'], sp: 8, wkStart: 26, wkDur: 2 },
      { platform: 'Frontend', task: 'Leave, KPI & Recruitment Pages', subtasks: ['Leave calendar & balance','Leave request form','Leave approval list','KPI dashboard','KPI scoring form','Performance review form','Recruitment pipeline board','Training catalog'], sp: 8, wkStart: 27, wkDur: 2 },
      { platform: 'Mobile', task: 'Mobile HRIS (ESS)', subtasks: ['My profile view','Clock in/out with GPS','Leave request from mobile','Payslip viewer','KPI & goals view','Training schedule','Claim submission','Travel request'], sp: 8, wkStart: 28, wkDur: 2 },
    ]
  },

  // PHASE 5 - Finance & Advanced (Week 27-38)
  {
    phase: 'Phase 5 - Finance & Advanced', phaseColor: COLORS.phase5,
    module: 'M17 - Finance Lite',
    goal: 'Ringkasan keuangan dasar: transaksi harian dan laporan sederhana',
    objectives: ['Daily transaction summary', 'Basic income/expense tracking'],
    tasks: [
      { platform: 'Backend', task: 'Finance Lite API', subtasks: ['FinanceTransaction model','Daily income aggregation','Basic expense recording','Daily/weekly/monthly summary','Export to Excel/PDF'], sp: 5, wkStart: 27, wkDur: 2 },
      { platform: 'Frontend', task: 'Finance Lite Pages', subtasks: ['Transaction list','Daily summary dashboard','Simple income/expense chart','Export buttons'], sp: 5, wkStart: 27, wkDur: 2 },
    ]
  },
  {
    phase: 'Phase 5 - Finance & Advanced', phaseColor: COLORS.phase5,
    module: 'M18 - Finance Pro (Full Accounting)',
    goal: 'Akuntansi lengkap: GL, AP/AR, invoicing, anggaran, arus kas, pajak',
    objectives: ['Chart of Accounts', 'General Ledger', 'AP & AR', 'Invoicing', 'Budget', 'Cash flow', 'Tax management'],
    tasks: [
      { platform: 'Backend', task: 'Chart of Accounts & GL API', subtasks: ['FinanceAccount model (CoA)','Journal entry recording','General ledger queries','Trial balance calculation','Balance sheet generation','Income statement (P&L)'], sp: 13, wkStart: 28, wkDur: 3 },
      { platform: 'Backend', task: 'Invoice & AP/AR API', subtasks: ['Invoice model & items','Invoice generation from POS','AR tracking & aging','AP tracking & aging','Payment recording','Invoice email sending'], sp: 8, wkStart: 30, wkDur: 2 },
      { platform: 'Backend', task: 'Budget & Cash Flow API', subtasks: ['Budget model per department','Budget vs actual tracking','Cash flow projection','Cash flow report','Tax calculation service','Tax report generation'], sp: 8, wkStart: 31, wkDur: 2 },
      { platform: 'Frontend', task: 'Finance Dashboard & GL Pages', subtasks: ['Finance dashboard with KPIs','Chart of Accounts page','Journal entry form','General ledger view','Trial balance report','P&L report','Balance sheet report'], sp: 13, wkStart: 29, wkDur: 3 },
      { platform: 'Frontend', task: 'Invoice & AP/AR Pages', subtasks: ['Invoice list & detail','Invoice creation form','AR aging report','AP aging report','Payment recording form','Invoice PDF preview'], sp: 8, wkStart: 31, wkDur: 2 },
      { platform: 'Frontend', task: 'Budget & Tax Pages', subtasks: ['Budget planning page','Budget vs actual chart','Cash flow report','Tax summary page','Financial ratio analysis'], sp: 5, wkStart: 32, wkDur: 2 },
      { platform: 'Mobile', task: 'Mobile Finance', subtasks: ['Daily revenue summary','Expense quick entry','Invoice approval','Cash flow overview'], sp: 3, wkStart: 33, wkDur: 1 },
    ]
  },
  {
    phase: 'Phase 5 - Finance & Advanced', phaseColor: COLORS.phase5,
    module: 'M19 - SFA (Sales Force Automation)',
    goal: 'Otomasi tenaga penjualan: kunjungan, target, insentif, pipeline',
    objectives: ['Visit tracking', 'Target & achievement', 'Incentive calculation', 'Field order', 'Territory management'],
    tasks: [
      { platform: 'Backend', task: 'SFA Core API', subtasks: ['SfaTeam & territory model','SfaVisit with GPS check-in','SfaLead & opportunity pipeline','SfaFieldOrder CRUD','SfaQuotation CRUD','Coverage plan & assignment'], sp: 13, wkStart: 30, wkDur: 3 },
      { platform: 'Backend', task: 'SFA Target & Incentive API', subtasks: ['SfaTarget & assignment model','Achievement tracking','Incentive scheme engine','Commission calculation','SfaPlafon (credit limit)','Approval workflow'], sp: 8, wkStart: 32, wkDur: 2 },
      { platform: 'Frontend', task: 'SFA Dashboard & Pages', subtasks: ['SFA dashboard','Visit map & list','Lead/opportunity pipeline (kanban)','Field order management','Quotation builder','Team & territory management','Target setting & tracking','Incentive calculation view','Survey & competitor activity'], sp: 13, wkStart: 31, wkDur: 3 },
      { platform: 'Mobile', task: 'Mobile SFA', subtasks: ['GPS check-in for visits','Photo proof upload','Quick field order entry','Route plan view','Target & achievement dashboard','Customer visit history','Offline mode with sync'], sp: 13, wkStart: 33, wkDur: 3 },
    ]
  },
  {
    phase: 'Phase 5 - Finance & Advanced', phaseColor: COLORS.phase5,
    module: 'M20 - Marketing & Campaigns',
    goal: 'Kampanye pemasaran, segmentasi, promosi, dan anggaran marketing',
    objectives: ['Campaign management', 'Customer segmentation', 'Promotion engine', 'Marketing budget'],
    tasks: [
      { platform: 'Backend', task: 'Marketing API', subtasks: ['MktCampaign CRUD','MktCampaignChannel tracking','MktSegment & rules engine','MktPromotion model','MktBudget tracking','Campaign performance analytics'], sp: 8, wkStart: 33, wkDur: 2 },
      { platform: 'Frontend', task: 'Marketing Pages', subtasks: ['Marketing dashboard','Campaign builder wizard','Segment builder (rules-based)','Promotion management','Budget allocation & tracking','Campaign analytics charts'], sp: 8, wkStart: 33, wkDur: 2 },
      { platform: 'Mobile', task: 'Mobile Marketing', subtasks: ['Campaign overview','Quick promotion setup','Push notification to customers'], sp: 3, wkStart: 35, wkDur: 1 },
    ]
  },

  // PHASE 6 - Enterprise (Week 33-48)
  {
    phase: 'Phase 6 - Enterprise', phaseColor: COLORS.phase6,
    module: 'M21 - Fleet Management (FMS)',
    goal: 'Manajemen armada kendaraan: tracking, maintenance, BBM, inspeksi',
    objectives: ['Vehicle registry', 'Driver management', 'GPS tracking', 'Maintenance scheduling', 'Fuel tracking', 'Geofencing'],
    tasks: [
      { platform: 'Backend', task: 'Fleet Core API', subtasks: ['FleetVehicle CRUD','FleetDriver CRUD','GPS location ingestion','Geofence model & check','Maintenance schedule engine','Fuel transaction recording','Inspection & incident models'], sp: 13, wkStart: 33, wkDur: 3 },
      { platform: 'Frontend', task: 'Fleet Dashboard & Pages', subtasks: ['Fleet dashboard','Vehicle list & detail','Driver list & assignment','GPS live map (Leaflet)','Geofence editor','Maintenance calendar','Fuel log & analytics','Inspection forms','Incident reports','Cost analytics'], sp: 13, wkStart: 34, wkDur: 3 },
      { platform: 'Mobile', task: 'Mobile Fleet (Driver App)', subtasks: ['Driver check-in/out','GPS tracking background service','Fuel entry form','Vehicle inspection checklist','Incident report with photos','Route navigation'], sp: 8, wkStart: 36, wkDur: 2 },
    ]
  },
  {
    phase: 'Phase 6 - Enterprise', phaseColor: COLORS.phase6,
    module: 'M22 - Transportation Management (TMS)',
    goal: 'Manajemen pengiriman, dispatch, pelacakan, dan carrier management',
    objectives: ['Shipment management', 'Dispatch planning', 'Carrier scorecards', 'Delivery SLA', 'Rate cards'],
    tasks: [
      { platform: 'Backend', task: 'TMS API', subtasks: ['Shipment CRUD','Dispatch & assignment','Tracking status updates','Carrier model & scoring','Route optimization','Rate card management','Zone & warehouse mapping','Billing integration','SLA monitoring'], sp: 13, wkStart: 35, wkDur: 3 },
      { platform: 'Frontend', task: 'TMS Dashboard & Pages', subtasks: ['TMS dashboard','Shipment list & tracking','Dispatch board','Carrier management','Route planner','Rate card editor','Zone management','SLA dashboard','Logistics KPI analytics'], sp: 13, wkStart: 36, wkDur: 3 },
      { platform: 'Mobile', task: 'Mobile TMS (Driver)', subtasks: ['Delivery task list','GPS tracking & proof of delivery','Signature capture','Photo upload','Status updates'], sp: 5, wkStart: 38, wkDur: 2 },
    ]
  },
  {
    phase: 'Phase 6 - Enterprise', phaseColor: COLORS.phase6,
    module: 'M23 - Manufacturing',
    goal: 'Produksi: work order, BOM, routing, QC, OEE, waste tracking',
    objectives: ['Work order management', 'BOM & routing', 'Quality control', 'OEE analytics', 'Production planning'],
    tasks: [
      { platform: 'Backend', task: 'Manufacturing API', subtasks: ['MfgWorkOrder CRUD','MfgBom & BomItem','MfgRouting & operations','MfgWorkCenter & Machine','MfgQcTemplate & inspection','MfgProductionPlan','MfgProductionCost','MfgWasteRecord','MfgShiftProduction','Subcontracting model','COGM calculation'], sp: 13, wkStart: 36, wkDur: 3 },
      { platform: 'Frontend', task: 'Manufacturing Pages', subtasks: ['Manufacturing dashboard','Work order list & detail','BOM builder','Routing editor','Work center management','Machine registry & maintenance','QC inspection forms','Production planning calendar','OEE analytics dashboard','Cost analysis','Waste tracking','PLM (Product Lifecycle)'], sp: 13, wkStart: 37, wkDur: 3 },
      { platform: 'Mobile', task: 'Mobile Manufacturing', subtasks: ['Work order task view','QC inspection mobile form','Production count entry','Machine status update','Waste recording'], sp: 5, wkStart: 39, wkDur: 2 },
    ]
  },
  {
    phase: 'Phase 6 - Enterprise', phaseColor: COLORS.phase6,
    module: 'M24 - Asset Management',
    goal: 'Pengelolaan aset: registry, penyusutan, pemeliharaan, lisensi',
    objectives: ['Asset registry', 'Depreciation calculation', 'Maintenance work orders', 'Software licenses', 'Asset movements'],
    tasks: [
      { platform: 'Backend', task: 'Asset Management API', subtasks: ['Asset CRUD','AssetCategory model','Depreciation calculation (SL/DB/SYD)','AssetMovement tracking','AssetMaintenanceSchedule','AssetWorkOrder','AssetLicense tracking','AssetTenancy (rental)','Alert generation'], sp: 8, wkStart: 38, wkDur: 2 },
      { platform: 'Frontend', task: 'Asset Management Pages', subtasks: ['Asset dashboard','Asset registry list','Asset detail & history','Depreciation report','Maintenance calendar','Work order management','License tracking page','Asset movement log','Settings & categories'], sp: 8, wkStart: 39, wkDur: 2 },
      { platform: 'Mobile', task: 'Mobile Asset', subtasks: ['Asset scan (barcode/QR)','Asset inspection form','Maintenance request','Asset transfer request'], sp: 3, wkStart: 40, wkDur: 1 },
    ]
  },
  {
    phase: 'Phase 6 - Enterprise', phaseColor: COLORS.phase6,
    module: 'M25 - Project Management',
    goal: 'Manajemen proyek: task, milestone, timesheet, risk, budget',
    objectives: ['Project CRUD', 'Task board (Kanban)', 'Milestone tracking', 'Timesheet', 'Resource allocation', 'Risk management'],
    tasks: [
      { platform: 'Backend', task: 'Project Management API', subtasks: ['PjmProject CRUD','PjmTask CRUD','PjmMilestone model','PjmTimesheet recording','PjmResource allocation','PjmRisk model','PjmBudget tracking','PjmDocument management'], sp: 8, wkStart: 39, wkDur: 2 },
      { platform: 'Frontend', task: 'Project Management Pages', subtasks: ['Project dashboard','Project list & detail','Task kanban board','Gantt chart view','Milestone timeline','Timesheet entry & report','Resource allocation view','Risk register','Budget tracking','Document repository'], sp: 8, wkStart: 40, wkDur: 2 },
      { platform: 'Mobile', task: 'Mobile Project', subtasks: ['Task list & update','Time logging','Milestone notifications','Document viewer'], sp: 3, wkStart: 41, wkDur: 1 },
    ]
  },
  {
    phase: 'Phase 6 - Enterprise', phaseColor: COLORS.phase6,
    module: 'M26 - E-Procurement',
    goal: 'Pengadaan elektronik: vendor, RFQ, tender, kontrak, evaluasi',
    objectives: ['Vendor management', 'RFQ process', 'Tender management', 'Contract lifecycle', 'Vendor evaluation'],
    tasks: [
      { platform: 'Backend', task: 'E-Procurement API', subtasks: ['EprVendor CRUD','EprProcurementRequest','EprRfq & responses','EprTender & bids','EprContract lifecycle','EprEvaluation scoring','Approval workflows','Analytics endpoints'], sp: 8, wkStart: 40, wkDur: 2 },
      { platform: 'Frontend', task: 'E-Procurement Pages', subtasks: ['E-Procurement dashboard','Vendor registry','Procurement request form','RFQ builder & comparison','Tender management','Contract management','Vendor evaluation scorecards','Analytics & reports'], sp: 8, wkStart: 41, wkDur: 2 },
      { platform: 'Mobile', task: 'Mobile E-Procurement', subtasks: ['Approval from mobile','Vendor lookup','RFQ review & compare'], sp: 3, wkStart: 42, wkDur: 1 },
    ]
  },
  {
    phase: 'Phase 6 - Enterprise', phaseColor: COLORS.phase6,
    module: 'M27 - Export/Import (EXIM)',
    goal: 'Manajemen ekspor-impor: pengiriman, kepabeanan, L/C, dokumen',
    objectives: ['Shipment tracking', 'Customs management', 'Letter of Credit', 'HS code reference', 'Cost tracking'],
    tasks: [
      { platform: 'Backend', task: 'EXIM API', subtasks: ['EximShipment CRUD','EximCustoms model','EximLC (Letter of Credit)','EximContainer tracking','EximDocument management','EximPartner CRUD','EximCost recording','EximHsCode reference','Analytics endpoints'], sp: 8, wkStart: 41, wkDur: 2 },
      { platform: 'Frontend', task: 'EXIM Pages', subtasks: ['EXIM dashboard','Shipment list & detail','Customs management','L/C tracking','Container tracking','Document management','Partner registry','Cost analysis','HS code search','Analytics charts'], sp: 8, wkStart: 42, wkDur: 2 },
      { platform: 'Mobile', task: 'Mobile EXIM', subtasks: ['Shipment status tracker','Document viewer','Cost entry'], sp: 3, wkStart: 43, wkDur: 1 },
    ]
  },

  // PHASE 6 continued - Integrations
  {
    phase: 'Phase 6 - Enterprise', phaseColor: COLORS.phase6,
    module: 'M28 - Reports & Analytics',
    goal: 'Pusat laporan konsolidasi untuk semua modul',
    objectives: ['Sales reports', 'Inventory reports', 'Finance reports', 'HR reports', 'Custom report builder'],
    tasks: [
      { platform: 'Backend', task: 'Report Engine API', subtasks: ['Report query builder','Sales report aggregation','Inventory report aggregation','Finance report aggregation','HR report aggregation','Consolidated multi-branch report','Export to Excel/PDF/CSV','Scheduled report (cron)'], sp: 13, wkStart: 35, wkDur: 3 },
      { platform: 'Frontend', task: 'Report Hub & Pages', subtasks: ['Report hub dashboard','Sales report page','Inventory report page','Finance report page','Customer report page','HR report page','Procurement report page','Custom data analysis tool','Chart & pivot table builder','Export & schedule UI'], sp: 13, wkStart: 36, wkDur: 3 },
      { platform: 'Mobile', task: 'Mobile Reports', subtasks: ['Key metric dashboard','Quick report viewer','Share report via mobile'], sp: 3, wkStart: 38, wkDur: 1 },
    ]
  },
  {
    phase: 'Phase 6 - Enterprise', phaseColor: COLORS.phase6,
    module: 'M29 - WhatsApp Business Integration',
    goal: 'Integrasi WhatsApp untuk broadcast, notifikasi, dan pesan otomatis',
    objectives: ['WA API integration', 'Broadcast messaging', 'Template messages', 'Auto-reply'],
    tasks: [
      { platform: 'Backend', task: 'WhatsApp API Integration', subtasks: ['WA Business API connection','Message template CRUD','Broadcast service','Auto-reply webhook handler','Message log & analytics','Rate limiting'], sp: 8, wkStart: 42, wkDur: 2 },
      { platform: 'Frontend', task: 'WhatsApp Management Pages', subtasks: ['WA dashboard','Template editor','Broadcast builder & scheduler','Message analytics','Settings & connection'], sp: 5, wkStart: 43, wkDur: 2 },
    ]
  },
  {
    phase: 'Phase 6 - Enterprise', phaseColor: COLORS.phase6,
    module: 'M30 - Marketplace Integration',
    goal: 'Integrasi marketplace: sinkronisasi produk dan pesanan multi-channel',
    objectives: ['Tokopedia/Shopee/Lazada integration', 'Product sync', 'Order sync', 'Stock sync'],
    tasks: [
      { platform: 'Backend', task: 'Marketplace API Integration', subtasks: ['Marketplace adapter pattern','Tokopedia API integration','Shopee API integration','Product sync service','Order sync service','Stock sync service','Webhook handlers','Error retry queue'], sp: 13, wkStart: 43, wkDur: 3 },
      { platform: 'Frontend', task: 'Marketplace Pages', subtasks: ['Marketplace dashboard','Channel connection wizard','Product mapping UI','Order list (multi-channel)','Stock sync status','Settings & configuration'], sp: 8, wkStart: 44, wkDur: 2 },
    ]
  },
  {
    phase: 'Phase 6 - Enterprise', phaseColor: COLORS.phase6,
    module: 'M31 - Website Builder',
    goal: 'Pembangun website drag-drop untuk toko online sederhana',
    objectives: ['Page builder', 'Component library', 'Theme system', 'Publish'],
    tasks: [
      { platform: 'Backend', task: 'Website Builder API', subtasks: ['Page model CRUD','Component/section storage','Theme configuration','Publish/unpublish endpoint','Custom domain mapping','SEO metadata'], sp: 5, wkStart: 44, wkDur: 2 },
      { platform: 'Frontend', task: 'Website Builder Editor', subtasks: ['Drag-drop page editor','Component palette','Theme customizer','Preview mode','Publish flow','Page list management'], sp: 8, wkStart: 44, wkDur: 3 },
    ]
  },
  {
    phase: 'Phase 6 - Enterprise', phaseColor: COLORS.phase6,
    module: 'M32 - Knowledge Base',
    goal: 'Basis pengetahuan internal untuk SOP dan dokumentasi',
    objectives: ['Article CRUD', 'Category organization', 'Search', 'Versioning'],
    tasks: [
      { platform: 'Backend', task: 'Knowledge Base API', subtasks: ['Article model CRUD','Category organization','Full-text search','Article versioning','Access control'], sp: 3, wkStart: 45, wkDur: 1 },
      { platform: 'Frontend', task: 'Knowledge Base Pages', subtasks: ['Article list & search','Article editor (rich text)','Category navigation','Version history'], sp: 3, wkStart: 45, wkDur: 1 },
    ]
  },
  {
    phase: 'Phase 6 - Enterprise', phaseColor: COLORS.phase6,
    module: 'M33 - Billing & Subscription (SaaS)',
    goal: 'Sistem billing SaaS: paket, subscription, invoice, payment gateway',
    objectives: ['Package management', 'Subscription lifecycle', 'Invoice generation', 'Payment gateway (Stripe/Midtrans)'],
    tasks: [
      { platform: 'Backend', task: 'Billing API', subtasks: ['SubscriptionPackage CRUD','Subscription model & lifecycle','BillingCycle tracking','Invoice auto-generation','Payment gateway integration (Stripe/Midtrans)','Webhook payment confirmation','Usage-based billing','Downgrade/upgrade logic'], sp: 8, wkStart: 44, wkDur: 2 },
      { platform: 'Frontend', task: 'Billing Pages', subtasks: ['Pricing page','Subscription management','Invoice list & detail','Payment history','Upgrade/downgrade flow','Usage analytics'], sp: 5, wkStart: 45, wkDur: 2 },
    ]
  },
  {
    phase: 'Phase 6 - Enterprise', phaseColor: COLORS.phase6,
    module: 'M34 - Admin Panel (Super Admin)',
    goal: 'Panel admin untuk mengelola semua tenant, modul, dan sistem',
    objectives: ['Tenant management', 'Module management', 'User management', 'System logs', 'Business type config'],
    tasks: [
      { platform: 'Backend', task: 'Admin API', subtasks: ['Tenant list & management','Module activation/deactivation','System user management','Audit log queries','Business type CRUD','System health endpoints','Backup management'], sp: 8, wkStart: 45, wkDur: 2 },
      { platform: 'Frontend', task: 'Admin Panel Pages', subtasks: ['Admin dashboard','Tenant list & detail','Module management','User management','System log viewer','Business type config','System settings'], sp: 8, wkStart: 46, wkDur: 2 },
    ]
  },
  {
    phase: 'Phase 6 - Enterprise', phaseColor: COLORS.phase6,
    module: 'M35 - Notifications & Alerts',
    goal: 'Sistem notifikasi real-time dan alerting',
    objectives: ['In-app notifications', 'Push notifications', 'Email notifications', 'Alert subscriptions'],
    tasks: [
      { platform: 'Backend', task: 'Notification Service', subtasks: ['Notification model','WebSocket/SSE real-time delivery','Push notification (FCM)','Email notification (Nodemailer)','Alert subscription model','Alert trigger engine','Notification preferences'], sp: 8, wkStart: 46, wkDur: 2 },
      { platform: 'Frontend', task: 'Notification UI', subtasks: ['Notification bell & dropdown','Notification center page','Alert subscription settings','Real-time toast notifications'], sp: 3, wkStart: 47, wkDur: 1 },
      { platform: 'Mobile', task: 'Mobile Notifications', subtasks: ['Push notification handler','Notification list screen','Deep linking from notification','Badge count management'], sp: 3, wkStart: 47, wkDur: 1 },
    ]
  },
  {
    phase: 'Phase 6 - Enterprise', phaseColor: COLORS.phase6,
    module: 'M36 - Audit & Security',
    goal: 'Audit trail lengkap dan keamanan sistem',
    objectives: ['Audit logging', 'Security headers', 'Rate limiting', 'Data encryption'],
    tasks: [
      { platform: 'Backend', task: 'Audit & Security Services', subtasks: ['AuditLog model','Audit middleware (auto-log all mutations)','IP tracking','Rate limiting middleware','CORS configuration','Security headers (helmet)','Data encryption at rest','API key management'], sp: 5, wkStart: 46, wkDur: 2 },
      { platform: 'Frontend', task: 'Audit Log Page', subtasks: ['Audit log viewer with filters','User activity timeline','Export audit data'], sp: 3, wkStart: 47, wkDur: 1 },
    ]
  },
];

// ====================================================
// EXCEL GENERATION
// ====================================================
async function generateExcel() {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'Bedagang ERP Team';
  wb.created = new Date();

  // ============ SHEET 1: PROJECT OVERVIEW ============
  const ws1 = wb.addWorksheet('Project Overview', { properties: { tabColor: { argb: COLORS.header } } });
  ws1.columns = [
    { header: '', width: 3 },
    { header: '', width: 40 },
    { header: '', width: 60 },
  ];
  const titleRow = ws1.addRow(['', 'BEDAGANG ERP - FULL DEVELOPMENT PROJECT PLAN', '']);
  titleRow.getCell(2).font = { size: 18, bold: true, color: { argb: COLORS.header } };
  ws1.addRow([]);
  
  const overviewData = [
    ['Project Name', 'Bedagang ERP - Modern Retail Management Platform'],
    ['Version', '1.0.0'],
    ['Platform', 'Web (Next.js) + Mobile (React Native)'],
    ['Backend', 'Node.js + Sequelize + PostgreSQL'],
    ['Frontend', 'Next.js + React + TailwindCSS + shadcn/ui'],
    ['Mobile', 'React Native + Expo'],
    ['Start Date', fmt(PROJECT_START)],
    ['End Date', fmt(addWeeks(PROJECT_START, 48))],
    ['Total Duration', '48 Weeks (~12 Months)'],
    ['Total Modules', '36 Modules'],
    ['', ''],
    ['GOAL', 'Membangun platform ERP retail terintegrasi yang mencakup POS, Inventory, Finance, HRIS, CRM, SFA, Manufacturing, Fleet, dan modul enterprise lainnya untuk mendukung bisnis multi-cabang dengan arsitektur multi-tenant SaaS.'],
    ['', ''],
    ['OBJECTIVES', ''],
    ['1.', 'Menyediakan sistem POS modern dengan dukungan multi-payment dan offline mode'],
    ['2.', 'Inventory management real-time dengan multi-warehouse dan stock opname'],
    ['3.', 'Sistem keuangan lengkap dari Finance Lite hingga Full Accounting'],
    ['4.', 'HRIS komprehensif termasuk payroll, attendance, dan performance management'],
    ['5.', 'CRM & SFA untuk pengelolaan pelanggan dan tenaga penjualan lapangan'],
    ['6.', 'Modul enterprise: Manufacturing, Fleet, TMS, Asset, Project Management'],
    ['7.', 'Integrasi marketplace (Tokopedia, Shopee) dan WhatsApp Business'],
    ['8.', 'Mobile app untuk kasir, sales lapangan, driver, dan karyawan (ESS)'],
    ['9.', 'Multi-tenant SaaS dengan billing dan subscription management'],
    ['10.', 'Website builder untuk toko online sederhana'],
  ];
  
  overviewData.forEach(([label, value]) => {
    const row = ws1.addRow(['', label, value]);
    if (['GOAL', 'OBJECTIVES', 'Project Name'].includes(label)) {
      row.getCell(2).font = { bold: true, size: 12, color: { argb: COLORS.header } };
    } else {
      row.getCell(2).font = { bold: true };
    }
    row.getCell(3).alignment = { wrapText: true };
  });

  // Phase summary
  ws1.addRow([]);
  const phaseTitle = ws1.addRow(['', 'PHASE TIMELINE', '']);
  phaseTitle.getCell(2).font = { bold: true, size: 14, color: { argb: COLORS.header } };
  
  const phases = [
    ['Phase 1 - Foundation', 'Week 1-8', 'Auth, Onboarding, Branch, Settings', '4 modules'],
    ['Phase 2 - Core Commerce', 'Week 7-18', 'Products, POS, Inventory, Purchase Orders', '4 modules'],
    ['Phase 3 - Customer & Engagement', 'Week 15-22', 'Customers, Loyalty, Promo, CRM', '4 modules'],
    ['Phase 4 - Operations', 'Week 19-30', 'Kitchen, Tables, Schedule, HRIS', '4 modules'],
    ['Phase 5 - Finance & Advanced', 'Week 27-38', 'Finance, SFA, Marketing', '4 modules'],
    ['Phase 6 - Enterprise', 'Week 33-48', 'Fleet, TMS, MFG, Asset, PJM, EXIM, Integrations, Admin', '16 modules'],
  ];
  phases.forEach(([name, weeks, scope, count]) => {
    const row = ws1.addRow(['', name, `${weeks} | ${scope} (${count})`]);
    row.getCell(2).font = { bold: true };
    row.getCell(3).alignment = { wrapText: true };
  });

  // ============ SHEET 2: FULL TASK LIST ============
  const ws2 = wb.addWorksheet('Task List (All)', { properties: { tabColor: { argb: COLORS.backend } } });
  const taskHeaders = ['#', 'Phase', 'Module', 'Platform', 'Task', 'Subtasks', 'Story Points', 'Priority', 'Start Week', 'End Week', 'Start Date', 'End Date', 'Duration (weeks)', 'Status', 'User Story'];
  const headerRow2 = ws2.addRow(taskHeaders);
  headerRow2.eachCell((cell) => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.header } };
    cell.font = { bold: true, color: { argb: COLORS.headerFont }, size: 10 };
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    cell.border = { bottom: { style: 'thin' } };
  });
  ws2.columns = [
    { width: 5 }, { width: 25 }, { width: 30 }, { width: 10 },
    { width: 35 }, { width: 60 }, { width: 8 }, { width: 10 },
    { width: 8 }, { width: 8 }, { width: 12 }, { width: 12 },
    { width: 8 }, { width: 12 }, { width: 50 },
  ];

  let taskNum = 0;
  let totalSP = 0;
  const allTasks = [];

  modules.forEach((mod) => {
    mod.tasks.forEach((t) => {
      taskNum++;
      const startDate = addWeeks(PROJECT_START, t.wkStart);
      const endDate = addWeeks(PROJECT_START, t.wkStart + t.wkDur);
      const priority = t.sp >= 13 ? 'Critical' : t.sp >= 8 ? 'High' : t.sp >= 5 ? 'Medium' : 'Low';
      const userStory = `Sebagai ${t.platform === 'Mobile' ? 'pengguna mobile' : t.platform === 'Backend' ? 'sistem' : 'pengguna web'}, saya ingin ${t.task.toLowerCase()} agar dapat mengelola ${mod.module.split(' - ')[1] || mod.module} secara efisien.`;

      const row = ws2.addRow([
        taskNum, mod.phase, mod.module, t.platform, t.task,
        t.subtasks.join('\n'), t.sp, priority,
        t.wkStart + 1, t.wkStart + t.wkDur,
        fmt(startDate), fmt(endDate), t.wkDur, 'To Do', userStory
      ]);

      // Styling
      const platformColor = t.platform === 'Backend' ? COLORS.backend : t.platform === 'Frontend' ? COLORS.frontend : COLORS.mobile;
      row.getCell(4).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: platformColor } };
      row.getCell(4).font = { color: { argb: 'FFFFFFFF' }, bold: true };
      row.getCell(6).alignment = { wrapText: true, vertical: 'top' };
      row.getCell(15).alignment = { wrapText: true, vertical: 'top' };
      if (taskNum % 2 === 0) {
        [1,2,3,5,7,8,9,10,11,12,13,14].forEach(c => {
          row.getCell(c).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.lightGray } };
        });
      }
      row.alignment = { vertical: 'top' };
      totalSP += t.sp;
      allTasks.push({ ...t, phase: mod.phase, module: mod.module, startDate, endDate, taskNum, priority });
    });
  });

  // Auto-filter
  ws2.autoFilter = { from: 'A1', to: `O${taskNum + 1}` };

  // ============ SHEET 3: BACKEND TASKS ============
  createPlatformSheet(wb, 'Backend Tasks', allTasks.filter(t => t.platform === 'Backend'), COLORS.backend);
  
  // ============ SHEET 4: FRONTEND TASKS ============
  createPlatformSheet(wb, 'Frontend Tasks', allTasks.filter(t => t.platform === 'Frontend'), COLORS.frontend);
  
  // ============ SHEET 5: MOBILE TASKS ============
  createPlatformSheet(wb, 'Mobile Tasks', allTasks.filter(t => t.platform === 'Mobile'), COLORS.mobile);

  // ============ SHEET 6: GANTT CHART ============
  const wsGantt = wb.addWorksheet('Gantt Chart', { properties: { tabColor: { argb: 'FFF39C12' } } });
  const totalWeeks = 48;
  
  // Headers
  const ganttHeaderRow1 = ['#', 'Module', 'Task', 'Platform', 'SP', 'Start', 'End'];
  for (let w = 1; w <= totalWeeks; w++) ganttHeaderRow1.push(`W${w}`);
  const gH1 = wsGantt.addRow(ganttHeaderRow1);
  gH1.eachCell((cell, colNumber) => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.header } };
    cell.font = { bold: true, color: { argb: COLORS.headerFont }, size: 8 };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
    cell.border = { bottom: { style: 'thin' } };
  });
  
  // Month headers row
  const monthRow = ['', '', '', '', '', '', ''];
  const monthNames = ['Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar'];
  for (let w = 1; w <= totalWeeks; w++) {
    const d = addWeeks(PROJECT_START, w - 1);
    monthRow.push(monthNames[d.getMonth() >= 3 ? d.getMonth() - 3 : d.getMonth() + 9]);
  }
  const mR = wsGantt.addRow(monthRow);
  mR.eachCell((cell, colNumber) => {
    if (colNumber > 7) {
      cell.font = { size: 7, italic: true };
      cell.alignment = { horizontal: 'center' };
    }
  });

  wsGantt.getColumn(1).width = 4;
  wsGantt.getColumn(2).width = 22;
  wsGantt.getColumn(3).width = 28;
  wsGantt.getColumn(4).width = 8;
  wsGantt.getColumn(5).width = 4;
  wsGantt.getColumn(6).width = 10;
  wsGantt.getColumn(7).width = 10;
  for (let w = 1; w <= totalWeeks; w++) wsGantt.getColumn(7 + w).width = 3;

  allTasks.forEach((t, idx) => {
    const rowData = [t.taskNum, t.module.split(' - ')[1] || t.module, t.task, t.platform, t.sp, fmt(t.startDate), fmt(t.endDate)];
    for (let w = 1; w <= totalWeeks; w++) rowData.push('');
    const row = wsGantt.addRow(rowData);
    row.height = 16;
    
    // Color the Gantt bars
    const ganttColor = t.platform === 'Backend' ? COLORS.ganttBE : t.platform === 'Frontend' ? COLORS.ganttFE : COLORS.ganttMB;
    for (let w = t.wkStart + 1; w <= t.wkStart + t.wkDur; w++) {
      if (w <= totalWeeks) {
        const cell = row.getCell(7 + w);
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: ganttColor } };
        cell.border = { top: { style: 'thin', color: { argb: 'FFFFFFFF' } }, bottom: { style: 'thin', color: { argb: 'FFFFFFFF' } } };
      }
    }
    
    // Platform color
    const platColor = t.platform === 'Backend' ? COLORS.backend : t.platform === 'Frontend' ? COLORS.frontend : COLORS.mobile;
    row.getCell(4).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: platColor } };
    row.getCell(4).font = { color: { argb: 'FFFFFFFF' }, size: 8, bold: true };
    
    // Font size
    row.eachCell((cell) => { if (!cell.font || !cell.font.color) cell.font = { size: 8 }; });
  });

  // ============ SHEET 7: SUMMARY & STATISTICS ============
  const wsSummary = wb.addWorksheet('Summary', { properties: { tabColor: { argb: 'FF27AE60' } } });
  wsSummary.columns = [{ width: 3 }, { width: 30 }, { width: 15 }, { width: 15 }, { width: 15 }, { width: 15 }];
  
  const sumTitle = wsSummary.addRow(['', 'PROJECT SUMMARY & STATISTICS', '', '', '', '']);
  sumTitle.getCell(2).font = { size: 16, bold: true, color: { argb: COLORS.header } };
  wsSummary.addRow([]);

  // Platform stats
  const beTasks = allTasks.filter(t => t.platform === 'Backend');
  const feTasks = allTasks.filter(t => t.platform === 'Frontend');
  const mbTasks = allTasks.filter(t => t.platform === 'Mobile');
  const beSP = beTasks.reduce((s, t) => s + t.sp, 0);
  const feSP = feTasks.reduce((s, t) => s + t.sp, 0);
  const mbSP = mbTasks.reduce((s, t) => s + t.sp, 0);

  const statsHeader = wsSummary.addRow(['', 'Category', 'Tasks', 'Story Points', '% SP', 'Est. Man-days']);
  statsHeader.eachCell((cell, col) => {
    if (col >= 2) {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.header } };
      cell.font = { bold: true, color: { argb: COLORS.headerFont } };
      cell.alignment = { horizontal: 'center' };
    }
  });

  [[`Backend`, beTasks.length, beSP, ((beSP/totalSP)*100).toFixed(1), Math.round(beSP * 1.5)],
   [`Frontend`, feTasks.length, feSP, ((feSP/totalSP)*100).toFixed(1), Math.round(feSP * 1.5)],
   [`Mobile`, mbTasks.length, mbSP, ((mbSP/totalSP)*100).toFixed(1), Math.round(mbSP * 1.5)],
   [`TOTAL`, allTasks.length, totalSP, '100.0', Math.round(totalSP * 1.5)]
  ].forEach(([cat, tasks, sp, pct, md], i) => {
    const row = wsSummary.addRow(['', cat, tasks, sp, `${pct}%`, md]);
    if (cat === 'TOTAL') {
      row.eachCell((cell, col) => { if (col >= 2) cell.font = { bold: true }; });
    }
    const colors = [COLORS.backend, COLORS.frontend, COLORS.mobile, COLORS.header];
    row.getCell(2).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: colors[i] } };
    row.getCell(2).font = { bold: true, color: { argb: COLORS.headerFont } };
  });

  wsSummary.addRow([]);
  wsSummary.addRow([]);
  
  // Module summary
  const modTitle = wsSummary.addRow(['', 'MODULE BREAKDOWN', '', '', '', '']);
  modTitle.getCell(2).font = { size: 14, bold: true, color: { argb: COLORS.header } };
  
  const modHeader = wsSummary.addRow(['', 'Module', 'BE Tasks', 'FE Tasks', 'MB Tasks', 'Total SP']);
  modHeader.eachCell((cell, col) => {
    if (col >= 2) {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.header } };
      cell.font = { bold: true, color: { argb: COLORS.headerFont } };
      cell.alignment = { horizontal: 'center' };
    }
  });

  const moduleMap = {};
  allTasks.forEach(t => {
    if (!moduleMap[t.module]) moduleMap[t.module] = { be: 0, fe: 0, mb: 0, sp: 0 };
    if (t.platform === 'Backend') moduleMap[t.module].be++;
    else if (t.platform === 'Frontend') moduleMap[t.module].fe++;
    else moduleMap[t.module].mb++;
    moduleMap[t.module].sp += t.sp;
  });

  Object.entries(moduleMap).forEach(([mod, stats], i) => {
    const row = wsSummary.addRow(['', mod, stats.be, stats.fe, stats.mb, stats.sp]);
    if (i % 2 === 0) {
      row.eachCell((cell, col) => {
        if (col >= 2) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.lightGray } };
      });
    }
  });

  // Team recommendation
  wsSummary.addRow([]);
  wsSummary.addRow([]);
  const teamTitle = wsSummary.addRow(['', 'TEAM RECOMMENDATION', '', '', '', '']);
  teamTitle.getCell(2).font = { size: 14, bold: true, color: { argb: COLORS.header } };

  [
    ['Backend Developer (Senior)', '2', 'Node.js, PostgreSQL, Sequelize, REST API'],
    ['Backend Developer (Mid)', '2', 'Node.js, Database, API Development'],
    ['Frontend Developer (Senior)', '2', 'Next.js, React, TailwindCSS'],
    ['Frontend Developer (Mid)', '2', 'React, UI/UX Implementation'],
    ['Mobile Developer (Senior)', '1', 'React Native, Expo'],
    ['Mobile Developer (Mid)', '1', 'React Native, Mobile UI'],
    ['UI/UX Designer', '1', 'Figma, User Research, Design System'],
    ['QA Engineer', '2', 'Jest, Cypress, API Testing'],
    ['DevOps Engineer', '1', 'CI/CD, Docker, AWS/GCP'],
    ['Project Manager', '1', 'Agile, Scrum, Stakeholder Management'],
    ['Product Owner', '1', 'Business Analysis, Requirements'],
    ['TOTAL TEAM', '16', ''],
  ].forEach(([role, count, skills]) => {
    const row = wsSummary.addRow(['', role, count, skills, '', '']);
    if (role === 'TOTAL TEAM') row.eachCell((cell, col) => { if (col >= 2) cell.font = { bold: true }; });
  });

  // ============ SHEET 8: SPRINT PLANNING ============
  const wsSprint = wb.addWorksheet('Sprint Planning', { properties: { tabColor: { argb: 'FF8E44AD' } } });
  wsSprint.columns = [{ width: 5 }, { width: 20 }, { width: 12 }, { width: 12 }, { width: 40 }, { width: 15 }, { width: 12 }];
  
  const spTitle = wsSprint.addRow(['', 'SPRINT PLANNING (2-Week Sprints)', '', '', '', '', '']);
  spTitle.getCell(2).font = { size: 16, bold: true, color: { argb: COLORS.header } };
  wsSprint.addRow([]);

  const spHeader = wsSprint.addRow(['#', 'Sprint', 'Start Date', 'End Date', 'Key Deliverables', 'Phase', 'Sprint SP']);
  spHeader.eachCell((cell) => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.header } };
    cell.font = { bold: true, color: { argb: COLORS.headerFont } };
    cell.alignment = { horizontal: 'center', wrapText: true };
  });

  for (let s = 0; s < 24; s++) {
    const sprintStart = addWeeks(PROJECT_START, s * 2);
    const sprintEnd = addWeeks(PROJECT_START, s * 2 + 2);
    const sprintTasks = allTasks.filter(t => t.wkStart >= s * 2 && t.wkStart < s * 2 + 2);
    const sprintSP = sprintTasks.reduce((sum, t) => sum + t.sp, 0);
    const deliverables = [...new Set(sprintTasks.map(t => t.module.split(' - ')[1] || t.module))].join(', ');
    const phase = sprintTasks.length > 0 ? sprintTasks[0].phase : '-';
    
    const row = wsSprint.addRow([s + 1, `Sprint ${s + 1}`, fmt(sprintStart), fmt(sprintEnd), deliverables || 'Buffer / Testing', phase, sprintSP]);
    row.getCell(5).alignment = { wrapText: true };
    if (s % 2 === 0) {
      row.eachCell((cell) => {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.lightGray } };
      });
    }
  }

  // ============ SAVE ============
  const outputPath = path.join(__dirname, '..', 'Bedagang_ERP_Project_Plan.xlsx');
  await wb.xlsx.writeFile(outputPath);
  console.log(`\n✅ Project plan exported to: ${outputPath}`);
  console.log(`📊 Total Tasks: ${allTasks.length}`);
  console.log(`📊 Total Story Points: ${totalSP}`);
  console.log(`📊 Backend: ${beTasks.length} tasks (${beSP} SP)`);
  console.log(`📊 Frontend: ${feTasks.length} tasks (${feSP} SP)`);
  console.log(`📊 Mobile: ${mbTasks.length} tasks (${mbSP} SP)`);
  console.log(`📊 Estimated Man-days: ${Math.round(totalSP * 1.5)}`);
  console.log(`📊 Duration: 48 weeks (24 sprints)`);
}

// Helper: Create platform-specific sheet
function createPlatformSheet(wb, sheetName, tasks, color) {
  const ws = wb.addWorksheet(sheetName, { properties: { tabColor: { argb: color } } });
  const headers = ['#', 'Phase', 'Module', 'Task', 'Subtasks', 'Story Points', 'Priority', 'Start Date', 'End Date', 'Duration', 'User Story'];
  const hRow = ws.addRow(headers);
  hRow.eachCell((cell) => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: color } };
    cell.font = { bold: true, color: { argb: COLORS.headerFont }, size: 10 };
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
  });
  ws.columns = [
    { width: 5 }, { width: 25 }, { width: 30 }, { width: 35 },
    { width: 60 }, { width: 8 }, { width: 10 }, { width: 12 },
    { width: 12 }, { width: 8 }, { width: 50 },
  ];

  tasks.forEach((t, i) => {
    const userStory = `Sebagai ${t.platform === 'Mobile' ? 'pengguna mobile' : t.platform === 'Backend' ? 'sistem' : 'pengguna web'}, saya ingin ${t.task.toLowerCase()} agar dapat mengelola ${t.module.split(' - ')[1] || t.module} secara efisien.`;
    const row = ws.addRow([
      i + 1, t.phase, t.module, t.task,
      t.subtasks.join('\n'), t.sp, t.priority,
      fmt(t.startDate), fmt(t.endDate), `${t.wkDur}w`, userStory
    ]);
    row.getCell(5).alignment = { wrapText: true, vertical: 'top' };
    row.getCell(11).alignment = { wrapText: true, vertical: 'top' };
    if (i % 2 === 0) {
      row.eachCell((cell) => {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.lightGray } };
      });
    }
  });
  
  ws.autoFilter = { from: 'A1', to: `K${tasks.length + 1}` };
}

generateExcel().catch(console.error);
