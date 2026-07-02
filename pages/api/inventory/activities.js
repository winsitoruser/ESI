const db = require('../../../models');
const { Product, StockMovement } = db;

/**
 * GET /api/inventory/activities
 * Returns recent inventory activities from stock_movements table
 */
export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({
      success: false,
      message: 'Method not allowed'
    });
  }

  try {
    const { limit = 20, type, product_id } = req.query;

    // Build where clause using snake_case (database column names)
    const where = {};
    
    if (type) {
      where.movement_type = type;
    }
    
    if (product_id) {
      where.product_id = product_id;
    }

    // Get real stock movements from database
    const movements = await StockMovement.findAll({
      where,
      include: [{
        model: Product,
        as: 'product',
        attributes: ['id', 'name', 'sku'],
        required: false
      }],
      order: [['created_at', 'DESC']],
      limit: parseInt(limit),
      attributes: [
        'id',
        'product_id',
        'movement_type',
        'quantity',
        'balance_before',
        'balance_after',
        'reference_type',
        'reference_id',
        'notes',
        'created_at'
      ],
      raw: false
    });

    // Transform to activity format
    const activities = movements.map((movement) => {
      const data = movement.dataValues || movement;
      const productData = movement.product?.dataValues || movement.product;
      
      return {
        id: data.id,
        type: data.movement_type,
        product_id: data.product_id,
        product_name: productData?.name || 'Unknown Product',
        product_sku: productData?.sku || '',
        quantity: parseFloat(data.quantity),
        previous_stock: parseFloat(data.balance_before || 0),
        current_stock: parseFloat(data.balance_after || 0),
        reference_type: data.reference_type,
        reference_id: data.reference_id,
        user: 'Admin',
        timestamp: data.created_at,
        notes: data.notes || getActivityNotes(data.movement_type, productData?.name, data.quantity)
      };
    });

    return res.status(200).json({
      success: true,
      data: activities,
      total: activities.length
    });

  } catch (error) {
    console.error('Inventory Activities API Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}

function getActivityNotes(type, productName, quantity) {
  const absQty = Math.abs(quantity);
  switch (type) {
    case 'in':
      return `Penerimaan stock ${productName} sebanyak ${absQty} unit`;
    case 'out':
      return `Penjualan ${productName} sebanyak ${absQty} unit`;
    case 'adjustment':
      return `Penyesuaian stock ${productName} sebanyak ${quantity} unit`;
    case 'transfer':
      return `Transfer ${productName} sebanyak ${absQty} unit`;
    default:
      return `Aktivitas ${productName}`;
  }
}
