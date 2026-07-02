import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../auth/[...nextauth]';
import pool from '@/lib/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const session = await getServerSession(req, res, authOptions);
    if (!session) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    if (req.method !== 'GET') {
      return res.status(405).json({ success: false, error: 'Method not allowed' });
    }

    // Get counts for all master data
    const categoriesCount = await pool.query('SELECT COUNT(*) as count FROM categories WHERE is_active = true');
    const suppliersCount = await pool.query('SELECT COUNT(*) as count FROM suppliers WHERE is_active = true');
    const unitsCount = await pool.query('SELECT COUNT(*) as count FROM units WHERE is_active = true');
    const brandsCount = await pool.query('SELECT COUNT(*) as count FROM brands WHERE is_active = true');
    const warehousesCount = await pool.query('SELECT COUNT(*) as count FROM warehouses WHERE is_active = true');
    const locationsCount = await pool.query('SELECT COUNT(*) as count FROM storage_locations WHERE is_active = true');
    const manufacturersCount = await pool.query('SELECT COUNT(*) as count FROM manufacturers WHERE is_active = true');
    const tagsCount = await pool.query('SELECT COUNT(*) as count FROM tags WHERE is_active = true');

    // Get recent activities
    const recentActivities = await pool.query(`
      SELECT 'category' as type, name as item_name, updated_at as activity_time
      FROM categories
      WHERE updated_at > NOW() - INTERVAL '7 days'
      UNION ALL
      SELECT 'supplier' as type, name as item_name, updated_at as activity_time
      FROM suppliers
      WHERE updated_at > NOW() - INTERVAL '7 days'
      UNION ALL
      SELECT 'unit' as type, name as item_name, updated_at as activity_time
      FROM units
      WHERE updated_at > NOW() - INTERVAL '7 days'
      UNION ALL
      SELECT 'brand' as type, name as item_name, updated_at as activity_time
      FROM brands
      WHERE updated_at > NOW() - INTERVAL '7 days'
      ORDER BY activity_time DESC
      LIMIT 10
    `);

    const summary = {
      categories: parseInt(categoriesCount.rows[0]?.count || 0),
      suppliers: parseInt(suppliersCount.rows[0]?.count || 0),
      units: parseInt(unitsCount.rows[0]?.count || 0),
      brands: parseInt(brandsCount.rows[0]?.count || 0),
      warehouses: parseInt(warehousesCount.rows[0]?.count || 0),
      locations: parseInt(locationsCount.rows[0]?.count || 0),
      manufacturers: parseInt(manufacturersCount.rows[0]?.count || 0),
      tags: parseInt(tagsCount.rows[0]?.count || 0),
      recentActivities: recentActivities.rows
    };

    return res.status(200).json({
      success: true,
      data: summary
    });
  } catch (error: any) {
    console.error('Error in master summary API:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}
