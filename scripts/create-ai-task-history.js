/**
 * Migration: Create AI Task History table
 * Run: node scripts/create-ai-task-history.js
 */
const sequelize = require('../lib/sequelize');

async function migrate() {
  console.log('🤖 Creating AI Task History table...\n');

  try {
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS ai_task_history (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID NOT NULL,
        task_id VARCHAR(100) NOT NULL,
        task_type VARCHAR(50) NOT NULL,
        title VARCHAR(200) NOT NULL,
        description TEXT,
        status VARCHAR(30) NOT NULL DEFAULT 'pending',
        affected_records INTEGER DEFAULT 0,
        changes_json JSONB DEFAULT '[]'::jsonb,
        executed_by VARCHAR(20) DEFAULT 'ai',
        approved_by VARCHAR(200),
        approved_at TIMESTAMPTZ,
        error_message TEXT,
        started_at TIMESTAMPTZ,
        completed_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);
    console.log('✅ ai_task_history table created');

    // Indexes
    await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_ai_task_history_tenant ON ai_task_history(tenant_id);`);
    await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_ai_task_history_type ON ai_task_history(task_type);`);
    await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_ai_task_history_status ON ai_task_history(status);`);
    await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_ai_task_history_created ON ai_task_history(created_at DESC);`);
    console.log('✅ Indexes created');

    // Also ensure journal_entries table has the columns we reference
    try {
      await sequelize.query(`ALTER TABLE journal_entries ADD COLUMN IF NOT EXISTS created_by VARCHAR(200);`);
      console.log('✅ journal_entries.created_by column ensured');
    } catch (e) { console.log('⚠️  journal_entries adjustment skipped:', e.message); }

    console.log('\n🎉 AI Task History migration complete!');
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
  } finally {
    await sequelize.close();
  }
}

migrate();
