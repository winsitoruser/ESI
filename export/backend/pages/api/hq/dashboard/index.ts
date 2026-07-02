import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../auth/[...nextauth]';
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

    // Only super_admin and admin can access HQ dashboard
    if (!['super_admin', 'admin'].includes(session.user.role)) {
      return res.status(403).json({ 
        success: false, 
        error: 'Insufficient permissions' 
      });
    }

    if (req.method === 'GET') {
      const { 
        view = 'overview', // overview, branches, departments, alerts, trends
        timeRange = 'today',
        branchIds = 'all'
      } = req.query;

      // Build date filter
      let dateFilter = '';
      switch (timeRange) {
        case 'today':
          dateFilter = 'AND DATE(pt.transaction_date) = CURRENT_DATE';
          break;
        case 'week':
          dateFilter = 'AND DATE(pt.transaction_date) >= DATE_TRUNC(\'week\', CURRENT_DATE)';
          break;
        case 'month':
          dateFilter = 'AND DATE(pt.transaction_date) >= DATE_TRUNC(\'month\', CURRENT_DATE)';
          break;
        case 'year':
          dateFilter = 'AND DATE(pt.transaction_date) >= DATE_TRUNC(\'year\', CURRENT_DATE)';
          break;
      }

      // Build branch filter
      let branchFilter = '';
      let branchParams: any = {};
      if (branchIds !== 'all') {
        const parsedBranchIds = JSON.parse(branchIds as string);
        branchFilter = `AND b.id IN (${parsedBranchIds.map((_, i) => `:branchId${i}`).join(',')})`;
        parsedBranchIds.forEach((id: string, i: number) => {
          branchParams[`branchId${i}`] = id;
        });
      }

      let data;

      switch (view) {
        case 'overview':
          data = await getHQOverview(session.user.tenantId, dateFilter, branchFilter, branchParams);
          break;

        case 'branches':
          data = await getBranchesStatus(session.user.tenantId, dateFilter, branchFilter, branchParams);
          break;

        case 'departments':
          data = await getDepartmentsStatus(session.user.tenantId, dateFilter, branchFilter, branchParams);
          break;

        case 'alerts':
          data = await getHQAlerts(session.user.tenantId, branchFilter, branchParams);
          break;

        case 'trends':
          data = await getHQTrends(session.user.tenantId, timeRange, branchFilter, branchParams);
          break;

        default:
          return res.status(400).json({
            success: false,
            error: 'Invalid view',
            validViews: ['overview', 'branches', 'departments', 'alerts', 'trends']
          });
      }

      return res.status(200).json({
        success: true,
        data: {
          ...data,
          metadata: {
            view,
            timeRange,
            branchIds,
            generatedAt: new Date().toISOString()
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
    console.error('HQ Dashboard API error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message
    });
  }
}

// Get HQ Overview - KPIs dari seluruh cabang
async function getHQOverview(tenantId: string, dateFilter: string, branchFilter: string, branchParams: any) {
  const { sequelize } = await import('@/lib/sequelizeClient');
  const { QueryTypes } = require('sequelize');

  // Get overall KPIs
  const [kpis] = await sequelize.query(`
    SELECT 
      COUNT(DISTINCT b.id) as total_branches,
      COUNT(DISTINCT CASE WHEN b.is_active THEN b.id END) as active_branches,
      COUNT(DISTINCT pt.id) as total_transactions,
      COUNT(DISTINCT pt.customer_id) as unique_customers,
      COALESCE(SUM(pt.total), 0) as total_revenue,
      COALESCE(SUM(pt.subtotal), 0) as net_revenue,
      COALESCE(SUM(pt.discount), 0) as total_discount,
      COALESCE(SUM(pt.tax), 0) as total_tax,
      COALESCE(AVG(pt.total), 0) as avg_transaction_value,
      
      -- Employee metrics
      COUNT(DISTINCT e.id) as total_employees,
      COUNT(DISTINCT CASE WHEN e.is_active THEN e.id END) as active_employees,
      COUNT(DISTINCT ea.employee_id) as employees_checked_in_today,
      
      -- Inventory metrics
      COUNT(DISTINCT p.id) as total_products,
      COUNT(DISTINCT CASE WHEN p.stock <= p.min_stock THEN p.id END) as low_stock_products,
      COUNT(DISTINCT CASE WHEN p.stock = 0 THEN p.id END) as out_of_stock_products,
      COALESCE(SUM(p.stock * p.cost), 0) as total_inventory_value,
      
      -- Financial metrics
      COALESCE(SUM(CASE WHEN ft.transaction_type = 'income' THEN ft.amount ELSE 0 END), 0) as total_income,
      COALESCE(SUM(CASE WHEN ft.transaction_type = 'expense' THEN ft.amount ELSE 0 END), 0) as total_expenses,
      COALESCE(SUM(pt.total) - SUM(CASE WHEN ft.transaction_type = 'expense' THEN ft.amount ELSE 0 END), 0) as net_profit
      
    FROM branches b
    LEFT JOIN pos_transactions pt ON b.id = pt.branch_id 
      AND pt.status = 'closed' ${dateFilter}
    LEFT JOIN employees e ON b.id = e.branch_id
    LEFT JOIN employee_attendances ea ON e.id = ea.employee_id 
      AND DATE(ea.check_in_at) = CURRENT_DATE
    LEFT JOIN products p ON b.id = p.branch_id AND p.is_active = true
    LEFT JOIN finance_transactions ft ON b.id = ft.branch_id 
      AND DATE(ft.transaction_date) = CURRENT_DATE
    WHERE b.tenant_id = :tenantId
    ${branchFilter}
  `, {
    replacements: { tenantId, ...branchParams },
    type: QueryTypes.SELECT
  });

  // Get top performing branches
  const topBranches = await sequelize.query(`
    SELECT 
      b.id,
      b.name,
      b.code,
      b.city,
      b.region,
      COUNT(pt.id) as transaction_count,
      COALESCE(SUM(pt.total), 0) as total_sales,
      COALESCE(SUM(pt.total), 0) * 100.0 / NULLIF(
        (SELECT SUM(total) FROM pos_transactions pt2 
         WHERE pt2.tenant_id = :tenantId AND pt2.status = 'closed' ${dateFilter}), 0
      ) as revenue_percentage
    FROM branches b
    LEFT JOIN pos_transactions pt ON b.id = pt.branch_id
      AND pt.status = 'closed' ${dateFilter}
    WHERE b.tenant_id = :tenantId
    AND b.is_active = true
    ${branchFilter}
    GROUP BY b.id, b.name, b.code, b.city, b.region
    ORDER BY total_sales DESC
    LIMIT 5
  `, {
    replacements: { tenantId, ...branchParams },
    type: QueryTypes.SELECT
  });

  // Get recent alerts
  const recentAlerts = await sequelize.query(`
    (SELECT 
      'void_transaction' as alert_type,
      pt.transaction_number as reference,
      b.name as branch_name,
      pt.total as amount,
      pt.void_reason as reason,
      pt.voided_at as created_at,
      CASE 
        WHEN pt.total > 1000000 THEN 'high'
        WHEN pt.total > 500000 THEN 'medium'
        ELSE 'low'
      END as severity
    FROM pos_transactions pt
    JOIN branches b ON pt.branch_id = b.id
    WHERE pt.status = 'voided'
    AND pt.voided_at >= CURRENT_DATE - INTERVAL '24 hours'
    AND pt.tenant_id = :tenantId
    ${branchFilter})
    
    UNION ALL
    
    (SELECT 
      'low_stock' as alert_type,
      p.name as reference,
      b.name as branch_name,
      p.stock as amount,
      'Stock below minimum' as reason,
      p.updated_at as created_at,
      CASE 
        WHEN p.stock = 0 THEN 'critical'
        WHEN p.stock < p.min_stock * 0.5 THEN 'high'
        ELSE 'medium'
      END as severity
    FROM products p
    JOIN branches b ON p.branch_id = b.id
    WHERE p.stock <= p.min_stock
    AND p.is_active = true
    AND p.tenant_id = :tenantId
    ${branchFilter})
    
    ORDER BY created_at DESC
    LIMIT 10
  `, {
    replacements: { tenantId, ...branchParams },
    type: QueryTypes.SELECT
  });

  // Get department-wise summary
  const departmentSummary = await sequelize.query(`
    SELECT 
      'Operations' as department,
      COUNT(DISTINCT b.id) as branch_count,
      COUNT(DISTINCT CASE WHEN b.is_active THEN b.id END) as active_count,
      COUNT(DISTINCT pt.id) as transactions_today,
      COALESCE(SUM(pt.total), 0) as revenue_today,
      'green' as status
    FROM branches b
    LEFT JOIN pos_transactions pt ON b.id = pt.branch_id
      AND pt.status = 'closed' AND DATE(pt.transaction_date) = CURRENT_DATE
    WHERE b.tenant_id = :tenantId
    ${branchFilter}
    
    UNION ALL
    
    SELECT 
      'Inventory' as department,
      COUNT(DISTINCT b.id) as branch_count,
      COUNT(DISTINCT CASE WHEN 
        COUNT(CASE WHEN p.stock <= p.min_stock THEN 1 END) = 0 
        THEN b.id END) as active_count,
      0 as transactions_today,
      COALESCE(SUM(p.stock * p.cost), 0) as inventory_value,
      CASE 
        WHEN COUNT(CASE WHEN p.stock <= p.min_stock THEN 1 END) > 0 THEN 'red'
        ELSE 'green'
      END as status
    FROM branches b
    LEFT JOIN products p ON b.id = p.branch_id AND p.is_active = true
    WHERE b.tenant_id = :tenantId
    AND b.is_active = true
    ${branchFilter}
    GROUP BY b.id
    
    UNION ALL
    
    SELECT 
      'HR' as department,
      COUNT(DISTINCT b.id) as branch_count,
      COUNT(DISTINCT CASE WHEN 
        COUNT(DISTINCT e.id) > 0 THEN b.id END) as active_count,
      COUNT(DISTINCT ea.employee_id) as checkins_today,
      0 as revenue_today,
      CASE 
        WHEN COUNT(DISTINCT e.id) = 0 THEN 'red'
        WHEN COUNT(DISTINCT ea.employee_id) < COUNT(DISTINCT e.id) * 0.8 THEN 'yellow'
        ELSE 'green'
      END as status
    FROM branches b
    LEFT JOIN employees e ON b.id = e.branch_id AND e.is_active = true
    LEFT JOIN employee_attendances ea ON e.id = ea.employee_id 
      AND DATE(ea.check_in_at) = CURRENT_DATE
    WHERE b.tenant_id = :tenantId
    AND b.is_active = true
    ${branchFilter}
    GROUP BY b.id
    
    UNION ALL
    
    SELECT 
      'Finance' as department,
      COUNT(DISTINCT b.id) as branch_count,
      COUNT(DISTINCT CASE WHEN 
        COALESCE(SUM(CASE WHEN ft.transaction_type = 'income' THEN ft.amount ELSE 0 END), 0) >=
        COALESCE(SUM(CASE WHEN ft.transaction_type = 'expense' THEN ft.amount ELSE 0 END), 0)
        THEN b.id END) as active_count,
      0 as transactions_today,
      COALESCE(SUM(CASE WHEN ft.transaction_type = 'income' THEN ft.amount ELSE 0 END), 0) as income_today,
      CASE 
        WHEN COALESCE(SUM(CASE WHEN ft.transaction_type = 'expense' THEN ft.amount ELSE 0 END), 0) > 
             COALESCE(SUM(CASE WHEN ft.transaction_type = 'income' THEN ft.amount ELSE 0 END), 0) * 1.5
        THEN 'red'
        ELSE 'green'
      END as status
    FROM branches b
    LEFT JOIN finance_transactions ft ON b.id = ft.branch_id
      AND DATE(ft.transaction_date) = CURRENT_DATE
    WHERE b.tenant_id = :tenantId
    AND b.is_active = true
    ${branchFilter}
    GROUP BY b.id
  `, {
    replacements: { tenantId, ...branchParams },
    type: QueryTypes.SELECT
  });

  return {
    kpis: {
      ...kpis,
      total_revenue: parseFloat(kpis.total_revenue || 0),
      net_revenue: parseFloat(kpis.net_revenue || 0),
      avg_transaction_value: parseFloat(kpis.avg_transaction_value || 0),
      total_inventory_value: parseFloat(kpis.total_inventory_value || 0),
      net_profit: parseFloat(kpis.net_profit || 0)
    },
    topBranches: topBranches.map(b => ({
      ...b,
      total_sales: parseFloat(b.total_sales || 0),
      revenue_percentage: parseFloat(b.revenue_percentage || 0)
    })),
    recentAlerts: recentAlerts.map(a => ({
      ...a,
      amount: parseFloat(a.amount || 0)
    })),
    departmentSummary: departmentSummary.reduce((acc: any, dept: any) => {
      acc[dept.department.toLowerCase()] = {
        ...dept,
        revenue_today: parseFloat(dept.revenue_today || 0),
        inventory_value: parseFloat(dept.inventory_value || 0)
      };
      return acc;
    }, {})
  };
}

// Get detailed branches status
async function getBranchesStatus(tenantId: string, dateFilter: string, branchFilter: string, branchParams: any) {
  const { sequelize } = await import('@/lib/sequelizeClient');
  const { QueryTypes } = require('sequelize');

  const branches = await sequelize.query(`
    SELECT 
      b.id,
      b.name,
      b.code,
      b.city,
      b.region,
      b.is_active,
      b.address,
      b.phone,
      b.email,
      
      -- Operations status
      COUNT(DISTINCT pt.id) as transactions_today,
      COALESCE(SUM(pt.total), 0) as revenue_today,
      COALESCE(AVG(pt.total), 0) as avg_transaction_today,
      COUNT(DISTINCT pt.customer_id) as customers_today,
      
      -- Inventory status
      COUNT(DISTINCT p.id) as total_products,
      COUNT(DISTINCT CASE WHEN p.stock <= p.min_stock THEN p.id END) as low_stock_count,
      COUNT(DISTINCT CASE WHEN p.stock = 0 THEN p.id END) as out_of_stock_count,
      COALESCE(SUM(p.stock * p.cost), 0) as inventory_value,
      
      -- HR status
      COUNT(DISTINCT e.id) as total_employees,
      COUNT(DISTINCT CASE WHEN e.is_active THEN e.id END) as active_employees,
      COUNT(DISTINCT ea.employee_id) as employees_checked_in,
      COUNT(DISTINCT CASE WHEN ea.check_out_at IS NULL THEN ea.employee_id END) as employees_on_shift,
      
      -- Finance status
      COALESCE(SUM(CASE WHEN ft.transaction_type = 'income' THEN ft.amount ELSE 0 END), 0) as income_today,
      COALESCE(SUM(CASE WHEN ft.transaction_type = 'expense' THEN ft.amount ELSE 0 END), 0) as expenses_today,
      
      -- Last activity
      MAX(pt.transaction_date) as last_transaction_time,
      MAX(ea.check_in_at) as last_checkin_time,
      MAX(p.updated_at) as last_inventory_update,
      
      -- Overall health score
      CASE 
        WHEN b.is_active = false THEN 0
        WHEN COUNT(DISTINCT pt.id) = 0 THEN 30
        WHEN COUNT(DISTINCT CASE WHEN p.stock <= p.min_stock THEN p.id END) > COUNT(DISTINCT p.id) * 0.2 THEN 50
        WHEN COUNT(DISTINCT ea.employee_id) < COUNT(DISTINCT e.id) * 0.5 THEN 60
        ELSE 100
      END as health_score
      
    FROM branches b
    LEFT JOIN pos_transactions pt ON b.id = pt.branch_id
      AND pt.status = 'closed' AND DATE(pt.transaction_date) = CURRENT_DATE
    LEFT JOIN products p ON b.id = p.branch_id AND p.is_active = true
    LEFT JOIN employees e ON b.id = e.branch_id
    LEFT JOIN employee_attendances ea ON e.id = ea.employee_id 
      AND DATE(ea.check_in_at) = CURRENT_DATE
    LEFT JOIN finance_transactions ft ON b.id = ft.branch_id
      AND DATE(ft.transaction_date) = CURRENT_DATE
    WHERE b.tenant_id = :tenantId
    ${branchFilter}
    GROUP BY b.id, b.name, b.code, b.city, b.region, b.is_active, b.address, b.phone, b.email
    ORDER BY b.is_active DESC, revenue_today DESC
  `, {
    replacements: { tenantId, ...branchParams },
    type: QueryTypes.SELECT
  });

  return {
    branches: branches.map(b => ({
      ...b,
      revenue_today: parseFloat(b.revenue_today || 0),
      avg_transaction_today: parseFloat(b.avg_transaction_today || 0),
      inventory_value: parseFloat(b.inventory_value || 0),
      income_today: parseFloat(b.income_today || 0),
      expenses_today: parseFloat(b.expenses_today || 0),
      health_score: parseInt(b.health_score || 0)
    })),
    summary: {
      total: branches.length,
      active: branches.filter(b => b.is_active).length,
      healthy: branches.filter(b => b.health_score >= 80).length,
      warning: branches.filter(b => b.health_score >= 50 && b.health_score < 80).length,
      critical: branches.filter(b => b.health_score < 50).length
    }
  };
}

// Get departments status
async function getDepartmentsStatus(tenantId: string, dateFilter: string, branchFilter: string, branchParams: any) {
  const { sequelize } = await import('@/lib/sequelizeClient');
  const { QueryTypes } = require('sequelize');

  // Operations Department
  const [operations] = await sequelize.query(`
    SELECT 
      COUNT(DISTINCT b.id) as total_branches,
      COUNT(DISTINCT CASE WHEN b.is_active THEN b.id END) as active_branches,
      COUNT(DISTINCT pt.id) as total_transactions_today,
      COALESCE(SUM(pt.total), 0) as total_revenue_today,
      COALESCE(AVG(pt.total), 0) as avg_transaction_value,
      COUNT(DISTINCT pt.cashier_id) as active_cashiers,
      COUNT(DISTINCT pt.customer_id) as unique_customers_today,
      
      -- Hourly breakdown
      ARRAY_AGG(
        JSON_BUILD_OBJECT(
          'hour', EXTRACT(HOUR FROM pt.transaction_date),
          'transactions', COUNT(pt.id),
          'revenue', COALESCE(SUM(pt.total), 0)
        ) ORDER BY EXTRACT(HOUR FROM pt.transaction_date)
      ) FILTER (WHERE pt.id IS NOT NULL) as hourly_breakdown
    FROM branches b
    LEFT JOIN pos_transactions pt ON b.id = pt.branch_id
      AND pt.status = 'closed' AND DATE(pt.transaction_date) = CURRENT_DATE
    WHERE b.tenant_id = :tenantId
    ${branchFilter}
  `, {
    replacements: { tenantId, ...branchParams },
    type: QueryTypes.SELECT
  });

  // Inventory Department
  const [inventory] = await sequelize.query(`
    SELECT 
      COUNT(DISTINCT b.id) as total_branches,
      COUNT(DISTINCT p.id) as total_products,
      COUNT(DISTINCT CASE WHEN p.stock <= p.min_stock THEN p.id END) as low_stock_items,
      COUNT(DISTINCT CASE WHEN p.stock = 0 THEN p.id END) as out_of_stock_items,
      COALESCE(SUM(p.stock * p.cost), 0) as total_inventory_value,
      COALESCE(SUM(p.stock * p.selling_price), 0) as potential_revenue,
      
      -- Top low stock products
      (SELECT JSON_AGG(
        JSON_BUILD_OBJECT(
          'name', p2.name,
          'branch', b2.name,
          'stock', p2.stock,
          'min_stock', p2.min_stock
        )
      ) FROM products p2
      JOIN branches b2 ON p2.branch_id = b2.id
      WHERE p2.stock <= p2.min_stock AND p2.tenant_id = :tenantId
      ORDER BY p2.stock LIMIT 5) as critical_stocks
    FROM branches b
    LEFT JOIN products p ON b.id = p.branch_id AND p.is_active = true
    WHERE b.tenant_id = :tenantId
    AND b.is_active = true
    ${branchFilter}
  `, {
    replacements: { tenantId, ...branchParams },
    type: QueryTypes.SELECT
  });

  // HR Department
  const [hr] = await sequelize.query(`
    SELECT 
      COUNT(DISTINCT b.id) as total_branches,
      COUNT(DISTINCT e.id) as total_employees,
      COUNT(DISTINCT CASE WHEN e.is_active THEN e.id END) as active_employees,
      COUNT(DISTINCT ea.employee_id) as checked_in_today,
      COUNT(DISTINCT CASE WHEN ea.check_out_at IS NULL THEN ea.employee_id END) as currently_on_shift,
      COUNT(DISTINCT CASE WHEN eb.assignment_type = 'roaming' AND eb.is_active THEN eb.employee_id END) as roaming_staff,
      
      -- Attendance by hour
      ARRAY_AGG(
        JSON_BUILD_OBJECT(
          'hour', EXTRACT(HOUR FROM ea.check_in_at),
          'checkins', COUNT(ea.id)
        ) ORDER BY EXTRACT(HOUR FROM ea.check_in_at)
      ) FILTER (WHERE ea.id IS NOT NULL) as hourly_attendance
    FROM branches b
    LEFT JOIN employees e ON b.id = e.branch_id
    LEFT JOIN employee_attendances ea ON e.id = ea.employee_id 
      AND DATE(ea.check_in_at) = CURRENT_DATE
    LEFT JOIN employee_branches eb ON e.id = eb.employee_id AND eb.is_active = true
    WHERE b.tenant_id = :tenantId
    AND b.is_active = true
    ${branchFilter}
  `, {
    replacements: { tenantId, ...branchParams },
    type: QueryTypes.SELECT
  });

  // Finance Department
  const [finance] = await sequelize.query(`
    SELECT 
      COUNT(DISTINCT b.id) as total_branches,
      COALESCE(SUM(CASE WHEN ft.transaction_type = 'income' THEN ft.amount ELSE 0 END), 0) as total_income,
      COALESCE(SUM(CASE WHEN ft.transaction_type = 'expense' THEN ft.amount ELSE 0 END), 0) as total_expenses,
      COALESCE(SUM(CASE WHEN ft.transaction_type = 'income' THEN ft.amount ELSE 0 END) - 
               SUM(CASE WHEN ft.transaction_type = 'expense' THEN ft.amount ELSE 0 END), 0) as net_profit,
      
      -- Top expense categories
      (SELECT JSON_AGG(
        JSON_BUILD_OBJECT(
          'category', ft.category,
          'amount', COALESCE(SUM(ft.amount), 0)
        )
      ) FROM finance_transactions ft2
      WHERE ft2.transaction_type = 'expense' 
      AND DATE(ft2.transaction_date) = CURRENT_DATE
      AND ft2.tenant_id = :tenantId
      GROUP BY ft2.category
      ORDER BY SUM(ft2.amount) DESC LIMIT 5) as expense_breakdown
    FROM branches b
    LEFT JOIN finance_transactions ft ON b.id = ft.branch_id
      AND DATE(ft.transaction_date) = CURRENT_DATE
    WHERE b.tenant_id = :tenantId
    AND b.is_active = true
    ${branchFilter}
  `, {
    replacements: { tenantId, ...branchParams },
    type: QueryTypes.SELECT
  });

  return {
    operations: {
      ...operations,
      total_revenue_today: parseFloat(operations.total_revenue_today || 0),
      avg_transaction_value: parseFloat(operations.avg_transaction_value || 0)
    },
    inventory: {
      ...inventory,
      total_inventory_value: parseFloat(inventory.total_inventory_value || 0),
      potential_revenue: parseFloat(inventory.potential_revenue || 0)
    },
    hr: {
      ...hr
    },
    finance: {
      ...finance,
      total_income: parseFloat(finance.total_income || 0),
      total_expenses: parseFloat(finance.total_expenses || 0),
      net_profit: parseFloat(finance.net_profit || 0)
    }
  };
}

// Get HQ alerts
async function getHQAlerts(tenantId: string, branchFilter: string, branchParams: any) {
  const { sequelize } = await import('@/lib/sequelizeClient');
  const { QueryTypes } = require('sequelize');

  const alerts = await sequelize.query(`
    (SELECT 
      'critical' as level,
      'Branch Offline' as title,
      b.name as description,
      'branch' as category,
      b.id as reference_id,
      b.updated_at as created_at
    FROM branches b
    WHERE b.is_active = true
    AND b.updated_at < CURRENT_DATE - INTERVAL '2 hours'
    AND b.tenant_id = :tenantId
    ${branchFilter})
    
    UNION ALL
    
    (SELECT 
      CASE 
        WHEN pt.total > 5000000 THEN 'critical'
        WHEN pt.total > 1000000 THEN 'high'
        ELSE 'medium'
      END as level,
      'Large Void Transaction' as title,
      CONCAT('Transaction ', pt.transaction_number, ' voided at ', b.name) as description,
      'transaction' as category,
      pt.id as reference_id,
      pt.voided_at as created_at
    FROM pos_transactions pt
    JOIN branches b ON pt.branch_id = b.id
    WHERE pt.status = 'voided'
    AND pt.voided_at >= CURRENT_DATE - INTERVAL '24 hours'
    AND pt.tenant_id = :tenantId
    ${branchFilter})
    
    UNION ALL
    
    (SELECT 
      'high' as level,
      'Critical Low Stock' as title,
      CONCAT(p.name, ' at ', b.name, ' - Stock: ', p.stock) as description,
      'inventory' as category,
      p.id as reference_id,
      p.updated_at as created_at
    FROM products p
    JOIN branches b ON p.branch_id = b.id
    WHERE p.stock = 0
    AND p.is_active = true
    AND p.tenant_id = :tenantId
    ${branchFilter})
    
    UNION ALL
    
    (SELECT 
      'medium' as level,
      'No Sales Today' as title,
      CONCAT(b.name, ' - No transactions recorded') as description,
      'sales' as category,
      b.id as reference_id,
      CURRENT_TIMESTAMP as created_at
    FROM branches b
    LEFT JOIN pos_transactions pt ON b.id = pt.branch_id
      AND pt.status = 'closed' AND DATE(pt.transaction_date) = CURRENT_DATE
    WHERE b.is_active = true
    AND pt.id IS NULL
    AND b.tenant_id = :tenantId
    ${branchFilter})
    
    ORDER BY 
      CASE level 
        WHEN 'critical' THEN 1
        WHEN 'high' THEN 2
        WHEN 'medium' THEN 3
        ELSE 4
      END,
      created_at DESC
    LIMIT 50
  `, {
    replacements: { tenantId, ...branchParams },
    type: QueryTypes.SELECT
  });

  const alertSummary = await sequelize.query(`
    SELECT 
      level,
      COUNT(*) as count
    FROM (
      (SELECT 'critical' as level FROM branches b 
       WHERE b.is_active = true AND b.updated_at < CURRENT_DATE - INTERVAL '2 hours' 
       AND b.tenant_id = :tenantId ${branchFilter})
      
      UNION ALL
      
      (SELECT 
        CASE 
          WHEN pt.total > 5000000 THEN 'critical'
          WHEN pt.total > 1000000 THEN 'high'
          ELSE 'medium'
        END as level
       FROM pos_transactions pt
       WHERE pt.status = 'voided'
       AND pt.voided_at >= CURRENT_DATE - INTERVAL '24 hours'
       AND pt.tenant_id = :tenantId ${branchFilter})
      
      UNION ALL
      
      (SELECT 'high' as level FROM products p
       WHERE p.stock = 0 AND p.is_active = true
       AND p.tenant_id = :tenantId ${branchFilter})
      
      UNION ALL
      
      (SELECT 'medium' as level FROM branches b
       LEFT JOIN pos_transactions pt ON b.id = pt.branch_id
         AND pt.status = 'closed' AND DATE(pt.transaction_date) = CURRENT_DATE
       WHERE b.is_active = true AND pt.id IS NULL
       AND b.tenant_id = :tenantId ${branchFilter})
    ) alerts
    GROUP BY level
  `, {
    replacements: { tenantId, ...branchParams },
    type: QueryTypes.SELECT
  });

  return {
    alerts,
    summary: alertSummary.reduce((acc: any, alert: any) => {
      acc[alert.level] = alert.count;
      return acc;
    }, { critical: 0, high: 0, medium: 0, low: 0 })
  };
}

// Get trends data
async function getHQTrends(tenantId: string, timeRange: string, branchFilter: string, branchParams: any) {
  const { sequelize } = await import('@/lib/sequelizeClient');
  const { QueryTypes } = require('sequelize');

  let dateGrouping = '';
  let limit = '';
  
  switch (timeRange) {
    case 'today':
      dateGrouping = 'DATE_TRUNC(\'hour\', pt.transaction_date)';
      limit = 'LIMIT 24';
      break;
    case 'week':
      dateGrouping = 'DATE_TRUNC(\'day\', pt.transaction_date)';
      limit = 'LIMIT 7';
      break;
    case 'month':
      dateGrouping = 'DATE_TRUNC(\'day\', pt.transaction_date)';
      limit = 'LIMIT 30';
      break;
    case 'year':
      dateGrouping = 'DATE_TRUNC(\'month\', pt.transaction_date)';
      limit = 'LIMIT 12';
      break;
  }

  // Revenue trends
  const revenueTrends = await sequelize.query(`
    SELECT 
      ${dateGrouping} as period,
      COUNT(pt.id) as transaction_count,
      COALESCE(SUM(pt.total), 0) as revenue,
      COALESCE(AVG(pt.total), 0) as avg_transaction,
      COUNT(DISTINCT pt.customer_id) as unique_customers
    FROM pos_transactions pt
    WHERE pt.tenant_id = :tenantId
    AND pt.status = 'closed'
    AND pt.transaction_date >= CURRENT_DATE - INTERVAL '30 days'
    ${branchFilter}
    GROUP BY period
    ORDER BY period DESC
    ${limit}
  `, {
    replacements: { tenantId, ...branchParams },
    type: QueryTypes.SELECT
  });

  // Branch performance trends
  const branchTrends = await sequelize.query(`
    SELECT 
      b.id,
      b.name,
      b.code,
      ARRAY_AGG(
        JSON_BUILD_OBJECT(
          'period', ${dateGrouping},
          'revenue', COALESCE(SUM(pt.total), 0)
        ) ORDER BY ${dateGrouping}
      ) FILTER (WHERE pt.id IS NOT NULL) as trend_data
    FROM branches b
    LEFT JOIN pos_transactions pt ON b.id = pt.branch_id
      AND pt.status = 'closed'
      AND pt.transaction_date >= CURRENT_DATE - INTERVAL '30 days'
    WHERE b.tenant_id = :tenantId
    AND b.is_active = true
    ${branchFilter}
    GROUP BY b.id, b.name, b.code
    HAVING COUNT(pt.id) > 0
    ORDER BY COALESCE(SUM(pt.total), 0) DESC
    LIMIT 5
  `, {
    replacements: { tenantId, ...branchParams },
    type: QueryTypes.SELECT
  });

  return {
    revenueTrends: revenueTrends.map(t => ({
      ...t,
      revenue: parseFloat(t.revenue || 0),
      avg_transaction: parseFloat(t.avg_transaction || 0)
    })),
    branchTrends
  };
}
