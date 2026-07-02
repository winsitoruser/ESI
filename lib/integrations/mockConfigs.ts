/**
 * Shared in-memory store untuk konfigurasi integrasi (mock).
 * State hidup selama proses Node.js (akan reset saat dev-server restart).
 * Saat backend DB model `IntegrationConfig` sudah diwire, module ini dapat
 * diganti dengan adapter ke DB.
 */

export type IntegrationConfig = {
  id: string;
  providerId: string;
  providerName: string;
  providerCategory: string;
  branchId: string | null;
  branchName: string;
  name: string;
  environment: 'production' | 'sandbox';
  merchantId?: string;
  merchantName?: string;
  status: 'active' | 'pending' | 'suspended' | 'expired' | 'rejected';
  isDefault: boolean;
  credentials?: Record<string, any>;
  settings?: Record<string, any>;
  enabledPaymentMethods?: string[];
  feeSettings?: Record<string, any>;
  totalTransactions?: number;
  totalVolume?: number;
  lastTestedAt?: string;
  lastTestResult?: { success: boolean; message?: string; latency?: number };
  activatedAt?: string;
  createdAt: string;
  updatedAt?: string;
};

function makeInitialConfigs(): IntegrationConfig[] {
  return [
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
      settings: { defaultTemplate: 'order_confirmation', autoReply: true },
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
      settings: { alertTypes: ['low_stock', 'high_sales', 'system_error'] },
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
      settings: { fromEmail: 'noreply@bedagang.com', fromName: 'Bedagang POS' },
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
}

// Gunakan globalThis agar state tidak ter-reset saat Next.js hot-reload di dev.
declare global {
  // eslint-disable-next-line no-var
  var __bedagang_integration_configs__: IntegrationConfig[] | undefined;
}

export function getConfigStore(): IntegrationConfig[] {
  if (!globalThis.__bedagang_integration_configs__) {
    globalThis.__bedagang_integration_configs__ = makeInitialConfigs();
  }
  return globalThis.__bedagang_integration_configs__!;
}

export function listConfigs(filter?: {
  providerId?: string;
  branchId?: string;
  category?: string;
  status?: string;
  environment?: string;
}): IntegrationConfig[] {
  let out = [...getConfigStore()];
  if (!filter) return out;
  if (filter.providerId) out = out.filter(c => c.providerId === filter.providerId);
  if (filter.branchId) {
    if (filter.branchId === 'hq') out = out.filter(c => c.branchId === null);
    else out = out.filter(c => c.branchId === filter.branchId || c.branchId === null);
  }
  if (filter.category) out = out.filter(c => c.providerCategory === filter.category);
  if (filter.status) out = out.filter(c => c.status === filter.status);
  if (filter.environment) out = out.filter(c => c.environment === filter.environment);
  return out;
}

export function getConfigById(id: string): IntegrationConfig | undefined {
  return getConfigStore().find(c => c.id === id);
}

export function createConfig(payload: Partial<IntegrationConfig>): IntegrationConfig {
  const store = getConfigStore();
  const now = new Date().toISOString();
  const config: IntegrationConfig = {
    id: `cfg-${Date.now()}`,
    providerId: payload.providerId || '',
    providerName: payload.providerName || '',
    providerCategory: payload.providerCategory || '',
    branchId: payload.branchId ?? null,
    branchName: payload.branchName || 'HQ (Semua Cabang)',
    name: payload.name || 'Konfigurasi Baru',
    environment: (payload.environment as any) || 'sandbox',
    merchantId: payload.merchantId,
    merchantName: payload.merchantName,
    status: (payload.status as any) || 'active',
    isDefault: !!payload.isDefault,
    credentials: payload.credentials,
    settings: payload.settings,
    enabledPaymentMethods: payload.enabledPaymentMethods,
    feeSettings: payload.feeSettings,
    createdAt: now,
    updatedAt: now
  };
  store.push(config);
  return config;
}

export function updateConfig(
  id: string,
  patch: Partial<IntegrationConfig>
): IntegrationConfig | undefined {
  const store = getConfigStore();
  const idx = store.findIndex(c => c.id === id);
  if (idx === -1) return undefined;
  const merged: IntegrationConfig = {
    ...store[idx],
    ...patch,
    id: store[idx].id,
    updatedAt: new Date().toISOString()
  };
  store[idx] = merged;
  return merged;
}

export function deleteConfig(id: string): boolean {
  const store = getConfigStore();
  const idx = store.findIndex(c => c.id === id);
  if (idx === -1) return false;
  store.splice(idx, 1);
  return true;
}

export function getSummary(configs: IntegrationConfig[] = getConfigStore()) {
  return {
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
}
