import type { NextApiRequest, NextApiResponse } from 'next';

// Webhook event types
export type WebhookEventType = 
  | 'branch.created' | 'branch.updated' | 'branch.deleted'
  | 'product.created' | 'product.updated' | 'product.deleted' | 'product.price_changed'
  | 'user.created' | 'user.updated' | 'user.deleted' | 'user.role_changed'
  | 'order.created' | 'order.approved' | 'order.completed' | 'order.cancelled'
  | 'stock.low' | 'stock.out' | 'stock.adjusted'
  | 'transaction.completed' | 'transaction.voided' | 'transaction.refunded';

interface WebhookConfig {
  id: string;
  name: string;
  url: string;
  events: WebhookEventType[];
  secret: string;
  isActive: boolean;
  createdAt: string;
  lastTriggered: string | null;
  successCount: number;
  failureCount: number;
}

// In-memory webhook storage (use database in production)
const webhooks: WebhookConfig[] = [
  {
    id: '1',
    name: 'Inventory Alert System',
    url: 'https://example.com/webhooks/inventory',
    events: ['stock.low', 'stock.out'],
    secret: 'whsec_inventory_123',
    isActive: true,
    createdAt: '2024-01-15',
    lastTriggered: '2026-02-22T06:00:00Z',
    successCount: 145,
    failureCount: 2
  },
  {
    id: '2',
    name: 'Sales Dashboard',
    url: 'https://example.com/webhooks/sales',
    events: ['transaction.completed', 'transaction.voided'],
    secret: 'whsec_sales_456',
    isActive: true,
    createdAt: '2024-02-01',
    lastTriggered: '2026-02-22T06:30:00Z',
    successCount: 2340,
    failureCount: 5
  }
];

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    switch (req.method) {
      case 'GET':
        return getWebhooks(req, res);
      case 'POST':
        return createWebhook(req, res);
      default:
        res.setHeader('Allow', ['GET', 'POST']);
        return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
    }
  } catch (error) {
    console.error('Webhook API Error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

function getWebhooks(req: NextApiRequest, res: NextApiResponse) {
  return res.status(200).json({ webhooks });
}

function createWebhook(req: NextApiRequest, res: NextApiResponse) {
  const { name, url, events } = req.body;

  if (!name || !url || !events || events.length === 0) {
    return res.status(400).json({ error: 'Name, URL, and events are required' });
  }

  const newWebhook: WebhookConfig = {
    id: Date.now().toString(),
    name,
    url,
    events,
    secret: `whsec_${Math.random().toString(36).substring(2, 15)}`,
    isActive: true,
    createdAt: new Date().toISOString(),
    lastTriggered: null,
    successCount: 0,
    failureCount: 0
  };

  webhooks.push(newWebhook);

  return res.status(201).json({ webhook: newWebhook, message: 'Webhook created successfully' });
}

// Webhook trigger function - export for use in other APIs
export async function triggerWebhook(eventType: WebhookEventType, payload: any) {
  const activeWebhooks = webhooks.filter(w => w.isActive && w.events.includes(eventType));

  const results = await Promise.allSettled(
    activeWebhooks.map(async (webhook) => {
      try {
        const response = await fetch(webhook.url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Webhook-Event': eventType,
            'X-Webhook-Signature': generateSignature(payload, webhook.secret),
            'X-Webhook-Timestamp': Date.now().toString()
          },
          body: JSON.stringify({
            event: eventType,
            timestamp: new Date().toISOString(),
            data: payload
          })
        });

        if (response.ok) {
          webhook.successCount++;
          webhook.lastTriggered = new Date().toISOString();
          return { webhookId: webhook.id, success: true };
        } else {
          webhook.failureCount++;
          return { webhookId: webhook.id, success: false, error: `HTTP ${response.status}` };
        }
      } catch (error: any) {
        webhook.failureCount++;
        return { webhookId: webhook.id, success: false, error: error.message };
      }
    })
  );

  return results;
}

function generateSignature(payload: any, secret: string): string {
  // In production, use crypto.createHmac('sha256', secret).update(JSON.stringify(payload)).digest('hex')
  return `sha256=${Buffer.from(JSON.stringify(payload) + secret).toString('base64').substring(0, 32)}`;
}
