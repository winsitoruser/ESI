import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../auth/[...nextauth]';
import { Pool } from 'pg';

export default async function handler(req, res) {
  const session = await getServerSession(req, res, authOptions);

  if (!session) {
    return res.status(401).json({ error: 'Unauthorized' });
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
        data: [],
        pagination: {
          total: 0,
          page: 1,
          limit: 10,
          total_pages: 0
        }
      });
    }

    if (req.method === 'GET') {
      // List RAC requests with pagination and filters
      const {
        page = 1,
        limit = 20,
        status,
        priority,
        request_type,
        from_location,
        to_location,
        search,
        start_date,
        end_date,
        sort_by = 'request_date',
        sort_order = 'desc'
      } = req.query;

      const offset = (parseInt(page) - 1) * parseInt(limit);

      // Build WHERE clause
      const conditions = [];
      const params = [];
      let paramCount = 1;

      if (status) {
        conditions.push(`r.status = $${paramCount}`);
        params.push(status);
        paramCount++;
      }

      if (priority) {
        conditions.push(`r.priority = $${paramCount}`);
        params.push(priority);
        paramCount++;
      }

      if (request_type) {
        conditions.push(`r.request_type = $${paramCount}`);
        params.push(request_type);
        paramCount++;
      }

      if (from_location) {
        conditions.push(`r.from_location_id = $${paramCount}`);
        params.push(from_location);
        paramCount++;
      }

      if (to_location) {
        conditions.push(`r.to_location_id = $${paramCount}`);
        params.push(to_location);
        paramCount++;
      }

      if (search) {
        conditions.push(`(r.request_number ILIKE $${paramCount} OR r.reason ILIKE $${paramCount})`);
        params.push(`%${search}%`);
        paramCount++;
      }

      if (start_date) {
        conditions.push(`r.request_date >= $${paramCount}`);
        params.push(start_date);
        paramCount++;
      }

      if (end_date) {
        conditions.push(`r.request_date <= $${paramCount}`);
        params.push(end_date);
        paramCount++;
      }

      const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

      // Get total count
      const countResult = await pool.query(
        `SELECT COUNT(*) as total FROM rac_requests r ${whereClause}`,
        params
      );

      const total = parseInt(countResult.rows[0].total);
      const totalPages = Math.ceil(total / parseInt(limit));

      // Get requests with items count
      const validSortColumns = ['request_date', 'required_date', 'status', 'priority', 'request_number'];
      const sortColumn = validSortColumns.includes(sort_by) ? sort_by : 'request_date';
      const sortDirection = sort_order === 'asc' ? 'ASC' : 'DESC';

      params.push(parseInt(limit));
      params.push(offset);

      const result = await pool.query(
        `SELECT 
          r.*,
          (SELECT COUNT(*) FROM rac_request_items WHERE request_id = r.id) as items_count,
          (SELECT SUM(requested_qty) FROM rac_request_items WHERE request_id = r.id) as total_qty_requested
        FROM rac_requests r
        ${whereClause}
        ORDER BY r.${sortColumn} ${sortDirection}
        LIMIT $${paramCount} OFFSET $${paramCount + 1}`,
        params
      );

      await pool.end();

      return res.status(200).json({
        success: true,
        data: result.rows,
        pagination: {
          total,
          page: parseInt(page),
          limit: parseInt(limit),
          total_pages: totalPages
        }
      });

    } else if (req.method === 'POST') {
      // Create new RAC request
      const {
        request_type,
        from_location_id,
        to_location_id,
        required_date,
        priority,
        reason,
        notes,
        items
      } = req.body;

      // Validation
      if (!request_type || !from_location_id || !to_location_id || !required_date || !reason) {
        await pool.end();
        return res.status(400).json({
          error: 'Missing required fields',
          required: ['request_type', 'from_location_id', 'to_location_id', 'required_date', 'reason']
        });
      }

      if (!items || items.length === 0) {
        await pool.end();
        return res.status(400).json({
          error: 'At least one item is required'
        });
      }

      if (from_location_id === to_location_id) {
        await pool.end();
        return res.status(400).json({
          error: 'From and to locations must be different'
        });
      }

      // Generate request number
      const year = new Date().getFullYear();
      const countResult = await pool.query(
        `SELECT COUNT(*) as count FROM rac_requests WHERE EXTRACT(YEAR FROM request_date) = $1`,
        [year]
      );
      const sequence = parseInt(countResult.rows[0].count) + 1;
      const requestNumber = `RAC-${year}-${sequence.toString().padStart(4, '0')}`;

      // Insert request
      const requestResult = await pool.query(
        `INSERT INTO rac_requests (
          request_number, request_type, from_location_id, to_location_id,
          required_date, priority, reason, notes, requested_by, status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING *`,
        [
          requestNumber,
          request_type,
          from_location_id,
          to_location_id,
          required_date,
          priority || 'medium',
          reason,
          notes,
          session.user.email || session.user.name,
          'submitted'
        ]
      );

      const requestId = requestResult.rows[0].id;

      // Insert items
      for (const item of items) {
        await pool.query(
          `INSERT INTO rac_request_items (
            request_id, product_id, product_name, product_sku,
            current_stock, requested_qty, unit, urgency, notes
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
          [
            requestId,
            item.product_id,
            item.product_name,
            item.product_sku,
            item.current_stock || 0,
            item.requested_qty,
            item.unit || 'pcs',
            item.urgency || 'normal',
            item.notes
          ]
        );
      }

      // Add history
      await pool.query(
        `INSERT INTO rac_request_history (request_id, status_from, status_to, changed_by, notes)
         VALUES ($1, $2, $3, $4, $5)`,
        [requestId, null, 'submitted', session.user.email || session.user.name, 'Request created']
      );

      await pool.end();

      return res.status(201).json({
        success: true,
        message: 'RAC request created successfully',
        data: requestResult.rows[0]
      });

    } else {
      await pool.end();
      return res.status(405).json({ error: 'Method not allowed' });
    }

  } catch (error) {
    console.error('RAC request error:', error);
    await pool.end();
    return res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
}
