import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../auth/[...nextauth]';
import { Op } from 'sequelize';

// Use dynamic import for CommonJS module
const getDb = () => require('../../../../models');

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const session = await getServerSession(req, res, authOptions);
    if (!session) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { 
      Transaction, 
      TransactionItem, 
      Product, 
      Category, 
      Customer, 
      Branch,
      User 
    } = getDb();

    const {
      startDate,
      endDate,
      reportType = 'overview',
      branchId = 'all'
    } = req.query;

    const start = new Date(startDate as string);
    const end = new Date(endDate as string);
    end.setHours(23, 59, 59, 999);

    // Build where clause
    const where: any = {
      createdAt: {
        [Op.between]: [start, end]
      }
    };

    if (branchId !== 'all') {
      where.branchId = branchId;
    }

    // Get previous period data for growth calculation
    const daysDiff = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    const prevStart = new Date(start);
    prevStart.setDate(prevStart.getDate() - daysDiff);
    const prevEnd = new Date(start);
    prevEnd.setDate(prevEnd.getDate() - 1);

    const prevWhere = { ...where };
    prevWhere.createdAt = {
      [Op.between]: [prevStart, prevEnd]
    };

    // Get current period data
    const [currentRevenue, currentOrders, currentCustomers, currentProducts] = await Promise.all([
      Transaction.sum('totalAmount', { where }),
      Transaction.count({ where }),
      Transaction.count({ 
        where, 
        distinct: true, 
        col: 'customerId',
        include: [{ model: Customer, as: 'customer' }]
      }),
      Product.count({ where: { isActive: true } })
    ]);

    // Get previous period data
    const [prevRevenue, prevOrders, prevCustomers] = await Promise.all([
      Transaction.sum('totalAmount', { where: prevWhere }),
      Transaction.count({ where: prevWhere }),
      Transaction.count({ 
        where: prevWhere, 
        distinct: true, 
        col: 'customerId',
        include: [{ model: Customer, as: 'customer' }]
      })
    ]);

    // Calculate growth percentages
    const revenueGrowth = prevRevenue ? ((currentRevenue - prevRevenue) / prevRevenue * 100) : 0;
    const orderGrowth = prevOrders ? ((currentOrders - prevOrders) / prevOrders * 100) : 0;
    const customerGrowth = prevCustomers ? ((currentCustomers - prevCustomers) / prevCustomers * 100) : 0;

    // Get top products
    const topProducts = await TransactionItem.findAll({
      attributes: [
        'productId',
        [getDb().sequelize.fn('SUM', getDb().sequelize.col('quantity')), 'unitsSold'],
        [getDb().sequelize.fn('SUM', getDb().sequelize.col('subtotal')), 'revenue']
      ],
      include: [{
        model: Product,
        as: 'product',
        attributes: ['name']
      }],
      where: {
        '$transaction.createdAt$': {
          [Op.between]: [start, end]
        }
      },
      group: ['productId', 'product.id'],
      order: [[getDb().sequelize.literal('revenue'), 'DESC']],
      limit: 10,
      raw: true
    });

    // Get sales by category
    const salesByCategory = await TransactionItem.findAll({
      attributes: [
        [getDb().sequelize.fn('SUM', getDb().sequelize.col('subtotal')), 'revenue']
      ],
      include: [
        {
          model: Product,
          as: 'product',
          attributes: [],
          include: [{
            model: Category,
            as: 'category',
            attributes: ['name']
          }]
        }
      ],
      where: {
        '$transaction.createdAt$': {
          [Op.between]: [start, end]
        }
      },
      group: ['product.category.id'],
      order: [[getDb().sequelize.literal('revenue'), 'DESC']],
      raw: true
    });

    // Get daily sales
    const dailySales = await Transaction.findAll({
      attributes: [
        [getDb().sequelize.fn('DATE', getDb().sequelize.col('createdAt')), 'date'],
        [getDb().sequelize.fn('SUM', getDb().sequelize.col('totalAmount')), 'revenue'],
        [getDb().sequelize.fn('COUNT', getDb().sequelize.col('id')), 'orders']
      ],
      where,
      group: [getDb().sequelize.fn('DATE', getDb().sequelize.col('createdAt'))],
      order: [[getDb().sequelize.fn('DATE', getDb().sequelize.col('createdAt')), 'ASC']],
      raw: true
    });

    // Get hourly sales pattern
    const hourlySales = await Transaction.findAll({
      attributes: [
        [getDb().sequelize.fn('EXTRACT', getDb().sequelize.literal('HOUR FROM "createdAt"')), 'hour'],
        [getDb().sequelize.fn('SUM', getDb().sequelize.col('totalAmount')), 'revenue'],
        [getDb().sequelize.fn('COUNT', getDb().sequelize.col('id')), 'orders']
      ],
      where,
      group: [getDb().sequelize.literal('EXTRACT(HOUR FROM "createdAt")')],
      order: [[getDb().sequelize.literal('hour'), 'ASC']],
      raw: true
    });

    // Format response data
    const analyticsData = {
      totalRevenue: currentRevenue || 0,
      totalOrders: currentOrders || 0,
      totalCustomers: currentCustomers || 0,
      totalProducts: currentProducts || 0,
      revenueGrowth: parseFloat(revenueGrowth.toFixed(2)),
      orderGrowth: parseFloat(orderGrowth.toFixed(2)),
      customerGrowth: parseFloat(customerGrowth.toFixed(2)),
      topProducts: topProducts.map((p: any) => ({
        name: p['product.name'],
        unitsSold: parseInt(p.unitsSold),
        revenue: parseFloat(p.revenue),
        growth: Math.random() * 40 - 10 // Mock growth for now
      })),
      salesByCategory: salesByCategory.map((s: any) => ({
        name: s['product.category.name'],
        revenue: parseFloat(s.revenue)
      })),
      dailySales: dailySales.map((d: any) => ({
        date: d.date,
        revenue: parseFloat(d.revenue),
        orders: parseInt(d.orders)
      })),
      hourlySales: hourlySales.map((h: any) => ({
        hour: parseInt(h.hour),
        revenue: parseFloat(h.revenue),
        orders: parseInt(h.orders)
      }))
    };

    return res.status(200).json({
      success: true,
      data: analyticsData
    });

  } catch (error: any) {
    console.error('Error fetching analytics:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch analytics',
      details: error.message
    });
  }
}
