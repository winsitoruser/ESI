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
    
    // Get modules
    const modules = await queryInterface.sequelize.query(
      `SELECT id, code FROM modules WHERE is_active = true`,
      { type: Sequelize.QueryTypes.SELECT }
    );
    
    const modMap = {};
    modules.forEach(m => {
      modMap[m.code] = m.id;
    });
    
    // Define F&B Business Packages
    const packages = [
      {
        id: uuidv4(),
        code: 'FNB_FINE_DINING_COMPLETE',
        name: 'Fine Dining Complete',
        description: 'Paket lengkap untuk restoran fine dining dengan table service, reservasi, dan kitchen management',
        industry_type: 'fnb',
        business_type_id: btMap.fine_dining,
        category: 'professional',
        icon: 'Crown',
        color: '#8B5CF6',
        pricing_tier: 'professional',
        base_price: 2500000,
        is_active: true,
        is_featured: true,
        sort_order: 1,
        metadata: JSON.stringify({
          highlights: [
            'Table service management',
            'Reservation system',
            'Kitchen display system',
            'Recipe & costing',
            'Waiter mobile app'
          ],
          recommended_for: 'Fine dining restaurants, upscale bistros',
          setup_time: '2-3 days'
        }),
        created_at: now,
        updated_at: now
      },
      {
        id: uuidv4(),
        code: 'FNB_CLOUD_KITCHEN_STARTER',
        name: 'Cloud Kitchen Starter',
        description: 'Paket untuk cloud kitchen dengan fokus pada online ordering dan delivery management',
        industry_type: 'fnb',
        business_type_id: btMap.cloud_kitchen,
        category: 'starter',
        icon: 'ChefHat',
        color: '#F59E0B',
        pricing_tier: 'basic',
        base_price: 1500000,
        is_active: true,
        is_featured: true,
        sort_order: 2,
        metadata: JSON.stringify({
          highlights: [
            'Online ordering integration',
            'Delivery tracking',
            'Kitchen display',
            'Multi-brand support',
            'Recipe management'
          ],
          recommended_for: 'Cloud kitchens, ghost kitchens, delivery-only restaurants',
          setup_time: '1-2 days'
        }),
        created_at: now,
        updated_at: now
      },
      {
        id: uuidv4(),
        code: 'FNB_QSR_EXPRESS',
        name: 'QSR Express',
        description: 'Paket cepat untuk Quick Service Restaurant dengan fokus pada kecepatan layanan',
        industry_type: 'fnb',
        business_type_id: btMap.qsr,
        category: 'starter',
        icon: 'Zap',
        color: '#EF4444',
        pricing_tier: 'basic',
        base_price: 1200000,
        is_active: true,
        is_featured: true,
        sort_order: 3,
        metadata: JSON.stringify({
          highlights: [
            'Fast order processing',
            'Kitchen display',
            'Loyalty program',
            'Quick inventory',
            'Mobile ordering'
          ],
          recommended_for: 'Fast food, quick service restaurants, food courts',
          setup_time: '1 day'
        }),
        created_at: now,
        updated_at: now
      },
      {
        id: uuidv4(),
        code: 'FNB_CAFE_ESSENTIALS',
        name: 'Cafe Essentials',
        description: 'Paket essential untuk cafe dengan table management dan recipe cards',
        industry_type: 'fnb',
        business_type_id: btMap.cafe,
        category: 'starter',
        icon: 'Coffee',
        color: '#10B981',
        pricing_tier: 'basic',
        base_price: 1000000,
        is_active: true,
        is_featured: false,
        sort_order: 4,
        metadata: JSON.stringify({
          highlights: [
            'Table management',
            'Recipe cards',
            'Online ordering',
            'Inventory tracking',
            'Customer loyalty'
          ],
          recommended_for: 'Cafes, coffee shops, bakeries',
          setup_time: '1 day'
        }),
        created_at: now,
        updated_at: now
      }
    ];
    
    await queryInterface.bulkInsert('business_packages', packages);
    
    // Create package map
    const pkgMap = {};
    packages.forEach(p => {
      pkgMap[p.code] = p.id;
    });
    
    // Define package modules
    const packageModules = [
      // Fine Dining Complete
      { package_id: pkgMap.FNB_FINE_DINING_COMPLETE, module_id: modMap.POS_CORE, is_required: true, is_default_enabled: true, sort_order: 1 },
      { package_id: pkgMap.FNB_FINE_DINING_COMPLETE, module_id: modMap.INVENTORY_CORE, is_required: true, is_default_enabled: true, sort_order: 2 },
      { package_id: pkgMap.FNB_FINE_DINING_COMPLETE, module_id: modMap.TABLE_MANAGEMENT, is_required: true, is_default_enabled: true, sort_order: 3 },
      { package_id: pkgMap.FNB_FINE_DINING_COMPLETE, module_id: modMap.KITCHEN_DISPLAY, is_required: true, is_default_enabled: true, sort_order: 4 },
      { package_id: pkgMap.FNB_FINE_DINING_COMPLETE, module_id: modMap.RECIPE_MANAGEMENT, is_required: true, is_default_enabled: true, sort_order: 5 },
      { package_id: pkgMap.FNB_FINE_DINING_COMPLETE, module_id: modMap.RESERVATION, is_required: false, is_default_enabled: true, sort_order: 6 },
      { package_id: pkgMap.FNB_FINE_DINING_COMPLETE, module_id: modMap.WAITER_APP, is_required: false, is_default_enabled: false, sort_order: 7 },
      
      // Cloud Kitchen Starter
      { package_id: pkgMap.FNB_CLOUD_KITCHEN_STARTER, module_id: modMap.POS_CORE, is_required: true, is_default_enabled: true, sort_order: 1 },
      { package_id: pkgMap.FNB_CLOUD_KITCHEN_STARTER, module_id: modMap.INVENTORY_CORE, is_required: true, is_default_enabled: true, sort_order: 2 },
      { package_id: pkgMap.FNB_CLOUD_KITCHEN_STARTER, module_id: modMap.KITCHEN_DISPLAY, is_required: true, is_default_enabled: true, sort_order: 3 },
      { package_id: pkgMap.FNB_CLOUD_KITCHEN_STARTER, module_id: modMap.ONLINE_ORDERING, is_required: true, is_default_enabled: true, sort_order: 4 },
      { package_id: pkgMap.FNB_CLOUD_KITCHEN_STARTER, module_id: modMap.DELIVERY_MANAGEMENT, is_required: true, is_default_enabled: true, sort_order: 5 },
      { package_id: pkgMap.FNB_CLOUD_KITCHEN_STARTER, module_id: modMap.RECIPE_MANAGEMENT, is_required: false, is_default_enabled: true, sort_order: 6 },
      
      // QSR Express
      { package_id: pkgMap.FNB_QSR_EXPRESS, module_id: modMap.POS_CORE, is_required: true, is_default_enabled: true, sort_order: 1 },
      { package_id: pkgMap.FNB_QSR_EXPRESS, module_id: modMap.INVENTORY_CORE, is_required: true, is_default_enabled: true, sort_order: 2 },
      { package_id: pkgMap.FNB_QSR_EXPRESS, module_id: modMap.KITCHEN_DISPLAY, is_required: true, is_default_enabled: true, sort_order: 3 },
      { package_id: pkgMap.FNB_QSR_EXPRESS, module_id: modMap.LOYALTY_PROGRAM, is_required: false, is_default_enabled: true, sort_order: 4 },
      { package_id: pkgMap.FNB_QSR_EXPRESS, module_id: modMap.ONLINE_ORDERING, is_required: false, is_default_enabled: false, sort_order: 5 },
      
      // Cafe Essentials
      { package_id: pkgMap.FNB_CAFE_ESSENTIALS, module_id: modMap.POS_CORE, is_required: true, is_default_enabled: true, sort_order: 1 },
      { package_id: pkgMap.FNB_CAFE_ESSENTIALS, module_id: modMap.INVENTORY_CORE, is_required: true, is_default_enabled: true, sort_order: 2 },
      { package_id: pkgMap.FNB_CAFE_ESSENTIALS, module_id: modMap.TABLE_MANAGEMENT, is_required: false, is_default_enabled: true, sort_order: 3 },
      { package_id: pkgMap.FNB_CAFE_ESSENTIALS, module_id: modMap.RECIPE_MANAGEMENT, is_required: false, is_default_enabled: true, sort_order: 4 },
      { package_id: pkgMap.FNB_CAFE_ESSENTIALS, module_id: modMap.ONLINE_ORDERING, is_required: false, is_default_enabled: false, sort_order: 5 },
      { package_id: pkgMap.FNB_CAFE_ESSENTIALS, module_id: modMap.LOYALTY_PROGRAM, is_required: false, is_default_enabled: false, sort_order: 6 }
    ];
    
    const pmRecords = packageModules
      .filter(pm => pm.module_id) // Only include if module exists
      .map(pm => ({
        id: uuidv4(),
        ...pm,
        configuration: JSON.stringify({}),
        created_at: now,
        updated_at: now
      }));
    
    await queryInterface.bulkInsert('package_modules', pmRecords);
    
    // Define package features
    const packageFeatures = [
      // Fine Dining Complete features
      { package_id: pkgMap.FNB_FINE_DINING_COMPLETE, feature_code: 'multi_course_ordering', feature_name: 'Multi-course ordering' },
      { package_id: pkgMap.FNB_FINE_DINING_COMPLETE, feature_code: 'table_service', feature_name: 'Table service management' },
      { package_id: pkgMap.FNB_FINE_DINING_COMPLETE, feature_code: 'reservation_system', feature_name: 'Reservation system' },
      { package_id: pkgMap.FNB_FINE_DINING_COMPLETE, feature_code: 'kitchen_routing', feature_name: 'Kitchen order routing' },
      { package_id: pkgMap.FNB_FINE_DINING_COMPLETE, feature_code: 'recipe_costing', feature_name: 'Recipe costing' },
      
      // Cloud Kitchen Starter features
      { package_id: pkgMap.FNB_CLOUD_KITCHEN_STARTER, feature_code: 'online_ordering', feature_name: 'Online order integration' },
      { package_id: pkgMap.FNB_CLOUD_KITCHEN_STARTER, feature_code: 'delivery_tracking', feature_name: 'Delivery tracking' },
      { package_id: pkgMap.FNB_CLOUD_KITCHEN_STARTER, feature_code: 'multi_brand', feature_name: 'Multi-brand support' },
      { package_id: pkgMap.FNB_CLOUD_KITCHEN_STARTER, feature_code: 'kitchen_display', feature_name: 'Kitchen display system' },
      
      // QSR Express features
      { package_id: pkgMap.FNB_QSR_EXPRESS, feature_code: 'fast_checkout', feature_name: 'Fast checkout' },
      { package_id: pkgMap.FNB_QSR_EXPRESS, feature_code: 'loyalty_rewards', feature_name: 'Loyalty rewards' },
      { package_id: pkgMap.FNB_QSR_EXPRESS, feature_code: 'quick_inventory', feature_name: 'Quick inventory' },
      
      // Cafe Essentials features
      { package_id: pkgMap.FNB_CAFE_ESSENTIALS, feature_code: 'table_management', feature_name: 'Table management' },
      { package_id: pkgMap.FNB_CAFE_ESSENTIALS, feature_code: 'recipe_cards', feature_name: 'Recipe cards' },
      { package_id: pkgMap.FNB_CAFE_ESSENTIALS, feature_code: 'inventory_tracking', feature_name: 'Inventory tracking' }
    ];
    
    const pfRecords = packageFeatures.map(pf => ({
      id: uuidv4(),
      ...pf,
      is_enabled: true,
      created_at: now,
      updated_at: now
    }));
    
    await queryInterface.bulkInsert('package_features', pfRecords);
    
    console.log('✅ Seeded F&B business packages with modules and features');
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.bulkDelete('package_features', null, {});
    await queryInterface.bulkDelete('package_modules', null, {});
    await queryInterface.bulkDelete('business_packages', {
      code: {
        [Sequelize.Op.in]: [
          'FNB_FINE_DINING_COMPLETE',
          'FNB_CLOUD_KITCHEN_STARTER',
          'FNB_QSR_EXPRESS',
          'FNB_CAFE_ESSENTIALS'
        ]
      }
    }, {});
  }
};
