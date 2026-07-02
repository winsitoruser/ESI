'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('returns', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
      },
      return_number: {
        type: Sequelize.STRING(50),
        allowNull: false,
        unique: true
      },
      transaction_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        comment: 'Reference to original transaction/sale'
      },
      customer_name: {
        type: Sequelize.STRING(255),
        allowNull: true
      },
      customer_phone: {
        type: Sequelize.STRING(50),
        allowNull: true
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
        allowNull: false
      },
      product_sku: {
        type: Sequelize.STRING(100),
        allowNull: true
      },
      quantity: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false
      },
      unit: {
        type: Sequelize.STRING(20),
        allowNull: false,
        defaultValue: 'pcs'
      },
      return_reason: {
        type: Sequelize.ENUM('defective', 'expired', 'wrong_item', 'customer_request', 'damaged', 'other'),
        allowNull: false
      },
      return_type: {
        type: Sequelize.ENUM('refund', 'exchange', 'store_credit'),
        allowNull: false
      },
      condition: {
        type: Sequelize.ENUM('unopened', 'opened', 'damaged', 'expired'),
        allowNull: false
      },
      original_price: {
        type: Sequelize.DECIMAL(15, 2),
        allowNull: false
      },
      refund_amount: {
        type: Sequelize.DECIMAL(15, 2),
        allowNull: false
      },
      restocking_fee: {
        type: Sequelize.DECIMAL(15, 2),
        allowNull: false,
        defaultValue: 0
      },
      status: {
        type: Sequelize.ENUM('pending', 'approved', 'rejected', 'completed', 'cancelled'),
        allowNull: false,
        defaultValue: 'pending'
      },
      return_date: {
        type: Sequelize.DATE,
        allowNull: false
      },
      approval_date: {
        type: Sequelize.DATE,
        allowNull: true
      },
      completion_date: {
        type: Sequelize.DATE,
        allowNull: true
      },
      notes: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      images: {
        type: Sequelize.JSON,
        allowNull: true,
        comment: 'Array of image URLs for return evidence'
      },
      approved_by: {
        type: Sequelize.STRING(100),
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

    // Create indexes
    await queryInterface.addIndex('returns', ['return_number']);
    await queryInterface.addIndex('returns', ['transaction_id']);
    await queryInterface.addIndex('returns', ['product_id']);
    await queryInterface.addIndex('returns', ['status']);
    await queryInterface.addIndex('returns', ['return_date']);
    await queryInterface.addIndex('returns', ['customer_phone']);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('returns');
  }
};
