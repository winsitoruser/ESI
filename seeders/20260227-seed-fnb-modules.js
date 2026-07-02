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
    
    // Insert modules
    await queryInterface.bulkInsert('modules', modules);
    
    // Create module map
    const moduleMap = {};
    modules.forEach(m => {
      moduleMap[m.code] = m.id;
    });
    
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
    
    // Insert business type modules
    const btmRecords = businessTypeModules.map(btm => ({
      id: uuidv4(),
      ...btm,
      configuration: JSON.stringify({}),
      created_at: now,
      updated_at: now
    }));
    
    await queryInterface.bulkInsert('business_type_modules', btmRecords);
    
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
    
    const depRecords = dependencies.map(dep => ({
      id: uuidv4(),
      ...dep,
      created_at: now,
      updated_at: now
    }));
    
    await queryInterface.bulkInsert('module_dependencies', depRecords);
    
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
