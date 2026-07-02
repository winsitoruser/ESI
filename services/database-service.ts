/**
 * Database Service
 * General database operations service
 */

import db from '@/models';
import { QueryTypes } from 'sequelize';

export class DatabaseService {
  /**
   * Test database connection
   */
  async testConnection() {
    try {
      await db.sequelize.authenticate();
      return { success: true, message: 'Database connected' };
    } catch (error) {
      console.error('Database connection error:', error);
      return { success: false, message: 'Database connection failed' };
    }
  }

  /**
   * Get database statistics
   */
  async getStatistics() {
    try {
      const tables = await db.sequelize.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public'
      `, { type: QueryTypes.SELECT });

      return {
        success: true,
        tables: tables.length,
        tableNames: tables
      };
    } catch (error) {
      console.error('Error fetching database statistics:', error);
      return { success: false, tables: 0, tableNames: [] };
    }
  }
}

export default DatabaseService;
