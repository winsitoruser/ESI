import type { NextApiRequest, NextApiResponse } from 'next';

// Mock integration configs data
const mockConfigs = [
  {
    id: 'cfg-001',
    providerId: 'pg-001',
    providerName: 'Midtrans',
    providerCategory: 'payment_gateway',
    branchId: null,
    branchName: 'HQ (Semua Cabang)',
    name: 'Midtrans Production',
    environment: 'production',
    merchantId: 'G123456789',
    merchantName: 'Bedagang POS',
    status: 'active',
    isDefault: true,
    enabledPaymentMethods: ['qris', 'gopay', 'shopeepay', 'bca_va', 'bni_va', 'bri_va', 'mandiri_va'],
    feeSettings: {
      qris: { type: 'percentage', value: 0.7 },
      gopay: { type: 'percentage', value: 2 },
      va: { type: 'fixed', value: 4000 }
    },
    lastTestedAt: '2026-02-22T10:30:00Z',
    lastTestResult: { success: true, latency: 250 },
    activatedAt: '2026-01-15T00:00:00Z',
    createdAt: '2026-01-10T00:00:00Z'
  },
  {
    id: 'cfg-002',
    providerId: 'msg-001',
    providerName: 'WhatsApp Business Cloud API',
    providerCategory: 'messaging',
    branchId: null,
    branchName: 'HQ (Semua Cabang)',
    name: 'WhatsApp Notifikasi',
    environment: 'production',
    merchantId: '1234567890',
    merchantName: 'Bedagang Official',
    status: 'active',
    isDefault: true,
    settings: {
      defaultTemplate: 'order_confirmation',
      autoReply: true
    },
    lastTestedAt: '2026-02-21T14:00:00Z',
    lastTestResult: { success: true },
    activatedAt: '2026-02-01T00:00:00Z',
    createdAt: '2026-01-20T00:00:00Z'
  },
  {
    id: 'cfg-003',
    providerId: 'msg-003',
    providerName: 'Telegram Bot API',
    providerCategory: 'messaging',
    branchId: null,
    branchName: 'HQ (Semua Cabang)',
    name: 'Telegram Alert Bot',
    environment: 'production',
    status: 'active',
    isDefault: true,
    settings: {
      alertTypes: ['low_stock', 'high_sales', 'system_error']
    },
    lastTestedAt: '2026-02-20T09:00:00Z',
    lastTestResult: { success: true },
    activatedAt: '2026-02-05T00:00:00Z',
    createdAt: '2026-02-01T00:00:00Z'
  },
  {
    id: 'cfg-004',
    providerId: 'email-001',
    providerName: 'SMTP Email',
    providerCategory: 'email',
    branchId: null,
    branchName: 'HQ (Semua Cabang)',
    name: 'Email Transaksional',
    environment: 'production',
    status: 'active',
    isDefault: true,
    settings: {
      fromEmail: 'noreply@bedagang.com',
      fromName: 'Bedagang POS'
    },
    lastTestedAt: '2026-02-22T08:00:00Z',
    lastTestResult: { success: true },
    activatedAt: '2026-01-01T00:00:00Z',
    createdAt: '2026-01-01T00:00:00Z'
  },
  {
    id: 'cfg-005',
    providerId: 'pg-002',
    providerName: 'Xendit',
    providerCategory: 'payment_gateway',
    branchId: 'branch-001',
    branchName: 'Cabang Pusat Jakarta',
    name: 'Xendit - Jakarta',
    environment: 'production',
    merchantId: 'XND-123456',
    merchantName: 'Bedagang Jakarta',
    status: 'active',
    isDefault: false,
    enabledPaymentMethods: ['qris', 'ovo', 'dana', 'bca_va'],
    lastTestedAt: '2026-02-21T16:00:00Z',
    lastTestResult: { success: true, latency: 180 },
    activatedAt: '2026-02-10T00:00:00Z',
    createdAt: '2026-02-08T00:00:00Z'
  },
  {
    id: 'cfg-006',
    providerId: 'pg-001',
    providerName: 'Midtrans',
    providerCategory: 'payment_gateway',
    branchId: null,
    branchName: 'HQ',
    name: 'Midtrans Sandbox',
    environment: 'sandbox',
    merchantId: 'G999999999',
    status: 'active',
    isDefault: false,
    enabledPaymentMethods: ['qris', 'gopay', 'bca_va'],
    lastTestedAt: '2026-02-22T11:00:00Z',
    lastTestResult: { success: true },
    createdAt: '2026-01-10T00:00:00Z'
  }
];

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  switch (req.method) {
    case 'GET':
      return getConfigs(req, res);
    case 'POST':
      return createConfig(req, res);
    default:
      res.setHeader('Allow', ['GET', 'POST']);
      return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }
}

async function getConfigs(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { providerId, branchId, category, status, environment } = req.query;

    let configs = [...mockConfigs];

    if (providerId) {
      configs = configs.filter(c => c.providerId === providerId);
    }

    if (branchId) {
      if (branchId === 'hq') {
        configs = configs.filter(c => c.branchId === null);
      } else {
        configs = configs.filter(c => c.branchId === branchId || c.branchId === null);
      }
    }

    if (category) {
      configs = configs.filter(c => c.providerCategory === category);
    }

    if (status) {
      configs = configs.filter(c => c.status === status);
    }

    if (environment) {
      configs = configs.filter(c => c.environment === environment);
    }

    // Summary stats
    const summary = {
      total: configs.length,
      active: configs.filter(c => c.status === 'active').length,
      pending: configs.filter(c => c.status === 'pending').length,
      byCategory: {
        payment_gateway: configs.filter(c => c.providerCategory === 'payment_gateway').length,
        messaging: configs.filter(c => c.providerCategory === 'messaging').length,
        email: configs.filter(c => c.providerCategory === 'email').length,
        delivery: configs.filter(c => c.providerCategory === 'delivery').length,
        accounting: configs.filter(c => c.providerCategory === 'accounting').length,
        marketplace: configs.filter(c => c.providerCategory === 'marketplace').length
      }
    };

    return res.status(200).json({ configs, summary });
  } catch (error) {
    console.error('Error fetching configs:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

async function createConfig(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { providerId, branchId, name, environment, credentials, settings } = req.body;

    if (!providerId || !name) {
      return res.status(400).json({ error: 'Provider ID and name are required' });
    }

    // In real implementation, save to database
    const newConfig = {
      id: `cfg-${Date.now()}`,
      providerId,
      branchId: branchId || null,
      name,
      environment: environment || 'sandbox',
      credentials,
      settings,
      status: 'pending',
      isDefault: false,
      createdAt: new Date().toISOString()
    };

    return res.status(201).json({
      success: true,
      config: newConfig,
      message: 'Configuration created successfully'
    });
  } catch (error) {
    console.error('Error creating config:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
