const db = require('../../../models');
const { Product, ProductPrice, ProductVariant } = db;

/**
 * POST /api/products/bulk
 * Bulk operations on products (delete, update, export)
 */
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      message: 'Method not allowed'
    });
  }

  try {
    const { action, productIds, updateData } = req.body;

    if (!action || !productIds || !Array.isArray(productIds) || productIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid request. Provide action and productIds array.'
      });
    }

    switch (action) {
      case 'delete':
        return await bulkDelete(productIds, res);
      
      case 'update':
        return await bulkUpdate(productIds, updateData, res);
      
      case 'activate':
        return await bulkActivate(productIds, true, res);
      
      case 'deactivate':
        return await bulkActivate(productIds, false, res);
      
      case 'update_category':
        return await bulkUpdateField(productIds, 'category', updateData.category, res);
      
      case 'update_supplier':
        return await bulkUpdateField(productIds, 'supplier_id', updateData.supplier_id, res);
      
      default:
        return res.status(400).json({
          success: false,
          message: `Invalid action: ${action}. Valid actions: delete, update, activate, deactivate, update_category, update_supplier`
        });
    }

  } catch (error) {
    console.error('Bulk Products API Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}

// Bulk delete products (soft delete)
async function bulkDelete(productIds, res) {
  const result = await Product.update(
    { isActive: false },
    {
      where: {
        id: {
          [db.Sequelize.Op.in]: productIds
        }
      }
    }
  );

  return res.status(200).json({
    success: true,
    message: `${result[0]} products deleted successfully`,
    affected: result[0]
  });
}

// Bulk update products
async function bulkUpdate(productIds, updateData, res) {
  if (!updateData || Object.keys(updateData).length === 0) {
    return res.status(400).json({
      success: false,
      message: 'No update data provided'
    });
  }

  const allowedFields = [
    'category', 'supplier_id', 'min_stock', 'max_stock', 
    'reorder_point', 'is_active', 'markup_percentage'
  ];

  const updates = {};
  Object.keys(updateData).forEach(key => {
    if (allowedFields.includes(key)) {
      updates[key] = updateData[key];
    }
  });

  if (Object.keys(updates).length === 0) {
    return res.status(400).json({
      success: false,
      message: 'No valid fields to update'
    });
  }

  const result = await Product.update(updates, {
    where: {
      id: {
        [db.Sequelize.Op.in]: productIds
      }
    }
  });

  return res.status(200).json({
    success: true,
    message: `${result[0]} products updated successfully`,
    affected: result[0],
    updates
  });
}

// Bulk activate/deactivate
async function bulkActivate(productIds, isActive, res) {
  const result = await Product.update(
    { isActive },
    {
      where: {
        id: {
          [db.Sequelize.Op.in]: productIds
        }
      }
    }
  );

  return res.status(200).json({
    success: true,
    message: `${result[0]} products ${isActive ? 'activated' : 'deactivated'} successfully`,
    affected: result[0]
  });
}

// Bulk update single field
async function bulkUpdateField(productIds, field, value, res) {
  if (value === undefined || value === null) {
    return res.status(400).json({
      success: false,
      message: `No value provided for ${field}`
    });
  }

  const result = await Product.update(
    { [field]: value },
    {
      where: {
        id: {
          [db.Sequelize.Op.in]: productIds
        }
      }
    }
  );

  return res.status(200).json({
    success: true,
    message: `${result[0]} products updated successfully`,
    affected: result[0],
    field,
    value
  });
}
