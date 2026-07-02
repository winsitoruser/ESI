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

    if (req.method === 'GET') {
      const {
        branchIds,
        metric = 'sales',
        period = 'today',
        startDate,
        endDate,
        groupBy = 'day'
      } = req.query;

      // Validate branch IDs
      if (!branchIds || !Array.isArray(JSON.parse(branchIds as string)) || JSON.parse(branchIds as string).length === 0) {
        return res.status(400).json({
          success: false,
          error: 'Branch IDs are required'
        });
      }

      const parsedBranchIds = JSON.parse(branchIds as string);
      
      // Limit to 5 branches for comparison
      if (parsedBranchIds.length > 5) {
        return res.status(400).json({
          success: false,
          error: 'Maximum 5 branches can be compared at once'
        });
      }

      // Determine date range
      let dateFilter = '';
      let dateParams: any = {};
      
      if (startDate && endDate) {
        dateFilter = 'AND DATE(pt.transaction_date) BETWEEN :startDate AND :endDate';
        dateParams.startDate = startDate;
        dateParams.endDate = endDate;
      } else {
        switch (period) {
          case 'today':
            dateFilter = 'AND DATE(pt.transaction_date) = CURRENT_DATE';
            break;
          case 'yesterday':
            dateFilter = 'AND DATE(pt.transaction_date) = CURRENT_DATE - INTERVAL \'1 day\'';
            break;
          case 'week':
            dateFilter = 'AND DATE(pt.transaction_date) >= DATE_TRUNC(\'week\', CURRENT_DATE)';
            break;
          case 'month':
            dateFilter = 'AND DATE(pt.transaction_date) >= DATE_TRUNC(\'month\', CURRENT_DATE)';
            break;
          case 'quarter':
            dateFilter = 'AND DATE(pt.transaction_date) >= DATE_TRUNC(\'quarter\', CURRENT_DATE)';
            break;
          case 'year':
            dateFilter = 'AND DATE(pt.transaction_date) >= DATE_TRUNC(\'year\', CURRENT_DATE)';
            break;
        }
      }

      // Build WHERE clause for branches
      const branchPlaceholders = parsedBranchIds.map((_, index) => `:branchId${index}`).join(',');
      const branchParams: any = {};
      parsedBranchIds.forEach((id: string, index: number) => {
        branchParams[`branchId${index}`] = id;
      });

      // Get comparison data based on metric
      let query = '';
      let groupByClause = '';

      switch (groupBy) {
        case 'hour':
          groupByClause = 'DATE_TRUNC(\'hour\', pt.transaction_date)';
          break;
        case 'day':
          groupByClause = 'DATE(pt.transaction_date)';
          break;
        case 'week':
          groupByClause = 'DATE_TRUNC(\'week\', pt.transaction_date)';
          break;
        case 'month':
          groupByClause = 'DATE_TRUNC(\'month\', pt.transaction_date)';
          break;
        default:
          groupByClause = 'DATE(pt.transaction_date)';
      }

      switch (metric) {
        case 'sales':
          query = `
            SELECT 
              b.id as branch_id,
              b.name as branch_name,
              b.code as branch_code,
              ${groupByClause} as date_group,
              COUNT(pt.id) as transaction_count,
              SUM(pt.total) as total_sales,
              SUM(pt.subtotal) as gross_sales,
              SUM(pt.discount) as total_discount,
              SUM(pt.tax) as total_tax,
              AVG(pt.total) as avg_transaction_value,
              COUNT(DISTINCT pt.customer_id) as unique_customers
            FROM branches b
            LEFT JOIN pos_transactions pt ON b.id = pt.branch_id
              AND pt.status = 'closed'
              ${dateFilter}
            WHERE b.id IN (${branchPlaceholders})
            AND b.tenant_id = :tenantId
            GROUP BY b.id, b.name, b.code, date_group
            ORDER BY b.name, date_group
          `;
          break;

        case 'products':
          query = `
            SELECT 
              b.id as branch_id,
              b.name as branch_name,
              b.code as branch_code,
              p.id as product_id,
              p.name as product_name,
              p.sku as product_sku,
              c.name as category_name,
              SUM(pti.quantity) as total_quantity,
              SUM(pti.quantity * pti.price) as total_revenue,
              COUNT(DISTINCT pt.id) as order_count
            FROM branches b
            LEFT JOIN pos_transactions pt ON b.id = pt.branch_id
              AND pt.status = 'closed'
              ${dateFilter}
            LEFT JOIN pos_transaction_items pti ON pt.id = pti.transaction_id
            LEFT JOIN products p ON pti.product_id = p.id
            LEFT JOIN categories c ON p.category_id = c.id
            WHERE b.id IN (${branchPlaceholders})
            AND b.tenant_id = :tenantId
            AND pti.id IS NOT NULL
            GROUP BY b.id, b.name, b.code, p.id, p.name, p.sku, c.name
            ORDER BY b.name, total_revenue DESC
          `;
          break;

        case 'categories':
          query = `
            SELECT 
              b.id as branch_id,
              b.name as branch_name,
              b.code as branch_code,
              c.id as category_id,
              c.name as category_name,
              COUNT(DISTINCT p.id) as product_count,
              SUM(pti.quantity) as total_quantity,
              SUM(pti.quantity * pti.price) as total_revenue,
              ROUND(
                (SUM(pti.quantity * pti.price) / SUM(SUM(pti.quantity * pti.price)) OVER (PARTITION BY b.id)) * 100, 
                2
              ) as revenue_percentage
            FROM branches b
            LEFT JOIN pos_transactions pt ON b.id = pt.branch_id
              AND pt.status = 'closed'
              ${dateFilter}
            LEFT JOIN pos_transaction_items pti ON pt.id = pti.transaction_id
            LEFT JOIN products p ON pti.product_id = p.id
            LEFT JOIN categories c ON p.category_id = c.id
            WHERE b.id IN (${branchPlaceholders})
            AND b.tenant_id = :tenantId
            AND pti.id IS NOT NULL
            GROUP BY b.id, b.name, b.code, c.id, c.name
            ORDER BY b.name, total_revenue DESC
          `;
          break;

        case 'payment_methods':
          query = `
            SELECT 
              b.id as branch_id,
              b.name as branch_name,
              b.code as branch_code,
              pt.payment_method,
              COUNT(pt.id) as transaction_count,
              SUM(pt.total) as total_amount,
              ROUND(
                (COUNT(pt.id) * 100.0 / COUNT(COUNT(pt.id)) OVER (PARTITION BY b.id)), 
                2
              ) as transaction_percentage
            FROM branches b
            LEFT JOIN pos_transactions pt ON b.id = pt.branch_id
              AND pt.status = 'closed'
              ${dateFilter}
            WHERE b.id IN (${branchPlaceholders})
            AND b.tenant_id = :tenantId
            GROUP BY b.id, b.name, b.code, pt.payment_method
            ORDER BY b.name, total_amount DESC
          `;
          break;

        case 'hours':
          query = `
            SELECT 
              b.id as branch_id,
              b.name as branch_name,
              b.code as branch_code,
              EXTRACT(HOUR FROM pt.transaction_date) as hour_of_day,
              COUNT(pt.id) as transaction_count,
              SUM(pt.total) as total_sales,
              AVG(pt.total) as avg_transaction_value
            FROM branches b
            LEFT JOIN pos_transactions pt ON b.id = pt.branch_id
              AND pt.status = 'closed'
              ${dateFilter}
            WHERE b.id IN (${branchPlaceholders})
            AND b.tenant_id = :tenantId
            GROUP BY b.id, b.name, b.code, EXTRACT(HOUR FROM pt.transaction_date)
            ORDER BY b.name, hour_of_day
          `;
          break;

        default:
          return res.status(400).json({
            success: false,
            error: 'Invalid metric',
            validMetrics: ['sales', 'products', 'categories', 'payment_methods', 'hours']
          });
      }

      const results = await sequelize.query(query, {
        replacements: {
          ...dateParams,
          ...branchParams,
          tenantId: session.user.tenantId
        },
        type: QueryTypes.SELECT
      });

      // Process results for comparison
      const processedData = processComparisonData(results, metric);

      // Calculate summary statistics
      const summary = calculateSummary(processedData, metric);

      return res.status(200).json({
        success: true,
        data: {
          metric,
          period,
          groupBy,
          branches: parsedBranchIds,
          data: processedData,
          summary,
          metadata: {
            generatedAt: new Date().toISOString(),
            currency: 'IDR',
            dateRange: {
              start: startDate || null,
              end: endDate || null
            }
          }
        }
      });

    } else {
      return res.status(405).json({ 
        success: false, 
        error: 'Method not allowed' 
      });
    }

  } catch (error: any) {
    console.error('Dashboard compare API error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message
    });
  }
}

// Helper function to process comparison data
function processComparisonData(results: any[], metric: string) {
  if (metric === 'sales') {
    // Group by branch and date
    const branchData: Record<string, any> = {};
    
    results.forEach(row => {
      if (!branchData[row.branch_id]) {
        branchData[row.branch_id] = {
          branchId: row.branch_id,
          branchName: row.branch_name,
          branchCode: row.branch_code,
          timeSeries: [],
          totals: {
            transactionCount: 0,
            totalSales: 0,
            grossSales: 0,
            totalDiscount: 0,
            totalTax: 0,
            avgTransactionValue: 0,
            uniqueCustomers: 0
          }
        };
      }
      
      branchData[row.branch_id].timeSeries.push({
        date: row.date_group,
        transactionCount: parseInt(row.transaction_count) || 0,
        totalSales: parseFloat(row.total_sales) || 0,
        grossSales: parseFloat(row.gross_sales) || 0,
        totalDiscount: parseFloat(row.total_discount) || 0,
        totalTax: parseFloat(row.total_tax) || 0,
        avgTransactionValue: parseFloat(row.avg_transaction_value) || 0,
        uniqueCustomers: parseInt(row.unique_customers) || 0
      });
      
      // Accumulate totals
      const totals = branchData[row.branch_id].totals;
      totals.transactionCount += parseInt(row.transaction_count) || 0;
      totals.totalSales += parseFloat(row.total_sales) || 0;
      totals.grossSales += parseFloat(row.gross_sales) || 0;
      totals.totalDiscount += parseFloat(row.total_discount) || 0;
      totals.totalTax += parseFloat(row.total_tax) || 0;
      totals.uniqueCustomers += parseInt(row.unique_customers) || 0;
    });
    
    // Calculate final averages
    Object.values(branchData).forEach((branch: any) => {
      branch.totals.avgTransactionValue = branch.totals.transactionCount > 0 
        ? branch.totals.totalSales / branch.totals.transactionCount 
        : 0;
    });
    
    return Object.values(branchData);
  }
  
  // For other metrics, return as-is but grouped by branch
  const branchData: Record<string, any> = {};
  
  results.forEach(row => {
    if (!branchData[row.branch_id]) {
      branchData[row.branch_id] = {
        branchId: row.branch_id,
        branchName: row.branch_name,
        branchCode: row.branch_code,
        items: []
      };
    }
    
    // Remove branch fields from item
    const item = { ...row };
    delete item.branch_id;
    delete item.branch_name;
    delete item.branch_code;
    
    branchData[row.branch_id].items.push(item);
  });
  
  return Object.values(branchData);
}

// Helper function to calculate summary statistics
function calculateSummary(processedData: any[], metric: string) {
  if (metric === 'sales') {
    const totals = processedData.map(b => b.totals.totalSales);
    const counts = processedData.map(b => b.totals.transactionCount);
    
    return {
      totalSales: totals.reduce((sum, val) => sum + val, 0),
      totalTransactions: counts.reduce((sum, val) => sum + val, 0),
      avgSalesPerBranch: totals.reduce((sum, val) => sum + val, 0) / totals.length,
      bestPerformingBranch: processedData.reduce((best, current) => 
        current.totals.totalSales > best.totals.totalSales ? current : best
      ),
      worstPerformingBranch: processedData.reduce((worst, current) => 
        current.totals.totalSales < worst.totals.totalSales ? current : worst
      ),
      salesVariance: calculateVariance(totals)
    };
  }
  
  // For other metrics, return basic counts
  return {
    totalBranches: processedData.length,
    totalItems: processedData.reduce((sum, branch) => sum + (branch.items?.length || 0), 0)
  };
}

// Helper function to calculate variance
function calculateVariance(values: number[]) {
  const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
  const squaredDiffs = values.map(value => Math.pow(value - mean, 2));
  const avgSquaredDiff = squaredDiffs.reduce((sum, val) => sum + val, 0) / values.length;
  return Math.sqrt(avgSquaredDiff);
}
