'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Add stock_opname_id to returns
    const returnsDesc = await queryInterface.describeTable('returns').catch(() => null);
    if (!returnsDesc) {
      console.log('⚠️ Table "returns" does not exist, skipping migration');
      return;
    }

    if (!returnsDesc.stock_opname_id) {
      await queryInterface.addColumn('returns', 'stock_opname_id', {
        type: Sequelize.INTEGER,
        allowNull: true,
        comment: 'ID stock opname yang menjadi sumber retur'
      });
    }

    if (!returnsDesc.stock_opname_item_id) {
      await queryInterface.addColumn('returns', 'stock_opname_item_id', {
        type: Sequelize.INTEGER,
        allowNull: true,
        comment: 'ID item spesifik dari stock opname'
      });
    }

    if (!returnsDesc.source_type) {
      await queryInterface.addColumn('returns', 'source_type', {
        type: Sequelize.STRING(50),
        allowNull: true,
        defaultValue: 'manual',
        comment: 'Sumber retur: manual, stock_opname, customer, etc'
      });
    }

    // Add indexes
    await queryInterface.addIndex('returns', ['stock_opname_id'], {
      name: 'idx_returns_stock_opname_id',
      concurrently: false
    }).catch(() => {});

    await queryInterface.addIndex('returns', ['stock_opname_item_id'], {
      name: 'idx_returns_stock_opname_item_id',
      concurrently: false
    }).catch(() => {});

    await queryInterface.addIndex('returns', ['source_type'], {
      name: 'idx_returns_source_type',
      concurrently: false
    }).catch(() => {});

    // Add columns to stock_opname_items if table exists
    const soiDesc = await queryInterface.describeTable('stock_opname_items').catch(() => null);
    if (soiDesc) {
      if (!soiDesc.return_status) {
        await queryInterface.addColumn('stock_opname_items', 'return_status', {
          type: Sequelize.STRING(50),
          allowNull: true,
          defaultValue: 'not_returned',
          comment: 'Status retur: not_returned, pending_return, returned'
        });
      }

      if (!soiDesc.return_id) {
        await queryInterface.addColumn('stock_opname_items', 'return_id', {
          type: Sequelize.INTEGER,
          allowNull: true,
          comment: 'ID return jika sudah di-retur'
        });
      }

      await queryInterface.addIndex('stock_opname_items', ['return_status'], {
        name: 'idx_stock_opname_items_return_status',
        concurrently: false
      }).catch(() => {});
    }

    console.log('✅ Added stock opname columns to returns table');
  },

  down: async (queryInterface, Sequelize) => {
    const returnsDesc = await queryInterface.describeTable('returns').catch(() => null);
    if (returnsDesc) {
      if (returnsDesc.stock_opname_id) await queryInterface.removeColumn('returns', 'stock_opname_id');
      if (returnsDesc.stock_opname_item_id) await queryInterface.removeColumn('returns', 'stock_opname_item_id');
      if (returnsDesc.source_type) await queryInterface.removeColumn('returns', 'source_type');
    }

    const soiDesc = await queryInterface.describeTable('stock_opname_items').catch(() => null);
    if (soiDesc) {
      if (soiDesc.return_status) await queryInterface.removeColumn('stock_opname_items', 'return_status');
      if (soiDesc.return_id) await queryInterface.removeColumn('stock_opname_items', 'return_id');
    }
  }
};
