import type { NextApiRequest, NextApiResponse } from 'next';

/**
 * Platform-specific Food Delivery API
 * Handles GoFood, GrabFood, ShopeeFood specific operations
 */

interface PlatformOrder {
  id: string;
  platformOrderId: string;
  platform: string;
  branchId: string;
  branchName: string;
  customerName: string;
  customerPhone: string;
  deliveryAddress: string;
  items: OrderItem[];
  subtotal: number;
  deliveryFee: number;
  platformFee: number;
  discount: number;
  total: number;
  paymentMethod: string;
  paymentStatus: 'paid' | 'pending' | 'refunded';
  orderStatus: 'new' | 'accepted' | 'preparing' | 'ready' | 'picked_up' | 'delivered' | 'cancelled';
  driverInfo?: {
    name: string;
    phone: string;
    vehicleNumber: string;
    photo?: string;
  };
  createdAt: string;
  acceptedAt?: string;
  preparedAt?: string;
  pickedUpAt?: string;
  deliveredAt?: string;
}

interface OrderItem {
  id: string;
  name: string;
  quantity: number;
  price: number;
  notes?: string;
  modifiers?: { name: string; price: number }[];
}

interface PlatformConfig {
  id: string;
  name: string;
  apiKey: string;
  secretKey: string;
  merchantId: string;
  environment: 'sandbox' | 'production';
  webhookSecret: string;
  autoAcceptEnabled: boolean;
  autoAcceptDelay: number;
  menuSyncEnabled: boolean;
  lastMenuSync: string;
  operationalHours: { day: number; open: string; close: string; isOpen: boolean }[];
  apiVersion: string;
}

// Platform configurations
const platformConfigs: Record<string, PlatformConfig> = {
  gofood: {
    id: 'gofood',
    name: 'GoFood',
    apiKey: 'gf_live_***masked***',
    secretKey: '***masked***',
    merchantId: 'GFOOD-MERCHANT-001',
    environment: 'production',
    webhookSecret: 'whsec_gofood_***',
    autoAcceptEnabled: true,
    autoAcceptDelay: 30,
    menuSyncEnabled: true,
    lastMenuSync: new Date().toISOString(),
    apiVersion: 'v3',
    operationalHours: [
      { day: 0, open: '10:00', close: '22:00', isOpen: true },
      { day: 1, open: '08:00', close: '22:00', isOpen: true },
      { day: 2, open: '08:00', close: '22:00', isOpen: true },
      { day: 3, open: '08:00', close: '22:00', isOpen: true },
      { day: 4, open: '08:00', close: '22:00', isOpen: true },
      { day: 5, open: '08:00', close: '23:00', isOpen: true },
      { day: 6, open: '09:00', close: '23:00', isOpen: true }
    ]
  },
  grabfood: {
    id: 'grabfood',
    name: 'GrabFood',
    apiKey: 'grab_live_***masked***',
    secretKey: '***masked***',
    merchantId: 'GRAB-MERCHANT-001',
    environment: 'production',
    webhookSecret: 'whsec_grab_***',
    autoAcceptEnabled: true,
    autoAcceptDelay: 45,
    menuSyncEnabled: true,
    lastMenuSync: new Date().toISOString(),
    apiVersion: 'v2',
    operationalHours: [
      { day: 0, open: '10:00', close: '22:00', isOpen: true },
      { day: 1, open: '08:00', close: '22:00', isOpen: true },
      { day: 2, open: '08:00', close: '22:00', isOpen: true },
      { day: 3, open: '08:00', close: '22:00', isOpen: true },
      { day: 4, open: '08:00', close: '22:00', isOpen: true },
      { day: 5, open: '08:00', close: '23:00', isOpen: true },
      { day: 6, open: '09:00', close: '23:00', isOpen: true }
    ]
  },
  shopeefood: {
    id: 'shopeefood',
    name: 'ShopeeFood',
    apiKey: 'sf_live_***masked***',
    secretKey: '***masked***',
    merchantId: 'SFOOD-MERCHANT-001',
    environment: 'production',
    webhookSecret: 'whsec_shopee_***',
    autoAcceptEnabled: true,
    autoAcceptDelay: 60,
    menuSyncEnabled: true,
    lastMenuSync: new Date().toISOString(),
    apiVersion: 'v1',
    operationalHours: [
      { day: 0, open: '10:00', close: '21:00', isOpen: true },
      { day: 1, open: '09:00', close: '21:00', isOpen: true },
      { day: 2, open: '09:00', close: '21:00', isOpen: true },
      { day: 3, open: '09:00', close: '21:00', isOpen: true },
      { day: 4, open: '09:00', close: '21:00', isOpen: true },
      { day: 5, open: '09:00', close: '22:00', isOpen: true },
      { day: 6, open: '10:00', close: '22:00', isOpen: true }
    ]
  }
};

// Generate mock orders
function generateMockOrders(platform: string, count: number = 20): PlatformOrder[] {
  const statuses: PlatformOrder['orderStatus'][] = ['new', 'accepted', 'preparing', 'ready', 'picked_up', 'delivered'];
  const paymentMethods = platform === 'gofood' ? ['GoPay', 'Cash', 'LinkAja'] 
    : platform === 'grabfood' ? ['GrabPay', 'OVO', 'Cash'] 
    : ['ShopeePay', 'Cash', 'QRIS'];
  
  const menuItems = [
    { name: 'Nasi Goreng Spesial', price: 35000 },
    { name: 'Mie Ayam Bakso', price: 28000 },
    { name: 'Ayam Geprek', price: 25000 },
    { name: 'Sate Ayam 10 Tusuk', price: 30000 },
    { name: 'Es Teh Manis', price: 8000 },
    { name: 'Es Jeruk', price: 10000 },
    { name: 'Nasi Putih', price: 5000 }
  ];

  const branches = [
    { id: '1', name: 'Cabang Pusat Jakarta' },
    { id: '2', name: 'Cabang Bandung' },
    { id: '3', name: 'Cabang Surabaya' }
  ];

  const drivers = [
    { name: 'Budi Setiawan', phone: '081234567890', vehicleNumber: 'B 1234 ABC' },
    { name: 'Agus Pratama', phone: '081234567891', vehicleNumber: 'B 5678 DEF' },
    { name: 'Rudi Hartono', phone: '081234567892', vehicleNumber: 'B 9012 GHI' }
  ];

  return Array.from({ length: count }, (_, i) => {
    const status = statuses[Math.floor(Math.random() * statuses.length)];
    const branch = branches[Math.floor(Math.random() * branches.length)];
    const itemCount = Math.floor(Math.random() * 4) + 1;
    const items: OrderItem[] = [];
    let subtotal = 0;

    for (let j = 0; j < itemCount; j++) {
      const item = menuItems[Math.floor(Math.random() * menuItems.length)];
      const qty = Math.floor(Math.random() * 3) + 1;
      subtotal += item.price * qty;
      items.push({
        id: `item-${i}-${j}`,
        name: item.name,
        quantity: qty,
        price: item.price
      });
    }

    const deliveryFee = Math.floor(Math.random() * 10000) + 5000;
    const platformFee = Math.floor(subtotal * 0.2);
    const discount = Math.random() > 0.7 ? Math.floor(Math.random() * 15000) : 0;
    const total = subtotal + deliveryFee - discount;
    const paymentMethod = paymentMethods[Math.floor(Math.random() * paymentMethods.length)];
    
    const createdAt = new Date(Date.now() - Math.floor(Math.random() * 3600000 * 6));
    const hasDriver = ['picked_up', 'delivered'].includes(status) || (status === 'ready' && Math.random() > 0.5);

    return {
      id: `${platform}-order-${i + 1}`,
      platformOrderId: `${platform.toUpperCase()}-${Date.now()}-${i}`,
      platform,
      branchId: branch.id,
      branchName: branch.name,
      customerName: `Customer ${i + 1}`,
      customerPhone: `0812345678${String(i).padStart(2, '0')}`,
      deliveryAddress: `Jl. Example No. ${i + 1}, Jakarta`,
      items,
      subtotal,
      deliveryFee,
      platformFee,
      discount,
      total,
      paymentMethod,
      paymentStatus: paymentMethod !== 'Cash' ? 'paid' : (status === 'delivered' ? 'paid' : 'pending'),
      orderStatus: status,
      driverInfo: hasDriver ? drivers[Math.floor(Math.random() * drivers.length)] : undefined,
      createdAt: createdAt.toISOString(),
      acceptedAt: ['accepted', 'preparing', 'ready', 'picked_up', 'delivered'].includes(status) 
        ? new Date(createdAt.getTime() + 60000).toISOString() : undefined,
      preparedAt: ['ready', 'picked_up', 'delivered'].includes(status)
        ? new Date(createdAt.getTime() + 900000).toISOString() : undefined,
      pickedUpAt: ['picked_up', 'delivered'].includes(status)
        ? new Date(createdAt.getTime() + 1200000).toISOString() : undefined,
      deliveredAt: status === 'delivered'
        ? new Date(createdAt.getTime() + 1800000).toISOString() : undefined
    };
  });
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { platform } = req.query;
  
  if (!platform || !['gofood', 'grabfood', 'shopeefood'].includes(platform as string)) {
    return res.status(400).json({ error: 'Invalid platform' });
  }

  const platformId = platform as string;

  try {
    switch (req.method) {
      case 'GET':
        return getPlatformData(req, res, platformId);
      case 'POST':
        return handlePlatformAction(req, res, platformId);
      case 'PUT':
        return updatePlatformConfig(req, res, platformId);
      default:
        return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error: any) {
    console.error(`${platformId} API Error:`, error);
    return res.status(500).json({ error: 'Internal server error', message: error.message });
  }
}

function getPlatformData(req: NextApiRequest, res: NextApiResponse, platformId: string) {
  const { type = 'overview', branchId, status, limit = '20' } = req.query;

  const config = platformConfigs[platformId];
  if (!config) {
    return res.status(404).json({ error: 'Platform not found' });
  }

  switch (type) {
    case 'config':
      // Mask sensitive data
      return res.status(200).json({
        success: true,
        config: {
          ...config,
          apiKey: config.apiKey.replace(/(?<=.{8}).(?=.{4})/g, '*'),
          secretKey: '***masked***',
          webhookSecret: '***masked***'
        }
      });

    case 'orders':
      let orders = generateMockOrders(platformId, parseInt(limit as string));
      if (branchId) {
        orders = orders.filter(o => o.branchId === branchId);
      }
      if (status) {
        orders = orders.filter(o => o.orderStatus === status);
      }
      return res.status(200).json({
        success: true,
        orders,
        total: orders.length
      });

    case 'stats':
      const allOrders = generateMockOrders(platformId, 100);
      const todayOrders = allOrders.filter(o => {
        const orderDate = new Date(o.createdAt);
        const today = new Date();
        return orderDate.toDateString() === today.toDateString();
      });

      return res.status(200).json({
        success: true,
        stats: {
          totalOrders: allOrders.length,
          todayOrders: todayOrders.length,
          todayRevenue: todayOrders.reduce((sum, o) => sum + o.total, 0),
          avgOrderValue: Math.round(allOrders.reduce((sum, o) => sum + o.total, 0) / allOrders.length),
          completionRate: 95 + Math.random() * 4,
          avgPrepTime: 12 + Math.floor(Math.random() * 5),
          byStatus: {
            new: allOrders.filter(o => o.orderStatus === 'new').length,
            accepted: allOrders.filter(o => o.orderStatus === 'accepted').length,
            preparing: allOrders.filter(o => o.orderStatus === 'preparing').length,
            ready: allOrders.filter(o => o.orderStatus === 'ready').length,
            picked_up: allOrders.filter(o => o.orderStatus === 'picked_up').length,
            delivered: allOrders.filter(o => o.orderStatus === 'delivered').length,
            cancelled: allOrders.filter(o => o.orderStatus === 'cancelled').length
          }
        }
      });

    case 'overview':
    default:
      return res.status(200).json({
        success: true,
        platform: {
          id: platformId,
          name: config.name,
          status: 'active',
          environment: config.environment,
          autoAcceptEnabled: config.autoAcceptEnabled,
          menuSyncEnabled: config.menuSyncEnabled,
          lastMenuSync: config.lastMenuSync,
          operationalHours: config.operationalHours
        }
      });
  }
}

function handlePlatformAction(req: NextApiRequest, res: NextApiResponse, platformId: string) {
  const { action, orderId, data } = req.body;

  switch (action) {
    case 'accept_order':
      return res.status(200).json({
        success: true,
        message: `Order ${orderId} accepted`,
        estimatedPrepTime: 15
      });

    case 'reject_order':
      return res.status(200).json({
        success: true,
        message: `Order ${orderId} rejected`,
        reason: data?.reason || 'Item unavailable'
      });

    case 'mark_ready':
      return res.status(200).json({
        success: true,
        message: `Order ${orderId} marked as ready for pickup`
      });

    case 'sync_menu':
      return res.status(200).json({
        success: true,
        message: 'Menu sync initiated',
        syncId: `SYNC-${platformId}-${Date.now()}`,
        estimatedTime: '2-3 minutes'
      });

    case 'test_connection':
      return res.status(200).json({
        success: true,
        message: 'Connection test successful',
        latency: Math.floor(Math.random() * 200) + 100,
        apiVersion: platformConfigs[platformId]?.apiVersion || 'v1'
      });

    default:
      return res.status(400).json({ error: 'Invalid action' });
  }
}

function updatePlatformConfig(req: NextApiRequest, res: NextApiResponse, platformId: string) {
  const { autoAcceptEnabled, autoAcceptDelay, menuSyncEnabled, operationalHours, credentials } = req.body;

  const config = platformConfigs[platformId];
  if (!config) {
    return res.status(404).json({ error: 'Platform not found' });
  }

  // Update config (in production, save to database)
  if (autoAcceptEnabled !== undefined) config.autoAcceptEnabled = autoAcceptEnabled;
  if (autoAcceptDelay !== undefined) config.autoAcceptDelay = autoAcceptDelay;
  if (menuSyncEnabled !== undefined) config.menuSyncEnabled = menuSyncEnabled;
  if (operationalHours) config.operationalHours = operationalHours;

  return res.status(200).json({
    success: true,
    message: 'Platform configuration updated',
    config: {
      ...config,
      apiKey: '***masked***',
      secretKey: '***masked***',
      webhookSecret: '***masked***'
    }
  });
}
