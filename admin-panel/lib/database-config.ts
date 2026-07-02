import { Sequelize } from 'sequelize';

// Database configuration based on environment
const isDevelopment = process.env.NODE_ENV === 'development';
const isProduction = process.env.NODE_ENV === 'production';

// PostgreSQL connection for main application
export const sequelize = new Sequelize(
  process.env.DATABASE_URL || 'postgresql://farmax:farmax123@localhost:5432/farmaxdb',
  {
    dialect: 'postgres',
    logging: isProduction ? false : console.log,
    pool: {
      max: 20,
      min: 0,
      acquire: 30000,
      idle: 10000,
    },
    timezone: '+07:00',
    define: {
      timestamps: true,
      underscored: true,
      freezeTableName: true,
    },
  }
);

// Database connection test
export async function testDatabaseConnection(): Promise<boolean> {
  try {
    await sequelize.authenticate();
    console.log('✅ Database connection established successfully');
    return true;
  } catch (error) {
    console.error('❌ Unable to connect to database:', error);
    return false;
  }
}

// Initialize database with proper error handling
export async function initializeDatabase(): Promise<void> {
  try {
    const isConnected = await testDatabaseConnection();
    if (!isConnected) {
      throw new Error('Database connection failed');
    }

    if (isDevelopment) {
      // Sync database in development
      await sequelize.sync({ alter: true });
      console.log('✅ Database synchronized');
    }
  } catch (error) {
    console.error('❌ Database initialization failed:', error);
    throw error;
  }
}

// Close database connection
export async function closeDatabaseConnection(): Promise<void> {
  try {
    await sequelize.close();
    console.log('✅ Database connection closed');
  } catch (error) {
    console.error('❌ Error closing database connection:', error);
  }
}

export default sequelize;
