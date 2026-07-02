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

async function createKitchenSchedulesTable() {
  try {
    console.log('Creating kitchen_schedules table...');
    
    // Create kitchen_schedules table
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS kitchen_schedules (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        staff_id UUID NOT NULL,
        date DATE NOT NULL,
        shift VARCHAR(10) NOT NULL CHECK (shift IN ('morning', 'afternoon', 'night', 'off')),
        status VARCHAR(15) NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'confirmed', 'completed', 'absent', 'leave')),
        notes TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        CONSTRAINT unique_staff_date UNIQUE (staff_id, date)
      )
    `);

    // Create indexes
    await sequelize.query('CREATE INDEX IF NOT EXISTS idx_kitchen_schedules_staff_id ON kitchen_schedules(staff_id)');
    await sequelize.query('CREATE INDEX IF NOT EXISTS idx_kitchen_schedules_date ON kitchen_schedules(date)');
    await sequelize.query('CREATE INDEX IF NOT EXISTS idx_kitchen_schedules_shift ON kitchen_schedules(shift)');

    // Add foreign key constraint
    try {
      await sequelize.query(`
        ALTER TABLE kitchen_schedules 
        ADD CONSTRAINT fk_kitchen_schedules_staff_id 
        FOREIGN KEY (staff_id) REFERENCES kitchen_staff(id) ON DELETE CASCADE
      `);
      console.log('✅ Foreign key constraint added');
    } catch (error) {
      // Constraint might already exist
      console.log('⚠️ Foreign key constraint already exists or failed to add');
    }

    console.log('✅ Kitchen schedules table created successfully');
  } catch (error) {
    console.error('Error creating kitchen schedules table:', error);
  } finally {
    await sequelize.close();
    process.exit();
  }
}

createKitchenSchedulesTable();
