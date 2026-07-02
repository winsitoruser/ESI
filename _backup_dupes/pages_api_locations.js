import { getServerSession } from 'next-auth/next';
import { authOptions } from './auth/[...nextauth]';
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
    // Check if locations table exists
    const tableCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'locations'
      )
    `);

    if (!tableCheck.rows[0].exists) {
      await pool.end();
      return res.status(500).json({
        success: false,
        error: 'Locations table does not exist - please run migrations'
      });
    }

    // Get locations from database
    const result = await pool.query(`
      SELECT id, name, code, type, address, city, phone, manager, is_active, created_at, updated_at
      FROM locations
      WHERE is_active = true
      ORDER BY name ASC
    `);

    await pool.end();

    return res.status(200).json({
      success: true,
      data: result.rows
    });

  } catch (error) {
    console.error('Locations API error:', error);
    await pool.end();
    
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch locations',
      details: error.message
    });
  }
}
