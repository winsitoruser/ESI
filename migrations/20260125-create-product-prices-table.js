'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Create product_prices table for tiered pricing
    await queryInterface.createTable('product_prices', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      product_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'products',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      price_type: {
        type: Sequelize.ENUM('regular', 'member', 'tier_bronze', 'tier_silver', 'tier_gold', 'tier_platinum'),
        allowNull: false,
        defaultValue: 'regular',
        comment: 'Tipe harga: regular (non-member), member (all members), atau tier-specific'
      },
      tier_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'loyalty_tiers',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
        comment: 'Link to specific loyalty tier (optional)'
      },
      price: {
        type: Sequelize.DECIMAL(15, 2),
        allowNull: false,
        comment: 'Harga untuk tipe/tier ini'
      },
      discount_percentage: {
        type: Sequelize.DECIMAL(5, 2),
        defaultValue: 0,
        comment: 'Diskon dalam persen dari harga regular'
      },
      discount_amount: {
        type: Sequelize.DECIMAL(15, 2),
        defaultValue: 0,
        comment: 'Diskon dalam nominal rupiah'
      },
      min_quantity: {
        type: Sequelize.INTEGER,
        defaultValue: 1,
        comment: 'Minimum quantity untuk harga ini'
      },
      max_quantity: {
        type: Sequelize.INTEGER,
        allowNull: true,
        comment: 'Maximum quantity untuk harga ini (null = unlimited)'
      },
      start_date: {
        type: Sequelize.DATE,
        allowNull: true,
        comment: 'Tanggal mulai berlaku'
      },
      end_date: {
        type: Sequelize.DATE,
        allowNull: true,
        comment: 'Tanggal berakhir (null = permanent)'
      },
      is_active: {
        type: Sequelize.BOOLEAN,
        defaultValue: true
      },
      priority: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
        comment: 'Priority untuk menentukan harga mana yang digunakan (higher = higher priority)'
      },
      notes: {
        type: Sequelize.TEXT,
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

    // Add indexes
    await queryInterface.addIndex('product_prices', ['product_id']);
    await queryInterface.addIndex('product_prices', ['price_type']);
    await queryInterface.addIndex('product_prices', ['tier_id']);
    await queryInterface.addIndex('product_prices', ['is_active']);
    await queryInterface.addIndex('product_prices', ['product_id', 'price_type'], {
      name: 'product_price_type_idx'
    });

    // Add unique constraint for product_id + price_type combination
    await queryInterface.addIndex('product_prices', ['product_id', 'price_type'], {
      unique: true,
      name: 'product_price_type_unique',
      where: {
        tier_id: null
      }
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('product_prices');
  }
};
