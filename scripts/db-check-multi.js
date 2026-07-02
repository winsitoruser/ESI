const { Client } = require('pg');
require('dotenv').config({ path: '.env' });
require('dotenv').config({ path: '.env.development' });
require('dotenv').config({ path: '.env.local' });

async function checkConnection(config) {
  const client = new Client(config);
  try {
    await client.connect();
    
    const dbs = await client.query(`
      SELECT datname FROM pg_database WHERE datistemplate = false ORDER BY datname
    `);
    
    const tables = await client.query(`
      SELECT COUNT(*) as cnt FROM information_schema.tables WHERE table_schema = 'public'
    `);
    
    const fks = await client.query(`
      SELECT COUNT(*) as cnt FROM information_schema.table_constraints tc
      JOIN information_schema.table_constraints tc2 ON 1=1
      WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_schema = 'public'
      LIMIT 1
    `);
    
    const fkCount = await client.query(`
      SELECT COUNT(*) as cnt
      FROM information_schema.table_constraints tc
      WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_schema = 'public'
    `);
    
    await client.end();
    return {
      success: true,
      database: config.database,
      host: config.host,
      databases: dbs.rows.map(r => r.datname),
      tableCount: parseInt(tables.rows[0].cnt),
      fkCount: parseInt(fkCount.rows[0].cnt)
    };
  } catch (err) {
    return {
      success: false,
      database: config.database,
      host: config.host,
      error: err.message
    };
  }
}

async function main() {
  const configs = [
    // Try 172.18.0.2 (from task description)
    {
      host: '172.18.0.2',
      port: 5432,
      database: 'bedagang',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'postgres',
    },
    // Try localhost bedagang
    {
      host: 'localhost',
      port: 5432,
      database: 'bedagang',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'postgres',
    },
    // Current (bedagang_dev)
    {
      host: process.env.DB_HOST || process.env.POSTGRES_HOST || 'localhost',
      port: process.env.DB_PORT || process.env.POSTGRES_PORT || 5432,
      database: process.env.DB_NAME || process.env.POSTGRES_DB || 'bedagang_dev',
      user: process.env.DB_USER || process.env.POSTGRES_USER || 'postgres',
      password: process.env.DB_PASSWORD || process.env.POSTGRES_PASSWORD || 'postgres',
    }
  ];
  
  console.log('Checking database connections...\n');
  
  for (const cfg of configs) {
    console.log('Trying:', cfg.host, '/' , cfg.database);
    const result = await checkConnection(cfg);
    
    if (result.success) {
      console.log('  ✅ Connected');
      console.log('     Databases:', result.databases.join(', '));
      console.log('     Tables:', result.tableCount);
      console.log('     FK Constraints:', result.fkCount);
    } else {
      console.log('  ❌ Failed:', result.error);
    }
    console.log('');
  }
  
  console.log('Done!');
}

main();
