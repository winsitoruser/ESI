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
    
    // Check if constraint already exists
    const checkFk = await client.query(`
      SELECT constraint_name FROM information_schema.table_constraints 
      WHERE table_name = 'dms_mata_elang_shares' 
      AND constraint_type = 'FOREIGN KEY'
      AND constraint_name = 'dms_mata_elang_shares_file_id_fkey'
    `);
    
    if (checkFk.rows.length > 0) {
      console.log('✅ FK constraint already exists:', checkFk.rows[0].constraint_name);
    } else {
      console.log('➕ Adding FK constraint with ON DELETE CASCADE...');
      
      // Add the FK constraint
      await client.query(`
        ALTER TABLE dms_mata_elang_shares
        ADD CONSTRAINT dms_mata_elang_shares_file_id_fkey
        FOREIGN KEY (file_id)
        REFERENCES dms_files(id)
        ON DELETE CASCADE
        ON UPDATE CASCADE
      `);
      console.log('✅ FK constraint added successfully!');
    }
    
    // Verify
    const fks = await client.query(`
      SELECT
        tc.constraint_name,
        kcu.column_name,
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name,
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
    
    console.log('\n--- FK Constraints on dms_mata_elang_shares ---');
    fks.rows.forEach(r => {
      console.log(`  Constraint: ${r.constraint_name}`);
      console.log(`    ${r.column_name} → ${r.foreign_table_name}.${r.foreign_column_name}`);
      console.log(`    ON UPDATE: ${r.update_rule}, ON DELETE: ${r.delete_rule}`);
    });
    
    // Verify ON DELETE CASCADE works
    // Try inserting an orphaned record - should fail
    console.log('\n--- Testing FK constraint ---');
    try {
      const fakeId = '00000000-0000-0000-0000-000000000099';
      await client.query(`
        INSERT INTO dms_mata_elang_shares (id, file_id, share_code, recipient_identifier)
        VALUES (gen_random_uuid(), $1, 'test-fk-constraint', 'test@test.com')
      `, [fakeId]);
      console.log('  ❌ FAILED: Insert with invalid file_id succeeded - FK not enforced!');
    } catch (err) {
      if (err.code === '23503') { // foreign_key_violation
        console.log('  ✅ FK constraint ENFORCED: Insert with invalid file_id rejected (code: 23503)');
        console.log('     Detail:', err.detail);
      } else {
        console.log('  ⚠️  Different error:', err.message);
      }
    }
    
    await client.end();
    console.log('\n✅ Done!');
  } catch (err) {
    console.error('Error:', err.message);
    try { await client.end(); } catch(e) {}
    process.exit(1);
  }
}

main();
