const db = require('../models');

async function fixKybDocumentsTable() {
  const { sequelize } = db;
  
  try {
    console.log('=== Fixing kyb_documents table ===\n');

    // Drop the old table and recreate to match model
    await sequelize.query('DROP TABLE IF EXISTS kyb_documents CASCADE;');
    console.log('✓ Dropped old kyb_documents table');

    // Recreate matching the KybDocument model exactly
    await sequelize.query(`
      CREATE TABLE kyb_documents (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        kyb_application_id UUID NOT NULL REFERENCES kyb_applications(id) ON DELETE CASCADE,
        tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        document_type VARCHAR(50) NOT NULL,
        document_name VARCHAR(255) NOT NULL,
        file_url TEXT NOT NULL,
        file_size INTEGER,
        mime_type VARCHAR(100),
        verification_status VARCHAR(30) DEFAULT 'pending',
        verified_by UUID,
        verified_at TIMESTAMP,
        verification_notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
      );
    `);
    console.log('✓ Created kyb_documents table (matching model)');

    // Add indexes
    await sequelize.query('CREATE INDEX IF NOT EXISTS idx_kyb_documents_kyb_application_id ON kyb_documents(kyb_application_id);');
    await sequelize.query('CREATE INDEX IF NOT EXISTS idx_kyb_documents_tenant_id ON kyb_documents(tenant_id);');
    await sequelize.query('CREATE INDEX IF NOT EXISTS idx_kyb_documents_document_type ON kyb_documents(document_type);');
    console.log('✓ Indexes created');

    // Verify
    console.log('\n--- Verification ---');
    const [cols] = await sequelize.query(`
      SELECT column_name FROM information_schema.columns 
      WHERE table_name = 'kyb_documents' ORDER BY ordinal_position;
    `);
    console.log('Columns:', cols.map(c => c.column_name).join(', '));

    // Test query
    const docs = await db.KybDocument.findAll({ limit: 1 });
    console.log('✅ KybDocument query works! Found', docs.length, 'records');

    console.log('\n=== DONE ===');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

fixKybDocumentsTable();
