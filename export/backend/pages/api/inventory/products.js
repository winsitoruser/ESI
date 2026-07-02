const db = require('../../../models');
const { Product, Supplier, Recipe, RecipeIngredient } = db;

export default async function handler(req, res) {
  const { method, query } = req;

  try {
    switch (method) {
      case 'GET':
        const { type, search, category } = query;
        
        let where = {};
        
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
        
        const products = await Product.findAll({
          where,
          include: [
            {
              model: Supplier,
              as: 'supplier',
              attributes: ['id', 'name', 'code']
            },
            {
              model: Recipe,
              as: 'recipe',
              attributes: ['id', 'name', 'code', 'total_cost']
            }
          ],
          order: [['name', 'ASC']]
        });
        
        return res.status(200).json({
          success: true,
          data: products
        });

      case 'POST':
        const { recipe_ingredients, ...productData } = req.body;
        
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
          is_active: productData.is_active !== false
        });
        
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
