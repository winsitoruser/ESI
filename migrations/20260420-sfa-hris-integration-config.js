'use strict';

/**
 * SFA Advanced Integration Enhancements
 *
 * Menambahkan kolom-kolom agar integrasi SFA menjadi first-class:
 *   1. Salesperson ↔ HRIS (hris_employee_id) pada entries & targets
 *   2. Penegakan "produk fisik harus terhubung ke inventory" via kolom require_inventory_link
 *   3. Tabel konfigurasi sfa_integration_config per tenant untuk mengatur kebijakan:
 *        - Apakah produk fisik wajib dipilih dari inventory?
 *        - Apakah salesperson wajib di-link dari HRIS?
 *        - Auto-decrement stok? Allow negative stock? dll.
 */
module.exports = {
  up: async (queryInterface, Sequelize) => {
    // ── sfa_sales_entries enrichment ─────────────────────────────
    const entriesCols = await queryInterface.describeTable('sfa_sales_entries').catch(() => ({}));

    if (!entriesCols.hris_employee_id) {
      await queryInterface.addColumn('sfa_sales_entries', 'hris_employee_id', {
        type: Sequelize.UUID,
        allowNull: true,
        comment: 'FK soft ke hris_employees.id — salesperson yg ter-link HRIS',
      });
      await queryInterface.addIndex('sfa_sales_entries', ['tenant_id', 'hris_employee_id']);
    }
    if (!entriesCols.salesperson_user_id) {
      await queryInterface.addColumn('sfa_sales_entries', 'salesperson_user_id', {
        type: Sequelize.INTEGER,
        allowNull: true,
        comment: 'FK soft ke users.id — app account salesperson',
      });
    }
    if (!entriesCols.salesperson_employee_number) {
      await queryInterface.addColumn('sfa_sales_entries', 'salesperson_employee_number', {
        type: Sequelize.STRING(50),
        allowNull: true,
      });
    }
    if (!entriesCols.salesperson_department) {
      await queryInterface.addColumn('sfa_sales_entries', 'salesperson_department', {
        type: Sequelize.STRING(120),
        allowNull: true,
      });
    }

    // ── sfa_sales_item_targets enrichment ────────────────────────
    const targetCols = await queryInterface.describeTable('sfa_sales_item_targets').catch(() => ({}));

    if (!targetCols.require_inventory_link) {
      await queryInterface.addColumn('sfa_sales_item_targets', 'require_inventory_link', {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true,
        comment: 'True: target fisik harus link ke inventory_product_id',
      });
    }
    if (!targetCols.hris_employee_id) {
      await queryInterface.addColumn('sfa_sales_item_targets', 'hris_employee_id', {
        type: Sequelize.UUID,
        allowNull: true,
        comment: 'Salesperson target — link ke HRIS',
      });
    }
    if (!targetCols.salesperson_user_id) {
      await queryInterface.addColumn('sfa_sales_item_targets', 'salesperson_user_id', {
        type: Sequelize.INTEGER,
        allowNull: true,
      });
    }
    if (!targetCols.product_unit) {
      await queryInterface.addColumn('sfa_sales_item_targets', 'product_unit', {
        type: Sequelize.STRING(20),
        allowNull: true,
        comment: 'Snapshot unit saat target dibuat',
      });
    }
    if (!targetCols.product_category_id) {
      await queryInterface.addColumn('sfa_sales_item_targets', 'product_category_id', {
        type: Sequelize.INTEGER,
        allowNull: true,
      });
    }
    if (!targetCols.stock_snapshot_qty) {
      await queryInterface.addColumn('sfa_sales_item_targets', 'stock_snapshot_qty', {
        type: Sequelize.DECIMAL(18, 3),
        allowNull: true,
        comment: 'Snapshot stok tersedia saat target dibuat (referensi)',
      });
    }

    // ── sfa_integration_config table ─────────────────────────────
    await queryInterface.createTable('sfa_integration_config', {
      id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
      tenant_id: { type: Sequelize.UUID, allowNull: true, unique: true },

      // Inventory integration rules
      require_inventory_for_physical_targets: { type: Sequelize.BOOLEAN, defaultValue: true,
        comment: 'Jika true, target dgn item_type=product wajib link inventory_product_id' },
      require_inventory_for_physical_entries: { type: Sequelize.BOOLEAN, defaultValue: true,
        comment: 'Jika true, sales entry dgn item_type=product wajib link inventory_product_id' },
      allow_non_physical_without_inventory: { type: Sequelize.BOOLEAN, defaultValue: true,
        comment: 'Izinkan service/subscription/other tanpa inventory link' },
      auto_decrement_stock: { type: Sequelize.BOOLEAN, defaultValue: true,
        comment: 'Secara default centang "kurangi stok" pada entry baru' },
      allow_negative_stock: { type: Sequelize.BOOLEAN, defaultValue: false,
        comment: 'Izinkan stok turun di bawah 0 saat entry' },
      auto_snapshot_stock_on_target: { type: Sequelize.BOOLEAN, defaultValue: true,
        comment: 'Otomatis simpan stock_snapshot_qty saat target dibuat' },

      // HRIS integration rules
      require_hris_for_salespersons: { type: Sequelize.BOOLEAN, defaultValue: true,
        comment: 'Jika true, salesperson pada entry wajib di-link ke HRIS' },
      require_hris_for_sp_targets: { type: Sequelize.BOOLEAN, defaultValue: false,
        comment: 'Jika true, target scope=salesperson wajib di-link ke HRIS' },
      auto_sync_on_field_orders: { type: Sequelize.BOOLEAN, defaultValue: true,
        comment: 'Otomatis link HRIS saat import dari field orders' },
      hris_sales_departments: { type: Sequelize.JSONB, defaultValue: ['Sales', 'Marketing', 'Field Force'],
        comment: 'Department yg dianggap sales-eligible di HRIS' },

      // CRM integration (future-ready)
      link_outlet_to_crm_customer: { type: Sequelize.BOOLEAN, defaultValue: true },

      // Audit
      last_updated_by: { type: Sequelize.INTEGER, allowNull: true },
      notes: { type: Sequelize.TEXT, allowNull: true },
      created_at: { type: Sequelize.DATE, defaultValue: Sequelize.fn('NOW') },
      updated_at: { type: Sequelize.DATE, defaultValue: Sequelize.fn('NOW') },
    });

    await queryInterface.addIndex('sfa_integration_config', ['tenant_id'], { unique: true, name: 'sfa_integration_config_tenant_unique' });
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable('sfa_integration_config').catch(() => {});

    const dropCols = async (table, cols) => {
      for (const c of cols) {
        await queryInterface.removeColumn(table, c).catch(() => {});
      }
    };
    await dropCols('sfa_sales_entries', ['hris_employee_id', 'salesperson_user_id', 'salesperson_employee_number', 'salesperson_department']);
    await dropCols('sfa_sales_item_targets', ['require_inventory_link', 'hris_employee_id', 'salesperson_user_id', 'product_unit', 'product_category_id', 'stock_snapshot_qty']);
  },
};
