const { Client } = require('pg');

async function createWastesTable() {
  const client = new Client({
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'jakarta123',
    database: process.env.DB_NAME || 'bedagang_dev',
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
  });

  try {
    await client.connect();
    console.log('🔄 Connected to database...');

    // Create wastes table
    await client.query(`
      CREATE TABLE IF NOT EXISTS wastes (
        id SERIAL PRIMARY KEY,
        waste_number VARCHAR(50) UNIQUE NOT NULL,
        product_id INTEGER,
        product_name VARCHAR(255),
        product_sku VARCHAR(100),
        waste_type VARCHAR(50) NOT NULL,
        quantity DECIMAL(10,2) NOT NULL,
        unit VARCHAR(20) NOT NULL,
        cost_value DECIMAL(15,2) NOT NULL,
        reason TEXT,
        disposal_method VARCHAR(50) NOT NULL,
        clearance_price DECIMAL(15,2),
        waste_date DATE NOT NULL,
        status VARCHAR(20) DEFAULT 'recorded',
        notes TEXT,
        created_by VARCHAR(100),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✅ Wastes table created!');

    // Create indexes
    await client.query('CREATE INDEX IF NOT EXISTS idx_wastes_waste_number ON wastes(waste_number);');
    await client.query('CREATE INDEX IF NOT EXISTS idx_wastes_product_id ON wastes(product_id);');
    await client.query('CREATE INDEX IF NOT EXISTS idx_wastes_waste_type ON wastes(waste_type);');
    await client.query('CREATE INDEX IF NOT EXISTS idx_wastes_waste_date ON wastes(waste_date);');
    await client.query('CREATE INDEX IF NOT EXISTS idx_wastes_status ON wastes(status);');
    console.log('✅ Indexes created!');

    console.log('\n✅ Wastes table setup completed successfully!');
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await client.end();
  }
}

createWastesTable();
