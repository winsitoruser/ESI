import type { NextApiRequest, NextApiResponse } from 'next';
import crypto from 'crypto';

/**
 * Webhook Handler for Food Delivery Platforms
 * Receives order updates from GoFood, GrabFood, ShopeeFood
 */

// Platform webhook configurations
const WEBHOOK_CONFIG = {
  gofood: {
    secretHeader: 'X-Gofood-Signature',
    secret: process.env.GOFOOD_WEBHOOK_SECRET || 'gofood-secret-key',
    eventTypes: ['order.created', 'order.accepted', 'order.cancelled', 'driver.assigned', 'driver.arrived', 'order.completed']
  },
  grabfood: {
    secretHeader: 'X-Grab-Signature',
    secret: process.env.GRABFOOD_WEBHOOK_SECRET || 'grabfood-secret-key',
    eventTypes: ['ORDER_PLACED', 'ORDER_ACCEPTED', 'ORDER_CANCELLED', 'DRIVER_ALLOCATED', 'ORDER_DELIVERED']
  },
  shopeefood: {
    secretHeader: 'X-Shopeefood-Signature',
    secret: process.env.SHOPEEFOOD_WEBHOOK_SECRET || 'shopeefood-secret-key',
    eventTypes: ['new_order', 'order_accepted', 'order_cancelled', 'driver_assigned', 'order_delivered']
  }
};

// Verify webhook signature
function verifySignature(platform: string, payload: string, signature: string): boolean {
  const config = WEBHOOK_CONFIG[platform as keyof typeof WEBHOOK_CONFIG];
  if (!config) return false;
  
  const expectedSignature = crypto
    .createHmac('sha256', config.secret)
    .update(payload)
    .digest('hex');
  
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}

// Transform platform-specific payload to unified format
function transformPayload(platform: string, payload: any): any {
  switch (platform) {
    case 'gofood':
      return transformGoFoodPayload(payload);
    case 'grabfood':
      return transformGrabFoodPayload(payload);
    case 'shopeefood':
      return transformShopeeFoodPayload(payload);
    default:
      return payload;
  }
}

// GoFood payload transformer
function transformGoFoodPayload(payload: any) {
  return {
    platformOrderId: payload.order_id,
    eventType: payload.event_type,
    status: mapGoFoodStatus(payload.status),
    customer: {
      name: payload.customer?.name,
      phone: payload.customer?.phone,
      address: payload.delivery?.address,
      notes: payload.delivery?.notes
    },
    items: payload.items?.map((item: any) => ({
      id: item.id,
      name: item.name,
      quantity: item.quantity,
      price: item.price,
      notes: item.notes
    })),
    driver: payload.driver ? {
      id: payload.driver.id,
      name: payload.driver.name,
      phone: payload.driver.phone,
      vehicle: payload.driver.vehicle_type,
      plateNumber: payload.driver.plate_number,
      photo: payload.driver.photo_url,
      rating: payload.driver.rating
    } : undefined,
    payment: {
      method: payload.payment?.method,
      status: payload.payment?.status === 'PAID' ? 'paid' : 'pending',
      total: payload.payment?.total_amount
    },
    timestamps: {
      createdAt: payload.created_at,
      updatedAt: payload.updated_at
    }
  };
}

function mapGoFoodStatus(status: string): string {
  const statusMap: Record<string, string> = {
    'NEW': 'new',
    'ACCEPTED': 'accepted',
    'PREPARING': 'preparing',
    'READY': 'ready',
    'PICKED_UP': 'picked_up',
    'DELIVERED': 'completed',
    'CANCELLED': 'cancelled'
  };
  return statusMap[status] || status.toLowerCase();
}

// GrabFood payload transformer
function transformGrabFoodPayload(payload: any) {
  return {
    platformOrderId: payload.orderID,
    eventType: payload.eventType,
    status: mapGrabFoodStatus(payload.orderState),
    customer: {
      name: payload.eater?.name,
      phone: payload.eater?.phone,
      address: payload.deliveryAddress?.address,
      notes: payload.deliveryAddress?.instructions
    },
    items: payload.items?.map((item: any) => ({
      id: item.itemID,
      name: item.name,
      quantity: item.quantity,
      price: item.price,
      notes: item.specialInstructions
    })),
    driver: payload.driver ? {
      id: payload.driver.driverID,
      name: payload.driver.name,
      phone: payload.driver.phone,
      vehicle: 'Motor',
      plateNumber: payload.driver.vehiclePlate,
      photo: payload.driver.photoURL,
      rating: payload.driver.rating
    } : undefined,
    payment: {
      method: payload.paymentMethod,
      status: payload.paymentStatus === 'COMPLETED' ? 'paid' : 'pending',
      total: payload.totalPrice
    },
    timestamps: {
      createdAt: payload.createdTime,
      updatedAt: payload.updatedTime
    }
  };
}

function mapGrabFoodStatus(status: string): string {
  const statusMap: Record<string, string> = {
    'PENDING': 'new',
    'ACCEPTED': 'accepted',
    'PREPARING': 'preparing',
    'READY_FOR_PICKUP': 'ready',
    'PICKED_UP': 'picked_up',
    'DELIVERED': 'completed',
    'CANCELLED': 'cancelled'
  };
  return statusMap[status] || status.toLowerCase();
}

// ShopeeFood payload transformer
function transformShopeeFoodPayload(payload: any) {
  return {
    platformOrderId: payload.order_sn,
    eventType: payload.event,
    status: mapShopeeFoodStatus(payload.order_status),
    customer: {
      name: payload.buyer?.username,
      phone: payload.buyer?.phone,
      address: payload.shipping?.address,
      notes: payload.shipping?.note
    },
    items: payload.order_items?.map((item: any) => ({
      id: item.item_id,
      name: item.item_name,
      quantity: item.quantity,
      price: item.item_price,
      notes: item.variation_name
    })),
    driver: payload.shipper ? {
      id: payload.shipper.id,
      name: payload.shipper.name,
      phone: payload.shipper.phone,
      vehicle: 'Motor',
      plateNumber: payload.shipper.plate_number,
      rating: payload.shipper.rating
    } : undefined,
    payment: {
      method: payload.payment_method,
      status: payload.payment_status === 'PAID' ? 'paid' : 'pending',
      total: payload.total_amount
    },
    timestamps: {
      createdAt: payload.create_time,
      updatedAt: payload.update_time
    }
  };
}

function mapShopeeFoodStatus(status: string): string {
  const statusMap: Record<string, string> = {
    'UNPAID': 'new',
    'READY_TO_SHIP': 'accepted',
    'IN_PROGRESS': 'preparing',
    'READY': 'ready',
    'SHIPPED': 'picked_up',
    'COMPLETED': 'completed',
    'CANCELLED': 'cancelled'
  };
  return statusMap[status] || status.toLowerCase();
}

// Process webhook event
async function processWebhookEvent(platform: string, transformedPayload: any) {
  const { platformOrderId, eventType, status, customer, items, driver, payment } = transformedPayload;
  
  // Log the event
  console.log(`[Webhook] ${platform.toUpperCase()} - ${eventType}:`, {
    orderId: platformOrderId,
    status,
    driver: driver?.name
  });

  // In production, this would:
  // 1. Find or create the order in the database
  // 2. Update order status
  // 3. Update driver info if available
  // 4. Notify kitchen via WebSocket
  // 5. Send push notifications

  // Mock response - simulating order processing
  const processedOrder = {
    platformOrderId,
    internalOrderId: `INT-${Date.now()}`,
    status,
    processedAt: new Date().toISOString(),
    kitchenNotified: true,
    driverAssigned: !!driver
  };

  return processedOrder;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Only accept POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { platform } = req.query;
    
    if (!platform || !WEBHOOK_CONFIG[platform as keyof typeof WEBHOOK_CONFIG]) {
      return res.status(400).json({ error: 'Invalid platform' });
    }

    const platformStr = platform as string;
    const config = WEBHOOK_CONFIG[platformStr as keyof typeof WEBHOOK_CONFIG];
    
    // Get signature from headers
    const signature = req.headers[config.secretHeader.toLowerCase()] as string;
    
    // In production, verify signature (disabled for testing)
    // if (!signature || !verifySignature(platformStr, JSON.stringify(req.body), signature)) {
    //   return res.status(401).json({ error: 'Invalid signature' });
    // }

    // Transform payload to unified format
    const transformedPayload = transformPayload(platformStr, req.body);
    
    // Process the event
    const result = await processWebhookEvent(platformStr, transformedPayload);
    
    // Log for monitoring
    console.log(`[Webhook Processed] ${platformStr}:`, result);

    return res.status(200).json({
      success: true,
      message: 'Webhook processed successfully',
      data: result
    });

  } catch (error: any) {
    console.error('Webhook processing error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message
    });
  }
}

// Disable body parser for raw body access (needed for signature verification)
export const config = {
  api: {
    bodyParser: true
  }
};
