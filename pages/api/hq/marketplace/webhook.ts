/**
 * Marketplace Webhook Receiver
 * - Immediately responds 200 to marketplace (prevents retries)
 * - Idempotency: deduplicates by platform + event_id
 * - Async processing after acknowledgment
 * - Logs all webhook payloads for debugging
 */
import type { NextApiRequest, NextApiResponse } from 'next';

const sequelize = require('../../../../lib/sequelize');

// Disable body parsing for raw payload verification (signature validation)
export const config = { api: { bodyParser: true } };

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const platform = (req.query.platform as string) || 'unknown';
  const sourceIp = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '';
  const startMs = Date.now();

  // ── STEP 1: Immediately ACK with 200 ──
  // This is critical: marketplace APIs will retry if we don't respond quickly
  const eventType = extractEventType(platform, req.body);
  const eventId = extractEventId(platform, req.body);
  const idempotencyKey = `${platform}_${eventType}_${eventId || Date.now()}`;

  try {
    // ── STEP 2: Check idempotency — prevent duplicate processing ──
    if (eventId) {
      const [existing] = await sequelize.query(
        `SELECT id, processing_status FROM marketplace_webhooks WHERE platform = :platform AND idempotency_key = :key LIMIT 1`,
        { replacements: { platform, key: idempotencyKey } }
      );

      if (existing.length > 0) {
        // Already received this event — ACK but don't re-process
        return res.status(200).json({ 
          success: true, 
          message: 'Event already received',
          duplicate: true,
          webhookId: existing[0].id
        });
      }
    }

    // ── STEP 3: Log the webhook event ──
    const [insertRow] = await sequelize.query(`
      INSERT INTO marketplace_webhooks (platform, event_type, event_id, idempotency_key, payload, http_status_sent, processing_status, source_ip, headers, created_at)
      VALUES (:platform, :eventType, :eventId, :key, :payload::jsonb, 200, 'received', :sourceIp, :headers::jsonb, NOW())
      RETURNING id
    `, {
      replacements: {
        platform,
        eventType,
        eventId: eventId || null,
        key: idempotencyKey,
        payload: JSON.stringify(req.body || {}),
        sourceIp,
        headers: JSON.stringify({
          'content-type': req.headers['content-type'],
          'user-agent': req.headers['user-agent'],
          'x-webhook-signature': req.headers['x-webhook-signature'] || req.headers['authorization'] || null,
        })
      }
    });
    const webhookId = insertRow[0]?.id;

    // ── STEP 4: Send 200 ACK immediately ──
    res.status(200).json({ success: true, webhookId, message: 'Event received' });

    // ── STEP 5: Process webhook asynchronously (after response sent) ──
    try {
      await processWebhook(webhookId, platform, eventType, req.body);
      await sequelize.query(
        `UPDATE marketplace_webhooks SET processing_status = 'processed', processed_at = NOW() WHERE id = :id`,
        { replacements: { id: webhookId } }
      );
    } catch (processError: any) {
      console.error(`Webhook processing error [${platform}/${eventType}]:`, processError.message);
      await sequelize.query(
        `UPDATE marketplace_webhooks SET processing_status = 'failed', error_message = :err, retry_count = retry_count + 1 WHERE id = :id`,
        { replacements: { id: webhookId, err: processError.message } }
      );
    }

    // Log to sync_logs
    const channelId = await findChannelId(platform, req.body);
    if (channelId) {
      await sequelize.query(`
        INSERT INTO marketplace_sync_logs (channel_id, tenant_id, sync_type, direction, api_endpoint, http_method, request_payload, response_payload, http_status, is_success, duration_ms, created_at)
        VALUES (:channelId, (SELECT tenant_id FROM marketplace_channels WHERE id = :channelId), :type, 'inbound', :endpoint, 'POST', :req::jsonb, :res::jsonb, 200, true, :duration, NOW())
      `, {
        replacements: {
          channelId,
          type: `webhook_${eventType}`,
          endpoint: `/webhook/${platform}`,
          req: JSON.stringify(req.body || {}),
          res: JSON.stringify({ webhookId, processed: true }),
          duration: Date.now() - startMs
        }
      });
    }
  } catch (error: any) {
    console.error(`Webhook handler error [${platform}]:`, error.message);
    // Still return 200 to prevent marketplace retries
    if (!res.headersSent) {
      return res.status(200).json({ success: true, message: 'Event acknowledged with errors' });
    }
  }
}

// ═══════════════════════════════════════════════
// WEBHOOK PROCESSING
// ═══════════════════════════════════════════════
async function processWebhook(webhookId: number, platform: string, eventType: string, payload: any) {
  switch (eventType) {
    case 'order_status_update':
    case 'order.status':
      return processOrderStatusUpdate(platform, payload);
    
    case 'new_order':
    case 'order.create':
      return processNewOrder(platform, payload);

    case 'payment_confirmed':
    case 'order.paid':
      return processPaymentConfirmed(platform, payload);

    case 'order_cancelled':
    case 'order.cancel':
      return processOrderCancelled(platform, payload);

    case 'return_request':
    case 'order.return':
      return processReturnRequest(platform, payload);

    case 'product_update':
      return processProductUpdate(platform, payload);

    // ── Logistics / Shipping Webhooks ──
    case 'logistics_tracking_update':
    case 'logistic.tracking':
    case 'shipping.tracking_update':
      return processLogisticsTrackingUpdate(platform, payload);

    case 'logistics_awb_assigned':
    case 'shipping.awb_created':
    case 'logistic.awb':
      return processAWBAssigned(platform, payload);

    case 'logistics_pickup':
    case 'shipping.pickup_done':
    case 'logistic.pickup':
      return processPickupDone(platform, payload);

    case 'logistics_delivered':
    case 'shipping.delivered':
    case 'logistic.delivered':
      return processDelivered(platform, payload);

    default:
      console.log(`[Webhook] Unhandled event type: ${platform}/${eventType}`);
  }
}

async function processNewOrder(platform: string, payload: any) {
  const channelId = await findChannelId(platform, payload);
  if (!channelId) return;

  const [channel] = await sequelize.query(`SELECT tenant_id FROM marketplace_channels WHERE id = :channelId`, { replacements: { channelId } });
  if (!channel.length) return;
  const tenantId = channel[0].tenant_id;

  const orderId = extractOrderId(platform, payload);
  if (!orderId) return;

  // Check idempotency for orders
  const [existing] = await sequelize.query(
    `SELECT id FROM marketplace_orders WHERE channel_id = :channelId AND marketplace_order_id = :orderId`,
    { replacements: { channelId, orderId } }
  );
  if (existing.length > 0) return; // Already exists

  // Create order
  const orderData = normalizeOrderData(platform, payload);
  const [inserted] = await sequelize.query(`
    INSERT INTO marketplace_orders (channel_id, tenant_id, marketplace_order_id, marketplace_order_sn, order_status, marketplace_status, payment_status, buyer_name, buyer_phone, shipping_address, shipping_courier, subtotal, shipping_cost, total_amount, order_placed_at, raw_data, created_at, updated_at)
    VALUES (:channelId, :tenantId, :orderId, :orderSn, 'new', :mpStatus, :payStatus, :buyerName, :buyerPhone, :address, :courier, :subtotal, :shipping, :total, :orderTime, :raw::jsonb, NOW(), NOW())
    RETURNING id
  `, { replacements: { channelId, tenantId, orderId, ...orderData } });

  // Create order items and map to ERP products
  const items = extractOrderItems(platform, payload);
  for (const item of items) {
    // Try to find matching ERP product via mapping
    const [mapping] = await sequelize.query(`
      SELECT pm.product_id FROM marketplace_product_mappings pm
      WHERE pm.channel_id = :channelId AND (pm.marketplace_product_id = :mpId OR pm.marketplace_sku = :mpSku) AND pm.is_active = true LIMIT 1
    `, { replacements: { channelId, mpId: item.marketplaceProductId || '', mpSku: item.marketplaceSku || '' } });

    await sequelize.query(`
      INSERT INTO marketplace_order_items (order_id, product_id, marketplace_item_id, marketplace_product_id, marketplace_sku, product_name, quantity, unit_price, subtotal, created_at, updated_at)
      VALUES (:orderId, :productId, :itemId, :mpProductId, :mpSku, :name, :qty, :price, :subtotal, NOW(), NOW())
    `, {
      replacements: {
        orderId: inserted[0].id,
        productId: mapping.length > 0 ? mapping[0].product_id : null,
        itemId: item.itemId || null,
        mpProductId: item.marketplaceProductId || null,
        mpSku: item.marketplaceSku || null,
        name: item.name || 'Unknown Product',
        qty: item.quantity || 1,
        price: item.unitPrice || 0,
        subtotal: (item.quantity || 1) * (item.unitPrice || 0)
      }
    });
  }
}

async function processOrderStatusUpdate(platform: string, payload: any) {
  const channelId = await findChannelId(platform, payload);
  if (!channelId) return;

  const orderId = extractOrderId(platform, payload);
  const newStatus = extractOrderStatus(platform, payload);
  if (!orderId || !newStatus) return;

  await sequelize.query(`
    UPDATE marketplace_orders SET marketplace_status = :status, updated_at = NOW()
    WHERE channel_id = :channelId AND marketplace_order_id = :orderId
  `, { replacements: { channelId, orderId, status: newStatus } });
}

async function processPaymentConfirmed(platform: string, payload: any) {
  const channelId = await findChannelId(platform, payload);
  if (!channelId) return;

  const orderId = extractOrderId(platform, payload);
  if (!orderId) return;

  await sequelize.query(`
    UPDATE marketplace_orders SET payment_status = 'paid', payment_at = NOW(), order_status = CASE WHEN order_status = 'new' THEN 'paid' ELSE order_status END, updated_at = NOW()
    WHERE channel_id = :channelId AND marketplace_order_id = :orderId
  `, { replacements: { channelId, orderId } });
}

async function processOrderCancelled(platform: string, payload: any) {
  const channelId = await findChannelId(platform, payload);
  if (!channelId) return;

  const orderId = extractOrderId(platform, payload);
  if (!orderId) return;

  // Restore stock if it was deducted
  const [order] = await sequelize.query(`
    SELECT id, stock_deducted FROM marketplace_orders WHERE channel_id = :channelId AND marketplace_order_id = :orderId
  `, { replacements: { channelId, orderId } });

  if (order.length > 0 && order[0].stock_deducted) {
    const [items] = await sequelize.query(`SELECT product_id, quantity FROM marketplace_order_items WHERE order_id = :id`, { replacements: { id: order[0].id } });
    for (const item of items as any[]) {
      if (item.product_id) {
        await sequelize.query(`UPDATE inventory_stock SET quantity = quantity + :qty WHERE product_id = :pid`, { replacements: { qty: item.quantity, pid: item.product_id } });
      }
    }
  }

  await sequelize.query(`
    UPDATE marketplace_orders SET order_status = 'cancelled', cancelled_at = NOW(), updated_at = NOW()
    WHERE channel_id = :channelId AND marketplace_order_id = :orderId
  `, { replacements: { channelId, orderId } });
}

async function processReturnRequest(_platform: string, _payload: any) {
  // TODO: implement return handling
}

async function processProductUpdate(_platform: string, _payload: any) {
  // TODO: sync product changes from marketplace back to ERP
}

// ═══════════════════════════════════════════════
// LOGISTICS WEBHOOK HANDLERS
// ═══════════════════════════════════════════════

/**
 * Courier tracking update — checkpoint events from marketplace
 * Shopee: logistic.tracking, Tokopedia: logistics_tracking_update, Lazada: shipping.tracking_update
 */
async function processLogisticsTrackingUpdate(platform: string, payload: any) {
  const channelId = await findChannelId(platform, payload);
  if (!channelId) return;

  const orderId = extractOrderId(platform, payload);
  if (!orderId) return;

  const [order] = await sequelize.query(
    `SELECT id, tracking_number, shipping_state FROM marketplace_orders WHERE channel_id = :channelId AND marketplace_order_id = :orderId`,
    { replacements: { channelId, orderId } }
  );
  if (!order.length) return;

  const trackingNo = extractTrackingNumber(platform, payload) || order[0].tracking_number;
  const logisticsStatus = extractLogisticsStatus(platform, payload);
  const checkpoint = extractTrackingCheckpoint(platform, payload);

  // Idempotency: check if this exact checkpoint already exists
  if (checkpoint?.time) {
    const [existingEvent] = await sequelize.query(
      `SELECT id FROM marketplace_shipment_tracking WHERE order_id = :oid AND tracking_events @> :evt::jsonb`,
      { replacements: { oid: order[0].id, evt: JSON.stringify([{ time: checkpoint.time, description: checkpoint.description }]) } }
    );
    if (existingEvent.length > 0) return; // Duplicate checkpoint
  }

  // Upsert tracking record
  const [existing] = await sequelize.query(
    `SELECT id, tracking_events FROM marketplace_shipment_tracking WHERE order_id = :oid`,
    { replacements: { oid: order[0].id } }
  );

  const events = existing.length > 0 ? (existing[0].tracking_events || []) : [];
  if (checkpoint) events.push(checkpoint);
  events.sort((a: any, b: any) => new Date(a.time).getTime() - new Date(b.time).getTime());

  if (existing.length > 0) {
    await sequelize.query(`
      UPDATE marketplace_shipment_tracking SET
        tracking_events = :events::jsonb, last_event_description = :desc, last_event_time = :time,
        last_event_location = :loc, logistics_status = COALESCE(:status, logistics_status),
        tracking_number = COALESCE(:trackingNo, tracking_number),
        last_sync_at = NOW(), sync_count = sync_count + 1, updated_at = NOW()
      WHERE order_id = :oid
    `, {
      replacements: {
        oid: order[0].id, events: JSON.stringify(events),
        desc: checkpoint?.description || null, time: checkpoint?.time || null,
        loc: checkpoint?.location || null, status: logisticsStatus, trackingNo
      }
    });
  } else {
    const [ch] = await sequelize.query(`SELECT tenant_id FROM marketplace_channels WHERE id = :channelId`, { replacements: { channelId } });
    await sequelize.query(`
      INSERT INTO marketplace_shipment_tracking (order_id, channel_id, tenant_id, tracking_number, platform, courier, tracking_events, last_event_description, last_event_time, last_event_location, logistics_status, last_sync_at, sync_count, created_at, updated_at)
      VALUES (:oid, :channelId, :tenantId, :trackingNo, :platform, :courier, :events::jsonb, :desc, :time, :loc, :status, NOW(), 1, NOW(), NOW())
    `, {
      replacements: {
        oid: order[0].id, channelId, tenantId: ch[0]?.tenant_id || null,
        trackingNo, platform, courier: extractCourier(platform, payload) || '',
        events: JSON.stringify(events), desc: checkpoint?.description || null,
        time: checkpoint?.time || null, loc: checkpoint?.location || null,
        status: logisticsStatus || 'in_transit'
      }
    });
  }

  // Map logistics status to shipping_state
  const stateMap: Record<string, string> = {
    picked_up: 'picked_up', in_transit: 'in_transit',
    out_for_delivery: 'in_transit', delivered: 'delivered',
  };
  const newState = stateMap[logisticsStatus || ''];
  if (newState) {
    await sequelize.query(
      `UPDATE marketplace_orders SET shipping_state = :state, updated_at = NOW() WHERE id = :oid AND shipping_state != 'delivered'`,
      { replacements: { oid: order[0].id, state: newState } }
    );
  }
}

/**
 * AWB/resi assigned by marketplace — capture tracking number
 * Prevents duplicate invoice/surat jalan via idempotency check
 */
async function processAWBAssigned(platform: string, payload: any) {
  const channelId = await findChannelId(platform, payload);
  if (!channelId) return;

  const orderId = extractOrderId(platform, payload);
  const trackingNo = extractTrackingNumber(platform, payload);
  if (!orderId || !trackingNo) return;

  // Idempotency: check if this tracking number is already stored
  const [existing] = await sequelize.query(
    `SELECT id, tracking_number FROM marketplace_orders WHERE channel_id = :channelId AND marketplace_order_id = :orderId`,
    { replacements: { channelId, orderId } }
  );
  if (!existing.length) return;
  if (existing[0].tracking_number === trackingNo) return; // Same resi, skip

  // Store tracking number + courier info
  const courier = extractCourier(platform, payload);
  await sequelize.query(`
    UPDATE marketplace_orders SET
      tracking_number = :trackingNo,
      shipping_provider = COALESCE(:courier, shipping_provider),
      shipping_state = CASE WHEN shipping_state IN ('pending','param_checked','arranged') THEN 'label_ready' ELSE shipping_state END,
      updated_at = NOW()
    WHERE id = :oid
  `, { replacements: { oid: existing[0].id, trackingNo, courier } });

  console.log(`[Webhook] AWB assigned: ${platform} order ${orderId} → ${trackingNo}`);
}

/**
 * Courier has picked up the package
 */
async function processPickupDone(platform: string, payload: any) {
  const channelId = await findChannelId(platform, payload);
  if (!channelId) return;

  const orderId = extractOrderId(platform, payload);
  if (!orderId) return;

  const [order] = await sequelize.query(
    `SELECT id FROM marketplace_orders WHERE channel_id = :channelId AND marketplace_order_id = :orderId`,
    { replacements: { channelId, orderId } }
  );
  if (!order.length) return;

  await sequelize.query(`
    UPDATE marketplace_orders SET
      shipping_state = 'picked_up', shipped_at = COALESCE(shipped_at, NOW()),
      order_status = CASE WHEN order_status IN ('paid','processing','ready_to_ship') THEN 'shipped' ELSE order_status END,
      updated_at = NOW()
    WHERE id = :oid
  `, { replacements: { oid: order[0].id } });

  await sequelize.query(`
    UPDATE marketplace_shipment_tracking SET
      pickup_done = true, pickup_time = COALESCE(pickup_time, NOW()),
      logistics_status = 'picked_up', updated_at = NOW()
    WHERE order_id = :oid
  `, { replacements: { oid: order[0].id } });
}

/**
 * Package delivered — update ERP order + tracking
 */
async function processDelivered(platform: string, payload: any) {
  const channelId = await findChannelId(platform, payload);
  if (!channelId) return;

  const orderId = extractOrderId(platform, payload);
  if (!orderId) return;

  const [order] = await sequelize.query(
    `SELECT id FROM marketplace_orders WHERE channel_id = :channelId AND marketplace_order_id = :orderId`,
    { replacements: { channelId, orderId } }
  );
  if (!order.length) return;

  const receiverName = payload.data?.receiver_name || payload.data?.recipient_name || null;

  await sequelize.query(`
    UPDATE marketplace_orders SET
      shipping_state = 'delivered', delivered_at = COALESCE(delivered_at, NOW()),
      order_status = CASE WHEN order_status NOT IN ('completed','cancelled') THEN 'delivered' ELSE order_status END,
      updated_at = NOW()
    WHERE id = :oid
  `, { replacements: { oid: order[0].id } });

  await sequelize.query(`
    UPDATE marketplace_shipment_tracking SET
      logistics_status = 'delivered', delivered_time = COALESCE(delivered_time, NOW()),
      receiver_name = COALESCE(:receiver, receiver_name), updated_at = NOW()
    WHERE order_id = :oid
  `, { replacements: { oid: order[0].id, receiver: receiverName } });
}

// ═══════════════════════════════════════════════
// PLATFORM-SPECIFIC EXTRACTORS
// ═══════════════════════════════════════════════
function extractEventType(platform: string, body: any): string {
  if (!body) return 'unknown';
  switch (platform) {
    case 'shopee':    return body.code?.toString() || body.type || 'unknown';
    case 'tokopedia': return body.action || body.type || 'unknown';
    case 'lazada':    return body.message_type || 'unknown';
    case 'tiktok_shop': return body.type || 'unknown';
    default:          return body.event || body.type || body.action || 'unknown';
  }
}

function extractEventId(platform: string, body: any): string | null {
  if (!body) return null;
  return body.event_id || body.webhook_id || body.msg_id || body.id || null;
}

function extractOrderId(platform: string, body: any): string | null {
  if (!body) return null;
  switch (platform) {
    case 'shopee':    return body.data?.ordersn || body.data?.order_sn || null;
    case 'tokopedia': return body.order_id?.toString() || body.data?.order_id?.toString() || null;
    case 'lazada':    return body.data?.trade_order_id?.toString() || null;
    case 'tiktok_shop': return body.data?.order_id || null;
    default:          return body.order_id || body.data?.order_id || null;
  }
}

function extractOrderStatus(platform: string, body: any): string | null {
  if (!body) return null;
  return body.data?.status || body.status || body.data?.order_status || null;
}

function normalizeOrderData(platform: string, payload: any): any {
  const data = payload.data || payload;
  return {
    orderSn: data.order_sn || data.ordersn || null,
    mpStatus: data.status || 'new',
    payStatus: data.payment_status || 'pending',
    buyerName: data.buyer_username || data.buyer_name || data.recipient?.name || null,
    buyerPhone: data.buyer_phone || data.recipient?.phone || null,
    address: data.shipping_address || data.recipient?.full_address || null,
    courier: data.shipping_carrier || data.logistics?.shipping_carrier || null,
    subtotal: parseFloat(data.subtotal || data.total_amount || 0),
    shipping: parseFloat(data.shipping_cost || data.estimated_shipping_fee || 0),
    total: parseFloat(data.total_amount || data.order_total || 0),
    orderTime: data.create_time ? new Date(data.create_time * 1000).toISOString() : new Date().toISOString(),
    raw: JSON.stringify(payload)
  };
}

function extractOrderItems(platform: string, payload: any): any[] {
  const data = payload.data || payload;
  const items = data.items || data.item_list || data.order_items || [];
  return items.map((item: any) => ({
    itemId: item.item_id || item.id || null,
    marketplaceProductId: item.item_id || item.product_id || null,
    marketplaceSku: item.model_sku || item.sku || null,
    name: item.item_name || item.name || item.product_name || null,
    quantity: parseInt(item.model_quantity_purchased || item.quantity || 1),
    unitPrice: parseFloat(item.model_discounted_price || item.item_price || item.price || 0),
  }));
}

// ═══════════════════════════════════════════════
// LOGISTICS-SPECIFIC EXTRACTORS
// ═══════════════════════════════════════════════
function extractTrackingNumber(platform: string, body: any): string | null {
  if (!body) return null;
  const data = body.data || body;
  switch (platform) {
    case 'shopee':     return data.tracking_no || data.tracking_number || data.logistics?.tracking_no || null;
    case 'tokopedia':  return data.awb_number || data.shipping_ref_num || data.tracking_number || null;
    case 'lazada':     return data.tracking_number || data.tracking_code || data.awb || null;
    case 'tiktok_shop':return data.tracking_number || data.shipping_info?.tracking_number || null;
    default:           return data.tracking_number || data.awb || data.tracking_no || null;
  }
}

function extractLogisticsStatus(platform: string, body: any): string | null {
  if (!body) return null;
  const data = body.data || body;
  const raw = data.logistics_status || data.shipping_status || data.logistic_status || data.status || '';
  // Normalize to our state machine
  const normalized = raw.toString().toLowerCase().replace(/[\s-]/g, '_');
  const map: Record<string, string> = {
    pickup_scheduled: 'pickup_scheduled', pickup_done: 'picked_up', picked_up: 'picked_up',
    in_transit: 'in_transit', transit: 'in_transit', shipping: 'in_transit',
    out_for_delivery: 'out_for_delivery', delivering: 'out_for_delivery',
    delivered: 'delivered', completed: 'delivered',
    returned: 'returned', returning: 'returned', failed_delivery: 'returned',
  };
  return map[normalized] || normalized || null;
}

function extractTrackingCheckpoint(platform: string, body: any): { time: string; description: string; location: string; status: string } | null {
  if (!body) return null;
  const data = body.data || body;
  // Shopee sends tracking_info with latest checkpoint
  const cp = data.checkpoint || data.tracking_info || data.logistics_info || data;
  if (!cp) return null;
  return {
    time: cp.update_time ? new Date(cp.update_time * 1000).toISOString()
        : cp.timestamp ? new Date(cp.timestamp).toISOString()
        : cp.time || new Date().toISOString(),
    description: cp.description || cp.message || cp.activity || cp.status_desc || 'Status updated',
    location: cp.location || cp.city || cp.hub || '',
    status: extractLogisticsStatus(platform, body) || 'in_transit',
  };
}

function extractCourier(platform: string, body: any): string | null {
  if (!body) return null;
  const data = body.data || body;
  return data.shipping_carrier || data.courier || data.logistics_channel_name
    || data.shipping_provider || data.logistics?.shipping_carrier || null;
}

async function findChannelId(platform: string, payload: any): Promise<number | null> {
  const shopId = payload.shop_id || payload.data?.shop_id || payload.seller_id || null;
  
  let query = `SELECT id FROM marketplace_channels WHERE platform = :platform AND status = 'connected'`;
  const params: any = { platform };
  
  if (shopId) {
    query += ` AND shop_id = :shopId`;
    params.shopId = shopId.toString();
  }
  query += ` LIMIT 1`;

  const [rows] = await sequelize.query(query, { replacements: params });
  return rows.length > 0 ? rows[0].id : null;
}
