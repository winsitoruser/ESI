const db = require('../../../models');
const { Product, Supplier, Stock } = db;

/**
 * GET /api/inventory/stats
 * Returns dashboard statistics for inventory
 */
export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({
      success: false,
      message: 'Method not allowed'
    });
  }

  try {
    // Get total products count
    const totalProducts = await Product.count({
      where: { is_active: true },
      paranoid: false
    });

    // Get total inventory value with JOIN to stocks table
    const products = await Product.findAll({
      where: { is_active: true },
      attributes: ['id', 'sell_price', 'buy_price'],
      include: [{
        model: db.Stock,
        as: 'stock_data',
        attributes: ['quantity'],
        required: false
      }],
      paranoid: false
    });

    const totalValue = products.reduce((sum, product) => {
      const stockData = product.stock_data || [];
      const totalQuantity = stockData.reduce((q, s) => q + parseFloat(s.quantity || 0), 0);
      const costValue = parseFloat(product.buy_price) || parseFloat(product.sell_price) || 0;
      const value = costValue * totalQuantity;
      return sum + value;
    }, 0);

    // Get low stock count from stocks table
    const lowStockResult = await db.sequelize.query(`
      SELECT COUNT(DISTINCT p.id) as count
      FROM products p
      INNER JOIN inventory_stock s ON s.product_id = p.id
      WHERE p.is_active = true 
      AND s.quantity <= p.minimum_stock 
      AND s.quantity > 0
    `, { type: db.Sequelize.QueryTypes.SELECT });
    
    const lowStockProducts = parseInt(lowStockResult[0]?.count || 0);

    // Get out of stock count from stocks table
    const outOfStockProducts = await Stock.count({
      where: {
        quantity: 0
      },
      include: [{
        model: Product,
        as: 'product',
        where: { is_active: true },
        attributes: [],
        required: true
      }]
    });

    // Get categories count
    const categoriesResult = await db.sequelize.query(`
      SELECT COUNT(DISTINCT category_id) as count
      FROM products
      WHERE is_active = true AND category_id IS NOT NULL
    `, { type: db.Sequelize.QueryTypes.SELECT });
    
    const categoriesCount = parseInt(categoriesResult[0]?.count || 0);

    // Get suppliers count
    const suppliersCount = await Supplier.count({
      where: { is_active: true },
      paranoid: false
    });

    // Calculate recent changes (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recentProducts = await Product.count({
      where: {
        is_active: true,
        created_at: {
          [db.Sequelize.Op.gte]: thirtyDaysAgo
        }
      },
      paranoid: false
    });

    // Get previous month value for comparison
    const sixtyDaysAgo = new Date();
    sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);

    const previousMonthProducts = await Product.findAll({
      where: {
        is_active: true,
        created_at: {
          [db.Sequelize.Op.between]: [sixtyDaysAgo, thirtyDaysAgo]
        }
      },
      attributes: ['id', 'sell_price', 'buy_price'],
      include: [{
        model: db.Stock,
        as: 'stock_data',
        attributes: ['quantity'],
        required: false
      }],
      paranoid: false
    });

    const previousValue = previousMonthProducts.reduce((sum, product) => {
      const stockData = product.stock_data || [];
      const totalQuantity = stockData.reduce((q, s) => q + parseFloat(s.quantity || 0), 0);
      const costValue = parseFloat(product.buy_price) || parseFloat(product.sell_price) || 0;
      const value = costValue * totalQuantity;
      return sum + value;
    }, 0);

    const valueChangePercentage = previousValue > 0 
      ? ((totalValue - previousValue) / previousValue * 100).toFixed(1)
      : 0;

    return res.status(200).json({
      success: true,
      data: {
        totalProducts,
        totalValue: Math.round(totalValue),
        lowStockProducts,
        outOfStock: outOfStockProducts,
        categories: categoriesCount,
        suppliers: suppliersCount,
        recentChanges: {
          products: recentProducts,
          valuePercentage: parseFloat(valueChangePercentage)
        }
      }
    });

  } catch (error) {
    console.error('Inventory Stats API Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}
