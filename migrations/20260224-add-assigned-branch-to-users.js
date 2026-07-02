'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Check if column already exists
    const tableDescription = await queryInterface.describeTable('users');
    
    if (!tableDescription.assigned_branch_id) {
      await queryInterface.addColumn('users', 'assigned_branch_id', {
        type: Sequelize.UUID,
        allowNull: true
      });

      await queryInterface.addIndex('users', ['assigned_branch_id'], {
        name: 'users_assigned_branch_id_idx'
      });
    }
  },

  down: async (queryInterface, Sequelize) => {
    const tableDescription = await queryInterface.describeTable('users');
    
    if (tableDescription.assigned_branch_id) {
      await queryInterface.removeIndex('users', 'users_assigned_branch_id_idx');
      await queryInterface.removeColumn('users', 'assigned_branch_id');
    }
  }
};
