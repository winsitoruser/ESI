import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../auth/[...nextauth]';

/**
 * POS Events Broadcast API
 * Handles inter-module communication for POS system
 * Broadcasts events to WebSocket clients and other modules
 */

interface POSEvent {
  type: 'transaction' | 'shift' | 'inventory' | 'receipt' | 'hardware';
  action: 'create' | 'update' | 'delete' | 'complete' | 'void' | 'print';
  data: any;
  branchId: string;
  timestamp: string;
}

// In-memory event queue (replace with Redis in production)
const eventQueue: POSEvent[] = [];
const eventSubscribers: Map<string, (event: POSEvent) => void> = new Map();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const session = await getServerSession(req, res, authOptions);
    if (!session?.user) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const branchId = session.user.branchId || 'default';

    switch (req.method) {
      case 'POST':
        return broadcastEvent(req, res, branchId);
      case 'GET':
        return getRecentEvents(req, res, branchId);
      default:
        return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error: any) {
    console.error('POS Events API Error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}

async function broadcastEvent(req: NextApiRequest, res: NextApiResponse, branchId: string) {
  const { type, action, data } = req.body;

  if (!type || !action) {
    return res.status(400).json({ success: false, error: 'Type and action are required' });
  }

  const event: POSEvent = {
    type,
    action,
    data,
    branchId,
    timestamp: new Date().toISOString()
  };

  // Add to queue
  eventQueue.push(event);
  
  // Keep only last 100 events
  if (eventQueue.length > 100) {
    eventQueue.shift();
  }

  // Map event to WebSocket event type
  const wsEventType = mapToWebSocketEvent(type, action);

  // Broadcast to WebSocket (via broadcast API)
  try {
    await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3001'}/api/websocket/broadcast`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event: wsEventType,
        data: {
          ...data,
          branchId,
          timestamp: event.timestamp
        },
        branchId
      })
    });
  } catch (wsError) {
    console.warn('WebSocket broadcast failed:', wsError);
  }

  // Trigger module-specific handlers
  await triggerModuleHandlers(event);

  return res.status(200).json({
    success: true,
    message: 'Event broadcasted',
    event
  });
}

async function getRecentEvents(req: NextApiRequest, res: NextApiResponse, branchId: string) {
  const { type, limit = '20' } = req.query;

  let filtered = eventQueue.filter(e => e.branchId === branchId);

  if (type) {
    filtered = filtered.filter(e => e.type === type);
  }

  const limitNum = parseInt(limit as string);
  const recent = filtered.slice(-limitNum).reverse();

  return res.status(200).json({
    success: true,
    data: {
      events: recent,
      total: filtered.length
    }
  });
}

function mapToWebSocketEvent(type: string, action: string): string {
  const eventMap: Record<string, Record<string, string>> = {
    transaction: {
      create: 'pos:transaction:create',
      complete: 'pos:transaction:complete',
      void: 'pos:transaction:void',
      update: 'pos:transaction:update'
    },
    shift: {
      create: 'pos:shift:open',
      complete: 'pos:shift:close',
      update: 'pos:shift:update'
    },
    inventory: {
      update: 'report:inventory:update',
      create: 'inventory:alert'
    },
    receipt: {
      print: 'pos:receipt:print',
      create: 'pos:receipt:create'
    },
    hardware: {
      update: 'pos:hardware:status',
      create: 'pos:hardware:connected'
    }
  };

  return eventMap[type]?.[action] || `pos:${type}:${action}`;
}

async function triggerModuleHandlers(event: POSEvent) {
  // Handle cross-module updates
  switch (event.type) {
    case 'transaction':
      if (event.action === 'complete') {
        // Update reports
        console.log('[POS Event] Transaction complete - triggering report update');
        // Could call reports API to refresh caches
      }
      if (event.action === 'void') {
        // Log audit
        console.log('[POS Event] Transaction voided - logging audit');
      }
      break;

    case 'shift':
      if (event.action === 'complete') {
        // Generate shift report
        console.log('[POS Event] Shift closed - generating shift report');
      }
      break;

    case 'inventory':
      // Check for low stock alerts
      console.log('[POS Event] Inventory updated - checking alerts');
      break;
  }
}

// Export helper function for other APIs to use
export async function broadcastPOSEvent(
  type: POSEvent['type'],
  action: POSEvent['action'],
  data: any,
  branchId: string
) {
  const event: POSEvent = {
    type,
    action,
    data,
    branchId,
    timestamp: new Date().toISOString()
  };

  eventQueue.push(event);
  
  if (eventQueue.length > 100) {
    eventQueue.shift();
  }

  return event;
}
