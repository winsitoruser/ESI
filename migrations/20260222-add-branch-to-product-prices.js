'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Add branchId to ProductPrice for regional pricing
    await queryInterface.addColumn('product_prices', 'branch_id', {
      type: Sequelize.UUID,
      allowNull: true, // null means default price for all branches
      references: {
        model: 'branches',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE'
    });

    // Add index for performance
    await queryInterface.addIndex('product_prices', ['product_id', 'branch_id'], {
      unique: true,
      name: 'product_prices_product_branch_unique'
    });

    // Add index for branch-specific price lookups
    await queryInterface.addIndex('product_prices', ['branch_id']);
  },

  down: async (queryInterface, Sequelize) => {
    // Remove indexes
    await queryInterface.removeIndex('product_prices', 'product_prices_product_branch_unique');
    await queryInterface.removeIndex('product_prices', ['branch_id']);

    // Remove column
    await queryInterface.removeColumn('product_prices', 'branch_id');
  }
};
