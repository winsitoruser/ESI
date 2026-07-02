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

    // Only super_admin and admin can access HQ analytics
    if (!['super_admin', 'admin'].includes(session.user.role)) {
      return res.status(403).json({ 
        success: false, 
        error: 'Insufficient permissions' 
      });
    }

    if (req.method === 'GET') {
      const { 
        analysis = 'overview', // overview, performance, efficiency, predictive
        period = 'month',
        branchIds = 'all',
        compareWith = 'previous' // previous, lastYear, budget
      } = req.query;

      // Build date filters
      let currentDateFilter = '';
      let compareDateFilter = '';
      
      switch (period) {
        case 'week':
          currentDateFilter = 'AND DATE(pt.transaction_date) >= DATE_TRUNC(\'week\', CURRENT_DATE)';
          compareDateFilter = 'AND DATE(pt.transaction_date) >= DATE_TRUNC(\'week\', CURRENT_DATE - INTERVAL \'1 week\') AND DATE(pt.transaction_date) < DATE_TRUNC(\'week\', CURRENT_DATE)';
          break;
        case 'month':
          currentDateFilter = 'AND DATE(pt.transaction_date) >= DATE_TRUNC(\'month\', CURRENT_DATE)';
          compareDateFilter = 'AND DATE(pt.transaction_date) >= DATE_TRUNC(\'month\', CURRENT_DATE - INTERVAL \'1 month\') AND DATE(pt.transaction_date) < DATE_TRUNC(\'month\', CURRENT_DATE)';
          break;
        case 'quarter':
          currentDateFilter = 'AND DATE(pt.transaction_date) >= DATE_TRUNC(\'quarter\', CURRENT_DATE)';
          compareDateFilter = 'AND DATE(pt.transaction_date) >= DATE_TRUNC(\'quarter\', CURRENT_DATE - INTERVAL \'3 months\') AND DATE(pt.transaction_date) < DATE_TRUNC(\'quarter\', CURRENT_DATE)';
          break;
        case 'year':
          currentDateFilter = 'AND DATE(pt.transaction_date) >= DATE_TRUNC(\'year\', CURRENT_DATE)';
          compareDateFilter = 'AND DATE(pt.transaction_date) >= DATE_TRUNC(\'year\', CURRENT_DATE - INTERVAL \'1 year\') AND DATE(pt.transaction_date) < DATE_TRUNC(\'year\', CURRENT_DATE)';
          break;
      }

      // Build branch filter
      let branchFilter = '';
      let branchParams: any = {};
      if (branchIds !== 'all') {
        const parsedBranchIds = JSON.parse(branchIds as string);
        branchFilter = `AND b.id IN (${parsedBranchIds.map((_, i) => `:branchId${i}`).join(',')})`;
        parsedBranchIds.forEach((id: string, i: number) => {
          branchParams[`branchId${i}`] = id;
        });
      }

      let data;

      switch (analysis) {
        case 'overview':
          data = await getAnalyticsOverview(session.user.tenantId, currentDateFilter, compareDateFilter, branchFilter, branchParams);
          break;

        case 'performance':
          data = await getPerformanceAnalytics(session.user.tenantId, currentDateFilter, compareDateFilter, branchFilter, branchParams);
          break;

        case 'efficiency':
          data = await getEfficiencyAnalytics(session.user.tenantId, currentDateFilter, branchFilter, branchParams);
          break;

        case 'predictive':
          data = await getPredictiveAnalytics(session.user.tenantId, currentDateFilter, branchFilter, branchParams);
          break;

        default:
          return res.status(400).json({
            success: false,
            error: 'Invalid analysis type',
            validTypes: ['overview', 'performance', 'efficiency', 'predictive']
          });
      }

      return res.status(200).json({
        success: true,
        data: {
          ...data,
          metadata: {
            analysis,
            period,
            compareWith,
            branchIds,
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
    console.error('HQ Analytics API error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message
    });
  }
}

// Get analytics overview
async function getAnalyticsOverview(
  tenantId: string, 
  currentDateFilter: string, 
  compareDateFilter: string, 
  branchFilter: string, 
  branchParams: any
) {
  const { sequelize } = await import('@/lib/sequelizeClient');
  const { QueryTypes } = require('sequelize');

  // Current period metrics
  const [currentMetrics] = await sequelize.query(`
    SELECT 
      COALESCE(SUM(pt.total), 0) as total_revenue,
      COUNT(DISTINCT pt.id) as total_transactions,
      COUNT(DISTINCT pt.customer_id) as unique_customers,
      COALESCE(AVG(pt.total), 0) as avg_transaction_value,
      COALESCE(SUM(pt.discount), 0) as total_discount,
      
      -- Cost metrics
      COALESCE(SUM(pti.quantity * p.cost), 0) as total_cogs,
      
      -- Customer metrics
      COUNT(DISTINCT CASE WHEN pt.customer_id IS NOT NULL THEN pt.id END) as transactions_with_customers,
      
      -- Peak hours
      EXTRACT(HOUR FROM pt.transaction_date) as peak_hour
      
    FROM pos_transactions pt
    JOIN branches b ON pt.branch_id = b.id
    LEFT JOIN pos_transaction_items pti ON pt.id = pti.transaction_id
    LEFT JOIN products p ON pti.product_id = p.id
    WHERE pt.tenant_id = :tenantId
    AND pt.status = 'closed'
    ${currentDateFilter}
    ${branchFilter}
  `, {
    replacements: { tenantId, ...branchParams },
    type: QueryTypes.SELECT
  });

  // Previous period metrics for comparison
  const [previousMetrics] = await sequelize.query(`
    SELECT 
      COALESCE(SUM(pt.total), 0) as total_revenue,
      COUNT(DISTINCT pt.id) as total_transactions,
      COUNT(DISTINCT pt.customer_id) as unique_customers,
      COALESCE(AVG(pt.total), 0) as avg_transaction_value,
      COALESCE(SUM(pt.discount), 0) as total_discount,
      COALESCE(SUM(pti.quantity * p.cost), 0) as total_cogs
      
    FROM pos_transactions pt
    JOIN branches b ON pt.branch_id = b.id
    LEFT JOIN pos_transaction_items pti ON pt.id = pti.transaction_id
    LEFT JOIN products p ON pti.product_id = p.id
    WHERE pt.tenant_id = :tenantId
    AND pt.status = 'closed'
    ${compareDateFilter}
    ${branchFilter}
  `, {
    replacements: { tenantId, ...branchParams },
    type: QueryTypes.SELECT
  });

  // Calculate growth percentages
  const revenueGrowth = previousMetrics.total_revenue > 0 
    ? ((parseFloat(currentMetrics.total_revenue) - parseFloat(previousMetrics.total_revenue)) / parseFloat(previousMetrics.total_revenue) * 100)
    : 0;
  
  const transactionGrowth = previousMetrics.total_transactions > 0
    ? ((currentMetrics.total_transactions - previousMetrics.total_transactions) / previousMetrics.total_transactions * 100)
    : 0;

  const customerGrowth = previousMetrics.unique_customers > 0
    ? ((currentMetrics.unique_customers - previousMetrics.unique_customers) / previousMetrics.unique_customers * 100)
    : 0;

  // Top performing categories
  const topCategories = await sequelize.query(`
    SELECT 
      c.name,
      COUNT(pti.id) as items_sold,
      COALESCE(SUM(pti.quantity * pti.price), 0) as revenue,
      COALESCE(SUM(pti.quantity * p.cost), 0) as cogs,
      ROUND(
        (SUM(pti.quantity * pti.price) - SUM(pti.quantity * p.cost)) * 100.0 / 
        NULLIF(SUM(pti.quantity * pti.price), 0), 2
      ) as profit_margin
    FROM categories c
    JOIN products p ON c.id = p.category_id
    JOIN pos_transaction_items pti ON p.id = pti.product_id
    JOIN pos_transactions pt ON pti.transaction_id = pt.id
    WHERE pt.tenant_id = :tenantId
    AND pt.status = 'closed'
    ${currentDateFilter}
    ${branchFilter}
    GROUP BY c.id, c.name
    ORDER BY revenue DESC
    LIMIT 5
  `, {
    replacements: { tenantId, ...branchParams },
    type: QueryTypes.SELECT
  });

  // Regional performance
  const regionalPerformance = await sequelize.query(`
    SELECT 
      b.region,
      COUNT(DISTINCT b.id) as branch_count,
      COUNT(DISTINCT pt.id) as total_transactions,
      COALESCE(SUM(pt.total), 0) as total_revenue,
      COALESCE(AVG(pt.total), 0) as avg_transaction,
      COUNT(DISTINCT pt.customer_id) as unique_customers
    FROM branches b
    LEFT JOIN pos_transactions pt ON b.id = pt.branch_id
      AND pt.status = 'closed' ${currentDateFilter}
    WHERE b.tenant_id = :tenantId
    AND b.is_active = true
    ${branchFilter}
    GROUP BY b.region
    ORDER BY total_revenue DESC
  `, {
    replacements: { tenantId, ...branchParams },
    type: QueryTypes.SELECT
  });

  // Customer segmentation
  const customerSegmentation = await sequelize.query(`
    SELECT 
      segment,
      customer_count,
      total_spent,
      avg_transaction_value,
      frequency
    FROM (
      SELECT 
        CASE 
          WHEN total_spent >= 1000000 THEN 'VIP'
          WHEN total_spent >= 500000 THEN 'Loyal'
          WHEN total_spent >= 100000 THEN 'Regular'
          ELSE 'Occasional'
        END as segment,
        COUNT(*) as customer_count,
        COALESCE(SUM(total_spent), 0) as total_spent,
        COALESCE(AVG(avg_transaction), 0) as avg_transaction_value,
        COALESCE(AVG(transaction_count), 0) as frequency
      FROM (
        SELECT 
          pt.customer_id,
          COALESCE(SUM(pt.total), 0) as total_spent,
          COALESCE(AVG(pt.total), 0) as avg_transaction,
          COUNT(pt.id) as transaction_count
        FROM pos_transactions pt
        WHERE pt.tenant_id = :tenantId
        AND pt.status = 'closed'
        AND pt.customer_id IS NOT NULL
        ${currentDateFilter}
        GROUP BY pt.customer_id
      ) customer_stats
      GROUP BY segment
    ) segments
    ORDER BY total_spent DESC
  `, {
    replacements: { tenantId, ...branchParams },
    type: QueryTypes.SELECT
  });

  return {
    currentPeriod: {
      ...currentMetrics,
      total_revenue: parseFloat(currentMetrics.total_revenue || 0),
      avg_transaction_value: parseFloat(currentMetrics.avg_transaction_value || 0),
      total_discount: parseFloat(currentMetrics.total_discount || 0),
      total_cogs: parseFloat(currentMetrics.total_cogs || 0),
      gross_profit: parseFloat(currentMetrics.total_revenue || 0) - parseFloat(currentMetrics.total_cogs || 0),
      gross_margin: currentMetrics.total_revenue > 0 
        ? ((parseFloat(currentMetrics.total_revenue) - parseFloat(currentMetrics.total_cogs)) / parseFloat(currentMetrics.total_revenue) * 100)
        : 0
    },
    previousPeriod: {
      ...previousMetrics,
      total_revenue: parseFloat(previousMetrics.total_revenue || 0),
      avg_transaction_value: parseFloat(previousMetrics.avg_transaction_value || 0),
      total_discount: parseFloat(previousMetrics.total_discount || 0),
      total_cogs: parseFloat(previousMetrics.total_cogs || 0)
    },
    growth: {
      revenue: revenueGrowth.toFixed(2),
      transactions: transactionGrowth.toFixed(2),
      customers: customerGrowth.toFixed(2)
    },
    topCategories: topCategories.map(cat => ({
      ...cat,
      revenue: parseFloat(cat.revenue || 0),
      cogs: parseFloat(cat.cogs || 0),
      profit_margin: parseFloat(cat.profit_margin || 0)
    })),
    regionalPerformance: regionalPerformance.map(region => ({
      ...region,
      total_revenue: parseFloat(region.total_revenue || 0),
      avg_transaction: parseFloat(region.avg_transaction || 0)
    })),
    customerSegmentation: customerSegmentation.map(seg => ({
      ...seg,
      total_spent: parseFloat(seg.total_spent || 0),
      avg_transaction_value: parseFloat(seg.avg_transaction_value || 0),
      frequency: parseFloat(seg.frequency || 0)
    }))
  };
}

// Get performance analytics
async function getPerformanceAnalytics(
  tenantId: string, 
  currentDateFilter: string, 
  compareDateFilter: string, 
  branchFilter: string, 
  branchParams: any
) {
  const { sequelize } = await import('@/lib/sequelizeClient');
  const { QueryTypes } = require('sequelize');

  // Branch performance ranking
  const branchRanking = await sequelize.query(`
    SELECT 
      b.id,
      b.name,
      b.code,
      b.city,
      b.region,
      COUNT(pt.id) as transaction_count,
      COALESCE(SUM(pt.total), 0) as total_revenue,
      COALESCE(AVG(pt.total), 0) as avg_transaction,
      COUNT(DISTINCT pt.customer_id) as unique_customers,
      COALESCE(SUM(pt.total) / NULLIF(COUNT(DISTINCT b.id), 0), 0) as revenue_per_branch_avg,
      
      -- Performance score (0-100)
      CASE 
        WHEN COUNT(pt.id) = 0 THEN 0
        ELSE LEAST(100, (
          (COALESCE(SUM(pt.total), 0) / 1000000 * 0.4) + -- Revenue weight
          (COUNT(DISTINCT pt.customer_id) * 0.3) + -- Customer weight
          (COALESCE(AVG(pt.total), 0) / 10000 * 0.3) -- Transaction value weight
        ))
      END as performance_score,
      
      RANK() OVER (ORDER BY COALESCE(SUM(pt.total), 0) DESC) as revenue_rank,
      RANK() OVER (ORDER BY COUNT(pt.id) DESC) as transaction_rank,
      RANK() OVER (ORDER BY COUNT(DISTINCT pt.customer_id) DESC) as customer_rank
      
    FROM branches b
    LEFT JOIN pos_transactions pt ON b.id = pt.branch_id
      AND pt.status = 'closed' ${currentDateFilter}
    WHERE b.tenant_id = :tenantId
    AND b.is_active = true
    ${branchFilter}
    GROUP BY b.id, b.name, b.code, b.city, b.region
    ORDER BY performance_score DESC
  `, {
    replacements: { tenantId, ...branchParams },
    type: QueryTypes.SELECT
  });

  // Product performance analysis
  const productPerformance = await sequelize.query(`
    SELECT 
      p.id,
      p.name,
      p.sku,
      c.name as category,
      COUNT(pti.id) as times_ordered,
      SUM(pti.quantity) as total_quantity,
      COALESCE(SUM(pti.quantity * pti.price), 0) as total_revenue,
      COALESCE(AVG(pti.price), 0) as avg_price,
      COALESCE(SUM(pti.quantity * p.cost), 0) as total_cost,
      
      -- Profitability metrics
      ROUND(
        (SUM(pti.quantity * pti.price) - SUM(pti.quantity * p.cost)) * 100.0 / 
        NULLIF(SUM(pti.quantity * pti.price), 0), 2
      ) as profit_margin,
      
      -- Popularity score
      (COUNT(pti.id) * 0.5 + SUM(pti.quantity) * 0.3 + COALESCE(SUM(pti.quantity * pti.price), 0) / 100000 * 0.2) as popularity_score
      
    FROM products p
    LEFT JOIN categories c ON p.category_id = c.id
    LEFT JOIN pos_transaction_items pti ON p.id = pti.product_id
    LEFT JOIN pos_transactions pt ON pti.transaction_id = pt.id
      AND pt.status = 'closed' ${currentDateFilter}
    WHERE p.tenant_id = :tenantId
    AND p.is_active = true
    ${branchFilter.replace('b.', 'pt.')}
    GROUP BY p.id, p.name, p.sku, c.name
    HAVING COUNT(pti.id) > 0
    ORDER BY total_revenue DESC
    LIMIT 50
  `, {
    replacements: { tenantId, ...branchParams },
    type: QueryTypes.SELECT
  });

  // Hourly performance pattern
  const hourlyPattern = await sequelize.query(`
    SELECT 
      EXTRACT(HOUR FROM pt.transaction_date) as hour,
      COUNT(pt.id) as transaction_count,
      COALESCE(SUM(pt.total), 0) as total_revenue,
      COALESCE(AVG(pt.total), 0) as avg_transaction,
      COUNT(DISTINCT pt.customer_id) as unique_customers,
      COUNT(DISTINCT pt.branch_id) as active_branches
    FROM pos_transactions pt
    WHERE pt.tenant_id = :tenantId
    AND pt.status = 'closed'
    AND DATE(pt.transaction_date) >= CURRENT_DATE - INTERVAL '7 days'
    GROUP BY EXTRACT(HOUR FROM pt.transaction_date)
    ORDER BY hour
  `, {
    replacements: { tenantId },
    type: QueryTypes.SELECT
  });

  // Day of week performance
  const dayOfWeekPattern = await sequelize.query(`
    SELECT 
      EXTRACT(DOW FROM pt.transaction_date) as day_of_week,
      TO_CHAR(pt.transaction_date, 'Day') as day_name,
      COUNT(pt.id) as transaction_count,
      COALESCE(SUM(pt.total), 0) as total_revenue,
      COALESCE(AVG(pt.total), 0) as avg_transaction,
      COUNT(DISTINCT pt.customer_id) as unique_customers
    FROM pos_transactions pt
    WHERE pt.tenant_id = :tenantId
    AND pt.status = 'closed'
    AND DATE(pt.transaction_date) >= CURRENT_DATE - INTERVAL '4 weeks'
    GROUP BY EXTRACT(DOW FROM pt.transaction_date), TO_CHAR(pt.transaction_date, 'Day')
    ORDER BY day_of_week
  `, {
    replacements: { tenantId },
    type: QueryTypes.SELECT
  });

  return {
    branchRanking: branchRanking.map(branch => ({
      ...branch,
      total_revenue: parseFloat(branch.total_revenue || 0),
      avg_transaction: parseFloat(branch.avg_transaction || 0),
      revenue_per_branch_avg: parseFloat(branch.revenue_per_branch_avg || 0),
      performance_score: parseFloat(branch.performance_score || 0)
    })),
    productPerformance: productPerformance.map(product => ({
      ...product,
      total_revenue: parseFloat(product.total_revenue || 0),
      avg_price: parseFloat(product.avg_price || 0),
      total_cost: parseFloat(product.total_cost || 0),
      profit_margin: parseFloat(product.profit_margin || 0),
      popularity_score: parseFloat(product.popularity_score || 0)
    })),
    hourlyPattern: hourlyPattern.map(hour => ({
      ...hour,
      total_revenue: parseFloat(hour.total_revenue || 0),
      avg_transaction: parseFloat(hour.avg_transaction || 0)
    })),
    dayOfWeekPattern: dayOfWeekPattern.map(day => ({
      ...day,
      total_revenue: parseFloat(day.total_revenue || 0),
      avg_transaction: parseFloat(day.avg_transaction || 0)
    }))
  };
}

// Get efficiency analytics
async function getEfficiencyAnalytics(
  tenantId: string, 
  currentDateFilter: string, 
  branchFilter: string, 
  branchParams: any
) {
  const { sequelize } = await import('@/lib/sequelizeClient');
  const { QueryTypes } = require('sequelize');

  // Labor efficiency
  const laborEfficiency = await sequelize.query(`
    SELECT 
      b.id,
      b.name,
      COUNT(DISTINCT e.id) as total_employees,
      COUNT(DISTINCT ea.employee_id) as employees_working_today,
      COUNT(pt.id) as transactions_per_employee,
      COALESCE(SUM(pt.total), 0) as revenue_per_employee,
      COALESCE(SUM(pt.total), 0) / NULLIF(COUNT(DISTINCT ea.employee_id), 0) as productivity_ratio,
      
      -- Labor cost percentage
      COALESCE(
        (SELECT COALESCE(SUM(amount), 0) FROM finance_transactions ft 
         WHERE ft.branch_id = b.id AND ft.category = 'salary' 
         AND DATE(ft.transaction_date) = CURRENT_DATE) / NULLIF(SUM(pt.total), 0) * 100, 0
      ) as labor_cost_percentage
      
    FROM branches b
    LEFT JOIN employees e ON b.id = e.branch_id AND e.is_active = true
    LEFT JOIN employee_attendances ea ON e.id = ea.employee_id AND DATE(ea.check_in_at) = CURRENT_DATE
    LEFT JOIN pos_transactions pt ON b.id = pt.branch_id AND pt.status = 'closed' AND DATE(pt.transaction_date) = CURRENT_DATE
    WHERE b.tenant_id = :tenantId
    AND b.is_active = true
    ${branchFilter}
    GROUP BY b.id, b.name
    ORDER BY productivity_ratio DESC
  `, {
    replacements: { tenantId, ...branchParams },
    type: QueryTypes.SELECT
  });

  // Inventory efficiency
  const inventoryEfficiency = await sequelize.query(`
    SELECT 
      b.id,
      b.name,
      COUNT(DISTINCT p.id) as total_products,
      COUNT(DISTINCT CASE WHEN p.stock > 0 THEN p.id END) as products_in_stock,
      COUNT(DISTINCT CASE WHEN p.stock <= p.min_stock THEN p.id END) as low_stock_items,
      COUNT(DISTINCT CASE WHEN p.stock = 0 THEN p.id END) as out_of_stock_items,
      
      COALESCE(SUM(p.stock * p.cost), 0) as inventory_value,
      COALESCE(SUM(pti.quantity * pti.price), 0) as sales_value,
      
      -- Inventory turnover ratio
      COALESCE(
        SUM(pti.quantity * pti.price) / NULLIF(SUM(p.stock * p.cost), 0) * 30, 0
      ) as turnover_ratio,
      
      -- Stockout rate
      COUNT(DISTINCT CASE WHEN p.stock = 0 THEN p.id END) * 100.0 / NULLIF(COUNT(DISTINCT p.id), 0) as stockout_rate
      
    FROM branches b
    LEFT JOIN products p ON b.id = p.branch_id AND p.is_active = true
    LEFT JOIN pos_transaction_items pti ON p.id = pti.product_id
    LEFT JOIN pos_transactions pt ON pti.transaction_id = pt.id AND pt.status = 'closed' AND DATE(pt.transaction_date) = CURRENT_DATE
    WHERE b.tenant_id = :tenantId
    AND b.is_active = true
    ${branchFilter}
    GROUP BY b.id, b.name
    ORDER BY turnover_ratio DESC
  `, {
    replacements: { tenantId, ...branchParams },
    type: QueryTypes.SELECT
  });

  // Space utilization
  const spaceUtilization = await sequelize.query(`
    SELECT 
      b.id,
      b.name,
      b.area_size,
      COUNT(DISTINCT p.id) as product_count,
      COUNT(DISTINCT t.id) as table_count,
      
      -- Revenue per square meter
      COALESCE(SUM(pt.total), 0) / NULLIF(b.area_size, 0) as revenue_per_sqm,
      
      -- Table turnover rate
      COUNT(pt.id) / NULLIF(COUNT(DISTINCT t.id), 0) as table_turnover_rate,
      
      -- Peak capacity utilization
      (SELECT MAX(concurrent_customers) / NULLIF(t.capacity, 0) * 100
       FROM (
         SELECT COUNT(DISTINCT pt.customer_id) as concurrent_customers
         FROM pos_transactions pt
         WHERE pt.branch_id = b.id
         AND pt.status = 'closed'
         AND DATE(pt.transaction_date) = CURRENT_DATE
         GROUP BY EXTRACT(HOUR FROM pt.transaction_date)
       ) peak) as peak_capacity_utilization
       
    FROM branches b
    LEFT JOIN products p ON b.id = p.branch_id AND p.is_active = true
    LEFT JOIN tables t ON b.id = t.branch_id AND t.is_active = true
    LEFT JOIN pos_transactions pt ON b.id = pt.branch_id AND pt.status = 'closed' AND DATE(pt.transaction_date) = CURRENT_DATE
    WHERE b.tenant_id = :tenantId
    AND b.is_active = true
    ${branchFilter}
    GROUP BY b.id, b.name, b.area_size
    ORDER BY revenue_per_sqm DESC
  `, {
    replacements: { tenantId, ...branchParams },
    type: QueryTypes.SELECT
  });

  // Wastage analysis
  const wastageAnalysis = await sequelize.query(`
    SELECT 
      b.id,
      b.name,
      COUNT(wr.id) as wastage_records,
      COALESCE(SUM(wr.quantity * wr.cost_per_unit), 0) as total_wastage_value,
      COALESCE(SUM(pt.total), 0) as total_sales,
      
      -- Wastage percentage
      COALESCE(SUM(wr.quantity * wr.cost_per_unit), 0) * 100.0 / NULLIF(SUM(pt.total), 0) as wastage_percentage,
      
      -- Most wasted items
      (SELECT JSON_AGG(
        JSON_BUILD_OBJECT(
          'name', p.name,
          'quantity', SUM(wr.quantity),
          'value', SUM(wr.quantity * wr.cost_per_unit)
        )
      ) FROM wastage_records wr2
      JOIN products p ON wr2.product_id = p.id
      WHERE wr2.branch_id = b.id
      AND DATE(wr2.waste_date) = CURRENT_DATE
      GROUP BY p.id
      ORDER BY SUM(wr2.quantity * wr.cost_per_unit) DESC
      LIMIT 3) as top_wasted_items
      
    FROM branches b
    LEFT JOIN wastage_records wr ON b.id = wr.branch_id AND DATE(wr.waste_date) = CURRENT_DATE
    LEFT JOIN pos_transactions pt ON b.id = pt.branch_id AND pt.status = 'closed' AND DATE(pt.transaction_date) = CURRENT_DATE
    WHERE b.tenant_id = :tenantId
    AND b.is_active = true
    ${branchFilter}
    GROUP BY b.id, b.name
    ORDER BY wastage_percentage DESC
  `, {
    replacements: { tenantId, ...branchParams },
    type: QueryTypes.SELECT
  });

  return {
    laborEfficiency: laborEfficiency.map(labor => ({
      ...labor,
      revenue_per_employee: parseFloat(labor.revenue_per_employee || 0),
      productivity_ratio: parseFloat(labor.productivity_ratio || 0),
      labor_cost_percentage: parseFloat(labor.labor_cost_percentage || 0)
    })),
    inventoryEfficiency: inventoryEfficiency.map(inv => ({
      ...inv,
      inventory_value: parseFloat(inv.inventory_value || 0),
      sales_value: parseFloat(inv.sales_value || 0),
      turnover_ratio: parseFloat(inv.turnover_ratio || 0),
      stockout_rate: parseFloat(inv.stockout_rate || 0)
    })),
    spaceUtilization: spaceUtilization.map(space => ({
      ...space,
      revenue_per_sqm: parseFloat(space.revenue_per_sqm || 0),
      table_turnover_rate: parseFloat(space.table_turnover_rate || 0),
      peak_capacity_utilization: parseFloat(space.peak_capacity_utilization || 0)
    })),
    wastageAnalysis: wastageAnalysis.map(waste => ({
      ...waste,
      total_wastage_value: parseFloat(waste.total_wastage_value || 0),
      total_sales: parseFloat(waste.total_sales || 0),
      wastage_percentage: parseFloat(waste.wastage_percentage || 0)
    }))
  };
}

// Get predictive analytics
async function getPredictiveAnalytics(
  tenantId: string, 
  currentDateFilter: string, 
  branchFilter: string, 
  branchParams: any
) {
  const { sequelize } = await import('@/lib/sequelizeClient');
  const { QueryTypes } = require('sequelize');

  // Sales forecast (simple linear regression based on historical data)
  const salesForecast = await sequelize.query(`
    WITH daily_sales AS (
      SELECT 
        DATE(pt.transaction_date) as date,
        COALESCE(SUM(pt.total), 0) as daily_revenue,
        EXTRACT(DOW FROM pt.transaction_date) as day_of_week,
        EXTRACT(DAY FROM pt.transaction_date) as day_of_month
      FROM pos_transactions pt
      WHERE pt.tenant_id = :tenantId
      AND pt.status = 'closed'
      AND DATE(pt.transaction_date) >= CURRENT_DATE - INTERVAL '30 days'
      GROUP BY DATE(pt.transaction_date)
    ),
    stats AS (
      SELECT 
        AVG(daily_revenue) as avg_revenue,
        STDDEV(daily_revenue) as stddev_revenue
      FROM daily_sales
    )
    SELECT 
      -- Next 7 days forecast
      ARRAY_AGG(
        JSON_BUILD_OBJECT(
          'date', CURRENT_DATE + INTERVAL '1 day' * generate_series,
          'predicted_revenue', ROUND(avg_revenue + (generate_series - 3.5) * stddev_revenue * 0.3),
          'confidence_lower', ROUND(avg_revenue - stddev_revenue),
          'confidence_upper', ROUND(avg_revenue + stddev_revenue),
          'day_of_week', EXTRACT(DOW FROM CURRENT_DATE + INTERVAL '1 day' * generate_series)
        )
      ) as forecast
    FROM stats, generate_series(1, 7)
  `, {
    replacements: { tenantId },
    type: QueryTypes.SELECT
  });

  // Inventory optimization recommendations
  const inventoryRecommendations = await sequelize.query(`
    SELECT 
      p.id,
      p.name,
      p.stock,
      p.min_stock,
      p.max_stock,
      b.name as branch_name,
      
      -- Calculate optimal stock level based on sales velocity
      (SELECT COALESCE(AVG(quantity), 0) * 7 as weekly_avg
       FROM pos_transaction_items pti
       JOIN pos_transactions pt ON pti.transaction_id = pt.id
       WHERE pti.product_id = p.id
       AND pt.status = 'closed'
       AND DATE(pt.transaction_date) >= CURRENT_DATE - INTERVAL '7 days') as weekly_demand,
       
      -- Recommendation
      CASE 
        WHEN p.stock = 0 THEN 'URGENT: Out of stock - Immediate restock required'
        WHEN p.stock < p.min_stock * 0.5 THEN 'HIGH: Stock critically low - Order soon'
        WHEN p.stock < p.min_stock THEN 'MEDIUM: Stock below minimum - Order recommended'
        WHEN p.stock > p.max_stock * 1.5 THEN 'LOW: Overstocked - Reduce ordering'
        ELSE 'OPTIMAL: Stock level is good'
      END as recommendation,
      
      -- Suggested order quantity
      CASE 
        WHEN p.stock < p.min_stock THEN GREATEST(p.min_stock - p.stock, weekly_avg)
        ELSE 0
      END as suggested_order_qty
      
    FROM products p
    JOIN branches b ON p.branch_id = b.id
    WHERE p.tenant_id = :tenantId
    AND p.is_active = true
    AND b.is_active = true
    ${branchFilter}
    ORDER BY 
      CASE 
        WHEN p.stock = 0 THEN 1
        WHEN p.stock < p.min_stock * 0.5 THEN 2
        WHEN p.stock < p.min_stock THEN 3
        ELSE 4
      END,
      weekly_demand DESC
    LIMIT 20
  `, {
    replacements: { tenantId, ...branchParams },
    type: QueryTypes.SELECT
  });

  // Staffing optimization
  const staffingOptimization = await sequelize.query(`
    SELECT 
      b.id,
      b.name,
      EXTRACT(HOUR FROM CURRENT_TIME) as current_hour,
      
      -- Current staff vs needed based on transaction volume
      COUNT(DISTINCT CASE WHEN ea.check_out_at IS NULL THEN ea.employee_id END) as staff_on_duty,
      
      -- Predicted staffing need based on historical patterns
      ROUND(
        (SELECT AVG(transaction_count) 
         FROM (
           SELECT COUNT(pt.id) as transaction_count
           FROM pos_transactions pt
           WHERE pt.branch_id = b.id
           AND pt.status = 'closed'
           AND EXTRACT(HOUR FROM pt.transaction_date) = EXTRACT(HOUR FROM CURRENT_TIME)
           AND DATE(pt.transaction_date) >= CURRENT_DATE - INTERVAL '4 weeks'
           GROUP BY DATE(pt.transaction_date)
         ) hourly_stats) / 10 -- Assuming 10 transactions per staff per hour
      ) as predicted_staff_needed,
      
      -- Recommendation
      CASE 
        WHEN COUNT(DISTINCT CASE WHEN ea.check_out_at IS NULL THEN ea.employee_id END) < 
             ROUND((SELECT AVG(transaction_count) FROM (
               SELECT COUNT(pt.id) as transaction_count
               FROM pos_transactions pt
               WHERE pt.branch_id = b.id
               AND pt.status = 'closed'
               AND EXTRACT(HOUR FROM pt.transaction_date) = EXTRACT(HOUR FROM CURRENT_TIME)
               AND DATE(pt.transaction_date) >= CURRENT_DATE - INTERVAL '4 weeks'
               GROUP BY DATE(pt.transaction_date)
             ) hourly_stats) / 10)
        THEN 'UNDERSTAFFED: Consider calling additional staff'
        WHEN COUNT(DISTINCT CASE WHEN ea.check_out_at IS NULL THEN ea.employee_id END) > 
             ROUND((SELECT AVG(transaction_count) FROM (
               SELECT COUNT(pt.id) as transaction_count
               FROM pos_transactions pt
               WHERE pt.branch_id = b.id
               AND pt.status = 'closed'
               AND EXTRACT(HOUR FROM pt.transaction_date) = EXTRACT(HOUR FROM CURRENT_TIME)
               AND DATE(pt.transaction_date) >= CURRENT_DATE - INTERVAL '4 weeks'
               GROUP BY DATE(pt.transaction_date)
             ) hourly_stats) / 10) * 1.5
        THEN 'OVERSTAFFED: Some staff can be given break'
        ELSE 'OPTIMAL: Staffing level is appropriate'
      END as staffing_recommendation
      
    FROM branches b
    LEFT JOIN employees e ON b.id = e.branch_id AND e.is_active = true
    LEFT JOIN employee_attendances ea ON e.id = ea.employee_id 
      AND DATE(ea.check_in_at) = CURRENT_DATE
    WHERE b.tenant_id = :tenantId
    AND b.is_active = true
    ${branchFilter}
    GROUP BY b.id, b.name
  `, {
    replacements: { tenantId, ...branchParams },
    type: QueryTypes.SELECT
  });

  // Customer churn prediction
  const churnPrediction = await sequelize.query(`
    WITH customer_activity AS (
      SELECT 
        pt.customer_id,
        MAX(pt.transaction_date) as last_transaction,
        COUNT(pt.id) as transaction_count,
        COALESCE(SUM(pt.total), 0) as total_spent,
        COALESCE(AVG(pt.total), 0) as avg_transaction,
        EXTRACT(DAYS FROM CURRENT_DATE - MAX(pt.transaction_date)) as days_since_last_visit
      FROM pos_transactions pt
      WHERE pt.tenant_id = :tenantId
      AND pt.status = 'closed'
      AND pt.customer_id IS NOT NULL
      AND DATE(pt.transaction_date) >= CURRENT_DATE - INTERVAL '90 days'
      GROUP BY pt.customer_id
    )
    SELECT 
      -- Customer segments by churn risk
      COUNT(CASE WHEN days_since_last_visit > 30 THEN 1 END) as high_risk_customers,
      COUNT(CASE WHEN days_since_last_visit BETWEEN 15 AND 30 THEN 1 END) as medium_risk_customers,
      COUNT(CASE WHEN days_since_last_visit < 15 THEN 1 END) as low_risk_customers,
      
      -- High value customers at risk
      (SELECT JSON_AGG(
        JSON_BUILD_OBJECT(
          'customer_id', customer_id,
          'days_since_last_visit', days_since_last_visit,
          'total_spent', total_spent,
          'transaction_count', transaction_count
        )
      ) FROM customer_activity
      WHERE days_since_last_visit > 20 AND total_spent > 500000
      ORDER BY total_spent DESC
      LIMIT 10) as high_value_at_risk,
      
      -- Retention recommendations
      CASE 
        WHEN AVG(days_since_last_visit) > 20 THEN 'CRITICAL: Launch retention campaign immediately'
        WHEN AVG(days_since_last_visit) > 15 THEN 'WARNING: Consider loyalty program enhancements'
        ELSE 'GOOD: Customer retention is healthy'
      END as retention_strategy
      
    FROM customer_activity
  `, {
    replacements: { tenantId },
    type: QueryTypes.SELECT
  });

  return {
    salesForecast: salesForecast[0],
    inventoryRecommendations: inventoryRecommendations.map(item => ({
      ...item,
      weekly_demand: parseFloat(item.weekly_demand || 0),
      suggested_order_qty: parseInt(item.suggested_order_qty || 0)
    })),
    staffingOptimization: staffingOptimization.map(staff => ({
      ...staff,
      current_hour: parseInt(staff.current_hour || 0),
      staff_on_duty: parseInt(staff.staff_on_duty || 0),
      predicted_staff_needed: Math.round(parseFloat(staff.predicted_staff_needed || 0))
    })),
    churnPrediction: churnPrediction[0]
  };
}
