import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../auth/[...nextauth]';
import { sequelize } from '@/lib/sequelizeClient';
import { QueryTypes } from 'sequelize';
import { canAccessBranch } from '@/lib/branchFilter';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    const session = await getServerSession(req, res, authOptions);

    if (!session || !session.user) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    if (req.method === 'GET') {
      const { 
        recipeId,
        branchId,
        includeBreakdown = false,
        asOfDate
      } = req.query;

      if (!recipeId) {
        return res.status(400).json({
          success: false,
          error: 'Recipe ID is required'
        });
      }

      // Determine which branch to calculate for
      const targetBranchId = branchId || session.user.branchId;
      
      if (!targetBranchId) {
        return res.status(400).json({
          success: false,
          error: 'Branch ID is required'
        });
      }

      // Check branch access
      const hasAccess = await canAccessBranch(req, res, targetBranchId);
      if (!hasAccess) {
        return res.status(403).json({
          success: false,
          error: 'No access to this branch'
        });
      }

      // Get recipe with ingredients
      const [recipe] = await sequelize.query(`
        SELECT 
          r.*,
          p.name as product_name,
          p.sku as product_sku,
          p.category_id,
          c.name as category_name
        FROM recipes r
        LEFT JOIN products p ON r.product_id = p.id
        LEFT JOIN categories c ON p.category_id = c.id
        WHERE r.id = :recipeId
        AND (r.branch_id = :branchId OR r.branch_id IS NULL)
      `, {
        replacements: { recipeId, branchId: targetBranchId },
        type: QueryTypes.SELECT
      });

      if (!recipe) {
        return res.status(404).json({
          success: false,
          error: 'Recipe not found'
        });
      }

      // Get ingredients with regional pricing
      let ingredientsQuery = `
        SELECT 
          ri.*,
          i.name as ingredient_name,
          i.sku as ingredient_sku,
          i.unit as base_unit,
          COALESCE(pp.price, i.cost) as actual_cost,
          pp.price as regional_price,
          pp.branch_id as price_branch_id,
          b.name as price_branch_name,
          b.code as price_branch_code
        FROM recipe_ingredients ri
        LEFT JOIN ingredients i ON ri.ingredient_id = i.id
        LEFT JOIN product_prices pp ON i.id = pp.product_id 
          AND (pp.branch_id = :branchId OR pp.branch_id IS NULL)
          AND (pp.start_date IS NULL OR pp.start_date <= :asOfDate)
          AND (pp.end_date IS NULL OR pp.end_date >= :asOfDate)
        LEFT JOIN branches b ON pp.branch_id = b.id
        WHERE ri.recipe_id = :recipeId
        ORDER BY pp.branch_id DESC NULLS LAST
      `;

      const ingredients = await sequelize.query(ingredientsQuery, {
        replacements: { 
          recipeId, 
          branchId: targetBranchId,
          asOfDate: asOfDate || new Date().toISOString().split('T')[0]
        },
        type: QueryTypes.SELECT
      });

      // Calculate total cost with regional pricing
      let totalCost = 0;
      let costBreakdown = [];

      for (const ingredient of ingredients) {
        const unitCost = parseFloat(ingredient.actual_cost) || 0;
        const quantity = parseFloat(ingredient.quantity) || 0;
        const ingredientCost = unitCost * quantity;
        
        totalCost += ingredientCost;

        if (includeBreakdown === 'true') {
          costBreakdown.push({
            ingredientId: ingredient.ingredient_id,
            ingredientName: ingredient.ingredient_name,
            ingredientSku: ingredient.ingredient_sku,
            quantity: ingredient.quantity,
            unit: ingredient.unit,
            baseUnit: ingredient.base_unit,
            unitCost,
            totalCost: ingredientCost,
            costSource: ingredient.price_branch_id 
              ? `${ingredient.price_branch_code} - Regional Price`
              : 'Base Cost',
            isRegional: !!ingredient.price_branch_id,
            regionalBranch: ingredient.price_branch_name
          });
        }
      }

      // Get cost comparison with other branches
      const branchComparison = await sequelize.query(`
        SELECT 
          b.id,
          b.name,
          b.code,
          COALESCE(
            (
              SELECT SUM(COALESCE(pp.price, i.cost) * ri.quantity)
              FROM recipe_ingredients ri
              LEFT JOIN ingredients i ON ri.ingredient_id = i.id
              LEFT JOIN product_prices pp ON i.id = pp.product_id 
                AND (pp.branch_id = b.id OR pp.branch_id IS NULL)
                AND (pp.start_date IS NULL OR pp.start_date <= :asOfDate)
                AND (pp.end_date IS NULL OR pp.end_date >= :asOfDate)
              WHERE ri.recipe_id = :recipeId
              ORDER BY pp.branch_id DESC NULLS LAST
            ),
            0
          ) as total_cost
        FROM branches b
        WHERE b.tenant_id = :tenantId
        AND b.is_active = true
        ORDER BY b.name
      `, {
        replacements: { 
          recipeId,
          tenantId: session.user.tenantId,
          asOfDate: asOfDate || new Date().toISOString().split('T')[0]
        },
        type: QueryTypes.SELECT
      });

      // Calculate cost statistics
      const costs = branchComparison.map(b => parseFloat(b.total_cost) || 0);
      const minCost = Math.min(...costs);
      const maxCost = Math.max(...costs);
      const avgCost = costs.reduce((sum, cost) => sum + cost, 0) / costs.length;
      
      const currentBranch = branchComparison.find(b => b.id === targetBranchId);
      const currentCost = currentBranch ? parseFloat(currentBranch.total_cost) || 0 : totalCost;

      // Calculate cost variance
      const costVariance = avgCost > 0 ? ((currentCost - avgCost) / avgCost) * 100 : 0;
      const isAboveAverage = costVariance > 0;

      // Get historical cost trends
      const costTrend = await sequelize.query(`
        SELECT 
          DATE_TRUNC('month', p.created_at) as month,
          AVG(p.total_cost) as average_cost,
          MIN(p.total_cost) as min_cost,
          MAX(p.total_cost) as max_cost
        FROM productions p
        WHERE p.recipe_id = :recipeId
        AND p.branch_id = :branchId
        AND p.created_at >= DATE_TRUNC('month', CURRENT_DATE) - INTERVAL '11 months'
        GROUP BY DATE_TRUNC('month', p.created_at)
        ORDER BY month DESC
        LIMIT 12
      `, {
        replacements: { recipeId, branchId: targetBranchId },
        type: QueryTypes.SELECT
      });

      // Calculate recipe profitability
      const [productPrice] = await sequelize.query(`
        SELECT 
          COALESCE(pp.price, p.selling_price) as selling_price,
          pp.branch_id as price_branch_id
        FROM products p
        LEFT JOIN product_prices pp ON p.id = pp.product_id 
          AND (pp.branch_id = :branchId OR pp.branch_id IS NULL)
          AND (pp.start_date IS NULL OR pp.start_date <= :asOfDate)
          AND (pp.end_date IS NULL OR pp.end_date >= :asOfDate)
        WHERE p.id = :productId
        ORDER BY pp.branch_id DESC NULLS LAST
        LIMIT 1
      `, {
        replacements: { 
          productId: recipe.product_id,
          branchId: targetBranchId,
          asOfDate: asOfDate || new Date().toISOString().split('T')[0]
        },
        type: QueryTypes.SELECT
      });

      const sellingPrice = productPrice ? parseFloat(productPrice.selling_price) || 0 : 0;
      const grossProfit = sellingPrice - currentCost;
      const profitMargin = sellingPrice > 0 ? (grossProfit / sellingPrice) * 100 : 0;

      return res.status(200).json({
        success: true,
        data: {
          recipe: {
            id: recipe.id,
            name: recipe.name,
            productName: recipe.product_name,
            productSku: recipe.product_sku,
            servings: recipe.servings,
            difficulty: recipe.difficulty
          },
          cost: {
            totalCost: currentCost,
            costPerServing: recipe.servings > 0 ? currentCost / recipe.servings : 0,
            breakdown: includeBreakdown === 'true' ? costBreakdown : undefined
          },
          comparison: {
            currentBranch: currentBranch,
            allBranches: branchComparison,
            statistics: {
              minCost,
              maxCost,
              averageCost: avgCost,
              variance: costVariance,
              isAboveAverage
            }
          },
          profitability: {
            sellingPrice,
            cost: currentCost,
            grossProfit,
            profitMargin
          },
          trends: costTrend,
          metadata: {
            calculatedAt: new Date().toISOString(),
            branchId: targetBranchId,
            asOfDate: asOfDate || new Date().toISOString().split('T')[0],
            currency: 'IDR'
          }
        }
      });

    } else if (req.method === 'POST') {
      // Update ingredient cost for specific branch
      const {
        recipeId,
        ingredientId,
        branchId,
        costOverride
      } = req.body;

      // Validation
      if (!recipeId || !ingredientId || !branchId || costOverride === undefined) {
        return res.status(400).json({
          success: false,
          error: 'Missing required fields',
          required: ['recipeId', 'ingredientId', 'branchId', 'costOverride']
        });
      }

      // Check permissions
      const hasAccess = await canAccessBranch(req, res, branchId);
      if (!hasAccess) {
        return res.status(403).json({
          success: false,
          error: 'No access to this branch'
        });
      }

      // Update or create ingredient cost override
      await sequelize.query(`
        INSERT INTO recipe_ingredients (
          recipe_id, ingredient_id, branch_id, cost_override,
          quantity, unit, created_at, updated_at
        ) VALUES (
          :recipeId, :ingredientId, :branchId, :costOverride,
          1, 'unit', NOW(), NOW()
        )
        ON CONFLICT (recipe_id, ingredient_id, branch_id)
        DO UPDATE SET
          cost_override = :costOverride,
          updated_at = NOW()
      `, {
        replacements: {
          recipeId,
          ingredientId,
          branchId,
          costOverride
        }
      });

      // Recalculate recipe cost
      const [newCost] = await sequelize.query(`
        SELECT 
          SUM(COALESCE(ri.cost_override, i.cost) * ri.quantity) as total_cost
        FROM recipe_ingredients ri
        LEFT JOIN ingredients i ON ri.ingredient_id = i.id
        WHERE ri.recipe_id = :recipeId
        AND (ri.branch_id = :branchId OR ri.branch_id IS NULL)
      `, {
        replacements: { recipeId, branchId },
        type: QueryTypes.SELECT
      });

      return res.status(200).json({
        success: true,
        message: 'Ingredient cost updated successfully',
        data: {
          newTotalCost: parseFloat(newCost.total_cost) || 0
        }
      });

    } else {
      return res.status(405).json({ 
        success: false, 
        error: 'Method not allowed' 
      });
    }

  } catch (error: any) {
    console.error('Regional COGS API error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message
    });
  }
}
