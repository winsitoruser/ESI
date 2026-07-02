import type { NextApiRequest, NextApiResponse } from 'next';
import db from '@/server/database/connection';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    const { method } = req;

    if (method === 'GET') {
      const { sequelize } = db;
      
      // Simple query using raw SQL
      const [expenses] = await sequelize.query(`
        SELECT id, date, amount, category, description, 
               payment_method as "paymentMethod", status
        FROM expenses 
        WHERE status = 'completed'
        ORDER BY date DESC 
        LIMIT 20
      `);

      // Get summary
      const [summary] = await sequelize.query(`
        SELECT 
          COUNT(*) as count,
          SUM(amount) as total
        FROM expenses 
        WHERE status = 'completed'
      `);

      return res.status(200).json({
        success: true,
        data: expenses,
        summary: summary[0],
        message: 'Expenses retrieved successfully'
      });
    }

    if (method === 'POST') {
      const { sequelize } = db;
      const { date, amount, category, description, paymentMethod = 'cash' } = req.body;

      if (!date || !amount || !category) {
        return res.status(400).json({
          success: false,
          error: 'Missing required fields: date, amount, category'
        });
      }

      const id = require('crypto').randomUUID();
      const tenantId = '00000000-0000-0000-0000-000000000001';

      await sequelize.query(`
        INSERT INTO expenses (id, date, amount, category, description, payment_method, status, tenant_id, created_at, updated_at)
        VALUES (:id, :date, :amount, :category, :description, :paymentMethod, 'completed', :tenantId, NOW(), NOW())
      `, {
        replacements: { id, date, amount, category, description, paymentMethod, tenantId }
      });

      return res.status(201).json({
        success: true,
        data: { id, date, amount, category, description, paymentMethod, status: 'completed' },
        message: 'Expense created successfully'
      });
    }

    return res.status(405).json({
      success: false,
      error: 'Method not allowed'
    });

  } catch (error: any) {
    console.error('Expenses API Error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Internal server error'
    });
  }
}
