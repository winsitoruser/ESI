import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import { QueryTypes } from 'sequelize';

/**
 * Kitchen Activities API
 * Provides real-time activity feed for the kitchen dashboard
 */

interface KitchenActivity {
  id: string;
  type: 'order_received' | 'order_started' | 'order_completed' | 'order_cancelled' | 'stock_alert' | 'staff_checkin' | 'recipe_updated';
  action: string;
  details: string;
  orderId?: string;
  staffId?: string;
  productId?: string;
  timestamp: Date;
  status: 'success' | 'processing' | 'warning' | 'info' | 'error';
}

// In-memory cache for recent activities
let activityCache: KitchenActivity[] = [];
const MAX_CACHE_SIZE = 100;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const session = await getServerSession(req, res, authOptions);
    if (!session?.user) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const tenantId = session.user.tenantId;
    const branchId = session.user.branchId;

    switch (req.method) {
      case 'GET':
        return getActivities(req, res, tenantId, branchId);
      case 'POST':
        return addActivity(req, res, tenantId, branchId);
      default:
        return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error: any) {
    console.error('Kitchen Activities API Error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}

async function getActivities(
  req: NextApiRequest,
  res: NextApiResponse,
  tenantId: string | undefined,
  branchId: string | undefined
) {
  const { limit = '20', type, since } = req.query;
  const limitNum = parseInt(limit as string);

  try {
    const { sequelize } = await import('@/lib/sequelizeClient');

    // Build query for recent kitchen orders
    const recentOrders = await sequelize.query(`
      SELECT 
        ko.id,
        ko.order_number,
        ko.status,
        ko.priority,
        ko.created_at,
        ko.started_at,
        ko.completed_at,
        u.name as staff_name,
        ko.table_number
      FROM kitchen_orders ko
      LEFT JOIN users u ON ko.assigned_chef_id = u.id
      WHERE ko.tenant_id = :tenantId
      ${branchId ? 'AND ko.branch_id = :branchId' : ''}
      ORDER BY ko.updated_at DESC
      LIMIT :limit
    `, {
      replacements: { tenantId: tenantId || 'default', branchId, limit: limitNum },
      type: QueryTypes.SELECT
    });

    // Transform orders to activities
    const orderActivities: KitchenActivity[] = (recentOrders as any[]).map(order => {
      let action = '';
      let status: KitchenActivity['status'] = 'info';
      let type: KitchenActivity['type'] = 'order_received';

      switch (order.status) {
        case 'new':
          action = `Pesanan ${order.order_number} diterima`;
          if (order.table_number) action += ` dari meja ${order.table_number}`;
          status = 'info';
          type = 'order_received';
          break;
        case 'preparing':
          action = `Pesanan ${order.order_number} sedang diproses`;
          if (order.staff_name) action += ` oleh ${order.staff_name}`;
          status = 'processing';
          type = 'order_started';
          break;
        case 'ready':
        case 'completed':
          action = `Pesanan ${order.order_number} selesai dimasak`;
          status = 'success';
          type = 'order_completed';
          break;
        case 'cancelled':
          action = `Pesanan ${order.order_number} dibatalkan`;
          status = 'error';
          type = 'order_cancelled';
          break;
        default:
          action = `Pesanan ${order.order_number} - ${order.status}`;
      }

      return {
        id: order.id,
        type,
        action,
        details: order.priority === 'high' ? 'Prioritas tinggi' : '',
        orderId: order.order_number,
        timestamp: new Date(order.completed_at || order.started_at || order.created_at),
        status
      };
    });

    // Get stock alerts
    const stockAlerts = await sequelize.query(`
      SELECT 
        p.id,
        p.name,
        p.stock,
        p.min_stock,
        p.updated_at
      FROM products p
      WHERE p.tenant_id = :tenantId
      AND p.stock <= p.min_stock
      AND p.is_active = true
      ORDER BY p.updated_at DESC
      LIMIT 5
    `, {
      replacements: { tenantId: tenantId || 'default' },
      type: QueryTypes.SELECT
    });

    const stockActivities: KitchenActivity[] = (stockAlerts as any[]).map(item => ({
      id: `stock-${item.id}`,
      type: 'stock_alert',
      action: `Stok ${item.name} mencapai batas minimum`,
      details: `Sisa: ${item.stock} ${item.stock <= 0 ? '(HABIS)' : ''}`,
      productId: item.id,
      timestamp: new Date(item.updated_at),
      status: item.stock <= 0 ? 'error' : 'warning'
    }));

    // Combine and sort activities
    const allActivities = [...orderActivities, ...stockActivities]
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, limitNum);

    // Calculate time ago
    const activitiesWithTimeAgo = allActivities.map(activity => ({
      ...activity,
      timeAgo: getTimeAgo(activity.timestamp)
    }));

    return res.status(200).json({
      success: true,
      data: {
        activities: activitiesWithTimeAgo,
        total: activitiesWithTimeAgo.length,
        summary: {
          orders: orderActivities.length,
          stockAlerts: stockActivities.length,
          pending: orderActivities.filter(a => a.type === 'order_received').length,
          processing: orderActivities.filter(a => a.type === 'order_started').length,
          completed: orderActivities.filter(a => a.type === 'order_completed').length
        }
      }
    });

  } catch (error: any) {
    console.error('Error fetching activities:', error);
    
    // Return mock data if database fails
    return res.status(200).json({
      success: true,
      data: {
        activities: getMockActivities(),
        total: 10,
        summary: {
          orders: 8,
          stockAlerts: 2,
          pending: 2,
          processing: 3,
          completed: 3
        }
      }
    });
  }
}

async function addActivity(
  req: NextApiRequest,
  res: NextApiResponse,
  tenantId: string | undefined,
  branchId: string | undefined
) {
  const { type, action, details, orderId, staffId, productId, status } = req.body;

  const newActivity: KitchenActivity = {
    id: `act-${Date.now()}`,
    type: type || 'order_received',
    action,
    details: details || '',
    orderId,
    staffId,
    productId,
    timestamp: new Date(),
    status: status || 'info'
  };

  // Add to cache
  activityCache.unshift(newActivity);
  if (activityCache.length > MAX_CACHE_SIZE) {
    activityCache = activityCache.slice(0, MAX_CACHE_SIZE);
  }

  // Broadcast via WebSocket (if available)
  try {
    await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3001'}/api/websocket/broadcast`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event: 'kitchen:activity:new',
        data: { ...newActivity, branchId },
        branchId
      })
    });
  } catch (wsError) {
    console.warn('WebSocket broadcast failed:', wsError);
  }

  return res.status(201).json({
    success: true,
    data: newActivity
  });
}

function getTimeAgo(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - new Date(date).getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'Baru saja';
  if (diffMins < 60) return `${diffMins} menit lalu`;
  if (diffHours < 24) return `${diffHours} jam lalu`;
  return `${diffDays} hari lalu`;
}

function getMockActivities(): any[] {
  return [
    { id: '1', type: 'order_completed', action: 'Pesanan #1234 selesai dimasak', details: '', timeAgo: '2 menit lalu', status: 'success' },
    { id: '2', type: 'order_started', action: 'Pesanan #1235 sedang diproses', details: 'Oleh Chef Andi', timeAgo: '5 menit lalu', status: 'processing' },
    { id: '3', type: 'stock_alert', action: 'Stok Ayam mencapai batas minimum', details: 'Sisa: 5 kg', timeAgo: '15 menit lalu', status: 'warning' },
    { id: '4', type: 'order_received', action: 'Pesanan #1236 diterima dari meja 5', details: 'Prioritas tinggi', timeAgo: '20 menit lalu', status: 'info' },
    { id: '5', type: 'order_completed', action: 'Pesanan #1233 selesai dimasak', details: '', timeAgo: '25 menit lalu', status: 'success' },
    { id: '6', type: 'order_started', action: 'Pesanan #1237 sedang diproses', details: 'Oleh Chef Budi', timeAgo: '30 menit lalu', status: 'processing' },
    { id: '7', type: 'stock_alert', action: 'Stok Bawang Putih habis', details: 'Sisa: 0 kg (HABIS)', timeAgo: '45 menit lalu', status: 'error' },
    { id: '8', type: 'order_received', action: 'Pesanan #1238 diterima', details: '', timeAgo: '1 jam lalu', status: 'info' }
  ];
}

// Export helper for other APIs
export function addKitchenActivity(activity: Partial<KitchenActivity>) {
  const newActivity: KitchenActivity = {
    id: `act-${Date.now()}`,
    type: activity.type || 'order_received',
    action: activity.action || '',
    details: activity.details || '',
    orderId: activity.orderId,
    staffId: activity.staffId,
    productId: activity.productId,
    timestamp: new Date(),
    status: activity.status || 'info'
  };
  
  activityCache.unshift(newActivity);
  if (activityCache.length > MAX_CACHE_SIZE) {
    activityCache = activityCache.slice(0, MAX_CACHE_SIZE);
  }
  
  return newActivity;
}
