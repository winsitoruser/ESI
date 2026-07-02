const db = require('../../../../models');

/**
 * GET /api/products/[id]/details
 * Get comprehensive product details including batch, purchase history, and stock movements
 */
export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({
      success: false,
      message: 'Method not allowed'
    });
  }

  const { id } = req.query;

  try {
    // Get product with supplier - using correct association name
    const product = await db.Product.findByPk(id, {
      include: [{
        model: db.Supplier,
        as: 'supplierData',
        attributes: ['id', 'name', 'contact_person', 'phone', 'email'],
        required: false
      }]
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    // Get stock by location with batch info
    const stockByLocation = await db.Stock.findAll({
      where: { product_id: id },
      attributes: ['id', 'location_id', 'quantity', 'batch_number', 'expiry_date', 'updated_at'],
      order: [['location_id', 'ASC']]
    });

    // Get recent stock movements (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Use raw query for stock movements since the model uses camelCase
    const stockMovements = await db.sequelize.query(`
      SELECT 
        id,
        movement_type,
        quantity,
        reference_type,
        reference_id,
        notes,
        created_at,
        created_by
      FROM stock_movements
      WHERE product_id = :productId
        AND created_at >= :thirtyDaysAgo
      ORDER BY created_at DESC
      LIMIT 20
    `, {
      replacements: { 
        productId: id,
        thirtyDaysAgo: thirtyDaysAgo
      },
      type: db.Sequelize.QueryTypes.SELECT
    });

    // Get purchase history - using correct table and column names
    let purchaseHistory = [];
    try {
      purchaseHistory = await db.sequelize.query(`
        SELECT 
          po.id,
          po."poNumber" as po_number,
          po."orderDate" as order_date,
          po."expectedDeliveryDate" as expected_delivery_date,
          po.status,
          poi.quantity,
          poi."unitPrice" as unit_price,
          poi.subtotal,
          s.name as supplier_name
        FROM purchase_orders po
        INNER JOIN purchase_order_items poi ON po.id = poi."purchaseOrderId"
        LEFT JOIN suppliers s ON po."supplierId" = s.id
        WHERE poi."productId" = :productId
        ORDER BY po."orderDate" DESC
        LIMIT 10
      `, {
        replacements: { productId: id },
        type: db.Sequelize.QueryTypes.SELECT
      });
    } catch (error) {
      console.log('Purchase orders table not found, skipping purchase history');
      purchaseHistory = [];
    }

    // Get last order date
    const lastOrder = purchaseHistory.length > 0 ? purchaseHistory[0] : null;

    // Calculate stock statistics
    const totalStock = stockByLocation.reduce((sum, s) => sum + parseFloat(s.quantity || 0), 0);
    
    // Get batches summary
    const batches = stockByLocation
      .filter(s => s.batch_number)
      .map(s => ({
        batch_number: s.batch_number,
        quantity: parseFloat(s.quantity || 0),
        expiry_date: s.expiry_date,
        location_id: s.location_id
      }));

    // Calculate average purchase price from history
    const avgPurchasePrice = purchaseHistory.length > 0
      ? purchaseHistory.reduce((sum, p) => sum + parseFloat(p.unit_price || 0), 0) / purchaseHistory.length
      : 0;

    // Get movement statistics
    const movementStats = {
      total_in: stockMovements
        .filter(m => m.movement_type === 'in')
        .reduce((sum, m) => sum + parseFloat(m.quantity || 0), 0),
      total_out: stockMovements
        .filter(m => m.movement_type === 'out')
        .reduce((sum, m) => sum + Math.abs(parseFloat(m.quantity || 0)), 0),
      total_movements: stockMovements.length
    };

    return res.status(200).json({
      success: true,
      data: {
        product: {
          id: product.id,
          name: product.name,
          sku: product.sku,
          barcode: product.barcode,
          category_id: product.category_id,
          description: product.description,
          unit: product.unit,
          sell_price: product.sell_price,
          buy_price: product.buy_price,
          minimum_stock: product.minimum_stock,
          maximum_stock: product.maximum_stock,
          reorder_point: product.reorder_point,
          is_active: product.is_active,
          supplier: product.supplierData || null
        },
        stock: {
          total: totalStock,
          by_location: stockByLocation,
          batches: batches
        },
        purchase_history: purchaseHistory,
        last_order: lastOrder,
        avg_purchase_price: avgPurchasePrice,
        stock_movements: stockMovements,
        movement_stats: movementStats
      }
    });

  } catch (error) {
    console.error('Product Details API Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}
