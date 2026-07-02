import { Pool } from 'pg';

export class CustomerReportsQueries {
  private pool: Pool;

  constructor(pool: Pool) {
    this.pool = pool;
  }

  // ============================================
  // CUSTOMER OVERVIEW REPORT
  // ============================================
  async getCustomerOverviewReport(params: {
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
        case 'year':
          dateFilter = "AND t.transaction_date >= CURRENT_DATE - INTERVAL '365 days'";
          break;
      }
    }

    // Total customers
    const totalCustomersQuery = `
      SELECT COUNT(DISTINCT id) as total_customers
      FROM customers
      WHERE is_active = true
    `;

    // New customers in period
    const newCustomersQuery = `
      SELECT COUNT(DISTINCT id) as new_customers
      FROM customers
      WHERE is_active = true
        ${dateFilter.replace('t.transaction_date', 'created_at')}
    `;

    // Active customers (made purchase in period)
    const activeCustomersQuery = `
      SELECT COUNT(DISTINCT t.customer_id) as active_customers
      FROM pos_transactions t
      WHERE t.status = 'completed'
        AND t.customer_id IS NOT NULL
        ${dateFilter}
    `;

    // Total revenue from customers
    const revenueQuery = `
      SELECT 
        COALESCE(SUM(t.total_amount), 0) as total_revenue,
        COALESCE(AVG(t.total_amount), 0) as average_transaction,
        COUNT(t.id) as total_transactions
      FROM pos_transactions t
      WHERE t.status = 'completed'
        AND t.customer_id IS NOT NULL
        ${dateFilter}
    `;

    const [totalResult, newResult, activeResult, revenueResult] = await Promise.all([
      this.pool.query(totalCustomersQuery),
      this.pool.query(newCustomersQuery, queryParams),
      this.pool.query(activeCustomersQuery, queryParams),
      this.pool.query(revenueQuery, queryParams)
    ]);

    const totalCustomers = parseInt(totalResult.rows[0]?.total_customers || 0);
    const activeCustomers = parseInt(activeResult.rows[0]?.active_customers || 0);

    return {
      summary: {
        totalCustomers,
        newCustomers: parseInt(newResult.rows[0]?.new_customers || 0),
        activeCustomers,
        inactiveCustomers: totalCustomers - activeCustomers,
        totalRevenue: parseFloat(revenueResult.rows[0]?.total_revenue || 0),
        averageTransaction: parseFloat(revenueResult.rows[0]?.average_transaction || 0),
        totalTransactions: parseInt(revenueResult.rows[0]?.total_transactions || 0)
      }
    };
  }

  // ============================================
  // TOP CUSTOMERS REPORT
  // ============================================
  async getTopCustomersReport(params: {
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
        case 'year':
          dateFilter = "AND t.transaction_date >= CURRENT_DATE - INTERVAL '365 days'";
          break;
      }
    }

    const query = `
      SELECT 
        c.id,
        c.name as customer_name,
        c.email,
        c.phone,
        c.customer_type,
        COUNT(t.id) as total_transactions,
        COALESCE(SUM(t.total_amount), 0) as total_spent,
        COALESCE(AVG(t.total_amount), 0) as average_transaction,
        MAX(t.transaction_date) as last_purchase_date,
        COALESCE(SUM(ti.quantity), 0) as total_items_purchased
      FROM customers c
      LEFT JOIN pos_transactions t ON c.id = t.customer_id 
        AND t.status = 'completed'
        ${dateFilter}
      LEFT JOIN pos_transaction_items ti ON t.id = ti.transaction_id
      WHERE c.is_active = true
      GROUP BY c.id, c.name, c.email, c.phone, c.customer_type
      HAVING COUNT(t.id) > 0
      ORDER BY total_spent DESC
      LIMIT $${paramIndex}
    `;

    queryParams.push(limit);
    const result = await this.pool.query(query, queryParams);

    return result.rows.map((row: any, index: number) => ({
      rank: index + 1,
      id: row.id.toString(),
      customerName: row.customer_name,
      email: row.email,
      phone: row.phone,
      customerType: row.customer_type,
      totalTransactions: parseInt(row.total_transactions),
      totalSpent: parseFloat(row.total_spent),
      averageTransaction: parseFloat(row.average_transaction),
      lastPurchaseDate: row.last_purchase_date,
      totalItemsPurchased: parseInt(row.total_items_purchased)
    }));
  }

  // ============================================
  // CUSTOMER SEGMENTATION REPORT
  // ============================================
  async getCustomerSegmentationReport(params: {
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
        case 'month':
          dateFilter = "AND t.transaction_date >= CURRENT_DATE - INTERVAL '30 days'";
          break;
        case 'year':
          dateFilter = "AND t.transaction_date >= CURRENT_DATE - INTERVAL '365 days'";
          break;
      }
    }

    // Segmentation by customer type
    const typeSegmentationQuery = `
      SELECT 
        c.customer_type,
        COUNT(DISTINCT c.id) as customer_count,
        COALESCE(SUM(t.total_amount), 0) as total_revenue,
        COALESCE(AVG(t.total_amount), 0) as average_transaction,
        COUNT(t.id) as transaction_count
      FROM customers c
      LEFT JOIN pos_transactions t ON c.id = t.customer_id 
        AND t.status = 'completed'
        ${dateFilter}
      WHERE c.is_active = true
      GROUP BY c.customer_type
      ORDER BY total_revenue DESC
    `;

    // Segmentation by spending level (RFM-like)
    const spendingSegmentationQuery = `
      WITH customer_spending AS (
        SELECT 
          c.id,
          c.name,
          COALESCE(SUM(t.total_amount), 0) as total_spent,
          COUNT(t.id) as transaction_count,
          MAX(t.transaction_date) as last_purchase
        FROM customers c
        LEFT JOIN pos_transactions t ON c.id = t.customer_id 
          AND t.status = 'completed'
          ${dateFilter}
        WHERE c.is_active = true
        GROUP BY c.id, c.name
      )
      SELECT 
        CASE 
          WHEN total_spent >= 5000000 THEN 'VIP'
          WHEN total_spent >= 2000000 THEN 'Premium'
          WHEN total_spent >= 500000 THEN 'Regular'
          WHEN total_spent > 0 THEN 'New'
          ELSE 'Inactive'
        END as segment,
        COUNT(*) as customer_count,
        COALESCE(SUM(total_spent), 0) as total_revenue,
        COALESCE(AVG(total_spent), 0) as average_spent
      FROM customer_spending
      GROUP BY segment
      ORDER BY 
        CASE segment
          WHEN 'VIP' THEN 1
          WHEN 'Premium' THEN 2
          WHEN 'Regular' THEN 3
          WHEN 'New' THEN 4
          ELSE 5
        END
    `;

    const [typeResult, spendingResult] = await Promise.all([
      this.pool.query(typeSegmentationQuery, queryParams),
      this.pool.query(spendingSegmentationQuery, queryParams)
    ]);

    const totalRevenue = typeResult.rows.reduce((sum: number, row: any) => 
      sum + parseFloat(row.total_revenue), 0
    );

    return {
      byType: typeResult.rows.map((row: any) => ({
        customerType: row.customer_type || 'Unknown',
        customerCount: parseInt(row.customer_count),
        totalRevenue: parseFloat(row.total_revenue),
        averageTransaction: parseFloat(row.average_transaction),
        transactionCount: parseInt(row.transaction_count),
        revenuePercentage: totalRevenue > 0 ? (parseFloat(row.total_revenue) / totalRevenue) * 100 : 0
      })),
      bySpending: spendingResult.rows.map((row: any) => ({
        segment: row.segment,
        customerCount: parseInt(row.customer_count),
        totalRevenue: parseFloat(row.total_revenue),
        averageSpent: parseFloat(row.average_spent),
        revenuePercentage: totalRevenue > 0 ? (parseFloat(row.total_revenue) / totalRevenue) * 100 : 0
      }))
    };
  }

  // ============================================
  // CUSTOMER RETENTION REPORT
  // ============================================
  async getCustomerRetentionReport(params: {
    months?: number;
  }) {
    const { months = 6 } = params;

    // Monthly retention analysis
    const retentionQuery = `
      WITH monthly_customers AS (
        SELECT 
          TO_CHAR(t.transaction_date, 'YYYY-MM') as month,
          TO_CHAR(t.transaction_date, 'Mon YYYY') as month_label,
          COUNT(DISTINCT t.customer_id) as active_customers,
          COUNT(DISTINCT CASE 
            WHEN c.created_at >= DATE_TRUNC('month', t.transaction_date) 
            THEN t.customer_id 
          END) as new_customers
        FROM pos_transactions t
        JOIN customers c ON t.customer_id = c.id
        WHERE t.status = 'completed'
          AND t.customer_id IS NOT NULL
          AND t.transaction_date >= CURRENT_DATE - INTERVAL '${months} months'
        GROUP BY TO_CHAR(t.transaction_date, 'YYYY-MM'), TO_CHAR(t.transaction_date, 'Mon YYYY')
        ORDER BY month ASC
      )
      SELECT 
        month,
        month_label,
        active_customers,
        new_customers,
        active_customers - new_customers as returning_customers
      FROM monthly_customers
    `;

    // Churn analysis (customers who haven't purchased in 60 days)
    const churnQuery = `
      SELECT 
        COUNT(DISTINCT c.id) as at_risk_customers
      FROM customers c
      LEFT JOIN pos_transactions t ON c.id = t.customer_id 
        AND t.status = 'completed'
      WHERE c.is_active = true
      GROUP BY c.id
      HAVING MAX(t.transaction_date) < CURRENT_DATE - INTERVAL '60 days'
        OR MAX(t.transaction_date) IS NULL
    `;

    const [retentionResult, churnResult] = await Promise.all([
      this.pool.query(retentionQuery),
      this.pool.query(churnQuery)
    ]);

    return {
      monthlyRetention: retentionResult.rows.map((row: any) => ({
        month: row.month,
        monthLabel: row.month_label,
        activeCustomers: parseInt(row.active_customers),
        newCustomers: parseInt(row.new_customers),
        returningCustomers: parseInt(row.returning_customers),
        retentionRate: parseInt(row.active_customers) > 0 
          ? (parseInt(row.returning_customers) / parseInt(row.active_customers)) * 100 
          : 0
      })),
      churnAnalysis: {
        atRiskCustomers: parseInt(churnResult.rows[0]?.at_risk_customers || 0)
      }
    };
  }

  // ============================================
  // CUSTOMER PURCHASE BEHAVIOR REPORT
  // ============================================
  async getCustomerPurchaseBehaviorReport(params: {
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
        case 'month':
          dateFilter = "AND t.transaction_date >= CURRENT_DATE - INTERVAL '30 days'";
          break;
        case 'year':
          dateFilter = "AND t.transaction_date >= CURRENT_DATE - INTERVAL '365 days'";
          break;
      }
    }

    // Purchase frequency distribution
    const frequencyQuery = `
      WITH customer_frequency AS (
        SELECT 
          c.id,
          COUNT(t.id) as purchase_count
        FROM customers c
        LEFT JOIN pos_transactions t ON c.id = t.customer_id 
          AND t.status = 'completed'
          ${dateFilter}
        WHERE c.is_active = true
        GROUP BY c.id
      )
      SELECT 
        CASE 
          WHEN purchase_count = 0 THEN 'Never'
          WHEN purchase_count = 1 THEN 'Once'
          WHEN purchase_count BETWEEN 2 AND 5 THEN '2-5 times'
          WHEN purchase_count BETWEEN 6 AND 10 THEN '6-10 times'
          ELSE 'More than 10'
        END as frequency_range,
        COUNT(*) as customer_count
      FROM customer_frequency
      GROUP BY frequency_range
      ORDER BY 
        CASE frequency_range
          WHEN 'More than 10' THEN 1
          WHEN '6-10 times' THEN 2
          WHEN '2-5 times' THEN 3
          WHEN 'Once' THEN 4
          ELSE 5
        END
    `;

    // Average basket size
    const basketQuery = `
      SELECT 
        COALESCE(AVG(ti.quantity), 0) as avg_items_per_transaction,
        COALESCE(AVG(t.total_amount), 0) as avg_transaction_value,
        MAX(t.total_amount) as max_transaction_value,
        MIN(t.total_amount) as min_transaction_value
      FROM pos_transactions t
      LEFT JOIN pos_transaction_items ti ON t.id = ti.transaction_id
      WHERE t.status = 'completed'
        AND t.customer_id IS NOT NULL
        ${dateFilter}
    `;

    // Popular purchase times
    const timeQuery = `
      SELECT 
        EXTRACT(HOUR FROM t.transaction_date) as hour,
        COUNT(t.id) as transaction_count,
        COUNT(DISTINCT t.customer_id) as unique_customers
      FROM pos_transactions t
      WHERE t.status = 'completed'
        AND t.customer_id IS NOT NULL
        ${dateFilter}
      GROUP BY EXTRACT(HOUR FROM t.transaction_date)
      ORDER BY hour ASC
    `;

    const [frequencyResult, basketResult, timeResult] = await Promise.all([
      this.pool.query(frequencyQuery, queryParams),
      this.pool.query(basketQuery, queryParams),
      this.pool.query(timeQuery, queryParams)
    ]);

    return {
      purchaseFrequency: frequencyResult.rows.map((row: any) => ({
        frequencyRange: row.frequency_range,
        customerCount: parseInt(row.customer_count)
      })),
      basketAnalysis: {
        avgItemsPerTransaction: parseFloat(basketResult.rows[0]?.avg_items_per_transaction || 0),
        avgTransactionValue: parseFloat(basketResult.rows[0]?.avg_transaction_value || 0),
        maxTransactionValue: parseFloat(basketResult.rows[0]?.max_transaction_value || 0),
        minTransactionValue: parseFloat(basketResult.rows[0]?.min_transaction_value || 0)
      },
      purchaseTimeDistribution: timeResult.rows.map((row: any) => ({
        hour: parseInt(row.hour),
        transactionCount: parseInt(row.transaction_count),
        uniqueCustomers: parseInt(row.unique_customers)
      }))
    };
  }
}

export default CustomerReportsQueries;
