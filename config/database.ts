/**
 * FARMANESIA-EVO Database Configuration
 * 
 * Centralizes database connection settings and provides environment-specific configurations
 */

export type DbEnvironment = 'development' | 'testing' | 'production';

export interface DatabaseConfig {
  url: string;
  key: string;
  schema: string;
  poolSize: number;
  timeout: number;
  enableRowLevelSecurity: boolean;
}

// Environment-specific configurations
const configurations: Record<DbEnvironment, DatabaseConfig> = {
  development: {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://localhost:54321',
    key: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'your-development-api-key',
    schema: 'public',
    poolSize: 5,
    timeout: 30,
    enableRowLevelSecurity: true
  },
  
  testing: {
    url: process.env.NEXT_PUBLIC_SUPABASE_TEST_URL || 'http://localhost:54321',
    key: process.env.NEXT_PUBLIC_SUPABASE_TEST_KEY || 'your-testing-api-key',
    schema: 'public',
    poolSize: 3,
    timeout: 10,
    enableRowLevelSecurity: true
  },
  
  production: {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    key: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
    schema: 'public',
    poolSize: 10,
    timeout: 30,
    enableRowLevelSecurity: true
  }
};

/**
 * Get database configuration for the current environment
 */
export function getDatabaseConfig(): DatabaseConfig {
  const environment = (process.env.NODE_ENV || 'development') as DbEnvironment;
  return configurations[environment];
}

/**
 * Get migration configuration
 */
export function getMigrationConfig() {
  const dbConfig = getDatabaseConfig();
  
  return {
    migrationDir: './database/migrations',
    databaseConfig: {
      url: dbConfig.url,
      key: dbConfig.key,
      schema: dbConfig.schema
    }
  };
}

/**
 * Validate database configuration
 * Returns true if configuration is valid, otherwise false
 */
export function validateDatabaseConfig(): boolean {
  const config = getDatabaseConfig();
  
  // Check required fields
  if (!config.url || !config.key) {
    console.error('Database configuration missing required fields: url and key');
    return false;
  }
  
  // In production, make additional checks
  if (process.env.NODE_ENV === 'production') {
    // Ensure not using development keys in production
    if (config.url.includes('localhost') || config.key.includes('development')) {
      console.error('Production environment using development database configuration');
      return false;
    }
  }
  
  return true;
}
