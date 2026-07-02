require('dotenv').config({ path: '.env.development' });
const sequelize = require('../lib/sequelize');

async function run() {
  try {
    // Ensure uuid extension
    await sequelize.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');
    
    // Check current columns
    const [cols] = await sequelize.query(
      "SELECT column_name FROM information_schema.columns WHERE table_name='modules' ORDER BY ordinal_position"
    );
    console.log('Current columns:', cols.map(c => c.column_name).join(', '));

    // Add missing columns
    const additions = [
      { col: 'category', sql: "ALTER TABLE modules ADD COLUMN category VARCHAR(50) DEFAULT 'operations'" },
      { col: 'features', sql: "ALTER TABLE modules ADD COLUMN features JSONB DEFAULT '[]'" },
      { col: 'pricing_tier', sql: "ALTER TABLE modules ADD COLUMN pricing_tier VARCHAR(20) DEFAULT 'basic'" },
      { col: 'setup_complexity', sql: "ALTER TABLE modules ADD COLUMN setup_complexity VARCHAR(20) DEFAULT 'simple'" },
      { col: 'color', sql: "ALTER TABLE modules ADD COLUMN color VARCHAR(20) DEFAULT '#3B82F6'" },
      { col: 'preview_image', sql: "ALTER TABLE modules ADD COLUMN preview_image VARCHAR(500)" },
      { col: 'version', sql: "ALTER TABLE modules ADD COLUMN version VARCHAR(20) DEFAULT '1.0.0'" },
      { col: 'tags', sql: "ALTER TABLE modules ADD COLUMN tags JSONB DEFAULT '[]'" },
    ];

    const existingCols = new Set(cols.map(c => c.column_name));
    for (const { col, sql } of additions) {
      if (!existingCols.has(col)) {
        await sequelize.query(sql);
        console.log('+ Added column:', col);
      } else {
        console.log('= Column exists:', col);
      }
    }

    // Create module_dependencies table
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS module_dependencies (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        module_id UUID NOT NULL REFERENCES modules(id) ON DELETE CASCADE,
        depends_on_module_id UUID NOT NULL REFERENCES modules(id) ON DELETE CASCADE,
        dependency_type VARCHAR(20) DEFAULT 'required',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(module_id, depends_on_module_id),
        CHECK(module_id != depends_on_module_id)
      )
    `);
    console.log('+ module_dependencies table ready');

    await sequelize.query("CREATE INDEX IF NOT EXISTS idx_module_deps_module ON module_dependencies(module_id)");
    await sequelize.query("CREATE INDEX IF NOT EXISTS idx_module_deps_depends ON module_dependencies(depends_on_module_id)");

    // Enhance tenant_modules
    const [tmCols] = await sequelize.query(
      "SELECT column_name FROM information_schema.columns WHERE table_name='tenant_modules'"
    );
    const tmExisting = new Set(tmCols.map(c => c.column_name));

    if (!tmExisting.has('configured_at')) {
      await sequelize.query("ALTER TABLE tenant_modules ADD COLUMN configured_at TIMESTAMP");
      console.log('+ Added tenant_modules.configured_at');
    }
    if (!tmExisting.has('config_data')) {
      await sequelize.query("ALTER TABLE tenant_modules ADD COLUMN config_data JSONB DEFAULT '{}'");
      console.log('+ Added tenant_modules.config_data');
    }
    if (!tmExisting.has('enabled_by')) {
      await sequelize.query("ALTER TABLE tenant_modules ADD COLUMN enabled_by UUID");
      console.log('+ Added tenant_modules.enabled_by');
    }

    // Update module metadata
    const updates = [
      { code: 'dashboard', category: 'core', color: '#3B82F6', tier: 'basic', complexity: 'simple', features: '["Overview bisnis","Statistik real-time","Notifikasi penting","Quick actions"]' },
      { code: 'pos', category: 'operations', color: '#10B981', tier: 'basic', complexity: 'simple', features: '["Kasir digital","Multi payment","Cetak struk","Diskon & promo","Split bill"]' },
      { code: 'inventory', category: 'operations', color: '#F59E0B', tier: 'basic', complexity: 'moderate', features: '["Stok real-time","Multi-gudang","Stock opname","Transfer stok","Alerts otomatis"]' },
      { code: 'customers', category: 'crm', color: '#8B5CF6', tier: 'basic', complexity: 'simple', features: '["Database pelanggan","Riwayat transaksi","Segmentasi","Customer insights"]' },
      { code: 'employees', category: 'hr', color: '#6366F1', tier: 'basic', complexity: 'simple', features: '["Data karyawan","Jadwal & shift","Attendance tracking"]' },
      { code: 'loyalty', category: 'crm', color: '#EC4899', tier: 'professional', complexity: 'moderate', features: '["Point system","Tier membership","Rewards catalog","Auto promo"]' },
      { code: 'tables', category: 'operations', color: '#14B8A6', tier: 'professional', complexity: 'moderate', features: '["Layout meja","Status real-time","Gabung/pisah meja","QR order"]' },
      { code: 'reservations', category: 'operations', color: '#F97316', tier: 'professional', complexity: 'moderate', features: '["Booking online","Kalender reservasi","Konfirmasi otomatis","Waitlist"]' },
      { code: 'kitchen', category: 'operations', color: '#EF4444', tier: 'professional', complexity: 'complex', features: '["Kitchen Display System","Order queue","Prep time tracking","Recipe management"]' },
      { code: 'promo', category: 'marketing', color: '#F43F5E', tier: 'professional', complexity: 'moderate', features: '["Buat promo","Voucher & kupon","Bundle deals","Jadwal promo","Analitik promo"]' },
      { code: 'finance', category: 'finance', color: '#22C55E', tier: 'professional', complexity: 'complex', features: '["Laporan keuangan","Arus kas","Laba rugi","Piutang & hutang","Budget planning","Pajak"]' },
      { code: 'reports', category: 'analytics', color: '#0EA5E9', tier: 'basic', complexity: 'simple', features: '["Laporan penjualan","Laporan stok","Laporan keuangan","Export PDF/Excel"]' },
      { code: 'settings', category: 'system', color: '#64748B', tier: 'basic', complexity: 'simple', features: '["Pengaturan toko","Integrasi","Notifikasi","Pajak & biaya","Backup"]' },
      { code: 'hris', category: 'hr', color: '#7C3AED', tier: 'enterprise', complexity: 'complex', features: '["KPI karyawan","Attendance management","Performance review","Cuti management"]' },
      { code: 'branches', category: 'operations', color: '#2563EB', tier: 'professional', complexity: 'moderate', features: '["Multi-cabang management","Performa cabang","Transfer antar cabang"]' },
      { code: 'supply_chain', category: 'operations', color: '#D97706', tier: 'professional', complexity: 'moderate', features: '["Purchase order","Internal requisition","Supplier management"]' },
      { code: 'products', category: 'operations', color: '#059669', tier: 'basic', complexity: 'simple', features: '["Master produk","Variant management","Pricing tiers","Kategori produk"]' },
      { code: 'users', category: 'system', color: '#475569', tier: 'basic', complexity: 'simple', features: '["User management","Role & akses","Branch manager assignment"]' },
      { code: 'audit', category: 'system', color: '#78716C', tier: 'professional', complexity: 'simple', features: '["Activity log","Security audit","Change tracking"]' },
      { code: 'fleet', category: 'operations', color: '#DC2626', tier: 'enterprise', complexity: 'complex', features: '["Fleet overview","GPS tracking","Route management","Fuel management"]' },
      { code: 'integrations', category: 'system', color: '#4F46E5', tier: 'professional', complexity: 'moderate', features: '["API integration","Payment gateway","Delivery partners"]' },
    ];

    for (const u of updates) {
      await sequelize.query(
        `UPDATE modules SET category=:category, color=:color, pricing_tier=:tier, setup_complexity=:complexity, features=:features WHERE code=:code`,
        { replacements: u }
      );
    }
    console.log('+ Updated module metadata for', updates.length, 'modules');

    // Insert dependencies
    const deps = [
      ['finance', 'reports', 'required'],
      ['hris', 'employees', 'required'],
      ['kitchen', 'pos', 'required'],
      ['tables', 'pos', 'required'],
      ['reservations', 'tables', 'required'],
      ['loyalty', 'customers', 'required'],
      ['supply_chain', 'inventory', 'required'],
      ['promo', 'loyalty', 'recommended'],
      ['branches', 'dashboard', 'required'],
      ['fleet', 'branches', 'required'],
    ];

    for (const [mod, dep, type] of deps) {
      try {
        await sequelize.query(`
          INSERT INTO module_dependencies (id, module_id, depends_on_module_id, dependency_type)
          SELECT uuid_generate_v4(), m1.id, m2.id, :type
          FROM modules m1, modules m2
          WHERE m1.code = :mod AND m2.code = :dep
          ON CONFLICT DO NOTHING
        `, { replacements: { mod, dep, type } });
      } catch (e) {
        // ignore duplicates
      }
    }
    console.log('+ Inserted', deps.length, 'module dependencies');

    console.log('\n=== Migration complete! ===');
    await sequelize.close();
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error.message);
    await sequelize.close();
    process.exit(1);
  }
}

run();
