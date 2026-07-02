/**
 * Check Database Tables
 */

const { Sequelize } = require('sequelize');

const sequelize = new Sequelize(
  process.env.DATABASE_URL || 'postgresql://postgres:jakarta123@localhost:5432/bedagang_dev',
  {
    dialect: 'postgres',
    logging: false
  }
);

async function checkDatabase() {
  try {
    await sequelize.authenticate();
    console.log('✅ Database connected');
    
    const [results] = await sequelize.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name;
    `);
    
    console.log('\n📊 Existing tables:');
    if (results.length === 0) {
      console.log('  (no tables found)');
    } else {
      results.forEach(row => console.log(`  - ${row.table_name}`));
    }
    
    await sequelize.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

checkDatabase();
