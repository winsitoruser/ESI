const { Client } = require('pg');
require('dotenv').config({ path: '.env' });
require('dotenv').config({ path: '.env.development' });
require('dotenv').config({ path: '.env.local' });

const client = new Client({
  host: process.env.DB_HOST || process.env.POSTGRES_HOST || 'localhost',
  port: process.env.DB_PORT || process.env.POSTGRES_PORT || 5432,
  database: process.env.DB_NAME || process.env.POSTGRES_DB || 'bedagang_dev',
  user: process.env.DB_USER || process.env.POSTGRES_USER || 'postgres',
  password: process.env.DB_PASSWORD || process.env.POSTGRES_PASSWORD || 'postgres',
});

async function main() {
  try {
    await client.connect();
    console.log('Connected to:', client.database, '@', client.host);
    
    const tables = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);
    console.log('\nTables in public schema:');
    tables.rows.forEach(r => console.log('  -', r.table_name));
    console.log('  Total:', tables.rows.length);
    
    const fks = await client.query(`
      SELECT
        tc.table_name,
        kcu.column_name,
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name,
        tc.constraint_name,
        rc.update_rule,
        rc.delete_rule
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu 
        ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
      JOIN information_schema.constraint_column_usage ccu 
        ON ccu.constraint_name = tc.constraint_name
        AND ccu.table_schema = tc.table_schema
      JOIN information_schema.referential_constraints rc 
        ON tc.constraint_name = rc.constraint_name
        AND tc.table_schema = rc.constraint_schema
      WHERE tc.constraint_type = 'FOREIGN KEY'
      ORDER BY tc.table_name, kcu.column_name
    `);
    
    console.log('\nExisting Foreign Key Constraints:');
    if (fks.rows.length === 0) {
      console.log('  (none)');
    } else {
      fks.rows.forEach(r => {
        console.log('  ' + r.table_name + '.' + r.column_name + ' -> ' + r.foreign_table_name + '.' + r.foreign_column_name);
        console.log('    Constraint: ' + r.constraint_name);
        console.log('    ON UPDATE: ' + r.update_rule + ', ON DELETE: ' + r.delete_rule);
      });
    }
    console.log('  Total FKs:', fks.rows.length);
    
    const idCols = await client.query(`
      SELECT 
        table_name, 
        column_name, 
        data_type,
        is_nullable
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND column_name LIKE '%_id'
        AND table_name != 'SequelizeMeta'
      ORDER BY table_name, column_name
    `);
    
    console.log('\nColumns ending with _id:');
    const byTable = {};
    idCols.rows.forEach(r => {
      if (!byTable[r.table_name]) byTable[r.table_name] = [];
      byTable[r.table_name].push(r);
    });
    
    Object.keys(byTable).sort().forEach(table => {
      console.log('\n  ' + table + ':');
      byTable[table].forEach(col => {
        console.log('    - ' + col.column_name + ' (' + col.data_type + ', nullable: ' + col.is_nullable + ')');
      });
    });
    console.log('\n  Total _id columns:', idCols.rows.length);
    
    await client.end();
    console.log('\nDone!');
    
  } catch (err) {
    console.error('Error:', err.message);
    console.error(err.stack);
    try { await client.end(); } catch(e) {}
    process.exit(1);
  }
}

main();
