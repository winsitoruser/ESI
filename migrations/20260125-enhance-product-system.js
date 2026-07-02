'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Add new columns to products table for enhanced product management
    await queryInterface.addColumn('products', 'product_type', {
      type: Sequelize.ENUM('finished', 'raw_material', 'manufactured'),
      allowNull: false,
      defaultValue: 'finished',
      comment: 'finished: Produk jadi siap jual, raw_material: Bahan baku, manufactured: Produk hasil produksi/racikan'
    });

    await queryInterface.addColumn('products', 'recipe_id', {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: {
        model: 'recipes',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
      comment: 'Link to recipe if product is manufactured'
    });

    await queryInterface.addColumn('products', 'supplier_id', {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: {
        model: 'suppliers',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
      comment: 'Primary supplier for this product'
    });

    await queryInterface.addColumn('products', 'purchase_price', {
      type: Sequelize.DECIMAL(15, 2),
      allowNull: true,
      comment: 'Harga beli dari supplier (untuk finished & raw_material)'
    });

    await queryInterface.addColumn('products', 'production_cost', {
      type: Sequelize.DECIMAL(15, 2),
      allowNull: true,
      comment: 'Biaya produksi (untuk manufactured products, calculated from recipe)'
    });

    await queryInterface.addColumn('products', 'markup_percentage', {
      type: Sequelize.DECIMAL(5, 2),
      allowNull: true,
      defaultValue: 0,
      comment: 'Markup percentage for pricing'
    });

    await queryInterface.addColumn('products', 'can_be_sold', {
      type: Sequelize.BOOLEAN,
      defaultValue: true,
      comment: 'Apakah produk bisa dijual (raw_material biasanya false)'
    });

    await queryInterface.addColumn('products', 'can_be_purchased', {
      type: Sequelize.BOOLEAN,
      defaultValue: true,
      comment: 'Apakah produk bisa dibeli dari supplier'
    });

    await queryInterface.addColumn('products', 'can_be_produced', {
      type: Sequelize.BOOLEAN,
      defaultValue: false,
      comment: 'Apakah produk bisa diproduksi (manufactured = true)'
    });

    await queryInterface.addColumn('products', 'lead_time_days', {
      type: Sequelize.INTEGER,
      defaultValue: 0,
      comment: 'Lead time dari supplier dalam hari'
    });

    await queryInterface.addColumn('products', 'production_time_minutes', {
      type: Sequelize.INTEGER,
      defaultValue: 0,
      comment: 'Waktu produksi dalam menit (untuk manufactured)'
    });

    await queryInterface.addColumn('products', 'batch_size', {
      type: Sequelize.DECIMAL(10, 2),
      defaultValue: 1,
      comment: 'Ukuran batch untuk produksi'
    });

    await queryInterface.addColumn('products', 'quality_grade', {
      type: Sequelize.ENUM('A', 'B', 'C'),
      allowNull: true,
      comment: 'Grade kualitas produk'
    });

    await queryInterface.addColumn('products', 'shelf_life_days', {
      type: Sequelize.INTEGER,
      allowNull: true,
      comment: 'Umur simpan produk dalam hari'
    });

    await queryInterface.addColumn('products', 'storage_temperature', {
      type: Sequelize.STRING(50),
      allowNull: true,
      comment: 'Suhu penyimpanan (e.g., "2-8°C", "Room Temperature")'
    });

    await queryInterface.addColumn('products', 'requires_batch_tracking', {
      type: Sequelize.BOOLEAN,
      defaultValue: false,
      comment: 'Apakah produk memerlukan tracking batch/lot'
    });

    await queryInterface.addColumn('products', 'requires_expiry_tracking', {
      type: Sequelize.BOOLEAN,
      defaultValue: false,
      comment: 'Apakah produk memerlukan tracking tanggal kadaluarsa'
    });

    // Add indexes for better query performance
    await queryInterface.addIndex('products', ['product_type']);
    await queryInterface.addIndex('products', ['recipe_id']);
    await queryInterface.addIndex('products', ['supplier_id']);
    await queryInterface.addIndex('products', ['can_be_sold']);
    await queryInterface.addIndex('products', ['can_be_purchased']);
    await queryInterface.addIndex('products', ['can_be_produced']);
  },

  down: async (queryInterface, Sequelize) => {
    // Remove indexes
    await queryInterface.removeIndex('products', ['product_type']);
    await queryInterface.removeIndex('products', ['recipe_id']);
    await queryInterface.removeIndex('products', ['supplier_id']);
    await queryInterface.removeIndex('products', ['can_be_sold']);
    await queryInterface.removeIndex('products', ['can_be_purchased']);
    await queryInterface.removeIndex('products', ['can_be_produced']);

    // Remove columns
    await queryInterface.removeColumn('products', 'product_type');
    await queryInterface.removeColumn('products', 'recipe_id');
    await queryInterface.removeColumn('products', 'supplier_id');
    await queryInterface.removeColumn('products', 'purchase_price');
    await queryInterface.removeColumn('products', 'production_cost');
    await queryInterface.removeColumn('products', 'markup_percentage');
    await queryInterface.removeColumn('products', 'can_be_sold');
    await queryInterface.removeColumn('products', 'can_be_purchased');
    await queryInterface.removeColumn('products', 'can_be_produced');
    await queryInterface.removeColumn('products', 'lead_time_days');
    await queryInterface.removeColumn('products', 'production_time_minutes');
    await queryInterface.removeColumn('products', 'batch_size');
    await queryInterface.removeColumn('products', 'quality_grade');
    await queryInterface.removeColumn('products', 'shelf_life_days');
    await queryInterface.removeColumn('products', 'storage_temperature');
    await queryInterface.removeColumn('products', 'requires_batch_tracking');
    await queryInterface.removeColumn('products', 'requires_expiry_tracking');
  }
};
