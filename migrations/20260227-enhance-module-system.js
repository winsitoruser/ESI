'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // 1. Enhance modules table with new columns
    const modulesDesc = await queryInterface.describeTable('modules').catch(() => null);
    if (!modulesDesc) {
      console.log('⚠️ modules table does not exist, skipping');
      return;
    }

    const addCol = async (col, def) => {
      if (!modulesDesc[col]) await queryInterface.addColumn('modules', col, def);
    };

    await addCol('category', { type: Sequelize.STRING(50), defaultValue: 'operations' });
    await addCol('features', { type: Sequelize.JSONB, defaultValue: [] });
    await addCol('pricing_tier', { type: Sequelize.STRING(20), defaultValue: 'basic' });
    await addCol('setup_complexity', { type: Sequelize.STRING(20), defaultValue: 'simple' });
    await addCol('color', { type: Sequelize.STRING(20), defaultValue: '#3B82F6' });
    await addCol('preview_image', { type: Sequelize.STRING(500) });
    await addCol('version', { type: Sequelize.STRING(20), defaultValue: '1.0.0' });
    await addCol('tags', { type: Sequelize.JSONB, defaultValue: [] });

    // 2. Enhance tenant_modules table
    const tmDesc = await queryInterface.describeTable('tenant_modules').catch(() => null);
    if (tmDesc) {
      if (!tmDesc.configured_at) await queryInterface.addColumn('tenant_modules', 'configured_at', { type: Sequelize.DATE });
      if (!tmDesc.config_data) await queryInterface.addColumn('tenant_modules', 'config_data', { type: Sequelize.JSONB, defaultValue: {} });
      if (!tmDesc.enabled_by) await queryInterface.addColumn('tenant_modules', 'enabled_by', { type: Sequelize.UUID });
    }

    // 3. Update existing module metadata
    const updates = [
      { code: 'dashboard', category: 'core', features: '["Overview bisnis", "Statistik real-time", "Notifikasi penting", "Quick actions"]', pricing_tier: 'basic', setup_complexity: 'simple', color: '#3B82F6' },
      { code: 'pos', category: 'operations', features: '["Kasir digital", "Multi payment", "Cetak struk", "Diskon & promo", "Split bill"]', pricing_tier: 'basic', setup_complexity: 'simple', color: '#10B981' },
      { code: 'inventory', category: 'operations', features: '["Stok real-time", "Multi-gudang", "Stock opname", "Transfer stok", "Alerts otomatis", "Barcode support"]', pricing_tier: 'basic', setup_complexity: 'moderate', color: '#F59E0B' },
      { code: 'customers', category: 'crm', features: '["Database pelanggan", "Riwayat transaksi", "Segmentasi", "Customer insights"]', pricing_tier: 'basic', setup_complexity: 'simple', color: '#8B5CF6' },
      { code: 'employees', category: 'hr', features: '["Data karyawan", "Jadwal & shift", "Attendance tracking"]', pricing_tier: 'basic', setup_complexity: 'simple', color: '#6366F1' },
      { code: 'loyalty', category: 'crm', features: '["Point system", "Tier membership", "Rewards catalog", "Auto promo"]', pricing_tier: 'professional', setup_complexity: 'moderate', color: '#EC4899' },
      { code: 'tables', category: 'operations', features: '["Layout meja", "Status real-time", "Gabung/pisah meja", "QR order"]', pricing_tier: 'professional', setup_complexity: 'moderate', color: '#14B8A6' },
      { code: 'reservations', category: 'operations', features: '["Booking online", "Kalender reservasi", "Konfirmasi otomatis", "Waitlist"]', pricing_tier: 'professional', setup_complexity: 'moderate', color: '#F97316' },
      { code: 'kitchen', category: 'operations', features: '["Kitchen Display System", "Order queue", "Prep time tracking", "Recipe management"]', pricing_tier: 'professional', setup_complexity: 'complex', color: '#EF4444' },
      { code: 'promo', category: 'marketing', features: '["Buat promo", "Voucher & kupon", "Bundle deals", "Jadwal promo", "Analitik promo"]', pricing_tier: 'professional', setup_complexity: 'moderate', color: '#F43F5E' },
      { code: 'finance', category: 'finance', features: '["Laporan keuangan", "Arus kas", "Laba rugi", "Piutang & hutang", "Budget planning", "Pajak"]', pricing_tier: 'professional', setup_complexity: 'complex', color: '#22C55E' },
      { code: 'reports', category: 'analytics', features: '["Laporan penjualan", "Laporan stok", "Laporan keuangan", "Konsolidasi multi-cabang", "Export PDF/Excel"]', pricing_tier: 'basic', setup_complexity: 'simple', color: '#0EA5E9' },
      { code: 'settings', category: 'system', features: '["Pengaturan toko", "Integrasi", "Notifikasi", "Pajak & biaya", "Backup"]', pricing_tier: 'basic', setup_complexity: 'simple', color: '#64748B' },
      { code: 'hris', category: 'hr', features: '["KPI karyawan", "Attendance management", "Performance review", "Cuti management", "Payroll ready"]', pricing_tier: 'enterprise', setup_complexity: 'complex', color: '#7C3AED' },
      { code: 'branches', category: 'operations', features: '["Multi-cabang management", "Performa cabang", "Transfer antar cabang", "Pengaturan per-cabang"]', pricing_tier: 'professional', setup_complexity: 'moderate', color: '#2563EB' },
      { code: 'supply_chain', category: 'operations', features: '["Purchase order", "Internal requisition", "Supplier management", "Goods receipt"]', pricing_tier: 'professional', setup_complexity: 'moderate', color: '#D97706' },
      { code: 'products', category: 'operations', features: '["Master produk", "Variant management", "Pricing tiers", "Kategori produk"]', pricing_tier: 'basic', setup_complexity: 'simple', color: '#059669' },
      { code: 'users', category: 'system', features: '["User management", "Role & akses", "Branch manager assignment"]', pricing_tier: 'basic', setup_complexity: 'simple', color: '#475569' },
      { code: 'audit', category: 'system', features: '["Activity log", "Security audit", "Change tracking"]', pricing_tier: 'professional', setup_complexity: 'simple', color: '#78716C' },
      { code: 'fleet', category: 'operations', features: '["Fleet overview", "GPS tracking", "Route management", "Fuel management", "Maintenance schedule", "Cost reporting"]', pricing_tier: 'enterprise', setup_complexity: 'complex', color: '#DC2626' },
      { code: 'integrations', category: 'system', features: '["API integration", "Payment gateway", "Delivery partners", "Accounting sync"]', pricing_tier: 'professional', setup_complexity: 'moderate', color: '#4F46E5' },
    ];

    for (const u of updates) {
      await queryInterface.sequelize.query(
        `UPDATE modules SET category = :category, features = :features::jsonb, pricing_tier = :pricing_tier, setup_complexity = :setup_complexity, color = :color WHERE code = :code`,
        { replacements: u }
      ).catch(() => {});
    }

    // 4. Insert module dependencies
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

    for (const [mod, dep, dtype] of deps) {
      await queryInterface.sequelize.query(`
        INSERT INTO module_dependencies (id, module_id, depends_on_module_id, dependency_type, created_at)
        SELECT gen_random_uuid(), m1.id, m2.id, :dtype, CURRENT_TIMESTAMP
        FROM modules m1, modules m2
        WHERE m1.code = :mod AND m2.code = :dep
        ON CONFLICT DO NOTHING
      `, { replacements: { mod, dep, dtype } }).catch(() => {});
    }

    console.log('✅ Enhanced module system with metadata and dependencies');
  },

  down: async (queryInterface) => {
    // Remove added columns from modules
    const cols = ['category', 'features', 'pricing_tier', 'setup_complexity', 'color', 'preview_image', 'version', 'tags'];
    for (const col of cols) {
      await queryInterface.removeColumn('modules', col).catch(() => {});
    }
    // Remove added columns from tenant_modules
    await queryInterface.removeColumn('tenant_modules', 'configured_at').catch(() => {});
    await queryInterface.removeColumn('tenant_modules', 'config_data').catch(() => {});
    await queryInterface.removeColumn('tenant_modules', 'enabled_by').catch(() => {});
  }
};
