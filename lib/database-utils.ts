// Database utility functions for error handling and operations
export function isPrismaError(error: any): boolean {
  return error && (
    error.code || 
    error.name === 'PrismaClientKnownRequestError' ||
    error.name === 'PrismaClientUnknownRequestError' ||
    error.name === 'PrismaClientRustPanicError' ||
    error.name === 'PrismaClientInitializationError' ||
    error.name === 'PrismaClientValidationError'
  );
}

export function isSequelizeError(error: any): boolean {
  return error && (
    error.name === 'SequelizeError' ||
    error.name === 'SequelizeConnectionError' ||
    error.name === 'SequelizeValidationError' ||
    error.name === 'SequelizeUniqueConstraintError' ||
    error.name === 'SequelizeForeignKeyConstraintError' ||
    error.name === 'SequelizeTimeoutError'
  );
}

// Timeout wrapper for database operations
export function timeout<T>(promise: Promise<T>, ms: number = 10000): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`Operation timed out after ${ms}ms`)), ms)
    )
  ]);
}

// Database operation wrapper with error handling
export async function withDatabaseErrorHandling<T>(
  operation: () => Promise<T>,
  fallback?: T,
  timeoutMs: number = 10000
): Promise<T> {
  try {
    return await timeout(operation(), timeoutMs);
  } catch (error) {
    console.error('Database operation failed:', error);
    if (fallback !== undefined) {
      return fallback;
    }
    throw error;
  }
}

// Connection test utility
export async function testConnection(sequelize: any): Promise<boolean> {
  try {
    await sequelize.authenticate();
    return true;
  } catch (error) {
    console.error('Database connection test failed:', error);
    return false;
  }
}
