const db = require('../models');

class InventoryService {
  // Product Management
  async createProduct(productData) {
    try {
      const product = await db.Product.create(productData);
      
      // Create initial stock record
      if (productData.initialStock) {
        await db.Stock.create({
          productId: product.id,
          quantity: productData.initialStock,
          warehouseId: productData.warehouseId || 1
        });
      }
      
      return await this.getProductById(product.id);
    } catch (error) {
      throw new Error(`Failed to create product: ${error.message}`);
    }
  }

  async getProductById(id) {
    try {
      return await db.Product.findByPk(id, {
        include: [
          { model: db.Category, as: 'category' },
          { model: db.Supplier, as: 'supplier' },
          { model: db.Stock, as: 'stocks' }
        ]
      });
    } catch (error) {
      throw new Error(`Failed to get product: ${error.message}`);
    }
  }

  async getProducts(filters = {}) {
    try {
      const { search, categoryId, supplierId, page = 1, limit = 20 } = filters;
      const where = {};
      
      if (search) {
        where[db.Sequelize.Op.or] = [
          { name: { [db.Sequelize.Op.iLike]: `%${search}%` } },
          { sku: { [db.Sequelize.Op.iLike]: `%${search}%` } }
        ];
      }
      
      if (categoryId) {
        where.categoryId = categoryId;
      }
      
      if (supplierId) {
        where.supplierId = supplierId;
      }

      const offset = (page - 1) * limit;

      const { rows, count } = await db.Product.findAndCountAll({
        where,
        include: [
          { model: db.Category, as: 'category' },
          { model: db.Supplier, as: 'supplier' },
          { model: db.Stock, as: 'stocks' }
        ],
        limit,
        offset,
        order: [['name', 'ASC']]
      });

      return {
        products: rows,
        total: count,
        page,
        totalPages: Math.ceil(count / limit)
      };
    } catch (error) {
      throw new Error(`Failed to get products: ${error.message}`);
    }
  }

  async updateProduct(id, updateData) {
    try {
      const product = await db.Product.findByPk(id);
      if (!product) {
        throw new Error('Product not found');
      }
      
      await product.update(updateData);
      return await this.getProductById(id);
    } catch (error) {
      throw new Error(`Failed to update product: ${error.message}`);
    }
  }

  async deleteProduct(id) {
    try {
      const product = await db.Product.findByPk(id);
      if (!product) {
        throw new Error('Product not found');
      }
      
      await product.destroy();
      return { success: true, message: 'Product deleted successfully' };
    } catch (error) {
      throw new Error(`Failed to delete product: ${error.message}`);
    }
  }

  // Stock Management
  async getStock(productId, warehouseId = null) {
    try {
      const where = { productId };
      if (warehouseId) {
        where.warehouseId = warehouseId;
      }

      return await db.Stock.findAll({
        where,
        include: [
          { model: db.Product, as: 'product' }
        ]
      });
    } catch (error) {
      throw new Error(`Failed to get stock: ${error.message}`);
    }
  }

  async adjustStock(adjustmentData) {
    try {
      const { productId, warehouseId, quantity, type, reason, userId } = adjustmentData;
      
      // Create adjustment record
      const adjustment = await db.StockAdjustment.create({
        type,
        reason,
        userId,
        status: 'completed',
        adjustedAt: new Date()
      });

      // Create adjustment item
      await db.StockAdjustmentItem.create({
        adjustmentId: adjustment.id,
        productId,
        quantity,
        warehouseId
      });

      // Update stock
      const stock = await db.Stock.findOne({
        where: { productId, warehouseId }
      });

      if (stock) {
        const newQuantity = type === 'increase' 
          ? stock.quantity + quantity 
          : stock.quantity - quantity;
        
        await stock.update({ quantity: Math.max(0, newQuantity) });
      } else {
        await db.Stock.create({
          productId,
          warehouseId,
          quantity: type === 'increase' ? quantity : 0
        });
      }

      // Create stock movement record
      await db.StockMovement.create({
        productId,
        warehouseId,
        type: type === 'increase' ? 'in' : 'out',
        quantity,
        reference: `ADJ-${adjustment.id}`,
        notes: reason
      });

      return adjustment;
    } catch (error) {
      throw new Error(`Failed to adjust stock: ${error.message}`);
    }
  }

  async getLowStock(threshold = 10) {
    try {
      const stocks = await db.Stock.findAll({
        where: {
          quantity: { [db.Sequelize.Op.lte]: threshold }
        },
        include: [
          { model: db.Product, as: 'product' }
        ],
        order: [['quantity', 'ASC']]
      });

      return stocks;
    } catch (error) {
      throw new Error(`Failed to get low stock: ${error.message}`);
    }
  }

  async getStockMovements(filters = {}) {
    try {
      const { productId, warehouseId, startDate, endDate, page = 1, limit = 20 } = filters;
      const where = {};
      
      if (productId) {
        where.productId = productId;
      }
      
      if (warehouseId) {
        where.warehouseId = warehouseId;
      }
      
      if (startDate && endDate) {
        where.createdAt = {
          [db.Sequelize.Op.between]: [startDate, endDate]
        };
      }

      const offset = (page - 1) * limit;

      const { rows, count } = await db.StockMovement.findAndCountAll({
        where,
        include: [
          { model: db.Product, as: 'product' }
        ],
        limit,
        offset,
        order: [['createdAt', 'DESC']]
      });

      return {
        movements: rows,
        total: count,
        page,
        totalPages: Math.ceil(count / limit)
      };
    } catch (error) {
      throw new Error(`Failed to get stock movements: ${error.message}`);
    }
  }

  // Category Management
  async createCategory(categoryData) {
    try {
      return await db.Category.create(categoryData);
    } catch (error) {
      throw new Error(`Failed to create category: ${error.message}`);
    }
  }

  async getCategories() {
    try {
      return await db.Category.findAll({
        order: [['name', 'ASC']]
      });
    } catch (error) {
      throw new Error(`Failed to get categories: ${error.message}`);
    }
  }

  // Supplier Management
  async createSupplier(supplierData) {
    try {
      return await db.Supplier.create(supplierData);
    } catch (error) {
      throw new Error(`Failed to create supplier: ${error.message}`);
    }
  }

  async getSuppliers() {
    try {
      return await db.Supplier.findAll({
        order: [['name', 'ASC']]
      });
    } catch (error) {
      throw new Error(`Failed to get suppliers: ${error.message}`);
    }
  }
}

module.exports = new InventoryService();
