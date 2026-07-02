import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import { sequelize } from '@/lib/sequelizeClient';
import { QueryTypes } from 'sequelize';

/**
 * Report Summary API
 * Returns summary statistics for the main reports dashboard
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const session = await getServerSession(req, res, authOptions);

    if (!session || !session.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const tenantId = session.user.tenantId;
    const { startDate, endDate } = req.query;

    const start = startDate as string || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const end = endDate as string || new Date().toISOString().split('T')[0];

    // Get previous period for comparison
    const daysDiff = Math.ceil((new Date(end).getTime() - new Date(start).getTime()) / (1000 * 60 * 60 * 24));
    const prevStart = new Date(new Date(start).getTime() - daysDiff * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const prevEnd = new Date(new Date(end).getTime() - daysDiff * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    // 1. Get current period sales
    const [currentSales] = await sequelize.query(`
      SELECT 
        COALESCE(SUM(total_amount), 0) as total_sales,
        COUNT(*) as total_orders,
        COUNT(DISTINCT customer_id) as total_customers
      FROM pos_transactions pt
      WHERE pt.tenant_id = :tenantId
        AND pt.status = 'closed'
        AND DATE(pt.transaction_date) BETWEEN :start AND :end
    `, {
      replacements: { tenantId, start, end },
      type: QueryTypes.SELECT
    });

    // 2. Get previous period sales for comparison
    const [previousSales] = await sequelize.query(`
      SELECT 
        COALESCE(SUM(total_amount), 0) as total_sales,
        COUNT(*) as total_orders,
        COUNT(DISTINCT customer_id) as total_customers
      FROM pos_transactions pt
      WHERE pt.tenant_id = :tenantId
        AND pt.status = 'closed'
        AND DATE(pt.transaction_date) BETWEEN :prevStart AND :prevEnd
    `, {
      replacements: { tenantId, prevStart, prevEnd },
      type: QueryTypes.SELECT
    });

    // Calculate metrics
    const totalSales = parseFloat(currentSales.total_sales) || 0;
    const totalOrders = parseInt(currentSales.total_orders) || 0;
    const totalCustomers = parseInt(currentSales.total_customers) || 0;
    const avgOrderValue = totalOrders > 0 ? totalSales / totalOrders : 0;

    const prevTotalSales = parseFloat(previousSales.total_sales) || 0;
    const prevTotalOrders = parseInt(previousSales.total_orders) || 0;
    const prevTotalCustomers = parseInt(previousSales.total_customers) || 0;

    // Calculate percentage changes
    const salesChange = prevTotalSales > 0 ? ((totalSales - prevTotalSales) / prevTotalSales * 100) : 0;
    const ordersChange = prevTotalOrders > 0 ? ((totalOrders - prevTotalOrders) / prevTotalOrders * 100) : 0;
    const customersChange = prevTotalCustomers > 0 ? ((totalCustomers - prevTotalCustomers) / prevTotalCustomers * 100) : 0;

    const summary = {
      totalSales,
      totalOrders,
      totalCustomers,
      avgOrderValue,
      salesChange: parseFloat(salesChange.toFixed(1)),
      ordersChange: parseFloat(ordersChange.toFixed(1)),
      customersChange: parseFloat(customersChange.toFixed(1))
    };

    return res.status(200).json({
      success: true,
      data: summary
    });

  } catch (error: any) {
    console.error('Error fetching report summary:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
}
