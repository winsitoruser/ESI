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

const FK_CHECKS = [
  { table: 'pos_transaction_items', column: 'product_id', parent: 'products', parentCol: 'id' },
  { table: 'pos_transactions', column: 'customer_id', parent: 'customers', parentCol: 'id' },
  { table: 'pos_transactions', column: 'kitchen_order_id', parent: 'kitchen_orders', parentCol: 'id' },
  { table: 'kitchen_order_items', column: 'kitchen_order_id', parent: 'kitchen_orders', parentCol: 'id' },
  { table: 'kitchen_order_items', column: 'product_id', parent: 'products', parentCol: 'id' },
  { table: 'kitchen_inventory_transactions', column: 'inventory_item_id', parent: 'kitchen_inventory_items', parentCol: 'id' },
];

async function checkTableExists(tableName) {
  const result = await client.query(`
    SELECT EXISTS(
      SELECT 1 FROM information_schema.tables 
      WHERE table_name = $1 AND table_schema = 'public'
    )
  `, [tableName]);
  return result.rows[0].exists;
}

async function countRows(tableName) {
  const result = await client.query(`SELECT COUNT(*) as cnt FROM "${tableName}"`);
  return parseInt(result.rows[0].cnt);
}

async function checkOrphaned(table, column, parent, parentCol) {
  const tableExists = await checkTableExists(table);
  const parentExists = await checkTableExists(parent);
  
  if (!tableExists) return { error: `Table ${table} not found`, count: null };
  if (!parentExists) return { error: `Parent ${parent} not found`, count: null };
  
  try {
    const result = await client.query(`
      SELECT COUNT(*) as cnt
      FROM "${table}" t
      WHERE t."${column}" IS NOT NULL
        AND NOT EXISTS (
          SELECT 1 FROM "${parent}" p WHERE p."${parentCol}" = t."${column}"
        )
    `);
    return { count: parseInt(result.rows[0].cnt), error: null };
  } catch (err) {
    return { error: err.message, count: null };
  }
}

async function main() {
  try {
    await client.connect();
    console.log('Connected to:', client.database, '@', client.host);
    
    const tables = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `);
    
    console.log('\n=== TABLES WITH ROW COUNTS ===');
    for (const t of tables.rows) {
      const cnt = await countRows(t.table_name);
      console.log(`  ${t.table_name}: ${cnt} rows`);
    }
    
    console.log('\n=== ORPHANED RECORDS CHECK ===');
    
    const orphanedReport = [];
    
    for (const check of FK_CHECKS) {
      console.log(`\nChecking ${check.table}.${check.column} -> ${check.parent}.${check.parentCol}...`);
      
      const result = await checkOrphaned(check.table, check.column, check.parent, check.parentCol);
      
      if (result.error) {
        console.log(`  Warning: ${result.error}`);
      } else if (result.count > 0) {
        console.log(`  FOUND: ${result.count} ORPHANED RECORDS`);
        orphanedReport.push({ ...check, count: result.count });
      } else {
        console.log(`  OK: No orphaned records`);
      }
    }
    
    console.log('\n' + '='.repeat(60));
    console.log('SUMMARY');
    console.log('='.repeat(60));
    
    const totalOrphaned = orphanedReport.reduce((sum, r) => sum + r.count, 0);
    console.log(`\nTotal orphaned records: ${totalOrphaned}`);
    
    if (orphanedReport.length > 0) {
      console.log('\nTables with orphaned records:');
      orphanedReport.forEach(r => {
        console.log(`  - ${r.table}.${r.column}: ${r.count} records`);
      });
    } else {
      console.log('\nNo orphaned records found. Ready to add FK constraints.');
    }
    
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
