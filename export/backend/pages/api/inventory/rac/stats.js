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
    // Check if table exists
    const tableCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'rac_requests'
      )
    `);

    if (!tableCheck.rows[0].exists) {
      await pool.end();
      return res.status(200).json({
        success: true,
        data: {
          total_requests: 0,
          by_status: {},
          by_priority: {},
          by_type: {},
          pending_count: 0,
          approved_count: 0,
          completed_count: 0,
          critical_count: 0
        }
      });
    }

    // Total requests
    const totalResult = await pool.query(
      'SELECT COUNT(*) as total FROM rac_requests'
    );

    // By status
    const statusResult = await pool.query(`
      SELECT status, COUNT(*) as count
      FROM rac_requests
      GROUP BY status
    `);

    // By priority
    const priorityResult = await pool.query(`
      SELECT priority, COUNT(*) as count
      FROM rac_requests
      GROUP BY priority
    `);

    // By type
    const typeResult = await pool.query(`
      SELECT request_type, COUNT(*) as count
      FROM rac_requests
      GROUP BY request_type
    `);

    // Recent requests (last 7 days)
    const recentResult = await pool.query(`
      SELECT COUNT(*) as recent_count
      FROM rac_requests
      WHERE request_date >= CURRENT_DATE - INTERVAL '7 days'
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

    const byType = {};
    typeResult.rows.forEach(row => {
      byType[row.request_type] = parseInt(row.count);
    });

    return res.status(200).json({
      success: true,
      data: {
        total_requests: parseInt(totalResult.rows[0].total),
        by_status: byStatus,
        by_priority: byPriority,
        by_type: byType,
        pending_count: (byStatus.draft || 0) + (byStatus.submitted || 0),
        approved_count: (byStatus.approved || 0) + (byStatus.processing || 0),
        completed_count: byStatus.completed || 0,
        critical_count: byPriority.critical || 0,
        recent_count: parseInt(recentResult.rows[0].recent_count)
      }
    });

  } catch (error) {
    console.error('RAC stats error:', error);
    await pool.end();
    return res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
}
