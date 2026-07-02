'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const tables = await queryInterface.showAllTables();
    const ct = (name) => tables.includes(name);

    // 1. CUSTOMERS
    if (!ct('customers')) {
      await queryInterface.createTable('customers', {
        id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
        tenant_id: { type: Sequelize.UUID, references: { model: 'tenants', key: 'id' }, onDelete: 'SET NULL' },
        branch_id: { type: Sequelize.UUID },
        name: { type: Sequelize.STRING(255), allowNull: false },
        email: { type: Sequelize.STRING(255) },
        phone: { type: Sequelize.STRING(50) },
        address: { type: Sequelize.TEXT },
        city: { type: Sequelize.STRING(100) },
        province: { type: Sequelize.STRING(100) },
        postal_code: { type: Sequelize.STRING(10) },
        gender: { type: Sequelize.STRING(10) },
        date_of_birth: { type: Sequelize.DATEONLY },
        customer_type: { type: Sequelize.STRING(30), defaultValue: 'regular' },
        notes: { type: Sequelize.TEXT },
        total_transactions: { type: Sequelize.INTEGER, defaultValue: 0 },
        total_spent: { type: Sequelize.DECIMAL(15, 2), defaultValue: 0 },
        last_visit: { type: Sequelize.DATE },
        is_active: { type: Sequelize.BOOLEAN, defaultValue: true },
        created_at: { type: Sequelize.DATE, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
        updated_at: { type: Sequelize.DATE, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') }
      });
    }

    // 2. EMPLOYEES
    if (!ct('employees')) {
      await queryInterface.createTable('employees', {
        id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
        tenant_id: { type: Sequelize.UUID, references: { model: 'tenants', key: 'id' }, onDelete: 'SET NULL' },
        branch_id: { type: Sequelize.UUID },
        user_id: { type: Sequelize.INTEGER, references: { model: 'users', key: 'id' }, onDelete: 'SET NULL' },
        employee_code: { type: Sequelize.STRING(30), unique: true },
        name: { type: Sequelize.STRING(255), allowNull: false },
        email: { type: Sequelize.STRING(255) },
        phone: { type: Sequelize.STRING(50) },
        position: { type: Sequelize.STRING(100) },
        department: { type: Sequelize.STRING(100) },
        hire_date: { type: Sequelize.DATEONLY },
        salary: { type: Sequelize.DECIMAL(15, 2), defaultValue: 0 },
        salary_type: { type: Sequelize.STRING(20), defaultValue: 'monthly' },
        bank_name: { type: Sequelize.STRING(100) },
        bank_account: { type: Sequelize.STRING(50) },
        address: { type: Sequelize.TEXT },
        emergency_contact: { type: Sequelize.STRING(255) },
        emergency_phone: { type: Sequelize.STRING(50) },
        photo_url: { type: Sequelize.TEXT },
        status: { type: Sequelize.STRING(20), defaultValue: 'active' },
        is_active: { type: Sequelize.BOOLEAN, defaultValue: true },
        created_at: { type: Sequelize.DATE, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
        updated_at: { type: Sequelize.DATE, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') }
      });
    }

    // 3. EMPLOYEE SCHEDULES
    if (!ct('employee_schedules')) {
      await queryInterface.createTable('employee_schedules', {
        id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
        tenant_id: { type: Sequelize.UUID, references: { model: 'tenants', key: 'id' }, onDelete: 'SET NULL' },
        branch_id: { type: Sequelize.UUID },
        employee_id: { type: Sequelize.INTEGER, references: { model: 'employees', key: 'id' }, onDelete: 'CASCADE' },
        date: { type: Sequelize.DATEONLY, allowNull: false },
        shift_name: { type: Sequelize.STRING(50) },
        start_time: { type: Sequelize.TIME, allowNull: false },
        end_time: { type: Sequelize.TIME, allowNull: false },
        break_duration: { type: Sequelize.INTEGER, defaultValue: 60 },
        notes: { type: Sequelize.TEXT },
        status: { type: Sequelize.STRING(20), defaultValue: 'scheduled' },
        created_at: { type: Sequelize.DATE, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
        updated_at: { type: Sequelize.DATE, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') }
      });
    }

    // 4. EMPLOYEE ATTENDANCE
    if (!ct('employee_attendance')) {
      await queryInterface.createTable('employee_attendance', {
        id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
        tenant_id: { type: Sequelize.UUID, references: { model: 'tenants', key: 'id' }, onDelete: 'SET NULL' },
        branch_id: { type: Sequelize.UUID },
        employee_id: { type: Sequelize.INTEGER, references: { model: 'employees', key: 'id' }, onDelete: 'CASCADE' },
        date: { type: Sequelize.DATEONLY, allowNull: false },
        clock_in: { type: Sequelize.DATE },
        clock_out: { type: Sequelize.DATE },
        status: { type: Sequelize.STRING(20), defaultValue: 'present' },
        late_minutes: { type: Sequelize.INTEGER, defaultValue: 0 },
        overtime_minutes: { type: Sequelize.INTEGER, defaultValue: 0 },
        notes: { type: Sequelize.TEXT },
        created_at: { type: Sequelize.DATE, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
        updated_at: { type: Sequelize.DATE, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') }
      });
    }

    // 5. SHIFTS
    if (!ct('shifts')) {
      await queryInterface.createTable('shifts', {
        id: { type: Sequelize.UUID, defaultValue: Sequelize.literal('gen_random_uuid()'), primaryKey: true },
        tenant_id: { type: Sequelize.UUID, references: { model: 'tenants', key: 'id' }, onDelete: 'SET NULL' },
        branch_id: { type: Sequelize.UUID },
        cashier_id: { type: Sequelize.INTEGER, references: { model: 'users', key: 'id' } },
        shift_number: { type: Sequelize.STRING(30) },
        opening_amount: { type: Sequelize.DECIMAL(15, 2), defaultValue: 0 },
        closing_amount: { type: Sequelize.DECIMAL(15, 2) },
        expected_amount: { type: Sequelize.DECIMAL(15, 2) },
        difference: { type: Sequelize.DECIMAL(15, 2) },
        total_sales: { type: Sequelize.DECIMAL(15, 2), defaultValue: 0 },
        total_transactions: { type: Sequelize.INTEGER, defaultValue: 0 },
        started_at: { type: Sequelize.DATE, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
        ended_at: { type: Sequelize.DATE },
        status: { type: Sequelize.STRING(20), defaultValue: 'open' },
        notes: { type: Sequelize.TEXT },
        created_at: { type: Sequelize.DATE, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
        updated_at: { type: Sequelize.DATE, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') }
      });
    }

    // 6. STORE SETTINGS
    if (!ct('store_settings')) {
      await queryInterface.createTable('store_settings', {
        id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
        tenant_id: { type: Sequelize.UUID, references: { model: 'tenants', key: 'id' }, onDelete: 'SET NULL' },
        branch_id: { type: Sequelize.UUID },
        store_id: { type: Sequelize.UUID },
        category: { type: Sequelize.STRING(50), allowNull: false },
        key: { type: Sequelize.STRING(100), allowNull: false },
        value: { type: Sequelize.TEXT },
        data_type: { type: Sequelize.STRING(20), defaultValue: 'string' },
        description: { type: Sequelize.TEXT },
        is_global: { type: Sequelize.BOOLEAN, defaultValue: true },
        created_at: { type: Sequelize.DATE, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
        updated_at: { type: Sequelize.DATE, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') }
      });
    }

    // 7. PRINTERS
    if (!ct('printers')) {
      await queryInterface.createTable('printers', {
        id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
        tenant_id: { type: Sequelize.UUID, references: { model: 'tenants', key: 'id' }, onDelete: 'SET NULL' },
        branch_id: { type: Sequelize.UUID },
        name: { type: Sequelize.STRING(100), allowNull: false },
        type: { type: Sequelize.STRING(30), defaultValue: 'thermal' },
        connection_type: { type: Sequelize.STRING(30), defaultValue: 'usb' },
        ip_address: { type: Sequelize.STRING(50) },
        port: { type: Sequelize.INTEGER },
        settings: { type: Sequelize.JSONB, defaultValue: {} },
        is_default: { type: Sequelize.BOOLEAN, defaultValue: false },
        is_active: { type: Sequelize.BOOLEAN, defaultValue: true },
        created_at: { type: Sequelize.DATE, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
        updated_at: { type: Sequelize.DATE, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') }
      });
    }

    // 8. NOTIFICATIONS
    if (!ct('notifications')) {
      await queryInterface.createTable('notifications', {
        id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
        tenant_id: { type: Sequelize.UUID, references: { model: 'tenants', key: 'id' }, onDelete: 'SET NULL' },
        user_id: { type: Sequelize.INTEGER, references: { model: 'users', key: 'id' }, onDelete: 'CASCADE' },
        title: { type: Sequelize.STRING(255), allowNull: false },
        message: { type: Sequelize.TEXT },
        type: { type: Sequelize.STRING(50), defaultValue: 'info' },
        category: { type: Sequelize.STRING(50) },
        reference_id: { type: Sequelize.STRING(255) },
        reference_type: { type: Sequelize.STRING(50) },
        is_read: { type: Sequelize.BOOLEAN, defaultValue: false },
        read_at: { type: Sequelize.DATE },
        created_at: { type: Sequelize.DATE, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
        updated_at: { type: Sequelize.DATE, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') }
      });
    }

    // 9. AUDIT LOGS
    if (!ct('audit_logs')) {
      await queryInterface.createTable('audit_logs', {
        id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
        tenant_id: { type: Sequelize.UUID, references: { model: 'tenants', key: 'id' }, onDelete: 'SET NULL' },
        user_id: { type: Sequelize.INTEGER, references: { model: 'users', key: 'id' }, onDelete: 'SET NULL' },
        action: { type: Sequelize.STRING(50), allowNull: false },
        entity_type: { type: Sequelize.STRING(50) },
        entity_id: { type: Sequelize.STRING(255) },
        old_values: { type: Sequelize.JSONB },
        new_values: { type: Sequelize.JSONB },
        ip_address: { type: Sequelize.STRING(50) },
        user_agent: { type: Sequelize.TEXT },
        metadata: { type: Sequelize.JSONB, defaultValue: {} },
        created_at: { type: Sequelize.DATE, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') }
      });
    }

    // INDEXES
    const addIdx = (t, f, n) => queryInterface.addIndex(t, f, { name: n }).catch(() => {});
    await addIdx('customers', ['tenant_id'], 'idx_customers_tenant');
    await addIdx('employees', ['tenant_id'], 'idx_employees_tenant');
    await addIdx('employee_schedules', ['employee_id'], 'idx_employee_schedules_employee');
    await addIdx('employee_attendance', ['employee_id'], 'idx_employee_attendance_employee');
    await addIdx('shifts', ['tenant_id'], 'idx_shifts_tenant');
    await addIdx('store_settings', ['tenant_id'], 'idx_store_settings_tenant');
    await addIdx('notifications', ['user_id', 'is_read'], 'idx_notifications_user');
    await addIdx('audit_logs', ['tenant_id'], 'idx_audit_logs_tenant');
    await addIdx('audit_logs', ['entity_type', 'entity_id'], 'idx_audit_logs_entity');

    console.log('✅ Part 1 tables created (customers, employees, schedules, shifts, settings, etc.)');
  },

  down: async (queryInterface) => {
    const drop = (t) => queryInterface.dropTable(t).catch(() => {});
    await drop('audit_logs');
    await drop('notifications');
    await drop('printers');
    await drop('store_settings');
    await drop('shifts');
    await drop('employee_attendance');
    await drop('employee_schedules');
    await drop('employees');
    await drop('customers');
  }
};
