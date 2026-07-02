const db = require('../../models');
const { Recipe, RecipeIngredient, Product } = db;

export default async function handler(req, res) {
  const { method } = req;

  try {
    switch (method) {
      case 'GET':
        const { status = 'active', include_history } = req.query;
        
        // Build where clause
        const where = {};
        if (status === 'all') {
          // No status filter - get all
        } else if (status) {
          where.status = status;
        }

        const recipes = await Recipe.findAll({
          where,
          include: [
            {
              model: Product,
              as: 'product',
              attributes: ['id', 'name', 'sku']
            },
            {
              model: RecipeIngredient,
              as: 'ingredients',
              include: [
                {
                  model: Product,
                  as: 'material',
                  attributes: ['id', 'name', 'sku', 'unit', 'price']
                }
              ]
            }
          ],
          order: [['updated_at', 'DESC']]
        });
        
        return res.status(200).json({
          success: true,
          data: recipes
        });

      case 'POST':
        const { ingredients, ...recipeData } = req.body;
        
        // Create recipe
        const newRecipe = await Recipe.create(recipeData);
        
        // Create recipe ingredients if provided
        if (ingredients && ingredients.length > 0) {
          const ingredientData = ingredients.map(ing => ({
            recipe_id: newRecipe.id,
            product_id: ing.product_id,
            quantity: ing.quantity,
            unit: ing.unit,
            unit_cost: ing.unit_cost,
            subtotal_cost: ing.subtotal,
            sort_order: ing.sort_order || 0
          }));
          
          await RecipeIngredient.bulkCreate(ingredientData);
        }
        
        // Fetch created recipe with ingredients
        const createdRecipe = await Recipe.findByPk(newRecipe.id, {
          include: [
            {
              model: RecipeIngredient,
              as: 'ingredients',
              include: [
                {
                  model: Product,
                  as: 'material'
                }
              ]
            }
          ]
        });
        
        return res.status(201).json({
          success: true,
          data: createdRecipe,
          message: 'Recipe berhasil dibuat'
        });

      case 'DELETE':
        const { id } = req.query;
        
        if (!id) {
          return res.status(400).json({
            success: false,
            message: 'Recipe ID is required'
          });
        }

        // Delete recipe ingredients first
        await RecipeIngredient.destroy({
          where: { recipe_id: id }
        });

        // Delete recipe
        const deleted = await Recipe.destroy({
          where: { id }
        });

        if (deleted) {
          return res.status(200).json({
            success: true,
            message: 'Recipe berhasil dihapus'
          });
        } else {
          return res.status(404).json({
            success: false,
            message: 'Recipe tidak ditemukan'
          });
        }

      default:
        res.setHeader('Allow', ['GET', 'POST', 'DELETE']);
        return res.status(405).json({
          success: false,
          message: `Method ${method} not allowed`
        });
    }
  } catch (error) {
    console.error('Recipes API Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};
