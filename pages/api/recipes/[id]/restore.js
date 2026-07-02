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
      case 'PUT':
      case 'POST':
        // Find the recipe
        const recipe = await Recipe.findByPk(id);
        
        if (!recipe) {
          return res.status(404).json({
            success: false,
            message: 'Recipe not found'
          });
        }

        if (recipe.status !== 'archived') {
          return res.status(400).json({
            success: false,
            message: 'Only archived recipes can be restored'
          });
        }

        // Start transaction
        const result = await db.sequelize.transaction(async (t) => {
          // Update recipe status
          await recipe.update({
            status: 'active',
            version: recipe.version + 1
          }, { transaction: t });

          // Create history entry
          await RecipeHistory.create({
            recipe_id: recipe.id,
            version: recipe.version,
            change_type: 'restored',
            changed_by: req.body.user_id || null,
            changes_summary: req.body.reason || 'Recipe restored from archive',
            snapshot_data: recipe.toJSON()
          }, { transaction: t });

          return recipe;
        });

        return res.status(200).json({
          success: true,
          message: 'Recipe restored successfully',
          data: result
        });

      default:
        res.setHeader('Allow', ['PUT', 'POST']);
        return res.status(405).json({
          success: false,
          message: `Method ${method} not allowed`
        });
    }
  } catch (error) {
    console.error('Recipe Restore API Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}
