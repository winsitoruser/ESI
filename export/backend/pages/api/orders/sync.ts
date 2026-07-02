import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';

/**
 * Order Synchronization API
 * Handles real-time sync between online platforms, POS, and kitchen
 */

// Sync status tracking
interface SyncStatus {
  platform: string;
  lastSync: string;
  status: 'connected' | 'disconnected' | 'error';
  pendingOrders: number;
  syncedOrders: number;
  errorCount: number;
  lastError?: string;
}

// Mock sync status for each platform
const platformSyncStatus: Record<string, SyncStatus> = {
  gofood: {
    platform: 'gofood',
    lastSync: new Date(Date.now() - 30000).toISOString(),
    status: 'connected',
    pendingOrders: 0,
    syncedOrders: 145,
    errorCount: 0
  },
  grabfood: {
    platform: 'grabfood',
    lastSync: new Date(Date.now() - 45000).toISOString(),
    status: 'connected',
    pendingOrders: 1,
    syncedOrders: 132,
    errorCount: 0
  },
  shopeefood: {
    platform: 'shopeefood',
    lastSync: new Date(Date.now() - 60000).toISOString(),
    status: 'connected',
    pendingOrders: 0,
    syncedOrders: 98,
    errorCount: 0
  },
  tokopedia: {
    platform: 'tokopedia',
    lastSync: new Date(Date.now() - 120000).toISOString(),
    status: 'connected',
    pendingOrders: 2,
    syncedOrders: 45,
    errorCount: 1,
    lastError: 'Rate limit exceeded - retrying in 60s'
  },
  shopee: {
    platform: 'shopee',
    lastSync: new Date(Date.now() - 90000).toISOString(),
    status: 'connected',
    pendingOrders: 0,
    syncedOrders: 67,
    errorCount: 0
  }
};

// Sync actions
interface SyncAction {
  id: string;
  type: 'order_created' | 'order_updated' | 'status_changed' | 'payment_updated';
  platform: string;
  orderId: string;
  timestamp: string;
  status: 'pending' | 'synced' | 'failed';
  retryCount: number;
  data?: any;
}

// Mock sync queue
let syncQueue: SyncAction[] = [];

// Initialize mock sync queue
function initializeSyncQueue() {
  if (syncQueue.length > 0) return;
  
  const now = Date.now();
  const platforms = ['gofood', 'grabfood', 'shopeefood'];
  const types: SyncAction['type'][] = ['order_created', 'status_changed', 'payment_updated'];
  
  for (let i = 0; i < 5; i++) {
    syncQueue.push({
      id: `sync-${now}-${i}`,
      type: types[Math.floor(Math.random() * types.length)],
      platform: platforms[Math.floor(Math.random() * platforms.length)],
      orderId: `ORD-${now}-${i}`,
      timestamp: new Date(now - i * 60000).toISOString(),
      status: i === 0 ? 'pending' : 'synced',
      retryCount: 0
    });
  }
}

// Perform sync for a platform
async function performSync(platform: string): Promise<{ success: boolean; synced: number; errors: number }> {
  // Simulate sync process
  const syncStatus = platformSyncStatus[platform];
  if (!syncStatus) {
    return { success: false, synced: 0, errors: 1 };
  }
  
  // Simulate some processing time
  await new Promise(resolve => setTimeout(resolve, 100));
  
  // Update sync status
  const pendingCount = syncStatus.pendingOrders;
  syncStatus.lastSync = new Date().toISOString();
  syncStatus.syncedOrders += pendingCount;
  syncStatus.pendingOrders = 0;
  
  return { success: true, synced: pendingCount, errors: 0 };
}

// Sync order to kitchen
async function syncToKitchen(orderId: string, action: string): Promise<boolean> {
  console.log(`[Kitchen Sync] Order ${orderId} - ${action}`);
  // In production, this would:
  // 1. Create/update kitchen order
  // 2. Send WebSocket notification to kitchen displays
  // 3. Update order timestamps
  return true;
}

// Notify platform of status change
async function notifyPlatformStatus(platform: string, orderId: string, status: string): Promise<boolean> {
  console.log(`[Platform Notify] ${platform} - Order ${orderId} -> ${status}`);
  // In production, this would call the platform's API to update order status
  return true;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const session = await getServerSession(req, res, authOptions);
    if (!session?.user) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    initializeSyncQueue();

    // GET - Get sync status
    if (req.method === 'GET') {
      const { platform, type } = req.query;

      if (type === 'status') {
        // Return sync status for all or specific platform
        if (platform && platform !== 'all') {
          const status = platformSyncStatus[platform as string];
          if (!status) {
            return res.status(404).json({ success: false, error: 'Platform not found' });
          }
          return res.status(200).json({ success: true, data: status });
        }

        return res.status(200).json({
          success: true,
          data: platformSyncStatus,
          summary: {
            totalConnected: Object.values(platformSyncStatus).filter(s => s.status === 'connected').length,
            totalPending: Object.values(platformSyncStatus).reduce((acc, s) => acc + s.pendingOrders, 0),
            totalSynced: Object.values(platformSyncStatus).reduce((acc, s) => acc + s.syncedOrders, 0),
            totalErrors: Object.values(platformSyncStatus).reduce((acc, s) => acc + s.errorCount, 0)
          }
        });
      }

      if (type === 'queue') {
        // Return sync queue
        let queue = syncQueue;
        if (platform && platform !== 'all') {
          queue = queue.filter(q => q.platform === platform);
        }
        
        return res.status(200).json({
          success: true,
          data: queue,
          stats: {
            pending: queue.filter(q => q.status === 'pending').length,
            synced: queue.filter(q => q.status === 'synced').length,
            failed: queue.filter(q => q.status === 'failed').length
          }
        });
      }

      // Default: return both status and recent queue
      return res.status(200).json({
        success: true,
        data: {
          platformStatus: platformSyncStatus,
          recentSync: syncQueue.slice(0, 10)
        }
      });
    }

    // POST - Trigger sync actions
    if (req.method === 'POST') {
      const { action, platform, orderId, status, data } = req.body;

      switch (action) {
        case 'sync_platform': {
          // Manually trigger sync for a platform
          if (!platform) {
            return res.status(400).json({ success: false, error: 'Platform required' });
          }
          
          const result = await performSync(platform);
          return res.status(200).json({
            success: true,
            message: `Sync completed for ${platform}`,
            data: result
          });
        }

        case 'sync_all': {
          // Sync all platforms
          const results: Record<string, any> = {};
          for (const p of Object.keys(platformSyncStatus)) {
            results[p] = await performSync(p);
          }
          
          return res.status(200).json({
            success: true,
            message: 'All platforms synced',
            data: results
          });
        }

        case 'sync_to_kitchen': {
          // Sync specific order to kitchen
          if (!orderId) {
            return res.status(400).json({ success: false, error: 'Order ID required' });
          }
          
          const kitchenResult = await syncToKitchen(orderId, status || 'create');
          
          // Add to sync queue
          syncQueue.unshift({
            id: `sync-${Date.now()}`,
            type: 'order_created',
            platform: platform || 'pos',
            orderId,
            timestamp: new Date().toISOString(),
            status: kitchenResult ? 'synced' : 'failed',
            retryCount: 0
          });
          
          return res.status(200).json({
            success: kitchenResult,
            message: kitchenResult ? 'Order synced to kitchen' : 'Failed to sync to kitchen'
          });
        }

        case 'notify_platform': {
          // Notify platform of status change
          if (!platform || !orderId || !status) {
            return res.status(400).json({ success: false, error: 'Platform, order ID, and status required' });
          }
          
          const notifyResult = await notifyPlatformStatus(platform, orderId, status);
          
          // Add to sync queue
          syncQueue.unshift({
            id: `sync-${Date.now()}`,
            type: 'status_changed',
            platform,
            orderId,
            timestamp: new Date().toISOString(),
            status: notifyResult ? 'synced' : 'failed',
            retryCount: 0,
            data: { newStatus: status }
          });
          
          return res.status(200).json({
            success: notifyResult,
            message: notifyResult ? 'Platform notified' : 'Failed to notify platform'
          });
        }

        case 'retry_failed': {
          // Retry failed sync actions
          const failedActions = syncQueue.filter(q => q.status === 'failed' && q.retryCount < 3);
          let retried = 0;
          
          for (const action of failedActions) {
            action.retryCount++;
            // Simulate retry
            action.status = Math.random() > 0.3 ? 'synced' : 'failed';
            retried++;
          }
          
          return res.status(200).json({
            success: true,
            message: `Retried ${retried} failed actions`,
            data: { retried, remaining: syncQueue.filter(q => q.status === 'failed').length }
          });
        }

        default:
          return res.status(400).json({ success: false, error: 'Invalid action' });
      }
    }

    return res.status(405).json({ success: false, error: 'Method not allowed' });

  } catch (error: any) {
    console.error('Sync API error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message
    });
  }
}
