const { Client } = require('pg');
require('dotenv').config({ path: '.env.local' });
require('dotenv').config({ path: '.env.development' });
require('dotenv').config();

const config = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'bedagang_dev',
};

console.log('Checking PJM tables in database:', config.database);
console.log('Host:', config.host, 'Port:', config.port);

async function check() {
  const client = new Client(config);
  try {
    await client.connect();
    console.log('✅ Connected to database');

    // Check if PJM tables exist
    const pjmTables = [
      'pjm_projects',
      'pjm_tasks',
      'pjm_milestones',
      'pjm_timesheets',
      'pjm_resources',
      'pjm_risks',
      'pjm_budgets',
      'pjm_documents',
      'pjm_settings',
      'pjm_sprints',
      'pjm_comments',
      'pjm_activity_log',
      'pjm_attachments',
      'pjm_approvals',
      'pjm_dependencies',
      'pjm_watchers',
      'pjm_baselines'
    ];

    const existingTables = [];
    const missingTables = [];

    for (const table of pjmTables) {
      const result = await client.query(
        "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = $1)",
        [table]
      );
      if (result.rows[0].exists) {
        existingTables.push(table);
        // Also check columns for pjm_projects
        if (table === 'pjm_projects') {
          const colsResult = await client.query(
            "SELECT column_name, data_type FROM information_schema.columns WHERE table_schema = 'public' AND table_name = $1 ORDER BY ordinal_position",
            [table]
          );
          console.log('\n📋 pjm_projects columns:');
          colsResult.rows.forEach(col => {
            console.log(`  - ${col.column_name}: ${col.data_type}`);
          });
        }
      } else {
        missingTables.push(table);
      }
    }

    console.log('\n--- Results ---');
    console.log('✅ Existing PJM tables:', existingTables.length);
    existingTables.forEach(t => console.log('  -', t));
    
    if (missingTables.length > 0) {
      console.log('\n❌ Missing PJM tables:', missingTables.length);
      missingTables.forEach(t => console.log('  -', t));
    } else {
      console.log('\n✅ All PJM tables found!');
    }

    // Check SequelizeMeta migrations
    try {
      const metaResult = await client.query('SELECT name FROM "SequelizeMeta" ORDER BY name');
      console.log('\n📋 Migrations in SequelizeMeta:', metaResult.rows.length);
      const pjmMigrations = metaResult.rows.filter(r => r.name.includes('pjm') || r.name.includes('project-management'));
      if (pjmMigrations.length > 0) {
        console.log('\nPJM-related migrations:');
        pjmMigrations.forEach(m => console.log('  -', m.name));
      } else {
        console.log('\n⚠️ No PJM migrations found in SequelizeMeta');
      }
    } catch (e) {
      console.log('\n⚠️ SequelizeMeta not found or error:', e.message);
    }

    await client.end();
    return { existingTables, missingTables };
  } catch (err) {
    console.log('❌ Error:', err.message);
    console.log(err.stack);
    return { error: err.message };
  }
}

check();
