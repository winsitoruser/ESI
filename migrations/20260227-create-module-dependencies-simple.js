'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Create module_dependencies table
    await queryInterface.createTable('module_dependencies', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      module_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'modules',
          key: 'id'
        },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
      },
      depends_on_module_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'modules',
          key: 'id'
        },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
      },
      dependency_type: {
        type: Sequelize.STRING(50),
        allowNull: false,
        defaultValue: 'required',
        comment: 'Type: required, optional, recommended'
      },
      is_required: {
        type: Sequelize.BOOLEAN,
        defaultValue: true
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });

    // Add indexes
    await queryInterface.addIndex('module_dependencies', ['module_id']);
    await queryInterface.addIndex('module_dependencies', ['depends_on_module_id']);
    await queryInterface.addIndex('module_dependencies', ['module_id', 'depends_on_module_id'], {
      unique: true,
      name: 'module_dependencies_unique'
    });

    console.log('✅ Created module_dependencies table');
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('module_dependencies');
  }
};
