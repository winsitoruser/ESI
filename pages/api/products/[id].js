const db = require('../../../models');
const { Product, Supplier, Recipe, ProductPrice, ProductVariant } = db;

/**
 * GET /api/products/:id - Get single product detail
 * PUT /api/products/:id - Update product
 * DELETE /api/products/:id - Delete product
 */
export default async function handler(req, res) {
  const { method, query } = req;
  const { id } = query;

  try {
    switch (method) {
      case 'GET':
        // Use raw query to get all available columns
        const [products] = await db.sequelize.query(
          'SELECT * FROM products WHERE id = :id LIMIT 1',
          {
            replacements: { id },
            type: db.Sequelize.QueryTypes.SELECT
          }
        );

        if (!products) {
          return res.status(404).json({
            success: false,
            message: 'Product not found'
          });
        }

        // Fetch related data
        let variants = [];
        let prices = [];
        
        try {
          const variantsResult = await db.sequelize.query(
            'SELECT * FROM product_variants WHERE product_id = :id',
            {
              replacements: { id },
              type: db.Sequelize.QueryTypes.SELECT
            }
          );
          variants = variantsResult || [];
        } catch (e) {
          console.log('No variants found:', e.message);
        }
        
        try {
          const pricesResult = await db.sequelize.query(
            'SELECT * FROM product_prices WHERE product_id = :id',
            {
              replacements: { id },
              type: db.Sequelize.QueryTypes.SELECT
            }
          );
          prices = pricesResult || [];
        } catch (e) {
          console.log('No prices found:', e.message);
        }

        return res.status(200).json({
          success: true,
          data: {
            ...products,
            variants: variants,
            prices: prices
          }
        });

      case 'PUT':
        const productToUpdate = await Product.findByPk(id);

        if (!productToUpdate) {
          return res.status(404).json({
            success: false,
            message: 'Product not found'
          });
        }

        const updateData = req.body;

        // Update main product data
        await productToUpdate.update({
          name: updateData.name || productToUpdate.name,
          sku: updateData.sku || productToUpdate.sku,
          barcode: updateData.barcode || productToUpdate.barcode,
          category: updateData.category || productToUpdate.category,
          description: updateData.description || productToUpdate.description,
          unit: updateData.unit || productToUpdate.unit,
          product_type: updateData.product_type || productToUpdate.product_type,
          price: updateData.price !== undefined ? parseFloat(updateData.price) : productToUpdate.price,
          purchase_price: updateData.purchase_price !== undefined ? parseFloat(updateData.purchase_price) : productToUpdate.purchase_price,
          production_cost: updateData.production_cost !== undefined ? parseFloat(updateData.production_cost) : productToUpdate.production_cost,
          markup_percentage: updateData.markup_percentage !== undefined ? parseFloat(updateData.markup_percentage) : productToUpdate.markup_percentage,
          stock: updateData.stock !== undefined ? parseFloat(updateData.stock) : productToUpdate.stock,
          min_stock: updateData.min_stock !== undefined ? parseFloat(updateData.min_stock) : productToUpdate.min_stock,
          max_stock: updateData.max_stock !== undefined ? parseFloat(updateData.max_stock) : productToUpdate.max_stock,
          reorder_point: updateData.reorder_point !== undefined ? parseFloat(updateData.reorder_point) : productToUpdate.reorder_point,
          supplier_id: updateData.supplier_id !== undefined ? updateData.supplier_id : productToUpdate.supplier_id,
          recipe_id: updateData.recipe_id !== undefined ? updateData.recipe_id : productToUpdate.recipe_id,
          // New fields
          long_description: updateData.long_description || productToUpdate.long_description,
          specifications: updateData.specifications || productToUpdate.specifications,
          features: updateData.features || productToUpdate.features,
          ingredients: updateData.ingredients || productToUpdate.ingredients,
          usage_instructions: updateData.usage_instructions || productToUpdate.usage_instructions,
          warnings: updateData.warnings || productToUpdate.warnings,
          internal_notes: updateData.internal_notes || productToUpdate.internal_notes,
          weight: updateData.weight !== undefined ? parseFloat(updateData.weight) : productToUpdate.weight,
          weight_unit: updateData.weight_unit || productToUpdate.weight_unit,
          length: updateData.length !== undefined ? parseFloat(updateData.length) : productToUpdate.length,
          width: updateData.width !== undefined ? parseFloat(updateData.width) : productToUpdate.width,
          height: updateData.height !== undefined ? parseFloat(updateData.height) : productToUpdate.height,
          dimension_unit: updateData.dimension_unit || productToUpdate.dimension_unit,
          volume: updateData.volume !== undefined ? parseFloat(updateData.volume) : productToUpdate.volume,
          volume_unit: updateData.volume_unit || productToUpdate.volume_unit,
          images: updateData.images || productToUpdate.images,
          thumbnail: updateData.thumbnail || productToUpdate.thumbnail,
          videos: updateData.videos || productToUpdate.videos,
          documents: updateData.documents || productToUpdate.documents,
          tags: updateData.tags || productToUpdate.tags,
          brand: updateData.brand || productToUpdate.brand,
          manufacturer: updateData.manufacturer || productToUpdate.manufacturer,
          country_of_origin: updateData.country_of_origin || productToUpdate.country_of_origin,
          is_active: updateData.is_active !== undefined ? updateData.is_active : productToUpdate.is_active
        });

        // Update variants if provided
        if (updateData.variants && updateData.variants.length > 0) {
          // Delete existing variants
          await ProductVariant.destroy({
            where: { product_id: id }
          });

          // Create new variants
          const variantData = updateData.variants.map((v, index) => ({
            product_id: id,
            variant_name: v.variant_name,
            variant_type: v.variant_type,
            sku: v.sku || null,
            barcode: v.barcode || null,
            price: v.price ? parseFloat(v.price) : null,
            cost: v.cost ? parseFloat(v.cost) : null,
            stock: v.stock ? parseFloat(v.stock) : 0,
            weight: v.weight ? parseFloat(v.weight) : null,
            dimensions: v.dimensions || null,
            image_url: v.image_url || null,
            attributes: v.attributes || null,
            is_active: v.is_active !== false,
            sort_order: index
          }));

          await ProductVariant.bulkCreate(variantData);
        }

        // Update tiered prices if provided
        if (updateData.tiered_prices && updateData.tiered_prices.length > 0) {
          // Delete existing prices
          await ProductPrice.destroy({
            where: { product_id: id }
          });

          // Create new prices
          const priceData = updateData.tiered_prices.map(tp => ({
            product_id: id,
            price_type: tp.price_type,
            tier_id: tp.tier_id || null,
            price: parseFloat(tp.price),
            discount_percentage: parseFloat(tp.discount_percentage) || 0,
            discount_amount: parseFloat(tp.discount_amount) || 0,
            min_quantity: parseInt(tp.min_quantity) || 1,
            notes: tp.tier_name || null,
            is_active: true
          }));

          await ProductPrice.bulkCreate(priceData);
        }

        // Fetch updated product with relations
        const updatedProduct = await Product.findByPk(id, {
          include: [
            {
              model: Supplier,
              as: 'supplier'
            },
            {
              model: Recipe,
              as: 'recipe'
            },
            {
              model: ProductPrice,
              as: 'prices'
            },
            {
              model: ProductVariant,
              as: 'variants'
            }
          ]
        });

        return res.status(200).json({
          success: true,
          data: updatedProduct,
          message: 'Product updated successfully'
        });

      case 'DELETE':
        const productToDelete = await Product.findByPk(id);

        if (!productToDelete) {
          return res.status(404).json({
            success: false,
            message: 'Product not found'
          });
        }

        // Soft delete (set isActive to false)
        await productToDelete.update({ isActive: false });

        // Or hard delete if preferred
        // await productToDelete.destroy();

        return res.status(200).json({
          success: true,
          message: 'Product deleted successfully'
        });

      default:
        res.setHeader('Allow', ['GET', 'PUT', 'DELETE']);
        return res.status(405).json({
          success: false,
          message: `Method ${method} not allowed`
        });
    }
  } catch (error) {
    console.error('Product API Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}
