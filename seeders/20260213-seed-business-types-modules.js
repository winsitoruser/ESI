'use strict';

const { v4: uuidv4 } = require('uuid');

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Generate UUIDs for business types
    const retailId = uuidv4();
    const fnbId = uuidv4();
    const hybridId = uuidv4();

    // 1. Seed business_types
    await queryInterface.bulkInsert('business_types', [
      {
        id: retailId,
        code: 'retail',
        name: 'Retail/Toko',
        description: 'Toko retail, minimarket, supermarket, toko kelontong',
        icon: 'shopping-cart',
        is_active: true,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        id: fnbId,
        code: 'fnb',
        name: 'F&B/Restaurant',
        description: 'Rumah makan, restoran, cafe, warung, katering',
        icon: 'utensils',
        is_active: true,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        id: hybridId,
        code: 'hybrid',
        name: 'Hybrid',
        description: 'Kombinasi retail dan F&B (contoh: cafe dengan retail products)',
        icon: 'store',
        is_active: true,
        created_at: new Date(),
        updated_at: new Date()
      }
    ]);

    // Generate UUIDs for modules
    const moduleIds = {
      dashboard: uuidv4(),
      pos: uuidv4(),
      inventory: uuidv4(),
      products: uuidv4(),
      customers: uuidv4(),
      finance: uuidv4(),
      reports: uuidv4(),
      employees: uuidv4(),
      settings: uuidv4(),
      tables: uuidv4(),
      reservations: uuidv4(),
      hpp: uuidv4(),
      suppliers: uuidv4(),
      promo: uuidv4(),
      loyalty: uuidv4()
    };

    // 2. Seed modules
    await queryInterface.bulkInsert('modules', [
      // Core modules (always shown)
      {
        id: moduleIds.dashboard,
        code: 'dashboard',
        name: 'Dashboard',
        description: 'Dashboard utama dengan overview bisnis',
        icon: 'layout-dashboard',
        route: '/dashboard',
        parent_module_id: null,
        sort_order: 1,
        is_core: true,
        is_active: true,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        id: moduleIds.pos,
        code: 'pos',
        name: 'POS/Kasir',
        description: 'Point of Sale untuk transaksi penjualan',
        icon: 'shopping-cart',
        route: '/pos',
        parent_module_id: null,
        sort_order: 2,
        is_core: true,
        is_active: true,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        id: moduleIds.inventory,
        code: 'inventory',
        name: 'Inventori',
        description: 'Manajemen stok dan inventori',
        icon: 'package',
        route: '/inventory',
        parent_module_id: null,
        sort_order: 3,
        is_core: true,
        is_active: true,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        id: moduleIds.products,
        code: 'products',
        name: 'Produk',
        description: 'Katalog produk dan harga',
        icon: 'box',
        route: '/products',
        parent_module_id: null,
        sort_order: 4,
        is_core: true,
        is_active: true,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        id: moduleIds.customers,
        code: 'customers',
        name: 'Pelanggan',
        description: 'Database pelanggan',
        icon: 'users',
        route: '/customers',
        parent_module_id: null,
        sort_order: 5,
        is_core: true,
        is_active: true,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        id: moduleIds.finance,
        code: 'finance',
        name: 'Keuangan',
        description: 'Manajemen keuangan dan akuntansi',
        icon: 'wallet',
        route: '/finance',
        parent_module_id: null,
        sort_order: 6,
        is_core: true,
        is_active: true,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        id: moduleIds.reports,
        code: 'reports',
        name: 'Laporan',
        description: 'Laporan dan analisis bisnis',
        icon: 'bar-chart-3',
        route: '/reports',
        parent_module_id: null,
        sort_order: 7,
        is_core: true,
        is_active: true,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        id: moduleIds.employees,
        code: 'employees',
        name: 'Karyawan',
        description: 'Manajemen karyawan dan shift',
        icon: 'users',
        route: '/employees',
        parent_module_id: null,
        sort_order: 8,
        is_core: true,
        is_active: true,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        id: moduleIds.settings,
        code: 'settings',
        name: 'Pengaturan',
        description: 'Pengaturan sistem',
        icon: 'settings',
        route: '/settings',
        parent_module_id: null,
        sort_order: 99,
        is_core: true,
        is_active: true,
        created_at: new Date(),
        updated_at: new Date()
      },

      // F&B specific modules
      {
        id: moduleIds.tables,
        code: 'tables',
        name: 'Manajemen Meja',
        description: 'Manajemen meja untuk restoran/cafe',
        icon: 'utensils',
        route: '/tables',
        parent_module_id: null,
        sort_order: 10,
        is_core: false,
        is_active: true,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        id: moduleIds.reservations,
        code: 'reservations',
        name: 'Reservasi',
        description: 'Sistem reservasi meja',
        icon: 'calendar',
        route: '/reservations',
        parent_module_id: null,
        sort_order: 11,
        is_core: false,
        is_active: true,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        id: moduleIds.hpp,
        code: 'hpp',
        name: 'Analisa HPP',
        description: 'Analisa Harga Pokok Penjualan',
        icon: 'dollar-sign',
        route: '/products/hpp-analysis',
        parent_module_id: null,
        sort_order: 12,
        is_core: false,
        is_active: true,
        created_at: new Date(),
        updated_at: new Date()
      },

      // Retail specific modules
      {
        id: moduleIds.suppliers,
        code: 'suppliers',
        name: 'Supplier',
        description: 'Manajemen supplier dan purchase order',
        icon: 'truck',
        route: '/suppliers',
        parent_module_id: null,
        sort_order: 13,
        is_core: false,
        is_active: true,
        created_at: new Date(),
        updated_at: new Date()
      },

      // Optional modules
      {
        id: moduleIds.promo,
        code: 'promo',
        name: 'Promo & Voucher',
        description: 'Manajemen promo dan voucher',
        icon: 'ticket',
        route: '/promo-voucher',
        parent_module_id: null,
        sort_order: 14,
        is_core: false,
        is_active: true,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        id: moduleIds.loyalty,
        code: 'loyalty',
        name: 'Program Loyalitas',
        description: 'Program loyalitas pelanggan',
        icon: 'award',
        route: '/loyalty-program',
        parent_module_id: null,
        sort_order: 15,
        is_core: false,
        is_active: true,
        created_at: new Date(),
        updated_at: new Date()
      }
    ]);

    // 3. Seed business_type_modules for RETAIL
    const retailModules = [
      // Core modules (all)
      { moduleId: moduleIds.dashboard, isDefault: true, isOptional: false },
      { moduleId: moduleIds.pos, isDefault: true, isOptional: false },
      { moduleId: moduleIds.inventory, isDefault: true, isOptional: false },
      { moduleId: moduleIds.products, isDefault: true, isOptional: false },
      { moduleId: moduleIds.customers, isDefault: true, isOptional: false },
      { moduleId: moduleIds.finance, isDefault: true, isOptional: false },
      { moduleId: moduleIds.reports, isDefault: true, isOptional: false },
      { moduleId: moduleIds.employees, isDefault: true, isOptional: false },
      { moduleId: moduleIds.settings, isDefault: true, isOptional: false },
      // Retail specific
      { moduleId: moduleIds.suppliers, isDefault: true, isOptional: false },
      // Optional
      { moduleId: moduleIds.promo, isDefault: false, isOptional: true },
      { moduleId: moduleIds.loyalty, isDefault: false, isOptional: true },
      { moduleId: moduleIds.hpp, isDefault: false, isOptional: true }
      // NOT included: tables, reservations
    ];

    await queryInterface.bulkInsert('business_type_modules', 
      retailModules.map(m => ({
        id: uuidv4(),
        business_type_id: retailId,
        module_id: m.moduleId,
        is_default: m.isDefault,
        is_optional: m.isOptional,
        created_at: new Date()
      }))
    );

    // 4. Seed business_type_modules for F&B
    const fnbModules = [
      // Core modules (all)
      { moduleId: moduleIds.dashboard, isDefault: true, isOptional: false },
      { moduleId: moduleIds.pos, isDefault: true, isOptional: false },
      { moduleId: moduleIds.inventory, isDefault: true, isOptional: false },
      { moduleId: moduleIds.products, isDefault: true, isOptional: false },
      { moduleId: moduleIds.customers, isDefault: true, isOptional: false },
      { moduleId: moduleIds.finance, isDefault: true, isOptional: false },
      { moduleId: moduleIds.reports, isDefault: true, isOptional: false },
      { moduleId: moduleIds.employees, isDefault: true, isOptional: false },
      { moduleId: moduleIds.settings, isDefault: true, isOptional: false },
      // F&B specific
      { moduleId: moduleIds.tables, isDefault: true, isOptional: false },
      { moduleId: moduleIds.reservations, isDefault: true, isOptional: false },
      { moduleId: moduleIds.hpp, isDefault: true, isOptional: false },
      // Optional
      { moduleId: moduleIds.promo, isDefault: false, isOptional: true },
      { moduleId: moduleIds.loyalty, isDefault: false, isOptional: true }
      // NOT included: suppliers
    ];

    await queryInterface.bulkInsert('business_type_modules', 
      fnbModules.map(m => ({
        id: uuidv4(),
        business_type_id: fnbId,
        module_id: m.moduleId,
        is_default: m.isDefault,
        is_optional: m.isOptional,
        created_at: new Date()
      }))
    );

    // 5. Seed business_type_modules for HYBRID (all modules)
    const hybridModules = [
      { moduleId: moduleIds.dashboard, isDefault: true, isOptional: false },
      { moduleId: moduleIds.pos, isDefault: true, isOptional: false },
      { moduleId: moduleIds.inventory, isDefault: true, isOptional: false },
      { moduleId: moduleIds.products, isDefault: true, isOptional: false },
      { moduleId: moduleIds.customers, isDefault: true, isOptional: false },
      { moduleId: moduleIds.finance, isDefault: true, isOptional: false },
      { moduleId: moduleIds.reports, isDefault: true, isOptional: false },
      { moduleId: moduleIds.employees, isDefault: true, isOptional: false },
      { moduleId: moduleIds.settings, isDefault: true, isOptional: false },
      { moduleId: moduleIds.tables, isDefault: true, isOptional: false },
      { moduleId: moduleIds.reservations, isDefault: true, isOptional: false },
      { moduleId: moduleIds.hpp, isDefault: true, isOptional: false },
      { moduleId: moduleIds.suppliers, isDefault: true, isOptional: false },
      { moduleId: moduleIds.promo, isDefault: false, isOptional: true },
      { moduleId: moduleIds.loyalty, isDefault: false, isOptional: true }
    ];

    await queryInterface.bulkInsert('business_type_modules', 
      hybridModules.map(m => ({
        id: uuidv4(),
        business_type_id: hybridId,
        module_id: m.moduleId,
        is_default: m.isDefault,
        is_optional: m.isOptional,
        created_at: new Date()
      }))
    );
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.bulkDelete('business_type_modules', null, {});
    await queryInterface.bulkDelete('modules', null, {});
    await queryInterface.bulkDelete('business_types', null, {});
  }
};
