import { NextApiRequest, NextApiResponse } from 'next';
import { getSession } from 'next-auth/react';
import db from 'models';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const session = await getSession({ req });
    
    if (!session) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (req.method === 'GET') {
      // Get all recipes
      try {
        const recipes = await db.Recipe.findAll({
          include: [
            {
              model: db.Product,
              as: 'product',
              attributes: ['id', 'name', 'price', 'sku'],
              required: false
            },
            {
              model: db.RecipeIngredient,
              as: 'ingredients',
              required: false,
              include: [
                {
                  model: db.Product,
                  as: 'material',
                  attributes: ['id', 'name', 'unit'],
                  required: false
                }
              ]
            }
          ],
          order: [['createdAt', 'DESC']]
        });

        return res.status(200).json({
          success: true,
          data: recipes
        });
      } catch (dbError: any) {
        console.error('Database error:', dbError);
        return res.status(500).json({
          error: 'Database error',
          message: dbError.message
        });
      }
    } 
    else if (req.method === 'POST') {
      // Create new recipe
      const {
        name,
        description,
        productId,
        batchSize,
        batchUnit,
        prepTime,
        cookTime,
        difficulty,
        category,
        instructions,
        ingredients
      } = req.body;

      if (!name || !category) {
        return res.status(400).json({
          error: 'Bad Request',
          message: 'Name and category are required'
        });
      }

      try {
        // Generate unique code
        const code = `REC-${Date.now()}`;

        // Create recipe
        const recipe = await db.Recipe.create({
          code,
          name,
          description,
          product_id: productId || null,
          batch_size: batchSize || 1,
          batch_unit: batchUnit || 'pcs',
          preparation_time_minutes: prepTime || 0,
          cooking_time_minutes: cookTime || 0,
          total_time_minutes: (prepTime || 0) + (cookTime || 0),
          difficulty_level: difficulty || 'medium',
          category,
          instructions: Array.isArray(instructions) ? instructions.join('\n') : instructions,
          status: 'draft',
          created_by: session.user!.id
        });

        // Create history record for creation
        await db.RecipeHistory.create({
          recipe_id: recipe.id,
          version: 1,
          change_type: 'created',
          changed_by: session.user!.id,
          changes_summary: `Recipe "${name}" created`,
          snapshot_data: {
            recipe: {
              name,
              category,
              difficulty,
              prepTime,
              cookTime,
              batchSize
            },
            ingredients: ingredients || []
          }
        });

        // Add ingredients if provided
        if (ingredients && ingredients.length > 0) {
          const recipeIngredients = ingredients.map((ing: any, index: number) => ({
            recipe_id: recipe.id,
            product_id: ing.productId || null,
            quantity: ing.quantity,
            unit: ing.unit,
            unit_cost: ing.unitCost || 0,
            subtotal_cost: (ing.quantity || 0) * (ing.unitCost || 0),
            preparation_notes: ing.notes || '',
            sort_order: index
          }));

          await db.RecipeIngredient.bulkCreate(recipeIngredients);

          // Calculate total cost
          const totalCost = recipeIngredients.reduce((sum: number, ing: any) => 
            sum + ing.subtotal_cost, 0
          );

          await recipe.update({
            total_cost: totalCost,
            cost_per_unit: totalCost / (batchSize || 1)
          });
        }

        // Fetch the created recipe with associations
        const createdRecipe = await db.Recipe.findByPk(recipe.id, {
          include: [
            {
              model: db.Product,
              as: 'product',
              attributes: ['id', 'name', 'price', 'sku'],
              required: false
            },
            {
              model: db.RecipeIngredient,
              as: 'ingredients',
              required: false,
              include: [
                {
                  model: db.Product,
                  as: 'material',
                  attributes: ['id', 'name', 'unit'],
                  required: false
                }
              ]
            }
          ]
        });

        return res.status(201).json({
          success: true,
          data: createdRecipe
        });
      } catch (dbError: any) {
        console.error('Database error:', dbError);
        return res.status(500).json({
          error: 'Database error',
          message: dbError.message
        });
      }
    }
    else {
      res.setHeader('Allow', ['GET', 'POST']);
      return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error: any) {
    console.error('Recipe API error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
}
