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
        AND table_name = 'inventory_transfers'
      );
    `);

    if (!tableCheck.rows[0].exists) {
      await pool.end();
      return res.status(503).json({
        error: 'Database table not ready',
        message: 'Please run migration: 20260126000005-create-inventory-transfers.sql'
      });
    }

    if (req.method === 'GET') {
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
          data: [],
          pagination: {
            total: 0,
            page: 1,
            limit: 10,
            total_pages: 0
          }
        });
      }

      // List transfers with pagination and filters
      const {
        page = 1,
        limit = 10,
        status,
        from_location,
        to_location,
        priority,
        search,
        start_date,
        end_date,
        sort_by = 'request_date',
        sort_order = 'desc'
      } = req.query;

      const offset = (parseInt(page) - 1) * parseInt(limit);

      // Build WHERE clause
      let whereConditions = [];
      let queryParams = [];
      let paramIndex = 1;

      if (status && status !== 'all') {
        whereConditions.push(`t.status = $${paramIndex}`);
        queryParams.push(status);
        paramIndex++;
      }

      if (from_location) {
        whereConditions.push(`t.from_location_id = $${paramIndex}`);
        queryParams.push(parseInt(from_location));
        paramIndex++;
      }

      if (to_location) {
        whereConditions.push(`t.to_location_id = $${paramIndex}`);
        queryParams.push(parseInt(to_location));
        paramIndex++;
      }

      if (priority && priority !== 'all') {
        whereConditions.push(`t.priority = $${paramIndex}`);
        queryParams.push(priority);
        paramIndex++;
      }

      if (search) {
        whereConditions.push(`(
          t.transfer_number ILIKE $${paramIndex} OR
          t.requested_by ILIKE $${paramIndex} OR
          t.notes ILIKE $${paramIndex}
        )`);
        queryParams.push(`%${search}%`);
        paramIndex++;
      }

      if (start_date) {
        whereConditions.push(`t.request_date >= $${paramIndex}`);
        queryParams.push(start_date);
        paramIndex++;
      }

      if (end_date) {
        whereConditions.push(`t.request_date <= $${paramIndex}`);
        queryParams.push(end_date);
        paramIndex++;
      }

      const whereClause = whereConditions.length > 0
        ? 'WHERE ' + whereConditions.join(' AND ')
        : '';

      // Get total count
      const countQuery = `
        SELECT COUNT(*) as total
        FROM inventory_transfers t
        ${whereClause}
      `;
      const countResult = await pool.query(countQuery, queryParams);
      const total = parseInt(countResult.rows[0].total);

      // Get transfers with items count
      const dataQuery = `
        SELECT 
          t.*,
          (SELECT COUNT(*) FROM inventory_transfer_items WHERE transfer_id = t.id) as items_count
        FROM inventory_transfers t
        ${whereClause}
        ORDER BY t.${sort_by} ${sort_order.toUpperCase()}
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
      `;
      queryParams.push(parseInt(limit), offset);

      const dataResult = await pool.query(dataQuery, queryParams);

      await pool.end();

      return res.status(200).json({
        success: true,
        data: dataResult.rows,
        pagination: {
          total,
          page: parseInt(page),
          limit: parseInt(limit),
          total_pages: Math.ceil(total / parseInt(limit))
        }
      });
    }

    if (req.method === 'POST') {
      // Create new transfer request
      const {
        from_location_id,
        to_location_id,
        priority = 'normal',
        reason,
        items,
        shipping_cost = 0,
        notes
      } = req.body;

      // Validation
      if (!from_location_id || !to_location_id || !reason || !items || items.length === 0) {
        await pool.end();
        return res.status(400).json({
          error: 'Missing required fields',
          required: ['from_location_id', 'to_location_id', 'reason', 'items']
        });
      }

      if (from_location_id === to_location_id) {
        await pool.end();
        return res.status(400).json({
          error: 'Cannot transfer to same location'
        });
      }

      // Generate transfer number
      const lastTransferResult = await pool.query(
        'SELECT transfer_number FROM inventory_transfers ORDER BY created_at DESC LIMIT 1'
      );

      let transferNumber;
      if (lastTransferResult.rows.length > 0 && lastTransferResult.rows[0].transfer_number) {
        const lastNumber = parseInt(lastTransferResult.rows[0].transfer_number.split('-').pop());
        transferNumber = `TRF-${new Date().getFullYear()}-${String(lastNumber + 1).padStart(4, '0')}`;
      } else {
        transferNumber = `TRF-${new Date().getFullYear()}-0001`;
      }

      // Calculate total cost
      let totalCost = items.reduce((sum, item) => {
        return sum + (parseFloat(item.quantity) * parseFloat(item.unit_cost));
      }, 0);

      const handlingFee = totalCost * 0.02; // 2% handling fee
      totalCost += parseFloat(shipping_cost) + handlingFee;

      // Insert transfer
      const transferResult = await pool.query(`
        INSERT INTO inventory_transfers (
          transfer_number, from_location_id, to_location_id,
          priority, reason, status, total_cost, shipping_cost,
          handling_fee, notes, requested_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        RETURNING *
      `, [
        transferNumber,
        from_location_id,
        to_location_id,
        priority,
        reason,
        'requested',
        totalCost,
        shipping_cost,
        handlingFee,
        notes,
        session.user.email || session.user.name
      ]);

      const transferId = transferResult.rows[0].id;

      // Insert items
      for (const item of items) {
        const subtotal = parseFloat(item.quantity) * parseFloat(item.unit_cost);
        await pool.query(`
          INSERT INTO inventory_transfer_items (
            transfer_id, product_id, product_name, product_sku,
            quantity_requested, unit_cost, subtotal
          ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        `, [
          transferId,
          item.product_id,
          item.product_name,
          item.product_sku || null,
          item.quantity,
          item.unit_cost,
          subtotal
        ]);
      }

      // Insert history
      await pool.query(`
        INSERT INTO inventory_transfer_history (
          transfer_id, status_from, status_to, changed_by, notes
        ) VALUES ($1, $2, $3, $4, $5)
      `, [transferId, null, 'requested', session.user.email || session.user.name, 'Transfer request created']);

      await pool.end();

      return res.status(201).json({
        success: true,
        message: 'Transfer request created successfully',
        data: transferResult.rows[0]
      });
    }

    await pool.end();
    return res.status(405).json({ error: 'Method not allowed' });

  } catch (error) {
    console.error('Transfer API error:', error);
    await pool.end();
    return res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
}
