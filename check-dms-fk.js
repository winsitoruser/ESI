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
    console.log('Connected to DB:', client.database);
    
    const fks = await client.query(`
      SELECT
        tc.table_name,
        kcu.column_name,
        ccu.table_name AS foreign_table_name,
        rc.constraint_name,
        rc.update_rule,
        rc.delete_rule
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu 
        ON tc.constraint_name = kcu.constraint_name
      JOIN information_schema.constraint_column_usage ccu 
        ON ccu.constraint_name = tc.constraint_name
      JOIN information_schema.referential_constraints rc 
        ON tc.constraint_name = rc.constraint_name
      WHERE tc.table_name = 'dms_mata_elang_shares' AND tc.constraint_type = 'FOREIGN KEY';
    `);
    console.log('\n--- Existing FK constraints on dms_mata_elang_shares ---');
    if (fks.rows.length === 0) {
      console.log('NO FK CONSTRAINTS FOUND');
    } else {
      fks.rows.forEach(r => console.log(JSON.stringify(r)));
    }
    
    const indexes = await client.query(`
      SELECT indexname, indexdef FROM pg_indexes WHERE tablename = 'dms_mata_elang_shares'
    `);
    console.log('\n--- Indexes ---');
    indexes.rows.forEach(r => console.log(`  ${r.indexname}: ${r.indexdef}`));
    
    const orphaned = await client.query(`
      SELECT COUNT(*) as total
      FROM dms_mata_elang_shares s
      LEFT JOIN dms_files f ON s.file_id = f.id
      WHERE f.id IS NULL
    `);
    console.log(`\n--- ORPHANED SHARES (no matching file): ${orphaned.rows[0].total} ---`);
    
    const fileCount = await client.query('SELECT COUNT(*) FROM dms_files');
    const shareCount = await client.query('SELECT COUNT(*) FROM dms_mata_elang_shares');
    console.log(`\nTables: dms_files=${fileCount.rows[0].count}, dms_mata_elang_shares=${shareCount.rows[0].count}`);
    
    await client.end();
  } catch (err) {
    console.error('Error:', err.message);
    try { await client.end(); } catch(e) {}
  }
}

main();
