import type { NextApiRequest, NextApiResponse } from 'next';

export interface OnlineOrder {
  id: string;
  orderNumber: string;
  queueNumber: number;
  platform: 'gofood' | 'grabfood' | 'shopeefood' | 'tokopedia' | 'shopee' | 'walkin' | 'dine_in';
  platformOrderId: string;
  customerName: string;
  customerPhone?: string;
  orderType: 'delivery' | 'pickup' | 'dine_in';
  items: Array<{
    id: string;
    name: string;
    quantity: number;
    price: number;
    notes?: string;
    modifiers?: string[];
  }>;
  subtotal: number;
  deliveryFee?: number;
  platformFee?: number;
  discount?: number;
  total: number;
  status: 'new' | 'accepted' | 'preparing' | 'ready' | 'picked_up' | 'completed' | 'cancelled';
  priority: 'normal' | 'high' | 'urgent';
  estimatedPrepTime: number;
  estimatedPickupTime?: string;
  driverInfo?: {
    name: string;
    phone: string;
    vehicle: string;
    plateNumber: string;
  };
  notes?: string;
  createdAt: string;
  acceptedAt?: string;
  prepStartedAt?: string;
  readyAt?: string;
  completedAt?: string;
  tableNumber?: string;
  branchId: string;
}

// Indonesian names for realistic data
const customerNames = [
  'Budi Santoso', 'Siti Rahayu', 'Ahmad Hidayat', 'Dewi Lestari', 'Rizky Pratama',
  'Nur Aini', 'Eko Prasetyo', 'Sri Wahyuni', 'Agus Setiawan', 'Rina Marlina',
  'Dian Permata', 'Hendra Wijaya', 'Fitri Handayani', 'Bambang Suryono', 'Yuni Astuti',
  'Andi Firmansyah', 'Maya Sari', 'Rudi Hartono', 'Wulan Dari', 'Fajar Nugroho'
];

const driverNames = [
  'Pak Joko', 'Mas Dedi', 'Bang Roni', 'Kang Asep', 'Mas Adi',
  'Pak Wahyu', 'Mas Bima', 'Bang Heri', 'Kang Ujang', 'Pak Tono'
];

const menuItems = [
  { id: 'm1', name: 'Nasi Goreng Spesial', price: 35000, category: 'main' },
  { id: 'm2', name: 'Nasi Goreng Kampung', price: 28000, category: 'main' },
  { id: 'm3', name: 'Mie Goreng Jawa', price: 30000, category: 'main' },
  { id: 'm4', name: 'Mie Ayam Bakso', price: 25000, category: 'main' },
  { id: 'm5', name: 'Ayam Bakar Madu', price: 45000, category: 'main' },
  { id: 'm6', name: 'Ayam Goreng Kremes', price: 40000, category: 'main' },
  { id: 'm7', name: 'Ayam Geprek Level 1-5', price: 28000, category: 'main' },
  { id: 'm8', name: 'Sate Ayam 10 Tusuk', price: 35000, category: 'main' },
  { id: 'm9', name: 'Sate Kambing 10 Tusuk', price: 55000, category: 'main' },
  { id: 'm10', name: 'Ikan Bakar Bumbu Kecap', price: 50000, category: 'main' },
  { id: 'm11', name: 'Rendang Daging', price: 48000, category: 'main' },
  { id: 'm12', name: 'Gulai Kambing', price: 52000, category: 'main' },
  { id: 'm13', name: 'Soto Ayam', price: 25000, category: 'main' },
  { id: 'm14', name: 'Bakso Urat Spesial', price: 30000, category: 'main' },
  { id: 'm15', name: 'Gado-Gado', price: 22000, category: 'main' },
  { id: 'm16', name: 'Nasi Putih', price: 8000, category: 'side' },
  { id: 'm17', name: 'Lontong', price: 5000, category: 'side' },
  { id: 'm18', name: 'Kerupuk', price: 3000, category: 'side' },
  { id: 'm19', name: 'Es Teh Manis', price: 8000, category: 'drink' },
  { id: 'm20', name: 'Es Teh Tawar', price: 5000, category: 'drink' },
  { id: 'm21', name: 'Es Jeruk', price: 12000, category: 'drink' },
  { id: 'm22', name: 'Jus Alpukat', price: 18000, category: 'drink' },
  { id: 'm23', name: 'Kopi Susu', price: 18000, category: 'drink' },
  { id: 'm24', name: 'Es Campur', price: 15000, category: 'drink' },
  { id: 'm25', name: 'Air Mineral', price: 5000, category: 'drink' },
];

const itemNotes = [
  'Pedas level 3', 'Tidak pakai bawang', 'Ekstra sambal', 'Tanpa MSG', 
  'Pedas banget', 'Tidak pedas', 'Ekstra sayur', 'Tambah telur',
  'Tidak pakai kecap', 'Ekstra daging', ''
];

// Helper function to generate random items
function generateRandomItems(count: number = 0): OnlineOrder['items'] {
  const itemCount = count || Math.floor(Math.random() * 4) + 1;
  const items: OnlineOrder['items'] = [];
  const usedIds = new Set<string>();

  for (let i = 0; i < itemCount; i++) {
    let item;
    do {
      item = menuItems[Math.floor(Math.random() * menuItems.length)];
    } while (usedIds.has(item.id));
    
    usedIds.add(item.id);
    items.push({
      id: item.id,
      name: item.name,
      quantity: Math.floor(Math.random() * 3) + 1,
      price: item.price,
      notes: Math.random() > 0.7 ? itemNotes[Math.floor(Math.random() * itemNotes.length)] : undefined
    });
  }
  return items;
}

// Generate realistic driver info
function generateDriverInfo() {
  const name = driverNames[Math.floor(Math.random() * driverNames.length)];
  const plateLetters = ['B', 'D', 'F', 'L', 'N', 'AB', 'AD', 'AG'];
  const plate = `${plateLetters[Math.floor(Math.random() * plateLetters.length)]} ${Math.floor(Math.random() * 9000) + 1000} ${['ABC', 'XYZ', 'JKL', 'MNO', 'PQR'][Math.floor(Math.random() * 5)]}`;
  return {
    name,
    phone: `0812${Math.floor(Math.random() * 90000000) + 10000000}`,
    vehicle: 'Motor',
    plateNumber: plate
  };
}

// Generate queue number based on order type
let queueNumberOnline = 100 + Math.floor(Math.random() * 20);
let queueNumberWalkin = 200 + Math.floor(Math.random() * 10);
let queueNumberDineIn = 300 + Math.floor(Math.random() * 5);

function getNextQueueNumberForPlatform(platform: string): number {
  if (platform === 'walkin') return ++queueNumberWalkin;
  if (platform === 'dine_in') return ++queueNumberDineIn;
  return ++queueNumberOnline;
}

// Generate realistic mock orders
function generateMockOrders(): OnlineOrder[] {
  const orders: OnlineOrder[] = [];
  const now = Date.now();
  
  // Active orders - NEW (3 orders)
  const newOrders = [
    { platform: 'gofood', minutesAgo: 1 },
    { platform: 'grabfood', minutesAgo: 2 },
    { platform: 'dine_in', minutesAgo: 0.5 },
  ];

  newOrders.forEach((config, idx) => {
    const items = generateRandomItems();
    const subtotal = items.reduce((acc, item) => acc + (item.price * item.quantity), 0);
    const isOnline = !['walkin', 'dine_in'].includes(config.platform);
    const deliveryFee = isOnline ? Math.floor(Math.random() * 8000) + 8000 : 0;
    const platformFee = isOnline ? Math.floor(subtotal * 0.1) : 0;

    orders.push({
      id: `oo-new-${idx + 1}`,
      orderNumber: `${isOnline ? 'ONL' : config.platform === 'dine_in' ? 'DIN' : 'WLK'}-${String(now).slice(-4)}${idx}`,
      queueNumber: getNextQueueNumberForPlatform(config.platform),
      platform: config.platform as any,
      platformOrderId: `${config.platform.toUpperCase()}-${Date.now()}${idx}`,
      customerName: config.platform === 'dine_in' ? `Meja ${Math.floor(Math.random() * 12) + 1}` : customerNames[Math.floor(Math.random() * customerNames.length)],
      customerPhone: `0812${Math.floor(Math.random() * 90000000) + 10000000}`,
      orderType: config.platform === 'dine_in' ? 'dine_in' : isOnline ? 'delivery' : 'pickup',
      tableNumber: config.platform === 'dine_in' ? String(Math.floor(Math.random() * 12) + 1) : undefined,
      items,
      subtotal,
      deliveryFee: deliveryFee || undefined,
      platformFee: platformFee || undefined,
      total: subtotal + deliveryFee + platformFee,
      status: 'new',
      priority: 'normal',
      estimatedPrepTime: Math.floor(Math.random() * 10) + 10,
      estimatedPickupTime: new Date(now + (Math.floor(Math.random() * 20) + 15) * 60000).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
      driverInfo: isOnline ? generateDriverInfo() : undefined,
      createdAt: new Date(now - config.minutesAgo * 60000).toISOString(),
      branchId: 'branch-001'
    });
  });

  // Active orders - ACCEPTED (2 orders)
  const acceptedOrders = [
    { platform: 'shopeefood', minutesAgo: 4 },
    { platform: 'walkin', minutesAgo: 3 },
  ];

  acceptedOrders.forEach((config, idx) => {
    const items = generateRandomItems();
    const subtotal = items.reduce((acc, item) => acc + (item.price * item.quantity), 0);
    const isOnline = !['walkin', 'dine_in'].includes(config.platform);
    const deliveryFee = isOnline ? Math.floor(Math.random() * 8000) + 8000 : 0;
    const platformFee = isOnline ? Math.floor(subtotal * 0.1) : 0;

    orders.push({
      id: `oo-acc-${idx + 1}`,
      orderNumber: `${isOnline ? 'ONL' : 'WLK'}-${String(now).slice(-4)}${idx + 3}`,
      queueNumber: getNextQueueNumberForPlatform(config.platform),
      platform: config.platform as any,
      platformOrderId: `${config.platform.toUpperCase()}-${Date.now()}${idx + 3}`,
      customerName: customerNames[Math.floor(Math.random() * customerNames.length)],
      customerPhone: `0813${Math.floor(Math.random() * 90000000) + 10000000}`,
      orderType: isOnline ? 'delivery' : 'pickup',
      items,
      subtotal,
      deliveryFee: deliveryFee || undefined,
      platformFee: platformFee || undefined,
      total: subtotal + deliveryFee + platformFee,
      status: 'accepted',
      priority: 'normal',
      estimatedPrepTime: Math.floor(Math.random() * 10) + 12,
      estimatedPickupTime: new Date(now + (Math.floor(Math.random() * 15) + 10) * 60000).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
      driverInfo: isOnline ? generateDriverInfo() : undefined,
      createdAt: new Date(now - config.minutesAgo * 60000).toISOString(),
      acceptedAt: new Date(now - (config.minutesAgo - 1) * 60000).toISOString(),
      branchId: 'branch-001'
    });
  });

  // Active orders - PREPARING (3 orders)
  const preparingOrders = [
    { platform: 'gofood', minutesAgo: 8 },
    { platform: 'grabfood', minutesAgo: 6 },
    { platform: 'dine_in', minutesAgo: 5 },
  ];

  preparingOrders.forEach((config, idx) => {
    const items = generateRandomItems();
    const subtotal = items.reduce((acc, item) => acc + (item.price * item.quantity), 0);
    const isOnline = !['walkin', 'dine_in'].includes(config.platform);
    const deliveryFee = isOnline ? Math.floor(Math.random() * 8000) + 8000 : 0;
    const platformFee = isOnline ? Math.floor(subtotal * 0.1) : 0;

    orders.push({
      id: `oo-prep-${idx + 1}`,
      orderNumber: `${isOnline ? 'ONL' : config.platform === 'dine_in' ? 'DIN' : 'WLK'}-${String(now).slice(-4)}${idx + 5}`,
      queueNumber: getNextQueueNumberForPlatform(config.platform),
      platform: config.platform as any,
      platformOrderId: `${config.platform.toUpperCase()}-${Date.now()}${idx + 5}`,
      customerName: config.platform === 'dine_in' ? `Meja ${Math.floor(Math.random() * 12) + 1}` : customerNames[Math.floor(Math.random() * customerNames.length)],
      customerPhone: `0857${Math.floor(Math.random() * 90000000) + 10000000}`,
      orderType: config.platform === 'dine_in' ? 'dine_in' : isOnline ? 'delivery' : 'pickup',
      tableNumber: config.platform === 'dine_in' ? String(Math.floor(Math.random() * 12) + 1) : undefined,
      items,
      subtotal,
      deliveryFee: deliveryFee || undefined,
      platformFee: platformFee || undefined,
      total: subtotal + deliveryFee + platformFee,
      status: 'preparing',
      priority: config.minutesAgo > 7 ? 'high' : 'normal',
      estimatedPrepTime: Math.floor(Math.random() * 8) + 8,
      driverInfo: isOnline ? generateDriverInfo() : undefined,
      createdAt: new Date(now - config.minutesAgo * 60000).toISOString(),
      acceptedAt: new Date(now - (config.minutesAgo - 1) * 60000).toISOString(),
      prepStartedAt: new Date(now - (config.minutesAgo - 2) * 60000).toISOString(),
      branchId: 'branch-001'
    });
  });

  // Active orders - READY (2 orders)
  const readyOrders = [
    { platform: 'shopeefood', minutesAgo: 12 },
    { platform: 'walkin', minutesAgo: 10 },
  ];

  readyOrders.forEach((config, idx) => {
    const items = generateRandomItems();
    const subtotal = items.reduce((acc, item) => acc + (item.price * item.quantity), 0);
    const isOnline = !['walkin', 'dine_in'].includes(config.platform);
    const deliveryFee = isOnline ? Math.floor(Math.random() * 8000) + 8000 : 0;
    const platformFee = isOnline ? Math.floor(subtotal * 0.1) : 0;

    orders.push({
      id: `oo-ready-${idx + 1}`,
      orderNumber: `${isOnline ? 'ONL' : 'WLK'}-${String(now).slice(-4)}${idx + 8}`,
      queueNumber: getNextQueueNumberForPlatform(config.platform),
      platform: config.platform as any,
      platformOrderId: `${config.platform.toUpperCase()}-${Date.now()}${idx + 8}`,
      customerName: customerNames[Math.floor(Math.random() * customerNames.length)],
      customerPhone: `0878${Math.floor(Math.random() * 90000000) + 10000000}`,
      orderType: isOnline ? 'delivery' : 'pickup',
      items,
      subtotal,
      deliveryFee: deliveryFee || undefined,
      platformFee: platformFee || undefined,
      total: subtotal + deliveryFee + platformFee,
      status: 'ready',
      priority: 'normal',
      estimatedPrepTime: 0,
      driverInfo: isOnline ? generateDriverInfo() : undefined,
      createdAt: new Date(now - config.minutesAgo * 60000).toISOString(),
      acceptedAt: new Date(now - (config.minutesAgo - 1) * 60000).toISOString(),
      prepStartedAt: new Date(now - (config.minutesAgo - 2) * 60000).toISOString(),
      readyAt: new Date(now - 2 * 60000).toISOString(),
      branchId: 'branch-001'
    });
  });

  // Completed orders today (for stats)
  for (let i = 0; i < 25; i++) {
    const platforms = ['gofood', 'grabfood', 'shopeefood', 'walkin', 'dine_in'];
    const platform = platforms[Math.floor(Math.random() * platforms.length)];
    const items = generateRandomItems();
    const subtotal = items.reduce((acc, item) => acc + (item.price * item.quantity), 0);
    const isOnline = !['walkin', 'dine_in'].includes(platform);
    const deliveryFee = isOnline ? Math.floor(Math.random() * 8000) + 8000 : 0;
    const platformFee = isOnline ? Math.floor(subtotal * 0.1) : 0;
    const minutesAgo = Math.floor(Math.random() * 480) + 30; // 30 mins to 8 hours ago

    orders.push({
      id: `oo-comp-${i + 1}`,
      orderNumber: `${isOnline ? 'ONL' : platform === 'dine_in' ? 'DIN' : 'WLK'}-${String(now - minutesAgo * 60000).slice(-6)}`,
      queueNumber: 50 + i,
      platform: platform as any,
      platformOrderId: `${platform.toUpperCase()}-HIST-${i}`,
      customerName: platform === 'dine_in' ? `Meja ${Math.floor(Math.random() * 12) + 1}` : customerNames[Math.floor(Math.random() * customerNames.length)],
      customerPhone: `081${Math.floor(Math.random() * 900000000) + 100000000}`,
      orderType: platform === 'dine_in' ? 'dine_in' : isOnline ? 'delivery' : 'pickup',
      tableNumber: platform === 'dine_in' ? String(Math.floor(Math.random() * 12) + 1) : undefined,
      items,
      subtotal,
      deliveryFee: deliveryFee || undefined,
      platformFee: platformFee || undefined,
      total: subtotal + deliveryFee + platformFee,
      status: 'completed',
      priority: 'normal',
      estimatedPrepTime: 0,
      driverInfo: isOnline ? generateDriverInfo() : undefined,
      createdAt: new Date(now - minutesAgo * 60000).toISOString(),
      acceptedAt: new Date(now - (minutesAgo - 2) * 60000).toISOString(),
      prepStartedAt: new Date(now - (minutesAgo - 5) * 60000).toISOString(),
      readyAt: new Date(now - (minutesAgo - 15) * 60000).toISOString(),
      completedAt: new Date(now - (minutesAgo - 20) * 60000).toISOString(),
      branchId: 'branch-001'
    });
  }

  return orders;
}

// Initialize with generated mock data
let mockOnlineOrders: OnlineOrder[] = generateMockOrders();

// Queue number management
let currentQueueNumber = 19;
const queueCounters: Record<string, number> = {
  online: 100,  // Online orders start from 100
  walkin: 200,  // Walk-in orders start from 200
  dine_in: 300  // Dine-in orders start from 300
};

function getNextQueueNumber(orderType: string): number {
  const prefix = orderType === 'delivery' || orderType === 'pickup' ? 'online' : orderType;
  queueCounters[prefix] = (queueCounters[prefix] || 0) + 1;
  return queueCounters[prefix];
}

// Priority calculation based on order type and timing
function calculatePriority(order: Partial<OnlineOrder>): 'normal' | 'high' | 'urgent' {
  const now = new Date();
  const orderTime = new Date(order.createdAt || now);
  const waitingMinutes = (now.getTime() - orderTime.getTime()) / 60000;

  // Online delivery orders have higher priority due to driver waiting
  if (order.platform !== 'walkin' && order.platform !== 'dine_in') {
    if (waitingMinutes > 10) return 'urgent';
    if (waitingMinutes > 5) return 'high';
  }

  // Dine-in orders
  if (order.platform === 'dine_in') {
    if (waitingMinutes > 15) return 'urgent';
    if (waitingMinutes > 8) return 'high';
  }

  return 'normal';
}

// Estimated prep time based on items and current kitchen load
function calculateEstimatedPrepTime(items: OnlineOrder['items'], currentLoad: number): number {
  const baseTime = 10; // Base prep time in minutes
  const itemTime = items.reduce((acc, item) => acc + (item.quantity * 2), 0);
  const loadFactor = 1 + (currentLoad * 0.1); // Add 10% per active order
  return Math.ceil((baseTime + itemTime) * loadFactor);
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { method } = req;

  switch (method) {
    case 'GET': {
      const { status, platform, limit = 20, includeCompleted = 'false' } = req.query;

      let orders = [...mockOnlineOrders];

      // Filter by status
      if (status && status !== 'all') {
        const statuses = (status as string).split(',');
        orders = orders.filter(o => statuses.includes(o.status));
      } else if (includeCompleted === 'false') {
        orders = orders.filter(o => !['completed', 'cancelled'].includes(o.status));
      }

      // Filter by platform
      if (platform && platform !== 'all') {
        orders = orders.filter(o => o.platform === platform);
      }

      // Update priorities based on waiting time
      orders = orders.map(o => ({
        ...o,
        priority: calculatePriority(o)
      }));

      // Sort by priority and time
      const priorityOrder = { urgent: 0, high: 1, normal: 2 };
      orders.sort((a, b) => {
        if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
          return priorityOrder[a.priority] - priorityOrder[b.priority];
        }
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      });

      // Limit results
      orders = orders.slice(0, parseInt(limit as string));

      // Calculate stats
      const stats = {
        total: mockOnlineOrders.length,
        new: mockOnlineOrders.filter(o => o.status === 'new').length,
        accepted: mockOnlineOrders.filter(o => o.status === 'accepted').length,
        preparing: mockOnlineOrders.filter(o => o.status === 'preparing').length,
        ready: mockOnlineOrders.filter(o => o.status === 'ready').length,
        completed: mockOnlineOrders.filter(o => o.status === 'completed').length,
        online: mockOnlineOrders.filter(o => !['walkin', 'dine_in'].includes(o.platform)).length,
        offline: mockOnlineOrders.filter(o => ['walkin', 'dine_in'].includes(o.platform)).length,
        byPlatform: {
          gofood: mockOnlineOrders.filter(o => o.platform === 'gofood').length,
          grabfood: mockOnlineOrders.filter(o => o.platform === 'grabfood').length,
          shopeefood: mockOnlineOrders.filter(o => o.platform === 'shopeefood').length,
          walkin: mockOnlineOrders.filter(o => o.platform === 'walkin').length,
          dine_in: mockOnlineOrders.filter(o => o.platform === 'dine_in').length
        },
        currentQueueNumber: currentQueueNumber,
        avgPrepTime: orders.length > 0 
          ? Math.round(orders.reduce((acc, o) => acc + o.estimatedPrepTime, 0) / orders.length)
          : 0
      };

      return res.status(200).json({
        success: true,
        data: orders,
        stats,
        queueCounters
      });
    }

    case 'POST': {
      // Create new order (simulating incoming order from platform)
      const orderData = req.body;

      const activeOrders = mockOnlineOrders.filter(o => 
        !['completed', 'cancelled'].includes(o.status)
      ).length;

      const newOrder: OnlineOrder = {
        id: `oo-${Date.now()}`,
        orderNumber: `${orderData.platform === 'walkin' ? 'WLK' : orderData.platform === 'dine_in' ? 'DIN' : 'ONL'}-${String(Date.now()).slice(-3)}`,
        queueNumber: getNextQueueNumber(orderData.orderType || 'online'),
        platform: orderData.platform || 'gofood',
        platformOrderId: orderData.platformOrderId || `PL-${Date.now()}`,
        customerName: orderData.customerName || 'Customer',
        customerPhone: orderData.customerPhone,
        orderType: orderData.orderType || 'delivery',
        items: orderData.items || [],
        subtotal: orderData.subtotal || 0,
        deliveryFee: orderData.deliveryFee,
        platformFee: orderData.platformFee,
        discount: orderData.discount,
        total: orderData.total || 0,
        status: 'new',
        priority: 'normal',
        estimatedPrepTime: calculateEstimatedPrepTime(orderData.items || [], activeOrders),
        estimatedPickupTime: orderData.estimatedPickupTime,
        driverInfo: orderData.driverInfo,
        notes: orderData.notes,
        tableNumber: orderData.tableNumber,
        createdAt: new Date().toISOString(),
        branchId: orderData.branchId || 'branch-001'
      };

      mockOnlineOrders.unshift(newOrder);
      currentQueueNumber = newOrder.queueNumber;

      return res.status(201).json({
        success: true,
        data: newOrder,
        message: 'Order created successfully'
      });
    }

    case 'PUT': {
      // Update order status
      const { id } = req.query;
      const { status, action } = req.body;

      const orderIndex = mockOnlineOrders.findIndex(o => o.id === id);
      if (orderIndex === -1) {
        return res.status(404).json({ success: false, message: 'Order not found' });
      }

      const order = mockOnlineOrders[orderIndex];
      const now = new Date().toISOString();

      // Handle different actions
      switch (action) {
        case 'accept':
          order.status = 'accepted';
          order.acceptedAt = now;
          break;
        case 'start_prep':
          order.status = 'preparing';
          order.prepStartedAt = now;
          break;
        case 'ready':
          order.status = 'ready';
          order.readyAt = now;
          break;
        case 'complete':
          order.status = 'completed';
          order.completedAt = now;
          break;
        case 'cancel':
          order.status = 'cancelled';
          break;
        default:
          if (status) {
            order.status = status;
          }
      }

      // Recalculate priority
      order.priority = calculatePriority(order);

      mockOnlineOrders[orderIndex] = order;

      return res.status(200).json({
        success: true,
        data: order,
        message: `Order ${action || 'updated'} successfully`
      });
    }

    default:
      res.setHeader('Allow', ['GET', 'POST', 'PUT']);
      return res.status(405).json({ success: false, message: `Method ${method} Not Allowed` });
  }
}
