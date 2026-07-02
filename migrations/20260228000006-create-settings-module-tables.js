'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const tables = await queryInterface.showAllTables();
    const ct = (name) => tables.includes(name);

    // 1. STORES
    if (!ct('stores')) {
      await queryInterface.createTable('stores', {
        id: { type: Sequelize.UUID, defaultValue: Sequelize.literal('gen_random_uuid()'), primaryKey: true },
        name: { type: Sequelize.STRING(255), allowNull: false },
        address: { type: Sequelize.TEXT },
        city: { type: Sequelize.STRING(100) },
        province: { type: Sequelize.STRING(100) },
        postal_code: { type: Sequelize.STRING(10) },
        phone: { type: Sequelize.STRING(20) },
        email: { type: Sequelize.STRING(255) },
        website: { type: Sequelize.STRING(255) },
        tax_id: { type: Sequelize.STRING(30), comment: 'NPWP or Tax ID' },
        logo_url: { type: Sequelize.STRING(255) },
        description: { type: Sequelize.TEXT },
        operating_hours: { type: Sequelize.JSON, defaultValue: [] },
        is_active: { type: Sequelize.BOOLEAN, defaultValue: true },
        created_at: { type: Sequelize.DATE, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
        updated_at: { type: Sequelize.DATE, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') }
      });
      await queryInterface.addIndex('stores', ['is_active'], { name: 'idx_stores_is_active' }).catch(() => {});
      await queryInterface.addIndex('stores', ['created_at'], { name: 'idx_stores_created_at' }).catch(() => {});
    }

    // 2. ROLES
    if (!ct('roles')) {
      await queryInterface.createTable('roles', {
        id: { type: Sequelize.UUID, defaultValue: Sequelize.literal('gen_random_uuid()'), primaryKey: true },
        name: { type: Sequelize.STRING(100), allowNull: false, unique: true },
        description: { type: Sequelize.TEXT },
        permissions: { type: Sequelize.JSON, defaultValue: {} },
        created_at: { type: Sequelize.DATE, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
        updated_at: { type: Sequelize.DATE, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') }
      });
      await queryInterface.addIndex('roles', ['name'], { name: 'idx_roles_name' }).catch(() => {});

      // Insert default roles
      await queryInterface.sequelize.query(`
        INSERT INTO roles (id, name, description, permissions) VALUES
          (gen_random_uuid(), 'admin', 'Administrator with full access', '{"all": true}'::json),
          (gen_random_uuid(), 'manager', 'Manager with limited access', '{"pos": true, "inventory": true, "reports": true}'::json),
          (gen_random_uuid(), 'staff', 'Staff with basic access', '{"pos": true}'::json)
        ON CONFLICT (name) DO NOTHING;
      `);
    }

    // 3. AUDIT_LOGS
    if (!ct('audit_logs')) {
      await queryInterface.createTable('audit_logs', {
        id: { type: Sequelize.UUID, defaultValue: Sequelize.literal('gen_random_uuid()'), primaryKey: true },
        user_id: { type: Sequelize.UUID },
        action: { type: Sequelize.STRING(100), allowNull: false },
        resource: { type: Sequelize.STRING(100) },
        resource_id: { type: Sequelize.UUID },
        details: { type: Sequelize.JSON },
        ip_address: { type: Sequelize.STRING(45) },
        user_agent: { type: Sequelize.TEXT },
        created_at: { type: Sequelize.DATE, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') }
      });
      await queryInterface.addIndex('audit_logs', ['user_id'], { name: 'idx_audit_logs_user_id' }).catch(() => {});
      await queryInterface.addIndex('audit_logs', ['action'], { name: 'idx_audit_logs_action' }).catch(() => {});
      await queryInterface.addIndex('audit_logs', ['resource'], { name: 'idx_audit_logs_resource' }).catch(() => {});
      await queryInterface.addIndex('audit_logs', ['created_at'], { name: 'idx_audit_logs_created_at' }).catch(() => {});
    }

    // 4. SYSTEM_BACKUPS
    if (!ct('system_backups')) {
      await queryInterface.createTable('system_backups', {
        id: { type: Sequelize.UUID, defaultValue: Sequelize.literal('gen_random_uuid()'), primaryKey: true },
        filename: { type: Sequelize.STRING(255), allowNull: false },
        file_path: { type: Sequelize.STRING(500) },
        file_size: { type: Sequelize.BIGINT, defaultValue: 0 },
        backup_type: { type: Sequelize.STRING(50), defaultValue: 'full' },
        status: { type: Sequelize.STRING(50), defaultValue: 'pending' },
        description: { type: Sequelize.TEXT },
        created_by: { type: Sequelize.UUID },
        created_at: { type: Sequelize.DATE, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
        updated_at: { type: Sequelize.DATE, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') }
      });
      await queryInterface.addIndex('system_backups', ['created_by'], { name: 'idx_system_backups_created_by' }).catch(() => {});
      await queryInterface.addIndex('system_backups', ['status'], { name: 'idx_system_backups_status' }).catch(() => {});
      await queryInterface.addIndex('system_backups', ['created_at'], { name: 'idx_system_backups_created_at' }).catch(() => {});
    }

    // 5. UNITS
    if (!ct('units')) {
      await queryInterface.createTable('units', {
        id: { type: Sequelize.UUID, defaultValue: Sequelize.literal('gen_random_uuid()'), primaryKey: true },
        name: { type: Sequelize.STRING(100), allowNull: false },
        symbol: { type: Sequelize.STRING(20) },
        description: { type: Sequelize.TEXT },
        created_at: { type: Sequelize.DATE, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
        updated_at: { type: Sequelize.DATE, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') }
      });
      await queryInterface.addIndex('units', ['name'], { name: 'idx_units_name' }).catch(() => {});

      // Default units
      await queryInterface.sequelize.query(`
        INSERT INTO units (id, name, symbol, description) VALUES
          (gen_random_uuid(), 'Pieces', 'pcs', 'Individual pieces'),
          (gen_random_uuid(), 'Kilogram', 'kg', 'Weight in kilograms'),
          (gen_random_uuid(), 'Gram', 'g', 'Weight in grams'),
          (gen_random_uuid(), 'Liter', 'L', 'Volume in liters'),
          (gen_random_uuid(), 'Milliliter', 'ml', 'Volume in milliliters'),
          (gen_random_uuid(), 'Box', 'box', 'Boxed items'),
          (gen_random_uuid(), 'Pack', 'pack', 'Packed items'),
          (gen_random_uuid(), 'Dozen', 'dz', 'Dozen (12 pieces)'),
          (gen_random_uuid(), 'Meter', 'm', 'Length in meters')
        ON CONFLICT DO NOTHING;
      `).catch(() => {});
    }

    // 6. PRINTER_CONFIGS
    if (!ct('printer_configs')) {
      await queryInterface.createTable('printer_configs', {
        id: { type: Sequelize.UUID, defaultValue: Sequelize.literal('gen_random_uuid()'), primaryKey: true },
        name: { type: Sequelize.STRING(100), allowNull: false },
        type: { type: Sequelize.STRING(50), defaultValue: 'thermal' },
        connection_type: { type: Sequelize.STRING(50), defaultValue: 'network' },
        ip_address: { type: Sequelize.STRING(45) },
        port: { type: Sequelize.INTEGER, defaultValue: 9100 },
        settings: { type: Sequelize.JSON, defaultValue: {} },
        is_default: { type: Sequelize.BOOLEAN, defaultValue: false },
        is_active: { type: Sequelize.BOOLEAN, defaultValue: true },
        created_at: { type: Sequelize.DATE, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
        updated_at: { type: Sequelize.DATE, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') }
      });
      await queryInterface.addIndex('printer_configs', ['is_default'], { name: 'idx_printer_configs_is_default' }).catch(() => {});
      await queryInterface.addIndex('printer_configs', ['is_active'], { name: 'idx_printer_configs_is_active' }).catch(() => {});
    }

    // 7. NOTIFICATION_SETTINGS
    if (!ct('notification_settings')) {
      await queryInterface.createTable('notification_settings', {
        id: { type: Sequelize.UUID, defaultValue: Sequelize.literal('gen_random_uuid()'), primaryKey: true },
        user_id: { type: Sequelize.UUID, allowNull: false, unique: true },
        email_settings: { type: Sequelize.JSON, defaultValue: {} },
        sms_settings: { type: Sequelize.JSON, defaultValue: {} },
        push_settings: { type: Sequelize.JSON, defaultValue: {} },
        email_config: { type: Sequelize.JSON, defaultValue: {} },
        created_at: { type: Sequelize.DATE, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
        updated_at: { type: Sequelize.DATE, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') }
      });
      await queryInterface.addIndex('notification_settings', ['user_id'], { name: 'idx_notification_settings_user_id' }).catch(() => {});
    }

    // Add 2FA and password tracking to users
    const usersDesc = await queryInterface.describeTable('users').catch(() => null);
    if (usersDesc) {
      if (!usersDesc.two_factor_enabled) await queryInterface.addColumn('users', 'two_factor_enabled', { type: Sequelize.BOOLEAN, defaultValue: false });
      if (!usersDesc.two_factor_secret) await queryInterface.addColumn('users', 'two_factor_secret', { type: Sequelize.STRING(255) });
      if (!usersDesc.password_changed_at) await queryInterface.addColumn('users', 'password_changed_at', { type: Sequelize.DATE });
      if (!usersDesc.last_login_at) await queryInterface.addColumn('users', 'last_login_at', { type: Sequelize.DATE });
      if (!usersDesc.last_login_ip) await queryInterface.addColumn('users', 'last_login_ip', { type: Sequelize.STRING(45) });
    }

    // Triggers for updated_at
    await queryInterface.sequelize.query(`
      CREATE OR REPLACE FUNCTION update_updated_at_column()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = CURRENT_TIMESTAMP;
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);

    const triggerTables = ['stores', 'roles', 'system_backups', 'units', 'printer_configs', 'notification_settings'];
    for (const t of triggerTables) {
      await queryInterface.sequelize.query(`
        DROP TRIGGER IF EXISTS update_${t}_updated_at ON ${t};
        CREATE TRIGGER update_${t}_updated_at BEFORE UPDATE ON ${t}
          FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
      `).catch(() => {});
    }

    console.log('✅ Settings module tables created (stores, roles, audit_logs, backups, units, printers, notifications)');
  },

  down: async (queryInterface) => {
    const drop = (t) => queryInterface.dropTable(t).catch(() => {});
    await drop('notification_settings');
    await drop('printer_configs');
    await drop('units');
    await drop('system_backups');
    await drop('audit_logs');
    await drop('roles');
    await drop('stores');

    const cols = ['two_factor_enabled', 'two_factor_secret', 'password_changed_at', 'last_login_at', 'last_login_ip'];
    for (const col of cols) {
      await queryInterface.removeColumn('users', col).catch(() => {});
    }
  }
};
