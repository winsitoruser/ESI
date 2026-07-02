import pino from 'pino';

// Environment variables with defaults
const LOG_LEVEL = process.env.LOG_LEVEL || 'info';
const SERVICE_NAME = process.env.SERVICE_NAME || 'farmanesia-client';
const NODE_ENV = process.env.NODE_ENV || 'development';

// Create base logger
const baseLogger = pino({
  level: LOG_LEVEL,
  base: {
    service: SERVICE_NAME,
    environment: NODE_ENV,
    version: process.env.npm_package_version,
  },
  timestamp: pino.stdTimeFunctions.isoTime,
  formatters: {
    level: (label) => {
      return { level: label };
    },
  },
  browser: {
    asObject: true
  },
  redact: [
    'password',
    'passwordHash',
    'secret',
    'token',
    'jwt',
    'authorization',
    'cookie',
    'apiKey'
  ]
});

/**
 * Get a logger instance for a specific component
 * @param component Name of the component
 * @returns Pino logger instance
 */
export function getLogger(component: string) {
  return baseLogger.child({ component });
}

// Default logger
export default baseLogger;
