import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../auth/[...nextauth]';
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

    // Only super_admin and admin can access aggregated reports
    if (!['super_admin', 'admin'].includes(session.user.role)) {
      return res.status(403).json({ 
        success: false, 
        error: 'Insufficient permissions' 
      });
    }

    if (req.method === 'GET') {
      const {
        reportType = 'summary',
        startDate,
        endDate,
        branchIds,
        groupBy = 'branch',
        format = 'json'
      } = req.query;

      // Determine date range
      let dateFilter = '';
      let dateParams: any = {};
      
      if (startDate && endDate) {
        dateFilter = 'AND DATE(pt.transaction_date) BETWEEN :startDate AND :endDate';
        dateParams.startDate = startDate;
        dateParams.endDate = endDate;
      } else {
        dateFilter = 'AND DATE(pt.transaction_date) >= CURRENT_DATE - INTERVAL \'30 days\'';
      }

      // Build branch filter
      let branchFilter = '';
      let branchParams: any = {};
      
      if (branchIds && branchIds !== 'all') {
        const parsedBranchIds = Array.isArray(JSON.parse(branchIds as string)) 
          ? JSON.parse(branchIds as string)
          : [branchIds as string];
        
        branchFilter = `AND pt.branch_id IN (${parsedBranchIds.map((_, i) => `:branchId${i}`).join(',')})`;
        parsedBranchIds.forEach((id: string, i: number) => {
          branchParams[`branchId${i}`] = id;
        });
      }

      let data;

      switch (reportType) {
        case 'summary':
          data = await getAggregatedSummary(
            session.user.tenantId,
            dateFilter,
            branchFilter,
            { ...dateParams, ...branchParams },
            groupBy as string
          );
          break;

        case 'sales':
          data = await getAggregatedSales(
            session.user.tenantId,
            dateFilter,
            branchFilter,
            { ...dateParams, ...branchParams },
            groupBy as string
          );
          break;

        case 'products':
          data = await getAggregatedProducts(
            session.user.tenantId,
            dateFilter,
            branchFilter,
            { ...dateParams, ...branchParams },
            groupBy as string
          );
          break;

        case 'customers':
          data = await getAggregatedCustomers(
            session.user.tenantId,
            dateFilter,
            branchFilter,
            { ...dateParams, ...branchParams },
            groupBy as string
          );
          break;

        case 'inventory':
          data = await getAggregatedInventory(
            session.user.tenantId,
            branchFilter,
            { ...branchParams },
            groupBy as string
          );
          break;

        case 'employees':
          data = await getAggregatedEmployees(
            session.user.tenantId,
            dateFilter,
            branchFilter,
            { ...dateParams, ...branchParams },
            groupBy as string
          );
          break;

        case 'financial':
          data = await getAggregatedFinancial(
            session.user.tenantId,
            dateFilter,
            branchFilter,
            { ...dateParams, ...branchParams },
            groupBy as string
          );
          break;

        default:
          return res.status(400).json({
            success: false,
            error: 'Invalid report type',
            validTypes: ['summary', 'sales', 'products', 'customers', 'inventory', 'employees', 'financial']
          });
      }

      // Add metadata
      data.metadata = {
        reportType,
        dateRange: {
          start: startDate || null,
          end: endDate || null
        },
        groupBy,
        generatedAt: new Date().toISOString(),
        generatedBy: {
          id: session.user.id,
          name: session.user.name,
          email: session.user.email
        },
        tenantId: session.user.tenantId
      };

      // Handle different formats
      if (format === 'csv') {
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="aggregated-${reportType}-${Date.now()}.csv"`);
        return res.status(200).send(convertToCSV(data));
      }

      if (format === 'excel') {
        // Would need a library like exceljs
        return res.status(501).json({
          success: false,
          error: 'Excel format not yet implemented'
        });
      }

      return res.status(200).json({
        success: true,
        data
      });

    } else {
      return res.status(405).json({ 
        success: false, 
        error: 'Method not allowed' 
      });
    }

  } catch (error: any) {
    console.error('API aggregator error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message
    });
  }
}

// Get aggregated summary
async function getAggregatedSummary(
  tenantId: string,
  dateFilter: string,
  branchFilter: string,
  params: any,
  groupBy: string
) {
  const { sequelize } = await import('@/lib/sequelizeClient');
  const { QueryTypes } = require('sequelize');

  let groupByClause = '';
  let selectFields = '';

  switch (groupBy) {
    case 'branch':
      groupByClause = 'GROUP BY b.id, b.name, b.code, b.city';
      selectFields = 'b.id, b.name, b.code, b.city,';
      break;
    case 'region':
      groupByClause = 'GROUP BY b.region';
      selectFields = 'b.region as region, COUNT(DISTINCT b.id) as branch_count,';
      break;
    case 'day':
      groupByClause = 'GROUP BY DATE(pt.transaction_date)';
      selectFields = 'DATE(pt.transaction_date) as date,';
      break;
    case 'month':
      groupByClause = 'GROUP BY DATE_TRUNC(\'month\', pt.transaction_date)';
      selectFields = 'DATE_TRUNC(\'month\', pt.transaction_date) as month,';
      break;
    default:
      groupByClause = '';
      selectFields = '';
  }

  const summary = await sequelize.query(`
    SELECT 
      ${selectFields}
      COUNT(DISTINCT pt.id) as total_transactions,
      COUNT(DISTINCT pt.customer_id) as unique_customers,
      COUNT(DISTINCT pt.cashier_id) as active_cashiers,
      COALESCE(SUM(pt.total), 0) as gross_revenue,
      COALESCE(SUM(pt.subtotal), 0) as net_revenue,
      COALESCE(SUM(pt.discount), 0) as total_discount,
      COALESCE(SUM(pt.tax), 0) as total_tax,
      COALESCE(AVG(pt.total), 0) as avg_transaction_value,
      COALESCE(SUM(pt.paid_amount), 0) as total_collected,
      COALESCE(SUM(pt.change_amount), 0) as total_change
    FROM pos_transactions pt
    JOIN branches b ON pt.branch_id = b.id
    WHERE pt.tenant_id = :tenantId
    AND pt.status = 'closed'
    ${dateFilter}
    ${branchFilter}
    ${groupByClause}
    ORDER BY gross_revenue DESC
  `, {
    replacements: { tenantId, ...params },
    type: QueryTypes.SELECT
  });

  // Get payment method breakdown
  const paymentBreakdown = await sequelize.query(`
    SELECT 
      ${groupBy === 'branch' ? 'b.id, b.name,' : groupBy === 'region' ? 'b.region,' : ''}
      pt.payment_method,
      COUNT(pt.id) as transaction_count,
      COALESCE(SUM(pt.total), 0) as total_amount,
      ROUND(COUNT(pt.id) * 100.0 / COUNT(*) OVER (PARTITION BY ${groupBy === 'branch' ? 'b.id' : groupBy === 'region' ? 'b.region' : '1'}), 2) as percentage
    FROM pos_transactions pt
    JOIN branches b ON pt.branch_id = b.id
    WHERE pt.tenant_id = :tenantId
    AND pt.status = 'closed'
    ${dateFilter}
    ${branchFilter}
    GROUP BY ${groupBy === 'branch' ? 'b.id, b.name,' : groupBy === 'region' ? 'b.region,' : ''} pt.payment_method
    ORDER BY total_amount DESC
  `, {
    replacements: { tenantId, ...params },
    type: QueryTypes.SELECT
  });

  return {
    summary,
    paymentBreakdown
  };
}

// Get aggregated sales data
async function getAggregatedSales(
  tenantId: string,
  dateFilter: string,
  branchFilter: string,
  params: any,
  groupBy: string
) {
  const { sequelize } = await import('@/lib/sequelizeClient');
  const { QueryTypes } = require('sequelize');

  let groupByClause = '';
  let selectFields = '';

  switch (groupBy) {
    case 'branch':
      groupByClause = 'GROUP BY b.id, b.name, b.code, DATE_TRUNC(\'hour\', pt.transaction_date)';
      selectFields = 'b.id, b.name, b.code, DATE_TRUNC(\'hour\', pt.transaction_date) as hour,';
      break;
    case 'day':
      groupByClause = 'GROUP BY DATE(pt.transaction_date)';
      selectFields = 'DATE(pt.transaction_date) as date,';
      break;
    case 'month':
      groupByClause = 'GROUP BY DATE_TRUNC(\'month\', pt.transaction_date)';
      selectFields = 'DATE_TRUNC(\'month\', pt.transaction_date) as month,';
      break;
  }

  const salesData = await sequelize.query(`
    SELECT 
      ${selectFields}
      COUNT(pt.id) as transaction_count,
      COALESCE(SUM(pt.total), 0) as total_sales,
      COALESCE(AVG(pt.total), 0) as avg_transaction,
      COUNT(DISTINCT pt.customer_id) as unique_customers,
      -- Peak hour analysis
      EXTRACT(HOUR FROM pt.transaction_date) as hour_of_day
    FROM pos_transactions pt
    JOIN branches b ON pt.branch_id = b.id
    WHERE pt.tenant_id = :tenantId
    AND pt.status = 'closed'
    ${dateFilter}
    ${branchFilter}
    ${groupByClause}
    ORDER BY ${groupBy === 'branch' ? 'hour,' : ''} total_sales DESC
  `, {
    replacements: { tenantId, ...params },
    type: QueryTypes.SELECT
  });

  // Get hourly pattern
  const hourlyPattern = await sequelize.query(`
    SELECT 
      EXTRACT(HOUR FROM pt.transaction_date) as hour,
      COUNT(pt.id) as transaction_count,
      COALESCE(SUM(pt.total), 0) as total_sales,
      COALESCE(AVG(pt.total), 0) as avg_transaction
    FROM pos_transactions pt
    WHERE pt.tenant_id = :tenantId
    AND pt.status = 'closed'
    ${dateFilter}
    ${branchFilter}
    GROUP BY EXTRACT(HOUR FROM pt.transaction_date)
    ORDER BY hour
  `, {
    replacements: { tenantId, ...params },
    type: QueryTypes.SELECT
  });

  return {
    salesData,
    hourlyPattern
  };
}

// Get aggregated product data
async function getAggregatedProducts(
  tenantId: string,
  dateFilter: string,
  branchFilter: string,
  params: any,
  groupBy: string
) {
  const { sequelize } = await import('@/lib/sequelizeClient');
  const { QueryTypes } = require('sequelize');

  const topProducts = await sequelize.query(`
    SELECT 
      p.id,
      p.name,
      p.sku,
      c.name as category_name,
      SUM(pti.quantity) as total_quantity,
      SUM(pti.quantity * pti.price) as total_revenue,
      COUNT(DISTINCT pti.transaction_id) as order_count,
      COUNT(DISTINCT pt.branch_id) as branches_sold,
      COALESCE(AVG(pti.price), 0) as avg_price,
      ROUND(
        (SUM(pti.quantity * pti.price) * 100.0 / (
          SELECT COALESCE(SUM(total), 0) FROM pos_transactions 
          WHERE tenant_id = :tenantId AND status = 'closed' ${dateFilter}
        )), 2
      ) as revenue_percentage
    FROM pos_transaction_items pti
    JOIN pos_transactions pt ON pti.transaction_id = pt.id
    JOIN products p ON pti.product_id = p.id
    LEFT JOIN categories c ON p.category_id = c.id
    WHERE pt.tenant_id = :tenantId
    AND pt.status = 'closed'
    ${dateFilter.replace('pt.', 'pt.')}
    ${branchFilter.replace('pt.', 'pt.')}
    GROUP BY p.id, p.name, p.sku, c.name
    ORDER BY total_revenue DESC
    LIMIT 50
  `, {
    replacements: { tenantId, ...params },
    type: QueryTypes.SELECT
  });

  const categoryPerformance = await sequelize.query(`
    SELECT 
      c.id,
      c.name,
      COUNT(DISTINCT p.id) as product_count,
      SUM(pti.quantity) as total_quantity,
      SUM(pti.quantity * pti.price) as total_revenue,
      COUNT(DISTINCT pt.branch_id) as branches_sold
    FROM categories c
    JOIN products p ON c.id = p.category_id
    JOIN pos_transaction_items pti ON p.id = pti.product_id
    JOIN pos_transactions pt ON pti.transaction_id = pt.id
    WHERE pt.tenant_id = :tenantId
    AND pt.status = 'closed'
    ${dateFilter.replace('pt.', 'pt.')}
    ${branchFilter.replace('pt.', 'pt.')}
    GROUP BY c.id, c.name
    ORDER BY total_revenue DESC
  `, {
    replacements: { tenantId, ...params },
    type: QueryTypes.SELECT
  });

  return {
    topProducts,
    categoryPerformance
  };
}

// Get aggregated customer data
async function getAggregatedCustomers(
  tenantId: string,
  dateFilter: string,
  branchFilter: string,
  params: any,
  groupBy: string
) {
  const { sequelize } = await import('@/lib/sequelizeClient');
  const { QueryTypes } = require('sequelize');

  const customerStats = await sequelize.query(`
    SELECT 
      COUNT(DISTINCT pt.customer_id) as total_customers,
      COUNT(DISTINCT CASE WHEN pt.customer_id IS NOT NULL THEN pt.id END) as transactions_with_customer,
      COUNT(pt.id) as total_transactions,
      ROUND(
        COUNT(DISTINCT CASE WHEN pt.customer_id IS NOT NULL THEN pt.id END) * 100.0 / COUNT(pt.id), 2
      ) as customer_percentage,
      COALESCE(AVG(pt.total), 0) as avg_transaction_value
    FROM pos_transactions pt
    WHERE pt.tenant_id = :tenantId
    AND pt.status = 'closed'
    ${dateFilter}
    ${branchFilter}
  `, {
    replacements: { tenantId, ...params },
    type: QueryTypes.SELECT
  });

  const topCustomers = await sequelize.query(`
    SELECT 
      c.id,
      c.name,
      c.phone,
      c.email,
      COUNT(pt.id) as transaction_count,
      COALESCE(SUM(pt.total), 0) as total_spent,
      COALESCE(AVG(pt.total), 0) as avg_transaction,
      MIN(pt.transaction_date) as first_transaction,
      MAX(pt.transaction_date) as last_transaction,
      COUNT(DISTINCT pt.branch_id) as branches_visited
    FROM customers c
    JOIN pos_transactions pt ON c.id = pt.customer_id
    WHERE pt.tenant_id = :tenantId
    AND pt.status = 'closed'
    ${dateFilter.replace('pt.', 'pt.')}
    ${branchFilter.replace('pt.', 'pt.')}
    GROUP BY c.id, c.name, c.phone, c.email
    ORDER BY total_spent DESC
    LIMIT 50
  `, {
    replacements: { tenantId, ...params },
    type: QueryTypes.SELECT
  });

  return {
    customerStats: customerStats[0],
    topCustomers
  };
}

// Get aggregated inventory data
async function getAggregatedInventory(
  tenantId: string,
  branchFilter: string,
  params: any,
  groupBy: string
) {
  const { sequelize } = await import('@/lib/sequelizeClient');
  const { QueryTypes } = require('sequelize');

  const inventorySummary = await sequelize.query(`
    SELECT 
      ${groupBy === 'branch' ? 'b.id, b.name, b.code,' : ''}
      COUNT(p.id) as total_products,
      COUNT(CASE WHEN p.stock <= p.min_stock THEN 1 END) as low_stock_count,
      COUNT(CASE WHEN p.stock = 0 THEN 1 END) as out_of_stock_count,
      COALESCE(SUM(p.stock * p.cost), 0) as inventory_value,
      COALESCE(SUM(p.stock * p.selling_price), 0) as potential_revenue,
      ROUND(
        COUNT(CASE WHEN p.stock <= p.min_stock THEN 1 END) * 100.0 / NULLIF(COUNT(p.id), 0), 2
      ) as low_stock_percentage
    FROM branches b
    JOIN products p ON b.id = p.branch_id
    WHERE b.tenant_id = :tenantId
    AND b.is_active = true
    AND p.is_active = true
    ${branchFilter}
    ${groupBy === 'branch' ? 'GROUP BY b.id, b.name, b.code' : ''}
  `, {
    replacements: { tenantId, ...params },
    type: QueryTypes.SELECT
  });

  return {
    inventorySummary
  };
}

// Get aggregated employee data
async function getAggregatedEmployees(
  tenantId: string,
  dateFilter: string,
  branchFilter: string,
  params: any,
  groupBy: string
) {
  const { sequelize } = await import('@/lib/sequelizeClient');
  const { QueryTypes } = require('sequelize');

  const employeePerformance = await sequelize.query(`
    SELECT 
      e.id,
      e.name,
      e.position,
      b.name as branch_name,
      COUNT(pt.id) as transaction_count,
      COALESCE(SUM(pt.total), 0) as total_sales,
      COALESCE(AVG(pt.total), 0) as avg_transaction,
      COUNT(DISTINCT DATE(pt.transaction_date)) as working_days
    FROM employees e
    JOIN users u ON e.user_id = u.id
    JOIN branches b ON e.branch_id = b.id
    LEFT JOIN pos_transactions pt ON u.id = pt.cashier_id
      AND pt.status = 'closed'
      ${dateFilter.replace('pt.', 'pt.')}
    WHERE e.tenant_id = :tenantId
    AND e.is_active = true
    ${branchFilter.replace('b.', 'b.')}
    GROUP BY e.id, e.name, e.position, b.name
    HAVING COUNT(pt.id) > 0
    ORDER BY total_sales DESC
    LIMIT 50
  `, {
    replacements: { tenantId, ...params },
    type: QueryTypes.SELECT
  });

  return {
    employeePerformance
  };
}

// Get aggregated financial data
async function getAggregatedFinancial(
  tenantId: string,
  dateFilter: string,
  branchFilter: string,
  params: any,
  groupBy: string
) {
  const { sequelize } = await import('@/lib/sequelizeClient');
  const { QueryTypes } = require('sequelize');

  const financialSummary = await sequelize.query(`
    SELECT 
      ${groupBy === 'branch' ? 'b.id, b.name, b.code,' : ''}
      COALESCE(SUM(pt.total), 0) as revenue,
      COALESCE(SUM(CASE WHEN ft.transaction_type = 'expense' THEN ft.amount ELSE 0 END), 0) as expenses,
      COALESCE(SUM(pt.total) - SUM(CASE WHEN ft.transaction_type = 'expense' THEN ft.amount ELSE 0 END), 0) as profit,
      COALESCE(
        (SUM(pt.total) - SUM(CASE WHEN ft.transaction_type = 'expense' THEN ft.amount ELSE 0 END)) * 100.0 / 
        NULLIF(SUM(pt.total), 0), 0
      ) as profit_margin
    FROM branches b
    LEFT JOIN pos_transactions pt ON b.id = pt.branch_id
      AND pt.status = 'closed'
      ${dateFilter.replace('pt.', 'pt.')}
    LEFT JOIN finance_transactions ft ON b.id = ft.branch_id
      ${dateFilter.replace('pt.', 'ft.')}
    WHERE b.tenant_id = :tenantId
    AND b.is_active = true
    ${branchFilter}
    ${groupBy === 'branch' ? 'GROUP BY b.id, b.name, b.code' : ''}
  `, {
    replacements: { tenantId, ...params },
    type: QueryTypes.SELECT
  });

  return {
    financialSummary
  };
}

// Simple CSV converter (placeholder)
function convertToCSV(data: any): string {
  // This is a simplified CSV converter
  // In production, use a proper CSV library
  return 'CSV format not yet implemented';
}
