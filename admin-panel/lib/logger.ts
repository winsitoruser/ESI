/**
 * TypeScript logger utility for FARMANESIA-EVO API services
 * Used for consistent error and info logging across the application
 * Implements the same interface as server/monitoring/logger.js but with TypeScript support
 */

interface LogData {
  [key: string]: any;
  error?: Error | unknown;
}

interface Logger {
  info(message: string, data?: LogData): void;
  warn(message: string, data?: LogData): void;
  error(message: string, data?: LogData): void;
  debug(message: string, data?: LogData): void;
}

const logger: Logger = {
  /**
   * Log info messages
   * @param {string} message - Log message
   * @param {LogData} data - Optional data to include in the log
   */
  info: (message: string, data: LogData = {}) => {
    console.log(`[INFO] ${message}`, data);
  },

  /**
   * Log warning messages
   * @param {string} message - Warning message
   * @param {LogData} data - Optional data to include in the log
   */
  warn: (message: string, data: LogData = {}) => {
    console.warn(`[WARNING] ${message}`, data);
  },

  /**
   * Log error messages
   * @param {string} message - Error message
   * @param {LogData} data - Optional data to include in the error log
   */
  error: (message: string, data: LogData = {}) => {
    console.error(`[ERROR] ${message}`, data);
    
    // If there's an error object, extract and format it
    if (data.error) {
      const errorDetails = data.error instanceof Error
        ? {
            message: (data.error as Error).message,
            stack: (data.error as Error).stack,
            ...(data.error as object)
          }
        : data.error;
        
      console.error(`[ERROR_DETAILS]`, errorDetails);
    }
  },

  /**
   * Log debug messages (only in development)
   * @param {string} message - Debug message
   * @param {LogData} data - Optional data to include in the debug log
   */
  debug: (message: string, data: LogData = {}) => {
    if (process.env.NODE_ENV !== 'production') {
      console.debug(`[DEBUG] ${message}`, data);
    }
  }
};

export default logger;
