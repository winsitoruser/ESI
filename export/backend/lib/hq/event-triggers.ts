/**
 * HQ Event Triggers System
 * Centralized event handling for HQ operations
 */

import { triggerWebhook } from '../../pages/api/hq/webhooks';

export type EventType = 
  | 'BRANCH_CREATED' | 'BRANCH_UPDATED' | 'BRANCH_DELETED' | 'BRANCH_STATUS_CHANGED'
  | 'PRODUCT_CREATED' | 'PRODUCT_UPDATED' | 'PRODUCT_DELETED' | 'PRODUCT_PRICE_LOCKED' | 'PRODUCT_PRICE_UNLOCKED'
  | 'USER_CREATED' | 'USER_UPDATED' | 'USER_DELETED' | 'USER_ROLE_CHANGED' | 'USER_STATUS_CHANGED'
  | 'PO_CREATED' | 'PO_APPROVED' | 'PO_SENT' | 'PO_RECEIVED' | 'PO_CANCELLED'
  | 'REQUISITION_CREATED' | 'REQUISITION_APPROVED' | 'REQUISITION_REJECTED' | 'REQUISITION_FULFILLED'
  | 'STOCK_LOW_ALERT' | 'STOCK_OUT_ALERT' | 'STOCK_ADJUSTED' | 'STOCK_TRANSFERRED'
  | 'SALES_TARGET_ACHIEVED' | 'SALES_BELOW_TARGET'
  | 'AUDIT_LOG_CREATED';

interface EventPayload {
  eventType: EventType;
  resourceType: string;
  resourceId: string;
  resourceName: string;
  data: any;
  userId?: string;
  userName?: string;
  branchId?: string;
  branchName?: string;
  timestamp: string;
}

// Event handlers registry
const eventHandlers: Map<EventType, ((payload: EventPayload) => Promise<void>)[]> = new Map();

/**
 * Register an event handler
 */
export function onEvent(eventType: EventType, handler: (payload: EventPayload) => Promise<void>) {
  const handlers = eventHandlers.get(eventType) || [];
  handlers.push(handler);
  eventHandlers.set(eventType, handlers);
}

/**
 * Emit an event
 */
export async function emitEvent(eventType: EventType, data: Omit<EventPayload, 'eventType' | 'timestamp'>) {
  const payload: EventPayload = {
    eventType,
    ...data,
    timestamp: new Date().toISOString()
  };

  console.log(`[HQ Event] ${eventType}:`, payload.resourceType, payload.resourceId);

  // Execute registered handlers
  const handlers = eventHandlers.get(eventType) || [];
  await Promise.allSettled(handlers.map(handler => handler(payload)));

  // Trigger webhooks
  const webhookEventMap: Record<string, string> = {
    'BRANCH_CREATED': 'branch.created',
    'BRANCH_UPDATED': 'branch.updated',
    'BRANCH_DELETED': 'branch.deleted',
    'PRODUCT_CREATED': 'product.created',
    'PRODUCT_UPDATED': 'product.updated',
    'PRODUCT_DELETED': 'product.deleted',
    'PRODUCT_PRICE_LOCKED': 'product.price_changed',
    'USER_CREATED': 'user.created',
    'USER_UPDATED': 'user.updated',
    'USER_ROLE_CHANGED': 'user.role_changed',
    'PO_CREATED': 'order.created',
    'PO_APPROVED': 'order.approved',
    'STOCK_LOW_ALERT': 'stock.low',
    'STOCK_OUT_ALERT': 'stock.out'
  };

  const webhookEvent = webhookEventMap[eventType];
  if (webhookEvent) {
    try {
      await triggerWebhook(webhookEvent as any, payload);
    } catch (error) {
      console.error(`[HQ Event] Webhook trigger failed for ${eventType}:`, error);
    }
  }

  // Create audit log for important events
  const auditableEvents: EventType[] = [
    'BRANCH_CREATED', 'BRANCH_UPDATED', 'BRANCH_DELETED',
    'PRODUCT_CREATED', 'PRODUCT_UPDATED', 'PRODUCT_DELETED', 'PRODUCT_PRICE_LOCKED',
    'USER_CREATED', 'USER_UPDATED', 'USER_DELETED', 'USER_ROLE_CHANGED',
    'PO_APPROVED', 'PO_CANCELLED',
    'REQUISITION_APPROVED', 'REQUISITION_REJECTED'
  ];

  if (auditableEvents.includes(eventType)) {
    await createAuditLog(payload);
  }

  return payload;
}

/**
 * Create audit log entry
 */
async function createAuditLog(payload: EventPayload) {
  try {
    // In production, save to database
    console.log(`[Audit Log] ${payload.eventType}:`, {
      resource: payload.resourceType,
      resourceId: payload.resourceId,
      user: payload.userName,
      timestamp: payload.timestamp
    });
  } catch (error) {
    console.error('[Audit Log] Failed to create audit log:', error);
  }
}

// Pre-registered event handlers

// Stock alerts handler
onEvent('STOCK_LOW_ALERT', async (payload) => {
  console.log(`[Alert] Low stock warning for ${payload.resourceName} in ${payload.branchName}`);
  // Send notification to branch manager
  // Send email/SMS alert
});

onEvent('STOCK_OUT_ALERT', async (payload) => {
  console.log(`[Alert] Out of stock for ${payload.resourceName} in ${payload.branchName}`);
  // Urgent notification
  // Auto-create requisition if enabled
});

// Sales target handler
onEvent('SALES_TARGET_ACHIEVED', async (payload) => {
  console.log(`[Achievement] ${payload.branchName} has achieved sales target!`);
  // Send congratulations notification
});

onEvent('SALES_BELOW_TARGET', async (payload) => {
  console.log(`[Warning] ${payload.branchName} is below sales target`);
  // Send performance alert to HQ
});

// PO handlers
onEvent('PO_APPROVED', async (payload) => {
  console.log(`[PO] Purchase order ${payload.resourceId} approved`);
  // Notify supplier
  // Update inventory forecasting
});

// Export helper functions
export const EventTriggers = {
  branchCreated: (branch: any, userId: string, userName: string) =>
    emitEvent('BRANCH_CREATED', { resourceType: 'branch', resourceId: branch.id, resourceName: branch.name, data: branch, userId, userName }),

  branchUpdated: (branch: any, changes: any, userId: string, userName: string) =>
    emitEvent('BRANCH_UPDATED', { resourceType: 'branch', resourceId: branch.id, resourceName: branch.name, data: { branch, changes }, userId, userName }),

  productCreated: (product: any, userId: string, userName: string) =>
    emitEvent('PRODUCT_CREATED', { resourceType: 'product', resourceId: product.id, resourceName: product.name, data: product, userId, userName }),

  productPriceLocked: (product: any, userId: string, userName: string) =>
    emitEvent('PRODUCT_PRICE_LOCKED', { resourceType: 'product', resourceId: product.id, resourceName: product.name, data: product, userId, userName }),

  userCreated: (user: any, createdBy: string) =>
    emitEvent('USER_CREATED', { resourceType: 'user', resourceId: user.id, resourceName: user.name, data: { ...user, password: undefined }, userId: createdBy, userName: createdBy }),

  poApproved: (po: any, approvedBy: string, approverName: string) =>
    emitEvent('PO_APPROVED', { resourceType: 'purchase_order', resourceId: po.id, resourceName: po.poNumber, data: po, userId: approvedBy, userName: approverName }),

  stockLowAlert: (product: any, branch: any, currentStock: number, minStock: number) =>
    emitEvent('STOCK_LOW_ALERT', { resourceType: 'stock', resourceId: product.id, resourceName: product.name, data: { product, currentStock, minStock }, branchId: branch.id, branchName: branch.name }),

  stockOutAlert: (product: any, branch: any) =>
    emitEvent('STOCK_OUT_ALERT', { resourceType: 'stock', resourceId: product.id, resourceName: product.name, data: { product }, branchId: branch.id, branchName: branch.name })
};

export default EventTriggers;
