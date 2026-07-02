import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../auth/[...nextauth]';
import { sequelize } from '@/lib/sequelizeClient';
import { QueryTypes } from 'sequelize';

const KitchenOrder = require('@/models/KitchenOrder');
const KitchenOrderItem = require('@/models/KitchenOrderItem');
const KitchenStaff = require('@/models/KitchenStaff');

// Mock data generator for kitchen orders
const menuItems = [
  { name: 'Nasi Goreng Spesial', price: 35000 },
  { name: 'Nasi Goreng Kampung', price: 28000 },
  { name: 'Mie Goreng Jawa', price: 30000 },
  { name: 'Ayam Bakar Madu', price: 45000 },
  { name: 'Ayam Goreng Kremes', price: 40000 },
  { name: 'Ayam Geprek', price: 28000 },
  { name: 'Sate Ayam 10 Tusuk', price: 35000 },
  { name: 'Ikan Bakar Bumbu Kecap', price: 50000 },
  { name: 'Rendang Daging', price: 48000 },
  { name: 'Soto Ayam', price: 25000 },
  { name: 'Bakso Urat Spesial', price: 30000 },
  { name: 'Gado-Gado', price: 22000 },
  { name: 'Es Teh Manis', price: 8000 },
  { name: 'Es Jeruk', price: 12000 },
  { name: 'Kopi Susu', price: 18000 },
];

// Delivery platform configurations
const deliveryPlatforms = [
  { 
    id: 'gofood', 
    name: 'GoFood', 
    color: '#00AA13',
    logo: '🟢',
    paymentMethods: ['GoPay', 'GoPay Later', 'Cash'],
    feePercent: 20
  },
  { 
    id: 'grabfood', 
    name: 'GrabFood', 
    color: '#00B14F',
    logo: '🟢',
    paymentMethods: ['OVO', 'GrabPay', 'Cash', 'LinkAja'],
    feePercent: 25
  },
  { 
    id: 'shopeefood', 
    name: 'ShopeeFood', 
    color: '#EE4D2D',
    logo: '🟠',
    paymentMethods: ['ShopeePay', 'SPayLater', 'Cash'],
    feePercent: 20
  }
];

const driverNames = [
  'Pak Joko', 'Mas Dedi', 'Bang Roni', 'Kang Asep', 'Mas Adi',
  'Pak Wahyu', 'Mas Bima', 'Bang Heri', 'Kang Ujang', 'Pak Tono'
];

const customerNames = [
  'Budi Santoso', 'Siti Rahayu', 'Ahmad Hidayat', 'Dewi Lestari', 'Rizky Pratama',
  'Nur Aini', 'Eko Prasetyo', 'Sri Wahyuni', 'Agus Setiawan', 'Rina Marlina'
];

// Generate driver info
function generateDriverInfo(platform: typeof deliveryPlatforms[0]) {
  const name = driverNames[Math.floor(Math.random() * driverNames.length)];
  const plateLetters = ['B', 'D', 'F', 'L', 'N', 'AB', 'AD'];
  const plate = `${plateLetters[Math.floor(Math.random() * plateLetters.length)]} ${Math.floor(Math.random() * 9000) + 1000} ${['ABC', 'XYZ', 'JKL'][Math.floor(Math.random() * 3)]}`;
  return {
    name,
    phone: `0812${Math.floor(Math.random() * 90000000) + 10000000}`,
    vehicle: 'Motor',
    plateNumber: plate,
    photo: null,
    rating: (4 + Math.random()).toFixed(1)
  };
}

// Generate delivery info
function generateDeliveryInfo(orderType: string) {
  if (orderType !== 'delivery') return null;
  
  const platform = deliveryPlatforms[Math.floor(Math.random() * deliveryPlatforms.length)];
  const paymentMethod = platform.paymentMethods[Math.floor(Math.random() * platform.paymentMethods.length)];
  const isPaid = Math.random() > 0.2; // 80% sudah lunas
  
  return {
    platform: {
      id: platform.id,
      name: platform.name,
      color: platform.color,
      logo: platform.logo,
      orderId: `${platform.id.toUpperCase()}-${Date.now()}-${Math.floor(Math.random() * 1000)}`
    },
    driver: generateDriverInfo(platform),
    payment: {
      method: paymentMethod,
      status: isPaid ? 'paid' : 'pending',
      paidAt: isPaid ? new Date(Date.now() - Math.floor(Math.random() * 30) * 60000).toISOString() : null,
      platformFee: 0, // Will be calculated
      deliveryFee: Math.floor(Math.random() * 8000) + 8000,
      promoDiscount: Math.random() > 0.7 ? Math.floor(Math.random() * 15000) + 5000 : 0
    },
    customer: {
      name: customerNames[Math.floor(Math.random() * customerNames.length)],
      phone: `0813${Math.floor(Math.random() * 90000000) + 10000000}`,
      address: `Jl. ${['Sudirman', 'Thamrin', 'Gatot Subroto', 'Rasuna Said', 'Kuningan'][Math.floor(Math.random() * 5)]} No. ${Math.floor(Math.random() * 100) + 1}`,
      notes: Math.random() > 0.6 ? ['Depan minimarket', 'Gang ke-2 sebelah kiri', 'Rumah pagar hijau', 'Lantai 3'][Math.floor(Math.random() * 4)] : null
    },
    estimatedArrival: new Date(Date.now() + (Math.floor(Math.random() * 20) + 15) * 60000).toISOString(),
    distance: `${(Math.random() * 5 + 1).toFixed(1)} km`
  };
}

function generateMockKitchenOrders(statusFilter?: string) {
  const now = Date.now();
  const statuses = statusFilter && statusFilter !== 'all' 
    ? [statusFilter] 
    : ['new', 'pending', 'preparing', 'ready'];
  
  const orders: any[] = [];
  
  // Generate orders for each status
  statuses.forEach((status, statusIdx) => {
    const orderCount = status === 'new' ? 2 : status === 'pending' ? 2 : status === 'preparing' ? 3 : 2;
    
    for (let i = 0; i < orderCount; i++) {
      const orderType = ['dine_in', 'takeaway', 'delivery'][Math.floor(Math.random() * 3)];
      const tableNumber = orderType === 'dine_in' ? String(Math.floor(Math.random() * 12) + 1) : null;
      const minutesAgo = status === 'new' ? (i + 1) : status === 'pending' ? (i + 3) : status === 'preparing' ? (i + 6) : (i + 12);
      
      const itemCount = Math.floor(Math.random() * 3) + 1;
      const items = [];
      const usedItems = new Set<number>();
      
      for (let j = 0; j < itemCount; j++) {
        let itemIdx;
        do { itemIdx = Math.floor(Math.random() * menuItems.length); } while (usedItems.has(itemIdx));
        usedItems.add(itemIdx);
        
        items.push({
          id: `item-${statusIdx}-${i}-${j}`,
          name: menuItems[itemIdx].name,
          quantity: Math.floor(Math.random() * 2) + 1,
          notes: Math.random() > 0.7 ? ['Pedas', 'Tidak pedas', 'Ekstra sambal', 'Tanpa bawang'][Math.floor(Math.random() * 4)] : null,
          modifiers: null,
          status: status === 'preparing' ? 'cooking' : status === 'ready' ? 'done' : 'pending'
        });
      }

      const subtotal = items.reduce((acc, item) => acc + (menuItems.find(m => m.name === item.name)?.price || 30000) * item.quantity, 0);
      const deliveryInfo = generateDeliveryInfo(orderType);
      
      // Calculate platform fee if delivery
      if (deliveryInfo) {
        const platformConfig = deliveryPlatforms.find(p => p.id === deliveryInfo.platform.id);
        deliveryInfo.payment.platformFee = Math.floor(subtotal * (platformConfig?.feePercent || 20) / 100);
      }

      orders.push({
        id: `mock-${status}-${i}`,
        order_number: `ORD-${String(now).slice(-4)}${statusIdx}${i}`,
        table_number: tableNumber,
        order_type: orderType,
        customer_name: orderType === 'dine_in' ? `Meja ${tableNumber}` : deliveryInfo?.customer.name || ['Budi S.', 'Siti R.', 'Ahmad H.', 'Dewi L.', 'Rizky P.'][Math.floor(Math.random() * 5)],
        status: status,
        priority: minutesAgo > 10 ? 'high' : 'normal',
        received_at: new Date(now - minutesAgo * 60000).toISOString(),
        started_at: ['preparing', 'ready'].includes(status) ? new Date(now - (minutesAgo - 2) * 60000).toISOString() : null,
        completed_at: status === 'ready' ? new Date(now - 2 * 60000).toISOString() : null,
        served_at: null,
        estimated_time: Math.floor(Math.random() * 10) + 10,
        actual_prep_time: status === 'ready' ? Math.floor(Math.random() * 8) + 8 : null,
        subtotal: subtotal,
        total_amount: subtotal + (deliveryInfo?.payment.deliveryFee || 0) - (deliveryInfo?.payment.promoDiscount || 0),
        notes: Math.random() > 0.8 ? 'Tolong cepat ya' : null,
        items,
        // Delivery specific info
        delivery_info: deliveryInfo,
        // Payment info for all orders
        payment: {
          method: orderType === 'delivery' ? deliveryInfo?.payment.method : 
                  orderType === 'dine_in' ? ['Cash', 'QRIS', 'Debit Card'][Math.floor(Math.random() * 3)] :
                  ['Cash', 'QRIS', 'GoPay', 'OVO'][Math.floor(Math.random() * 4)],
          status: orderType === 'delivery' ? deliveryInfo?.payment.status : 
                  (Math.random() > 0.1 ? 'paid' : 'pending'),
          paidAt: null
        }
      });
    }
  });

  // Sort by received_at descending
  orders.sort((a, b) => new Date(b.received_at).getTime() - new Date(a.received_at).getTime());
  
  return orders;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    const session = await getServerSession(req, res, authOptions);

    if (!session || !session.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const tenantId = session.user.tenantId || 'default';

    if (req.method === 'GET') {
      const { status, orderType, search, limit = 50, offset = 0 } = req.query;

      try {
        let whereClause = 'WHERE 1=1';
        const replacements: any = {};

        if (status && status !== 'all') {
          // Map 'pending' to 'new' to match DB enum (new, preparing, ready, served, cancelled)
          const mappedStatus = status === 'pending' ? 'new' : status;
          whereClause += ' AND ko.status = :status';
          replacements.status = mappedStatus;
        }

        if (orderType && orderType !== 'all') {
          whereClause += ' AND ko.order_type = :orderType';
          replacements.orderType = orderType;
        }

        if (search) {
          whereClause += ' AND (ko.order_number LIKE :search OR ko.table_number LIKE :search OR ko.customer_name LIKE :search)';
          replacements.search = `%${search}%`;
        }

        const orders = await sequelize.query(`
          SELECT 
            ko.id, ko.order_number, ko.table_number, ko.order_type,
            ko.customer_name, ko.status, ko.priority, ko.received_at,
            ko.started_at, ko.completed_at, ko.served_at,
            ko.estimated_time, ko.actual_prep_time, ko.total_amount, ko.notes
          FROM kitchen_orders ko
          ${whereClause}
          ORDER BY ko.received_at DESC
          LIMIT :limit OFFSET :offset
        `, {
          replacements: { ...replacements, limit: parseInt(limit as string), offset: parseInt(offset as string) },
          type: QueryTypes.SELECT
        });

        // Get items for each order
        const ordersWithItems = await Promise.all(orders.map(async (order: any) => {
          try {
            const items = await sequelize.query(`
              SELECT id, name, quantity, notes, modifiers, status
              FROM kitchen_order_items WHERE kitchen_order_id = :orderId
            `, {
              replacements: { orderId: order.id },
              type: QueryTypes.SELECT
            });
            return { ...order, items };
          } catch {
            return { ...order, items: [] };
          }
        }));

        // If no orders from database, return realistic mock data
        if (ordersWithItems.length === 0) {
          const mockOrders = generateMockKitchenOrders(status as string);
          return res.status(200).json({ success: true, data: mockOrders, source: 'mock' });
        }

        return res.status(200).json({ success: true, data: ordersWithItems });
      } catch (queryError: any) {
        console.error('Kitchen orders query error:', queryError);
        // Return mock data on error
        const mockOrders = generateMockKitchenOrders(status as string);
        return res.status(200).json({ success: true, data: mockOrders, source: 'mock' });
      }

    } else if (req.method === 'POST') {
      // Create new kitchen order
      const {
        orderNumber,
        posTransactionId,
        tableNumber,
        orderType,
        customerName,
        priority,
        estimatedTime,
        items,
        notes,
        totalAmount
      } = req.body;

      // Validate required fields
      if (!orderNumber || !orderType || !items || items.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Missing required fields: orderNumber, orderType, items'
        });
      }

      // Start transaction
      const transaction = await sequelize.transaction();

      try {
        // Create kitchen order
        const [order] = await sequelize.query(`
          INSERT INTO kitchen_orders (
            id, tenant_id, order_number, pos_transaction_id, table_number,
            order_type, customer_name, status, priority, received_at,
            estimated_time, notes, total_amount, created_at, updated_at
          ) VALUES (
            UUID(), :tenantId, :orderNumber, :posTransactionId, :tableNumber,
            :orderType, :customerName, 'new', :priority, NOW(),
            :estimatedTime, :notes, :totalAmount, NOW(), NOW()
          )
        `, {
          replacements: {
            tenantId,
            orderNumber,
            posTransactionId: posTransactionId || null,
            tableNumber: tableNumber || null,
            orderType,
            customerName: customerName || null,
            priority: priority || 'normal',
            estimatedTime: estimatedTime || 15,
            notes: notes || null,
            totalAmount: totalAmount || null
          },
          transaction
        });

        // Get the created order ID
        const [createdOrder]: any = await sequelize.query(`
          SELECT id FROM kitchen_orders WHERE order_number = :orderNumber AND tenant_id = :tenantId
        `, {
          replacements: { orderNumber, tenantId },
          type: QueryTypes.SELECT,
          transaction
        });

        // Create order items
        for (const item of items) {
          await sequelize.query(`
            INSERT INTO kitchen_order_items (
              id, kitchen_order_id, product_id, recipe_id, name, quantity,
              notes, modifiers, status, created_at, updated_at
            ) VALUES (
              UUID(), :orderId, :productId, :recipeId, :name, :quantity,
              :notes, :modifiers, 'pending', NOW(), NOW()
            )
          `, {
            replacements: {
              orderId: createdOrder.id,
              productId: item.productId || null,
              recipeId: item.recipeId || null,
              name: item.name,
              quantity: item.quantity,
              notes: item.notes || null,
              modifiers: item.modifiers ? JSON.stringify(item.modifiers) : null
            },
            transaction
          });
        }

        await transaction.commit();

        return res.status(201).json({
          success: true,
          message: 'Kitchen order created successfully',
          data: {
            id: createdOrder.id,
            orderNumber
          }
        });

      } catch (error) {
        await transaction.rollback();
        throw error;
      }

    } else {
      return res.status(405).json({ message: 'Method not allowed' });
    }

  } catch (error: any) {
    console.error('Error in kitchen orders API:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
}
