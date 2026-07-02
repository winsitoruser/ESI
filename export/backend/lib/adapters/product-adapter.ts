/**
 * Product Adapter for Sequelize
 * 
 * Provides CRUD operations for Products with robust error handling
 * Uses real database operations without mock data fallbacks
 */

import { Op } from 'sequelize';
import sequelize from '@/lib/db';
import logger from '@/lib/logger';

// Default error timeout
const DB_TIMEOUT = 5000;

export interface ProductFilter {
  search?: string;
  category?: string;
  lowStock?: boolean;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
  isToling?: boolean;
  supplierId?: string;
  shelfPositionId?: string;
  branchId?: string;
  aggregateAll?: boolean; // If true, aggregate data from all branches under partnerId
}

export interface UserContext {
  userId: number;
  role: 'SUPER_ADMIN' | 'ADMIN' | 'BRANCH_MANAGER' | 'CASHIER' | 'STAFF';
  branchId?: string;
  partnerId?: string;
  tenantId?: string;
}

export interface PriceUpdateData {
  price?: number;
  discountPercentage?: number;
  discountAmount?: number;
  isStandard?: boolean;
  priceTierId?: string;
  requiresApproval?: boolean;
}

// Roles that can modify standard prices
const STANDARD_PRICE_ROLES = ['SUPER_ADMIN', 'ADMIN'];

// Validate if user can modify standard price
const canModifyStandardPrice = (userRole: string): boolean => {
  return STANDARD_PRICE_ROLES.includes(userRole);
};

// Helper function to create a timeout promise
const createTimeout = (ms: number) => {
  return new Promise((_, reject) => {
    setTimeout(() => reject(new Error(`Database operation timed out after ${ms}ms`)), ms);
  });
};

/**
 * Get products with filtering and pagination
 */
export const getProducts = async (filter: ProductFilter = {}, tenantId?: string) => {
  try {
    // Create query filters
    const where: any = {};
    
    // Add tenant filter if provided
    if (tenantId) {
      where.tenantId = tenantId;
    }
    
    // Add toling filter if specified
    if (filter.isToling !== undefined) {
      where.isToling = filter.isToling;
    }
    
    // Add search filter
    if (filter.search) {
      where[Op.or] = [
        { name: { [Op.iLike]: `%${filter.search}%` } },
        { sku: { [Op.iLike]: `%${filter.search}%` } },
        { description: { [Op.iLike]: `%${filter.search}%` } }
      ];
    }
    
    // Add category filter
    if (filter.category) {
      where.categoryId = filter.category;
    }
    
    // Add low stock filter
    if (filter.lowStock) {
      where.stock = { [Op.lte]: sequelize.literal('"reorderPoint"') };
    }
    
    // Add supplier filter
    if (filter.supplierId) {
      where.supplierId = filter.supplierId;
    }
    
    // Add shelf position filter
    if (filter.shelfPositionId) {
      where.shelfPositionId = filter.shelfPositionId;
    }
    
    // Set up pagination
    const page = filter.page || 1;
    const limit = filter.limit || 20;
    const offset = (page - 1) * limit;
    
    // Set up sorting
    const order: any = [];
    if (filter.sortBy) {
      order.push([filter.sortBy, filter.sortOrder || 'ASC']);
    } else {
      order.push(['createdAt', 'DESC']);
    }
    
    // Execute query with timeout
    try {
      const Product = sequelize.models.Product;
      if (!Product) {
        throw new Error('Product model not found in Sequelize');
      }
      
      const result = await Promise.race([
        Product.findAndCountAll({
          where,
          limit,
          offset,
          order,
          include: [
            { 
              model: sequelize.models.ProductCategory, 
              as: 'productCategory',
              required: false
            },
            {
              model: sequelize.models.Supplier,
              as: 'productSupplier',
              required: false
            }
          ]
        }),
        createTimeout(DB_TIMEOUT)
      ]) as any;
      
      return {
        products: result.rows.map((product: any) => product.get({ plain: true })),
        total: result.count,
        page,
        limit,
        totalPages: Math.ceil(result.count / limit),
        isFromMock: false
      };
    } catch (queryError) {
      logger.error('Database query for products failed:', queryError as any);
      throw queryError;
    }
  } catch (error: any) {
    logger.error('Error getting products from database:', error as any);
    throw new Error('Failed to retrieve products from database: ' + error.message);
  }
};

/**
 * Get a single product by ID
 */
export const getProductById = async (id: string) => {
  try {
    const Product = sequelize.models.Product;
    if (!Product) {
      throw new Error('Product model not found in Sequelize');
    }
    
    const product = await Promise.race([
      Product.findByPk(id, {
        include: [
          { 
            model: sequelize.models.ProductCategory, 
            as: 'productCategory',
            required: false
          },
          {
            model: sequelize.models.Supplier,
            as: 'productSupplier',
            required: false
          }
        ]
      }),
      createTimeout(DB_TIMEOUT)
    ]) as any;
    
    if (!product) {
      return null;
    }
    
    return {
      ...product.get({ plain: true }),
      isFromMock: false
    };
  } catch (error: any) {
    logger.error(`Error getting product by ID ${id}:`, error as any);
    throw new Error(`Failed to retrieve product with ID ${id}: ${error.message}`);
  }
};

/**
 * Create a new product
 */
export const createProduct = async (productData: any) => {
  try {
    const Product = sequelize.models.Product;
    if (!Product) {
      throw new Error('Product model not found in Sequelize');
    }
    
    const product = await Promise.race([
      Product.create({
        ...productData,
        categoryColor: productData.categoryColor || '#ef4444' // Default red color from red-orange scheme
      }),
      createTimeout(DB_TIMEOUT)
    ]) as any;
    
    return {
      ...product.get({ plain: true }),
      isFromMock: false
    };
  } catch (error) {
    logger.error('Error creating product:', error as any);
    throw error; // For creation, we don't fallback to mock - we want to know if it failed
  }
};

/**
 * Update an existing product
 */
export const updateProduct = async (id: string, productData: any) => {
  try {
    const Product = sequelize.models.Product;
    if (!Product) {
      throw new Error('Product model not found in Sequelize');
    }
    
    const product = await Product.findByPk(id);
    
    if (!product) {
      return null;
    }
    
    await Promise.race([
      product.update(productData),
      createTimeout(DB_TIMEOUT)
    ]);
    
    const updatedProduct = await Product.findByPk(id, {
      include: [
        { 
          model: sequelize.models.ProductCategory, 
          as: 'productCategory',
          required: false
        },
        {
          model: sequelize.models.Supplier,
          as: 'productSupplier',
          required: false
        }
      ]
    });
    
    return {
      ...updatedProduct!.get({ plain: true }),
      isFromMock: false
    };
  } catch (error) {
    logger.error(`Error updating product ${id}:`, error as any);
    throw error; // For updates, we don't fallback to mock - we want to know if it failed
  }
};

/**
 * Delete a product (soft delete)
 */
export const deleteProduct = async (id: string) => {
  try {
    const Product = sequelize.models.Product;
    if (!Product) {
      throw new Error('Product model not found in Sequelize');
    }
    
    const product = await Product.findByPk(id);
    
    if (!product) {
      return false;
    }
    
    await Promise.race([
      product.destroy(),
      createTimeout(DB_TIMEOUT)
    ]);
    
    return true;
  } catch (error) {
    logger.error(`Error deleting product ${id}:`, error as any);
    throw error; // For deletion, we don't fallback to mock - we want to know if it failed
  }
};

/**
 * Get all products with low stock (below reorder point)
 */
export const getLowStockProducts = async (tenantId?: string) => {
  try {
    const Product = sequelize.models.Product;
    if (!Product) {
      throw new Error('Product model not found in Sequelize');
    }
    
    const where: any = {
      stock: { [Op.lte]: sequelize.literal('"reorderPoint"') }
    };
    
    if (tenantId) {
      where.tenantId = tenantId;
    }
    
    const products = await Promise.race([
      Product.findAll({
        where,
        include: [
          { 
            model: sequelize.models.ProductCategory, 
            as: 'productCategory',
            required: false
          },
          {
            model: sequelize.models.Supplier,
            as: 'productSupplier',
            required: false
          }
        ],
        order: [['stock', 'ASC']]
      }),
      createTimeout(DB_TIMEOUT)
    ]) as any[];
    
    return {
      products: products.map((product: any) => product.get({ plain: true })),
      isFromMock: false
    };
  } catch (error: any) {
    logger.error('Error getting low stock products:', error as any);
    throw new Error('Failed to retrieve low stock products: ' + error.message);
  }
};

/**
 * Get toling products with filtering and enhanced features specific to toling products
 * 
 * This method integrates with the specialized toling products API endpoint
 * which provides additional fields like composition, purity, and categoryColor
 * in the red-orange color palette, handling timeouts and fallbacks gracefully.
 */
export const getTolingProducts = async (filter: ProductFilter = {}, tenantId?: string) => {
  try {
    // Create API request with specialized timeout for toling products
    const timeoutPromise = createTimeout(DB_TIMEOUT);
    const tolingQueryParams = new URLSearchParams();
    
    // Add all valid filter parameters to query
    if (filter.search) tolingQueryParams.append('search', filter.search);
    if (filter.category) tolingQueryParams.append('category', filter.category);
    if (filter.lowStock) tolingQueryParams.append('lowStock', 'true');
    if (filter.page) tolingQueryParams.append('page', filter.page.toString());
    if (filter.limit) tolingQueryParams.append('limit', filter.limit.toString());
    if (filter.sortBy) tolingQueryParams.append('sortBy', filter.sortBy);
    if (filter.sortOrder) tolingQueryParams.append('sortOrder', filter.sortOrder);
    if (filter.supplierId) tolingQueryParams.append('supplierId', filter.supplierId);
    if (filter.shelfPositionId) tolingQueryParams.append('shelfPositionId', filter.shelfPositionId);
    
    // Add tenant ID for multi-tenant support
    if (tenantId) tolingQueryParams.append('tenantId', tenantId);
    
    // Use the dedicated toling products API endpoint for specialized processing
    const apiPath = `/api/inventory/products/toling?${tolingQueryParams.toString()}`;
    
    // Use fetch API with timeout race
    const fetchPromise = fetch(apiPath)
      .then(response => {
        if (!response.ok) {
          throw new Error(`API request failed with status: ${response.status}`);
        }
        return response.json();
      });
      
    // Race between fetch and timeout
    const result = await Promise.race([fetchPromise, timeoutPromise]) as any;
    
    if (!result || !result.data) {
      logger.error('Invalid response format from toling API');
      // Fallback to regular product function with toling filter
      return getProducts({
        ...filter,
        isToling: true
      }, tenantId);
    }
    
    // Process and enhance data if needed
    const products = result.data.map((product: any) => {
      // Ensure red-orange category colors for consistency
      let categoryColor = product.categoryColor;
      if (!categoryColor) {
        categoryColor = '#ef4444'; // Default to red
      }
      
      return {
        ...product,
        categoryColor,
        isToling: true
      };
    });
    
    return {
      products,
      total: result.meta?.total || products.length,
      page: result.meta?.page || filter.page || 1,
      limit: result.meta?.limit || filter.limit || 20,
      totalPages: result.meta?.totalPages || 1,
      isFromMock: result.meta?.isFromMock || false,
      message: result.message || 'Toling products retrieved successfully'
    };
  } catch (error) {
    logger.error('Error fetching toling products:', error as any);
    
    // Fallback to general product retrieval with toling filter
    logger.info('Falling back to general product retrieval for toling products');
    return getProducts({
      ...filter,
      isToling: true
    }, tenantId);
  }
};

/**
 * Update product price with role-based access control
 * BRANCH_MANAGER cannot update prices marked as isStandard
 */
export const updateProductPrice = async (
  priceId: number,
  priceData: PriceUpdateData,
  userContext: UserContext
) => {
  try {
    const ProductPrice = sequelize.models.ProductPrice;
    if (!ProductPrice) {
      throw new Error('ProductPrice model not found in Sequelize');
    }

    // Get existing price record
    const existingPrice = await ProductPrice.findByPk(priceId) as any;
    if (!existingPrice) {
      return { success: false, error: 'Price record not found' };
    }

    // Check if price is standard and user is BRANCH_MANAGER
    if (existingPrice.is_standard && !canModifyStandardPrice(userContext.role)) {
      logger.warn(`User ${userContext.userId} (${userContext.role}) attempted to modify standard price ${priceId}`);
      return {
        success: false,
        error: 'UNAUTHORIZED: Harga standar dari Pusat tidak dapat diubah oleh Branch Manager. Hubungi SUPER_ADMIN untuk perubahan harga.',
        code: 'STANDARD_PRICE_LOCKED'
      };
    }

    // If trying to set isStandard, only SUPER_ADMIN can do it
    if (priceData.isStandard !== undefined && priceData.isStandard === true) {
      if (userContext.role !== 'SUPER_ADMIN') {
        return {
          success: false,
          error: 'UNAUTHORIZED: Hanya SUPER_ADMIN yang dapat mengunci harga sebagai standar.',
          code: 'INSUFFICIENT_PERMISSION'
        };
      }
      // Set locked_by and locked_at when marking as standard
      (priceData as any).locked_by = userContext.userId;
      (priceData as any).locked_at = new Date();
    }

    // If price requires approval and user is BRANCH_MANAGER, create approval request
    if (existingPrice.requires_approval && userContext.role === 'BRANCH_MANAGER') {
      // Create price change request instead of direct update
      const PriceChangeRequest = sequelize.models.PriceChangeRequest;
      if (PriceChangeRequest) {
        await PriceChangeRequest.create({
          product_price_id: priceId,
          requested_by: userContext.userId,
          branch_id: userContext.branchId,
          current_price: existingPrice.price,
          requested_price: priceData.price,
          status: 'pending',
          request_reason: 'Price change request from branch'
        });
        return {
          success: true,
          message: 'Permintaan perubahan harga telah dikirim ke Pusat untuk approval.',
          requiresApproval: true
        };
      }
    }

    // Perform the update
    await existingPrice.update({
      ...priceData,
      is_standard: priceData.isStandard,
      price_tier_id: priceData.priceTierId,
      requires_approval: priceData.requiresApproval
    });

    // Log the price change for audit
    await logPriceChange(priceId, existingPrice.price, priceData.price, userContext);

    return {
      success: true,
      data: existingPrice.get({ plain: true }),
      message: 'Harga berhasil diperbarui'
    };
  } catch (error: any) {
    logger.error(`Error updating product price ${priceId}:`, error);
    throw error;
  }
};

/**
 * Lock a product price as standard (only SUPER_ADMIN)
 */
export const lockPriceAsStandard = async (
  priceId: number,
  userContext: UserContext
) => {
  if (userContext.role !== 'SUPER_ADMIN') {
    return {
      success: false,
      error: 'UNAUTHORIZED: Hanya SUPER_ADMIN yang dapat mengunci harga sebagai standar.',
      code: 'INSUFFICIENT_PERMISSION'
    };
  }

  try {
    const ProductPrice = sequelize.models.ProductPrice;
    const price = await ProductPrice.findByPk(priceId) as any;
    
    if (!price) {
      return { success: false, error: 'Price record not found' };
    }

    await price.update({
      is_standard: true,
      locked_by: userContext.userId,
      locked_at: new Date()
    });

    logger.info(`Price ${priceId} locked as standard by SUPER_ADMIN ${userContext.userId}`);

    return {
      success: true,
      message: 'Harga berhasil dikunci sebagai harga standar Pusat',
      data: price.get({ plain: true })
    };
  } catch (error: any) {
    logger.error(`Error locking price ${priceId}:`, error);
    throw error;
  }
};

/**
 * Unlock a standard price (only SUPER_ADMIN)
 */
export const unlockStandardPrice = async (
  priceId: number,
  userContext: UserContext
) => {
  if (userContext.role !== 'SUPER_ADMIN') {
    return {
      success: false,
      error: 'UNAUTHORIZED: Hanya SUPER_ADMIN yang dapat membuka kunci harga standar.',
      code: 'INSUFFICIENT_PERMISSION'
    };
  }

  try {
    const ProductPrice = sequelize.models.ProductPrice;
    const price = await ProductPrice.findByPk(priceId) as any;
    
    if (!price) {
      return { success: false, error: 'Price record not found' };
    }

    await price.update({
      is_standard: false,
      locked_by: null,
      locked_at: null
    });

    logger.info(`Price ${priceId} unlocked from standard by SUPER_ADMIN ${userContext.userId}`);

    return {
      success: true,
      message: 'Harga standar berhasil dibuka kuncinya',
      data: price.get({ plain: true })
    };
  } catch (error: any) {
    logger.error(`Error unlocking price ${priceId}:`, error);
    throw error;
  }
};

/**
 * Get products with aggregation across all branches (for HQ reporting)
 */
export const getProductsAggregated = async (
  filter: ProductFilter = {},
  userContext: UserContext
) => {
  // Only SUPER_ADMIN and ADMIN can aggregate all branches
  if (!['SUPER_ADMIN', 'ADMIN'].includes(userContext.role)) {
    return getProducts(filter, userContext.tenantId);
  }

  try {
    const Product = sequelize.models.Product;
    const ProductPrice = sequelize.models.ProductPrice;
    const Branch = sequelize.models.Branch;

    if (!Product || !ProductPrice) {
      throw new Error('Required models not found');
    }

    // Get all products with prices across all branches
    const products = await Product.findAll({
      include: [
        {
          model: ProductPrice,
          as: 'prices',
          include: [
            { model: Branch, as: 'branch', required: false }
          ]
        }
      ],
      where: filter.search ? {
        [Op.or]: [
          { name: { [Op.iLike]: `%${filter.search}%` } },
          { sku: { [Op.iLike]: `%${filter.search}%` } }
        ]
      } : undefined
    });

    // Aggregate price data per product
    const aggregatedProducts = products.map((product: any) => {
      const plainProduct = product.get({ plain: true });
      const prices = plainProduct.prices || [];
      
      return {
        ...plainProduct,
        priceStats: {
          standardPrice: prices.find((p: any) => p.is_standard)?.price || null,
          minPrice: Math.min(...prices.map((p: any) => parseFloat(p.price) || 0)),
          maxPrice: Math.max(...prices.map((p: any) => parseFloat(p.price) || 0)),
          avgPrice: prices.length > 0 
            ? prices.reduce((sum: number, p: any) => sum + parseFloat(p.price || 0), 0) / prices.length 
            : 0,
          branchCount: new Set(prices.map((p: any) => p.branch_id).filter(Boolean)).size,
          hasStandardPrice: prices.some((p: any) => p.is_standard)
        }
      };
    });

    return {
      products: aggregatedProducts,
      total: aggregatedProducts.length,
      isAggregated: true,
      isFromMock: false
    };
  } catch (error: any) {
    logger.error('Error getting aggregated products:', error);
    throw error;
  }
};

/**
 * Log price changes for audit trail
 */
const logPriceChange = async (
  priceId: number,
  oldPrice: number,
  newPrice: number | undefined,
  userContext: UserContext
) => {
  try {
    const AuditLog = sequelize.models.AuditLog;
    if (AuditLog && newPrice !== undefined) {
      await AuditLog.create({
        entity_type: 'ProductPrice',
        entity_id: priceId.toString(),
        action: 'UPDATE',
        old_values: JSON.stringify({ price: oldPrice }),
        new_values: JSON.stringify({ price: newPrice }),
        user_id: userContext.userId,
        user_role: userContext.role,
        branch_id: userContext.branchId,
        is_hq_intervention: ['SUPER_ADMIN', 'ADMIN'].includes(userContext.role) && userContext.branchId !== userContext.branchId,
        ip_address: null,
        created_at: new Date()
      });
    }
  } catch (error) {
    logger.warn('Failed to log price change:', error);
  }
};

export default {
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  getLowStockProducts,
  getTolingProducts,
  updateProductPrice,
  lockPriceAsStandard,
  unlockStandardPrice,
  getProductsAggregated,
  canModifyStandardPrice
};
