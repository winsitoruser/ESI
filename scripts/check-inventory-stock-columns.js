/**
 * Check inventory_stock table columns
 */

const { Sequelize } = require('sequelize');

const sequelize = new Sequelize(
  'postgresql://postgres:jakarta123@localhost:5432/bedagang_dev',
  { dialect: 'postgres', logging: false }
);

async function checkColumns() {
  try {
    const [results] = await sequelize.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'inventory_stock' 
      ORDER BY ordinal_position
    `);
    
    console.log('inventory_stock columns:');
    results.forEach(r => console.log(`  ${r.column_name}: ${r.data_type}`));
    
    await sequelize.close();
    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

checkColumns();
