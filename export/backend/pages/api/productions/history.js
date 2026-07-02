const db = require('../../../models');
const { ProductionHistory, Production, Recipe, User } = db;

export default async function handler(req, res) {
  const { method } = req;

  try {
    switch (method) {
      case 'GET':
        const {
          production_id,
          action_type,
          date_from,
          date_to,
          limit = 50,
          offset = 0
        } = req.query;

        const where = {};
        if (production_id) where.production_id = production_id;
        if (action_type) where.action_type = action_type;
        if (date_from || date_to) {
          where.created_at = {};
          if (date_from) where.created_at[db.Sequelize.Op.gte] = new Date(date_from);
          if (date_to) where.created_at[db.Sequelize.Op.lte] = new Date(date_to);
        }

        const { count, rows: history } = await ProductionHistory.findAndCountAll({
          where,
          include: [
            {
              model: Production,
              as: 'production',
              attributes: ['id', 'batch_number', 'status', 'planned_quantity', 'produced_quantity', 'unit'],
              include: [
                {
                  model: Recipe,
                  as: 'recipe',
                  attributes: ['id', 'code', 'name']
                }
              ]
            },
            {
              model: User,
              as: 'changedBy',
              attributes: ['id', 'name', 'email'],
              required: false
            }
          ],
          order: [['created_at', 'DESC']],
          limit: parseInt(limit),
          offset: parseInt(offset)
        });

        return res.status(200).json({
          success: true,
          data: history,
          pagination: {
            total: count,
            page: Math.floor(parseInt(offset) / parseInt(limit)) + 1,
            limit: parseInt(limit),
            totalPages: Math.ceil(count / parseInt(limit))
          }
        });

      default:
        res.setHeader('Allow', ['GET']);
        return res.status(405).json({
          success: false,
          message: `Method ${method} not allowed`
        });
    }
  } catch (error) {
    console.error('Production History API Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}
