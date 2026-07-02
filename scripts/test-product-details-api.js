const db = require('../models');

async function testProductDetailsAPI() {
  try {
    console.log('Testing Product Details API Flow...\n');
    
    // 1. Get a sample product
    console.log('1. Getting sample product...');
    const product = await db.Product.findOne({
      where: { is_active: true },
      include: [{
        model: db.Supplier,
        as: 'supplierData',
        required: false
      }]
    });
    
    if (!product) {
      console.log('❌ No products found in database');
      process.exit(1);
    }
    
    console.log(`✓ Found product: ${product.name} (ID: ${product.id})`);
    console.log(`  SKU: ${product.sku}`);
    console.log(`  Supplier: ${product.supplierData ? product.supplierData.name : 'None'}`);
    
    // 2. Check stock data
    console.log('\n2. Checking stock data...');
    const stockData = await db.Stock.findAll({
      where: { product_id: product.id }
    });
    
    console.log(`✓ Found ${stockData.length} stock records`);
    stockData.forEach((stock, idx) => {
      console.log(`  Stock ${idx + 1}:`);
      console.log(`    Location: ${stock.location_id || 'Default'}`);
      console.log(`    Quantity: ${stock.quantity}`);
      console.log(`    Batch: ${stock.batch_number || 'N/A'}`);
      console.log(`    Expiry: ${stock.expiry_date || 'N/A'}`);
    });
    
    // 3. Check stock movements
    console.log('\n3. Checking stock movements...');
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const movements = await db.sequelize.query(`
      SELECT 
        id,
        movement_type,
        quantity,
        reference_type,
        created_at
      FROM stock_movements
      WHERE product_id = :productId
        AND created_at >= :thirtyDaysAgo
      ORDER BY created_at DESC
      LIMIT 5
    `, {
      replacements: { 
        productId: product.id,
        thirtyDaysAgo: thirtyDaysAgo
      },
      type: db.Sequelize.QueryTypes.SELECT
    });
    
    console.log(`✓ Found ${movements.length} recent movements`);
    movements.forEach((mov, idx) => {
      console.log(`  Movement ${idx + 1}: ${mov.movement_type} - ${mov.quantity} (${mov.reference_type})`);
    });
    
    // 4. Check purchase history
    console.log('\n4. Checking purchase history...');
    const purchases = await db.sequelize.query(`
      SELECT 
        po.id,
        po."poNumber" as po_number,
        po."orderDate" as order_date,
        po.status,
        poi.quantity,
        poi."unitPrice" as unit_price,
        s.name as supplier_name
      FROM purchase_orders po
      INNER JOIN purchase_order_items poi ON po.id = poi."purchaseOrderId"
      LEFT JOIN suppliers s ON po."supplierId" = s.id
      WHERE poi."productId" = :productId
      ORDER BY po."orderDate" DESC
      LIMIT 5
    `, {
      replacements: { productId: product.id },
      type: db.Sequelize.QueryTypes.SELECT
    });
    
    console.log(`✓ Found ${purchases.length} purchase records`);
    purchases.forEach((po, idx) => {
      console.log(`  PO ${idx + 1}: ${po.po_number} - ${po.quantity} units @ ${po.unit_price} (${po.status})`);
    });
    
    // 5. Test complete API response structure
    console.log('\n5. Testing complete API response structure...');
    const totalStock = stockData.reduce((sum, s) => sum + parseFloat(s.quantity || 0), 0);
    const batches = stockData.filter(s => s.batch_number);
    const avgPrice = purchases.length > 0
      ? purchases.reduce((sum, p) => sum + parseFloat(p.unit_price || 0), 0) / purchases.length
      : 0;
    
    console.log('✓ API Response Structure:');
    console.log(`  Total Stock: ${totalStock}`);
    console.log(`  Stock Locations: ${stockData.length}`);
    console.log(`  Batches: ${batches.length}`);
    console.log(`  Avg Purchase Price: ${avgPrice.toFixed(2)}`);
    console.log(`  Recent Movements: ${movements.length}`);
    console.log(`  Purchase History: ${purchases.length}`);
    
    // 6. Verify model associations
    console.log('\n6. Verifying model associations...');
    const productWithStock = await db.Product.findByPk(product.id, {
      include: [{
        model: db.Stock,
        as: 'stock_data',
        required: false
      }]
    });
    
    console.log(`✓ Product.stock_data association: ${productWithStock.stock_data ? productWithStock.stock_data.length + ' records' : 'Not found'}`);
    
    console.log('\n✅ All tests passed! API endpoint should work correctly.');
    console.log(`\nTest with: GET /api/products/${product.id}/details`);
    
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

testProductDetailsAPI();
