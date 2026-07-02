/**
 * WebSocket Server for Real-time Kitchen Display
 * 
 * Events:
 * - kitchen:order:new - New order received
 * - kitchen:order:update - Order status changed
 * - kitchen:order:complete - Order completed
 * - table:status:change - Table status changed
 * - inventory:alert - Low stock alert
 */

import { Server as HTTPServer } from 'http';

// WebSocket event types
export type WebSocketEventType = 
  | 'kitchen:order:new'
  | 'kitchen:order:update'
  | 'kitchen:order:complete'
  | 'kitchen:order:cancel'
  | 'table:status:change'
  | 'inventory:alert'
  | 'notification:new'
  | 'branch:metrics:update';

export interface WebSocketMessage {
  event: WebSocketEventType;
  data: any;
  branchId?: string;
  timestamp: string;
}

export interface WebSocketClient {
  id: string;
  branchId: string;
  role: string;
  subscriptions: WebSocketEventType[];
  lastPing: number;
}

// In-memory client store
const clients: Map<string, WebSocketClient> = new Map();
const clientSockets: Map<string, any> = new Map();

// Initialize WebSocket server
export function initWebSocketServer(server: HTTPServer) {
  // Dynamic import for ws module
  const WebSocket = require('ws');
  const wss = new WebSocket.Server({ server, path: '/ws' });

  console.log('[WebSocket] Server initialized on /ws');

  wss.on('connection', (ws: any, req: any) => {
    const clientId = generateClientId();
    const urlParams = new URL(req.url, 'http://localhost').searchParams;
    const branchId = urlParams.get('branchId') || 'default';
    const role = urlParams.get('role') || 'guest';

    // Register client
    const client: WebSocketClient = {
      id: clientId,
      branchId,
      role,
      subscriptions: ['kitchen:order:new', 'kitchen:order:update', 'kitchen:order:complete'],
      lastPing: Date.now()
    };

    clients.set(clientId, client);
    clientSockets.set(clientId, ws);

    console.log(`[WebSocket] Client connected: ${clientId} (branch: ${branchId}, role: ${role})`);

    // Send welcome message
    ws.send(JSON.stringify({
      event: 'connection:established',
      data: { clientId, branchId, role },
      timestamp: new Date().toISOString()
    }));

    // Handle incoming messages
    ws.on('message', (message: string) => {
      try {
        const parsed = JSON.parse(message);
        handleClientMessage(clientId, parsed);
      } catch (error) {
        console.error('[WebSocket] Error parsing message:', error);
      }
    });

    // Handle ping/pong for keep-alive
    ws.on('pong', () => {
      const client = clients.get(clientId);
      if (client) {
        client.lastPing = Date.now();
      }
    });

    // Handle disconnect
    ws.on('close', () => {
      console.log(`[WebSocket] Client disconnected: ${clientId}`);
      clients.delete(clientId);
      clientSockets.delete(clientId);
    });

    // Handle errors
    ws.on('error', (error: any) => {
      console.error(`[WebSocket] Client error (${clientId}):`, error);
    });
  });

  // Ping clients every 30 seconds to keep connections alive
  setInterval(() => {
    clientSockets.forEach((ws, clientId) => {
      if (ws.readyState === 1) { // WebSocket.OPEN
        ws.ping();
      }
    });
  }, 30000);

  // Clean up stale connections every minute
  setInterval(() => {
    const now = Date.now();
    clients.forEach((client, clientId) => {
      if (now - client.lastPing > 120000) { // 2 minutes timeout
        console.log(`[WebSocket] Removing stale client: ${clientId}`);
        const ws = clientSockets.get(clientId);
        if (ws) {
          ws.terminate();
        }
        clients.delete(clientId);
        clientSockets.delete(clientId);
      }
    });
  }, 60000);

  return wss;
}

// Handle client messages
function handleClientMessage(clientId: string, message: any) {
  const client = clients.get(clientId);
  if (!client) return;

  switch (message.type) {
    case 'subscribe':
      if (Array.isArray(message.events)) {
        client.subscriptions = [...new Set([...client.subscriptions, ...message.events])];
        console.log(`[WebSocket] Client ${clientId} subscribed to:`, message.events);
      }
      break;

    case 'unsubscribe':
      if (Array.isArray(message.events)) {
        client.subscriptions = client.subscriptions.filter(e => !message.events.includes(e));
        console.log(`[WebSocket] Client ${clientId} unsubscribed from:`, message.events);
      }
      break;

    case 'ping':
      const ws = clientSockets.get(clientId);
      if (ws) {
        ws.send(JSON.stringify({ type: 'pong', timestamp: new Date().toISOString() }));
      }
      break;

    default:
      console.log(`[WebSocket] Unknown message type from ${clientId}:`, message.type);
  }
}

// Broadcast message to all clients in a branch
export function broadcastToBranch(branchId: string, message: WebSocketMessage) {
  let sentCount = 0;

  clients.forEach((client, clientId) => {
    if (client.branchId === branchId && client.subscriptions.includes(message.event)) {
      const ws = clientSockets.get(clientId);
      if (ws && ws.readyState === 1) {
        ws.send(JSON.stringify(message));
        sentCount++;
      }
    }
  });

  console.log(`[WebSocket] Broadcast ${message.event} to ${sentCount} clients in branch ${branchId}`);
  return sentCount;
}

// Broadcast message to all clients
export function broadcastToAll(message: WebSocketMessage) {
  let sentCount = 0;

  clients.forEach((client, clientId) => {
    if (client.subscriptions.includes(message.event)) {
      const ws = clientSockets.get(clientId);
      if (ws && ws.readyState === 1) {
        ws.send(JSON.stringify(message));
        sentCount++;
      }
    }
  });

  console.log(`[WebSocket] Broadcast ${message.event} to ${sentCount} clients`);
  return sentCount;
}

// Send message to specific client
export function sendToClient(clientId: string, message: WebSocketMessage) {
  const ws = clientSockets.get(clientId);
  if (ws && ws.readyState === 1) {
    ws.send(JSON.stringify(message));
    return true;
  }
  return false;
}

// Get connected clients info
export function getConnectedClients() {
  return Array.from(clients.values()).map(c => ({
    id: c.id,
    branchId: c.branchId,
    role: c.role,
    subscriptions: c.subscriptions,
    lastPing: new Date(c.lastPing).toISOString()
  }));
}

// Get client count per branch
export function getClientCountByBranch() {
  const counts: Record<string, number> = {};
  clients.forEach(client => {
    counts[client.branchId] = (counts[client.branchId] || 0) + 1;
  });
  return counts;
}

// Generate unique client ID
function generateClientId(): string {
  return `ws_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

// Export for use in API routes
export { clients, clientSockets };
