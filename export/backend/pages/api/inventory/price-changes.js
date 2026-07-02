const db = require('../../../models');
const { Product } = db;

/**
 * GET /api/inventory/price-changes
 * POST /api/inventory/price-changes
 * 
 * Tracks and retrieves product price changes
 * Note: Requires price_history table to be created via migration
 */
export default async function handler(req, res) {
  if (req.method === 'GET') {
    return handleGet(req, res);
  } else if (req.method === 'POST') {
    return handlePost(req, res);
  } else {
    return res.status(405).json({
      success: false,
      message: 'Method not allowed'
    });
  }
}

async function handleGet(req, res) {
  try {
    const { limit = 50, days = 30, type } = req.query;

    // Calculate date range
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days));

    // Check if price_history table exists
    const tableExists = await checkTableExists('price_history');
    
    if (!tableExists) {
      // Return empty data with message
      return res.status(200).json({
        success: true,
        data: [],
        total: 0,
        message: 'Price history table not yet created. Run migration to enable this feature.',
        table_exists: false
      });
    }

    // Query price_history table
    const query = `
      SELECT 
        ph.id,
        ph.product_id,
        p.name as product_name,
        p.sku,
        ph.old_price,
        ph.new_price,
        ph.change_percentage,
        ph.change_reason,
        ph.changed_by,
        ph.change_date,
        ph.created_at
      FROM price_history ph
      LEFT JOIN products p ON ph.product_id = p.id
      WHERE ph.change_date >= :startDate
      ${type ? "AND (CASE WHEN ph.change_percentage > 0 THEN 'increase' ELSE 'decrease' END) = :type" : ''}
      ORDER BY ph.change_date DESC
      LIMIT :limit
    `;

    const priceChanges = await db.sequelize.query(query, {
      replacements: { 
        startDate: startDate.toISOString(),
        limit: parseInt(limit),
        type: type
      },
      type: db.Sequelize.QueryTypes.SELECT
    });

    // Format response
    const formattedChanges = priceChanges.map(change => ({
      id: change.id,
      product_id: change.product_id,
      product_name: change.product_name,
      sku: change.sku,
      old_price: parseFloat(change.old_price),
      new_price: parseFloat(change.new_price),
      change_percentage: parseFloat(change.change_percentage),
      change_type: parseFloat(change.change_percentage) > 0 ? 'increase' : 'decrease',
      change_reason: change.change_reason,
      changed_by: change.changed_by,
      change_date: change.change_date,
      created_at: change.created_at
    }));

    return res.status(200).json({
      success: true,
      data: formattedChanges,
      total: formattedChanges.length,
      table_exists: true
    });

  } catch (error) {
    console.error('Price Changes GET Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}

async function handlePost(req, res) {
  try {
    const { product_id, old_price, new_price, change_reason, changed_by } = req.body;

    // Validate required fields
    if (!product_id || old_price === undefined || new_price === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: product_id, old_price, new_price'
      });
    }

    // Check if price_history table exists
    const tableExists = await checkTableExists('price_history');
    
    if (!tableExists) {
      return res.status(400).json({
        success: false,
        message: 'Price history table not yet created. Run migration first.',
        table_exists: false
      });
    }

    // Calculate change percentage
    const changePercentage = ((new_price - old_price) / old_price) * 100;

    // Insert into price_history
    const query = `
      INSERT INTO price_history 
        (product_id, old_price, new_price, change_percentage, change_reason, changed_by, change_date, created_at)
      VALUES 
        (:product_id, :old_price, :new_price, :change_percentage, :change_reason, :changed_by, NOW(), NOW())
      RETURNING *
    `;

    const [result] = await db.sequelize.query(query, {
      replacements: {
        product_id,
        old_price,
        new_price,
        change_percentage: changePercentage.toFixed(2),
        change_reason: change_reason || null,
        changed_by: changed_by || 'System'
      },
      type: db.Sequelize.QueryTypes.INSERT
    });

    return res.status(201).json({
      success: true,
      data: result,
      message: 'Price change recorded successfully'
    });

  } catch (error) {
    console.error('Price Changes POST Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}

// Helper function to check if table exists
async function checkTableExists(tableName) {
  try {
    const query = `
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = :tableName
      )
    `;
    
    const [result] = await db.sequelize.query(query, {
      replacements: { tableName },
      type: db.Sequelize.QueryTypes.SELECT
    });
    
    return result.exists;
  } catch (error) {
    console.error('Error checking table existence:', error);
    return false;
  }
}
