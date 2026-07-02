const { Sequelize } = require('sequelize');
const sequelize = require('../config/database');

async function setupWasteTable() {
  try {
    console.log('🔄 Connecting to database...');
    await sequelize.authenticate();
    console.log('✅ Database connection established.');

    console.log('🔄 Creating wastes table...');
    
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS wastes (
        id SERIAL PRIMARY KEY,
        waste_number VARCHAR(50) UNIQUE NOT NULL,
        product_id INTEGER REFERENCES products(id) ON UPDATE CASCADE ON DELETE SET NULL,
        product_name VARCHAR(255),
        product_sku VARCHAR(100),
        waste_type VARCHAR(50) NOT NULL CHECK (waste_type IN ('finished_product', 'raw_material', 'packaging', 'production_defect')),
        quantity DECIMAL(10,2) NOT NULL,
        unit VARCHAR(20) NOT NULL,
        cost_value DECIMAL(15,2) NOT NULL,
        reason TEXT NOT NULL,
        disposal_method VARCHAR(50) NOT NULL CHECK (disposal_method IN ('disposal', 'donation', 'clearance_sale', 'recycling')),
        clearance_price DECIMAL(15,2),
        waste_date TIMESTAMP NOT NULL,
        status VARCHAR(20) NOT NULL DEFAULT 'recorded' CHECK (status IN ('recorded', 'disposed', 'processed')),
        notes TEXT,
        created_by VARCHAR(100) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    console.log('✅ Table wastes created successfully.');

    console.log('🔄 Creating indexes...');
    
    await sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_wastes_waste_number ON wastes(waste_number);
    `);
    
    await sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_wastes_product_id ON wastes(product_id);
    `);
    
    await sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_wastes_waste_type ON wastes(waste_type);
    `);
    
    await sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_wastes_waste_date ON wastes(waste_date);
    `);
    
    await sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_wastes_status ON wastes(status);
    `);

    console.log('✅ Indexes created successfully.');

    console.log('');
    console.log('🎉 Waste Management table setup completed!');
    console.log('');
    console.log('You can now use the Waste Management feature at:');
    console.log('http://localhost:3000/inventory/production');
    console.log('');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error setting up waste table:', error);
    console.error('');
    console.error('Error details:', error.message);
    process.exit(1);
  }
}

setupWasteTable();
