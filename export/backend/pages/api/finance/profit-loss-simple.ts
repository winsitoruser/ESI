import type { NextApiRequest, NextApiResponse } from 'next';
import db from '@/server/database/connection';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    const { method } = req;
    const { sequelize } = db;

    if (method === 'GET') {
      const { startDate, endDate } = req.query;
      
      const replacements: any = {
        startDate: startDate || new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0],
        endDate: endDate || new Date().toISOString().split('T')[0]
      };

      // Get income data
      const [incomeData] = await sequelize.query(`
        SELECT 
          category,
          COALESCE(SUM(amount), 0) as total
        FROM incomes
        WHERE date >= :startDate AND date <= :endDate
          AND status = 'completed'
        GROUP BY category
        ORDER BY total DESC
      `, { replacements });

      // Get expense data
      const [expenseData] = await sequelize.query(`
        SELECT 
          category,
          COALESCE(SUM(amount), 0) as total
        FROM expenses
        WHERE date >= :startDate AND date <= :endDate
          AND status = 'completed'
        GROUP BY category
        ORDER BY total DESC
      `, { replacements });

      // Calculate totals
      const [totals] = await sequelize.query(`
        SELECT 
          (SELECT COALESCE(SUM(amount), 0) FROM incomes 
           WHERE date >= :startDate AND date <= :endDate AND status = 'completed') as "totalIncome",
          (SELECT COALESCE(SUM(amount), 0) FROM expenses 
           WHERE date >= :startDate AND date <= :endDate AND status = 'completed') as "totalExpenses"
      `, { replacements });

      const totalIncome = parseFloat(totals[0].totalIncome);
      const totalExpenses = parseFloat(totals[0].totalExpenses);
      const netProfit = totalIncome - totalExpenses;
      const profitMargin = totalIncome > 0 ? (netProfit / totalIncome) * 100 : 0;

      return res.status(200).json({
        success: true,
        data: {
          period: {
            start: replacements.startDate,
            end: replacements.endDate
          },
          revenue: {
            items: incomeData,
            total: totalIncome
          },
          expenses: {
            items: expenseData,
            total: totalExpenses
          },
          summary: {
            totalIncome,
            totalExpenses,
            grossProfit: netProfit,
            netProfit,
            profitMargin: profitMargin.toFixed(2)
          }
        },
        message: 'Profit & Loss report generated successfully'
      });
    }

    return res.status(405).json({
      success: false,
      error: 'Method not allowed'
    });

  } catch (error: any) {
    console.error('Profit & Loss API Error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Internal server error'
    });
  }
}
