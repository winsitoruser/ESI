const db = require('../models');

async function seedKitchenInventory() {
  try {
    // Get tenant ID for winsitoruser@gmail.com
    const user = await db.User.findOne({
      where: { email: 'winsitoruser@gmail.com' }
    });

    if (!user || !user.tenantId) {
      console.log('❌ User tenant not found');
      return;
    }

    const tenantId = user.tenantId;
    console.log(`Seeding kitchen inventory for tenant: ${tenantId}`);

    const sampleItems = [
      {
        name: 'Ayam Fillet',
        category: 'Protein',
        currentStock: 5,
        unit: 'kg',
        minStock: 10,
        maxStock: 50,
        reorderPoint: 15,
        unitCost: 50000,
        lastRestocked: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
        status: 'critical'
      },
      {
        name: 'Beras Premium',
        category: 'Carbs',
        currentStock: 25,
        unit: 'kg',
        minStock: 20,
        maxStock: 100,
        reorderPoint: 30,
        unitCost: 15000,
        lastRestocked: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
        status: 'good'
      },
      {
        name: 'Minyak Goreng',
        category: 'Cooking Oil',
        currentStock: 8,
        unit: 'liter',
        minStock: 10,
        maxStock: 40,
        reorderPoint: 15,
        unitCost: 18000,
        lastRestocked: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        status: 'low'
      },
      {
        name: 'Bawang Merah',
        category: 'Vegetables',
        currentStock: 3,
        unit: 'kg',
        minStock: 5,
        maxStock: 20,
        reorderPoint: 8,
        unitCost: 35000,
        lastRestocked: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
        status: 'critical'
      },
      {
        name: 'Telur Ayam',
        category: 'Protein',
        currentStock: 120,
        unit: 'butir',
        minStock: 50,
        maxStock: 200,
        reorderPoint: 80,
        unitCost: 2000,
        lastRestocked: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
        status: 'good'
      },
      {
        name: 'Cabai Merah',
        category: 'Vegetables',
        currentStock: 2,
        unit: 'kg',
        minStock: 3,
        maxStock: 15,
        reorderPoint: 5,
        unitCost: 45000,
        lastRestocked: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000),
        status: 'critical'
      },
      {
        name: 'Saus Tomat',
        category: 'Sauce',
        currentStock: 15,
        unit: 'botol',
        minStock: 10,
        maxStock: 30,
        reorderPoint: 12,
        unitCost: 25000,
        lastRestocked: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000),
        status: 'good'
      },
      {
        name: 'Gula Pasir',
        category: 'Seasoning',
        currentStock: 45,
        unit: 'kg',
        minStock: 20,
        maxStock: 100,
        reorderPoint: 25,
        unitCost: 12000,
        lastRestocked: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000),
        status: 'good'
      },
      {
        name: 'Tepung Terigu',
        category: 'Carbs',
        currentStock: 12,
        unit: 'kg',
        minStock: 15,
        maxStock: 50,
        reorderPoint: 20,
        unitCost: 10000,
        lastRestocked: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000),
        status: 'low'
      },
      {
        name: 'Kecap Manis',
        category: 'Sauce',
        currentStock: 8,
        unit: 'botol',
        minStock: 10,
        maxStock: 25,
        reorderPoint: 12,
        unitCost: 18000,
        lastRestocked: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
        status: 'low'
      }
    ];

    // Insert items
    for (const item of sampleItems) {
      const totalValue = item.currentStock * item.unitCost;
      
      await db.KitchenInventoryItem.findOrCreate({
        where: {
          tenantId,
          name: item.name
        },
        defaults: {
          ...item,
          tenantId,
          totalValue
        }
      });
    }

    console.log('✅ Kitchen inventory seeded successfully!');

    // Create some sample transactions
    const inventoryItems = await db.KitchenInventoryItem.findAll({
      where: { tenantId }
    });

    for (const item of inventoryItems.slice(0, 5)) {
      await db.KitchenInventoryTransaction.create({
        tenantId,
        inventoryItemId: item.id,
        transactionType: 'in',
        quantity: 5,
        unit: item.unit,
        previousStock: item.currentStock - 5,
        newStock: item.currentStock,
        referenceType: 'manual',
        notes: 'Initial stock'
      });
    }

    console.log('✅ Sample transactions created!');

  } catch (error) {
    console.error('Error seeding kitchen inventory:', error);
  } finally {
    process.exit();
  }
}

seedKitchenInventory();
