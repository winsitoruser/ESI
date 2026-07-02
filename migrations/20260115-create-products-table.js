'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('products', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      name: {
        type: Sequelize.STRING(255),
        allowNull: false
      },
      sku: {
        type: Sequelize.STRING(100),
        allowNull: false,
        unique: true
      },
      category: {
        type: Sequelize.STRING(100),
        allowNull: true
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      unit: {
        type: Sequelize.STRING(50),
        allowNull: false,
        defaultValue: 'pcs'
      },
      price: {
        type: Sequelize.DECIMAL(15, 2),
        allowNull: false,
        defaultValue: 0
      },
      cost: {
        type: Sequelize.DECIMAL(15, 2),
        allowNull: true
      },
      stock: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0
      },
      min_stock: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: true
      },
      max_stock: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: true
      },
      barcode: {
        type: Sequelize.STRING(100),
        allowNull: true
      },
      image_url: {
        type: Sequelize.STRING(500),
        allowNull: true
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
    });

    // Add indexes
    await queryInterface.addIndex('products', ['sku']);
    await queryInterface.addIndex('products', ['category']);
    await queryInterface.addIndex('products', ['is_active']);

    // Insert sample products
    await queryInterface.bulkInsert('products', [
      {
        name: 'Roti Tawar Premium',
        sku: 'PRD-ROTI-001',
        category: 'Bakery',
        unit: 'loaf',
        price: 15000,
        cost: 10000,
        stock: 120,
        min_stock: 20,
        is_active: true,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        name: 'Kue Brownies Coklat',
        sku: 'PRD-KUE-001',
        category: 'Pastry',
        unit: 'pcs',
        price: 25000,
        cost: 18000,
        stock: 85,
        min_stock: 15,
        is_active: true,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        name: 'Tepung Terigu Premium',
        sku: 'RM001',
        category: 'Raw Material',
        unit: 'kg',
        price: 12000,
        cost: 10000,
        stock: 500,
        min_stock: 100,
        is_active: true,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        name: 'Gula Pasir Halus',
        sku: 'RM002',
        category: 'Raw Material',
        unit: 'kg',
        price: 15000,
        cost: 12000,
        stock: 300,
        min_stock: 50,
        is_active: true,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        name: 'Mentega',
        sku: 'RM003',
        category: 'Raw Material',
        unit: 'kg',
        price: 45000,
        cost: 40000,
        stock: 100,
        min_stock: 20,
        is_active: true,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        name: 'Coklat Bubuk',
        sku: 'RM006',
        category: 'Raw Material',
        unit: 'kg',
        price: 85000,
        cost: 75000,
        stock: 40,
        min_stock: 10,
        is_active: true,
        created_at: new Date(),
        updated_at: new Date()
      }
    ]);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('products');
  }
};
