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
    
    if (!session) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

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
        if (req.method === 'GET') {
          return res.status(200).json(emptyResponse);
        }
        return res.status(503).json({ 
          error: 'Database table not ready',
          message: 'Table will be created automatically'
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
        const { page = 1, limit = 10, status, returnReason, startDate, endDate } = req.query;
        
        const offset = (parseInt(page) - 1) * parseInt(limit);
        
        let whereConditions = [];
        let params = [];
        let paramIndex = 1;
        
        if (status) {
          whereConditions.push(`status = $${paramIndex++}`);
          params.push(status);
        }
        
        if (returnReason) {
          whereConditions.push(`return_reason = $${paramIndex++}`);
          params.push(returnReason);
        }
        
        if (startDate && endDate) {
          whereConditions.push(`return_date BETWEEN $${paramIndex++} AND $${paramIndex++}`);
          params.push(startDate, endDate);
        }
        
        const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';
        
        // Get total count
        const countResult = await pool.query(
          `SELECT COUNT(*) as count FROM returns ${whereClause}`,
          params
        );
        const total = parseInt(countResult.rows[0].count);
        
        // Get paginated data
        const dataResult = await pool.query(
          `SELECT * FROM returns ${whereClause} 
           ORDER BY return_date DESC, created_at DESC 
           LIMIT $${paramIndex++} OFFSET $${paramIndex++}`,
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
          transactionId,
          customerName,
          customerPhone,
          productId,
          productName,
          productSku,
          quantity,
          unit,
          returnReason,
          returnType,
          condition,
          originalPrice,
          refundAmount,
          restockingFee,
          returnDate,
          notes,
          images,
          invoiceNumber,
          invoiceDate,
          distributorName,
          distributorPhone,
          purchaseDate,
          customReturnNumber,
          stockOpnameId,
          stockOpnameItemId,
          sourceType
        } = req.body;

        // Validate required fields
        if (!productName || !quantity || !returnReason || !returnType || !condition || !originalPrice || !refundAmount || !returnDate) {
          await pool.end();
          return res.status(400).json({ 
            error: 'Missing required fields',
            required: ['productName', 'quantity', 'returnReason', 'returnType', 'condition', 'originalPrice', 'refundAmount', 'returnDate']
          });
        }

        let returnNumber;

        // Check if custom return number is provided
        if (customReturnNumber && customReturnNumber.trim()) {
          returnNumber = customReturnNumber.trim();
          
          // Check if custom return number already exists
          const existingReturn = await pool.query(
            'SELECT id FROM returns WHERE return_number = $1',
            [returnNumber]
          );
          
          if (existingReturn.rows.length > 0) {
            await pool.end();
            return res.status(400).json({ 
              error: 'Return number already exists',
              message: `Nomor retur "${returnNumber}" sudah digunakan. Silakan gunakan nomor lain.`
            });
          }
        } else {
          // Auto-generate return number
          const lastReturnResult = await pool.query(
            'SELECT return_number FROM returns ORDER BY created_at DESC LIMIT 1'
          );

          if (lastReturnResult.rows.length > 0 && lastReturnResult.rows[0].return_number) {
            const lastNumber = parseInt(lastReturnResult.rows[0].return_number.split('-').pop());
            returnNumber = `RET-${new Date().getFullYear()}-${String(lastNumber + 1).padStart(4, '0')}`;
          } else {
            returnNumber = `RET-${new Date().getFullYear()}-0001`;
          }
        }

        // Insert new return record
        const insertResult = await pool.query(
          `INSERT INTO returns (
            return_number, transaction_id, customer_name, customer_phone,
            product_id, product_name, product_sku, quantity, unit,
            return_reason, return_type, condition, original_price,
            refund_amount, restocking_fee, status, return_date,
            notes, images, created_by,
            invoice_number, invoice_date, distributor_name, distributor_phone, purchase_date,
            stock_opname_id, stock_opname_item_id, source_type
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28)
          RETURNING *`,
          [
            returnNumber,
            transactionId || null,
            customerName || null,
            customerPhone || null,
            productId || null,
            productName,
            productSku || null,
            parseFloat(quantity),
            unit || 'pcs',
            returnReason,
            returnType,
            condition,
            parseFloat(originalPrice),
            parseFloat(refundAmount),
            parseFloat(restockingFee || 0),
            'pending',
            new Date(returnDate),
            notes || null,
            images ? JSON.stringify(images) : null,
            session.user.email || session.user.name,
            invoiceNumber || null,
            invoiceDate ? new Date(invoiceDate) : null,
            distributorName || null,
            distributorPhone || null,
            purchaseDate ? new Date(purchaseDate) : null,
            stockOpnameId || null,
            stockOpnameItemId || null,
            sourceType || 'manual'
          ]
        );

        // Update stock opname item status if from stock opname
        if (stockOpnameItemId) {
          await pool.query(
            `UPDATE stock_opname_items 
             SET return_status = 'returned', return_id = $1 
             WHERE id = $2`,
            [insertResult.rows[0].id, stockOpnameItemId]
          );
        }

        await pool.end();

        return res.status(201).json({
          success: true,
          message: 'Return record created successfully',
          data: insertResult.rows[0]
        });
      } catch (insertError) {
        console.error('Insert error:', insertError);
        await pool.end();
        return res.status(500).json({ 
          error: 'Failed to create return record',
          message: insertError.message 
        });
      }
    }

    await pool.end();
    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Returns API Error:', error);
    return res.status(200).json(emptyResponse);
  }
}
