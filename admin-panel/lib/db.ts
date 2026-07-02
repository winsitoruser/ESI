import { Sequelize } from 'sequelize';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Database connection URL from environment variable or fallback to development URL
const databaseUrl = process.env.DATABASE_URL || 'mysql://user:password@localhost:3306/farmanesia_evo';

// Create Sequelize instance
export const sequelize = new Sequelize(databaseUrl, {
  dialect: 'mysql', // Default dialect
  logging: process.env.NODE_ENV === 'development' ? console.log : false,
  dialectOptions: {
    ssl: process.env.NODE_ENV === 'production' ? {
      require: true,
      rejectUnauthorized: false
    } : false
  },
  pool: {
    max: 5,
    min: 0,
    acquire: 30000,
    idle: 10000
  },
  define: {
    timestamps: true,
    underscored: true
  }
});

// Utility function to test database connection
export async function testConnection() {
  try {
    await sequelize.authenticate();
    console.log('✅ Koneksi database berhasil!');
    return true;
  } catch (error) {
    console.error('❌ Tidak dapat terhubung ke database:', error);
    return false;
  }
}

// Export default sequelize instance
export default sequelize;
