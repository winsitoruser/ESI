const { v4: uuidv4 } = require('uuid');
const db = require('../models');

async function seedFnBModules() {
  try {
    console.log('🔍 Checking existing modules...');
    
    const existingModules = await db.Module.findAll({
      attributes: ['code', 'name']
    });
    
    const existingCodes = new Set(existingModules.map(m => m.code));
    console.log(`Found ${existingCodes.size} existing modules:`, Array.from(existingCodes).join(', '));
    
    // Define F&B modules
    const fnbModules = [
      {
        code: 'TABLE_MANAGEMENT',
        name: 'Table Management',
        description: 'Floor plan and table management for dine-in',
        category: 'fnb',
        icon: 'Grid',
        route: '/tables',
        isActive: true,
        sortOrder: 10,
        version: '1.0.0'
      },
      {
        code: 'KITCHEN_DISPLAY',
        name: 'Kitchen Display System',
        description: 'Kitchen order management and display',
        category: 'fnb',
        icon: 'ChefHat',
        route: '/kitchen',
        isActive: true,
        sortOrder: 11,
        version: '1.0.0'
      },
      {
        code: 'RECIPE_MANAGEMENT',
        name: 'Recipe Management',
        description: 'Recipe cards and ingredient management',
        category: 'fnb',
        icon: 'BookOpen',
        route: '/recipes',
        isActive: true,
        sortOrder: 12,
        version: '1.0.0'
      },
      {
        code: 'RESERVATION',
        name: 'Reservation System',
        description: 'Table reservation and booking management',
        category: 'optional',
        icon: 'Calendar',
        route: '/reservations',
        isActive: true,
        sortOrder: 20,
        version: '1.0.0'
      },
      {
        code: 'ONLINE_ORDERING',
        name: 'Online Ordering',
        description: 'Web and mobile ordering platform',
        category: 'optional',
        icon: 'Globe',
        route: '/online-orders',
        isActive: true,
        sortOrder: 21,
        version: '1.0.0'
      },
      {
        code: 'DELIVERY_MANAGEMENT',
        name: 'Delivery Management',
        description: 'Delivery tracking and driver management',
        category: 'optional',
        icon: 'Truck',
        route: '/delivery',
        isActive: true,
        sortOrder: 22,
        version: '1.0.0'
      },
      {
        code: 'LOYALTY_PROGRAM',
        name: 'Loyalty Program',
        description: 'Customer loyalty and rewards program',
        category: 'optional',
        icon: 'Award',
        route: '/loyalty',
        isActive: true,
        sortOrder: 23,
        version: '1.0.0'
      },
      {
        code: 'WAITER_APP',
        name: 'Waiter App',
        description: 'Mobile app for waiters to take orders',
        category: 'addon',
        icon: 'Smartphone',
        route: '/waiter',
        isActive: true,
        sortOrder: 30,
        version: '1.0.0'
      }
    ];
    
    // Filter out existing modules
    const newModules = fnbModules.filter(m => !existingCodes.has(m.code));
    
    if (newModules.length === 0) {
      console.log('✅ All F&B modules already exist!');
      return;
    }
    
    console.log(`\n📦 Adding ${newModules.length} new F&B modules:`);
    newModules.forEach(m => console.log(`  - ${m.name} (${m.code})`));
    
    // Insert new modules
    for (const moduleData of newModules) {
      await db.Module.create(moduleData);
      console.log(`✓ Added: ${moduleData.name}`);
    }
    
    console.log('\n✅ F&B modules seeded successfully!');
    console.log('\n📋 Summary:');
    console.log(`  Total F&B modules: ${fnbModules.length}`);
    console.log(`  Already existed: ${fnbModules.length - newModules.length}`);
    console.log(`  Newly added: ${newModules.length}`);
    
  } catch (error) {
    console.error('❌ Error seeding F&B modules:', error);
    throw error;
  }
}

// Run the seeder
seedFnBModules()
  .then(() => {
    console.log('\n🎉 Done!');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n💥 Failed:', error.message);
    process.exit(1);
  });
