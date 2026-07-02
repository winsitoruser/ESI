const db = require('../models');

async function updateModuleCategories() {
  try {
    console.log('🔄 Updating F&B module categories...\n');
    
    // Define module category mappings
    const categoryMappings = {
      // F&B Modules
      'TABLE_MANAGEMENT': 'fnb',
      'KITCHEN_DISPLAY': 'fnb',
      'RECIPE_MANAGEMENT': 'fnb',
      'FNB_TABLE_MANAGEMENT': 'fnb',
      'FNB_KITCHEN': 'fnb',
      'FNB_RECIPES': 'fnb',
      'FNB_MENU': 'fnb',
      
      // Optional Modules
      'RESERVATION': 'optional',
      'ONLINE_ORDERING': 'optional',
      'DELIVERY_MANAGEMENT': 'optional',
      'LOYALTY_PROGRAM': 'optional',
      
      // Add-on Modules
      'WAITER_APP': 'addon',
      
      // Core Modules
      'POS_CORE': 'core',
      'INVENTORY_CORE': 'core',
      'CORE_DASHBOARD': 'core',
      'CORE_POS': 'core',
      'CORE_INVENTORY': 'core',
      'CORE_CUSTOMERS': 'core',
      'CORE_FINANCE': 'core',
      'CORE_REPORTS': 'core',
      'CORE_SETTINGS': 'core'
    };
    
    let updated = 0;
    let skipped = 0;
    
    for (const [code, category] of Object.entries(categoryMappings)) {
      const module = await db.Module.findOne({ where: { code } });
      
      if (module) {
        if (module.category !== category) {
          await module.update({ category });
          console.log(`✓ Updated ${code}: ${module.category || 'null'} → ${category}`);
          updated++;
        } else {
          console.log(`  Skipped ${code}: already ${category}`);
          skipped++;
        }
      }
    }
    
    console.log(`\n📊 Summary:`);
    console.log(`  Updated: ${updated}`);
    console.log(`  Skipped: ${skipped}`);
    console.log(`  Total: ${updated + skipped}`);
    
    // Show all F&B modules
    console.log('\n📦 All F&B modules:');
    const fnbModules = await db.Module.findAll({
      where: { category: 'fnb' },
      attributes: ['code', 'name', 'category'],
      order: [['code', 'ASC']]
    });
    
    fnbModules.forEach(m => {
      console.log(`  - ${m.code}: ${m.name}`);
    });
    
    console.log('\n✅ Done!');
    
  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  }
}

updateModuleCategories()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('💥 Failed:', error.message);
    process.exit(1);
  });
