'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Check if columns exist before adding
    const tableDescription = await queryInterface.describeTable('modules');
    
    // Add category column if it doesn't exist
    if (!tableDescription.category) {
      await queryInterface.addColumn('modules', 'category', {
        type: Sequelize.STRING(50),
        allowNull: true,
        defaultValue: 'core',
        comment: 'Module category: core, fnb, optional, addon'
      });
    }
    
    // Add version column if it doesn't exist
    if (!tableDescription.version) {
      await queryInterface.addColumn('modules', 'version', {
        type: Sequelize.STRING(20),
        allowNull: true,
        defaultValue: '1.0.0'
      });
    }
    
    // Add sort_order column if it doesn't exist
    if (!tableDescription.sort_order) {
      await queryInterface.addColumn('modules', 'sort_order', {
        type: Sequelize.INTEGER,
        allowNull: true,
        defaultValue: 0
      });
    }
    
    console.log('✅ Added F&B columns to modules table');
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('modules', 'category');
    await queryInterface.removeColumn('modules', 'version');
    await queryInterface.removeColumn('modules', 'sort_order');
  }
};
