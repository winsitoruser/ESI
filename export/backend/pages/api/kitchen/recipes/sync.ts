import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../auth/[...nextauth]';
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

    // Only admin and super_admin can sync recipes
    if (!['super_admin', 'admin'].includes(session.user.role)) {
      return res.status(403).json({ 
        success: false, 
        error: 'Insufficient permissions' 
      });
    }

    if (req.method === 'POST') {
      const {
        recipeIds,
        branchIds,
        syncMode = 'update',
        forceUpdate = false
      } = req.body;

      // Validation
      if (!recipeIds || !Array.isArray(recipeIds) || recipeIds.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'Recipe IDs are required'
        });
      }

      if (!branchIds || !Array.isArray(branchIds) || branchIds.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'Branch IDs are required'
        });
      }

      const transaction = await sequelize.transaction();

      try {
        const syncResults = [];

        // Get master recipes
        const masterRecipes = await sequelize.query(`
          SELECT 
            r.*,
            p.name as product_name,
            p.sku as product_sku,
            c.name as category_name
          FROM recipes r
          LEFT JOIN products p ON r.product_id = p.id
          LEFT JOIN categories c ON p.category_id = c.id
          WHERE r.id IN (:recipeIds)
          AND r.is_master = true
          AND r.tenant_id = :tenantId
        `, {
          replacements: { 
            recipeIds, 
            tenantId: session.user.tenantId 
          },
          type: QueryTypes.SELECT,
          transaction
        });

        if (masterRecipes.length === 0) {
          await transaction.rollback();
          return res.status(404).json({
            success: false,
            error: 'No master recipes found'
          });
        }

        // Sync to each branch
        for (const branchId of branchIds) {
          const branchResult = {
            branchId,
            synced: 0,
            updated: 0,
            skipped: 0,
            errors: 0,
            details: []
          };

          // Verify branch access
          const hasAccess = await canAccessBranch(req, res, branchId);
          if (!hasAccess) {
            branchResult.errors++;
            branchResult.details.push('No access to branch');
            syncResults.push(branchResult);
            continue;
          }

          for (const masterRecipe of masterRecipes) {
            try {
              // Check if recipe already exists in branch
              const [existingRecipe] = await sequelize.query(`
                SELECT * FROM recipes 
                WHERE master_recipe_id = :masterRecipeId 
                AND branch_id = :branchId
                FOR UPDATE
              `, {
                replacements: { 
                  masterRecipeId: masterRecipe.id,
                  branchId 
                },
                type: QueryTypes.SELECT,
                transaction
              });

              if (existingRecipe) {
                // Check if we should update
                if (syncMode === 'update' || forceUpdate) {
                  // Check for conflicts
                  if (!forceUpdate && existingRecipe.sync_status === 'modified') {
                    branchResult.skipped++;
                    branchResult.details.push({
                      recipeName: masterRecipe.product_name,
                      reason: 'Recipe has local modifications'
                    });
                    continue;
                  }

                  // Update existing recipe
                  const newVersion = existingRecipe.sync_version + 1;
                  
                  // Store old data for sync log
                  const oldData = {
                    name: existingRecipe.name,
                    description: existingRecipe.description,
                    instructions: existingRecipe.instructions,
                    prepTime: existingRecipe.prep_time,
                    cookTime: existingRecipe.cook_time,
                    servings: existingRecipe.servings,
                    difficulty: existingRecipe.difficulty,
                    cost: existingRecipe.cost
                  };

                  await sequelize.query(`
                    UPDATE recipes SET
                      name = :name,
                      description = :description,
                      instructions = :instructions,
                      prep_time = :prepTime,
                      cook_time = :cookTime,
                      servings = :servings,
                      difficulty = :difficulty,
                      cost = :cost,
                      sync_version = :syncVersion,
                      sync_status = 'synced',
                      last_synced_at = NOW(),
                      updated_at = NOW()
                    WHERE id = :recipeId
                  `, {
                    replacements: {
                      recipeId: existingRecipe.id,
                      name: masterRecipe.name,
                      description: masterRecipe.description,
                      instructions: masterRecipe.instructions,
                      prepTime: masterRecipe.prep_time,
                      cookTime: masterRecipe.cook_time,
                      servings: masterRecipe.servings,
                      difficulty: masterRecipe.difficulty,
                      cost: masterRecipe.cost,
                      syncVersion: newVersion
                    },
                    transaction
                  });

                  // Sync ingredients
                  await syncRecipeIngredients(
                    masterRecipe.id,
                    existingRecipe.id,
                    branchId,
                    transaction
                  );

                  // Create sync log
                  await createSyncLog({
                    masterRecipeId: masterRecipe.id,
                    branchId,
                    syncType: 'update',
                    syncVersion: newVersion,
                    oldData,
                    newData: {
                      name: masterRecipe.name,
                      description: masterRecipe.description,
                      instructions: masterRecipe.instructions
                    },
                    syncedBy: session.user.id,
                    tenantId: session.user.tenantId
                  }, transaction);

                  branchResult.updated++;
                  branchResult.details.push({
                    recipeName: masterRecipe.product_name,
                    action: 'updated',
                    version: newVersion
                  });
                } else {
                  branchResult.skipped++;
                  branchResult.details.push({
                    recipeName: masterRecipe.product_name,
                    reason: 'Already exists (sync mode not update)'
                  });
                }
              } else {
                // Create new recipe for branch
                const [newRecipe] = await sequelize.query(`
                  INSERT INTO recipes (
                    id, name, description, instructions, prep_time, cook_time,
                    servings, difficulty, cost, product_id, is_master,
                    master_recipe_id, sync_status, sync_version,
                    branch_id, tenant_id, created_at, updated_at
                  ) VALUES (
                    UUID(), :name, :description, :instructions, :prepTime,
                    :cookTime, :servings, :difficulty, :cost, :productId,
                    false, :masterRecipeId, 'synced', 1, :branchId,
                    :tenantId, NOW(), NOW()
                  )
                  RETURNING *
                `, {
                  replacements: {
                    name: masterRecipe.name,
                    description: masterRecipe.description,
                    instructions: masterRecipe.instructions,
                    prepTime: masterRecipe.prep_time,
                    cookTime: masterRecipe.cook_time,
                    servings: masterRecipe.servings,
                    difficulty: masterRecipe.difficulty,
                    cost: masterRecipe.cost,
                    productId: masterRecipe.product_id,
                    masterRecipeId: masterRecipe.id,
                    branchId,
                    tenantId: session.user.tenantId
                  },
                  type: QueryTypes.SELECT,
                  transaction
                });

                // Copy ingredients
                await syncRecipeIngredients(
                  masterRecipe.id,
                  newRecipe.id,
                  branchId,
                  transaction
                );

                // Create sync log
                await createSyncLog({
                  masterRecipeId: masterRecipe.id,
                  branchId,
                  syncType: 'create',
                  syncVersion: 1,
                  newData: {
                    name: masterRecipe.name,
                    description: masterRecipe.description
                  },
                  syncedBy: session.user.id,
                  tenantId: session.user.tenantId
                }, transaction);

                branchResult.synced++;
                branchResult.details.push({
                  recipeName: masterRecipe.product_name,
                  action: 'created'
                });
              }
            } catch (error) {
              console.error(`Error syncing recipe ${masterRecipe.id} to branch ${branchId}:`, error);
              branchResult.errors++;
              branchResult.details.push({
                recipeName: masterRecipe.product_name,
                error: error.message
              });
            }
          }

          syncResults.push(branchResult);
        }

        await transaction.commit();

        // Summary
        const summary = {
          totalRecipes: masterRecipes.length,
          totalBranches: branchIds.length,
          totalSynced: syncResults.reduce((sum, r) => sum + r.synced, 0),
          totalUpdated: syncResults.reduce((sum, r) => sum + r.updated, 0),
          totalSkipped: syncResults.reduce((sum, r) => sum + r.skipped, 0),
          totalErrors: syncResults.reduce((sum, r) => sum + r.errors, 0)
        };

        return res.status(200).json({
          success: true,
          message: 'Recipe synchronization completed',
          data: {
            summary,
            results: syncResults
          }
        });

      } catch (error) {
        await transaction.rollback();
        throw error;
      }

    } else if (req.method === 'GET') {
      // Get sync history
      const { 
        page = 1, 
        limit = 20,
        masterRecipeId,
        branchId,
        status
      } = req.query;

      const offset = (parseInt(page as string) - 1) * parseInt(limit as string);

      // Build WHERE clause
      let whereConditions = ['rsl.tenant_id = :tenantId'];
      let queryParams: any = { tenantId: session.user.tenantId };

      if (masterRecipeId) {
        whereConditions.push('rsl.master_recipe_id = :masterRecipeId');
        queryParams.masterRecipeId = masterRecipeId;
      }

      if (branchId) {
        whereConditions.push('rsl.branch_id = :branchId');
        queryParams.branchId = branchId;
      }

      if (status) {
        whereConditions.push('rsl.status = :status');
        queryParams.status = status;
      }

      const whereClause = whereConditions.join(' AND ');

      // Get sync logs
      const syncLogs = await sequelize.query(`
        SELECT 
          rsl.*,
          mr.name as master_recipe_name,
          p.name as product_name,
          b.name as branch_name,
          b.code as branch_code,
          u.name as synced_by_name
        FROM recipe_sync_logs rsl
        LEFT JOIN recipes mr ON rsl.master_recipe_id = mr.id
        LEFT JOIN products p ON mr.product_id = p.id
        LEFT JOIN branches b ON rsl.branch_id = b.id
        LEFT JOIN users u ON rsl.synced_by = u.id
        WHERE ${whereClause}
        ORDER BY rsl.synced_at DESC
        LIMIT :limit OFFSET :offset
      `, {
        replacements: {
          ...queryParams,
          limit: parseInt(limit as string),
          offset
        },
        type: QueryTypes.SELECT
      });

      // Count total
      const [countResult] = await sequelize.query(`
        SELECT COUNT(*) as total
        FROM recipe_sync_logs rsl
        WHERE ${whereClause}
      `, {
        replacements: queryParams,
        type: QueryTypes.SELECT
      });

      return res.status(200).json({
        success: true,
        data: syncLogs,
        pagination: {
          total: parseInt(countResult.total),
          page: parseInt(page as string),
          limit: parseInt(limit as string),
          totalPages: Math.ceil(parseInt(countResult.total) / parseInt(limit as string))
        }
      });

    } else {
      return res.status(405).json({ 
        success: false, 
        error: 'Method not allowed' 
      });
    }

  } catch (error: any) {
    console.error('Recipe sync API error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message
    });
  }
}

// Helper function to sync recipe ingredients
async function syncRecipeIngredients(
  masterRecipeId: string,
  branchRecipeId: string,
  branchId: string,
  transaction: any
) {
  // Delete existing ingredients
  await sequelize.query(
    'DELETE FROM recipe_ingredients WHERE recipe_id = :recipeId',
    {
      replacements: { recipeId: branchRecipeId },
      transaction
    }
  );

  // Copy ingredients from master recipe
  await sequelize.query(`
    INSERT INTO recipe_ingredients (
      id, recipe_id, ingredient_id, quantity, unit, cost,
      branch_id, created_at, updated_at
    )
    SELECT 
      UUID(), :branchRecipeId, ingredient_id, quantity, unit, cost,
      :branchId, NOW(), NOW()
    FROM recipe_ingredients
    WHERE recipe_id = :masterRecipeId
  `, {
    replacements: {
      masterRecipeId,
      branchRecipeId,
      branchId
    },
    transaction
  });
}

// Helper function to create sync log
async function createSyncLog(
  data: {
    masterRecipeId: string;
    branchId?: string;
    syncType: string;
    syncVersion: number;
    oldData?: any;
    newData?: any;
    syncedBy: string;
    tenantId: string;
  },
  transaction: any
) {
  await sequelize.query(`
    INSERT INTO recipe_sync_logs (
      id, master_recipe_id, branch_id, sync_type, sync_version,
      old_data, new_data, synced_by, tenant_id, synced_at, created_at
    ) VALUES (
      UUID(), :masterRecipeId, :branchId, :syncType, :syncVersion,
      :oldData, :newData, :syncedBy, :tenantId, NOW(), NOW()
    )
  `, {
    replacements: {
      masterRecipeId: data.masterRecipeId,
      branchId: data.branchId,
      syncType: data.syncType,
      syncVersion: data.syncVersion,
      oldData: JSON.stringify(data.oldData),
      newData: JSON.stringify(data.newData),
      syncedBy: data.syncedBy,
      tenantId: data.tenantId
    },
    transaction
  });
}
