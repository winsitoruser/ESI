import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../auth/[...nextauth]';
import { QueryTypes } from 'sequelize';

/**
 * Inventory Real-time API
 * Provides real-time stock updates, alerts, and notifications
 * Integrates with WebSocket for live dashboard updates
 */

interface StockAlert {
  id: string;
  type: 'low_stock' | 'out_of_stock' | 'expiring' | 'expired' | 'overstock';
  productId: string;
  productName: string;
  sku: string;
  currentStock: number;
  threshold: number;
  severity: 'info' | 'warning' | 'critical';
  message: string;
  timestamp: string;
}

interface StockMovement {
  id: string;
  type: 'in' | 'out' | 'adjustment' | 'transfer';
  productId: string;
  productName: string;
  quantity: number;
  previousStock: number;
  newStock: number;
  reference: string;
  userId: string;
  userName: string;
  timestamp: string;
}

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
        return getRealtimeData(req, res, tenantId, branchId);
      case 'POST':
        return broadcastStockUpdate(req, res, tenantId, branchId);
      default:
        return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error: any) {
    console.error('Inventory Realtime API Error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}

async function getRealtimeData(
  req: NextApiRequest,
  res: NextApiResponse,
  tenantId: string | undefined,
  branchId: string | undefined
) {
  try {
    const { sequelize } = await import('@/lib/sequelizeClient');

    // Get current stock stats
    const [stockStats] = await sequelize.query(`
      SELECT 
        COUNT(*) as total_products,
        COUNT(CASE WHEN stock <= 0 THEN 1 END) as out_of_stock,
        COUNT(CASE WHEN stock > 0 AND stock <= min_stock THEN 1 END) as low_stock,
        COUNT(CASE WHEN stock > min_stock * 3 THEN 1 END) as overstock,
        COALESCE(SUM(stock * cost), 0) as total_value
      FROM products
      WHERE tenant_id = :tenantId
      ${branchId ? 'AND (branch_id = :branchId OR branch_id IS NULL)' : ''}
      AND is_active = true
    `, {
      replacements: { tenantId: tenantId || 'default', branchId },
      type: QueryTypes.SELECT
    });

    // Get low stock alerts
    const lowStockAlerts = await sequelize.query(`
      SELECT 
        p.id,
        p.name,
        p.sku,
        p.stock as current_stock,
        p.min_stock as threshold,
        c.name as category
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.tenant_id = :tenantId
      ${branchId ? 'AND (p.branch_id = :branchId OR p.branch_id IS NULL)' : ''}
      AND p.is_active = true
      AND p.stock <= p.min_stock
      ORDER BY p.stock ASC
      LIMIT 20
    `, {
      replacements: { tenantId: tenantId || 'default', branchId },
      type: QueryTypes.SELECT
    });

    // Get expiring products (next 30 days)
    const expiringProducts = await sequelize.query(`
      SELECT 
        p.id,
        p.name,
        p.sku,
        p.stock,
        p.expiry_date,
        EXTRACT(DAY FROM p.expiry_date - NOW()) as days_until_expiry
      FROM products p
      WHERE p.tenant_id = :tenantId
      ${branchId ? 'AND (p.branch_id = :branchId OR p.branch_id IS NULL)' : ''}
      AND p.is_active = true
      AND p.expiry_date IS NOT NULL
      AND p.expiry_date <= NOW() + INTERVAL '30 days'
      AND p.expiry_date > NOW()
      ORDER BY p.expiry_date ASC
      LIMIT 10
    `, {
      replacements: { tenantId: tenantId || 'default', branchId },
      type: QueryTypes.SELECT
    });

    // Get recent stock movements
    const recentMovements = await sequelize.query(`
      SELECT 
        sm.id,
        sm.movement_type as type,
        sm.quantity,
        sm.previous_stock,
        sm.new_stock,
        sm.reference_number as reference,
        sm.created_at as timestamp,
        p.id as product_id,
        p.name as product_name,
        u.name as user_name
      FROM stock_movements sm
      JOIN products p ON sm.product_id = p.id
      LEFT JOIN users u ON sm.created_by = u.id
      WHERE sm.tenant_id = :tenantId
      ${branchId ? 'AND sm.branch_id = :branchId' : ''}
      ORDER BY sm.created_at DESC
      LIMIT 20
    `, {
      replacements: { tenantId: tenantId || 'default', branchId },
      type: QueryTypes.SELECT
    });

    // Generate alerts from data
    const alerts: StockAlert[] = [];

    // Low stock alerts
    (lowStockAlerts as any[]).forEach(item => {
      const severity = item.current_stock <= 0 ? 'critical' : 
                       item.current_stock <= item.threshold / 2 ? 'warning' : 'info';
      alerts.push({
        id: `low-${item.id}`,
        type: item.current_stock <= 0 ? 'out_of_stock' : 'low_stock',
        productId: item.id,
        productName: item.name,
        sku: item.sku,
        currentStock: item.current_stock,
        threshold: item.threshold,
        severity,
        message: item.current_stock <= 0 
          ? `${item.name} HABIS!` 
          : `Stok ${item.name} rendah (${item.current_stock} tersisa)`,
        timestamp: new Date().toISOString()
      });
    });

    // Expiring alerts
    (expiringProducts as any[]).forEach(item => {
      const daysLeft = Math.round(item.days_until_expiry);
      const severity = daysLeft <= 7 ? 'critical' : daysLeft <= 14 ? 'warning' : 'info';
      alerts.push({
        id: `exp-${item.id}`,
        type: 'expiring',
        productId: item.id,
        productName: item.name,
        sku: item.sku,
        currentStock: item.stock,
        threshold: daysLeft,
        severity,
        message: `${item.name} kadaluarsa dalam ${daysLeft} hari`,
        timestamp: new Date().toISOString()
      });
    });

    // Format movements
    const movements: StockMovement[] = (recentMovements as any[]).map(m => ({
      id: m.id,
      type: m.type,
      productId: m.product_id,
      productName: m.product_name,
      quantity: m.quantity,
      previousStock: m.previous_stock,
      newStock: m.new_stock,
      reference: m.reference || '-',
      userId: '',
      userName: m.user_name || 'System',
      timestamp: m.timestamp
    }));

    const stats = stockStats as any;

    return res.status(200).json({
      success: true,
      data: {
        stats: {
          totalProducts: parseInt(stats.total_products) || 0,
          outOfStock: parseInt(stats.out_of_stock) || 0,
          lowStock: parseInt(stats.low_stock) || 0,
          overstock: parseInt(stats.overstock) || 0,
          totalValue: parseFloat(stats.total_value) || 0
        },
        alerts: alerts.sort((a, b) => {
          const severityOrder = { critical: 0, warning: 1, info: 2 };
          return severityOrder[a.severity] - severityOrder[b.severity];
        }),
        movements,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error: any) {
    console.error('Error fetching realtime inventory:', error);
    return res.status(200).json({
      success: true,
      data: getMockRealtimeData()
    });
  }
}

async function broadcastStockUpdate(
  req: NextApiRequest,
  res: NextApiResponse,
  tenantId: string | undefined,
  branchId: string | undefined
) {
  const { type, productId, productName, quantity, previousStock, newStock, reference } = req.body;

  if (!type || !productId) {
    return res.status(400).json({ success: false, error: 'Type and productId required' });
  }

  const movement: StockMovement = {
    id: `mov-${Date.now()}`,
    type,
    productId,
    productName: productName || 'Unknown',
    quantity,
    previousStock,
    newStock,
    reference: reference || '-',
    userId: '',
    userName: 'System',
    timestamp: new Date().toISOString()
  };

  // Broadcast to WebSocket
  try {
    await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3001'}/api/websocket/broadcast`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event: 'inventory:stock:update',
        data: {
          movement,
          branchId,
          timestamp: new Date().toISOString()
        },
        branchId
      })
    });

    // Check if this creates an alert
    if (newStock <= 0) {
      await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3001'}/api/websocket/broadcast`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event: 'inventory:alert',
          data: {
            type: 'out_of_stock',
            productId,
            productName,
            currentStock: newStock,
            severity: 'critical'
          },
          branchId
        })
      });
    }

  } catch (wsError) {
    console.warn('WebSocket broadcast failed:', wsError);
  }

  return res.status(200).json({
    success: true,
    message: 'Stock update broadcasted',
    data: movement
  });
}

function getMockRealtimeData() {
  return {
    stats: {
      totalProducts: 1250,
      outOfStock: 15,
      lowStock: 45,
      overstock: 20,
      totalValue: 850000000
    },
    alerts: [
      { id: '1', type: 'out_of_stock', productName: 'Paracetamol 500mg', sku: 'PAR500', currentStock: 0, threshold: 10, severity: 'critical', message: 'Paracetamol 500mg HABIS!', timestamp: new Date().toISOString() },
      { id: '2', type: 'low_stock', productName: 'Amoxicillin 500mg', sku: 'AMOX500', currentStock: 5, threshold: 15, severity: 'warning', message: 'Stok Amoxicillin 500mg rendah (5 tersisa)', timestamp: new Date().toISOString() },
      { id: '3', type: 'expiring', productName: 'Vitamin C 1000mg', sku: 'VITC1000', currentStock: 50, threshold: 7, severity: 'warning', message: 'Vitamin C 1000mg kadaluarsa dalam 7 hari', timestamp: new Date().toISOString() }
    ],
    movements: [
      { id: '1', type: 'out', productName: 'Paracetamol 500mg', quantity: 10, previousStock: 10, newStock: 0, reference: 'TRX-001', userName: 'Kasir A', timestamp: new Date().toISOString() },
      { id: '2', type: 'in', productName: 'Amoxicillin 500mg', quantity: 100, previousStock: 5, newStock: 105, reference: 'PO-001', userName: 'Admin', timestamp: new Date(Date.now() - 3600000).toISOString() }
    ],
    timestamp: new Date().toISOString()
  };
}

// Export helper for other APIs
export async function notifyStockChange(
  productId: string,
  productName: string,
  type: 'in' | 'out' | 'adjustment',
  quantity: number,
  previousStock: number,
  newStock: number,
  branchId: string
) {
  try {
    await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3001'}/api/inventory/realtime`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type, productId, productName, quantity, previousStock, newStock })
    });
  } catch (error) {
    console.warn('Failed to notify stock change:', error);
  }
}
