const { Sequelize } = require('sequelize');
const config = require('../config/database');

const env = process.env.NODE_ENV || 'development';
const dbConfig = config[env];

const sequelize = new Sequelize(
  dbConfig.database,
  dbConfig.username,
  dbConfig.password,
  {
    host: dbConfig.host,
    port: dbConfig.port,
    dialect: dbConfig.dialect,
    logging: false
  }
);

async function checkRequiredTables() {
  try {
    console.log('Checking required tables for FNB Dashboard...\n');
    
    const requiredTables = [
      'pos_transactions',
      'tables',
      'reservations',
      'kitchen_orders',
      'kitchen_inventory_items'
    ];

    for (const tableName of requiredTables) {
      const [result] = await sequelize.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = :tableName
        );
      `, {
        replacements: { tableName },
        type: Sequelize.QueryTypes.SELECT
      });

      const exists = result.exists;
      console.log(`${exists ? '✅' : '❌'} ${tableName}`);
      
      if (!exists) {
        console.log(`   → Table ${tableName} does not exist!`);
      }
    }

    console.log('\nCheck complete!');
  } catch (error) {
    console.error('Error checking tables:', error);
  } finally {
    await sequelize.close();
    process.exit();
  }
}

checkRequiredTables();
