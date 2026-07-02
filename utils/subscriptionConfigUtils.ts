 /**
 * Subscription Configuration Utilities
 * Provides types and helper functions for managing subscription configurations
 */

import { ReactNode } from 'react';

// Basic Types
export interface FeatureLimit {
  id: string;
  name: string;
  description: string;
  basic: number | string;
  pro: number | string;
  premium: number | string;
  enterprise: number | string | 'unlimited';
  unit?: string;
}

export interface ApiEndpoint {
  id: string;
  name: string;
  path: string;
  description: string;
  module: string;
  methods: ('GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH')[];
  availableIn: ('basic' | 'pro' | 'premium' | 'enterprise')[];
  rateLimit: {
    basic: number;
    pro: number;
    premium: number;
    enterprise: number;
  };
}

export interface ModuleIntegration {
  id: string;
  name: string;
  description: string;
  availableIn: string[];
  dependentModules?: string[];
  permissions: string[];
}

export interface FeatureConfig {
  id: string;
  name: string;
  description: string;
  category: 'core' | 'additional' | 'integration' | 'customization';
  availableIn: string[];
  configOptions: {
    id: string;
    name: string;
    type: 'boolean' | 'select' | 'number' | 'text';
    description: string;
    options?: { value: string; label: string }[];
    defaultValue: any;
    availableIn: string[];
  }[];
}

export interface RolePermission {
  id: string;
  name: string;
  description: string;
  category: string;
  availableIn: string[];
}

// Default data
export const defaultFeatureLimits: FeatureLimit[] = [
  {
    id: 'users',
    name: 'Jumlah Pengguna',
    description: 'Batas jumlah pengguna yang dapat mengakses sistem',
    basic: 3,
    pro: 10,
    premium: 25,
    enterprise: 'unlimited',
    unit: 'user'
  },
  {
    id: 'products',
    name: 'Jumlah Produk',
    description: 'Batas jumlah produk yang dapat dikelola',
    basic: 1000,
    pro: 10000,
    premium: 100000,
    enterprise: 'unlimited',
    unit: 'produk'
  },
  {
    id: 'storage',
    name: 'Kapasitas Penyimpanan',
    description: 'Batas kapasitas penyimpanan untuk file dan data',
    basic: 1,
    pro: 5,
    premium: 20,
    enterprise: 100,
    unit: 'GB'
  },
  {
    id: 'transactions',
    name: 'Transaksi per Bulan',
    description: 'Batas jumlah transaksi yang dapat diproses per bulan',
    basic: 500,
    pro: 3000,
    premium: 10000,
    enterprise: 'unlimited',
    unit: 'transaksi'
  },
  {
    id: 'branches',
    name: 'Jumlah Cabang',
    description: 'Batas jumlah cabang yang dapat dikelola',
    basic: 1,
    pro: 3,
    premium: 10,
    enterprise: 'unlimited',
    unit: 'cabang'
  },
  {
    id: 'api_calls',
    name: 'API Calls per Hari',
    description: 'Batas jumlah panggilan API per hari',
    basic: 100,
    pro: 1000,
    premium: 10000,
    enterprise: 100000,
    unit: 'calls'
  },
  {
    id: 'reports',
    name: 'Laporan Kustom',
    description: 'Batas jumlah laporan kustom yang dapat dibuat',
    basic: 5,
    pro: 20,
    premium: 50,
    enterprise: 'unlimited',
    unit: 'laporan'
  },
  {
    id: 'backup_retention',
    name: 'Retensi Backup',
    description: 'Durasi penyimpanan backup data',
    basic: 7,
    pro: 30,
    premium: 90,
    enterprise: 365,
    unit: 'hari'
  }
];

export const defaultApiEndpoints: ApiEndpoint[] = [
  {
    id: 'inventory_api',
    name: 'Inventory API',
    path: '/api/inventory',
    description: 'API untuk manajemen inventory dan produk',
    module: 'inventory',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    availableIn: ['basic', 'pro', 'premium', 'enterprise'],
    rateLimit: {
      basic: 100,
      pro: 500,
      premium: 2000,
      enterprise: 10000
    }
  },
  {
    id: 'pos_api',
    name: 'POS API',
    path: '/api/pos',
    description: 'API untuk point of sale dan transaksi',
    module: 'pos',
    methods: ['GET', 'POST', 'PUT'],
    availableIn: ['basic', 'pro', 'premium', 'enterprise'],
    rateLimit: {
      basic: 100,
      pro: 500,
      premium: 2000,
      enterprise: 10000
    }
  },
  {
    id: 'finance_api',
    name: 'Finance API',
    path: '/api/finance',
    description: 'API untuk manajemen keuangan',
    module: 'finance',
    methods: ['GET', 'POST', 'PUT'],
    availableIn: ['pro', 'premium', 'enterprise'],
    rateLimit: {
      basic: 0,
      pro: 300,
      premium: 1500,
      enterprise: 5000
    }
  },
  {
    id: 'analytics_api',
    name: 'Analytics API',
    path: '/api/analytics',
    description: 'API untuk analitik dan pelaporan',
    module: 'analytics',
    methods: ['GET'],
    availableIn: ['premium', 'enterprise'],
    rateLimit: {
      basic: 0,
      pro: 0,
      premium: 1000,
      enterprise: 5000
    }
  },
  {
    id: 'customers_api',
    name: 'Customers API',
    path: '/api/customers',
    description: 'API untuk manajemen pelanggan',
    module: 'customers',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    availableIn: ['premium', 'enterprise'],
    rateLimit: {
      basic: 0,
      pro: 0,
      premium: 1000,
      enterprise: 5000
    }
  },
  {
    id: 'webhooks_api',
    name: 'Webhooks API',
    path: '/api/webhooks',
    description: 'API untuk integrasi webhook',
    module: 'integration',
    methods: ['POST'],
    availableIn: ['enterprise'],
    rateLimit: {
      basic: 0,
      pro: 0,
      premium: 0,
      enterprise: 1000
    }
  }
];

export const defaultModuleIntegrations: ModuleIntegration[] = [
  {
    id: 'inventory_pos',
    name: 'Integrasi Inventory - POS',
    description: 'Integrasi antara modul inventory dan POS',
    availableIn: ['basic', 'pro', 'premium', 'enterprise'],
    dependentModules: ['inventory', 'pos'],
    permissions: ['inventory:read', 'pos:read', 'pos:write']
  },
  {
    id: 'inventory_purchasing',
    name: 'Integrasi Inventory - Purchasing',
    description: 'Integrasi antara modul inventory dan purchasing',
    availableIn: ['pro', 'premium', 'enterprise'],
    dependentModules: ['inventory', 'purchasing'],
    permissions: ['inventory:read', 'inventory:write', 'purchasing:read', 'purchasing:write']
  },
  {
    id: 'pos_finance',
    name: 'Integrasi POS - Finance',
    description: 'Integrasi antara modul POS dan finance',
    availableIn: ['pro', 'premium', 'enterprise'],
    dependentModules: ['pos', 'finance'],
    permissions: ['pos:read', 'finance:read', 'finance:write']
  },
  {
    id: 'finance_reporting',
    name: 'Integrasi Finance - Reporting',
    description: 'Integrasi antara modul finance dan reporting',
    availableIn: ['premium', 'enterprise'],
    dependentModules: ['finance', 'analytics'],
    permissions: ['finance:read', 'analytics:read']
  },
  {
    id: 'crm_marketing',
    name: 'Integrasi CRM - Marketing',
    description: 'Integrasi antara modul CRM dan marketing',
    availableIn: ['premium', 'enterprise'],
    dependentModules: ['crm', 'marketing'],
    permissions: ['crm:read', 'crm:write', 'marketing:read', 'marketing:write']
  },
  {
    id: 'telemedicine',
    name: 'Integrasi Telemedicine',
    description: 'Integrasi dengan sistem telemedicine',
    availableIn: ['enterprise'],
    dependentModules: ['telemedicine'],
    permissions: ['telemedicine:read', 'telemedicine:write']
  }
];

export const defaultFeatureConfigs: FeatureConfig[] = [
  {
    id: 'inventory_settings',
    name: 'Pengaturan Inventory',
    description: 'Konfigurasi fitur dan perilaku modul inventory',
    category: 'core',
    availableIn: ['basic', 'pro', 'premium', 'enterprise'],
    configOptions: [
      {
        id: 'enable_batch_tracking',
        name: 'Pelacakan Batch',
        type: 'boolean',
        description: 'Aktifkan pelacakan batch untuk produk',
        defaultValue: false,
        availableIn: ['pro', 'premium', 'enterprise']
      },
      {
        id: 'enable_expiry_alerts',
        name: 'Peringatan Kedaluwarsa',
        type: 'boolean',
        description: 'Aktifkan peringatan untuk produk yang akan kedaluwarsa',
        defaultValue: true,
        availableIn: ['basic', 'pro', 'premium', 'enterprise']
      },
      {
        id: 'expiry_threshold_days',
        name: 'Ambang Batas Kedaluwarsa (Hari)',
        type: 'number',
        description: 'Jumlah hari sebelum kedaluwarsa untuk mengirim peringatan',
        defaultValue: 30,
        availableIn: ['basic', 'pro', 'premium', 'enterprise']
      },
      {
        id: 'low_stock_alerts',
        name: 'Peringatan Stok Rendah',
        type: 'boolean',
        description: 'Aktifkan peringatan saat stok mencapai level minimum',
        defaultValue: true,
        availableIn: ['basic', 'pro', 'premium', 'enterprise']
      }
    ]
  },
  {
    id: 'pos_settings',
    name: 'Pengaturan POS',
    description: 'Konfigurasi fitur dan perilaku modul POS',
    category: 'core',
    availableIn: ['basic', 'pro', 'premium', 'enterprise'],
    configOptions: [
      {
        id: 'enable_queue_management',
        name: 'Manajemen Antrian',
        type: 'boolean',
        description: 'Aktifkan manajemen antrian untuk transaksi',
        defaultValue: false,
        availableIn: ['pro', 'premium', 'enterprise']
      },
      {
        id: 'enable_digital_payments',
        name: 'Pembayaran Digital',
        type: 'boolean',
        description: 'Aktifkan opsi pembayaran digital',
        defaultValue: false,
        availableIn: ['pro', 'premium', 'enterprise']
      },
      {
        id: 'enable_customer_display',
        name: 'Tampilan Pelanggan',
        type: 'boolean',
        description: 'Aktifkan tampilan terpisah untuk pelanggan',
        defaultValue: false,
        availableIn: ['premium', 'enterprise']
      },
      {
        id: 'receipt_template',
        name: 'Template Struk',
        type: 'select',
        description: 'Pilihan template untuk struk pembayaran',
        options: [
          { value: 'basic', label: 'Basic' },
          { value: 'detailed', label: 'Detailed' },
          { value: 'custom', label: 'Custom' }
        ],
        defaultValue: 'basic',
        availableIn: ['basic', 'pro', 'premium', 'enterprise']
      }
    ]
  },
  {
    id: 'finance_settings',
    name: 'Pengaturan Keuangan',
    description: 'Konfigurasi fitur dan perilaku modul keuangan',
    category: 'core',
    availableIn: ['pro', 'premium', 'enterprise'],
    configOptions: [
      {
        id: 'enable_tax_calculation',
        name: 'Perhitungan Pajak',
        type: 'boolean',
        description: 'Aktifkan perhitungan pajak otomatis',
        defaultValue: true,
        availableIn: ['pro', 'premium', 'enterprise']
      },
      {
        id: 'enable_multi_currency',
        name: 'Multi Mata Uang',
        type: 'boolean',
        description: 'Aktifkan dukungan untuk multi mata uang',
        defaultValue: false,
        availableIn: ['premium', 'enterprise']
      },
      {
        id: 'accounting_method',
        name: 'Metode Akuntansi',
        type: 'select',
        description: 'Pilihan metode akuntansi',
        options: [
          { value: 'cash', label: 'Cash Basis' },
          { value: 'accrual', label: 'Accrual Basis' }
        ],
        defaultValue: 'cash',
        availableIn: ['pro', 'premium', 'enterprise']
      }
    ]
  },
  {
    id: 'api_settings',
    name: 'Pengaturan API',
    description: 'Konfigurasi fitur dan perilaku API',
    category: 'integration',
    availableIn: ['pro', 'premium', 'enterprise'],
    configOptions: [
      {
        id: 'enable_api_access',
        name: 'Akses API',
        type: 'boolean',
        description: 'Aktifkan akses ke API',
        defaultValue: true,
        availableIn: ['pro', 'premium', 'enterprise']
      },
      {
        id: 'api_rate_limiting',
        name: 'Rate Limiting',
        type: 'boolean',
        description: 'Aktifkan pembatasan rate untuk API calls',
        defaultValue: true,
        availableIn: ['pro', 'premium', 'enterprise']
      },
      {
        id: 'api_auth_method',
        name: 'Metode Autentikasi API',
        type: 'select',
        description: 'Pilihan metode autentikasi untuk API',
        options: [
          { value: 'api_key', label: 'API Key' },
          { value: 'oauth', label: 'OAuth 2.0' },
          { value: 'jwt', label: 'JWT' }
        ],
        defaultValue: 'api_key',
        availableIn: ['pro', 'premium', 'enterprise']
      }
    ]
  }
];

export const defaultRolePermissions: RolePermission[] = [
  {
    id: 'inventory:read',
    name: 'Lihat Inventory',
    description: 'Izin untuk melihat inventory',
    category: 'inventory',
    availableIn: ['basic', 'pro', 'premium', 'enterprise']
  },
  {
    id: 'inventory:write',
    name: 'Edit Inventory',
    description: 'Izin untuk mengedit inventory',
    category: 'inventory',
    availableIn: ['basic', 'pro', 'premium', 'enterprise']
  },
  {
    id: 'pos:read',
    name: 'Lihat POS',
    description: 'Izin untuk melihat transaksi POS',
    category: 'pos',
    availableIn: ['basic', 'pro', 'premium', 'enterprise']
  },
  {
    id: 'pos:write',
    name: 'Buat Transaksi POS',
    description: 'Izin untuk membuat transaksi POS',
    category: 'pos',
    availableIn: ['basic', 'pro', 'premium', 'enterprise']
  },
  {
    id: 'finance:read',
    name: 'Lihat Keuangan',
    description: 'Izin untuk melihat data keuangan',
    category: 'finance',
    availableIn: ['pro', 'premium', 'enterprise']
  },
  {
    id: 'finance:write',
    name: 'Edit Keuangan',
    description: 'Izin untuk mengedit data keuangan',
    category: 'finance',
    availableIn: ['pro', 'premium', 'enterprise']
  },
  {
    id: 'purchasing:read',
    name: 'Lihat Purchasing',
    description: 'Izin untuk melihat data purchasing',
    category: 'purchasing',
    availableIn: ['pro', 'premium', 'enterprise']
  },
  {
    id: 'purchasing:write',
    name: 'Buat Purchase Order',
    description: 'Izin untuk membuat purchase order',
    category: 'purchasing',
    availableIn: ['pro', 'premium', 'enterprise']
  },
  {
    id: 'analytics:read',
    name: 'Lihat Analytics',
    description: 'Izin untuk melihat data analytics',
    category: 'analytics',
    availableIn: ['premium', 'enterprise']
  },
  {
    id: 'crm:read',
    name: 'Lihat CRM',
    description: 'Izin untuk melihat data pelanggan',
    category: 'crm',
    availableIn: ['premium', 'enterprise']
  },
  {
    id: 'crm:write',
    name: 'Edit CRM',
    description: 'Izin untuk mengedit data pelanggan',
    category: 'crm',
    availableIn: ['premium', 'enterprise']
  },
  {
    id: 'admin:full',
    name: 'Akses Penuh Admin',
    description: 'Akses penuh ke semua fitur admin',
    category: 'admin',
    availableIn: ['enterprise']
  }
];

// Helper function to check if a feature is available in a particular package
export function isFeatureAvailable(featureId: string, packageId: string, 
  configs: FeatureConfig[] = defaultFeatureConfigs): boolean {
  const feature = configs.find(f => f.id === featureId);
  if (!feature) return false;
  return feature.availableIn.includes(packageId);
}

// Helper function to get the limit value for a specific package
export function getPackageLimit(limitId: string, packageId: string, 
  limits: FeatureLimit[] = defaultFeatureLimits): string | number {
  const limit = limits.find(l => l.id === limitId);
  if (!limit) return 0;
  return limit[packageId as keyof typeof limit] || 0;
}

// Helper function to format limit values for display
export function formatLimitValue(value: string | number, unit?: string): string {
  if (value === 'unlimited') return 'Tak Terbatas';
  return unit ? `${value} ${unit}` : value.toString();
}
