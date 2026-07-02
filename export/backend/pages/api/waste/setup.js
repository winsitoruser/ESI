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
            AND table_name = 'wastes'
          );
        `);

        if (checkTable.rows[0].exists) {
          return res.status(200).json({
            success: true,
            message: 'Table wastes already exists',
            alreadyExists: true
          });
        }

        // Create wastes table
        await pool.query(`
          CREATE TABLE wastes (
            id SERIAL PRIMARY KEY,
            waste_number VARCHAR(50) UNIQUE NOT NULL,
            product_id INTEGER,
            product_name VARCHAR(255),
            product_sku VARCHAR(100),
            waste_type VARCHAR(50) NOT NULL CHECK (waste_type IN ('finished_product', 'raw_material', 'packaging', 'production_defect')),
            quantity DECIMAL(10,2) NOT NULL,
            unit VARCHAR(20) NOT NULL,
            cost_value DECIMAL(15,2) NOT NULL,
            reason TEXT NOT NULL,
            disposal_method VARCHAR(50) NOT NULL CHECK (disposal_method IN ('disposal', 'donation', 'clearance_sale', 'recycling')),
            clearance_price DECIMAL(15,2),
            waste_date TIMESTAMP NOT NULL,
            status VARCHAR(20) NOT NULL DEFAULT 'recorded' CHECK (status IN ('recorded', 'disposed', 'processed')),
            notes TEXT,
            created_by VARCHAR(100) NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          );
        `);

        // Create indexes
        await pool.query(`CREATE INDEX idx_wastes_waste_number ON wastes(waste_number);`);
        await pool.query(`CREATE INDEX idx_wastes_product_id ON wastes(product_id);`);
        await pool.query(`CREATE INDEX idx_wastes_waste_type ON wastes(waste_type);`);
        await pool.query(`CREATE INDEX idx_wastes_waste_date ON wastes(waste_date);`);
        await pool.query(`CREATE INDEX idx_wastes_status ON wastes(status);`);

        await pool.end();

        return res.status(201).json({
          success: true,
          message: 'Table wastes created successfully with indexes',
          created: true
        });
      } catch (dbError) {
        await pool.end();
        throw dbError;
      }
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Waste Setup API Error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      message: error.message,
      detail: error.detail || 'Check database connection and permissions'
    });
  }
}
