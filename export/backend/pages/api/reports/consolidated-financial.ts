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

    // Only super_admin and admin can access consolidated reports
    if (!['super_admin', 'admin'].includes(session.user.role)) {
      return res.status(403).json({ 
        success: false, 
        error: 'Insufficient permissions' 
      });
    }

    if (req.method === 'GET') {
      const {
        reportType = 'summary',
        period = 'month',
        startDate,
        endDate,
        branchIds,
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
        switch (period) {
          case 'today':
            dateFilter = 'AND DATE(pt.transaction_date) = CURRENT_DATE';
            break;
          case 'yesterday':
            dateFilter = 'AND DATE(pt.transaction_date) = CURRENT_DATE - INTERVAL \'1 day\'';
            break;
          case 'week':
            dateFilter = 'AND DATE(pt.transaction_date) >= DATE_TRUNC(\'week\', CURRENT_DATE)';
            break;
          case 'month':
            dateFilter = 'AND DATE(pt.transaction_date) >= DATE_TRUNC(\'month\', CURRENT_DATE)';
            break;
          case 'quarter':
            dateFilter = 'AND DATE(pt.transaction_date) >= DATE_TRUNC(\'quarter\', CURRENT_DATE)';
            break;
          case 'year':
            dateFilter = 'AND DATE(pt.transaction_date) >= DATE_TRUNC(\'year\', CURRENT_DATE)';
            break;
        }
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

      let reportData;

      switch (reportType) {
        case 'summary':
          reportData = await generateSummaryReport(
            session.user.tenantId,
            dateFilter,
            branchFilter,
            { ...dateParams, ...branchParams }
          );
          break;

        case 'p&l':
          reportData = await generateProfitLossReport(
            session.user.tenantId,
            dateFilter,
            branchFilter,
            { ...dateParams, ...branchParams }
          );
          break;

        case 'cashflow':
          reportData = await generateCashflowReport(
            session.user.tenantId,
            dateFilter,
            branchFilter,
            { ...dateParams, ...branchParams }
          );
          break;

        case 'balance':
          reportData = await generateBalanceSheetReport(
            session.user.tenantId,
            dateFilter,
            branchFilter,
            { ...dateParams, ...branchParams }
          );
          break;

        case 'branch_comparison':
          reportData = await generateBranchComparisonReport(
            session.user.tenantId,
            dateFilter,
            branchFilter,
            { ...dateParams, ...branchParams }
          );
          break;

        default:
          return res.status(400).json({
            success: false,
            error: 'Invalid report type',
            validTypes: ['summary', 'p&l', 'cashflow', 'balance', 'branch_comparison']
          });
      }

      // Add metadata
      reportData.metadata = {
        reportType,
        period,
        generatedAt: new Date().toISOString(),
        generatedBy: {
          id: session.user.id,
          name: session.user.name,
          email: session.user.email
        },
        currency: 'IDR',
        dateRange: {
          start: startDate || null,
          end: endDate || null
        }
      };

      // Handle different formats
      if (format === 'csv') {
        // Convert to CSV (simplified example)
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="financial-report-${reportType}-${Date.now()}.csv"`);
        return res.status(200).send(convertToCSV(reportData));
      }

      if (format === 'pdf') {
        // Would need a PDF library like puppeteer
        return res.status(501).json({
          success: false,
          error: 'PDF format not yet implemented'
        });
      }

      return res.status(200).json({
        success: true,
        data: reportData
      });

    } else {
      return res.status(405).json({ 
        success: false, 
        error: 'Method not allowed' 
      });
    }

  } catch (error: any) {
    console.error('Consolidated financial reports API error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message
    });
  }
}

// Generate summary report
async function generateSummaryReport(
  tenantId: string,
  dateFilter: string,
  branchFilter: string,
  params: any
) {
  const { sequelize } = await import('@/lib/sequelizeClient');
  const { QueryTypes } = require('sequelize');

  // Overall metrics
  const [overall] = await sequelize.query(`
    SELECT 
      COUNT(DISTINCT pt.id) as total_transactions,
      COUNT(DISTINCT pt.customer_id) as unique_customers,
      COALESCE(SUM(pt.total), 0) as total_revenue,
      COALESCE(SUM(pt.subtotal), 0) as net_sales,
      COALESCE(SUM(pt.discount), 0) as total_discount,
      COALESCE(SUM(pt.tax), 0) as total_tax,
      COALESCE(AVG(pt.total), 0) as avg_transaction_value,
      COUNT(DISTINCT pt.branch_id) as active_branches
    FROM pos_transactions pt
    WHERE pt.tenant_id = :tenantId
    AND pt.status = 'closed'
    ${dateFilter}
    ${branchFilter}
  `, {
    replacements: { tenantId, ...params },
    type: QueryTypes.SELECT
  });

  // Top performing branches
  const topBranches = await sequelize.query(`
    SELECT 
      b.id,
      b.name,
      b.code,
      COUNT(pt.id) as transaction_count,
      COALESCE(SUM(pt.total), 0) as total_revenue,
      COALESCE(AVG(pt.total), 0) as avg_transaction,
      COUNT(DISTINCT pt.customer_id) as unique_customers
    FROM branches b
    LEFT JOIN pos_transactions pt ON b.id = pt.branch_id
      AND pt.status = 'closed'
      ${dateFilter.replace('AND', 'AND pt.')}
    WHERE b.tenant_id = :tenantId
    AND b.is_active = true
    GROUP BY b.id, b.name, b.code
    ORDER BY total_revenue DESC
    LIMIT 10
  `, {
    replacements: { tenantId, ...params },
    type: QueryTypes.SELECT
  });

  // Top selling products
  const topProducts = await sequelize.query(`
    SELECT 
      p.id,
      p.name,
      p.sku,
      c.name as category_name,
      SUM(pti.quantity) as total_quantity,
      SUM(pti.quantity * pti.price) as total_revenue,
      COUNT(DISTINCT pti.transaction_id) as order_count
    FROM pos_transaction_items pti
    JOIN pos_transactions pt ON pti.transaction_id = pt.id
    JOIN products p ON pti.product_id = p.id
    LEFT JOIN categories c ON p.category_id = c.id
    WHERE pt.tenant_id = :tenantId
    AND pt.status = 'closed'
    ${dateFilter.replace('AND', 'AND pt.')}
    ${branchFilter.replace('AND', 'AND pt.')}
    GROUP BY p.id, p.name, p.sku, c.name
    ORDER BY total_revenue DESC
    LIMIT 10
  `, {
    replacements: { tenantId, ...params },
    type: QueryTypes.SELECT
  });

  // Payment method breakdown
  const paymentBreakdown = await sequelize.query(`
    SELECT 
      pt.payment_method,
      COUNT(pt.id) as transaction_count,
      COALESCE(SUM(pt.total), 0) as total_amount,
      ROUND(COUNT(pt.id) * 100.0 / (SELECT COUNT(*) FROM pos_transactions 
        WHERE tenant_id = :tenantId AND status = 'closed' ${dateFilter} ${branchFilter}), 2) as percentage
    FROM pos_transactions pt
    WHERE pt.tenant_id = :tenantId
    AND pt.status = 'closed'
    ${dateFilter}
    ${branchFilter}
    GROUP BY pt.payment_method
    ORDER BY total_amount DESC
  `, {
    replacements: { tenantId, ...params },
    type: QueryTypes.SELECT
  });

  return {
    overall,
    topBranches,
    topProducts,
    paymentBreakdown
  };
}

// Generate P&L report
async function generateProfitLossReport(
  tenantId: string,
  dateFilter: string,
  branchFilter: string,
  params: any
) {
  const { sequelize } = await import('@/lib/sequelizeClient');
  const { QueryTypes } = require('sequelize');

  // Revenue
  const [revenue] = await sequelize.query(`
    SELECT 
      COALESCE(SUM(pt.total), 0) as gross_revenue,
      COALESCE(SUM(pt.discount), 0) as total_discount,
      COALESCE(SUM(pt.subtotal), 0) as net_revenue,
      COALESCE(SUM(pt.tax), 0) as tax_collected
    FROM pos_transactions pt
    WHERE pt.tenant_id = :tenantId
    AND pt.status = 'closed'
    ${dateFilter}
    ${branchFilter}
  `, {
    replacements: { tenantId, ...params },
    type: QueryTypes.SELECT
  });

  // COGS (Cost of Goods Sold)
  const [cogs] = await sequelize.query(`
    SELECT 
      COALESCE(SUM(pti.quantity * i.cost), 0) as total_cogs
    FROM pos_transaction_items pti
    JOIN pos_transactions pt ON pti.transaction_id = pt.id
    JOIN products p ON pti.product_id = p.id
    JOIN ingredients i ON p.id = i.product_id
    WHERE pt.tenant_id = :tenantId
    AND pt.status = 'closed'
    ${dateFilter.replace('AND', 'AND pt.')}
    ${branchFilter.replace('AND', 'AND pt.')}
  `, {
    replacements: { tenantId, ...params },
    type: QueryTypes.SELECT
  });

  // Operating expenses
  const [expenses] = await sequelize.query(`
    SELECT 
      ft.category,
      COALESCE(SUM(CASE WHEN ft.transaction_type = 'expense' THEN ft.amount ELSE 0 END), 0) as total_expenses
    FROM finance_transactions ft
    WHERE ft.tenant_id = :tenantId
    ${dateFilter.replace('pt.', 'ft.')}
    ${branchFilter.replace('pt.', 'ft.')}
    GROUP BY ft.category
  `, {
    replacements: { tenantId, ...params },
    type: QueryTypes.SELECT
  });

  const grossProfit = parseFloat(revenue.net_revenue) - parseFloat(cogs.total_cogs);
  const totalExpenses = expenses.reduce((sum, e) => sum + parseFloat(e.total_expenses), 0);
  const netProfit = grossProfit - totalExpenses;

  return {
    revenue: {
      gross: parseFloat(revenue.gross_revenue),
      discount: parseFloat(revenue.total_discount),
      net: parseFloat(revenue.net_revenue),
      tax: parseFloat(revenue.tax_collected)
    },
    cogs: {
      total: parseFloat(cogs.total_cogs)
    },
    grossProfit,
    expenses: expenses.map(e => ({
      category: e.category,
      amount: parseFloat(e.total_expenses)
    })),
    totalExpenses,
    netProfit,
    profitMargin: parseFloat(revenue.net_revenue) > 0 
      ? (netProfit / parseFloat(revenue.net_revenue)) * 100 
      : 0
  };
}

// Generate cashflow report
async function generateCashflowReport(
  tenantId: string,
  dateFilter: string,
  branchFilter: string,
  params: any
) {
  const { sequelize } = await import('@/lib/sequelizeClient');
  const { QueryTypes } = require('sequelize');

  // Cash inflows
  const [inflows] = await sequelize.query(`
    SELECT 
      pt.payment_method,
      COALESCE(SUM(pt.total), 0) as total_inflow
    FROM pos_transactions pt
    WHERE pt.tenant_id = :tenantId
    AND pt.status = 'closed'
    ${dateFilter}
    ${branchFilter}
    GROUP BY pt.payment_method
  `, {
    replacements: { tenantId, ...params },
    type: QueryTypes.SELECT
  });

  // Cash outflows
  const [outflows] = await sequelize.query(`
    SELECT 
      ft.category,
      COALESCE(SUM(CASE WHEN ft.transaction_type = 'expense' THEN ft.amount ELSE 0 END), 0) as total_outflow
    FROM finance_transactions ft
    WHERE ft.tenant_id = :tenantId
    ${dateFilter.replace('pt.', 'ft.')}
    ${branchFilter.replace('pt.', 'ft.')}
    GROUP BY ft.category
  `, {
    replacements: { tenantId, ...params },
    type: QueryTypes.SELECT
  });

  const totalInflow = inflows.reduce((sum, i) => sum + parseFloat(i.total_inflow), 0);
  const totalOutflow = outflows.reduce((sum, o) => sum + parseFloat(o.total_outflow), 0);
  const netCashflow = totalInflow - totalOutflow;

  return {
    inflows: inflows.map(i => ({
      method: i.payment_method,
      amount: parseFloat(i.total_inflow)
    })),
    outflows: outflows.map(o => ({
      category: o.category,
      amount: parseFloat(o.total_outflow)
    })),
    totalInflow,
    totalOutflow,
    netCashflow
  };
}

// Generate balance sheet (simplified)
async function generateBalanceSheetReport(
  tenantId: string,
  dateFilter: string,
  branchFilter: string,
  params: any
) {
  // This would be more complex in a real system
  // For now, return a placeholder structure
  return {
    assets: {
      current: {
        cash: 0,
        accounts_receivable: 0,
        inventory: 0
      },
      fixed: {
        equipment: 0,
        furniture: 0
      }
    },
    liabilities: {
      current: {
        accounts_payable: 0,
        short_term_debt: 0
      },
      long_term: {
        long_term_debt: 0
      }
    },
    equity: {
      owner_equity: 0,
      retained_earnings: 0
    }
  };
}

// Generate branch comparison report
async function generateBranchComparisonReport(
  tenantId: string,
  dateFilter: string,
  branchFilter: string,
  params: any
) {
  const { sequelize } = await import('@/lib/sequelizeClient');
  const { QueryTypes } = require('sequelize');

  const branches = await sequelize.query(`
    SELECT 
      b.id,
      b.name,
      b.code,
      b.city,
      COUNT(pt.id) as transaction_count,
      COALESCE(SUM(pt.total), 0) as total_revenue,
      COALESCE(AVG(pt.total), 0) as avg_transaction,
      COUNT(DISTINCT pt.customer_id) as unique_customers,
      COALESCE(SUM(pt.discount), 0) as total_discount,
      COALESCE(SUM(pt.tax), 0) as total_tax
    FROM branches b
    LEFT JOIN pos_transactions pt ON b.id = pt.branch_id
      AND pt.status = 'closed'
      ${dateFilter.replace('AND', 'AND pt.')}
    WHERE b.tenant_id = :tenantId
    AND b.is_active = true
    ${branchFilter ? 'AND b.id IN (' + branchFilter.split('AND')[1].split(':')[1].trim() + ')' : ''}
    GROUP BY b.id, b.name, b.code, b.city
    ORDER BY total_revenue DESC
  `, {
    replacements: { tenantId, ...params },
    type: QueryTypes.SELECT
  });

  return {
    branches: branches.map(b => ({
      ...b,
      totalRevenue: parseFloat(b.total_revenue),
      avgTransaction: parseFloat(b.avg_transaction),
      totalDiscount: parseFloat(b.total_discount),
      totalTax: parseFloat(b.total_tax)
    })),
    summary: {
      totalBranches: branches.length,
      totalRevenue: branches.reduce((sum, b) => sum + parseFloat(b.total_revenue), 0),
      totalTransactions: branches.reduce((sum, b) => sum + parseInt(b.transaction_count), 0),
      avgRevenuePerBranch: branches.length > 0 
        ? branches.reduce((sum, b) => sum + parseFloat(b.total_revenue), 0) / branches.length 
        : 0
    }
  };
}

// Simple CSV converter (placeholder)
function convertToCSV(data: any): string {
  // This is a simplified CSV converter
  // In production, use a proper CSV library
  return 'CSV format not yet implemented';
}
