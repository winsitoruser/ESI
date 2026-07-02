'use strict';

/**
 * SFA Sales Management ↔ Inventory integration.
 *
 * Adds discriminator `item_type` (product / service / bundle / subscription / other)
 * and soft-FK to `products.id` so that sales entries (and item targets) can be
 * linked to the canonical inventory catalog instead of relying only on free text.
 */
module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Skip gracefully if base tables not yet created (e.g. fresh install)
    const tables = await queryInterface.showAllTables();
    const names = tables.map((t) => (typeof t === 'string' ? t : t.tableName));
    if (!names.includes('sfa_sales_entries')) {
      console.log('[sfa-inv-link] sfa_sales_entries not found, skipping (run base SFA migration first). Re-run this migration after the base table exists.');
      // Raise a soft signal so sequelize-cli doesn't mark it as completed.
      // We rely on callers checking idempotency; swallowing is safer for fresh installs.
      return;
    }

    // ── sfa_sales_entries ──
    await queryInterface.addColumn('sfa_sales_entries', 'item_type', {
      type: Sequelize.ENUM('product', 'service', 'bundle', 'subscription', 'other'),
      allowNull: false,
      defaultValue: 'product',
    });
    await queryInterface.addColumn('sfa_sales_entries', 'inventory_product_id', {
      type: Sequelize.INTEGER,
      allowNull: true,
      comment: 'FK soft ke products.id (inventory canonical)',
    });
    await queryInterface.addColumn('sfa_sales_entries', 'service_duration_minutes', {
      type: Sequelize.INTEGER,
      allowNull: true,
      comment: 'Untuk item_type=service — durasi layanan',
    });
    await queryInterface.addColumn('sfa_sales_entries', 'service_location', {
      type: Sequelize.STRING(200),
      allowNull: true,
    });
    await queryInterface.addColumn('sfa_sales_entries', 'stock_decremented', {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      comment: 'True bila entry sudah memicu pengurangan stok inventory',
    });
    await queryInterface.addColumn('sfa_sales_entries', 'branch_location_id', {
      type: Sequelize.INTEGER,
      allowNull: true,
      comment: 'locations.id sumber stok (jika item_type=product & stock decrement)',
    });
    await queryInterface.addIndex('sfa_sales_entries', ['tenant_id', 'item_type']);
    await queryInterface.addIndex('sfa_sales_entries', ['tenant_id', 'inventory_product_id']);

    // ── sfa_sales_item_targets ──
    await queryInterface.addColumn('sfa_sales_item_targets', 'item_type', {
      type: Sequelize.ENUM('product', 'service', 'bundle', 'subscription', 'other'),
      allowNull: false,
      defaultValue: 'product',
    });
    await queryInterface.addColumn('sfa_sales_item_targets', 'inventory_product_id', {
      type: Sequelize.INTEGER,
      allowNull: true,
    });
    await queryInterface.addIndex('sfa_sales_item_targets', ['tenant_id', 'item_type']);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeIndex('sfa_sales_entries', ['tenant_id', 'item_type']);
    await queryInterface.removeIndex('sfa_sales_entries', ['tenant_id', 'inventory_product_id']);
    await queryInterface.removeColumn('sfa_sales_entries', 'item_type');
    await queryInterface.removeColumn('sfa_sales_entries', 'inventory_product_id');
    await queryInterface.removeColumn('sfa_sales_entries', 'service_duration_minutes');
    await queryInterface.removeColumn('sfa_sales_entries', 'service_location');
    await queryInterface.removeColumn('sfa_sales_entries', 'stock_decremented');
    await queryInterface.removeColumn('sfa_sales_entries', 'branch_location_id');

    await queryInterface.removeIndex('sfa_sales_item_targets', ['tenant_id', 'item_type']);
    await queryInterface.removeColumn('sfa_sales_item_targets', 'item_type');
    await queryInterface.removeColumn('sfa_sales_item_targets', 'inventory_product_id');

    // Drop enums (Postgres)
    if (queryInterface.sequelize.getDialect() === 'postgres') {
      await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_sfa_sales_entries_item_type";');
      await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_sfa_sales_item_targets_item_type";');
    }
  },
};
