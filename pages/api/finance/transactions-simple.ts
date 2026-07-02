import type { NextApiRequest, NextApiResponse } from 'next';
import db from '@/server/database/connection';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    if (req.method !== 'GET') {
      return res.status(405).json({
        success: false,
        error: 'Method not allowed'
      });
    }

    const { sequelize } = db;
    const { type, startDate, endDate, limit = '50' } = req.query;

    let query = `
      SELECT 
        'income' as type,
        id,
        date,
        amount,
        category,
        description,
        payment_method as "paymentMethod",
        status
      FROM incomes
      WHERE 1=1
    `;

    const replacements: any = {};

    if (type === 'income') {
      // Only incomes
    } else if (type === 'expense') {
      query = `
        SELECT 
          'expense' as type,
          id,
          date,
          amount,
          category,
          description,
          payment_method as "paymentMethod",
          status
        FROM expenses
        WHERE 1=1
      `;
    } else {
      // Both incomes and expenses
      query = `
        (SELECT 
          'income' as type,
          id,
          date,
          amount,
          category,
          description,
          payment_method as "paymentMethod",
          status
        FROM incomes
        WHERE 1=1
        ${startDate ? "AND date >= :startDate" : ""}
        ${endDate ? "AND date <= :endDate" : ""})
        UNION ALL
        (SELECT 
          'expense' as type,
          id,
          date,
          amount,
          category,
          description,
          payment_method as "paymentMethod",
          status
        FROM expenses
        WHERE 1=1
        ${startDate ? "AND date >= :startDate" : ""}
        ${endDate ? "AND date <= :endDate" : ""})
        ORDER BY date DESC
        LIMIT :limit
      `;
      
      if (startDate) replacements.startDate = startDate;
      if (endDate) replacements.endDate = endDate;
      replacements.limit = parseInt(limit as string);

      const [transactions] = await sequelize.query(query, { replacements });

      return res.status(200).json({
        success: true,
        data: transactions,
        message: 'Transactions retrieved successfully'
      });
    }

    if (startDate) {
      query += ` AND date >= :startDate`;
      replacements.startDate = startDate;
    }

    if (endDate) {
      query += ` AND date <= :endDate`;
      replacements.endDate = endDate;
    }

    query += ` ORDER BY date DESC LIMIT :limit`;
    replacements.limit = parseInt(limit as string);

    const [transactions] = await sequelize.query(query, { replacements });

    return res.status(200).json({
      success: true,
      data: transactions,
      message: 'Transactions retrieved successfully'
    });

  } catch (error: any) {
    console.error('Transactions API Error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Internal server error'
    });
  }
}
