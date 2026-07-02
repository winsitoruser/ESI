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
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const tenantId = session.user.tenantId;

    if (req.method === 'GET') {
      // Get today's date range
      const today = new Date();
      const startDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      const endDate = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);

      // Get active orders
      const activeOrders = await sequelize.query(`
        SELECT 
          ko.id,
          ko.order_number,
          ko.table_number,
          ko.order_type,
          ko.status,
          ko.total_amount,
          ko.created_at,
          COUNT(koi.id) as item_count,
          STRING_AGG(p.name, ', ' ORDER BY koi.id LIMIT 2) as first_items
        FROM kitchen_orders ko
        LEFT JOIN kitchen_order_items koi ON ko.id = koi.order_id
        LEFT JOIN products p ON koi.product_id = p.id
        WHERE ko.tenant_id = :tenantId
          AND ko.status IN ('new', 'preparing')
          AND ko.created_at >= :startDate
          AND ko.created_at < :endDate
        GROUP BY ko.id
        ORDER BY ko.created_at ASC
        LIMIT 20
      `, {
        replacements: { tenantId, startDate, endDate },
        type: QueryTypes.SELECT
      });

      // Get today's stats
      const [todayStats] = await sequelize.query(`
        SELECT 
          COUNT(CASE WHEN status IN ('new', 'preparing') THEN 1 END) as active_orders,
          COUNT(CASE WHEN status = 'served' THEN 1 END) as completed_orders,
          COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as cancelled_orders,
          COALESCE(SUM(CASE WHEN status = 'served' THEN total_amount END), 0) as total_revenue,
          COUNT(DISTINCT customer_id) as unique_customers
        FROM kitchen_orders
        WHERE tenant_id = :tenantId
          AND created_at >= :startDate
          AND created_at < :endDate
      `, {
        replacements: { tenantId, startDate, endDate },
        type: QueryTypes.SELECT
      });

      // Get low stock items
      const lowStockItems = await sequelize.query(`
        SELECT 
          kii.id,
          p.name,
          p.unit,
          kii.quantity,
          kii.minimum_stock,
          (kii.quantity * p.buy_price) as value
        FROM kitchen_inventory_items kii
        JOIN products p ON kii.product_id = p.id
        WHERE kii.tenant_id = :tenantId
          AND kii.quantity <= kii.minimum_stock
        ORDER BY (kii.quantity / NULLIF(kii.minimum_stock, 0)) ASC
        LIMIT 10
      `, {
        replacements: { tenantId },
        type: QueryTypes.SELECT
      });

      // Get staff on duty
      const staffOnDuty = await sequelize.query(`
        SELECT 
          ks.id,
          ks.name,
          ks.role,
          ks.shift,
          COUNT(ko.id) as active_orders_count
        FROM kitchen_staff ks
        LEFT JOIN kitchen_orders ko ON ks.id = ko.assigned_chef_id 
          AND ko.status IN ('new', 'preparing')
          AND ko.created_at >= :startDate
          AND ko.created_at < :endDate
        WHERE ks.tenant_id = :tenantId
          AND ks.is_active = true
          AND ks.status = 'active'
          AND (
            (ks.shift = 'morning' AND EXTRACT(HOUR FROM NOW()) BETWEEN 6 AND 14) OR
            (ks.shift = 'afternoon' AND EXTRACT(HOUR FROM NOW()) BETWEEN 14 AND 22) OR
            (ks.shift = 'night' AND (EXTRACT(HOUR FROM NOW()) >= 22 OR EXTRACT(HOUR FROM NOW()) < 6))
          )
        GROUP BY ks.id, ks.name, ks.role, ks.shift
        ORDER BY ks.role, ks.name
      `, {
        replacements: { tenantId, startDate, endDate },
        type: QueryTypes.SELECT
      });

      // Get table status
      const tableStatus = await sequelize.query(`
        SELECT 
          t.id,
          t.table_number,
          t.capacity,
          t.status,
          COUNT(ko.id) as active_orders,
          COALESCE(SUM(ko.total_amount), 0) as current_order_value
        FROM tables t
        LEFT JOIN kitchen_orders ko ON t.id = ko.table_id 
          AND ko.status IN ('new', 'preparing')
          AND ko.created_at >= :startDate
          AND ko.created_at < :endDate
        WHERE t.tenant_id = :tenantId
        GROUP BY t.id, t.table_number, t.capacity, t.status
        ORDER BY CAST(t.table_number AS INTEGER)
      `, {
        replacements: { tenantId, startDate, endDate },
        type: QueryTypes.SELECT
      });

      // Get hourly sales trend (last 7 days)
      const hourlyTrend = await sequelize.query(`
        SELECT 
          EXTRACT(HOUR FROM created_at) as hour,
          COUNT(DISTINCT id) as order_count,
          COALESCE(SUM(total_amount), 0) as revenue
        FROM kitchen_orders
        WHERE tenant_id = :tenantId
          AND status = 'served'
          AND created_at >= NOW() - INTERVAL '7 days'
        GROUP BY EXTRACT(HOUR FROM created_at)
        ORDER BY hour
      `, {
        replacements: { tenantId },
        type: QueryTypes.SELECT
      });

      // Get top dishes today
      const topDishes = await sequelize.query(`
        SELECT 
          p.id,
          p.name,
          p.image_url,
          COUNT(koi.id) as order_count,
          SUM(koi.quantity) as quantity_sold,
          SUM(koi.quantity * koi.price) as revenue
        FROM kitchen_order_items koi
        JOIN kitchen_orders ko ON koi.order_id = ko.id
        JOIN products p ON koi.product_id = p.id
        WHERE ko.tenant_id = :tenantId
          AND ko.status = 'served'
          AND ko.created_at >= :startDate
          AND ko.created_at < :endDate
        GROUP BY p.id, p.name, p.image_url
        ORDER BY quantity_sold DESC
        LIMIT 10
      `, {
        replacements: { tenantId, startDate, endDate },
        type: QueryTypes.SELECT
      });

      // Get pending reservations
      const pendingReservations = await sequelize.query(`
        SELECT 
          r.id,
          r.customer_name,
          r.party_size,
          r.reservation_time,
          r.status,
          t.table_number
        FROM reservations r
        LEFT JOIN tables t ON r.table_id = t.id
        WHERE r.tenant_id = :tenantId
          AND r.reservation_time >= CURRENT_DATE
          AND r.reservation_time < CURRENT_DATE + INTERVAL '1 day'
          AND r.status IN ('pending', 'confirmed')
        ORDER BY r.reservation_time ASC
        LIMIT 10
      `, {
        replacements: { tenantId },
        type: QueryTypes.SELECT
      });

      return res.status(200).json({
        success: true,
        data: {
          stats: {
            activeOrders: parseInt((todayStats as any).active_orders),
            completedOrders: parseInt((todayStats as any).completed_orders),
            cancelledOrders: parseInt((todayStats as any).cancelled_orders),
            totalRevenue: parseFloat((todayStats as any).total_revenue) || 0,
            uniqueCustomers: parseInt((todayStats as any).unique_customers)
          },
          activeOrders,
          lowStockItems,
          staffOnDuty,
          tableStatus,
          hourlyTrend,
          topDishes,
          pendingReservations
        }
      });
    }

  } catch (error: any) {
    console.error('Error in kitchen dashboard API:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
}
