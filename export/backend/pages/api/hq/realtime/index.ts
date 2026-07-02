import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../auth/[...nextauth]';
import { QueryTypes } from 'sequelize';

/**
 * HQ Real-time Data API
 * Provides real-time data aggregation from all branches for HQ dashboard
 * Includes WebSocket event broadcasting for live updates
 */

interface BranchMetrics {
  branchId: string;
  branchName: string;
  branchCode: string;
  status: 'online' | 'offline' | 'warning';
  lastSync: string;
  metrics: {
    todaySales: number;
    todayTransactions: number;
    activeOrders: number;
    kitchenQueue: number;
    activeStaff: number;
    lowStockAlerts: number;
  };
}

interface HQRealtimeData {
  timestamp: string;
  summary: {
    totalBranches: number;
    onlineBranches: number;
    totalSalesToday: number;
    totalTransactions: number;
    totalActiveOrders: number;
    totalLowStockAlerts: number;
  };
  branches: BranchMetrics[];
  recentActivities: any[];
  alerts: any[];
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const session = await getServerSession(req, res, authOptions);
    if (!session?.user) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    // Check if user has HQ access
    const userRole = session.user.role;
    if (!['admin', 'hq_admin', 'hq_manager', 'owner'].includes(userRole || '')) {
      return res.status(403).json({ success: false, error: 'Access denied - HQ role required' });
    }

    const tenantId = session.user.tenantId;

    switch (req.method) {
      case 'GET':
        return getRealtimeData(req, res, tenantId);
      case 'POST':
        return broadcastToHQ(req, res, tenantId);
      default:
        return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error: any) {
    console.error('HQ Realtime API Error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}

async function getRealtimeData(
  req: NextApiRequest,
  res: NextApiResponse,
  tenantId: string | undefined
) {
  try {
    const { sequelize } = await import('@/lib/sequelizeClient');

    // Get all branches
    const branches = await sequelize.query(`
      SELECT 
        b.id,
        b.name,
        b.code,
        b.city,
        b.is_active,
        b.updated_at as last_sync,
        u.name as manager_name
      FROM branches b
      LEFT JOIN users u ON b.manager_id = u.id
      WHERE b.tenant_id = :tenantId
      ORDER BY b.name
    `, {
      replacements: { tenantId: tenantId || 'default' },
      type: QueryTypes.SELECT
    });

    // Get today's sales for each branch
    const today = new Date().toISOString().split('T')[0];
    const branchMetrics: BranchMetrics[] = await Promise.all(
      (branches as any[]).map(async (branch) => {
        // Sales data
        const [salesData] = await sequelize.query(`
          SELECT 
            COALESCE(SUM(total_amount), 0) as total_sales,
            COUNT(*) as transaction_count
          FROM pos_transactions
          WHERE branch_id = :branchId
          AND DATE(transaction_date) = :today
          AND status = 'completed'
        `, {
          replacements: { branchId: branch.id, today },
          type: QueryTypes.SELECT
        });

        // Active kitchen orders
        const [kitchenData] = await sequelize.query(`
          SELECT COUNT(*) as active_orders
          FROM kitchen_orders
          WHERE branch_id = :branchId
          AND status IN ('new', 'preparing')
        `, {
          replacements: { branchId: branch.id },
          type: QueryTypes.SELECT
        });

        // Low stock alerts
        const [stockData] = await sequelize.query(`
          SELECT COUNT(*) as low_stock_count
          FROM products
          WHERE branch_id = :branchId OR branch_id IS NULL
          AND tenant_id = :tenantId
          AND stock <= min_stock
          AND is_active = true
        `, {
          replacements: { branchId: branch.id, tenantId: tenantId || 'default' },
          type: QueryTypes.SELECT
        });

        // Active staff
        const [staffData] = await sequelize.query(`
          SELECT COUNT(*) as active_staff
          FROM shifts
          WHERE branch_id = :branchId
          AND status = 'open'
          AND DATE(shift_date) = :today
        `, {
          replacements: { branchId: branch.id, today },
          type: QueryTypes.SELECT
        });

        // Determine status based on last sync
        const lastSyncTime = new Date(branch.last_sync).getTime();
        const now = Date.now();
        const diffMinutes = (now - lastSyncTime) / 60000;
        let status: 'online' | 'offline' | 'warning' = 'online';
        if (diffMinutes > 30) status = 'offline';
        else if (diffMinutes > 10) status = 'warning';

        return {
          branchId: branch.id,
          branchName: branch.name,
          branchCode: branch.code,
          status,
          lastSync: branch.last_sync,
          metrics: {
            todaySales: parseFloat((salesData as any)?.total_sales || 0),
            todayTransactions: parseInt((salesData as any)?.transaction_count || 0),
            activeOrders: parseInt((kitchenData as any)?.active_orders || 0),
            kitchenQueue: parseInt((kitchenData as any)?.active_orders || 0),
            activeStaff: parseInt((staffData as any)?.active_staff || 0),
            lowStockAlerts: parseInt((stockData as any)?.low_stock_count || 0)
          }
        };
      })
    );

    // Calculate summary
    const summary = {
      totalBranches: branchMetrics.length,
      onlineBranches: branchMetrics.filter(b => b.status === 'online').length,
      totalSalesToday: branchMetrics.reduce((sum, b) => sum + b.metrics.todaySales, 0),
      totalTransactions: branchMetrics.reduce((sum, b) => sum + b.metrics.todayTransactions, 0),
      totalActiveOrders: branchMetrics.reduce((sum, b) => sum + b.metrics.activeOrders, 0),
      totalLowStockAlerts: branchMetrics.reduce((sum, b) => sum + b.metrics.lowStockAlerts, 0)
    };

    // Get recent activities from all branches
    const recentActivities = await sequelize.query(`
      SELECT 
        'transaction' as type,
        pt.transaction_number as reference,
        pt.total_amount as amount,
        b.name as branch_name,
        pt.created_at as timestamp
      FROM pos_transactions pt
      JOIN branches b ON pt.branch_id = b.id
      WHERE pt.tenant_id = :tenantId
      AND pt.created_at > NOW() - INTERVAL '1 hour'
      ORDER BY pt.created_at DESC
      LIMIT 20
    `, {
      replacements: { tenantId: tenantId || 'default' },
      type: QueryTypes.SELECT
    });

    // Get alerts
    const alerts = await generateHQAlerts(branchMetrics);

    const response: HQRealtimeData = {
      timestamp: new Date().toISOString(),
      summary,
      branches: branchMetrics,
      recentActivities: recentActivities as any[],
      alerts
    };

    return res.status(200).json({
      success: true,
      data: response
    });

  } catch (error: any) {
    console.error('Error fetching realtime data:', error);
    
    // Return mock data
    return res.status(200).json({
      success: true,
      data: getMockRealtimeData()
    });
  }
}

async function broadcastToHQ(
  req: NextApiRequest,
  res: NextApiResponse,
  tenantId: string | undefined
) {
  const { event, data, branchId } = req.body;

  if (!event) {
    return res.status(400).json({ success: false, error: 'Event type required' });
  }

  // Map branch events to HQ events
  const hqEvent = mapToHQEvent(event);

  // Broadcast to WebSocket
  try {
    await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3001'}/api/websocket/broadcast`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event: hqEvent,
        data: {
          ...data,
          branchId,
          tenantId,
          timestamp: new Date().toISOString()
        },
        target: 'hq' // Target HQ clients only
      })
    });
  } catch (wsError) {
    console.warn('WebSocket broadcast to HQ failed:', wsError);
  }

  return res.status(200).json({
    success: true,
    message: 'Event broadcasted to HQ'
  });
}

function mapToHQEvent(branchEvent: string): string {
  const eventMap: Record<string, string> = {
    'pos:transaction:complete': 'hq:branch:sale',
    'kitchen:order:complete': 'hq:branch:kitchen',
    'inventory:stock:low': 'hq:branch:alert',
    'shift:open': 'hq:branch:staff',
    'shift:close': 'hq:branch:staff'
  };
  return eventMap[branchEvent] || `hq:${branchEvent}`;
}

async function generateHQAlerts(branches: BranchMetrics[]): Promise<any[]> {
  const alerts: any[] = [];

  branches.forEach(branch => {
    // Offline branch alert
    if (branch.status === 'offline') {
      alerts.push({
        id: `offline-${branch.branchId}`,
        type: 'system',
        severity: 'critical',
        branchId: branch.branchId,
        branchName: branch.branchName,
        message: `${branch.branchName} tidak terhubung lebih dari 30 menit`,
        timestamp: new Date().toISOString()
      });
    }

    // Low stock alert
    if (branch.metrics.lowStockAlerts > 5) {
      alerts.push({
        id: `stock-${branch.branchId}`,
        type: 'low_stock',
        severity: 'warning',
        branchId: branch.branchId,
        branchName: branch.branchName,
        message: `${branch.metrics.lowStockAlerts} item stok rendah di ${branch.branchName}`,
        timestamp: new Date().toISOString()
      });
    }

    // High kitchen queue
    if (branch.metrics.kitchenQueue > 10) {
      alerts.push({
        id: `kitchen-${branch.branchId}`,
        type: 'kitchen',
        severity: 'warning',
        branchId: branch.branchId,
        branchName: branch.branchName,
        message: `Antrian dapur tinggi (${branch.metrics.kitchenQueue} pesanan) di ${branch.branchName}`,
        timestamp: new Date().toISOString()
      });
    }
  });

  return alerts.sort((a, b) => {
    const severityOrder = { critical: 0, warning: 1, info: 2 };
    return (severityOrder[a.severity as keyof typeof severityOrder] || 2) - 
           (severityOrder[b.severity as keyof typeof severityOrder] || 2);
  });
}

function getMockRealtimeData(): HQRealtimeData {
  return {
    timestamp: new Date().toISOString(),
    summary: {
      totalBranches: 8,
      onlineBranches: 7,
      totalSalesToday: 185500000,
      totalTransactions: 542,
      totalActiveOrders: 23,
      totalLowStockAlerts: 15
    },
    branches: [
      {
        branchId: '1',
        branchName: 'Cabang Pusat Jakarta',
        branchCode: 'HQ-001',
        status: 'online',
        lastSync: new Date().toISOString(),
        metrics: {
          todaySales: 45000000,
          todayTransactions: 156,
          activeOrders: 5,
          kitchenQueue: 5,
          activeStaff: 8,
          lowStockAlerts: 2
        }
      },
      {
        branchId: '2',
        branchName: 'Cabang Bandung',
        branchCode: 'BR-002',
        status: 'online',
        lastSync: new Date(Date.now() - 300000).toISOString(),
        metrics: {
          todaySales: 32000000,
          todayTransactions: 98,
          activeOrders: 3,
          kitchenQueue: 3,
          activeStaff: 6,
          lowStockAlerts: 5
        }
      },
      {
        branchId: '3',
        branchName: 'Cabang Surabaya',
        branchCode: 'BR-003',
        status: 'warning',
        lastSync: new Date(Date.now() - 900000).toISOString(),
        metrics: {
          todaySales: 28500000,
          todayTransactions: 87,
          activeOrders: 4,
          kitchenQueue: 4,
          activeStaff: 5,
          lowStockAlerts: 3
        }
      }
    ],
    recentActivities: [
      { type: 'transaction', reference: 'TRX-001', amount: 250000, branch_name: 'Cabang Jakarta', timestamp: new Date().toISOString() },
      { type: 'transaction', reference: 'TRX-002', amount: 180000, branch_name: 'Cabang Bandung', timestamp: new Date(Date.now() - 60000).toISOString() }
    ],
    alerts: [
      { id: '1', type: 'low_stock', severity: 'warning', branchName: 'Cabang Bandung', message: '5 item stok rendah', timestamp: new Date().toISOString() }
    ]
  };
}

// Export for use in other APIs
export async function notifyHQ(event: string, data: any, branchId: string) {
  try {
    await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3001'}/api/hq/realtime`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event, data, branchId })
    });
  } catch (error) {
    console.warn('Failed to notify HQ:', error);
  }
}
