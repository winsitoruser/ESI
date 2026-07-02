const db = require('../../../models');
const { ProductionWaste, Production, Product, User } = db;

export default async function handler(req, res) {
  const { method } = req;
  const { id } = req.query;

  if (!id) {
    return res.status(400).json({
      success: false,
      message: 'Waste ID is required'
    });
  }

  try {
    switch (method) {
      case 'GET':
        const waste = await ProductionWaste.findByPk(id, {
          include: [
            {
              model: Production,
              as: 'production',
              attributes: ['id', 'batch_number', 'status']
            },
            {
              model: Product,
              as: 'product',
              attributes: ['id', 'name', 'sku']
            },
            {
              model: User,
              as: 'recorder',
              attributes: ['id', 'name', 'email']
            }
          ]
        });

        if (!waste) {
          return res.status(404).json({
            success: false,
            message: 'Waste record not found'
          });
        }

        return res.status(200).json({
          success: true,
          data: waste
        });

      case 'PUT':
        const wasteToUpdate = await ProductionWaste.findByPk(id);
        
        if (!wasteToUpdate) {
          return res.status(404).json({
            success: false,
            message: 'Waste record not found'
          });
        }

        const updateData = req.body;
        
        // Recalculate net loss if cost or clearance price changed
        if (updateData.cost_value || updateData.clearance_price) {
          const costValue = updateData.cost_value || wasteToUpdate.cost_value;
          const clearancePrice = updateData.clearance_price || wasteToUpdate.clearance_price;
          updateData.net_loss = parseFloat(costValue) - parseFloat(clearancePrice);
        }

        await wasteToUpdate.update(updateData);

        return res.status(200).json({
          success: true,
          message: 'Waste record updated successfully',
          data: wasteToUpdate
        });

      case 'DELETE':
        const wasteToDelete = await ProductionWaste.findByPk(id);
        
        if (!wasteToDelete) {
          return res.status(404).json({
            success: false,
            message: 'Waste record not found'
          });
        }

        await wasteToDelete.destroy();

        return res.status(200).json({
          success: true,
          message: 'Waste record deleted successfully'
        });

      default:
        res.setHeader('Allow', ['GET', 'PUT', 'DELETE']);
        return res.status(405).json({
          success: false,
          message: `Method ${method} not allowed`
        });
    }
  } catch (error) {
    console.error('Waste API Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}
