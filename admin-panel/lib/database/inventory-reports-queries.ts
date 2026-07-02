import { Pool } from 'pg';

export class InventoryReportsQueries {
  private pool: Pool;

  constructor(pool: Pool) {
    this.pool = pool;
  }

  // ============================================
  // STOCK VALUE REPORT
  // ============================================
  async getStockValueReport(params: {
    branch?: string;
    period?: string;
    dateFrom?: string;
    dateTo?: string;
  }) {
    const { branch, period, dateFrom, dateTo } = params;

    // Get total stock value
    const totalValueQuery = `
      SELECT 
        COALESCE(SUM(s.quantity * p.buy_price), 0) as total_value,
        COUNT(DISTINCT p.id) as total_products
      FROM inventory_stock s
      JOIN products p ON s.product_id = p.id
      WHERE s.quantity > 0
        AND p.is_active = true
        ${branch && branch !== 'all' ? 'AND s.location_id = $1' : ''}
    `;

    const totalResult = await this.pool.query(
      totalValueQuery,
      branch && branch !== 'all' ? [branch] : []
    );

    // Get category breakdown
    const categoryQuery = `
      SELECT 
        c.id,
        c.name,
        COUNT(DISTINCT p.id) as item_count,
        COALESCE(SUM(s.quantity * p.buy_price), 0) as value
      FROM categories c
      LEFT JOIN products p ON c.id = p.category_id AND p.is_active = true
      LEFT JOIN inventory_stock s ON p.id = s.product_id AND s.quantity > 0
      ${branch && branch !== 'all' ? 'AND s.location_id = $1' : ''}
      GROUP BY c.id, c.name
      HAVING COALESCE(SUM(s.quantity * p.buy_price), 0) > 0
      ORDER BY value DESC
    `;

    const categoryResult = await this.pool.query(
      categoryQuery,
      branch && branch !== 'all' ? [branch] : []
    );

    const totalValue = parseFloat(totalResult.rows[0].total_value);
    const categories = categoryResult.rows.map((cat: any) => ({
      id: cat.id.toString(),
      name: cat.name,
      itemCount: parseInt(cat.item_count),
      value: parseFloat(cat.value),
      percentage: totalValue > 0 ? (parseFloat(cat.value) / totalValue) * 100 : 0,
      trend: 'stable',
      trendPercentage: 0
    }));

    return {
      summary: {
        totalValue,
        previousTotalValue: totalValue * 0.93, // Mock previous value
        categories
      },
      period,
      branch,
      generatedAt: new Date().toISOString()
    };
  }

  // ============================================
  // STOCK MOVEMENT REPORT
  // ============================================
  async getStockMovementReport(params: {
    branch?: string;
    period?: string;
    dateFrom?: string;
    dateTo?: string;
    page?: number;
    limit?: number;
  }) {
    const { branch, dateFrom, dateTo, page = 1, limit = 10 } = params;
    const offset = (page - 1) * limit;

    let whereClause = 'WHERE 1=1';
    const queryParams: any[] = [];
    let paramIndex = 1;

    if (branch && branch !== 'all') {
      whereClause += ` AND sm.location_id = $${paramIndex}`;
      queryParams.push(branch);
      paramIndex++;
    }

    if (dateFrom) {
      whereClause += ` AND sm.created_at >= $${paramIndex}`;
      queryParams.push(dateFrom);
      paramIndex++;
    }

    if (dateTo) {
      whereClause += ` AND sm.created_at <= $${paramIndex}`;
      queryParams.push(dateTo);
      paramIndex++;
    }

    // Get movements
    const movementsQuery = `
      SELECT 
        sm.id,
        sm.created_at as date,
        sm.movement_type as type,
        sm.reference_number as reference,
        p.name as product_name,
        p.id as product_id,
        p.sku,
        sm.quantity,
        CASE 
          WHEN sm.movement_type = 'in' THEN 'From: ' || COALESCE(sm.notes, 'Stock In')
          WHEN sm.movement_type = 'out' THEN 'To: ' || COALESCE(sm.notes, 'Stock Out')
          ELSE COALESCE(sm.notes, 'Adjustment')
        END as from_to,
        sm.notes,
        sm.created_by as staff,
        sm.batch_number,
        sm.expiry_date
      FROM stock_movements sm
      JOIN products p ON sm.product_id = p.id
      ${whereClause}
      ORDER BY sm.created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;

    queryParams.push(limit, offset);

    // Get total count
    const countQuery = `
      SELECT COUNT(*) as total
      FROM stock_movements sm
      ${whereClause}
    `;

    const [movementsResult, countResult] = await Promise.all([
      this.pool.query(movementsQuery, queryParams.slice(0, -2).concat([limit, offset])),
      this.pool.query(countQuery, queryParams.slice(0, -2))
    ]);

    const total = parseInt(countResult.rows[0].total);

    return {
      movements: movementsResult.rows,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      },
      filters: { dateFrom, dateTo, period: params.period }
    };
  }

  // ============================================
  // LOW STOCK REPORT
  // ============================================
  async getLowStockReport(params: { branch?: string }) {
    const { branch } = params;

    const query = `
      SELECT 
        p.id,
        p.name as product_name,
        p.sku,
        c.name as category_name,
        COALESCE(s.quantity, 0) as current_stock,
        p.minimum_stock as min_stock,
        p.maximum_stock as max_stock,
        p.reorder_point,
        p.buy_price as price,
        sup.name as supplier,
        l.name as location,
        (
          SELECT MAX(sm.created_at)
          FROM stock_movements sm
          WHERE sm.product_id = p.id AND sm.movement_type = 'in'
        ) as last_restock_date,
        CASE 
          WHEN COALESCE(s.quantity, 0) = 0 THEN 'out_of_stock'
          WHEN COALESCE(s.quantity, 0) < (p.minimum_stock * 0.5) THEN 'critical'
          WHEN COALESCE(s.quantity, 0) < p.minimum_stock THEN 'warning'
          ELSE 'normal'
        END as status
      FROM products p
      LEFT JOIN inventory_stock s ON p.id = s.product_id
        ${branch && branch !== 'all' ? 'AND s.location_id = $1' : ''}
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN suppliers sup ON p.supplier_id = sup.id
      LEFT JOIN locations l ON s.location_id = l.id
      WHERE p.is_active = true
        AND (
          COALESCE(s.quantity, 0) < p.minimum_stock 
          OR COALESCE(s.quantity, 0) < p.reorder_point
        )
      ORDER BY 
        CASE status
          WHEN 'out_of_stock' THEN 1
          WHEN 'critical' THEN 2
          WHEN 'warning' THEN 3
          ELSE 4
        END,
        (COALESCE(s.quantity, 0) / NULLIF(p.minimum_stock, 0)) ASC
    `;

    const result = await this.pool.query(
      query,
      branch && branch !== 'all' ? [branch] : []
    );

    const products = result.rows;
    const criticalCount = products.filter((p: any) => p.status === 'critical' || p.status === 'out_of_stock').length;
    const warningCount = products.filter((p: any) => p.status === 'warning').length;
    const totalValue = products.reduce((sum: number, p: any) => sum + (p.current_stock * p.price), 0);

    return {
      products,
      summary: {
        totalLowStock: products.length,
        criticalCount,
        warningCount,
        totalValue
      }
    };
  }

  // ============================================
  // PRODUCT ANALYSIS REPORT
  // ============================================
  async getProductAnalysisReport(params: {
    branch?: string;
    period?: string;
  }) {
    const { branch, period } = params;

    // Determine date range based on period
    let dateFilter = '';
    if (period === 'today') {
      dateFilter = "AND DATE(sm.created_at) = CURRENT_DATE";
    } else if (period === 'week') {
      dateFilter = "AND sm.created_at >= CURRENT_DATE - INTERVAL '7 days'";
    } else if (period === 'month') {
      dateFilter = "AND sm.created_at >= CURRENT_DATE - INTERVAL '30 days'";
    } else if (period === 'year') {
      dateFilter = "AND sm.created_at >= CURRENT_DATE - INTERVAL '365 days'";
    } else {
      dateFilter = "AND sm.created_at >= CURRENT_DATE - INTERVAL '30 days'"; // Default to 30 days
    }

    // Top Selling Products (based on stock OUT movements)
    const topSellingQuery = `
      SELECT 
        p.id,
        p.name as product_name,
        p.sku,
        COUNT(DISTINCT sm.id) as total_transactions,
        SUM(ABS(sm.quantity)) as total_sold,
        SUM(ABS(sm.quantity) * p.sell_price) as revenue,
        SUM(ABS(sm.quantity) * (p.sell_price - p.buy_price)) as profit,
        CASE 
          WHEN SUM(ABS(sm.quantity) * p.sell_price) > 0 
          THEN ((SUM(ABS(sm.quantity) * (p.sell_price - p.buy_price)) / SUM(ABS(sm.quantity) * p.sell_price)) * 100)
          ELSE 0
        END as profit_margin,
        'stable' as trend
      FROM products p
      JOIN stock_movements sm ON p.id = sm.product_id
      WHERE sm.movement_type = 'out'
        AND sm.reference_type IN ('sale', 'transfer_out')
        ${dateFilter}
        ${branch && branch !== 'all' ? 'AND sm.location_id = $1' : ''}
      GROUP BY p.id, p.name, p.sku, p.sell_price, p.buy_price
      HAVING SUM(ABS(sm.quantity)) > 0
      ORDER BY total_sold DESC
      LIMIT 10
    `;

    // Slow Moving Products
    const slowMovingQuery = `
      SELECT 
        p.id,
        p.name as product_name,
        p.sku,
        COALESCE(s.quantity, 0) as current_stock,
        MAX(sm.created_at) as last_sale_date,
        CASE 
          WHEN MAX(sm.created_at) IS NULL THEN 999
          ELSE EXTRACT(DAY FROM (CURRENT_TIMESTAMP - MAX(sm.created_at)))
        END as days_since_last_sale,
        (COALESCE(s.quantity, 0) * p.buy_price) as value,
        CASE 
          WHEN MAX(sm.created_at) IS NULL THEN 'Never sold - consider removing'
          WHEN EXTRACT(DAY FROM (CURRENT_TIMESTAMP - MAX(sm.created_at))) > 90 THEN 'Very slow - consider discount'
          WHEN EXTRACT(DAY FROM (CURRENT_TIMESTAMP - MAX(sm.created_at))) > 60 THEN 'Slow moving - monitor closely'
          ELSE 'Normal'
        END as recommendation
      FROM products p
      LEFT JOIN inventory_stock s ON p.id = s.product_id
        ${branch && branch !== 'all' ? 'AND s.location_id = $1' : ''}
      LEFT JOIN stock_movements sm ON p.id = sm.product_id 
        AND sm.movement_type = 'out'
        AND sm.reference_type IN ('sale', 'transfer_out')
      WHERE p.is_active = true
        AND COALESCE(s.quantity, 0) > 0
      GROUP BY p.id, p.name, p.sku, s.quantity, p.buy_price
      HAVING 
        MAX(sm.created_at) IS NULL 
        OR EXTRACT(DAY FROM (CURRENT_TIMESTAMP - MAX(sm.created_at))) > 60
      ORDER BY days_since_last_sale DESC
      LIMIT 10
    `;

    const [topSellingResult, slowMovingResult] = await Promise.all([
      this.pool.query(topSellingQuery, branch && branch !== 'all' ? [branch] : []),
      this.pool.query(slowMovingQuery, branch && branch !== 'all' ? [branch] : [])
    ]);

    return {
      topSellingProducts: topSellingResult.rows.map((row: any) => ({
        id: row.id.toString(),
        productName: row.product_name,
        sku: row.sku,
        totalSold: parseFloat(row.total_sold),
        revenue: parseFloat(row.revenue),
        profit: parseFloat(row.profit),
        profitMargin: parseFloat(row.profit_margin),
        trend: row.trend
      })),
      slowMovingProducts: slowMovingResult.rows.map((row: any) => ({
        id: row.id.toString(),
        productName: row.product_name,
        sku: row.sku,
        currentStock: parseFloat(row.current_stock),
        lastSaleDate: row.last_sale_date ? new Date(row.last_sale_date).toISOString().split('T')[0] : 'Never',
        daysSinceLastSale: parseInt(row.days_since_last_sale),
        value: parseFloat(row.value),
        recommendation: row.recommendation
      }))
    };
  }
}

export default InventoryReportsQueries;
