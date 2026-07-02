'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const tableDescription = await queryInterface.describeTable('modules');
    
    // Add features column if it doesn't exist
    if (!tableDescription.features) {
      await queryInterface.addColumn('modules', 'features', {
        type: Sequelize.JSON,
        allowNull: true,
        defaultValue: []
      });
    }
    
    // Add pricing_tier column if it doesn't exist
    if (!tableDescription.pricing_tier) {
      await queryInterface.addColumn('modules', 'pricing_tier', {
        type: Sequelize.STRING(50),
        allowNull: true,
        defaultValue: 'basic'
      });
    }
    
    // Add setup_complexity column if it doesn't exist
    if (!tableDescription.setup_complexity) {
      await queryInterface.addColumn('modules', 'setup_complexity', {
        type: Sequelize.STRING(50),
        allowNull: true,
        defaultValue: 'simple'
      });
    }
    
    // Add color column if it doesn't exist
    if (!tableDescription.color) {
      await queryInterface.addColumn('modules', 'color', {
        type: Sequelize.STRING(20),
        allowNull: true,
        defaultValue: '#3B82F6'
      });
    }
    
    // Add preview_image column if it doesn't exist
    if (!tableDescription.preview_image) {
      await queryInterface.addColumn('modules', 'preview_image', {
        type: Sequelize.STRING(255),
        allowNull: true
      });
    }
    
    // Add tags column if it doesn't exist
    if (!tableDescription.tags) {
      await queryInterface.addColumn('modules', 'tags', {
        type: Sequelize.JSON,
        allowNull: true,
        defaultValue: []
      });
    }
    
    console.log('✅ Added extended fields to modules table');
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('modules', 'features');
    await queryInterface.removeColumn('modules', 'pricing_tier');
    await queryInterface.removeColumn('modules', 'setup_complexity');
    await queryInterface.removeColumn('modules', 'color');
    await queryInterface.removeColumn('modules', 'preview_image');
    await queryInterface.removeColumn('modules', 'tags');
  }
};
