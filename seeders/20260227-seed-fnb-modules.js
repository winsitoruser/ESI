'use strict';

const { v4: uuidv4 } = require('uuid');

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const now = new Date();
    
    // Get business types
    const businessTypes = await queryInterface.sequelize.query(
      `SELECT id, code FROM business_types WHERE code IN ('fine_dining', 'cloud_kitchen', 'qsr', 'cafe')`,
      { type: Sequelize.QueryTypes.SELECT }
    );
    
    const btMap = {};
    businessTypes.forEach(bt => {
      btMap[bt.code] = bt.id;
    });
    
    // Define F&B modules
    const modules = [
      {
        id: uuidv4(),
        code: 'POS_CORE',
        name: 'Point of Sale',
        description: 'Core POS functionality for order taking and payment processing',
        category: 'core',
        icon: 'ShoppingCart',
        route: '/pos',
        is_active: true,
        sort_order: 1,
        version: '1.0.0',
        created_at: now,
        updated_at: now
      },
      {
        id: uuidv4(),
        code: 'INVENTORY_CORE',
        name: 'Inventory Management',
        description: 'Stock tracking and inventory management',
        category: 'core',
        icon: 'Package',
        route: '/inventory',
        is_active: true,
        sort_order: 2,
        version: '1.0.0',
        created_at: now,
        updated_at: now
      },
      {
        id: uuidv4(),
        code: 'TABLE_MANAGEMENT',
        name: 'Table Management',
        description: 'Floor plan and table management for dine-in',
        category: 'fnb',
        icon: 'Grid',
        route: '/tables',
        is_active: true,
        sort_order: 10,
        version: '1.0.0',
        created_at: now,
        updated_at: now
      },
      {
        id: uuidv4(),
        code: 'KITCHEN_DISPLAY',
        name: 'Kitchen Display System',
        description: 'Kitchen order management and display',
        category: 'fnb',
        icon: 'ChefHat',
        route: '/kitchen',
        is_active: true,
        sort_order: 11,
        version: '1.0.0',
        created_at: now,
        updated_at: now
      },
      {
        id: uuidv4(),
        code: 'RECIPE_MANAGEMENT',
        name: 'Recipe Management',
        description: 'Recipe cards and ingredient management',
        category: 'fnb',
        icon: 'BookOpen',
        route: '/recipes',
        is_active: true,
        sort_order: 12,
        version: '1.0.0',
        created_at: now,
        updated_at: now
      },
      {
        id: uuidv4(),
        code: 'RESERVATION',
        name: 'Reservation System',
        description: 'Table reservation and booking management',
        category: 'optional',
        icon: 'Calendar',
        route: '/reservations',
        is_active: true,
        sort_order: 20,
        version: '1.0.0',
        created_at: now,
        updated_at: now
      },
      {
        id: uuidv4(),
        code: 'ONLINE_ORDERING',
        name: 'Online Ordering',
        description: 'Web and mobile ordering platform',
        category: 'optional',
        icon: 'Globe',
        route: '/online-orders',
        is_active: true,
        sort_order: 21,
        version: '1.0.0',
        created_at: now,
        updated_at: now
      },
      {
        id: uuidv4(),
        code: 'DELIVERY_MANAGEMENT',
        name: 'Delivery Management',
        description: 'Delivery tracking and driver management',
        category: 'optional',
        icon: 'Truck',
        route: '/delivery',
        is_active: true,
        sort_order: 22,
        version: '1.0.0',
        created_at: now,
        updated_at: now
      },
      {
        id: uuidv4(),
        code: 'LOYALTY_PROGRAM',
        name: 'Loyalty Program',
        description: 'Customer loyalty and rewards program',
        category: 'optional',
        icon: 'Award',
        route: '/loyalty',
        is_active: true,
        sort_order: 23,
        version: '1.0.0',
        created_at: now,
        updated_at: now
      },
      {
        id: uuidv4(),
        code: 'WAITER_APP',
        name: 'Waiter App',
        description: 'Mobile app for waiters to take orders',
        category: 'addon',
        icon: 'Smartphone',
        route: '/waiter',
        is_active: true,
        sort_order: 30,
        version: '1.0.0',
        created_at: now,
        updated_at: now
      }
    ];
    
    // Insert modules (only missing) and build moduleMap from DB
    const moduleCodes = modules.map(m => m.code);
    const existingModules = await queryInterface.sequelize.query(
      `SELECT code, id FROM modules WHERE code IN (:codes)`,
      { replacements: { codes: moduleCodes }, type: Sequelize.QueryTypes.SELECT }
    );
    const existingModuleSet = new Set(existingModules.map(r => r.code));
    const toInsertModules = modules.filter(m => !existingModuleSet.has(m.code));
    if (toInsertModules.length) await queryInterface.bulkInsert('modules', toInsertModules);

    const allModules = await queryInterface.sequelize.query(
      `SELECT code, id FROM modules WHERE code IN (:codes)`,
      { replacements: { codes: moduleCodes }, type: Sequelize.QueryTypes.SELECT }
    );
    const moduleMap = {};
    allModules.forEach(m => { moduleMap[m.code] = m.id; });
    
    // Define business type module associations
    const businessTypeModules = [
      // Fine Dining
      { business_type_id: btMap.fine_dining, module_id: moduleMap.POS_CORE, is_default: true, is_optional: false },
      { business_type_id: btMap.fine_dining, module_id: moduleMap.INVENTORY_CORE, is_default: true, is_optional: false },
      { business_type_id: btMap.fine_dining, module_id: moduleMap.TABLE_MANAGEMENT, is_default: true, is_optional: false },
      { business_type_id: btMap.fine_dining, module_id: moduleMap.KITCHEN_DISPLAY, is_default: true, is_optional: false },
      { business_type_id: btMap.fine_dining, module_id: moduleMap.RECIPE_MANAGEMENT, is_default: true, is_optional: false },
      { business_type_id: btMap.fine_dining, module_id: moduleMap.RESERVATION, is_default: true, is_optional: true },
      { business_type_id: btMap.fine_dining, module_id: moduleMap.WAITER_APP, is_default: false, is_optional: true },
      
      // Cloud Kitchen
      { business_type_id: btMap.cloud_kitchen, module_id: moduleMap.POS_CORE, is_default: true, is_optional: false },
      { business_type_id: btMap.cloud_kitchen, module_id: moduleMap.INVENTORY_CORE, is_default: true, is_optional: false },
      { business_type_id: btMap.cloud_kitchen, module_id: moduleMap.KITCHEN_DISPLAY, is_default: true, is_optional: false },
      { business_type_id: btMap.cloud_kitchen, module_id: moduleMap.RECIPE_MANAGEMENT, is_default: true, is_optional: false },
      { business_type_id: btMap.cloud_kitchen, module_id: moduleMap.ONLINE_ORDERING, is_default: true, is_optional: false },
      { business_type_id: btMap.cloud_kitchen, module_id: moduleMap.DELIVERY_MANAGEMENT, is_default: true, is_optional: false },
      
      // QSR
      { business_type_id: btMap.qsr, module_id: moduleMap.POS_CORE, is_default: true, is_optional: false },
      { business_type_id: btMap.qsr, module_id: moduleMap.INVENTORY_CORE, is_default: true, is_optional: false },
      { business_type_id: btMap.qsr, module_id: moduleMap.KITCHEN_DISPLAY, is_default: true, is_optional: false },
      { business_type_id: btMap.qsr, module_id: moduleMap.ONLINE_ORDERING, is_default: false, is_optional: true },
      { business_type_id: btMap.qsr, module_id: moduleMap.LOYALTY_PROGRAM, is_default: false, is_optional: true },
      
      // Cafe
      { business_type_id: btMap.cafe, module_id: moduleMap.POS_CORE, is_default: true, is_optional: false },
      { business_type_id: btMap.cafe, module_id: moduleMap.INVENTORY_CORE, is_default: true, is_optional: false },
      { business_type_id: btMap.cafe, module_id: moduleMap.TABLE_MANAGEMENT, is_default: false, is_optional: true },
      { business_type_id: btMap.cafe, module_id: moduleMap.RECIPE_MANAGEMENT, is_default: false, is_optional: true },
      { business_type_id: btMap.cafe, module_id: moduleMap.ONLINE_ORDERING, is_default: false, is_optional: true },
      { business_type_id: btMap.cafe, module_id: moduleMap.LOYALTY_PROGRAM, is_default: false, is_optional: true }
    ];
    
    // Insert business type modules (only include `configuration` if column exists)
    // Inspect table columns and only include existing columns in inserts
    let desc = {};
    try { desc = await queryInterface.describeTable('business_type_modules'); } catch (err) { desc = {}; }
    const columns = new Set(Object.keys(desc));

    // Avoid inserting duplicate (business_type_id, module_id) pairs
    const btIds = businessTypeModules.map(b => b.business_type_id).filter(Boolean);
    const modIds = businessTypeModules.map(b => b.module_id).filter(Boolean);
    const existingPairs = await queryInterface.sequelize.query(
      `SELECT business_type_id, module_id FROM business_type_modules WHERE business_type_id IN (:btIds) AND module_id IN (:modIds)`,
      { replacements: { btIds, modIds }, type: Sequelize.QueryTypes.SELECT }
    );
    const existingPairSet = new Set(existingPairs.map(r => `${r.business_type_id}::${r.module_id}`));

    const btmToInsert = businessTypeModules.filter(b => !existingPairSet.has(`${b.business_type_id}::${b.module_id}`));

    const btmRecords = btmToInsert.map(btm => {
      const rec = { id: uuidv4() };
      if (columns.has('business_type_id')) rec.business_type_id = btm.business_type_id;
      if (columns.has('module_id')) rec.module_id = btm.module_id;
      if (columns.has('is_default')) rec.is_default = btm.is_default;
      if (columns.has('is_optional')) rec.is_optional = btm.is_optional;
      if (columns.has('configuration')) rec.configuration = JSON.stringify({});
      if (columns.has('created_at')) rec.created_at = now;
      if (columns.has('updated_at')) rec.updated_at = now;
      if (columns.has('createdAt')) rec.createdAt = now;
      if (columns.has('updatedAt')) rec.updatedAt = now;
      return rec;
    });

    if (btmRecords.length) await queryInterface.bulkInsert('business_type_modules', btmRecords);
    
    // Define module dependencies
    const dependencies = [
      { module_id: moduleMap.TABLE_MANAGEMENT, depends_on_module_id: moduleMap.POS_CORE, is_required: true },
      { module_id: moduleMap.KITCHEN_DISPLAY, depends_on_module_id: moduleMap.POS_CORE, is_required: true },
      { module_id: moduleMap.RECIPE_MANAGEMENT, depends_on_module_id: moduleMap.INVENTORY_CORE, is_required: true },
      { module_id: moduleMap.RESERVATION, depends_on_module_id: moduleMap.TABLE_MANAGEMENT, is_required: true },
      { module_id: moduleMap.ONLINE_ORDERING, depends_on_module_id: moduleMap.POS_CORE, is_required: true },
      { module_id: moduleMap.DELIVERY_MANAGEMENT, depends_on_module_id: moduleMap.ONLINE_ORDERING, is_required: false },
      { module_id: moduleMap.WAITER_APP, depends_on_module_id: moduleMap.TABLE_MANAGEMENT, is_required: true }
    ];
    
    // Avoid duplicate module_dependencies
    const depModuleIds = dependencies.map(d => d.module_id).filter(Boolean);
    const depDependsOnIds = dependencies.map(d => d.depends_on_module_id).filter(Boolean);
    const existingDeps = await queryInterface.sequelize.query(
      `SELECT module_id, depends_on_module_id FROM module_dependencies WHERE module_id IN (:mids) AND depends_on_module_id IN (:dids)`,
      { replacements: { mids: depModuleIds, dids: depDependsOnIds }, type: Sequelize.QueryTypes.SELECT }
    );
    const existingDepSet = new Set(existingDeps.map(r => `${r.module_id}::${r.depends_on_module_id}`));
    const depsToInsert = dependencies.filter(d => !existingDepSet.has(`${d.module_id}::${d.depends_on_module_id}`));

    const depRecords = depsToInsert.map(dep => ({ id: uuidv4(), ...dep, created_at: now, updated_at: now }));
    if (depRecords.length) await queryInterface.bulkInsert('module_dependencies', depRecords);
    
    console.log('✅ F&B modules, business type associations, and dependencies seeded');
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.bulkDelete('module_dependencies', null, {});
    await queryInterface.bulkDelete('business_type_modules', null, {});
    await queryInterface.bulkDelete('modules', {
      code: {
        [Sequelize.Op.in]: [
          'POS_CORE', 'INVENTORY_CORE', 'TABLE_MANAGEMENT', 
          'KITCHEN_DISPLAY', 'RECIPE_MANAGEMENT', 'RESERVATION',
          'ONLINE_ORDERING', 'DELIVERY_MANAGEMENT', 'LOYALTY_PROGRAM',
          'WAITER_APP'
        ]
      }
    }, {});
  }
};
