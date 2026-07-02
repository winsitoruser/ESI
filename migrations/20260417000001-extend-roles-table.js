'use strict';

/**
 * Extend `roles` table dengan kolom tambahan untuk sistem Role & Privilege:
 *   - code        : kode unik upper_snake_case (ex: HQ_ADMIN, CASHIER)
 *   - level       : 1-6 (1=Super Admin, 6=Auditor)
 *   - data_scope  : all | tenant | region | branch | team | own
 *   - is_active   : boolean
 *   - user_count  : cache number of users assigned (opsional; dihitung query juga bisa)
 *
 * Juga seed 9 role preset (Superhero, HQ Admin, Branch Manager, Supervisor,
 * Kasir, Staff Gudang, Staff Keuangan, Staff HRD, Auditor) bila belum ada.
 */

const PRESETS = [
  {
    code: 'SUPERHERO',
    name: 'Superhero',
    description: 'Super Admin platform — akses penuh lintas-tenant',
    level: 1,
    data_scope: 'all',
    is_system: true,
    wildcard: '*'
  },
  {
    code: 'HQ_ADMIN',
    name: 'HQ Administrator',
    description: 'Admin tenant, akses penuh kecuali platform settings',
    level: 2,
    data_scope: 'tenant',
    is_system: true,
    wildcard: 'tenant_admin'
  },
  {
    code: 'BRANCH_MANAGER',
    name: 'Branch Manager',
    description: 'Manajer cabang — approval level 1',
    level: 3,
    data_scope: 'branch',
    is_system: true,
    wildcard: 'branch_manager'
  },
  {
    code: 'SUPERVISOR',
    name: 'Supervisor',
    description: 'Supervisor tim — approval terbatas',
    level: 4,
    data_scope: 'team',
    is_system: true,
    wildcard: 'supervisor'
  },
  {
    code: 'CASHIER',
    name: 'Kasir',
    description: 'Staff kasir — operasi POS saja',
    level: 5,
    data_scope: 'own',
    is_system: true,
    wildcard: 'cashier'
  },
  {
    code: 'WAREHOUSE',
    name: 'Staff Gudang',
    description: 'Staff gudang — manajemen stok',
    level: 5,
    data_scope: 'branch',
    is_system: true,
    wildcard: 'warehouse'
  },
  {
    code: 'FINANCE_STAFF',
    name: 'Staff Keuangan',
    description: 'Staff keuangan — input & posting transaksi',
    level: 5,
    data_scope: 'tenant',
    is_system: true,
    wildcard: 'finance'
  },
  {
    code: 'HR_STAFF',
    name: 'Staff HRD',
    description: 'Staff HRD — kelola data karyawan & kehadiran',
    level: 5,
    data_scope: 'tenant',
    is_system: true,
    wildcard: 'hr'
  },
  {
    code: 'AUDITOR',
    name: 'Auditor (Read-only)',
    description: 'Read-only untuk audit',
    level: 6,
    data_scope: 'tenant',
    is_system: true,
    wildcard: 'auditor'
  }
];

// Built-in permission sets per preset (subset penting — selebihnya di-expand oleh
// katalog runtime lib/permissions/permissions-catalog.ts). Disini kita simpan yg
// paling representatif agar DB punya baseline konsisten.
const PERMS = {
  all: { '*': true },
  tenant_admin: {
    'dashboard.view': true, 'dashboard.analytics': true, 'reports.view': true,
    'reports.sales': true, 'reports.inventory': true, 'reports.finance': true,
    'reports.hris': true, 'reports.export': true, 'reports.print': true,
    'pos.view': true, 'pos.create_transaction': true, 'pos.void_transaction': true,
    'pos.refund': true, 'pos.discount': true, 'pos.close_shift': true, 'pos.reprint': true,
    'products.view': true, 'products.create': true, 'products.update': true,
    'products.delete': true, 'products.import': true, 'products.export': true,
    'inventory.view': true, 'inventory.stock_in': true, 'inventory.stock_out': true,
    'inventory.transfer': true, 'inventory.approve_transfer': true, 'inventory.stock_opname': true,
    'inventory.view_history': true, 'purchase.view': true, 'purchase.create': true,
    'purchase.update': true, 'purchase.approve': true, 'purchase.receive': true,
    'customers.view': true, 'customers.create': true, 'customers.update': true,
    'customers.view_transactions': true, 'customers.manage_loyalty': true,
    'employees.view': true, 'employees.create': true, 'employees.update': true,
    'attendance.view_all': true, 'attendance.manage': true, 'attendance.approve': true,
    'leave.view': true, 'leave.approve': true, 'payroll.view': true, 'payroll.run': true,
    'payroll.approve': true, 'finance.view': true, 'finance.view_cashflow': true,
    'finance.view_pnl': true, 'finance_transactions.view': true, 'finance_transactions.create': true,
    'finance_transactions.approve': true, 'finance_expenses.view': true, 'finance_expenses.create': true,
    'finance_expenses.approve': true, 'finance_invoices.view': true, 'finance_invoices.create': true,
    'finance_invoices.send': true, 'branches.view': true, 'branches.performance': true,
    'users.view': true, 'users.create': true, 'users.update': true, 'users.role_assign': true,
    'roles.view': true, 'roles.create': true, 'roles.update': true,
    'settings.view': true, 'settings.store': true, 'settings.appearance': true
  },
  branch_manager: {
    'dashboard.view': true, 'dashboard.analytics': true,
    'reports.view': true, 'reports.sales': true, 'reports.inventory': true,
    'pos.view': true, 'pos.create_transaction': true, 'pos.void_transaction': true,
    'pos.refund': true, 'pos.discount': true, 'pos.close_shift': true, 'pos.reprint': true,
    'products.view': true, 'products.create': true, 'products.update': true,
    'inventory.view': true, 'inventory.stock_in': true, 'inventory.stock_out': true,
    'inventory.transfer': true, 'inventory.approve_transfer': true, 'inventory.stock_opname': true,
    'purchase.view': true, 'purchase.create': true, 'purchase.approve': true, 'purchase.receive': true,
    'requisitions.view': true, 'requisitions.create': true, 'requisitions.approve': true,
    'customers.view': true, 'customers.create': true, 'customers.update': true,
    'employees.view': true, 'attendance.view_all': true, 'attendance.approve': true,
    'leave.view': true, 'leave.approve': true, 'overtime.view': true, 'overtime.approve': true,
    'branches.view': true, 'branches.performance': true
  },
  supervisor: {
    'dashboard.view': true, 'pos.view': true, 'pos.create_transaction': true,
    'pos.void_transaction': true, 'pos.discount': true, 'pos.close_shift': true, 'pos.reprint': true,
    'customers.view': true, 'customers.create': true, 'customers.update': true,
    'products.view': true, 'inventory.view': true, 'inventory.stock_in': true,
    'inventory.stock_out': true, 'attendance.view_all': true, 'attendance.manage': true,
    'leave.view': true, 'leave.approve': true, 'overtime.view': true, 'overtime.approve': true,
    'reports.view': true, 'reports.sales': true
  },
  cashier: {
    'dashboard.view': true, 'pos.view': true, 'pos.create_transaction': true,
    'pos.discount': true, 'pos.reprint': true, 'pos.close_shift': true,
    'customers.view': true, 'customers.create': true, 'customers.update': true,
    'customers.manage_loyalty': true, 'products.view': true, 'promotions.view': true,
    'inventory.view': true
  },
  warehouse: {
    'dashboard.view': true, 'products.view': true, 'inventory.view': true,
    'inventory.stock_in': true, 'inventory.stock_out': true, 'inventory.transfer': true,
    'inventory.stock_opname': true, 'inventory.view_history': true,
    'purchase.view': true, 'purchase.receive': true,
    'requisitions.view': true, 'requisitions.create': true
  },
  finance: {
    'dashboard.view': true, 'finance.view': true, 'finance.view_cashflow': true,
    'finance.view_revenue': true, 'finance_accounts.view': true,
    'finance_transactions.view': true, 'finance_transactions.create': true,
    'finance_transactions.update': true, 'finance_expenses.view': true,
    'finance_expenses.create': true, 'finance_expenses.update': true,
    'finance_invoices.view': true, 'finance_invoices.create': true, 'finance_invoices.send': true,
    'finance_tax.view': true, 'reports.view': true, 'reports.finance': true, 'reports.export': true
  },
  hr: {
    'dashboard.view': true, 'employees.view': true, 'employees.create': true,
    'employees.update': true, 'organization.view': true, 'organization.update': true,
    'attendance.view': true, 'attendance.view_all': true, 'attendance.manage': true,
    'leave.view': true, 'leave.create': true, 'leave.update': true,
    'overtime.view': true, 'overtime.create': true, 'overtime.update': true,
    'recruitment.view': true, 'recruitment.create': true, 'recruitment.update': true,
    'training.view': true, 'performance.view': true, 'reports.view': true, 'reports.hris': true
  },
  auditor: {
    'dashboard.view': true, 'dashboard.analytics': true,
    'reports.view': true, 'reports.sales': true, 'reports.inventory': true,
    'reports.finance': true, 'reports.hris': true, 'reports.export': true,
    'audit.view': true, 'audit.export': true,
    'pos.view': true, 'customers.view': true, 'products.view': true,
    'inventory.view': true, 'inventory.view_history': true, 'purchase.view': true,
    'finance.view': true, 'finance.view_cashflow': true, 'finance.view_pnl': true,
    'employees.view': true, 'attendance.view_all': true, 'leave.view': true,
    'payroll.view': true, 'branches.view': true, 'branches.performance': true
  }
};

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const desc = await queryInterface.describeTable('roles').catch(() => null);
    if (!desc) {
      // Roles table tidak ada, skip — migrasi sebelumnya akan membuatnya
      console.log('[extend-roles] roles table belum ada, skip');
      return;
    }

    // --- Add new columns (idempotent) ---------------------------------
    if (!desc.code) {
      await queryInterface.addColumn('roles', 'code', {
        type: Sequelize.STRING(50),
        allowNull: true
      });
      // Buat unique index utk code (kalau null akan di-skip ole PG kalau partial)
      await queryInterface.sequelize.query(
        `CREATE UNIQUE INDEX IF NOT EXISTS roles_code_unique_idx ON roles(code) WHERE code IS NOT NULL`
      ).catch(() => {});
    }
    if (!desc.level) {
      await queryInterface.addColumn('roles', 'level', {
        type: Sequelize.INTEGER,
        defaultValue: 5
      });
    }
    if (!desc.data_scope) {
      await queryInterface.addColumn('roles', 'data_scope', {
        type: Sequelize.STRING(20),
        defaultValue: 'branch'
      });
    }
    if (!desc.is_active) {
      await queryInterface.addColumn('roles', 'is_active', {
        type: Sequelize.BOOLEAN,
        defaultValue: true
      });
    }
    if (!desc.user_count) {
      await queryInterface.addColumn('roles', 'user_count', {
        type: Sequelize.INTEGER,
        defaultValue: 0
      });
    }

    // Backfill code untuk role existing dari name (uppercase)
    await queryInterface.sequelize.query(`
      UPDATE roles SET code = UPPER(REPLACE(name, ' ', '_'))
      WHERE code IS NULL
    `).catch(() => {});

    // --- Seed preset roles --------------------------------------------
    for (const preset of PRESETS) {
      const perms = PERMS[preset.wildcard] || {};
      const permsJson = JSON.stringify(perms);

      await queryInterface.sequelize.query(`
        INSERT INTO roles (id, code, name, description, level, data_scope, permissions, is_system, is_active, user_count, created_at, updated_at)
        VALUES (gen_random_uuid(), :code, :name, :description, :level, :data_scope, :permissions::jsonb, :is_system, true, 0, NOW(), NOW())
        ON CONFLICT (code) DO UPDATE SET
          description = EXCLUDED.description,
          level       = EXCLUDED.level,
          data_scope  = EXCLUDED.data_scope,
          is_system   = EXCLUDED.is_system,
          updated_at  = NOW()
      `, {
        replacements: {
          code: preset.code,
          name: preset.name,
          description: preset.description,
          level: preset.level,
          data_scope: preset.data_scope,
          permissions: permsJson,
          is_system: preset.is_system
        }
      }).catch((err) => {
        console.warn(`[extend-roles] seed ${preset.code} warn:`, err.message);
      });
    }

    console.log('✅ roles table extended & preset seeded');
  },

  down: async (queryInterface) => {
    await queryInterface.sequelize.query(
      `DROP INDEX IF EXISTS roles_code_unique_idx`
    ).catch(() => {});
    await queryInterface.removeColumn('roles', 'user_count').catch(() => {});
    await queryInterface.removeColumn('roles', 'is_active').catch(() => {});
    await queryInterface.removeColumn('roles', 'data_scope').catch(() => {});
    await queryInterface.removeColumn('roles', 'level').catch(() => {});
    await queryInterface.removeColumn('roles', 'code').catch(() => {});
  }
};
