const { Client } = require('pg');
require('dotenv').config({ path: '.env' });
require('dotenv').config({ path: '.env.development' });
require('dotenv').config({ path: '.env.local' });

async function main() {
  const client = new Client({
    host: 'localhost',
    port: 5432,
    database: 'postgres',
    user: process.env.DB_USER || process.env.POSTGRES_USER || 'postgres',
    password: process.env.DB_PASSWORD || process.env.POSTGRES_PASSWORD || 'postgres',
  });
  
  try {
    await client.connect();
    console.log('Connected to postgres @ localhost');
    
    const dbs = await client.query(`
      SELECT datname, pg_size_pretty(pg_database_size(datname)) as size
      FROM pg_database 
      WHERE datistemplate = false 
      ORDER BY datname
    `);
    
    console.log('\nAvailable databases:');
    dbs.rows.forEach(r => {
      console.log('  -', r.datname, '(' + r.size + ')');
    });
    
    // Check each DB for table count
    for (const db of dbs.rows) {
      console.log('\n---', db.datname, '---');
      
      try {
        const dbClient = new Client({
          host: 'localhost',
          port: 5432,
          database: db.datname,
          user: process.env.DB_USER || process.env.POSTGRES_USER || 'postgres',
          password: process.env.DB_PASSWORD || process.env.POSTGRES_PASSWORD || 'postgres',
        });
        
        await dbClient.connect();
        
        const tables = await dbClient.query(`
          SELECT COUNT(*) as cnt FROM information_schema.tables 
          WHERE table_schema = 'public'
        `);
        
        const fks = await dbClient.query(`
          SELECT COUNT(*) as cnt
          FROM information_schema.table_constraints tc
          WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_schema = 'public'
        `);
        
        console.log('  Tables:', tables.rows[0].cnt);
        console.log('  FK Constraints:', fks.rows[0].cnt);
        
        await dbClient.end();
      } catch (e) {
        console.log('  Error:', e.message);
      }
    }
    
    await client.end();
    console.log('\nDone!');
    
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

main();
