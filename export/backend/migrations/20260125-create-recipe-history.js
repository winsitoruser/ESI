'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('recipe_history', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      recipe_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'recipes',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      version: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 1
      },
      change_type: {
        type: Sequelize.ENUM('created', 'updated', 'archived', 'restored'),
        allowNull: false
      },
      changed_by: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'users',
          key: 'id'
        }
      },
      changes_summary: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      changes_json: {
        type: Sequelize.JSONB,
        allowNull: true
      },
      snapshot_data: {
        type: Sequelize.JSONB,
        allowNull: true
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });

    // Add indexes
    await queryInterface.addIndex('recipe_history', ['recipe_id']);
    await queryInterface.addIndex('recipe_history', ['recipe_id', 'version']);
    await queryInterface.addIndex('recipe_history', ['change_type']);
    await queryInterface.addIndex('recipe_history', ['created_at']);

    // Add version column to recipes table if not exists
    await queryInterface.addColumn('recipes', 'current_version', {
      type: Sequelize.INTEGER,
      defaultValue: 1,
      allowNull: false
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('recipe_history');
    await queryInterface.removeColumn('recipes', 'current_version');
  }
};
