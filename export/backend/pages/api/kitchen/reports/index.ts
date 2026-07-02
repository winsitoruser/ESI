import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../../pages/api/auth/[...nextauth]';
import { sequelize } from '@/lib/sequelizeClient';
import { QueryTypes } from 'sequelize';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    const session = await getServerSession(req, res, authOptions);

    if (!session || !session.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const tenantId = session.user.tenantId;
    const { type, startDate, endDate } = req.query;

    if (req.method === 'GET') {
      if (!type || typeof type !== 'string') {
        return res.status(400).json({ message: 'Report type is required' });
      }

      const start = startDate as string || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const end = endDate as string || new Date().toISOString().split('T')[0];

      switch (type) {
        case 'sales':
          return await getSalesReport(req, res, tenantId, start, end);
        case 'performance':
          return await getPerformanceReport(req, res, tenantId, start, end);
        case 'waste':
          return await getWasteReport(req, res, tenantId, start, end);
        case 'inventory':
          return await getInventoryReport(req, res, tenantId);
        default:
          return res.status(400).json({ message: 'Invalid report type' });
      }
    }

  } catch (error: any) {
    console.error('Error in reports API:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
}

async function getSalesReport(
  req: NextApiRequest,
  res: NextApiResponse,
  tenantId: string,
  startDate: string,
  endDate: string
) {
  // Get top selling products
  const topProducts = await sequelize.query(`
    SELECT 
      p.name,
      p.category_id,
      c.name as category_name,
      SUM(koi.quantity) as total_sold,
      SUM(koi.quantity * koi.price) as total_revenue,
      COUNT(DISTINCT ko.id) as order_count
    FROM kitchen_order_items koi
    JOIN kitchen_orders ko ON koi.order_id = ko.id
    JOIN products p ON koi.product_id = p.id
    LEFT JOIN categories c ON p.category_id = c.id
    WHERE ko.tenant_id = :tenantId
      AND ko.status = 'served'
      AND ko.created_at BETWEEN :startDate AND :endDate
    GROUP BY p.id, p.name, p.category_id, c.name
    ORDER BY total_revenue DESC
    LIMIT 20
  `, {
    replacements: { tenantId, startDate, endDate },
    type: QueryTypes.SELECT
  });

  // Get daily sales trend
  const dailySales = await sequelize.query(`
    SELECT 
      DATE(ko.created_at) as date,
      COUNT(DISTINCT ko.id) as order_count,
      SUM(ko.total_amount) as total_revenue,
      AVG(ko.total_amount) as avg_order_value
    FROM kitchen_orders ko
    WHERE ko.tenant_id = :tenantId
      AND ko.status = 'served'
      AND ko.created_at BETWEEN :startDate AND :endDate
    GROUP BY DATE(ko.created_at)
    ORDER BY date ASC
  `, {
    replacements: { tenantId, startDate, endDate },
    type: QueryTypes.SELECT
  });

  // Get category performance
  const categoryPerformance = await sequelize.query(`
    SELECT 
      c.name as category_name,
      COUNT(DISTINCT ko.id) as order_count,
      SUM(koi.quantity) as items_sold,
      SUM(koi.quantity * koi.price) as total_revenue,
      ROUND(
        (SUM(koi.quantity * koi.price) / SUM(SUM(koi.quantity * koi.price)) OVER ()) * 100, 
        2
      ) as revenue_percentage
    FROM kitchen_order_items koi
    JOIN kitchen_orders ko ON koi.order_id = ko.id
    JOIN products p ON koi.product_id = p.id
    LEFT JOIN categories c ON p.category_id = c.id
    WHERE ko.tenant_id = :tenantId
      AND ko.status = 'served'
      AND ko.created_at BETWEEN :startDate AND :endDate
    GROUP BY c.id, c.name
    ORDER BY total_revenue DESC
  `, {
    replacements: { tenantId, startDate, endDate },
    type: QueryTypes.SELECT
  });

  // Get summary stats
  const [summary] = await sequelize.query(`
    SELECT 
      COUNT(DISTINCT ko.id) as total_orders,
      SUM(ko.total_amount) as total_revenue,
      AVG(ko.total_amount) as avg_order_value,
      COUNT(DISTINCT ko.customer_id) as unique_customers
    FROM kitchen_orders ko
    WHERE ko.tenant_id = :tenantId
      AND ko.status = 'served'
      AND ko.created_at BETWEEN :startDate AND :endDate
  `, {
    replacements: { tenantId, startDate, endDate },
    type: QueryTypes.SELECT
  });

  return res.status(200).json({
    success: true,
    data: {
      summary: {
        totalOrders: parseInt((summary as any).total_orders),
        totalRevenue: parseFloat((summary as any).total_revenue) || 0,
        avgOrderValue: parseFloat((summary as any).avg_order_value) || 0,
        uniqueCustomers: parseInt((summary as any).unique_customers)
      },
      topProducts,
      dailySales,
      categoryPerformance
    }
  });
}

async function getPerformanceReport(
  req: NextApiRequest,
  res: NextApiResponse,
  tenantId: string,
  startDate: string,
  endDate: string
) {
  // Get staff performance
  const staffPerformance = await sequelize.query(`
    SELECT 
      ks.id,
      ks.name,
      ks.role,
      COUNT(ko.id) as total_orders,
      COUNT(CASE WHEN ko.status = 'served' THEN 1 END) as completed_orders,
      COUNT(CASE WHEN ko.status = 'cancelled' THEN 1 END) as cancelled_orders,
      AVG(
        CASE 
          WHEN ko.completed_at IS NOT NULL AND ko.started_at IS NOT NULL 
          THEN EXTRACT(EPOCH FROM (ko.completed_at - ko.started_at))/60 
          ELSE NULL 
        END
      ) as avg_preparation_time,
      ROUND(
        (COUNT(CASE WHEN ko.status = 'served' THEN 1 END) * 100.0 / COUNT(ko.id)), 
        2
      ) as completion_rate
    FROM kitchen_staff ks
    LEFT JOIN kitchen_orders ko ON ks.id = ko.assigned_chef_id
    WHERE ks.tenant_id = :tenantId
      AND ks.is_active = true
      AND (ko.created_at BETWEEN :startDate AND :endDate OR ko.created_at IS NULL)
    GROUP BY ks.id, ks.name, ks.role
    ORDER BY total_orders DESC
  `, {
    replacements: { tenantId, startDate, endDate },
    type: QueryTypes.SELECT
  });

  // Get peak hours
  const peakHours = await sequelize.query(`
    SELECT 
      EXTRACT(HOUR FROM ko.created_at) as hour,
      COUNT(DISTINCT ko.id) as order_count,
      AVG(ko.total_amount) as avg_order_value
    FROM kitchen_orders ko
    WHERE ko.tenant_id = :tenantId
      AND ko.status = 'served'
      AND ko.created_at BETWEEN :startDate AND :endDate
    GROUP BY EXTRACT(HOUR FROM ko.created_at)
    ORDER BY hour ASC
  `, {
    replacements: { tenantId, startDate, endDate },
    type: QueryTypes.SELECT
  });

  return res.status(200).json({
    success: true,
    data: {
      staffPerformance,
      peakHours
    }
  });
}

async function getWasteReport(
  req: NextApiRequest,
  res: NextApiResponse,
  tenantId: string,
  startDate: string,
  endDate: string
) {
  // Get waste by category
  const wasteByCategory = await sequelize.query(`
    SELECT 
      c.name as category_name,
      SUM(kiw.quantity) as total_waste_quantity,
      SUM(kiw.quantity * kiw.unit_cost) as total_waste_cost,
      COUNT(kiw.id) as waste_entries
    FROM kitchen_inventory_waste kiw
    JOIN products p ON kiw.product_id = p.id
    LEFT JOIN categories c ON p.category_id = c.id
    WHERE kiw.tenant_id = :tenantId
      AND kiw.created_at BETWEEN :startDate AND :endDate
    GROUP BY c.id, c.name
    ORDER BY total_waste_cost DESC
  `, {
    replacements: { tenantId, startDate, endDate },
    type: QueryTypes.SELECT
  });

  // Get waste reasons
  const wasteReasons = await sequelize.query(`
    SELECT 
      reason,
      COUNT(*) as count,
      SUM(quantity * unit_cost) as total_cost
    FROM kitchen_inventory_waste
    WHERE tenant_id = :tenantId
      AND created_at BETWEEN :startDate AND :endDate
    GROUP BY reason
    ORDER BY total_cost DESC
  `, {
    replacements: { tenantId, startDate, endDate },
    type: QueryTypes.SELECT
  });

  // Get daily waste trend
  const dailyWaste = await sequelize.query(`
    SELECT 
      DATE(created_at) as date,
      SUM(quantity * unit_cost) as daily_waste_cost,
      COUNT(*) as waste_entries
    FROM kitchen_inventory_waste
    WHERE tenant_id = :tenantId
      AND created_at BETWEEN :startDate AND :endDate
    GROUP BY DATE(created_at)
    ORDER BY date ASC
  `, {
    replacements: { tenantId, startDate, endDate },
    type: QueryTypes.SELECT
  });

  // Get summary
  const [summary] = await sequelize.query(`
    SELECT 
      SUM(quantity) as total_waste_quantity,
      SUM(quantity * unit_cost) as total_waste_cost,
      COUNT(*) as total_waste_entries
    FROM kitchen_inventory_waste
    WHERE tenant_id = :tenantId
      AND created_at BETWEEN :startDate AND :endDate
  `, {
    replacements: { tenantId, startDate, endDate },
    type: QueryTypes.SELECT
  });

  return res.status(200).json({
    success: true,
    data: {
      summary: {
        totalWasteQuantity: parseFloat((summary as any).total_waste_quantity) || 0,
        totalWasteCost: parseFloat((summary as any).total_waste_cost) || 0,
        totalWasteEntries: parseInt((summary as any).total_waste_entries)
      },
      wasteByCategory,
      wasteReasons,
      dailyWaste
    }
  });
}

async function getInventoryReport(
  req: NextApiRequest,
  res: NextApiResponse,
  tenantId: string
) {
  // Get current inventory status
  const inventoryStatus = await sequelize.query(`
    SELECT 
      p.name,
      p.category_id,
      c.name as category_name,
      kii.quantity,
      kii.minimum_stock,
      kii.maximum_stock,
      p.buy_price,
      (kii.quantity * p.buy_price) as total_value,
      CASE 
        WHEN kii.quantity <= kii.minimum_stock THEN 'critical'
        WHEN kii.quantity <= (kii.minimum_stock * 1.5) THEN 'low'
        WHEN kii.quantity >= kii.maximum_stock THEN 'overstock'
        ELSE 'good'
      END as status
    FROM kitchen_inventory_items kii
    JOIN products p ON kii.product_id = p.id
    LEFT JOIN categories c ON p.category_id = c.id
    WHERE kii.tenant_id = :tenantId
    ORDER BY total_value DESC
  `, {
    replacements: { tenantId },
    type: QueryTypes.SELECT
  });

  // Get inventory value by category
  const valueByCategory = await sequelize.query(`
    SELECT 
      c.name as category_name,
      SUM(kii.quantity) as total_quantity,
      SUM(kii.quantity * p.buy_price) as total_value,
      COUNT(kii.id) as item_count
    FROM kitchen_inventory_items kii
    JOIN products p ON kii.product_id = p.id
    LEFT JOIN categories c ON p.category_id = c.id
    WHERE kii.tenant_id = :tenantId
    GROUP BY c.id, c.name
    ORDER BY total_value DESC
  `, {
    replacements: { tenantId },
    type: QueryTypes.SELECT
  });

  // Get status summary
  const [statusSummary] = await sequelize.query(`
    SELECT 
      COUNT(*) as total_items,
      COUNT(CASE WHEN quantity <= minimum_stock THEN 1 END) as critical_items,
      COUNT(CASE WHEN quantity <= (minimum_stock * 1.5) AND quantity > minimum_stock THEN 1 END) as low_items,
      COUNT(CASE WHEN quantity >= maximum_stock THEN 1 END) as overstock_items,
      SUM(quantity * p.buy_price) as total_value
    FROM kitchen_inventory_items kii
    JOIN products p ON kii.product_id = p.id
    WHERE kii.tenant_id = :tenantId
  `, {
    replacements: { tenantId },
    type: QueryTypes.SELECT
  });

  return res.status(200).json({
    success: true,
    data: {
      summary: {
        totalItems: parseInt((statusSummary as any).total_items),
        criticalItems: parseInt((statusSummary as any).critical_items),
        lowItems: parseInt((statusSummary as any).low_items),
        overstockItems: parseInt((statusSummary as any).overstock_items),
        totalValue: parseFloat((statusSummary as any).total_value) || 0
      },
      inventoryStatus,
      valueByCategory
    }
  });
}
