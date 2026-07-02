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

async function createKitchenStaffTable() {
  try {
    console.log('Creating kitchen_staff table...');
    
    // Create kitchen_staff table
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS kitchen_staff (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID NOT NULL,
        user_id UUID NULL,
        name VARCHAR(255) NOT NULL,
        role VARCHAR(20) NOT NULL DEFAULT 'line_cook' CHECK (role IN ('head_chef', 'sous_chef', 'line_cook', 'prep_cook')),
        shift VARCHAR(10) NOT NULL DEFAULT 'morning' CHECK (shift IN ('morning', 'afternoon', 'night')),
        status VARCHAR(10) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'off', 'leave')),
        performance DECIMAL(5,2) DEFAULT 0,
        orders_completed INTEGER DEFAULT 0,
        avg_prep_time INTEGER,
        join_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        phone VARCHAR(20),
        email VARCHAR(255),
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);

    // Create indexes
    await sequelize.query('CREATE INDEX IF NOT EXISTS idx_kitchen_staff_tenant_id ON kitchen_staff(tenant_id)');
    await sequelize.query('CREATE INDEX IF NOT EXISTS idx_kitchen_staff_user_id ON kitchen_staff(user_id)');
    await sequelize.query('CREATE INDEX IF NOT EXISTS idx_kitchen_staff_role ON kitchen_staff(role)');
    await sequelize.query('CREATE INDEX IF NOT EXISTS idx_kitchen_staff_shift ON kitchen_staff(shift)');
    await sequelize.query('CREATE INDEX IF NOT EXISTS idx_kitchen_staff_status ON kitchen_staff(status)');

    console.log('✅ Kitchen staff table created successfully');
  } catch (error) {
    console.error('Error creating kitchen staff table:', error);
  } finally {
    await sequelize.close();
    process.exit();
  }
}

createKitchenStaffTable();
