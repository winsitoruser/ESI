'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    // Create price_tiers table for Regional Pricing
    await queryInterface.createTable('price_tiers', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      code: {
        type: Sequelize.STRING(50),
        allowNull: false,
        unique: true
      },
      name: {
        type: Sequelize.STRING(255),
        allowNull: false
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      multiplier: {
        type: Sequelize.DECIMAL(5, 2),
        defaultValue: 1.00
      },
      markup_percentage: {
        type: Sequelize.DECIMAL(5, 2),
        defaultValue: 0
      },
      markup_amount: {
        type: Sequelize.DECIMAL(15, 2),
        defaultValue: 0
      },
      region: {
        type: Sequelize.STRING(100),
        allowNull: true
      },
      city: {
        type: Sequelize.STRING(100),
        allowNull: true
      },
      province: {
        type: Sequelize.STRING(100),
        allowNull: true
      },
      location_type: {
        type: Sequelize.ENUM('airport', 'mall', 'street', 'tourist_area', 'residential', 'office_area', 'custom'),
        defaultValue: 'custom'
      },
      priority: {
        type: Sequelize.INTEGER,
        defaultValue: 0
      },
      is_active: {
        type: Sequelize.BOOLEAN,
        defaultValue: true
      },
      effective_from: {
        type: Sequelize.DATE,
        allowNull: true
      },
      effective_until: {
        type: Sequelize.DATE,
        allowNull: true
      },
      created_by: {
        type: Sequelize.INTEGER,
        allowNull: true
      },
      updated_by: {
        type: Sequelize.INTEGER,
        allowNull: true
      },
      created_at: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updated_at: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });

    // Add new columns to product_prices for Menu Locking
    await queryInterface.addColumn('product_prices', 'is_standard', {
      type: Sequelize.BOOLEAN,
      defaultValue: false,
      comment: 'Harga standar dari Pusat - tidak bisa diubah oleh BRANCH_MANAGER'
    });

    await queryInterface.addColumn('product_prices', 'branch_id', {
      type: Sequelize.UUID,
      allowNull: true,
      references: {
        model: 'branches',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL'
    });

    await queryInterface.addColumn('product_prices', 'price_tier_id', {
      type: Sequelize.UUID,
      allowNull: true,
      references: {
        model: 'price_tiers',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL'
    });

    await queryInterface.addColumn('product_prices', 'locked_by', {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL'
    });

    await queryInterface.addColumn('product_prices', 'locked_at', {
      type: Sequelize.DATE,
      allowNull: true
    });

    await queryInterface.addColumn('product_prices', 'requires_approval', {
      type: Sequelize.BOOLEAN,
      defaultValue: false
    });

    await queryInterface.addColumn('product_prices', 'approval_status', {
      type: Sequelize.ENUM('pending', 'approved', 'rejected'),
      allowNull: true
    });

    await queryInterface.addColumn('product_prices', 'approved_by', {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL'
    });

    await queryInterface.addColumn('product_prices', 'approved_at', {
      type: Sequelize.DATE,
      allowNull: true
    });

    // Add price_tier_id to branches for default tier assignment
    await queryInterface.addColumn('branches', 'price_tier_id', {
      type: Sequelize.UUID,
      allowNull: true,
      references: {
        model: 'price_tiers',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL'
    });

    // Create indexes
    await queryInterface.addIndex('product_prices', ['is_standard']);
    await queryInterface.addIndex('product_prices', ['branch_id']);
    await queryInterface.addIndex('product_prices', ['price_tier_id']);
    await queryInterface.addIndex('price_tiers', ['code']);
    await queryInterface.addIndex('price_tiers', ['location_type']);
    await queryInterface.addIndex('price_tiers', ['is_active']);
  },

  async down(queryInterface, Sequelize) {
    // Remove indexes
    await queryInterface.removeIndex('price_tiers', ['is_active']);
    await queryInterface.removeIndex('price_tiers', ['location_type']);
    await queryInterface.removeIndex('price_tiers', ['code']);
    await queryInterface.removeIndex('product_prices', ['price_tier_id']);
    await queryInterface.removeIndex('product_prices', ['branch_id']);
    await queryInterface.removeIndex('product_prices', ['is_standard']);

    // Remove columns from branches
    await queryInterface.removeColumn('branches', 'price_tier_id');

    // Remove columns from product_prices
    await queryInterface.removeColumn('product_prices', 'approved_at');
    await queryInterface.removeColumn('product_prices', 'approved_by');
    await queryInterface.removeColumn('product_prices', 'approval_status');
    await queryInterface.removeColumn('product_prices', 'requires_approval');
    await queryInterface.removeColumn('product_prices', 'locked_at');
    await queryInterface.removeColumn('product_prices', 'locked_by');
    await queryInterface.removeColumn('product_prices', 'price_tier_id');
    await queryInterface.removeColumn('product_prices', 'branch_id');
    await queryInterface.removeColumn('product_prices', 'is_standard');

    // Drop price_tiers table
    await queryInterface.dropTable('price_tiers');
  }
};
