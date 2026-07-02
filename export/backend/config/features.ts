// Configuration keys for system settings
export const CONFIG_KEYS = {
  USE_SEQUELIZE: 'use_sequelize',
  ENABLE_CACHING: 'enable_caching',
  LOG_LEVEL: 'log_level',
  TIMEOUT_MS: 'timeout_ms'
} as const;

// In-memory config cache
const configCache: Record<string, any> = {
  [CONFIG_KEYS.USE_SEQUELIZE]: true, // Default to Sequelize
  [CONFIG_KEYS.ENABLE_CACHING]: true,
  [CONFIG_KEYS.LOG_LEVEL]: 'info',
  [CONFIG_KEYS.TIMEOUT_MS]: 5000
};

/**
 * Get configuration value
 * @param key Configuration key
 * @param defaultValue Default value if config not found
 */
export function getConfig<T>(key: string, defaultValue?: T): T | undefined {
  return configCache[key] !== undefined ? configCache[key] : defaultValue;
}

/**
 * Set configuration value
 * @param key Configuration key
 * @param value New value
 */
export async function setConfig<T>(key: string, value: T): Promise<void> {
  configCache[key] = value;
  // In a real implementation, this would persist to database or file
  console.log(`Config updated: ${key} = ${value}`);
}

// Feature flags for enabling/disabling optional features
export const features = {
  // Core features (always enabled)
  pos: true,
  inventory: true,
  schedule: true,
  customers: true,
  purchasing: true,
  
  // Optional features (can be toggled)
  clinic: {
    enabled: false,
    name: 'Clinic Management',
    description: 'Comprehensive clinic management system',
  },
  pharmacy: {
    enabled: false,
    name: 'Pharmacy Installation',
    description: 'Advanced pharmacy installation features',
  },
} as const;

export type FeatureName = keyof typeof features;

export function isFeatureEnabled(feature: FeatureName): boolean {
  const featureConfig = features[feature];
  return typeof featureConfig === 'boolean' 
    ? featureConfig 
    : featureConfig?.enabled ?? false;
}

// Helper functions for specific features
export const isClinicEnabled = () => isFeatureEnabled('clinic');
export const isPharmacyEnabled = () => isFeatureEnabled('pharmacy');
