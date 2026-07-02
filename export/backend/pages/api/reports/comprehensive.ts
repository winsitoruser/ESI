import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import { QueryTypes } from 'sequelize';

/**
 * Comprehensive Reports API
 * Provides detailed analytics with charts, filters, and export support
 */

interface ReportFilters {
  startDate: string;
  endDate: string;
  branchId?: string;
  categoryId?: string;
  paymentMethod?: string;
  reportType: 'sales' | 'inventory' | 'customers' | 'financial' | 'staff';
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const session = await getServerSession(req, res, authOptions);
    
    if (!session?.user) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const tenantId = session.user.tenantId;
    const branchId = session.user.branchId;

    if (req.method === 'GET') {
      return getReportData(req, res, tenantId || '', branchId || null);
    }

    if (req.method === 'POST') {
      return generateReport(req, res, tenantId || '', branchId || null);
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error: any) {
    console.error('Comprehensive Reports API Error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}

async function getReportData(
  req: NextApiRequest, 
  res: NextApiResponse, 
  tenantId: string | undefined,
  branchId: string | null
) {
  if (!tenantId) {
    return res.status(400).json({ success: false, error: 'Tenant ID required' });
  }
  
  const { sequelize } = await import('@/lib/sequelizeClient');
  
  const {
    startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    endDate = new Date().toISOString().split('T')[0],
    reportType = 'sales',
    branch,
    category,
    groupBy = 'day'
  } = req.query;

  const branchFilter = branch ? `AND pt.branch_id = '${branch}'` : '';
  const categoryFilter = category ? `AND p.category_id = '${category}'` : '';

  let data: any = {};

  switch (reportType) {
    case 'sales':
      data = await getSalesReport(sequelize, tenantId, startDate as string, endDate as string, branchFilter, groupBy as string);
      break;
    case 'inventory':
      data = await getInventoryReport(sequelize, tenantId, branchFilter);
      break;
    case 'customers':
      data = await getCustomersReport(sequelize, tenantId, startDate as string, endDate as string);
      break;
    case 'financial':
      data = await getFinancialReport(sequelize, tenantId, startDate as string, endDate as string, branchFilter);
      break;
    case 'staff':
      data = await getStaffReport(sequelize, tenantId, startDate as string, endDate as string, branchFilter);
      break;
    default:
      data = await getSalesReport(sequelize, tenantId, startDate as string, endDate as string, branchFilter, groupBy as string);
  }

  return res.status(200).json({
    success: true,
    reportType,
    period: { startDate, endDate },
    data
  });
}

async function getSalesReport(sequelize: any, tenantId: string, startDate: string, endDate: string, branchFilter: string, groupBy: string) {
  // Summary statistics
  const [summary] = await sequelize.query(`
    SELECT 
      COALESCE(SUM(pt.total_amount), 0) as total_sales,
      COUNT(pt.id) as total_transactions,
      COALESCE(AVG(pt.total_amount), 0) as avg_transaction,
      COUNT(DISTINCT pt.customer_id) as unique_customers,
      COALESCE(SUM(pt.discount_amount), 0) as total_discounts,
      COALESCE(SUM(pt.tax_amount), 0) as total_tax
    FROM pos_transactions pt
    WHERE pt.tenant_id = :tenantId
      AND pt.status = 'closed'
      AND DATE(pt.transaction_date) BETWEEN :startDate AND :endDate
      ${branchFilter}
  `, {
    replacements: { tenantId, startDate, endDate },
    type: QueryTypes.SELECT
  });

  // Sales by period (for chart)
  const dateFormat = groupBy === 'month' ? '%Y-%m' : groupBy === 'week' ? '%Y-%W' : '%Y-%m-%d';
  const salesByPeriod = await sequelize.query(`
    SELECT 
      TO_CHAR(pt.transaction_date, '${dateFormat === '%Y-%m-%d' ? 'YYYY-MM-DD' : dateFormat === '%Y-%m' ? 'YYYY-MM' : 'IYYY-IW'}') as period,
      COALESCE(SUM(pt.total_amount), 0) as sales,
      COUNT(pt.id) as transactions
    FROM pos_transactions pt
    WHERE pt.tenant_id = :tenantId
      AND pt.status = 'closed'
      AND DATE(pt.transaction_date) BETWEEN :startDate AND :endDate
      ${branchFilter}
    GROUP BY period
    ORDER BY period ASC
  `, {
    replacements: { tenantId, startDate, endDate },
    type: QueryTypes.SELECT
  });

  // Top products
  const topProducts = await sequelize.query(`
    SELECT 
      p.name as product_name,
      p.sku,
      SUM(pti.quantity) as quantity_sold,
      SUM(pti.subtotal) as revenue,
      COUNT(DISTINCT pti.transaction_id) as order_count
    FROM pos_transaction_items pti
    JOIN pos_transactions pt ON pti.transaction_id = pt.id
    JOIN products p ON pti.product_id = p.id
    WHERE pt.tenant_id = :tenantId
      AND pt.status = 'closed'
      AND DATE(pt.transaction_date) BETWEEN :startDate AND :endDate
      ${branchFilter}
    GROUP BY p.id, p.name, p.sku
    ORDER BY revenue DESC
    LIMIT 10
  `, {
    replacements: { tenantId, startDate, endDate },
    type: QueryTypes.SELECT
  });

  // Sales by payment method
  const salesByPayment = await sequelize.query(`
    SELECT 
      COALESCE(pt.payment_method, 'cash') as payment_method,
      COUNT(pt.id) as count,
      SUM(pt.total_amount) as total
    FROM pos_transactions pt
    WHERE pt.tenant_id = :tenantId
      AND pt.status = 'closed'
      AND DATE(pt.transaction_date) BETWEEN :startDate AND :endDate
      ${branchFilter}
    GROUP BY pt.payment_method
    ORDER BY total DESC
  `, {
    replacements: { tenantId, startDate, endDate },
    type: QueryTypes.SELECT
  });

  // Hourly sales distribution
  const hourlyDistribution = await sequelize.query(`
    SELECT 
      EXTRACT(HOUR FROM pt.transaction_date) as hour,
      COUNT(pt.id) as transactions,
      SUM(pt.total_amount) as sales
    FROM pos_transactions pt
    WHERE pt.tenant_id = :tenantId
      AND pt.status = 'closed'
      AND DATE(pt.transaction_date) BETWEEN :startDate AND :endDate
      ${branchFilter}
    GROUP BY EXTRACT(HOUR FROM pt.transaction_date)
    ORDER BY hour ASC
  `, {
    replacements: { tenantId, startDate, endDate },
    type: QueryTypes.SELECT
  });

  return {
    summary: {
      totalSales: parseFloat(summary?.total_sales || 0),
      totalTransactions: parseInt(summary?.total_transactions || 0),
      avgTransaction: parseFloat(summary?.avg_transaction || 0),
      uniqueCustomers: parseInt(summary?.unique_customers || 0),
      totalDiscounts: parseFloat(summary?.total_discounts || 0),
      totalTax: parseFloat(summary?.total_tax || 0)
    },
    charts: {
      salesTrend: salesByPeriod.map((r: any) => ({
        period: r.period,
        sales: parseFloat(r.sales),
        transactions: parseInt(r.transactions)
      })),
      paymentMethods: salesByPayment.map((r: any) => ({
        method: r.payment_method,
        count: parseInt(r.count),
        total: parseFloat(r.total)
      })),
      hourlyDistribution: hourlyDistribution.map((r: any) => ({
        hour: parseInt(r.hour),
        transactions: parseInt(r.transactions),
        sales: parseFloat(r.sales)
      }))
    },
    topProducts: topProducts.map((p: any) => ({
      name: p.product_name,
      sku: p.sku,
      quantitySold: parseInt(p.quantity_sold),
      revenue: parseFloat(p.revenue),
      orderCount: parseInt(p.order_count)
    }))
  };
}

async function getInventoryReport(sequelize: any, tenantId: string, branchFilter: string) {
  // Stock summary
  const [summary] = await sequelize.query(`
    SELECT 
      COUNT(DISTINCT p.id) as total_products,
      COUNT(DISTINCT CASE WHEN p.stock <= p.min_stock THEN p.id END) as low_stock_count,
      COUNT(DISTINCT CASE WHEN p.stock = 0 THEN p.id END) as out_of_stock_count,
      COALESCE(SUM(p.stock * p.cost), 0) as total_inventory_value,
      COALESCE(SUM(p.stock * p.selling_price), 0) as potential_revenue
    FROM products p
    WHERE p.tenant_id = :tenantId
      AND p.is_active = true
  `, {
    replacements: { tenantId },
    type: QueryTypes.SELECT
  });

  // Stock by category
  const stockByCategory = await sequelize.query(`
    SELECT 
      COALESCE(c.name, 'Uncategorized') as category,
      COUNT(p.id) as product_count,
      SUM(p.stock) as total_stock,
      SUM(p.stock * p.cost) as stock_value
    FROM products p
    LEFT JOIN categories c ON p.category_id = c.id
    WHERE p.tenant_id = :tenantId
      AND p.is_active = true
    GROUP BY c.id, c.name
    ORDER BY stock_value DESC
  `, {
    replacements: { tenantId },
    type: QueryTypes.SELECT
  });

  // Low stock items
  const lowStockItems = await sequelize.query(`
    SELECT 
      p.name,
      p.sku,
      p.stock,
      p.min_stock,
      p.unit,
      COALESCE(c.name, 'Uncategorized') as category
    FROM products p
    LEFT JOIN categories c ON p.category_id = c.id
    WHERE p.tenant_id = :tenantId
      AND p.is_active = true
      AND p.stock <= p.min_stock
    ORDER BY p.stock ASC
    LIMIT 20
  `, {
    replacements: { tenantId },
    type: QueryTypes.SELECT
  });

  return {
    summary: {
      totalProducts: parseInt(summary?.total_products || 0),
      lowStockCount: parseInt(summary?.low_stock_count || 0),
      outOfStockCount: parseInt(summary?.out_of_stock_count || 0),
      totalInventoryValue: parseFloat(summary?.total_inventory_value || 0),
      potentialRevenue: parseFloat(summary?.potential_revenue || 0)
    },
    charts: {
      stockByCategory: stockByCategory.map((c: any) => ({
        category: c.category,
        productCount: parseInt(c.product_count),
        totalStock: parseInt(c.total_stock),
        stockValue: parseFloat(c.stock_value)
      }))
    },
    lowStockItems: lowStockItems.map((i: any) => ({
      name: i.name,
      sku: i.sku,
      stock: parseInt(i.stock),
      minStock: parseInt(i.min_stock),
      unit: i.unit,
      category: i.category
    }))
  };
}

async function getCustomersReport(sequelize: any, tenantId: string, startDate: string, endDate: string) {
  // Customer summary
  const [summary] = await sequelize.query(`
    SELECT 
      COUNT(DISTINCT c.id) as total_customers,
      COUNT(DISTINCT CASE WHEN c.created_at >= :startDate THEN c.id END) as new_customers,
      COUNT(DISTINCT pt.customer_id) as active_customers
    FROM customers c
    LEFT JOIN pos_transactions pt ON c.id = pt.customer_id 
      AND DATE(pt.transaction_date) BETWEEN :startDate AND :endDate
      AND pt.status = 'closed'
    WHERE c.tenant_id = :tenantId
      AND c.is_active = true
  `, {
    replacements: { tenantId, startDate, endDate },
    type: QueryTypes.SELECT
  });

  // Top customers
  const topCustomers = await sequelize.query(`
    SELECT 
      c.name,
      c.phone,
      COUNT(pt.id) as total_orders,
      SUM(pt.total_amount) as total_spent,
      AVG(pt.total_amount) as avg_order_value,
      MAX(pt.transaction_date) as last_order
    FROM customers c
    JOIN pos_transactions pt ON c.id = pt.customer_id
    WHERE c.tenant_id = :tenantId
      AND pt.status = 'closed'
      AND DATE(pt.transaction_date) BETWEEN :startDate AND :endDate
    GROUP BY c.id, c.name, c.phone
    ORDER BY total_spent DESC
    LIMIT 10
  `, {
    replacements: { tenantId, startDate, endDate },
    type: QueryTypes.SELECT
  });

  return {
    summary: {
      totalCustomers: parseInt(summary?.total_customers || 0),
      newCustomers: parseInt(summary?.new_customers || 0),
      activeCustomers: parseInt(summary?.active_customers || 0)
    },
    topCustomers: topCustomers.map((c: any) => ({
      name: c.name,
      phone: c.phone,
      totalOrders: parseInt(c.total_orders),
      totalSpent: parseFloat(c.total_spent),
      avgOrderValue: parseFloat(c.avg_order_value),
      lastOrder: c.last_order
    }))
  };
}

async function getFinancialReport(sequelize: any, tenantId: string, startDate: string, endDate: string, branchFilter: string) {
  // Revenue summary
  const [revenueSummary] = await sequelize.query(`
    SELECT 
      COALESCE(SUM(pt.total_amount), 0) as gross_revenue,
      COALESCE(SUM(pt.discount_amount), 0) as total_discounts,
      COALESCE(SUM(pt.tax_amount), 0) as total_tax,
      COALESCE(SUM(pt.total_amount - pt.discount_amount), 0) as net_revenue
    FROM pos_transactions pt
    WHERE pt.tenant_id = :tenantId
      AND pt.status = 'closed'
      AND DATE(pt.transaction_date) BETWEEN :startDate AND :endDate
      ${branchFilter}
  `, {
    replacements: { tenantId, startDate, endDate },
    type: QueryTypes.SELECT
  });

  // Daily revenue trend
  const revenueByDay = await sequelize.query(`
    SELECT 
      DATE(pt.transaction_date) as date,
      SUM(pt.total_amount) as revenue,
      COUNT(pt.id) as transactions
    FROM pos_transactions pt
    WHERE pt.tenant_id = :tenantId
      AND pt.status = 'closed'
      AND DATE(pt.transaction_date) BETWEEN :startDate AND :endDate
      ${branchFilter}
    GROUP BY DATE(pt.transaction_date)
    ORDER BY date ASC
  `, {
    replacements: { tenantId, startDate, endDate },
    type: QueryTypes.SELECT
  });

  return {
    summary: {
      grossRevenue: parseFloat(revenueSummary?.gross_revenue || 0),
      totalDiscounts: parseFloat(revenueSummary?.total_discounts || 0),
      totalTax: parseFloat(revenueSummary?.total_tax || 0),
      netRevenue: parseFloat(revenueSummary?.net_revenue || 0)
    },
    charts: {
      revenueByDay: revenueByDay.map((r: any) => ({
        date: r.date,
        revenue: parseFloat(r.revenue),
        transactions: parseInt(r.transactions)
      }))
    }
  };
}

async function getStaffReport(sequelize: any, tenantId: string, startDate: string, endDate: string, branchFilter: string) {
  // Staff performance
  const staffPerformance = await sequelize.query(`
    SELECT 
      u.name as staff_name,
      COUNT(pt.id) as total_transactions,
      SUM(pt.total_amount) as total_sales,
      AVG(pt.total_amount) as avg_transaction
    FROM users u
    JOIN pos_transactions pt ON u.id = pt.cashier_id
    WHERE u.tenant_id = :tenantId
      AND pt.status = 'closed'
      AND DATE(pt.transaction_date) BETWEEN :startDate AND :endDate
      ${branchFilter}
    GROUP BY u.id, u.name
    ORDER BY total_sales DESC
  `, {
    replacements: { tenantId, startDate, endDate },
    type: QueryTypes.SELECT
  });

  return {
    staffPerformance: staffPerformance.map((s: any) => ({
      name: s.staff_name,
      totalTransactions: parseInt(s.total_transactions),
      totalSales: parseFloat(s.total_sales),
      avgTransaction: parseFloat(s.avg_transaction)
    }))
  };
}

async function generateReport(req: NextApiRequest, res: NextApiResponse, tenantId: string, branchId: string | null) {
  const { reportType, filters, format = 'json' } = req.body;

  // For now, just return the report data
  // In production, this could generate PDF/Excel files
  return res.status(200).json({
    success: true,
    message: 'Report generated',
    reportId: `RPT-${Date.now()}`,
    format
  });
}
