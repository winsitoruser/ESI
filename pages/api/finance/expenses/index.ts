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

    const { FinanceTransaction } = db;

    switch (req.method) {
      case 'GET':
        const { category, startDate, endDate, page = 1, limit = 20 } = req.query;
        const where: any = { type: 'expense' };

        if (category) where.category = category;
        if (startDate || endDate) {
          where.transactionDate = {};
          if (startDate) where.transactionDate[Op.gte] = new Date(startDate as string);
          if (endDate) where.transactionDate[Op.lte] = new Date(endDate as string);
        }

        const offset = (parseInt(page as string) - 1) * parseInt(limit as string);
        const { count, rows } = await FinanceTransaction.findAndCountAll({
          where,
          limit: parseInt(limit as string),
          offset,
          order: [['transactionDate', 'DESC']]
        });

        const totalExpenses = await FinanceTransaction.sum('amount', { where });

        return res.status(200).json({
          success: true,
          data: rows,
          summary: { totalExpenses: totalExpenses || 0, count },
          pagination: {
            total: count,
            page: parseInt(page as string),
            limit: parseInt(limit as string),
            totalPages: Math.ceil(count / parseInt(limit as string))
          }
        });

      case 'POST':
        const { amount, category: cat, description, transactionDate, paymentMethod, receiptUrl, notes } = req.body;

        if (!amount || !cat) {
          return res.status(400).json({ error: 'Amount and category are required' });
        }

        const expense = await FinanceTransaction.create({
          type: 'expense',
          amount,
          category: cat,
          description,
          transactionDate: transactionDate || new Date(),
          paymentMethod: paymentMethod || 'cash',
          receiptUrl,
          notes,
          status: 'completed',
          createdBy: (session.user as any).id
        });

        return res.status(201).json({
          success: true,
          message: 'Expense created',
          data: expense
        });

      default:
        return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error: any) {
    console.error('Expenses API Error:', error);
    return res.status(500).json({ error: error.message });
  }
}
