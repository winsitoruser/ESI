const { Client } = require('pg');
require('dotenv').config({ path: '.env.local' });
require('dotenv').config({ path: '.env.development' });
require('dotenv').config();

const config = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '',
  database: 'postgres',
};

console.log('Connection config:', { ...config, password: '***' });

async function test() {
  const client = new Client(config);
  try {
    await client.connect();
    console.log('✅ Connected to PostgreSQL');
    
    const res = await client.query(`
      SELECT datname FROM pg_database 
      WHERE datistemplate = false 
      ORDER BY datname
    `);
    console.log('\nDatabases:');
    res.rows.forEach(row => console.log('  -', row.datname));
    
    const bedagangDev = res.rows.find(r => r.datname === 'bedagang_dev');
    const bedagangStaging = res.rows.find(r => r.datname === 'bedagang_staging');
    
    console.log('\n--- Status ---');
    console.log('bedagang_dev exists:', !!bedagangDev);
    console.log('bedagang_staging exists:', !!bedagangStaging);
    
    await client.end();
    return { 
      connected: true, 
      databases: res.rows.map(r => r.datname),
      bedagangDevExists: !!bedagangDev,
      bedagangStagingExists: !!bedagangStaging
    };
  } catch (err) {
    console.log('❌ Connection failed:', err.message);
    return { connected: false, error: err.message };
  }
}

test().then(result => console.log('\nResult:', JSON.stringify(result, null, 2)));
