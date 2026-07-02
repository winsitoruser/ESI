import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/pages/api/auth/[...nextauth]';
const db = require('../../../models');
const { Op } = require('sequelize');

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const session = await getServerSession(req, res, authOptions);
    if (!session) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (req.method !== 'GET') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    const { startDate, endDate, groupBy = 'day', outletId, format } = req.query;
    const { PosTransaction, PosTransactionItem, Product, Category } = db;

    // Default to last 30 days
    const end = endDate ? new Date(endDate as string) : new Date();
    const start = startDate ? new Date(startDate as string) : new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000);

    const where: any = {
      createdAt: { [Op.between]: [start, end] },
      status: 'completed'
    };
    if (outletId) where.outletId = outletId;

    // Get transactions
    const transactions = await PosTransaction.findAll({
      where,
      include: [{
        model: PosTransactionItem,
        as: 'items',
        include: [{ model: Product, as: 'product' }]
      }],
      order: [['createdAt', 'ASC']]
    });

    // Calculate summary
    const totalSales = transactions.reduce((sum: number, t: any) => sum + parseFloat(t.grandTotal || 0), 0);
    const totalTransactions = transactions.length;
    const totalItems = transactions.reduce((sum: number, t: any) => 
      sum + (t.items?.reduce((s: number, i: any) => s + (i.quantity || 0), 0) || 0), 0);

    // Group by period
    const salesByPeriod: any = {};
    transactions.forEach((t: any) => {
      let key: string;
      const date = new Date(t.createdAt);
      
      switch (groupBy) {
        case 'hour':
          key = `${date.toISOString().split('T')[0]} ${date.getHours()}:00`;
          break;
        case 'week':
          const weekStart = new Date(date);
          weekStart.setDate(date.getDate() - date.getDay());
          key = weekStart.toISOString().split('T')[0];
          break;
        case 'month':
          key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
          break;
        default:
          key = date.toISOString().split('T')[0];
      }

      if (!salesByPeriod[key]) {
        salesByPeriod[key] = { period: key, sales: 0, transactions: 0, items: 0 };
      }
      salesByPeriod[key].sales += parseFloat(t.grandTotal || 0);
      salesByPeriod[key].transactions += 1;
      salesByPeriod[key].items += t.items?.reduce((s: number, i: any) => s + (i.quantity || 0), 0) || 0;
    });

    // Top products
    const productSales: any = {};
    transactions.forEach((t: any) => {
      t.items?.forEach((item: any) => {
        const productId = item.productId;
        if (!productSales[productId]) {
          productSales[productId] = {
            productId,
            name: item.product?.name || 'Unknown',
            quantity: 0,
            revenue: 0
          };
        }
        productSales[productId].quantity += item.quantity || 0;
        productSales[productId].revenue += parseFloat(item.subtotal || 0);
      });
    });

    const topProducts = Object.values(productSales)
      .sort((a: any, b: any) => b.revenue - a.revenue)
      .slice(0, 10);

    // Payment methods breakdown
    const paymentMethods: any = {};
    transactions.forEach((t: any) => {
      const method = t.paymentMethod || 'cash';
      paymentMethods[method] = (paymentMethods[method] || 0) + parseFloat(t.grandTotal || 0);
    });

    const reportData = {
      period: { start, end },
      summary: {
        totalSales,
        totalTransactions,
        totalItems,
        averageTransaction: totalTransactions > 0 ? totalSales / totalTransactions : 0
      },
      salesByPeriod: Object.values(salesByPeriod),
      topProducts,
      paymentMethods,
      generatedAt: new Date()
    };

    // Handle export formats
    if (format === 'csv') {
      const csvRows = [
        ['Period', 'Sales', 'Transactions', 'Items'],
        ...Object.values(salesByPeriod).map((row: any) => 
          [row.period, row.sales, row.transactions, row.items]
        )
      ];
      const csv = csvRows.map(row => row.join(',')).join('\n');
      
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=sales-report.csv');
      return res.status(200).send(csv);
    }

    return res.status(200).json({
      success: true,
      data: reportData
    });
  } catch (error: any) {
    console.error('Sales Report API Error:', error);
    return res.status(500).json({ error: error.message });
  }
}
