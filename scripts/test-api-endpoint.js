const http = require('http');

async function testAPIEndpoint() {
  try {
    console.log('Testing Product Details API Endpoint...\n');
    
    // Get product ID first
    const db = require('../models');
    const product = await db.Product.findOne({
      where: { is_active: true }
    });
    
    if (!product) {
      console.log('❌ No products found');
      process.exit(1);
    }
    
    console.log(`Testing with Product ID: ${product.id} (${product.name})\n`);
    
    // Test the API endpoint
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: `/api/products/${product.id}/details`,
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    };
    
    const req = http.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        console.log(`Status Code: ${res.statusCode}\n`);
        
        if (res.statusCode === 200) {
          const response = JSON.parse(data);
          
          if (response.success) {
            console.log('✅ API Response Structure:');
            console.log(`  Product: ${response.data.product.name}`);
            console.log(`  SKU: ${response.data.product.sku}`);
            console.log(`  Supplier: ${response.data.product.supplier ? response.data.product.supplier.name : 'None'}`);
            console.log(`  Total Stock: ${response.data.stock.total}`);
            console.log(`  Stock Locations: ${response.data.stock.by_location.length}`);
            console.log(`  Batches: ${response.data.stock.batches.length}`);
            console.log(`  Stock Movements: ${response.data.stock_movements.length}`);
            console.log(`  Purchase History: ${response.data.purchase_history.length}`);
            console.log(`  Avg Purchase Price: ${response.data.avg_purchase_price}`);
            
            console.log('\n✅ All tests passed! API endpoint is working correctly.');
            process.exit(0);
          } else {
            console.log('❌ API returned success: false');
            console.log(JSON.stringify(response, null, 2));
            process.exit(1);
          }
        } else {
          console.log('❌ API returned error status');
          console.log(data);
          process.exit(1);
        }
      });
    });
    
    req.on('error', (error) => {
      console.error('❌ Request failed:', error.message);
      console.log('\nMake sure the dev server is running: npm run dev');
      process.exit(1);
    });
    
    req.end();
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  }
}

testAPIEndpoint();
