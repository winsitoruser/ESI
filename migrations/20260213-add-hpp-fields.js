'use strict';

/**
 * Migration: Add HPP (Harga Pokok Penjualan) Fields to Products
 * 
 * This migration adds:
 * 1. HPP-related fields to products table
 * 2. product_cost_history table for tracking HPP changes
 * 3. product_cost_components table for detailed cost breakdown
 */

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const transaction = await queryInterface.sequelize.transaction();
    
    try {
      // 1. Add HPP fields to products table
      await queryInterface.addColumn('products', 'hpp', {
        type: Sequelize.DECIMAL(15, 2),
        defaultValue: 0,
        comment: 'Harga Pokok Penjualan (Cost of Goods Sold)'
      }, { transaction });

      await queryInterface.addColumn('products', 'hpp_method', {
        type: Sequelize.STRING(20),
        defaultValue: 'average',
        comment: 'fifo, lifo, average, standard'
      }, { transaction });

      await queryInterface.addColumn('products', 'last_purchase_price', {
        type: Sequelize.DECIMAL(15, 2),
        comment: 'Last purchase price from PO'
      }, { transaction });

      await queryInterface.addColumn('products', 'average_purchase_price', {
        type: Sequelize.DECIMAL(15, 2),
        comment: 'Average purchase price'
      }, { transaction });

      await queryInterface.addColumn('products', 'standard_cost', {
        type: Sequelize.DECIMAL(15, 2),
        comment: 'Standard/predetermined cost'
      }, { transaction });

      await queryInterface.addColumn('products', 'margin_amount', {
        type: Sequelize.DECIMAL(15, 2),
        comment: 'Selling Price - HPP'
      }, { transaction });

      await queryInterface.addColumn('products', 'margin_percentage', {
        type: Sequelize.DECIMAL(5, 2),
        comment: 'Margin / Selling Price * 100'
      }, { transaction });

      await queryInterface.addColumn('products', 'markup_percentage', {
        type: Sequelize.DECIMAL(5, 2),
        comment: 'Margin / HPP * 100'
      }, { transaction });

      await queryInterface.addColumn('products', 'min_margin_percentage', {
        type: Sequelize.DECIMAL(5, 2),
        defaultValue: 20,
        comment: 'Minimum acceptable margin percentage'
      }, { transaction });

      await queryInterface.addColumn('products', 'packaging_cost', {
        type: Sequelize.DECIMAL(15, 2),
        defaultValue: 0,
        comment: 'Packaging cost per unit'
      }, { transaction });

      await queryInterface.addColumn('products', 'labor_cost', {
        type: Sequelize.DECIMAL(15, 2),
        defaultValue: 0,
        comment: 'Labor cost per unit'
      }, { transaction });

      await queryInterface.addColumn('products', 'overhead_cost', {
        type: Sequelize.DECIMAL(15, 2),
        defaultValue: 0,
        comment: 'Overhead cost per unit'
      }, { transaction });

      // Create indexes for HPP fields
      await queryInterface.addIndex('products', ['hpp'], {
        name: 'idx_products_hpp',
        transaction
      });

      await queryInterface.addIndex('products', ['margin_percentage'], {
        name: 'idx_products_margin',
        transaction
      });

      // 2. Create product_cost_history table
      await queryInterface.createTable('product_cost_history', {
        id: {
          type: Sequelize.UUID,
          defaultValue: Sequelize.literal('gen_random_uuid()'),
          primaryKey: true
        },
        product_id: {
          type: Sequelize.UUID,
          allowNull: false,
          references: {
            model: 'products',
            key: 'id'
          },
          onDelete: 'CASCADE',
          onUpdate: 'CASCADE'
        },
        
        // Cost Details
        old_hpp: {
          type: Sequelize.DECIMAL(15, 2)
        },
        new_hpp: {
          type: Sequelize.DECIMAL(15, 2)
        },
        change_amount: {
          type: Sequelize.DECIMAL(15, 2),
          comment: 'new_hpp - old_hpp'
        },
        change_percentage: {
          type: Sequelize.DECIMAL(5, 2),
          comment: 'Percentage change'
        },
        
        // Cost Breakdown
        purchase_price: {
          type: Sequelize.DECIMAL(15, 2)
        },
        packaging_cost: {
          type: Sequelize.DECIMAL(15, 2)
        },
        labor_cost: {
          type: Sequelize.DECIMAL(15, 2)
        },
        overhead_cost: {
          type: Sequelize.DECIMAL(15, 2)
        },
        
        // Reason & Source
        change_reason: {
          type: Sequelize.STRING(255),
          comment: 'purchase, adjustment, recipe_update, manual'
        },
        source_reference: {
          type: Sequelize.STRING(100),
          comment: 'PO number, adjustment ID, etc.'
        },
        notes: {
          type: Sequelize.TEXT
        },
        
        // Audit
        changed_by: {
          type: Sequelize.UUID
        },
        changed_at: {
          type: Sequelize.DATE,
          defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
        },
        
        created_at: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
        }
      }, { transaction });

      // Create indexes for product_cost_history
      await queryInterface.addIndex('product_cost_history', ['product_id'], {
        name: 'idx_cost_history_product',
        transaction
      });

      await queryInterface.addIndex('product_cost_history', ['changed_at'], {
        name: 'idx_cost_history_date',
        transaction
      });

      await queryInterface.addIndex('product_cost_history', ['change_reason'], {
        name: 'idx_cost_history_reason',
        transaction
      });

      // 3. Create product_cost_components table
      await queryInterface.createTable('product_cost_components', {
        id: {
          type: Sequelize.UUID,
          defaultValue: Sequelize.literal('gen_random_uuid()'),
          primaryKey: true
        },
        product_id: {
          type: Sequelize.UUID,
          allowNull: false,
          references: {
            model: 'products',
            key: 'id'
          },
          onDelete: 'CASCADE',
          onUpdate: 'CASCADE'
        },
        
        component_type: {
          type: Sequelize.STRING(50),
          allowNull: false,
          comment: 'material, packaging, labor, overhead, other'
        },
        component_name: {
          type: Sequelize.STRING(255),
          allowNull: false
        },
        component_description: {
          type: Sequelize.TEXT
        },
        
        cost_amount: {
          type: Sequelize.DECIMAL(15, 2),
          allowNull: false
        },
        quantity: {
          type: Sequelize.DECIMAL(10, 3),
          defaultValue: 1
        },
        unit: {
          type: Sequelize.STRING(20)
        },
        
        is_active: {
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
      }, { transaction });

      // Create indexes for product_cost_components
      await queryInterface.addIndex('product_cost_components', ['product_id'], {
        name: 'idx_cost_components_product',
        transaction
      });

      await queryInterface.addIndex('product_cost_components', ['component_type'], {
        name: 'idx_cost_components_type',
        transaction
      });

      await queryInterface.addIndex('product_cost_components', ['is_active'], {
        name: 'idx_cost_components_active',
        transaction
      });

      await transaction.commit();
      console.log('✅ HPP fields migration completed successfully');
      
    } catch (error) {
      await transaction.rollback();
      console.error('❌ Migration failed:', error);
      throw error;
    }
  },

  down: async (queryInterface, Sequelize) => {
    const transaction = await queryInterface.sequelize.transaction();
    
    try {
      // Drop tables
      await queryInterface.dropTable('product_cost_components', { transaction });
      await queryInterface.dropTable('product_cost_history', { transaction });

      // Remove columns from products
      const columns = [
        'hpp',
        'hpp_method',
        'last_purchase_price',
        'average_purchase_price',
        'standard_cost',
        'margin_amount',
        'margin_percentage',
        'markup_percentage',
        'min_margin_percentage',
        'packaging_cost',
        'labor_cost',
        'overhead_cost'
      ];

      for (const column of columns) {
        await queryInterface.removeColumn('products', column, { transaction });
      }

      await transaction.commit();
      console.log('✅ HPP fields rollback completed');
      
    } catch (error) {
      await transaction.rollback();
      console.error('❌ Rollback failed:', error);
      throw error;
    }
  }
};
