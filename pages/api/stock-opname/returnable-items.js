import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import { Pool } from 'pg';

export default async function handler(req, res) {
  const session = await getServerSession(req, res, authOptions);

  if (!session) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (req.method === 'GET') {
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
    });

    try {
      // Get stock opname items yang bisa di-retur (expired, rusak, dll)
      // Filter: status = 'completed', ada discrepancy (rusak/expired/hilang)
      const query = `
        SELECT 
          soi.id as item_id,
          soi.stock_opname_id,
          soi.product_id,
          soi.product_name,
          soi.product_sku,
          soi.system_qty,
          soi.actual_qty,
          soi.difference,
          soi.discrepancy_reason,
          soi.notes,
          soi.return_status,
          soi.condition,
          soi.unit_cost,
          soi.total_cost,
          so.opname_number,
          so.opname_date,
          so.location,
          so.status as opname_status,
          so.created_by,
          p.price as product_price,
          p.category as product_category
        FROM stock_opname_items soi
        INNER JOIN stock_opnames so ON soi.stock_opname_id = so.id
        LEFT JOIN products p ON soi.product_id = p.id
        WHERE so.status = 'completed'
        AND soi.return_status = 'not_returned'
        AND (
          soi.discrepancy_reason IN ('expired', 'damaged', 'defective', 'lost')
          OR soi.difference < 0
          OR soi.condition IN ('damaged', 'expired', 'defective')
        )
        ORDER BY so.opname_date DESC, soi.product_name ASC
        LIMIT 100
      `;

      const result = await pool.query(query);

      await pool.end();

      return res.status(200).json({
        success: true,
        data: result.rows,
        count: result.rows.length
      });

    } catch (error) {
      console.error('Error fetching returnable stock opname items:', error);
      await pool.end();
      return res.status(500).json({ 
        error: 'Internal server error',
        message: error.message 
      });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
