import type { NextApiRequest, NextApiResponse } from 'next';
import { Branch, KitchenOrder, KitchenStaff, Employee, Table, PosTransaction } from '../../../../../models';
import { Op } from 'sequelize';

// Mock data for when database is not available
const getMockRealtimeData = (branchId: string) => ({
  branchId,
  lastUpdated: new Date().toISOString(),
  
  // Kitchen Performance
  kitchen: {
    status: 'normal',
    activeOrders: 8,
    pendingOrders: 3,
    completedToday: 145,
    avgPrepTime: 12.5, // minutes
    targetPrepTime: 15,
    slaCompliance: 92,
    staffOnDuty: 4,
    ordersPerHour: [
      { hour: '08:00', orders: 12 },
      { hour: '09:00', orders: 18 },
      { hour: '10:00', orders: 25 },
      { hour: '11:00', orders: 38 },
      { hour: '12:00', orders: 52 },
      { hour: '13:00', orders: 48 },
      { hour: '14:00', orders: 32 },
      { hour: '15:00', orders: 28 }
    ],
    activeItems: [
      { id: '1', orderNumber: 'ORD-001', items: 'Nasi Goreng x2, Es Teh x2', status: 'preparing', startedAt: new Date(Date.now() - 300000).toISOString(), estimatedTime: 10, elapsed: 5 },
      { id: '2', orderNumber: 'ORD-002', items: 'Mie Ayam x1, Bakso x1', status: 'preparing', startedAt: new Date(Date.now() - 180000).toISOString(), estimatedTime: 8, elapsed: 3 },
      { id: '3', orderNumber: 'ORD-003', items: 'Sate Ayam x3', status: 'new', startedAt: null, estimatedTime: 12, elapsed: 0 },
      { id: '4', orderNumber: 'ORD-004', items: 'Gado-gado x2, Es Jeruk x2', status: 'preparing', startedAt: new Date(Date.now() - 420000).toISOString(), estimatedTime: 10, elapsed: 7 },
      { id: '5', orderNumber: 'ORD-005', items: 'Ayam Bakar x1', status: 'ready', startedAt: new Date(Date.now() - 600000).toISOString(), estimatedTime: 15, elapsed: 10 }
    ]
  },

  // Queue & Service
  queue: {
    currentLength: 5,
    avgWaitTime: 8.2, // minutes
    servedToday: 342,
    peakHour: '12:00',
    peakWaitTime: 15,
    serviceRate: 94, // percentage satisfied
    queueTrend: [
      { time: '08:00', length: 2 },
      { time: '09:00', length: 4 },
      { time: '10:00', length: 6 },
      { time: '11:00', length: 12 },
      { time: '12:00', length: 18 },
      { time: '13:00', length: 15 },
      { time: '14:00', length: 8 },
      { time: '15:00', length: 5 }
    ]
  },

  // Orders
  orders: {
    totalToday: 287,
    online: 98,
    offline: 189,
    dineIn: 156,
    takeaway: 87,
    delivery: 44,
    pending: 8,
    completed: 275,
    cancelled: 4,
    avgOrderValue: 85000,
    hourlyOrders: [
      { hour: '08:00', online: 5, offline: 12 },
      { hour: '09:00', online: 8, offline: 18 },
      { hour: '10:00', online: 12, offline: 22 },
      { hour: '11:00', online: 18, offline: 35 },
      { hour: '12:00', online: 25, offline: 48 },
      { hour: '13:00', online: 22, offline: 42 },
      { hour: '14:00', online: 15, offline: 28 },
      { hour: '15:00', online: 10, offline: 20 }
    ],
    recentOrders: [
      { id: '1', orderNumber: 'ORD-287', type: 'dine_in', source: 'offline', total: 125000, status: 'completed', time: '15:42' },
      { id: '2', orderNumber: 'ORD-286', type: 'takeaway', source: 'online', total: 78000, status: 'preparing', time: '15:40' },
      { id: '3', orderNumber: 'ORD-285', type: 'delivery', source: 'online', total: 156000, status: 'preparing', time: '15:38' },
      { id: '4', orderNumber: 'ORD-284', type: 'dine_in', source: 'offline', total: 92000, status: 'completed', time: '15:35' },
      { id: '5', orderNumber: 'ORD-283', type: 'dine_in', source: 'offline', total: 67000, status: 'completed', time: '15:32' }
    ]
  },

  // Occupancy & Tables
  occupancy: {
    percentage: 72,
    totalTables: 25,
    occupied: 18,
    available: 5,
    reserved: 2,
    avgTurnoverTime: 45, // minutes
    peakOccupancy: 95,
    peakTime: '12:30',
    tableStatus: [
      { id: '1', number: 'A1', capacity: 4, status: 'occupied', guests: 3, orderValue: 125000, duration: 35 },
      { id: '2', number: 'A2', capacity: 4, status: 'occupied', guests: 4, orderValue: 180000, duration: 28 },
      { id: '3', number: 'A3', capacity: 2, status: 'available', guests: 0, orderValue: 0, duration: 0 },
      { id: '4', number: 'A4', capacity: 6, status: 'occupied', guests: 5, orderValue: 275000, duration: 42 },
      { id: '5', number: 'B1', capacity: 4, status: 'reserved', guests: 0, orderValue: 0, duration: 0 },
      { id: '6', number: 'B2', capacity: 4, status: 'occupied', guests: 2, orderValue: 95000, duration: 15 },
      { id: '7', number: 'B3', capacity: 2, status: 'available', guests: 0, orderValue: 0, duration: 0 },
      { id: '8', number: 'B4', capacity: 8, status: 'occupied', guests: 7, orderValue: 420000, duration: 55 }
    ]
  },

  // Employees
  employees: {
    total: 18,
    present: 15,
    absent: 2,
    onLeave: 1,
    onBreak: 2,
    attendance: 83,
    byRole: {
      kitchen: { total: 5, active: 4, onBreak: 1 },
      cashier: { total: 3, active: 3, onBreak: 0 },
      waiter: { total: 6, active: 5, onBreak: 1 },
      manager: { total: 1, active: 1, onBreak: 0 },
      others: { total: 3, active: 2, onBreak: 0 }
    },
    shifts: [
      { name: 'Pagi', start: '07:00', end: '15:00', staff: 8, status: 'active' },
      { name: 'Siang', start: '11:00', end: '19:00', staff: 7, status: 'active' },
      { name: 'Malam', start: '15:00', end: '23:00', staff: 0, status: 'upcoming' }
    ],
    staffList: [
      { id: '1', name: 'Ahmad Wijaya', role: 'Manager', status: 'active', checkIn: '06:55', performance: 95 },
      { id: '2', name: 'Siti Rahayu', role: 'Cashier', status: 'active', checkIn: '07:02', performance: 92 },
      { id: '3', name: 'Budi Santoso', role: 'Kitchen', status: 'active', checkIn: '06:58', performance: 88 },
      { id: '4', name: 'Dewi Kusuma', role: 'Waiter', status: 'break', checkIn: '07:05', performance: 90 },
      { id: '5', name: 'Rudi Hermawan', role: 'Kitchen', status: 'active', checkIn: '07:00', performance: 85 },
      { id: '6', name: 'Rina Wati', role: 'Waiter', status: 'active', checkIn: '11:00', performance: 91 }
    ]
  },

  // Sales Summary
  sales: {
    today: 24500000,
    yesterday: 22800000,
    thisHour: 1850000,
    target: 28000000,
    achievement: 87.5,
    growth: 7.5,
    transactions: 287,
    avgTicket: 85365,
    hourlyRevenue: [
      { hour: '08:00', revenue: 1200000 },
      { hour: '09:00', revenue: 1850000 },
      { hour: '10:00', revenue: 2400000 },
      { hour: '11:00', revenue: 3800000 },
      { hour: '12:00', revenue: 5200000 },
      { hour: '13:00', revenue: 4600000 },
      { hour: '14:00', revenue: 3200000 },
      { hour: '15:00', revenue: 2250000 }
    ],
    paymentMethods: [
      { method: 'Cash', amount: 9800000, count: 115 },
      { method: 'QRIS', amount: 7200000, count: 98 },
      { method: 'Debit', amount: 4500000, count: 52 },
      { method: 'Credit', amount: 3000000, count: 22 }
    ]
  },

  // SLA Metrics
  sla: {
    kitchenSLA: { target: 15, actual: 12.5, compliance: 92 },
    serviceSLA: { target: 5, actual: 4.2, compliance: 96 },
    deliverySLA: { target: 30, actual: 28, compliance: 88 },
    overallSLA: 92,
    breaches: [
      { type: 'kitchen', orderNumber: 'ORD-245', exceeded: 3, time: '12:45' },
      { type: 'kitchen', orderNumber: 'ORD-212', exceeded: 5, time: '11:32' },
      { type: 'delivery', orderNumber: 'ORD-198', exceeded: 8, time: '10:15' }
    ]
  }
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query;

  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }

  try {
    // Try to fetch real data from database
    const branch = await Branch?.findByPk(id as string);
    
    if (!branch) {
      // Return mock data if branch not found in DB
      return res.status(200).json(getMockRealtimeData(id as string));
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Fetch kitchen orders
    let kitchenOrders: any[] = [];
    try {
      kitchenOrders = await KitchenOrder?.findAll({
        where: {
          branchId: id,
          createdAt: { [Op.gte]: today }
        },
        order: [['createdAt', 'DESC']]
      }) || [];
    } catch (e) {
      console.log('KitchenOrder not available');
    }

    // Fetch employees
    let employees: any[] = [];
    try {
      employees = await Employee?.findAll({
        where: { branchId: id, status: 'active' }
      }) || [];
    } catch (e) {
      console.log('Employee not available');
    }

    // Fetch tables
    let tables: any[] = [];
    try {
      tables = await Table?.findAll({
        where: { branchId: id }
      }) || [];
    } catch (e) {
      console.log('Table not available');
    }

    // Fetch transactions
    let transactions: any[] = [];
    try {
      transactions = await PosTransaction?.findAll({
        where: {
          branchId: id,
          createdAt: { [Op.gte]: today }
        }
      }) || [];
    } catch (e) {
      console.log('PosTransaction not available');
    }

    // If we have real data, compute metrics
    if (kitchenOrders.length > 0 || employees.length > 0 || tables.length > 0) {
      // Build real metrics here
      // For now, return mock data enhanced with any real data available
    }

    // Return mock data for development
    return res.status(200).json(getMockRealtimeData(id as string));

  } catch (error) {
    console.error('Error fetching realtime data:', error);
    return res.status(200).json(getMockRealtimeData(id as string));
  }
}
