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

    if (req.method === 'GET') {
      const { productId, includeRegionalPricing = false } = req.query;

      if (!productId) {
        return res.status(400).json({
          success: false,
          error: 'Product ID is required'
        });
      }

      // Get product with basic info
      const [product] = await sequelize.query(`
        SELECT 
          p.*,
          c.name as category_name,
          u.name as unit_name
        FROM products p
        LEFT JOIN categories c ON p.category_id = c.id
        LEFT JOIN units u ON p.unit_id = u.id
        WHERE p.id = :productId
        AND p.tenant_id = :tenantId
      `, {
        replacements: { 
          productId, 
          tenantId: session.user.tenantId 
        },
        type: QueryTypes.SELECT
      });

      if (!product) {
        return res.status(404).json({
          success: false,
          error: 'Product not found'
        });
      }

      let regionalPricing = [];
      
      if (includeRegionalPricing === 'true') {
        // Get all branches for this tenant
        const branches = await sequelize.query(`
          SELECT id, name, code, is_main_branch
          FROM branches
          WHERE tenant_id = :tenantId
          AND is_active = true
          ORDER BY is_main_branch DESC, name
        `, {
          replacements: { tenantId: session.user.tenantId },
          type: QueryTypes.SELECT
        });

        // Get pricing for each branch
        for (const branch of branches) {
          const [pricing] = await sequelize.query(`
            SELECT 
              pp.*,
              b.name as branch_name,
              b.code as branch_code
            FROM product_prices pp
            LEFT JOIN branches b ON pp.branch_id = b.id
            WHERE pp.product_id = :productId
            AND (pp.branch_id = :branchId OR pp.branch_id IS NULL)
            AND (pp.start_date IS NULL OR pp.start_date <= CURRENT_DATE)
            AND (pp.end_date IS NULL OR pp.end_date >= CURRENT_DATE)
            ORDER BY pp.branch_id DESC NULLS LAST, pp.priority DESC
            LIMIT 1
          `, {
            replacements: { 
              productId, 
              branchId: branch.id 
            },
            type: QueryTypes.SELECT
          });

          regionalPricing.push({
            branchId: branch.id,
            branchName: branch.name,
            branchCode: branch.code,
            isMainBranch: branch.is_main_branch,
            price: pricing ? parseFloat(pricing.price) : parseFloat(product.selling_price),
            discountPercentage: pricing ? parseFloat(pricing.discount_percentage) : 0,
            minQuantity: pricing ? parseInt(pricing.min_quantity) : 1,
            maxQuantity: pricing ? parseInt(pricing.max_quantity) : null,
            priceType: pricing ? pricing.price_type : 'standard',
            isActive: pricing ? pricing.is_active : true,
            startDate: pricing ? pricing.start_date : null,
            endDate: pricing ? pricing.end_date : null,
            pricingId: pricing ? pricing.id : null
          });
        }
      }

      // Get product ingredients if applicable
      const ingredients = await sequelize.query(`
        SELECT 
          pi.*,
          i.name as ingredient_name,
          i.sku as ingredient_sku,
          u.name as unit_name
        FROM product_ingredients pi
        LEFT JOIN ingredients i ON pi.ingredient_id = i.id
        LEFT JOIN units u ON i.unit_id = u.id
        WHERE pi.product_id = :productId
        ORDER BY i.name
      `, {
        replacements: { productId },
        type: QueryTypes.SELECT
      });

      return res.status(200).json({
        success: true,
        data: {
          ...product,
          ingredients,
          regionalPricing: includeRegionalPricing === 'true' ? regionalPricing : undefined
        }
      });

    } else if (req.method === 'PUT') {
      const {
        id,
        name,
        description,
        sku,
        barcode,
        categoryId,
        unitId,
        sellingPrice,
        cost,
        stock,
        minStock,
        maxStock,
        isActive,
        images,
        tags,
        regionalPricing,
        ingredients
      } = req.body;

      if (!id) {
        return res.status(400).json({
          success: false,
          error: 'Product ID is required'
        });
      }

      // Check if product exists
      const [existingProduct] = await sequelize.query(`
        SELECT id, tenant_id FROM products WHERE id = :id
      `, {
        replacements: { id },
        type: QueryTypes.SELECT
      });

      if (!existingProduct) {
        return res.status(404).json({
          success: false,
          error: 'Product not found'
        });
      }

      // Check tenant access
      if (existingProduct.tenant_id !== session.user.tenantId && session.user.role !== 'super_admin') {
        return res.status(403).json({
          success: false,
          error: 'Access denied'
        });
      }

      const transaction = await sequelize.transaction();

      try {
        // Update basic product info
        await sequelize.query(`
          UPDATE products SET
            name = :name,
            description = :description,
            sku = :sku,
            barcode = :barcode,
            category_id = :categoryId,
            unit_id = :unitId,
            selling_price = :sellingPrice,
            cost = :cost,
            stock = :stock,
            min_stock = :minStock,
            max_stock = :maxStock,
            is_active = :isActive,
            images = :images,
            tags = :tags,
            updated_at = NOW()
          WHERE id = :id
        `, {
          replacements: {
            id,
            name,
            description,
            sku,
            barcode,
            categoryId,
            unitId,
            sellingPrice,
            cost,
            stock,
            minStock,
            maxStock,
            isActive,
            images: JSON.stringify(images || []),
            tags: JSON.stringify(tags || [])
          },
          transaction
        });

        // Update regional pricing if provided
        if (regionalPricing && Array.isArray(regionalPricing)) {
          for (const pricing of regionalPricing) {
            if (!pricing.branchId) continue;

            // Check branch access
            const hasAccess = await canAccessBranch(req, res, pricing.branchId);
            if (!hasAccess) {
              console.warn(`No access to branch ${pricing.branchId}, skipping pricing update`);
              continue;
            }

            if (pricing.pricingId) {
              // Update existing pricing
              await sequelize.query(`
                UPDATE product_prices SET
                  price = :price,
                  discount_percentage = :discountPercentage,
                  min_quantity = :minQuantity,
                  max_quantity = :maxQuantity,
                  price_type = :priceType,
                  is_active = :isActive,
                  start_date = :startDate,
                  end_date = :endDate,
                  notes = :notes,
                  updated_at = NOW()
                WHERE id = :pricingId
                AND product_id = :productId
              `, {
                replacements: {
                  pricingId: pricing.pricingId,
                  productId: id,
                  price: pricing.price,
                  discountPercentage: pricing.discountPercentage,
                  minQuantity: pricing.minQuantity,
                  maxQuantity: pricing.maxQuantity,
                  priceType: pricing.priceType,
                  isActive: pricing.isActive,
                  startDate: pricing.startDate,
                  endDate: pricing.endDate,
                  notes: pricing.notes
                },
                transaction
              });
            } else if (pricing.price !== parseFloat(sellingPrice)) {
              // Create new pricing if different from base price
              await sequelize.query(`
                INSERT INTO product_prices (
                  id, product_id, branch_id, price_type, price,
                  discount_percentage, min_quantity, max_quantity,
                  start_date, end_date, is_active, priority,
                  notes, created_at, updated_at
                ) VALUES (
                  UUID(), :productId, :branchId, :priceType, :price,
                  :discountPercentage, :minQuantity, :maxQuantity,
                  :startDate, :endDate, :isActive, 1,
                  :notes, NOW(), NOW()
                )
              `, {
                replacements: {
                  productId: id,
                  branchId: pricing.branchId,
                  priceType: pricing.priceType || 'standard',
                  price: pricing.price,
                  discountPercentage: pricing.discountPercentage,
                  minQuantity: pricing.minQuantity,
                  maxQuantity: pricing.maxQuantity,
                  startDate: pricing.startDate,
                  endDate: pricing.endDate,
                  isActive: pricing.isActive,
                  notes: pricing.notes
                },
                transaction
              });
            }
          }
        }

        // Update ingredients if provided
        if (ingredients && Array.isArray(ingredients)) {
          // Delete existing ingredients
          await sequelize.query(
            'DELETE FROM product_ingredients WHERE product_id = :productId',
            {
              replacements: { productId: id },
              transaction
            }
          );

          // Insert new ingredients
          for (const ingredient of ingredients) {
            if (!ingredient.ingredientId || !ingredient.quantity) continue;

            await sequelize.query(`
              INSERT INTO product_ingredients (
                id, product_id, ingredient_id, quantity, unit,
                cost, waste_percentage, is_optional, notes,
                created_at, updated_at
              ) VALUES (
                UUID(), :productId, :ingredientId, :quantity, :unit,
                :cost, :wastePercentage, :isOptional, :notes,
                NOW(), NOW()
              )
            `, {
              replacements: {
                productId: id,
                ingredientId: ingredient.ingredientId,
                quantity: ingredient.quantity,
                unit: ingredient.unit,
                cost: ingredient.cost,
                wastePercentage: ingredient.wastePercentage,
                isOptional: ingredient.isOptional,
                notes: ingredient.notes
              },
              transaction
            });
          }
        }

        await transaction.commit();

        // Get updated product
        const [updatedProduct] = await sequelize.query(`
          SELECT 
            p.*,
            c.name as category_name,
            u.name as unit_name
          FROM products p
          LEFT JOIN categories c ON p.category_id = c.id
          LEFT JOIN units u ON p.unit_id = u.id
          WHERE p.id = :id
        `, {
          replacements: { id },
          type: QueryTypes.SELECT
        });

        return res.status(200).json({
          success: true,
          message: 'Product updated successfully',
          data: updatedProduct
        });

      } catch (error) {
        await transaction.rollback();
        throw error;
      }

    } else {
      return res.status(405).json({ 
        success: false, 
        error: 'Method not allowed' 
      });
    }

  } catch (error: any) {
    console.error('Product regional pricing API error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message
    });
  }
}
