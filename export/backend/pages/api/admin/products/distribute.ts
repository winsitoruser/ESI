import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
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

    // Only super_admin and admin can sync menus
    if (!['super_admin', 'admin'].includes(session.user.role)) {
      return res.status(403).json({ 
        success: false, 
        error: 'Insufficient permissions' 
      });
    }

    if (req.method === 'POST') {
      const { productIds, branchIds, syncMode = 'full' } = req.body;

      // Validate required fields
      if (!productIds || !Array.isArray(productIds) || productIds.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'Product IDs are required'
        });
      }

      if (!branchIds || !Array.isArray(branchIds) || branchIds.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'Branch IDs are required'
        });
      }

      // Verify access to all branches
      for (const branchId of branchIds) {
        const hasAccess = await canAccessBranch(req, res, branchId);
        if (!hasAccess) {
          return res.status(403).json({
            success: false,
            error: `No access to branch: ${branchId}`
          });
        }
      }

      const transaction = await sequelize.transaction();

      try {
        // Get source products with all related data
        const sourceProducts = await sequelize.query(`
          SELECT 
            p.*,
            c.name as category_name,
            c.id as category_id
          FROM products p
          LEFT JOIN categories c ON p.category_id = c.id
          WHERE p.id IN (:productIds)
        `, {
          replacements: { productIds },
          type: QueryTypes.SELECT,
          transaction
        });

        if (sourceProducts.length === 0) {
          await transaction.rollback();
          return res.status(404).json({
            success: false,
            error: 'No products found'
          });
        }

        const syncResults = [];

        // Sync to each branch
        for (const branchId of branchIds) {
          let syncedCount = 0;
          let updatedCount = 0;
          let errorCount = 0;

          for (const product of sourceProducts) {
            try {
              // Check if product exists in branch
              const [existingProduct] = await sequelize.query(`
                SELECT id FROM products 
                WHERE sku = :sku AND branch_id = :branchId
              `, {
                replacements: { sku: product.sku, branchId },
                type: QueryTypes.SELECT,
                transaction
              });

              if (existingProduct && syncMode === 'update') {
                // Update existing product
                await sequelize.query(`
                  UPDATE products SET
                    name = :name,
                    description = :description,
                    category_id = :categoryId,
                    unit = :unit,
                    cost_price = :costPrice,
                    selling_price = :sellingPrice,
                    is_active = :isActive,
                    updated_at = NOW()
                  WHERE id = :id
                `, {
                  replacements: {
                    id: existingProduct.id,
                    name: product.name,
                    description: product.description,
                    categoryId: product.category_id,
                    unit: product.unit,
                    costPrice: product.cost_price,
                    sellingPrice: product.selling_price,
                    isActive: product.is_active
                  },
                  transaction
                });
                updatedCount++;
              } else if (!existingProduct) {
                // Create new product for branch
                const [newProduct] = await sequelize.query(`
                  INSERT INTO products (
                    id, sku, name, description, category_id, unit,
                    cost_price, selling_price, is_active, branch_id,
                    created_at, updated_at
                  ) VALUES (
                    UUID(), :sku, :name, :description, :categoryId, :unit,
                    :costPrice, :sellingPrice, :isActive, :branchId,
                    NOW(), NOW()
                  )
                  RETURNING id
                `, {
                  replacements: {
                    sku: `${product.sku}-${branchId.slice(-4)}`, // Unique SKU per branch
                    name: product.name,
                    description: product.description,
                    categoryId: product.category_id,
                    unit: product.unit,
                    costPrice: product.cost_price,
                    sellingPrice: product.selling_price,
                    isActive: product.is_active,
                    branchId
                  },
                  transaction
                });
                syncedCount++;

                // Sync product images if any
                const [productImages] = await sequelize.query(`
                  SELECT image_url, is_primary FROM product_images 
                  WHERE product_id = :sourceProductId
                `, {
                  replacements: { sourceProductId: product.id },
                  type: QueryTypes.SELECT,
                  transaction
                });

                for (const image of productImages) {
                  await sequelize.query(`
                    INSERT INTO product_images (
                      id, product_id, image_url, is_primary, created_at, updated_at
                    ) VALUES (
                      UUID(), :productId, :imageUrl, :isPrimary, NOW(), NOW()
                    )
                  `, {
                    replacements: {
                      productId: newProduct.id,
                      imageUrl: image.image_url,
                      isPrimary: image.is_primary
                    },
                    transaction
                  });
                }

                // Sync product prices if using regional pricing
                const [productPrices] = await sequelize.query(`
                  SELECT price_type, price, discount_percentage, 
                         min_quantity, max_quantity, start_date, end_date
                  FROM product_prices 
                  WHERE product_id = :sourceProductId AND branch_id IS NULL
                `, {
                  replacements: { sourceProductId: product.id },
                  type: QueryTypes.SELECT,
                  transaction
                });

                for (const price of productPrices) {
                  await sequelize.query(`
                    INSERT INTO product_prices (
                      id, product_id, price_type, price, discount_percentage,
                      min_quantity, max_quantity, start_date, end_date,
                      branch_id, created_at, updated_at
                    ) VALUES (
                      UUID(), :productId, :priceType, :price, :discountPercentage,
                      :minQuantity, :maxQuantity, :startDate, :endDate,
                      :branchId, NOW(), NOW()
                    )
                  `, {
                    replacements: {
                      productId: newProduct.id,
                      priceType: price.price_type,
                      price: price.price,
                      discountPercentage: price.discount_percentage,
                      minQuantity: price.min_quantity,
                      maxQuantity: price.max_quantity,
                      startDate: price.start_date,
                      endDate: price.end_date,
                      branchId
                    },
                    transaction
                  });
                }
              }
            } catch (error) {
              console.error(`Error syncing product ${product.id} to branch ${branchId}:`, error);
              errorCount++;
            }
          }

          syncResults.push({
            branchId,
            synced: syncedCount,
            updated: updatedCount,
            errors: errorCount
          });
        }

        await transaction.commit();

        // Log the sync activity
        await sequelize.query(`
          INSERT INTO audit_logs (
            id, user_id, action, entity_type, entity_id, 
            old_values, new_values, ip_address, user_agent, created_at
          ) VALUES (
            UUID(), :userId, 'SYNC_MENU', 'PRODUCT', NULL,
            NULL, :details, :ipAddress, :userAgent, NOW()
          )
        `, {
          replacements: {
            userId: session.user.id,
            details: JSON.stringify({
              productIds,
              branchIds,
              syncMode,
              results: syncResults
            }),
            ipAddress: req.ip,
            userAgent: req.headers['user-agent']
          }
        });

        return res.status(200).json({
          success: true,
          message: 'Menu synchronization completed',
          data: {
            totalProducts: sourceProducts.length,
            branches: branchIds.length,
            results: syncResults,
            summary: {
              totalSynced: syncResults.reduce((sum, r) => sum + r.synced, 0),
              totalUpdated: syncResults.reduce((sum, r) => sum + r.updated, 0),
              totalErrors: syncResults.reduce((sum, r) => sum + r.errors, 0)
            }
          }
        });

      } catch (error) {
        await transaction.rollback();
        throw error;
      }

    } else if (req.method === 'GET') {
      // Get sync history
      const { limit = 20, offset = 0 } = req.query;

      const [syncHistory] = await sequelize.query(`
        SELECT 
          al.id,
          al.created_at,
          al.new_values,
          u.name as user_name,
          u.email as user_email
        FROM audit_logs al
        JOIN users u ON al.user_id = u.id
        WHERE al.action = 'SYNC_MENU'
        ORDER BY al.created_at DESC
        LIMIT :limit OFFSET :offset
      `, {
        replacements: { 
          limit: parseInt(limit as string), 
          offset: parseInt(offset as string) 
        },
        type: QueryTypes.SELECT
      });

      // Parse new_values for each history entry
      const historyWithDetails = syncHistory.map((entry: any) => ({
        ...entry,
        details: JSON.parse(entry.new_values || '{}')
      }));

      return res.status(200).json({
        success: true,
        data: historyWithDetails
      });

    } else {
      return res.status(405).json({ 
        success: false, 
        error: 'Method not allowed' 
      });
    }

  } catch (error: any) {
    console.error('Menu sync API error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message
    });
  }
}
