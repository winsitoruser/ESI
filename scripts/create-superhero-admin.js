'use strict';

/**
 * Script: Create Superhero Superadmin Account
 * 
 * Creates a superadmin user named "Superhero" with full access
 * to ALL modules and platforms. Also creates the corresponding
 * Role record in the roles table.
 * 
 * Usage: node scripts/create-superhero-admin.js
 */

const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

async function createSuperheroAdmin() {
  let sequelize;
  
  try {
    const db = require('../models');
    sequelize = db.sequelize;

    console.log('🦸 Creating Superhero Superadmin Account...\n');

    // --- 1. Create or update Superhero Role in roles table ---
    const superheroPermissions = {
      // Dashboard
      'dashboard.view': true,
      'dashboard.analytics': true,
      // POS
      'pos.view': true,
      'pos.create_transaction': true,
      'pos.void_transaction': true,
      'pos.discount': true,
      'pos.refund': true,
      'pos.view_receipts': true,
      'pos.print_receipt': true,
      'pos.settings': true,
      // Products
      'products.view': true,
      'products.create': true,
      'products.edit': true,
      'products.delete': true,
      'products.import': true,
      'products.export': true,
      'products.manage_categories': true,
      'products.manage_stock': true,
      // Inventory
      'inventory.view': true,
      'inventory.stock_in': true,
      'inventory.stock_out': true,
      'inventory.stock_transfer': true,
      'inventory.stock_opname': true,
      'inventory.view_history': true,
      'inventory.settings': true,
      // Purchase
      'purchase.view': true,
      'purchase.create': true,
      'purchase.edit': true,
      'purchase.delete': true,
      'purchase.approve': true,
      'purchase.receive': true,
      'purchase.manage_suppliers': true,
      // Customers
      'customers.view': true,
      'customers.create': true,
      'customers.edit': true,
      'customers.delete': true,
      'customers.view_transactions': true,
      'customers.manage_loyalty': true,
      // Employees
      'employees.view': true,
      'employees.create': true,
      'employees.edit': true,
      'employees.delete': true,
      'employees.view_attendance': true,
      'employees.manage_payroll': true,
      // Finance
      'finance.view': true,
      'finance.view_cashflow': true,
      'finance.create_expense': true,
      'finance.edit_expense': true,
      'finance.delete_expense': true,
      'finance.view_income': true,
      'finance.manage_accounts': true,
      'finance.settings': true,
      // Reports
      'reports.view': true,
      'reports.sales': true,
      'reports.inventory': true,
      'reports.finance': true,
      'reports.customers': true,
      'reports.employees': true,
      'reports.export': true,
      'reports.print': true,
      // Promotions
      'promotions.view': true,
      'promotions.create': true,
      'promotions.edit': true,
      'promotions.delete': true,
      'promotions.activate': true,
      // Settings
      'settings.view': true,
      'settings.store': true,
      'settings.users': true,
      'settings.roles': true,
      'settings.security': true,
      'settings.backup': true,
      'settings.inventory': true,
      'settings.hardware': true,
      'settings.notifications': true,
      'settings.integrations': true,
      'settings.billing': true,
      'settings.appearance': true,
      // CRM
      'crm.view': true,
      'crm.create': true,
      'crm.edit': true,
      'crm.delete': true,
      'crm.import': true,
      'crm.export': true,
      'crm.manage_customers': true,
      'crm.manage_communications': true,
      'crm.manage_tasks': true,
      'crm.manage_tickets': true,
      'crm.manage_forecasting': true,
      'crm.manage_automation': true,
      'crm.approval': true,
      'crm.manage_settings': true,
      // SFA
      'sfa.view': true,
      'sfa.create': true,
      'sfa.edit': true,
      'sfa.delete': true,
      'sfa.manage_leads': true,
      'sfa.manage_pipeline': true,
      'sfa.manage_teams': true,
      'sfa.manage_visits': true,
      'sfa.manage_orders': true,
      'sfa.manage_targets': true,
      'sfa.manage_incentives': true,
      'sfa.manage_coverage': true,
      'sfa.manage_geofence': true,
      'sfa.approval': true
    };

    // Check if Role model exists and create role
    let roleId = null;
    try {
      const Role = db.Role || require('../models/Role');
      
      const [role, created] = await Role.findOrCreate({
        where: { name: 'Superhero' },
        defaults: {
          id: uuidv4(),
          name: 'Superhero',
          description: 'Super Admin - Full unrestricted access to all modules and platforms',
          permissions: superheroPermissions,
          isSystem: true
        }
      });

      if (!created) {
        // Update existing role with latest permissions
        await role.update({
          description: 'Super Admin - Full unrestricted access to all modules and platforms',
          permissions: superheroPermissions,
          isSystem: true
        });
        console.log('   Role "Superhero" updated with latest permissions.');
      } else {
        console.log('   Role "Superhero" created successfully.');
      }
      
      roleId = role.id;
    } catch (roleError) {
      console.log('   Note: Could not create Role record:', roleError.message);
      console.log('   Continuing with user creation (super_admin bypass will handle access)...');
    }

    // --- 2. Create or update Superhero User ---
    const SUPERHERO_EMAIL = 'superhero@bedagang.com';
    const SUPERHERO_PASSWORD = 'Superhero2026!';
    const hashedPassword = await bcrypt.hash(SUPERHERO_PASSWORD, 10);

    const existingUser = await db.User.findOne({
      where: { email: SUPERHERO_EMAIL }
    });

    if (existingUser) {
      await existingUser.update({
        name: 'Superhero',
        password: hashedPassword,
        role: 'super_admin',
        isActive: true,
        data_scope: 'all_branches',
        ...(roleId ? { roleId } : {})
      });
      console.log('   User "Superhero" updated successfully.');
    } else {
      await db.User.create({
        name: 'Superhero',
        email: SUPERHERO_EMAIL,
        phone: '+62-SUPERHERO',
        businessName: 'Bedagang Platform',
        password: hashedPassword,
        role: 'super_admin',
        tenantId: null, // Not tied to any tenant - access all
        assignedBranchId: null, // Not tied to any branch - access all
        dataScope: 'all_branches',
        isActive: true,
        ...(roleId ? { roleId } : {})
      });
      console.log('   User "Superhero" created successfully.');
    }

    // --- 3. Print summary ---
    console.log('\n' + '='.repeat(50));
    console.log('  SUPERHERO SUPERADMIN ACCOUNT');
    console.log('='.repeat(50));
    console.log(`  Email    : ${SUPERHERO_EMAIL}`);
    console.log(`  Password : ${SUPERHERO_PASSWORD}`);
    console.log(`  Role     : super_admin`);
    console.log(`  Name     : Superhero`);
    console.log(`  Scope    : ALL modules, ALL branches, ALL platforms`);
    console.log('='.repeat(50));
    console.log('\n  IMPORTANT: Change this password after first login!\n');

    process.exit(0);
  } catch (error) {
    console.error('\n  Error creating Superhero account:', error);
    process.exit(1);
  }
}

createSuperheroAdmin();
