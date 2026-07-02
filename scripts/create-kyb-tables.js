const db = require('../models');

async function createKybTables() {
  const { sequelize } = db;
  
  try {
    console.log('Creating KYB tables...\n');

    // Create kyb_applications table
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS kyb_applications (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        
        -- Step 1: Business Identity
        business_name VARCHAR(255) NOT NULL,
        business_category VARCHAR(100),
        business_subcategory VARCHAR(100),
        business_duration VARCHAR(50),
        business_description TEXT,
        employee_count VARCHAR(50),
        annual_revenue VARCHAR(50),
        
        -- Step 2: Legal Status
        legal_entity_type VARCHAR(50),
        legal_entity_name VARCHAR(255),
        nib_number VARCHAR(100),
        siup_number VARCHAR(100),
        npwp_number VARCHAR(100),
        ktp_number VARCHAR(50),
        ktp_name VARCHAR(255),
        
        -- Step 4: PIC & Address
        pic_name VARCHAR(255),
        pic_phone VARCHAR(50),
        pic_email VARCHAR(255),
        pic_position VARCHAR(100),
        business_address TEXT,
        business_city VARCHAR(100),
        business_province VARCHAR(100),
        business_postal_code VARCHAR(20),
        business_district VARCHAR(100),
        business_coordinates JSON,
        
        -- Step 5: Business Structure
        business_structure VARCHAR(20) DEFAULT 'single',
        planned_branch_count INTEGER DEFAULT 1,
        branch_locations JSON,
        
        -- Step 6: Additional
        additional_notes TEXT,
        referral_source VARCHAR(100),
        expected_start_date DATE,
        
        -- KYB Status
        status VARCHAR(30) DEFAULT 'draft',
        submitted_at TIMESTAMP,
        current_step INTEGER DEFAULT 1,
        completion_percentage INTEGER DEFAULT 0,
        
        -- Review
        reviewed_by UUID,
        reviewed_at TIMESTAMP,
        review_notes TEXT,
        rejection_reason TEXT,
        
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✓ kyb_applications table created');

    // Create kyb_documents table
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS kyb_documents (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        kyb_application_id UUID NOT NULL REFERENCES kyb_applications(id) ON DELETE CASCADE,
        document_type VARCHAR(50) NOT NULL,
        document_name VARCHAR(255) NOT NULL,
        file_path VARCHAR(500) NOT NULL,
        file_size INTEGER,
        mime_type VARCHAR(100),
        uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        verified BOOLEAN DEFAULT false,
        verified_by UUID,
        verified_at TIMESTAMP,
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✓ kyb_documents table created');

    // Create indexes
    await sequelize.query('CREATE INDEX IF NOT EXISTS idx_kyb_applications_tenant_id ON kyb_applications(tenant_id);');
    await sequelize.query('CREATE INDEX IF NOT EXISTS idx_kyb_applications_user_id ON kyb_applications(user_id);');
    await sequelize.query('CREATE INDEX IF NOT EXISTS idx_kyb_applications_status ON kyb_applications(status);');
    await sequelize.query('CREATE INDEX IF NOT EXISTS idx_kyb_documents_kyb_application_id ON kyb_documents(kyb_application_id);');
    await sequelize.query('CREATE INDEX IF NOT EXISTS idx_kyb_documents_document_type ON kyb_documents(document_type);');
    console.log('✓ Indexes created');

    console.log('\n✅ KYB tables created successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error creating KYB tables:', error.message);
    console.error(error);
    process.exit(1);
  }
}

createKybTables();
