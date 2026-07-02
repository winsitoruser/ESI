import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import { QueryTypes } from 'sequelize';

/**
 * Kitchen Export API
 * Export kitchen data to various formats (JSON, for Excel/PDF processing)
 */

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const session = await getServerSession(req, res, authOptions);
    if (!session?.user) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const tenantId = session.user.tenantId;
    const branchId = session.user.branchId;

    if (req.method !== 'GET') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    const { type, startDate, endDate, format = 'json' } = req.query;

    switch (type) {
      case 'orders':
        return exportOrders(req, res, tenantId, branchId);
      case 'recipes':
        return exportRecipes(req, res, tenantId);
      case 'staff':
        return exportStaff(req, res, tenantId, branchId);
      case 'inventory':
        return exportInventory(req, res, tenantId, branchId);
      case 'analytics':
        return exportAnalytics(req, res, tenantId, branchId);
      default:
        return res.status(400).json({ error: 'Invalid export type' });
    }
  } catch (error: any) {
    console.error('Kitchen Export API Error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}

async function exportOrders(
  req: NextApiRequest,
  res: NextApiResponse,
  tenantId: string | undefined,
  branchId: string | undefined
) {
  const { startDate, endDate } = req.query;
  
  try {
    const { sequelize } = await import('@/lib/sequelizeClient');

    const orders = await sequelize.query(`
      SELECT 
        ko.order_number,
        ko.status,
        ko.priority,
        ko.total_amount,
        ko.created_at,
        ko.started_at,
        ko.completed_at,
        EXTRACT(EPOCH FROM (ko.completed_at - ko.created_at))/60 as prep_time_mins,
        u.name as assigned_to,
        ko.table_number,
        (SELECT COUNT(*) FROM kitchen_order_items WHERE kitchen_order_id = ko.id) as item_count
      FROM kitchen_orders ko
      LEFT JOIN users u ON ko.assigned_chef_id = u.id
      WHERE ko.tenant_id = :tenantId
      ${branchId ? 'AND ko.branch_id = :branchId' : ''}
      ${startDate ? 'AND ko.created_at >= :startDate' : ''}
      ${endDate ? 'AND ko.created_at <= :endDate' : ''}
      ORDER BY ko.created_at DESC
    `, {
      replacements: { tenantId: tenantId || 'default', branchId, startDate, endDate },
      type: QueryTypes.SELECT
    });

    const exportData = (orders as any[]).map(o => ({
      'No. Order': o.order_number,
      'Status': o.status,
      'Prioritas': o.priority,
      'Total': o.total_amount,
      'Meja': o.table_number || '-',
      'Staff': o.assigned_to || '-',
      'Items': o.item_count,
      'Waktu Persiapan (menit)': Math.round(o.prep_time_mins) || '-',
      'Dibuat': new Date(o.created_at).toLocaleString('id-ID'),
      'Selesai': o.completed_at ? new Date(o.completed_at).toLocaleString('id-ID') : '-'
    }));

    return res.status(200).json({
      success: true,
      data: exportData,
      meta: {
        type: 'orders',
        count: exportData.length,
        exportedAt: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Export orders error:', error);
    return res.status(500).json({ success: false, error: 'Failed to export orders' });
  }
}

async function exportRecipes(
  req: NextApiRequest,
  res: NextApiResponse,
  tenantId: string | undefined
) {
  try {
    const { sequelize } = await import('@/lib/sequelizeClient');

    const recipes = await sequelize.query(`
      SELECT 
        r.name,
        r.category,
        r.description,
        r.preparation_time_minutes,
        r.cooking_time_minutes,
        r.batch_size,
        r.difficulty_level,
        r.total_cost,
        p.price as selling_price,
        (SELECT COUNT(*) FROM recipe_ingredients WHERE recipe_id = r.id) as ingredient_count
      FROM recipes r
      LEFT JOIN products p ON r.product_id = p.id
      WHERE r.tenant_id = :tenantId
      ORDER BY r.name
    `, {
      replacements: { tenantId: tenantId || 'default' },
      type: QueryTypes.SELECT
    });

    const exportData = (recipes as any[]).map(r => ({
      'Nama Resep': r.name,
      'Kategori': r.category || '-',
      'Deskripsi': r.description || '-',
      'Waktu Persiapan (menit)': r.preparation_time_minutes || 0,
      'Waktu Masak (menit)': r.cooking_time_minutes || 0,
      'Porsi': r.batch_size || 1,
      'Tingkat Kesulitan': r.difficulty_level || 'medium',
      'Biaya Bahan': r.total_cost || 0,
      'Harga Jual': r.selling_price || 0,
      'Jumlah Bahan': r.ingredient_count
    }));

    return res.status(200).json({
      success: true,
      data: exportData,
      meta: {
        type: 'recipes',
        count: exportData.length,
        exportedAt: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Export recipes error:', error);
    return res.status(500).json({ success: false, error: 'Failed to export recipes' });
  }
}

async function exportStaff(
  req: NextApiRequest,
  res: NextApiResponse,
  tenantId: string | undefined,
  branchId: string | undefined
) {
  try {
    const { sequelize } = await import('@/lib/sequelizeClient');

    const staff = await sequelize.query(`
      SELECT 
        ks.name,
        ks.role,
        ks.shift,
        ks.status,
        ks.performance,
        ks.join_date,
        COUNT(ko.id) as total_orders,
        COALESCE(AVG(EXTRACT(EPOCH FROM (ko.completed_at - ko.started_at))/60), 0) as avg_prep_time
      FROM kitchen_staff ks
      LEFT JOIN kitchen_orders ko ON ko.assigned_chef_id = ks.user_id AND ko.status = 'served'
      WHERE ks.tenant_id = :tenantId
      ${branchId ? 'AND ks.branch_id = :branchId' : ''}
      GROUP BY ks.id, ks.name, ks.role, ks.shift, ks.status, ks.performance, ks.join_date
      ORDER BY ks.name
    `, {
      replacements: { tenantId: tenantId || 'default', branchId },
      type: QueryTypes.SELECT
    });

    const roleLabels: Record<string, string> = {
      head_chef: 'Head Chef',
      sous_chef: 'Sous Chef',
      line_cook: 'Line Cook',
      prep_cook: 'Prep Cook'
    };

    const shiftLabels: Record<string, string> = {
      morning: 'Pagi',
      afternoon: 'Siang',
      night: 'Malam'
    };

    const exportData = (staff as any[]).map(s => ({
      'Nama': s.name,
      'Posisi': roleLabels[s.role] || s.role,
      'Shift': shiftLabels[s.shift] || s.shift,
      'Status': s.status === 'active' ? 'Aktif' : s.status === 'leave' ? 'Cuti' : 'Off',
      'Performance': `${s.performance || 0}%`,
      'Total Order': s.total_orders || 0,
      'Rata-rata Waktu (menit)': Math.round(s.avg_prep_time) || 0,
      'Tanggal Bergabung': new Date(s.join_date).toLocaleDateString('id-ID')
    }));

    return res.status(200).json({
      success: true,
      data: exportData,
      meta: {
        type: 'staff',
        count: exportData.length,
        exportedAt: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Export staff error:', error);
    return res.status(500).json({ success: false, error: 'Failed to export staff' });
  }
}

async function exportInventory(
  req: NextApiRequest,
  res: NextApiResponse,
  tenantId: string | undefined,
  branchId: string | undefined
) {
  try {
    const { sequelize } = await import('@/lib/sequelizeClient');

    const inventory = await sequelize.query(`
      SELECT 
        p.name,
        c.name as category,
        p.stock as current_stock,
        p.unit,
        p.min_stock,
        p.cost as unit_cost,
        p.stock * p.cost as total_value,
        p.updated_at as last_updated,
        CASE 
          WHEN p.stock <= 0 THEN 'critical'
          WHEN p.stock <= p.min_stock THEN 'low'
          WHEN p.stock > p.min_stock * 3 THEN 'overstock'
          ELSE 'good'
        END as status
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.tenant_id = :tenantId
      AND p.is_active = true
      ORDER BY p.name
    `, {
      replacements: { tenantId: tenantId || 'default' },
      type: QueryTypes.SELECT
    });

    const statusLabels: Record<string, string> = {
      good: 'Stok Baik',
      low: 'Stok Rendah',
      critical: 'Kritis',
      overstock: 'Overstock'
    };

    const exportData = (inventory as any[]).map(i => ({
      'Nama Bahan': i.name,
      'Kategori': i.category || '-',
      'Stok Saat Ini': i.current_stock,
      'Satuan': i.unit || '-',
      'Stok Minimum': i.min_stock || 0,
      'Harga Satuan': i.unit_cost || 0,
      'Total Nilai': i.total_value || 0,
      'Status': statusLabels[i.status] || i.status,
      'Terakhir Update': new Date(i.last_updated).toLocaleString('id-ID')
    }));

    return res.status(200).json({
      success: true,
      data: exportData,
      meta: {
        type: 'inventory',
        count: exportData.length,
        exportedAt: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Export inventory error:', error);
    return res.status(500).json({ success: false, error: 'Failed to export inventory' });
  }
}

async function exportAnalytics(
  req: NextApiRequest,
  res: NextApiResponse,
  tenantId: string | undefined,
  branchId: string | undefined
) {
  const { startDate, endDate } = req.query;
  
  // Fetch analytics and return formatted for export
  try {
    const analyticsResponse = await fetch(
      `${process.env.NEXTAUTH_URL || 'http://localhost:3001'}/api/kitchen/analytics?startDate=${startDate}&endDate=${endDate}`,
      { headers: { cookie: req.headers.cookie || '' } }
    );
    
    const analytics = await analyticsResponse.json();
    
    if (!analytics.success) {
      throw new Error('Failed to fetch analytics');
    }

    const data = analytics.data;
    
    const exportData = {
      summary: {
        'Total Pesanan': data.overview.totalOrders,
        'Total Revenue': data.overview.totalRevenue,
        'Rata-rata Nilai Pesanan': data.overview.avgOrderValue,
        'Tingkat Penyelesaian': `${data.overview.completionRate}%`,
        'Rata-rata Waktu Persiapan': `${data.overview.avgPrepTime} menit`,
        'Tingkat Pembatalan': `${data.overview.cancelRate}%`
      },
      dailyTrends: data.trends.daily,
      topProducts: data.topProducts,
      staffPerformance: data.staffPerformance,
      categories: data.categories
    };

    return res.status(200).json({
      success: true,
      data: exportData,
      meta: {
        type: 'analytics',
        period: data.period,
        exportedAt: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Export analytics error:', error);
    return res.status(500).json({ success: false, error: 'Failed to export analytics' });
  }
}
