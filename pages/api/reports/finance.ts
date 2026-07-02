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

    const { startDate, endDate, format } = req.query;
    const { PosTransaction, FinanceTransaction } = db;

    const end = endDate ? new Date(endDate as string) : new Date();
    const start = startDate ? new Date(startDate as string) : new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000);

    const dateFilter = { [Op.between]: [start, end] };

    // Get income from POS transactions
    const posTransactions = await PosTransaction.findAll({
      where: { createdAt: dateFilter, status: 'completed' }
    });

    const totalIncome = posTransactions.reduce((sum: number, t: any) => 
      sum + parseFloat(t.grandTotal || 0), 0);
    const totalTax = posTransactions.reduce((sum: number, t: any) => 
      sum + parseFloat(t.tax || 0), 0);

    // Get expenses
    const expenses = await FinanceTransaction.findAll({
      where: { transactionDate: dateFilter, type: 'expense' }
    });

    const totalExpenses = expenses.reduce((sum: number, e: any) => 
      sum + parseFloat(e.amount || 0), 0);

    // Expense breakdown by category
    const expenseByCategory: any = {};
    expenses.forEach((e: any) => {
      const cat = e.category || 'Other';
      expenseByCategory[cat] = (expenseByCategory[cat] || 0) + parseFloat(e.amount || 0);
    });

    // Daily breakdown
    const dailyBreakdown: any = {};
    posTransactions.forEach((t: any) => {
      const day = new Date(t.createdAt).toISOString().split('T')[0];
      if (!dailyBreakdown[day]) {
        dailyBreakdown[day] = { date: day, income: 0, expenses: 0, profit: 0 };
      }
      dailyBreakdown[day].income += parseFloat(t.grandTotal || 0);
    });

    expenses.forEach((e: any) => {
      const day = new Date(e.transactionDate).toISOString().split('T')[0];
      if (!dailyBreakdown[day]) {
        dailyBreakdown[day] = { date: day, income: 0, expenses: 0, profit: 0 };
      }
      dailyBreakdown[day].expenses += parseFloat(e.amount || 0);
    });

    Object.values(dailyBreakdown).forEach((d: any) => {
      d.profit = d.income - d.expenses;
    });

    const netProfit = totalIncome - totalExpenses;
    const profitMargin = totalIncome > 0 ? (netProfit / totalIncome) * 100 : 0;

    const reportData = {
      period: { start, end },
      summary: {
        totalIncome,
        totalTax,
        totalExpenses,
        netProfit,
        profitMargin: Math.round(profitMargin * 100) / 100,
        transactionCount: posTransactions.length
      },
      expenseByCategory: Object.entries(expenseByCategory).map(([category, amount]) => ({
        category,
        amount
      })),
      dailyBreakdown: Object.values(dailyBreakdown).sort((a: any, b: any) => 
        a.date.localeCompare(b.date)),
      generatedAt: new Date()
    };

    if (format === 'csv') {
      const csvRows = [
        ['Date', 'Income', 'Expenses', 'Profit'],
        ...Object.values(dailyBreakdown).map((d: any) => [d.date, d.income, d.expenses, d.profit])
      ];
      const csv = csvRows.map(row => row.join(',')).join('\n');
      
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=finance-report.csv');
      return res.status(200).send(csv);
    }

    return res.status(200).json({
      success: true,
      data: reportData
    });
  } catch (error: any) {
    console.error('Finance Report API Error:', error);
    return res.status(500).json({ error: error.message });
  }
}
