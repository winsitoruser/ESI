'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const tables = await queryInterface.showAllTables();

    if (!tables.includes('store_settings')) {
      await queryInterface.createTable('store_settings', {
        id: { type: Sequelize.UUID, defaultValue: Sequelize.literal('gen_random_uuid()'), primaryKey: true },
        store_id: { type: Sequelize.UUID },
        branch_id: { type: Sequelize.UUID },
        category: { type: Sequelize.STRING(100), allowNull: false, comment: 'Setting category: pos, inventory, finance, notifications, etc.' },
        key: { type: Sequelize.STRING(100), allowNull: false, comment: 'Setting key name' },
        value: { type: Sequelize.TEXT, comment: 'Setting value (stored as text, parsed based on data_type)' },
        data_type: { type: Sequelize.STRING(20), defaultValue: 'string', comment: 'Data type: string, number, boolean, json' },
        description: { type: Sequelize.TEXT },
        is_global: { type: Sequelize.BOOLEAN, defaultValue: false, comment: 'If true, applies to all branches' },
        created_at: { type: Sequelize.DATE, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
        updated_at: { type: Sequelize.DATE, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') }
      });
    }

    // Indexes
    await queryInterface.addIndex('store_settings', ['store_id'], { name: 'idx_store_settings_store_id' }).catch(() => {});
    await queryInterface.addIndex('store_settings', ['branch_id'], { name: 'idx_store_settings_branch_id' }).catch(() => {});
    await queryInterface.addIndex('store_settings', ['category'], { name: 'idx_store_settings_category' }).catch(() => {});
    await queryInterface.addIndex('store_settings', ['key'], { name: 'idx_store_settings_key' }).catch(() => {});
    await queryInterface.addIndex('store_settings', ['is_global'], { name: 'idx_store_settings_is_global' }).catch(() => {});

    // Unique constraint
    await queryInterface.addIndex('store_settings', ['store_id', 'branch_id', 'category', 'key'], {
      unique: true,
      name: 'unique_setting'
    }).catch(() => {});

    // Trigger for updated_at
    await queryInterface.sequelize.query(`
      CREATE OR REPLACE FUNCTION update_store_settings_updated_at()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = CURRENT_TIMESTAMP;
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);

    await queryInterface.sequelize.query(`
      DROP TRIGGER IF EXISTS trigger_store_settings_updated_at ON store_settings;
      CREATE TRIGGER trigger_store_settings_updated_at
        BEFORE UPDATE ON store_settings
        FOR EACH ROW
        EXECUTE FUNCTION update_store_settings_updated_at();
    `);

    // Insert default global settings
    await queryInterface.sequelize.query(`
      INSERT INTO store_settings (id, category, key, value, data_type, description, is_global)
      VALUES
        (gen_random_uuid(), 'pos', 'tax_rate', '10', 'number', 'Default tax rate percentage', true),
        (gen_random_uuid(), 'pos', 'auto_print_receipt', 'true', 'boolean', 'Automatically print receipt after transaction', true),
        (gen_random_uuid(), 'pos', 'default_payment_method', 'cash', 'string', 'Default payment method', true),
        (gen_random_uuid(), 'inventory', 'low_stock_alert', 'true', 'boolean', 'Enable low stock alerts', true),
        (gen_random_uuid(), 'inventory', 'low_stock_threshold', '10', 'number', 'Low stock threshold quantity', true),
        (gen_random_uuid(), 'inventory', 'auto_reorder', 'false', 'boolean', 'Automatically create purchase orders for low stock', true),
        (gen_random_uuid(), 'finance', 'currency', 'IDR', 'string', 'Default currency', true),
        (gen_random_uuid(), 'finance', 'decimal_places', '2', 'number', 'Number of decimal places for currency', true),
        (gen_random_uuid(), 'notifications', 'email_enabled', 'true', 'boolean', 'Enable email notifications', true),
        (gen_random_uuid(), 'notifications', 'sms_enabled', 'false', 'boolean', 'Enable SMS notifications', true)
      ON CONFLICT DO NOTHING;
    `).catch(() => {});

    console.log('✅ Store settings table created with defaults');
  },

  down: async (queryInterface) => {
    await queryInterface.sequelize.query('DROP TRIGGER IF EXISTS trigger_store_settings_updated_at ON store_settings').catch(() => {});
    await queryInterface.sequelize.query('DROP FUNCTION IF EXISTS update_store_settings_updated_at()').catch(() => {});
    await queryInterface.dropTable('store_settings').catch(() => {});
  }
};
