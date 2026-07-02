'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Create recipes table
    await queryInterface.createTable('recipes', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
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
      product_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'products',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
        comment: 'Produk hasil dari recipe ini'
      },
      batch_size: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 1,
        comment: 'Ukuran batch yang dihasilkan'
      },
      batch_unit: {
        type: Sequelize.STRING(20),
        allowNull: false,
        defaultValue: 'pcs',
        comment: 'Unit untuk batch (pcs, kg, liter, dll)'
      },
      estimated_yield: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: true,
        comment: 'Perkiraan hasil produksi'
      },
      yield_percentage: {
        type: Sequelize.DECIMAL(5, 2),
        defaultValue: 100,
        comment: 'Persentase yield (accounting for waste)'
      },
      preparation_time_minutes: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
        comment: 'Waktu persiapan dalam menit'
      },
      cooking_time_minutes: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
        comment: 'Waktu memasak/produksi dalam menit'
      },
      total_time_minutes: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
        comment: 'Total waktu produksi'
      },
      total_cost: {
        type: Sequelize.DECIMAL(15, 2),
        defaultValue: 0,
        comment: 'Total biaya bahan baku'
      },
      labor_cost: {
        type: Sequelize.DECIMAL(15, 2),
        defaultValue: 0,
        comment: 'Biaya tenaga kerja'
      },
      overhead_cost: {
        type: Sequelize.DECIMAL(15, 2),
        defaultValue: 0,
        comment: 'Biaya overhead (listrik, gas, dll)'
      },
      total_production_cost: {
        type: Sequelize.DECIMAL(15, 2),
        defaultValue: 0,
        comment: 'Total biaya produksi (material + labor + overhead)'
      },
      cost_per_unit: {
        type: Sequelize.DECIMAL(15, 2),
        defaultValue: 0,
        comment: 'Biaya per unit hasil'
      },
      difficulty_level: {
        type: Sequelize.ENUM('easy', 'medium', 'hard'),
        defaultValue: 'medium'
      },
      category: {
        type: Sequelize.STRING(100),
        allowNull: true
      },
      status: {
        type: Sequelize.ENUM('draft', 'active', 'archived'),
        defaultValue: 'draft'
      },
      version: {
        type: Sequelize.INTEGER,
        defaultValue: 1,
        comment: 'Versi recipe untuk tracking changes'
      },
      instructions: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'Instruksi produksi step-by-step'
      },
      notes: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      created_by: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
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

    // Create recipe_ingredients table (junction table with additional data)
    await queryInterface.createTable('recipe_ingredients', {
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
      product_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'products',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
        comment: 'Bahan baku (raw material product)'
      },
      quantity: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
        comment: 'Jumlah bahan yang dibutuhkan'
      },
      unit: {
        type: Sequelize.STRING(20),
        allowNull: false,
        comment: 'Unit pengukuran'
      },
      unit_cost: {
        type: Sequelize.DECIMAL(15, 2),
        defaultValue: 0,
        comment: 'Biaya per unit bahan'
      },
      subtotal_cost: {
        type: Sequelize.DECIMAL(15, 2),
        defaultValue: 0,
        comment: 'Total biaya bahan (quantity * unit_cost)'
      },
      is_optional: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
        comment: 'Apakah bahan ini opsional'
      },
      preparation_notes: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'Catatan persiapan bahan (e.g., "dicincang halus", "diparut")'
      },
      sort_order: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
        comment: 'Urutan bahan dalam recipe'
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
    await queryInterface.addIndex('recipes', ['code']);
    await queryInterface.addIndex('recipes', ['product_id']);
    await queryInterface.addIndex('recipes', ['status']);
    await queryInterface.addIndex('recipes', ['category']);
    
    await queryInterface.addIndex('recipe_ingredients', ['recipe_id']);
    await queryInterface.addIndex('recipe_ingredients', ['product_id']);
    await queryInterface.addIndex('recipe_ingredients', ['recipe_id', 'product_id'], {
      unique: true,
      name: 'recipe_ingredient_unique'
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('recipe_ingredients');
    await queryInterface.dropTable('recipes');
  }
};
