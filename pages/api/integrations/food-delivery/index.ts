import type { NextApiRequest, NextApiResponse } from 'next';

/**
 * Unified Food Delivery Integration API
 * Manages connections with GoFood, GrabFood, and ShopeeFood
 */

interface FoodDeliveryPlatform {
  id: string;
  name: string;
  slug: string;
  status: 'active' | 'pending' | 'inactive' | 'error';
  apiVersion: string;
  webhookUrl: string;
  connectedBranches: number;
  totalOrders: number;
  totalRevenue: number;
  avgRating: number;
  completionRate: number;
  lastSync: string;
  credentials: {
    isConfigured: boolean;
    environment: 'sandbox' | 'production';
  };
}

interface BranchConnection {
  branchId: string;
  branchCode: string;
  branchName: string;
  platformId: string;
  storeId: string;
  storeName: string;
  status: 'active' | 'pending' | 'inactive' | 'suspended';
  autoAccept: boolean;
  menuSync: boolean;
  lastOrderAt: string | null;
  todayOrders: number;
  todayRevenue: number;
}

// Mock platform data
const platforms: FoodDeliveryPlatform[] = [
  {
    id: 'gofood',
    name: 'GoFood',
    slug: 'gofood',
    status: 'active',
    apiVersion: 'v3',
    webhookUrl: '/api/webhooks/gofood',
    connectedBranches: 8,
    totalOrders: 12450,
    totalRevenue: 875000000,
    avgRating: 4.8,
    completionRate: 96.5,
    lastSync: new Date().toISOString(),
    credentials: { isConfigured: true, environment: 'production' }
  },
  {
    id: 'grabfood',
    name: 'GrabFood',
    slug: 'grabfood',
    status: 'active',
    apiVersion: 'v2',
    webhookUrl: '/api/webhooks/grabfood',
    connectedBranches: 6,
    totalOrders: 8750,
    totalRevenue: 625000000,
    avgRating: 4.7,
    completionRate: 95.2,
    lastSync: new Date().toISOString(),
    credentials: { isConfigured: true, environment: 'production' }
  },
  {
    id: 'shopeefood',
    name: 'ShopeeFood',
    slug: 'shopeefood',
    status: 'active',
    apiVersion: 'v1',
    webhookUrl: '/api/webhooks/shopeefood',
    connectedBranches: 4,
    totalOrders: 3250,
    totalRevenue: 245000000,
    avgRating: 4.6,
    completionRate: 94.8,
    lastSync: new Date().toISOString(),
    credentials: { isConfigured: true, environment: 'production' }
  }
];

// Mock branch connections
const branchConnections: BranchConnection[] = [
  // GoFood connections
  { branchId: '1', branchCode: 'HQ-001', branchName: 'Cabang Pusat Jakarta', platformId: 'gofood', storeId: 'GFOOD-HQ-001', storeName: 'Bedagang Pusat', status: 'active', autoAccept: true, menuSync: true, lastOrderAt: new Date().toISOString(), todayOrders: 45, todayRevenue: 3150000 },
  { branchId: '2', branchCode: 'BR-002', branchName: 'Cabang Bandung', platformId: 'gofood', storeId: 'GFOOD-BDG-001', storeName: 'Bedagang Bandung', status: 'active', autoAccept: true, menuSync: true, lastOrderAt: new Date().toISOString(), todayOrders: 32, todayRevenue: 2240000 },
  { branchId: '3', branchCode: 'BR-003', branchName: 'Cabang Surabaya', platformId: 'gofood', storeId: 'GFOOD-SBY-001', storeName: 'Bedagang Surabaya', status: 'active', autoAccept: true, menuSync: true, lastOrderAt: new Date().toISOString(), todayOrders: 28, todayRevenue: 1960000 },
  
  // GrabFood connections
  { branchId: '1', branchCode: 'HQ-001', branchName: 'Cabang Pusat Jakarta', platformId: 'grabfood', storeId: 'GRAB-HQ-001', storeName: 'Bedagang Pusat', status: 'active', autoAccept: true, menuSync: true, lastOrderAt: new Date().toISOString(), todayOrders: 38, todayRevenue: 2660000 },
  { branchId: '2', branchCode: 'BR-002', branchName: 'Cabang Bandung', platformId: 'grabfood', storeId: 'GRAB-BDG-001', storeName: 'Bedagang Bandung', status: 'pending', autoAccept: false, menuSync: false, lastOrderAt: null, todayOrders: 0, todayRevenue: 0 },
  { branchId: '3', branchCode: 'BR-003', branchName: 'Cabang Surabaya', platformId: 'grabfood', storeId: 'GRAB-SBY-001', storeName: 'Bedagang Surabaya', status: 'active', autoAccept: true, menuSync: true, lastOrderAt: new Date().toISOString(), todayOrders: 25, todayRevenue: 1750000 },
  
  // ShopeeFood connections
  { branchId: '1', branchCode: 'HQ-001', branchName: 'Cabang Pusat Jakarta', platformId: 'shopeefood', storeId: 'SFOOD-HQ-001', storeName: 'Bedagang Pusat', status: 'active', autoAccept: true, menuSync: true, lastOrderAt: new Date().toISOString(), todayOrders: 22, todayRevenue: 1540000 },
  { branchId: '3', branchCode: 'BR-003', branchName: 'Cabang Surabaya', platformId: 'shopeefood', storeId: 'SFOOD-SBY-001', storeName: 'Bedagang Surabaya', status: 'active', autoAccept: true, menuSync: true, lastOrderAt: new Date().toISOString(), todayOrders: 15, todayRevenue: 1050000 }
];

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
  
  try {
    switch (req.method) {
      case 'GET':
        return getPlatforms(req, res);
      case 'POST':
        return connectPlatform(req, res);
      case 'PUT':
        return updatePlatform(req, res);
      default:
        res.setHeader('Allow', ['GET', 'POST', 'PUT']);
        return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error: any) {
    console.error('Food Delivery API Error:', error);
    return res.status(500).json({ error: 'Internal server error', message: error.message });
  }
}

function getPlatforms(req: NextApiRequest, res: NextApiResponse) {
  const { platformId, branchId, includeStats } = req.query;

  let filteredPlatforms = [...platforms];
  let filteredConnections = [...branchConnections];

  if (platformId) {
    filteredPlatforms = filteredPlatforms.filter(p => p.id === platformId);
    filteredConnections = filteredConnections.filter(c => c.platformId === platformId);
  }

  if (branchId) {
    filteredConnections = filteredConnections.filter(c => c.branchId === branchId);
  }

  // Calculate summary stats
  const summary = {
    totalPlatforms: platforms.length,
    activePlatforms: platforms.filter(p => p.status === 'active').length,
    totalConnections: branchConnections.length,
    activeConnections: branchConnections.filter(c => c.status === 'active').length,
    todayOrders: branchConnections.reduce((sum, c) => sum + c.todayOrders, 0),
    todayRevenue: branchConnections.reduce((sum, c) => sum + c.todayRevenue, 0),
    totalRevenue: platforms.reduce((sum, p) => sum + p.totalRevenue, 0),
    avgCompletionRate: platforms.reduce((sum, p) => sum + p.completionRate, 0) / platforms.length
  };

  return res.status(200).json({
    success: true,
    platforms: filteredPlatforms,
    connections: filteredConnections,
    summary: includeStats === 'true' ? summary : undefined
  });
}

function connectPlatform(req: NextApiRequest, res: NextApiResponse) {
  const { platformId, branchId, credentials, settings } = req.body;

  if (!platformId || !branchId) {
    return res.status(400).json({ error: 'Platform ID and Branch ID are required' });
  }

  // Validate platform
  const platform = platforms.find(p => p.id === platformId);
  if (!platform) {
    return res.status(404).json({ error: 'Platform not found' });
  }

  // Create new connection (mock)
  const newConnection: BranchConnection = {
    branchId,
    branchCode: `BR-${branchId.padStart(3, '0')}`,
    branchName: `Branch ${branchId}`,
    platformId,
    storeId: `${platformId.toUpperCase()}-BR-${branchId.padStart(3, '0')}`,
    storeName: `Bedagang Branch ${branchId}`,
    status: 'pending',
    autoAccept: settings?.autoAccept || false,
    menuSync: settings?.menuSync || false,
    lastOrderAt: null,
    todayOrders: 0,
    todayRevenue: 0
  };

  branchConnections.push(newConnection);

  return res.status(201).json({
    success: true,
    connection: newConnection,
    message: `Successfully initiated connection to ${platform.name}. Awaiting verification.`
  });
}

function updatePlatform(req: NextApiRequest, res: NextApiResponse) {
  const { connectionId, branchId, platformId, action, settings } = req.body;

  // Find the connection
  const connIndex = branchConnections.findIndex(c => 
    c.branchId === branchId && c.platformId === platformId
  );

  if (connIndex === -1) {
    return res.status(404).json({ error: 'Connection not found' });
  }

  const connection = branchConnections[connIndex];

  switch (action) {
    case 'activate':
      connection.status = 'active';
      break;
    case 'deactivate':
      connection.status = 'inactive';
      break;
    case 'update_settings':
      if (settings) {
        connection.autoAccept = settings.autoAccept ?? connection.autoAccept;
        connection.menuSync = settings.menuSync ?? connection.menuSync;
      }
      break;
    case 'sync_menu':
      // Trigger menu sync (mock)
      return res.status(200).json({
        success: true,
        message: 'Menu sync initiated',
        syncId: `SYNC-${Date.now()}`
      });
    default:
      return res.status(400).json({ error: 'Invalid action' });
  }

  branchConnections[connIndex] = connection;

  return res.status(200).json({
    success: true,
    connection,
    message: 'Connection updated successfully'
  });
}

// Export for use in other APIs
export { platforms, branchConnections };
