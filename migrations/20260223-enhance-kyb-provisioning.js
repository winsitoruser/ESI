'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // 1. Add business_code to tenants
    const tenantsDesc = await queryInterface.describeTable('tenants');
    if (!tenantsDesc.business_code) {
      await queryInterface.addColumn('tenants', 'business_code', {
        type: Sequelize.STRING(20),
        unique: true,
        comment: 'Unique business ID like BUS-001, BUS-100'
      });
    }

    // 2. Create branches table if not exists
    const tables = await queryInterface.showAllTables();
    if (!tables.includes('branches')) {
      await queryInterface.createTable('branches', {
        id: { type: Sequelize.UUID, defaultValue: Sequelize.literal('gen_random_uuid()'), primaryKey: true },
        tenant_id: { type: Sequelize.UUID, references: { model: 'tenants', key: 'id' }, onDelete: 'SET NULL' },
        store_id: { type: Sequelize.UUID },
        code: { type: Sequelize.STRING(50), allowNull: false, unique: true },
        name: { type: Sequelize.STRING(255), allowNull: false },
        type: { type: Sequelize.STRING(20), defaultValue: 'branch' },
        address: { type: Sequelize.TEXT },
        city: { type: Sequelize.STRING(255) },
        province: { type: Sequelize.STRING(255) },
        postal_code: { type: Sequelize.STRING(10) },
        phone: { type: Sequelize.STRING(20) },
        email: { type: Sequelize.STRING(255) },
        manager_id: { type: Sequelize.INTEGER, references: { model: 'users', key: 'id' }, onDelete: 'SET NULL' },
        operating_hours: { type: Sequelize.JSONB, defaultValue: [] },
        is_active: { type: Sequelize.BOOLEAN, defaultValue: true },
        settings: { type: Sequelize.JSONB, defaultValue: {} },
        created_at: { type: Sequelize.DATE, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
        updated_at: { type: Sequelize.DATE, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') }
      });
    } else {
      // Ensure tenant_id exists on branches
      const branchesDesc = await queryInterface.describeTable('branches');
      if (!branchesDesc.tenant_id) {
        await queryInterface.addColumn('branches', 'tenant_id', {
          type: Sequelize.UUID,
          references: { model: 'tenants', key: 'id' },
          onDelete: 'SET NULL',
          comment: 'Links branch to its owning tenant for multi-tenancy'
        });
      }
    }

    // 3. Add data_scope to users
    const usersDesc = await queryInterface.describeTable('users');
    if (!usersDesc.data_scope) {
      await queryInterface.addColumn('users', 'data_scope', {
        type: Sequelize.STRING(20),
        defaultValue: 'own_branch',
        comment: 'own_branch = sees own branch only, all_branches = HQ/aggregation access'
      });
    }
    if (!usersDesc.assigned_branch_id) {
      await queryInterface.addColumn('users', 'assigned_branch_id', { type: Sequelize.UUID });
    }

    // 4. System sequences table
    if (!tables.includes('system_sequences')) {
      await queryInterface.createTable('system_sequences', {
        id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
        sequence_name: { type: Sequelize.STRING(50), unique: true, allowNull: false },
        current_value: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
        prefix: { type: Sequelize.STRING(10), allowNull: false, defaultValue: '' },
        created_at: { type: Sequelize.DATE, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
        updated_at: { type: Sequelize.DATE, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') }
      });
    }

    // Initialize business code sequence
    await queryInterface.sequelize.query(`
      INSERT INTO system_sequences (sequence_name, current_value, prefix)
      VALUES ('business_code', 0, 'BUS')
      ON CONFLICT (sequence_name) DO NOTHING;
    `);

    // 5. Default settings templates table
    if (!tables.includes('default_settings_templates')) {
      await queryInterface.createTable('default_settings_templates', {
        id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
        business_type_code: { type: Sequelize.STRING(50), allowNull: false },
        setting_category: { type: Sequelize.STRING(50), allowNull: false },
        setting_key: { type: Sequelize.STRING(100), allowNull: false },
        setting_value: { type: Sequelize.TEXT },
        data_type: { type: Sequelize.STRING(20), defaultValue: 'string' },
        description: { type: Sequelize.TEXT },
        created_at: { type: Sequelize.DATE, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') }
      });
      await queryInterface.addIndex('default_settings_templates',
        ['business_type_code', 'setting_category', 'setting_key'],
        { unique: true, name: 'default_settings_templates_unique' }
      ).catch(() => {});
    }

    // Insert default settings
    await queryInterface.sequelize.query(`
      INSERT INTO default_settings_templates (business_type_code, setting_category, setting_key, setting_value, data_type, description) VALUES
        ('fnb', 'tax', 'ppn_rate', '11', 'number', 'PPN rate %'),
        ('fnb', 'tax', 'service_charge', '5', 'number', 'Service charge %'),
        ('fnb', 'tax', 'tax_included', 'true', 'boolean', 'Harga sudah termasuk pajak'),
        ('fnb', 'receipt', 'show_logo', 'true', 'boolean', 'Tampilkan logo di struk'),
        ('fnb', 'receipt', 'show_address', 'true', 'boolean', 'Tampilkan alamat di struk'),
        ('fnb', 'receipt', 'footer_text', 'Terima kasih atas kunjungan Anda!', 'string', 'Footer struk'),
        ('fnb', 'kitchen', 'auto_accept_orders', 'false', 'boolean', 'Auto terima pesanan dapur'),
        ('fnb', 'kitchen', 'default_prep_time', '15', 'number', 'Estimasi waktu persiapan (menit)'),
        ('fnb', 'payment', 'cash_enabled', 'true', 'boolean', 'Terima pembayaran tunai'),
        ('fnb', 'payment', 'qris_enabled', 'true', 'boolean', 'Terima QRIS'),
        ('fnb', 'payment', 'card_enabled', 'false', 'boolean', 'Terima kartu debit/kredit'),
        ('retail', 'tax', 'ppn_rate', '11', 'number', 'PPN rate %'),
        ('retail', 'tax', 'tax_included', 'true', 'boolean', 'Harga sudah termasuk pajak'),
        ('retail', 'receipt', 'show_logo', 'true', 'boolean', 'Tampilkan logo di struk'),
        ('retail', 'receipt', 'show_address', 'true', 'boolean', 'Tampilkan alamat di struk'),
        ('retail', 'receipt', 'footer_text', 'Terima kasih telah berbelanja!', 'string', 'Footer struk'),
        ('retail', 'inventory', 'low_stock_alert', 'true', 'boolean', 'Alert stok rendah'),
        ('retail', 'inventory', 'min_stock_threshold', '10', 'number', 'Batas minimum stok'),
        ('retail', 'payment', 'cash_enabled', 'true', 'boolean', 'Terima tunai'),
        ('retail', 'payment', 'qris_enabled', 'true', 'boolean', 'Terima QRIS'),
        ('retail', 'payment', 'card_enabled', 'true', 'boolean', 'Terima kartu')
      ON CONFLICT (business_type_code, setting_category, setting_key) DO NOTHING;
    `);

    // 6. Indexes
    await queryInterface.addIndex('tenants', ['business_code'], { name: 'idx_tenants_business_code' }).catch(() => {});
    await queryInterface.addIndex('branches', ['tenant_id'], { name: 'idx_branches_tenant_id' }).catch(() => {});
    await queryInterface.addIndex('default_settings_templates', ['business_type_code'], { name: 'idx_default_settings_btype' }).catch(() => {});

    console.log('✅ KYB provisioning enhancements applied');
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable('default_settings_templates').catch(() => {});
    await queryInterface.dropTable('system_sequences').catch(() => {});
    await queryInterface.removeColumn('users', 'assigned_branch_id').catch(() => {});
    await queryInterface.removeColumn('users', 'data_scope').catch(() => {});
    await queryInterface.removeColumn('tenants', 'business_code').catch(() => {});
  }
};
