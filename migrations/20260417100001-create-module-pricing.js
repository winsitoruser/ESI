'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('module_pricing', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      module_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'modules', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      price: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0
      },
      currency: {
        type: Sequelize.STRING(3),
        allowNull: false,
        defaultValue: 'IDR'
      },
      billing_interval: {
        type: Sequelize.ENUM('monthly', 'yearly', 'one_time'),
        allowNull: false,
        defaultValue: 'monthly'
      },
      per_user: {
        type: Sequelize.BOOLEAN,
        defaultValue: false
      },
      per_branch: {
        type: Sequelize.BOOLEAN,
        defaultValue: false
      },
      included_in_plans: {
        type: Sequelize.JSONB,
        allowNull: true
      },
      trial_days: {
        type: Sequelize.INTEGER,
        defaultValue: 0
      },
      is_active: {
        type: Sequelize.BOOLEAN,
        defaultValue: true
      },
      yearly_discount_percent: {
        type: Sequelize.DECIMAL(5, 2),
        defaultValue: 0
      },
      metadata: {
        type: Sequelize.JSONB,
        allowNull: true
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW
      }
    });

    await queryInterface.addIndex('module_pricing', ['module_id']);
    await queryInterface.addIndex('module_pricing', ['is_active']);

    // Add raw_payload column to payment_transactions if not exists
    const tableDesc = await queryInterface.describeTable('payment_transactions').catch(() => null);
    if (tableDesc && !tableDesc.raw_payload) {
      await queryInterface.addColumn('payment_transactions', 'raw_payload', {
        type: Sequelize.JSONB,
        allowNull: true
      });
    }
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('module_pricing');
  }
};
