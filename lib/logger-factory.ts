/**
 * Logger factory for creating child loggers with context
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
  child(context: LogData): Logger;
}

class ContextLogger implements Logger {
  private context: LogData;

  constructor(context: LogData = {}) {
    this.context = context;
  }

  private formatMessage(level: string, message: string, data: LogData = {}): void {
    const timestamp = new Date().toISOString();
    const contextStr = Object.keys(this.context).length > 0 ? JSON.stringify(this.context) : '';
    const dataStr = Object.keys(data).length > 0 ? JSON.stringify(data) : '';
    
    const logMessage = `[${timestamp}] [${level}] ${contextStr ? `${contextStr} ` : ''}${message}${dataStr ? ` ${dataStr}` : ''}`;
    
    switch (level) {
      case 'INFO':
        console.log(logMessage);
        break;
      case 'WARN':
        console.warn(logMessage);
        break;
      case 'ERROR':
        console.error(logMessage);
        if (data.error) {
          console.error('[ERROR_DETAILS]', data.error);
        }
        break;
      case 'DEBUG':
        if (process.env.NODE_ENV !== 'production') {
          console.debug(logMessage);
        }
        break;
    }
  }

  info(message: string, data: LogData = {}): void {
    this.formatMessage('INFO', message, data);
  }

  warn(message: string, data: LogData = {}): void {
    this.formatMessage('WARN', message, data);
  }

  error(message: string, data: LogData = {}): void {
    this.formatMessage('ERROR', message, data);
  }

  debug(message: string, data: LogData = {}): void {
    this.formatMessage('DEBUG', message, data);
  }

  child(context: LogData): Logger {
    return new ContextLogger({ ...this.context, ...context });
  }
}

export function createLogger(context: string | LogData = {}): Logger {
  const contextObj = typeof context === 'string' ? { module: context } : context;
  return new ContextLogger(contextObj);
}

export default createLogger;
