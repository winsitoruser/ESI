const db = require('../../../models');
const { Product, Stock } = db;

/**
 * GET /api/inventory/overstock
 * Returns products with stock levels exceeding maximum stock
 */
export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({
      success: false,
      message: 'Method not allowed'
    });
  }

  try {
    const { limit = 50, severity } = req.query;

    // Get products with maximum_stock > 0 and calculate total stock
    const query = `
      SELECT 
        p.id as product_id,
        p.name as product_name,
        p.sku,
        p.unit,
        p.sell_price,
        p.buy_price,
        p.maximum_stock,
        COALESCE(SUM(s.quantity), 0) as total_quantity
      FROM products p
      LEFT JOIN inventory_stock s ON p.id = s.product_id
      WHERE p.is_active = true 
        AND p.maximum_stock > 0
      GROUP BY p.id, p.name, p.sku, p.unit, p.sell_price, p.buy_price, p.maximum_stock
      HAVING COALESCE(SUM(s.quantity), 0) > p.maximum_stock
      ORDER BY (COALESCE(SUM(s.quantity), 0) - p.maximum_stock) DESC
      LIMIT :limit
    `;

    const overstockProducts = await db.sequelize.query(query, {
      replacements: { limit: parseInt(limit) },
      type: db.Sequelize.QueryTypes.SELECT
    });

    // Format data untuk response
    const formattedOverstock = overstockProducts.map(product => {
      const currentStock = parseFloat(product.total_quantity) || 0;
      const maxStock = parseFloat(product.maximum_stock) || 0;
      const excess = currentStock - maxStock;
      const excessPercentage = maxStock > 0 ? (excess / maxStock) * 100 : 0;
      
      // Determine severity based on excess percentage
      let severityLevel = 'medium';
      if (excessPercentage > 100) {
        severityLevel = 'high';
      } else if (excessPercentage > 50) {
        severityLevel = 'medium';
      }

      // Filter by severity if specified
      if (severity && severityLevel !== severity) {
        return null;
      }

      // Calculate potential loss (excess * cost)
      const costValue = parseFloat(product.buy_price) || parseFloat(product.sell_price) || 0;
      const potentialLoss = excess * costValue;

      // Estimate days of stock (assuming average sales of 20 per day - TODO: get real sales data)
      const averageDailySales = 20;
      const daysOfStock = Math.ceil(currentStock / averageDailySales);

      return {
        id: product.product_id,
        product_id: product.product_id,
        product_name: product.product_name,
        sku: product.sku || 'N/A',
        current_stock: currentStock,
        maximum_stock: maxStock,
        excess: excess,
        excess_percentage: excessPercentage.toFixed(2),
        unit: product.unit || 'pcs',
        location: 'Gudang Pusat',
        severity: severityLevel,
        average_sales: averageDailySales,
        days_of_stock: daysOfStock,
        potential_loss: potentialLoss,
        suggested_action: severityLevel === 'high' 
          ? 'Kurangi order, distribusi ke cabang, atau promo besar'
          : 'Monitor, pertimbangkan promo jika tidak bergerak',
        last_restock_date: null
      };
    }).filter(item => item !== null);

    return res.status(200).json({
      success: true,
      data: formattedOverstock,
      total: formattedOverstock.length,
      message: `Found ${formattedOverstock.length} overstock products`
    });

  } catch (error) {
    console.error('Overstock API Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}
