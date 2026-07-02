'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('wastes', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
      },
      waste_number: {
        type: Sequelize.STRING(50),
        allowNull: false,
        unique: true
      },
      product_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'products',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      product_name: {
        type: Sequelize.STRING(255),
        allowNull: true
      },
      product_sku: {
        type: Sequelize.STRING(100),
        allowNull: true
      },
      waste_type: {
        type: Sequelize.ENUM('finished_product', 'raw_material', 'packaging', 'production_defect'),
        allowNull: false
      },
      quantity: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false
      },
      unit: {
        type: Sequelize.STRING(20),
        allowNull: false
      },
      cost_value: {
        type: Sequelize.DECIMAL(15, 2),
        allowNull: false
      },
      reason: {
        type: Sequelize.TEXT,
        allowNull: false
      },
      disposal_method: {
        type: Sequelize.ENUM('disposal', 'donation', 'clearance_sale', 'recycling'),
        allowNull: false
      },
      clearance_price: {
        type: Sequelize.DECIMAL(15, 2),
        allowNull: true
      },
      waste_date: {
        type: Sequelize.DATE,
        allowNull: false
      },
      status: {
        type: Sequelize.ENUM('recorded', 'disposed', 'processed'),
        allowNull: false,
        defaultValue: 'recorded'
      },
      notes: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      created_by: {
        type: Sequelize.STRING(100),
        allowNull: false
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

    await queryInterface.addIndex('wastes', ['waste_number']);
    await queryInterface.addIndex('wastes', ['product_id']);
    await queryInterface.addIndex('wastes', ['waste_type']);
    await queryInterface.addIndex('wastes', ['waste_date']);
    await queryInterface.addIndex('wastes', ['status']);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('wastes');
  }
};
