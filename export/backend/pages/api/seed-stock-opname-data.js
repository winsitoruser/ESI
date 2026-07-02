const { Warehouse, Location, StockOpname, StockOpnameItem, IncidentReport, Product } = require('../../models');

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  try {
    // Check if data already exists
    const existingWarehouses = await Warehouse.count();
    if (existingWarehouses > 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'Data sudah ada. Gunakan endpoint ini hanya untuk inisialisasi pertama kali.' 
      });
    }

    // Create Warehouses
    const warehouses = await Warehouse.bulkCreate([
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
        notes: 'Gudang utama untuk distribusi wilayah Jakarta dan sekitarnya'
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
        notes: 'Gudang cabang untuk wilayah Jawa Timur'
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
        notes: 'Gudang khusus untuk produksi dan raw material'
      }
    ]);

    // Create Locations
    const locations = await Location.bulkCreate([
      // Gudang Utama Jakarta
      { warehouse_id: warehouses[0].id, code: 'A1', name: 'Rak A1', type: 'rack', aisle: 'A', row: '1', level: '1', capacity: 150.00, status: 'available' },
      { warehouse_id: warehouses[0].id, code: 'A2', name: 'Rak A2', type: 'rack', aisle: 'A', row: '2', level: '1', capacity: 150.00, status: 'available' },
      { warehouse_id: warehouses[0].id, code: 'A3', name: 'Rak A3', type: 'rack', aisle: 'A', row: '3', level: '1', capacity: 150.00, status: 'available' },
      { warehouse_id: warehouses[0].id, code: 'B1', name: 'Gudang B1', type: 'shelf', aisle: 'B', row: '1', level: '1', capacity: 250.00, status: 'available' },
      { warehouse_id: warehouses[0].id, code: 'B2', name: 'Gudang B2', type: 'shelf', aisle: 'B', row: '2', level: '1', capacity: 250.00, status: 'available' },
      { warehouse_id: warehouses[0].id, code: 'B3', name: 'Gudang B3', type: 'shelf', aisle: 'B', row: '3', level: '1', capacity: 250.00, status: 'available' },
      { warehouse_id: warehouses[0].id, code: 'B4', name: 'Gudang B4', type: 'shelf', aisle: 'B', row: '4', level: '1', capacity: 250.00, status: 'available' },
      { warehouse_id: warehouses[0].id, code: 'C1', name: 'Chiller C1', type: 'chiller', aisle: 'C', row: '1', level: '1', capacity: 200.00, status: 'available', temperature_controlled: true, temperature_min: 0, temperature_max: 8 },
      { warehouse_id: warehouses[0].id, code: 'F1', name: 'Freezer F1', type: 'freezer', aisle: 'F', row: '1', level: '1', capacity: 150.00, status: 'available', temperature_controlled: true, temperature_min: -20, temperature_max: -10 },
      // Gudang Cabang Surabaya
      { warehouse_id: warehouses[1].id, code: 'A1', name: 'Rak A1', type: 'rack', aisle: 'A', row: '1', level: '1', capacity: 100.00, status: 'available' },
      { warehouse_id: warehouses[1].id, code: 'A2', name: 'Rak A2', type: 'rack', aisle: 'A', row: '2', level: '1', capacity: 100.00, status: 'available' },
      { warehouse_id: warehouses[1].id, code: 'B1', name: 'Gudang B1', type: 'shelf', aisle: 'B', row: '1', level: '1', capacity: 150.00, status: 'available' },
      { warehouse_id: warehouses[1].id, code: 'C1', name: 'Chiller C1', type: 'chiller', aisle: 'C', row: '1', level: '1', capacity: 80.00, status: 'available', temperature_controlled: true, temperature_min: 0, temperature_max: 8 },
      // Gudang Produksi Bandung
      { warehouse_id: warehouses[2].id, code: 'RM1', name: 'Raw Material 1', type: 'shelf', aisle: 'RM', row: '1', level: '1', capacity: 200.00, status: 'available', notes: 'Area penyimpanan bahan baku' },
      { warehouse_id: warehouses[2].id, code: 'RM2', name: 'Raw Material 2', type: 'shelf', aisle: 'RM', row: '2', level: '1', capacity: 200.00, status: 'available', notes: 'Area penyimpanan bahan baku' },
      { warehouse_id: warehouses[2].id, code: 'FG1', name: 'Finished Goods 1', type: 'rack', aisle: 'FG', row: '1', level: '1', capacity: 150.00, status: 'available', notes: 'Area produk jadi' }
    ]);

    // Get some products for stock opname items
    const products = await Product.findAll({ limit: 6 });

    if (products.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Tidak ada produk. Silakan buat produk terlebih dahulu.'
      });
    }

    // Create Stock Opnames
    const stockOpnames = await StockOpname.bulkCreate([
      {
        opname_number: 'SO-2024-001',
        opname_type: 'full',
        warehouse_id: warehouses[0].id,
        status: 'completed',
        scheduled_date: new Date('2024-01-15'),
        start_date: new Date('2024-01-15 08:00:00'),
        end_date: new Date('2024-01-15 16:30:00'),
        performed_by: 'Budi Santoso, Ahmad Rizki',
        supervised_by: 'Siti Rahayu',
        approved_by: 'Direktur Operasional',
        approved_date: new Date('2024-01-16 10:00:00'),
        total_items: 6,
        counted_items: 6,
        items_with_variance: 3,
        total_variance_value: -450000.00,
        freeze_inventory: true,
        notes: 'Stock opname bulanan periode Januari 2024'
      },
      {
        opname_number: 'SO-2024-002',
        opname_type: 'cycle',
        warehouse_id: warehouses[0].id,
        location_id: locations[0].id,
        status: 'in_progress',
        scheduled_date: new Date(),
        start_date: new Date(),
        performed_by: 'Ahmad Rizki',
        supervised_by: 'Budi Santoso',
        total_items: 4,
        counted_items: 3,
        items_with_variance: 1,
        total_variance_value: -50000.00,
        freeze_inventory: false,
        notes: 'Cycle count mingguan - Area A'
      }
    ]);

    // Create Stock Opname Items
    await StockOpnameItem.bulkCreate([
      {
        stock_opname_id: stockOpnames[0].id,
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
        notes: 'Variance dalam batas toleransi'
      },
      {
        stock_opname_id: stockOpnames[0].id,
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
        notes: 'Stock sesuai sistem'
      },
      {
        stock_opname_id: stockOpnames[0].id,
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
        notes: 'Memerlukan perbaikan sistem pencatatan'
      }
    ]);

    return res.status(200).json({
      success: true,
      message: 'Data dummy berhasil dibuat',
      data: {
        warehouses: warehouses.length,
        locations: locations.length,
        stockOpnames: stockOpnames.length,
        summary: {
          warehouses: warehouses.map(w => ({ id: w.id, code: w.code, name: w.name })),
          totalLocations: locations.length,
          stockOpnameNumbers: stockOpnames.map(so => so.opname_number)
        }
      }
    });

  } catch (error) {
    console.error('Seed Data Error:', error);
    return res.status(500).json({ 
      success: false, 
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
}
