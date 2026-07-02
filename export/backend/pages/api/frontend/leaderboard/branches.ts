import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../auth/[...nextauth]';
import { sequelize } from '@/lib/sequelizeClient';
import { QueryTypes } from 'sequelize';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    const session = await getServerSession(req, res, authOptions);

    if (!session || !session.user) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    if (req.method === 'GET') {
      const {
        period = 'today',
        metric = 'sales',
        view = 'leaderboard' // leaderboard, comparison, trends
      } = req.query;

      // Determine date range
      let dateFilter = '';
      let dateGrouping = '';
      
      switch (period) {
        case 'today':
          dateFilter = 'AND DATE(pt.transaction_date) = CURRENT_DATE';
          dateGrouping = 'DATE_TRUNC(\'hour\', pt.transaction_date)';
          break;
        case 'yesterday':
          dateFilter = 'AND DATE(pt.transaction_date) = CURRENT_DATE - INTERVAL \'1 day\'';
          dateGrouping = 'DATE_TRUNC(\'hour\', pt.transaction_date)';
          break;
        case 'week':
          dateFilter = 'AND DATE(pt.transaction_date) >= DATE_TRUNC(\'week\', CURRENT_DATE)';
          dateGrouping = 'DATE_TRUNC(\'day\', pt.transaction_date)';
          break;
        case 'month':
          dateFilter = 'AND DATE(pt.transaction_date) >= DATE_TRUNC(\'month\', CURRENT_DATE)';
          dateGrouping = 'DATE_TRUNC(\'day\', pt.transaction_date)';
          break;
      }

      let data;

      switch (view) {
        case 'leaderboard':
          data = await getLeaderboard(
            session.user.tenantId,
            dateFilter,
            metric as string
          );
          break;

        case 'comparison':
          data = await getComparison(
            session.user.tenantId,
            dateFilter,
            metric as string
          );
          break;

        case 'trends':
          data = await getTrends(
            session.user.tenantId,
            dateFilter,
            dateGrouping,
            metric as string
          );
          break;

        default:
          return res.status(400).json({
            success: false,
            error: 'Invalid view',
            validViews: ['leaderboard', 'comparison', 'trends']
          });
      }

      return res.status(200).json({
        success: true,
        data: {
          ...data,
          metadata: {
            period,
            metric,
            view,
            generatedAt: new Date().toISOString()
          }
        }
      });

    } else {
      return res.status(405).json({ 
        success: false, 
        error: 'Method not allowed' 
      });
    }

  } catch (error: any) {
    console.error('Branch performance leaderboard API error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message
    });
  }
}

// Get leaderboard view
async function getLeaderboard(tenantId: string, dateFilter: string, metric: string) {
  const { sequelize } = await import('@/lib/sequelizeClient');
  const { QueryTypes } = require('sequelize');

  let query = '';
  let orderClause = '';

  switch (metric) {
    case 'sales':
      query = `
        SELECT 
          b.id,
          b.name,
          b.code,
          b.city,
          b.region,
          COUNT(pt.id) as transaction_count,
          COALESCE(SUM(pt.total), 0) as total_sales,
          COALESCE(SUM(pt.subtotal), 0) as net_sales,
          COALESCE(AVG(pt.total), 0) as avg_transaction,
          COUNT(DISTINCT pt.customer_id) as unique_customers,
          ROW_NUMBER() OVER (ORDER BY COALESCE(SUM(pt.total), 0) DESC) as rank
        FROM branches b
        LEFT JOIN pos_transactions pt ON b.id = pt.branch_id
          AND pt.status = 'closed'
          ${dateFilter}
        WHERE b.tenant_id = :tenantId
        AND b.is_active = true
        GROUP BY b.id, b.name, b.code, b.city, b.region
        HAVING COUNT(pt.id) > 0
      `;
      orderClause = 'ORDER BY total_sales DESC';
      break;

    case 'transactions':
      query = `
        SELECT 
          b.id,
          b.name,
          b.code,
          b.city,
          b.region,
          COUNT(pt.id) as transaction_count,
          COALESCE(SUM(pt.total), 0) as total_sales,
          COALESCE(AVG(pt.total), 0) as avg_transaction,
          COUNT(DISTINCT pt.customer_id) as unique_customers,
          ROW_NUMBER() OVER (ORDER BY COUNT(pt.id) DESC) as rank
        FROM branches b
        LEFT JOIN pos_transactions pt ON b.id = pt.branch_id
          AND pt.status = 'closed'
          ${dateFilter}
        WHERE b.tenant_id = :tenantId
        AND b.is_active = true
        GROUP BY b.id, b.name, b.code, b.city, b.region
        HAVING COUNT(pt.id) > 0
      `;
      orderClause = 'ORDER BY transaction_count DESC';
      break;

    case 'customers':
      query = `
        SELECT 
          b.id,
          b.name,
          b.code,
          b.city,
          b.region,
          COUNT(DISTINCT pt.customer_id) as unique_customers,
          COUNT(pt.id) as transaction_count,
          COALESCE(SUM(pt.total), 0) as total_sales,
          ROUND(COUNT(pt.id)::decimal / NULLIF(COUNT(DISTINCT pt.customer_id), 0), 2) as avg_transactions_per_customer,
          ROW_NUMBER() OVER (ORDER BY COUNT(DISTINCT pt.customer_id) DESC) as rank
        FROM branches b
        LEFT JOIN pos_transactions pt ON b.id = pt.branch_id
          AND pt.status = 'closed'
          ${dateFilter}
        WHERE b.tenant_id = :tenantId
        AND b.is_active = true
        GROUP BY b.id, b.name, b.code, b.city, b.region
        HAVING COUNT(DISTINCT pt.customer_id) > 0
      `;
      orderClause = 'ORDER BY unique_customers DESC';
      break;

    case 'avg_transaction':
      query = `
        SELECT 
          b.id,
          b.name,
          b.code,
          b.city,
          b.region,
          COUNT(pt.id) as transaction_count,
          COALESCE(AVG(pt.total), 0) as avg_transaction,
          COALESCE(SUM(pt.total), 0) as total_sales,
          COALESCE(MIN(pt.total), 0) as min_transaction,
          COALESCE(MAX(pt.total), 0) as max_transaction,
          ROW_NUMBER() OVER (ORDER BY COALESCE(AVG(pt.total), 0) DESC) as rank
        FROM branches b
        LEFT JOIN pos_transactions pt ON b.id = pt.branch_id
          AND pt.status = 'closed'
          ${dateFilter}
        WHERE b.tenant_id = :tenantId
        AND b.is_active = true
        GROUP BY b.id, b.name, b.code, b.city, b.region
        HAVING COUNT(pt.id) > 0
      `;
      orderClause = 'ORDER BY avg_transaction DESC';
      break;
  }

  const leaderboard = await sequelize.query(`
    ${query} ${orderClause}
    LIMIT 10
  `, {
    replacements: { tenantId },
    type: QueryTypes.SELECT
  });

  // Calculate gaps
  const processedLeaderboard = leaderboard.map((item: any, index: number) => ({
    ...item,
    rank: index + 1,
    gap_to_previous: index > 0 ? 
      (parseFloat(leaderboard[index - 1][metric === 'sales' ? 'total_sales' : 
                                      metric === 'transactions' ? 'transaction_count' : 
                                      metric === 'customers' ? 'unique_customers' : 
                                      'avg_transaction']) - parseFloat(item[metric === 'sales' ? 'total_sales' : 
                                                                                      metric === 'transactions' ? 'transaction_count' : 
                                                                                      metric === 'customers' ? 'unique_customers' : 
                                                                                      'avg_transaction'])) : 0
  }));

  return {
    leaderboard: processedLeaderboard,
    topPerformer: processedLeaderboard[0] || null
  };
}

// Get comparison view (side-by-side)
async function getComparison(tenantId: string, dateFilter: string, metric: string) {
  const { sequelize } = await import('@/lib/sequelizeClient');
  const { QueryTypes } = require('sequelize');

  const branches = await sequelize.query(`
    SELECT 
      b.id,
      b.name,
      b.code,
      b.city,
      b.region,
      COUNT(pt.id) as transaction_count,
      COALESCE(SUM(pt.total), 0) as total_sales,
      COALESCE(AVG(pt.total), 0) as avg_transaction,
      COUNT(DISTINCT pt.customer_id) as unique_customers,
      -- Hourly breakdown
      ARRAY_AGG(
        JSON_BUILD_OBJECT(
          'hour', EXTRACT(HOUR FROM pt.transaction_date),
          'sales', COALESCE(SUM(pt.total), 0)
        ) ORDER BY EXTRACT(HOUR FROM pt.transaction_date)
      ) FILTER (WHERE pt.id IS NOT NULL) as hourly_breakdown
    FROM branches b
    LEFT JOIN pos_transactions pt ON b.id = pt.branch_id
      AND pt.status = 'closed'
      ${dateFilter}
    WHERE b.tenant_id = :tenantId
    AND b.is_active = true
    GROUP BY b.id, b.name, b.code, b.city, b.region
    ORDER BY total_sales DESC NULLS LAST
    LIMIT 5
  `, {
    replacements: { tenantId },
    type: QueryTypes.SELECT
  });

  // Get overall stats for comparison
  const [overallStats] = await sequelize.query(`
    SELECT 
      COUNT(DISTINCT pt.id) as total_transactions,
      COALESCE(SUM(pt.total), 0) as total_sales,
      COALESCE(AVG(pt.total), 0) as avg_transaction,
      COUNT(DISTINCT pt.customer_id) as total_customers,
      COUNT(DISTINCT pt.branch_id) as active_branches
    FROM pos_transactions pt
    WHERE pt.tenant_id = :tenantId
    AND pt.status = 'closed'
    ${dateFilter}
  `, {
    replacements: { tenantId },
    type: QueryTypes.SELECT
  });

  return {
    branches: branches.map(b => ({
      ...b,
      total_sales: parseFloat(b.total_sales || 0),
      avg_transaction: parseFloat(b.avg_transaction || 0),
      percentage_of_total: overallStats.total_sales > 0 
        ? ((parseFloat(b.total_sales || 0) / overallStats.total_sales) * 100).toFixed(2)
        : '0.00'
    })),
    overallStats: {
      ...overallStats,
      total_sales: parseFloat(overallStats.total_sales || 0),
      avg_transaction: parseFloat(overallStats.avg_transaction || 0)
    }
  };
}

// Get trends view
async function getTrends(tenantId: string, dateFilter: string, dateGrouping: string, metric: string) {
  const { sequelize } = await import('@/lib/sequelizeClient');
  const { QueryTypes } = require('sequelize');

  let valueField = '';
  switch (metric) {
    case 'sales':
      valueField = 'COALESCE(SUM(pt.total), 0)';
      break;
    case 'transactions':
      valueField = 'COUNT(pt.id)';
      break;
    case 'customers':
      valueField = 'COUNT(DISTINCT pt.customer_id)';
      break;
    case 'avg_transaction':
      valueField = 'COALESCE(AVG(pt.total), 0)';
      break;
  }

  const trends = await sequelize.query(`
    SELECT 
      ${dateGrouping} as period,
      b.id as branch_id,
      b.name as branch_name,
      b.code as branch_code,
      ${valueField} as value
    FROM branches b
    LEFT JOIN pos_transactions pt ON b.id = pt.branch_id
      AND pt.status = 'closed'
      ${dateFilter}
    WHERE b.tenant_id = :tenantId
    AND b.is_active = true
    GROUP BY period, b.id, b.name, b.code
    ORDER BY period, value DESC
  `, {
    replacements: { tenantId },
    type: QueryTypes.SELECT
  });

  // Group by period and prepare chart data
  const chartData = trends.reduce((acc: any, item: any) => {
    const period = item.period;
    if (!acc[period]) {
      acc[period] = { period, branches: [] };
    }
    acc[period].branches.push({
      id: item.branch_id,
      name: item.branch_name,
      code: item.branch_code,
      value: parseFloat(item.value || 0)
    });
    return acc;
  }, {});

  // Get top 5 branches for consistent coloring
  const topBranches = await sequelize.query(`
    SELECT 
      b.id,
      b.name,
      b.code
    FROM branches b
    LEFT JOIN pos_transactions pt ON b.id = pt.branch_id
      AND pt.status = 'closed'
      ${dateFilter}
    WHERE b.tenant_id = :tenantId
    AND b.is_active = true
    GROUP BY b.id, b.name, b.code
    ORDER BY ${valueField} DESC
    LIMIT 5
  `, {
    replacements: { tenantId },
    type: QueryTypes.SELECT
  });

  return {
    chartData: Object.values(chartData),
    topBranches,
    metric
  };
}
