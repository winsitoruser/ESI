'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // 1. Add role_id column to users table
    const usersDesc = await queryInterface.describeTable('users');
    if (!usersDesc.role_id) {
      await queryInterface.addColumn('users', 'role_id', { type: Sequelize.UUID });
      await queryInterface.addIndex('users', ['role_id'], { name: 'idx_users_role_id' }).catch(() => {});
    }

    // Add foreign key (catch if already exists)
    await queryInterface.sequelize.query(`
      ALTER TABLE users ADD CONSTRAINT fk_users_role
      FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE SET NULL
    `).catch(() => {});

    // 2. Add is_system column to roles table
    const rolesDesc = await queryInterface.describeTable('roles').catch(() => null);
    if (rolesDesc && !rolesDesc.is_system) {
      await queryInterface.addColumn('roles', 'is_system', {
        type: Sequelize.BOOLEAN,
        defaultValue: false
      });
    }

    // 3. Insert default roles with permissions
    const adminPerms = JSON.stringify({
      "dashboard.view": true, "dashboard.analytics": true,
      "pos.view": true, "pos.create_transaction": true, "pos.void_transaction": true,
      "pos.discount": true, "pos.refund": true, "pos.view_receipts": true,
      "pos.print_receipt": true, "pos.settings": true,
      "products.view": true, "products.create": true, "products.edit": true,
      "products.delete": true, "products.import": true, "products.export": true,
      "products.manage_categories": true, "products.manage_stock": true,
      "inventory.view": true, "inventory.stock_in": true, "inventory.stock_out": true,
      "inventory.stock_transfer": true, "inventory.stock_opname": true,
      "inventory.view_history": true, "inventory.settings": true,
      "purchase.view": true, "purchase.create": true, "purchase.edit": true,
      "purchase.delete": true, "purchase.approve": true, "purchase.receive": true,
      "purchase.manage_suppliers": true,
      "customers.view": true, "customers.create": true, "customers.edit": true,
      "customers.delete": true, "customers.view_transactions": true, "customers.manage_loyalty": true,
      "employees.view": true, "employees.create": true, "employees.edit": true,
      "employees.delete": true, "employees.view_attendance": true, "employees.manage_payroll": true,
      "finance.view": true, "finance.view_cashflow": true, "finance.create_expense": true,
      "finance.edit_expense": true, "finance.delete_expense": true, "finance.view_income": true,
      "finance.manage_accounts": true, "finance.settings": true,
      "reports.view": true, "reports.sales": true, "reports.inventory": true,
      "reports.finance": true, "reports.customers": true, "reports.employees": true,
      "reports.export": true, "reports.print": true,
      "promotions.view": true, "promotions.create": true, "promotions.edit": true,
      "promotions.delete": true, "promotions.activate": true,
      "settings.view": true, "settings.store": true, "settings.users": true,
      "settings.roles": true, "settings.security": true, "settings.backup": true,
      "settings.inventory": true, "settings.hardware": true, "settings.notifications": true,
      "settings.integrations": true, "settings.billing": true, "settings.appearance": true
    });

    const managerPerms = JSON.stringify({
      "dashboard.view": true, "dashboard.analytics": true,
      "pos.view": true, "pos.create_transaction": true, "pos.void_transaction": true,
      "pos.discount": true, "pos.refund": true, "pos.view_receipts": true,
      "pos.print_receipt": true, "pos.settings": false,
      "products.view": true, "products.create": true, "products.edit": true,
      "products.delete": false, "products.import": true, "products.export": true,
      "products.manage_categories": true, "products.manage_stock": true,
      "inventory.view": true, "inventory.stock_in": true, "inventory.stock_out": true,
      "inventory.stock_transfer": true, "inventory.stock_opname": true,
      "inventory.view_history": true, "inventory.settings": false,
      "purchase.view": true, "purchase.create": true, "purchase.edit": true,
      "purchase.delete": false, "purchase.approve": true, "purchase.receive": true,
      "purchase.manage_suppliers": true,
      "customers.view": true, "customers.create": true, "customers.edit": true,
      "customers.delete": false, "customers.view_transactions": true, "customers.manage_loyalty": true,
      "employees.view": true, "employees.create": false, "employees.edit": false,
      "employees.delete": false, "employees.view_attendance": true, "employees.manage_payroll": false,
      "finance.view": true, "finance.view_cashflow": true, "finance.create_expense": true,
      "finance.edit_expense": true, "finance.delete_expense": false, "finance.view_income": true,
      "finance.manage_accounts": false, "finance.settings": false,
      "reports.view": true, "reports.sales": true, "reports.inventory": true,
      "reports.finance": true, "reports.customers": true, "reports.employees": true,
      "reports.export": true, "reports.print": true,
      "promotions.view": true, "promotions.create": true, "promotions.edit": true,
      "promotions.delete": false, "promotions.activate": true,
      "settings.view": true, "settings.store": false, "settings.users": false,
      "settings.roles": false, "settings.security": false, "settings.backup": false,
      "settings.inventory": true, "settings.hardware": true, "settings.notifications": true,
      "settings.integrations": false, "settings.billing": false, "settings.appearance": false
    });

    const cashierPerms = JSON.stringify({
      "dashboard.view": true, "dashboard.analytics": false,
      "pos.view": true, "pos.create_transaction": true, "pos.void_transaction": false,
      "pos.discount": true, "pos.refund": false, "pos.view_receipts": true,
      "pos.print_receipt": true, "pos.settings": false,
      "products.view": true, "products.create": false, "products.edit": false, "products.delete": false,
      "customers.view": true, "customers.create": true, "customers.edit": true,
      "customers.delete": false, "customers.view_transactions": true, "customers.manage_loyalty": true,
      "inventory.view": true, "promotions.view": true
    });

    const staffPerms = JSON.stringify({
      "dashboard.view": true, "dashboard.analytics": false,
      "pos.view": true, "pos.create_transaction": true, "pos.void_transaction": false,
      "pos.discount": false, "pos.refund": false, "pos.view_receipts": true, "pos.print_receipt": true,
      "products.view": true, "customers.view": true, "inventory.view": true, "promotions.view": true
    });

    const roles = [
      { name: 'admin', description: 'Administrator with full access to all features', permissions: adminPerms },
      { name: 'manager', description: 'Manager with access to most features except critical settings', permissions: managerPerms },
      { name: 'cashier', description: 'Cashier for POS operations and basic customer management', permissions: cashierPerms },
      { name: 'staff', description: 'Staff with basic access to POS and inventory', permissions: staffPerms },
    ];

    for (const role of roles) {
      await queryInterface.sequelize.query(`
        INSERT INTO roles (id, name, description, permissions, is_system, created_at, updated_at)
        VALUES (gen_random_uuid(), :name, :description, :permissions::jsonb, true, NOW(), NOW())
        ON CONFLICT (name) DO UPDATE SET
          description = EXCLUDED.description,
          permissions = EXCLUDED.permissions,
          is_system = EXCLUDED.is_system,
          updated_at = NOW()
      `, { replacements: role });
    }

    // 4. Update existing users with role_id
    const roleUpdates = [
      { roleName: 'admin', userRole: 'admin' },
      { roleName: 'manager', userRole: 'manager' },
      { roleName: 'cashier', userRole: 'cashier' },
      { roleName: 'staff', userRole: 'staff' },
    ];

    for (const { roleName, userRole } of roleUpdates) {
      await queryInterface.sequelize.query(`
        UPDATE users u SET role_id = r.id
        FROM roles r
        WHERE r.name = :roleName AND (u.role = :userRole ${userRole === 'staff' ? "OR u.role IS NULL" : ''})
        AND u.role_id IS NULL
      `, { replacements: { roleName, userRole } }).catch(() => {});
    }

    console.log('✅ Role & permissions integration complete');
  },

  down: async (queryInterface) => {
    await queryInterface.sequelize.query('ALTER TABLE users DROP CONSTRAINT IF EXISTS fk_users_role').catch(() => {});
    await queryInterface.removeColumn('users', 'role_id').catch(() => {});
    await queryInterface.removeColumn('roles', 'is_system').catch(() => {});
  }
};
