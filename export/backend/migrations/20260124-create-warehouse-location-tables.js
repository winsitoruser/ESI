'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Create warehouses table
    await queryInterface.createTable('warehouses', {
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
        type: Sequelize.STRING(100),
        allowNull: false
      },
      type: {
        type: Sequelize.ENUM('main', 'branch', 'storage', 'production'),
        defaultValue: 'main'
      },
      address: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      city: {
        type: Sequelize.STRING(100),
        allowNull: true
      },
      phone: {
        type: Sequelize.STRING(20),
        allowNull: true
      },
      manager: {
        type: Sequelize.STRING(100),
        allowNull: true
      },
      capacity: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: true
      },
      status: {
        type: Sequelize.ENUM('active', 'inactive', 'maintenance'),
        defaultValue: 'active'
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

    // Create locations table
    await queryInterface.createTable('locations', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      warehouse_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'warehouses',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT'
      },
      code: {
        type: Sequelize.STRING(50),
        allowNull: false
      },
      name: {
        type: Sequelize.STRING(100),
        allowNull: false
      },
      type: {
        type: Sequelize.ENUM('rack', 'shelf', 'bin', 'pallet', 'floor', 'chiller', 'freezer'),
        defaultValue: 'rack'
      },
      aisle: {
        type: Sequelize.STRING(10),
        allowNull: true
      },
      row: {
        type: Sequelize.STRING(10),
        allowNull: true
      },
      level: {
        type: Sequelize.STRING(10),
        allowNull: true
      },
      capacity: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: true
      },
      current_usage: {
        type: Sequelize.DECIMAL(10, 2),
        defaultValue: 0
      },
      status: {
        type: Sequelize.ENUM('available', 'occupied', 'reserved', 'maintenance'),
        defaultValue: 'available'
      },
      temperature_controlled: {
        type: Sequelize.BOOLEAN,
        defaultValue: false
      },
      temperature_min: {
        type: Sequelize.DECIMAL(5, 2),
        allowNull: true
      },
      temperature_max: {
        type: Sequelize.DECIMAL(5, 2),
        allowNull: true
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

    // Add unique constraint
    await queryInterface.addIndex('locations', ['warehouse_id', 'code'], {
      unique: true,
      name: 'locations_warehouse_code_unique'
    });

    // Insert sample data
    await queryInterface.bulkInsert('warehouses', [
      {
        code: 'WH-001',
        name: 'Gudang Utama',
        type: 'main',
        address: 'Jl. Industri No. 123',
        city: 'Jakarta',
        phone: '021-12345678',
        manager: 'Budi Santoso',
        capacity: 1000.00,
        status: 'active',
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        code: 'WH-002',
        name: 'Gudang Cabang Surabaya',
        type: 'branch',
        address: 'Jl. Raya Surabaya No. 456',
        city: 'Surabaya',
        phone: '031-87654321',
        manager: 'Siti Rahayu',
        capacity: 500.00,
        status: 'active',
        created_at: new Date(),
        updated_at: new Date()
      }
    ]);

    // Get warehouse IDs
    const warehouses = await queryInterface.sequelize.query(
      'SELECT id FROM warehouses ORDER BY id',
      { type: Sequelize.QueryTypes.SELECT }
    );

    const wh1Id = warehouses[0].id;
    const wh2Id = warehouses[1].id;

    // Insert sample locations
    await queryInterface.bulkInsert('locations', [
      // Gudang Utama locations
      {
        warehouse_id: wh1Id,
        code: 'A1',
        name: 'Rak A1',
        type: 'rack',
        aisle: 'A',
        row: '1',
        level: '1',
        capacity: 100.00,
        current_usage: 0,
        status: 'available',
        temperature_controlled: false,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        warehouse_id: wh1Id,
        code: 'A2',
        name: 'Rak A2',
        type: 'rack',
        aisle: 'A',
        row: '2',
        level: '1',
        capacity: 100.00,
        current_usage: 0,
        status: 'available',
        temperature_controlled: false,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        warehouse_id: wh1Id,
        code: 'B1',
        name: 'Gudang B1',
        type: 'shelf',
        aisle: 'B',
        row: '1',
        level: '1',
        capacity: 200.00,
        current_usage: 0,
        status: 'available',
        temperature_controlled: false,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        warehouse_id: wh1Id,
        code: 'B2',
        name: 'Gudang B2',
        type: 'shelf',
        aisle: 'B',
        row: '2',
        level: '1',
        capacity: 200.00,
        current_usage: 0,
        status: 'available',
        temperature_controlled: false,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        warehouse_id: wh1Id,
        code: 'B3',
        name: 'Gudang B3',
        type: 'shelf',
        aisle: 'B',
        row: '3',
        level: '1',
        capacity: 200.00,
        current_usage: 0,
        status: 'available',
        temperature_controlled: false,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        warehouse_id: wh1Id,
        code: 'B4',
        name: 'Gudang B4',
        type: 'shelf',
        aisle: 'B',
        row: '4',
        level: '1',
        capacity: 200.00,
        current_usage: 0,
        status: 'available',
        temperature_controlled: false,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        warehouse_id: wh1Id,
        code: 'C1',
        name: 'Chiller C1',
        type: 'chiller',
        aisle: 'C',
        row: '1',
        level: '1',
        capacity: 150.00,
        current_usage: 0,
        status: 'available',
        temperature_controlled: true,
        temperature_min: 0.00,
        temperature_max: 8.00,
        created_at: new Date(),
        updated_at: new Date()
      },
      // Gudang Cabang locations
      {
        warehouse_id: wh2Id,
        code: 'A1',
        name: 'Rak A1',
        type: 'rack',
        aisle: 'A',
        row: '1',
        level: '1',
        capacity: 50.00,
        current_usage: 0,
        status: 'available',
        temperature_controlled: false,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        warehouse_id: wh2Id,
        code: 'A2',
        name: 'Rak A2',
        type: 'rack',
        aisle: 'A',
        row: '2',
        level: '1',
        capacity: 50.00,
        current_usage: 0,
        status: 'available',
        temperature_controlled: false,
        created_at: new Date(),
        updated_at: new Date()
      }
    ]);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('locations');
    await queryInterface.dropTable('warehouses');
  }
};
