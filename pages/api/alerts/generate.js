const db = require('../../../models');
const { SystemAlert, Product, Stock } = db;

/**
 * Alert Generation Service
 * Automatically generates alerts based on system conditions
 */
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      message: 'Method not allowed'
    });
  }

  try {
    const generatedAlerts = [];

    // 1. Check for low stock products
    const lowStockProducts = await Product.findAll({
      where: {
        stock: {
          [db.Sequelize.Op.lte]: db.Sequelize.col('min_stock')
        },
        isActive: true
      },
      attributes: ['id', 'name', 'sku', 'stock', 'minStock', 'reorderPoint']
    });

    for (const product of lowStockProducts) {
      const severity = product.stock === 0 ? 'urgent' : 
                      product.stock <= product.reorderPoint ? 'critical' : 'warning';
      
      const alert = await SystemAlert.create({
        alertType: product.stock === 0 ? 'stock_out' : 'stock_low',
        severity,
        title: `${product.stock === 0 ? 'Stock Habis' : 'Stock Rendah'}: ${product.name}`,
        message: `Produk ${product.name} (${product.sku}) memiliki stock ${product.stock} unit. ${
          product.stock === 0 ? 'Segera lakukan restock!' : `Minimum stock: ${product.minStock} unit.`
        }`,
        category: 'inventory',
        source: 'auto_monitor',
        referenceType: 'product',
        referenceId: product.id,
        referenceData: {
          product_name: product.name,
          sku: product.sku,
          current_stock: product.stock,
          min_stock: product.minStock,
          reorder_point: product.reorderPoint
        },
        actionRequired: true,
        actionType: 'reorder',
        actionUrl: `/inventory/purchase-orders/new?product_id=${product.id}`,
        priority: product.stock === 0 ? 100 : 80
      });
      
      generatedAlerts.push(alert);
    }

    // 2. Check for overstock products
    const overstockProducts = await Product.findAll({
      where: {
        stock: {
          [db.Sequelize.Op.gte]: db.Sequelize.col('max_stock')
        },
        maxStock: {
          [db.Sequelize.Op.gt]: 0
        },
        isActive: true
      },
      attributes: ['id', 'name', 'sku', 'stock', 'maxStock']
    });

    for (const product of overstockProducts) {
      const alert = await SystemAlert.create({
        alertType: 'overstock',
        severity: 'warning',
        title: `Overstock: ${product.name}`,
        message: `Produk ${product.name} (${product.sku}) memiliki stock ${product.stock} unit, melebihi maksimum ${product.maxStock} unit. Pertimbangkan untuk promosi atau diskon.`,
        category: 'inventory',
        source: 'auto_monitor',
        referenceType: 'product',
        referenceId: product.id,
        referenceData: {
          product_name: product.name,
          sku: product.sku,
          current_stock: product.stock,
          max_stock: product.maxStock,
          excess: product.stock - product.maxStock
        },
        actionRequired: true,
        actionType: 'adjust_price',
        actionUrl: `/inventory/products/${product.id}/edit`,
        priority: 50
      });
      
      generatedAlerts.push(alert);
    }

    // 3. Check for expiring products (if expiry tracking enabled)
    const expiringProducts = await Product.findAll({
      where: {
        requiresExpiryTracking: true,
        expiry: {
          [db.Sequelize.Op.lte]: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
        },
        isActive: true
      },
      attributes: ['id', 'name', 'sku', 'expiry', 'stock']
    });

    for (const product of expiringProducts) {
      const daysUntilExpiry = Math.ceil((product.expiry - new Date()) / (24 * 60 * 60 * 1000));
      const severity = daysUntilExpiry <= 7 ? 'urgent' : daysUntilExpiry <= 14 ? 'critical' : 'warning';
      
      const alert = await SystemAlert.create({
        alertType: daysUntilExpiry <= 7 ? 'expiry_critical' : 'expiry_warning',
        severity,
        title: `Produk Akan Kadaluarsa: ${product.name}`,
        message: `Produk ${product.name} (${product.sku}) akan kadaluarsa dalam ${daysUntilExpiry} hari (${product.expiry.toLocaleDateString()}). Stock saat ini: ${product.stock} unit.`,
        category: 'inventory',
        source: 'auto_monitor',
        referenceType: 'product',
        referenceId: product.id,
        referenceData: {
          product_name: product.name,
          sku: product.sku,
          expiry_date: product.expiry,
          days_until_expiry: daysUntilExpiry,
          current_stock: product.stock
        },
        actionRequired: true,
        actionType: 'check_quality',
        actionUrl: `/inventory/products/${product.id}`,
        priority: daysUntilExpiry <= 7 ? 90 : 70
      });
      
      generatedAlerts.push(alert);
    }

    return res.status(200).json({
      success: true,
      data: {
        generated_count: generatedAlerts.length,
        alerts: generatedAlerts
      },
      message: `Generated ${generatedAlerts.length} alerts`
    });

  } catch (error) {
    console.error('Alert Generation Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to generate alerts',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}
