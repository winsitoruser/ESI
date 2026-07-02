const db = require('../models');

async function testModulesAPI() {
  try {
    console.log('🔍 Testing module query like API does...\n');
    
    const { Module, TenantModule, ModuleDependency } = db;
    
    // Simulate API query
    const allModules = await Module.findAll({
      where: { isActive: true },
      order: [['sortOrder', 'ASC'], ['name', 'ASC']]
    });
    
    console.log(`✅ Found ${allModules.length} active modules\n`);
    
    // Group by category
    const categories = {};
    allModules.forEach(mod => {
      const cat = mod.category || 'other';
      if (!categories[cat]) categories[cat] = [];
      categories[cat].push({
        code: mod.code,
        name: mod.name,
        category: mod.category,
        isCore: mod.isCore,
        sortOrder: mod.sortOrder
      });
    });
    
    // Display by category
    console.log('📦 Modules by category:\n');
    Object.keys(categories).sort().forEach(cat => {
      console.log(`${cat.toUpperCase()} (${categories[cat].length} modules):`);
      categories[cat].slice(0, 5).forEach(m => {
        console.log(`  - ${m.code}: ${m.name}`);
      });
      if (categories[cat].length > 5) {
        console.log(`  ... and ${categories[cat].length - 5} more`);
      }
      console.log('');
    });
    
    // Check F&B modules specifically
    const fnbModules = allModules.filter(m => m.category === 'fnb');
    console.log(`\n🍽️  F&B Modules (${fnbModules.length}):`);
    fnbModules.forEach(m => {
      console.log(`  ✓ ${m.code}: ${m.name}`);
    });
    
    // Simulate API response structure
    const apiResponse = {
      success: true,
      data: {
        modules: allModules.map(mod => ({
          id: mod.id,
          code: mod.code,
          name: mod.name,
          category: mod.category,
          isCore: mod.isCore,
          isEnabled: false // Default for new tenant
        })),
        categories,
        summary: {
          total: allModules.length,
          enabled: 0,
          disabled: allModules.length,
          core: allModules.filter(m => m.isCore).length
        },
        categoryLabels: {
          core: 'Core System',
          fnb: 'F&B (Food & Beverage)',
          optional: 'Modul Optional',
          addon: 'Add-on Premium',
          operations: 'Operasional'
        }
      }
    };
    
    console.log('\n📊 API Response Summary:');
    console.log(`  Total modules: ${apiResponse.data.summary.total}`);
    console.log(`  Categories: ${Object.keys(categories).join(', ')}`);
    console.log(`  F&B modules: ${fnbModules.length}`);
    
    console.log('\n✅ API should return modules successfully!');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
    throw error;
  }
}

testModulesAPI()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));
