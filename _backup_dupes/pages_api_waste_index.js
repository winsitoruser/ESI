import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';

const { Pool } = require('pg');

export default async function handler(req, res) {
  const emptyResponse = {
    success: true,
    data: [],
    pagination: { total: 0, page: 1, limit: 10, totalPages: 0 }
  };

  try {
    const session = await getServerSession(req, res, authOptions);
    
    // Allow access in development mode even without session
    if (!session && process.env.NODE_ENV !== 'development') {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Create PostgreSQL connection
    const pool = new Pool({
      user: process.env.DB_USER || 'postgres',
      host: process.env.DB_HOST || '127.0.0.1',
      database: process.env.DB_NAME || 'bedagang_dev',
      password: process.env.DB_PASSWORD || 'jakarta123',
      port: process.env.DB_PORT || 5432,
    });

    try {
      // Check if wastes table exists
      const tableCheck = await pool.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'wastes'
        );
      `);
      
      if (!tableCheck.rows[0].exists) {
        console.log('Wastes table does not exist yet');
        await pool.end();
        if (req.method === 'GET') {
          return res.status(200).json(emptyResponse);
        }
        return res.status(503).json({ 
          error: 'Database table not ready',
          message: 'Table will be created automatically on first page load'
        });
      }
    } catch (dbError) {
      console.error('Database connection error:', dbError);
      await pool.end();
      if (req.method === 'GET') {
        return res.status(200).json(emptyResponse);
      }
      return res.status(503).json({ 
        error: 'Database unavailable',
        message: 'Please check database connection'
      });
    }

    if (req.method === 'GET') {
      try {
        const { page = 1, limit = 10, status, wasteType, startDate, endDate } = req.query;
        
        const offset = (parseInt(page) - 1) * parseInt(limit);
        
        let whereConditions = [];
        let params = [];
        let paramIndex = 1;
        
        if (status) {
          whereConditions.push(`status = $${paramIndex++}`);
          params.push(status);
        }
        
        if (wasteType) {
          whereConditions.push(`waste_type = $${paramIndex++}`);
          params.push(wasteType);
        }
        
        if (startDate && endDate) {
          whereConditions.push(`waste_date BETWEEN $${paramIndex++} AND $${paramIndex++}`);
          params.push(startDate, endDate);
        }
        
        const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';
        
        // Get total count
        const countResult = await pool.query(
          `SELECT COUNT(*) as count FROM wastes ${whereClause}`,
          params
        );
        const total = parseInt(countResult.rows[0].count);
        
        // Get paginated data
        const dataResult = await pool.query(
          `SELECT * FROM wastes ${whereClause} ORDER BY waste_date DESC, created_at DESC LIMIT $${paramIndex++} OFFSET $${paramIndex++}`,
          [...params, parseInt(limit), offset]
        );
        
        const totalPages = Math.ceil(total / parseInt(limit));
        
        await pool.end();

        return res.status(200).json({
          success: true,
          data: dataResult.rows,
          pagination: {
            total,
            page: parseInt(page),
            limit: parseInt(limit),
            totalPages
          }
        });
      } catch (queryError) {
        console.error('Query error:', queryError);
        await pool.end();
        return res.status(200).json(emptyResponse);
      }
    }

    if (req.method === 'POST') {
      try {
        const {
          productId,
          productName,
          productSku,
          wasteType,
          quantity,
          unit,
          costValue,
          reason,
          disposalMethod,
          clearancePrice,
          wasteDate,
          notes
        } = req.body;

        if (!wasteType || !quantity || !unit || !costValue || !reason || !disposalMethod || !wasteDate) {
          await pool.end();
          return res.status(400).json({ 
            error: 'Missing required fields',
            required: ['wasteType', 'quantity', 'unit', 'costValue', 'reason', 'disposalMethod', 'wasteDate']
          });
        }

        // Get last waste number
        const lastWasteResult = await pool.query(
          'SELECT waste_number FROM wastes ORDER BY created_at DESC LIMIT 1'
        );

        let wasteNumber;
        if (lastWasteResult.rows.length > 0 && lastWasteResult.rows[0].waste_number) {
          const lastNumber = parseInt(lastWasteResult.rows[0].waste_number.split('-').pop());
          wasteNumber = `WST-${new Date().getFullYear()}-${String(lastNumber + 1).padStart(4, '0')}`;
        } else {
          wasteNumber = `WST-${new Date().getFullYear()}-0001`;
        }

        // Insert new waste record
        const insertResult = await pool.query(
          `INSERT INTO wastes (
            waste_number, product_id, product_name, product_sku, waste_type,
            quantity, unit, cost_value, reason, disposal_method, clearance_price,
            waste_date, status, notes, created_by
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
          RETURNING *`,
          [
            wasteNumber,
            productId || null,
            productName || null,
            productSku || null,
            wasteType,
            parseFloat(quantity),
            unit,
            parseFloat(costValue),
            reason,
            disposalMethod,
            clearancePrice ? parseFloat(clearancePrice) : null,
            new Date(wasteDate),
            disposalMethod === 'clearance_sale' ? 'recorded' : 'disposed',
            notes || null,
            session?.user?.email || session?.user?.name || 'system'
          ]
        );

        await pool.end();

        return res.status(201).json({
          success: true,
          message: 'Waste record created successfully',
          data: insertResult.rows[0]
        });
      } catch (insertError) {
        console.error('Insert error:', insertError);
        await pool.end();
        return res.status(500).json({ 
          error: 'Failed to create waste record',
          message: insertError.message 
        });
      }
    }

    await pool.end();
    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Waste API Error:', error);
    return res.status(200).json(emptyResponse);
  }
}
