const db = require('../../../models');
const { Recipe, RecipeIngredient, Product } = db;

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
        const recipe = await Recipe.findByPk(id, {
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
          ]
        });

        if (!recipe) {
          return res.status(404).json({
            success: false,
            message: 'Recipe tidak ditemukan'
          });
        }

        return res.status(200).json({
          success: true,
          data: recipe
        });

      case 'PUT':
        const { ingredients, ...recipeData } = req.body;

        // Get current recipe for history
        const currentRecipe = await Recipe.findByPk(id, {
          include: [{
            model: RecipeIngredient,
            as: 'ingredients'
          }]
        });

        if (!currentRecipe) {
          return res.status(404).json({
            success: false,
            message: 'Recipe tidak ditemukan'
          });
        }

        // Increment version
        const newVersion = (currentRecipe.current_version || 1) + 1;
        recipeData.current_version = newVersion;

        // Update recipe
        await Recipe.update(recipeData, {
          where: { id }
        });

        // Delete existing ingredients
        await RecipeIngredient.destroy({
          where: { recipe_id: id }
        });

        // Create new ingredients
        if (ingredients && ingredients.length > 0) {
          const ingredientData = ingredients.map(ing => ({
            recipe_id: id,
            product_id: ing.product_id,
            quantity: ing.quantity,
            unit: ing.unit,
            unit_cost: ing.unit_cost,
            subtotal_cost: ing.subtotal,
            sort_order: ing.sort_order || 0
          }));

          await RecipeIngredient.bulkCreate(ingredientData);
        }

        // Create history record
        const RecipeHistory = db.RecipeHistory;
        if (RecipeHistory) {
          await RecipeHistory.create({
            recipe_id: id,
            version: newVersion,
            change_type: 'updated',
            changed_by: req.body.changed_by || null,
            changes_summary: `Recipe updated to version ${newVersion}`,
            snapshot_data: {
              recipe: recipeData,
              ingredients: ingredients
            }
          });
        }

        // Fetch updated recipe
        const updatedRecipe = await Recipe.findByPk(id, {
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

        return res.status(200).json({
          success: true,
          data: updatedRecipe,
          message: 'Recipe berhasil diupdate',
          version: newVersion
        });

      case 'DELETE':
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
        res.setHeader('Allow', ['GET', 'PUT', 'DELETE']);
        return res.status(405).json({
          success: false,
          message: `Method ${method} not allowed`
        });
    }
  } catch (error) {
    console.error('Recipe API Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};
