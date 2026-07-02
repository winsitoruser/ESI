import { Sequelize, Options } from 'sequelize';
import { config } from './index';
import { logger } from '../utils/logger';

const dbOptions: Options = {
  host: config.db.host,
  port: config.db.port,
  dialect: 'postgres',
  logging: config.env === 'development' ? (msg: string) => logger.debug(msg) : false,
  pool: {
    max: config.db.pool.max,
    min: config.db.pool.min,
    acquire: config.db.pool.acquire,
    idle: config.db.pool.idle,
  },
  define: {
    timestamps: true,
    underscored: true,
    freezeTableName: true,
    paranoid: true,
  },
  ...(config.db.ssl && {
    dialectOptions: {
      ssl: {
        require: true,
        rejectUnauthorized: false,
      },
    },
  }),
};

export const sequelize = new Sequelize(
  config.db.name,
  config.db.user,
  config.db.password,
  dbOptions
);

export async function connectDatabase(): Promise<void> {
  try {
    await sequelize.authenticate();
    logger.info(`✅ Database connected: ${config.db.name}@${config.db.host}:${config.db.port}`);
  } catch (error) {
    logger.error('❌ Database connection failed:', error);
    throw error;
  }
}

export async function syncDatabase(force = false): Promise<void> {
  try {
    await sequelize.sync({ force, alter: config.env === 'development' });
    logger.info(`✅ Database synced (force: ${force})`);
  } catch (error) {
    logger.error('❌ Database sync failed:', error);
    throw error;
  }
}

export async function closeDatabaseConnection(): Promise<void> {
  try {
    await sequelize.close();
    logger.info('Database connection closed');
  } catch (error) {
    logger.error('Error closing database connection:', error);
  }
}

export default sequelize;
