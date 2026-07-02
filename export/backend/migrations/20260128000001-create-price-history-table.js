'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Create price_history table
    await queryInterface.createTable('price_history', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
      },
      product_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'products',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      old_price: {
        type: Sequelize.DECIMAL(15, 2),
        allowNull: false
      },
      new_price: {
        type: Sequelize.DECIMAL(15, 2),
        allowNull: false
      },
      change_percentage: {
        type: Sequelize.DECIMAL(5, 2),
        allowNull: false
      },
      change_reason: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      changed_by: {
        type: Sequelize.STRING(100),
        allowNull: true
      },
      change_date: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
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
    await queryInterface.addIndex('price_history', ['product_id'], {
      name: 'idx_price_history_product_id'
    });

    await queryInterface.addIndex('price_history', ['change_date'], {
      name: 'idx_price_history_change_date'
    });

    await queryInterface.addIndex('price_history', ['changed_by'], {
      name: 'idx_price_history_changed_by'
    });

    // Create pricing_suggestions table
    await queryInterface.createTable('pricing_suggestions', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
      },
      product_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'products',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      current_price: {
        type: Sequelize.DECIMAL(15, 2),
        allowNull: false
      },
      suggested_price: {
        type: Sequelize.DECIMAL(15, 2),
        allowNull: false
      },
      current_margin: {
        type: Sequelize.DECIMAL(5, 2),
        allowNull: true
      },
      suggested_margin: {
        type: Sequelize.DECIMAL(5, 2),
        allowNull: true
      },
      reason: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      competitor_price: {
        type: Sequelize.DECIMAL(15, 2),
        allowNull: true
      },
      market_price: {
        type: Sequelize.DECIMAL(15, 2),
        allowNull: true
      },
      sales_trend: {
        type: Sequelize.STRING(20),
        allowNull: true,
        comment: 'increasing, stable, decreasing'
      },
      status: {
        type: Sequelize.STRING(20),
        allowNull: false,
        defaultValue: 'pending',
        comment: 'pending, applied, rejected'
      },
      applied_at: {
        type: Sequelize.DATE,
        allowNull: true
      },
      applied_by: {
        type: Sequelize.STRING(100),
        allowNull: true
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

    // Add indexes for pricing_suggestions
    await queryInterface.addIndex('pricing_suggestions', ['product_id'], {
      name: 'idx_pricing_suggestions_product_id'
    });

    await queryInterface.addIndex('pricing_suggestions', ['status'], {
      name: 'idx_pricing_suggestions_status'
    });

    await queryInterface.addIndex('pricing_suggestions', ['created_at'], {
      name: 'idx_pricing_suggestions_created_at'
    });
  },

  down: async (queryInterface, Sequelize) => {
    // Drop tables in reverse order
    await queryInterface.dropTable('pricing_suggestions');
    await queryInterface.dropTable('price_history');
  }
};
