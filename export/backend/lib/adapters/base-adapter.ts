import { sequelize } from '../database-config';
import { QueryTypes, Transaction } from 'sequelize';

export interface BaseAdapterOptions {
  timeout?: number;
  transaction?: Transaction;
  logging?: boolean;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  isFromMock?: boolean;
  timestamp?: string;
}

export abstract class BaseAdapter {
  protected timeout: number;
  protected logging: boolean;

  constructor(options: BaseAdapterOptions = {}) {
    this.timeout = options.timeout || 10000; // 10 seconds default
    this.logging = options.logging ?? (process.env.NODE_ENV !== 'production');
  }

  protected async executeQuery<T = any>(
    query: string,
    replacements: any = {},
    options: BaseAdapterOptions = {}
  ): Promise<T[]> {
    const transaction = options.transaction;
    
    try {
      const results = await Promise.race([
        sequelize.query(query, {
          replacements,
          type: QueryTypes.SELECT,
          transaction,
          logging: this.logging,
        }),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Query timeout')), this.timeout)
        ),
      ]) as T[];

      return results;
    } catch (error) {
      if (this.logging) {
        console.error('Database query error:', error);
      }
      throw error;
    }
  }

  protected async executeTransaction<T>(
    callback: (transaction: Transaction) => Promise<T>
  ): Promise<T> {
    const transaction = await sequelize.transaction();
    
    try {
      const result = await callback(transaction);
      await transaction.commit();
      return result;
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  protected createSuccessResponse<T>(data: T, message?: string): ApiResponse<T> {
    return {
      success: true,
      data,
      message,
      isFromMock: false,
      timestamp: new Date().toISOString(),
    };
  }

  protected createErrorResponse(error: string): ApiResponse {
    return {
      success: false,
      error,
      isFromMock: false,
      timestamp: new Date().toISOString(),
    };
  }

  protected async withFallback<T>(
    operation: () => Promise<T>,
    fallbackData: T,
    operationName: string = 'Database operation'
  ): Promise<ApiResponse<T>> {
    try {
      const result = await operation();
      return this.createSuccessResponse(result);
    } catch (error) {
      console.warn(`${operationName} failed, using fallback:`, error);
      return {
        success: true,
        data: fallbackData,
        message: `${operationName} failed, using fallback data`,
        isFromMock: true,
        timestamp: new Date().toISOString(),
      };
    }
  }
}

export default BaseAdapter;
