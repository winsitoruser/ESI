const db = require('../../../models');
const { Production, ProductionMaterial, ProductionHistory, Recipe, Product, User } = db;

export default async function handler(req, res) {
  const { method } = req;
  const { id } = req.query;

  if (!id) {
    return res.status(400).json({
      success: false,
      message: 'Production ID is required'
    });
  }

  try {
    switch (method) {
      case 'GET':
        const production = await Production.findByPk(id, {
          include: [
            {
              model: Recipe,
              as: 'recipe',
              attributes: ['id', 'code', 'name', 'batch_size', 'batch_unit']
            },
            {
              model: Product,
              as: 'product',
              attributes: ['id', 'name', 'sku']
            },
            {
              model: ProductionMaterial,
              as: 'materials',
              include: [
                {
                  model: Product,
                  as: 'material',
                  attributes: ['id', 'name', 'sku', 'unit']
                }
              ]
            },
            {
              model: User,
              as: 'producer',
              attributes: ['id', 'name', 'email'],
              required: false
            }
          ]
        });

        if (!production) {
          return res.status(404).json({
            success: false,
            message: 'Production not found'
          });
        }

        return res.status(200).json({
          success: true,
          data: production
        });

      case 'PUT':
        const productionToUpdate = await Production.findByPk(id);
        
        if (!productionToUpdate) {
          return res.status(404).json({
            success: false,
            message: 'Production not found'
          });
        }

        const previousStatus = productionToUpdate.status;
        const updateData = req.body;

        // Start transaction
        const updated = await db.sequelize.transaction(async (t) => {
          // Update production
          await productionToUpdate.update(updateData, { transaction: t });

          // Determine action type
          let actionType = 'updated';
          if (updateData.status === 'in_progress' && previousStatus === 'planned') {
            actionType = 'started';
          } else if (updateData.status === 'completed' && previousStatus !== 'completed') {
            actionType = 'completed';
          } else if (updateData.status === 'cancelled') {
            actionType = 'cancelled';
          }

          // Create history entry
          await ProductionHistory.create({
            production_id: productionToUpdate.id,
            action_type: actionType,
            previous_status: previousStatus,
            new_status: updateData.status || previousStatus,
            changed_by: updateData.changed_by,
            changes_summary: updateData.changes_summary || `Production ${actionType}`,
            changes_json: updateData,
            snapshot_data: productionToUpdate.toJSON()
          }, { transaction: t });

          return productionToUpdate;
        });

        return res.status(200).json({
          success: true,
          message: 'Production updated successfully',
          data: updated
        });

      case 'DELETE':
        const productionToDelete = await Production.findByPk(id);
        
        if (!productionToDelete) {
          return res.status(404).json({
            success: false,
            message: 'Production not found'
          });
        }

        await productionToDelete.destroy();

        return res.status(200).json({
          success: true,
          message: 'Production deleted successfully'
        });

      default:
        res.setHeader('Allow', ['GET', 'PUT', 'DELETE']);
        return res.status(405).json({
          success: false,
          message: `Method ${method} not allowed`
        });
    }
  } catch (error) {
    console.error('Production API Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}
