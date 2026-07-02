import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';

const { Pool } = require('pg');

export default async function handler(req, res) {
  try {
    const session = await getServerSession(req, res, authOptions);
    
    if (!session) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (req.method === 'POST') {
      // Create PostgreSQL connection
      const pool = new Pool({
        user: process.env.DB_USER || 'postgres',
        host: process.env.DB_HOST || '127.0.0.1',
        database: process.env.DB_NAME || 'farmanesia_dev',
        password: process.env.DB_PASSWORD || 'postgres',
        port: process.env.DB_PORT || 5432,
      });

      try {
        // Check if table already exists
        const checkTable = await pool.query(`
          SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = 'returns'
          );
        `);

        if (checkTable.rows[0].exists) {
          await pool.end();
          return res.status(200).json({
            success: true,
            message: 'Table returns already exists',
            alreadyExists: true
          });
        }

        // Create returns table
        await pool.query(`
          CREATE TABLE returns (
            id SERIAL PRIMARY KEY,
            return_number VARCHAR(50) UNIQUE NOT NULL,
            transaction_id INTEGER,
            customer_name VARCHAR(255),
            customer_phone VARCHAR(50),
            product_id INTEGER,
            product_name VARCHAR(255) NOT NULL,
            product_sku VARCHAR(100),
            quantity DECIMAL(10,2) NOT NULL,
            unit VARCHAR(20) NOT NULL DEFAULT 'pcs',
            return_reason VARCHAR(50) NOT NULL CHECK (return_reason IN ('defective', 'expired', 'wrong_item', 'customer_request', 'damaged', 'other')),
            return_type VARCHAR(50) NOT NULL CHECK (return_type IN ('refund', 'exchange', 'store_credit')),
            condition VARCHAR(50) NOT NULL CHECK (condition IN ('unopened', 'opened', 'damaged', 'expired')),
            original_price DECIMAL(15,2) NOT NULL,
            refund_amount DECIMAL(15,2) NOT NULL,
            restocking_fee DECIMAL(15,2) NOT NULL DEFAULT 0,
            status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'completed', 'cancelled')),
            return_date TIMESTAMP NOT NULL,
            approval_date TIMESTAMP,
            completion_date TIMESTAMP,
            notes TEXT,
            images JSON,
            approved_by VARCHAR(100),
            created_by VARCHAR(100) NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          );
        `);

        // Create indexes
        await pool.query(`CREATE INDEX idx_returns_return_number ON returns(return_number);`);
        await pool.query(`CREATE INDEX idx_returns_transaction_id ON returns(transaction_id);`);
        await pool.query(`CREATE INDEX idx_returns_product_id ON returns(product_id);`);
        await pool.query(`CREATE INDEX idx_returns_status ON returns(status);`);
        await pool.query(`CREATE INDEX idx_returns_return_date ON returns(return_date);`);
        await pool.query(`CREATE INDEX idx_returns_customer_phone ON returns(customer_phone);`);

        await pool.end();

        return res.status(201).json({
          success: true,
          message: 'Table returns created successfully with indexes',
          created: true
        });
      } catch (dbError) {
        await pool.end();
        throw dbError;
      }
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Returns Setup API Error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      message: error.message,
      detail: error.detail || 'Check database connection and permissions'
    });
  }
}
