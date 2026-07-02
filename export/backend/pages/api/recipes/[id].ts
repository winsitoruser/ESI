import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/pages/api/auth/[...nextauth]';
const db = require('../../../models');

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const session = await getServerSession(req, res, authOptions);
    if (!session) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { id } = req.query;
    const { Recipe, RecipeIngredient, Product } = db;

    const recipe = await Recipe.findByPk(id, {
      include: [{
        model: RecipeIngredient,
        as: 'ingredients',
        include: [{ model: Product, as: 'ingredient' }]
      }]
    });

    if (!recipe) {
      return res.status(404).json({ error: 'Recipe not found' });
    }

    switch (req.method) {
      case 'GET':
        return res.status(200).json({ success: true, data: recipe });

      case 'PUT':
        const { name, description, yield: recipeYield, instructions, prepTime, cookTime, ingredients } = req.body;
        
        await recipe.update({
          ...(name && { name }),
          ...(description !== undefined && { description }),
          ...(recipeYield && { yield: recipeYield }),
          ...(instructions && { instructions }),
          ...(prepTime !== undefined && { prepTime }),
          ...(cookTime !== undefined && { cookTime }),
          updatedBy: (session.user as any).id
        });

        // Update ingredients if provided
        if (ingredients) {
          await RecipeIngredient.destroy({ where: { recipeId: id } });
          for (const ing of ingredients) {
            await RecipeIngredient.create({
              recipeId: id,
              ingredientId: ing.ingredientId,
              quantity: ing.quantity,
              unit: ing.unit
            });
          }
        }

        const updated = await Recipe.findByPk(id, {
          include: [{ model: RecipeIngredient, as: 'ingredients' }]
        });

        return res.status(200).json({
          success: true,
          message: 'Recipe updated',
          data: updated
        });

      case 'DELETE':
        await recipe.update({ isActive: false });
        return res.status(200).json({
          success: true,
          message: 'Recipe deleted'
        });

      default:
        return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error: any) {
    console.error('Recipe API Error:', error);
    return res.status(500).json({ error: error.message });
  }
}
