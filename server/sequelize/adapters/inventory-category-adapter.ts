/**
 * Inventory Category Adapter
 * Handles database operations for product categories
 */

import db from '@/models';
import { Op, QueryTypes } from 'sequelize';

/**
 * Get all categories
 */
export async function getAllCategories(tenantId?: string) {
  try {
    // Note: Using raw query since Category model structure is unknown
    const categories = await db.sequelize.query(`
      SELECT DISTINCT category_id, COUNT(*) as product_count
      FROM products
      WHERE is_active = true AND category_id IS NOT NULL
      GROUP BY category_id
      ORDER BY category_id
    `, { type: QueryTypes.SELECT });

    return categories;
  } catch (error) {
    console.error('Error fetching categories:', error);
    return [];
  }
}

/**
 * Get category by ID
 */
export async function getCategoryById(categoryId: number, tenantId?: string) {
  try {
    const category = await db.sequelize.query(`
      SELECT category_id, COUNT(*) as product_count
      FROM products
      WHERE is_active = true AND category_id = :categoryId
      GROUP BY category_id
    `, {
      replacements: { categoryId },
      type: QueryTypes.SELECT
    });

    return category[0] || null;
  } catch (error) {
    console.error('Error fetching category by ID:', error);
    return null;
  }
}

/**
 * Get category statistics
 */
export async function getCategoryStatistics(tenantId?: string) {
  try {
    const stats = await db.sequelize.query(`
      SELECT 
        category_id,
        COUNT(*) as product_count,
        SUM(COALESCE(s.quantity, 0)) as total_stock
      FROM products p
      LEFT JOIN inventory_stock s ON s.product_id = p.id
      WHERE p.is_active = true AND p.category_id IS NOT NULL
      GROUP BY category_id
      ORDER BY product_count DESC
    `, { type: QueryTypes.SELECT });

    return stats;
  } catch (error) {
    console.error('Error fetching category statistics:', error);
    return [];
  }
}

export default {
  getAllCategories,
  getCategoryById,
  getCategoryStatistics
};
