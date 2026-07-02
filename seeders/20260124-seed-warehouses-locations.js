'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Insert warehouses
    await queryInterface.bulkInsert('warehouses', [
      {
        code: 'WH-001',
        name: 'Gudang Utama Jakarta',
        type: 'main',
        address: 'Jl. Industri Raya No. 123, Kawasan Industri Pulogadung',
        city: 'Jakarta Timur',
        phone: '021-4612345',
        manager: 'Budi Santoso',
        capacity: 1500.00,
        status: 'active',
        notes: 'Gudang utama untuk distribusi wilayah Jakarta dan sekitarnya',
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        code: 'WH-002',
        name: 'Gudang Cabang Surabaya',
        type: 'branch',
        address: 'Jl. Raya Surabaya No. 456, Rungkut Industri',
        city: 'Surabaya',
        phone: '031-8765432',
        manager: 'Siti Rahayu',
        capacity: 800.00,
        status: 'active',
        notes: 'Gudang cabang untuk wilayah Jawa Timur',
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        code: 'WH-003',
        name: 'Gudang Produksi Bandung',
        type: 'production',
        address: 'Jl. Soekarno Hatta No. 789, Cibiru',
        city: 'Bandung',
        phone: '022-7654321',
        manager: 'Agus Wijaya',
        capacity: 600.00,
        status: 'active',
        notes: 'Gudang khusus untuk produksi dan raw material',
        created_at: new Date(),
        updated_at: new Date()
      }
    ]);

    // Get warehouse IDs
    const warehouses = await queryInterface.sequelize.query(
      'SELECT id, code FROM warehouses ORDER BY id',
      { type: Sequelize.QueryTypes.SELECT }
    );

    const whMap = {};
    warehouses.forEach(wh => {
      whMap[wh.code] = wh.id;
    });

    // Insert locations
    const locations = [
      // Gudang Utama Jakarta - WH-001
      {
        warehouse_id: whMap['WH-001'],
        code: 'A1',
        name: 'Rak A1',
        type: 'rack',
        aisle: 'A',
        row: '1',
        level: '1',
        capacity: 150.00,
        current_usage: 0,
        status: 'available',
        temperature_controlled: false,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        warehouse_id: whMap['WH-001'],
        code: 'A2',
        name: 'Rak A2',
        type: 'rack',
        aisle: 'A',
        row: '2',
        level: '1',
        capacity: 150.00,
        current_usage: 0,
        status: 'available',
        temperature_controlled: false,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        warehouse_id: whMap['WH-001'],
        code: 'A3',
        name: 'Rak A3',
        type: 'rack',
        aisle: 'A',
        row: '3',
        level: '1',
        capacity: 150.00,
        current_usage: 0,
        status: 'available',
        temperature_controlled: false,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        warehouse_id: whMap['WH-001'],
        code: 'B1',
        name: 'Gudang B1',
        type: 'shelf',
        aisle: 'B',
        row: '1',
        level: '1',
        capacity: 250.00,
        current_usage: 0,
        status: 'available',
        temperature_controlled: false,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        warehouse_id: whMap['WH-001'],
        code: 'B2',
        name: 'Gudang B2',
        type: 'shelf',
        aisle: 'B',
        row: '2',
        level: '1',
        capacity: 250.00,
        current_usage: 0,
        status: 'available',
        temperature_controlled: false,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        warehouse_id: whMap['WH-001'],
        code: 'B3',
        name: 'Gudang B3',
        type: 'shelf',
        aisle: 'B',
        row: '3',
        level: '1',
        capacity: 250.00,
        current_usage: 0,
        status: 'available',
        temperature_controlled: false,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        warehouse_id: whMap['WH-001'],
        code: 'B4',
        name: 'Gudang B4',
        type: 'shelf',
        aisle: 'B',
        row: '4',
        level: '1',
        capacity: 250.00,
        current_usage: 0,
        status: 'available',
        temperature_controlled: false,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        warehouse_id: whMap['WH-001'],
        code: 'C1',
        name: 'Chiller C1',
        type: 'chiller',
        aisle: 'C',
        row: '1',
        level: '1',
        capacity: 200.00,
        current_usage: 0,
        status: 'available',
        temperature_controlled: true,
        temperature_min: 0.00,
        temperature_max: 8.00,
        notes: 'Untuk produk yang memerlukan pendinginan',
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        warehouse_id: whMap['WH-001'],
        code: 'F1',
        name: 'Freezer F1',
        type: 'freezer',
        aisle: 'F',
        row: '1',
        level: '1',
        capacity: 150.00,
        current_usage: 0,
        status: 'available',
        temperature_controlled: true,
        temperature_min: -20.00,
        temperature_max: -10.00,
        notes: 'Untuk produk frozen',
        created_at: new Date(),
        updated_at: new Date()
      },
      // Gudang Cabang Surabaya - WH-002
      {
        warehouse_id: whMap['WH-002'],
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
        warehouse_id: whMap['WH-002'],
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
        warehouse_id: whMap['WH-002'],
        code: 'B1',
        name: 'Gudang B1',
        type: 'shelf',
        aisle: 'B',
        row: '1',
        level: '1',
        capacity: 150.00,
        current_usage: 0,
        status: 'available',
        temperature_controlled: false,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        warehouse_id: whMap['WH-002'],
        code: 'C1',
        name: 'Chiller C1',
        type: 'chiller',
        aisle: 'C',
        row: '1',
        level: '1',
        capacity: 80.00,
        current_usage: 0,
        status: 'available',
        temperature_controlled: true,
        temperature_min: 0.00,
        temperature_max: 8.00,
        created_at: new Date(),
        updated_at: new Date()
      },
      // Gudang Produksi Bandung - WH-003
      {
        warehouse_id: whMap['WH-003'],
        code: 'RM1',
        name: 'Raw Material 1',
        type: 'shelf',
        aisle: 'RM',
        row: '1',
        level: '1',
        capacity: 200.00,
        current_usage: 0,
        status: 'available',
        temperature_controlled: false,
        notes: 'Area penyimpanan bahan baku',
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        warehouse_id: whMap['WH-003'],
        code: 'RM2',
        name: 'Raw Material 2',
        type: 'shelf',
        aisle: 'RM',
        row: '2',
        level: '1',
        capacity: 200.00,
        current_usage: 0,
        status: 'available',
        temperature_controlled: false,
        notes: 'Area penyimpanan bahan baku',
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        warehouse_id: whMap['WH-003'],
        code: 'FG1',
        name: 'Finished Goods 1',
        type: 'rack',
        aisle: 'FG',
        row: '1',
        level: '1',
        capacity: 150.00,
        current_usage: 0,
        status: 'available',
        temperature_controlled: false,
        notes: 'Area produk jadi',
        created_at: new Date(),
        updated_at: new Date()
      }
    ];

    await queryInterface.bulkInsert('locations', locations);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.bulkDelete('locations', null, {});
    await queryInterface.bulkDelete('warehouses', null, {});
  }
};
