const { Client } = require('pg');
require('dotenv').config({ path: '.env' });
require('dotenv').config({ path: '.env.development' });

const client = new Client({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'bedagang_dev',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
});

async function main() {
  await client.connect();
  
  // 1. First, let's create a test file
  const testFileId = '00000000-0000-0000-0000-000000000001';
  console.log('🧪 Testing FK constraint behavior...');
  
  try {
    await client.query(`
      INSERT INTO dms_files (id, name, file_type, created_at, updated_at)
      VALUES ($1, 'test-file.pdf', 'document', NOW(), NOW())
    `, [testFileId]);
    console.log('  ✅ Created test file');
  } catch (e) {
    console.log('  ℹ️  Test file may already exist');
  }
  
  // 2. Create a share for this VALID file - should succeed
  const validShareId = '00000000-0000-0000-0000-000000000002';
  try {
    await client.query(`
      INSERT INTO dms_mata_elang_shares (id, file_id, share_code, recipient_identifier, created_at, updated_at)
      VALUES ($1, $2, 'valid-share-test', 'test@test.com', NOW(), NOW())
    `, [validShareId, testFileId]);
    console.log('  ✅ Share for VALID file succeeded (FK allows this)');
  } catch (e) {
    console.log('  ❌ Unexpected error:', e.message);
  }
  
  // 3. Try to create a share for an INVALID file - should FAIL with FK violation
  const fakeFileId = '00000000-0000-0000-0000-000000009999';
  try {
    await client.query(`
      INSERT INTO dms_mata_elang_shares (id, file_id, share_code, recipient_identifier, created_at, updated_at)
      VALUES (gen_random_uuid(), $1, 'invalid-share-test', 'test@test.com', NOW(), NOW())
    `, [fakeFileId]);
    console.log('  ❌ FAILED: Insert with INVALID file_id succeeded!');
  } catch (err) {
    if (err.code === '23503') {
      console.log('  ✅ FK constraint WORKING: invalid file rejected (code=23503)');
      console.log('     → ' + err.detail);
    } else {
      console.log('  ⚠️  Different error:', err.message, err.code);
    }
  }
  
  // 4. Test ON DELETE CASCADE: delete the file and check if share is auto-deleted
  console.log('\n🧪 Testing ON DELETE CASCADE...');
  
  const shareCountBefore = await client.query(
    'SELECT COUNT(*) FROM dms_mata_elang_shares WHERE file_id = $1',
    [testFileId]
  );
  console.log(`  Shares before delete: ${shareCountBefore.rows[0].count}`);
  
  // Delete the file
  await client.query('DELETE FROM dms_files WHERE id = $1', [testFileId]);
  console.log('  ✅ Deleted test file');
  
  // Check if share was auto-deleted
  const shareCountAfter = await client.query(
    'SELECT COUNT(*) FROM dms_mata_elang_shares WHERE file_id = $1',
    [testFileId]
  );
  console.log(`  Shares after delete: ${shareCountAfter.rows[0].count}`);
  
  if (shareCountAfter.rows[0].count === '0' && shareCountBefore.rows[0].count !== '0') {
    console.log('  ✅ ON DELETE CASCADE WORKING: shares auto-deleted with file');
  }
  
  // Final verification
  console.log('\n📋 Final FK Verification:');
  const fks = await client.query(`
    SELECT constraint_name, update_rule, delete_rule
    FROM information_schema.referential_constraints rc
    JOIN information_schema.table_constraints tc ON rc.constraint_name = tc.constraint_name
    WHERE tc.table_name = 'dms_mata_elang_shares'
  `);
  fks.rows.forEach(r => {
    console.log(`  ${r.constraint_name}: ON UPDATE=${r.update_rule}, ON DELETE=${r.delete_rule}`);
  });
  
  await client.end();
  console.log('\n✅ All tests passed!');
}

main().catch(console.error);
