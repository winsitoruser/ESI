const db = require('../../models');
const { Production, ProductionMaterial, ProductionHistory, Recipe, Product, User } = db;

export default async function handler(req, res) {
  const { method } = req;

  try {
    switch (method) {
      case 'GET':
        const { status, date_from, date_to, recipe_id } = req.query;
        
        const where = {};
        if (status) where.status = status;
        if (recipe_id) where.recipe_id = recipe_id;
        if (date_from || date_to) {
          where.production_date = {};
          if (date_from) where.production_date[db.Sequelize.Op.gte] = new Date(date_from);
          if (date_to) where.production_date[db.Sequelize.Op.lte] = new Date(date_to);
        }

        const productions = await Production.findAll({
          where,
          include: [
            {
              model: Recipe,
              as: 'recipe',
              attributes: ['id', 'code', 'name', 'batch_size', 'batch_unit', 'total_cost']
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
          ],
          order: [['production_date', 'DESC'], ['created_at', 'DESC']]
        });

        return res.status(200).json({
          success: true,
          data: productions
        });

      case 'POST':
        const { recipe_id: recipeId, planned_quantity, production_date, materials, notes, produced_by } = req.body;

        if (!recipeId || !planned_quantity || !production_date) {
          return res.status(400).json({
            success: false,
            message: 'Recipe ID, planned quantity, and production date are required'
          });
        }

        // Generate batch number
        const count = await Production.count();
        const batchNumber = `BTH-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}`;

        // Start transaction
        const result = await db.sequelize.transaction(async (t) => {
          // Create production
          const production = await Production.create({
            batch_number: batchNumber,
            recipe_id: recipeId,
            planned_quantity,
            production_date,
            unit: req.body.unit || 'pcs',
            status: 'planned',
            total_cost: req.body.total_cost || 0,
            produced_by,
            notes
          }, { transaction: t });

          // Create production materials
          if (materials && materials.length > 0) {
            const materialRecords = materials.map(m => ({
              production_id: production.id,
              product_id: m.product_id,
              planned_quantity: m.planned_quantity,
              unit: m.unit,
              unit_cost: m.unit_cost || 0,
              total_cost: (m.planned_quantity || 0) * (m.unit_cost || 0)
            }));
            await ProductionMaterial.bulkCreate(materialRecords, { transaction: t });
          }

          // Create history entry
          await ProductionHistory.create({
            production_id: production.id,
            action_type: 'created',
            new_status: 'planned',
            changed_by: produced_by,
            changes_summary: 'Production batch created',
            snapshot_data: production.toJSON()
          }, { transaction: t });

          return production;
        });

        return res.status(201).json({
          success: true,
          message: 'Production created successfully',
          data: result
        });

      default:
        res.setHeader('Allow', ['GET', 'POST']);
        return res.status(405).json({
          success: false,
          message: `Method ${method} not allowed`
        });
    }
  } catch (error) {
    console.error('Productions API Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}
