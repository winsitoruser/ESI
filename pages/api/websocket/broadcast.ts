import type { NextApiRequest, NextApiResponse } from 'next';

/**
 * API endpoint to broadcast WebSocket messages
 * Used by other API routes to trigger real-time updates
 */

interface BroadcastRequest {
  event: string;
  data: any;
  branchId?: string;
  targetClients?: string[];
}

// In-memory message queue for server-sent events fallback
const messageQueue: Map<string, any[]> = new Map();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'POST') {
    const { event, data, branchId, targetClients } = req.body as BroadcastRequest;

    if (!event) {
      return res.status(400).json({ error: 'Event type is required' });
    }

    const message = {
      event,
      data,
      branchId,
      timestamp: new Date().toISOString()
    };

    // Store message in queue for SSE fallback
    const queueKey = branchId || 'global';
    if (!messageQueue.has(queueKey)) {
      messageQueue.set(queueKey, []);
    }
    const queue = messageQueue.get(queueKey)!;
    queue.push(message);
    
    // Keep only last 100 messages per branch
    if (queue.length > 100) {
      queue.shift();
    }

    // In production, this would connect to WebSocket server
    // For now, we store in memory and return success
    console.log(`[Broadcast] ${event} to ${branchId || 'all'}`);

    return res.status(200).json({
      success: true,
      message: 'Broadcast queued',
      event,
      branchId,
      timestamp: message.timestamp
    });
  }

  if (req.method === 'GET') {
    // SSE fallback endpoint for clients that don't support WebSocket
    const { branchId, since } = req.query;
    const queueKey = (branchId as string) || 'global';
    const queue = messageQueue.get(queueKey) || [];

    // Filter messages since timestamp if provided
    let messages = queue;
    if (since) {
      const sinceTime = new Date(since as string).getTime();
      messages = queue.filter(m => new Date(m.timestamp).getTime() > sinceTime);
    }

    return res.status(200).json({
      success: true,
      messages,
      count: messages.length
    });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}

// Helper function to broadcast from other API routes
export async function broadcastEvent(event: string, data: any, branchId?: string) {
  const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3001';
  
  try {
    await fetch(`${baseUrl}/api/websocket/broadcast`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event, data, branchId })
    });
    return true;
  } catch (error) {
    console.error('[Broadcast] Error:', error);
    return false;
  }
}
