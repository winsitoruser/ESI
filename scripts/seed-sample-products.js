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

async function seedSampleProducts() {
  try {
    console.log('Seeding sample products for recipes...');
    
    const sampleProducts = [
      { id: 1, name: 'Nasi Putih', sku: 'NAS001', unit: 'gram', sell_price: 5000, buy_price: 3000, is_active: true },
      { id: 2, name: 'Ayam Fillet', sku: 'AYM001', unit: 'gram', sell_price: 8000, buy_price: 5000, is_active: true },
      { id: 3, name: 'Telur', sku: 'TEL001', unit: 'butir', sell_price: 3000, buy_price: 2000, is_active: true },
      { id: 4, name: 'Bawang Merah', sku: 'BWM001', unit: 'siung', sell_price: 800, buy_price: 500, is_active: true },
      { id: 5, name: 'Kecap Manis', sku: 'KCM001', unit: 'sdm', sell_price: 2500, buy_price: 1500, is_active: true },
      { id: 6, name: 'Ayam', sku: 'AYM002', unit: 'gram', sell_price: 12000, buy_price: 8000, is_active: true },
      { id: 7, name: 'Kunyit', sku: 'KUN001', unit: 'cm', sell_price: 800, buy_price: 500, is_active: true },
      { id: 8, name: 'Serai', sku: 'SER001', unit: 'batang', sell_price: 500, buy_price: 300, is_active: true },
      { id: 9, name: 'Daun Jeruk', sku: 'DJR001', unit: 'lembar', sell_price: 400, buy_price: 200, is_active: true },
      { id: 10, name: 'Soun', sku: 'SUN001', unit: 'gram', sell_price: 3000, buy_price: 2000, is_active: true },
      { id: 11, name: 'Ayam Kampung', sku: 'AYM003', unit: 'gram', sell_price: 18000, buy_price: 12000, is_active: true },
      { id: 12, name: 'Madu', sku: 'MAD001', unit: 'sdm', sell_price: 5000, buy_price: 3000, is_active: true },
      { id: 13, name: 'Kecap Manis Premium', sku: 'KCM002', unit: 'sdm', sell_price: 2000, buy_price: 1000, is_active: true },
      { id: 14, name: 'Bawang Putih', sku: 'BWP001', unit: 'siung', sell_price: 2000, buy_price: 1000, is_active: true },
      { id: 15, name: 'Cabai Merah', sku: 'CBM001', unit: 'buah', sell_price: 2000, buy_price: 1000, is_active: true }
    ];

    for (const product of sampleProducts) {
      await sequelize.query(`
        INSERT INTO products (id, name, sku, unit, sell_price, buy_price, is_active, created_at, updated_at)
        VALUES (:id, :name, :sku, :unit, :sell_price, :buy_price, :is_active, NOW(), NOW())
        ON CONFLICT (id) DO UPDATE SET
          name = EXCLUDED.name,
          sku = EXCLUDED.sku,
          unit = EXCLUDED.unit,
          sell_price = EXCLUDED.sell_price,
          buy_price = EXCLUDED.buy_price,
          is_active = EXCLUDED.is_active,
          updated_at = NOW()
      `, {
        replacements: product
      });
    }

    console.log('✅ Sample products seeded successfully');
  } catch (error) {
    console.error('Error seeding products:', error);
  } finally {
    await sequelize.close();
    process.exit();
  }
}

seedSampleProducts();
