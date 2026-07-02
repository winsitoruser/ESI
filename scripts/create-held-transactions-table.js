/**
 * Create Held Transactions Table
 * Manual script to create held_transactions table
 */

const db = require('../models');
const { sequelize } = db;

async function createHeldTransactionsTable() {
  try {
    console.log('🔧 Creating held_transactions table...\n');

    // Create ENUM type for status
    await sequelize.query(`
      DO $$ BEGIN
        CREATE TYPE enum_held_transactions_status AS ENUM('held', 'resumed', 'cancelled', 'completed');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    // Create held_transactions table
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS held_transactions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        hold_number VARCHAR(50) NOT NULL UNIQUE,
        cashier_id UUID NOT NULL,
        customer_name VARCHAR(255),
        customer_id UUID,
        
        cart_items JSONB NOT NULL,
        subtotal DECIMAL(15,2) NOT NULL DEFAULT 0,
        discount DECIMAL(15,2) NOT NULL DEFAULT 0,
        tax DECIMAL(15,2) NOT NULL DEFAULT 0,
        total DECIMAL(15,2) NOT NULL,
        
        customer_type VARCHAR(20) DEFAULT 'walk-in',
        selected_member JSONB,
        selected_voucher JSONB,
        
        hold_reason VARCHAR(255),
        notes TEXT,
        
        status enum_held_transactions_status NOT NULL DEFAULT 'held',
        held_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        resumed_at TIMESTAMP,
        completed_at TIMESTAMP,
        cancelled_at TIMESTAMP,
        
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);

    console.log('✅ Table created successfully\n');

    // Create indexes
    console.log('📊 Creating indexes...\n');

    await sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_held_transactions_cashier 
      ON held_transactions(cashier_id);
    `);

    await sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_held_transactions_status 
      ON held_transactions(status);
    `);

    await sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_held_transactions_held_at 
      ON held_transactions(held_at);
    `);

    await sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_held_transactions_hold_number 
      ON held_transactions(hold_number);
    `);

    console.log('✅ Indexes created successfully\n');

    // Add columns to pos_transactions if table exists
    console.log('🔧 Updating pos_transactions table...\n');

    await sequelize.query(`
      DO $$ BEGIN
        ALTER TABLE pos_transactions 
        ADD COLUMN IF NOT EXISTS held_transaction_id UUID;
      EXCEPTION
        WHEN undefined_table THEN
          RAISE NOTICE 'pos_transactions table does not exist yet';
      END $$;
    `);

    await sequelize.query(`
      DO $$ BEGIN
        ALTER TABLE pos_transactions 
        ADD COLUMN IF NOT EXISTS was_held BOOLEAN DEFAULT FALSE;
      EXCEPTION
        WHEN undefined_table THEN
          RAISE NOTICE 'pos_transactions table does not exist yet';
      END $$;
    `);

    console.log('✅ pos_transactions table updated\n');

    console.log('═'.repeat(60));
    console.log('✅ Held Transactions Table Created Successfully!');
    console.log('═'.repeat(60));
    console.log('\n📋 Table Details:');
    console.log('  - Table: held_transactions');
    console.log('  - Indexes: 4 (cashier_id, status, held_at, hold_number)');
    console.log('  - Status ENUM: held, resumed, cancelled, completed');
    console.log('\n🚀 Ready to use!');
    console.log('');

  } catch (error) {
    console.error('❌ Error creating table:', error.message);
    throw error;
  }
}

createHeldTransactionsTable()
  .then(() => {
    console.log('✓ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('✗ Script failed:', error);
    process.exit(1);
  });
