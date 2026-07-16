'use strict';

const { v4: uuidv4 } = require('uuid');

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Generate UUIDs for business types
    const retailId = uuidv4();
    const fnbId = uuidv4();
    const hybridId = uuidv4();

    // 1. Seed business_types (idempotent)
    const ensureBusinessType = async (code, name, description, icon) => {
      const found = await queryInterface.sequelize.query(
        `SELECT id FROM business_types WHERE code = :code LIMIT 1`,
        { replacements: { code }, type: Sequelize.QueryTypes.SELECT }
      );
      if (found.length) return found[0].id;

      const res = await queryInterface.sequelize.query(
        `INSERT INTO business_types (id, code, name, description, icon, is_active, created_at, updated_at)
         VALUES (:id, :code, :name, :description, :icon, true, :now, :now)
         RETURNING id`,
        { replacements: { id: uuidv4(), code, name, description, icon, now: new Date() }, type: Sequelize.QueryTypes.INSERT }
      );
      // res may vary by pg driver; run a select fallback
      const inserted = await queryInterface.sequelize.query(
        `SELECT id FROM business_types WHERE code = :code LIMIT 1`,
        { replacements: { code }, type: Sequelize.QueryTypes.SELECT }
      );
      return inserted[0].id;
    };

    const retailTypeId = await ensureBusinessType('retail', 'Retail/Toko', 'Toko retail, minimarket, supermarket, toko kelontong', 'shopping-cart');
    const fnbTypeId = await ensureBusinessType('fnb', 'F&B/Restaurant', 'Rumah makan, restoran, cafe, warung, katering', 'utensils');
    const hybridTypeId = await ensureBusinessType('hybrid', 'Hybrid', 'Kombinasi retail dan F&B (contoh: cafe dengan retail products)', 'store');

    // Generate or find module IDs (idempotent insert)
    const ensureModule = async (code, name, opts = {}) => {
      const found = await queryInterface.sequelize.query(
        `SELECT id FROM modules WHERE code = :code LIMIT 1`,
        { replacements: { code }, type: Sequelize.QueryTypes.SELECT }
      );
      if (found.length) return found[0].id;

      const id = uuidv4();
      const now = new Date();
      const cols = ['id', 'code', 'name', 'description', 'icon', 'route', 'parent_module_id', 'sort_order', 'is_core', 'is_active', 'created_at', 'updated_at'];
      const values = [id, code, name, opts.description || null, opts.icon || null, opts.route || null, null, opts.sort_order || 99, !!opts.is_core, true, now, now];
      await queryInterface.sequelize.query(
        `INSERT INTO modules (${cols.join(',')}) VALUES (${cols.map((c, i) => `:v${i}`).join(',')})`,
        { replacements: Object.fromEntries(values.map((v, i) => [`v${i}`, v])), type: Sequelize.QueryTypes.INSERT }
      );
      return id;
    };

    const moduleIds = {};
    moduleIds.dashboard = await ensureModule('dashboard', 'Dashboard', { description: 'Dashboard utama dengan overview bisnis', icon: 'layout-dashboard', route: '/dashboard', sort_order: 1, is_core: true });
    moduleIds.pos = await ensureModule('pos', 'POS/Kasir', { description: 'Point of Sale untuk transaksi penjualan', icon: 'shopping-cart', route: '/pos', sort_order: 2, is_core: true });
    moduleIds.inventory = await ensureModule('inventory', 'Inventori', { description: 'Manajemen stok dan inventori', icon: 'package', route: '/inventory', sort_order: 3, is_core: true });
    moduleIds.products = await ensureModule('products', 'Produk', { description: 'Katalog produk dan harga', icon: 'box', route: '/products', sort_order: 4, is_core: true });
    moduleIds.customers = await ensureModule('customers', 'Pelanggan', { description: 'Database pelanggan', icon: 'users', route: '/customers', sort_order: 5, is_core: true });
    moduleIds.finance = await ensureModule('finance', 'Keuangan', { description: 'Manajemen keuangan dan akuntansi', icon: 'wallet', route: '/finance', sort_order: 6, is_core: true });
    moduleIds.reports = await ensureModule('reports', 'Laporan', { description: 'Laporan dan analisis bisnis', icon: 'bar-chart-3', route: '/reports', sort_order: 7, is_core: true });
    moduleIds.employees = await ensureModule('employees', 'Karyawan', { description: 'Manajemen karyawan dan shift', icon: 'users', route: '/employees', sort_order: 8, is_core: true });
    moduleIds.settings = await ensureModule('settings', 'Pengaturan', { description: 'Pengaturan sistem', icon: 'settings', route: '/settings', sort_order: 99, is_core: true });
    moduleIds.tables = await ensureModule('tables', 'Manajemen Meja', { description: 'Manajemen meja untuk restoran/cafe', icon: 'utensils', route: '/tables', sort_order: 10 });
    moduleIds.reservations = await ensureModule('reservations', 'Reservasi', { description: 'Sistem reservasi meja', icon: 'calendar', route: '/reservations', sort_order: 11 });
    moduleIds.hpp = await ensureModule('hpp', 'Analisa HPP', { description: 'Analisa Harga Pokok Penjualan', icon: 'dollar-sign', route: '/products/hpp-analysis', sort_order: 12 });
    moduleIds.suppliers = await ensureModule('suppliers', 'Supplier', { description: 'Manajemen supplier dan purchase order', icon: 'truck', route: '/suppliers', sort_order: 13 });
    moduleIds.promo = await ensureModule('promo', 'Promo & Voucher', { description: 'Manajemen promo dan voucher', icon: 'ticket', route: '/promo-voucher', sort_order: 14 });
    moduleIds.loyalty = await ensureModule('loyalty', 'Program Loyalitas', { description: 'Program loyalitas pelanggan', icon: 'award', route: '/loyalty-program', sort_order: 15 });

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

    // 3. Seed business_type_modules for RETAIL (only add missing mappings)
    for (const m of retailModules) {
      const modId = m.moduleId;
      const exists = await queryInterface.sequelize.query(
        `SELECT id FROM business_type_modules WHERE business_type_id = :bt AND module_id = :mid LIMIT 1`,
        { replacements: { bt: retailTypeId, mid: modId }, type: Sequelize.QueryTypes.SELECT }
      );
      if (exists.length === 0) {
        await queryInterface.bulkInsert('business_type_modules', [{
          id: uuidv4(),
          business_type_id: retailTypeId,
          module_id: modId,
          is_default: m.isDefault,
          is_optional: m.isOptional,
          created_at: new Date()
        }]);
      }
    }

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

    // 4. Seed business_type_modules for F&B
    for (const m of fnbModules) {
      const exists = await queryInterface.sequelize.query(
        `SELECT id FROM business_type_modules WHERE business_type_id = :bt AND module_id = :mid LIMIT 1`,
        { replacements: { bt: fnbTypeId, mid: m.moduleId }, type: Sequelize.QueryTypes.SELECT }
      );
      if (exists.length === 0) {
        await queryInterface.bulkInsert('business_type_modules', [{
          id: uuidv4(),
          business_type_id: fnbTypeId,
          module_id: m.moduleId,
          is_default: m.isDefault,
          is_optional: m.isOptional,
          created_at: new Date()
        }]);
      }
    }

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

    // 5. Seed business_type_modules for HYBRID
    for (const m of hybridModules) {
      const exists = await queryInterface.sequelize.query(
        `SELECT id FROM business_type_modules WHERE business_type_id = :bt AND module_id = :mid LIMIT 1`,
        { replacements: { bt: hybridTypeId, mid: m.moduleId }, type: Sequelize.QueryTypes.SELECT }
      );
      if (exists.length === 0) {
        await queryInterface.bulkInsert('business_type_modules', [{
          id: uuidv4(),
          business_type_id: hybridTypeId,
          module_id: m.moduleId,
          is_default: m.isDefault,
          is_optional: m.isOptional,
          created_at: new Date()
        }]);
      }
    }
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.bulkDelete('business_type_modules', null, {});
    await queryInterface.bulkDelete('modules', null, {});
    await queryInterface.bulkDelete('business_types', null, {});
  }
};
