const { Sequelize } = require('sequelize');
const config = require('../config/database');

// CLS so request-bound transactions attach to all queries in the async chain (server only)
if (typeof window === 'undefined') {
  try {
    // eslint-disable-next-line global-require
    const cls = require('cls-hooked');
    const ns = cls.createNamespace('humanify-tenant');
    Sequelize.useCLS(ns);
  } catch (e) {
    // optional — HUMANIFY_RLS_REQUEST_BOUND still sets local config inside a transaction
  }
}

const env = process.env.NODE_ENV || 'development';
const dbConfig = config[env];

const sequelize = new Sequelize(
  dbConfig.database,
  dbConfig.username,
  dbConfig.password,
  {
    host: dbConfig.host,
    port: dbConfig.port,
    dialect: dbConfig.dialect,
    logging: dbConfig.logging,
    dialectOptions: dbConfig.dialectOptions || {},
    pool: {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000
    }
  }
);

module.exports = sequelize;
