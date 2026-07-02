import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import { sequelize } from '@/lib/sequelizeClient';
import { QueryTypes } from 'sequelize';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    const session = await getServerSession(req, res, authOptions);

    if (!session || !session.user) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    // Only super_admin and admin can access HQ wastage analysis
    if (!['super_admin', 'admin'].includes(session.user.role)) {
      return res.status(403).json({ 
        success: false, 
        error: 'Insufficient permissions' 
      });
    }

    if (req.method === 'GET') {
      const {
        period = 'month',
        startDate,
        endDate,
        branchIds,
        categoryId,
        productId,
        threshold = 10 // Percentage threshold for anomaly detection
      } = req.query;

      // Determine date range
      let dateFilter = '';
      let dateParams: any = {};
      
      if (startDate && endDate) {
        dateFilter = 'AND DATE(w.waste_date) BETWEEN :startDate AND :endDate';
        dateParams.startDate = startDate;
        dateParams.endDate = endDate;
      } else {
        switch (period) {
          case 'week':
            dateFilter = 'AND DATE(w.waste_date) >= DATE_TRUNC(\'week\', CURRENT_DATE)';
            break;
          case 'month':
            dateFilter = 'AND DATE(w.waste_date) >= DATE_TRUNC(\'month\', CURRENT_DATE)';
            break;
          case 'quarter':
            dateFilter = 'AND DATE(w.waste_date) >= DATE_TRUNC(\'quarter\', CURRENT_DATE)';
            break;
          case 'year':
            dateFilter = 'AND DATE(w.waste_date) >= DATE_TRUNC(\'year\', CURRENT_DATE)';
            break;
        }
      }

      // Build branch filter
      let branchFilter = '';
      let branchParams: any = {};
      
      if (branchIds && branchIds !== 'all') {
        const parsedBranchIds = Array.isArray(JSON.parse(branchIds as string)) 
          ? JSON.parse(branchIds as string)
          : [branchIds as string];
        
        branchFilter = `AND w.branch_id IN (${parsedBranchIds.map((_, i) => `:branchId${i}`).join(',')})`;
        parsedBranchIds.forEach((id: string, i: number) => {
          branchParams[`branchId${i}`] = id;
        });
      }

      // Build product filter
      let productFilter = '';
      let productParams: any = {};
      
      if (categoryId) {
        productFilter = 'AND p.category_id = :categoryId';
        productParams.categoryId = categoryId;
      }
      
      if (productId) {
        productFilter += ' AND w.product_id = :productId';
        productParams.productId = productId;
      }

      // Get overall wastage summary
      const [overallSummary] = await sequelize.query(`
        SELECT 
          COUNT(DISTINCT w.id) as total_waste_records,
          COUNT(DISTINCT w.branch_id) as branches_with_waste,
          COALESCE(SUM(w.quantity), 0) as total_waste_quantity,
          COALESCE(SUM(w.quantity * w.cost_per_unit), 0) as total_waste_value,
          COALESCE(AVG(w.quantity * w.cost_per_unit), 0) as avg_waste_value,
          COALESCE(SUM(CASE WHEN w.waste_type = 'spoilage' THEN w.quantity * w.cost_per_unit ELSE 0 END), 0) as spoilage_value,
          COALESCE(SUM(CASE WHEN w.waste_type = 'error' THEN w.quantity * w.cost_per_unit ELSE 0 END), 0) as error_value,
          COALESCE(SUM(CASE WHEN w.waste_type = 'theft' THEN w.quantity * w.cost_per_unit ELSE 0 END), 0) as theft_value,
          COALESCE(SUM(CASE WHEN w.waste_type = 'expired' THEN w.quantity * w.cost_per_unit ELSE 0 END), 0) as expired_value
        FROM wastage_records w
        JOIN products p ON w.product_id = p.id
        WHERE w.tenant_id = :tenantId
        ${dateFilter}
        ${branchFilter}
        ${productFilter}
      `, {
        replacements: { 
          tenantId: session.user.tenantId,
          ...dateParams,
          ...branchParams,
          ...productParams
        },
        type: QueryTypes.SELECT
      });

      // Get branch-wise wastage comparison
      const branchWastage = await sequelize.query(`
        SELECT 
          b.id,
          b.name,
          b.code,
          b.city,
          COUNT(w.id) as waste_records,
          COALESCE(SUM(w.quantity), 0) as total_quantity,
          COALESCE(SUM(w.quantity * w.cost_per_unit), 0) as total_value,
          COALESCE(AVG(w.quantity * w.cost_per_unit), 0) as avg_value_per_record,
          COALESCE(
            (SUM(w.quantity * w.cost_per_unit) / NULLIF(
              (SELECT COALESCE(SUM(pt.total), 0) FROM pos_transactions pt 
               WHERE pt.branch_id = b.id AND pt.status = 'closed' ${dateFilter.replace('w.', 'pt.')}), 0)
            ) * 100, 0
          ) as waste_percentage_of_sales,
          ROUND(
            (COUNT(w.id) * 100.0 / NULLIF(
              (SELECT COUNT(*) FROM wastage_records w2 
               WHERE w2.tenant_id = :tenantId2 ${dateFilter.replace('w.', 'w2.')} ${branchFilter.replace('w.', 'w2.')}), 0
            ), 2
          ) as record_percentage
        FROM branches b
        LEFT JOIN wastage_records w ON b.id = w.branch_id
          AND w.tenant_id = :tenantId
          ${dateFilter.replace('w.', 'w.')}
          ${productFilter.replace('p.', 'w.')}
        WHERE b.tenant_id = :tenantId
        AND b.is_active = true
        GROUP BY b.id, b.name, b.code, b.city
        ORDER BY total_value DESC
      `, {
        replacements: { 
          tenantId: session.user.tenantId,
          tenantId2: session.user.tenantId,
          ...dateParams,
          ...branchParams,
          ...productParams
        },
        type: QueryTypes.SELECT
      });

      // Get top wastage products
      const topWasteProducts = await sequelize.query(`
        SELECT 
          p.id,
          p.name,
          p.sku,
          c.name as category_name,
          COUNT(w.id) as waste_count,
          COALESCE(SUM(w.quantity), 0) as total_quantity,
          COALESCE(SUM(w.quantity * w.cost_per_unit), 0) as total_value,
          COALESCE(AVG(w.cost_per_unit), 0) as avg_cost,
          w.waste_type,
          ROUND(
            (COUNT(w.id) * 100.0 / NULLIF(
              (SELECT COUNT(*) FROM wastage_records w2 
               WHERE w2.tenant_id = :tenantId ${dateFilter.replace('w.', 'w2.')} ${branchFilter.replace('w.', 'w2.')}), 0
            ), 2
          ) as frequency_percentage
        FROM wastage_records w
        JOIN products p ON w.product_id = p.id
        LEFT JOIN categories c ON p.category_id = c.id
        WHERE w.tenant_id = :tenantId
        ${dateFilter}
        ${branchFilter}
        ${productFilter}
        GROUP BY p.id, p.name, p.sku, c.name, w.waste_type
        ORDER BY total_value DESC
        LIMIT 20
      `, {
        replacements: { 
          tenantId: session.user.tenantId,
          ...dateParams,
          ...branchParams,
          ...productParams
        },
        type: QueryTypes.SELECT
      });

      // Get wastage by category
      const categoryWastage = await sequelize.query(`
        SELECT 
          c.id,
          c.name,
          COUNT(w.id) as waste_count,
          COALESCE(SUM(w.quantity), 0) as total_quantity,
          COALESCE(SUM(w.quantity * w.cost_per_unit), 0) as total_value,
          COUNT(DISTINCT w.product_id) as affected_products,
          COUNT(DISTINCT w.branch_id) as affected_branches
        FROM categories c
        LEFT JOIN products p ON c.id = p.category_id
        LEFT JOIN wastage_records w ON p.id = w.product_id
          AND w.tenant_id = :tenantId
          ${dateFilter.replace('w.', 'w.')}
          ${branchFilter.replace('w.', 'w.')}
        WHERE c.tenant_id = :tenantId
        GROUP BY c.id, c.name
        HAVING COUNT(w.id) > 0
        ORDER BY total_value DESC
      `, {
        replacements: { 
          tenantId: session.user.tenantId,
          ...dateParams,
          ...branchParams
        },
        type: QueryTypes.SELECT
      });

      // Detect anomalies (branches with unusually high wastage)
      const avgWastePercentage = branchWastage.reduce((sum, b) => sum + (parseFloat(b.waste_percentage_of_sales) || 0), 0) / branchWastage.length;
      const anomalyThreshold = avgWastePercentage * (1 + parseFloat(threshold as string) / 100);
      
      const anomalies = branchWastage.filter(b => 
        parseFloat(b.waste_percentage_of_sales) > anomalyThreshold && b.total_value > 0
      ).map(b => ({
        ...b,
        anomaly: {
          type: 'high_wastage',
          severity: parseFloat(b.waste_percentage_of_sales) > anomalyThreshold * 2 ? 'critical' : 'warning',
          deviation: ((parseFloat(b.waste_percentage_of_sales) - avgWastePercentage) / avgWastePercentage * 100).toFixed(2),
          threshold: anomalyThreshold.toFixed(2),
          actual: parseFloat(b.waste_percentage_of_sales).toFixed(2)
        }
      }));

      // Get wastage trend over time
      const wastageTrend = await sequelize.query(`
        SELECT 
          DATE_TRUNC('day', w.waste_date) as date,
          COUNT(w.id) as record_count,
          COALESCE(SUM(w.quantity * w.cost_per_unit), 0) as daily_value,
          COUNT(DISTINCT w.branch_id) as branches_affected
        FROM wastage_records w
        WHERE w.tenant_id = :tenantId
        ${dateFilter}
        ${branchFilter}
        GROUP BY DATE_TRUNC('day', w.waste_date)
        ORDER BY date DESC
        LIMIT 30
      `, {
        replacements: { 
          tenantId: session.user.tenantId,
          ...dateParams,
          ...branchParams
        },
        type: QueryTypes.SELECT
      });

      // Get wastage by reason/type
      const wastageByType = await sequelize.query(`
        SELECT 
          w.waste_type,
          w.reason,
          COUNT(w.id) as count,
          COALESCE(SUM(w.quantity * w.cost_per_unit), 0) as total_value,
          COALESCE(AVG(w.quantity * w.cost_per_unit), 0) as avg_value
        FROM wastage_records w
        WHERE w.tenant_id = :tenantId
        ${dateFilter}
        ${branchFilter}
        GROUP BY w.waste_type, w.reason
        ORDER BY total_value DESC
      `, {
        replacements: { 
          tenantId: session.user.tenantId,
          ...dateParams,
          ...branchParams
        },
        type: QueryTypes.SELECT
      });

      // Calculate potential savings if top 5 wastage items are reduced by 50%
      const potentialSavings = topWasteProducts
        .slice(0, 5)
        .reduce((sum, p) => sum + (parseFloat(p.total_value) * 0.5), 0);

      return res.status(200).json({
        success: true,
        data: {
          summary: {
            ...overallSummary,
            potentialSavings,
            anomalyThreshold: anomalyThreshold.toFixed(2),
            avgWastePercentage: avgWastePercentage.toFixed(2)
          },
          branchComparison: branchWastage,
          anomalies,
          topProducts: topWasteProducts,
          categoryBreakdown: categoryWastage,
          trends: wastageTrend,
            wasteByType: wastageByType,
          insights: {
            highestWasteBranch: branchWastage.length > 0 ? branchWastage[0] : null,
            mostWastedProduct: topWasteProducts.length > 0 ? topWasteProducts[0] : null,
            mostProblematicCategory: categoryWastage.length > 0 ? categoryWastage[0] : null,
            primaryWasteType: wastageByType.length > 0 ? wastageByType[0] : null,
            totalAnomalies: anomalies.length
          }
        },
        metadata: {
          period,
          dateRange: {
            start: startDate || null,
            end: endDate || null
          },
          threshold,
          generatedAt: new Date().toISOString()
        }
      });

    } else {
      return res.status(405).json({ 
        success: false, 
        error: 'Method not allowed' 
      });
    }

  } catch (error: any) {
    console.error('Wastage analysis HQ API error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message
    });
  }
}
