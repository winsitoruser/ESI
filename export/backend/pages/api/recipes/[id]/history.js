const db = require('../../../../models');
const { Recipe, RecipeHistory } = db;

export default async function handler(req, res) {
  const { method } = req;
  const { id } = req.query;

  if (!id) {
    return res.status(400).json({
      success: false,
      message: 'Recipe ID is required'
    });
  }

  try {
    switch (method) {
      case 'GET':
        // Fetch recipe history
        const history = await RecipeHistory.findAll({
          where: { recipe_id: id },
          include: [
            {
              model: db.User,
              as: 'changedBy',
              attributes: ['id', 'name', 'email']
            }
          ],
          order: [['version', 'DESC']]
        });

        return res.status(200).json({
          success: true,
          data: history
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
};
