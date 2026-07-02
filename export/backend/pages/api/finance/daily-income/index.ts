import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/pages/api/auth/[...nextauth]';
const db = require('../../../../models');
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

    const { date, startDate, endDate, outletId } = req.query;
    const { PosTransaction, FinanceTransaction } = db;

    // Default to today
    let dateFilter: any = {};
    if (date) {
      const targetDate = new Date(date as string);
      const nextDay = new Date(targetDate);
      nextDay.setDate(nextDay.getDate() + 1);
      dateFilter = {
        createdAt: {
          [Op.gte]: targetDate,
          [Op.lt]: nextDay
        }
      };
    } else if (startDate && endDate) {
      dateFilter = {
        createdAt: {
          [Op.gte]: new Date(startDate as string),
          [Op.lte]: new Date(endDate as string)
        }
      };
    } else {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      dateFilter = {
        createdAt: {
          [Op.gte]: today,
          [Op.lt]: tomorrow
        }
      };
    }

    const where: any = { ...dateFilter, status: 'completed' };
    if (outletId) where.outletId = outletId;

    // Get POS transactions
    const transactions = await PosTransaction.findAll({ where });

    // Calculate totals
    const totalSales = transactions.reduce((sum: number, t: any) => sum + parseFloat(t.grandTotal || 0), 0);
    const totalTax = transactions.reduce((sum: number, t: any) => sum + parseFloat(t.tax || 0), 0);
    const totalDiscount = transactions.reduce((sum: number, t: any) => sum + parseFloat(t.discount || 0), 0);
    const netSales = totalSales - totalTax - totalDiscount;

    // Payment breakdown
    const paymentBreakdown = transactions.reduce((acc: any, t: any) => {
      const method = t.paymentMethod || 'cash';
      acc[method] = (acc[method] || 0) + parseFloat(t.grandTotal || 0);
      return acc;
    }, {});

    // Hourly breakdown
    const hourlyBreakdown = transactions.reduce((acc: any, t: any) => {
      const hour = new Date(t.createdAt).getHours();
      acc[hour] = (acc[hour] || 0) + parseFloat(t.grandTotal || 0);
      return acc;
    }, {});

    return res.status(200).json({
      success: true,
      data: {
        summary: {
          totalTransactions: transactions.length,
          totalSales,
          totalTax,
          totalDiscount,
          netSales,
          averageTransaction: transactions.length > 0 ? totalSales / transactions.length : 0
        },
        paymentBreakdown,
        hourlyBreakdown,
        transactions: transactions.slice(0, 50)
      }
    });
  } catch (error: any) {
    console.error('Daily Income API Error:', error);
    return res.status(500).json({ error: error.message });
  }
}
