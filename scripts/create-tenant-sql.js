const { Sequelize } = require('sequelize');
const config = require('../config/database');

const env = process.env.NODE_ENV || 'development';
const dbConfig = config[env];

const sequelize = new Sequelize(
  dbConfig.database,
  dbConfig.username,
  dbConfig.password,
  {
    host: dbConfig.host,
    port: dbConfig.port,
    dialect: dbConfig.dialect,
    logging: false
  }
);

async function createTenantTable() {
  try {
    // Create tenants table
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS tenants (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        business_type_id UUID,
        business_name VARCHAR(255),
        business_address TEXT,
        business_phone VARCHAR(50),
        business_email VARCHAR(255),
        setup_completed BOOLEAN DEFAULT false,
        onboarding_step VARCHAR(50) DEFAULT 'start',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);

    console.log('✅ Tenants table created');

    // Create tenant
    const { v4: uuidv4 } = require('uuid');
    const tenantId = uuidv4();

    await sequelize.query(`
      INSERT INTO tenants (id, business_name, business_address, business_phone, business_email, setup_completed, onboarding_step)
      VALUES (:id, :businessName, :businessAddress, :businessPhone, :businessEmail, :setupCompleted, :onboardingStep)
    `, {
      replacements: {
        id: tenantId,
        businessName: 'F&B Business',
        businessAddress: 'Jakarta, Indonesia',
        businessPhone: '+628123456789',
        businessEmail: 'winsitoruser@gmail.com',
        setupCompleted: true,
        onboardingStep: 'completed'
      }
    });

    // Update user
    await sequelize.query(`
      UPDATE users SET tenant_id = :tenantId WHERE email = :email
    `, {
      replacements: {
        tenantId,
        email: 'winsitoruser@gmail.com'
      }
    });

    console.log('✅ Tenant created and user updated');
    console.log('Tenant ID:', tenantId);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await sequelize.close();
    process.exit();
  }
}

createTenantTable();
