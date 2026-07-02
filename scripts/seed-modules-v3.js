/**
 * seed-modules-v3.js
 * 
 * Comprehensive module seeder that ensures ALL platform modules exist in the database.
 * Matches HQ MODULE_REGISTRY (home.tsx), sidebar.config.ts ModuleCode, and branch sidebar.
 * 
 * Usage: node scripts/seed-modules-v3.js
 * 
 * Module Tiers:
 *   CORE (always on): dashboard, settings
 *   BASIC (free):     pos, inventory, products, branches, users, customers, employees, reports, finance_lite
 *   PRO (premium):    finance_pro, hris, crm, sfa, marketing, kitchen, tables, reservations, 
 *                     loyalty, promo, supply_chain, audit, integrations, whatsapp_business, marketplace_integration
 *   ENTERPRISE:       fms, tms, manufacturing
 */

require('dotenv').config({ path: '.env.development' });
const sequelize = require('../lib/sequelize');

const MODULES = [
  // ═══════════════ CORE (always on, can't disable) ═══════════════
  {
    code: 'dashboard', name: 'Dashboard', 
    description: 'Dashboard utama dengan overview bisnis, statistik real-time, quick actions, dan monitoring multi-cabang',
    icon: 'LayoutDashboard', route: '/hq/dashboard', category: 'core', pricing_tier: 'basic', setup_complexity: 'simple',
    color: '#3B82F6', is_core: true, sort_order: 1,
    features: JSON.stringify(['Overview bisnis', 'Statistik real-time', 'Notifikasi penting', 'Quick actions', 'Trend penjualan', 'Multi-cabang overview']),
    tags: JSON.stringify(['core', 'free'])
  },
  {
    code: 'settings', name: 'Pengaturan', 
    description: 'Pengaturan umum toko, modul management, integrasi, notifikasi, pajak & biaya, dan konfigurasi sistem',
    icon: 'Settings', route: '/hq/settings', category: 'core', pricing_tier: 'basic', setup_complexity: 'simple',
    color: '#64748B', is_core: true, sort_order: 2,
    features: JSON.stringify(['Pengaturan toko', 'Modul manajemen', 'Notifikasi', 'Backup data', 'Pengaturan pajak', 'Integrasi pihak ketiga']),
    tags: JSON.stringify(['core', 'free'])
  },

  // ═══════════════ BASIC (free, default enabled) ═══════════════
  {
    code: 'pos', name: 'Point of Sale', 
    description: 'Kasir digital modern dengan multi-payment, cetak struk thermal, diskon otomatis, split bill, offline mode, dan barcode scan',
    icon: 'ShoppingCart', route: '/pos', category: 'operations', pricing_tier: 'basic', setup_complexity: 'simple',
    color: '#10B981', is_core: false, sort_order: 10,
    features: JSON.stringify(['Kasir digital', 'Multi payment method', 'Cetak struk thermal', 'Diskon & promo otomatis', 'Split bill', 'Hold & recall order', 'Offline mode', 'Barcode scan']),
    tags: JSON.stringify(['basic', 'free', 'operations'])
  },
  {
    code: 'inventory', name: 'Warehouse & Inventory', 
    description: 'Manajemen stok real-time, multi-gudang, stock opname, transfer stok, purchase order, supplier management, dan alert otomatis',
    icon: 'Package', route: '/hq/inventory', category: 'operations', pricing_tier: 'basic', setup_complexity: 'moderate',
    color: '#F59E0B', is_core: false, sort_order: 11,
    features: JSON.stringify(['Stok real-time', 'Multi-gudang', 'Stock opname', 'Transfer stok', 'Low stock alerts', 'Barcode support', 'Batch tracking', 'Purchase order', 'Supplier management', 'Goods receipt']),
    tags: JSON.stringify(['basic', 'free', 'operations'])
  },
  {
    code: 'products', name: 'Produk & Menu', 
    description: 'Master produk, variant management, kategori produk hierarki, pricing tiers, dan manajemen menu untuk F&B',
    icon: 'Layers', route: '/hq/products', category: 'operations', pricing_tier: 'basic', setup_complexity: 'simple',
    color: '#059669', is_core: false, sort_order: 12,
    features: JSON.stringify(['Master produk', 'Variant management', 'Kategori hierarki', 'Pricing tiers', 'Import/Export CSV', 'Gambar produk', 'SKU generator']),
    tags: JSON.stringify(['basic', 'free', 'operations'])
  },
  {
    code: 'branches', name: 'Manajemen Cabang', 
    description: 'Multi-cabang management, performa cabang, pengaturan per-cabang, real-time sync, dan inisialisasi cabang baru',
    icon: 'Building2', route: '/hq/branches', category: 'operations', pricing_tier: 'basic', setup_complexity: 'moderate',
    color: '#2563EB', is_core: false, sort_order: 13,
    features: JSON.stringify(['Multi-cabang management', 'Performa cabang', 'Transfer antar cabang', 'Pengaturan per-cabang', 'Sync data', 'Inisialisasi cabang']),
    tags: JSON.stringify(['basic', 'free', 'operations'])
  },
  {
    code: 'users', name: 'Pengguna & Akses', 
    description: 'User management, 12 role bawaan, permission control, branch manager assignment, dan activity log per user',
    icon: 'Users', route: '/hq/users', category: 'system', pricing_tier: 'basic', setup_complexity: 'simple',
    color: '#475569', is_core: false, sort_order: 14,
    features: JSON.stringify(['User management', '12 role bawaan', 'Permission control', 'Branch manager assignment', 'Activity log per user']),
    tags: JSON.stringify(['basic', 'free', 'system'])
  },
  {
    code: 'customers', name: 'Pelanggan', 
    description: 'Database pelanggan, riwayat transaksi, segmentasi pelanggan, customer insights, dan export data',
    icon: 'Users', route: '/customers', category: 'crm', pricing_tier: 'basic', setup_complexity: 'simple',
    color: '#8B5CF6', is_core: false, sort_order: 15,
    features: JSON.stringify(['Database pelanggan', 'Riwayat transaksi', 'Segmentasi pelanggan', 'Customer insights', 'Export data']),
    tags: JSON.stringify(['basic', 'free', 'crm'])
  },
  {
    code: 'employees', name: 'Karyawan', 
    description: 'Data karyawan dasar, jadwal & shift, kehadiran sederhana, dan profil karyawan',
    icon: 'UserCheck', route: '/employees', category: 'hr', pricing_tier: 'basic', setup_complexity: 'simple',
    color: '#6366F1', is_core: false, sort_order: 16,
    features: JSON.stringify(['Data karyawan', 'Jadwal & shift', 'Kehadiran dasar', 'Profil karyawan']),
    tags: JSON.stringify(['basic', 'free', 'hr'])
  },
  {
    code: 'reports', name: 'Laporan & Analytics', 
    description: 'Laporan penjualan, stok, keuangan, konsolidasi multi-cabang, dan export PDF/Excel/CSV',
    icon: 'BarChart3', route: '/hq/reports/consolidated', category: 'analytics', pricing_tier: 'basic', setup_complexity: 'simple',
    color: '#0EA5E9', is_core: false, sort_order: 17,
    features: JSON.stringify(['Laporan penjualan', 'Laporan stok', 'Laporan keuangan', 'Konsolidasi multi-cabang', 'Export PDF/Excel/CSV', 'Custom period']),
    tags: JSON.stringify(['basic', 'free', 'analytics'])
  },
  {
    code: 'finance_lite', name: 'Keuangan Lite', 
    description: 'Tampilan transaksi dasar, ringkasan pendapatan harian, rekap penjualan, dan filter per cabang',
    icon: 'Wallet', route: '/hq/finance/transactions', category: 'finance', pricing_tier: 'basic', setup_complexity: 'simple',
    color: '#22C55E', is_core: false, sort_order: 18,
    features: JSON.stringify(['Daftar transaksi', 'Ringkasan pendapatan harian', 'Rekap penjualan', 'Filter per cabang', 'Export CSV']),
    tags: JSON.stringify(['basic', 'free', 'finance'])
  },

  // ═══════════════ PRO (premium, optional) ═══════════════
  {
    code: 'finance_pro', name: 'Keuangan Pro', 
    description: 'Suite keuangan lengkap: P&L, cash flow, AR/AP, budget planning, pajak, invoice, analisis revenue, dan 50+ tipe dokumen',
    icon: 'Wallet', route: '/hq/finance', category: 'finance', pricing_tier: 'professional', setup_complexity: 'complex',
    color: '#16A34A', is_core: false, sort_order: 30,
    features: JSON.stringify(['Laba Rugi (P&L)', 'Arus Kas (Cash Flow)', 'Piutang & Hutang (AR/AP)', 'Budget Planning', 'Manajemen Pajak', 'Invoice & Billing', 'Analisis Revenue', 'E-Document (50+ tipe)', 'Multi-currency']),
    tags: JSON.stringify(['addon', 'pro', 'finance', 'premium'])
  },
  {
    code: 'hris', name: 'HRIS & SDM', 
    description: 'Human Resource Information System lengkap: karyawan, kehadiran, shift, KPI, performance review, cuti, payroll, organisasi, IR, ESS/MSS',
    icon: 'UserCheck', route: '/hq/hris', category: 'hr', pricing_tier: 'professional', setup_complexity: 'complex',
    color: '#7C3AED', is_core: false, sort_order: 31,
    features: JSON.stringify(['Database karyawan lengkap', 'Kehadiran multi-method', 'Manajemen shift & rotasi', 'KPI & Performance', 'Manajemen cuti', 'Payroll', 'Struktur organisasi', 'Industrial Relations', 'ESS/MSS', 'Workforce Analytics', 'Travel & Expense', 'Project Management']),
    tags: JSON.stringify(['addon', 'pro', 'hr', 'premium'])
  },
  {
    code: 'crm', name: 'CRM', 
    description: 'Customer Relationship Management: Customer 360°, kontak, interaksi, komunikasi, tiket & SLA, forecasting, automasi, segmentasi',
    icon: 'Briefcase', route: '/hq/sfa', category: 'sales', pricing_tier: 'professional', setup_complexity: 'complex',
    color: '#EC4899', is_core: false, sort_order: 32,
    features: JSON.stringify(['Customer 360°', 'Kontak management', 'Log interaksi', 'Komunikasi multi-channel', 'Task & Kalender', 'Tiket & SLA', 'Forecasting', 'Automasi', 'Segmentasi', 'Template Email']),
    tags: JSON.stringify(['addon', 'pro', 'sales', 'crm'])
  },
  {
    code: 'sfa', name: 'Sales Force Automation', 
    description: 'Otomasi tim sales: leads & pipeline, tim & territory, kunjungan GPS, order & quotation, target, insentif, display audit, AI workflow',
    icon: 'Target', route: '/hq/sfa', category: 'sales', pricing_tier: 'professional', setup_complexity: 'complex',
    color: '#F472B6', is_core: false, sort_order: 33,
    features: JSON.stringify(['Leads & Pipeline', 'Tim & Territory', 'Kunjungan & GPS', 'Order & Quotation', 'Target & Achievement', 'Insentif & Komisi', 'Display Audit', 'Kompetitor Intelligence', 'Survey', 'AI Workflow', 'Import/Export']),
    tags: JSON.stringify(['addon', 'pro', 'sales', 'sfa'])
  },
  {
    code: 'marketing', name: 'Marketing & Campaign', 
    description: 'Dashboard marketing, campaign multi-channel, promosi, segmentasi pelanggan, dan budget marketing',
    icon: 'Megaphone', route: '/hq/marketing', category: 'sales', pricing_tier: 'professional', setup_complexity: 'moderate',
    color: '#E11D48', is_core: false, sort_order: 34,
    features: JSON.stringify(['Dashboard Marketing', 'Campaign multi-channel', 'Promosi', 'Segmentasi pelanggan', 'Budget marketing', 'ROI analytics']),
    tags: JSON.stringify(['addon', 'pro', 'sales', 'marketing'])
  },
  {
    code: 'kitchen', name: 'Kitchen Display', 
    description: 'Kitchen Display System: order queue real-time, prep time tracking, recipe management, multi-station, prioritas order',
    icon: 'ChefHat', route: '/kitchen', category: 'operations', pricing_tier: 'professional', setup_complexity: 'complex',
    color: '#EF4444', is_core: false, sort_order: 35,
    features: JSON.stringify(['Kitchen Display System', 'Order queue real-time', 'Prep time tracking', 'Recipe management', 'Multi-station', 'Prioritas order']),
    tags: JSON.stringify(['addon', 'pro', 'operations', 'fnb'])
  },
  {
    code: 'tables', name: 'Manajemen Meja', 
    description: 'Layout meja visual, status real-time, gabung/pisah meja, QR order dari meja, dan kapasitas tracking',
    icon: 'Utensils', route: '/tables', category: 'operations', pricing_tier: 'professional', setup_complexity: 'moderate',
    color: '#14B8A6', is_core: false, sort_order: 36,
    features: JSON.stringify(['Layout meja visual', 'Status real-time', 'Gabung/pisah meja', 'QR order', 'Kapasitas tracking']),
    tags: JSON.stringify(['addon', 'pro', 'operations', 'fnb'])
  },
  {
    code: 'reservations', name: 'Reservasi', 
    description: 'Booking online, kalender reservasi, konfirmasi otomatis, waitlist management, dan reminder via WA/SMS',
    icon: 'Calendar', route: '/reservations', category: 'operations', pricing_tier: 'professional', setup_complexity: 'moderate',
    color: '#F97316', is_core: false, sort_order: 37,
    features: JSON.stringify(['Booking online', 'Kalender reservasi', 'Konfirmasi otomatis', 'Waitlist', 'Reminder WA/SMS']),
    tags: JSON.stringify(['addon', 'pro', 'operations', 'fnb'])
  },
  {
    code: 'loyalty', name: 'Program Loyalitas', 
    description: 'Point system, tier membership, rewards catalog, auto promo, referral program, dan birthday rewards',
    icon: 'Award', route: '/loyalty-program', category: 'crm', pricing_tier: 'professional', setup_complexity: 'moderate',
    color: '#EC4899', is_core: false, sort_order: 38,
    features: JSON.stringify(['Point system', 'Tier membership', 'Rewards catalog', 'Auto promo', 'Referral program', 'Birthday rewards']),
    tags: JSON.stringify(['addon', 'pro', 'crm'])
  },
  {
    code: 'promo', name: 'Promo & Voucher', 
    description: 'Buat promo fleksibel, voucher & kupon, bundle deals, jadwal promo otomatis, analitik performa, dan limit usage',
    icon: 'Ticket', route: '/promo-voucher', category: 'marketing', pricing_tier: 'professional', setup_complexity: 'moderate',
    color: '#F43F5E', is_core: false, sort_order: 39,
    features: JSON.stringify(['Promo fleksibel', 'Voucher & kupon', 'Bundle deals', 'Jadwal otomatis', 'Analitik performa', 'Limit usage']),
    tags: JSON.stringify(['addon', 'pro', 'marketing'])
  },
  {
    code: 'supply_chain', name: 'Supply Chain', 
    description: 'Purchase order, internal requisition, supplier management, goods receipt, dan approval workflow',
    icon: 'Truck', route: '/hq/requisitions', category: 'operations', pricing_tier: 'professional', setup_complexity: 'moderate',
    color: '#D97706', is_core: false, sort_order: 40,
    features: JSON.stringify(['Purchase order', 'Internal requisition', 'Supplier management', 'Goods receipt', 'Approval workflow']),
    tags: JSON.stringify(['addon', 'pro', 'operations'])
  },
  {
    code: 'audit', name: 'Audit Log', 
    description: 'Activity log lengkap, security audit, change tracking, filter per user/action, dan export audit trail',
    icon: 'Shield', route: '/hq/audit-logs', category: 'system', pricing_tier: 'professional', setup_complexity: 'simple',
    color: '#78716C', is_core: false, sort_order: 41,
    features: JSON.stringify(['Activity log', 'Security audit', 'Change tracking', 'Filter per user/action', 'Export audit trail']),
    tags: JSON.stringify(['addon', 'pro', 'system', 'security'])
  },
  {
    code: 'integrations', name: 'Integrasi Pihak Ketiga', 
    description: 'API integration, payment gateway (Xendit), delivery partners, accounting sync, dan custom webhooks',
    icon: 'Plug', route: '/hq/settings/integrations', category: 'integration', pricing_tier: 'professional', setup_complexity: 'moderate',
    color: '#4F46E5', is_core: false, sort_order: 42,
    features: JSON.stringify(['Payment gateway', 'Delivery partners', 'Accounting sync', 'API webhooks', 'Custom integration']),
    tags: JSON.stringify(['addon', 'pro', 'integration'])
  },
  {
    code: 'whatsapp_business', name: 'WhatsApp Business', 
    description: 'Integrasi WhatsApp Business API: notifikasi order, broadcast promo, customer service, auto-reply, dan katalog produk',
    icon: 'MessageCircle', route: '/hq/whatsapp', category: 'integration', pricing_tier: 'professional', setup_complexity: 'complex',
    color: '#25D366', is_core: false, sort_order: 43,
    features: JSON.stringify(['Notifikasi order', 'Broadcast promo', 'Customer service', 'Auto-reply', 'Konfirmasi pesanan', 'Reminder pembayaran', 'Status pengiriman', 'Katalog produk']),
    tags: JSON.stringify(['addon', 'pro', 'integration', 'whatsapp'])
  },
  {
    code: 'marketplace_integration', name: 'Marketplace Integration', 
    description: 'Integrasi multi-marketplace: Tokopedia, Shopee, Lazada, Bukalapak — sync produk, order, dan stok otomatis',
    icon: 'Globe', route: '/hq/marketplace', category: 'integration', pricing_tier: 'professional', setup_complexity: 'complex',
    color: '#F97316', is_core: false, sort_order: 44,
    features: JSON.stringify(['Sync Tokopedia', 'Sync Shopee', 'Sync Lazada', 'Sync Bukalapak', 'Auto-sync produk', 'Auto-sync order', 'Auto-update stok', 'Laporan marketplace']),
    tags: JSON.stringify(['addon', 'pro', 'integration', 'marketplace'])
  },

  // ═══════════════ ENTERPRISE ═══════════════
  {
    code: 'fms', name: 'Fleet Management', 
    description: 'Manajemen armada lengkap: kendaraan, driver, maintenance, BBM, rental, inspeksi, GPS live, geofence, analytics, dan biaya',
    icon: 'Truck', route: '/hq/fms', category: 'operations', pricing_tier: 'enterprise', setup_complexity: 'complex',
    color: '#DC2626', is_core: false, sort_order: 50,
    features: JSON.stringify(['Kendaraan', 'Driver', 'Maintenance', 'BBM', 'Rental', 'Inspeksi', 'Insiden', 'GPS Live', 'Geofence', 'Fleet Analytics', 'Ban', 'Biaya', 'Dokumen', 'Reminder']),
    tags: JSON.stringify(['addon', 'enterprise', 'operations', 'logistics'])
  },
  {
    code: 'fleet', name: 'Fleet Management (Legacy)', 
    description: 'Alias untuk modul FMS — Fleet Management System. Gunakan kode "fms" untuk fitur terbaru.',
    icon: 'Truck', route: '/hq/fms', category: 'operations', pricing_tier: 'enterprise', setup_complexity: 'complex',
    color: '#DC2626', is_core: false, sort_order: 51,
    features: JSON.stringify(['Legacy alias untuk FMS']),
    tags: JSON.stringify(['addon', 'enterprise', 'legacy', 'alias'])
  },
  {
    code: 'tms', name: 'Transportation Management', 
    description: 'Manajemen pengiriman end-to-end: shipment, trip, dispatch, tracking, carrier, rute, KPI, SLA, billing, zona, tarif, gudang',
    icon: 'Send', route: '/hq/tms', category: 'operations', pricing_tier: 'enterprise', setup_complexity: 'complex',
    color: '#65A30D', is_core: false, sort_order: 52,
    features: JSON.stringify(['Shipment', 'Trip', 'Dispatch', 'Live Tracking', 'Carrier', 'Rute', 'Logistics KPI', 'Carrier Score', 'Delivery SLA', 'Billing', 'Zona', 'Rate Card', 'Gudang']),
    tags: JSON.stringify(['addon', 'enterprise', 'operations', 'logistics'])
  },
  {
    code: 'manufacturing', name: 'Manufacturing', 
    description: 'Modul produksi: work orders, BOM, routing, work centers, mesin, quality control, planning, OEE analytics, costing, waste tracking',
    icon: 'Factory', route: '/hq/manufacturing', category: 'operations', pricing_tier: 'enterprise', setup_complexity: 'complex',
    color: '#B45309', is_core: false, sort_order: 53,
    features: JSON.stringify(['Work Orders', 'Bill of Materials', 'Routing', 'Work Centers', 'Mesin & Equipment', 'Quality Control', 'Production Planning', 'OEE Analytics', 'Production Costing', 'Waste & Scrap']),
    tags: JSON.stringify(['addon', 'enterprise', 'operations', 'manufacturing'])
  },
];

const DEPENDENCIES = [
  // Finance Pro depends on Reports
  ['finance_pro', 'reports', 'required'],
  ['finance_pro', 'finance_lite', 'optional'],
  // HRIS depends on Employees
  ['hris', 'employees', 'required'],
  // CRM depends on Customers
  ['crm', 'customers', 'required'],
  // SFA depends on CRM
  ['sfa', 'crm', 'required'],
  // Marketing depends on CRM
  ['marketing', 'crm', 'recommended'],
  // Kitchen depends on POS
  ['kitchen', 'pos', 'required'],
  // Tables depends on POS
  ['tables', 'pos', 'required'],
  // Reservations depends on Tables
  ['reservations', 'tables', 'required'],
  // Loyalty depends on Customers
  ['loyalty', 'customers', 'required'],
  // Promo recommends Loyalty
  ['promo', 'loyalty', 'recommended'],
  // Supply Chain depends on Inventory
  ['supply_chain', 'inventory', 'required'],
  // Fleet/FMS depends on Branches
  ['fms', 'branches', 'required'],
  ['fleet', 'fms', 'optional'],
  // TMS depends on FMS
  ['tms', 'fms', 'recommended'],
  ['tms', 'branches', 'required'],
  // Manufacturing depends on Inventory + Products
  ['manufacturing', 'inventory', 'required'],
  ['manufacturing', 'products', 'required'],
  // WhatsApp recommends Customers
  ['whatsapp_business', 'customers', 'recommended'],
  // Marketplace needs Inventory + Products
  ['marketplace_integration', 'inventory', 'required'],
  ['marketplace_integration', 'products', 'required'],
];

async function run() {
  try {
    console.log('=== BEDAGANG MODULE SEED v3 ===\n');
    
    await sequelize.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');

    // Ensure tables exist
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS modules (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        code VARCHAR(50) UNIQUE NOT NULL,
        name VARCHAR(100) NOT NULL,
        description TEXT,
        icon VARCHAR(50),
        route VARCHAR(100),
        parent_module_id UUID REFERENCES modules(id),
        sort_order INTEGER DEFAULT 0,
        is_core BOOLEAN DEFAULT false,
        is_active BOOLEAN DEFAULT true,
        category VARCHAR(50) DEFAULT 'operations',
        features JSONB DEFAULT '[]',
        pricing_tier VARCHAR(20) DEFAULT 'basic',
        setup_complexity VARCHAR(20) DEFAULT 'simple',
        color VARCHAR(20) DEFAULT '#3B82F6',
        preview_image VARCHAR(500),
        version VARCHAR(20) DEFAULT '1.0.0',
        tags JSONB DEFAULT '[]',
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS module_dependencies (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        module_id UUID NOT NULL REFERENCES modules(id) ON DELETE CASCADE,
        depends_on_module_id UUID NOT NULL REFERENCES modules(id) ON DELETE CASCADE,
        dependency_type VARCHAR(20) DEFAULT 'required',
        created_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(module_id, depends_on_module_id)
      );
    `);

    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS business_type_modules (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        business_type_id UUID NOT NULL,
        module_id UUID NOT NULL REFERENCES modules(id) ON DELETE CASCADE,
        is_default BOOLEAN DEFAULT true,
        is_optional BOOLEAN DEFAULT false,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(business_type_id, module_id)
      );
    `);

    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS tenant_modules (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        tenant_id UUID NOT NULL,
        module_id UUID NOT NULL REFERENCES modules(id) ON DELETE CASCADE,
        is_enabled BOOLEAN DEFAULT true,
        enabled_at TIMESTAMPTZ DEFAULT NOW(),
        disabled_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(tenant_id, module_id)
      );
    `);

    // Ensure indexes
    await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_modules_code ON modules(code);`);
    await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_modules_category ON modules(category);`);
    await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_modules_pricing_tier ON modules(pricing_tier);`);
    await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_modules_is_active ON modules(is_active);`);
    await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_modules_sort_order ON modules(sort_order);`);
    await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_tenant_modules_tenant_id ON tenant_modules(tenant_id);`);
    await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_tenant_modules_module_id ON tenant_modules(module_id);`);
    await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_tenant_modules_enabled ON tenant_modules(is_enabled);`).catch(() => {
      console.log('  ⚠ idx_tenant_modules_enabled skipped (column may not exist)');
    });
    await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_btm_business_type ON business_type_modules(business_type_id);`);
    await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_btm_module ON business_type_modules(module_id);`);

    console.log('✓ Tables and indexes verified\n');

    // UPSERT modules (insert or update)
    let inserted = 0;
    let updated = 0;
    for (const m of MODULES) {
      const [existing] = await sequelize.query(
        `SELECT id FROM modules WHERE code = :code`, 
        { replacements: { code: m.code } }
      );

      if (existing.length > 0) {
        await sequelize.query(`
          UPDATE modules SET 
            name = :name, description = :description, icon = :icon, route = :route,
            category = :category, pricing_tier = :pricing_tier, setup_complexity = :setup_complexity,
            color = :color, is_core = :is_core, sort_order = :sort_order,
            features = :features::jsonb, tags = :tags::jsonb, 
            version = '1.0.0', updated_at = NOW()
          WHERE code = :code
        `, { replacements: m });
        updated++;
      } else {
        await sequelize.query(`
          INSERT INTO modules (id, code, name, description, icon, route, category, pricing_tier, setup_complexity, color, is_core, sort_order, features, tags, version, is_active, created_at, updated_at)
          VALUES (uuid_generate_v4(), :code, :name, :description, :icon, :route, :category, :pricing_tier, :setup_complexity, :color, :is_core, :sort_order, :features::jsonb, :tags::jsonb, '1.0.0', true, NOW(), NOW())
        `, { replacements: m });
        inserted++;
      }
    }
    console.log(`✓ Modules: ${inserted} inserted, ${updated} updated (total: ${MODULES.length})\n`);

    // Clear and re-insert dependencies
    await sequelize.query('DELETE FROM module_dependencies');
    let depCount = 0;
    for (const [mod, dep, type] of DEPENDENCIES) {
      try {
        await sequelize.query(`
          INSERT INTO module_dependencies (id, module_id, depends_on_module_id, dependency_type, created_at)
          SELECT uuid_generate_v4(), m1.id, m2.id, :type, NOW()
          FROM modules m1, modules m2
          WHERE m1.code = :mod AND m2.code = :dep
          ON CONFLICT (module_id, depends_on_module_id) DO UPDATE SET dependency_type = :type
        `, { replacements: { mod, dep, type } });
        depCount++;
      } catch (e) {
        console.warn(`  ⚠ Dependency ${mod} → ${dep}: ${e.message}`);
      }
    }
    console.log(`✓ Dependencies: ${depCount} upserted\n`);

    // Auto-assign modules to existing business types
    const [businessTypes] = await sequelize.query(`SELECT id, code, name FROM business_types ORDER BY code`);
    if (businessTypes.length > 0) {
      const [allModules] = await sequelize.query(`SELECT id, code, pricing_tier, is_core FROM modules`);
      const moduleMap = {};
      allModules.forEach(m => moduleMap[m.code] = m);

      // Define which modules are default per business type
      const BUSINESS_TYPE_MODULES = {
        fnb: ['dashboard','settings','pos','inventory','products','branches','users','customers','employees','reports','finance_lite','kitchen','tables','reservations','loyalty','promo'],
        retail: ['dashboard','settings','pos','inventory','products','branches','users','customers','employees','reports','finance_lite','loyalty','promo'],
        fashion: ['dashboard','settings','pos','inventory','products','branches','users','customers','employees','reports','finance_lite','loyalty','promo'],
        beauty: ['dashboard','settings','pos','inventory','products','branches','users','customers','employees','reports','finance_lite','loyalty','promo','reservations'],
        grocery: ['dashboard','settings','pos','inventory','products','branches','users','customers','employees','reports','finance_lite'],
        pharmacy: ['dashboard','settings','pos','inventory','products','branches','users','customers','employees','reports','finance_lite'],
        electronics: ['dashboard','settings','pos','inventory','products','branches','users','customers','employees','reports','finance_lite','supply_chain'],
        automotive: ['dashboard','settings','pos','inventory','products','branches','users','customers','employees','reports','finance_lite','supply_chain','fms'],
        services: ['dashboard','settings','pos','inventory','products','branches','users','customers','employees','reports','finance_lite','reservations'],
        other: ['dashboard','settings','pos','inventory','products','branches','users','customers','employees','reports','finance_lite'],
      };

      let btmCount = 0;
      for (const bt of businessTypes) {
        const defaultModules = BUSINESS_TYPE_MODULES[bt.code] || BUSINESS_TYPE_MODULES['other'];
        for (const modCode of defaultModules) {
          const mod = moduleMap[modCode];
          if (!mod) continue;
          try {
            await sequelize.query(`
              INSERT INTO business_type_modules (id, business_type_id, module_id, is_default, is_optional, created_at)
              VALUES (uuid_generate_v4(), :btId, :modId, true, false, NOW())
              ON CONFLICT (business_type_id, module_id) DO NOTHING
            `, { replacements: { btId: bt.id, modId: mod.id } });
            btmCount++;
          } catch (e) { /* skip duplicates */ }
        }
        // Also add optional pro modules
        const optionalModules = ['finance_pro', 'hris', 'crm', 'sfa', 'marketing', 'audit', 'whatsapp_business', 'marketplace_integration'];
        for (const modCode of optionalModules) {
          const mod = moduleMap[modCode];
          if (!mod || defaultModules.includes(modCode)) continue;
          try {
            await sequelize.query(`
              INSERT INTO business_type_modules (id, business_type_id, module_id, is_default, is_optional, created_at)
              VALUES (uuid_generate_v4(), :btId, :modId, false, true, NOW())
              ON CONFLICT (business_type_id, module_id) DO NOTHING
            `, { replacements: { btId: bt.id, modId: mod.id } });
            btmCount++;
          } catch (e) { /* skip duplicates */ }
        }
      }
      console.log(`✓ Business type module mappings: ${btmCount} (${businessTypes.length} business types)\n`);
    } else {
      console.log('⚠ No business types found — skipping business_type_modules\n');
    }

    // Auto-assign modules to existing tenants
    const [tenants] = await sequelize.query(`SELECT id, name FROM tenants LIMIT 100`);
    if (tenants.length > 0) {
      const [coreAndBasic] = await sequelize.query(
        `SELECT id, code FROM modules WHERE is_core = true OR pricing_tier = 'basic' ORDER BY sort_order`
      );
      let tmCount = 0;
      for (const tenant of tenants) {
        for (const mod of coreAndBasic) {
          try {
            await sequelize.query(`
              INSERT INTO tenant_modules (id, tenant_id, module_id, is_enabled, enabled_at, created_at)
              VALUES (uuid_generate_v4(), :tenantId, :modId, true, NOW(), NOW())
              ON CONFLICT (tenant_id, module_id) DO NOTHING
            `, { replacements: { tenantId: tenant.id, modId: mod.id } });
            tmCount++;
          } catch (e) { /* skip */ }
        }
      }
      console.log(`✓ Tenant module assignments: ${tmCount} (${tenants.length} tenants × ${coreAndBasic.length} basic modules)\n`);
    }

    // Final verification
    const [result] = await sequelize.query(`
      SELECT m.code, m.name, m.pricing_tier, m.is_core, m.category, m.is_active,
             COUNT(DISTINCT md.id) as dep_count,
             COUNT(DISTINCT btm.id) as bt_count
      FROM modules m
      LEFT JOIN module_dependencies md ON md.module_id = m.id
      LEFT JOIN business_type_modules btm ON btm.module_id = m.id
      GROUP BY m.id ORDER BY m.sort_order
    `);

    console.log('╔══════════════════════════════════════════════════════════════════════════╗');
    console.log('║                          MODULE CATALOG                                  ║');
    console.log('╠══════════════════════════════════════════════════════════════════════════╣');
    console.log('║ Code                   │ Name                    │ Tier     │ Cat      │B│D║');
    console.log('╠══════════════════════════════════════════════════════════════════════════╣');
    result.forEach(r => {
      const tier = r.is_core ? 'CORE' : r.pricing_tier.toUpperCase().substring(0, 8);
      const code = r.code.padEnd(22);
      const name = r.name.substring(0, 23).padEnd(23);
      const cat = r.category.substring(0, 8).padEnd(8);
      console.log(`║ ${code} │ ${name} │ ${tier.padEnd(8)} │ ${cat} │${r.bt_count}│${r.dep_count}║`);
    });
    console.log('╚══════════════════════════════════════════════════════════════════════════╝');
    console.log(`\nB=BusinessTypes  D=Dependencies`);
    console.log(`\nTotal: ${result.length} modules`);
    console.log('\n=== SEED COMPLETE ===');
    
    await sequelize.close();
    process.exit(0);
  } catch (error) {
    console.error('\n✗ Seed failed:', error.message);
    console.error(error.stack);
    await sequelize.close();
    process.exit(1);
  }
}

run();
