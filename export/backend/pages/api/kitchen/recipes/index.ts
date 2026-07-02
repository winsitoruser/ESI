import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../auth/[...nextauth]';
import { sequelize } from '@/lib/sequelizeClient';
import { QueryTypes } from 'sequelize';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    const session = await getServerSession(req, res, authOptions);

    if (!session || !session.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const tenantId = session.user.tenantId;

    if (req.method === 'GET') {
      const { search, category } = req.query;

      let whereClause = 'WHERE kr.tenant_id = :tenantId AND kr.is_active = true';
      const replacements: any = { tenantId };

      if (search) {
        whereClause += ' AND (kr.name LIKE :search OR kr.category LIKE :search)';
        replacements.search = `%${search}%`;
      }

      if (category) {
        whereClause += ' AND kr.category = :category';
        replacements.category = category;
      }

      const recipes = await sequelize.query(`
        SELECT 
          kr.*,
          COUNT(kri.id) as ingredients_count
        FROM kitchen_recipes kr
        LEFT JOIN kitchen_recipe_ingredients kri ON kr.id = kri.recipe_id
        ${whereClause}
        GROUP BY kr.id
        ORDER BY kr.name ASC
      `, {
        replacements,
        type: QueryTypes.SELECT
      });

      // Get ingredients for each recipe
      const recipesWithIngredients = await Promise.all(recipes.map(async (recipe: any) => {
        const ingredients = await sequelize.query(`
          SELECT 
            kri.*,
            kii.name as inventory_item_name,
            kii.current_stock
          FROM kitchen_recipe_ingredients kri
          LEFT JOIN kitchen_inventory_items kii ON kri.inventory_item_id = kii.id
          WHERE kri.recipe_id = :recipeId
          ORDER BY kri.name ASC
        `, {
          replacements: { recipeId: recipe.id },
          type: QueryTypes.SELECT
        });

        return {
          ...recipe,
          ingredients,
          instructions: recipe.instructions ? JSON.parse(recipe.instructions) : []
        };
      }));

      return res.status(200).json({
        success: true,
        data: recipesWithIngredients
      });

    } else if (req.method === 'POST') {
      const {
        productId,
        name,
        category,
        description,
        prepTime,
        cookTime,
        servings,
        difficulty,
        instructions,
        sellingPrice,
        ingredients
      } = req.body;

      if (!name || !prepTime || !cookTime || !servings) {
        return res.status(400).json({
          success: false,
          message: 'Missing required fields'
        });
      }

      const transaction = await sequelize.transaction();

      try {
        // Calculate total cost from ingredients
        let totalCost = 0;
        if (ingredients && ingredients.length > 0) {
          totalCost = ingredients.reduce((sum: number, ing: any) => {
            return sum + (parseFloat(ing.totalCost) || 0);
          }, 0);
        }

        // Create recipe
        await sequelize.query(`
          INSERT INTO kitchen_recipes (
            id, tenant_id, product_id, name, category, description,
            prep_time, cook_time, servings, difficulty, instructions,
            total_cost, selling_price, is_active, created_at, updated_at
          ) VALUES (
            UUID(), :tenantId, :productId, :name, :category, :description,
            :prepTime, :cookTime, :servings, :difficulty, :instructions,
            :totalCost, :sellingPrice, true, NOW(), NOW()
          )
        `, {
          replacements: {
            tenantId,
            productId: productId || null,
            name,
            category: category || null,
            description: description || null,
            prepTime,
            cookTime,
            servings,
            difficulty: difficulty || 'medium',
            instructions: instructions ? JSON.stringify(instructions) : null,
            totalCost,
            sellingPrice: sellingPrice || null
          },
          transaction
        });

        // Get created recipe ID
        const [recipe]: any = await sequelize.query(`
          SELECT id FROM kitchen_recipes 
          WHERE name = :name AND tenant_id = :tenantId
          ORDER BY created_at DESC LIMIT 1
        `, {
          replacements: { name, tenantId },
          type: QueryTypes.SELECT,
          transaction
        });

        // Create ingredients
        if (ingredients && ingredients.length > 0) {
          for (const ing of ingredients) {
            await sequelize.query(`
              INSERT INTO kitchen_recipe_ingredients (
                id, recipe_id, inventory_item_id, product_id, name,
                quantity, unit, unit_cost, total_cost, notes,
                created_at, updated_at
              ) VALUES (
                UUID(), :recipeId, :inventoryItemId, :productId, :name,
                :quantity, :unit, :unitCost, :totalCost, :notes,
                NOW(), NOW()
              )
            `, {
              replacements: {
                recipeId: recipe.id,
                inventoryItemId: ing.inventoryItemId || null,
                productId: ing.productId || null,
                name: ing.name,
                quantity: ing.quantity,
                unit: ing.unit,
                unitCost: ing.unitCost || 0,
                totalCost: ing.totalCost || 0,
                notes: ing.notes || null
              },
              transaction
            });
          }
        }

        await transaction.commit();

        return res.status(201).json({
          success: true,
          message: 'Recipe created successfully',
          data: { id: recipe.id }
        });

      } catch (error) {
        await transaction.rollback();
        throw error;
      }

    } else {
      return res.status(405).json({ message: 'Method not allowed' });
    }

  } catch (error: any) {
    console.error('Error in recipes API:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
}
