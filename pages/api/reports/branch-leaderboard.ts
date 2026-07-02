import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
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
        limit = 10,
        branchIds
      } = req.query;

      // Determine date range
      let dateFilter = '';
      let dateGrouping = '';
      
      switch (period) {
        case 'today':
          dateFilter = 'AND DATE(pt.transaction_date) = CURRENT_DATE';
          dateGrouping = 'DATE(pt.transaction_date)';
          break;
        case 'yesterday':
          dateFilter = 'AND DATE(pt.transaction_date) = CURRENT_DATE - INTERVAL \'1 day\'';
          dateGrouping = 'DATE(pt.transaction_date)';
          break;
        case 'week':
          dateFilter = 'AND DATE(pt.transaction_date) >= DATE_TRUNC(\'week\', CURRENT_DATE)';
          dateGrouping = 'DATE_TRUNC(\'day\', pt.transaction_date)';
          break;
        case 'month':
          dateFilter = 'AND DATE(pt.transaction_date) >= DATE_TRUNC(\'month\', CURRENT_DATE)';
          dateGrouping = 'DATE_TRUNC(\'day\', pt.transaction_date)';
          break;
        case 'year':
          dateFilter = 'AND DATE(pt.transaction_date) >= DATE_TRUNC(\'year\', CURRENT_DATE)';
          dateGrouping = 'DATE_TRUNC(\'month\', pt.transaction_date)';
          break;
      }

      // Build branch filter
      let branchFilter = '';
      let branchParams: any = {};
      
      if (branchIds && branchIds !== 'all') {
        const parsedBranchIds = Array.isArray(JSON.parse(branchIds as string)) 
          ? JSON.parse(branchIds as string)
          : [branchIds as string];
        
        branchFilter = `AND b.id IN (${parsedBranchIds.map((_, i) => `:branchId${i}`).join(',')})`;
        parsedBranchIds.forEach((id: string, i: number) => {
          branchParams[`branchId${i}`] = id;
        });
      }

      let leaderboard;
      let comparisonData;

      switch (metric) {
        case 'sales':
          leaderboard = await getSalesLeaderboard(
            session.user.tenantId,
            dateFilter,
            dateGrouping,
            branchFilter,
            { ...branchParams },
            parseInt(limit as string)
          );
          break;

        case 'transactions':
          leaderboard = await getTransactionLeaderboard(
            session.user.tenantId,
            dateFilter,
            dateGrouping,
            branchFilter,
            { ...branchParams },
            parseInt(limit as string)
          );
          break;

        case 'customers':
          leaderboard = await getCustomerLeaderboard(
            session.user.tenantId,
            dateFilter,
            dateGrouping,
            branchFilter,
            { ...branchParams },
            parseInt(limit as string)
          );
          break;

        case 'avg_transaction':
          leaderboard = await getAvgTransactionLeaderboard(
            session.user.tenantId,
            dateFilter,
            dateGrouping,
            branchFilter,
            { ...branchParams },
            parseInt(limit as string)
          );
          break;

        case 'growth':
          leaderboard = await getGrowthLeaderboard(
            session.user.tenantId,
            dateFilter,
            branchFilter,
            { ...branchParams },
            parseInt(limit as string)
          );
          break;

        default:
          return res.status(400).json({
            success: false,
            error: 'Invalid metric',
            validMetrics: ['sales', 'transactions', 'customers', 'avg_transaction', 'growth']
          });
      }

      // Get comparison data (previous period)
      comparisonData = await getComparisonData(
        session.user.tenantId,
        period,
        metric,
        branchFilter,
        { ...branchParams }
      );

      // Get top performers
      const topPerformers = {
        highest: leaderboard[0] || null,
        lowest: leaderboard[leaderboard.length - 1] || null,
        mostImproved: await getMostImproved(
          session.user.tenantId,
          period,
          metric,
          branchFilter,
          { ...branchParams }
        )
      };

      return res.status(200).json({
        success: true,
        data: {
          leaderboard,
          comparisonData,
          topPerformers,
          metadata: {
            period,
            metric,
            limit: parseInt(limit as string),
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

// Sales leaderboard
async function getSalesLeaderboard(
  tenantId: string,
  dateFilter: string,
  dateGrouping: string,
  branchFilter: string,
  branchParams: any,
  limit: number
) {
  const { sequelize } = await import('@/lib/sequelizeClient');
  const { QueryTypes } = require('sequelize');

  const leaderboard = await sequelize.query(`
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
      RANK() OVER (ORDER BY COALESCE(SUM(pt.total), 0) DESC) as rank,
      LAG(COALESCE(SUM(pt.total), 0)) OVER (ORDER BY COALESCE(SUM(pt.total), 0) DESC) - COALESCE(SUM(pt.total), 0) as gap_to_previous,
      ROUND(
        (COALESCE(SUM(pt.total), 0) * 100.0 / (SELECT SUM(total) FROM pos_transactions pt2 
          WHERE pt2.tenant_id = :tenantId AND pt2.status = 'closed' ${dateFilter})), 2
      ) as percentage_of_total
    FROM branches b
    LEFT JOIN pos_transactions pt ON b.id = pt.branch_id
      AND pt.status = 'closed'
      ${dateFilter.replace('pt.', 'pt.')}
    WHERE b.tenant_id = :tenantId
    AND b.is_active = true
    ${branchFilter}
    GROUP BY b.id, b.name, b.code, b.city, b.region
    HAVING COUNT(pt.id) > 0
    ORDER BY total_sales DESC
    LIMIT :limit
  `, {
    replacements: { 
      tenantId,
      ...branchParams,
      limit
    },
    type: QueryTypes.SELECT
  });

  return leaderboard.map((item: any, index: number) => ({
    ...item,
    rank: index + 1,
    total_sales: parseFloat(item.total_sales),
    net_sales: parseFloat(item.net_sales),
    avg_transaction: parseFloat(item.avg_transaction),
    gap_to_previous: parseFloat(item.gap_to_previous || 0),
    percentage_of_total: parseFloat(item.percentage_of_total || 0)
  }));
}

// Transaction count leaderboard
async function getTransactionLeaderboard(
  tenantId: string,
  dateFilter: string,
  dateGrouping: string,
  branchFilter: string,
  branchParams: any,
  limit: number
) {
  const { sequelize } = await import('@/lib/sequelizeClient');
  const { QueryTypes } = require('sequelize');

  const leaderboard = await sequelize.query(`
    SELECT 
      b.id,
      b.name,
      b.code,
      b.city,
      b.region,
      COUNT(pt.id) as transaction_count,
      COALESCE(SUM(pt.total), 0) as total_sales,
      COALESCE(AVG(pt.total), 0) as avg_transaction,
      RANK() OVER (ORDER BY COUNT(pt.id) DESC) as rank,
      LAG(COUNT(pt.id)) OVER (ORDER BY COUNT(pt.id) DESC) - COUNT(pt.id) as gap_to_previous
    FROM branches b
    LEFT JOIN pos_transactions pt ON b.id = pt.branch_id
      AND pt.status = 'closed'
      ${dateFilter.replace('pt.', 'pt.')}
    WHERE b.tenant_id = :tenantId
    AND b.is_active = true
    ${branchFilter}
    GROUP BY b.id, b.name, b.code, b.city, b.region
    HAVING COUNT(pt.id) > 0
    ORDER BY transaction_count DESC
    LIMIT :limit
  `, {
    replacements: { 
      tenantId,
      ...branchParams,
      limit
    },
    type: QueryTypes.SELECT
  });

  return leaderboard.map((item: any, index: number) => ({
    ...item,
    rank: index + 1,
    total_sales: parseFloat(item.total_sales || 0),
    avg_transaction: parseFloat(item.avg_transaction || 0),
    gap_to_previous: parseInt(item.gap_to_previous || 0)
  }));
}

// Customer count leaderboard
async function getCustomerLeaderboard(
  tenantId: string,
  dateFilter: string,
  dateGrouping: string,
  branchFilter: string,
  branchParams: any,
  limit: number
) {
  const { sequelize } = await import('@/lib/sequelizeClient');
  const { QueryTypes } = require('sequelize');

  const leaderboard = await sequelize.query(`
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
      RANK() OVER (ORDER BY COUNT(DISTINCT pt.customer_id) DESC) as rank
    FROM branches b
    LEFT JOIN pos_transactions pt ON b.id = pt.branch_id
      AND pt.status = 'closed'
      ${dateFilter.replace('pt.', 'pt.')}
    WHERE b.tenant_id = :tenantId
    AND b.is_active = true
    ${branchFilter}
    GROUP BY b.id, b.name, b.code, b.city, b.region
    HAVING COUNT(DISTINCT pt.customer_id) > 0
    ORDER BY unique_customers DESC
    LIMIT :limit
  `, {
    replacements: { 
      tenantId,
      ...branchParams,
      limit
    },
    type: QueryTypes.SELECT
  });

  return leaderboard.map((item: any, index: number) => ({
    ...item,
    rank: index + 1,
    total_sales: parseFloat(item.total_sales || 0),
    avg_transactions_per_customer: parseFloat(item.avg_transactions_per_customer || 0)
  }));
}

// Average transaction leaderboard
async function getAvgTransactionLeaderboard(
  tenantId: string,
  dateFilter: string,
  dateGrouping: string,
  branchFilter: string,
  branchParams: any,
  limit: number
) {
  const { sequelize } = await import('@/lib/sequelizeClient');
  const { QueryTypes } = require('sequelize');

  const leaderboard = await sequelize.query(`
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
      RANK() OVER (ORDER BY COALESCE(AVG(pt.total), 0) DESC) as rank
    FROM branches b
    LEFT JOIN pos_transactions pt ON b.id = pt.branch_id
      AND pt.status = 'closed'
      ${dateFilter.replace('pt.', 'pt.')}
    WHERE b.tenant_id = :tenantId
    AND b.is_active = true
    ${branchFilter}
    GROUP BY b.id, b.name, b.code, b.city, b.region
    HAVING COUNT(pt.id) > 0
    ORDER BY avg_transaction DESC
    LIMIT :limit
  `, {
    replacements: { 
      tenantId,
      ...branchParams,
      limit
    },
    type: QueryTypes.SELECT
  });

  return leaderboard.map((item: any, index: number) => ({
    ...item,
    rank: index + 1,
    avg_transaction: parseFloat(item.avg_transaction || 0),
    total_sales: parseFloat(item.total_sales || 0),
    min_transaction: parseFloat(item.min_transaction || 0),
    max_transaction: parseFloat(item.max_transaction || 0)
  }));
}

// Growth leaderboard
async function getGrowthLeaderboard(
  tenantId: string,
  dateFilter: string,
  branchFilter: string,
  branchParams: any,
  limit: number
) {
  const { sequelize } = await import('@/lib/sequelizeClient');
  const { QueryTypes } = require('sequelize');

  const leaderboard = await sequelize.query(`
    WITH current_period AS (
      SELECT 
        b.id,
        COALESCE(SUM(pt.total), 0) as current_sales
      FROM branches b
      LEFT JOIN pos_transactions pt ON b.id = pt.branch_id
        AND pt.status = 'closed'
        ${dateFilter.replace('pt.', 'pt.')}
      WHERE b.tenant_id = :tenantId
      AND b.is_active = true
      ${branchFilter}
      GROUP BY b.id
    ),
    previous_period AS (
      SELECT 
        b.id,
        COALESCE(SUM(pt.total), 0) as previous_sales
      FROM branches b
      LEFT JOIN pos_transactions pt ON b.id = pt.branch_id
        AND pt.status = 'closed'
        AND pt.transaction_date >= CURRENT_DATE - INTERVAL '14 days'
        AND pt.transaction_date < CURRENT_DATE - INTERVAL '7 days'
      WHERE b.tenant_id = :tenantId
      AND b.is_active = true
      ${branchFilter}
      GROUP BY b.id
    )
    SELECT 
      b.id,
      b.name,
      b.code,
      b.city,
      b.region,
      COALESCE(cp.current_sales, 0) as current_sales,
      COALESCE(pp.previous_sales, 0) as previous_sales,
      CASE 
        WHEN COALESCE(pp.previous_sales, 0) = 0 THEN NULL
        ELSE ROUND(((cp.current_sales - pp.previous_sales) / pp.previous_sales) * 100, 2)
      END as growth_percentage,
      CASE 
        WHEN COALESCE(pp.previous_sales, 0) = 0 THEN NULL
        ELSE cp.current_sales - pp.previous_sales
      END as growth_amount,
      RANK() OVER (ORDER BY 
        CASE 
          WHEN COALESCE(pp.previous_sales, 0) = 0 THEN -1
          ELSE ((cp.current_sales - pp.previous_sales) / pp.previous_sales)
        END DESC NULLS LAST
      ) as rank
    FROM branches b
    LEFT JOIN current_period cp ON b.id = cp.id
    LEFT JOIN previous_period pp ON b.id = pp.id
    WHERE b.tenant_id = :tenantId
    AND b.is_active = true
    AND (cp.current_sales > 0 OR pp.previous_sales > 0)
    ORDER BY growth_percentage DESC NULLS LAST
    LIMIT :limit
  `, {
    replacements: { 
      tenantId,
      ...branchParams,
      limit
    },
    type: QueryTypes.SELECT
  });

  return leaderboard.map((item: any, index: number) => ({
    ...item,
    rank: index + 1,
    current_sales: parseFloat(item.current_sales || 0),
    previous_sales: parseFloat(item.previous_sales || 0),
    growth_percentage: item.growth_percentage ? parseFloat(item.growth_percentage) : null,
    growth_amount: item.growth_amount ? parseFloat(item.growth_amount) : null
  }));
}

// Get comparison data (previous period)
async function getComparisonData(
  tenantId: string,
  period: string,
  metric: string,
  branchFilter: string,
  branchParams: any
) {
  const { sequelize } = await import('@/lib/sequelizeClient');
  const { QueryTypes } = require('sequelize');

  let previousDateFilter = '';
  
  switch (period) {
    case 'today':
      previousDateFilter = 'AND DATE(pt.transaction_date) = CURRENT_DATE - INTERVAL \'1 day\'';
      break;
    case 'yesterday':
      previousDateFilter = 'AND DATE(pt.transaction_date) = CURRENT_DATE - INTERVAL \'2 days\'';
      break;
    case 'week':
      previousDateFilter = 'AND DATE(pt.transaction_date) >= DATE_TRUNC(\'week\', CURRENT_DATE - INTERVAL \'1 week\') AND DATE(pt.transaction_date) < DATE_TRUNC(\'week\', CURRENT_DATE)';
      break;
    case 'month':
      previousDateFilter = 'AND DATE(pt.transaction_date) >= DATE_TRUNC(\'month\', CURRENT_DATE - INTERVAL \'1 month\') AND DATE(pt.transaction_date) < DATE_TRUNC(\'month\', CURRENT_DATE)';
      break;
    case 'year':
      previousDateFilter = 'AND DATE(pt.transaction_date) >= DATE_TRUNC(\'year\', CURRENT_DATE - INTERVAL \'1 year\') AND DATE(pt.transaction_date) < DATE_TRUNC(\'year\', CURRENT_DATE)';
      break;
  }

  let query = '';
  
  switch (metric) {
    case 'sales':
      query = `
        SELECT 
          COUNT(pt.id) as total_transactions,
          COALESCE(SUM(pt.total), 0) as total_sales,
          COALESCE(AVG(pt.total), 0) as avg_transaction
        FROM pos_transactions pt
        WHERE pt.tenant_id = :tenantId
        AND pt.status = 'closed'
        ${previousDateFilter}
      `;
      break;
    default:
      query = `
        SELECT 
          COUNT(pt.id) as total_transactions,
          COALESCE(SUM(pt.total), 0) as total_sales,
          COALESCE(AVG(pt.total), 0) as avg_transaction
        FROM pos_transactions pt
        WHERE pt.tenant_id = :tenantId
        AND pt.status = 'closed'
        ${previousDateFilter}
      `;
  }

  const [result] = await sequelize.query(query, {
    replacements: { tenantId, ...branchParams },
    type: QueryTypes.SELECT
  });

  return {
    total_transactions: parseInt(result.total_transactions || 0),
    total_sales: parseFloat(result.total_sales || 0),
    avg_transaction: parseFloat(result.avg_transaction || 0)
  };
}

// Get most improved branch
async function getMostImproved(
  tenantId: string,
  period: string,
  metric: string,
  branchFilter: string,
  branchParams: any
) {
  // This would compare current period with previous period
  // For simplicity, returning null for now
  return null;
}
