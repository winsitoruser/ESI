const { Sequelize } = require('sequelize');
const config = require('../config/database');

const sequelize = new Sequelize(
  config.development.database,
  config.development.username,
  config.development.password,
  {
    host: config.development.host,
    dialect: config.development.dialect,
    logging: false
  }
);

async function updateCategories() {
  try {
    console.log('🔄 Updating F&B module categories...\n');
    
    // Update F&B modules
    const fnbModules = [
      'TABLE_MANAGEMENT', 'KITCHEN_DISPLAY', 'RECIPE_MANAGEMENT',
      'FNB_TABLE_MANAGEMENT', 'FNB_KITCHEN', 'FNB_RECIPES', 'FNB_MENU'
    ];
    
    const result1 = await sequelize.query(
      `UPDATE modules SET category = 'fnb' WHERE code IN (${fnbModules.map(() => '?').join(',')})`,
      { replacements: fnbModules }
    );
    console.log(`✓ Updated ${result1[1]} F&B modules to category 'fnb'`);
    
    // Update optional modules
    const optionalModules = [
      'RESERVATION', 'ONLINE_ORDERING', 'DELIVERY_MANAGEMENT', 'LOYALTY_PROGRAM'
    ];
    
    const result2 = await sequelize.query(
      `UPDATE modules SET category = 'optional' WHERE code IN (${optionalModules.map(() => '?').join(',')})`,
      { replacements: optionalModules }
    );
    console.log(`✓ Updated ${result2[1]} optional modules to category 'optional'`);
    
    // Update addon modules
    const result3 = await sequelize.query(
      `UPDATE modules SET category = 'addon' WHERE code = 'WAITER_APP'`
    );
    console.log(`✓ Updated ${result3[1]} addon modules to category 'addon'`);
    
    // Show all F&B modules
    console.log('\n📦 F&B modules in database:');
    const [fnbRows] = await sequelize.query(
      `SELECT code, name, category FROM modules WHERE category = 'fnb' ORDER BY code`
    );
    fnbRows.forEach(m => console.log(`  - ${m.code}: ${m.name} [${m.category}]`));
    
    console.log('\n📦 Optional modules:');
    const [optRows] = await sequelize.query(
      `SELECT code, name, category FROM modules WHERE category = 'optional' ORDER BY code`
    );
    optRows.forEach(m => console.log(`  - ${m.code}: ${m.name} [${m.category}]`));
    
    console.log('\n✅ Done!');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    throw error;
  } finally {
    await sequelize.close();
  }
}

updateCategories()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('💥 Failed:', error.message);
    process.exit(1);
  });
