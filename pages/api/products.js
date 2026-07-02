const db = require('../../models');
const { Product, Supplier, Recipe, RecipeIngredient, ProductPrice, ProductVariant } = db;

export default async function handler(req, res) {
  const { method, query } = req;

  try {
    switch (method) {
      case 'GET':
        const { type, search, category, page, limit } = query;
        
        let where = { is_active: true };
        
        // Filter by product type
        if (type) {
          where.product_type = type;
        }
        
        // Filter by search
        if (search) {
          where[db.Sequelize.Op.or] = [
            { name: { [db.Sequelize.Op.iLike]: `%${search}%` } },
            { sku: { [db.Sequelize.Op.iLike]: `%${search}%` } }
          ];
        }
        
        // Filter by category
        if (category) {
          where.category = category;
        }
        
        // Pagination
        const pageNum = parseInt(page) || 1;
        const limitNum = parseInt(limit) || 10;
        const offset = (pageNum - 1) * limitNum;
        
        // Get total count
        const totalCount = await Product.count({ where });
        
        // Get products with pagination and stock data
        const products = await Product.findAll({
          where,
          attributes: [
            'id', 
            'name', 
            'sku', 
            'category_id',
            'sell_price',
            'buy_price',
            'unit', 
            'is_active', 
            'minimum_stock', 
            'maximum_stock',
            'reorder_point'
          ],
          include: [{
            model: db.Stock,
            as: 'stock_data',
            attributes: ['quantity', 'location_id'],
            required: false
          }],
          order: [['name', 'ASC']],
          limit: limitNum,
          offset: offset
        });
        
        // Transform data to match frontend expectations
        const transformedProducts = products.map(product => {
          const stockData = product.stock_data || [];
          const totalStock = stockData.reduce((sum, s) => sum + parseFloat(s.quantity || 0), 0);
          
          return {
            id: product.id,
            name: product.name,
            sku: product.sku,
            category: product.category_id,
            price: product.sell_price,
            stock: totalStock,
            unit: product.unit,
            is_active: product.is_active,
            minStock: product.minimum_stock,
            min_stock: product.minimum_stock,
            maxStock: product.maximum_stock,
            max_stock: product.maximum_stock,
            reorder_point: product.reorder_point,
            buy_price: product.buy_price,
            sell_price: product.sell_price
          };
        });
        
        return res.status(200).json({
          success: true,
          data: transformedProducts,
          total: totalCount,
          page: pageNum,
          limit: limitNum,
          totalPages: Math.ceil(totalCount / limitNum)
        });

      case 'POST':
        const { recipe_ingredients, tiered_prices, variants, ...productData } = req.body;
        
        // If product is manufactured and has inline recipe ingredients
        if (productData.product_type === 'manufactured' && recipe_ingredients && recipe_ingredients.length > 0) {
          // Create recipe first
          const recipeCode = `RCP-${Date.now()}`;
          const totalCost = recipe_ingredients.reduce((sum, ing) => sum + parseFloat(ing.subtotal || 0), 0);
          
          const newRecipe = await Recipe.create({
            code: recipeCode,
            name: `Recipe for ${productData.name}`,
            batch_size: productData.batch_size || 1,
            batch_unit: productData.unit,
            total_cost: totalCost,
            total_production_cost: totalCost,
            cost_per_unit: totalCost / (productData.batch_size || 1),
            status: 'active'
          });
          
          // Create recipe ingredients
          const ingredientData = recipe_ingredients.map((ing, index) => ({
            recipe_id: newRecipe.id,
            product_id: parseInt(ing.product_id),
            quantity: parseFloat(ing.quantity),
            unit: ing.unit,
            unit_cost: parseFloat(ing.unit_cost),
            subtotal_cost: parseFloat(ing.subtotal),
            sort_order: index
          }));
          
          await RecipeIngredient.bulkCreate(ingredientData);
          
          // Link recipe to product
          productData.recipe_id = newRecipe.id;
        }
        
        // Create product
        const newProduct = await Product.create({
          name: productData.name,
          sku: productData.sku,
          barcode: productData.barcode,
          category: productData.category,
          description: productData.description,
          unit: productData.unit,
          product_type: productData.product_type,
          price: parseFloat(productData.price) || 0,
          purchase_price: parseFloat(productData.purchase_price) || null,
          production_cost: parseFloat(productData.production_cost) || null,
          markup_percentage: parseFloat(productData.markup_percentage) || 0,
          stock: parseFloat(productData.stock) || 0,
          min_stock: parseFloat(productData.min_stock) || 0,
          max_stock: parseFloat(productData.max_stock) || 0,
          reorder_point: parseFloat(productData.reorder_point) || 0,
          supplier_id: productData.supplier_id ? parseInt(productData.supplier_id) : null,
          recipe_id: productData.recipe_id ? parseInt(productData.recipe_id) : null,
          can_be_sold: productData.can_be_sold !== false,
          can_be_purchased: productData.can_be_purchased !== false,
          can_be_produced: productData.can_be_produced === true,
          lead_time_days: parseInt(productData.lead_time_days) || 0,
          production_time_minutes: parseInt(productData.production_time_minutes) || 0,
          batch_size: parseFloat(productData.batch_size) || 1,
          quality_grade: productData.quality_grade || null,
          shelf_life_days: parseInt(productData.shelf_life_days) || null,
          storage_temperature: productData.storage_temperature || null,
          requires_batch_tracking: productData.requires_batch_tracking === true,
          requires_expiry_tracking: productData.requires_expiry_tracking === true,
          is_active: productData.is_active !== false,
          // New detailed info fields
          long_description: productData.long_description || null,
          specifications: productData.specifications || null,
          features: productData.features || null,
          ingredients: productData.ingredients || null,
          usage_instructions: productData.usage_instructions || null,
          warnings: productData.warnings || null,
          internal_notes: productData.internal_notes || null,
          // Dimensions and weight
          weight: productData.weight ? parseFloat(productData.weight) : null,
          weight_unit: productData.weight_unit || 'kg',
          length: productData.length ? parseFloat(productData.length) : null,
          width: productData.width ? parseFloat(productData.width) : null,
          height: productData.height ? parseFloat(productData.height) : null,
          dimension_unit: productData.dimension_unit || 'cm',
          volume: productData.volume ? parseFloat(productData.volume) : null,
          volume_unit: productData.volume_unit || 'liter',
          // Media fields
          images: productData.images || null,
          thumbnail: productData.thumbnail || null,
          videos: productData.videos || null,
          documents: productData.documents || null,
          // Metadata
          tags: productData.tags || null,
          brand: productData.brand || null,
          manufacturer: productData.manufacturer || null,
          country_of_origin: productData.country_of_origin || null
        });
        
        // Create tiered prices if provided
        if (tiered_prices && tiered_prices.length > 0) {
          const { ProductPrice } = db;
          const priceData = tiered_prices.map(tp => ({
            product_id: newProduct.id,
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
        
        // Create product variants if provided
        if (variants && variants.length > 0) {
          const { ProductVariant } = db;
          const variantData = variants.map((v, index) => ({
            product_id: newProduct.id,
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
        
        // Fetch created product with relations
        const createdProduct = await Product.findByPk(newProduct.id, {
          include: [
            {
              model: Supplier,
              as: 'supplier'
            },
            {
              model: Recipe,
              as: 'recipe',
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
            }
          ]
        });
        
        return res.status(201).json({
          success: true,
          data: createdProduct,
          message: 'Produk berhasil dibuat'
        });

      default:
        res.setHeader('Allow', ['GET', 'POST']);
        return res.status(405).json({
          success: false,
          message: `Method ${method} not allowed`
        });
    }
  } catch (error) {
    console.error('Products API Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};
