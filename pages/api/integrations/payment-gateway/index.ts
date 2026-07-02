import type { NextApiRequest, NextApiResponse } from 'next';

/**
 * Payment Gateway Integration API
 * Manages connections with Xendit, Midtrans, DOKU, etc.
 */

interface PaymentGateway {
  id: string;
  name: string;
  slug: string;
  status: 'active' | 'pending' | 'inactive' | 'error';
  environment: 'sandbox' | 'production';
  connectedBranches: number;
  enabledMethods: string[];
  totalTransactions: number;
  totalVolume: number;
  successRate: number;
  avgSettlementTime: string;
  lastTransaction: string;
  features: string[];
}

interface PaymentMethod {
  id: string;
  gatewayId: string;
  name: string;
  type: 'ewallet' | 'va' | 'qris' | 'card' | 'retail' | 'debit';
  enabled: boolean;
  fee: { type: 'fixed' | 'percentage'; value: number };
  minAmount: number;
  maxAmount: number;
  settlementTime: string;
  status: 'active' | 'maintenance' | 'disabled';
}

interface GatewayConfig {
  id: string;
  gatewayId: string;
  branchId: string | null;
  branchName: string;
  environment: 'sandbox' | 'production';
  merchantId: string;
  isDefault: boolean;
  enabledMethods: string[];
  webhookUrl: string;
  callbackUrl: string;
  status: 'active' | 'pending' | 'inactive';
  lastTestedAt: string;
  testResult: { success: boolean; latency?: number };
}

// Mock gateways
const gateways: PaymentGateway[] = [
  {
    id: 'midtrans',
    name: 'Midtrans',
    slug: 'midtrans',
    status: 'active',
    environment: 'production',
    connectedBranches: 5,
    enabledMethods: ['qris', 'gopay', 'shopeepay', 'bca_va', 'bni_va', 'bri_va', 'mandiri_va', 'credit_card'],
    totalTransactions: 15420,
    totalVolume: 2850000000,
    successRate: 98.5,
    avgSettlementTime: 'T+1',
    lastTransaction: new Date().toISOString(),
    features: ['QRIS', 'Virtual Account', 'E-Wallet', 'Credit Card', 'Recurring', 'Subscription']
  },
  {
    id: 'xendit',
    name: 'Xendit',
    slug: 'xendit',
    status: 'active',
    environment: 'production',
    connectedBranches: 3,
    enabledMethods: ['qris', 'ovo', 'dana', 'linkaja', 'bca_va', 'permata_va'],
    totalTransactions: 8750,
    totalVolume: 1250000000,
    successRate: 97.8,
    avgSettlementTime: 'T+1',
    lastTransaction: new Date().toISOString(),
    features: ['QRIS', 'Virtual Account', 'E-Wallet', 'Direct Debit', 'Disbursement']
  },
  {
    id: 'doku',
    name: 'DOKU',
    slug: 'doku',
    status: 'pending',
    environment: 'sandbox',
    connectedBranches: 0,
    enabledMethods: [],
    totalTransactions: 0,
    totalVolume: 0,
    successRate: 0,
    avgSettlementTime: 'T+1',
    lastTransaction: '',
    features: ['QRIS', 'Virtual Account', 'E-Wallet', 'Credit Card']
  }
];

// Mock payment methods
const paymentMethods: PaymentMethod[] = [
  // Midtrans methods
  { id: 'mt-qris', gatewayId: 'midtrans', name: 'QRIS', type: 'qris', enabled: true, fee: { type: 'percentage', value: 0.7 }, minAmount: 1000, maxAmount: 10000000, settlementTime: 'Instant', status: 'active' },
  { id: 'mt-gopay', gatewayId: 'midtrans', name: 'GoPay', type: 'ewallet', enabled: true, fee: { type: 'percentage', value: 2 }, minAmount: 1000, maxAmount: 20000000, settlementTime: 'T+1', status: 'active' },
  { id: 'mt-shopeepay', gatewayId: 'midtrans', name: 'ShopeePay', type: 'ewallet', enabled: true, fee: { type: 'percentage', value: 2 }, minAmount: 1000, maxAmount: 20000000, settlementTime: 'T+1', status: 'active' },
  { id: 'mt-bca-va', gatewayId: 'midtrans', name: 'BCA Virtual Account', type: 'va', enabled: true, fee: { type: 'fixed', value: 4000 }, minAmount: 10000, maxAmount: 999999999, settlementTime: 'Realtime', status: 'active' },
  { id: 'mt-bni-va', gatewayId: 'midtrans', name: 'BNI Virtual Account', type: 'va', enabled: true, fee: { type: 'fixed', value: 4000 }, minAmount: 10000, maxAmount: 999999999, settlementTime: 'Realtime', status: 'active' },
  { id: 'mt-cc', gatewayId: 'midtrans', name: 'Credit Card', type: 'card', enabled: true, fee: { type: 'percentage', value: 2.9 }, minAmount: 10000, maxAmount: 999999999, settlementTime: 'T+2', status: 'active' },
  
  // Xendit methods
  { id: 'xn-qris', gatewayId: 'xendit', name: 'QRIS', type: 'qris', enabled: true, fee: { type: 'percentage', value: 0.7 }, minAmount: 1000, maxAmount: 10000000, settlementTime: 'Instant', status: 'active' },
  { id: 'xn-ovo', gatewayId: 'xendit', name: 'OVO', type: 'ewallet', enabled: true, fee: { type: 'percentage', value: 2.5 }, minAmount: 1000, maxAmount: 10000000, settlementTime: 'T+1', status: 'active' },
  { id: 'xn-dana', gatewayId: 'xendit', name: 'DANA', type: 'ewallet', enabled: true, fee: { type: 'percentage', value: 1.5 }, minAmount: 1000, maxAmount: 10000000, settlementTime: 'T+1', status: 'active' },
  { id: 'xn-bca-va', gatewayId: 'xendit', name: 'BCA Virtual Account', type: 'va', enabled: true, fee: { type: 'fixed', value: 4500 }, minAmount: 10000, maxAmount: 999999999, settlementTime: 'Realtime', status: 'active' }
];

// Mock configs
const gatewayConfigs: GatewayConfig[] = [
  {
    id: 'cfg-mt-1',
    gatewayId: 'midtrans',
    branchId: null,
    branchName: 'HQ (Semua Cabang)',
    environment: 'production',
    merchantId: 'G123456789',
    isDefault: true,
    enabledMethods: ['qris', 'gopay', 'shopeepay', 'bca_va', 'bni_va', 'credit_card'],
    webhookUrl: '/api/webhooks/midtrans',
    callbackUrl: '/payment/callback',
    status: 'active',
    lastTestedAt: new Date(Date.now() - 3600000).toISOString(),
    testResult: { success: true, latency: 245 }
  },
  {
    id: 'cfg-xn-1',
    gatewayId: 'xendit',
    branchId: '1',
    branchName: 'Cabang Pusat Jakarta',
    environment: 'production',
    merchantId: 'XND123456',
    isDefault: false,
    enabledMethods: ['qris', 'ovo', 'dana', 'bca_va'],
    webhookUrl: '/api/webhooks/xendit',
    callbackUrl: '/payment/callback',
    status: 'active',
    lastTestedAt: new Date(Date.now() - 7200000).toISOString(),
    testResult: { success: true, latency: 180 }
  }
];

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  
  try {
    switch (req.method) {
      case 'GET':
        return getGateways(req, res);
      case 'POST':
        return createConfig(req, res);
      case 'PUT':
        return updateConfig(req, res);
      default:
        return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error: any) {
    console.error('Payment Gateway API Error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

function getGateways(req: NextApiRequest, res: NextApiResponse) {
  const { gatewayId, branchId, includeStats, includeMethods } = req.query;

  let filteredGateways = [...gateways];
  let filteredConfigs = [...gatewayConfigs];
  let filteredMethods = [...paymentMethods];

  if (gatewayId) {
    filteredGateways = filteredGateways.filter(g => g.id === gatewayId);
    filteredConfigs = filteredConfigs.filter(c => c.gatewayId === gatewayId);
    filteredMethods = filteredMethods.filter(m => m.gatewayId === gatewayId);
  }

  if (branchId) {
    filteredConfigs = filteredConfigs.filter(c => c.branchId === branchId || c.branchId === null);
  }

  const summary = {
    totalGateways: gateways.length,
    activeGateways: gateways.filter(g => g.status === 'active').length,
    totalConfigs: gatewayConfigs.length,
    totalTransactions: gateways.reduce((sum, g) => sum + g.totalTransactions, 0),
    totalVolume: gateways.reduce((sum, g) => sum + g.totalVolume, 0),
    avgSuccessRate: gateways.filter(g => g.status === 'active').reduce((sum, g) => sum + g.successRate, 0) / gateways.filter(g => g.status === 'active').length
  };

  const response: any = {
    success: true,
    gateways: filteredGateways,
    configs: filteredConfigs
  };

  if (includeMethods === 'true') {
    response.paymentMethods = filteredMethods;
  }

  if (includeStats === 'true') {
    response.summary = summary;
  }

  return res.status(200).json(response);
}

function createConfig(req: NextApiRequest, res: NextApiResponse) {
  const { gatewayId, branchId, merchantId, credentials, enabledMethods, environment } = req.body;

  if (!gatewayId || !merchantId) {
    return res.status(400).json({ error: 'Gateway ID and Merchant ID are required' });
  }

  const newConfig: GatewayConfig = {
    id: `cfg-${Date.now()}`,
    gatewayId,
    branchId: branchId || null,
    branchName: branchId ? `Branch ${branchId}` : 'HQ (Semua Cabang)',
    environment: environment || 'sandbox',
    merchantId,
    isDefault: !branchId,
    enabledMethods: enabledMethods || [],
    webhookUrl: `/api/webhooks/${gatewayId}`,
    callbackUrl: '/payment/callback',
    status: 'pending',
    lastTestedAt: '',
    testResult: { success: false }
  };

  gatewayConfigs.push(newConfig);

  return res.status(201).json({
    success: true,
    config: newConfig,
    message: 'Payment gateway configuration created. Please test the connection.'
  });
}

function updateConfig(req: NextApiRequest, res: NextApiResponse) {
  const { configId, action, enabledMethods, settings } = req.body;

  const configIndex = gatewayConfigs.findIndex(c => c.id === configId);
  if (configIndex === -1) {
    return res.status(404).json({ error: 'Configuration not found' });
  }

  const config = gatewayConfigs[configIndex];

  switch (action) {
    case 'activate':
      config.status = 'active';
      break;
    case 'deactivate':
      config.status = 'inactive';
      break;
    case 'test':
      config.lastTestedAt = new Date().toISOString();
      config.testResult = { success: true, latency: Math.floor(Math.random() * 200) + 100 };
      return res.status(200).json({
        success: true,
        message: 'Connection test successful',
        result: config.testResult
      });
    case 'update_methods':
      if (enabledMethods) {
        config.enabledMethods = enabledMethods;
      }
      break;
    case 'set_default':
      // Remove default from other configs
      gatewayConfigs.forEach(c => {
        if (c.gatewayId === config.gatewayId) c.isDefault = false;
      });
      config.isDefault = true;
      break;
    default:
      return res.status(400).json({ error: 'Invalid action' });
  }

  gatewayConfigs[configIndex] = config;

  return res.status(200).json({
    success: true,
    config,
    message: 'Configuration updated'
  });
}

// Export for webhooks
export { gateways, paymentMethods, gatewayConfigs };
