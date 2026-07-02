import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';

const { Pool } = require('pg');

export default async function handler(req, res) {
  try {
    const session = await getServerSession(req, res, authOptions);
    
    if (!session) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (req.method === 'GET') {
      const emptyStats = {
        success: true,
        data: {
          totalReturns: 0,
          pendingReturns: 0,
          approvedReturns: 0,
          completedReturns: 0,
          totalRefundAmount: 0,
          totalRestockingFee: 0,
          returnsByReason: [],
          returnsByType: [],
          returnsByStatus: []
        }
      };

      // Create PostgreSQL connection
      const pool = new Pool({
        user: process.env.DB_USER || 'postgres',
        host: process.env.DB_HOST || '127.0.0.1',
        database: process.env.DB_NAME || 'farmanesia_dev',
        password: process.env.DB_PASSWORD || 'postgres',
        port: process.env.DB_PORT || 5432,
      });

      try {
        // Check if returns table exists
        const tableCheck = await pool.query(`
          SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = 'returns'
          );
        `);
        
        if (!tableCheck.rows[0].exists) {
          console.log('Returns table does not exist yet');
          await pool.end();
          return res.status(200).json(emptyStats);
        }
      } catch (dbError) {
        console.error('Database connection error:', dbError);
        await pool.end();
        return res.status(200).json(emptyStats);
      }

      try {
        const { startDate, endDate } = req.query;
        
        let dateFilter = '';
        const params = [];
        
        if (startDate && endDate) {
          dateFilter = 'WHERE return_date BETWEEN $1 AND $2';
          params.push(startDate, endDate);
        }

        // Get total returns count
        const totalResult = await pool.query(
          `SELECT COUNT(*) as count FROM returns ${dateFilter}`,
          params
        );
        const totalReturns = parseInt(totalResult.rows[0].count);

        // Get counts by status
        const statusResult = await pool.query(
          `SELECT 
            COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending,
            COUNT(CASE WHEN status = 'approved' THEN 1 END) as approved,
            COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed
           FROM returns ${dateFilter}`,
          params
        );

        // Get total refund and restocking fee
        const financialResult = await pool.query(
          `SELECT 
            COALESCE(SUM(refund_amount), 0) as total_refund,
            COALESCE(SUM(restocking_fee), 0) as total_restocking
           FROM returns ${dateFilter}`,
          params
        );

        // Get returns by reason
        const reasonResult = await pool.query(
          `SELECT return_reason, COUNT(*) as count, COALESCE(SUM(refund_amount), 0) as total_amount
           FROM returns ${dateFilter} GROUP BY return_reason`,
          params
        );

        // Get returns by type
        const typeResult = await pool.query(
          `SELECT return_type, COUNT(*) as count, COALESCE(SUM(refund_amount), 0) as total_amount
           FROM returns ${dateFilter} GROUP BY return_type`,
          params
        );

        // Get returns by status
        const statusBreakdownResult = await pool.query(
          `SELECT status, COUNT(*) as count
           FROM returns ${dateFilter} GROUP BY status`,
          params
        );

        await pool.end();

        return res.status(200).json({
          success: true,
          data: {
            totalReturns,
            pendingReturns: parseInt(statusResult.rows[0].pending),
            approvedReturns: parseInt(statusResult.rows[0].approved),
            completedReturns: parseInt(statusResult.rows[0].completed),
            totalRefundAmount: parseFloat(financialResult.rows[0].total_refund),
            totalRestockingFee: parseFloat(financialResult.rows[0].total_restocking),
            returnsByReason: reasonResult.rows,
            returnsByType: typeResult.rows,
            returnsByStatus: statusBreakdownResult.rows
          }
        });
      } catch (queryError) {
        console.error('Query error:', queryError);
        await pool.end();
        return res.status(200).json(emptyStats);
      }
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Returns Stats API Error:', error);
    return res.status(200).json({
      success: true,
      data: {
        totalReturns: 0,
        pendingReturns: 0,
        approvedReturns: 0,
        completedReturns: 0,
        totalRefundAmount: 0,
        totalRestockingFee: 0,
        returnsByReason: [],
        returnsByType: [],
        returnsByStatus: []
      }
    });
  }
}
