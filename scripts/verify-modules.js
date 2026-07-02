const db = require('../models');

async function verifyModules() {
  try {
    const mods = await db.Module.findAll({
      where: { isActive: true },
      attributes: ['code', 'name', 'category'],
      order: [['category', 'ASC'], ['code', 'ASC']]
    });
    
    console.log('✅ Modules found:', mods.length);
    
    const byCategory = {};
    mods.forEach(m => {
      const cat = m.category || 'null';
      if (!byCategory[cat]) byCategory[cat] = [];
      byCategory[cat].push({ code: m.code, name: m.name });
    });
    
    Object.keys(byCategory).sort().forEach(cat => {
      console.log(`\n${cat} (${byCategory[cat].length} modules):`);
      byCategory[cat].forEach(m => console.log(`  - ${m.code}: ${m.name}`));
    });
    
    console.log('\n✅ All modules can be queried successfully!');
    console.log('\n📋 Summary by category:');
    Object.keys(byCategory).sort().forEach(cat => {
      console.log(`  ${cat}: ${byCategory[cat].length} modules`);
    });
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    throw error;
  }
}

verifyModules()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));
