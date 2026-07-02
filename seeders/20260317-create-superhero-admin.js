'use strict';

const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const hashedPassword = await bcrypt.hash('Superhero2026!', 10);

    const superheroPermissions = {
      'dashboard.view': true, 'dashboard.analytics': true,
      'pos.view': true, 'pos.create_transaction': true, 'pos.void_transaction': true,
      'pos.discount': true, 'pos.refund': true, 'pos.view_receipts': true,
      'pos.print_receipt': true, 'pos.settings': true,
      'products.view': true, 'products.create': true, 'products.edit': true,
      'products.delete': true, 'products.import': true, 'products.export': true,
      'products.manage_categories': true, 'products.manage_stock': true,
      'inventory.view': true, 'inventory.stock_in': true, 'inventory.stock_out': true,
      'inventory.stock_transfer': true, 'inventory.stock_opname': true,
      'inventory.view_history': true, 'inventory.settings': true,
      'purchase.view': true, 'purchase.create': true, 'purchase.edit': true,
      'purchase.delete': true, 'purchase.approve': true, 'purchase.receive': true,
      'purchase.manage_suppliers': true,
      'customers.view': true, 'customers.create': true, 'customers.edit': true,
      'customers.delete': true, 'customers.view_transactions': true,
      'customers.manage_loyalty': true,
      'employees.view': true, 'employees.create': true, 'employees.edit': true,
      'employees.delete': true, 'employees.view_attendance': true,
      'employees.manage_payroll': true,
      'finance.view': true, 'finance.view_cashflow': true, 'finance.create_expense': true,
      'finance.edit_expense': true, 'finance.delete_expense': true,
      'finance.view_income': true, 'finance.manage_accounts': true, 'finance.settings': true,
      'reports.view': true, 'reports.sales': true, 'reports.inventory': true,
      'reports.finance': true, 'reports.customers': true, 'reports.employees': true,
      'reports.export': true, 'reports.print': true,
      'promotions.view': true, 'promotions.create': true, 'promotions.edit': true,
      'promotions.delete': true, 'promotions.activate': true,
      'settings.view': true, 'settings.store': true, 'settings.users': true,
      'settings.roles': true, 'settings.security': true, 'settings.backup': true,
      'settings.inventory': true, 'settings.hardware': true, 'settings.notifications': true,
      'settings.integrations': true, 'settings.billing': true, 'settings.appearance': true,
      'crm.view': true, 'crm.create': true, 'crm.edit': true, 'crm.delete': true,
      'crm.import': true, 'crm.export': true, 'crm.manage_customers': true,
      'crm.manage_communications': true, 'crm.manage_tasks': true,
      'crm.manage_tickets': true, 'crm.manage_forecasting': true,
      'crm.manage_automation': true, 'crm.approval': true, 'crm.manage_settings': true,
      'sfa.view': true, 'sfa.create': true, 'sfa.edit': true, 'sfa.delete': true,
      'sfa.manage_leads': true, 'sfa.manage_pipeline': true, 'sfa.manage_teams': true,
      'sfa.manage_visits': true, 'sfa.manage_orders': true, 'sfa.manage_targets': true,
      'sfa.manage_incentives': true, 'sfa.manage_coverage': true,
      'sfa.manage_geofence': true, 'sfa.approval': true
    };

    // Create Superhero role
    const roleId = uuidv4();
    try {
      await queryInterface.bulkInsert('roles', [{
        id: roleId,
        name: 'Superhero',
        description: 'Super Admin - Full unrestricted access to all modules and platforms',
        permissions: JSON.stringify(superheroPermissions),
        is_system: true,
        created_at: new Date(),
        updated_at: new Date()
      }]);
      console.log('✅ Superhero role created');
    } catch (e) {
      console.log('⚠️  Superhero role may already exist, skipping:', e.message);
    }

    // Create Superhero user
    try {
      await queryInterface.bulkInsert('users', [{
        name: 'Superhero',
        email: 'superhero@bedagang.com',
        phone: '+62-SUPERHERO',
        business_name: 'Bedagang Platform',
        password: hashedPassword,
        role: 'super_admin',
        tenant_id: null,
        assigned_branch_id: null,
        data_scope: 'all_branches',
        is_active: true,
        last_login: null,
        created_at: new Date(),
        updated_at: new Date()
      }]);
      console.log('✅ Superhero user created');
    } catch (e) {
      console.log('⚠️  Superhero user may already exist, skipping:', e.message);
    }

    console.log('\n🦸 SUPERHERO SUPERADMIN ACCOUNT:');
    console.log('   Email    : superhero@bedagang.com');
    console.log('   Password : Superhero2026!');
    console.log('   Role     : super_admin');
    console.log('   Access   : ALL modules, ALL branches, ALL platforms');
    console.log('   ⚠️  IMPORTANT: Change password after first login!');
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.bulkDelete('users', {
      email: 'superhero@bedagang.com'
    });
    await queryInterface.bulkDelete('roles', {
      name: 'Superhero'
    });
  }
};
