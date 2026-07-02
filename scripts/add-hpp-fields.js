/**
 * Add HPP Fields to Products Table
 * Manual script to add HPP-related fields and create cost tracking tables
 */

const db = require('../models');
const { sequelize } = db;

async function addHppFields() {
  try {
    console.log('🔧 Adding HPP fields to products table...\n');

    // 1. Add HPP fields to products table
    const hppFields = [
      'ADD COLUMN IF NOT EXISTS hpp DECIMAL(15,2) DEFAULT 0',
      "ADD COLUMN IF NOT EXISTS hpp_method VARCHAR(20) DEFAULT 'average'",
      'ADD COLUMN IF NOT EXISTS last_purchase_price DECIMAL(15,2)',
      'ADD COLUMN IF NOT EXISTS average_purchase_price DECIMAL(15,2)',
      'ADD COLUMN IF NOT EXISTS standard_cost DECIMAL(15,2)',
      'ADD COLUMN IF NOT EXISTS margin_amount DECIMAL(15,2)',
      'ADD COLUMN IF NOT EXISTS margin_percentage DECIMAL(5,2)',
      'ADD COLUMN IF NOT EXISTS markup_percentage DECIMAL(5,2)',
      'ADD COLUMN IF NOT EXISTS min_margin_percentage DECIMAL(5,2) DEFAULT 20',
      'ADD COLUMN IF NOT EXISTS packaging_cost DECIMAL(15,2) DEFAULT 0',
      'ADD COLUMN IF NOT EXISTS labor_cost DECIMAL(15,2) DEFAULT 0',
      'ADD COLUMN IF NOT EXISTS overhead_cost DECIMAL(15,2) DEFAULT 0'
    ];

    for (const field of hppFields) {
      await sequelize.query(`ALTER TABLE products ${field};`);
    }

    console.log('✅ HPP fields added to products table\n');

    // Create indexes
    await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_products_hpp ON products(hpp);`);
    await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_products_margin ON products(margin_percentage);`);

    console.log('✅ HPP indexes created\n');

    // 2. Create product_cost_history table
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS product_cost_history (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        product_id UUID NOT NULL,
        
        old_hpp DECIMAL(15,2),
        new_hpp DECIMAL(15,2),
        change_amount DECIMAL(15,2),
        change_percentage DECIMAL(5,2),
        
        purchase_price DECIMAL(15,2),
        packaging_cost DECIMAL(15,2),
        labor_cost DECIMAL(15,2),
        overhead_cost DECIMAL(15,2),
        
        change_reason VARCHAR(255),
        source_reference VARCHAR(100),
        notes TEXT,
        
        changed_by UUID,
        changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);

    console.log('✅ Product cost history table created\n');

    // Create indexes for product_cost_history
    await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_cost_history_product ON product_cost_history(product_id);`);
    await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_cost_history_date ON product_cost_history(changed_at);`);
    await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_cost_history_reason ON product_cost_history(change_reason);`);

    console.log('✅ Cost history indexes created\n');

    // 3. Create product_cost_components table
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS product_cost_components (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        product_id UUID NOT NULL,
        
        component_type VARCHAR(50) NOT NULL,
        component_name VARCHAR(255) NOT NULL,
        component_description TEXT,
        
        cost_amount DECIMAL(15,2) NOT NULL,
        quantity DECIMAL(10,3) DEFAULT 1,
        unit VARCHAR(20),
        
        is_active BOOLEAN DEFAULT TRUE,
        
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);

    console.log('✅ Product cost components table created\n');

    // Create indexes for product_cost_components
    await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_cost_components_product ON product_cost_components(product_id);`);
    await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_cost_components_type ON product_cost_components(component_type);`);
    await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_cost_components_active ON product_cost_components(is_active);`);

    console.log('✅ Cost components indexes created\n');

    console.log('═'.repeat(60));
    console.log('✅ HPP Fields and Tables Created Successfully!');
    console.log('═'.repeat(60));
    console.log('\n📋 Changes Made:');
    console.log('  - Added 12 HPP fields to products table');
    console.log('  - Created product_cost_history table');
    console.log('  - Created product_cost_components table');
    console.log('  - Created 8 indexes');
    console.log('\n🚀 Ready to use!');
    console.log('');

  } catch (error) {
    console.error('❌ Error adding HPP fields:', error.message);
    throw error;
  }
}

addHppFields()
  .then(() => {
    console.log('✓ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('✗ Script failed:', error);
    process.exit(1);
  });
