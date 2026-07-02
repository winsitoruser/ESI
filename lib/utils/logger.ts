/**
 * Simple logger utility
 */

export enum LogLevel {
  ERROR = 'error',
  WARN = 'warn',
  INFO = 'info',
  DEBUG = 'debug',
}

type LogFunction = (message: string, ...args: any[]) => void;
type LogContext = Record<string, string | number | boolean>;

class Logger {
  private level: LogLevel = LogLevel.INFO;
  private context: LogContext = {};
  
  constructor(context: LogContext = {}) {
    // Set log level from environment if available
    const envLevel = process.env.LOG_LEVEL as LogLevel;
    if (envLevel && Object.values(LogLevel).includes(envLevel)) {
      this.level = envLevel;
    }
    this.context = context;
  }

  setLevel(level: LogLevel): void {
    this.level = level;
  }
  
  /**
   * Create a child logger with additional context
   * @param context Additional context to be added to log messages
   * @returns A new Logger instance with combined context
   */
  child(context: LogContext): Logger {
    // Create a new Logger with combined context
    return new Logger({ ...this.context, ...context });
  }
  
  private formatContext(): string {
    if (Object.keys(this.context).length === 0) return '';
    const contextStr = Object.entries(this.context)
      .map(([key, value]) => `${key}=${value}`)
      .join(' ');
    return `[${contextStr}]`;
  }

  error: LogFunction = (message, ...args) => {
    console.error(`[ERROR]${this.formatContext()} ${message}`, ...args);
  }
  
  warn: LogFunction = (message, ...args) => {
    if ([LogLevel.ERROR, LogLevel.WARN, LogLevel.INFO, LogLevel.DEBUG].includes(this.level)) {
      console.warn(`[WARN]${this.formatContext()} ${message}`, ...args);
    }
  }
  
  info: LogFunction = (message, ...args) => {
    if ([LogLevel.INFO, LogLevel.DEBUG].includes(this.level)) {
      console.info(`[INFO]${this.formatContext()} ${message}`, ...args);
    }
  }
  
  debug: LogFunction = (message, ...args) => {
    if ([LogLevel.DEBUG].includes(this.level)) {
      console.debug(`[DEBUG]${this.formatContext()} ${message}`, ...args);
    }
  }
  
  log: LogFunction = (message, ...args) => {
    if ([LogLevel.INFO, LogLevel.DEBUG].includes(this.level)) {
      console.log(`[LOG]${this.formatContext()} ${message}`, ...args);
    }
  }
}

// Export singleton instance
export const logger = new Logger();
