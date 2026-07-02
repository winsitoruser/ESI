const db = require('../models');
const { Product } = db;

async function checkProducts() {
  try {
    console.log('Checking products in database...\n');
    
    // Count all products
    const totalProducts = await Product.count();
    console.log(`Total products (including inactive): ${totalProducts}`);
    
    // Count active products
    const activeProducts = await Product.count({ where: { is_active: true } });
    console.log(`Active products: ${activeProducts}`);
    
    // Count inactive products
    const inactiveProducts = await Product.count({ where: { is_active: false } });
    console.log(`Inactive products: ${inactiveProducts}`);
    
    // Get sample products
    console.log('\nSample products:');
    const sampleProducts = await Product.findAll({
      limit: 5,
      attributes: ['id', 'name', 'sku', 'is_active', 'stock', 'price'],
      order: [['id', 'ASC']]
    });
    
    if (sampleProducts.length > 0) {
      sampleProducts.forEach(p => {
        console.log(`- ID: ${p.id}, Name: ${p.name}, SKU: ${p.sku}, Active: ${p.is_active}, Stock: ${p.stock}, Price: ${p.price}`);
      });
    } else {
      console.log('No products found in database!');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('Error checking products:', error);
    process.exit(1);
  }
}

checkProducts();
