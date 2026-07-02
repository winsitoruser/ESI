'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('inventory_stock', 'batch_number', {
      type: Sequelize.STRING(100),
      allowNull: true,
      comment: 'Batch or lot number for tracking'
    });

    await queryInterface.addColumn('inventory_stock', 'expiry_date', {
      type: Sequelize.DATE,
      allowNull: true,
      comment: 'Expiry date for perishable items'
    });

    // Add index for batch_number for faster queries
    await queryInterface.addIndex('inventory_stock', ['batch_number'], {
      name: 'inventory_stock_batch_number_idx'
    });

    // Add index for expiry_date for faster queries
    await queryInterface.addIndex('inventory_stock', ['expiry_date'], {
      name: 'inventory_stock_expiry_date_idx'
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeIndex('inventory_stock', 'inventory_stock_expiry_date_idx');
    await queryInterface.removeIndex('inventory_stock', 'inventory_stock_batch_number_idx');
    await queryInterface.removeColumn('inventory_stock', 'expiry_date');
    await queryInterface.removeColumn('inventory_stock', 'batch_number');
  }
};
