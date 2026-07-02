import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';

/**
 * Unified Order Management API
 * Handles all order types: online (GoFood, GrabFood, ShopeeFood), walk-in, dine-in
 * Syncs with kitchen orders automatically
 */

// Order status flow
const ORDER_STATUS_FLOW = {
  online: ['new', 'accepted', 'preparing', 'ready', 'picked_up', 'completed', 'cancelled'],
  walkin: ['new', 'accepted', 'preparing', 'ready', 'completed', 'cancelled'],
  dine_in: ['new', 'accepted', 'preparing', 'ready', 'served', 'completed', 'cancelled']
};

// Platform configurations
const PLATFORM_CONFIG = {
  gofood: {
    id: 'gofood',
    name: 'GoFood',
    color: '#00AA13',
    feePercent: 20,
    paymentMethods: ['GoPay', 'GoPay Later', 'Cash'],
    webhookSecret: process.env.GOFOOD_WEBHOOK_SECRET,
    apiKey: process.env.GOFOOD_API_KEY
  },
  grabfood: {
    id: 'grabfood',
    name: 'GrabFood',
    color: '#00B14F',
    feePercent: 25,
    paymentMethods: ['OVO', 'GrabPay', 'Cash', 'LinkAja'],
    webhookSecret: process.env.GRABFOOD_WEBHOOK_SECRET,
    apiKey: process.env.GRABFOOD_API_KEY
  },
  shopeefood: {
    id: 'shopeefood',
    name: 'ShopeeFood',
    color: '#EE4D2D',
    feePercent: 20,
    paymentMethods: ['ShopeePay', 'SPayLater', 'Cash'],
    webhookSecret: process.env.SHOPEEFOOD_WEBHOOK_SECRET,
    apiKey: process.env.SHOPEEFOOD_API_KEY
  },
  tokopedia: {
    id: 'tokopedia',
    name: 'Tokopedia',
    color: '#42B549',
    feePercent: 5,
    paymentMethods: ['GoPay', 'OVO', 'Bank Transfer', 'Credit Card'],
    webhookSecret: process.env.TOKOPEDIA_WEBHOOK_SECRET,
    apiKey: process.env.TOKOPEDIA_API_KEY
  },
  shopee: {
    id: 'shopee',
    name: 'Shopee',
    color: '#EE4D2D',
    feePercent: 5,
    paymentMethods: ['ShopeePay', 'Bank Transfer', 'COD'],
    webhookSecret: process.env.SHOPEE_WEBHOOK_SECRET,
    apiKey: process.env.SHOPEE_API_KEY
  }
};

// In-memory storage (replace with database in production)
interface UnifiedOrder {
  id: string;
  tenantId: string;
  branchId: string;
  
  // Order identification
  orderNumber: string;
  queueNumber: number;
  
  // Source info
  source: 'online' | 'pos' | 'kiosk';
  platform: string;
  platformOrderId: string;
  
  // Order type
  orderType: 'delivery' | 'pickup' | 'dine_in';
  tableNumber?: string;
  
  // Customer info
  customer: {
    id?: string;
    name: string;
    phone?: string;
    email?: string;
    address?: string;
    notes?: string;
  };
  
  // Items
  items: Array<{
    id: string;
    productId: string;
    name: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
    notes?: string;
    modifiers?: Array<{
      id: string;
      name: string;
      price: number;
    }>;
  }>;
  
  // Pricing
  subtotal: number;
  discount: number;
  deliveryFee: number;
  platformFee: number;
  tax: number;
  total: number;
  
  // Payment
  payment: {
    method: string;
    status: 'pending' | 'paid' | 'failed' | 'refunded';
    paidAt?: string;
    transactionId?: string;
  };
  
  // Delivery info (for delivery orders)
  delivery?: {
    driver?: {
      id: string;
      name: string;
      phone: string;
      vehicle: string;
      plateNumber: string;
      photo?: string;
      rating: number;
    };
    distance: string;
    estimatedArrival: string;
    actualArrival?: string;
    trackingUrl?: string;
  };
  
  // Status
  status: string;
  priority: 'normal' | 'high' | 'urgent';
  
  // Kitchen integration
  kitchenOrderId?: string;
  kitchenStatus?: string;
  estimatedPrepTime: number;
  actualPrepTime?: number;
  
  // Timestamps
  createdAt: string;
  acceptedAt?: string;
  prepStartedAt?: string;
  readyAt?: string;
  pickedUpAt?: string;
  completedAt?: string;
  cancelledAt?: string;
  
  // Notes
  notes?: string;
  cancellationReason?: string;
}

// Mock data storage
let unifiedOrders: UnifiedOrder[] = [];
let queueCounters = {
  online: 100,
  walkin: 200,
  dine_in: 300
};

// Initialize with mock data
function initializeMockData() {
  if (unifiedOrders.length > 0) return;
  
  const now = Date.now();
  const platforms = ['gofood', 'grabfood', 'shopeefood', 'walkin', 'dine_in'];
  const statuses = ['new', 'accepted', 'preparing', 'ready'];
  const customerNames = [
    'Budi Santoso', 'Siti Rahayu', 'Ahmad Hidayat', 'Dewi Lestari', 
    'Rizky Pratama', 'Nur Aini', 'Eko Prasetyo', 'Sri Wahyuni'
  ];
  const menuItems = [
    { id: 'p1', name: 'Nasi Goreng Spesial', price: 35000 },
    { id: 'p2', name: 'Ayam Bakar Madu', price: 45000 },
    { id: 'p3', name: 'Mie Goreng Jawa', price: 30000 },
    { id: 'p4', name: 'Sate Ayam 10 Tusuk', price: 35000 },
    { id: 'p5', name: 'Es Teh Manis', price: 8000 },
    { id: 'p6', name: 'Kopi Susu', price: 18000 },
  ];
  const driverNames = ['Pak Joko', 'Mas Dedi', 'Bang Roni', 'Kang Asep', 'Mas Adi'];
  
  // Generate 15 orders
  for (let i = 0; i < 15; i++) {
    const platform = platforms[Math.floor(Math.random() * platforms.length)];
    const status = statuses[Math.floor(Math.random() * statuses.length)];
    const isOnline = !['walkin', 'dine_in'].includes(platform);
    const isDelivery = isOnline;
    const minutesAgo = Math.floor(Math.random() * 30) + 1;
    
    // Generate items
    const itemCount = Math.floor(Math.random() * 3) + 1;
    const items: UnifiedOrder['items'] = [];
    for (let j = 0; j < itemCount; j++) {
      const item = menuItems[Math.floor(Math.random() * menuItems.length)];
      const qty = Math.floor(Math.random() * 2) + 1;
      items.push({
        id: `item-${i}-${j}`,
        productId: item.id,
        name: item.name,
        quantity: qty,
        unitPrice: item.price,
        totalPrice: item.price * qty,
        notes: Math.random() > 0.7 ? 'Pedas' : undefined
      });
    }
    
    const subtotal = items.reduce((acc, item) => acc + item.totalPrice, 0);
    const deliveryFee = isDelivery ? Math.floor(Math.random() * 8000) + 8000 : 0;
    const platformFee = isOnline ? Math.floor(subtotal * (PLATFORM_CONFIG[platform as keyof typeof PLATFORM_CONFIG]?.feePercent || 20) / 100) : 0;
    const discount = Math.random() > 0.7 ? Math.floor(Math.random() * 15000) + 5000 : 0;
    const isPaid = Math.random() > 0.2;
    
    const queueType = platform === 'dine_in' ? 'dine_in' : platform === 'walkin' ? 'walkin' : 'online';
    const queueNumber = ++queueCounters[queueType];
    
    const order: UnifiedOrder = {
      id: `order-${now}-${i}`,
      tenantId: 'tenant-001',
      branchId: 'branch-001',
      orderNumber: `ORD-${String(now).slice(-4)}${i}`,
      queueNumber,
      source: isOnline ? 'online' : 'pos',
      platform,
      platformOrderId: isOnline ? `${platform.toUpperCase()}-${now}-${i}` : `POS-${now}-${i}`,
      orderType: isDelivery ? 'delivery' : platform === 'dine_in' ? 'dine_in' : 'pickup',
      tableNumber: platform === 'dine_in' ? String(Math.floor(Math.random() * 12) + 1) : undefined,
      customer: {
        name: platform === 'dine_in' ? `Meja ${Math.floor(Math.random() * 12) + 1}` : customerNames[Math.floor(Math.random() * customerNames.length)],
        phone: `0812${Math.floor(Math.random() * 90000000) + 10000000}`,
        address: isDelivery ? `Jl. ${['Sudirman', 'Thamrin', 'Gatot Subroto'][Math.floor(Math.random() * 3)]} No. ${Math.floor(Math.random() * 100) + 1}` : undefined,
        notes: Math.random() > 0.6 ? 'Depan minimarket' : undefined
      },
      items,
      subtotal,
      discount,
      deliveryFee,
      platformFee,
      tax: 0,
      total: subtotal + deliveryFee - discount,
      payment: {
        method: isOnline 
          ? PLATFORM_CONFIG[platform as keyof typeof PLATFORM_CONFIG]?.paymentMethods[Math.floor(Math.random() * 3)] || 'GoPay'
          : ['Cash', 'QRIS', 'Debit Card'][Math.floor(Math.random() * 3)],
        status: isPaid ? 'paid' : 'pending',
        paidAt: isPaid ? new Date(now - (minutesAgo - 1) * 60000).toISOString() : undefined,
        transactionId: isPaid ? `TXN-${now}-${i}` : undefined
      },
      delivery: isDelivery ? {
        driver: {
          id: `driver-${i}`,
          name: driverNames[Math.floor(Math.random() * driverNames.length)],
          phone: `0813${Math.floor(Math.random() * 90000000) + 10000000}`,
          vehicle: 'Motor',
          plateNumber: `B ${Math.floor(Math.random() * 9000) + 1000} ${['ABC', 'XYZ', 'JKL'][Math.floor(Math.random() * 3)]}`,
          rating: parseFloat((4 + Math.random()).toFixed(1))
        },
        distance: `${(Math.random() * 5 + 1).toFixed(1)} km`,
        estimatedArrival: new Date(now + (Math.floor(Math.random() * 20) + 15) * 60000).toISOString()
      } : undefined,
      status,
      priority: minutesAgo > 15 ? 'urgent' : minutesAgo > 8 ? 'high' : 'normal',
      estimatedPrepTime: Math.floor(Math.random() * 10) + 10,
      createdAt: new Date(now - minutesAgo * 60000).toISOString(),
      acceptedAt: ['accepted', 'preparing', 'ready'].includes(status) ? new Date(now - (minutesAgo - 1) * 60000).toISOString() : undefined,
      prepStartedAt: ['preparing', 'ready'].includes(status) ? new Date(now - (minutesAgo - 2) * 60000).toISOString() : undefined,
      readyAt: status === 'ready' ? new Date(now - 2 * 60000).toISOString() : undefined
    };
    
    unifiedOrders.push(order);
  }
}

// Calculate priority based on order age and type
function calculatePriority(order: UnifiedOrder): 'normal' | 'high' | 'urgent' {
  const waitingMinutes = (Date.now() - new Date(order.createdAt).getTime()) / 60000;
  
  if (order.orderType === 'delivery') {
    // Online delivery - driver waiting
    if (waitingMinutes > 12) return 'urgent';
    if (waitingMinutes > 6) return 'high';
  } else if (order.orderType === 'dine_in') {
    // Dine-in - customer waiting at table
    if (waitingMinutes > 15) return 'urgent';
    if (waitingMinutes > 8) return 'high';
  } else {
    // Walk-in / pickup
    if (waitingMinutes > 20) return 'urgent';
    if (waitingMinutes > 10) return 'high';
  }
  
  return 'normal';
}

// Sync order to kitchen
async function syncToKitchen(order: UnifiedOrder): Promise<string> {
  // In production, this would create/update a kitchen order
  const kitchenOrderId = `kitchen-${order.id}`;
  order.kitchenOrderId = kitchenOrderId;
  return kitchenOrderId;
}

// Notify platform of status change
async function notifyPlatform(order: UnifiedOrder, newStatus: string): Promise<boolean> {
  const platform = PLATFORM_CONFIG[order.platform as keyof typeof PLATFORM_CONFIG];
  if (!platform || !platform.apiKey) return false;
  
  // In production, this would call the platform's API
  console.log(`[${platform.name}] Notifying status change: ${order.platformOrderId} -> ${newStatus}`);
  return true;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const session = await getServerSession(req, res, authOptions);
    if (!session?.user) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    // Initialize mock data
    initializeMockData();

    const tenantId = session.user.tenantId || 'tenant-001';

    // GET - Fetch orders
    if (req.method === 'GET') {
      const { 
        status, 
        platform, 
        orderType, 
        source,
        paymentStatus,
        search, 
        startDate,
        endDate,
        limit = '50', 
        offset = '0',
        sortBy = 'createdAt',
        sortOrder = 'desc'
      } = req.query;

      let filtered = unifiedOrders.filter(o => o.tenantId === tenantId);

      // Apply filters
      if (status && status !== 'all') {
        const statuses = (status as string).split(',');
        filtered = filtered.filter(o => statuses.includes(o.status));
      }
      
      if (platform && platform !== 'all') {
        filtered = filtered.filter(o => o.platform === platform);
      }
      
      if (orderType && orderType !== 'all') {
        filtered = filtered.filter(o => o.orderType === orderType);
      }
      
      if (source && source !== 'all') {
        filtered = filtered.filter(o => o.source === source);
      }
      
      if (paymentStatus && paymentStatus !== 'all') {
        filtered = filtered.filter(o => o.payment.status === paymentStatus);
      }
      
      if (search) {
        const searchLower = (search as string).toLowerCase();
        filtered = filtered.filter(o => 
          o.orderNumber.toLowerCase().includes(searchLower) ||
          o.customer.name.toLowerCase().includes(searchLower) ||
          o.platformOrderId.toLowerCase().includes(searchLower)
        );
      }
      
      if (startDate) {
        filtered = filtered.filter(o => new Date(o.createdAt) >= new Date(startDate as string));
      }
      
      if (endDate) {
        filtered = filtered.filter(o => new Date(o.createdAt) <= new Date(endDate as string));
      }

      // Update priorities
      filtered = filtered.map(o => ({ ...o, priority: calculatePriority(o) }));

      // Sort
      filtered.sort((a, b) => {
        const aVal = a[sortBy as keyof UnifiedOrder];
        const bVal = b[sortBy as keyof UnifiedOrder];
        if (sortOrder === 'desc') {
          return aVal < bVal ? 1 : -1;
        }
        return aVal > bVal ? 1 : -1;
      });

      // Paginate
      const total = filtered.length;
      const data = filtered.slice(parseInt(offset as string), parseInt(offset as string) + parseInt(limit as string));

      // Calculate stats
      const stats = {
        total: filtered.length,
        byStatus: {
          new: filtered.filter(o => o.status === 'new').length,
          accepted: filtered.filter(o => o.status === 'accepted').length,
          preparing: filtered.filter(o => o.status === 'preparing').length,
          ready: filtered.filter(o => o.status === 'ready').length,
          completed: filtered.filter(o => o.status === 'completed').length
        },
        byPlatform: {
          gofood: filtered.filter(o => o.platform === 'gofood').length,
          grabfood: filtered.filter(o => o.platform === 'grabfood').length,
          shopeefood: filtered.filter(o => o.platform === 'shopeefood').length,
          walkin: filtered.filter(o => o.platform === 'walkin').length,
          dine_in: filtered.filter(o => o.platform === 'dine_in').length
        },
        byPayment: {
          paid: filtered.filter(o => o.payment.status === 'paid').length,
          pending: filtered.filter(o => o.payment.status === 'pending').length
        },
        revenue: {
          total: filtered.reduce((acc, o) => acc + o.total, 0),
          platformFees: filtered.reduce((acc, o) => acc + o.platformFee, 0),
          deliveryFees: filtered.reduce((acc, o) => acc + o.deliveryFee, 0)
        },
        avgPrepTime: Math.round(
          filtered.filter(o => o.actualPrepTime).reduce((acc, o) => acc + (o.actualPrepTime || 0), 0) / 
          (filtered.filter(o => o.actualPrepTime).length || 1)
        )
      };

      return res.status(200).json({
        success: true,
        data,
        stats,
        pagination: {
          total,
          limit: parseInt(limit as string),
          offset: parseInt(offset as string),
          hasMore: parseInt(offset as string) + data.length < total
        }
      });
    }

    // POST - Create new order
    if (req.method === 'POST') {
      const orderData = req.body;
      
      const queueType = orderData.platform === 'dine_in' ? 'dine_in' : 
                       orderData.platform === 'walkin' ? 'walkin' : 'online';
      const queueNumber = ++queueCounters[queueType];
      
      const newOrder: UnifiedOrder = {
        id: `order-${Date.now()}`,
        tenantId,
        branchId: orderData.branchId || 'branch-001',
        orderNumber: `ORD-${Date.now().toString().slice(-6)}`,
        queueNumber,
        source: orderData.source || 'pos',
        platform: orderData.platform || 'walkin',
        platformOrderId: orderData.platformOrderId || `POS-${Date.now()}`,
        orderType: orderData.orderType || 'pickup',
        tableNumber: orderData.tableNumber,
        customer: orderData.customer || { name: 'Guest' },
        items: orderData.items || [],
        subtotal: orderData.subtotal || 0,
        discount: orderData.discount || 0,
        deliveryFee: orderData.deliveryFee || 0,
        platformFee: orderData.platformFee || 0,
        tax: orderData.tax || 0,
        total: orderData.total || 0,
        payment: orderData.payment || { method: 'Cash', status: 'pending' },
        delivery: orderData.delivery,
        status: 'new',
        priority: 'normal',
        estimatedPrepTime: orderData.estimatedPrepTime || 15,
        createdAt: new Date().toISOString()
      };
      
      // Sync to kitchen
      await syncToKitchen(newOrder);
      
      unifiedOrders.push(newOrder);
      
      return res.status(201).json({
        success: true,
        data: newOrder,
        message: 'Order created successfully'
      });
    }

    // PUT - Update order status
    if (req.method === 'PUT') {
      const { id } = req.query;
      const { action, ...updateData } = req.body;
      
      const orderIndex = unifiedOrders.findIndex(o => o.id === id);
      if (orderIndex === -1) {
        return res.status(404).json({ success: false, error: 'Order not found' });
      }
      
      const order = unifiedOrders[orderIndex];
      const now = new Date().toISOString();
      
      // Handle status actions
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
          if (order.prepStartedAt) {
            order.actualPrepTime = Math.round((Date.now() - new Date(order.prepStartedAt).getTime()) / 60000);
          }
          break;
        case 'pickup':
          order.status = 'picked_up';
          order.pickedUpAt = now;
          break;
        case 'complete':
          order.status = 'completed';
          order.completedAt = now;
          break;
        case 'cancel':
          order.status = 'cancelled';
          order.cancelledAt = now;
          order.cancellationReason = updateData.reason;
          break;
        case 'update_payment':
          order.payment = { ...order.payment, ...updateData.payment };
          break;
        default:
          // Direct update
          Object.assign(order, updateData);
      }
      
      // Update priority
      order.priority = calculatePriority(order);
      
      // Notify platform
      if (['gofood', 'grabfood', 'shopeefood'].includes(order.platform)) {
        await notifyPlatform(order, order.status);
      }
      
      unifiedOrders[orderIndex] = order;
      
      return res.status(200).json({
        success: true,
        data: order,
        message: `Order ${action || 'updated'} successfully`
      });
    }

    // DELETE - Cancel order
    if (req.method === 'DELETE') {
      const { id } = req.query;
      const { reason } = req.body;
      
      const orderIndex = unifiedOrders.findIndex(o => o.id === id);
      if (orderIndex === -1) {
        return res.status(404).json({ success: false, error: 'Order not found' });
      }
      
      unifiedOrders[orderIndex].status = 'cancelled';
      unifiedOrders[orderIndex].cancelledAt = new Date().toISOString();
      unifiedOrders[orderIndex].cancellationReason = reason;
      
      return res.status(200).json({
        success: true,
        message: 'Order cancelled successfully'
      });
    }

    return res.status(405).json({ success: false, error: 'Method not allowed' });

  } catch (error: any) {
    console.error('Unified order API error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message
    });
  }
}
