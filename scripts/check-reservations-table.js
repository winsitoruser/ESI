const { sequelize } = require('./../lib/sequelizeClient');

async function checkReservationsTable() {
  try {
    console.log('Checking reservations table structure...\n');
    
    const [columns] = await sequelize.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'reservations' 
      ORDER BY ordinal_position
    `);
    
    console.log('Columns:');
    columns.forEach(col => {
      console.log(`  - ${col.column_name}: ${col.data_type} (${col.is_nullable})`);
    });

    // Check if table exists
    const [tableExists] = await sequelize.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'reservations'
      );
    `);
    
    console.log(`\nTable exists: ${tableExists.exists ? 'YES' : 'NO'}`);
    
    // Check sample data
    if (tableExists.exists) {
      const [sampleData] = await sequelize.query(`
        SELECT COUNT(*) as count FROM reservations LIMIT 1
      `);
      console.log(`\nTotal records: ${sampleData.count}`);
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await sequelize.close();
    process.exit();
  }
}

checkReservationsTable();
