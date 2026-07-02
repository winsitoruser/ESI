import { Pool } from 'pg';

export class POSReportsQueries {
  private pool: Pool;

  constructor(pool: Pool) {
    this.pool = pool;
  }

  // ============================================
  // SALES SUMMARY REPORT
  // ============================================
  async getSalesSummaryReport(params: {
    dateFrom?: string;
    dateTo?: string;
    period?: string;
    cashierId?: string;
  }) {
    const { dateFrom, dateTo, period, cashierId } = params;

    // Determine date range based on period
    let dateFilter = '';
    const queryParams: any[] = [];
    let paramIndex = 1;

    if (dateFrom && dateTo) {
      dateFilter = `AND t.transaction_date >= $${paramIndex} AND t.transaction_date <= $${paramIndex + 1}`;
      queryParams.push(dateFrom, dateTo);
      paramIndex += 2;
    } else if (period) {
      switch (period) {
        case 'today':
          dateFilter = "AND DATE(t.transaction_date) = CURRENT_DATE";
          break;
        case 'week':
          dateFilter = "AND t.transaction_date >= CURRENT_DATE - INTERVAL '7 days'";
          break;
        case 'month':
          dateFilter = "AND t.transaction_date >= CURRENT_DATE - INTERVAL '30 days'";
          break;
        case 'year':
          dateFilter = "AND t.transaction_date >= CURRENT_DATE - INTERVAL '365 days'";
          break;
      }
    }

    if (cashierId) {
      dateFilter += ` AND t.cashier_id = $${paramIndex}`;
      queryParams.push(cashierId);
      paramIndex++;
    }

    // Get sales summary
    const summaryQuery = `
      SELECT 
        COUNT(DISTINCT t.id) as total_transactions,
        COALESCE(SUM(t.total_amount), 0) as total_sales,
        COALESCE(SUM(t.total_amount - t.discount_amount), 0) as net_sales,
        COALESCE(AVG(t.total_amount), 0) as average_transaction,
        COALESCE(SUM(ti.quantity), 0) as total_items_sold,
        COALESCE(SUM(ti.quantity * (ti.price - p.buy_price)), 0) as total_profit
      FROM pos_transactions t
      LEFT JOIN pos_transaction_items ti ON t.id = ti.transaction_id
      LEFT JOIN products p ON ti.product_id = p.id
      WHERE t.status = 'completed'
        ${dateFilter}
    `;

    const summaryResult = await this.pool.query(summaryQuery, queryParams);

    // Get sales by time period (hourly breakdown)
    const timeBreakdownQuery = `
      SELECT 
        EXTRACT(HOUR FROM t.transaction_date) as hour,
        COUNT(DISTINCT t.id) as transactions,
        COALESCE(SUM(t.total_amount), 0) as sales
      FROM pos_transactions t
      WHERE t.status = 'completed'
        ${dateFilter}
      GROUP BY hour
      ORDER BY hour
    `;

    const timeBreakdownResult = await this.pool.query(timeBreakdownQuery, queryParams);

    // Get payment method breakdown
    const paymentBreakdownQuery = `
      SELECT 
        pm.name as payment_method,
        COUNT(DISTINCT t.id) as transactions,
        COALESCE(SUM(t.total_amount), 0) as total_amount
      FROM pos_transactions t
      LEFT JOIN payment_methods pm ON t.payment_method_id = pm.id
      WHERE t.status = 'completed'
        ${dateFilter}
      GROUP BY pm.name
      ORDER BY total_amount DESC
    `;

    const paymentBreakdownResult = await this.pool.query(paymentBreakdownQuery, queryParams);

    return {
      summary: {
        totalTransactions: parseInt(summaryResult.rows[0]?.total_transactions || 0),
        totalSales: parseFloat(summaryResult.rows[0]?.total_sales || 0),
        netSales: parseFloat(summaryResult.rows[0]?.net_sales || 0),
        averageTransaction: parseFloat(summaryResult.rows[0]?.average_transaction || 0),
        totalItemsSold: parseInt(summaryResult.rows[0]?.total_items_sold || 0),
        totalProfit: parseFloat(summaryResult.rows[0]?.total_profit || 0)
      },
      timeBreakdown: timeBreakdownResult.rows.map((row: any) => ({
        period: `${String(row.hour).padStart(2, '0')}:00 - ${String(row.hour + 1).padStart(2, '0')}:00`,
        transactions: parseInt(row.transactions),
        sales: parseFloat(row.sales)
      })),
      paymentBreakdown: paymentBreakdownResult.rows.map((row: any) => ({
        paymentMethod: row.payment_method,
        transactions: parseInt(row.transactions),
        totalAmount: parseFloat(row.total_amount)
      }))
    };
  }

  // ============================================
  // TOP PRODUCTS REPORT
  // ============================================
  async getTopProductsReport(params: {
    dateFrom?: string;
    dateTo?: string;
    period?: string;
    limit?: number;
  }) {
    const { dateFrom, dateTo, period, limit = 10 } = params;

    let dateFilter = '';
    const queryParams: any[] = [];
    let paramIndex = 1;

    if (dateFrom && dateTo) {
      dateFilter = `AND t.transaction_date >= $${paramIndex} AND t.transaction_date <= $${paramIndex + 1}`;
      queryParams.push(dateFrom, dateTo);
      paramIndex += 2;
    } else if (period) {
      switch (period) {
        case 'today':
          dateFilter = "AND DATE(t.transaction_date) = CURRENT_DATE";
          break;
        case 'week':
          dateFilter = "AND t.transaction_date >= CURRENT_DATE - INTERVAL '7 days'";
          break;
        case 'month':
          dateFilter = "AND t.transaction_date >= CURRENT_DATE - INTERVAL '30 days'";
          break;
      }
    }

    const query = `
      SELECT 
        p.id,
        p.name as product_name,
        p.sku,
        c.name as category_name,
        SUM(ti.quantity) as total_sold,
        SUM(ti.quantity * ti.price) as revenue,
        SUM(ti.quantity * (ti.price - p.buy_price)) as profit,
        CASE 
          WHEN SUM(ti.quantity * ti.price) > 0 
          THEN ((SUM(ti.quantity * (ti.price - p.buy_price)) / SUM(ti.quantity * ti.price)) * 100)
          ELSE 0
        END as profit_margin,
        COUNT(DISTINCT t.id) as transaction_count
      FROM pos_transaction_items ti
      JOIN pos_transactions t ON ti.transaction_id = t.id
      JOIN products p ON ti.product_id = p.id
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE t.status = 'completed'
        ${dateFilter}
      GROUP BY p.id, p.name, p.sku, c.name, p.buy_price
      ORDER BY total_sold DESC
      LIMIT $${paramIndex}
    `;

    queryParams.push(limit);

    const result = await this.pool.query(query, queryParams);

    return result.rows.map((row: any, index: number) => ({
      rank: index + 1,
      id: row.id.toString(),
      productName: row.product_name,
      sku: row.sku,
      categoryName: row.category_name,
      totalSold: parseInt(row.total_sold),
      revenue: parseFloat(row.revenue),
      profit: parseFloat(row.profit),
      profitMargin: parseFloat(row.profit_margin),
      transactionCount: parseInt(row.transaction_count)
    }));
  }

  // ============================================
  // CASHIER PERFORMANCE REPORT
  // ============================================
  async getCashierPerformanceReport(params: {
    dateFrom?: string;
    dateTo?: string;
    period?: string;
  }) {
    const { dateFrom, dateTo, period } = params;

    let dateFilter = '';
    const queryParams: any[] = [];
    let paramIndex = 1;

    if (dateFrom && dateTo) {
      dateFilter = `AND t.transaction_date >= $${paramIndex} AND t.transaction_date <= $${paramIndex + 1}`;
      queryParams.push(dateFrom, dateTo);
      paramIndex += 2;
    } else if (period) {
      switch (period) {
        case 'today':
          dateFilter = "AND DATE(t.transaction_date) = CURRENT_DATE";
          break;
        case 'week':
          dateFilter = "AND t.transaction_date >= CURRENT_DATE - INTERVAL '7 days'";
          break;
        case 'month':
          dateFilter = "AND t.transaction_date >= CURRENT_DATE - INTERVAL '30 days'";
          break;
      }
    }

    const query = `
      SELECT 
        u.id as cashier_id,
        u.name as cashier_name,
        COUNT(DISTINCT t.id) as total_transactions,
        COALESCE(SUM(t.total_amount), 0) as total_sales,
        COALESCE(AVG(t.total_amount), 0) as average_transaction,
        COALESCE(SUM(ti.quantity), 0) as total_items_sold,
        MIN(t.transaction_date) as first_transaction,
        MAX(t.transaction_date) as last_transaction
      FROM pos_transactions t
      JOIN users u ON t.cashier_id = u.id
      LEFT JOIN pos_transaction_items ti ON t.id = ti.transaction_id
      WHERE t.status = 'completed'
        ${dateFilter}
      GROUP BY u.id, u.name
      ORDER BY total_sales DESC
    `;

    const result = await this.pool.query(query, queryParams);

    return result.rows.map((row: any) => ({
      cashierId: row.cashier_id.toString(),
      cashierName: row.cashier_name,
      totalTransactions: parseInt(row.total_transactions),
      totalSales: parseFloat(row.total_sales),
      averageTransaction: parseFloat(row.average_transaction),
      totalItemsSold: parseInt(row.total_items_sold),
      firstTransaction: row.first_transaction,
      lastTransaction: row.last_transaction
    }));
  }

  // ============================================
  // DAILY SALES TREND REPORT
  // ============================================
  async getDailySalesTrendReport(params: {
    dateFrom?: string;
    dateTo?: string;
    period?: string;
  }) {
    const { dateFrom, dateTo, period } = params;

    let dateFilter = '';
    const queryParams: any[] = [];
    let paramIndex = 1;

    if (dateFrom && dateTo) {
      dateFilter = `AND t.transaction_date >= $${paramIndex} AND t.transaction_date <= $${paramIndex + 1}`;
      queryParams.push(dateFrom, dateTo);
      paramIndex += 2;
    } else if (period) {
      switch (period) {
        case 'week':
          dateFilter = "AND t.transaction_date >= CURRENT_DATE - INTERVAL '7 days'";
          break;
        case 'month':
          dateFilter = "AND t.transaction_date >= CURRENT_DATE - INTERVAL '30 days'";
          break;
        case 'year':
          dateFilter = "AND t.transaction_date >= CURRENT_DATE - INTERVAL '365 days'";
          break;
        default:
          dateFilter = "AND t.transaction_date >= CURRENT_DATE - INTERVAL '30 days'";
      }
    }

    const query = `
      SELECT 
        DATE(t.transaction_date) as date,
        COUNT(DISTINCT t.id) as transactions,
        COALESCE(SUM(t.total_amount), 0) as sales,
        COALESCE(SUM(ti.quantity), 0) as items_sold,
        COALESCE(AVG(t.total_amount), 0) as average_transaction
      FROM pos_transactions t
      LEFT JOIN pos_transaction_items ti ON t.id = ti.transaction_id
      WHERE t.status = 'completed'
        ${dateFilter}
      GROUP BY DATE(t.transaction_date)
      ORDER BY date DESC
    `;

    const result = await this.pool.query(query, queryParams);

    return result.rows.map((row: any) => ({
      date: row.date,
      transactions: parseInt(row.transactions),
      sales: parseFloat(row.sales),
      itemsSold: parseInt(row.items_sold),
      averageTransaction: parseFloat(row.average_transaction)
    }));
  }

  // ============================================
  // CATEGORY SALES REPORT
  // ============================================
  async getCategorySalesReport(params: {
    dateFrom?: string;
    dateTo?: string;
    period?: string;
  }) {
    const { dateFrom, dateTo, period } = params;

    let dateFilter = '';
    const queryParams: any[] = [];
    let paramIndex = 1;

    if (dateFrom && dateTo) {
      dateFilter = `AND t.transaction_date >= $${paramIndex} AND t.transaction_date <= $${paramIndex + 1}`;
      queryParams.push(dateFrom, dateTo);
      paramIndex += 2;
    } else if (period) {
      switch (period) {
        case 'today':
          dateFilter = "AND DATE(t.transaction_date) = CURRENT_DATE";
          break;
        case 'week':
          dateFilter = "AND t.transaction_date >= CURRENT_DATE - INTERVAL '7 days'";
          break;
        case 'month':
          dateFilter = "AND t.transaction_date >= CURRENT_DATE - INTERVAL '30 days'";
          break;
      }
    }

    const query = `
      SELECT 
        c.id,
        c.name as category_name,
        COUNT(DISTINCT ti.product_id) as product_count,
        SUM(ti.quantity) as total_sold,
        SUM(ti.quantity * ti.price) as revenue,
        COUNT(DISTINCT t.id) as transaction_count
      FROM pos_transaction_items ti
      JOIN pos_transactions t ON ti.transaction_id = t.id
      JOIN products p ON ti.product_id = p.id
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE t.status = 'completed'
        ${dateFilter}
      GROUP BY c.id, c.name
      ORDER BY revenue DESC
    `;

    const result = await this.pool.query(query, queryParams);

    const totalRevenue = result.rows.reduce((sum: number, row: any) => sum + parseFloat(row.revenue), 0);

    return result.rows.map((row: any) => ({
      id: row.id?.toString() || 'uncategorized',
      categoryName: row.category_name || 'Uncategorized',
      productCount: parseInt(row.product_count),
      totalSold: parseInt(row.total_sold),
      revenue: parseFloat(row.revenue),
      percentage: totalRevenue > 0 ? (parseFloat(row.revenue) / totalRevenue) * 100 : 0,
      transactionCount: parseInt(row.transaction_count)
    }));
  }
}

export default POSReportsQueries;
