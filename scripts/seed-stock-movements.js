const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function seedStockMovements() {
  console.log('🌱 Seeding stock_movements table...\n');

  try {
    // Get existing products and locations
    const productsResult = await pool.query('SELECT id, name FROM products LIMIT 8');
    const locationsResult = await pool.query('SELECT id, name FROM locations LIMIT 6');
    
    const products = productsResult.rows;
    const locations = locationsResult.rows;

    if (products.length === 0 || locations.length === 0) {
      console.error('❌ No products or locations found. Please run migration first.');
      return;
    }

    console.log(`Found ${products.length} products and ${locations.length} locations\n`);

    // Generate stock movements for the last 30 days
    const movements = [];
    const currentDate = new Date();
    
    // Helper function to get random date in last N days
    const getRandomDate = (daysAgo) => {
      const date = new Date(currentDate);
      date.setDate(date.getDate() - daysAgo);
      return date;
    };

    // Helper to get random item from array
    const getRandom = (arr) => arr[Math.floor(Math.random() * arr.length)];

    // Create 50 stock movements
    const movementTypes = [
      { type: 'in', refType: 'purchase', refPrefix: 'PO' },
      { type: 'out', refType: 'sale', refPrefix: 'SO' },
      { type: 'adjustment', refType: 'adjustment', refPrefix: 'ADJ' },
      { type: 'in', refType: 'return', refPrefix: 'RET' }
    ];

    for (let i = 1; i <= 50; i++) {
      const product = getRandom(products);
      const location = getRandom(locations);
      const movement = getRandom(movementTypes);
      const daysAgo = Math.floor(Math.random() * 30);
      const quantity = movement.type === 'out' 
        ? -(Math.floor(Math.random() * 50) + 1)
        : Math.floor(Math.random() * 100) + 10;
      
      const costPrice = Math.floor(Math.random() * 50000) + 5000;
      const batchNumber = `BATCH-${String.fromCharCode(65 + Math.floor(Math.random() * 26))}${String(i).padStart(3, '0')}`;
      
      // Random expiry date 6-24 months in future
      const expiryDate = new Date(currentDate);
      expiryDate.setMonth(expiryDate.getMonth() + Math.floor(Math.random() * 18) + 6);

      movements.push({
        productId: product.id,
        productName: product.name,
        locationId: location.id,
        locationName: location.name,
        movementType: movement.type,
        quantity,
        referenceType: movement.refType,
        referenceNumber: `${movement.refPrefix}-2025-${String(i).padStart(4, '0')}`,
        batchNumber,
        expiryDate: expiryDate.toISOString().split('T')[0],
        costPrice,
        notes: `${movement.refType === 'purchase' ? 'Pembelian dari supplier' : 
                 movement.refType === 'sale' ? 'Penjualan ke customer' : 
                 movement.refType === 'adjustment' ? 'Penyesuaian stok' : 
                 'Retur barang'}`,
        createdBy: 'admin@example.com',
        createdAt: getRandomDate(daysAgo)
      });
    }

    // Insert movements
    console.log('Inserting stock movements...\n');
    let inserted = 0;

    for (const movement of movements) {
      const query = `
        INSERT INTO stock_movements (
          product_id, location_id, movement_type, quantity,
          reference_type, reference_number, batch_number, expiry_date,
          cost_price, notes, created_by, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      `;

      const values = [
        movement.productId,
        movement.locationId,
        movement.movementType,
        movement.quantity,
        movement.referenceType,
        movement.referenceNumber,
        movement.batchNumber,
        movement.expiryDate,
        movement.costPrice,
        movement.notes,
        movement.createdBy,
        movement.createdAt
      ];

      try {
        await pool.query(query, values);
        inserted++;
        
        if (inserted % 10 === 0) {
          console.log(`  ✓ Inserted ${inserted} movements...`);
        }
      } catch (error) {
        console.error(`  ✗ Error inserting movement ${movement.referenceNumber}:`, error.message);
      }
    }

    console.log(`\n✅ Successfully inserted ${inserted} stock movements!\n`);

    // Show summary
    const summaryQuery = `
      SELECT 
        movement_type,
        reference_type,
        COUNT(*) as count,
        SUM(CASE WHEN quantity > 0 THEN quantity ELSE 0 END) as total_in,
        SUM(CASE WHEN quantity < 0 THEN ABS(quantity) ELSE 0 END) as total_out
      FROM stock_movements
      GROUP BY movement_type, reference_type
      ORDER BY movement_type, reference_type
    `;

    const summary = await pool.query(summaryQuery);
    
    console.log('📊 Stock Movements Summary:');
    console.log('─'.repeat(80));
    console.log('Movement Type | Reference Type | Count | Total IN | Total OUT');
    console.log('─'.repeat(80));
    
    summary.rows.forEach(row => {
      console.log(
        `${row.movement_type.padEnd(13)} | ${row.reference_type.padEnd(14)} | ${String(row.count).padEnd(5)} | ${String(row.total_in).padEnd(8)} | ${row.total_out}`
      );
    });
    console.log('─'.repeat(80));

    // Show recent movements
    const recentQuery = `
      SELECT 
        sm.id,
        sm.created_at,
        p.name as product_name,
        l.name as location_name,
        sm.movement_type,
        sm.quantity,
        sm.reference_number
      FROM stock_movements sm
      JOIN products p ON sm.product_id = p.id
      JOIN locations l ON sm.location_id = l.id
      ORDER BY sm.created_at DESC
      LIMIT 10
    `;

    const recent = await pool.query(recentQuery);
    
    console.log('\n📝 Recent Stock Movements (Last 10):');
    console.log('─'.repeat(120));
    
    recent.rows.forEach((row, idx) => {
      const date = new Date(row.created_at).toLocaleDateString('id-ID');
      console.log(`${idx + 1}. [${date}] ${row.product_name} - ${row.location_name}`);
      console.log(`   Type: ${row.movement_type} | Qty: ${row.quantity} | Ref: ${row.reference_number}`);
    });
    console.log('─'.repeat(120));

  } catch (error) {
    console.error('❌ Error seeding stock movements:', error);
  } finally {
    await pool.end();
  }
}

// Run the seed
seedStockMovements()
  .then(() => {
    console.log('\n✅ Stock movements seeding complete!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Seeding failed:', error);
    process.exit(1);
  });
