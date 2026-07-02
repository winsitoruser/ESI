import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../auth/[...nextauth]';
import { Pool } from 'pg';

export default async function handler(req, res) {
  const session = await getServerSession(req, res, authOptions);

  if (!session) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    // Check if table exists first
    const tableCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'inventory_transfers'
      )
    `);

    if (!tableCheck.rows[0].exists) {
      await pool.end();
      return res.status(200).json({
        success: true,
        data: {
          total_transfers: 0,
          by_status: {},
          by_priority: {},
          total_value: 0,
          avg_value: 0,
          recent_count: 0,
          avg_transfer_days: '0.0',
          success_rate: 0
        }
      });
    }

    // Total transfers
    const totalResult = await pool.query(
      'SELECT COUNT(*) as total FROM inventory_transfers'
    );

    // By status
    const statusResult = await pool.query(`
      SELECT 
        status,
        COUNT(*) as count
      FROM inventory_transfers
      GROUP BY status
    `);

    // By priority
    const priorityResult = await pool.query(`
      SELECT 
        priority,
        COUNT(*) as count
      FROM inventory_transfers
      GROUP BY priority
    `);

    // Total value
    const valueResult = await pool.query(`
      SELECT 
        SUM(total_cost) as total_value,
        AVG(total_cost) as avg_value
      FROM inventory_transfers
      WHERE status NOT IN ('rejected', 'cancelled')
    `);

    // Recent transfers (last 7 days)
    const recentResult = await pool.query(`
      SELECT COUNT(*) as recent_count
      FROM inventory_transfers
      WHERE request_date >= CURRENT_DATE - INTERVAL '7 days'
    `);

    // Average transfer time (from request to completion)
    const timeResult = await pool.query(`
      SELECT 
        AVG(EXTRACT(EPOCH FROM (received_date - request_date))/86400) as avg_days
      FROM inventory_transfers
      WHERE status = 'completed' AND received_date IS NOT NULL
    `);

    // Success rate
    const successResult = await pool.query(`
      SELECT 
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed,
        COUNT(CASE WHEN status IN ('rejected', 'cancelled') THEN 1 END) as failed,
        COUNT(*) as total
      FROM inventory_transfers
    `);

    await pool.end();

    const byStatus = {};
    statusResult.rows.forEach(row => {
      byStatus[row.status] = parseInt(row.count);
    });

    const byPriority = {};
    priorityResult.rows.forEach(row => {
      byPriority[row.priority] = parseInt(row.count);
    });

    const successRate = successResult.rows[0].total > 0
      ? (successResult.rows[0].completed / successResult.rows[0].total * 100).toFixed(1)
      : 0;

    return res.status(200).json({
      success: true,
      data: {
        total_transfers: parseInt(totalResult.rows[0].total),
        by_status: byStatus,
        by_priority: byPriority,
        total_value: parseFloat(valueResult.rows[0].total_value || 0),
        avg_value: parseFloat(valueResult.rows[0].avg_value || 0),
        recent_count: parseInt(recentResult.rows[0].recent_count),
        avg_transfer_days: parseFloat(timeResult.rows[0].avg_days || 0).toFixed(1),
        success_rate: parseFloat(successRate)
      }
    });

  } catch (error) {
    console.error('Transfer stats error:', error);
    await pool.end();
    return res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
}
