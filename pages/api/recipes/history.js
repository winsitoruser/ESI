const db = require('../../../models');
const { Recipe, RecipeHistory, User } = db;

export default async function handler(req, res) {
  const { method } = req;

  try {
    switch (method) {
      case 'GET':
        const {
          recipe_id,
          change_type,
          date_from,
          date_to,
          limit = 20,
          offset = 0
        } = req.query;

        // Build where clause
        const where = {};
        if (recipe_id) where.recipe_id = recipe_id;
        if (change_type) where.change_type = change_type;
        if (date_from || date_to) {
          where.created_at = {};
          if (date_from) where.created_at[db.Sequelize.Op.gte] = new Date(date_from);
          if (date_to) where.created_at[db.Sequelize.Op.lte] = new Date(date_to);
        }

        // Fetch history with recipe and user info
        const { count, rows: history } = await RecipeHistory.findAndCountAll({
          where,
          include: [
            {
              model: Recipe,
              as: 'recipe',
              attributes: ['id', 'code', 'name', 'status', 'category']
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
    console.error('Recipe History API Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}
