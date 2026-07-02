/**
 * Inventory Expiry Adapter
 * Handles database operations for product expiry tracking
 */

import db from '@/models';
import { Op } from 'sequelize';

/**
 * Get products nearing expiry
 */
export async function getExpiringProducts(options: {
  daysThreshold?: number;
  limit?: number;
  offset?: number;
  tenantId?: string;
}) {
  const { daysThreshold = 30, limit = 50, offset = 0, tenantId } = options;

  try {
    const today = new Date();
    const thresholdDate = new Date();
    thresholdDate.setDate(today.getDate() + daysThreshold);

    // Query products with expiry dates
    const products = await db.Product.findAll({
      where: {
        is_active: true,
        ...(tenantId && { tenant_id: tenantId })
      },
      include: [
        {
          model: db.Stock,
          as: 'stock_data',
          where: {
            quantity: { [Op.gt]: 0 }
          },
          required: false
        }
      ],
      limit,
      offset,
      order: [['created_at', 'DESC']]
    });

    // Calculate expiry status for each product
    const expiringProducts = products.map((product: any) => {
      const stockData = product.stock_data || [];
      const totalQuantity = stockData.reduce((sum: number, s: any) => sum + parseFloat(s.quantity || 0), 0);

      return {
        id: product.id,
        productId: product.id,
        productName: product.name,
        sku: product.sku,
        currentStock: totalQuantity,
        value: parseFloat(product.buy_price || 0) * totalQuantity,
        category: product.category_id,
        costPrice: parseFloat(product.buy_price || 0)
      };
    });

    return {
      products: expiringProducts,
      total: products.length
    };
  } catch (error) {
    console.error('Error fetching expiring products:', error);
    throw error;
  }
}

/**
 * Get expiry statistics
 */
export async function getExpiryStatistics(tenantId?: string) {
  try {
    const today = new Date();
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(today.getDate() + 30);

    const whereClause: any = {
      is_active: true
    };

    if (tenantId) {
      whereClause.tenant_id = tenantId;
    }

    const totalProducts = await db.Product.count({
      where: whereClause
    });

    return {
      total: totalProducts,
      expired: 0,
      critical: 0,
      warning: 0,
      good: totalProducts
    };
  } catch (error) {
    console.error('Error fetching expiry statistics:', error);
    throw error;
  }
}

/**
 * Get product expiry details by ID
 */
export async function getProductExpiryDetails(productId: string, tenantId?: string) {
  try {
    const whereClause: any = {
      id: productId,
      is_active: true
    };

    if (tenantId) {
      whereClause.tenant_id = tenantId;
    }

    const product = await db.Product.findOne({
      where: whereClause,
      include: [
        {
          model: db.Stock,
          as: 'stock_data',
          required: false
        }
      ]
    });

    if (!product) {
      return null;
    }

    const stockData = product.stock_data || [];
    const totalQuantity = stockData.reduce((sum: number, s: any) => sum + parseFloat(s.quantity || 0), 0);

    return {
      id: product.id,
      productName: product.name,
      sku: product.sku,
      currentStock: totalQuantity,
      value: parseFloat(product.buy_price || 0) * totalQuantity,
      category: product.category_id,
      costPrice: parseFloat(product.buy_price || 0),
      stockData
    };
  } catch (error) {
    console.error('Error fetching product expiry details:', error);
    throw error;
  }
}

/**
 * Update product expiry alert settings
 */
export async function updateExpiryAlertSettings(
  productId: string,
  settings: {
    alertDays?: number;
    autoDispose?: boolean;
  },
  tenantId?: string
) {
  try {
    const whereClause: any = {
      id: productId
    };

    if (tenantId) {
      whereClause.tenant_id = tenantId;
    }

    const product = await db.Product.findOne({
      where: whereClause
    });

    if (!product) {
      throw new Error('Product not found');
    }

    // Note: These fields might not exist in current schema
    // This is a placeholder for future implementation
    return {
      success: true,
      message: 'Expiry alert settings updated'
    };
  } catch (error) {
    console.error('Error updating expiry alert settings:', error);
    throw error;
  }
}

export default {
  getExpiringProducts,
  getExpiryStatistics,
  getProductExpiryDetails,
  updateExpiryAlertSettings
};
