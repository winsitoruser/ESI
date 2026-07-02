import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../../../pages/api/auth/[...nextauth]';
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

    const { id } = req.query;
    const tenantId = session.user.tenantId;

    if (req.method === 'GET') {
      // Get staff performance data
      const [staff] = await sequelize.query(`
        SELECT 
          ks.*,
          u.email as user_email
        FROM kitchen_staff ks
        LEFT JOIN users u ON ks.user_id = u.id
        WHERE ks.id = :id AND ks.tenant_id = :tenantId AND ks.is_active = true
      `, {
        replacements: { id, tenantId },
        type: QueryTypes.SELECT
      });

      if (!staff) {
        return res.status(404).json({
          success: false,
          message: 'Staff not found'
        });
      }

      // Get performance metrics
      const performanceData = await sequelize.query(`
        SELECT 
          COUNT(ko.id) as total_orders,
          AVG(
            CASE 
              WHEN ko.completed_at IS NOT NULL AND ko.started_at IS NOT NULL 
              THEN EXTRACT(EPOCH FROM (ko.completed_at - ko.started_at))/60 
              ELSE NULL 
            END
          ) as avg_preparation_time,
          COUNT(CASE WHEN ko.status = 'served' THEN 1 END) as completed_orders,
          COUNT(CASE WHEN ko.status = 'cancelled' THEN 1 END) as cancelled_orders,
          DATE_TRUNC('day', ko.created_at) as date
        FROM kitchen_orders ko
        WHERE ko.assigned_chef_id = :id 
          AND ko.created_at >= CURRENT_DATE - INTERVAL '30 days'
        GROUP BY DATE_TRUNC('day', ko.created_at)
        ORDER BY date DESC
        LIMIT 30
      `, {
        replacements: { id },
        type: QueryTypes.SELECT
      });

      // Get popular dishes prepared by this staff
      const popularDishes = await sequelize.query(`
        SELECT 
          p.name as dish_name,
          COUNT(koi.id) as times_prepared,
          AVG(koi.quantity) as avg_quantity
        FROM kitchen_order_items koi
        JOIN kitchen_orders ko ON koi.order_id = ko.id
        JOIN products p ON koi.product_id = p.id
        WHERE ko.assigned_chef_id = :id
          AND ko.status = 'served'
          AND ko.created_at >= CURRENT_DATE - INTERVAL '30 days'
        GROUP BY p.id, p.name
        ORDER BY times_prepared DESC
        LIMIT 10
      `, {
        replacements: { id },
        type: QueryTypes.SELECT
      });

      // Calculate performance score
      const totalOrders = performanceData.reduce((sum: number, day: any) => sum + parseInt(day.total_orders), 0);
      const completedOrders = performanceData.reduce((sum: number, day: any) => sum + parseInt(day.completed_orders), 0);
      const cancelledOrders = performanceData.reduce((sum: number, day: any) => sum + parseInt(day.cancelled_orders), 0);
      const avgPrepTime = performanceData.reduce((sum: number, day: any) => sum + (parseFloat(day.avg_preparation_time) || 0), 0) / performanceData.length || 0;
      
      const completionRate = totalOrders > 0 ? (completedOrders / totalOrders) * 100 : 0;
      const cancellationRate = totalOrders > 0 ? (cancelledOrders / totalOrders) * 100 : 0;
      
      // Performance score calculation (0-100)
      const performanceScore = Math.round(
        (completionRate * 0.5) + // 50% weight for completion
        ((100 - Math.min(avgPrepTime * 2, 100)) * 0.3) + // 30% weight for speed
        ((100 - cancellationRate) * 0.2) // 20% weight for low cancellation
      );

      return res.status(200).json({
        success: true,
        data: {
          staff,
          performance: {
            score: Math.max(0, Math.min(100, performanceScore)),
            totalOrders,
            completedOrders,
            cancelledOrders,
            avgPrepTime: Math.round(avgPrepTime || 0),
            completionRate: Math.round(completionRate),
            cancellationRate: Math.round(cancellationRate)
          },
          dailyData: performanceData,
          popularDishes
        }
      });
    }

  } catch (error: any) {
    console.error('Error in staff performance API:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
}
