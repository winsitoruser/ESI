import type { NextApiRequest, NextApiResponse } from 'next';

/**
 * Webhook endpoint for receiving real-time branch updates
 * 
 * Events supported:
 * - kitchen.order.created - New kitchen order created
 * - kitchen.order.updated - Kitchen order status changed
 * - kitchen.order.completed - Kitchen order completed
 * - order.created - New order created
 * - order.updated - Order status changed
 * - order.completed - Order completed
 * - table.status.changed - Table occupancy changed
 * - employee.checkin - Employee checked in
 * - employee.checkout - Employee checked out
 * - employee.break.start - Employee started break
 * - employee.break.end - Employee ended break
 * - queue.updated - Queue status updated
 * - sla.breach - SLA breach detected
 */

interface WebhookPayload {
  event: string;
  branchId: string;
  timestamp: string;
  data: any;
}

// In-memory store for real-time metrics (would be Redis in production)
const branchMetricsCache: Map<string, any> = new Map();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }

  try {
    const payload: WebhookPayload = req.body;
    const { event, branchId, timestamp, data } = payload;

    if (!event || !branchId) {
      return res.status(400).json({ error: 'Missing required fields: event, branchId' });
    }

    console.log(`[Webhook] Received ${event} for branch ${branchId} at ${timestamp}`);

    // Get or initialize branch metrics
    let metrics = branchMetricsCache.get(branchId) || initializeMetrics(branchId);

    // Process event
    switch (event) {
      case 'kitchen.order.created':
        metrics.kitchen.pendingOrders += 1;
        metrics.kitchen.status = calculateKitchenStatus(metrics.kitchen);
        break;

      case 'kitchen.order.started':
        metrics.kitchen.pendingOrders = Math.max(0, metrics.kitchen.pendingOrders - 1);
        metrics.kitchen.activeOrders += 1;
        metrics.kitchen.status = calculateKitchenStatus(metrics.kitchen);
        break;

      case 'kitchen.order.completed':
        metrics.kitchen.activeOrders = Math.max(0, metrics.kitchen.activeOrders - 1);
        metrics.kitchen.completedToday += 1;
        if (data?.prepTime) {
          metrics.kitchen.avgPrepTime = updateAverage(
            metrics.kitchen.avgPrepTime,
            data.prepTime,
            metrics.kitchen.completedToday
          );
          // Check SLA
          if (data.prepTime > metrics.sla.kitchenTarget) {
            metrics.sla.breaches.push({
              type: 'kitchen',
              orderNumber: data.orderNumber,
              exceeded: data.prepTime - metrics.sla.kitchenTarget,
              time: new Date().toLocaleTimeString('id-ID')
            });
          }
        }
        metrics.kitchen.status = calculateKitchenStatus(metrics.kitchen);
        break;

      case 'order.created':
        metrics.orders.totalToday += 1;
        if (data?.source === 'online') {
          metrics.orders.online += 1;
        } else {
          metrics.orders.offline += 1;
        }
        if (data?.type === 'dine_in') metrics.orders.dineIn += 1;
        if (data?.type === 'takeaway') metrics.orders.takeaway += 1;
        if (data?.type === 'delivery') metrics.orders.delivery += 1;
        metrics.orders.pending += 1;
        break;

      case 'order.completed':
        metrics.orders.pending = Math.max(0, metrics.orders.pending - 1);
        metrics.orders.completed += 1;
        if (data?.total) {
          metrics.sales.today += data.total;
          metrics.sales.thisHour += data.total;
          metrics.sales.transactions += 1;
          metrics.sales.avgTicket = metrics.sales.today / metrics.sales.transactions;
        }
        break;

      case 'table.occupied':
        metrics.occupancy.occupied += 1;
        metrics.occupancy.available = Math.max(0, metrics.occupancy.available - 1);
        metrics.occupancy.percentage = (metrics.occupancy.occupied / metrics.occupancy.totalTables) * 100;
        break;

      case 'table.released':
        metrics.occupancy.occupied = Math.max(0, metrics.occupancy.occupied - 1);
        metrics.occupancy.available += 1;
        metrics.occupancy.percentage = (metrics.occupancy.occupied / metrics.occupancy.totalTables) * 100;
        break;

      case 'table.reserved':
        metrics.occupancy.reserved += 1;
        metrics.occupancy.available = Math.max(0, metrics.occupancy.available - 1);
        break;

      case 'employee.checkin':
        metrics.employees.present += 1;
        metrics.employees.absent = Math.max(0, metrics.employees.absent - 1);
        metrics.employees.attendance = (metrics.employees.present / metrics.employees.total) * 100;
        break;

      case 'employee.checkout':
        metrics.employees.present = Math.max(0, metrics.employees.present - 1);
        break;

      case 'employee.break.start':
        metrics.employees.onBreak += 1;
        break;

      case 'employee.break.end':
        metrics.employees.onBreak = Math.max(0, metrics.employees.onBreak - 1);
        break;

      case 'queue.customer.joined':
        metrics.queue.currentLength += 1;
        break;

      case 'queue.customer.served':
        metrics.queue.currentLength = Math.max(0, metrics.queue.currentLength - 1);
        metrics.queue.servedToday += 1;
        if (data?.waitTime) {
          metrics.queue.avgWaitTime = updateAverage(
            metrics.queue.avgWaitTime,
            data.waitTime,
            metrics.queue.servedToday
          );
        }
        break;

      case 'sla.breach':
        metrics.sla.breaches.push({
          type: data?.type || 'unknown',
          orderNumber: data?.orderNumber,
          exceeded: data?.exceeded || 0,
          time: new Date().toLocaleTimeString('id-ID')
        });
        break;

      default:
        console.log(`[Webhook] Unknown event: ${event}`);
    }

    // Update timestamp
    metrics.lastUpdated = new Date().toISOString();

    // Store updated metrics
    branchMetricsCache.set(branchId, metrics);

    // Calculate SLA compliance
    metrics.sla.overallSLA = calculateSLACompliance(metrics);

    return res.status(200).json({
      success: true,
      event,
      branchId,
      processed: true
    });

  } catch (error) {
    console.error('[Webhook] Error processing webhook:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

function initializeMetrics(branchId: string) {
  return {
    branchId,
    lastUpdated: new Date().toISOString(),
    kitchen: {
      status: 'idle',
      activeOrders: 0,
      pendingOrders: 0,
      completedToday: 0,
      avgPrepTime: 0,
      slaCompliance: 100
    },
    queue: {
      currentLength: 0,
      avgWaitTime: 0,
      servedToday: 0
    },
    orders: {
      totalToday: 0,
      online: 0,
      offline: 0,
      dineIn: 0,
      takeaway: 0,
      delivery: 0,
      pending: 0,
      completed: 0
    },
    occupancy: {
      percentage: 0,
      totalTables: 25,
      occupied: 0,
      available: 25,
      reserved: 0
    },
    employees: {
      total: 20,
      present: 0,
      absent: 20,
      onBreak: 0,
      attendance: 0
    },
    sales: {
      today: 0,
      thisHour: 0,
      transactions: 0,
      avgTicket: 0
    },
    sla: {
      kitchenTarget: 15,
      serviceTarget: 5,
      deliveryTarget: 30,
      overallSLA: 100,
      breaches: []
    }
  };
}

function calculateKitchenStatus(kitchen: any): string {
  const totalOrders = kitchen.activeOrders + kitchen.pendingOrders;
  if (totalOrders === 0) return 'idle';
  if (totalOrders <= 5) return 'normal';
  if (totalOrders <= 10) return 'busy';
  return 'overloaded';
}

function updateAverage(currentAvg: number, newValue: number, count: number): number {
  return ((currentAvg * (count - 1)) + newValue) / count;
}

function calculateSLACompliance(metrics: any): number {
  const totalOrders = metrics.kitchen.completedToday + metrics.orders.completed;
  if (totalOrders === 0) return 100;
  const breachCount = metrics.sla.breaches.length;
  return Math.round(((totalOrders - breachCount) / totalOrders) * 100);
}

// Export for use in other modules
export { branchMetricsCache };
