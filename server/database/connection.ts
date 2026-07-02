import { Sequelize } from 'sequelize';

// Database connection configuration
const sequelize = new Sequelize(
  process.env.DATABASE_URL || 'postgresql://localhost:5432/bedagang',
  {
    dialect: 'postgres',
    logging: process.env.NODE_ENV === 'development' ? console.log : false,
    pool: {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000
    }
  }
);

// Test connection
const testConnection = async () => {
  try {
    await sequelize.authenticate();
    console.log('Database connection has been established successfully.');
  } catch (error) {
    console.error('Unable to connect to the database:', error);
  }
};

// Only test connection in development
if (process.env.NODE_ENV === 'development') {
  testConnection();
}

export default sequelize;
