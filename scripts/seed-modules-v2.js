require('dotenv').config({ path: '.env.development' });
const sequelize = require('../lib/sequelize');

/**
 * Module Tiering:
 * 
 * BASIC (included free):
 *   - dashboard, pos, inventory, products, branches, users, settings, reports
 *   - finance_lite (basic transaction view only)
 * 
 * ADD-ON / PRO (premium):
 *   - finance_pro (full accounting suite)
 *   - hris (HR management)
 *   - kitchen (KDS)
 *   - tables, reservations
 *   - loyalty, promo
 *   - supply_chain
 *   - fleet
 *   - whatsapp_business
 *   - marketplace_integration
 *   - audit
 */

const MODULES = [
  // ============ CORE (always on, can't disable) ============
  {
    code: 'dashboard', name: 'Dashboard', description: 'Dashboard utama dengan overview bisnis, statistik real-time, dan quick actions',
    icon: 'LayoutDashboard', route: '/dashboard', category: 'core', pricing_tier: 'basic', setup_complexity: 'simple',
    color: '#3B82F6', is_core: true, sort_order: 1,
    features: '["Overview bisnis","Statistik real-time","Notifikasi penting","Quick actions","Trend penjualan"]',
    tags: '["core","free"]'
  },
  {
    code: 'settings', name: 'Pengaturan', description: 'Pengaturan umum toko, modul, integrasi, notifikasi, dan konfigurasi sistem',
    icon: 'Settings', route: '/settings', category: 'core', pricing_tier: 'basic', setup_complexity: 'simple',
    color: '#64748B', is_core: true, sort_order: 2,
    features: '["Pengaturan toko","Modul manajemen","Notifikasi","Backup data","Pengaturan pajak"]',
    tags: '["core","free"]'
  },

  // ============ BASIC (free, default enabled) ============
  {
    code: 'pos', name: 'Point of Sale', description: 'Kasir digital dengan multi-payment, cetak struk, diskon otomatis, dan split bill',
    icon: 'ShoppingCart', route: '/pos', category: 'operations', pricing_tier: 'basic', setup_complexity: 'simple',
    color: '#10B981', is_core: false, sort_order: 10,
    features: '["Kasir digital","Multi payment method","Cetak struk thermal","Diskon & promo otomatis","Split bill","Hold & recall order"]',
    tags: '["basic","free","operations"]'
  },
  {
    code: 'inventory', name: 'Inventory', description: 'Manajemen stok real-time, multi-gudang, stock opname, transfer stok, dan alert otomatis',
    icon: 'Package', route: '/inventory', category: 'operations', pricing_tier: 'basic', setup_complexity: 'moderate',
    color: '#F59E0B', is_core: false, sort_order: 11,
    features: '["Stok real-time","Multi-gudang","Stock opname","Transfer stok","Low stock alerts","Barcode support","Batch tracking"]',
    tags: '["basic","free","operations"]'
  },
  {
    code: 'products', name: 'Produk & Menu', description: 'Master produk, variant, kategori, pricing tiers, dan manajemen menu',
    icon: 'Layers', route: '/products', category: 'operations', pricing_tier: 'basic', setup_complexity: 'simple',
    color: '#059669', is_core: false, sort_order: 12,
    features: '["Master produk","Variant management","Kategori produk","Pricing tiers","Import/Export CSV"]',
    tags: '["basic","free","operations"]'
  },
  {
    code: 'branches', name: 'Manajemen Cabang', description: 'Multi-cabang management, performa cabang, pengaturan per-cabang',
    icon: 'Building2', route: '/hq/branches', category: 'operations', pricing_tier: 'basic', setup_complexity: 'moderate',
    color: '#2563EB', is_core: false, sort_order: 13,
    features: '["Multi-cabang management","Performa cabang","Transfer antar cabang","Pengaturan per-cabang","Sync data"]',
    tags: '["basic","free","operations"]'
  },
  {
    code: 'users', name: 'Pengguna & Akses', description: 'User management, role & permission, branch manager assignment',
    icon: 'Users', route: '/hq/users', category: 'system', pricing_tier: 'basic', setup_complexity: 'simple',
    color: '#475569', is_core: false, sort_order: 14,
    features: '["User management","Role & permission","Branch manager assignment","Activity log per user"]',
    tags: '["basic","free","system"]'
  },
  {
    code: 'customers', name: 'Pelanggan', description: 'Database pelanggan, riwayat transaksi, segmentasi, dan customer insights',
    icon: 'Users', route: '/customers', category: 'crm', pricing_tier: 'basic', setup_complexity: 'simple',
    color: '#8B5CF6', is_core: false, sort_order: 15,
    features: '["Database pelanggan","Riwayat transaksi","Segmentasi pelanggan","Customer insights","Export data"]',
    tags: '["basic","free","crm"]'
  },
  {
    code: 'employees', name: 'Karyawan', description: 'Data karyawan, jadwal & shift, kehadiran dasar',
    icon: 'UserCheck', route: '/employees', category: 'hr', pricing_tier: 'basic', setup_complexity: 'simple',
    color: '#6366F1', is_core: false, sort_order: 16,
    features: '["Data karyawan","Jadwal & shift","Kehadiran dasar","Profil karyawan"]',
    tags: '["basic","free","hr"]'
  },
  {
    code: 'reports', name: 'Laporan', description: 'Laporan penjualan, stok, keuangan dasar, dan export PDF/Excel',
    icon: 'BarChart3', route: '/reports', category: 'analytics', pricing_tier: 'basic', setup_complexity: 'simple',
    color: '#0EA5E9', is_core: false, sort_order: 17,
    features: '["Laporan penjualan","Laporan stok","Laporan keuangan dasar","Konsolidasi multi-cabang","Export PDF/Excel"]',
    tags: '["basic","free","analytics"]'
  },
  {
    code: 'finance_lite', name: 'Keuangan Lite', description: 'Tampilan transaksi dasar, ringkasan pendapatan harian, dan rekap sederhana',
    icon: 'Wallet', route: '/finance', category: 'finance', pricing_tier: 'basic', setup_complexity: 'simple',
    color: '#22C55E', is_core: false, sort_order: 18,
    features: '["Daftar transaksi","Ringkasan pendapatan harian","Rekap penjualan","Filter per cabang","Export CSV sederhana"]',
    tags: '["basic","free","finance"]'
  },

  // ============ ADD-ON / PRO (premium, optional) ============
  {
    code: 'finance_pro', name: 'Keuangan Pro', description: 'Suite keuangan lengkap: laba rugi, arus kas, piutang/hutang, budget planning, pajak, invoice',
    icon: 'Wallet', route: '/hq/finance', category: 'finance', pricing_tier: 'professional', setup_complexity: 'complex',
    color: '#16A34A', is_core: false, sort_order: 30,
    features: '["Laba Rugi (P&L)","Arus Kas (Cash Flow)","Piutang & Hutang","Budget Planning","Manajemen Pajak","Invoice & Billing","Analisis Revenue","Rekonsiliasi Bank","Multi-currency"]',
    tags: '["addon","pro","finance","premium"]'
  },
  {
    code: 'hris', name: 'HRIS', description: 'Human Resource Information System: KPI, performance review, attendance management, cuti, payroll-ready',
    icon: 'UserCheck', route: '/hq/hris', category: 'hr', pricing_tier: 'professional', setup_complexity: 'complex',
    color: '#7C3AED', is_core: false, sort_order: 31,
    features: '["KPI karyawan","Performance review","Attendance management","Manajemen cuti","Scoring & formula engine","Export laporan HR","Payroll-ready data","Device absensi"]',
    tags: '["addon","pro","hr","premium"]'
  },
  {
    code: 'whatsapp_business', name: 'WhatsApp Business', description: 'Integrasi WhatsApp Business API: notifikasi order, broadcast promo, customer service, dan auto-reply',
    icon: 'MessageCircle', route: '/hq/settings/whatsapp', category: 'integration', pricing_tier: 'professional', setup_complexity: 'complex',
    color: '#25D366', is_core: false, sort_order: 32,
    features: '["Notifikasi order otomatis","Broadcast promo","Customer service chat","Auto-reply template","Konfirmasi pesanan via WA","Reminder pembayaran","Status pengiriman","Katalog produk WA"]',
    tags: '["addon","pro","integration","whatsapp","premium"]'
  },
  {
    code: 'marketplace_integration', name: 'Marketplace Integration', description: 'Integrasi multi-marketplace: Tokopedia, Shopee, Lazada, Bukalapak — sync produk, order, dan stok otomatis',
    icon: 'Globe', route: '/hq/settings/marketplace', category: 'integration', pricing_tier: 'professional', setup_complexity: 'complex',
    color: '#F97316', is_core: false, sort_order: 33,
    features: '["Sync Tokopedia","Sync Shopee","Sync Lazada","Sync Bukalapak","Auto-sync produk & harga","Auto-sync order","Auto-update stok","Laporan penjualan marketplace","Manajemen multi-toko"]',
    tags: '["addon","pro","integration","marketplace","premium"]'
  },
  {
    code: 'kitchen', name: 'Kitchen Display', description: 'Kitchen Display System: order queue, prep time tracking, recipe management',
    icon: 'ChefHat', route: '/kitchen', category: 'operations', pricing_tier: 'professional', setup_complexity: 'complex',
    color: '#EF4444', is_core: false, sort_order: 34,
    features: '["Kitchen Display System","Order queue real-time","Prep time tracking","Recipe management","Multi-station","Prioritas order"]',
    tags: '["addon","pro","operations","fnb"]'
  },
  {
    code: 'tables', name: 'Manajemen Meja', description: 'Layout meja, status real-time, gabung/pisah meja, QR order',
    icon: 'Utensils', route: '/tables', category: 'operations', pricing_tier: 'professional', setup_complexity: 'moderate',
    color: '#14B8A6', is_core: false, sort_order: 35,
    features: '["Layout meja visual","Status real-time","Gabung/pisah meja","QR order dari meja","Kapasitas tracking"]',
    tags: '["addon","pro","operations","fnb"]'
  },
  {
    code: 'reservations', name: 'Reservasi', description: 'Booking online, kalender reservasi, konfirmasi otomatis, waitlist',
    icon: 'Calendar', route: '/reservations', category: 'operations', pricing_tier: 'professional', setup_complexity: 'moderate',
    color: '#F97316', is_core: false, sort_order: 36,
    features: '["Booking online","Kalender reservasi","Konfirmasi otomatis","Waitlist management","Reminder via WA/SMS"]',
    tags: '["addon","pro","operations","fnb"]'
  },
  {
    code: 'loyalty', name: 'Program Loyalitas', description: 'Point system, tier membership, rewards catalog, auto promo',
    icon: 'Award', route: '/loyalty-program', category: 'crm', pricing_tier: 'professional', setup_complexity: 'moderate',
    color: '#EC4899', is_core: false, sort_order: 37,
    features: '["Point system","Tier membership","Rewards catalog","Auto promo","Referral program","Birthday rewards"]',
    tags: '["addon","pro","crm"]'
  },
  {
    code: 'promo', name: 'Promo & Voucher', description: 'Buat promo, voucher & kupon, bundle deals, jadwal promo, analitik promo',
    icon: 'Ticket', route: '/promo-voucher', category: 'marketing', pricing_tier: 'professional', setup_complexity: 'moderate',
    color: '#F43F5E', is_core: false, sort_order: 38,
    features: '["Buat promo fleksibel","Voucher & kupon","Bundle deals","Jadwal promo otomatis","Analitik performa promo","Limit usage"]',
    tags: '["addon","pro","marketing"]'
  },
  {
    code: 'supply_chain', name: 'Supply Chain', description: 'Purchase order, internal requisition, supplier management, goods receipt',
    icon: 'Truck', route: '/hq/requisitions', category: 'operations', pricing_tier: 'professional', setup_complexity: 'moderate',
    color: '#D97706', is_core: false, sort_order: 39,
    features: '["Purchase order","Internal requisition","Supplier management","Goods receipt","Approval workflow"]',
    tags: '["addon","pro","operations"]'
  },
  {
    code: 'fleet', name: 'Fleet Management', description: 'Fleet overview, GPS tracking, route management, fuel management, maintenance, cost reporting',
    icon: 'Truck', route: '/hq/fleet', category: 'operations', pricing_tier: 'enterprise', setup_complexity: 'complex',
    color: '#DC2626', is_core: false, sort_order: 40,
    features: '["Fleet overview","GPS tracking","Route management","Fuel management","Maintenance schedule","Cost reporting","Driver management"]',
    tags: '["addon","enterprise","operations","logistics"]'
  },
  {
    code: 'asset_management', name: 'Asset Management', description: 'Registrasi aset, lifecycle tracking, penyusutan, pemeliharaan, dan manajemen industri (Manufacturing, Property, IT/Office)',
    icon: 'HardHat', route: '/hq/assets', category: 'operations', pricing_tier: 'professional', setup_complexity: 'complex',
    color: '#6366F1', is_core: false, sort_order: 43,
    features: '["Registrasi aset","Kategori & EAV dinamis","Penyusutan otomatis (4 metode)","Mutasi & transfer","Serah terima aset","Preventive maintenance","Work orders","OEE tracking","Lisensi software","Manajemen penyewaan","Integrasi keuangan","Integrasi HR","Alert otomatis","Barcode/QR/RFID"]',
    tags: '["addon","pro","operations","asset","depreciation","maintenance"]'
  },
  {
    code: 'audit', name: 'Audit Log', description: 'Activity log, security audit, change tracking',
    icon: 'Shield', route: '/hq/audit-logs', category: 'system', pricing_tier: 'professional', setup_complexity: 'simple',
    color: '#78716C', is_core: false, sort_order: 41,
    features: '["Activity log lengkap","Security audit","Change tracking","Filter per user/action","Export audit trail"]',
    tags: '["addon","pro","system","security"]'
  },
  {
    code: 'integrations', name: 'Integrasi Pihak Ketiga', description: 'API integration, payment gateway, delivery partners, accounting sync',
    icon: 'Plug', route: '/hq/settings/integrations', category: 'integration', pricing_tier: 'professional', setup_complexity: 'moderate',
    color: '#4F46E5', is_core: false, sort_order: 42,
    features: '["Payment gateway","Delivery partners","Accounting sync","API webhooks","Custom integration"]',
    tags: '["addon","pro","integration"]'
  },
];

const DEPENDENCIES = [
  // Finance Pro depends on Reports
  ['finance_pro', 'reports', 'required'],
  // Finance Pro replaces Finance Lite (mutual exclusion handled in UI)
  ['finance_pro', 'finance_lite', 'optional'],
  // HRIS depends on Employees
  ['hris', 'employees', 'required'],
  // Kitchen depends on POS
  ['kitchen', 'pos', 'required'],
  // Tables depends on POS
  ['tables', 'pos', 'required'],
  // Reservations depends on Tables
  ['reservations', 'tables', 'required'],
  // Loyalty depends on Customers
  ['loyalty', 'customers', 'required'],
  // Supply Chain depends on Inventory
  ['supply_chain', 'inventory', 'required'],
  // Promo recommends Loyalty
  ['promo', 'loyalty', 'recommended'],
  // Fleet depends on Branches
  ['fleet', 'branches', 'required'],
  // WhatsApp recommends Customers
  ['whatsapp_business', 'customers', 'recommended'],
  // Marketplace needs Inventory + Products
  ['marketplace_integration', 'inventory', 'required'],
  ['marketplace_integration', 'products', 'required'],
  // Asset Management optionally integrates with Finance Pro and HRIS
  ['asset_management', 'finance_pro', 'optional'],
  ['asset_management', 'hris', 'recommended'],
];

async function run() {
  try {
    await sequelize.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');

    // Clear existing modules
    await sequelize.query('DELETE FROM module_dependencies');
    await sequelize.query('DELETE FROM tenant_modules');
    await sequelize.query('DELETE FROM business_type_modules');
    await sequelize.query('DELETE FROM modules');
    console.log('Cleared existing module data');

    // Insert all modules
    for (const m of MODULES) {
      await sequelize.query(`
        INSERT INTO modules (id, code, name, description, icon, route, category, pricing_tier, setup_complexity, color, is_core, sort_order, features, tags, version, is_active, created_at, updated_at)
        VALUES (uuid_generate_v4(), :code, :name, :description, :icon, :route, :category, :pricing_tier, :setup_complexity, :color, :is_core, :sort_order, :features, :tags, '1.0.0', true, NOW(), NOW())
      `, { replacements: m });
    }
    console.log(`Inserted ${MODULES.length} modules`);

    // Insert dependencies
    for (const [mod, dep, type] of DEPENDENCIES) {
      await sequelize.query(`
        INSERT INTO module_dependencies (id, module_id, depends_on_module_id, dependency_type, created_at)
        SELECT uuid_generate_v4(), m1.id, m2.id, :type, NOW()
        FROM modules m1, modules m2
        WHERE m1.code = :mod AND m2.code = :dep
        ON CONFLICT DO NOTHING
      `, { replacements: { mod, dep, type } });
    }
    console.log(`Inserted ${DEPENDENCIES.length} module dependencies`);

    // Verify
    const [result] = await sequelize.query(`
      SELECT m.code, m.name, m.pricing_tier, m.is_core, m.category,
             COUNT(md.id) as dep_count
      FROM modules m
      LEFT JOIN module_dependencies md ON md.module_id = m.id
      GROUP BY m.id ORDER BY m.sort_order
    `);
    console.log('\n=== MODULE CATALOG ===');
    result.forEach(r => {
      const tier = r.is_core ? 'CORE' : r.pricing_tier.toUpperCase();
      console.log(`  [${tier}] ${r.code} - ${r.name} (${r.category}) deps=${r.dep_count}`);
    });

    console.log('\n=== SEED COMPLETE ===');
    await sequelize.close();
    process.exit(0);
  } catch (error) {
    console.error('Seed failed:', error.message);
    await sequelize.close();
    process.exit(1);
  }
}

run();
