import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../auth/[...nextauth]';
import { sequelize } from '@/lib/sequelizeClient';
import { QueryTypes } from 'sequelize';
import { webhookService } from '@/lib/webhookService';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    const session = await getServerSession(req, res, authOptions);

    if (!session || !session.user) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    if (req.method === 'POST') {
      const { branchId, threshold } = req.body;

      // Check branch access
      const targetBranchId = branchId || session.user.branchId;
      
      if (!targetBranchId) {
        return res.status(400).json({
          success: false,
          error: 'Branch ID is required'
        });
      }

      // Build WHERE clause
      let whereClause = `
        p.tenant_id = :tenantId
        AND p.is_active = true
        AND p.stock <= COALESCE(:threshold, p.min_stock)
      `;
      
      let queryParams: any = {
        tenantId: session.user.tenantId,
        threshold
      };

      // Filter by branch if specified
      if (targetBranchId) {
        whereClause += ` AND p.branch_id = :branchId`;
        queryParams.branchId = targetBranchId;
      }

      // Get low stock products
      const lowStockProducts = await sequelize.query(`
        SELECT 
          p.id,
          p.name,
          p.sku,
          p.stock,
          p.min_stock,
          p.max_stock,
          p.unit_id,
          u.name as unit_name,
          p.category_id,
          c.name as category_name,
          b.id as branch_id,
          b.name as branch_name,
          b.code as branch_code,
          p.selling_price,
          p.cost,
          ROUND((p.stock::FLOAT / NULLIF(p.min_stock, 0)) * 100, 2) as stock_percentage,
          CASE 
            WHEN p.stock = 0 THEN 'OUT_OF_STOCK'
            WHEN p.stock <= p.min_stock * 0.5 THEN 'CRITICAL'
            WHEN p.stock <= p.min_stock THEN 'LOW'
            ELSE 'OK'
          END as stock_status
        FROM products p
        LEFT JOIN units u ON p.unit_id = u.id
        LEFT JOIN categories c ON p.category_id = c.id
        LEFT JOIN branches b ON p.branch_id = b.id
        WHERE ${whereClause}
        ORDER BY stock_percentage ASC
      `, {
        replacements: queryParams,
        type: QueryTypes.SELECT
      });

      if (lowStockProducts.length === 0) {
        return res.status(200).json({
          success: true,
          message: 'No products with low stock found',
          data: []
        });
      }

      // Get recent sales for context
      const productIds = lowStockProducts.map(p => p.id);
      const recentSales = await sequelize.query(`
        SELECT 
          pti.product_id,
          SUM(pti.quantity) as sold_last_7_days,
          COUNT(DISTINCT pt.id) as orders_last_7_days
        FROM pos_transaction_items pti
        JOIN pos_transactions pt ON pti.transaction_id = pt.id
        WHERE pti.product_id IN (:productIds)
        AND pt.status = 'closed'
        AND pt.transaction_date >= CURRENT_DATE - INTERVAL '7 days'
        GROUP BY pti.product_id
      `, {
        replacements: { productIds },
        type: QueryTypes.SELECT
      });

      // Merge sales data
      const salesMap = recentSales.reduce((acc, sale) => {
        acc[sale.product_id] = sale;
        return acc;
      }, {});

      lowStockProducts.forEach(product => {
        const sales = salesMap[product.id];
        if (sales) {
          product.sold_last_7_days = parseInt(sales.sold_last_7_days) || 0;
          product.orders_last_7_days = parseInt(sales.orders_last_7_days) || 0;
          
          // Calculate days until out of stock based on recent sales
          if (product.sold_last_7_days > 0) {
            const dailyAverage = product.sold_last_7_days / 7;
            product.days_until_out_of_stock = Math.floor(product.stock / dailyAverage);
          } else {
            product.days_until_out_of_stock = null;
          }
        } else {
          product.sold_last_7_days = 0;
          product.orders_last_7_days = 0;
          product.days_until_out_of_stock = null;
        }
      });

      // Trigger webhook alerts
      const alertPayload = {
        type: 'low_stock_alert',
        branch: {
          id: targetBranchId,
          name: lowStockProducts[0].branch_name,
          code: lowStockProducts[0].branch_code
        },
        summary: {
          totalProducts: lowStockProducts.length,
          outOfStock: lowStockProducts.filter(p => p.stock_status === 'OUT_OF_STOCK').length,
          critical: lowStockProducts.filter(p => p.stock_status === 'CRITICAL').length,
          low: lowStockProducts.filter(p => p.stock_status === 'LOW').length
        },
        products: lowStockProducts.map(p => ({
          id: p.id,
          name: p.name,
          sku: p.sku,
          currentStock: p.stock,
          minStock: p.min_stock,
          stockPercentage: p.stock_percentage,
          stockStatus: p.stock_status,
          category: p.category_name,
          soldLast7Days: p.sold_last_7_days,
          daysUntilOutOfStock: p.days_until_out_of_stock,
          value: parseFloat(p.stock) * parseFloat(p.selling_price)
        })),
        generatedAt: new Date().toISOString(),
        generatedBy: {
          id: session.user.id,
          name: session.user.name,
          email: session.user.email
        }
      };

      // Trigger webhook
      await webhookService.triggerWebhooks(
        'low_stock_alert',
        alertPayload,
        session.user.tenantId,
        targetBranchId,
        session.user.id
      );

      // Create internal notification record
      await sequelize.query(`
        INSERT INTO notifications (
          id, user_id, type, title, message, data, is_read,
          tenant_id, created_at, updated_at
        )
        SELECT 
          UUID(),
          u.id,
          'low_stock_alert',
          'Low Stock Alert',
          :message,
          :data,
          false,
          :tenantId,
          NOW(),
          NOW()
        FROM users u
        WHERE u.tenant_id = :tenantId
        AND u.role IN ('super_admin', 'admin', 'manager_cabang')
        AND (u.branch_id = :branchId OR u.role IN ('super_admin', 'admin'))
      `, {
        replacements: {
          message: `${lowStockProducts.length} products are running low on stock`,
          data: JSON.stringify(alertPayload),
          tenantId: session.user.tenantId,
          branchId: targetBranchId
        }
      });

      return res.status(200).json({
        success: true,
        message: `Low stock alert sent for ${lowStockProducts.length} products`,
        data: {
          alert: alertPayload,
          products: lowStockProducts
        }
      });

    } else if (req.method === 'GET') {
      // Get recent low stock alerts
      const { 
        page = 1, 
        limit = 20,
        branchId 
      } = req.query;

      const offset = (parseInt(page as string) - 1) * parseInt(limit as string);

      // Build WHERE clause
      let whereConditions = ['wl.event = \'low_stock_alert\''];
      let queryParams: any = {};

      if (session.user.role !== 'super_admin') {
        whereConditions.push('wl.tenant_id = :tenantId');
        queryParams.tenantId = session.user.tenantId;
      }

      if (branchId) {
        whereConditions.push('(wl.payload->\'branch\'->>\'id\' = :branchId OR wl.branch_id = :branchId)');
        queryParams.branchId = branchId;
      }

      const whereClause = whereConditions.join(' AND ');

      // Get recent alerts
      const alerts = await sequelize.query(`
        SELECT 
          wl.*,
          w.name as webhook_name,
          (wl.payload->>'generatedAt') as generated_at,
          (wl.payload->'summary'->>'totalProducts') as total_products,
          (wl.payload->'branch'->>'name') as branch_name,
          (wl.payload->'generatedBy'->>'name') as generated_by_name
        FROM webhook_logs wl
        LEFT JOIN webhooks w ON wl.webhook_id = w.id
        WHERE ${whereClause}
        ORDER BY wl.created_at DESC
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
        FROM webhook_logs wl
        WHERE ${whereClause}
      `, {
        replacements: queryParams,
        type: QueryTypes.SELECT
      });

      return res.status(200).json({
        success: true,
        data: alerts,
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
    console.error('Low stock alert API error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message
    });
  }
}
