const db = require('../../../models');
const { Product, Supplier } = db;

/**
 * GET /api/inventory/low-stock
 * Returns products with low stock or out of stock
 */
export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({
      success: false,
      message: 'Method not allowed'
    });
  }

  try {
    const { status = 'all', limit = 50, category } = req.query;

    let where = { is_active: true };

    // Filter by category if provided
    if (category) {
      where.category = category;
    }

    // Filter by stock status
    if (status === 'low') {
      where.stock = {
        [db.Sequelize.Op.lte]: db.Sequelize.col('min_stock'),
        [db.Sequelize.Op.gt]: 0
      };
    } else if (status === 'out') {
      where.stock = 0;
    } else if (status === 'critical') {
      where.stock = {
        [db.Sequelize.Op.lte]: db.Sequelize.col('reorder_point')
      };
    } else {
      // 'all' - get both low and out of stock
      where[db.Sequelize.Op.or] = [
        {
          stock: {
            [db.Sequelize.Op.lte]: db.Sequelize.col('min_stock')
          }
        },
        { stock: 0 }
      ];
    }

    const products = await Product.findAll({
      where,
      attributes: ['id', 'name', 'sku', 'category', 'price', 'stock', 'unit', 'min_stock', 'is_active'],
      order: [
        ['stock', 'ASC'],
        ['name', 'ASC']
      ],
      limit: parseInt(limit),
      paranoid: false
    });

    // Calculate reorder recommendations
    const productsWithRecommendations = products.map(product => {
      const daysOfStock = product.avgDailySales > 0 
        ? Math.floor(product.stock / product.avgDailySales)
        : 0;

      const reorderQuantity = Math.max(
        (product.min_stock || 10) - product.stock,
        product.min_stock || 10
      );

      const urgency = product.stock === 0 ? 'urgent' 
        : product.stock <= (product.min_stock || 0) ? 'high'
        : 'medium';

      return {
        ...product.toJSON(),
        daysOfStock,
        reorderQuantity,
        urgency,
        estimatedCost: reorderQuantity * (product.purchasePrice || product.cost || product.price)
      };
    });

    // Calculate summary
    const summary = {
      total: productsWithRecommendations.length,
      outOfStock: productsWithRecommendations.filter(p => p.stock === 0).length,
      lowStock: productsWithRecommendations.filter(p => p.stock > 0 && p.stock <= p.minStock).length,
      critical: productsWithRecommendations.filter(p => p.urgency === 'urgent' || p.urgency === 'high').length,
      totalReorderCost: productsWithRecommendations.reduce((sum, p) => sum + p.estimatedCost, 0)
    };

    return res.status(200).json({
      success: true,
      data: productsWithRecommendations,
      summary
    });

  } catch (error) {
    console.error('Low Stock API Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}
