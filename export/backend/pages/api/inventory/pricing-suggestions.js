const db = require('../../../models');
const { Product, Stock } = db;

/**
 * GET /api/inventory/pricing-suggestions
 * POST /api/inventory/pricing-suggestions
 * 
 * AI-powered pricing suggestions based on cost, margin, competition, and sales trends
 */
export default async function handler(req, res) {
  if (req.method === 'GET') {
    return handleGet(req, res);
  } else if (req.method === 'POST') {
    return handlePost(req, res);
  } else if (req.method === 'PUT') {
    return handlePut(req, res);
  } else {
    return res.status(405).json({
      success: false,
      message: 'Method not allowed'
    });
  }
}

async function handleGet(req, res) {
  try {
    const { limit = 50, status = 'pending' } = req.query;

    // Check if pricing_suggestions table exists
    const tableExists = await checkTableExists('pricing_suggestions');
    
    if (!tableExists) {
      // Generate suggestions on-the-fly from products
      return await generateSuggestionsOnTheFly(req, res, limit);
    }

    // Query pricing_suggestions table
    const query = `
      SELECT 
        ps.id,
        ps.product_id,
        p.name as product_name,
        p.sku,
        ps.current_price,
        ps.suggested_price,
        ps.current_margin,
        ps.suggested_margin,
        ps.reason,
        ps.competitor_price,
        ps.market_price,
        ps.sales_trend,
        ps.status,
        ps.created_at
      FROM pricing_suggestions ps
      LEFT JOIN products p ON ps.product_id = p.id
      WHERE ps.status = :status
      ORDER BY ps.created_at DESC
      LIMIT :limit
    `;

    const suggestions = await db.sequelize.query(query, {
      replacements: { 
        status,
        limit: parseInt(limit)
      },
      type: db.Sequelize.QueryTypes.SELECT
    });

    return res.status(200).json({
      success: true,
      data: suggestions,
      total: suggestions.length,
      table_exists: true
    });

  } catch (error) {
    console.error('Pricing Suggestions GET Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}

async function generateSuggestionsOnTheFly(req, res, limit) {
  try {
    // Get products with stock and pricing data
    const products = await Product.findAll({
      where: { is_active: true },
      attributes: ['id', 'name', 'sku', 'sell_price', 'buy_price'],
      include: [{
        model: Stock,
        as: 'stock_data',
        attributes: ['quantity'],
        required: false
      }],
      limit: parseInt(limit)
    });

    const suggestions = products.map(product => {
      const currentPrice = parseFloat(product.sell_price) || 0;
      const costPrice = parseFloat(product.buy_price) || 0;
      
      if (currentPrice === 0 || costPrice === 0) {
        return null;
      }

      // Calculate current margin
      const currentMargin = ((currentPrice - costPrice) / currentPrice) * 100;

      // Simple pricing logic (can be enhanced with ML/AI)
      let suggestedPrice = currentPrice;
      let suggestedMargin = currentMargin;
      let reason = '';
      let salesTrend = 'stable';

      // Logic 1: If margin is too low (< 20%), suggest increase
      if (currentMargin < 20) {
        suggestedPrice = costPrice * 1.25; // 25% margin
        suggestedMargin = 25;
        reason = 'Margin terlalu rendah. Disarankan naikkan harga untuk profitabilitas lebih baik.';
        salesTrend = 'stable';
      }
      // Logic 2: If margin is very high (> 60%), suggest decrease to boost sales
      else if (currentMargin > 60) {
        suggestedPrice = costPrice * 1.40; // 40% margin
        suggestedMargin = 40;
        reason = 'Margin sangat tinggi. Turunkan harga sedikit untuk meningkatkan volume penjualan.';
        salesTrend = 'decreasing';
      }
      // Logic 3: Optimal margin range (30-40%)
      else if (currentMargin < 30) {
        suggestedPrice = costPrice * 1.35; // 35% margin
        suggestedMargin = 35;
        reason = 'Optimasi margin ke range ideal 30-40% untuk balance profit dan sales.';
        salesTrend = 'increasing';
      }

      // Skip if no change needed
      if (Math.abs(suggestedPrice - currentPrice) < 100) {
        return null;
      }

      return {
        id: `SUGG-${product.id}`,
        product_id: product.id,
        product_name: product.name,
        sku: product.sku,
        current_price: currentPrice,
        cost_price: costPrice,
        suggested_price: Math.round(suggestedPrice),
        current_margin: currentMargin.toFixed(2),
        suggested_margin: suggestedMargin.toFixed(2),
        reason: reason,
        competitor_price: null,
        market_price: null,
        sales_trend: salesTrend,
        status: 'pending'
      };
    }).filter(item => item !== null);

    return res.status(200).json({
      success: true,
      data: suggestions,
      total: suggestions.length,
      message: 'Generated suggestions on-the-fly. Run migration to enable persistent suggestions.',
      table_exists: false
    });

  } catch (error) {
    console.error('Generate Suggestions Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}

async function handlePost(req, res) {
  try {
    const { 
      product_id, 
      current_price, 
      suggested_price, 
      current_margin,
      suggested_margin,
      reason,
      competitor_price,
      market_price,
      sales_trend 
    } = req.body;

    // Validate required fields
    if (!product_id || !current_price || !suggested_price) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: product_id, current_price, suggested_price'
      });
    }

    // Check if pricing_suggestions table exists
    const tableExists = await checkTableExists('pricing_suggestions');
    
    if (!tableExists) {
      return res.status(400).json({
        success: false,
        message: 'Pricing suggestions table not yet created. Run migration first.',
        table_exists: false
      });
    }

    // Insert into pricing_suggestions
    const query = `
      INSERT INTO pricing_suggestions 
        (product_id, current_price, suggested_price, current_margin, suggested_margin, 
         reason, competitor_price, market_price, sales_trend, status, created_at, updated_at)
      VALUES 
        (:product_id, :current_price, :suggested_price, :current_margin, :suggested_margin,
         :reason, :competitor_price, :market_price, :sales_trend, 'pending', NOW(), NOW())
      RETURNING *
    `;

    const [result] = await db.sequelize.query(query, {
      replacements: {
        product_id,
        current_price,
        suggested_price,
        current_margin: current_margin || null,
        suggested_margin: suggested_margin || null,
        reason: reason || null,
        competitor_price: competitor_price || null,
        market_price: market_price || null,
        sales_trend: sales_trend || 'stable'
      },
      type: db.Sequelize.QueryTypes.INSERT
    });

    return res.status(201).json({
      success: true,
      data: result,
      message: 'Pricing suggestion created successfully'
    });

  } catch (error) {
    console.error('Pricing Suggestions POST Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}

async function handlePut(req, res) {
  try {
    const { id, status, applied_by } = req.body;

    if (!id || !status) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: id, status'
      });
    }

    const tableExists = await checkTableExists('pricing_suggestions');
    
    if (!tableExists) {
      return res.status(400).json({
        success: false,
        message: 'Pricing suggestions table not yet created.',
        table_exists: false
      });
    }

    // Update suggestion status
    const query = `
      UPDATE pricing_suggestions 
      SET 
        status = :status,
        applied_at = ${status === 'applied' ? 'NOW()' : 'NULL'},
        applied_by = :applied_by,
        updated_at = NOW()
      WHERE id = :id
      RETURNING *
    `;

    const [result] = await db.sequelize.query(query, {
      replacements: { id, status, applied_by: applied_by || null },
      type: db.Sequelize.QueryTypes.UPDATE
    });

    return res.status(200).json({
      success: true,
      data: result,
      message: 'Pricing suggestion updated successfully'
    });

  } catch (error) {
    console.error('Pricing Suggestions PUT Error:', error);
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
