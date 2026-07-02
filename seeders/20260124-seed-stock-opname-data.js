'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Get warehouse and location IDs
    const warehouses = await queryInterface.sequelize.query(
      'SELECT id, code FROM warehouses LIMIT 1',
      { type: Sequelize.QueryTypes.SELECT }
    );

    const locations = await queryInterface.sequelize.query(
      'SELECT id, code, warehouse_id FROM locations LIMIT 6',
      { type: Sequelize.QueryTypes.SELECT }
    );

    const products = await queryInterface.sequelize.query(
      'SELECT id, name, sku FROM products LIMIT 8',
      { type: Sequelize.QueryTypes.SELECT }
    );

    if (warehouses.length === 0 || locations.length === 0 || products.length === 0) {
      console.log('Skipping stock opname seeder - missing required data (warehouses, locations, or products)');
      return;
    }

    const warehouseId = warehouses[0].id;

    // Insert stock opnames
    await queryInterface.bulkInsert('stock_opnames', [
      {
        opname_number: 'SO-2024-001',
        opname_type: 'full',
        warehouse_id: warehouseId,
        location_id: null,
        status: 'completed',
        scheduled_date: new Date('2024-01-15'),
        start_date: new Date('2024-01-15 08:00:00'),
        end_date: new Date('2024-01-15 16:30:00'),
        performed_by: 'Budi Santoso, Ahmad Rizki',
        supervised_by: 'Siti Rahayu',
        approved_by: 'Direktur Operasional',
        approved_date: new Date('2024-01-16 10:00:00'),
        total_items: 8,
        counted_items: 8,
        items_with_variance: 3,
        total_variance_value: -450000.00,
        freeze_inventory: true,
        notes: 'Stock opname bulanan periode Januari 2024',
        created_at: new Date('2024-01-14'),
        updated_at: new Date('2024-01-16')
      },
      {
        opname_number: 'SO-2024-002',
        opname_type: 'cycle',
        warehouse_id: warehouseId,
        location_id: locations[0]?.id || null,
        status: 'in_progress',
        scheduled_date: new Date(),
        start_date: new Date(),
        end_date: null,
        performed_by: 'Ahmad Rizki',
        supervised_by: 'Budi Santoso',
        approved_by: null,
        approved_date: null,
        total_items: 6,
        counted_items: 4,
        items_with_variance: 1,
        total_variance_value: -120000.00,
        freeze_inventory: false,
        notes: 'Cycle count mingguan - Area A',
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        opname_number: 'SO-2024-003',
        opname_type: 'spot',
        warehouse_id: warehouseId,
        location_id: locations[2]?.id || null,
        status: 'draft',
        scheduled_date: new Date(Date.now() + 86400000), // tomorrow
        start_date: null,
        end_date: null,
        performed_by: 'Team Warehouse',
        supervised_by: null,
        approved_by: null,
        approved_date: null,
        total_items: 3,
        counted_items: 0,
        items_with_variance: 0,
        total_variance_value: 0,
        freeze_inventory: false,
        notes: 'Spot check untuk produk high-value',
        created_at: new Date(),
        updated_at: new Date()
      }
    ]);

    // Get stock opname IDs
    const stockOpnames = await queryInterface.sequelize.query(
      'SELECT id, opname_number FROM stock_opnames ORDER BY id',
      { type: Sequelize.QueryTypes.SELECT }
    );

    const opnameMap = {};
    stockOpnames.forEach(so => {
      opnameMap[so.opname_number] = so.id;
    });

    // Insert stock opname items for SO-2024-001 (Completed)
    if (products.length >= 6 && locations.length >= 6) {
      const items001 = [
        {
          stock_opname_id: opnameMap['SO-2024-001'],
          product_id: products[0].id,
          location_id: locations[0].id,
          system_stock: 120.00,
          physical_stock: 118.00,
          difference: -2.00,
          variance_percentage: -1.67,
          unit_cost: 15000.00,
          variance_value: -30000.00,
          variance_category: 'minor',
          status: 'approved',
          counted_by: 'Budi Santoso',
          count_date: new Date('2024-01-15 09:30:00'),
          recount_required: false,
          root_cause: 'Selisih kecil dalam penghitungan manual',
          notes: 'Variance dalam batas toleransi',
          created_at: new Date('2024-01-15'),
          updated_at: new Date('2024-01-16')
        },
        {
          stock_opname_id: opnameMap['SO-2024-001'],
          product_id: products[1].id,
          location_id: locations[1].id,
          system_stock: 85.00,
          physical_stock: 85.00,
          difference: 0,
          variance_percentage: 0,
          unit_cost: 25000.00,
          variance_value: 0,
          variance_category: 'none',
          status: 'verified',
          counted_by: 'Ahmad Rizki',
          count_date: new Date('2024-01-15 10:00:00'),
          recount_required: false,
          notes: 'Stock sesuai sistem',
          created_at: new Date('2024-01-15'),
          updated_at: new Date('2024-01-15')
        },
        {
          stock_opname_id: opnameMap['SO-2024-001'],
          product_id: products[2].id,
          location_id: locations[2].id,
          system_stock: 500.00,
          physical_stock: 480.00,
          difference: -20.00,
          variance_percentage: -4.00,
          unit_cost: 12000.00,
          variance_value: -240000.00,
          variance_category: 'moderate',
          status: 'investigated',
          counted_by: 'Budi Santoso',
          count_date: new Date('2024-01-15 11:00:00'),
          recount_required: true,
          recount_value: 480.00,
          recount_by: 'Ahmad Rizki',
          recount_date: new Date('2024-01-15 14:00:00'),
          root_cause: 'Penggunaan produksi tidak tercatat dengan benar',
          corrective_action: 'Update SOP pencatatan produksi, training staff',
          notes: 'Memerlukan perbaikan sistem pencatatan',
          created_at: new Date('2024-01-15'),
          updated_at: new Date('2024-01-16')
        },
        {
          stock_opname_id: opnameMap['SO-2024-001'],
          product_id: products[3].id,
          location_id: locations[3].id,
          system_stock: 300.00,
          physical_stock: 300.00,
          difference: 0,
          variance_percentage: 0,
          unit_cost: 15000.00,
          variance_value: 0,
          variance_category: 'none',
          status: 'verified',
          counted_by: 'Ahmad Rizki',
          count_date: new Date('2024-01-15 11:30:00'),
          recount_required: false,
          notes: 'Stock akurat',
          created_at: new Date('2024-01-15'),
          updated_at: new Date('2024-01-15')
        },
        {
          stock_opname_id: opnameMap['SO-2024-001'],
          product_id: products[4].id,
          location_id: locations[4].id,
          system_stock: 100.00,
          physical_stock: 96.00,
          difference: -4.00,
          variance_percentage: -4.00,
          unit_cost: 45000.00,
          variance_value: -180000.00,
          variance_category: 'moderate',
          status: 'approved',
          counted_by: 'Budi Santoso',
          count_date: new Date('2024-01-15 13:00:00'),
          recount_required: false,
          root_cause: 'Produk rusak tidak dilaporkan',
          corrective_action: 'Implementasi form pelaporan kerusakan',
          notes: 'Ditemukan 4 kg produk rusak',
          created_at: new Date('2024-01-15'),
          updated_at: new Date('2024-01-16')
        },
        {
          stock_opname_id: opnameMap['SO-2024-001'],
          product_id: products[5].id,
          location_id: locations[5].id,
          system_stock: 40.00,
          physical_stock: 40.00,
          difference: 0,
          variance_percentage: 0,
          unit_cost: 85000.00,
          variance_value: 0,
          variance_category: 'none',
          status: 'verified',
          counted_by: 'Ahmad Rizki',
          count_date: new Date('2024-01-15 14:00:00'),
          recount_required: false,
          notes: 'Stock sesuai',
          created_at: new Date('2024-01-15'),
          updated_at: new Date('2024-01-15')
        }
      ];

      await queryInterface.bulkInsert('stock_opname_items', items001);
    }

    // Insert stock opname items for SO-2024-002 (In Progress)
    if (products.length >= 4 && locations.length >= 2) {
      const items002 = [
        {
          stock_opname_id: opnameMap['SO-2024-002'],
          product_id: products[0].id,
          location_id: locations[0].id,
          system_stock: 115.00,
          physical_stock: 115.00,
          difference: 0,
          variance_percentage: 0,
          unit_cost: 15000.00,
          variance_value: 0,
          variance_category: 'none',
          status: 'counted',
          counted_by: 'Ahmad Rizki',
          count_date: new Date(),
          recount_required: false,
          created_at: new Date(),
          updated_at: new Date()
        },
        {
          stock_opname_id: opnameMap['SO-2024-002'],
          product_id: products[1].id,
          location_id: locations[0].id,
          system_stock: 90.00,
          physical_stock: 88.00,
          difference: -2.00,
          variance_percentage: -2.22,
          unit_cost: 25000.00,
          variance_value: -50000.00,
          variance_category: 'moderate',
          status: 'counted',
          counted_by: 'Ahmad Rizki',
          count_date: new Date(),
          recount_required: false,
          created_at: new Date(),
          updated_at: new Date()
        },
        {
          stock_opname_id: opnameMap['SO-2024-002'],
          product_id: products[2].id,
          location_id: locations[1].id,
          system_stock: 460.00,
          physical_stock: 460.00,
          difference: 0,
          variance_percentage: 0,
          unit_cost: 12000.00,
          variance_value: 0,
          variance_category: 'none',
          status: 'counted',
          counted_by: 'Ahmad Rizki',
          count_date: new Date(),
          recount_required: false,
          created_at: new Date(),
          updated_at: new Date()
        },
        {
          stock_opname_id: opnameMap['SO-2024-002'],
          product_id: products[3].id,
          location_id: locations[1].id,
          system_stock: 295.00,
          physical_stock: null,
          difference: 0,
          variance_percentage: 0,
          unit_cost: 15000.00,
          variance_value: 0,
          variance_category: 'none',
          status: 'pending',
          counted_by: null,
          count_date: null,
          recount_required: false,
          notes: 'Belum dihitung',
          created_at: new Date(),
          updated_at: new Date()
        }
      ];

      await queryInterface.bulkInsert('stock_opname_items', items002);
    }

    // Insert incident reports
    const incidentReports = [
      {
        incident_number: 'INC-2024-001',
        stock_opname_id: opnameMap['SO-2024-001'],
        product_id: products[2].id,
        variance_quantity: -20.00,
        variance_value: -240000.00,
        variance_category: 'moderate',
        why_1: 'Physical stock kurang dari system stock',
        why_2: 'Produk digunakan untuk produksi tetapi tidak tercatat',
        why_3: 'Form produksi tidak diisi dengan lengkap',
        why_4: 'Staff produksi tidak mengikuti SOP',
        why_5: 'Kurangnya training dan supervisi',
        root_cause: 'Kurangnya training staff produksi dan supervisi yang tidak konsisten dalam pencatatan penggunaan bahan baku',
        evidence_notes: 'Ditemukan form produksi yang tidak lengkap, CCTV menunjukkan pengambilan bahan baku tanpa dokumentasi',
        witness_statement: 'Staff produksi mengakui lupa mengisi form karena terburu-buru',
        immediate_action: 'Melakukan recount, isolasi area, training ulang staff',
        corrective_action: 'Update SOP pencatatan produksi, implementasi checklist wajib, training staff produksi',
        preventive_action: 'Daily supervision, implementasi barcode scanner untuk tracking real-time, monthly refresher training',
        responsible_person: 'Supervisor Produksi',
        target_date: new Date('2024-02-01'),
        approval_level: 'Manajer',
        approval_status: 'approved',
        approved_by: 'Manajer Operasional',
        approved_date: new Date('2024-01-16 15:00:00'),
        approver_comments: 'Approved dengan catatan untuk segera implementasi barcode system',
        created_at: new Date('2024-01-15'),
        updated_at: new Date('2024-01-16')
      },
      {
        incident_number: 'INC-2024-002',
        stock_opname_id: opnameMap['SO-2024-001'],
        product_id: products[4].id,
        variance_quantity: -4.00,
        variance_value: -180000.00,
        variance_category: 'moderate',
        why_1: 'Physical stock kurang 4 kg',
        why_2: 'Produk rusak tidak dilaporkan',
        why_3: 'Tidak ada form pelaporan kerusakan',
        why_4: 'Staff tidak tahu prosedur pelaporan',
        why_5: 'Kurangnya sosialisasi SOP',
        root_cause: 'Tidak adanya sistem pelaporan kerusakan produk yang jelas dan kurangnya sosialisasi SOP kepada staff',
        evidence_notes: 'Ditemukan produk rusak di area penyimpanan yang tidak terdokumentasi',
        witness_statement: 'Staff warehouse menyatakan tidak tahu harus melapor kemana jika ada produk rusak',
        immediate_action: 'Dokumentasi produk rusak, pembuatan form pelaporan darurat',
        corrective_action: 'Implementasi form pelaporan kerusakan, sosialisasi SOP ke seluruh staff, penunjukan PIC handling produk rusak',
        preventive_action: 'Daily inspection, weekly meeting untuk review, implementasi sistem digital untuk pelaporan',
        responsible_person: 'Supervisor Warehouse',
        target_date: new Date('2024-01-31'),
        approval_level: 'Manajer',
        approval_status: 'approved',
        approved_by: 'Manajer Operasional',
        approved_date: new Date('2024-01-16 15:30:00'),
        approver_comments: 'Approved, prioritaskan implementasi form digital',
        created_at: new Date('2024-01-15'),
        updated_at: new Date('2024-01-16')
      }
    ];

    await queryInterface.bulkInsert('incident_reports', incidentReports);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.bulkDelete('incident_reports', null, {});
    await queryInterface.bulkDelete('stock_opname_items', null, {});
    await queryInterface.bulkDelete('stock_opnames', null, {});
  }
};
