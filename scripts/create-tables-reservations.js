/**
 * Create Tables and Reservations Tables
 * Manual script to create tables, reservations, and table_sessions tables
 */

const db = require('../models');
const { sequelize } = db;

async function createTablesAndReservations() {
  try {
    console.log('🔧 Creating Tables and Reservations tables...\n');

    // 1. Create ENUM types
    await sequelize.query(`
      DO $$ BEGIN
        CREATE TYPE enum_tables_status AS ENUM('available', 'occupied', 'reserved', 'maintenance');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    await sequelize.query(`
      DO $$ BEGIN
        CREATE TYPE enum_reservations_status AS ENUM('pending', 'confirmed', 'seated', 'completed', 'cancelled', 'no-show');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    console.log('✅ ENUM types created\n');

    // 2. Create tables table
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS tables (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        table_number VARCHAR(20) NOT NULL UNIQUE,
        capacity INTEGER NOT NULL,
        area VARCHAR(50),
        floor INTEGER DEFAULT 1,
        position_x INTEGER,
        position_y INTEGER,
        status enum_tables_status NOT NULL DEFAULT 'available',
        is_active BOOLEAN DEFAULT TRUE,
        notes TEXT,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);

    console.log('✅ Tables table created\n');

    // Create indexes for tables
    await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_tables_status ON tables(status);`);
    await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_tables_area ON tables(area);`);
    await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_tables_active ON tables(is_active);`);

    console.log('✅ Tables indexes created\n');

    // 3. Create reservations table
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS reservations (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        reservation_number VARCHAR(50) NOT NULL UNIQUE,
        
        customer_id UUID,
        customer_name VARCHAR(255) NOT NULL,
        customer_phone VARCHAR(50) NOT NULL,
        customer_email VARCHAR(255),
        
        reservation_date DATE NOT NULL,
        reservation_time TIME NOT NULL,
        guest_count INTEGER NOT NULL,
        duration_minutes INTEGER DEFAULT 120,
        
        table_id UUID,
        table_number VARCHAR(20),
        
        status enum_reservations_status NOT NULL DEFAULT 'pending',
        deposit_amount DECIMAL(15,2) DEFAULT 0,
        deposit_paid BOOLEAN DEFAULT FALSE,
        
        special_requests TEXT,
        notes TEXT,
        cancellation_reason TEXT,
        
        created_by UUID,
        confirmed_by UUID,
        seated_by UUID,
        
        confirmed_at TIMESTAMP,
        seated_at TIMESTAMP,
        completed_at TIMESTAMP,
        cancelled_at TIMESTAMP,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);

    console.log('✅ Reservations table created\n');

    // Create indexes for reservations
    await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_reservations_date ON reservations(reservation_date);`);
    await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_reservations_status ON reservations(status);`);
    await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_reservations_customer ON reservations(customer_id);`);
    await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_reservations_table ON reservations(table_id);`);
    await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_reservations_number ON reservations(reservation_number);`);
    await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_reservations_phone ON reservations(customer_phone);`);

    console.log('✅ Reservations indexes created\n');

    // 4. Create table_sessions table
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS table_sessions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        table_id UUID NOT NULL,
        reservation_id UUID,
        pos_transaction_id UUID,
        guest_count INTEGER,
        started_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        ended_at TIMESTAMP,
        duration_minutes INTEGER,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);

    console.log('✅ Table sessions table created\n');

    // Create indexes for table_sessions
    await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_table_sessions_table ON table_sessions(table_id);`);
    await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_table_sessions_reservation ON table_sessions(reservation_id);`);
    await sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_table_sessions_active 
      ON table_sessions(table_id, ended_at) 
      WHERE ended_at IS NULL;
    `);

    console.log('✅ Table sessions indexes created\n');

    console.log('═'.repeat(60));
    console.log('✅ Tables and Reservations Created Successfully!');
    console.log('═'.repeat(60));
    console.log('\n📋 Tables Created:');
    console.log('  - tables (with 3 indexes)');
    console.log('  - reservations (with 6 indexes)');
    console.log('  - table_sessions (with 3 indexes)');
    console.log('\n🚀 Ready to use!');
    console.log('');

  } catch (error) {
    console.error('❌ Error creating tables:', error.message);
    throw error;
  }
}

createTablesAndReservations()
  .then(() => {
    console.log('✓ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('✗ Script failed:', error);
    process.exit(1);
  });
