/**
 * Subscription features by plan type
 * This defines what features and modules are available for each subscription tier
 */
interface SubscriptionFeatures {
  modules: string[];
  maxUsers: number;
  maxProducts: number;
  maxBranches: number;
  supportLevel: string;
  customization: boolean;
  apiAccess: boolean;
  backupFrequency: string;
  advancedReporting: boolean;
  multiDeviceAccess: boolean;
}

/**
 * Map of subscription plans to their features
 */
const subscriptionFeaturesMap: Record<string, SubscriptionFeatures> = {
  'basic': {
    modules: ['inventory', 'pos', 'finance-basic'],
    maxUsers: 3,
    maxProducts: 1000,
    maxBranches: 1,
    supportLevel: 'email',
    customization: false,
    apiAccess: false,
    backupFrequency: 'weekly',
    advancedReporting: false,
    multiDeviceAccess: true
  },
  'pro': {
    modules: ['inventory', 'pos', 'finance', 'purchasing', 'reports-basic'],
    maxUsers: 10,
    maxProducts: 5000,
    maxBranches: 1,
    supportLevel: 'email+chat',
    customization: false,
    apiAccess: false,
    backupFrequency: 'daily',
    advancedReporting: false,
    multiDeviceAccess: true
  },
  'premium': {
    modules: ['inventory', 'pos', 'finance', 'purchasing', 'reports', 'analytics', 'accounting'],
    maxUsers: 20,
    maxProducts: 15000,
    maxBranches: 3,
    supportLevel: 'priority',
    customization: true,
    apiAccess: false,
    backupFrequency: 'daily',
    advancedReporting: true,
    multiDeviceAccess: true
  },
  'enterprise': {
    modules: ['inventory', 'pos', 'finance', 'purchasing', 'reports', 'analytics', 'accounting', 'multi-branch', 'api-integration'],
    maxUsers: 50,
    maxProducts: 50000,
    maxBranches: 10,
    supportLevel: 'dedicated',
    customization: true,
    apiAccess: true,
    backupFrequency: 'realtime',
    advancedReporting: true,
    multiDeviceAccess: true
  }
};

/**
 * Gets the features for a subscription plan
 * @param plan The subscription plan name
 * @returns The features for the plan
 */
export function getSubscriptionFeatures(plan: string): SubscriptionFeatures {
  const lowercasePlan = plan.toLowerCase();
  return subscriptionFeaturesMap[lowercasePlan] || subscriptionFeaturesMap['basic'];
}

/**
 * Gets the display name for a module
 * @param moduleName The module name
 * @returns The display name for the module
 */
export function getModuleDisplayName(moduleName: string): string {
  const moduleNames: Record<string, string> = {
    'inventory': 'Inventori',
    'pos': 'Kasir',
    'finance': 'Keuangan',
    'finance-basic': 'Keuangan Dasar',
    'purchasing': 'Pembelian',
    'reports': 'Laporan Lengkap',
    'reports-basic': 'Laporan Dasar',
    'analytics': 'Analitik',
    'accounting': 'Akuntansi',
    'multi-branch': 'Multi Cabang',
    'api-integration': 'Integrasi API'
  };
  
  return moduleNames[moduleName] || moduleName;
}

/**
 * Checks if a feature is included in a subscription plan
 * @param plan The subscription plan
 * @param feature The feature to check
 * @returns Whether the feature is included
 */
export function isFeatureIncluded(plan: string, feature: keyof SubscriptionFeatures): boolean {
  const features = getSubscriptionFeatures(plan);
  return !!features[feature];
}

/**
 * Gets a formatted price for a subscription plan
 * @param plan The subscription plan
 * @returns The formatted price
 */
export function getSubscriptionPrice(plan: string): string {
  const prices: Record<string, number> = {
    'basic': 750000,
    'pro': 1250000,
    'premium': 1500000,
    'enterprise': 2250000
  };
  
  const price = prices[plan.toLowerCase()] || 0;
  
  // Format as IDR currency
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(price);
}
