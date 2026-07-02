import type { NextApiRequest, NextApiResponse } from 'next';

/**
 * E-commerce Integration API
 * Manages connections with Tokopedia, Shopee, and other marketplaces
 */

interface EcommercePlatform {
  id: string;
  name: string;
  slug: string;
  status: 'active' | 'pending' | 'inactive' | 'error';
  connectedStores: number;
  totalProducts: number;
  syncedProducts: number;
  totalOrders: number;
  totalRevenue: number;
  lastSync: string;
  features: string[];
}

interface StoreConnection {
  id: string;
  platformId: string;
  branchId: string;
  branchName: string;
  storeId: string;
  storeName: string;
  storeUrl: string;
  status: 'active' | 'pending' | 'inactive' | 'suspended';
  productSync: boolean;
  stockSync: boolean;
  orderSync: boolean;
  priceSync: boolean;
  lastProductSync: string | null;
  lastStockSync: string | null;
  lastOrderSync: string | null;
  totalProducts: number;
  syncedProducts: number;
  pendingOrders: number;
}

// Mock platforms
const platforms: EcommercePlatform[] = [
  {
    id: 'tokopedia',
    name: 'Tokopedia',
    slug: 'tokopedia',
    status: 'active',
    connectedStores: 3,
    totalProducts: 1250,
    syncedProducts: 1180,
    totalOrders: 4520,
    totalRevenue: 1850000000,
    lastSync: new Date().toISOString(),
    features: ['Product Sync', 'Stock Sync', 'Order Sync', 'Price Sync', 'Promo Sync']
  },
  {
    id: 'shopee',
    name: 'Shopee',
    slug: 'shopee',
    status: 'active',
    connectedStores: 2,
    totalProducts: 980,
    syncedProducts: 950,
    totalOrders: 3280,
    totalRevenue: 1250000000,
    lastSync: new Date().toISOString(),
    features: ['Product Sync', 'Stock Sync', 'Order Sync', 'Flash Sale', 'Voucher Sync']
  },
  {
    id: 'lazada',
    name: 'Lazada',
    slug: 'lazada',
    status: 'pending',
    connectedStores: 0,
    totalProducts: 0,
    syncedProducts: 0,
    totalOrders: 0,
    totalRevenue: 0,
    lastSync: '',
    features: ['Product Sync', 'Stock Sync', 'Order Sync']
  },
  {
    id: 'blibli',
    name: 'Blibli',
    slug: 'blibli',
    status: 'inactive',
    connectedStores: 0,
    totalProducts: 0,
    syncedProducts: 0,
    totalOrders: 0,
    totalRevenue: 0,
    lastSync: '',
    features: ['Product Sync', 'Stock Sync', 'Order Sync', 'Official Store']
  }
];

// Mock store connections
const storeConnections: StoreConnection[] = [
  {
    id: 'conn-1',
    platformId: 'tokopedia',
    branchId: '1',
    branchName: 'Cabang Pusat Jakarta',
    storeId: 'tokopedia-official-001',
    storeName: 'Bedagang Official Store',
    storeUrl: 'https://tokopedia.com/bedagang',
    status: 'active',
    productSync: true,
    stockSync: true,
    orderSync: true,
    priceSync: true,
    lastProductSync: new Date(Date.now() - 3600000).toISOString(),
    lastStockSync: new Date(Date.now() - 1800000).toISOString(),
    lastOrderSync: new Date(Date.now() - 300000).toISOString(),
    totalProducts: 850,
    syncedProducts: 820,
    pendingOrders: 12
  },
  {
    id: 'conn-2',
    platformId: 'tokopedia',
    branchId: '2',
    branchName: 'Cabang Bandung',
    storeId: 'tokopedia-bdg-001',
    storeName: 'Bedagang Bandung',
    storeUrl: 'https://tokopedia.com/bedagang-bandung',
    status: 'active',
    productSync: true,
    stockSync: true,
    orderSync: true,
    priceSync: false,
    lastProductSync: new Date(Date.now() - 7200000).toISOString(),
    lastStockSync: new Date(Date.now() - 3600000).toISOString(),
    lastOrderSync: new Date(Date.now() - 600000).toISOString(),
    totalProducts: 400,
    syncedProducts: 360,
    pendingOrders: 5
  },
  {
    id: 'conn-3',
    platformId: 'shopee',
    branchId: '1',
    branchName: 'Cabang Pusat Jakarta',
    storeId: 'shopee-official-001',
    storeName: 'Bedagang Mall',
    storeUrl: 'https://shopee.co.id/bedagang_mall',
    status: 'active',
    productSync: true,
    stockSync: true,
    orderSync: true,
    priceSync: true,
    lastProductSync: new Date(Date.now() - 5400000).toISOString(),
    lastStockSync: new Date(Date.now() - 2700000).toISOString(),
    lastOrderSync: new Date(Date.now() - 450000).toISOString(),
    totalProducts: 650,
    syncedProducts: 630,
    pendingOrders: 8
  },
  {
    id: 'conn-4',
    platformId: 'shopee',
    branchId: '3',
    branchName: 'Cabang Surabaya',
    storeId: 'shopee-sby-001',
    storeName: 'Bedagang Surabaya',
    storeUrl: 'https://shopee.co.id/bedagang_surabaya',
    status: 'active',
    productSync: true,
    stockSync: true,
    orderSync: true,
    priceSync: true,
    lastProductSync: new Date(Date.now() - 10800000).toISOString(),
    lastStockSync: new Date(Date.now() - 5400000).toISOString(),
    lastOrderSync: new Date(Date.now() - 900000).toISOString(),
    totalProducts: 330,
    syncedProducts: 320,
    pendingOrders: 3
  }
];

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  
  try {
    switch (req.method) {
      case 'GET':
        return getPlatforms(req, res);
      case 'POST':
        return connectStore(req, res);
      case 'PUT':
        return updateConnection(req, res);
      default:
        return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error: any) {
    console.error('E-commerce API Error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

function getPlatforms(req: NextApiRequest, res: NextApiResponse) {
  const { platformId, branchId, includeStats } = req.query;

  let filteredPlatforms = [...platforms];
  let filteredConnections = [...storeConnections];

  if (platformId) {
    filteredPlatforms = filteredPlatforms.filter(p => p.id === platformId);
    filteredConnections = filteredConnections.filter(c => c.platformId === platformId);
  }

  if (branchId) {
    filteredConnections = filteredConnections.filter(c => c.branchId === branchId);
  }

  const summary = {
    totalPlatforms: platforms.length,
    activePlatforms: platforms.filter(p => p.status === 'active').length,
    totalStores: storeConnections.length,
    activeStores: storeConnections.filter(c => c.status === 'active').length,
    totalProducts: platforms.reduce((sum, p) => sum + p.totalProducts, 0),
    syncedProducts: platforms.reduce((sum, p) => sum + p.syncedProducts, 0),
    pendingOrders: storeConnections.reduce((sum, c) => sum + c.pendingOrders, 0),
    totalRevenue: platforms.reduce((sum, p) => sum + p.totalRevenue, 0)
  };

  return res.status(200).json({
    success: true,
    platforms: filteredPlatforms,
    connections: filteredConnections,
    summary: includeStats === 'true' ? summary : undefined
  });
}

function connectStore(req: NextApiRequest, res: NextApiResponse) {
  const { platformId, branchId, storeId, storeName, credentials } = req.body;

  if (!platformId || !branchId || !storeId) {
    return res.status(400).json({ error: 'Platform ID, Branch ID, and Store ID are required' });
  }

  const newConnection: StoreConnection = {
    id: `conn-${Date.now()}`,
    platformId,
    branchId,
    branchName: `Branch ${branchId}`,
    storeId,
    storeName: storeName || `Store ${storeId}`,
    storeUrl: '',
    status: 'pending',
    productSync: false,
    stockSync: false,
    orderSync: false,
    priceSync: false,
    lastProductSync: null,
    lastStockSync: null,
    lastOrderSync: null,
    totalProducts: 0,
    syncedProducts: 0,
    pendingOrders: 0
  };

  storeConnections.push(newConnection);

  return res.status(201).json({
    success: true,
    connection: newConnection,
    message: 'Store connection initiated. Please verify credentials.'
  });
}

function updateConnection(req: NextApiRequest, res: NextApiResponse) {
  const { connectionId, action, settings } = req.body;

  const connIndex = storeConnections.findIndex(c => c.id === connectionId);
  if (connIndex === -1) {
    return res.status(404).json({ error: 'Connection not found' });
  }

  const connection = storeConnections[connIndex];

  switch (action) {
    case 'activate':
      connection.status = 'active';
      break;
    case 'deactivate':
      connection.status = 'inactive';
      break;
    case 'sync_products':
      connection.lastProductSync = new Date().toISOString();
      return res.status(200).json({
        success: true,
        message: 'Product sync initiated',
        syncId: `PSYNC-${Date.now()}`
      });
    case 'sync_stock':
      connection.lastStockSync = new Date().toISOString();
      return res.status(200).json({
        success: true,
        message: 'Stock sync initiated',
        syncId: `SSYNC-${Date.now()}`
      });
    case 'sync_orders':
      connection.lastOrderSync = new Date().toISOString();
      return res.status(200).json({
        success: true,
        message: 'Order sync initiated',
        syncId: `OSYNC-${Date.now()}`
      });
    case 'update_settings':
      if (settings) {
        connection.productSync = settings.productSync ?? connection.productSync;
        connection.stockSync = settings.stockSync ?? connection.stockSync;
        connection.orderSync = settings.orderSync ?? connection.orderSync;
        connection.priceSync = settings.priceSync ?? connection.priceSync;
      }
      break;
    default:
      return res.status(400).json({ error: 'Invalid action' });
  }

  storeConnections[connIndex] = connection;

  return res.status(200).json({
    success: true,
    connection,
    message: 'Connection updated'
  });
}
